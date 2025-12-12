import {
  DocumentDocument as Document,
  InsertDocument,
} from "./shared-types/schema";
import path from "path";
import fs from "fs";
import ExcelJS from "exceljs";
import os from "os";
import { v4 as uuidv4 } from "uuid";
import { mongoStorage } from "../server/mongo-storage";
import {
  googleDriveListFiles,
  googleDriveDownloadFile,
} from "./google-drive-api";

import { google } from "googleapis";
import { getDriveClientForClient } from "./google-oauth";
import logger from "./logger";
import { sendSyncErrorNotifications } from "./notification-service";
import { parse } from "date-fns";
import { appEvents } from "./app-events";

// #region agent log - DEBUG: Funzione per tracciare file temporanei in /tmp
async function debugLogTmpUsage(location: string, action: string, filePath?: string, fileSize?: number) {
  try {
    const tmpDir = os.tmpdir();
    let tmpFiles: string[] = [];
    let totalSize = 0;
    
    try {
      tmpFiles = fs.readdirSync(tmpDir).filter(f => 
        f.startsWith('excel_analysis_') || f.startsWith('sync_')
      );
      for (const file of tmpFiles) {
        try {
          const stat = fs.statSync(path.join(tmpDir, file));
          totalSize += stat.size;
        } catch {}
      }
    } catch {}
    
    // Log usando il logger interno (visibile nei log di Render)
    logger.info(`[TMP_DEBUG] ${action}`, {
      location,
      action,
      filePath: filePath || 'N/A',
      fileSizeMB: fileSize ? Math.round(fileSize / 1024 / 1024 * 100) / 100 : 0,
      tmpDir,
      tmpFileCount: tmpFiles.length,
      tmpTotalSizeMB: Math.round(totalSize / 1024 / 1024 * 100) / 100,
      tmpFiles: tmpFiles.slice(0, 10),
      hypothesisId: action.includes('CREATE') ? 'A' : action.includes('DELETE') ? 'B' : 'C'
    });
    
    // Anche verso server locale per debug in development
    fetch('http://127.0.0.1:7242/ingest/4fef5989-df30-409c-a404-49ccccbe3a1e', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        location,
        message: `TMP_DEBUG: ${action}`,
        data: {
          action,
          filePath: filePath || 'N/A',
          fileSizeMB: fileSize ? Math.round(fileSize / 1024 / 1024 * 100) / 100 : 0,
          tmpDir,
          tmpFileCount: tmpFiles.length,
          tmpTotalSizeMB: Math.round(totalSize / 1024 / 1024 * 100) / 100,
          tmpFiles: tmpFiles.slice(0, 10)
        },
        timestamp: Date.now(),
        sessionId: 'debug-session'
      })
    }).catch(() => {});
  } catch {}
}
// #endregion

const syncIntervals: Record<number, NodeJS.Timeout> = {};

// Configurazione ottimizzata per Render con timeout ridotti
const SYNC_CONFIG = {
  maxRetries: 2, // Ridotto da 3 a 2 per evitare timeout Render
  retryDelay: 500, // Ridotto da 1s a 500ms
  maxRetryDelay: 15000, // Ridotto da 30s a 15s per ambiente Render
  timeout: 20000, // Ridotto da 30s a 20s per operazioni Google Drive
  batchSize: 10, // Ridotto da 20 a 10 per evitare memory issues su Render
  maxConcurrent: 2, // Ridotto da 5 a 2 per stabilità su Render
  skipExcelAnalysis: false, // Flag per saltare analisi Excel se necessario
  renderOptimized: true, // Flag per ottimizzazioni specifiche Render
} as const;

// Tipi per la gestione errori
interface SyncError extends Error {
  code?: string;
  retryable?: boolean;
  context?: Record<string, any>;
}

interface SyncResult {
  success: boolean;
  processed: number;
  failed: number;
  errors: SyncError[];
  duration: number;
}

// Funzione per creare errori tipizzati
function createSyncError(
  message: string,
  code?: string,
  retryable = false,
  context?: Record<string, any>
): SyncError {
  const error = new Error(message) as SyncError;
  error.code = code;
  error.retryable = retryable;
  error.context = context;
  return error;
}

// Funzione per delay esponenziale
function exponentialBackoff(attempt: number): number {
  return Math.min(
    SYNC_CONFIG.retryDelay * Math.pow(2, attempt),
    SYNC_CONFIG.maxRetryDelay
  );
}

// Funzione per retry con backoff esponenziale
async function withRetry<T>(
  operation: () => Promise<T>,
  context: string,
  maxRetries: number = SYNC_CONFIG.maxRetries
): Promise<T> {
  let lastError: SyncError;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = createSyncError(
        error instanceof Error ? error.message : String(error),
        error instanceof Error && "code" in error
          ? String(error.code)
          : undefined,
        attempt < maxRetries,
        { context, attempt, maxRetries }
      );

      // Se non è retryable o abbiamo esaurito i tentativi, lancia l'errore
      if (!lastError.retryable || attempt === maxRetries) {
        break;
      }

      // Log del retry
      logger.warn(
        `Retry attempt ${attempt + 1}/${maxRetries + 1} for ${context}`,
        {
          error: lastError.message,
          code: lastError.code,
          delay: exponentialBackoff(attempt),
          context: lastError.context,
        }
      );

      // Attendi prima del prossimo tentativo
      await new Promise((resolve) =>
        setTimeout(resolve, exponentialBackoff(attempt))
      );
    }
  }

  throw lastError!;
}

// Funzione per validare la connessione Google Drive
export async function validateDriveConnection(drive: any): Promise<boolean> {
  try {
    // Test semplice: prova a ottenere informazioni sulla cartella root
    await drive.files.list({
      pageSize: 1,
      fields: "files(id, name)",
    });
    return true;
  } catch (error) {
    logger.error("Google Drive connection validation failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    return false;
  }
}

export function extractFolderIdFromUrl(input: string): string | null {
  if (!input || input.trim() === "") return null;

  const patterns = [
    /https:\/\/drive\.google\.com\/drive\/(?:u\/\d+\/)?folders\/([a-zA-Z0-9_-]+)(?:[\?#][^\s]*)?/, // folders
    /https:\/\/drive\.google\.com\/drive\/(?:u\/\d+\/)?my-drive\/([a-zA-Z0-9_-]+)(?:[\?#][^\s]*)?/, // my-drive
    /https:\/\/drive\.google\.com\/open\?id=([a-zA-Z0-9_-]+)(?:&[^\s]*)?/,
  ];

  for (const pattern of patterns) {
    const match = input.match(pattern);
    if (match && match[1]) return match[1];
  }

  if (/^[a-zA-Z0-9_-]+$/.test(input)) return input;

  return null;
}

const fileNamePattern =
  /^(\d+(?:\.\d+)*)_([\p{L}\p{N} .,'’()-]+?)_Rev\.(\d+)_([0-9]{4}-[0-9]{2}-[0-9]{2})\.(\w+)$/u;

export function parseISOPath(filePath: string): string | null {
  // Se il filePath contiene separatori di cartella, estrai il nome del file
  const fileName = filePath.split('/').pop() || filePath;
  
  const match = fileName.match(fileNamePattern);
  if (!match) return null;
  
  const isoNumber = match[1];
  
  // Se il filePath contiene cartelle, mantieni la struttura gerarchica
  if (filePath.includes('/')) {
    const folderPath = filePath.substring(0, filePath.lastIndexOf('/'));
    return `${folderPath}/${isoNumber}`;
  }
  
  return isoNumber;
}

export function parseTitle(filePath: string): string | null {
  const fileName = filePath.split('/').pop() || filePath;
  const match = fileName.match(fileNamePattern);
  return match ? match[2].trim() : null;
}

export function parseRevision(filePath: string): string | null {
  const fileName = filePath.split('/').pop() || filePath;
  const match = fileName.match(fileNamePattern);
  return match ? `Rev.${match[3]}` : null;
}

export function parseDate(filePath: string): string | null {
  const fileName = filePath.split('/').pop() || filePath;
  const match = fileName.match(fileNamePattern);
  return match ? match[4] : null;
}

export function parseFileType(filePath: string): string | null {
  const fileName = filePath.split('/').pop() || filePath;
  const match = fileName.match(fileNamePattern);
  return match ? match[5].toLowerCase() : null;
}

type Alert = "none" | "warning" | "expired";
interface ExcelAnalysis {
  alertStatus: Alert;
  expiryDate: Date | null;
}

// Funzione helper robusta per parsare una data, insensibile al fuso orario del server.
function parseValueToUTCDate(value: any): Date | null {
  if (value === null || value === undefined) return null;

  let parsed: Date | null = null;

  // Caso 1: È già un oggetto Date
  if (value instanceof Date) {
    parsed = value;
  }
  // Caso 2: È un numero (formato seriale di Excel)
  else if (typeof value === "number") {
    // 25569 è il numero di giorni di offset tra l'epoca di Excel (1900) e l'epoca Unix (1970)
    if (value > 25569) {
      const milliseconds = (value - 25569) * 86400 * 1000;
      parsed = new Date(milliseconds);
    }
  }
  // Caso 3: È una stringa
  else if (typeof value === "string") {
    // Array di formati da provare, in ordine di preferenza
    // Supporta varianti italiane comuni con/senza zeri iniziali e con anno a 2 o 4 cifre
    const dateFormats = [
      "dd/MM/yyyy",  // 01/01/2025
      "d/M/yyyy",    // 1/1/2025
      "dd/M/yyyy",   // 01/1/2025
      "d/MM/yyyy",   // 1/01/2025
      "dd/MM/yy",    // 01/01/25 (anno a 2 cifre)
      "d/M/yy",      // 1/1/25 (anno a 2 cifre)
      "dd/M/yy",     // 01/1/25
      "d/MM/yy",     // 1/01/25
      "yyyy-MM-dd",  // ISO format
    ];
    
    // Prova tutti i formati
    for (const format of dateFormats) {
      const tempDate = parse(value, format, new Date());
      if (!isNaN(tempDate.getTime())) {
        parsed = tempDate;
        break;
      }
    }
    
    // Fallback finale al parser nativo solo se nessun formato ha funzionato
    if (!parsed) {
      const tempDate = new Date(value);
      if (!isNaN(tempDate.getTime())) {
        parsed = tempDate;
      }
    }
  }

  // Se il parsing ha funzionato, normalizza la data a mezzanotte UTC
  // per eliminare l'ora e il fuso orario.
  if (parsed && !isNaN(parsed.getTime())) {
    return new Date(
      Date.UTC(
        parsed.getUTCFullYear(),
        parsed.getUTCMonth(),
        parsed.getUTCDate()
      )
    );
  }

  return null;
}

// ===== FORMULA EVALUATOR =====
interface FormulaResult {
  value: Date | null;
  evaluated: boolean;
  error?: string;
}

/**
 * Valuta formule Excel dinamiche per date di scadenza
 */
class FormulaEvaluator {
  private today: Date;

  constructor() {
    this.today = new Date();
    this.today.setHours(0, 0, 0, 0);
  }

  evaluate(formula: string): FormulaResult {
    if (!formula || typeof formula !== "string") {
      return { value: null, evaluated: false, error: "Invalid formula" };
    }

    const cleanFormula = formula.trim().replace(/^=/, "").toUpperCase();

    try {
      // TODAY/OGGI + offset
      const todayMatch = cleanFormula.match(
        /^(TODAY|OGGI)\(\)(?:\s*([+\-])\s*(\d+))?$/
      );
      if (todayMatch) {
        const offset =
          todayMatch[2] && todayMatch[3]
            ? (todayMatch[2] === "+" ? 1 : -1) * parseInt(todayMatch[3])
            : 0;
        const result = new Date(this.today);
        result.setDate(result.getDate() + offset);
        return { value: result, evaluated: true };
      }

      // NOW + offset
      const nowMatch = cleanFormula.match(/^NOW\(\)(?:\s*([+\-])\s*(\d+))?$/);
      if (nowMatch) {
        const offset =
          nowMatch[2] && nowMatch[3]
            ? (nowMatch[2] === "+" ? 1 : -1) * parseInt(nowMatch[3])
            : 0;
        const result = new Date(this.today);
        result.setDate(result.getDate() + offset);
        return { value: result, evaluated: true };
      }

      // DATE(year, month, day)
      const dateMatch = cleanFormula.match(
        /^DATE\((\d{4}),\s*(\d{1,2}),\s*(\d{1,2})\)$/
      );
      if (dateMatch) {
        const year = parseInt(dateMatch[1]);
        const month = parseInt(dateMatch[2]) - 1;
        const day = parseInt(dateMatch[3]);
        const result = new Date(year, month, day);
        return { value: result, evaluated: true };
      }

      return {
        value: null,
        evaluated: false,
        error: "Unsupported formula pattern",
      };
    } catch (error) {
      return {
        value: null,
        evaluated: false,
        error: error instanceof Error ? error.message : "Evaluation error",
      };
    }
  }
}

// ===== EXCEL ANALYZER (STREAMING-ONLY) =====
// Hard limits for Render environment to prevent OOM
const EXCEL_LIMITS = {
  MAX_FILE_SIZE_MB: 10,     // 10MB ottimale per stabilità Render. File grandi: usa Google Drive
  MAX_ROWS_TO_READ: 50,     // Hard cap per evitare "excess formatting"
  RENDER_TIMEOUT_MS: 8000,  // Ridotto da 15s a 8s per fail-fast
} as const;

export async function analyzeExcelContent(
  filePath: string
): Promise<ExcelAnalysis> {
  const evaluator = new FormulaEvaluator();
  const startTime = Date.now();

  try {
    logger.debug("Starting Excel streaming analysis", { filePath });

    // Check file size with stricter limits
    const stats = await fs.promises.stat(filePath);
    const fileSizeMB = stats.size / (1024 * 1024);
    
    logger.debug("File size analysis", { filePath, fileSizeMB: Math.round(fileSizeMB * 100) / 100 });

    // Strict file size limit for Render
    if (fileSizeMB > EXCEL_LIMITS.MAX_FILE_SIZE_MB) {
      logger.warn("Excel file too large for analysis", { 
        filePath, 
        fileSizeMB, 
        maxSizeMB: EXCEL_LIMITS.MAX_FILE_SIZE_MB 
      });
      throw new Error(`File troppo grande (${Math.round(fileSizeMB)}MB). Limite massimo: ${EXCEL_LIMITS.MAX_FILE_SIZE_MB}MB. Considera di pulire il file da formattazioni eccessive.`);
    }

    // ALWAYS use streaming approach - no more document mode
    return await analyzeExcelContentStreamOptimized(filePath, evaluator);
    
  } catch (error) {
    const analysisTime = Date.now() - startTime;
    logger.error("Excel analysis failed", { 
      filePath, 
      error: error instanceof Error ? error.message : String(error),
      analysisTimeMs: analysisTime
    });
    throw error; // Re-throw per gestire meglio gli errori upstream
  }
}

// Optimized streaming approach with strict limits for Render
async function analyzeExcelContentStreamOptimized(
  filePath: string,
  evaluator: FormulaEvaluator
): Promise<ExcelAnalysis> {
  const startTime = Date.now();
  
  try {
    // Use fs.createReadStream for better memory control
    const stream = fs.createReadStream(filePath);
    
    const workbook = new ExcelJS.stream.xlsx.WorkbookReader(stream, {
      worksheets: 'emit',
      sharedStrings: 'ignore',    // CHANGED: ignore invece di emit per meno RAM
      hyperlinks: 'ignore',
      styles: 'ignore'
    });

    let expiryDate: Date | null = null;
    let worksheetProcessed = false;
    let totalRowsRead = 0;
    let excessFormattingDetected = false;

    // Timeout wrapper per fail-fast su Render
    const analysisPromise = (async () => {
      for await (const worksheetReader of workbook) {
        if (worksheetProcessed) break; // Only process first worksheet
        
        // In ExcelJS v4.4+ il reader può emettere array di righe
        for await (const rowOrRows of worksheetReader) {
          const rows = Array.isArray(rowOrRows) ? rowOrRows : [rowOrRows];
          
          for (const row of rows) {
            totalRowsRead++;
            
            // Hard cap per evitare "excess formatting" sheets
            if (totalRowsRead > EXCEL_LIMITS.MAX_ROWS_TO_READ) {
              excessFormattingDetected = true;
              logger.warn("Excel file has excessive rows (possible excess formatting)", {
                filePath,
                totalRowsRead,
                maxRows: EXCEL_LIMITS.MAX_ROWS_TO_READ
              });
              break;
            }
            
            // Only process first row (row 1) for cell A1
            if (totalRowsRead === 1) {
              const cellA1 = row.getCell ? row.getCell(1) : row.values?.[1]; // Compatibility con diverse API
              
              if (cellA1) {
                // Check for formula first
                if (cellA1.formula) {
                  logger.debug(`Found formula in streaming mode: ${cellA1.formula}`, { filePath });
                  const result = evaluator.evaluate(cellA1.formula);
                  
                  if (result.evaluated && result.value) {
                    expiryDate = result.value;
                    logger.debug(`Formula evaluated in streaming: ${expiryDate.toISOString()}`, { filePath });
                  }
                }
                
                // Fallback to cell value
                if (!expiryDate) {
                  let cellValue = cellA1.value ?? cellA1;
                  if (typeof cellValue === "object" && cellValue && "result" in cellValue) {
                    cellValue = (cellValue as ExcelJS.CellFormulaValue).result;
                  }
                  expiryDate = parseValueToUTCDate(cellValue);
                  logger.debug("Using streaming cached value", { cellValue, expiryDate, filePath });
                }
              }
              
              worksheetProcessed = true;
              break; // Exit after processing A1
            }
          }
          
          if (worksheetProcessed || excessFormattingDetected) break;
        }
        
        if (worksheetProcessed || excessFormattingDetected) break;
      }
    })();

    // Race condition per timeout su Render
    const result = await Promise.race([
      analysisPromise,
      new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('Excel analysis timeout on Render')), EXCEL_LIMITS.RENDER_TIMEOUT_MS)
      )
    ]);

    const analysisTime = Date.now() - startTime;
    
    // Chiudi esplicitamente lo stream
    stream.destroy();
    
    if (excessFormattingDetected) {
      throw new Error(`File Excel con formattazione eccessiva (${totalRowsRead}+ righe). Pulisci il file: Excel → Cerca e Seleziona → Vai a Speciale → Celle vuote → Elimina righe/colonne.`);
    }
    
    const alertStatus = calculateAlertStatus(expiryDate);
    
    if (!expiryDate) {
      logger.debug("No expiry date found in streaming Excel analysis", { 
        filePath, 
        analysisTimeMs: analysisTime,
        totalRowsRead,
        alertStatus: "none",
        method: 'streaming-optimized'
      });
    } else {
      logger.info("Streaming Excel analysis completed", {
        filePath,
        expiryDate: (expiryDate as Date).toISOString(),
        alertStatus,
        analysisTimeMs: analysisTime,
        totalRowsRead,
        method: 'streaming-optimized'
      });
    }
    
    return { alertStatus, expiryDate };
    
  } catch (error) {
    const analysisTime = Date.now() - startTime;
    logger.error("Optimized streaming Excel analysis failed", {
      filePath,
      error: error instanceof Error ? error.message : String(error),
      analysisTimeMs: analysisTime,
      method: 'streaming-optimized'
    });
    
    // Non fare più fallback alla modalità document - fail fast
    throw error;
  }
}

// REMOVED: analyzeExcelContentFallback - no more document mode fallback for memory safety

// ===== ALERT STATUS CALCULATOR =====
function calculateAlertStatus(expiryDate: Date | null | undefined): Alert {
  // Se non c'è data di scadenza, il documento è considerato valido (non scaduto)
  if (!expiryDate) {
    return "none";
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const thirtyDaysFromNow = new Date(today);
  thirtyDaysFromNow.setDate(today.getDate() + 30);

  if (expiryDate < today) {
    return "expired";
  } else if (expiryDate <= thirtyDaysFromNow) {
    return "warning";
  }
  return "none";
}

// Funzione ottimizzata per analizzare Excel scaricando temporaneamente il file
export async function analyzeExcelContentOptimized(
  drive: any,
  fileId: string
): Promise<ExcelAnalysis> {
  let tempFilePath: string | null = null;
  let metadata: any = null;

  // Use new optimized timeout from EXCEL_LIMITS
  const RENDER_TIMEOUT = EXCEL_LIMITS.RENDER_TIMEOUT_MS;

  try {
    // Prova a ottenere i metadati del file
    metadata = await drive.files.get({
      fileId,
      fields: "name,mimeType,modifiedTime,createdTime",
      supportsAllDrives: true,
    });

    const fileName = metadata.data.name;
    const mimeType = metadata.data.mimeType;

    // Controlla se è un file Excel o Google Sheets
    const isExcelFile =
      fileName?.toLowerCase().endsWith(".xlsx") ||
      fileName?.toLowerCase().endsWith(".xls");
    const isGoogleSheet =
      mimeType === "application/vnd.google-apps.spreadsheet";

    if (!isExcelFile && !isGoogleSheet) {
      logger.debug("File is not Excel or Google Sheets, skipping analysis", {
        fileId,
        fileName,
        mimeType,
      });
      return { alertStatus: "none", expiryDate: null };
    }

    // Crea un percorso temporaneo per il file
    const tempDir = os.tmpdir();
    const uniqueId = uuidv4();
    const fileExtension = isGoogleSheet
      ? ".xlsx"
      : path.extname(fileName || "");
    tempFilePath = path.join(
      tempDir,
      `excel_analysis_${uniqueId}${fileExtension}`
    );

    logger.info("Downloading file for analysis", {
      fileId,
      fileName,
      mimeType,
      isGoogleSheet,
      tempFilePath,
    });

    // #region agent log - DEBUG: Prima del download
    await debugLogTmpUsage('google-drive.ts:analyzeExcelContentOptimized:BEFORE_DOWNLOAD', 'BEFORE_DOWNLOAD', tempFilePath);
    // #endregion

    // Scarica il file (Excel nativo o Google Sheets esportato)
    await googleDriveDownloadFile(drive, fileId, tempFilePath);

    // #region agent log - DEBUG: Dopo il download, calcola dimensione
    let downloadedFileSize = 0;
    try { downloadedFileSize = fs.statSync(tempFilePath).size; } catch {}
    await debugLogTmpUsage('google-drive.ts:analyzeExcelContentOptimized:FILE_CREATED', 'FILE_CREATED', tempFilePath, downloadedFileSize);
    // #endregion

    // Analizza il contenuto del file (timeout già gestito internamente)
    const analysis = await analyzeExcelContent(tempFilePath);

    logger.info("File analysis completed successfully", {
      fileId,
      fileName,
      mimeType,
      isGoogleSheet,
      alertStatus: analysis.alertStatus,
      expiryDate: analysis.expiryDate?.toISOString(),
    });

    return analysis;
  } catch (error) {
    logger.warn("Failed to analyze file content", {
      fileId,
      fileName: metadata?.data?.name,
      mimeType: metadata?.data?.mimeType,
      error: error instanceof Error ? error.message : String(error),
    });
    return { alertStatus: "none", expiryDate: null };
  } finally {
    // Pulisci il file temporaneo
    if (tempFilePath && fs.existsSync(tempFilePath)) {
      try {
        // #region agent log - DEBUG: Prima della cancellazione
        let fileSize = 0;
        try { fileSize = fs.statSync(tempFilePath).size; } catch {}
        await debugLogTmpUsage('google-drive.ts:analyzeExcelContentOptimized:BEFORE_DELETE', 'BEFORE_DELETE', tempFilePath, fileSize);
        // #endregion
        
        fs.unlinkSync(tempFilePath);
        
        // #region agent log - DEBUG: Dopo la cancellazione
        await debugLogTmpUsage('google-drive.ts:analyzeExcelContentOptimized:FILE_DELETED', 'FILE_DELETED', tempFilePath);
        // #endregion
        
        logger.debug("Temporary file cleaned up", { tempFilePath });
      } catch (cleanupError) {
        // #region agent log - DEBUG: Errore durante cancellazione
        await debugLogTmpUsage('google-drive.ts:analyzeExcelContentOptimized:DELETE_FAILED', 'DELETE_FAILED: ' + (cleanupError instanceof Error ? cleanupError.message : String(cleanupError)), tempFilePath);
        // #endregion
        
        logger.warn("Failed to cleanup temporary file", {
          tempFilePath,
          error:
            cleanupError instanceof Error
              ? cleanupError.message
              : String(cleanupError),
        });
      }
    } else if (tempFilePath) {
      // #region agent log - DEBUG: File non esisteva al momento del cleanup
      await debugLogTmpUsage('google-drive.ts:analyzeExcelContentOptimized:FILE_NOT_FOUND_AT_CLEANUP', 'FILE_NOT_FOUND_AT_CLEANUP', tempFilePath);
      // #endregion
    }
    
    // Forza garbage collection per ottimizzare memoria su Render
    if (global.gc && SYNC_CONFIG.renderOptimized) {
      try {
        global.gc();
      } catch (gcError) {
        // Ignora errori GC
      }
    }
  }
}

export async function checkExcelAlertStatus(filePath: string): Promise<string> {
  const result = await analyzeExcelContent(filePath);
  return result.alertStatus;
}

export async function processDocumentFile(
  fileName: string,
  driveUrl: string,
  localFilePath?: string
): Promise<InsertDocument | null> {
  try {
    const isoPath = parseISOPath(fileName);
    const title = parseTitle(fileName);
    const revision = parseRevision(fileName);
    const fileType = parseFileType(fileName);

    if (!isoPath || !title || !revision || !fileType) {
      return null;
    }

    let alertStatus: Alert = "none";
    let expiryDate: Date | null = null;

    if (
      localFilePath &&
      (fileType === "xlsx" || fileType === "xls" || fileType === "xlsm" || fileType === "gsheet")
    ) {
      const excelAnalysis = await analyzeExcelContent(localFilePath);
      alertStatus = excelAnalysis.alertStatus;
      expiryDate = excelAnalysis.expiryDate;
    }

    // L'oggetto `document` ora include i campi corretti.
    const document: InsertDocument = {
      title,
      path: isoPath,
      revision,
      driveUrl,
      fileType,
      isObsolete: false,
      alertStatus: alertStatus as "none" | "warning" | "expired",
      expiryDate,
      parentId: null,
      fileHash: null,
      encryptedCachePath: null,
      ownerId: null,
      clientId: null,
      googleFileId: null,
    };

    return document;
  } catch (error) {
    logger.error(`Error processing document file: ${fileName}`, { error });
    return null;
  }
}

export async function findObsoleteRevisions(
  documentPath: string,
  documentTitle: string,
  currentRevision: string,
  clientId: number
): Promise<Document[]> {
  const currentRevNum = parseInt(currentRevision.replace("Rev.", ""), 10);
  const documents = await mongoStorage.getDocumentsByPathAndTitle(
    documentPath,
    documentTitle,
    clientId
  );

  // Filtra solo i documenti non obsoleti e con revisione inferiore
  return documents.filter((doc) => {
    if (doc.isObsolete) return false;
    const docRevNum = parseInt(doc.revision.replace("Rev.", ""), 10);
    return docRevNum < currentRevNum;
  });
}

export async function markObsoleteDocuments(
  documents: Document[],
  userId: number
): Promise<void> {
  for (const doc of documents) {
    await mongoStorage.markDocumentObsolete(doc.legacyId);
    await mongoStorage.createLog({
      userId,
      action: "revision",
      documentId: doc.legacyId,
      details: { message: `Obsoleto: ${doc.title} ${doc.revision}` },
    });
  }
}

// Funzione ottimizzata per processare un singolo file
async function processFileWithErrorHandlingOptimized(
  drive: any,
  file: any,
  userId: number,
  clientId: number
): Promise<{ success: boolean; error?: SyncError; document?: any }> {
  try {
    // Parsing del documento senza download
    const doc = await processDocumentFile(
      file.name!,
      file.webViewLink!,
      undefined
    );

    if (!doc) {
      logger.debug(`Skipping invalid document: ${file.name}`, {
        fileName: file.name,
        userId,
        clientId,
      });
      return { success: true };
    }

    // Verifica duplicati
    const exists = await mongoStorage.getDocumentByPathAndTitleAndRevision(
      doc.path,
      doc.title,
      doc.revision,
      clientId
    );

    if (exists) {
      logger.debug(`Document already exists: ${file.name}`, {
        fileName: file.name,
        userId,
        clientId,
      });
      return { success: true };
    }

    // Se è un file Excel/Google Sheets e l'analisi è abilitata, analizzalo
    if (
      (doc.fileType === "xlsx" ||
        doc.fileType === "xls" ||
        doc.fileType === "xlsm" ||
        doc.fileType === "gsheet") &&
      !SYNC_CONFIG.skipExcelAnalysis
    ) {
      const excelAnalysis = await analyzeExcelContentOptimized(drive, file.id!);
      doc.alertStatus = excelAnalysis.alertStatus;
      doc.expiryDate = excelAnalysis.expiryDate;
    }

    // Inserimento documento
    const createdDoc = await mongoStorage.createDocument({
      ...doc,
      clientId,
      ownerId: userId,
    });

    // Gestione revisioni obsolete - usa il nuovo metodo centralizzato
    await mongoStorage.markObsoleteRevisionsForClient(clientId);

    logger.info(`Successfully processed document: ${file.name}`, {
      fileName: file.name,
      userId,
      clientId,
      documentPath: doc.path,
      revision: doc.revision,
    });

    return { success: true, document: createdDoc };
  } catch (error) {
    const syncError = createSyncError(
      `Failed to process file ${file.name}`,
      error instanceof Error && "code" in error
        ? String(error.code)
        : "UNKNOWN",
      true,
      {
        fileName: file.name,
        userId,
        clientId,
        fileId: file.id,
        error: error instanceof Error ? error.message : String(error),
      }
    );

    logger.error("File processing failed", {
      fileName: file.name,
      userId,
      clientId,
      error: syncError.message,
      code: syncError.code,
      context: syncError.context,
    });

    return { success: false, error: syncError };
  }
}

// Funzione per processare batch in parallelo con limitazione
async function processBatchOptimized(
  drive: any,
  batch: any[],
  userId: number,
  clientId: number,
  onProgress?: (processed: number, total: number) => void
): Promise<{
  processed: number;
  failed: number;
  errors: SyncError[];
  documents: any[];
}> {
  const results = {
    processed: 0,
    failed: 0,
    errors: [] as SyncError[],
    documents: [] as any[],
  };

  // Processa file in parallelo con limitazione
  const chunks = [];
  for (let i = 0; i < batch.length; i += SYNC_CONFIG.maxConcurrent) {
    chunks.push(batch.slice(i, i + SYNC_CONFIG.maxConcurrent));
  }

  for (const [chunkIndex, chunk] of chunks.entries()) {
    const chunkPromises = chunk.map((file) =>
      processFileWithErrorHandlingOptimized(drive, file, userId, clientId)
    );

    const chunkResults = await Promise.allSettled(chunkPromises);

    // Analizza risultati del chunk
    for (const chunkResult of chunkResults) {
      if (chunkResult.status === "fulfilled") {
        if (chunkResult.value.success) {
          results.processed++;
          if (chunkResult.value.document) {
            results.documents.push(chunkResult.value.document);
          }
        } else {
          results.failed++;
          if (chunkResult.value.error) {
            results.errors.push(chunkResult.value.error);
          }
        }
      } else {
        results.failed++;
        const error = createSyncError(
          "Chunk processing failed",
          "CHUNK_FAILED",
          true,
          { reason: chunkResult.reason }
        );
        results.errors.push(error);
      }
    }

    // Callback di progresso
    if (onProgress) {
      const totalProcessed = results.processed + results.failed;
      onProgress(totalProcessed, batch.length);
    }

    // Pausa minima tra i chunk per evitare rate limiting
    if (chunkIndex < chunks.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }

  return results;
}

/**
 * Sincronizza una cartella Google Drive (e tutte le sue sottocartelle) con il DB.
 * Versione ottimizzata per velocità e performance.
 */
export async function syncWithGoogleDrive(
  syncFolder: string,
  userId: number,
  onProgress?: (
    processed: number,
    total: number,
    currentBatch: number,
    totalBatches: number
  ) => void
): Promise<SyncResult> {
  const startTime = Date.now();
  const result: SyncResult = {
    success: false,
    processed: 0,
    failed: 0,
    errors: [],
    duration: 0,
  };

  let clientName = "Unknown";
  let clientId: number | undefined;

  try {
    logger.info("Starting optimized Google Drive sync", {
      userId,
      syncFolder,
      timestamp: new Date().toISOString(),
    });

    // 1. Recupero dati utente e client
    logger.info("Retrieving user data", { userId });
    const user = await withRetry(
      () => mongoStorage.getUser(userId),
      "getUser",
      2
    );

    if (!user) {
      const error = createSyncError("User not found", "USER_NOT_FOUND", false, {
        userId,
      });
      result.errors.push(error);
      logger.error("User not found during sync", { userId });
      throw error;
    }

    clientId = user?.clientId || undefined;
    logger.info("User data retrieved", {
      userId,
      clientId,
      userEmail: user.email,
      userRole: user.role,
    });

    if (!clientId) {
      const error = createSyncError(
        "User not found or has no client ID",
        "USER_NOT_FOUND",
        false,
        { userId }
      );
      result.errors.push(error);
      logger.error("User has no client ID", { userId });
      throw error;
    }

    // Recupera il nome del client per le notifiche
    try {
      const client = await mongoStorage.getClient(clientId);
      clientName = client?.name || "Unknown";
      logger.info("Client data retrieved", {
        clientId,
        clientName,
        hasGoogleTokens: !!client?.google?.refreshToken,
        driveFolderId: client?.driveFolderId,
      });
    } catch (clientError) {
      logger.warn("Failed to get client name for notifications", {
        clientId,
        error:
          clientError instanceof Error
            ? clientError.message
            : String(clientError),
      });
    }

    const folderId =
      (await withRetry(
        () => mongoStorage.getFolderIdForUser(userId),
        "getFolderId",
        2
      )) || syncFolder;

    logger.info("Folder ID determined", {
      userId,
      clientId,
      folderId,
      syncFolder,
    });

    // 2. Inizializzazione del client di Google Drive
    logger.info("Initializing Google Drive client", { clientId });
    const drive = await withRetry(
      () => getDriveClientForClient(clientId!),
      "getDriveClient",
      3
    );

    logger.info("Google Drive client initialized successfully", { clientId });

    // 3. Validazione connessione
    logger.info("Validating Google Drive connection", { clientId });
    const isConnected = await validateDriveConnection(drive);
    if (!isConnected) {
      const error = createSyncError(
        "Google Drive connection failed",
        "DRIVE_CONNECTION_FAILED",
        true,
        { clientId, folderId }
      );
      result.errors.push(error);
      logger.error("Google Drive connection validation failed", {
        clientId,
        folderId,
      });
      throw error;
    }

    logger.info("Google Drive connection validated successfully", { clientId });

    // 4. Elenco ricorsivo dei file
    const files = await withRetry(
      () => googleDriveListFiles(drive, folderId),
      "listFiles",
      3
    );

    logger.info(`Found ${files.length} files to process`, {
      userId,
      clientId,
      folderId,
      fileCount: files.length,
    });

    // 5. Processamento in batch ottimizzato con analisi contenuti
    const batches = [];
    for (let i = 0; i < files.length; i += SYNC_CONFIG.batchSize) {
      batches.push(files.slice(i, i + SYNC_CONFIG.batchSize));
    }

    for (const [batchIndex, batch] of batches.entries()) {
      logger.debug(`Processing batch ${batchIndex + 1}/${batches.length}`, {
        batchSize: batch.length,
        userId,
        clientId,
      });

      const batchResults = await processBatchWithAnalysis(
        drive,
        batch,
        userId,
        clientId!,
        (processed, total) => {
          if (onProgress) {
            const totalProcessed = result.processed + processed;
            const totalFiles = files.length;
            onProgress(
              totalProcessed,
              totalFiles,
              batchIndex + 1,
              batches.length
            );
          }
        }
      );

      // Aggiorna risultati totali
      result.processed += batchResults.processed;
      result.failed += batchResults.failed;
      result.errors.push(...batchResults.errors);

      // Pausa ridotta tra i batch
      if (batchIndex < batches.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 200));
      }
    }

    result.success = result.failed === 0;
    result.duration = Date.now() - startTime;

    logger.info("Optimized Google Drive sync completed", {
      userId,
      clientId,
      success: result.success,
      processed: result.processed,
      failed: result.failed,
      duration: result.duration,
      errorCount: result.errors.length,
      avgTimePerFile: result.duration / (result.processed + result.failed),
    });

    // Log dettagliato degli errori se ce ne sono
    if (result.errors.length > 0) {
      logger.warn("Sync completed with errors", {
        userId,
        clientId,
        errors: result.errors.map((e) => ({
          message: e.message,
          code: e.code,
          retryable: e.retryable,
        })),
      });
    }

    // Invia notifiche per errori critici
    if (result.errors.length > 0) {
      try {
        await sendSyncErrorNotifications(result.errors, {
          userId,
          clientId,
          clientName,
          syncFolder,
          processed: result.processed,
          failed: result.failed,
          duration: result.duration,
        });
      } catch (notificationError) {
        logger.error("Failed to send sync error notifications", {
          error:
            notificationError instanceof Error
              ? notificationError.message
              : String(notificationError),
          userId,
          clientId,
        });
      }
    }
  } catch (error) {
    result.duration = Date.now() - startTime;
    result.success = false;

    const syncError = createSyncError(
      "Sync operation failed",
      error instanceof Error && "code" in error
        ? String(error.code)
        : "SYNC_FAILED",
      true,
      {
        userId,
        syncFolder,
        duration: result.duration,
        originalError: error instanceof Error ? error.message : String(error),
      }
    );

    result.errors.push(syncError);

    logger.error("Google Drive sync failed", {
      userId,
      syncFolder,
      error: syncError.message,
      code: syncError.code,
      duration: result.duration,
      context: syncError.context,
    });

    // Invia notifiche anche per errori fatali
    if (clientId) {
      try {
        await sendSyncErrorNotifications([syncError], {
          userId,
          clientId,
          clientName,
          syncFolder,
          processed: result.processed,
          failed: result.failed,
          duration: result.duration,
        });
      } catch (notificationError) {
        logger.error(
          "Failed to send sync error notifications for fatal error",
          {
            error:
              notificationError instanceof Error
                ? notificationError.message
                : String(notificationError),
            userId,
            clientId,
          }
        );
      }
    }
  }

  return result;
}

// Nuova funzione batch con analisi contenuti
async function processBatchWithAnalysis(
  drive: any,
  files: any[],
  userId: number,
  clientId: number,
  onProgress?: (processed: number, total: number) => void
): Promise<BatchResult> {
  const result: BatchResult = {
    processed: 0,
    failed: 0,
    errors: [],
  };

  const promises = files.map(async (file, index) => {
    try {
      // Analisi del contenuto del file
      let analysis: ExcelAnalysis = { alertStatus: "none", expiryDate: null };

      // Prova ad analizzare il contenuto Excel, ma non bloccare se fallisce
      try {
        if (file.mimeType === "application/vnd.google-apps.spreadsheet") {
          // Google Sheets - API diretta con drive esistente
          logger.debug(`Analyzing Google Sheet: ${file.name}`, {
            fileId: file.id,
          });
          analysis = await analyzeGoogleSheet(drive, file.id);
        } else if (isExcelFile(file.mimeType)) {
          // Excel - download e analisi
          logger.debug(`Analyzing Excel file: ${file.name}`, { fileId: file.id });
          const tempPath = await downloadToTemp(drive, file);
          try {
            analysis = await analyzeExcelContent(tempPath);
          } finally {
            // Cleanup file temporaneo
            if (fs.existsSync(tempPath)) {
              // #region agent log - DEBUG: Cleanup in processBatchWithAnalysis
              let fileSize = 0;
              try { fileSize = fs.statSync(tempPath).size; } catch {}
              await debugLogTmpUsage('google-drive.ts:processBatchWithAnalysis:BEFORE_DELETE', 'BATCH_BEFORE_DELETE', tempPath, fileSize);
              // #endregion
              
              fs.unlinkSync(tempPath);
              
              // #region agent log - DEBUG: Dopo cleanup in processBatchWithAnalysis
              await debugLogTmpUsage('google-drive.ts:processBatchWithAnalysis:FILE_DELETED', 'BATCH_FILE_DELETED', tempPath);
              // #endregion
            } else {
              // #region agent log - DEBUG: File non esisteva al momento del cleanup batch
              await debugLogTmpUsage('google-drive.ts:processBatchWithAnalysis:FILE_NOT_FOUND', 'BATCH_FILE_NOT_FOUND_AT_CLEANUP', tempPath);
              // #endregion
            }
          }
        } else {
          logger.debug(
            `Skipping analysis for unsupported file type: ${file.mimeType}`,
            { fileName: file.name }
          );
        }
      } catch (analysisError) {
        // Se l'analisi fallisce (es. permessi mancanti), continua comunque
        logger.warn(`⚠️ Could not analyze Excel file (will save without expiry data): ${file.name}`, {
          error: analysisError instanceof Error ? analysisError.message : String(analysisError),
          fileId: file.id,
        });
        // Mantieni analysis = { alertStatus: "none", expiryDate: null }
      }

      // Crea/aggiorna documento nel DB con logica completa
      const docInfo = await processDocumentFile(
        file.name!,
        file.webViewLink!,
        undefined
      );

      if (!docInfo) {
        logger.warn(`❌ SKIPPED file (invalid name format): ${file.name}`, {
          fileName: file.name,
          mimeType: file.mimeType,
        });
        return;
      }

      const documentData = {
        ...docInfo,
        alertStatus: analysis.alertStatus as "none" | "warning" | "expired",
        expiryDate: analysis.expiryDate,
        clientId,
        ownerId: userId,
        googleFileId: file.id,
        mimeType: file.mimeType,
        lastSynced: new Date(),
      };

      // Debug per file Excel
      const isExcel = docInfo.fileType === 'xlsx' || docInfo.fileType === 'xls' || docInfo.fileType === 'xlsm';
      if (isExcel) {
        logger.info(`📊 Processing Excel file for DB:`, {
          fileName: file.name,
          fileType: docInfo.fileType,
          googleFileId: file.id,
          title: docInfo.title,
          path: docInfo.path,
          revision: docInfo.revision,
          clientId,
        });
      }

      const existingDoc = await mongoStorage.getDocumentByGoogleFileId(file.id);

      if (existingDoc) {
        await mongoStorage.updateDocument(existingDoc.legacyId, documentData);
        if (isExcel) {
          logger.info(`✅ EXCEL Updated in DB: ${file.name}`, {
            docId: existingDoc.legacyId,
            fileType: documentData.fileType,
            title: documentData.title,
          });
        }
      } else {
        try {
          const savedDoc = await mongoStorage.createDocument(documentData);
          if (isExcel) {
            logger.info(`✅ EXCEL Created NEW in DB: ${file.name}`, {
              docId: savedDoc.legacyId,
              fileType: documentData.fileType,
              title: documentData.title,
              path: documentData.path,
              revision: documentData.revision,
              clientId: documentData.clientId,
              googleFileId: savedDoc.googleFileId,
            });
          }
        } catch (dbError) {
          logger.error(`❌ FAILED to save EXCEL to DB: ${file.name}`, {
            fileType: documentData.fileType,
            title: documentData.title,
            googleFileId: file.id,
            error: dbError instanceof Error ? dbError.message : String(dbError),
            errorCode: (dbError as any)?.code,
            errorName: (dbError as any)?.name,
          });
          throw dbError;
        }
      }

      result.processed++;

      if (onProgress) {
        onProgress(result.processed, files.length);
      }
    } catch (error) {
      result.failed++;
      const syncError = createSyncError(
        `Failed to process file: ${file.name}`,
        "FILE_PROCESSING_FAILED",
        true,
        { fileId: file.id, fileName: file.name }
      );
      result.errors.push(syncError);

      logger.error("❌ FAILED to process file in batch", {
        fileName: file.name,
        fileId: file.id,
        mimeType: file.mimeType,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
    }
  });

  await Promise.allSettled(promises);
  return result;
}

// Helper functions per l'analisi
function isExcelFile(mimeType: string | null | undefined): boolean {
  if (!mimeType) return false;

  const excelTypes = [
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.ms-excel",
    "application/vnd.ms-excel.sheet.macroEnabled.12",
    "application/vnd.ms-excel.sheet.macroenabled.12",
  ];

  return excelTypes.includes(mimeType);
}

async function downloadToTemp(
  drive: any,
  file: { id: string; name: string }
): Promise<string> {
  const tempDir = os.tmpdir();
  const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
  const tempPath = path.join(tempDir, `sync_${Date.now()}_${sanitizedName}`);

  // #region agent log - DEBUG: Prima del download in downloadToTemp
  await debugLogTmpUsage('google-drive.ts:downloadToTemp:BEFORE_DOWNLOAD', 'SYNC_BEFORE_DOWNLOAD', tempPath);
  // #endregion

  await googleDriveDownloadFile(drive, file.id, tempPath);

  // #region agent log - DEBUG: Dopo il download in downloadToTemp
  let fileSize = 0;
  try { fileSize = fs.statSync(tempPath).size; } catch {}
  await debugLogTmpUsage('google-drive.ts:downloadToTemp:FILE_CREATED', 'SYNC_FILE_CREATED', tempPath, fileSize);
  // #endregion

  return tempPath;
}

async function analyzeGoogleSheet(
  drive: any,
  spreadsheetId: string
): Promise<ExcelAnalysis> {
  const evaluator = new FormulaEvaluator();

  try {
    const sheets = google.sheets({ version: "v4", auth: drive });

    // Prima prova a leggere la formula
    const formulaResponse = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: "Sheet1!A1",
      valueRenderOption: "FORMULA",
      // Note: Google Sheets API does not support supportsAllDrives parameter
      // Access is controlled by the OAuth2 token used to authenticate
    });

    const formula = formulaResponse.data.values?.[0]?.[0];

    let expiryDate: Date | null = null;

    if (formula && typeof formula === "string" && formula.startsWith("=")) {
      const result = evaluator.evaluate(formula);
      if (result.evaluated && result.value) {
        expiryDate = result.value;
        logger.debug(`Google Sheet formula evaluated`, {
          formula,
          result: result.value,
        });
      }
    }

    // Fallback: leggi il valore calcolato se non abbiamo una data dalla formula
    if (!expiryDate) {
      const valueResponse = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: "Sheet1!A1",
        valueRenderOption: "UNFORMATTED_VALUE",
        // Note: Google Sheets API does not support supportsAllDrives parameter
        // Access is controlled by the OAuth2 token used to authenticate
      });

      const calculatedValue = valueResponse.data.values?.[0]?.[0];
      if (calculatedValue) {
        const date = parseValueToUTCDate(calculatedValue);
        if (date) {
          expiryDate = date;
          logger.debug(`Google Sheet fallback value used`, {
            calculatedValue,
            date,
          });
        }
      }
    }

    const alertStatus = calculateAlertStatus(expiryDate);
    
    if (!expiryDate) {
      logger.debug(`No valid date found in Google Sheet A1`, { spreadsheetId, alertStatus: "none" });
    }
    
    return { alertStatus, expiryDate };
  } catch (error) {
    logger.error("Google Sheet analysis failed", { spreadsheetId, error });
    return { alertStatus: "none", expiryDate: null };
  }
}

// Interfacce per i tipi
interface BatchResult {
  processed: number;
  failed: number;
  errors: any[];
}

export function startAutomaticSync(syncFolder: string, userId: number): void {
  stopAutomaticSync(userId);

  const intervalId = setInterval(async () => {
    try {
      const result = await syncWithGoogleDrive(syncFolder, userId);

      // Se ci sono troppi errori consecutivi, aumenta l'intervallo
      if (!result.success && result.failed > result.processed) {
        logger.warn("High failure rate detected, increasing sync interval", {
          userId,
          processed: result.processed,
          failed: result.failed,
        });

        // Aumenta l'intervallo temporaneamente
        clearInterval(intervalId);
        setTimeout(() => {
          startAutomaticSync(syncFolder, userId);
        }, 5 * 60 * 1000); // 5 minuti invece di 30 secondi
      }
    } catch (error) {
      logger.error("Automatic sync failed", {
        userId,
        syncFolder,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }, 30 * 1000);

  syncIntervals[userId] = intervalId;

  // Esegui la prima sincronizzazione immediatamente
  syncWithGoogleDrive(syncFolder, userId).catch((error) => {
    logger.error("Initial sync failed", {
      userId,
      syncFolder,
      error: error instanceof Error ? error.message : String(error),
    });
  });
}

export function stopAutomaticSync(userId: number): void {
  const interval = syncIntervals[userId];
  if (interval) {
    clearInterval(interval);
    delete syncIntervals[userId];
  }
}

// Flag per evitare sync multiple simultanee
let isGlobalSyncRunning = false;

export function startAutomaticSyncForAllClients(): void {
  logger.info("Starting automatic sync for all clients (every 15 minutes)");

  // Esegui la prima sync immediatamente
  syncAllClientsOnce();

  // Sync ogni 15 minuti per bilanciare reattività e carico server
  setInterval(() => {
    if (isGlobalSyncRunning) {
      logger.info("Skipping scheduled sync - previous sync still running");
      return;
    }

    logger.info("Running scheduled automatic sync for all clients");
    syncAllClientsOnce();
  }, 15 * 60 * 1000); // 15 minuti
}

async function syncAllClientsOnce(): Promise<void> {
  if (isGlobalSyncRunning) {
    logger.info("Global sync already running, skipping");
    return;
  }

  isGlobalSyncRunning = true;
  const startTime = Date.now();
  let totalProcessed = 0;
  let totalFailed = 0;
  const allErrors: SyncError[] = [];

  // #region agent log - DEBUG: Inizio sync globale
  await debugLogTmpUsage('google-drive.ts:syncAllClientsOnce:START', 'GLOBAL_SYNC_START');
  // #endregion

  try {
    logger.info("Starting global sync for all clients");

    const clients = await withRetry(
      () => mongoStorage.getAllClients(),
      "getAllClients",
      2
    );

    const users = await withRetry(
      () => mongoStorage.getAllUsers(),
      "getAllUsers",
      2
    );

    logger.info(`Starting sync for ${clients.length} clients`, {
      clientCount: clients.length,
      userCount: users.length,
    });

    for (const client of clients) {
      const admin = users.find(
        (u) => u.clientId === client.legacyId && u.role === "admin"
      );

      if (!admin) {
        logger.warn("No admin user found for client", {
          clientId: client.legacyId,
          clientName: client.name,
        });
        continue;
      }

      const userId = admin.legacyId;

      try {
        const result = await syncWithGoogleDrive(client.driveFolderId, userId);
        totalProcessed += result.processed;
        totalFailed += result.failed;
        allErrors.push(...result.errors);
      } catch (syncError) {
        totalFailed++;
        const error = createSyncError(
          "Client sync failed",
          "CLIENT_SYNC_FAILED",
          true,
          {
            clientId: client.legacyId,
            clientName: client.name,
            userId,
            originalError:
              syncError instanceof Error
                ? syncError.message
                : String(syncError),
          }
        );
        allErrors.push(error);
      }
    }

    const duration = Date.now() - startTime;

    logger.info("Global sync completed", {
      totalProcessed,
      totalFailed,
      duration,
      errorCount: allErrors.length,
      successRate: totalProcessed / (totalProcessed + totalFailed),
    });

    if (allErrors.length > 0) {
      logger.warn("Global sync completed with errors", {
        totalErrors: allErrors.length,
        errors: allErrors.map((e) => ({
          message: e.message,
          code: e.code,
          retryable: e.retryable,
        })),
      });

      // Invia notifiche per errori critici globali
      try {
        await sendSyncErrorNotifications(allErrors, {
          processed: totalProcessed,
          failed: totalFailed,
          duration,
        });
      } catch (notificationError) {
        logger.error("Failed to send global sync error notifications", {
          error:
            notificationError instanceof Error
              ? notificationError.message
              : String(notificationError),
        });
      }
    }
  } catch (err) {
    const duration = Date.now() - startTime;
    logger.error("Global sync failed", {
      error: err instanceof Error ? err.message : String(err),
      duration,
    });
  } finally {
    // #region agent log - DEBUG: Fine sync globale
    await debugLogTmpUsage('google-drive.ts:syncAllClientsOnce:END', 'GLOBAL_SYNC_END', undefined, undefined);
    // #endregion

    // Il 'finally' assicura che venga emesso anche in caso di errore.
    appEvents.emit("initialSyncComplete", {
      totalProcessed,
      totalFailed,
      duration: Date.now() - startTime,
      errorCount: allErrors.length,
      successRate: totalProcessed / (totalProcessed + totalFailed),
    });

    isGlobalSyncRunning = false;
  }
}

// Funzione per aggiornare le date di scadenza dei documenti Excel e Google Sheets esistenti
export async function updateExcelExpiryDates(
  drive: any,
  userId: number
): Promise<{ updated: number; failed: number; errors: string[] }> {
  const result = { updated: 0, failed: 0, errors: [] as string[] };

  try {
    logger.info("Starting Excel/Google Sheets expiry dates update", { userId });

    // Ottieni tutti i documenti Excel e Google Sheets dal database
    const allDocuments = await mongoStorage.getAllDocuments();
    const excelDocuments = allDocuments.filter(
      (doc) =>
        (doc.fileType === "xlsx" ||
          doc.fileType === "xls" ||
          doc.fileType === "xlsm" ||
          doc.fileType === "gsheet") &&
        !doc.isObsolete
    );

    logger.info("Found Excel/Google Sheets documents to update", {
      total: excelDocuments.length,
    });

    for (const doc of excelDocuments) {
      try {
        // Estrai l'ID del file da Google Drive URL
        const driveUrl = doc.driveUrl;
        const fileIdMatch = driveUrl.match(/\/d\/([a-zA-Z0-9_-]+)/);

        if (!fileIdMatch) {
          logger.warn("Could not extract file ID from Drive URL", {
            documentId: doc.legacyId,
            driveUrl,
          });
          result.failed++;
          result.errors.push(`Invalid Drive URL for document ${doc.legacyId}`);
          continue;
        }

        const fileId = fileIdMatch[1];

        // Analizza il file Excel o Google Sheets
        const excelAnalysis = await analyzeExcelContentOptimized(drive, fileId);

        // Aggiorna il documento nel database
        await mongoStorage.updateDocument(doc.legacyId, {
          alertStatus: excelAnalysis.alertStatus,
          expiryDate: excelAnalysis.expiryDate,
        });

        // Crea un log dell'aggiornamento
        await mongoStorage.createLog({
          userId,
          action: "update_expiry",
          documentId: doc.legacyId,
          details: {
            message: `Aggiornata data di scadenza ${
              doc.fileType === "gsheet" ? "Google Sheets" : "Excel"
            }`,
            oldExpiryDate: doc.expiryDate,
            newExpiryDate: excelAnalysis.expiryDate,
            oldAlertStatus: doc.alertStatus,
            newAlertStatus: excelAnalysis.alertStatus,
            fileType: doc.fileType,
          },
        });

        result.updated++;

        logger.info("Updated document expiry date", {
          documentId: doc.legacyId,
          title: doc.title,
          fileType: doc.fileType,
          oldExpiryDate: doc.expiryDate,
          newExpiryDate: excelAnalysis.expiryDate,
          oldAlertStatus: doc.alertStatus,
          newAlertStatus: excelAnalysis.alertStatus,
        });
      } catch (error) {
        result.failed++;
        const errorMessage = `Failed to update document ${doc.legacyId}: ${
          error instanceof Error ? error.message : String(error)
        }`;
        result.errors.push(errorMessage);

        logger.error("Failed to update document expiry date", {
          documentId: doc.legacyId,
          title: doc.title,
          fileType: doc.fileType,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    logger.info("Excel/Google Sheets expiry dates update completed", {
      userId,
      updated: result.updated,
      failed: result.failed,
      totalProcessed: excelDocuments.length,
    });

    return result;
  } catch (error) {
    logger.error("Failed to update Excel/Google Sheets expiry dates", {
      userId,
      error: error instanceof Error ? error.message : String(error),
    });
    result.errors.push(
      `General error: ${error instanceof Error ? error.message : String(error)}`
    );
    return result;
  }
}

// Funzione per calcolare dinamicamente l'alertStatus basandosi sulla data corrente
export function calculateDynamicAlertStatus(
  expiryDate: Date | null,
  warningDays: number = 30
): Alert {
  if (!expiryDate) {
    return "none";
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const warningLimit = new Date(today);
  warningLimit.setDate(today.getDate() + warningDays);

  // Normalizza la data di scadenza per il confronto
  const normalizedExpiryDate = new Date(expiryDate);
  normalizedExpiryDate.setHours(0, 0, 0, 0);

  if (normalizedExpiryDate < today) {
    return "expired";
  } else if (normalizedExpiryDate <= warningLimit) {
    return "warning";
  } else {
    return "none";
  }
}

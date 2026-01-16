import {
  DocumentDocument as Document,
  InsertDocument,
} from "./shared-types/schema";
import path from "path";
import fs from "fs";
import ExcelJS from "exceljs";
import { v4 as uuidv4 } from "uuid";
import { mongoStorage } from "../server/mongo-storage";
import {
  googleDriveListFiles,
  googleDriveGetStream,
  googleDriveGetStartPageToken,
  googleDriveGetChanges,
} from "./google-drive-api";

import { google } from "googleapis";
import { getDriveClientForClient } from "./google-oauth";
import logger from "./logger";
import { sendSyncErrorNotifications } from "./notification-service";
import { parse } from "date-fns";
import { appEvents } from "./app-events";
import {
  isCloudStorageConfigured,
  uploadBufferToCloudStorage,
  downloadStreamFromCloudStorage,
  deleteFileFromCloudStorageWithRetry,
} from "./google-cloud-storage";
import { Readable } from "stream";

// Assicurati che questa variabile sia definita fuori dalla funzione (a livello di file)
// Serve per memorizzare i timer attivi per ogni utente
const activeSyncTimers: Record<number, NodeJS.Timeout> = {};

// Configurazione MASSIMA ottimizzata per Render con Cloud Storage
// AGGIORNAMENTO: Parallelizzazione aumentata per supportare 50K+ documenti
const SYNC_CONFIG = {
  maxRetries: 2, // Ridotto da 3 a 2 per evitare timeout Render
  retryDelay: 500, // Ridotto da 1s a 500ms
  maxRetryDelay: 15001, // Ridotto da 30s a 15s per ambiente Render
  timeout: 20000, // Ridotto da 30s a 20s per operazioni Google Drive
  batchSize: 100, // ULTRA-MASSIMO: aumentato da 50 a 100 per velocità estrema
  maxConcurrentNonExcel: 30, // ULTRA-MASSIMO: aumentato da 15 a 30 (file non-Excel sono veloci)
  maxConcurrentExcel: 20, // ULTRA-MASSIMO: aumentato da 15 a 20 (Excel con GCS è sicuro)
  skipExcelAnalysis: false, // Flag per saltare analisi Excel se necessario
  renderOptimized: true, // Flag per ottimizzazioni specifiche Render
  batchPauseMs: 0, // MASSIMO: rimossa pausa tra batch (GCS lo permette)
  chunkPauseMs: 0, // MASSIMO: rimossa pausa tra chunk (GCS lo permette)
  useCloudStorage: true, // NUOVO: usa Cloud Storage invece di /tmp
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
    logger.debug("Starting Excel memory analysis", { filePath });

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

    // Use standard Workbook (In-Memory)
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath);

    let expiryDate: Date | null = null;
    
    // Process only the first worksheet
    const worksheet = workbook.worksheets[0];
    if (worksheet) {
        // Only process first row (row 1) for cell A1
        const row = worksheet.getRow(1);
        const cellA1 = row.getCell(1);
        
        if (cellA1) {
             if (cellA1.formula) {
                  logger.debug(`Found formula in memory mode: ${cellA1.formula}`, { filePath });
                  const result = evaluator.evaluate(cellA1.formula);
                  
                  if (result.evaluated && result.value) {
                    expiryDate = result.value;
                    logger.debug(`Formula evaluated in memory: ${expiryDate.toISOString()}`, { filePath });
                  }
                }
                
                if (!expiryDate) {
                  let cellValue = cellA1.value ?? cellA1;
                  if (typeof cellValue === "object" && cellValue && "result" in cellValue) {
                    cellValue = (cellValue as ExcelJS.CellFormulaValue).result;
                  }
                  expiryDate = parseValueToUTCDate(cellValue);
                  logger.debug("Using memory cached value", { cellValue, expiryDate, filePath });
                }
        }
    }
    
    const alertStatus = calculateAlertStatus(expiryDate);
    
    if (!expiryDate) {
      logger.debug("No expiry date found in memory Excel analysis", { 
        filePath, 
        analysisTimeMs: Date.now() - startTime,
        alertStatus: "none",
        method: 'memory-optimized'
      });
    } else {
      logger.info("Memory Excel analysis completed", {
        filePath,
        expiryDate: (expiryDate as Date).toISOString(),
        alertStatus,
        analysisTimeMs: Date.now() - startTime,
        method: 'memory-optimized'
      });
    }
    
    return { alertStatus, expiryDate };
    
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

/**
 * Analizza Excel content direttamente da uno stream (Cloud Storage o altro)
 * NUOVO: Supporta analisi senza salvare su disco locale
 */
export async function analyzeExcelContentFromStream(
  stream: Readable,
  fileName: string
): Promise<ExcelAnalysis> {
  const evaluator = new FormulaEvaluator();
  const startTime = Date.now();

  try {
    logger.debug("Starting Excel streaming analysis from stream", { fileName });

    return await analyzeExcelContentStreamOptimizedFromStream(stream, evaluator, fileName);
    
  } catch (error) {
    const analysisTime = Date.now() - startTime;
    logger.error("Excel analysis from stream failed", { 
      fileName, 
      error: error instanceof Error ? error.message : String(error),
      analysisTimeMs: analysisTime
    });
    throw error;
  }
}

// Optimized in-memory approach for Render - from stream
async function analyzeExcelContentStreamOptimizedFromStream(
  stream: Readable,
  evaluator: FormulaEvaluator,
  fileName: string
): Promise<ExcelAnalysis> {
  const startTime = Date.now();
  
  try {
    // Use standard Workbook (In-Memory) as requested to avoid /tmp disk usage
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.read(stream);

    let expiryDate: Date | null = null;
    let totalRowsRead = 0;

    // Process only the first worksheet
    const worksheet = workbook.worksheets[0];
    if (worksheet) {
        // Only process first row (row 1) for cell A1
        const row = worksheet.getRow(1);
        totalRowsRead++;

        const cellA1 = row.getCell(1);
        
        if (cellA1) {
            // Check for formula first
            if (cellA1.formula) {
                logger.debug(`Found formula in memory mode: ${cellA1.formula}`, { fileName });
                const result = evaluator.evaluate(cellA1.formula);
                
                if (result.evaluated && result.value) {
                expiryDate = result.value;
                logger.debug(`Formula evaluated in memory: ${expiryDate.toISOString()}`, { fileName });
                }
            }
            
            // Fallback to cell value
            if (!expiryDate) {
                let cellValue = cellA1.value ?? cellA1;
                if (typeof cellValue === "object" && cellValue && "result" in cellValue) {
                cellValue = (cellValue as ExcelJS.CellFormulaValue).result;
                }
                expiryDate = parseValueToUTCDate(cellValue);
                logger.debug("Using memory cached value", { cellValue, expiryDate, fileName });
            }
        }
    }

    const analysisTime = Date.now() - startTime;
    
    const alertStatus = calculateAlertStatus(expiryDate);
    
    if (!expiryDate) {
      logger.debug("No expiry date found in memory Excel analysis", { 
        fileName, 
        analysisTimeMs: analysisTime,
        alertStatus: "none",
        method: 'memory-from-stream'
      });
    } else {
      logger.info("Memory Excel analysis completed", {
        fileName,
        expiryDate: (expiryDate as Date).toISOString(),
        alertStatus,
        analysisTimeMs: analysisTime,
        method: 'memory-from-stream'
      });
    }
    
    return { alertStatus, expiryDate };
    
  } catch (error) {
    const analysisTime = Date.now() - startTime;
    logger.error("Memory Excel analysis failed", {
      fileName,
      error: error instanceof Error ? error.message : String(error),
      analysisTimeMs: analysisTime,
      method: 'memory-from-stream'
    });
    
    throw error;
  }
}

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
  let cloudStorageFileName: string | null = null;
  let metadata: any = null;

  // Use new optimized timeout from EXCEL_LIMITS
  const RENDER_TIMEOUT = EXCEL_LIMITS.RENDER_TIMEOUT_MS;

  try {
    // Prova a ottenere i metadati del file
    metadata = await drive.files.get({
      fileId,
      fields: "name,mimeType,modifiedTime,createdTime,size",
      supportsAllDrives: true,
    });

    const fileName = metadata.data.name;
    const mimeType = metadata.data.mimeType;
    const fileSize = parseInt(metadata.data.size || '0', 10);

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

    // SISTEMA IBRIDO AUTOMATICO: Ottimizza in base alla dimensione del file
    const useCloudStorage = SYNC_CONFIG.useCloudStorage && await isCloudStorageConfigured();
    const fileSizeMB = fileSize / 1024 / 1024;
    
    // Decisione automatica: file piccoli in memoria, file grandi su Cloud Storage
    const useInMemory = fileSizeMB < EXCEL_LIMITS.MAX_FILE_SIZE_MB;
    
    if (useCloudStorage && !useInMemory) {
      // STRATEGIA 1: File ≥10MB → Cloud Storage (sicuro per memoria)
      logger.info("Large file - using Cloud Storage strategy", {
        fileId,
        fileName,
        mimeType,
        isGoogleSheet,
        fileSizeMB: fileSizeMB.toFixed(2),
        strategy: 'cloud-storage',
      });

      // Download file da Google Drive come buffer (in memoria)
      const buffer = await downloadFileAsBuffer(drive, fileId, isGoogleSheet);
      
      // Upload su Cloud Storage
      cloudStorageFileName = await uploadBufferToCloudStorage(
        buffer,
        fileName,
        {
          fileId,
          mimeType,
          source: 'google-drive-analysis',
          fileSizeMB: fileSizeMB.toFixed(2),
        }
      );

      logger.debug("File uploaded to Cloud Storage", {
        cloudStorageFileName,
        bufferSizeMB: (buffer.length / 1024 / 1024).toFixed(2),
      });

      // Crea stream da Cloud Storage
      const stream = downloadStreamFromCloudStorage(cloudStorageFileName);

      // Analizza direttamente dallo stream
      const analysis = await analyzeExcelContentFromStream(stream, fileName);

      logger.info("File analysis completed successfully (Cloud Storage)", {
        fileId,
        fileName,
        mimeType,
        isGoogleSheet,
        fileSizeMB: fileSizeMB.toFixed(2),
        alertStatus: analysis.alertStatus,
        expiryDate: analysis.expiryDate?.toISOString(),
        strategy: 'cloud-storage',
      });

      return analysis;
      
    } else {
      // STRATEGIA 2: File <10MB o GCS non configurato → In-Memory (più veloce)
      const strategy = useInMemory ? 'in-memory-optimized' : 'in-memory-fallback';
      const logLevel = useCloudStorage ? 'info' : 'warn';
      
      logger[logLevel](`Small file - using in-memory strategy`, {
        fileId,
        fileName,
        mimeType,
        isGoogleSheet,
        fileSizeMB: fileSizeMB.toFixed(2),
        strategy,
        reason: useInMemory 
          ? 'file < 10MB (optimal for performance)' 
          : 'Cloud Storage not configured',
      });

      // Download e analizza direttamente in memoria (nessun file temporaneo)
      const buffer = await downloadFileAsBuffer(drive, fileId, isGoogleSheet);
      const { Readable } = await import('stream');
      const stream = Readable.from(buffer);
      
      const analysis = await analyzeExcelContentFromStream(stream, fileName);
      
      logger[logLevel]("File analysis completed successfully (In-Memory)", {
        fileId,
        fileName,
        mimeType,
        isGoogleSheet,
        fileSizeMB: fileSizeMB.toFixed(2),
        alertStatus: analysis.alertStatus,
        expiryDate: analysis.expiryDate?.toISOString(),
        strategy,
      });
      
      return analysis;
    }
  } catch (error) {
    logger.warn("Failed to analyze file content", {
      fileId,
      fileName: metadata?.data?.name,
      mimeType: metadata?.data?.mimeType,
      error: error instanceof Error ? error.message : String(error),
    });
    return { alertStatus: "none", expiryDate: null };
  } finally {
    // Pulisci il file da Cloud Storage
    if (cloudStorageFileName) {
      await deleteFileFromCloudStorageWithRetry(cloudStorageFileName);
      logger.debug("Cloud Storage file cleaned up", { cloudStorageFileName });
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
  localFilePathOrBuffer?: string | Buffer
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
      localFilePathOrBuffer &&
      (fileType === "xlsx" || fileType === "xls" || fileType === "xlsm" || fileType === "gsheet")
    ) {
      if (Buffer.isBuffer(localFilePathOrBuffer)) {
        // Analisi da Buffer (in memoria)
        const stream = Readable.from(localFilePathOrBuffer);
        const excelAnalysis = await analyzeExcelContentFromStream(stream, fileName);
        alertStatus = excelAnalysis.alertStatus;
        expiryDate = excelAnalysis.expiryDate;
      } else if (typeof localFilePathOrBuffer === 'string') {
        // Analisi da File (su disco - legacy)
        const excelAnalysis = await analyzeExcelContent(localFilePathOrBuffer);
        alertStatus = excelAnalysis.alertStatus;
        expiryDate = excelAnalysis.expiryDate;
      }
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

    // Associa googleFileId per dedup globale
    (doc as any).googleFileId = file.id;

    // Preferisci dedup su googleFileId (multi-tenant)
    const existingByGoogleId = await mongoStorage.getDocumentByGoogleFileId(file.id);

    if (existingByGoogleId) {
      // FIX: Se è un file Excel/Sheet aggiornato, dobbiamo RI-ANALIZZARE il contenuto
      // altrimenti sovrascriviamo la vecchia data con null/none.
      if (
        (doc.fileType === "xlsx" ||
          doc.fileType === "xls" ||
          doc.fileType === "xlsm" ||
          doc.fileType === "gsheet") &&
        !SYNC_CONFIG.skipExcelAnalysis
      ) {
        try {
           const excelAnalysis = await analyzeExcelContentOptimized(drive, file.id!);
           doc.alertStatus = excelAnalysis.alertStatus;
           doc.expiryDate = excelAnalysis.expiryDate;
           logger.debug(`Re-analyzed updated Excel: ${file.name}`, { expiryDate: doc.expiryDate });
        } catch (err) {
           logger.warn(`Failed to re-analyze updated Excel: ${file.name}`, { error: err });
        }
      }

      await mongoStorage.updateDocument(existingByGoogleId.legacyId, {
        ...doc,
        clientId,
        // Aggiungi il nuovo client mantenendo gli altri già associati
        clientIds: [clientId],
        ownerId: userId,
      });
      logger.debug(`Document already existed (shared): ${file.name}`, {
        fileName: file.name,
        userId,
        clientId,
      });
      return { success: true };
    }

    // Fallback dedup su path/title/revision (legacy)
    const exists = await mongoStorage.getDocumentByPathAndTitleAndRevision(
      doc.path,
      doc.title,
      doc.revision,
      clientId
    );

    if (exists) {
      logger.debug(`Document already exists (legacy path/rev): ${file.name}`, {
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
      clientIds: [clientId],
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

  // Processa file in parallelo con limitazione (usa concorrenza non-Excel come default)
  const chunks = [];
  for (let i = 0; i < batch.length; i += SYNC_CONFIG.maxConcurrentNonExcel) {
    chunks.push(batch.slice(i, i + SYNC_CONFIG.maxConcurrentNonExcel));
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

    // Pausa minima tra i chunk per evitare rate limiting (ottimizzata)
    if (chunkIndex < chunks.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, SYNC_CONFIG.chunkPauseMs));
    }
  }

  return results;
}

/**
 * Sincronizza una cartella Google Drive (e tutte le sue sottocartelle) con il DB.
 * Versione ottimizzata per velocità e performance con Sync Ibrida (Full vs Incrementale).
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

    // Recupera il client completo per verificare il token di sync
    let client: any = null;
    try {
      client = await mongoStorage.getClient(clientId);
      clientName = client?.name || "Unknown";
      logger.info("Client data retrieved", {
        clientId,
        clientName,
        hasGoogleTokens: !!client?.google?.refreshToken,
        hasSyncToken: !!client?.google?.syncToken,
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

    // 4. Bivio: Sync Incrementale vs Full Sync
    const syncToken = client?.google?.syncToken;

    if (syncToken) {
      // CASO B: Incremental Sync (Token Presente)
      logger.info("Executing Incremental Sync using token", { syncToken: syncToken.substring(0, 10) + "..." });
      
      try {
        const { changes, newStartPageToken } = await googleDriveGetChanges(drive, syncToken);
        
        logger.info(`Found ${changes.length} changes to process`, { count: changes.length });

        // Processa le modifiche
        for (const change of changes) {
          if (change.removed || change.file?.trashed) {
            // Gestione Cancellazioni
            const googleFileId = change.fileId;
            if (googleFileId) {
              const doc = await mongoStorage.getDocumentByGoogleFileId(googleFileId);
              if (doc) {
                // Marcalo come obsoleto o cancellalo
                await mongoStorage.markDocumentObsolete(doc.legacyId);
                logger.info(`Document marked obsolete (deleted in Drive): ${doc.title}`, { googleFileId });
                result.processed++;
              }
            }
          } else if (change.file) {
            // Gestione Aggiornamenti / Creazioni
            // Processa come un normale file
            const processingResult = await processFileWithErrorHandlingOptimized(drive, change.file, userId, clientId);
            if (processingResult.success) {
              result.processed++;
            } else {
              result.failed++;
              if (processingResult.error) result.errors.push(processingResult.error);
            }
          }
        }

        // Aggiorna il token
        await mongoStorage.updateClientSyncToken(clientId, newStartPageToken);
        logger.info("Incremental Sync completed, token updated", { newStartPageToken: newStartPageToken.substring(0, 10) + "..." });
        
        result.success = result.failed === 0;

      } catch (incrementalError: any) {
        // Se il token è scaduto o invalido (410 Gone, 400 Bad Request), fallback a Full Sync
        if (incrementalError.code === 410 || (incrementalError.response?.status === 410)) {
           logger.warn("Sync token expired (410), falling back to Full Sync");
           // Resetta token e procedi con full sync
           await mongoStorage.updateClientSyncToken(clientId, "");
           return syncWithGoogleDrive(syncFolder, userId, onProgress); // Ricorsione sicura (token vuoto)
        }
        throw incrementalError;
      }

    } else {
      // CASO A: Full Sync (Primo Avvio / Nessun Token)
      logger.info("Executing Full Sync (No token found)");

      // Ottieni subito il token per il futuro (prima del list per non perdere eventi futuri, 
      // anche se tecnicamente c'è una race condition minima, è la practice standard)
      // Oppure: List -> Save -> Get Token -> Save. 
      // Se faccio Get Token prima, e poi List, se un file cambia durante il List, lo vedo nel List.
      // E al prossimo incremental sync (dal Token in poi), lo rivedo. Meglio processare due volte che perdere dati.
      // Quindi prendiamo il token PRIMA.
      /* 
         Tuttavia, l'utente ha chiesto specificamente: 
         "Esegui drive.files.list... Salva tutto... Chiedi a Google il startPageToken attuale e salvalo."
         Seguirò l'istruzione dell'utente per aderenza ai requisiti.
      */
      
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

      if (onProgress) {
        onProgress(0, files.length, 0, 1);
      }

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
          (processed, total, currentBatch, totalBatches) => {
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

        result.processed += batchResults.processed;
        result.failed += batchResults.failed;
        result.errors.push(...batchResults.errors);

        if (batchIndex < batches.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, SYNC_CONFIG.batchPauseMs));
        }
      }

      // DOPO aver salvato tutto, prendiamo il token per la prossima volta
      const newStartPageToken = await googleDriveGetStartPageToken(drive);
      await mongoStorage.updateClientSyncToken(clientId, newStartPageToken);
      logger.info("Full Sync completed, startPageToken saved", { newStartPageToken: newStartPageToken.substring(0, 10) + "..." });
      
      result.success = result.failed === 0;
    }

    result.duration = Date.now() - startTime;

    // Report progresso finale (100%) se non incrementale (che ha pochi file)
    if (onProgress && !syncToken) {
       // Per sync full, garantiamo 100%
       onProgress(result.processed, result.processed + result.failed, 1, 1);
    }

    logger.info("Optimized Google Drive sync completed", {
      userId,
      clientId,
      success: result.success,
      processed: result.processed,
      failed: result.failed,
      duration: result.duration,
      errorCount: result.errors.length,
      mode: syncToken ? 'incremental' : 'full'
    });

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

// Funzione batch OTTIMIZZATA - Processa tutti i file in parallelo con Cloud Storage
// NUOVO: Con Cloud Storage, anche gli Excel possono essere parallelizzati (no più limiti /tmp)
async function processBatchWithAnalysis(
  drive: any,
  files: any[],
  userId: number,
  clientId: number,
  onProgress?: (processed: number, total: number, currentBatch: number, totalBatches: number) => void
): Promise<BatchResult> {
  const result: BatchResult = {
    processed: 0,
    failed: 0,
    errors: [],
  };

  // OTTIMIZZAZIONE 1: Separa file Excel e non-Excel
  const excelFiles: any[] = [];
  const nonExcelFiles: any[] = [];
  
  for (const file of files) {
    if (isExcelFile(file.mimeType) || file.mimeType === "application/vnd.google-apps.spreadsheet") {
      excelFiles.push(file);
    } else {
      nonExcelFiles.push(file);
    }
  }

  logger.debug(`Batch optimization: ${nonExcelFiles.length} non-Excel (parallel), ${excelFiles.length} Excel (sequential)`, {
    userId, clientId
  });

  // OTTIMIZZAZIONE 2: Processa file non-Excel in PARALLELO (nessun download necessario)
  if (nonExcelFiles.length > 0) {
    const nonExcelPromises = nonExcelFiles.map(async (file) => {
      try {
        const docInfo = await processDocumentFile(file.name!, file.webViewLink!, undefined);
        
        if (!docInfo) {
          logger.debug(`Skipped non-Excel file (invalid format): ${file.name}`);
          return { success: false, skipped: true };
        }

        const documentData = {
          ...docInfo,
          alertStatus: "none" as const,
          expiryDate: null,
          clientId,
          clientIds: [clientId],
          ownerId: userId,
          googleFileId: file.id,
          mimeType: file.mimeType,
          lastSynced: new Date(),
        };

        const existingDoc = await mongoStorage.getDocumentByGoogleFileId(file.id);

        if (existingDoc) {
          await mongoStorage.updateDocument(existingDoc.legacyId, documentData);
        } else {
          await mongoStorage.createDocument(documentData);
        }

        return { success: true };
      } catch (error) {
        logger.error(`Failed to process non-Excel file: ${file.name}`, {
          error: error instanceof Error ? error.message : String(error),
        });
        return { success: false, error };
      }
    });

    // Esegui in parallelo con limite di concorrenza
    const chunks = [];
    for (let i = 0; i < nonExcelPromises.length; i += SYNC_CONFIG.maxConcurrentNonExcel) {
      chunks.push(nonExcelPromises.slice(i, i + SYNC_CONFIG.maxConcurrentNonExcel));
    }

    for (let chunkIndex = 0; chunkIndex < chunks.length; chunkIndex++) {
      const chunk = chunks[chunkIndex];
      const chunkResults = await Promise.allSettled(chunk);
      
      for (const chunkResult of chunkResults) {
        if (chunkResult.status === "fulfilled" && chunkResult.value.success) {
          result.processed++;
        } else if (chunkResult.status === "fulfilled" && !chunkResult.value.skipped) {
          result.failed++;
        }
        // skipped files non contano come processed o failed
      }

      // Report progresso con batch info
      if (onProgress) {
        const currentBatch = chunkIndex + 1;
        const totalBatches = Math.max(chunks.length, 1) + excelFiles.length;
        onProgress(result.processed, files.length, currentBatch, totalBatches);
      }

      // Pausa minima tra chunk (ridotta per velocità)
      if (chunkIndex < chunks.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, SYNC_CONFIG.chunkPauseMs));
      }
    }
  }

  // OTTIMIZZAZIONE 3: Processa file Excel SEQUENZIALMENTE (sicuro per /tmp)
  const totalChunks = (nonExcelFiles.length > 0 ? Math.ceil(nonExcelFiles.length / SYNC_CONFIG.maxConcurrentNonExcel) : 0);
  
  for (let excelIndex = 0; excelIndex < excelFiles.length; excelIndex++) {
    const file = excelFiles[excelIndex];
    try {
      let analysis: ExcelAnalysis = { alertStatus: "none", expiryDate: null };

      try {
        if (file.mimeType === "application/vnd.google-apps.spreadsheet") {
          // Google Sheets - API diretta (no download)
          analysis = await analyzeGoogleSheet(drive, file.id);
        } else if (isExcelFile(file.mimeType)) {
          // Excel nativo - usa Cloud Storage o in-memory (NO /tmp!)
          analysis = await analyzeExcelContentOptimized(drive, file.id);
        }
      } catch (analysisError) {
        logger.warn(`Could not analyze Excel: ${file.name}`, {
          error: analysisError instanceof Error ? analysisError.message : String(analysisError),
        });
      }

      const docInfo = await processDocumentFile(file.name!, file.webViewLink!, undefined);

      if (!docInfo) {
        logger.debug(`Skipped Excel file (invalid format): ${file.name}`);
        continue;
      }

      const documentData = {
        ...docInfo,
        alertStatus: analysis.alertStatus as "none" | "warning" | "expired",
        expiryDate: analysis.expiryDate,
        clientId,
        clientIds: [clientId],
        ownerId: userId,
        googleFileId: file.id,
        mimeType: file.mimeType,
        lastSynced: new Date(),
      };

      const existingDoc = await mongoStorage.getDocumentByGoogleFileId(file.id);

      if (existingDoc) {
        await mongoStorage.updateDocument(existingDoc.legacyId, documentData);
        logger.debug(`Updated Excel: ${file.name}`);
      } else {
        await mongoStorage.createDocument(documentData);
        logger.debug(`Created Excel: ${file.name}`);
      }

      result.processed++;

      // Report progresso con batch info (Excel vengono processati uno per volta)
      if (onProgress) {
        const currentBatch = totalChunks + excelIndex + 1;
        const totalBatches = totalChunks + excelFiles.length;
        onProgress(result.processed, files.length, currentBatch, totalBatches);
      }
    } catch (error) {
      result.failed++;
      const syncError = createSyncError(
        `Failed to process Excel: ${file.name}`,
        "EXCEL_PROCESSING_FAILED",
        true,
        { fileId: file.id, fileName: file.name }
      );
      result.errors.push(syncError);

      logger.error(`Failed to process Excel: ${file.name}`, {
        error: error instanceof Error ? error.message : String(error),
      });
      
      // Report progresso anche in caso di errore
      if (onProgress) {
        const currentBatch = totalChunks + excelIndex + 1;
        const totalBatches = totalChunks + excelFiles.length;
        onProgress(result.processed, files.length, currentBatch, totalBatches);
      }
    }
  }

  // Report progresso finale (100%)
  if (onProgress) {
    const totalBatches = totalChunks + excelFiles.length;
    onProgress(result.processed, files.length, totalBatches, totalBatches);
  }

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

/**
 * Download file da Google Drive come buffer in memoria
 * NUOVO: Per usare con Cloud Storage invece di /tmp
 */
async function downloadFileAsBuffer(
  drive: any,
  fileId: string,
  isGoogleSheet: boolean
): Promise<Buffer> {
  try {
    const response = await drive.files.get(
      {
        fileId,
        alt: 'media',
        supportsAllDrives: true,
        ...(isGoogleSheet && {
          mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        }),
      },
      { responseType: 'arraybuffer' }
    );

    return Buffer.from(response.data);
  } catch (error) {
    logger.error("Failed to download file as buffer from Google Drive", {
      fileId,
      isGoogleSheet,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

/**
 * Download file da Google Drive su /tmp (DEPRECATO - usare Cloud Storage)
 * Mantenuto solo per compatibilità
 */
// RIMOSSO: downloadToTemp - Tutti i download ora usano Cloud Storage o in-memory

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

export function stopAutomaticSync(userId: number): void {
  if (activeSyncTimers[userId]) {
    clearTimeout(activeSyncTimers[userId]);
    delete activeSyncTimers[userId];
    logger.info("Sync stopped manually", { userId });
  }
}

export function startAutomaticSync(syncFolder: string, userId: number): void {
  // 1. Pulizia preventiva: fermiamo vecchi timer per questo utente
  stopAutomaticSync(userId);

  const runSync = async () => {
    try {
      // Esegue la sincronizzazione e ATTENDE il completamento (Bloccante per questo flusso)
      const result = await syncWithGoogleDrive(syncFolder, userId);

      // Logica intelligente per il ritardo
      // Se falliscono più file di quelli processati, rallentiamo a 10 min, altrimenti 5 min
      const isHighFailure = !result.success && (result.failed || 0) > (result.processed || 0);
      const nextDelay = isHighFailure ? 10 * 60 * 1000 : 5 * 60 * 1000;

      // 2. PROGRAMMAZIONE INTELLIGENTE
      // Salviamo il timer nella mappa globale così possiamo stopparlo se serve
      activeSyncTimers[userId] = setTimeout(runSync, nextDelay);

    } catch (error) {
      logger.error("Automatic sync critical error, retrying in 15m", { userId, error });
      // In caso di crash totale della funzione, riproviamo tra 15 minuti
      activeSyncTimers[userId] = setTimeout(runSync, 15 * 60 * 1000);
    }
  };

  // Lanciamo la prima esecuzione immediata
  runSync();
}

// Flag per evitare sync multiple simultanee
let isGlobalSyncRunning = false;

export function startAutomaticSyncForAllClients(): void {
  // Sync ogni 60 secondi (invece di 15 min) come richiesto
  logger.info("Starting automatic sync for all clients (every 60 seconds)");

  // Esegui la prima sync immediatamente
  syncAllClientsOnce();

  setInterval(() => {
    if (isGlobalSyncRunning) {
      logger.info("Skipping scheduled sync - previous sync still running");
      return;
    }

    logger.info("Running scheduled automatic sync for all clients");
    syncAllClientsOnce();
  }, 60 * 1000); // 60 secondi
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

// Funzione per aggiornare le date di scadenza di TUTTI i client (Daily Job)
export async function updateAllClientsExcelExpiryDates(): Promise<void> {
  if (isGlobalSyncRunning) {
    logger.info("Skipping Excel expiry update - Global sync is running");
    return;
  }

  // Usiamo il flag di sync globale per evitare conflitti
  isGlobalSyncRunning = true;
  const startTime = Date.now();
  
  try {
    logger.info("Starting DAILY Excel/Google Sheets expiry dates update for ALL clients");

    const clients = await mongoStorage.getAllClients();
    const users = await mongoStorage.getAllUsers();

    for (const client of clients) {
      const admin = users.find(
        (u) => u.clientId === client.legacyId && u.role === "admin"
      );

      if (!admin) {
        logger.warn("No admin user found for client (skipping Excel update)", {
          clientId: client.legacyId,
        });
        continue;
      }

      const userId = admin.legacyId;

      try {
        // Inizializza Drive Client
        const drive = await getDriveClientForClient(client.legacyId);
        
        // Esegui aggiornamento
        await updateExcelExpiryDates(drive, userId);
        
      } catch (error) {
        logger.error("Failed to update Excel dates for client", {
          clientId: client.legacyId,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
    
    logger.info("Daily Excel expiry update completed", {
      duration: Date.now() - startTime
    });

  } catch (error) {
    logger.error("Daily Excel expiry update failed", {
      error: error instanceof Error ? error.message : String(error),
    });
  } finally {
    isGlobalSyncRunning = false;
  }
}

// Scheduler per l'aggiornamento giornaliero delle date Excel
export function startDailyExcelRefresh(): void {
  // Eseguiamo il job ogni 24 ore
  const INTERVAL_MS = 24 * 60 * 60 * 1000;
  
  // Calcola il tempo fino alla prossima esecuzione (es. 03:00 AM)
  // Per ora, avviamo semplicemente un intervallo
  setInterval(() => {
    logger.info("Running scheduled Daily Excel expiry refresh");
    updateAllClientsExcelExpiryDates();
  }, INTERVAL_MS);
  
  logger.info("Daily Excel expiry refresh scheduler started (every 24h)");
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

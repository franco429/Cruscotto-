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

const syncIntervals: Record<number, NodeJS.Timeout> = {};

// Configurazione per retry e fallback
const SYNC_CONFIG = {
  maxRetries: 3,
  retryDelay: 1000, // 1 secondo
  maxRetryDelay: 30000, // 30 secondi
  timeout: 30000, // 30 secondi per operazioni Google Drive
  batchSize: 20, // Aumentato da 10 a 20 per velocizzare
  maxConcurrent: 5, // Processamento parallelo con limitazione
  skipExcelAnalysis: false, // Flag per saltare analisi Excel se necessario
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
        error instanceof Error && 'code' in error ? String(error.code) : undefined,
        attempt < maxRetries,
        { context, attempt, maxRetries }
      );

      // Se non è retryable o abbiamo esaurito i tentativi, lancia l'errore
      if (!lastError.retryable || attempt === maxRetries) {
        break;
      }

      // Log del retry
      logger.warn(`Retry attempt ${attempt + 1}/${maxRetries + 1} for ${context}`, {
        error: lastError.message,
        code: lastError.code,
        delay: exponentialBackoff(attempt),
        context: lastError.context
      });

      // Attendi prima del prossimo tentativo
      await new Promise(resolve => setTimeout(resolve, exponentialBackoff(attempt)));
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
      fields: 'files(id, name)',
    });
    return true;
  } catch (error) {
    logger.error('Google Drive connection validation failed', {
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
    /https:\/\/drive\.google\.com\/open\?id=([a-zA-Z0-9_-]+)(?:&[^\s]*)?/, // open?id=
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
  const match = filePath.match(fileNamePattern);
  return match ? match[1] : null;
}

export function parseTitle(filePath: string): string | null {
  const match = filePath.match(fileNamePattern);
  return match ? match[2].trim() : null;
}

export function parseRevision(filePath: string): string | null {
  const match = filePath.match(fileNamePattern);
  return match ? `Rev.${match[3]}` : null;
}

export function parseDate(filePath: string): string | null {
  const match = filePath.match(fileNamePattern);
  return match ? match[4] : null;
}

export function parseFileType(filePath: string): string | null {
  const match = filePath.match(fileNamePattern);
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
  else if (typeof value === 'number') {
    // 25569 è il numero di giorni di offset tra l'epoca di Excel (1900) e l'epoca Unix (1970)
    if (value > 25569) {
      const milliseconds = (value - 25569) * 86400 * 1000;
      parsed = new Date(milliseconds);
    }
  }
  // Caso 3: È una stringa
  else if (typeof value === 'string') {
    // Tentativo #1: formato DD/MM/YYYY (comune in Italia)
    let tempDate = parse(value, 'dd/MM/yyyy', new Date());
    if (!isNaN(tempDate.getTime())) {
      parsed = tempDate;
    } else {
      // Tentativo #2: Fallback al parser nativo per formati ISO (YYYY-MM-DD) e altri.
      tempDate = new Date(value);
      if (!isNaN(tempDate.getTime())) {
        parsed = tempDate;
      }
    }
  }

  // Se il parsing ha funzionato, normalizza la data a mezzanotte UTC
  // per eliminare l'ora e il fuso orario.
  if (parsed && !isNaN(parsed.getTime())) {
    return new Date(Date.UTC(parsed.getUTCFullYear(), parsed.getUTCMonth(), parsed.getUTCDate()));
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
    if (!formula || typeof formula !== 'string') {
      return { value: null, evaluated: false, error: 'Invalid formula' };
    }

    const cleanFormula = formula.trim().replace(/^=/, '').toUpperCase();
    
    try {
      // TODAY/OGGI + offset
      const todayMatch = cleanFormula.match(/^(TODAY|OGGI)\(\)(?:\s*([+\-])\s*(\d+))?$/);
      if (todayMatch) {
        const offset = todayMatch[2] && todayMatch[3] ? 
          (todayMatch[2] === '+' ? 1 : -1) * parseInt(todayMatch[3]) : 0;
        const result = new Date(this.today);
        result.setDate(result.getDate() + offset);
        return { value: result, evaluated: true };
      }

      // NOW + offset
      const nowMatch = cleanFormula.match(/^NOW\(\)(?:\s*([+\-])\s*(\d+))?$/);
      if (nowMatch) {
        const offset = nowMatch[2] && nowMatch[3] ? 
          (nowMatch[2] === '+' ? 1 : -1) * parseInt(nowMatch[3]) : 0;
        const result = new Date(this.today);
        result.setDate(result.getDate() + offset);
        return { value: result, evaluated: true };
      }

      // DATE(year, month, day)
      const dateMatch = cleanFormula.match(/^DATE\((\d{4}),\s*(\d{1,2}),\s*(\d{1,2})\)$/);
      if (dateMatch) {
        const year = parseInt(dateMatch[1]);
        const month = parseInt(dateMatch[2]) - 1; // JS months are 0-indexed
        const day = parseInt(dateMatch[3]);
        const result = new Date(year, month, day);
        return { value: result, evaluated: true };
      }

      return { value: null, evaluated: false, error: 'Unsupported formula pattern' };

    } catch (error) {
      return { value: null, evaluated: false, error: error instanceof Error ? error.message : 'Evaluation error' };
    }
  }
}

// ===== EXCEL ANALYZER (UPDATED) =====
export async function analyzeExcelContent(filePath: string): Promise<ExcelAnalysis> {
  const evaluator = new FormulaEvaluator();
  
  try {
    logger.info('Starting Excel analysis', { filePath });
    
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath);
    
    const worksheet = workbook.getWorksheet(1);
    if (!worksheet) {
      return { alertStatus: "none", expiryDate: null };
    }
    
    const cellA1 = worksheet.getCell('A1');
    let expiryDate: Date | null = null;
    
    // Priority 1: Evaluate formula if present
    if (cellA1.formula) {
      logger.info(`Found formula: ${cellA1.formula}`, { filePath });
      const result = evaluator.evaluate(cellA1.formula);
      
      if (result.evaluated && result.value) {
        expiryDate = result.value;
        logger.info(`Formula evaluated: ${expiryDate.toISOString()}`, { filePath });
      } else {
        logger.warn(`Formula evaluation failed: ${result.error}`, { filePath });
      }
    }
    
    // Priority 2: Fallback to cached result
    if (!expiryDate) {
      let cellValue = cellA1.value;
      if (typeof cellValue === 'object' && cellValue && 'result' in cellValue) {
        cellValue = (cellValue as ExcelJS.CellFormulaValue).result;
      }
      expiryDate = parseValueToUTCDate(cellValue);
      logger.info('Using fallback cached value', { cellValue, expiryDate, filePath });
    }
    
    if (!expiryDate) {
      logger.warn('No valid date found in A1', { cellA1: cellA1.value, filePath });
      return { alertStatus: "none", expiryDate: null };
    }
    
    // Calculate alert status
    const alertStatus = calculateAlertStatus(expiryDate);
    
    logger.info('Analysis complete', { expiryDate, alertStatus, filePath });
    return { alertStatus, expiryDate };
    
  } catch (error) {
    logger.error('Excel analysis failed', { filePath, error });
    return { alertStatus: "none", expiryDate: null };
  }
}

// ===== ALERT STATUS CALCULATOR =====
function calculateAlertStatus(expiryDate: Date): Alert {
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
  
  try {
    // Prova a ottenere i metadati del file
    metadata = await drive.files.get({
      fileId,
      fields: 'name,mimeType,modifiedTime,createdTime'
    });

    const fileName = metadata.data.name;
    const mimeType = metadata.data.mimeType;
    
    // Controlla se è un file Excel o Google Sheets
    const isExcelFile = fileName?.toLowerCase().endsWith('.xlsx') || 
                       fileName?.toLowerCase().endsWith('.xls');
    const isGoogleSheet = mimeType === 'application/vnd.google-apps.spreadsheet';
    
    if (!isExcelFile && !isGoogleSheet) {
      logger.debug('File is not Excel or Google Sheets, skipping analysis', {
        fileId,
        fileName,
        mimeType
      });
      return { alertStatus: "none", expiryDate: null };
    }

    // Crea un percorso temporaneo per il file
    const tempDir = os.tmpdir();
    const uniqueId = uuidv4();
    const fileExtension = isGoogleSheet ? '.xlsx' : path.extname(fileName || '');
    tempFilePath = path.join(tempDir, `excel_analysis_${uniqueId}${fileExtension}`);
    
    logger.info('Downloading file for analysis', {
      fileId,
      fileName,
      mimeType,
      isGoogleSheet,
      tempFilePath
    });
    
    // Scarica il file (Excel nativo o Google Sheets esportato)
    await googleDriveDownloadFile(drive, fileId, tempFilePath);
    
    // Analizza il contenuto del file
    const analysis = await analyzeExcelContent(tempFilePath);
    
    logger.info('File analysis completed successfully', {
      fileId,
      fileName,
      mimeType,
      isGoogleSheet,
      alertStatus: analysis.alertStatus,
      expiryDate: analysis.expiryDate?.toISOString()
    });
    
    return analysis;
    
  } catch (error) {
    logger.warn('Failed to analyze file content', {
      fileId,
      fileName: metadata?.data?.name,
      mimeType: metadata?.data?.mimeType,
      error: error instanceof Error ? error.message : String(error)
    });
    return { alertStatus: "none", expiryDate: null };
  } finally {
    // Pulisci il file temporaneo
    if (tempFilePath && fs.existsSync(tempFilePath)) {
      try {
        fs.unlinkSync(tempFilePath);
        logger.debug('Temporary file cleaned up', { tempFilePath });
      } catch (cleanupError) {
        logger.warn('Failed to cleanup temporary file', {
          tempFilePath,
          error: cleanupError instanceof Error ? cleanupError.message : String(cleanupError)
        });
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

    if (localFilePath && (fileType === "xlsx" || fileType === "xls" || fileType === "gsheet")) {
      const excelAnalysis = await analyzeExcelContent(localFilePath);
      alertStatus = excelAnalysis.alertStatus; // Valori calcolati
      expiryDate = excelAnalysis.expiryDate;   // Valori calcolati
    }

    // L'oggetto `document` ora include i campi corretti.
    const document: InsertDocument = {
      title,
      path: isoPath,
      revision,
      driveUrl,
      fileType,
      isObsolete: false,
      // --- CORREZIONE QUI ---
      alertStatus, // Aggiungi il valore calcolato
      expiryDate,  // Aggiungi il valore calcolato
      // --- FINE CORREZIONE ---
      parentId: undefined,
      fileHash: undefined,
      encryptedCachePath: undefined,
      ownerId: undefined,
      clientId: undefined,
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
  currentRevision: string
): Promise<Document[]> {
  const currentRevNum = parseInt(currentRevision.replace("Rev.", ""), 10);
  const documents = await mongoStorage.getDocumentsByPathAndTitle(
    documentPath,
    documentTitle
  );
  return documents.filter((doc) => {
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
      undefined // Non passiamo il file path per evitare download
    );

    if (!doc) {
      logger.debug(`Skipping invalid document: ${file.name}`, {
        fileName: file.name,
        userId,
        clientId
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
        clientId
      });
      return { success: true };
    }

    // Se è un file Excel/Google Sheets e l'analisi è abilitata, analizzalo
    if ((doc.fileType === 'xlsx' || doc.fileType === 'xls' || doc.fileType === 'gsheet') && !SYNC_CONFIG.skipExcelAnalysis) {
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

    // Gestione revisioni obsolete (solo se necessario)
    const obsolete = await findObsoleteRevisions(
      doc.path,
      doc.title,
      doc.revision
    );

    if (obsolete.length > 0) {
      await markObsoleteDocuments(obsolete, userId);
    }

    logger.info(`Successfully processed document: ${file.name}`, {
      fileName: file.name,
      userId,
      clientId,
      documentPath: doc.path,
      revision: doc.revision
    });

    return { success: true, document: createdDoc };

  } catch (error) {
    const syncError = createSyncError(
      `Failed to process file ${file.name}`,
      error instanceof Error && 'code' in error ? String(error.code) : 'UNKNOWN',
      true,
      {
        fileName: file.name,
        userId,
        clientId,
        fileId: file.id,
        error: error instanceof Error ? error.message : String(error)
      }
    );

    logger.error('File processing failed', {
      fileName: file.name,
      userId,
      clientId,
      error: syncError.message,
      code: syncError.code,
      context: syncError.context
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
): Promise<{ processed: number; failed: number; errors: SyncError[]; documents: any[] }> {
  const results = {
    processed: 0,
    failed: 0,
    errors: [] as SyncError[],
    documents: [] as any[]
  };

  // Processa file in parallelo con limitazione
  const chunks = [];
  for (let i = 0; i < batch.length; i += SYNC_CONFIG.maxConcurrent) {
    chunks.push(batch.slice(i, i + SYNC_CONFIG.maxConcurrent));
  }

  for (const [chunkIndex, chunk] of chunks.entries()) {
    const chunkPromises = chunk.map(file => 
      processFileWithErrorHandlingOptimized(drive, file, userId, clientId)
    );

    const chunkResults = await Promise.allSettled(chunkPromises);

    // Analizza risultati del chunk
    for (const chunkResult of chunkResults) {
      if (chunkResult.status === 'fulfilled') {
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
          'Chunk processing failed',
          'CHUNK_FAILED',
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
      await new Promise(resolve => setTimeout(resolve, 100));
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
  onProgress?: (processed: number, total: number, currentBatch: number, totalBatches: number) => void
): Promise<SyncResult> {
  const startTime = Date.now();
  const result: SyncResult = {
    success: false,
    processed: 0,
    failed: 0,
    errors: [],
    duration: 0
  };

  let clientName = 'Unknown';
  let clientId: number | undefined;

  try {
    logger.info('Starting optimized Google Drive sync', { 
      userId, 
      syncFolder,
      timestamp: new Date().toISOString()
    });

    // 1. Recupero dati utente e client
    logger.info('Retrieving user data', { userId });
    const user = await withRetry(
      () => mongoStorage.getUser(userId),
      'getUser',
      2
    );

    if (!user) {
      const error = createSyncError(
        'User not found',
        'USER_NOT_FOUND',
        false,
        { userId }
      );
      result.errors.push(error);
      logger.error('User not found during sync', { userId });
      throw error;
    }

    clientId = user?.clientId || undefined;
    logger.info('User data retrieved', { 
      userId, 
      clientId, 
      userEmail: user.email,
      userRole: user.role
    });

    if (!clientId) {
      const error = createSyncError(
        'User not found or has no client ID',
        'USER_NOT_FOUND',
        false,
        { userId }
      );
      result.errors.push(error);
      logger.error('User has no client ID', { userId });
      throw error;
    }

    // Recupera il nome del client per le notifiche
    try {
      const client = await mongoStorage.getClient(clientId);
      clientName = client?.name || 'Unknown';
      logger.info('Client data retrieved', { 
        clientId, 
        clientName,
        hasGoogleTokens: !!client?.google?.refreshToken,
        driveFolderId: client?.driveFolderId
      });
    } catch (clientError) {
      logger.warn('Failed to get client name for notifications', { 
        clientId, 
        error: clientError instanceof Error ? clientError.message : String(clientError)
      });
    }

    const folderId = await withRetry(
      () => mongoStorage.getFolderIdForUser(userId),
      'getFolderId',
      2
    ) || syncFolder;

    logger.info('Folder ID determined', { 
      userId, 
      clientId, 
      folderId, 
      syncFolder 
    });

    // 2. Inizializzazione del client di Google Drive
    logger.info('Initializing Google Drive client', { clientId });
    const drive = await withRetry(
      () => getDriveClientForClient(clientId!),
      'getDriveClient',
      3
    );

    logger.info('Google Drive client initialized successfully', { clientId });

    // 3. Validazione connessione
    logger.info('Validating Google Drive connection', { clientId });
    const isConnected = await validateDriveConnection(drive);
    if (!isConnected) {
      const error = createSyncError(
        'Google Drive connection failed',
        'DRIVE_CONNECTION_FAILED',
        true,
        { clientId, folderId }
      );
      result.errors.push(error);
      logger.error('Google Drive connection validation failed', { clientId, folderId });
      throw error;
    }

    logger.info('Google Drive connection validated successfully', { clientId });

    // 4. Elenco ricorsivo dei file
    const files = await withRetry(
      () => googleDriveListFiles(drive, folderId),
      'listFiles',
      3
    );

    logger.info(`Found ${files.length} files to process`, {
      userId,
      clientId,
      folderId,
      fileCount: files.length
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
        clientId
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
            onProgress(totalProcessed, totalFiles, batchIndex + 1, batches.length);
          }
        }
      );

      // Aggiorna risultati totali
      result.processed += batchResults.processed;
      result.failed += batchResults.failed;
      result.errors.push(...batchResults.errors);

      // Pausa ridotta tra i batch
      if (batchIndex < batches.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    }

    result.success = result.failed === 0;
    result.duration = Date.now() - startTime;

    logger.info('Optimized Google Drive sync completed', {
      userId,
      clientId,
      success: result.success,
      processed: result.processed,
      failed: result.failed,
      duration: result.duration,
      errorCount: result.errors.length,
      avgTimePerFile: result.duration / (result.processed + result.failed)
    });

    // Log dettagliato degli errori se ce ne sono
    if (result.errors.length > 0) {
      logger.warn('Sync completed with errors', {
        userId,
        clientId,
        errors: result.errors.map(e => ({
          message: e.message,
          code: e.code,
          retryable: e.retryable
        }))
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
          duration: result.duration
        });
      } catch (notificationError) {
        logger.error('Failed to send sync error notifications', {
          error: notificationError instanceof Error ? notificationError.message : String(notificationError),
          userId,
          clientId
        });
      }
    }

  } catch (error) {
    result.duration = Date.now() - startTime;
    result.success = false;

    const syncError = createSyncError(
      'Sync operation failed',
      error instanceof Error && 'code' in error ? String(error.code) : 'SYNC_FAILED',
      true,
      {
        userId,
        syncFolder,
        duration: result.duration,
        originalError: error instanceof Error ? error.message : String(error)
      }
    );

    result.errors.push(syncError);

    logger.error('Google Drive sync failed', {
      userId,
      syncFolder,
      error: syncError.message,
      code: syncError.code,
      duration: result.duration,
      context: syncError.context
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
          duration: result.duration
        });
      } catch (notificationError) {
        logger.error('Failed to send sync error notifications for fatal error', {
          error: notificationError instanceof Error ? notificationError.message : String(notificationError),
          userId,
          clientId
        });
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
    errors: []
  };

  const promises = files.map(async (file, index) => {
    try {
      // Analisi del contenuto del file
      let analysis: ExcelAnalysis = { alertStatus: "none", expiryDate: null };
      
      if (file.mimeType === 'application/vnd.google-apps.spreadsheet') {
        // Google Sheets - API diretta con drive esistente
        logger.debug(`Analyzing Google Sheet: ${file.name}`, { fileId: file.id });
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
            fs.unlinkSync(tempPath);
          }
        }
      } else {
        logger.debug(`Skipping analysis for unsupported file type: ${file.mimeType}`, { fileName: file.name });
      }

      // Crea/aggiorna documento nel DB con logica completa
      const docInfo = await processDocumentFile(file.name!, file.webViewLink!, undefined);

      if (!docInfo) {
        logger.debug(`Skipping file with invalid name format: ${file.name}`);
        return; // Salta questo file
      }

      const documentData = {
        ...docInfo, // Include path, title, revision, etc.
        alertStatus: analysis.alertStatus,
        expiryDate: analysis.expiryDate,
        clientId,
        ownerId: userId,
        googleFileId: file.id,
        mimeType: file.mimeType,
        lastSynced: new Date()
      };
      
      const existingDoc = await mongoStorage.getDocumentByGoogleFileId(file.id);
      
      if (existingDoc) {
        await mongoStorage.updateDocument(existingDoc.legacyId, documentData);
        logger.debug(`Updated document: ${file.name}`, { 
          alertStatus: analysis.alertStatus, 
          expiryDate: analysis.expiryDate 
        });
      } else {
        await mongoStorage.createDocument(documentData);
        logger.debug(`Created document: ${file.name}`, { 
          alertStatus: analysis.alertStatus, 
          expiryDate: analysis.expiryDate 
        });
      }

      result.processed++;
      
      if (onProgress) {
        onProgress(result.processed, files.length);
      }

    } catch (error) {
      result.failed++;
      const syncError = createSyncError(
        `Failed to process file: ${file.name}`,
        'FILE_PROCESSING_FAILED',
        true,
        { fileId: file.id, fileName: file.name }
      );
      result.errors.push(syncError);
      
      logger.error('Failed to process file in batch', {
        fileName: file.name,
        fileId: file.id,
        error: error instanceof Error ? error.message : String(error)
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
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
    'application/vnd.ms-excel', // .xls
    'application/vnd.ms-excel.sheet.macroEnabled.12' // .xlsm
  ];
  
  return excelTypes.includes(mimeType);
}

async function downloadToTemp(drive: any, file: { id: string; name: string }): Promise<string> {
  const tempDir = os.tmpdir();
  const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
  const tempPath = path.join(tempDir, `sync_${Date.now()}_${sanitizedName}`);
  
  await googleDriveDownloadFile(drive, file.id, tempPath);
  return tempPath;
}

async function analyzeGoogleSheet(drive: any, spreadsheetId: string): Promise<ExcelAnalysis> {
  const evaluator = new FormulaEvaluator();
  
  try {
    const sheets = google.sheets({ version: 'v4', auth: drive });
    
    // Prima prova a leggere la formula
    const formulaResponse = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'Sheet1!A1',
      valueRenderOption: 'FORMULA'
    });
    
    const formula = formulaResponse.data.values?.[0]?.[0];
    
    if (formula && typeof formula === 'string' && formula.startsWith('=')) {
      const result = evaluator.evaluate(formula);
      if (result.evaluated && result.value) {
        const alertStatus = calculateAlertStatus(result.value);
        logger.debug(`Google Sheet formula evaluated`, { formula, result: result.value });
        return { alertStatus, expiryDate: result.value };
      }
    }
    
    // Fallback: leggi il valore calcolato
    const valueResponse = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'Sheet1!A1',
      valueRenderOption: 'UNFORMATTED_VALUE'
    });
    
    const calculatedValue = valueResponse.data.values?.[0]?.[0];
    if (calculatedValue) {
      const date = parseValueToUTCDate(calculatedValue);
      if (date) {
        const alertStatus = calculateAlertStatus(date);
        logger.debug(`Google Sheet fallback value used`, { calculatedValue, date });
        return { alertStatus, expiryDate: date };
      }
    }
    
    logger.debug(`No valid date found in Google Sheet A1`, { spreadsheetId });
    return { alertStatus: "none", expiryDate: null };
    
  } catch (error) {
    logger.error('Google Sheet analysis failed', { spreadsheetId, error });
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
        logger.warn('High failure rate detected, increasing sync interval', {
          userId,
          processed: result.processed,
          failed: result.failed
        });
        
        // Aumenta l'intervallo temporaneamente
        clearInterval(intervalId);
        setTimeout(() => {
          startAutomaticSync(syncFolder, userId);
        }, 5 * 60 * 1000); // 5 minuti invece di 30 secondi
      }
    } catch (error) {
      logger.error('Automatic sync failed', {
        userId,
        syncFolder,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }, 30 * 1000);
  
  syncIntervals[userId] = intervalId;
  
  // Esegui la prima sincronizzazione immediatamente
  syncWithGoogleDrive(syncFolder, userId).catch(error => {
    logger.error('Initial sync failed', {
      userId,
      syncFolder,
      error: error instanceof Error ? error.message : String(error)
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
  logger.info('Starting automatic sync for all clients (every 15 minutes)');
  
  // Esegui la prima sync immediatamente
  syncAllClientsOnce();
  
  // Sync ogni 15 minuti per bilanciare reattività e carico server
  setInterval(() => {
    if (isGlobalSyncRunning) {
      logger.info('Skipping scheduled sync - previous sync still running');
      return;
    }
    
    logger.info('Running scheduled automatic sync for all clients');
    syncAllClientsOnce();
  }, 15 * 60 * 1000); // 15 minuti
}

async function syncAllClientsOnce(): Promise<void> {
  if (isGlobalSyncRunning) {
    logger.info('Global sync already running, skipping');
    return;
  }
  
  isGlobalSyncRunning = true;
  const startTime = Date.now();
  let totalProcessed = 0;
  let totalFailed = 0;
  const allErrors: SyncError[] = [];

  try {
    logger.info('Starting global sync for all clients');
    
    const clients = await withRetry(
      () => mongoStorage.getAllClients(),
      'getAllClients',
      2
    );
    
    const users = await withRetry(
      () => mongoStorage.getAllUsers(),
      'getAllUsers',
      2
    );

    logger.info(`Starting sync for ${clients.length} clients`, {
      clientCount: clients.length,
      userCount: users.length
    });

    for (const client of clients) {
      const admin = users.find(
        (u) => u.clientId === client.id && u.role === "admin"
      );

      if (!admin) {
        logger.warn('No admin user found for client', {
          clientId: client.id,
          clientName: client.name
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
          'Client sync failed',
          'CLIENT_SYNC_FAILED',
          true,
          {
            clientId: client.id,
            clientName: client.name,
            userId,
            originalError: syncError instanceof Error ? syncError.message : String(syncError)
          }
        );
        allErrors.push(error);
      }
    }

    const duration = Date.now() - startTime;
    
    logger.info('Global sync completed', {
      totalProcessed,
      totalFailed,
      duration,
      errorCount: allErrors.length,
      successRate: totalProcessed / (totalProcessed + totalFailed)
    });

    if (allErrors.length > 0) {
      logger.warn('Global sync completed with errors', {
        totalErrors: allErrors.length,
        errors: allErrors.map(e => ({
          message: e.message,
          code: e.code,
          retryable: e.retryable
        }))
      });

      // Invia notifiche per errori critici globali
      try {
        await sendSyncErrorNotifications(allErrors, {
          processed: totalProcessed,
          failed: totalFailed,
          duration
        });
      } catch (notificationError) {
        logger.error('Failed to send global sync error notifications', {
          error: notificationError instanceof Error ? notificationError.message : String(notificationError)
        });
      }
    }

  } catch (err) {
    const duration = Date.now() - startTime;
    logger.error('Global sync failed', {
      error: err instanceof Error ? err.message : String(err),
      duration
    });
  } finally {
    // MODIFICA CHIAVE: Emetti l'evento per segnalare la fine della prima sync.
    // Il 'finally' assicura che venga emesso anche in caso di errore.
    appEvents.emit('initialSyncComplete', {
      totalProcessed,
      totalFailed,
      duration: Date.now() - startTime,
      errorCount: allErrors.length,
      successRate: totalProcessed / (totalProcessed + totalFailed)
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
    logger.info('Starting Excel/Google Sheets expiry dates update', { userId });
    
    // Ottieni tutti i documenti Excel e Google Sheets dal database
    const allDocuments = await mongoStorage.getAllDocuments();
    const excelDocuments = allDocuments.filter(doc => 
      (doc.fileType === 'xlsx' || doc.fileType === 'xls' || doc.fileType === 'gsheet') && !doc.isObsolete
    );
    
    logger.info('Found Excel/Google Sheets documents to update', { 
      total: excelDocuments.length 
    });
    
    for (const doc of excelDocuments) {
      try {
        // Estrai l'ID del file da Google Drive URL
        const driveUrl = doc.driveUrl;
        const fileIdMatch = driveUrl.match(/\/d\/([a-zA-Z0-9_-]+)/);
        
        if (!fileIdMatch) {
          logger.warn('Could not extract file ID from Drive URL', {
            documentId: doc.legacyId,
            driveUrl
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
          expiryDate: excelAnalysis.expiryDate
        });
        
        // Crea un log dell'aggiornamento
        await mongoStorage.createLog({
          userId,
          action: "update_expiry",
          documentId: doc.legacyId,
          details: {
            message: `Aggiornata data di scadenza ${doc.fileType === 'gsheet' ? 'Google Sheets' : 'Excel'}`,
            oldExpiryDate: doc.expiryDate,
            newExpiryDate: excelAnalysis.expiryDate,
            oldAlertStatus: doc.alertStatus,
            newAlertStatus: excelAnalysis.alertStatus,
            fileType: doc.fileType
          },
        });
        
        result.updated++;
        
        logger.info('Updated document expiry date', {
          documentId: doc.legacyId,
          title: doc.title,
          fileType: doc.fileType,
          oldExpiryDate: doc.expiryDate,
          newExpiryDate: excelAnalysis.expiryDate,
          oldAlertStatus: doc.alertStatus,
          newAlertStatus: excelAnalysis.alertStatus
        });
        
      } catch (error) {
        result.failed++;
        const errorMessage = `Failed to update document ${doc.legacyId}: ${error instanceof Error ? error.message : String(error)}`;
        result.errors.push(errorMessage);
        
        logger.error('Failed to update document expiry date', {
          documentId: doc.legacyId,
          title: doc.title,
          fileType: doc.fileType,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }
    
    logger.info('Excel/Google Sheets expiry dates update completed', {
      userId,
      updated: result.updated,
      failed: result.failed,
      totalProcessed: excelDocuments.length
    });
    
    return result;
    
  } catch (error) {
    logger.error('Failed to update Excel/Google Sheets expiry dates', {
      userId,
      error: error instanceof Error ? error.message : String(error)
    });
    result.errors.push(`General error: ${error instanceof Error ? error.message : String(error)}`);
    return result;
  }
}

// Funzione per calcolare dinamicamente l'alertStatus basandosi sulla data corrente
export function calculateDynamicAlertStatus(expiryDate: Date | null, warningDays: number = 30): Alert {
  if (!expiryDate) {
    return "none";
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0); // Normalizza a mezzanotte
  
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

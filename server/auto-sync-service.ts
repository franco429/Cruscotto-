import fs from 'fs';
import path from 'path';
import { mongoStorage } from './mongo-storage';
import { processDocumentFile } from './google-drive';
import * as crypto from 'crypto';
import logger from './logger';

// Configurazione per ogni client
interface AutoSyncConfig {
  clientId: number;
  userId: number;
  watchFolder: string;
  enabled: boolean;
  intervalMinutes: number;
  lastSyncTime: Date;
}

// Store configurazioni attive
const activeConfigs = new Map<number, AutoSyncConfig>();
const syncIntervals = new Map<number, NodeJS.Timer>();

// Funzione per calcolare hash SHA-256 di un file
async function calculateFileHash(filePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256');
    const stream = fs.createReadStream(filePath);
    
    stream.on('error', reject);
    stream.on('data', chunk => hash.update(chunk));
    stream.on('end', () => resolve(hash.digest('hex')));
  });
}

// Scansiona ricorsivamente una cartella per trovare tutti i file supportati
function scanFolder(folderPath: string): string[] {
  const supportedExtensions = ['.xlsx', '.xls', '.xlsm', '.doc', '.docx', '.pdf', '.ods', '.csv'];
  const files: string[] = [];

  function scanRecursive(currentPath: string) {
    try {
      logger.debug(`Scanning folder: ${currentPath}`);
      
      // Verifica accesso alla cartella prima di leggerla
      try {
        fs.accessSync(currentPath, fs.constants.R_OK);
      } catch (accessError) {
        logger.warn(`Cannot access folder: ${currentPath}`, {
          error: accessError instanceof Error ? accessError.message : String(accessError)
        });
        return;
      }
      
      const items = fs.readdirSync(currentPath, { withFileTypes: true, encoding: 'utf8' });
      
      logger.debug(`Found ${items.length} items in: ${currentPath}`);
      
      for (const item of items) {
        const fullPath = path.join(currentPath, item.name);
        
        try {
          if (item.isDirectory()) {
            // Ricorsione nelle sottocartelle, ma salta cartelle di sistema nascoste
            if (!item.name.startsWith('.') && !item.name.startsWith('$')) {
              scanRecursive(fullPath);
            } else {
              logger.debug(`Skipping hidden/system folder: ${fullPath}`);
            }
          } else if (item.isFile()) {
            const ext = path.extname(item.name).toLowerCase();
            if (supportedExtensions.includes(ext)) {
              files.push(fullPath);
              logger.debug(`Found supported file: ${fullPath}`);
            } else {
              logger.debug(`Skipping unsupported file: ${fullPath} (ext: ${ext})`);
            }
          }
        } catch (itemError) {
          logger.warn(`Error processing item: ${fullPath}`, {
            itemName: item.name,
            error: itemError instanceof Error ? itemError.message : String(itemError)
          });
        }
      }
    } catch (error) {
      logger.warn(`Cannot scan folder: ${currentPath}`, {
        error: error instanceof Error ? error.message : String(error),
        errorCode: (error as any)?.code,
        errorErrno: (error as any)?.errno
      });
    }
  }

  // Usa la validazione del percorso prima della scansione
  const pathValidation = normalizeAndValidatePath(folderPath);
  
  if (pathValidation.isValid) {
    logger.info(`Starting folder scan: ${pathValidation.path}`);
    scanRecursive(pathValidation.path);
    logger.info(`Folder scan completed. Found ${files.length} supported files.`);
  } else {
    logger.error(`Cannot scan invalid folder path: ${folderPath}`, {
      error: pathValidation.error
    });
  }

  return files;
}

// Processa automaticamente un singolo file
async function processFileAutoSync(
  filePath: string,
  clientId: number,
  userId: number
): Promise<{ success: boolean; action: 'created' | 'updated' | 'skipped'; error?: string }> {
  try {
    const fileName = path.basename(filePath);
    
    // Usa processDocumentFile per estrarre info dal nome
    const docData = await processDocumentFile(
      fileName,
      "", // Nessun driveUrl per file locale
      filePath
    );

    if (!docData) {
      return { success: false, action: 'skipped', error: 'Invalid file name format' };
    }

    // Calcola hash del file
    const fileHash = await calculateFileHash(filePath);
    
    // Verifica se documento esiste già
    const existing = await mongoStorage.getDocumentByPathAndTitleAndRevision(
      docData.path,
      docData.title,
      docData.revision,
      clientId
    );

    if (existing) {
      // Controlla se il file è cambiato
      const hasFileChanged = !existing.fileHash || existing.fileHash !== fileHash;
      
      if (hasFileChanged) {
        // File modificato - aggiorna
        const updateData = {
          alertStatus: docData.alertStatus,
          expiryDate: docData.expiryDate,
          fileHash,
        };
        
        await mongoStorage.updateDocument(existing.legacyId, updateData);
        
        logger.info("Auto-sync: Document updated", {
          documentId: existing.legacyId,
          fileName,
          clientId,
          userId,
          oldHash: existing.fileHash?.substring(0, 8) + "...",
          newHash: fileHash.substring(0, 8) + "...",
        });
        
        return { success: true, action: 'updated' };
      } else {
        // File identico - salta
        return { success: true, action: 'skipped' };
      }
    } else {
      // Documento nuovo - crea
      await mongoStorage.createDocument({
        ...docData,
        fileHash,
        clientId,
        ownerId: userId,
      });
      
      logger.info("Auto-sync: Document created", {
        fileName,
        clientId,
        userId,
        fileHash: fileHash.substring(0, 8) + "...",
      });
      
      return { success: true, action: 'created' };
    }
  } catch (error) {
    logger.error("Auto-sync: Error processing file", {
      filePath,
      clientId,
      userId,
      error: error instanceof Error ? error.message : String(error),
    });
    
    return {
      success: false,
      action: 'skipped',
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

// Esegue sync automatica per una configurazione
async function performAutoSync(config: AutoSyncConfig): Promise<void> {
  logger.info("Starting auto-sync", {
    clientId: config.clientId,
    userId: config.userId,
    watchFolder: config.watchFolder,
    lastSync: config.lastSyncTime,
  });

  try {
    // Scansiona cartella per tutti i file supportati
    const files = scanFolder(config.watchFolder);
    
    if (files.length === 0) {
      logger.debug("Auto-sync: No files found", {
        clientId: config.clientId,
        watchFolder: config.watchFolder,
      });
      return;
    }

    let created = 0;
    let updated = 0;
    let skipped = 0;
    let errors = 0;

    // Processa ogni file
    for (const filePath of files) {
      const result = await processFileAutoSync(filePath, config.clientId, config.userId);
      
      if (result.success) {
        switch (result.action) {
          case 'created': created++; break;
          case 'updated': updated++; break;
          case 'skipped': skipped++; break;
        }
      } else {
        errors++;
      }
    }

    // Gestione revisioni obsolete se ci sono stati aggiornamenti
    if (created > 0 || updated > 0) {
      await mongoStorage.markObsoleteRevisionsForClient(config.clientId);
    }

    // Aggiorna timestamp ultima sync
    config.lastSyncTime = new Date();
    
    logger.info("Auto-sync completed", {
      clientId: config.clientId,
      userId: config.userId,
      totalFiles: files.length,
      created,
      updated,
      skipped,
      errors,
      duration: Date.now() - config.lastSyncTime.getTime(),
    });

  } catch (error) {
    logger.error("Auto-sync failed", {
      clientId: config.clientId,
      userId: config.userId,
      watchFolder: config.watchFolder,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

// Normalizza e valida percorso Windows/Unix
function normalizeAndValidatePath(inputPath: string): { path: string; isValid: boolean; error?: string } {
  try {
    // Trim spazi iniziali e finali
    let normalizedPath = inputPath.trim();
    
    // Gestione percorsi Windows con caratteri speciali e spazi
    if (process.platform === 'win32') {
      // Normalizza separatori di percorso Windows
      normalizedPath = normalizedPath.replace(/\//g, '\\');
      
      // Se il percorso contiene spazi o caratteri speciali e non è già quotato
      if (normalizedPath.includes(' ') && !normalizedPath.startsWith('"')) {
        // Non quotare automaticamente - path.resolve gestisce già gli spazi
      }
    } else {
      // Normalizza separatori di percorso Unix/Linux
      normalizedPath = normalizedPath.replace(/\\/g, '/');
    }
    
    // Risolvi percorso assoluto e normalizza
    const resolvedPath = path.resolve(normalizedPath);
    
    logger.debug("Path normalization", {
      inputPath,
      normalizedPath,
      resolvedPath,
      platform: process.platform,
    });
    
    // Verifica multipla per robustezza
    const checks = [
      fs.existsSync(resolvedPath),
      fs.existsSync(normalizedPath),
      fs.existsSync(inputPath.trim())
    ];
    
    logger.debug("Path existence checks", {
      resolvedPath: { path: resolvedPath, exists: checks[0] },
      normalizedPath: { path: normalizedPath, exists: checks[1] },
      inputPath: { path: inputPath.trim(), exists: checks[2] },
    });
    
    // Se almeno uno dei controlli passa, il percorso è valido
    const isValid = checks.some(check => check);
    
    if (isValid) {
      // Usa il primo percorso che funziona
      let finalPath = resolvedPath;
      if (!checks[0] && checks[1]) finalPath = normalizedPath;
      if (!checks[0] && !checks[1] && checks[2]) finalPath = inputPath.trim();
      
      // Verifica ulteriore: prova ad accedere alla cartella
      try {
        fs.accessSync(finalPath, fs.constants.F_OK | fs.constants.R_OK);
        const stats = fs.statSync(finalPath);
        
        if (!stats.isDirectory()) {
          return {
            path: finalPath,
            isValid: false,
            error: `Percorso esiste ma non è una cartella: ${finalPath}`
          };
        }
        
        return { path: finalPath, isValid: true };
      } catch (accessError) {
        return {
          path: finalPath,
          isValid: false,
          error: `Impossibile accedere alla cartella: ${accessError instanceof Error ? accessError.message : String(accessError)}`
        };
      }
    }
    
    return {
      path: resolvedPath,
      isValid: false,
      error: `Cartella non trovata. Percorsi testati: [${resolvedPath}, ${normalizedPath}, ${inputPath.trim()}]`
    };
    
  } catch (error) {
    return {
      path: inputPath,
      isValid: false,
      error: `Errore nella normalizzazione del percorso: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

// Avvia auto-sync per un client
export function startAutoSync(
  clientId: number,
  userId: number,
  watchFolder: string,
  intervalMinutes: number = 5
): boolean {
  try {
    // Normalizza e valida il percorso
    const pathValidation = normalizeAndValidatePath(watchFolder);
    
    if (!pathValidation.isValid) {
      logger.warn("Auto-sync: Invalid watch folder", {
        clientId,
        inputPath: watchFolder,
        error: pathValidation.error,
      });
      return false;
    }
    
    const validatedPath = pathValidation.path;

    // Ferma auto-sync esistente se presente
    stopAutoSync(clientId);

    // Crea configurazione con percorso validato
    const config: AutoSyncConfig = {
      clientId,
      userId,
      watchFolder: validatedPath,
      enabled: true,
      intervalMinutes,
      lastSyncTime: new Date(),
    };

    // Salva configurazione
    activeConfigs.set(clientId, config);

    // Avvia intervallo periodico
    const interval = setInterval(() => {
      if (config.enabled) {
        performAutoSync(config).catch(error => {
          logger.error("Auto-sync interval error", {
            clientId,
            error: error instanceof Error ? error.message : String(error),
          });
        });
      }
    }, intervalMinutes * 60 * 1000); // Converti minuti in millisecondi

    syncIntervals.set(clientId, interval);

    logger.info("Auto-sync started", {
      clientId,
      userId,
      watchFolder: config.watchFolder,
      intervalMinutes,
    });

    // Esegui sync immediata
    performAutoSync(config).catch(error => {
      logger.error("Initial auto-sync error", {
        clientId,
        error: error instanceof Error ? error.message : String(error),
      });
    });

    return true;
  } catch (error) {
    logger.error("Failed to start auto-sync", {
      clientId,
      userId,
      watchFolder,
      error: error instanceof Error ? error.message : String(error),
    });
    return false;
  }
}

// Ferma auto-sync per un client
export function stopAutoSync(clientId: number): boolean {
  try {
    const interval = syncIntervals.get(clientId);
    if (interval) {
      clearInterval(interval);
      syncIntervals.delete(clientId);
    }

    const config = activeConfigs.get(clientId);
    if (config) {
      config.enabled = false;
      activeConfigs.delete(clientId);
    }

    logger.info("Auto-sync stopped", { clientId });
    return true;
  } catch (error) {
    logger.error("Failed to stop auto-sync", {
      clientId,
      error: error instanceof Error ? error.message : String(error),
    });
    return false;
  }
}

// Ottieni stato auto-sync per un client
export function getAutoSyncStatus(clientId: number): AutoSyncConfig | null {
  return activeConfigs.get(clientId) || null;
}

// Ottieni tutti gli stati auto-sync attivi
export function getAllAutoSyncStatus(): AutoSyncConfig[] {
  return Array.from(activeConfigs.values());
}

// Aggiorna configurazione auto-sync
export function updateAutoSync(
  clientId: number,
  updates: Partial<Pick<AutoSyncConfig, 'watchFolder' | 'intervalMinutes' | 'enabled'>>
): boolean {
  try {
    const config = activeConfigs.get(clientId);
    if (!config) {
      logger.warn("Auto-sync config not found for update", { clientId });
      return false;
    }

    // Aggiorna configurazione
    Object.assign(config, updates);

    // Se è stata cambiata la cartella o l'intervallo, riavvia
    if (updates.watchFolder || updates.intervalMinutes) {
      stopAutoSync(clientId);
      if (config.enabled) {
        return startAutoSync(
          config.clientId,
          config.userId,
          config.watchFolder,
          config.intervalMinutes
        );
      }
    }

    logger.info("Auto-sync configuration updated", {
      clientId,
      updates,
    });

    return true;
  } catch (error) {
    logger.error("Failed to update auto-sync", {
      clientId,
      updates,
      error: error instanceof Error ? error.message : String(error),
    });
    return false;
  }
}

// Shutdown graceful
export function shutdownAutoSync(): void {
  logger.info("Shutting down all auto-sync services");
  
  for (const clientId of syncIntervals.keys()) {
    stopAutoSync(clientId);
  }
}

// Cleanup on process exit
process.on('SIGINT', shutdownAutoSync);
process.on('SIGTERM', shutdownAutoSync);

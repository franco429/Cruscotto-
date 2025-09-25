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
  const supportedExtensions = ['.xlsx', '.xls', '.doc', '.docx', '.pdf', '.ods', '.csv'];
  const files: string[] = [];

  function scanRecursive(currentPath: string) {
    try {
      const items = fs.readdirSync(currentPath, { withFileTypes: true });
      
      for (const item of items) {
        const fullPath = path.join(currentPath, item.name);
        
        if (item.isDirectory()) {
          // Ricorsione nelle sottocartelle
          scanRecursive(fullPath);
        } else if (item.isFile()) {
          const ext = path.extname(item.name).toLowerCase();
          if (supportedExtensions.includes(ext)) {
            files.push(fullPath);
          }
        }
      }
    } catch (error) {
      logger.warn(`Cannot scan folder: ${currentPath}`, {
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  if (fs.existsSync(folderPath)) {
    scanRecursive(folderPath);
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

// Avvia auto-sync per un client
export function startAutoSync(
  clientId: number,
  userId: number,
  watchFolder: string,
  intervalMinutes: number = 5
): boolean {
  try {
    // Verifica che la cartella esista
    if (!fs.existsSync(watchFolder)) {
      logger.warn("Auto-sync: Watch folder does not exist", {
        clientId,
        watchFolder,
      });
      return false;
    }

    // Ferma auto-sync esistente se presente
    stopAutoSync(clientId);

    // Crea configurazione
    const config: AutoSyncConfig = {
      clientId,
      userId,
      watchFolder: path.resolve(watchFolder),
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

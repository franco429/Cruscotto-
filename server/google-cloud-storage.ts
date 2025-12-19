/**
 * Google Cloud Storage Manager
 * 
 * Gestisce lo storage temporaneo su Google Cloud Storage
 * per evitare l'uso di /tmp su Render e prevenire fallimenti delle istanze.
 * 
 * Funzionalità:
 * - Upload file temporanei su Cloud Storage
 * - Download file da Cloud Storage
 * - Cleanup automatico con lifecycle policy
 * - Gestione errori e retry
 */

import { Storage } from '@google-cloud/storage';
import logger from './logger';
import { Readable } from 'stream';
import path from 'path';

// Configurazione Cloud Storage
const CLOUD_STORAGE_CONFIG = {
  bucketName: process.env.GCS_BUCKET_NAME || 'sgi-cruscotto-temp',
  projectId: process.env.GCS_PROJECT_ID,
  keyFilename: process.env.GCS_KEY_FILE, // Path al file JSON delle credenziali
  tempFilePrefix: 'temp_',
  maxRetries: 3,
  retryDelay: 1000,
  defaultExpiration: 3600, // 1 ora in secondi
} as const;

// Inizializzazione client Storage
let storageClient: Storage | null = null;

/**
 * Inizializza il client Google Cloud Storage
 * Supporta sia file locale che credenziali JSON da variabile d'ambiente
 */
function getStorageClient(): Storage {
  if (storageClient) {
    return storageClient;
  }

  try {
    const config: any = {
      projectId: CLOUD_STORAGE_CONFIG.projectId,
    };

    // PRIORITÀ 1: Credenziali JSON da variabile d'ambiente (per produzione/Render)
    // Se GOOGLE_APPLICATION_CREDENTIALS contiene JSON (non un path)
    const googleCreds = process.env.GOOGLE_APPLICATION_CREDENTIALS;
    if (googleCreds && googleCreds.trim().startsWith('{')) {
      try {
        config.credentials = JSON.parse(googleCreds);
        logger.info('Using credentials from GOOGLE_APPLICATION_CREDENTIALS JSON', {
          projectId: config.credentials.project_id || CLOUD_STORAGE_CONFIG.projectId,
        });
      } catch (parseError) {
        logger.warn('Failed to parse GOOGLE_APPLICATION_CREDENTIALS as JSON, treating as file path');
      }
    }
    
    // PRIORITÀ 2: GCS_KEY_FILE che potrebbe contenere JSON o path
    if (!config.credentials && process.env.GCS_KEY_FILE) {
      const gcsKeyFile = process.env.GCS_KEY_FILE.trim();
      
      // Se inizia con { è JSON, altrimenti è un path
      if (gcsKeyFile.startsWith('{')) {
        try {
          config.credentials = JSON.parse(gcsKeyFile);
          logger.info('Using credentials from GCS_KEY_FILE JSON');
        } catch (parseError) {
          logger.warn('Failed to parse GCS_KEY_FILE as JSON');
        }
      } else {
        // È un path al file
        config.keyFilename = gcsKeyFile;
        logger.info('Using credentials from file', { keyFilename: gcsKeyFile });
      }
    }
    
    // PRIORITÀ 3: Se c'è un file di credenziali esplicito (keyFilename già impostato)
    if (!config.credentials && CLOUD_STORAGE_CONFIG.keyFilename) {
      config.keyFilename = CLOUD_STORAGE_CONFIG.keyFilename;
      logger.info('Using credentials from keyFilename', { 
        keyFilename: CLOUD_STORAGE_CONFIG.keyFilename 
      });
    }

    // Inizializza il client Storage
    storageClient = new Storage(config);

    logger.info('Google Cloud Storage client initialized', {
      projectId: CLOUD_STORAGE_CONFIG.projectId,
      bucketName: CLOUD_STORAGE_CONFIG.bucketName,
      authMethod: config.credentials ? 'JSON credentials' : 'keyFilename',
    });

    return storageClient;
  } catch (error) {
    logger.error('Failed to initialize Google Cloud Storage client', {
      error: error instanceof Error ? error.message : String(error),
      projectId: CLOUD_STORAGE_CONFIG.projectId,
    });
    throw new Error(`Google Cloud Storage initialization failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Verifica se Cloud Storage è configurato correttamente
 */
export async function isCloudStorageConfigured(): Promise<boolean> {
  try {
    if (!CLOUD_STORAGE_CONFIG.projectId || !CLOUD_STORAGE_CONFIG.bucketName) {
      logger.warn('Google Cloud Storage not configured - missing project ID or bucket name');
      return false;
    }

    const storage = getStorageClient();
    const bucket = storage.bucket(CLOUD_STORAGE_CONFIG.bucketName);
    const [exists] = await bucket.exists();

    if (!exists) {
      logger.warn('Google Cloud Storage bucket does not exist', {
        bucketName: CLOUD_STORAGE_CONFIG.bucketName,
      });
      return false;
    }

    logger.info('Google Cloud Storage is configured and ready', {
      bucketName: CLOUD_STORAGE_CONFIG.bucketName,
    });
    return true;
  } catch (error) {
    logger.error('Error checking Cloud Storage configuration', {
      error: error instanceof Error ? error.message : String(error),
    });
    return false;
  }
}

/**
 * Upload di un file su Cloud Storage da uno stream
 */
export async function uploadStreamToCloudStorage(
  stream: Readable,
  fileName: string,
  metadata?: { [key: string]: string }
): Promise<string> {
  const storage = getStorageClient();
  const bucket = storage.bucket(CLOUD_STORAGE_CONFIG.bucketName);
  
  // Genera un nome file unico con timestamp
  const uniqueFileName = `${CLOUD_STORAGE_CONFIG.tempFilePrefix}${Date.now()}_${fileName.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
  const file = bucket.file(uniqueFileName);

  logger.info('Uploading file to Cloud Storage', {
    fileName: uniqueFileName,
    bucketName: CLOUD_STORAGE_CONFIG.bucketName,
  });

  try {
    await new Promise<void>((resolve, reject) => {
      const writeStream = file.createWriteStream({
        metadata: {
          contentType: 'application/octet-stream',
          metadata: {
            ...metadata,
            uploadedAt: new Date().toISOString(),
            expiresAt: new Date(Date.now() + CLOUD_STORAGE_CONFIG.defaultExpiration * 1000).toISOString(),
          },
        },
        resumable: false, // Per file piccoli, più veloce senza resumable upload
      });

      stream.pipe(writeStream);

      writeStream.on('error', (error) => {
        logger.error('Error uploading to Cloud Storage', {
          error: error.message,
          fileName: uniqueFileName,
        });
        reject(error);
      });

      writeStream.on('finish', () => {
        logger.info('File uploaded successfully to Cloud Storage', {
          fileName: uniqueFileName,
        });
        resolve();
      });
    });

    return uniqueFileName;
  } catch (error) {
    logger.error('Failed to upload file to Cloud Storage', {
      error: error instanceof Error ? error.message : String(error),
      fileName: uniqueFileName,
    });
    throw error;
  }
}

/**
 * Upload di un buffer su Cloud Storage
 */
export async function uploadBufferToCloudStorage(
  buffer: Buffer,
  fileName: string,
  metadata?: { [key: string]: string }
): Promise<string> {
  const storage = getStorageClient();
  const bucket = storage.bucket(CLOUD_STORAGE_CONFIG.bucketName);
  
  const uniqueFileName = `${CLOUD_STORAGE_CONFIG.tempFilePrefix}${Date.now()}_${fileName.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
  const file = bucket.file(uniqueFileName);

  logger.info('Uploading buffer to Cloud Storage', {
    fileName: uniqueFileName,
    sizeBytes: buffer.length,
    sizeMB: (buffer.length / 1024 / 1024).toFixed(2),
  });

  try {
    await file.save(buffer, {
      metadata: {
        contentType: 'application/octet-stream',
        metadata: {
          ...metadata,
          uploadedAt: new Date().toISOString(),
          expiresAt: new Date(Date.now() + CLOUD_STORAGE_CONFIG.defaultExpiration * 1000).toISOString(),
        },
      },
      resumable: false,
    });

    logger.info('Buffer uploaded successfully to Cloud Storage', {
      fileName: uniqueFileName,
    });

    return uniqueFileName;
  } catch (error) {
    logger.error('Failed to upload buffer to Cloud Storage', {
      error: error instanceof Error ? error.message : String(error),
      fileName: uniqueFileName,
    });
    throw error;
  }
}

/**
 * Download di un file da Cloud Storage come buffer
 */
export async function downloadBufferFromCloudStorage(
  fileName: string
): Promise<Buffer> {
  const storage = getStorageClient();
  const bucket = storage.bucket(CLOUD_STORAGE_CONFIG.bucketName);
  const file = bucket.file(fileName);

  logger.info('Downloading file from Cloud Storage', {
    fileName,
    bucketName: CLOUD_STORAGE_CONFIG.bucketName,
  });

  try {
    const [buffer] = await file.download();

    logger.info('File downloaded successfully from Cloud Storage', {
      fileName,
      sizeBytes: buffer.length,
      sizeMB: (buffer.length / 1024 / 1024).toFixed(2),
    });

    return buffer;
  } catch (error) {
    logger.error('Failed to download file from Cloud Storage', {
      error: error instanceof Error ? error.message : String(error),
      fileName,
    });
    throw error;
  }
}

/**
 * Download di un file da Cloud Storage come stream
 */
export function downloadStreamFromCloudStorage(
  fileName: string
): Readable {
  const storage = getStorageClient();
  const bucket = storage.bucket(CLOUD_STORAGE_CONFIG.bucketName);
  const file = bucket.file(fileName);

  logger.info('Creating download stream from Cloud Storage', {
    fileName,
  });

  return file.createReadStream();
}

/**
 * Elimina un file da Cloud Storage
 */
export async function deleteFileFromCloudStorage(
  fileName: string
): Promise<void> {
  const storage = getStorageClient();
  const bucket = storage.bucket(CLOUD_STORAGE_CONFIG.bucketName);
  const file = bucket.file(fileName);

  logger.info('Deleting file from Cloud Storage', {
    fileName,
  });

  try {
    await file.delete({ ignoreNotFound: true });

    logger.info('File deleted successfully from Cloud Storage', {
      fileName,
    });
  } catch (error) {
    logger.error('Failed to delete file from Cloud Storage', {
      error: error instanceof Error ? error.message : String(error),
      fileName,
    });
    throw error;
  }
}

/**
 * Elimina file con retry automatico
 */
export async function deleteFileFromCloudStorageWithRetry(
  fileName: string,
  maxRetries: number = CLOUD_STORAGE_CONFIG.maxRetries
): Promise<void> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await deleteFileFromCloudStorage(fileName);
      return; // Successo
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      if (attempt < maxRetries) {
        const delay = CLOUD_STORAGE_CONFIG.retryDelay * attempt;
        logger.warn(`Failed to delete file, retrying in ${delay}ms`, {
          fileName,
          attempt,
          maxRetries,
          error: lastError.message,
        });
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  logger.error('Failed to delete file after all retries', {
    fileName,
    maxRetries,
    error: lastError?.message,
  });
  // Non lanciamo l'errore per non bloccare il flusso, il file verrà eliminato dalla lifecycle policy
}

/**
 * Pulisce tutti i file temporanei più vecchi di una certa età
 */
export async function cleanupOldTempFiles(
  olderThanSeconds: number = 3600
): Promise<{ deleted: number; failed: number; errors: string[] }> {
  const storage = getStorageClient();
  const bucket = storage.bucket(CLOUD_STORAGE_CONFIG.bucketName);

  logger.info('Starting cleanup of old temp files', {
    olderThanSeconds,
    bucketName: CLOUD_STORAGE_CONFIG.bucketName,
  });

  const result = {
    deleted: 0,
    failed: 0,
    errors: [] as string[],
  };

  try {
    const cutoffTime = new Date(Date.now() - olderThanSeconds * 1000);
    const [files] = await bucket.getFiles({
      prefix: CLOUD_STORAGE_CONFIG.tempFilePrefix,
    });

    logger.info(`Found ${files.length} temp files to check for cleanup`);

    for (const file of files) {
      try {
        const [metadata] = await file.getMetadata();
        const timeCreated = new Date(String(metadata.timeCreated) || 0);

        if (timeCreated < cutoffTime) {
          await file.delete();
          result.deleted++;
          logger.debug('Deleted old temp file', {
            fileName: file.name,
            age: Math.round((Date.now() - timeCreated.getTime()) / 1000 / 60),
          });
        }
      } catch (error) {
        result.failed++;
        const errorMsg = error instanceof Error ? error.message : String(error);
        result.errors.push(`${file.name}: ${errorMsg}`);
        logger.error('Failed to delete old temp file', {
          fileName: file.name,
          error: errorMsg,
        });
      }
    }

    logger.info('Cleanup completed', {
      deleted: result.deleted,
      failed: result.failed,
      totalChecked: files.length,
    });

    return result;
  } catch (error) {
    logger.error('Failed to list files for cleanup', {
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

/**
 * Ottieni statistiche sull'uso di Cloud Storage
 */
export async function getStorageStats(): Promise<{
  totalFiles: number;
  totalSizeBytes: number;
  totalSizeMB: number;
  oldestFile: string | null;
  newestFile: string | null;
}> {
  const storage = getStorageClient();
  const bucket = storage.bucket(CLOUD_STORAGE_CONFIG.bucketName);

  try {
    const [files] = await bucket.getFiles({
      prefix: CLOUD_STORAGE_CONFIG.tempFilePrefix,
    });

    let totalSize = 0;
    let oldestTime = Infinity;
    let newestTime = 0;
    let oldestFile: string | null = null;
    let newestFile: string | null = null;

    for (const file of files) {
      const [metadata] = await file.getMetadata();
      const size = parseInt(metadata.size || '0', 10);
      const timeCreated = new Date(metadata.timeCreated || 0).getTime();

      totalSize += size;

      if (timeCreated < oldestTime) {
        oldestTime = timeCreated;
        oldestFile = file.name;
      }

      if (timeCreated > newestTime) {
        newestTime = timeCreated;
        newestFile = file.name;
      }
    }

    const stats = {
      totalFiles: files.length,
      totalSizeBytes: totalSize,
      totalSizeMB: Math.round(totalSize / 1024 / 1024 * 100) / 100,
      oldestFile,
      newestFile,
    };

    logger.info('Storage stats retrieved', stats);

    return stats;
  } catch (error) {
    logger.error('Failed to get storage stats', {
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

/**
 * Configura la lifecycle policy del bucket per eliminazione automatica
 * Questa funzione va eseguita una volta durante il setup iniziale
 */
export async function setupBucketLifecyclePolicy(
  ageInDays: number = 1
): Promise<void> {
  const storage = getStorageClient();
  const bucket = storage.bucket(CLOUD_STORAGE_CONFIG.bucketName);

  logger.info('Setting up bucket lifecycle policy', {
    bucketName: CLOUD_STORAGE_CONFIG.bucketName,
    ageInDays,
  });

  try {
    await bucket.setMetadata({
      lifecycle: {
        rule: [
          {
            action: {
              type: 'Delete',
            },
            condition: {
              age: ageInDays,
              matchesPrefix: [CLOUD_STORAGE_CONFIG.tempFilePrefix],
            },
          },
        ],
      },
    });

    logger.info('Bucket lifecycle policy configured successfully', {
      bucketName: CLOUD_STORAGE_CONFIG.bucketName,
      ageInDays,
    });
  } catch (error) {
    logger.error('Failed to setup bucket lifecycle policy', {
      error: error instanceof Error ? error.message : String(error),
      bucketName: CLOUD_STORAGE_CONFIG.bucketName,
    });
    throw error;
  }
}

export default {
  isCloudStorageConfigured,
  uploadStreamToCloudStorage,
  uploadBufferToCloudStorage,
  downloadBufferFromCloudStorage,
  downloadStreamFromCloudStorage,
  deleteFileFromCloudStorage,
  deleteFileFromCloudStorageWithRetry,
  cleanupOldTempFiles,
  getStorageStats,
  setupBucketLifecyclePolicy,
};

import fs from "fs";
import path from "path";
import logger from "./logger";

type CleanupResult = {
  deleted: number;
  retained: number;
  freedBytes: number;
  totalBytesAfter: number;
};

const BACKUP_DIR = path.join(process.cwd(), "backups");
const LOGS_DIR = path.join(process.cwd(), "logs");

// Policy di sicurezza disco (Render ha storage limitato)
const BACKUP_RETENTION_DAYS = 14;          // Mantieni backup per 14 giorni
const BACKUP_MAX_TOTAL_MB = 500;           // Limita dimensione totale backup a 500MB
const LOGS_RETENTION_DAYS = 15;            // Log file compressi oltre 15 giorni vengono rimossi
const LOGS_MAX_TOTAL_MB = 200;             // Limita i log file totali a 200MB

const SIX_HOURS_MS = 6 * 60 * 60 * 1000;

interface CleanupPolicy {
  retentionMs: number;
  maxTotalBytes: number;
  allowedExtensions: string[];
  name: string;
}

async function ensureDirExists(dir: string): Promise<boolean> {
  try {
    await fs.promises.mkdir(dir, { recursive: true });
    return true;
  } catch (error) {
    logger.warn("Filesystem cleanup: impossibile creare directory", {
      dir,
      error: error instanceof Error ? error.message : String(error),
    });
    return false;
  }
}

async function cleanupDirectory(
  targetDir: string,
  policy: CleanupPolicy
): Promise<CleanupResult> {
  const result: CleanupResult = { deleted: 0, retained: 0, freedBytes: 0, totalBytesAfter: 0 };

  const exists = await ensureDirExists(targetDir);
  if (!exists) return result;

  const now = Date.now();
  const files = await fs.promises.readdir(targetDir);

  const entries = await Promise.all(
    files.map(async (file) => {
      const fullPath = path.join(targetDir, file);
      const stat = await fs.promises.stat(fullPath).catch(() => null);
      if (!stat || !stat.isFile()) return null;

      const ext = path.extname(file).toLowerCase();
      if (!policy.allowedExtensions.includes(ext)) return null;

      return {
        name: file,
        fullPath,
        mtimeMs: stat.mtimeMs,
        size: stat.size,
      };
    })
  );

  const validEntries = entries.filter(Boolean) as Array<{
    name: string;
    fullPath: string;
    mtimeMs: number;
    size: number;
  }>;

  // Primo passaggio: rimuovi file oltre retention
  const cutoff = now - policy.retentionMs;
  const toDeleteForAge = validEntries.filter((e) => e.mtimeMs < cutoff);
  for (const entry of toDeleteForAge) {
    try {
      await fs.promises.unlink(entry.fullPath);
      result.deleted += 1;
      result.freedBytes += entry.size;
    } catch (error) {
      logger.warn("Filesystem cleanup: impossibile eliminare file vecchio", {
        policy: policy.name,
        file: entry.name,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  // Ricalcola lista dopo rimozioni per età
  const remaining = validEntries.filter((e) => e.mtimeMs >= cutoff);
  let totalBytes = remaining.reduce((sum, e) => sum + e.size, 0);

  // Secondo passaggio: se supera il limite, elimina i più vecchi fino a rientrare
  if (totalBytes > policy.maxTotalBytes) {
    const sorted = remaining.sort((a, b) => a.mtimeMs - b.mtimeMs); // più vecchi per primi
    for (const entry of sorted) {
      if (totalBytes <= policy.maxTotalBytes) break;
      try {
        await fs.promises.unlink(entry.fullPath);
        totalBytes -= entry.size;
        result.deleted += 1;
        result.freedBytes += entry.size;
      } catch (error) {
        logger.warn("Filesystem cleanup: impossibile eliminare file per spazio", {
          policy: policy.name,
          file: entry.name,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
  }

  result.retained = Math.max(0, validEntries.length - result.deleted);
  result.totalBytesAfter = totalBytes;

  logger.info("Filesystem cleanup completato", {
    policy: policy.name,
    deleted: result.deleted,
    retained: result.retained,
    freedMB: Math.round((result.freedBytes / 1024 / 1024) * 100) / 100,
    totalMB: Math.round((result.totalBytesAfter / 1024 / 1024) * 100) / 100,
    retentionDays: policy.retentionMs / (24 * 60 * 60 * 1000),
    maxTotalMB: policy.maxTotalBytes / 1024 / 1024,
  });

  return result;
}

// Cleanup specifico per backup JSON
export async function cleanupBackups(): Promise<CleanupResult> {
  return cleanupDirectory(BACKUP_DIR, {
    retentionMs: BACKUP_RETENTION_DAYS * 24 * 60 * 60 * 1000,
    maxTotalBytes: BACKUP_MAX_TOTAL_MB * 1024 * 1024,
    allowedExtensions: [".json"],
    name: "backups",
  });
}

// Cleanup per i file di log rotanti (zippati o meno)
export async function cleanupLogFiles(): Promise<CleanupResult> {
  return cleanupDirectory(LOGS_DIR, {
    retentionMs: LOGS_RETENTION_DAYS * 24 * 60 * 60 * 1000,
    maxTotalBytes: LOGS_MAX_TOTAL_MB * 1024 * 1024,
    allowedExtensions: [".log", ".gz"],
    name: "logs",
  });
}

export function startFilesystemCleanupScheduler(): void {
  logger.info("Avvio scheduler cleanup filesystem (backups/logs)", {
    backupRetentionDays: BACKUP_RETENTION_DAYS,
    backupMaxMB: BACKUP_MAX_TOTAL_MB,
    logsRetentionDays: LOGS_RETENTION_DAYS,
    logsMaxMB: LOGS_MAX_TOTAL_MB,
    intervalHours: 6,
  });

  // Esegui subito all'avvio
  cleanupBackups().catch((error) =>
    logger.warn("Cleanup iniziale backups fallito", { error: error instanceof Error ? error.message : String(error) })
  );
  cleanupLogFiles().catch((error) =>
    logger.warn("Cleanup iniziale log files fallito", { error: error instanceof Error ? error.message : String(error) })
  );

  const interval = setInterval(() => {
    cleanupBackups().catch((error) =>
      logger.warn("Cleanup schedulato backups fallito", { error: error instanceof Error ? error.message : String(error) })
    );
    cleanupLogFiles().catch((error) =>
      logger.warn("Cleanup schedulato log files fallito", { error: error instanceof Error ? error.message : String(error) })
    );
  }, SIX_HOURS_MS);

  const stop = () => {
    clearInterval(interval);
    logger.info("Scheduler cleanup filesystem arrestato");
  };

  process.on("SIGTERM", stop);
  process.on("SIGINT", stop);
}

export default {
  cleanupBackups,
  cleanupLogFiles,
  startFilesystemCleanupScheduler,
};

import { Worker } from "worker_threads";
import * as path from "path";
import { fileURLToPath } from "url";

export interface BackupResult {
  success: boolean;
  backupPath?: string;
  error?: string;
}

export interface RestoreResult {
  success: boolean;
  error?: string;
}

export interface BackupOptions {
  createdBy: {
    userId: number;
    userEmail: string;
    userRole: string;
  };
  clientId?: number; // ID del client per cui creare il backup (null per backup completo)
}

export class BackupService {
  private worker: Worker | null = null;

  private createWorker(): Worker {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);

    const workerPath = path.join(__dirname, "dist", "backup-worker.cjs");

    return new Worker(workerPath, {
      workerData: {},
    });
  }

  async createBackup(backupOptions?: BackupOptions): Promise<BackupResult> {
    return new Promise((resolve, reject) => {
      try {
        this.worker = this.createWorker();

        this.worker.on("message", (result: BackupResult) => {
          this.worker?.terminate();
          this.worker = null;
          resolve(result);
        });

        this.worker.on("error", (error) => {
          console.error("Errore dal worker thread:", error);
          this.worker?.terminate();
          this.worker = null;
          reject({ success: false, error: error.message });
        });

        this.worker.on("exit", (code) => {
          if (code !== 0) {
            console.log(`Worker terminato con codice di uscita ${code}`);
          }
        });

        this.worker.postMessage({
          type: "CREATE_BACKUP",
          backupOptions,
        });
      } catch (error) {
        reject({
          success: false,
          error: `Errore nell'avvio del worker: ${
            error instanceof Error ? error.message : String(error)
          }`,
        });
      }
    });
  }

  async restoreFromBackup(backupPath: string): Promise<RestoreResult> {
    return new Promise((resolve, reject) => {
      try {
        this.worker = this.createWorker();

        this.worker.on("message", (result: RestoreResult) => {
          this.worker?.terminate();
          this.worker = null;
          resolve(result);
        });

        this.worker.on("error", (error) => {
          console.error("Errore dal worker thread (restore):", error);
          this.worker?.terminate();
          this.worker = null;
          reject({ success: false, error: error.message });
        });

        this.worker.on("exit", (code) => {
          if (code !== 0) {
            console.log(
              `Worker (restore) terminato con codice di uscita ${code}`
            );
          }
        });

        this.worker.postMessage({ type: "RESTORE_BACKUP", backupPath });
      } catch (error) {
        reject({
          success: false,
          error: `Errore nell'avvio del worker (restore): ${
            error instanceof Error ? error.message : String(error)
          }`,
        });
      }
    });
  }

  // Metodo per terminare forzatamente il worker se necessario
  terminateWorker(): void {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
  }
}

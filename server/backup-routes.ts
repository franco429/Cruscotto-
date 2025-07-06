import type { Express, Request, Response } from "express";
import { mongoStorage as storage } from "./mongo-storage";
import * as path from "path";
import * as fs from "fs";

// Middleware per verificare se l'utente è admin
const isAdmin = (req: Request, res: Response, next: Function) => {
  if (
    !req.isAuthenticated() ||
    !req.user ||
    (req.user.role !== "admin" && req.user.role !== "superadmin")
  ) {
    return res
      .status(403)
      .json({
        message: "Accesso negato - Richiesti permessi di amministratore",
      });
  }
  next();
};

// Funzione helper per leggere i metadati di un backup
async function getBackupMetadata(backupPath: string) {
  try {
    const backupData = JSON.parse(fs.readFileSync(backupPath, "utf-8"));
    return {
      createdBy: backupData.createdBy || {
        userId: 0,
        userEmail: "unknown",
        userRole: "unknown",
      },
      clientId: backupData.clientId || null,
      backupType: backupData.backupType || "unknown",
      metadata: backupData.metadata || {},
      timestamp: backupData.timestamp || new Date().toISOString(),
    };
  } catch (error) {
    return null;
  }
}

export function registerBackupRoutes(app: Express): void {
  // Route per creare un backup
  app.post("/api/admin/backup", isAdmin, async (req, res) => {
    try {
      console.log("Avvio operazione di backup in background...");

      const { clientId } = req.body; // Opzionale: ID del client per cui creare il backup

      // Determina le opzioni di backup in base al ruolo
      let backupOptions: any = {
        createdBy: {
          userId: req.user!.legacyId,
          userEmail: req.user!.email,
          userRole: req.user!.role,
        },
      };

      if (req.user!.role === "superadmin") {
        // Superadmin può creare backup completi o specifici per client
        if (clientId) {
          backupOptions.clientId = clientId;
        }
        // Se non viene specificato clientId, crea un backup completo
      } else if (req.user!.role === "admin") {
        // Admin può creare backup solo del proprio client
        if (!req.user!.clientId) {
          return res.status(403).json({
            success: false,
            message: "Admin senza client associato non può creare backup",
          });
        }
        backupOptions.clientId = req.user!.clientId;
      }

      const result = await storage.createBackup(backupOptions);

      if (result.success) {
        await storage.createLog({
          userId: req.user!.legacyId,
          action: "backup_created",
          details: {
            message: "Backup del database creato con successo",
            backupPath: result.backupPath,
            clientId: backupOptions.clientId || null,
            backupType: backupOptions.clientId ? "client_specific" : "complete",
          },
        });

        res.json({
          success: true,
          message: "Backup creato con successo",
          backupPath: result.backupPath,
        });
      } else {
        console.error("Backup fallito. Dettagli:", result.error);
        await storage.createLog({
          userId: req.user!.legacyId,
          action: "backup_failed",
          details: {
            message: "Errore durante la creazione del backup",
            error: result.error,
            clientId: backupOptions.clientId || null,
          },
        });

        res.status(500).json({
          success: false,
          message: "Errore durante la creazione del backup",
          error: result.error,
        });
      }
    } catch (error) {
      console.error("Errore durante l'operazione di backup:", error);

      await storage.createLog({
        userId: req.user!.legacyId,
        action: "backup_error",
        details: {
          message: "Errore critico durante l'operazione di backup",
          error: error instanceof Error ? error.message : String(error),
        },
      });

      res.status(500).json({
        success: false,
        message: "Errore interno del server durante l'operazione di backup",
        error: error instanceof Error ? error.message : String(error),
      });
    }
  });

  // Route per ripristinare da un backup
  app.post("/api/admin/restore", isAdmin, async (req, res) => {
    try {
      const { backupFilename } = req.body;

      if (!backupFilename || typeof backupFilename !== "string") {
        return res.status(400).json({
          success: false,
          message: "Nome del file di backup non specificato o non valido",
        });
      }

      // Protezione contro path traversal
      if (
        backupFilename.includes("..") ||
        backupFilename.includes("/") ||
        backupFilename.includes("\\")
      ) {
        return res.status(400).json({
          success: false,
          message: "Nome del file di backup non valido",
        });
      }

      const backupDir = path.join(process.cwd(), "backups");
      const backupPath = path.join(backupDir, backupFilename);

      // Verifica che il file esista SOLO nella cartella backup
      if (!fs.existsSync(backupPath)) {
        return res.status(404).json({
          success: false,
          message: "File di backup non trovato",
        });
      }

      // Verifica i permessi per il ripristino
      const backupMetadata = await getBackupMetadata(backupPath);
      if (backupMetadata) {
        if (req.user!.role === "admin") {
          // Admin può ripristinare solo backup del proprio client
          if (backupMetadata.clientId !== req.user!.clientId) {
            return res.status(403).json({
              success: false,
              message: "Non hai i permessi per ripristinare questo backup",
            });
          }
        }
        // Superadmin può ripristinare qualsiasi backup
      }

      console.log("Avvio operazione di ripristino in background...");

      // Avvia il ripristino in background
      const result = await storage.restoreFromBackup(backupPath);

      if (result.success) {
        await storage.createLog({
          userId: req.user!.legacyId,
          action: "backup_restored",
          details: {
            message: "Database ripristinato con successo",
            backupPath: backupPath,
            backupMetadata: backupMetadata,
          },
        });

        res.json({
          success: true,
          message: "Database ripristinato con successo",
        });
      } else {
        console.error("Ripristino fallito. Dettagli:", result.error);
        await storage.createLog({
          userId: req.user!.legacyId,
          action: "backup_restore_failed",
          details: {
            message: "Errore durante il ripristino del backup",
            error: result.error,
            backupPath: backupPath,
          },
        });

        res.status(500).json({
          success: false,
          message: "Errore durante il ripristino del backup",
          error: result.error,
        });
      }
    } catch (error) {
      console.error("Errore durante l'operazione di ripristino:", error);

      await storage.createLog({
        userId: req.user!.legacyId,
        action: "backup_restore_error",
        details: {
          message: "Errore critico durante l'operazione di ripristino",
          error: error instanceof Error ? error.message : String(error),
        },
      });

      res.status(500).json({
        success: false,
        message: "Errore interno del server durante l'operazione di ripristino",
        error: error instanceof Error ? error.message : String(error),
      });
    }
  });

  // Route per listare i backup disponibili
  app.get("/api/admin/backups", isAdmin, async (req, res) => {
    try {
      const backupDir = path.join(process.cwd(), "backups");

      if (!fs.existsSync(backupDir)) {
        return res.json([]);
      }

      const files = await fs.promises.readdir(backupDir);
      const backupFilesPromises = files
        .filter((file) => file.endsWith(".json"))
        .map(async (file) => {
          const filePath = path.join(backupDir, file);
          const stats = fs.statSync(filePath);
          const metadata = await getBackupMetadata(filePath);

          return {
            filename: file,
            path: filePath,
            size: stats.size,
            createdAt: stats.birthtime,
            modifiedAt: stats.mtime,
            metadata: metadata,
          };
        });

      const backupFiles = await Promise.all(backupFilesPromises);

      // Filtra i backup in base al ruolo dell'utente
      let filteredBackups = backupFiles;

      if (req.user!.role === "admin") {
        // Admin vede solo i backup del proprio client o quelli che ha creato
        filteredBackups = backupFiles.filter((backup) => {
          if (!backup.metadata) return false;
          return (
            backup.metadata.clientId === req.user!.clientId ||
            backup.metadata.createdBy?.userId === req.user!.legacyId
          );
        });
      }
      // Superadmin vede tutti i backup (nessun filtro)

      // Ordina per data di modifica (più recenti prima)
      filteredBackups.sort(
        (a, b) => b.modifiedAt.getTime() - a.modifiedAt.getTime()
      );

      res.json(filteredBackups);
    } catch (error) {
      console.error("Errore durante il recupero della lista backup:", error);
      res.status(500).json({
        success: false,
        message: "Errore durante il recupero della lista backup",
        error: error instanceof Error ? error.message : String(error),
      });
    }
  });

  // Route per scaricare un backup specifico
  app.get("/api/admin/backup/:filename", isAdmin, async (req, res) => {
    try {
      const { filename } = req.params;
      const backupPath = path.join(process.cwd(), "backups", filename);

      if (!fs.existsSync(backupPath)) {
        return res.status(404).json({
          success: false,
          message: "File di backup non trovato",
        });
      }

      // Verifica i permessi per il download
      const backupMetadata = await getBackupMetadata(backupPath);
      if (backupMetadata) {
        if (req.user!.role === "admin") {
          // Admin può scaricare solo backup del proprio client o quelli che ha creato
          if (
            backupMetadata.clientId !== req.user!.clientId &&
            backupMetadata.createdBy?.userId !== req.user!.legacyId
          ) {
            return res.status(403).json({
              success: false,
              message: "Non hai i permessi per scaricare questo backup",
            });
          }
        }
        // Superadmin può scaricare qualsiasi backup
      }

      await storage.createLog({
        userId: req.user!.legacyId,
        action: "backup_downloaded",
        details: {
          message: "Download del file di backup",
          filename: filename,
          backupMetadata: backupMetadata,
        },
      });

      res.download(backupPath);
    } catch (error) {
      console.error("Errore durante il download del backup:", error);
      res.status(500).json({
        success: false,
        message: "Errore durante il download del backup",
        error: error instanceof Error ? error.message : String(error),
      });
    }
  });
}

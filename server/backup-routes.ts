import express, { Request, Response } from "express";
import path from "path";
import fs from "fs";
import { mongoStorage as storage } from "./mongo-storage";
import { BackupModel, getNextSequence } from "./models/mongoose-models";

// Middleware per verificare se l'utente è admin
const isAdmin = (req: Request, res: Response, next: Function) => {
  if (
    !req.isAuthenticated() ||
    !req.user ||
    (req.user.role !== "admin" && req.user.role !== "superadmin")
  ) {
    return res.status(403).json({
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

// Funzione per sincronizzare i backup esistenti nel filesystem con il database
async function syncBackupsWithDatabase() {
  try {
    const backupDir = path.join(process.cwd(), "backups");

    if (!fs.existsSync(backupDir)) {
      console.log("Cartella backup non trovata, creazione...");
      await fs.promises.mkdir(backupDir, { recursive: true });
      return { success: true, message: "Cartella backup creata" };
    }

    const files = await fs.promises.readdir(backupDir);
    const backupFiles = files.filter((file) => file.endsWith(".json"));

    let syncedCount = 0;
    let errorCount = 0;

    for (const filename of backupFiles) {
      try {
        const filePath = path.join(backupDir, filename);
        const stats = fs.statSync(filePath);

        // Verifica se il backup esiste già nel database
        const existingBackup = await BackupModel.findOne({ filename }).exec();

        if (!existingBackup) {
          // Leggi i metadati dal file
          const backupData = JSON.parse(fs.readFileSync(filePath, "utf-8"));

          // Crea un nuovo record nel database
          const backupLegacyId = await getNextSequence("backupId");
          const backupRecord = new BackupModel({
            legacyId: backupLegacyId,
            filename: filename,
            filePath: filePath,
            fileSize: stats.size,
            backupType: backupData.backupType || "unknown",
            createdBy: backupData.createdBy || {
              userId: 0,
              userEmail: "system",
              userRole: "system",
            },
            clientId: backupData.clientId || null,
            metadata: backupData.metadata || {
              totalUsers: 0,
              totalDocuments: 0,
              totalLogs: 0,
              totalClients: 0,
              totalCompanyCodes: 0,
            },
            isActive: true,
            lastVerified: new Date(),
          });

          await backupRecord.save();
          syncedCount++;
          console.log(`Backup sincronizzato: ${filename}`);
        }
      } catch (error) {
        console.error(
          `Errore nella sincronizzazione del backup ${filename}:`,
          error
        );
        errorCount++;
      }
    }

    return {
      success: true,
      syncedCount,
      errorCount,
      message: `Sincronizzazione completata: ${syncedCount} backup sincronizzati, ${errorCount} errori`,
    };
  } catch (error) {
    console.error("Errore durante la sincronizzazione dei backup:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export function registerBackupRoutes(app: express.Express): void {
  // Route per creare un backup
  app.post("/api/admin/backup", isAdmin, async (req, res) => {
    try {
      console.log("Avvio operazione di backup in background...");

      const { clientId } = req.body || {}; // Safe destructuring

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
          documentId: null,
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
          documentId: null,
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
        documentId: null,
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
          documentId: null,
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
          documentId: null,
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
        documentId: null,
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
      // Prima prova a leggere dal database (persistente)
      let backupRecords = await BackupModel.find({ isActive: true })
        .sort({ createdAt: -1 })
        .lean()
        .exec();

      // Filtra i backup in base al ruolo dell'utente
      let filteredBackups = backupRecords;

      if (req.user!.role === "admin") {
        // Admin vede solo i backup del proprio client o quelli che ha creato
        filteredBackups = backupRecords.filter((backup) => {
          return (
            backup.clientId === req.user!.clientId ||
            backup.createdBy?.userId === req.user!.legacyId
          );
        });
      }
      // Superadmin vede tutti i backup (nessun filtro)

      // Verifica l'esistenza dei file e aggiorna lo stato
      const backupDir = path.join(process.cwd(), "backups");
      const verifiedBackups = await Promise.all(
        filteredBackups.map(async (backup) => {
          const fileExists = fs.existsSync(backup.filePath);

          // Aggiorna lo stato nel database se necessario
          if (!fileExists && backup.isActive) {
            await BackupModel.updateOne(
              { legacyId: backup.legacyId },
              {
                isActive: false,
                lastVerified: new Date(),
              }
            );
          } else if (fileExists && !backup.isActive) {
            await BackupModel.updateOne(
              { legacyId: backup.legacyId },
              {
                isActive: true,
                lastVerified: new Date(),
              }
            );
          }

          // Se il file esiste, ottieni le statistiche aggiornate
          if (fileExists) {
            try {
              const stats = fs.statSync(backup.filePath);
              return {
                filename: backup.filename,
                path: backup.filePath,
                size: stats.size,
                createdAt: backup.createdAt,
                modifiedAt: stats.mtime,
                metadata: {
                  createdBy: backup.createdBy,
                  clientId: backup.clientId,
                  backupType: backup.backupType,
                  metadata: backup.metadata,
                },
                isActive: true,
              };
            } catch (error) {
              console.error(
                `Errore nel leggere le statistiche del file ${backup.filename}:`,
                error
              );
            }
          }

          // Se il file non esiste, restituisci i dati dal database
          return {
            filename: backup.filename,
            path: backup.filePath,
            size: backup.fileSize,
            createdAt: backup.createdAt,
            modifiedAt: backup.updatedAt,
            metadata: {
              createdBy: backup.createdBy,
              clientId: backup.clientId,
              backupType: backup.backupType,
              metadata: backup.metadata,
            },
            isActive: false,
          };
        })
      );

      // Filtra solo i backup attivi (file esistenti) per la risposta
      // const activeBackups = verifiedBackups.filter((backup) => backup.isActive);

      // Restituisci tutti i backup, anche quelli senza file su disco
      res.json(verifiedBackups);
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
        documentId: null,
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

  // Route per eliminare un backup (solo superadmin)
  app.delete("/api/admin/backup/:filename", isAdmin, async (req, res) => {
    try {
      if (req.user!.role !== "superadmin") {
        return res.status(403).json({
          success: false,
          message: "Solo i superadmin possono eliminare i backup",
        });
      }

      const { filename } = req.params;

      // Trova il backup nel database
      const backupRecord = await BackupModel.findOne({ filename }).exec();

      if (!backupRecord) {
        return res.status(404).json({
          success: false,
          message: "Backup non trovato nel database",
        });
      }

      const backupPath = path.join(process.cwd(), "backups", filename);
      if (fs.existsSync(backupPath)) {
        fs.unlinkSync(backupPath);
      }

      // Elimina il record dal database
      await BackupModel.deleteOne({ legacyId: backupRecord.legacyId });

      await storage.createLog({
        userId: req.user!.legacyId,
        action: "backup_deleted",
        documentId: null,
        details: {
          message: "Backup eliminato con successo",
          filename: filename,
          backupMetadata: backupRecord,
        },
      });

      res.json({
        success: true,
        message: "Backup eliminato con successo",
      });
    } catch (error) {
      console.error("Errore durante l'eliminazione del backup:", error);
      res.status(500).json({
        success: false,
        message: "Errore durante l'eliminazione del backup",
        error: error instanceof Error ? error.message : String(error),
      });
    }
  });

  // Route per sincronizzare i backup esistenti (solo superadmin)
  app.post("/api/admin/backups/sync", isAdmin, async (req, res) => {
    try {
      if (req.user!.role !== "superadmin") {
        return res.status(403).json({
          success: false,
          message: "Solo i superadmin possono sincronizzare i backup",
        });
      }

      const result = await syncBackupsWithDatabase();

      if (result.success) {
        res.json({
          success: true,
          message: result.message,
          syncedCount: result.syncedCount,
          errorCount: result.errorCount,
        });
      } else {
        res.status(500).json({
          success: false,
          message: "Errore durante la sincronizzazione",
          error: result.error,
        });
      }
    } catch (error) {
      console.error("Errore durante la sincronizzazione:", error);
      res.status(500).json({
        success: false,
        message: "Errore interno del server durante la sincronizzazione",
        error: error instanceof Error ? error.message : String(error),
      });
    }
  });
}

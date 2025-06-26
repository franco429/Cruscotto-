import type { Express, Request, Response } from "express";
import { mongoStorage as storage } from "./mongo-storage";
import * as path from "path";
import * as fs from "fs";

// Middleware per verificare se l'utente è admin
const isAdmin = (req: Request, res: Response, next: Function) => {
  if (!req.isAuthenticated() || !req.user || (req.user.role !== "admin" && req.user.role !== "superadmin")) {
    return res.status(403).json({ message: "Accesso negato - Richiesti permessi di amministratore" });
  }
  next();
};

export function registerBackupRoutes(app: Express): void {
  // Route per creare un backup
  app.post("/api/admin/backup", isAdmin, async (req, res) => {
    try {
      console.log("Avvio operazione di backup in background...");
      
      const result = await storage.createBackup();
      
      if (result.success) {
        await storage.createLog({
          userId: req.user!.legacyId,
          action: "backup_created",
          details: {
            message: "Backup del database creato con successo",
            backupPath: result.backupPath
          }
        });
        
        res.json({
          success: true,
          message: "Backup creato con successo",
          backupPath: result.backupPath
        });
      } else {
        console.error("Backup fallito. Dettagli:", result.error);
        await storage.createLog({
          userId: req.user!.legacyId,
          action: "backup_failed",
          details: {
            message: "Errore durante la creazione del backup",
            error: result.error
          }
        });
        
        res.status(500).json({
          success: false,
          message: "Errore durante la creazione del backup",
          error: result.error
        });
      }
    } catch (error) {
      console.error("Errore durante l'operazione di backup:", error);
      
      await storage.createLog({
        userId: req.user!.legacyId,
        action: "backup_error",
        details: {
          message: "Errore critico durante l'operazione di backup",
          error: error instanceof Error ? error.message : String(error)
        }
      });
      
      res.status(500).json({
        success: false,
        message: "Errore interno del server durante l'operazione di backup",
        error: error instanceof Error ? error.message : String(error)
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
          message: "Nome del file di backup non specificato o non valido"
        });
      }

      // Protezione contro path traversal
      if (backupFilename.includes("..") || backupFilename.includes("/") || backupFilename.includes("\\")) {
        return res.status(400).json({
          success: false,
          message: "Nome del file di backup non valido"
        });
      }

      const backupDir = path.join(process.cwd(), "backups");
      const backupPath = path.join(backupDir, backupFilename);

      // Verifica che il file esista SOLO nella cartella backup
      if (!fs.existsSync(backupPath)) {
        return res.status(404).json({
          success: false,
          message: "File di backup non trovato"
        });
      }

      console.log("Avvio operazione di ripristino in background...");
      
      // Avvia il ripristino in background
      const result = await storage.restoreFromBackup(backupPath);
      
      if (result.success) {
        await storage.createLog({
          userId: req.user!.legacyId,
          action: "backup_restored",
          details: {
            message: "Database ripristinato con successo dal backup",
            backupPath: backupPath
          }
        });
        
        res.json({
          success: true,
          message: "Database ripristinato con successo"
        });
      } else {
        await storage.createLog({
          userId: req.user!.legacyId,
          action: "restore_failed",
          details: {
            message: "Errore durante il ripristino del database",
            error: result.error,
            backupPath: backupPath
          }
        });
        
        res.status(500).json({
          success: false,
          message: "Errore durante il ripristino del database",
          error: result.error
        });
      }
    } catch (error) {
      console.error("Errore durante l'operazione di ripristino:", error);
      
      await storage.createLog({
        userId: req.user!.legacyId,
        action: "restore_error",
        details: {
          message: "Errore critico durante l'operazione di ripristino",
          error: error instanceof Error ? error.message : String(error)
        }
      });
      
      res.status(500).json({
        success: false,
        message: "Errore interno del server durante l'operazione di ripristino",
        error: error instanceof Error ? error.message : String(error)
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
      const backupFiles = files
        .filter(file => file.endsWith('.json'))
        .map(file => {
          const filePath = path.join(backupDir, file);
          const stats = fs.statSync(filePath);
          return {
            filename: file,
            path: filePath,
            size: stats.size,
            createdAt: stats.birthtime,
            modifiedAt: stats.mtime
          };
        })
        .sort((a, b) => b.modifiedAt.getTime() - a.modifiedAt.getTime());

      res.json(backupFiles);
    } catch (error) {
      console.error("Errore durante il recupero della lista backup:", error);
      res.status(500).json({
        success: false,
        message: "Errore durante il recupero della lista backup",
        error: error instanceof Error ? error.message : String(error)
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
          message: "File di backup non trovato"
        });
      }

      await storage.createLog({
        userId: req.user!.legacyId,
        action: "backup_downloaded",
        details: {
          message: "Download del file di backup",
          filename: filename
        }
      });

      res.download(backupPath);
    } catch (error) {
      console.error("Errore durante il download del backup:", error);
      res.status(500).json({
        success: false,
        message: "Errore durante il download del backup",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });
} 
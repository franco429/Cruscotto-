import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import * as os from "os";
import * as fs from "fs";
import * as path from "path";
import { v4 as uuidv4 } from "uuid";

import { mongoStorage } from "./mongo-storage";
import { getNextSequence } from "./models/mongoose-models";
import { hashPassword, comparePasswords } from "./auth";
import {
  syncWithGoogleDrive,
  startAutomaticSync,
  extractFolderIdFromUrl,
  processDocumentFile,
  startAutomaticSyncForAllClients,
  validateDriveConnection,
  updateExcelExpiryDates,
  calculateDynamicAlertStatus,
} from "./google-drive";
import { startExpirationChecks } from "./notification-service";
import {
  handleContactRequest,
  handlePasswordReset,
  transporter,
} from "./mailer";
import { generateSecureLink, verifySecureLink } from "./secure-links";
import {
  googleDriveListFiles,
} from "./google-drive-api";
import {
  getDriveClientForClient,
  getGoogleAuthUrl,
  googleAuthCallback,
  getAccessTokenForClient,
} from "./google-oauth";
import { InsertCompanyCode } from "./shared-types/companycode";
import type { CompanyCodeDocument } from "./shared-types/companycode";
import {
  insertClientSchema,
  registerAdminSchema,
  strongPasswordSchema,
  documentSchema,
  documentUpdateSchema,
  changePasswordSchema,
} from "./shared-types/validators";
import { InsertUser } from "./shared-types/schema";
import { z } from "zod";
import { logError } from "./logger";
import { appEvents } from "./app-events";
import { validateContactRequest } from "./security";
import logger from "./logger";
import multer from "multer";
// Configurazione sicura di multer con limiti e validazioni (In-Memory per Render)
const multerStorage = multer.memoryStorage();

const fileFilter = (req: Express.Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  // Verifica il tipo MIME del file
  const allowedMimeTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel.sheet.macroEnabled.12',
    'application/vnd.ms-excel.sheet.macroenabled.12',
    'image/jpeg',
    'image/png',
    'image/gif',
    'text/plain',
    'text/csv'
  ];
  
  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`Tipo di file non supportato: ${file.mimetype}`));
  }
};

const upload = multer({
  storage: multerStorage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB ottimale per Render. Per file grandi: usa Google Drive sync
    files: 25, // Ottimizzato: 25 file max per performance e stabilità ottimali su Render
    fieldSize: 1024 * 1024, // Ridotto a 1MB per i campi
    fieldNameSize: 100, // Limite per i nomi dei campi
    headerPairs: 2000 // Limite per le coppie header
  }
});

// Middleware per gestire gli errori di multer
const handleMulterError = (err: any, req: Request, res: Response, next: NextFunction) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        message: 'File troppo grande. Dimensione massima: 10MB per file',
        code: 'FILE_TOO_LARGE'
      });
    }
    if (err.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        message: 'Troppi file. Massimo 20 file per richiesta per evitare timeout',
        code: 'TOO_MANY_FILES'
      });
    }
    if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({
        message: 'Campo file non previsto',
        code: 'UNEXPECTED_FILE_FIELD'
      });
    }
    return res.status(400).json({
      message: 'Errore durante l\'upload del file',
      code: 'UPLOAD_ERROR'
    });
  }
  
  if (err.message && err.message.includes('Tipo di file non supportato')) {
    return res.status(400).json({
      message: err.message,
      code: 'UNSUPPORTED_FILE_TYPE'
    });
  }
  
  next(err);
};

// Helper function per gestire il timeout della sessione
const handleSessionTimeout = (
  req: Request,
  res: Response,
  next: NextFunction
): boolean => {
  if (req.isAuthenticated() && req.user && req.user.sessionExpiry) {
    if (new Date() > new Date(req.user.sessionExpiry)) {
      req.logout((err) => {
        if (err) return next(err);
        return res.status(401).json({
          message: "Sessione scaduta. Effettua nuovamente l'accesso.",
        });
      });
      return true; // Sessione scaduta, interrompi l'esecuzione
    }
  }
  return false; // Sessione valida, continua
};

// Middleware to check if user is authenticated with improved session timeout check
const isAuthenticated = (req: Request, res: Response, next: NextFunction) => {
  // Controlla prima se la sessione è scaduta
  if (handleSessionTimeout(req, res, next)) {
    return;
  }

  // Se la sessione è valida, controlla l'autenticazione
  if (!req.isAuthenticated()) {
    logger.warn("Authentication failed - user not authenticated", {
      url: req.url,
      method: req.method,
      ip: req.ip,
      userAgent: req.get("User-Agent"),
    });
    return res.status(401).json({
      message: "Non autenticato",
      code: "NOT_AUTHENTICATED",
    });
  }

  next();
};

// Middleware to check if user is an admin with improved session timeout check
const isAdmin = (req: Request, res: Response, next: NextFunction) => {
  // Controlla prima se la sessione è scaduta
  if (handleSessionTimeout(req, res, next)) {
    return;
  }

  // Se la sessione è valida, controlla l'autenticazione
  if (!req.isAuthenticated()) {
    logger.warn("Admin access denied - user not authenticated", {
      url: req.url,
      method: req.method,
      ip: req.ip,
      userAgent: req.get("User-Agent"),
    });
    
    // Per richieste SSE, invia un evento di errore invece di JSON
    if (req.url.includes('/stream') || req.headers.accept?.includes('text/event-stream')) {
      logger.warn("Sending SSE authentication error", { url: req.url });
      
      // IMPORTANTE: Non impostare status 401, altrimenti EventSource chiude la connessione
      // senza leggere il body. Rispondiamo 200 OK con evento 'error'.
      res.status(200);
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.write(`event: error\n`);
      res.write(`data: ${JSON.stringify({ message: "Non autenticato", code: "NOT_AUTHENTICATED" })}\n\n`);
      return res.end();
    }
    
    return res.status(401).json({
      message: "Non autenticato",
      code: "NOT_AUTHENTICATED",
    });
  }

  // Controlla i permessi di admin
  if (
    !req.user ||
    (req.user.role !== "admin" && req.user.role !== "superadmin")
  ) {
    logger.warn("Admin access denied - insufficient permissions", {
      url: req.url,
      method: req.method,
      ip: req.ip,
      userId: req.user?.legacyId,
      userRole: req.user?.role,
      userEmail: req.user?.email,
    });
    
    // Per richieste SSE, invia un evento di errore invece di JSON
    if (req.url.includes('/stream') || req.headers.accept?.includes('text/event-stream')) {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.write(`event: error\n`);
      res.write(`data: ${JSON.stringify({ message: "Accesso negato - richiesti permessi di amministratore", code: "INSUFFICIENT_PERMISSIONS", userRole: req.user?.role })}\n\n`);
      return res.end();
    }
    
    return res.status(403).json({
      message: "Accesso negato - richiesti permessi di amministratore",
      code: "INSUFFICIENT_PERMISSIONS",
      userRole: req.user?.role,
    });
  }

  next();
};

// Middleware per controllare se l'utente è superadmin
const isSuperAdmin = (req: Request, res: Response, next: NextFunction) => {
  // Controlla prima se la sessione è scaduta
  if (handleSessionTimeout(req, res, next)) {
    return;
  }

  // Se la sessione è valida, controlla l'autenticazione e i permessi
  if (!req.isAuthenticated() || req.user.role !== "superadmin") {
    return res
      .status(403)
      .json({ message: "Accesso riservato al super-admin" });
  }

  next();
};

const adminRegistrationSchema = z.object({
  email: z.string().email("Inserisci un indirizzo email valido"),
  password: z
    .string()
    .min(8, "La password deve contenere almeno 8 caratteri")
    .regex(/[A-Z]/, "La password deve contenere almeno una lettera maiuscola")
    .regex(/[a-z]/, "La password deve contenere almeno una lettera minuscola")
    .regex(/\d/, "La password deve contenere almeno un numero")
    .regex(
      /[@$!%*?&]/,
      "La password deve contenere almeno un carattere speciale (@$!%*?&)"
    ),
  clientName: z.string().min(2, "Il nome dell'azienda è obbligatorio"),
  driveFolderUrl: z
    .string()
    .url("Inserisci un URL valido per la cartella Google Drive")
    .optional()
    .or(z.literal("")),
  companyCode: z.string().min(1, "Il codice aziendale è obbligatorio"),
});

import { registerLocalOpenerRoutes } from './local-opener-routes';
import * as crypto from 'crypto';
import { 
  startAutoSync, 
  stopAutoSync, 
  getAutoSyncStatus, 
  updateAutoSync 
} from './auto-sync-service';

// Funzione per calcolare hash SHA-256 di un file o buffer
async function calculateFileHash(filePathOrBuffer: string | Buffer): Promise<string> {
  if (Buffer.isBuffer(filePathOrBuffer)) {
    return crypto.createHash('sha256').update(filePathOrBuffer).digest('hex');
  }

  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256');
    const stream = fs.createReadStream(filePathOrBuffer);
    
    stream.on('error', reject);
    stream.on('data', chunk => hash.update(chunk));
    stream.on('end', () => resolve(hash.digest('hex')));
  });
}

export async function registerRoutes(app: Express): Promise<Express> {
  
  // Registra routes per Local Opener
  registerLocalOpenerRoutes(app);
  app.post("/api/register/admin", upload.any(), handleMulterError, async (req, res) => {
    try {
      // I campi arrivano sempre come stringa da FormData, quindi normalizzo
      const body = {
        email: req.body.email,
        password: req.body.password,
        clientName: req.body.clientName,
        driveFolderUrl: req.body.driveFolderUrl,
        companyCode: req.body.companyCode,
      };
      const validation = adminRegistrationSchema.safeParse(body);
      if (!validation.success) {
        return res.status(400).json({
          message: "Dati di registrazione non validi.",
          errors: validation.error.format(),
        });
      }
      const { email, password, companyCode, clientName, driveFolderUrl } =
        validation.data;

      let driveFolderId: string | null = null;
      if (driveFolderUrl && driveFolderUrl !== "") {
        driveFolderId = extractFolderIdFromUrl(driveFolderUrl);
        if (!driveFolderId) {
          return res
            .status(400)
            .json({ message: "URL della cartella Google Drive non valido." });
        }
      }

      const passwordHash = await hashPassword(password);

      const { user, client } = await mongoStorage.registerNewAdminAndClient({
        email,
        passwordHash,
        companyCode,
        clientName,
        driveFolderId: driveFolderId || "",
      });

      // Processa i file caricati in locale (se presenti)
      if (req.files && Array.isArray(req.files) && req.files.length > 0) {
        for (const file of req.files) {
          // Usa processDocumentFile per estrarre info dal nome file
          const docInfo = await processDocumentFile(
            file.originalname,
            "", // Nessun driveUrl per file locale
            file.buffer // Buffer in memoria
          );
          if (docInfo) {
            // Calcola hash del file per supportare aggiornamenti futuri
            const fileHash = await calculateFileHash(file.buffer);
            
            await mongoStorage.createDocument({
              ...docInfo,
              fileHash,
              clientId: client.legacyId,
              ownerId: user.legacyId,
            });
          }
        }
      }

      await mongoStorage.createLog({
        userId: user.legacyId,
        action: "admin-registration",
        documentId: null,
        details: {
          message: `Nuova azienda '${client.name}' e admin '${user.email}' registrati.`,
          clientId: client.legacyId,
        },
      });

      req.login(user, (err) => {
        if (err) {
          // Errore da loggare centralmente.
          return res
            .status(500)
            .json({ message: "Errore durante la login automatica" });
        }
        const { password: _, ...safeUser } = user;
        res.status(201).json({
          message: "Registrazione completata con successo!",
          user: safeUser,
          client,
        });
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Errore sconosciuto durante la registrazione.";
      res.status(500).json({ message: errorMessage });
    }
  });

  /**
   * API documenti con paginazione server-side
   * Ottimizzata per gestire 50K+ documenti senza problemi di performance
   * 
   * Query params:
   * - page: numero pagina (default: 1)
   * - limit: documenti per pagina (default: 50, max: 200)
   * - status: 'all' | 'expired' | 'warning' | 'none' (default: 'all')
   * - search: stringa di ricerca (path, title, revision)
   * - sortBy: 'updatedAt' | 'path' | 'title' | 'alertStatus' (default: 'path')
   * - sortOrder: 'asc' | 'desc' (default: 'asc')
   * - paginated: 'true' per risposta paginata, altro per array semplice (backward compatible)
   */
  app.get("/api/documents", isAuthenticated, async (req, res) => {
    try {
      const clientId = req.user?.clientId;
      if (!clientId) return res.json([]);

      // Controllo se è richiesta paginazione
      const usePagination = req.query.paginated === 'true';

      if (usePagination) {
        // NUOVO: Risposta paginata ottimizzata per 50K+ documenti
        const page = Math.max(1, parseInt(req.query.page as string) || 1);
        const limit = Math.min(200, Math.max(1, parseInt(req.query.limit as string) || 50));
        const status = (req.query.status as 'all' | 'expired' | 'warning' | 'none') || 'all';
        const search = (req.query.search as string) || '';
        const sortBy = (req.query.sortBy as 'updatedAt' | 'path' | 'title' | 'alertStatus') || 'path';
        const sortOrder = (req.query.sortOrder as 'asc' | 'desc') || 'asc';

        const result = await mongoStorage.getDocumentsPaginated(clientId, {
          page,
          limit,
          status,
          search,
          sortBy,
          sortOrder,
        });

        res.json(result);
      } else {
        // BACKWARD COMPATIBLE: Ritorna array semplice per compatibilità
        // Questo permette al frontend esistente di continuare a funzionare
        const documents = await mongoStorage.getDocumentsByClientId(clientId);
        res.json(documents);
      }
    } catch (error) {
      console.error("Error fetching documents:", error);
      res.status(500).json({ message: "Errore nel recupero dei documenti" });
    }
  });

  app.get("/api/documents/obsolete", isAdmin, async (req, res) => {
    try {
      const clientId = req.user?.clientId;
      if (!clientId) return res.json([]);
      const documents = await mongoStorage.getObsoleteDocumentsByClientId(clientId);
      res.json(documents);
    } catch (error) {
      console.error("Error fetching obsolete documents:", error);
      res.status(500).json({ message: "Errore nel recupero dei documenti obsoleti" });
    }
  });

  app.get("/api/documents/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      const document = await mongoStorage.getDocument(id);

      if (!document || document.clientId !== req.user?.clientId) {
        return res.status(404).json({ message: "Document not found" });
      }

      res.json(document);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch document" });
    }
  });

  app.post("/api/documents", isAdmin, async (req, res) => {
    try {
      if (!req.user?.clientId) {
        return res.status(403).json({
          message: "Accesso negato: l'utente non è associato a nessun client",
        });
      }
      const validatedData = documentSchema.parse({
        ...req.body,
        clientId: req.user.clientId,
      });
      const document = await mongoStorage.createDocument(validatedData);
      if (req.user) {
        await mongoStorage.createLog({
          userId: req.user.legacyId,
          action: "upload",
          documentId: document.legacyId,
          details: { message: `Document created: ${document.title}` },
        });
      }
      res.status(201).json(document);
    } catch (error) {
      res.status(500).json({ message: "Error creating document" });
    }
  });

  app.put("/api/documents/:legacyId", isAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.legacyId, 10);

      const existingDoc = await mongoStorage.getDocument(id);
      if (!existingDoc) {
        return res.status(404).json({ message: "Document not found" });
      }

      if (existingDoc.clientId !== req.user?.clientId) {
        return res.status(403).json({
          message:
            "Accesso negato: non puoi modificare documenti di altri client",
        });
      }

      const validatedData = documentSchema.partial().parse({
        ...req.body,
        clientId: req.user.clientId,
      });

      const document = await mongoStorage.updateDocument(id, validatedData);

      if (req.user && document) {
        await mongoStorage.createLog({
          userId: req.user.legacyId,
          action: "document-updated",
          documentId: document.legacyId,
          details: {
            message: `Document updated: ${document.title}`,
            clientId: document.clientId,
          },
        });
      }

      res.json(document);
    } catch (error) {
      res.status(500).json({ message: "Error updating document" });
    }
  });

  // Elimina tutti i documenti del client corrente
  app.delete("/api/documents/delete-all", isAdmin, async (req, res) => {
    try {
      if (!req.user?.clientId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      // Ottieni tutti i documenti del client (inclusi obsoleti)
      const documents = await mongoStorage.getDocumentsByClientId(req.user.clientId);
      const obsoleteDocs = await mongoStorage.getObsoleteDocumentsByClientId(req.user.clientId);
      const allDocs = [...documents, ...obsoleteDocs];

      if (allDocs.length === 0) {
        return res.json({ 
          message: "Nessun documento da eliminare",
          deleted: 0 
        });
      }

      let deletedCount = 0;
      const errors: string[] = [];

      // Elimina tutti i documenti
      for (const doc of allDocs) {
        try {
          const success = await mongoStorage.deleteDocument(doc.legacyId);
          if (success) {
            deletedCount++;
          } else {
            errors.push(`Impossibile eliminare documento: ${doc.title}`);
          }
        } catch (err) {
          errors.push(`Errore eliminazione documento ${doc.title}: ${err}`);
        }
      }

      // Log dell'operazione
      if (req.user) {
        await mongoStorage.createLog({
          userId: req.user.legacyId,
          action: "bulk-delete",
          details: {
            message: `Bulk delete: ${deletedCount} documents deleted`,
            clientId: req.user.clientId,
            totalDocuments: allDocs.length,
            deletedCount,
            errors: errors.length > 0 ? errors : undefined,
          },
        });
      }

      res.json({ 
        message: `Eliminati ${deletedCount} di ${allDocs.length} documenti`,
        deleted: deletedCount,
        total: allDocs.length,
        errors: errors.length > 0 ? errors : undefined,
      });
    } catch (error) {
      console.error("Error in bulk delete:", error);
      res.status(500).json({ message: "Error deleting documents" });
    }
  });

  app.delete("/api/documents/:legacyId", isAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.legacyId, 10);

      const existingDoc = await mongoStorage.getDocument(id);
      if (!existingDoc) {
        return res.status(404).json({ message: "Document not found" });
      }

      if (existingDoc.clientId !== req.user?.clientId) {
        return res.status(403).json({
          message:
            "Accesso negato: non puoi eliminare documenti di altri client",
        });
      }

      // Elimina definitivamente il documento dal database
      await mongoStorage.deleteDocument(id);

      if (req.user) {
        await mongoStorage.createLog({
          userId: req.user.legacyId,
          action: "document-deleted",
          documentId: id,
          details: {
            message: `Document permanently deleted: ${existingDoc.title}`,
            clientId: existingDoc.clientId,
          },
        });
      }

      res.json({ message: "Document permanently deleted" });
    } catch (error) {
      res.status(500).json({ message: "Error deleting document" });
    }
  });

  // Ripristina documento obsoleto
  app.post("/api/documents/:legacyId/restore", isAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.legacyId, 10);

      const existingDoc = await mongoStorage.getDocument(id);
      if (!existingDoc) {
        return res.status(404).json({ message: "Document not found" });
      }

      if (existingDoc.clientId !== req.user?.clientId) {
        return res.status(403).json({
          message:
            "Accesso negato: non puoi ripristinare documenti di altri client",
        });
      }

      if (!existingDoc.isObsolete) {
        return res.status(400).json({
          message: "Il documento non è obsoleto e non può essere ripristinato",
        });
      }

      // Ripristina il documento
      const restoredDoc = await mongoStorage.updateDocument(id, {
        isObsolete: false,
      });

      if (req.user) {
        await mongoStorage.createLog({
          userId: req.user.legacyId,
          action: "restore",
          documentId: id,
          details: {
            message: `Document restored: ${existingDoc.title}`,
          },
        });
      }

      res.json({
        message: "Document restored successfully",
        document: restoredDoc,
      });
    } catch (error) {
      res.status(500).json({ message: "Error restoring document" });
    }
  });

  // Ripristina tutti i documenti obsoleti del client
  app.post("/api/documents/restore-all-obsolete", isAdmin, async (req, res) => {
    try {
      const clientId = req.user?.clientId;
      if (!clientId) {
        return res.status(403).json({
          message: "Accesso negato: l'utente non è associato a nessun client",
        });
      }

      const result = await mongoStorage.restoreAllObsoleteDocumentsForClient(clientId);

      if (req.user) {
        await mongoStorage.createLog({
          userId: req.user.legacyId,
          action: "restore-all-obsolete",
          details: {
            message: `Restored ${result.restored} obsolete documents`,
            restored: result.restored,
            errors: result.errors,
          },
        });
      }

      res.json({
        message: `Ripristinati ${result.restored} documenti obsoleti`,
        restored: result.restored,
        errors: result.errors,
      });
    } catch (error) {
      res.status(500).json({ message: "Error restoring all obsolete documents" });
    }
  });

  // Users API (admin only)
  app.get("/api/users", isAdmin, async (req, res) => {
    try {
      const clientId = req.user?.clientId;
      if (!clientId) {
        return res.json({ users: [], total: 0, page: 1, totalPages: 0 });
      }

      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const offset = (page - 1) * limit;

      const { users, total } = await mongoStorage.getUsersByClientIdWithPagination(
        clientId,
        limit,
        offset
      );

      const totalPages = Math.ceil(total / limit);

      res.json({
        users,
        total,
        page,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      });
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Errore nel recupero degli utenti" });
    }
  });

  app.post("/api/users", isAdmin, async (req, res) => {
    try {
      const { email, password, role } = req.body;
      const adminClientId = req.user?.clientId;

      if (!adminClientId) {
        return res.status(400).json({
          message: "L'amministratore non è associato a nessun cliente.",
        });
      }
      if (role === "admin") {
        return res.status(400).json({
          message:
            "Non è possibile creare un altro admin. Usare la pagina di registrazione pubblica.",
        });
      }

      const existingUser = await mongoStorage.getUserByEmail(email);
      if (existingUser) {
        return res
          .status(400)
          .json({ message: "Utente con questa email già registrato" });
      }

      const hashedPassword = await hashPassword(password);
      const newUser = await mongoStorage.createUser({
        email,
        password: hashedPassword,
        role: "viewer",
        clientId: adminClientId,
        lastLogin: null,
        sessionExpiry: null,
        failedLoginAttempts: 0,
        lockoutUntil: null,
      });

      // Log: creazione nuovo utente
      if (req.user) {
        await mongoStorage.createLog({
          userId: req.user.legacyId, // attore: admin che crea l'utente
          action: "user-created",
          documentId: null,
          details: {
            message: `Nuovo utente creato: ${newUser.email}`,
            createdUserId: newUser.legacyId,
            createdUserEmail: newUser.email,
            clientId: adminClientId,
            timestamp: new Date().toISOString(),
          },
        });
      }

      const { password: _, ...safeUser } = newUser;
      res.status(201).json(safeUser);
    } catch (error) {
      res
        .status(500)
        .json({ message: "Errore durante la creazione dell'utente" });
    }
  });

  // Clients API
  app.get("/api/clients", isAdmin, async (req, res) => {
    try {
      if (!req.user?.legacyId)
        return res.status(401).json({ message: "Utente non autenticato" });
      const clients = await mongoStorage.getClientsByAdminId(req.user.legacyId);
      res.json(clients);
    } catch (error) {
      console.error("Error fetching clients:", error);
      res.status(500).json({ message: "Errore nel recupero dei clienti" });
    }
  });

  // POST - Crea un nuovo client (solo superadmin)
  app.post("/api/clients", isSuperAdmin, async (req, res) => {
    try {
      if (!req.user?.legacyId) {
        return res.status(401).json({ message: "Utente non autenticato" });
      }

      const validatedData = insertClientSchema.parse(req.body);

      // Crea il nuovo client
      const client = await mongoStorage.createClient(validatedData);

      if (!client) {
        return res
          .status(500)
          .json({ message: "Impossibile creare il client" });
      }

      // Log dell'azione
      await mongoStorage.createLog({
        userId: req.user.legacyId,
        action: "client-created",
        details: {
          message: `Nuovo client '${client.name}' creato`,
          clientId: client.legacyId,
          timestamp: new Date().toISOString(),
        },
      });

      res.status(201).json(client);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Errore sconosciuto";
      res.status(400).json({
        message: "Impossibile creare il client.",
        error: errorMessage,
      });
    }
  });

  // PUT - Aggiorna un client esistente (admin può modificare solo i propri clienti)
  app.put("/api/clients/:id", isAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);

      if (!req.user?.legacyId) {
        return res.status(401).json({ message: "Utente non autenticato" });
      }

      // Verifica che il client esista
      const existingClient = await mongoStorage.getClient(id);
      if (!existingClient) {
        return res.status(404).json({ message: "Cliente non trovato" });
      }

      // Verifica che l'admin possa modificare questo client
      const adminClients = await mongoStorage.getClientsByAdminId(req.user.legacyId);
      const canEdit = adminClients.some((client) => client.legacyId === id);

      if (!canEdit && req.user.role !== "superadmin") {
        return res.status(403).json({
          message: "Non hai i permessi per modificare questo cliente",
        });
      }

      const validatedData = insertClientSchema.partial().parse(req.body);

      const client = await mongoStorage.updateClient(id, validatedData);
      if (!client) {
        return res.status(404).json({ message: "Cliente non trovato" });
      }

      // Sincronizza subito dopo l'aggiornamento
      if (req.user) {
        syncWithGoogleDrive(client.driveFolderId, req.user.legacyId).catch(
          (err) => {
            logError(err, {
              context: "manual-sync",
              clientId: client.legacyId,
              userId: req.user?.legacyId,
              driveFolderId: client.driveFolderId,
            });
          }
        );
      }

      // Log dell'azione
      await mongoStorage.createLog({
        userId: req.user.legacyId,
        action: "client-updated",
        details: {
          message: `Client '${client.name}' aggiornato`,
          clientId: client.legacyId,
          changes: validatedData,
          timestamp: new Date().toISOString(),
        },
      });

      res.json(client);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Errore sconosciuto";
      res.status(400).json({
        message: "Impossibile aggiornare il cliente.",
        error: errorMessage,
      });
    }
  });

  // PUT - Aggiorna folder ID del client (per Google Drive Picker)
  app.put("/api/clients/:id/folder", isAuthenticated, async (req, res) => {
    try {
      const clientId = parseInt(req.params.id, 10);
      const { driveFolderId, folderName } = req.body;

      if (!req.user?.legacyId) {
        return res.status(401).json({ message: "Utente non autenticato" });
      }

      // Validazione dei dati in input
      if (!driveFolderId || typeof driveFolderId !== 'string') {
        return res.status(400).json({ message: "ID cartella Google Drive richiesto" });
      }

      // Verifica che il client esista
      const existingClient = await mongoStorage.getClient(clientId);
      if (!existingClient) {
        return res.status(404).json({ message: "Cliente non trovato" });
      }

      // Verifica che l'utente possa modificare questo client
      const userClients = req.user.role === 'admin' 
        ? await mongoStorage.getClientsByAdminId(req.user.legacyId)
        : [];
      
      // Admin può modificare solo i propri clients, superadmin può modificare tutti
      const canEdit = req.user.role === 'superadmin' || 
        (req.user.role === 'admin' && userClients.some(client => client.legacyId === clientId)) ||
        (req.user.clientId === clientId); // L'utente può modificare il proprio client

      if (!canEdit) {
        return res.status(403).json({
          message: "Non hai i permessi per modificare questo cliente",
        });
      }

      // Aggiorna solo il folder ID
      const updatedClient = await mongoStorage.updateClient(clientId, {
        driveFolderId: driveFolderId,
      });

      if (!updatedClient) {
        return res.status(404).json({ message: "Cliente non trovato" });
      }

      // Log dell'operazione
      if (req.user) {
        await mongoStorage.createLog({
          userId: req.user.legacyId,
          action: "client-folder-update",
          documentId: null,
          details: {
            message: `Cartella Google Drive aggiornata per cliente ${clientId}`,
            clientId: clientId,
            folderId: driveFolderId,
            folderName: folderName || 'N/A',
            timestamp: new Date().toISOString(),
          },
        });
      }

      res.json({
        success: true,
        client: updatedClient,
        message: "Cartella Google Drive aggiornata con successo",
      });

    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Errore sconosciuto";
      logger.error("Error updating client folder", {
        error: errorMessage,
        clientId: req.params.id,
        userId: req.user?.legacyId,
      });
      res.status(500).json({
        message: "Impossibile aggiornare la cartella del cliente.",
        error: errorMessage,
      });
    }
  });

  app.patch("/api/users/:legacyId/role", isAdmin, async (req, res) => {
    try {
      const userId = parseInt(req.params.legacyId, 10);
      const { role } = req.body;

      if (!["admin", "viewer"].includes(role)) {
        return res.status(400).json({ message: "Ruolo non valido" });
      }

      const updatedUser = await mongoStorage.updateUserRole(userId, role);
      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }

      if (req.user) {
        await mongoStorage.createLog({
          userId: req.user.legacyId,
          action: "user-role-change",
          documentId: null,
          details: {
            message: `Ruolo utente ${userId} cambiato in ${role}`,
            clientId: req.user.clientId,
            timestamp: new Date().toISOString(),
          },
        });
      }

      const { password, ...userWithoutPassword } = updatedUser;
      res.json(userWithoutPassword);
    } catch (error) {
      res
        .status(500)
        .json({ message: "Impossibile aggiornare il ruolo utente" });
    }
  });

  // Delete user endpoint (admin only)
  app.delete("/api/users/:legacyId", isAdmin, async (req, res) => {
    try {
      const userId = parseInt(req.params.legacyId, 10);

      // Prevent admin from deleting themselves
      if (userId === req.user?.legacyId) {
        return res.status(400).json({
          message: "Non puoi eliminare il tuo stesso account",
        });
      }

      // Check if user exists and belongs to the same client
      const userToDelete = await mongoStorage.getUser(userId);
      if (!userToDelete) {
        return res.status(404).json({ message: "Utente non trovato" });
      }

      // Ensure admin can only delete users from their own client
      if (userToDelete.clientId !== req.user?.clientId) {
        return res.status(403).json({
          message: "Non hai i permessi per eliminare questo utente",
        });
      }

      const deleted = await mongoStorage.deleteUser(userId);
      if (!deleted) {
        return res
          .status(500)
          .json({ message: "Impossibile eliminare l'utente" });
      }

      // Log the deletion
      if (req.user) {
        await mongoStorage.createLog({
          userId: req.user.legacyId,
          action: "user-deleted",
          documentId: null,
          details: {
            message: `Utente ${userId} (${userToDelete.email}) eliminato`,
            clientId: req.user.clientId,
            timestamp: new Date().toISOString(),
          },
        });
      }

      res.json({ message: "Utente eliminato con successo" });
    } catch (error) {
      res
        .status(500)
        .json({ message: "Errore durante l'eliminazione dell'utente" });
    }
  });

  // Admin: genera URL per collegare Google Drive
  app.get("/api/google/auth-url/:clientId", isAdmin, (req, res) => {
    const clientId = parseInt(req.params.clientId);
    if (isNaN(clientId)) {
      return res.status(400).json({ error: "clientId non valido" });
    }
    const url = getGoogleAuthUrl(clientId);
    res.json({ url });
  });

  // Callback dopo autorizzazione
  app.get("/api/google/callback", googleAuthCallback);

  // Endpoint per generare access token dal refresh token salvato
  app.get("/api/google/access-token/:clientId", isAdmin, getAccessTokenForClient);

  // Endpoint per cambiare la password dell'utente corrente
  app.post("/api/change-password", isAuthenticated, async (req, res) => {
    try {
      //  Validazione della nuova password con Zod
      const validation = changePasswordSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({
          message: "Dati di cambio password non validi.",
          errors: validation.error.format(),
        });
      }

      const { currentPassword, newPassword } = validation.data;

      if (!req.user || !req.user.legacyId) {
        return res.status(401).json({ message: "Utente non autenticato" });
      }

      const user = await mongoStorage.getUser(req.user.legacyId);
      if (!user) {
        return res.status(404).json({ message: "Utente non trovato" });
      }

      const isPasswordValid = await comparePasswords(
        currentPassword,
        user.password
      );

      if (!isPasswordValid) {
        return res
          .status(401)
          .json({ message: "La password attuale non è corretta" });
      }

      //  Controllo che la nuova password sia diversa da quella attuale
      const isNewPasswordSame = await comparePasswords(
        newPassword,
        user.password
      );
      if (isNewPasswordSame) {
        return res.status(400).json({
          message: "La nuova password deve essere diversa da quella attuale",
        });
      }

      const hashedPassword = await hashPassword(newPassword);

      const updatedUser = await mongoStorage.updateUserPassword(
        user.legacyId,
        hashedPassword
      );

      if (!updatedUser) {
        return res
          .status(500)
          .json({ message: "Impossibile aggiornare la password" });
      }

      await mongoStorage.createLog({
        userId: user.legacyId,
        action: "password-change",
        details: {
          message: "Password modificata con successo",
          timestamp: new Date().toISOString(),
        },
      });

      res.json({ message: "Password aggiornata con successo" });
    } catch (error) {
      res
        .status(500)
        .json({ message: "Errore durante il cambio della password" });
    }
  });

  // Audit logs API (admin only)
  app.get("/api/logs", isAdmin, async (req, res) => {
    try {
      const clientId = req.user?.clientId;
      if (!clientId) {
        return res.json([]);
      }

      const logs = await mongoStorage.getLogsByClientId(clientId);
      res.json(logs);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch audit logs" });
    }
  });

  // Audit logs statistics API (admin only)
  app.get("/api/logs/statistics", isAdmin, async (req, res) => {
    try {
      const { getLogStatistics } = await import("./log-cleanup-service");
      const stats = await getLogStatistics();
      
      if (!stats) {
        return res.status(500).json({ message: "Failed to get log statistics" });
      }

      res.json(stats);
    } catch (error) {
      logger.error("Failed to get log statistics", {
        error: error instanceof Error ? error.message : String(error),
      });
      res.status(500).json({ message: "Failed to get log statistics" });
    }
  });

  // Manual log cleanup API (admin only)
  app.post("/api/logs/cleanup", isAdmin, async (req, res) => {
    try {
      const userId = req.user?.legacyId;
      const userEmail = req.user?.email;

      logger.info("Manual log cleanup requested", { 
        userId, 
        userEmail,
        role: req.user?.role 
      });

      const { cleanupOldLogs } = await import("./log-cleanup-service");
      const deletedCount = await cleanupOldLogs();

      if (userId) {
        await mongoStorage.createLog({
          userId: userId,
          action: "log-cleanup",
          documentId: null,
          details: {
            message: `Pulizia manuale dei log eseguita. ${deletedCount} log eliminati.`,
            deletedCount,
            timestamp: new Date().toISOString(),
          },
        });
      }

      res.json({
        success: true,
        deletedCount,
        message: `${deletedCount} log eliminati con successo`,
      });
    } catch (error) {
      logger.error("Failed to cleanup logs", {
        error: error instanceof Error ? error.message : String(error),
      });
      res.status(500).json({ message: "Failed to cleanup logs" });
    }
  });

  // =====================================================
  // SYNC SSE (Server-Sent Events) - Real-time sync updates
  // =====================================================
  
  // Mappa per tenere traccia delle sincronizzazioni attive per client
  const activeSyncs = new Map<number, {
    status: 'pending' | 'syncing' | 'completed' | 'error';
    processed: number;
    total: number;
    currentBatch: number;
    totalBatches: number;
    startTime: number;
    error?: string;
  }>();

  // Endpoint SSE per streaming stato sincronizzazione in tempo reale
  // NOTA: NON usare async qui - causa chiusura prematura della connessione
  app.get("/api/sync/stream", isAdmin, (req, res) => {
    const clientId = req.user?.clientId;
    const userId = req.user?.legacyId;

    logger.info("[SSE] Client connecting to sync stream", { clientId, userId });

    if (!clientId || !userId) {
      // Per SSE, invia evento di errore invece di JSON
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.write(`event: error\n`);
      res.write(`data: ${JSON.stringify({ message: "Nessun cliente associato." })}\n\n`);
      return res.end();
    }

    // CRITICO: Disabilita timeout per connessioni SSE long-lived
    req.socket?.setTimeout(0);
    res.socket?.setTimeout(0);
    
    // Configura SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // Disabilita buffering per Nginx/Render
    res.setHeader('Access-Control-Allow-Origin', '*'); // Per CORS se necessario
    
    // Flush headers immediatamente
    res.flushHeaders();

    // Funzione helper per inviare eventi SSE
    const sendEvent = (event: string, data: any) => {
      try {
        if (!res.writableEnded) {
          res.write(`event: ${event}\n`);
          res.write(`data: ${JSON.stringify(data)}\n\n`);
        }
      } catch (error) {
        logger.warn("[SSE] Failed to send event", { event, error: String(error) });
      }
    };

    // Invia stato iniziale IMMEDIATAMENTE per mantenere la connessione aperta
    const currentSync = activeSyncs.get(clientId);
    if (currentSync) {
      logger.info("[SSE] Sending current sync progress", { clientId, currentSync });
      sendEvent('progress', currentSync);
    } else {
      logger.info("[SSE] No active sync, sending idle status", { clientId });
      sendEvent('status', { status: 'idle' });
    }

    // Keep-alive ping ogni 5 secondi (ridotto da 15 per evitare timeout)
    const pingInterval = setInterval(() => {
      if (!res.writableEnded) {
        sendEvent('ping', { time: Date.now() });
      } else {
        clearInterval(pingInterval);
      }
    }, 5001);

    // Listener per aggiornamenti di progresso
    const progressListener = (data: any) => {
      if (data.clientId === clientId) {
        sendEvent('progress', {
          status: data.status,
          processed: data.processed,
          total: data.total,
          currentBatch: data.currentBatch,
          totalBatches: data.totalBatches,
          duration: Date.now() - (activeSyncs.get(clientId)?.startTime || Date.now()),
        });
      }
    };

    const completedListener = (data: any) => {
      if (data.clientId === clientId) {
        sendEvent('completed', {
          status: 'completed',
          processed: data.processed,
          failed: data.failed,
          duration: data.duration,
          success: data.success,
        });
        // Non chiudere la connessione - lascia che il client la chiuda
      }
    };

    const errorListener = (data: any) => {
      if (data.clientId === clientId) {
        sendEvent('error', {
          status: 'error',
          message: data.error,
        });
      }
    };

    // Registra listeners
    appEvents.on('syncProgress', progressListener);
    appEvents.on('syncCompleted', completedListener);
    appEvents.on('syncError', errorListener);

    // Cleanup quando la connessione si chiude
    req.on('close', () => {
      logger.info("[SSE] Client disconnected from sync stream", { clientId });
      clearInterval(pingInterval);
      appEvents.off('syncProgress', progressListener);
      appEvents.off('syncCompleted', completedListener);
      appEvents.off('syncError', errorListener);
    });

    // IMPORTANTE: Non terminare la funzione - la connessione deve rimanere aperta
    // Express manterrà la connessione aperta finché non chiamiamo res.end()
  });

  // Google Drive sync API (admin only) - VERSIONE OTTIMIZZATA CON SSE
  app.post("/api/sync", isAdmin, async (req, res) => {
    try {
      const clientId = req.user?.clientId;
      const userId = req.user?.legacyId;

      logger.info("Manual sync requested", { clientId, userId });

      if (!clientId || !userId) {
        logger.error("Sync failed: missing clientId or userId", {
          clientId,
          userId,
        });
        return res
          .status(400)
          .json({ message: "Nessun cliente associato a questo utente." });
      }

      // Verifica se c'è già una sync in corso per questo client
      const existingSync = activeSyncs.get(clientId);
      if (existingSync && existingSync.status === 'syncing') {
        return res.status(409).json({ 
          message: "Sincronizzazione già in corso",
          currentProgress: existingSync 
        });
      }

      const client = await mongoStorage.getClient(clientId);
      logger.info("Client retrieved for sync", {
        clientId,
        hasClient: !!client,
        hasDriveFolderId: !!client?.driveFolderId,
        driveFolderId: client?.driveFolderId,
      });

      if (!client || !client.driveFolderId) {
        logger.error("Sync failed: no client or drive folder configured", {
          clientId,
          hasClient: !!client,
          hasDriveFolderId: !!client?.driveFolderId,
        });
        return res
          .status(400)
          .json({ message: "Cartella di sincronizzazione non configurata." });
      }

      // Verifica se il client ha i token Google configurati
      if (!client.google?.refreshToken) {
        logger.error("Sync failed: no Google refresh token", { clientId });
        return res.status(400).json({
          message: "Google Drive non connesso. Connetti prima Google Drive.",
        });
      }

      logger.info("Starting manual sync with SSE support", {
        clientId,
        userId,
        driveFolderId: client.driveFolderId,
      });

      // Inizializza stato sincronizzazione
      const syncId = Date.now().toString();
      activeSyncs.set(clientId, {
        status: 'syncing',
        processed: 0,
        total: 0,
        currentBatch: 0,
        totalBatches: 0,
        startTime: Date.now(),
      });

      // Emetti evento di inizio
      appEvents.emit('syncProgress', {
        clientId,
        status: 'syncing',
        processed: 0,
        total: 0,
        currentBatch: 0,
        totalBatches: 0,
      });

      // Avvia la sincronizzazione con callback di progresso
      const syncPromise = syncWithGoogleDrive(
        client.driveFolderId, 
        userId,
        (processed, total, currentBatch, totalBatches) => {
          // Aggiorna stato e emetti evento
          const syncState = activeSyncs.get(clientId);
          if (syncState) {
            syncState.processed = processed;
            syncState.total = total;
            syncState.currentBatch = currentBatch;
            syncState.totalBatches = totalBatches;
          }
          
          appEvents.emit('syncProgress', {
            clientId,
            status: 'syncing',
            processed,
            total,
            currentBatch,
            totalBatches,
          });
        }
      );

      // Rispondi immediatamente con syncId per tracking via SSE
      res.json({
        message: "Sincronizzazione avviata. Connettiti a /api/sync/stream per aggiornamenti real-time.",
        syncId,
        streamUrl: "/api/sync/stream",
      });

      // Gestisci completamento in background
      syncPromise
        .then(async (result) => {
          // IMPORTANTE: Aspetta 500ms per assicurarsi che MongoDB abbia completato tutte le scritture
          await new Promise(resolve => setTimeout(resolve, 500));
          
          // Aggiorna stato
          activeSyncs.set(clientId, {
            status: 'completed',
            processed: result.processed,
            total: result.processed + result.failed,
            currentBatch: 0,
            totalBatches: 0,
            startTime: activeSyncs.get(clientId)?.startTime || Date.now(),
          });

          // Emetti evento di completamento
          appEvents.emit('syncCompleted', {
            clientId,
            success: result.success,
            processed: result.processed,
            failed: result.failed,
            duration: result.duration,
          });

          logger.info("Manual sync completed with SSE notification", {
            userId,
            clientId,
            success: result.success,
            processed: result.processed,
            failed: result.failed,
            duration: result.duration,
            errorCount: result.errors.length,
          });

          // Rimuovi dalla mappa dopo 60 secondi
          setTimeout(() => {
            activeSyncs.delete(clientId);
          }, 60000);
        })
        .catch((error) => {
          // Aggiorna stato errore
          activeSyncs.set(clientId, {
            status: 'error',
            processed: 0,
            total: 0,
            currentBatch: 0,
            totalBatches: 0,
            startTime: activeSyncs.get(clientId)?.startTime || Date.now(),
            error: error instanceof Error ? error.message : String(error),
          });

          // Emetti evento di errore
          appEvents.emit('syncError', {
            clientId,
            error: error instanceof Error ? error.message : String(error),
          });

          logger.error("Manual sync failed", {
            userId,
            clientId,
            error: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined,
          });

          logError(error, {
            context: "manual-sync",
            clientId: client.legacyId,
            userId,
            driveFolderId: client.driveFolderId,
          });
        });
    } catch (error) {
      logger.error("Sync endpoint error", {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        clientId: req.user?.clientId,
        userId: req.user?.legacyId,
      });

      res
        .status(500)
        .json({ message: "Errore nell'avviare la sincronizzazione" });
    }
  });

  // Endpoint per ottenere lo stato della sincronizzazione
  app.get("/api/sync/status", isAdmin, async (req, res) => {
    try {
      const clientId = req.user?.clientId;
      if (!clientId) {
        return res.status(400).json({ message: "Nessun cliente associato." });
      }

      // Conta i documenti del client
      const documents = await mongoStorage.getDocumentsByClientId(clientId);
      const documentCount = documents.length;

      // Verifica se ci sono documenti recenti (ultimi 10 minuti)
      const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
      const recentDocuments = documents.filter(
        (doc) => doc.createdAt && new Date(doc.createdAt) > tenMinutesAgo
      );

      res.json({
        status: documentCount > 0 ? "synced" : "pending",
        documentCount,
        recentDocumentCount: recentDocuments.length,
        lastSync: documentCount > 0 ? new Date().toISOString() : null,
        hasDocuments: documentCount > 0,
      });
    } catch (error) {
      res.status(500).json({
        message: "Errore nel recuperare lo stato della sincronizzazione",
      });
    }
  });

  app.patch("/api/users/:id/client", isAdmin, async (req, res) => {
    try {
      const userId = parseInt(req.params.legacyId, 10);
      const { clientId } = req.body;

      const user = await mongoStorage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "Utente non trovato" });
      }

      if (clientId !== null) {
        const client = await mongoStorage.getClient(clientId);
        if (!client) {
          return res.status(404).json({ message: "Client non trovato" });
        }
      }

      const updatedUser = await mongoStorage.updateUserClient(userId, clientId);

      const { password, ...userWithoutPassword } = updatedUser!;

      if (req.user) {
        await mongoStorage.createLog({
          userId: req.user.legacyId,
          action: "user-client-assignment",
          details: {
            message:
              clientId === null
                ? `Rimossa associazione client per utente ${userId}`
                : `Assegnato client ${clientId} all'utente ${userId}`,
            timestamp: new Date().toISOString(),
          },
        });
      }

      res.json(userWithoutPassword);
    } catch (error) {
      res
        .status(500)
        .json({ message: "Impossibile assegnare il client all'utente" });
    }
  });

  // Endpoint per ricevere report violazioni CSP (Content Security Policy)
  // Utile per monitorare tentativi di attacco XSS in produzione
  app.post("/api/csp-report", async (req, res) => {
    try {
      const report = req.body["csp-report"];
      
      if (report) {
        logger.warn("CSP Violation detected", {
          documentUri: report["document-uri"],
          violatedDirective: report["violated-directive"],
          blockedUri: report["blocked-uri"],
          sourceFile: report["source-file"],
          lineNumber: report["line-number"],
          ip: req.ip,
          userAgent: req.get("User-Agent"),
          timestamp: new Date().toISOString(),
        });
      }
      
      // Rispondi sempre con 204 No Content (best practice per CSP reports)
      res.status(204).send();
    } catch (error) {
      // Non loggare errori per evitare spam nei log
      res.status(204).send();
    }
  });

  // Endpoint di contatto con protezione anti-spam
  app.post("/api/contact", validateContactRequest, async (req, res) => {
    try {
      const { name, email, message, to, subject } = req.body;

      // Log della richiesta per sicurezza
      logger.info("Contact form submission", {
        ip: req.ip,
        userAgent: req.get("User-Agent"),
        email: email,
        name: name,
        subject: subject || "Richiesta di assistenza",
        messageLength: message.length,
        timestamp: new Date().toISOString(),
      });

      const info = await transporter.sendMail({
        from: `"${name}" <${email}>`,
        to: to || "docgenius8@gmail.com",
        subject: subject || `Richiesta di assistenza da ${name}`,
        text: message,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333;">Nuova richiesta di assistenza</h2>
            <div style="background-color: #f5f5f5; padding: 20px; border-radius: 5px; margin: 20px 0;">
              <p><strong>Da:</strong> ${name}</p>
              <p><strong>Email:</strong> ${email}</p>
              <p><strong>IP:</strong> ${req.ip}</p>
              <p><strong>User-Agent:</strong> ${
                req.get("User-Agent") || "N/A"
              }</p>
              <p><strong>Messaggio:</strong></p>
              <p style="white-space: pre-wrap;">${message}</p>
            </div>
            <hr style="border-top: 1px solid #ddd; margin: 20px 0;">
            <p style="color: #666; font-size: 12px;">
              Questo messaggio è stato inviato dal form di contatto del Sistema di Pannello di Controllo SGI.
              <br>Timestamp: ${new Date().toISOString()}
            </p>
          </div>
        `,
      });

      // Log del successo
      logger.info("Contact email sent successfully", {
        messageId: info.messageId,
        ip: req.ip,
        email: email,
        timestamp: new Date().toISOString(),
      });

      res.status(200).json({ success: true, messageId: info.messageId });
    } catch (error) {
      // Log dell'errore
      logger.error("Contact email failed", {
        error: error instanceof Error ? error.message : "Unknown error",
        ip: req.ip,
        email: req.body.email,
        timestamp: new Date().toISOString(),
      });

      res.status(500).json({ error: "Errore nell'invio dell'email" });
    }
  });

  // Endpoint per richiedere il reset della password
  app.post("/api/forgot-password", handlePasswordReset);

  // API per gestire i codici aziendali
  // GET - Ottieni tutti i codici aziendali (solo admin)
  app.get("/api/company-codes", isAdmin, async (req, res) => {
    try {
      const page = parseInt(req.query.page as string, 10) || 1;
      const limit = parseInt(req.query.limit as string, 10) || 10;

      const result = await mongoStorage.getPaginatedCompanyCodes({ page, limit });

      res.json(result);
    } catch (error) {
      res
        .status(500)
        .json({ message: "Errore durante il recupero dei codici aziendali" });
    }
  });

  // POST - Crea un nuovo codice aziendale (solo admin) - VERSIONE CORRETTA
  app.post(
    "/api/company-codes/bulk-generate",
    isSuperAdmin,
    async (req, res) => {
      try {
        const codesToCreate: (InsertCompanyCode & { legacyId: number })[] = [];
        const year = new Date().getFullYear();
        const createdBy = req.user?.legacyId || 0;

        // Genera 30 codici, ognuno con il proprio legacyId univoco
        for (let i = 0; i < 30; i++) {
          const legacyId = await getNextSequence("companyCodeId"); // Usa la sequenza per ogni codice
          const randomPart = Math.random()
            .toString(36)
            .substring(2, 8)
            .toUpperCase();
          const newCodeString = `BULK-${year}-${randomPart}`;

          codesToCreate.push({
            legacyId,
            code: newCodeString,
            role: "admin",
            usageLimit: 1,
            expiresAt: null,
            isActive: true,
            createdBy,
          });
        }

        // Usa insertMany per efficienza
        const newCodes = await mongoStorage.createManyCompanyCodes(codesToCreate);

        await mongoStorage.createLog({
          userId: createdBy,
          action: "company_code_bulk_created",
          details: {
            message: "30 company codes created in bulk",
            count: newCodes.length,
            timestamp: new Date().toISOString(),
          },
        });

        res
          .status(201)
          .json({ message: `${newCodes.length} codici creati con successo.` });
      } catch (error) {
        logger.error(
          "Errore durante la generazione in blocco dei codici",
          error
        );
        res
          .status(500)
          .json({ message: "Errore durante la generazione dei codici." });
      }
    }
  );

  // PATCH - Aggiorna un codice - VERSIONE CORRETTA
  app.patch("/api/company-codes/:id", isAdmin, async (req, res) => {
    try {
      // Converte l'ID da stringa (parametro URL) a numero
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({ message: "ID non valido." });
      }

      const { code, role, usageLimit, expiresAt, isActive } = req.body;

      const existingCode = await mongoStorage.getCompanyCode(id);
      if (!existingCode) {
        return res
          .status(404)
          .json({ message: "Codice aziendale non trovato" });
      }

      if (code && code !== existingCode.code) {
        const duplicateCode = await mongoStorage.getCompanyCodeByCode(code);
        if (duplicateCode && duplicateCode.legacyId !== id) {
          return res
            .status(400)
            .json({ message: "Questo codice aziendale esiste già" });
        }
      }

      const updateData: Partial<CompanyCodeDocument> = {};
      if (code !== undefined) updateData.code = code;
      if (role !== undefined) updateData.role = role;
      if (usageLimit !== undefined) updateData.usageLimit = Number(usageLimit);
      if (expiresAt !== undefined) {
        updateData.expiresAt = expiresAt ? new Date(expiresAt) : null;
      }
      if (isActive !== undefined) updateData.isActive = isActive;

      // Passa l'ID numerico alla funzione di storage
      const updatedCode = await mongoStorage.updateCompanyCode(id, updateData);

      await mongoStorage.createLog({
        userId: req.user?.legacyId || 0,
        action: "company_code_updated",
        details: {
          message: "Company code updated",
          codeId: id,
          updates: updateData,
          timestamp: new Date().toISOString(),
        },
      });

      res.json(updatedCode);
    } catch (error) {
      logger.error(
        `Errore durante l'aggiornamento del codice aziendale ${req.params.id}`,
        error
      );
      res.status(500).json({
        message: "Errore durante l'aggiornamento del codice aziendale",
      });
    }
  });

  // DELETE - Elimina un codice - VERSIONE CORRETTA
  app.delete("/api/company-codes/:id", isAdmin, async (req, res) => {
    try {
      // Converte l'ID da stringa (parametro URL) a numero
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({ message: "ID non valido." });
      }

      const existingCode = await mongoStorage.getCompanyCode(id);
      if (!existingCode) {
        return res
          .status(404)
          .json({ message: "Codice aziendale non trovato" });
      }

      // Passa l'ID numerico alla funzione di storage
      const deleted = await mongoStorage.deleteCompanyCode(id);

      if (deleted) {
        await mongoStorage.createLog({
          userId: req.user?.legacyId || 0,
          action: "company_code_deleted",
          details: {
            message: "Company code deleted",
            codeId: id,
            code: existingCode.code,
            timestamp: new Date().toISOString(),
          },
        });
        res
          .status(200)
          .json({ message: "Codice aziendale eliminato con successo" });
      } else {
        res
          .status(404)
          .json({ message: "Codice aziendale non trovato o già eliminato" });
      }
    } catch (error) {
      logger.error(
        `Errore durante l'eliminazione del codice aziendale ${req.params.id}`,
        error
      );
      res.status(500).json({
        message: "Errore durante l'eliminazione del codice aziendale",
      });
    }
  });

  // Endpoint per crittografare e verificare l'integrità di un documento
  app.post("/api/documents/:id/encrypt", isAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.legacyId, 10);
      const { filePath } = req.body;

      if (!filePath) {
        return res.status(400).json({ message: "Percorso del file richiesto" });
      }

      const document = await mongoStorage.getDocument(id);
      if (!document) {
        return res.status(404).json({ message: "Documento non trovato" });
      }

      // Validazione: il file deve essere sotto la directory document.path (relativa alla root dei documenti)
      const documentsRoot = path.resolve(process.cwd(), "documents");
      const documentDir = path.resolve(documentsRoot, document.path);
      const requestedFile = path.resolve(filePath);
      if (!requestedFile.startsWith(documentDir + path.sep)) {
        return res.status(400).json({
          message:
            "Accesso al file non consentito: il file deve essere sotto la directory del documento.",
        });
      }
      // Protezione path traversal
      if (path.relative(documentDir, requestedFile).includes("..")) {
        return res
          .status(400)
          .json({ message: "Path traversal non consentito." });
      }

      const updatedDocument = await mongoStorage.hashAndEncryptDocument(
        id,
        requestedFile
      );

      if (req.user && updatedDocument && updatedDocument.encryptedCachePath) {
        await mongoStorage.createLog({
          userId: req.user.legacyId,
          action: "security",
          documentId: id,
          details: {
            message: `Documento criptato: ${document.title}`,
            filePath: filePath,
            timestamp: new Date().toISOString(),
            encryptedPath: updatedDocument.encryptedCachePath,
          },
        });
      }

      res.json({
        message: "Documento criptato con successo",
        document: updatedDocument,
      });
    } catch (error) {
      res.status(500).json({ message: "Impossibile criptare il documento" });
    }
  });

  app.get("/api/documents/:id/verify", isAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.legacyId, 10);

      const document = await mongoStorage.getDocument(id);
      if (!document) {
        return res.status(404).json({ message: "Documento non trovato" });
      }

      if (!document.fileHash || !document.encryptedCachePath) {
        return res.status(400).json({
          message: "Il documento non è stato ancora criptato o non ha un hash",
          status: "not_encrypted",
        });
      }

      const isValid = await mongoStorage.verifyDocumentIntegrity(id);

      if (req.user) {
        await mongoStorage.createLog({
          userId: req.user.legacyId,
          action: "security",
          documentId: id,
          details: {
            message: `Verifica integrità documento: ${document.title}`,
            result: isValid ? "valido" : "invalido",
            timestamp: new Date().toISOString(),
          },
        });
      }

      if (isValid) {
        res.json({
          message: "Verifica integrità documento completata",
          status: "valid",
          document,
        });
      } else {
        res.status(400).json({
          message:
            "Verifica integrità fallita! Il documento potrebbe essere stato manomesso.",
          status: "invalid",
          document,
        });
      }
    } catch (error) {
      res
        .status(500)
        .json({ message: "Impossibile verificare l'integrità del documento" });
    }
  });

  app.post("/api/documents/:id/share", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.legacyId, 10);
      const { action, expiryHours } = req.body;

      if (!action || !["view", "download"].includes(action)) {
        return res.status(400).json({
          message: "Azione non valida. Deve essere 'view' o 'download'",
        });
      }

      const document = await mongoStorage.getDocument(id);
      if (!document) {
        return res.status(404).json({ message: "Documento non trovato" });
      }

      const expiryMs = (expiryHours || 24) * 60 * 60 * 1000;

      if (!req.user || !req.user.legacyId) {
        return res.status(401).json({ message: "Utente non autenticato" });
      }

      const secureLink = generateSecureLink(
        id,
        req.user.legacyId,
        action,
        expiryMs
      );

      const absoluteUrl = `${req.protocol}://${req.get("host")}${secureLink}`;

      res.json({
        message: "Link di condivisione generato",
        shareLink: absoluteUrl,
        expires: new Date(Date.now() + expiryMs).toISOString(),
        documentId: id,
        action,
      });
    } catch (error) {
      res
        .status(500)
        .json({ message: "Impossibile generare il link di condivisione" });
    }
  });

  app.get("/api/secure/:encodedData/:expires/:signature", async (req, res) => {
    try {
      const { encodedData, expires, signature } = req.params;

      const linkData = verifySecureLink(encodedData, expires, signature);

      if (!linkData) {
        return res.status(401).json({ message: "Link non valido o scaduto" });
      }

      if (linkData.action === "reset-password") {
        return res.redirect(
          `/reset-password?data=${encodedData}&expires=${expires}&signature=${signature}`
        );
      }

      if (linkData.documentId === null) {
        return res
          .status(400)
          .json({ message: "Link non valido: documento non specificato" });
      }

      const document = await mongoStorage.getDocument(linkData.documentId);
      if (!document) {
        return res.status(404).json({ message: "Documento non trovato" });
      }

      await mongoStorage.createLog({
        userId: linkData.userId,
        action: `secure-link-${linkData.action}`,
        documentId: linkData.documentId,
        details: {
          message: `Accesso documento tramite link sicuro: ${document.title}`,
          action: linkData.action,
          timestamp: new Date().toISOString(),
        },
      });

      if (linkData.action === "view") {
        return res.redirect(
          `/documents/view/${linkData.documentId}?secure=true`
        );
      } else if (linkData.action === "download") {
        if (document.encryptedCachePath) {
          res.setHeader(
            "Content-Disposition",
            `attachment; filename="${document.title}"`
          );
          return res.json({
            message: "Documento disponibile per il download",
            document: { ...document, secureAccess: true },
          });
        } else {
          return res.redirect(document.driveUrl);
        }
      }

      res.status(400).json({ message: "Azione non valida" });
    } catch (error) {
      res
        .status(500)
        .json({ message: "Errore durante l'elaborazione del link sicuro" });
    }
  });

  app.post("/api/verify-reset-link", async (req, res) => {
    try {
      const { data, expires, signature } = req.body;

      if (!data || !expires || !signature) {
        // Log del tentativo di bypass
        await mongoStorage.createLog({
          userId: 0,
          action: "security-alert",
          details: {
            message:
              "Tentativo di bypass verifica link reset password - parametri mancanti",
            ipAddress: req.ip || "unknown",
            userAgent: req.get("User-Agent") || "unknown",
            timestamp: new Date().toISOString(),
            endpoint: "/api/verify-reset-link",
          },
        });

        return res
          .status(400)
          .json({ success: false, message: "Parametri mancanti" });
      }

      // Validazione rigorosa della firma HMAC
      const linkData = verifySecureLink(data, expires, signature);

      if (!linkData) {
        // Log del tentativo di bypass con firma non valida
        await mongoStorage.createLog({
          userId: 0,
          action: "security-alert",
          details: {
            message:
              "Tentativo di bypass verifica link reset password - firma HMAC non valida",
            ipAddress: req.ip || "unknown",
            userAgent: req.get("User-Agent") || "unknown",
            timestamp: new Date().toISOString(),
            endpoint: "/api/verify-reset-link",
            providedData: data.substring(0, 50) + "...", // Log parziale per sicurezza
            providedExpires: expires,
            providedSignature: signature.substring(0, 20) + "...",
          },
        });

        return res
          .status(401)
          .json({ success: false, message: "Link non valido o scaduto" });
      }

      // Verifica aggiuntiva che sia effettivamente un link di reset password
      if (linkData.action !== "reset-password") {
        await mongoStorage.createLog({
          userId: 0,
          action: "security-alert",
          details: {
            message:
              "Tentativo di uso improprio di link sicuro per reset password",
            ipAddress: req.ip || "unknown",
            userAgent: req.get("User-Agent") || "unknown",
            timestamp: new Date().toISOString(),
            endpoint: "/api/verify-reset-link",
            action: linkData.action,
            userId: linkData.userId,
          },
        });

        return res
          .status(401)
          .json({ success: false, message: "Tipo di link non valido" });
      }

      // Log dell'accesso legittimo
      await mongoStorage.createLog({
        userId: linkData.userId,
        action: "reset-link-verified",
        details: {
          message: "Link di reset password verificato con successo",
          ipAddress: req.ip || "unknown",
          userAgent: req.get("User-Agent") || "unknown",
          timestamp: new Date().toISOString(),
        },
      });

      res.json({ success: true, message: "Link valido", data: linkData });
    } catch (error) {
      console.error("Errore durante la verifica del link di reset:", error);

      // Log dell'errore
      await mongoStorage.createLog({
        userId: 0,
        action: "security-error",
        details: {
          message: "Errore durante la verifica del link di reset password",
          ipAddress: req.ip || "unknown",
          userAgent: req.get("User-Agent") || "unknown",
          timestamp: new Date().toISOString(),
          endpoint: "/api/verify-reset-link",
          error: error instanceof Error ? error.message : "Unknown error",
        },
      });

      res.status(500).json({
        success: false,
        message: "Errore durante la verifica del link",
      });
    }
  });

  app.post("/api/reset-password", async (req, res) => {
    try {
      const { userId, password, data, expires, signature } = req.body;

      let userIdToUpdate: number;
      let linkData: any = null;

      // Verifica se abbiamo userId diretto o token
      if (userId) {
        userIdToUpdate = userId;
      } else if (data && expires && signature) {
        // Validazione rigorosa del token con controlli HMAC completi
        linkData = verifySecureLink(data, expires, signature);

        if (!linkData) {
          // Log del tentativo di bypass
          await mongoStorage.createLog({
            userId: 0,
            action: "security-alert",
            details: {
              message:
                "Tentativo di bypass reset password - firma HMAC non valida",
              ipAddress: req.ip || "unknown",
              userAgent: req.get("User-Agent") || "unknown",
              timestamp: new Date().toISOString(),
              endpoint: "/api/reset-password",
              providedData: data.substring(0, 50) + "...",
              providedExpires: expires,
              providedSignature: signature.substring(0, 20) + "...",
            },
          });

          return res.status(401).json({
            success: false,
            message: "Token non valido o scaduto",
          });
        }

        if (linkData.action !== "reset-password") {
          await mongoStorage.createLog({
            userId: 0,
            action: "security-alert",
            details: {
              message: "Tentativo di uso improprio di token per reset password",
              ipAddress: req.ip || "unknown",
              userAgent: req.get("User-Agent") || "unknown",
              timestamp: new Date().toISOString(),
              endpoint: "/api/reset-password",
              action: linkData.action,
              userId: linkData.userId,
            },
          });

          return res.status(401).json({
            success: false,
            message: "Tipo di token non valido",
          });
        }

        userIdToUpdate = linkData.userId;
      } else {
        // Log del tentativo di bypass
        await mongoStorage.createLog({
          userId: 0,
          action: "security-alert",
          details: {
            message: "Tentativo di reset password senza autenticazione",
            ipAddress: req.ip || "unknown",
            userAgent: req.get("User-Agent") || "unknown",
            timestamp: new Date().toISOString(),
            endpoint: "/api/reset-password",
          },
        });

        return res.status(400).json({
          success: false,
          message: "Dati incompleti: userId o token richiesti",
        });
      }

      if (!password) {
        return res.status(400).json({
          success: false,
          message: "Password mancante",
        });
      }

      // Validazione della password
      if (password.length < 8) {
        return res.status(400).json({
          success: false,
          message: "La password deve essere di almeno 8 caratteri",
        });
      }

      // Verifica che l'utente esista
      const user = await mongoStorage.getUser(userIdToUpdate);
      if (!user) {
        await mongoStorage.createLog({
          userId: 0,
          action: "security-alert",
          details: {
            message: "Tentativo di reset password per utente inesistente",
            ipAddress: req.ip || "unknown",
            userAgent: req.get("User-Agent") || "unknown",
            timestamp: new Date().toISOString(),
            endpoint: "/api/reset-password",
            attemptedUserId: userIdToUpdate,
          },
        });

        return res.status(404).json({
          success: false,
          message: "Utente non trovato",
        });
      }

      // Hash della nuova password usando scrypt (stesso algoritmo del login)
      const { hashPassword } = await import("./auth");
      const hashedPassword = await hashPassword(password);

      // Aggiorna la password
      const updatedUser = await mongoStorage.updateUserPassword(
        userIdToUpdate,
        hashedPassword
      );
      if (!updatedUser) {
        return res.status(500).json({
          success: false,
          message: "Errore nell'aggiornamento della password",
        });
      }

      // Log dell'azione di successo
      await mongoStorage.createLog({
        userId: userIdToUpdate,
        action: "password-reset-complete",
        details: {
          message: "Reset password completato con successo",
          timestamp: new Date().toISOString(),
          ipAddress: req.ip || "unknown",
          userAgent: req.get("User-Agent") || "unknown",
          resetMethod: linkData ? "secure-link" : "direct-userId",
          userEmail: user.email,
        },
      });

      res.json({
        success: true,
        message: "Password reimpostata con successo",
      });
    } catch (error) {
      console.error("Errore nel reset della password:", error);

      // Log dell'errore
      await mongoStorage.createLog({
        userId: 0,
        action: "security-error",
        details: {
          message: "Errore durante il reset della password",
          ipAddress: req.ip || "unknown",
          userAgent: req.get("User-Agent") || "unknown",
          timestamp: new Date().toISOString(),
          endpoint: "/api/reset-password",
          error: error instanceof Error ? error.message : "Unknown error",
        },
      });

      res.status(500).json({
        success: false,
        message: "Errore durante il reset della password",
      });
    }
  });

  // Endpoint di test per verificare la configurazione Google Drive
  app.get("/api/sync/test-config", isAdmin, async (req, res) => {
    try {
      const clientId = req.user?.clientId;
      const userId = req.user?.legacyId;

      logger.info("Testing Google Drive configuration", { clientId, userId });

      if (!clientId || !userId) {
        return res.status(400).json({
          message: "Nessun cliente associato a questo utente.",
          hasClientId: !!clientId,
          hasUserId: !!userId,
        });
      }

      // 1. Verifica utente
      const user = await mongoStorage.getUser(userId);
      if (!user) {
        return res.status(400).json({
          message: "Utente non trovato.",
          userId,
        });
      }

      // 2. Verifica client
      const client = await mongoStorage.getClient(clientId);
      if (!client) {
        return res.status(400).json({
          message: "Client non trovato.",
          clientId,
        });
      }

      // 3. Verifica configurazione Google Drive
      const configStatus = {
        hasDriveFolderId: !!client.driveFolderId,
        driveFolderId: client.driveFolderId,
        hasGoogleTokens: !!client.google?.refreshToken,
        hasRefreshToken: !!client.google?.refreshToken,
        userEmail: user.email,
        userRole: user.role,
        clientName: client.name,
      };

      // 4. Test connessione Google Drive (se configurato)
      let driveConnectionTest = null;
      if (client.google?.refreshToken && client.driveFolderId) {
        try {
          logger.info("Testing Google Drive connection", { clientId });
          const drive = await getDriveClientForClient(clientId);
          const isConnected = await validateDriveConnection(drive);

          driveConnectionTest = {
            success: isConnected,
            message: isConnected
              ? "Connessione Google Drive OK"
              : "Connessione Google Drive fallita",
          };
        } catch (error) {
          driveConnectionTest = {
            success: false,
            message:
              error instanceof Error ? error.message : "Errore sconosciuto",
            error: error instanceof Error ? error.message : String(error),
          };
        }
      }

      res.json({
        message: "Test configurazione completato",
        configStatus,
        driveConnectionTest,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error("Test configuration error", {
        error: error instanceof Error ? error.message : String(error),
        clientId: req.user?.clientId,
        userId: req.user?.legacyId,
      });

      res.status(500).json({
        message: "Errore durante il test della configurazione",
        error: error instanceof Error ? error.message : String(error),
      });
    }
  });

  // Endpoint di debug per verificare autenticazione e permessi
  app.get("/api/debug/auth", (req, res, next) => {
    // Permetti solo in ambienti non di produzione
    if (process.env.NODE_ENV === "production") {
      return res.status(404).json({ message: "Not found" });
    }
    // Applica il controllo superadmin
    isSuperAdmin(req, res, function () {
      try {
        const authStatus = {
          isAuthenticated: req.isAuthenticated(),
          user: req.user
            ? {
                id: req.user.legacyId,
                email: req.user.email,
                role: req.user.role,
                clientId: req.user.clientId,
                sessionExpiry: req.user.sessionExpiry,
              }
            : null,
          session: req.session
            ? {
                id: req.session.id,
                cookie: req.session.cookie,
              }
            : null,
          headers: {
            "user-agent": req.get("User-Agent"),
            origin: req.get("Origin"),
            referer: req.get("Referer"),
          },
          timestamp: new Date().toISOString(),
        };

        res.json(authStatus);
      } catch (error) {
        res.status(500).json({
          message: "Errore nel debug dell'autenticazione",
          error: error instanceof Error ? error.message : String(error),
        });
      }
    });
  });

  // Endpoint per aggiornare le date di scadenza dei documenti Excel
  app.post("/api/excel/update-expiry-dates", isAdmin, async (req, res) => {
    try {
      const clientId = req.user?.clientId;
      const userId = req.user?.legacyId;

      logger.info("Excel expiry dates update requested", { clientId, userId });

      if (!clientId || !userId) {
        logger.error("Excel update failed: missing clientId or userId", {
          clientId,
          userId,
        });
        return res
          .status(400)
          .json({ message: "Nessun cliente associato a questo utente." });
      }

      const client = await mongoStorage.getClient(clientId);
      if (!client || !client.google?.refreshToken) {
        logger.error("Excel update failed: no Google refresh token", {
          clientId,
        });
        return res.status(400).json({
          message: "Google Drive non connesso. Connetti prima Google Drive.",
        });
      }

      // Ottieni il client Google Drive
      const drive = await getDriveClientForClient(clientId);
      if (!drive) {
        logger.error("Excel update failed: could not get Google Drive client", {
          clientId,
        });
        return res
          .status(500)
          .json({ message: "Errore nella connessione a Google Drive." });
      }

      logger.info("Starting Excel expiry dates update", { clientId, userId });

      // Avvia l'aggiornamento in background
      const updatePromise = updateExcelExpiryDates(drive, userId);

      // Rispondi immediatamente che l'aggiornamento è iniziato
      res.json({
        message: "Aggiornamento date di scadenza Excel avviato",
        updateId: Date.now().toString(),
      });

      // Esegui l'aggiornamento in background
      updatePromise
        .then((result) => {
          logger.info("Excel expiry dates update completed", {
            userId,
            clientId,
            updated: result.updated,
            failed: result.failed,
            errorCount: result.errors.length,
          });
        })
        .catch((error) => {
          logger.error("Excel expiry dates update failed", {
            userId,
            clientId,
            error: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined,
          });

          logError(error, {
            context: "excel-expiry-update",
            clientId: client.legacyId,
            userId,
          });
        });
    } catch (error) {
      logger.error("Excel expiry update endpoint error", {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        clientId: req.user?.clientId,
        userId: req.user?.legacyId,
      });

      res.status(500).json({
        message: "Errore nell'avviare l'aggiornamento delle date di scadenza",
      });
    }
  });

  // Endpoint per aggiornare dinamicamente gli stati di allerta
  app.post("/api/documents/update-alert-status", isAdmin, async (req, res) => {
    try {
      const clientId = req.user?.clientId;
      const userId = req.user?.legacyId;

      logger.info("Dynamic alert status update requested", {
        clientId,
        userId,
      });

      if (!clientId || !userId) {
        logger.error("Alert status update failed: missing clientId or userId", {
          clientId,
          userId,
        });
        return res
          .status(400)
          .json({ message: "Nessun cliente associato a questo utente." });
      }

      // Ottieni tutti i documenti attivi del cliente
      const allDocuments = await mongoStorage.getAllDocuments();
      const clientDocuments = allDocuments.filter(
        (doc) => doc.clientId === clientId && !doc.isObsolete
      );

      logger.info("Starting dynamic alert status update", {
        clientId,
        userId,
        totalDocuments: clientDocuments.length,
      });

      let updatedCount = 0;
      let errors: string[] = [];

      for (const doc of clientDocuments) {
        try {
          if (doc.expiryDate) {
            // Calcola il nuovo stato di allerta basandosi sulla data corrente
            const newAlertStatus = calculateDynamicAlertStatus(doc.expiryDate);

            // Aggiorna solo se lo stato è cambiato
            if (newAlertStatus !== doc.alertStatus) {
              await mongoStorage.updateDocument(doc.legacyId, {
                alertStatus: newAlertStatus,
              });

              // Crea un log dell'aggiornamento
              await mongoStorage.createLog({
                userId,
                action: "update_alert_status",
                documentId: doc.legacyId,
                details: {
                  message: `Aggiornato stato di allerta da ${doc.alertStatus} a ${newAlertStatus}`,
                  oldAlertStatus: doc.alertStatus,
                  newAlertStatus: newAlertStatus,
                  expiryDate: doc.expiryDate,
                },
              });

              updatedCount++;

              logger.info("Updated document alert status", {
                documentId: doc.legacyId,
                title: doc.title,
                oldAlertStatus: doc.alertStatus,
                newAlertStatus: newAlertStatus,
                expiryDate: doc.expiryDate,
              });
            }
          }
        } catch (error) {
          const errorMessage = `Failed to update document ${doc.legacyId}: ${
            error instanceof Error ? error.message : String(error)
          }`;
          errors.push(errorMessage);

          logger.error("Failed to update document alert status", {
            documentId: doc.legacyId,
            title: doc.title,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }

      logger.info("Dynamic alert status update completed", {
        userId,
        clientId,
        updated: updatedCount,
        errors: errors.length,
        totalProcessed: clientDocuments.length,
      });

      res.json({
        message: "Aggiornamento stati di allerta completato",
        updated: updatedCount,
        errors: errors,
        totalProcessed: clientDocuments.length,
      });
    } catch (error) {
      logger.error("Dynamic alert status update endpoint error", {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        clientId: req.user?.clientId,
        userId: req.user?.legacyId,
      });

      res
        .status(500)
        .json({ message: "Errore nell'aggiornamento degli stati di allerta" });
    }
  });

  // Upload documenti locali (cartella) - Versione ottimizzata
  app.post(
    "/api/documents/local-upload",
    isAdmin,
    upload.array("localFiles"),
    handleMulterError,
    async (req, res) => {
      try {
        logger.info("Starting local document upload", {
          userId: req.user?.legacyId,
          clientId: req.user?.clientId,
          fileCount: req.files?.length || 0,
        });

        if (!req.user?.clientId) {
          logger.warn("Upload denied - user not associated with client", {
            userId: req.user?.legacyId,
          });
          return res.status(403).json({
            message: "Accesso negato: l'utente non è associato a nessun client",
          });
        }

        const clientId = req.user.clientId;
        const userId = req.user.legacyId;
        const files = req.files as Express.Multer.File[];

        if (!files || files.length === 0) {
          logger.warn("No files uploaded", { userId, clientId });
          return res.status(400).json({ message: "Nessun file caricato" });
        }

        // Controlli aggiuntivi per upload numerosi
        const totalSizeMB = files.reduce((sum, f) => sum + f.size, 0) / (1024 * 1024);
        
        // Info per batch ottimali
        if (files.length > 20) {
          logger.info("Optimal batch size upload", {
            userId,
            clientId,
            fileCount: files.length,
            totalSizeMB: Math.round(totalSizeMB),
            batchOptimization: files.length === 25 ? "Perfect batch size for Render stability" : "Good batch size"
          });
        }

        logger.info("Processing uploaded files", {
          userId,
          clientId,
          fileCount: files.length,
          totalSizeMB: Math.round(totalSizeMB),
          avgFileSizeMB: Math.round(totalSizeMB / files.length * 100) / 100,
          fileNames: files.length <= 10 ? files.map(f => f.originalname) : `${files.slice(0, 5).map(f => f.originalname).join(', ')}... and ${files.length - 5} more`,
        });

        // Genera un ID univoco per questo upload batch
        const uploadId = uuidv4();
        
        // Risposta immediata al client con ID di tracking
        res.json({
          success: true,
          uploadId,
          message: `Upload avviato per ${files.length} file. L'elaborazione continua in background.`,
          totalFiles: files.length
        });

        // Elaborazione asincrona in background
        processFilesInBackground(files, clientId, userId, uploadId);

      } catch (error) {
        logger.error("Error during local document upload", {
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
          clientId: req.user?.clientId,
          userId: req.user?.legacyId,
        });

        res.status(500).json({
          message: "Errore durante l'upload dei documenti locali",
        });
      }
    }
  );

  // Nuovo endpoint per verificare lo stato dell'upload
  app.get("/api/documents/upload-status/:uploadId", isAdmin, async (req, res) => {
    try {
      const { uploadId } = req.params;
      
      if (!uploadId || typeof uploadId !== 'string') {
        return res.status(400).json({ 
          message: "ID upload non valido",
          code: "INVALID_UPLOAD_ID" 
        });
      }
      
      const status = await getUploadStatus(uploadId);
      
      if (!status) {
        return res.status(404).json({ 
          message: "Stato upload non trovato o scaduto",
          code: "UPLOAD_STATUS_NOT_FOUND",
          uploadId 
        });
      }
      
      res.json(status);
    } catch (error) {
      logger.error("Error getting upload status", {
        uploadId: req.params.uploadId,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
      res.status(500).json({ 
        message: "Errore nel recupero dello stato",
        code: "UPLOAD_STATUS_ERROR" 
      });
    }
  });

// 🆕 FUNZIONE HELPER: Cleanup sicuro del file caricato
async function cleanupUploadedFile(file: Express.Multer.File): Promise<void> {
  try {
    // In memoryStorage non esiste un percorso fisico: esci subito
    if (!file.path) return;

    // Verifica che il file esista prima di tentare l'eliminazione (per eventuali storage su disco)
    if (!fs.existsSync(file.path)) return;

    await fs.promises.unlink(file.path);
    logger.debug("Uploaded file cleaned up successfully", {
      fileName: file.originalname,
      filePath: file.path,
      fileSize: file.size
    });
  } catch (error) {
    // Non bloccare l'elaborazione per errori di cleanup
    // Log come warning invece di error per non allarmare
    logger.warn("Failed to cleanup uploaded file", {
      fileName: file.originalname,
      filePath: file.path,
      error: error instanceof Error ? error.message : String(error)
    });
  }
}

// Funzione per elaborazione asincrona dei file con gestione memoria ottimizzata
async function processFilesInBackground(
  files: Express.Multer.File[], 
  clientId: number, 
  userId: number, 
  uploadId: string
) {
  const uploadStatus = {
    uploadId,
    totalFiles: files.length,
    processedFiles: 0,
    failedFiles: 0,
    errors: [] as string[],
    processedDocs: [] as any[],
    status: 'processing' as 'processing' | 'completed' | 'failed',
    startTime: new Date(),
    endTime: null as Date | null
  };

  // Salva lo stato iniziale
  await saveUploadStatus(uploadId, uploadStatus);

  try {
    logger.info("Starting background file processing", {
      uploadId,
      userId,
      clientId,
      fileCount: files.length
    });

    // Elaborazione parallela ottimizzata per batch da 25 file
    const avgFileSize = files.reduce((sum, f) => sum + f.size, 0) / files.length / (1024 * 1024); // MB
    
    // Ottimizzazione specifica per batch da 25 file su Render
    let BATCH_SIZE;
    if (avgFileSize <= 2) {
      BATCH_SIZE = 5; // File molto piccoli: 5 in parallelo per batch da 25
    } else if (avgFileSize <= 3) {
      BATCH_SIZE = 4; // File piccoli: 4 in parallelo  
    } else {
      BATCH_SIZE = 3; // File più grandi: 3 in parallelo per sicurezza
    }
    const batches = [];
    
    for (let i = 0; i < files.length; i += BATCH_SIZE) {
      batches.push(files.slice(i, i + BATCH_SIZE));
    }

    for (const batch of batches) {
      const batchPromises = batch.map(file => 
        processIndividualFile(file, clientId, userId, uploadId)
      );

      const batchResults = await Promise.allSettled(batchPromises);
      
      // Aggiorna stato per ogni file del batch
      for (const result of batchResults) {
        if (result.status === 'fulfilled') {
          if (result.value.success) {
            uploadStatus.processedFiles++;
            if (result.value.document) {
              uploadStatus.processedDocs.push(result.value.document);
            }
          } else {
            uploadStatus.failedFiles++;
            uploadStatus.errors.push(result.value.error || 'Errore sconosciuto');
          }
        } else {
          uploadStatus.failedFiles++;
          uploadStatus.errors.push(`Errore critico: ${result.reason}`);
        }
      }

      // Aggiorna stato intermedio
      await saveUploadStatus(uploadId, uploadStatus);

      // Pausa ottimizzata per batch da 25 file
      if (batches.indexOf(batch) < batches.length - 1) {
        // Pausa calibrata per batch ottimali da 25 file su Render
        let pauseDuration;
        if (avgFileSize <= 2) {
          pauseDuration = 30; // File molto piccoli: pausa minima
        } else if (avgFileSize <= 3) {
          pauseDuration = 50; // File piccoli: pausa standard
        } else {
          pauseDuration = 75; // File più grandi: pausa più lunga
        }
        
        await new Promise(resolve => setTimeout(resolve, pauseDuration));
      }
    }

    // Gestione revisioni obsolete dopo aver processato tutti i documenti
    if (uploadStatus.processedDocs.length > 0) {
      await mongoStorage.markObsoleteRevisionsForClient(clientId);
    }

    uploadStatus.status = 'completed';
    uploadStatus.endTime = new Date();

    logger.info("Background file processing completed", {
      uploadId,
      userId,
      clientId,
      processed: uploadStatus.processedFiles,
      failed: uploadStatus.failedFiles,
      errors: uploadStatus.errors.length
    });

  } catch (error) {
    uploadStatus.status = 'failed';
    uploadStatus.endTime = new Date();
    uploadStatus.errors.push(`Errore critico: ${error instanceof Error ? error.message : String(error)}`);
    
    logger.error("Background file processing failed", {
      uploadId,
      userId,
      clientId,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
  } finally {
    // 🆕 CLEANUP FINALE: Elimina tutti i file rimanenti (fallback di sicurezza)
    logger.info("Starting final cleanup of uploaded files", {
      uploadId,
      fileCount: files.length
    });
    
    const cleanupResults = await Promise.allSettled(
      files.map(file => cleanupUploadedFile(file))
    );
    
    const cleanedCount = cleanupResults.filter(r => r.status === 'fulfilled').length;
    const failedCleanup = cleanupResults.filter(r => r.status === 'rejected').length;
    
    logger.info("Final cleanup completed", {
      uploadId,
      total: files.length,
      cleaned: cleanedCount,
      failed: failedCleanup
    });
  }

  // Salva stato finale
  await saveUploadStatus(uploadId, uploadStatus);
}

// Funzione per processare un singolo file con timeout intelligente
async function processIndividualFile(
  file: Express.Multer.File,
  clientId: number,
  userId: number,
  uploadId: string
): Promise<{ success: boolean; document?: any; error?: string }> {
  // Timeout dinamico basato sulla dimensione del file
  const fileSizeKB = file.size / 1024;
  let timeoutMs = 15001; // Ridotto da 30 secondi a 15 secondi base
  
  // Aumenta timeout per file grandi ma con limiti più conservativi
  if (fileSizeKB > 10 * 1024) { // >10MB
    timeoutMs = 60000; // Ridotto da 2 minuti a 1 minuto
  } else if (fileSizeKB > 5 * 1024) { // >5MB
    timeoutMs = 30000; // Ridotto da 1 minuto a 30 secondi
  }
  
  logger.debug("File processing timeout calculated", {
    fileName: file.originalname,
    fileSizeKB: Math.round(fileSizeKB),
    timeoutMs,
    uploadId
  });
  
  const timeoutPromise = new Promise<{ success: boolean; error: string }>((_, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`Timeout (${timeoutMs/1000}s) processing file: ${file.originalname}`));
    }, timeoutMs);
    
    // Cleanup timer reference to prevent memory leaks
    timer.unref?.();
  });
  
  try {
    const result = await Promise.race([
      processFileWithTimeout(file, clientId, userId),
      timeoutPromise
    ]);

    return result;
  } catch (error) {
    logger.error("File processing failed with error", {
      fileName: file.originalname,
      error: error instanceof Error ? error.message : String(error),
      uploadId,
      fileSizeKB: Math.round(fileSizeKB)
    });

    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

async function processFileWithTimeout(
  file: Express.Multer.File,
  clientId: number,
  userId: number
): Promise<{ success: boolean; document?: any; error?: string }> {
  const startTime = Date.now();
  let retryCount = 0;
  const maxRetries = 2;

  // Usare sempre il buffer in memoria (memoryStorage)
  const fileBuffer = file.buffer;
  if (!fileBuffer) {
    throw new Error(`Buffer del file non disponibile, verifica multer.memoryStorage() per ${file.originalname}`);
  }
  
  const attemptProcess = async (): Promise<{ success: boolean; document?: any; error?: string }> => {
    try {
      logger.debug("Processing file attempt", {
        fileName: file.originalname,
        fileSize: file.size,
        userId,
        clientId,
        attempt: retryCount + 1,
        maxRetries: maxRetries + 1
      });

      // Gestione gerarchia cartelle per file locali
      let filePath = file.originalname;
      
      // Se il file ha un webkitRelativePath (cartella selezionata), lo usiamo per mantenere la gerarchia
      if ((file as any).webkitRelativePath) {
        filePath = (file as any).webkitRelativePath;
        logger.debug("Using webkitRelativePath for hierarchy", {
          originalName: file.originalname,
          webkitRelativePath: (file as any).webkitRelativePath,
          userId,
          clientId,
        });
      }

      // Usa la logica già esistente per processare i file (estrai metadati, scadenze, revisioni)
      const docData = await processDocumentFile(
        filePath, // Usa il path completo per mantenere la gerarchia
        "",
        fileBuffer
      );

      if (!docData) {
        throw new Error(`Impossibile processare i metadati del file: ${file.originalname}`);
      }

      // Associa client e owner
      docData.clientId = clientId;
      docData.ownerId = userId;
      // Per file locali, googleFileId è null e usiamo il path per riferimento fisico
      docData.googleFileId = null;
      // Nessun path su disco: usa null per encryptedCachePath
      docData.encryptedCachePath = null;

      logger.debug("Document data processed", {
        fileName: file.originalname,
        title: docData.title,
        path: docData.path,
        revision: docData.revision,
        fileType: docData.fileType,
        userId,
        clientId,
      });

      // Verifica duplicati con retry in caso di errore DB
      let existing;
      let dbRetries = 0;
      const maxDbRetries = 3;
      
      while (dbRetries < maxDbRetries) {
        try {
          existing = await mongoStorage.getDocumentByPathAndTitleAndRevision(
            docData.path,
            docData.title,
            docData.revision,
            clientId
          );
          break; // Success, exit retry loop
        } catch (dbError) {
          dbRetries++;
          if (dbRetries >= maxDbRetries) {
            throw new Error(`Database error after ${maxDbRetries} retries: ${dbError instanceof Error ? dbError.message : String(dbError)}`);
          }
          
          logger.warn("Database operation retry", {
            fileName: file.originalname,
            dbRetries,
            maxDbRetries,
            error: dbError instanceof Error ? dbError.message : String(dbError)
          });
          
          // Exponential backoff
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, dbRetries) * 100));
        }
      }

      let savedDoc: any;
      if (existing) {
        // Verifica se il file è stato modificato calcolando l'hash
        const newFileHash = await calculateFileHash(fileBuffer);
        const hasFileChanged = !existing.fileHash || existing.fileHash !== newFileHash;
        
        if (hasFileChanged) {
          logger.info("File content changed, updating existing document", {
            documentId: existing.legacyId,
            fileName: file.originalname,
            oldHash: existing.fileHash ? existing.fileHash.substring(0, 8) + "..." : "null",
            newHash: newFileHash.substring(0, 8) + "...",
            path: docData.path,
            title: docData.title,
            revision: docData.revision,
            userId,
            clientId,
          });
          
          // Aggiorna il documento esistente con i nuovi dati
          const updateData: Partial<InsertDocument> = {
            alertStatus: docData.alertStatus,
            expiryDate: docData.expiryDate,
            fileHash: newFileHash,
          };
          
          // Retry document update with exponential backoff
          dbRetries = 0;
          while (dbRetries < maxDbRetries) {
            try {
              savedDoc = await mongoStorage.updateDocument(existing.legacyId, updateData);
              if (!savedDoc) {
                throw new Error("Document update returned null");
              }
              logger.info("Successfully updated existing document", {
                documentId: existing.legacyId,
                fileName: file.originalname,
                attempt: dbRetries + 1
              });
              break; // Success, exit retry loop
            } catch (dbError) {
              dbRetries++;
              if (dbRetries >= maxDbRetries) {
                throw new Error(`Document update failed after ${maxDbRetries} retries: ${dbError instanceof Error ? dbError.message : String(dbError)}`);
              }
              
              logger.warn("Document update retry", {
                documentId: existing.legacyId,
                fileName: file.originalname,
                dbRetries,
                maxDbRetries,
                error: dbError instanceof Error ? dbError.message : String(dbError)
              });
              
              // Exponential backoff
              await new Promise(resolve => setTimeout(resolve, Math.pow(2, dbRetries) * 100));
            }
          }
        } else {
          logger.info("File content unchanged, skipping document", {
            documentId: existing.legacyId,
            fileName: file.originalname,
            fileHash: existing.fileHash ? existing.fileHash.substring(0, 8) + "..." : "null",
            path: docData.path,
            title: docData.title,
            revision: docData.revision,
            userId,
            clientId,
          });
          savedDoc = existing;
        }
      } else {
        // Calcola hash per nuovo documento
        const newFileHash = await calculateFileHash(fileBuffer);
        docData.fileHash = newFileHash;
        
        // Retry document creation with exponential backoff
        dbRetries = 0;
        while (dbRetries < maxDbRetries) {
          try {
            logger.info("Creating new document", {
              fileName: file.originalname,
              fileHash: newFileHash.substring(0, 8) + "...",
              userId,
              clientId,
              attempt: dbRetries + 1
            });
            savedDoc = await mongoStorage.createDocument(docData);
            break; // Success, exit retry loop
          } catch (dbError) {
            dbRetries++;
            if (dbRetries >= maxDbRetries) {
              throw new Error(`Document creation failed after ${maxDbRetries} retries: ${dbError instanceof Error ? dbError.message : String(dbError)}`);
            }
            
            logger.warn("Document creation retry", {
              fileName: file.originalname,
              dbRetries,
              maxDbRetries,
              error: dbError instanceof Error ? dbError.message : String(dbError)
            });
            
            // Exponential backoff
            await new Promise(resolve => setTimeout(resolve, Math.pow(2, dbRetries) * 200));
          }
        }
      }

      if (!savedDoc) {
        throw new Error(`Failed to create or retrieve document for file: ${file.originalname}`);
      }

      const processingTime = Date.now() - startTime;
      logger.info("File processed successfully", {
        fileName: file.originalname,
        documentId: savedDoc.legacyId,
        userId,
        clientId,
        processingTimeMs: processingTime,
        attempts: retryCount + 1
      });

      return { success: true, document: savedDoc };

    } catch (error) {
      const processingTime = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      // Determina se l'errore è recuperabile
      const isRetryableError = (
        errorMessage.includes('ENOENT') ||
        errorMessage.includes('EACCES') ||
        errorMessage.includes('EMFILE') ||
        errorMessage.includes('timeout') ||
        errorMessage.includes('connection') ||
        errorMessage.includes('network') ||
        errorMessage.includes('Database error')
      );
      
      if (isRetryableError && retryCount < maxRetries) {
        retryCount++;
        const delayMs = Math.pow(2, retryCount) * 1000; // Exponential backoff: 2s, 4s, 8s
        
        logger.warn("Retryable error encountered, will retry", {
          fileName: file.originalname,
          error: errorMessage,
          retryCount,
          maxRetries,
          delayMs,
          processingTimeMs: processingTime
        });
        
        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, delayMs));
        return attemptProcess(); // Recursive retry
      }
      
      logger.error("Error processing file (no more retries)", {
        fileName: file.originalname,
        error: errorMessage,
        userId,
        clientId,
        processingTimeMs: processingTime,
        totalAttempts: retryCount + 1
      });
      
      return {
        success: false,
        error: `Errore nel processare ${file.originalname}: ${errorMessage}`
      };
    }
  };
  
  return attemptProcess();
}

// Sistema di gestione stato upload in memoria (in produzione si potrebbe usare Redis)


  app.get("/api/documents/:id/preview", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      const document = await mongoStorage.getDocument(id);
      if (!document) {
        return res.status(404).json({ message: "Documento non trovato" });
      }

      // Solo file caricati localmente (driveUrl vuoto)
      if (document.driveUrl) {
        return res
          .status(400)
          .json({ message: "Anteprima non disponibile per file Google Drive" });
      }

      // Path file originale (robusto: path o encryptedCachePath per file locali)
      let originalPath = path.join(uploadsDir, document.path);
      if (!fs.existsSync(originalPath) && document.encryptedCachePath) {
        const altPath = path.join(uploadsDir, document.encryptedCachePath);
        if (fs.existsSync(altPath)) {
          originalPath = altPath;
        } else {
          return res.status(404).json({ message: "File non trovato" });
        }
      } else if (!fs.existsSync(originalPath)) {
        return res.status(404).json({ message: "File non trovato" });
      }

      // Determina il content-type corretto
      const mimeTypes: Record<string, string> = {
        pdf: 'application/pdf',
        doc: 'application/msword',
        docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        xls: 'application/vnd.ms-excel',
        xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      };
      const ext = document.fileType.toLowerCase();
      const contentType = mimeTypes[ext] || 'application/octet-stream';

      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Disposition', `inline; filename="${document.title}.${document.fileType}"`);
      res.sendFile(originalPath);
    } catch (error) {
      console.error("Errore download documento:", error);
      res.status(500).json({
        message: "Errore download documento",
        error: error instanceof Error ? error.message : "Errore sconosciuto"
      });
    }
  });

  app.get("/api/documents/:id/download", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      const document = await mongoStorage.getDocument(id);
      if (!document) {
        return res.status(404).json({ message: "Documento non trovato" });
      }

      // Se è un file Google Drive, reindirizza
      if (document.driveUrl) {
        return res.redirect(document.driveUrl);
      }

      // Path file originale
      const originalPath = path.join(uploadsDir, document.path);
      if (!fs.existsSync(originalPath)) {
        return res.status(404).json({ message: "File non trovato" });
      }

      // Imposta headers per il download
      const fileName = `${document.title}.${document.fileType}`;
      res.setHeader("Content-Type", "application/octet-stream");
      res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
      
      // Stream del file
      return fs.createReadStream(originalPath).pipe(res);
    } catch (error) {
      console.error("Errore download documento:", error);
      res.status(500).json({ 
        message: "Errore download documento",
        error: error instanceof Error ? error.message : "Errore sconosciuto"
      });
    }
  });

  // Health check endpoint per Render
  app.get("/api/health", (req, res) => {
    const used = process.memoryUsage();
    const memoryMB = Math.round(used.heapUsed / 1024 / 1024);
    const totalMB = Math.round(used.heapTotal / 1024 / 1024);
    
    res.json({
      status: "healthy",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: {
        heapUsed: `${memoryMB} MB`,
        heapTotal: `${totalMB} MB`,
        external: `${Math.round(used.external / 1024 / 1024)} MB`,
        rss: `${Math.round(used.rss / 1024 / 1024)} MB`
      },
      environment: process.env.NODE_ENV,
      version: process.version
    });
  });

  // === AUTO-SYNC ENDPOINTS ===
  
  // Avvia auto-sync per documenti locali
  app.post("/api/auto-sync/start", isAdmin, async (req, res) => {
    try {
      const clientId = req.user?.clientId;
      const userId = req.user?.legacyId;
      
      if (!clientId || !userId) {
        return res.status(403).json({
          message: "Accesso negato: utente non associato a nessun client"
        });
      }

      const { watchFolder, intervalMinutes = 5 } = req.body;
      
      if (!watchFolder || typeof watchFolder !== 'string') {
        return res.status(400).json({
          message: "Percorso cartella da monitorare è obbligatorio"
        });
      }

      const success = startAutoSync(clientId, userId, watchFolder, intervalMinutes);
      
      if (success) {
        res.json({
          success: true,
          message: "Auto-sync avviata con successo",
          config: {
            watchFolder,
            intervalMinutes,
            enabled: true
          }
        });
      } else {
        res.status(400).json({
          message: "Impossibile avviare auto-sync. Verifica che la cartella esista."
        });
      }
    } catch (error) {
      logger.error("Error starting auto-sync", {
        error: error instanceof Error ? error.message : String(error),
        clientId: req.user?.clientId,
        userId: req.user?.legacyId,
      });
      
      res.status(500).json({
        message: "Errore nell'avvio dell'auto-sync"
      });
    }
  });

  // Ferma auto-sync
  app.post("/api/auto-sync/stop", isAdmin, async (req, res) => {
    try {
      const clientId = req.user?.clientId;
      
      if (!clientId) {
        return res.status(403).json({
          message: "Accesso negato: utente non associato a nessun client"
        });
      }

      const success = stopAutoSync(clientId);
      
      res.json({
        success,
        message: success ? "Auto-sync fermata con successo" : "Nessuna auto-sync attiva da fermare"
      });
    } catch (error) {
      logger.error("Error stopping auto-sync", {
        error: error instanceof Error ? error.message : String(error),
        clientId: req.user?.clientId,
      });
      
      res.status(500).json({
        message: "Errore nel fermare l'auto-sync"
      });
    }
  });

  // Ottieni stato auto-sync
  app.get("/api/auto-sync/status", isAdmin, async (req, res) => {
    try {
      const clientId = req.user?.clientId;
      
      if (!clientId) {
        return res.status(403).json({
          message: "Accesso negato: utente non associato a nessun client"
        });
      }

      const status = getAutoSyncStatus(clientId);
      
      res.json({
        enabled: !!status,
        config: status ? {
          watchFolder: status.watchFolder,
          intervalMinutes: status.intervalMinutes,
          lastSyncTime: status.lastSyncTime,
          enabled: status.enabled
        } : null
      });
    } catch (error) {
      logger.error("Error getting auto-sync status", {
        error: error instanceof Error ? error.message : String(error),
        clientId: req.user?.clientId,
      });
      
      res.status(500).json({
        message: "Errore nel recupero dello stato auto-sync"
      });
    }
  });

  // Aggiorna configurazione auto-sync
  app.put("/api/auto-sync/config", isAdmin, async (req, res) => {
    try {
      const clientId = req.user?.clientId;
      
      if (!clientId) {
        return res.status(403).json({
          message: "Accesso negato: utente non associato a nessun client"
        });
      }

      const { watchFolder, intervalMinutes, enabled } = req.body;
      const updates: any = {};
      
      if (watchFolder !== undefined) updates.watchFolder = watchFolder;
      if (intervalMinutes !== undefined) updates.intervalMinutes = intervalMinutes;
      if (enabled !== undefined) updates.enabled = enabled;
      
      if (Object.keys(updates).length === 0) {
        return res.status(400).json({
          message: "Nessun aggiornamento specificato"
        });
      }

      const success = updateAutoSync(clientId, updates);
      
      if (success) {
        const currentStatus = getAutoSyncStatus(clientId);
        res.json({
          success: true,
          message: "Configurazione auto-sync aggiornata",
          config: currentStatus
        });
      } else {
        res.status(400).json({
          message: "Impossibile aggiornare configurazione auto-sync"
        });
      }
    } catch (error) {
      logger.error("Error updating auto-sync config", {
        error: error instanceof Error ? error.message : String(error),
        clientId: req.user?.clientId,
      });
      
      res.status(500).json({
        message: "Errore nell'aggiornamento della configurazione auto-sync"
      });
    }
  });

  return app;
}

// ===== GESTIONE STATO UPLOAD =====
// Cache in memoria per stato upload (con TTL per pulizia automatica)
interface UploadStatus {
  uploadId: string;
  totalFiles: number;
  processedFiles: number;
  failedFiles: number;
  errors: string[];
  processedDocs: any[];
  status: 'processing' | 'completed' | 'failed';
  startTime: Date;
  endTime: Date | null;
  ttl: number; // timestamp per cleanup automatico
}

const uploadStatusCache = new Map<string, UploadStatus>();

// Cleanup automatico più aggressivo ogni 2 minuti
setInterval(() => {
  const now = Date.now();
  let cleaned = 0;
  
  for (const [uploadId, status] of uploadStatusCache.entries()) {
    if (now > status.ttl) {
      uploadStatusCache.delete(uploadId);
      cleaned++;
    }
  }
  
  // Log della pulizia per monitoring
  if (cleaned > 0) {
    logger.info("Upload status cache cleanup", { 
      cleaned, 
      remaining: uploadStatusCache.size,
      memoryUsage: process.memoryUsage()
    });
  }
  
  // Forza garbage collection se la cache è troppo grande
  if (uploadStatusCache.size > 100) {
    logger.warn("Upload status cache is large", { 
      size: uploadStatusCache.size,
      memoryUsage: process.memoryUsage()
    });
    
    // Rimuovi i più vecchi se superiamo i 100 elementi
    const entries = Array.from(uploadStatusCache.entries());
    entries.sort((a, b) => a[1].ttl - b[1].ttl);
    
    // Mantieni solo i 50 più recenti
    if (entries.length > 50) {
      for (let i = 0; i < entries.length - 50; i++) {
        uploadStatusCache.delete(entries[i][0]);
      }
      logger.info("Forced cleanup of old upload statuses", { 
        removed: entries.length - 50,
        remaining: uploadStatusCache.size
      });
    }
  }
}, 2 * 60 * 1000); // 2 minuti invece di 5

// Salva stato upload con ottimizzazione memoria
async function saveUploadStatus(uploadId: string, status: Omit<UploadStatus, 'ttl'>): Promise<void> {
  try {
    // TTL ridotto a 30 minuti invece di 1 ora per ridurre uso memoria
    const statusWithTTL: UploadStatus = {
      ...status,
      ttl: Date.now() + (30 * 60 * 1000) // TTL 30 minuti
    };
    
    // Limita la dimensione degli array di errori per evitare memory leak
    if (statusWithTTL.errors && statusWithTTL.errors.length > 100) {
      statusWithTTL.errors = statusWithTTL.errors.slice(0, 100);
      logger.warn("Truncated errors array to prevent memory issues", { 
        uploadId, 
        originalLength: status.errors?.length 
      });
    }
    
    uploadStatusCache.set(uploadId, statusWithTTL);
    
    logger.debug("Upload status saved", {
      uploadId,
      status: status.status,
      processed: status.processedFiles,
      total: status.totalFiles,
      cacheSize: uploadStatusCache.size
    });
  } catch (error) {
    logger.error("Failed to save upload status", {
      uploadId,
      error: error instanceof Error ? error.message : String(error)
    });
  }
}

// Recupera stato upload
async function getUploadStatus(uploadId: string): Promise<UploadStatus | null> {
  try {
    const status = uploadStatusCache.get(uploadId);
    
    if (!status) {
      logger.warn("Upload status not found", { uploadId });
      return null;
    }
    
    // Controlla se è scaduto
    if (Date.now() > status.ttl) {
      uploadStatusCache.delete(uploadId);
      logger.warn("Upload status expired", { uploadId });
      return null;
    }
    
    logger.debug("Upload status retrieved", {
      uploadId,
      status: status.status,
      processed: status.processedFiles,
      total: status.totalFiles
    });
    
    return status;
  } catch (error) {
    logger.error("Failed to get upload status", {
      uploadId,
      error: error instanceof Error ? error.message : String(error)
    });
    return null;
  }
}

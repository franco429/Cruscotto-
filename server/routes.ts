import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import * as os from "os"; // Aggiunto import mancante
import * as fs from "fs"; // Aggiunto import mancante
import * as path from "path"; // Aggiunto import mancante
import { v4 as uuidv4 } from "uuid"; // Aggiunto import mancante

import { mongoStorage as storage } from "./mongo-storage";
import {
  hashPassword,
  comparePasswords,
} from "./auth";
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
import {
  startExpirationChecks,
} from "./notification-service";
import {
  handleContactRequest,
  handlePasswordReset,
  transporter,
} from "./mailer";
import { generateSecureLink, verifySecureLink } from "./secure-links";
import {
  googleDriveDownloadFile,
  googleDriveListFiles,
} from "./google-drive-api";
import {
  getDriveClientForClient,
  getGoogleAuthUrl,
  googleAuthCallback,
} from "./google-oauth";
import { InsertCompanyCode } from "./shared-types/companycode";
import type { CompanyCodeDocument } from "./shared-types/companycode";
// ✅ MODIFICA: Importa i nuovi validatori Zod
import { 
  insertClientSchema, 
  registerAdminSchema,
  strongPasswordSchema,
  documentSchema,
  documentUpdateSchema,
  changePasswordSchema
} from "./shared-types/validators";
import { InsertUser } from "./shared-types/schema";
import { z } from "zod";
import { logError } from "./logger";
import { validateContactRequest } from "./security";
import logger from "./logger";

// Helper function per gestire il timeout della sessione
const handleSessionTimeout = (req: Request, res: Response, next: NextFunction): boolean => {
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
    return; // Interrompe l'esecuzione
  }
  
  // Se la sessione è valida, controlla l'autenticazione
  if (!req.isAuthenticated()) {
    logger.warn('Authentication failed - user not authenticated', {
      url: req.url,
      method: req.method,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });
    return res.status(401).json({ 
      message: "Non autenticato",
      code: "NOT_AUTHENTICATED"
    });
  }
  
  next();
};

// Middleware to check if user is an admin with improved session timeout check
const isAdmin = (req: Request, res: Response, next: NextFunction) => {
  // Controlla prima se la sessione è scaduta
  if (handleSessionTimeout(req, res, next)) {
    return; // Interrompe l'esecuzione
  }
  
  // Se la sessione è valida, controlla l'autenticazione
  if (!req.isAuthenticated()) {
    logger.warn('Admin access denied - user not authenticated', {
      url: req.url,
      method: req.method,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });
    return res.status(401).json({ 
      message: "Non autenticato",
      code: "NOT_AUTHENTICATED"
    });
  }
  
  // Controlla i permessi di admin
  if (!req.user || (req.user.role !== "admin" && req.user.role !== "superadmin")) {
    logger.warn('Admin access denied - insufficient permissions', {
      url: req.url,
      method: req.method,
      ip: req.ip,
      userId: req.user?.legacyId,
      userRole: req.user?.role,
      userEmail: req.user?.email
    });
    return res.status(403).json({ 
      message: "Accesso negato - richiesti permessi di amministratore",
      code: "INSUFFICIENT_PERMISSIONS",
      userRole: req.user?.role
    });
  }
  
  next();
};

// Middleware per controllare se l'utente è superadmin
const isSuperAdmin = (req: Request, res: Response, next: NextFunction) => {
  // Controlla prima se la sessione è scaduta
  if (handleSessionTimeout(req, res, next)) {
    return; // Interrompe l'esecuzione
  }
  
  // Se la sessione è valida, controlla l'autenticazione e i permessi
  if (!req.isAuthenticated() || req.user.role !== "superadmin") {
    return res.status(403).json({ message: "Accesso riservato al super-admin" });
  }
  
  next();
};

// ✅ MODIFICA: Usa il nuovo schema di validazione
const adminRegistrationSchema = z.object({
  email: z.string().email("Inserisci un indirizzo email valido"),
  password: z
    .string()
    .min(8, "La password deve contenere almeno 8 caratteri")
    .regex(/[A-Z]/, "La password deve contenere almeno una lettera maiuscola")
    .regex(/[a-z]/, "La password deve contenere almeno una lettera minuscola")
    .regex(/\d/, "La password deve contenere almeno un numero")
    .regex(/[@$!%*?&]/, "La password deve contenere almeno un carattere speciale (@$!%*?&)"),
  clientName: z.string().min(2, "Il nome dell'azienda è obbligatorio"),
  driveFolderUrl: z.string().url("Inserisci un URL valido per la cartella Google Drive"),
  companyCode: z.string().min(1, "Il codice aziendale è obbligatorio"),
});

export async function registerRoutes(app: Express): Promise<Express> {
  // ✅ RIMOSSO: setupAuth(app) - viene già chiamato in index.ts

  app.post("/api/register/admin", async (req, res) => {
    try {
      const validation = adminRegistrationSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({
          message: "Dati di registrazione non validi.",
          errors: validation.error.format(),
        });
      }
      const { email, password, companyCode, clientName, driveFolderUrl } =
        validation.data;

      const driveFolderId = extractFolderIdFromUrl(driveFolderUrl);
      if (!driveFolderId) {
        return res
          .status(400)
          .json({ message: "URL della cartella Google Drive non valido." });
      }

      const passwordHash = await hashPassword(password);

      const { user, client } = await storage.registerNewAdminAndClient({
        email,
        passwordHash,
        companyCode,
        clientName,
        driveFolderId,
      });

      await storage.createLog({
        userId: user.legacyId,
        action: "admin-registration",
        details: {
          message: `Nuova azienda '${client.name}' e admin '${user.email}' registrati.`,
          clientId: client.legacyId,
        },
      });

      req.login(user, (err) => {
        if (err) {
          // Errore da loggare centralmente.
          return res.status(500).json({ message: "Errore durante la login automatica" });
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
      res.status(400).json({ message: errorMessage });
    }
  });

  app.get("/api/documents", isAuthenticated, async (req, res) => {
    const clientId = req.user?.clientId;
    if (!clientId) return res.json([]);
    const documents = await storage.getDocumentsByClientId(clientId);
    res.json(documents);
  });

  app.get("/api/documents/obsolete", isAdmin, async (req, res) => {
    const clientId = req.user?.clientId;
    if (!clientId) return res.json([]);
    const documents = await storage.getObsoleteDocumentsByClientId(clientId);
    res.json(documents);
  });

  app.get("/api/documents/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      const document = await storage.getDocument(id);

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
      const document = await storage.createDocument(validatedData);
      if (req.user) {
        await storage.createLog({
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

      const existingDoc = await storage.getDocument(id);
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

      const document = await storage.updateDocument(id, validatedData);

      if (req.user && document) {
        await storage.createLog({
          userId: req.user.legacyId,
          action: "update",
          documentId: document.legacyId,
          details: { message: `Document updated: ${document.title}` },
        });
      }

      res.json(document);
    } catch (error) {
      res.status(500).json({ message: "Error updating document" });
    }
  });

  app.delete("/api/documents/:legacyId", isAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.legacyId, 10);

      const existingDoc = await storage.getDocument(id);
      if (!existingDoc) {
        return res.status(404).json({ message: "Document not found" });
      }

      if (existingDoc.clientId !== req.user?.clientId) {
        return res.status(403).json({
          message:
            "Accesso negato: non puoi eliminare documenti di altri client",
        });
      }

      await storage.markDocumentObsolete(id);

      if (req.user) {
        await storage.createLog({
          userId: req.user.legacyId,
          action: "delete",
          documentId: id,
          details: {
            message: `Document marked as obsolete: ${existingDoc.title}`,
          },
        });
      }

      res.json({ message: "Document marked as obsolete" });
    } catch (error) {
      res.status(500).json({ message: "Error marking document as obsolete" });
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

      const { users, total } = await storage.getUsersByClientIdWithPagination(
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

      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res
          .status(400)
          .json({ message: "Utente con questa email già registrato" });
      }

      const hashedPassword = await hashPassword(password);
      const newUser = await storage.createUser({
        email,
        password: hashedPassword,
        role: "viewer",
        clientId: adminClientId,
        lastLogin: null,
        sessionExpiry: null,
        failedLoginAttempts: 0,
        lockoutUntil: null,
      });

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
    if (!req.user?.legacyId)
      return res.status(401).json({ message: "Utente non autenticato" });
    const clients = await storage.getClientsByAdminId(req.user.legacyId);
    res.json(clients);
  });

  // POST - Crea un nuovo client (solo superadmin)
  app.post("/api/clients", isSuperAdmin, async (req, res) => {
    try {
      if (!req.user?.legacyId) {
        return res.status(401).json({ message: "Utente non autenticato" });
      }

      const validatedData = insertClientSchema.parse(req.body);
      
      // Crea il nuovo client
      const client = await storage.createClient(validatedData);

      if (!client) {
        return res.status(500).json({ message: "Impossibile creare il client" });
      }

      // Log dell'azione
      await storage.createLog({
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
        error: errorMessage 
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
      const existingClient = await storage.getClient(id);
      if (!existingClient) {
        return res.status(404).json({ message: "Cliente non trovato" });
      }

      // Verifica che l'admin possa modificare questo client
      const adminClients = await storage.getClientsByAdminId(req.user.legacyId);
      const canEdit = adminClients.some(client => client.legacyId === id);
      
      if (!canEdit && req.user.role !== "superadmin") {
        return res.status(403).json({ 
          message: "Non hai i permessi per modificare questo cliente" 
        });
      }

      const validatedData = insertClientSchema.partial().parse(req.body);

      const client = await storage.updateClient(id, validatedData);
      if (!client) {
        return res.status(404).json({ message: "Cliente non trovato" });
      }

      // Sincronizza subito dopo l'aggiornamento
      if (req.user) {
        syncWithGoogleDrive(client.driveFolderId, req.user.legacyId).catch((err) => {
          logError(err, {
            context: "manual-sync",
            clientId: client.legacyId,
            userId: req.user?.legacyId,
            driveFolderId: client.driveFolderId,
          });
        });
      }

      // Log dell'azione
      await storage.createLog({
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
        error: errorMessage 
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

      const updatedUser = await storage.updateUserRole(userId, role);
      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }

      if (req.user) {
        await storage.createLog({
          userId: req.user.legacyId,
          action: "user-role-change",
          details: {
            message: `Ruolo utente ${userId} cambiato in ${role}`,
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
          message: "Non puoi eliminare il tuo stesso account" 
        });
      }

      // Check if user exists and belongs to the same client
      const userToDelete = await storage.getUser(userId);
      if (!userToDelete) {
        return res.status(404).json({ message: "Utente non trovato" });
      }

      // Ensure admin can only delete users from their own client
      if (userToDelete.clientId !== req.user?.clientId) {
        return res.status(403).json({ 
          message: "Non hai i permessi per eliminare questo utente" 
        });
      }

      const deleted = await storage.deleteUser(userId);
      if (!deleted) {
        return res.status(500).json({ message: "Impossibile eliminare l'utente" });
      }

      // Log the deletion
      if (req.user) {
        await storage.createLog({
          userId: req.user.legacyId,
          action: "user-deleted",
          details: {
            message: `Utente ${userId} (${userToDelete.email}) eliminato`,
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

  // Endpoint per cambiare la password dell'utente corrente
  app.post("/api/change-password", isAuthenticated, async (req, res) => {
    try {
      // ✅ AGGIUNTA: Validazione della nuova password con Zod
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

      const user = await storage.getUser(req.user.legacyId);
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

      // ✅ AGGIUNTA: Controllo che la nuova password sia diversa da quella attuale
      const isNewPasswordSame = await comparePasswords(newPassword, user.password);
      if (isNewPasswordSame) {
        return res
          .status(400)
          .json({ message: "La nuova password deve essere diversa da quella attuale" });
      }

      const hashedPassword = await hashPassword(newPassword);
      
      const updatedUser = await storage.updateUserPassword(
        user.legacyId,
        hashedPassword
      );

      if (!updatedUser) {
        return res
          .status(500)
          .json({ message: "Impossibile aggiornare la password" });
      }

      await storage.createLog({
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

      const logs = await storage.getLogsByClientId(clientId);
      res.json(logs);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch audit logs" });
    }
  });

  // Google Drive sync API (admin only)
  app.post("/api/sync", isAdmin, async (req, res) => {
    try {
      const clientId = req.user?.clientId;
      const userId = req.user?.legacyId;

      logger.info('Manual sync requested', { clientId, userId });

      if (!clientId || !userId) {
        logger.error('Sync failed: missing clientId or userId', { clientId, userId });
        return res
          .status(400)
          .json({ message: "Nessun cliente associato a questo utente." });
      }

      const client = await storage.getClient(clientId);
      logger.info('Client retrieved for sync', { 
        clientId, 
        hasClient: !!client, 
        hasDriveFolderId: !!client?.driveFolderId,
        driveFolderId: client?.driveFolderId 
      });

      if (!client || !client.driveFolderId) {
        logger.error('Sync failed: no client or drive folder configured', { 
          clientId, 
          hasClient: !!client, 
          hasDriveFolderId: !!client?.driveFolderId 
        });
        return res
          .status(400)
          .json({ message: "Cartella di sincronizzazione non configurata." });
      }

      // Verifica se il client ha i token Google configurati
      if (!client.google?.refreshToken) {
        logger.error('Sync failed: no Google refresh token', { clientId });
        return res
          .status(400)
          .json({ message: "Google Drive non connesso. Connetti prima Google Drive." });
      }

      logger.info('Starting manual sync', { 
        clientId, 
        userId, 
        driveFolderId: client.driveFolderId 
      });

      // Avvia la sincronizzazione ottimizzata
      const syncPromise = syncWithGoogleDrive(client.driveFolderId, userId);
      
      // Rispondi immediatamente che la sync è iniziata
      res.json({ 
        message: "Processo di sincronizzazione avviato",
        syncId: Date.now().toString() // ID univoco per tracciare la sync
      });

      // Esegui la sync in background
      syncPromise
        .then(result => {
          logger.info('Manual sync completed', {
            userId,
            clientId,
            success: result.success,
            processed: result.processed,
            failed: result.failed,
            duration: result.duration,
            errorCount: result.errors.length
          });
        })
        .catch(error => {
          logger.error('Manual sync failed', {
            userId,
            clientId,
            error: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined
          });
          
          logError(error, {
            context: "manual-sync",
            clientId: client.legacyId,
            userId,
            driveFolderId: client.driveFolderId,
          });
        });

    } catch (error) {
      logger.error('Sync endpoint error', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        clientId: req.user?.clientId,
        userId: req.user?.legacyId
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
      const documents = await storage.getDocumentsByClientId(clientId);
      const documentCount = documents.length;

      // Verifica se ci sono documenti recenti (ultimi 10 minuti)
      const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
      const recentDocuments = documents.filter(doc => 
        doc.createdAt && new Date(doc.createdAt) > tenMinutesAgo
      );

      res.json({
        status: documentCount > 0 ? "synced" : "pending",
        documentCount,
        recentDocumentCount: recentDocuments.length,
        lastSync: documentCount > 0 ? new Date().toISOString() : null,
        hasDocuments: documentCount > 0
      });
    } catch (error) {
      res.status(500).json({ message: "Errore nel recuperare lo stato della sincronizzazione" });
    }
  });

  app.patch("/api/users/:id/client", isAdmin, async (req, res) => {
    try {
      const userId = parseInt(req.params.legacyId, 10);
      const { clientId } = req.body;

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "Utente non trovato" });
      }

      if (clientId !== null) {
        const client = await storage.getClient(clientId);
        if (!client) {
          return res.status(404).json({ message: "Client non trovato" });
        }
      }

      const updatedUser = await storage.updateUserClient(userId, clientId);

      const { password, ...userWithoutPassword } = updatedUser!;

      if (req.user) {
        await storage.createLog({
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

  // ✅ AGGIORNATO: Endpoint di contatto con protezione anti-spam
  app.post("/api/contact", validateContactRequest, async (req, res) => {
    try {
      const { name, email, message, to, subject } = req.body;

      // Log della richiesta per sicurezza
      logger.info('Contact form submission', {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        email: email,
        name: name,
        subject: subject || 'Richiesta di assistenza',
        messageLength: message.length,
        timestamp: new Date().toISOString()
      });

      const info = await transporter.sendMail({
        from: `"${name}" <${email}>`,
        to: to || "isodocs178@gmail.com",
        subject: subject || `Richiesta di assistenza da ${name}`,
        text: message,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333;">Nuova richiesta di assistenza</h2>
            <div style="background-color: #f5f5f5; padding: 20px; border-radius: 5px; margin: 20px 0;">
              <p><strong>Da:</strong> ${name}</p>
              <p><strong>Email:</strong> ${email}</p>
              <p><strong>IP:</strong> ${req.ip}</p>
              <p><strong>User-Agent:</strong> ${req.get('User-Agent') || 'N/A'}</p>
              <p><strong>Messaggio:</strong></p>
              <p style="white-space: pre-wrap;">${message}</p>
            </div>
            <hr style="border-top: 1px solid #ddd; margin: 20px 0;">
            <p style="color: #666; font-size: 12px;">
              Questo messaggio è stato inviato dal form di contatto del Sistema di Cruscotto SGI.
              <br>Timestamp: ${new Date().toISOString()}
            </p>
          </div>
        `,
      });

      // Log del successo
      logger.info('Contact email sent successfully', {
        messageId: info.messageId,
        ip: req.ip,
        email: email,
        timestamp: new Date().toISOString()
      });
      
      res.status(200).json({ success: true, messageId: info.messageId });
    } catch (error) {
      // Log dell'errore
      logger.error('Contact email failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        ip: req.ip,
        email: req.body.email,
        timestamp: new Date().toISOString()
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

      const result = await storage.getPaginatedCompanyCodes({ page, limit });

      res.json(result);
    } catch (error) {
      res
        .status(500)
        .json({ message: "Errore durante il recupero dei codici aziendali" });
    }
  });

  // POST - Crea un nuovo codice aziendale (solo admin)
  app.post("/api/company-codes/bulk-generate", isSuperAdmin, async (req, res) => {
    try {
      const startId = await storage.getNextCompanyCodeId();

      const codesToCreate: InsertCompanyCode[] = [];
      const year = new Date().getFullYear();

      for (let i = 0; i < 30; i++) {
        const randomPart = Math.random().toString(36).substring(2, 8).toUpperCase();
        const newCodeString = `BULK-${year}-${randomPart}`;
        
        codesToCreate.push({
          id: Date.now() + i,
          legacyId: Date.now() + i,
          code: newCodeString,
          role: "admin",
          usageLimit: 1,
          expiresAt: null,
          isActive: true,
          createdBy: req.user?.legacyId || 0,
        });
      }

      const newCodes = await storage.createManyCompanyCodes(codesToCreate);

      await storage.createLog({
        userId: req.user?.legacyId || 0,
        action: "company_code_bulk_created",
        details: {
          message: "30 company codes created in bulk",
          count: newCodes.length,
          timestamp: new Date().toISOString(),
        },
      });

      res.status(201).json({ message: `${newCodes.length} codici creati con successo.` });
    } catch (error) {
      res.status(500).json({ message: "Errore durante la generazione dei codici." });
    }
  });

  app.patch("/api/company-codes/:id", isAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);

      if (isNaN(id)) {
        return res.status(400).json({ message: "ID non valido" });
      }

      const { code, role, usageLimit, expiresAt, isActive } = req.body;

      const existingCode = await storage.getCompanyCode(id);
      if (!existingCode) {
        return res.status(404).json({ message: "Codice aziendale non trovato" });
      }

      if (code && code !== existingCode.code) {
        const duplicateCode = await storage.getCompanyCodeByCode(code);
        if (duplicateCode && duplicateCode.id !== id) {
          return res.status(400).json({ message: "Questo codice aziendale esiste già" });
        }
      }

      const updateData: Partial<CompanyCodeDocument> = {};
      if (code !== undefined) updateData.code = code;
      if (role !== undefined) updateData.role = role;
      if (usageLimit !== undefined) updateData.usageLimit = usageLimit;
      if (expiresAt !== undefined) {
        updateData.expiresAt = expiresAt ? new Date(expiresAt) : null;
      }
      if (isActive !== undefined) updateData.isActive = isActive;

      const updatedCode = await storage.updateCompanyCode(id, updateData);

      await storage.createLog({
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
      res.status(500).json({
        message: "Errore durante l'aggiornamento del codice aziendale",
      });
    }
  });

  app.delete("/api/company-codes/:id", isAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);

      if (isNaN(id)) {
        return res.status(400).json({ message: "ID non valido" });
      }

      const existingCode = await storage.getCompanyCode(id);
      if (!existingCode) {
        return res.status(404).json({ message: "Codice aziendale non trovato" });
      }

      const deleted = await storage.deleteCompanyCode(id);

      if (deleted) {
        await storage.createLog({
          userId: req.user?.legacyId || 0,
          action: "company_code_deleted",
          details: {
            message: "Company code deleted",
            codeId: id,
            code: existingCode.code,
            timestamp: new Date().toISOString(),
          },
        });
        res.status(200).json({ message: "Codice aziendale eliminato con successo" });
      } else {
        res.status(404).json({ message: "Codice aziendale non trovato o già eliminato" });
      }
    } catch (error) {
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

      const document = await storage.getDocument(id);
      if (!document) {
        return res.status(404).json({ message: "Documento non trovato" });
      }

      // Validazione: il file deve essere sotto la directory document.path (relativa alla root dei documenti)
      const documentsRoot = path.resolve(process.cwd(), "documents");
      const documentDir = path.resolve(documentsRoot, document.path);
      const requestedFile = path.resolve(filePath);
      if (!requestedFile.startsWith(documentDir + path.sep)) {
        return res.status(400).json({ message: "Accesso al file non consentito: il file deve essere sotto la directory del documento." });
      }
      // Protezione path traversal
      if (path.relative(documentDir, requestedFile).includes("..")) {
        return res.status(400).json({ message: "Path traversal non consentito." });
      }

      const updatedDocument = await storage.hashAndEncryptDocument(
        id,
        requestedFile
      );

      if (req.user && updatedDocument && updatedDocument.encryptedCachePath) {
        await storage.createLog({
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

      const document = await storage.getDocument(id);
      if (!document) {
        return res.status(404).json({ message: "Documento non trovato" });
      }

      if (!document.fileHash || !document.encryptedCachePath) {
        return res.status(400).json({
          message: "Il documento non è stato ancora criptato o non ha un hash",
          status: "not_encrypted",
        });
      }

      const isValid = await storage.verifyDocumentIntegrity(id);

      if (req.user) {
        await storage.createLog({
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

      const document = await storage.getDocument(id);
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

      const document = await storage.getDocument(linkData.documentId);
      if (!document) {
        return res.status(404).json({ message: "Documento non trovato" });
      }

      await storage.createLog({
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
        await storage.createLog({
          userId: 0,
          action: "security-alert",
          details: {
            message: "Tentativo di bypass verifica link reset password - parametri mancanti",
            ipAddress: req.ip || "unknown",
            userAgent: req.get("User-Agent") || "unknown",
            timestamp: new Date().toISOString(),
            endpoint: "/api/verify-reset-link"
          }
        });
        
        return res
          .status(400)
          .json({ success: false, message: "Parametri mancanti" });
      }

      // Validazione rigorosa della firma HMAC
      const linkData = verifySecureLink(data, expires, signature);

      if (!linkData) {
        // Log del tentativo di bypass con firma non valida
        await storage.createLog({
          userId: 0,
          action: "security-alert",
          details: {
            message: "Tentativo di bypass verifica link reset password - firma HMAC non valida",
            ipAddress: req.ip || "unknown",
            userAgent: req.get("User-Agent") || "unknown",
            timestamp: new Date().toISOString(),
            endpoint: "/api/verify-reset-link",
            providedData: data.substring(0, 50) + "...", // Log parziale per sicurezza
            providedExpires: expires,
            providedSignature: signature.substring(0, 20) + "..."
          }
        });
        
        return res
          .status(401)
          .json({ success: false, message: "Link non valido o scaduto" });
      }

      // Verifica aggiuntiva che sia effettivamente un link di reset password
      if (linkData.action !== "reset-password") {
        await storage.createLog({
          userId: 0,
          action: "security-alert",
          details: {
            message: "Tentativo di uso improprio di link sicuro per reset password",
            ipAddress: req.ip || "unknown",
            userAgent: req.get("User-Agent") || "unknown",
            timestamp: new Date().toISOString(),
            endpoint: "/api/verify-reset-link",
            action: linkData.action,
            userId: linkData.userId
          }
        });
        
        return res
          .status(401)
          .json({ success: false, message: "Tipo di link non valido" });
      }

      // Log dell'accesso legittimo
      await storage.createLog({
        userId: linkData.userId,
        action: "reset-link-verified",
        details: {
          message: "Link di reset password verificato con successo",
          ipAddress: req.ip || "unknown",
          userAgent: req.get("User-Agent") || "unknown",
          timestamp: new Date().toISOString()
        }
      });

      res.json({ success: true, message: "Link valido", data: linkData });
    } catch (error) {
      console.error("Errore durante la verifica del link di reset:", error);
      
      // Log dell'errore
      await storage.createLog({
        userId: 0,
        action: "security-error",
        details: {
          message: "Errore durante la verifica del link di reset password",
          ipAddress: req.ip || "unknown",
          userAgent: req.get("User-Agent") || "unknown",
          timestamp: new Date().toISOString(),
          endpoint: "/api/verify-reset-link",
          error: error instanceof Error ? error.message : "Unknown error"
        }
      });
      
      res
        .status(500)
        .json({ success: false, message: "Errore durante la verifica del link" });
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
          await storage.createLog({
            userId: 0,
            action: "security-alert",
            details: {
              message: "Tentativo di bypass reset password - firma HMAC non valida",
              ipAddress: req.ip || "unknown",
              userAgent: req.get("User-Agent") || "unknown",
              timestamp: new Date().toISOString(),
              endpoint: "/api/reset-password",
              providedData: data.substring(0, 50) + "...",
              providedExpires: expires,
              providedSignature: signature.substring(0, 20) + "..."
            }
          });
          
          return res.status(401).json({ 
            success: false, 
            message: "Token non valido o scaduto" 
          });
        }
        
        if (linkData.action !== "reset-password") {
          await storage.createLog({
            userId: 0,
            action: "security-alert",
            details: {
              message: "Tentativo di uso improprio di token per reset password",
              ipAddress: req.ip || "unknown",
              userAgent: req.get("User-Agent") || "unknown",
              timestamp: new Date().toISOString(),
              endpoint: "/api/reset-password",
              action: linkData.action,
              userId: linkData.userId
            }
          });
          
          return res.status(401).json({ 
            success: false, 
            message: "Tipo di token non valido" 
          });
        }
        
        userIdToUpdate = linkData.userId;
      } else {
        // Log del tentativo di bypass
        await storage.createLog({
          userId: 0,
          action: "security-alert",
          details: {
            message: "Tentativo di reset password senza autenticazione",
            ipAddress: req.ip || "unknown",
            userAgent: req.get("User-Agent") || "unknown",
            timestamp: new Date().toISOString(),
            endpoint: "/api/reset-password"
          }
        });
        
        return res.status(400).json({ 
          success: false, 
          message: "Dati incompleti: userId o token richiesti" 
        });
      }

      if (!password) {
        return res.status(400).json({ 
          success: false, 
          message: "Password mancante" 
        });
      }

      // Validazione della password
      if (password.length < 8) {
        return res.status(400).json({ 
          success: false, 
          message: "La password deve essere di almeno 8 caratteri" 
        });
      }

      // Verifica che l'utente esista
      const user = await storage.getUser(userIdToUpdate);
      if (!user) {
        await storage.createLog({
          userId: 0,
          action: "security-alert",
          details: {
            message: "Tentativo di reset password per utente inesistente",
            ipAddress: req.ip || "unknown",
            userAgent: req.get("User-Agent") || "unknown",
            timestamp: new Date().toISOString(),
            endpoint: "/api/reset-password",
            attemptedUserId: userIdToUpdate
          }
        });
        
        return res.status(404).json({ 
          success: false, 
          message: "Utente non trovato" 
        });
      }

      // Hash della nuova password usando scrypt (stesso algoritmo del login)
      const { hashPassword } = await import('./auth');
      const hashedPassword = await hashPassword(password);

      // Aggiorna la password
      const updatedUser = await storage.updateUserPassword(userIdToUpdate, hashedPassword);
      if (!updatedUser) {
        return res.status(500).json({
          success: false,
          message: "Errore nell'aggiornamento della password"
        });
      }

      // Log dell'azione di successo
      await storage.createLog({
        userId: userIdToUpdate,
        action: "password-reset-complete",
        details: {
          message: "Reset password completato con successo",
          timestamp: new Date().toISOString(),
          ipAddress: req.ip || "unknown",
          userAgent: req.get("User-Agent") || "unknown",
          resetMethod: linkData ? "secure-link" : "direct-userId",
          userEmail: user.email
        }
      });

      res.json({ 
        success: true, 
        message: "Password reimpostata con successo" 
      });
    } catch (error) {
      console.error("Errore nel reset della password:", error);
      
      // Log dell'errore
      await storage.createLog({
        userId: 0,
        action: "security-error",
        details: {
          message: "Errore durante il reset della password",
          ipAddress: req.ip || "unknown",
          userAgent: req.get("User-Agent") || "unknown",
          timestamp: new Date().toISOString(),
          endpoint: "/api/reset-password",
          error: error instanceof Error ? error.message : "Unknown error"
        }
      });
      
      res.status(500).json({
        success: false,
        message: "Errore durante il reset della password"
      });
    }
  });

  // Endpoint di test per verificare la configurazione Google Drive
  app.get("/api/sync/test-config", isAdmin, async (req, res) => {
    try {
      const clientId = req.user?.clientId;
      const userId = req.user?.legacyId;

      logger.info('Testing Google Drive configuration', { clientId, userId });

      if (!clientId || !userId) {
        return res.status(400).json({ 
          message: "Nessun cliente associato a questo utente.",
          hasClientId: !!clientId,
          hasUserId: !!userId
        });
      }

      // 1. Verifica utente
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(400).json({ 
          message: "Utente non trovato.",
          userId
        });
      }

      // 2. Verifica client
      const client = await storage.getClient(clientId);
      if (!client) {
        return res.status(400).json({ 
          message: "Client non trovato.",
          clientId
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
        clientName: client.name
      };

      // 4. Test connessione Google Drive (se configurato)
      let driveConnectionTest = null;
      if (client.google?.refreshToken && client.driveFolderId) {
        try {
          logger.info('Testing Google Drive connection', { clientId });
          const drive = await getDriveClientForClient(clientId);
          const isConnected = await validateDriveConnection(drive);
          
          driveConnectionTest = {
            success: isConnected,
            message: isConnected ? "Connessione Google Drive OK" : "Connessione Google Drive fallita"
          };
        } catch (error) {
          driveConnectionTest = {
            success: false,
            message: error instanceof Error ? error.message : "Errore sconosciuto",
            error: error instanceof Error ? error.message : String(error)
          };
        }
      }

      res.json({
        message: "Test configurazione completato",
        configStatus,
        driveConnectionTest,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      logger.error('Test configuration error', {
        error: error instanceof Error ? error.message : String(error),
        clientId: req.user?.clientId,
        userId: req.user?.legacyId
      });
      
      res.status(500).json({ 
        message: "Errore durante il test della configurazione",
        error: error instanceof Error ? error.message : String(error)
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
          user: req.user ? {
            id: req.user.legacyId,
            email: req.user.email,
            role: req.user.role,
            clientId: req.user.clientId,
            sessionExpiry: req.user.sessionExpiry
          } : null,
          session: req.session ? {
            id: req.session.id,
            cookie: req.session.cookie
          } : null,
          headers: {
            'user-agent': req.get('User-Agent'),
            'origin': req.get('Origin'),
            'referer': req.get('Referer')
          },
          timestamp: new Date().toISOString()
        };

        res.json(authStatus);
      } catch (error) {
        res.status(500).json({ 
          message: "Errore nel debug dell'autenticazione",
          error: error instanceof Error ? error.message : String(error)
        });
      }
    });
  });

  // Endpoint per aggiornare le date di scadenza dei documenti Excel
  app.post("/api/excel/update-expiry-dates", isAdmin, async (req, res) => {
    try {
      const clientId = req.user?.clientId;
      const userId = req.user?.legacyId;

      logger.info('Excel expiry dates update requested', { clientId, userId });

      if (!clientId || !userId) {
        logger.error('Excel update failed: missing clientId or userId', { clientId, userId });
        return res
          .status(400)
          .json({ message: "Nessun cliente associato a questo utente." });
      }

      const client = await storage.getClient(clientId);
      if (!client || !client.google?.refreshToken) {
        logger.error('Excel update failed: no Google refresh token', { clientId });
        return res
          .status(400)
          .json({ message: "Google Drive non connesso. Connetti prima Google Drive." });
      }

      // Ottieni il client Google Drive
      const drive = await getDriveClientForClient(clientId);
      if (!drive) {
        logger.error('Excel update failed: could not get Google Drive client', { clientId });
        return res
          .status(500)
          .json({ message: "Errore nella connessione a Google Drive." });
      }

      logger.info('Starting Excel expiry dates update', { clientId, userId });

      // Avvia l'aggiornamento in background
      const updatePromise = updateExcelExpiryDates(drive, userId);
      
      // Rispondi immediatamente che l'aggiornamento è iniziato
      res.json({ 
        message: "Aggiornamento date di scadenza Excel avviato",
        updateId: Date.now().toString()
      });

      // Esegui l'aggiornamento in background
      updatePromise
        .then(result => {
          logger.info('Excel expiry dates update completed', {
            userId,
            clientId,
            updated: result.updated,
            failed: result.failed,
            errorCount: result.errors.length
          });
        })
        .catch(error => {
          logger.error('Excel expiry dates update failed', {
            userId,
            clientId,
            error: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined
          });
          
          logError(error, {
            context: "excel-expiry-update",
            clientId: client.legacyId,
            userId,
          });
        });

    } catch (error) {
      logger.error('Excel expiry update endpoint error', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        clientId: req.user?.clientId,
        userId: req.user?.legacyId
      });
      
      res
        .status(500)
        .json({ message: "Errore nell'avviare l'aggiornamento delle date di scadenza" });
    }
  });

  // Endpoint per aggiornare dinamicamente gli stati di allerta
  app.post("/api/documents/update-alert-status", isAdmin, async (req, res) => {
    try {
      const clientId = req.user?.clientId;
      const userId = req.user?.legacyId;

      logger.info('Dynamic alert status update requested', { clientId, userId });

      if (!clientId || !userId) {
        logger.error('Alert status update failed: missing clientId or userId', { clientId, userId });
        return res
          .status(400)
          .json({ message: "Nessun cliente associato a questo utente." });
      }

      // Ottieni tutti i documenti attivi del cliente
      const allDocuments = await storage.getAllDocuments();
      const clientDocuments = allDocuments.filter(doc => doc.clientId === clientId && !doc.isObsolete);

      logger.info('Starting dynamic alert status update', { 
        clientId, 
        userId, 
        totalDocuments: clientDocuments.length 
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
              await storage.updateDocument(doc.legacyId, {
                alertStatus: newAlertStatus
              });

              // Crea un log dell'aggiornamento
              await storage.createLog({
                userId,
                action: "update_alert_status",
                documentId: doc.legacyId,
                details: {
                  message: `Aggiornato stato di allerta da ${doc.alertStatus} a ${newAlertStatus}`,
                  oldAlertStatus: doc.alertStatus,
                  newAlertStatus: newAlertStatus,
                  expiryDate: doc.expiryDate
                },
              });

              updatedCount++;
              
              logger.info('Updated document alert status', {
                documentId: doc.legacyId,
                title: doc.title,
                oldAlertStatus: doc.alertStatus,
                newAlertStatus: newAlertStatus,
                expiryDate: doc.expiryDate
              });
            }
          }
        } catch (error) {
          const errorMessage = `Failed to update document ${doc.legacyId}: ${error instanceof Error ? error.message : String(error)}`;
          errors.push(errorMessage);
          
          logger.error('Failed to update document alert status', {
            documentId: doc.legacyId,
            title: doc.title,
            error: error instanceof Error ? error.message : String(error)
          });
        }
      }

      logger.info('Dynamic alert status update completed', {
        userId,
        clientId,
        updated: updatedCount,
        errors: errors.length,
        totalProcessed: clientDocuments.length
      });

      res.json({
        message: "Aggiornamento stati di allerta completato",
        updated: updatedCount,
        errors: errors,
        totalProcessed: clientDocuments.length
      });

    } catch (error) {
      logger.error('Dynamic alert status update endpoint error', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        clientId: req.user?.clientId,
        userId: req.user?.legacyId
      });
      
      res
        .status(500)
        .json({ message: "Errore nell'aggiornamento degli stati di allerta" });
    }
  });

  return app;
}

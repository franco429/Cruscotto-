import session from "express-session";
import createMemoryStore from "memorystore";
import * as fs from "fs";
import * as path from "path";
import { promisify } from "util";
import {
  encryptFile,
  decryptFile,
  hashFile,
  verifyFileIntegrity,
} from "./crypto";

const MemoryStore = createMemoryStore(session);

import {
  UserDocument as User,
  DocumentDocument as Document,
  LogDocument as Log,
  InsertUser,
  InsertDocument,
  InsertLog,
} from "./shared-types/schema";

import { ClientDocument as Client, InsertClient } from "./shared-types/client";

import {
  CompanyCodeDocument as CompanyCode,
  InsertCompanyCode,
} from "./shared-types/companycode";

export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getAllUsers(): Promise<User[]>;
  updateUserRole(id: number, role: string): Promise<User | undefined>;
  updateUserSession(
    id: number,
    lastLogin: Date | null,
    sessionExpiry: Date | null
  ): Promise<User | undefined>;
  updateUserPassword(
    id: number,
    hashedPassword: string
  ): Promise<User | undefined>;
  updateUserClient(
    id: number,
    clientId: number | null
  ): Promise<User | undefined>;

  registerNewAdminAndClient(registrationData: {
    email: string;
    passwordHash: string;
    companyCode: string;
    clientName: string;
    driveFolderId: string;
  }): Promise<{ user: User; client: Client }>;

  // Document methods
  getAllDocuments(): Promise<Document[]>;
  getDocument(id: number): Promise<Document | undefined>;
  getDocumentsByPathAndTitle: (
    path: string,
    title: string,
    clientId: number
  ) => Promise<Document[]>;
  getObsoleteDocuments: () => Promise<Document[]>;
  createDocument(document: InsertDocument): Promise<Document>;
  updateDocument(
    id: number,
    document: Partial<InsertDocument>
  ): Promise<Document | undefined>;
  markDocumentObsolete(id: number): Promise<Document | undefined>;
  hashAndEncryptDocument: (
    id: number,
    filePath: string
  ) => Promise<Document | undefined>;
  verifyDocumentIntegrity(id: number): Promise<boolean>;
  validateFileUpload(
    filePath: string,
    fileSize: number,
    mimeType: string
  ): Promise<{ valid: boolean; errors?: string[] }>;

  // Client methods
  getClient(id: number): Promise<Client | undefined>;
  getClientByName(name: string): Promise<Client | undefined>;
  createClient(client: InsertClient): Promise<Client>;
  getAllClients(): Promise<Client[]>;
  updateClient(
    id: number,
    client: Partial<InsertClient>
  ): Promise<Client | undefined>;
  getFolderIdForUser(userId: number): Promise<string | undefined>;

  updateClientTokens(
    clientId: number,
    tokens: { refreshToken: string }
  ): Promise<Client | undefined>;
  clearClientTokens(clientId: number): Promise<void>;

  // Company Code methods
  createCompanyCode(code: InsertCompanyCode, session?: any): Promise<CompanyCode>;
  getCompanyCode(id: number): Promise<CompanyCode | undefined>;
  getCompanyCodeByCode(code: string): Promise<CompanyCode | undefined>;
  getAllCompanyCodes(): Promise<CompanyCode[]>;
  getPaginatedCompanyCodes(options: { page: number, limit: number }): Promise<{ data: CompanyCode[], total: number }>;
  updateCompanyCode(id: string, code: Partial<InsertCompanyCode>): Promise<CompanyCode | undefined>;
  deleteCompanyCode(id: string): Promise<boolean>;
  verifyCompanyCode(code: string): Promise<{ valid: boolean; role?: string; codeId?: number }>;
  incrementCompanyCodeUsage(id: number, session?: any): Promise<CompanyCode | undefined>;
  createManyCompanyCodes(codes: InsertCompanyCode[]): Promise<CompanyCode[]>;

  // Log methods
  createLog(log: InsertLog, session?: any): Promise<Log>;
  getAllLogs(): Promise<Log[]>;

  // Backup methods
  createBackup(): Promise<{
    success: boolean;
    backupPath?: string;
    error?: string;
  }>;
  restoreFromBackup(
    backupPath: string
  ): Promise<{ success: boolean; error?: string }>;

  recordFailedLoginAttempt(email: string): Promise<void>;

  resetLoginAttempts(email: string): Promise<void>;

  // Session store
  sessionStore: session.Store;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private documents: Map<number, Document>;
  private logs: Map<number, Log>;
  private clients: Map<number, Client>;
  private companyCodes: Map<number, CompanyCode>;
  private userIdCounter: number;
  private documentIdCounter: number;
  private logIdCounter: number;
  private clientIdCounter: number;
  private companyCodeIdCounter: number;
  sessionStore: session.Store;

  constructor() {
    this.users = new Map();
    this.documents = new Map();
    this.logs = new Map();
    this.clients = new Map();
    this.companyCodes = new Map();
    this.userIdCounter = 1;
    this.documentIdCounter = 1;
    this.logIdCounter = 1;
    this.clientIdCounter = 1;
    this.companyCodeIdCounter = 1;
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000, // prune expired entries every 24h
    });

    // Create initial system admin user (no client affiliation)
    this.createUser({
      email: "admin@example.com",
      password: "$2b$10$EpRnTzVlqHNP0.fUbXUwSOyuiXe/QLSUG6xNekdHgTGmrpHEfIoxm", // 'password'
      role: "admin",
      clientId: null,
      lastLogin: null,
      sessionExpiry: null,
      failedLoginAttempts: 0,
      lockoutUntil: null,
    });

    // Create example company codes for testing in development
    if (process.env.NODE_ENV === "development") {
      this.createCompanyCode({
        id: this.companyCodeIdCounter++,
        legacyId: this.companyCodeIdCounter,
        code: "ADMIN123",
        role: "admin",
        usageLimit: 5,
        expiresAt: null,
        isActive: true,
        createdBy: 1, // ID of the first admin
      });
      // ✅ Added a single-use code for testing the new registration flow
      this.createCompanyCode({
        id: this.companyCodeIdCounter++,
        legacyId: this.companyCodeIdCounter,
        code: "NEWREGISTRATION",
        role: "admin",
        usageLimit: 1,
        expiresAt: null,
        isActive: true,
        createdBy: 1,
      });
    }
  }

  // ✅ NEW ATOMIC REGISTRATION METHOD
  async registerNewAdminAndClient(registrationData: {
    email: string;
    passwordHash: string;
    companyCode: string;
    clientName: string;
    driveFolderId: string;
  }): Promise<{ user: User; client: Client }> {
    const { email, passwordHash, companyCode, clientName, driveFolderId } =
      registrationData;

    // 1. Verifica la validità del codice aziendale.
    const codeVerification = await this.verifyCompanyCode(companyCode);
    if (!codeVerification.valid || !codeVerification.codeId) {
      throw new Error("Codice aziendale non valido, scaduto o già utilizzato.");
    }
    if (codeVerification.role !== "admin") {
      throw new Error(
        "Questo codice non è valido per la registrazione di un amministratore."
      );
    }

    // 2. Controlla se l'email è già in uso.
    const existingUser = await this.getUserByEmail(email);
    if (existingUser) {
      throw new Error("Un utente con questa email è già registrato.");
    }

    // N.B.: Questa è una pseudo-transazione per MemStorage.
    // L'implementazione in mongo-storage.ts deve usare una transazione di database.
    try {
      const companyCodeDoc = await this.getCompanyCode(codeVerification.codeId);
      if (!companyCodeDoc) {
        throw new Error("Errore interno: codice non trovato dopo la verifica.");
      }

      // 3. "Consuma" il codice incrementandone l'utilizzo.
      if (typeof companyCodeDoc.legacyId !== "number" || companyCodeDoc.legacyId === null) {
        throw new Error("legacyId mancante su companyCodeDoc");
      }
      await this.incrementCompanyCodeUsage(companyCodeDoc.legacyId);

      // 4. Crea un nuovo client (azienda), che genera un ID client univoco.
      const newClient = await this.createClient({
        name: clientName,
        driveFolderId: driveFolderId,
      });

      // 5. Crea il nuovo User (Admin) e associali con il nuovo clientId
      const newUser = await this.createUser({
        email,
        password: passwordHash,
        role: "admin" as "admin",
        clientId: newClient.legacyId,
        lastLogin: null,
        sessionExpiry: null,
        failedLoginAttempts: 0,
        lockoutUntil: null,
      });

      return { user: newUser, client: newClient };
    } catch (error) {
      // Errore da loggare centralmente.
      throw new Error(
        "Impossibile completare la registrazione a causa di un errore interno."
      );
    }
  }

  // --- USER METHODS (WITH legacyId BUG FIX) ---

  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.email.toLowerCase() === email.toLowerCase()
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    if (insertUser.role === "superadmin" && insertUser.clientId !== null && insertUser.clientId !== undefined) {
      throw new Error("Un superadmin non può essere associato a nessun clientId.");
    }
    const id = this.userIdCounter++;
    const createdAt = new Date();
    const user: User = {
      ...insertUser,
      legacyId: id,
      createdAt: createdAt,
      role: insertUser.role || "user",
      clientId: insertUser.clientId === undefined ? null : insertUser.clientId,
      lastLogin: insertUser.lastLogin || null,
      sessionExpiry: insertUser.sessionExpiry || null,
      failedLoginAttempts: insertUser.failedLoginAttempts ?? 0,
      lockoutUntil: insertUser.lockoutUntil ?? null,
    };
    this.users.set(id, user);
    return user;
  }

  async getAllUsers(): Promise<User[]> {
    return Array.from(this.users.values());
  }

  async updateUserRole(id: number, role: string): Promise<User | undefined> {
    const user = this.users.get(id);
    if (!user) return undefined;
    const updatedUser = { ...user, role };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  async updateUserSession(
    id: number,
    lastLogin: Date | null,
    sessionExpiry: Date | null
  ): Promise<User | undefined> {
    const user = this.users.get(id);
    if (!user) return undefined;
    const updatedUser = {
      ...user,
      lastLogin: lastLogin !== null ? lastLogin : user.lastLogin,
      sessionExpiry:
        sessionExpiry !== null ? sessionExpiry : user.sessionExpiry,
    };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  async updateUserPassword(
    id: number,
    hashedPassword: string
  ): Promise<User | undefined> {
    const user = this.users.get(id);
    if (!user) return undefined;
    const updatedUser = { ...user, password: hashedPassword };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  async updateUserClient(
    id: number,
    clientId: number | null
  ): Promise<User | undefined> {
    const user = this.users.get(id);
    if (!user) return undefined;
    if (user.role === "superadmin" && clientId !== null && clientId !== undefined) {
      throw new Error("Non puoi assegnare un clientId a un superadmin.");
    }
    const updatedUser = { ...user, clientId };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  async recordFailedLoginAttempt(email: string): Promise<void> {
    const user = await this.getUserByEmail(email);
    if (user) {
      user.failedLoginAttempts = (user.failedLoginAttempts ?? 0) + 1;
      this.users.set(user.legacyId, user);
    }
  }

  async resetLoginAttempts(email: string): Promise<void> {
    const user = await this.getUserByEmail(email);
    if (user) {
      user.failedLoginAttempts = 0;
      this.users.set(user.legacyId, user);
    }
  }

  // --- CLIENT METHODS (WITH legacyId BUG FIX) ---

  async getClient(id: number): Promise<Client | undefined> {
    return this.clients.get(id);
  }

  async getClientByName(name: string): Promise<Client | undefined> {
    return Array.from(this.clients.values()).find(
      (client) => client.name === name
    );
  }

  async createClient(client: InsertClient): Promise<Client> {
    const legacyId = this.clientIdCounter++;
    const createdAt = new Date();
    const updatedAt = new Date();
    const newClient: Client = {
      ...client,
      legacyId,
      createdAt,
      updatedAt,
      google: {}, // Sempre presente, anche se vuoto
    };
    this.clients.set(legacyId, newClient);
    return newClient;
  }

  async getAllClients(): Promise<Client[]> {
    return Array.from(this.clients.values());
  }

  async updateClient(
    id: number,
    clientUpdate: Partial<InsertClient>
  ): Promise<Client | undefined> {
    const client = this.clients.get(id);
    if (!client) return undefined;
    const updatedClient = {
      ...client,
      ...clientUpdate,
      updatedAt: new Date(),
      google: client.google || {}, // Garantisco sempre l'oggetto
    };
    this.clients.set(id, updatedClient);
    return updatedClient;
  }

  async getFolderIdForUser(userId: number): Promise<string | undefined> {
    const user = await this.getUser(userId);
    if (!user || !user.clientId) return undefined;
    const client = await this.getClient(user.clientId);
    return client ? client.driveFolderId : undefined;
  }

  async updateClientTokens(
    clientId: number,
    tokens: { refreshToken: string }
  ): Promise<Client | undefined> {
    const client = this.clients.get(clientId);
    if (!client) return undefined;
    if (!client.google) client.google = {};
    client.google.refreshToken = tokens.refreshToken;
    client.updatedAt = new Date();
    this.clients.set(clientId, client);
    return client;
  }

  async clearClientTokens(clientId: number): Promise<void> {
    const client = this.clients.get(clientId);
    if (client && client.google) {
      delete client.google.refreshToken;
      client.updatedAt = new Date();
      this.clients.set(clientId, client);
    }
  }

  // --- DOCUMENT METHODS (WITH legacyId BUG FIX) ---

  async getAllDocuments(): Promise<Document[]> {
    return Array.from(this.documents.values())
      .filter((doc) => !doc.isObsolete)
      .sort((a, b) => {
        const aParts = a.path.split(".").map(Number);
        const bParts = b.path.split(".").map(Number);
        for (let i = 0; i < Math.min(aParts.length, bParts.length); i++) {
          if (aParts[i] !== bParts[i]) {
            return aParts[i] - bParts[i];
          }
        }
        return aParts.length - bParts.length;
      });
  }

  async getDocument(id: number): Promise<Document | undefined> {
    return this.documents.get(id);
  }

  async getDocumentsByPathAndTitle(
    path: string,
    title: string,
    clientId: number
  ): Promise<Document[]> {
    return Array.from(this.documents.values()).filter(
      (doc) => doc.path === path && doc.title === title && doc.clientId === clientId
    );
  }

  async getObsoleteDocuments(): Promise<Document[]> {
    return Array.from(this.documents.values()).filter((doc) => doc.isObsolete);
  }

  async createDocument(insertDocument: InsertDocument): Promise<Document> {
    const legacyId = this.documentIdCounter++;
    const createdAt = new Date();
    const updatedAt = new Date();
    const document: Document = {
      ...insertDocument,
      legacyId,
      createdAt,
      updatedAt,
      parentId: insertDocument.parentId ?? null,
      isObsolete: insertDocument.isObsolete || false,
      fileHash: insertDocument.fileHash || null,
      encryptedCachePath: insertDocument.encryptedCachePath || null,
      clientId:
        insertDocument.clientId === undefined ? null : insertDocument.clientId,
      ownerId: insertDocument.ownerId ?? null,
      // alertStatus ed expiryDate sono gestiti solo se previsti dal tipo DocumentDocument
      alertStatus: (insertDocument as any).alertStatus || "none",
      expiryDate: (insertDocument as any).expiryDate ?? null,
    };
    this.documents.set(legacyId, document);
    return document;
  }

  async updateDocument(
    id: number,
    documentUpdate: Partial<InsertDocument>
  ): Promise<Document | undefined> {
    const document = this.documents.get(id);
    if (!document) return undefined;
    const updatedDocument = {
      ...document,
      ...documentUpdate,
      updatedAt: new Date(),
    };
    this.documents.set(id, updatedDocument);
    return updatedDocument;
  }

  async markDocumentObsolete(id: number): Promise<Document | undefined> {
    const document = this.documents.get(id);
    if (!document) return undefined;
    const updatedDocument = {
      ...document,
      isObsolete: true,
      updatedAt: new Date(),
    };
    this.documents.set(id, updatedDocument);
    return updatedDocument;
  }

  async hashAndEncryptDocument(
    id: number,
    filePath: string
  ): Promise<Document | undefined> {
    try {
      const doc = await this.getDocument(id);
      if (!doc) throw new Error("Documento non trovato");

      const fileHash = await hashFile(filePath);
      const encryptedCachePath = await encryptFile(
        filePath,
        this.getEncryptedCachePath(doc)
      );

      return await this.updateDocument(id, { fileHash, encryptedCachePath });
    } catch (error) {
      // In un'app reale, questo errore verrebbe loggato
      return undefined;
    }
  }

  async verifyDocumentIntegrity(id: number): Promise<boolean> {
    try {
      const doc = await this.getDocument(id);
      if (!doc || !doc.fileHash || !doc.encryptedCachePath) return false;
      return await verifyFileIntegrity(doc.encryptedCachePath, doc.fileHash);
    } catch (error) {
      // In un'app reale, questo errore verrebbe loggato
      return false;
    }
  }

  // --- LOG METHODS (WITH legacyId BUG FIX) ---

  async createLog(
    log: InsertLog,
    session?: any
  ): Promise<Log> {
    const legacyId = this.logIdCounter++;
    const timestamp = new Date();
    const logObj: Log = {
      ...log,
      legacyId,
      documentId: log.documentId ?? null,
      timestamp: timestamp,
      details: log.details || {},
    };
    this.logs.set(legacyId, logObj);
    return logObj;
  }

  async getAllLogs(): Promise<Log[]> {
    return Array.from(this.logs.values()).sort((a, b) => {
      if (!a.timestamp || !b.timestamp) return 0;
      return b.timestamp.getTime() - a.timestamp.getTime();
    });
  }

  // (Il resto del file da qui in poi è rimasto uguale, ma lo includo per completezza)

  // --- FILE VALIDATION ---
  async validateFileUpload(
    filePath: string,
    fileSize: number,
    mimeType: string
  ): Promise<{ valid: boolean; errors?: string[] }> {
    const errors: string[] = [];
    const MAX_SIZE = 20 * 1024 * 1024;
    if (fileSize > MAX_SIZE) {
      errors.push(
        `Il file è troppo grande. Dimensione massima: ${
          MAX_SIZE / (1024 * 1024)
        }MB`
      );
    }
    const allowedMimeTypes = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "text/plain",
      "application/vnd.ms-powerpoint",
      "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      "image/jpeg",
      "image/png",
    ];
    if (!allowedMimeTypes.includes(mimeType)) {
      errors.push(
        "Tipo di file non supportato. I formati consentiti sono: PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX, TXT, JPG, PNG"
      );
    }
    const filename = path.basename(filePath);
    const isoPattern =
      /^\d+(?:\.\d+)*_[\p{L}\p{N} .,'()\-\u2019]+_Rev\.\d+_\d{4}-\d{2}-\d{2}\.[A-Za-z]+$/u;
    if (!isoPattern.test(filename)) {
      errors.push(
        "Il nome del file non segue lo standard ISO richiesto: N.N.N_TitoloProcedura_Rev.N_YYYY-MM-DD.ext"
      );
    }
    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
    };
  }

  // --- COMPANY CODE METHODS (WITH legacyId BUG FIX) ---

  async createCompanyCode(code: InsertCompanyCode): Promise<CompanyCode> {
    const legacyId = this.companyCodeIdCounter++;
    const createdAt = new Date();
    const updatedAt = new Date();
    const newCode: CompanyCode = {
      legacyId,
      code: code.code,
      role: code.role || "admin",
      usageLimit: code.usageLimit || 1,
      usageCount: 0,
      expiresAt: code.expiresAt || null,
      isActive: code.isActive !== undefined ? code.isActive : true,
      createdBy: code.createdBy,
      createdAt,
      updatedAt,
    };
    this.companyCodes.set(legacyId, newCode);
    return newCode;
  }

  async getCompanyCode(id: number): Promise<CompanyCode | undefined> {
    return this.companyCodes.get(id);
  }

  async getCompanyCodeByCode(code: string): Promise<CompanyCode | undefined> {
    return Array.from(this.companyCodes.values()).find(
      (companyCode) => companyCode.code.toLowerCase() === code.toLowerCase()
    );
  }

  async getAllCompanyCodes(): Promise<CompanyCode[]> {
    return Array.from(this.companyCodes.values());
  }

  async getPaginatedCompanyCodes(options: { page: number, limit: number }): Promise<{ data: CompanyCode[], total: number }> {
    const total = this.companyCodes.size;
    const data = Array.from(this.companyCodes.values())
      .sort((a, b) => a.code.localeCompare(b.code))
      .slice((options.page - 1) * options.limit, options.page * options.limit);
    return { data, total };
  }

  async updateCompanyCode(id: string, code: Partial<InsertCompanyCode>): Promise<CompanyCode | undefined> {
    const codeDoc = this.companyCodes.get(Number(id));
    if (!codeDoc) return undefined;
    const updatedCode = { ...codeDoc, ...code, updatedAt: new Date() };
    this.companyCodes.set(Number(id), updatedCode);
    return updatedCode;
  }

  async deleteCompanyCode(id: string): Promise<boolean> {
    if (this.companyCodes.has(Number(id))) {
      this.companyCodes.delete(Number(id));
      return true;
    }
    return false;
  }

  async verifyCompanyCode(
    code: string
  ): Promise<{ valid: boolean; role?: string; codeId?: number }> {
    if (!code) {
      return { valid: false };
    }
    const companyCode = await this.getCompanyCodeByCode(code);
    if (!companyCode) {
      return { valid: false };
    }
    if (!companyCode.isActive) {
      return { valid: false };
    }
    if (companyCode.expiresAt && new Date() > companyCode.expiresAt) {
      return { valid: false };
    }
    if (companyCode.usageCount >= companyCode.usageLimit) {
      return { valid: false };
    }
    return {
      valid: true,
      role: companyCode.role,
      codeId: companyCode.legacyId,
    };
  }

  async incrementCompanyCodeUsage(
    id: number
  ): Promise<CompanyCode | undefined> {
    if (typeof id !== "number" || isNaN(id)) return undefined;
    const code = this.companyCodes.get(id);
    if (!code) return undefined;
    const updatedCode = {
      ...code,
      usageCount: code.usageCount + 1,
      updatedAt: new Date(),
    };
    this.companyCodes.set(id, updatedCode);
    return updatedCode;
  }

  async createManyCompanyCodes(codes: InsertCompanyCode[]): Promise<CompanyCode[]> {
    return Promise.all(codes.map((code) => this.createCompanyCode(code)));
  }

  // --- BACKUP METHODS ---

  async createBackup(): Promise<{
    success: boolean;
    backupPath?: string;
    error?: string;
  }> {
    try {
      const backupDir = path.join(process.cwd(), "backups");
      await promisify(fs.mkdir)(backupDir, { recursive: true });
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const backupPath = path.join(backupDir, `backup_${timestamp}.json`);
      const data = {
        users: Array.from(this.users.values()),
        documents: Array.from(this.documents.values()),
        logs: Array.from(this.logs.values()),
        clients: Array.from(this.clients.values()),
        companyCodes: Array.from(this.companyCodes.values()),
        counters: {
          userIdCounter: this.userIdCounter,
          documentIdCounter: this.documentIdCounter,
          logIdCounter: this.logIdCounter,
          clientIdCounter: this.clientIdCounter,
          companyCodeIdCounter: this.companyCodeIdCounter,
        },
        timestamp: new Date().toISOString(),
        version: "1.0",
      };
      await promisify(fs.writeFile)(
        backupPath,
        JSON.stringify(data, null, 2),
        "utf8"
      );
      return { success: true, backupPath };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Errore sconosciuto";
      return { success: false, error: errorMessage };
    }
  }

  async restoreFromBackup(
    backupPath: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      if (!fs.existsSync(backupPath)) {
        throw new Error("File di backup non trovato.");
      }
      const backupData = JSON.parse(fs.readFileSync(backupPath, "utf-8"));

      if (
        !backupData.users ||
        !backupData.documents ||
        !backupData.logs ||
        !backupData.counters
      ) {
        throw new Error("Il file di backup non contiene dati validi");
      }
      this.users.clear();
      this.documents.clear();
      this.logs.clear();
      this.clients.clear();
      this.companyCodes.clear();

      backupData.users.forEach((user: User) =>
        this.users.set(user.legacyId, user)
      );
      backupData.documents.forEach((document: Document) =>
        this.documents.set(document.legacyId, document)
      );
      backupData.logs.forEach((log: Log) => this.logs.set(log.legacyId, log));
      if (backupData.clients) {
        backupData.clients.forEach((client: Client) =>
          this.clients.set(client.legacyId, client)
        );
      }
      if (backupData.companyCodes) {
        backupData.companyCodes.forEach((code: CompanyCode) =>
          this.companyCodes.set(code.legacyId, code)
        );
      }
      this.userIdCounter = backupData.counters.userIdCounter;
      this.documentIdCounter = backupData.counters.documentIdCounter;
      this.logIdCounter = backupData.counters.logIdCounter;
      this.clientIdCounter = backupData.counters.clientIdCounter || 1;
      this.companyCodeIdCounter = backupData.counters.companyCodeIdCounter || 1;

      return { success: true };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Errore sconosciuto";
      return { success: false, error: errorMessage };
    }
  }

  private getEncryptedCachePath(doc: Document): string {
    // ... existing code ...
  }

  // Fix: funzione che deve restituire un valore
  public cleanup(): void {
    // implementazione vuota
  }
}

export const storage = new MemStorage();

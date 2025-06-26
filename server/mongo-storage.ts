import mongoose, { ClientSession } from "mongoose";
import { IStorage } from "./storage";
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
import {
  UserModel,
  DocumentModel,
  LogModel,
  ClientModel,
  CompanyCodeModel,
  getNextSequence,
  Counter, // Importato per la gestione dei backup/restore
} from "./models/mongoose-models";
import {
  hashFile,
  encryptFile,
  decryptFile,
  verifyFileIntegrity,
} from "./crypto";
import path from "path";
import fs from "fs";
import session from "express-session";
import connectMongo from "connect-mongodb-session";
import dotenv from "dotenv";
import { BackupService } from "./backup-service";

dotenv.config();

const MongoStore = connectMongo(session);

export class MongoStorage implements IStorage {
  private connected: boolean = false;
  public sessionStore: session.Store;
  private backupService: BackupService;

  constructor() {
    this.connect();
    this.sessionStore = new MongoStore({
      uri: process.env.DB_URI || "",
      collection: "sessions",
    });
    this.backupService = new BackupService();
  }

  public async connect(): Promise<void> {
    if (this.connected) return;
    if (!process.env.DB_URI) {
      throw new Error("La variabile d'ambiente DB_URI non è configurata.");
    }
    try {
      await mongoose.connect(process.env.DB_URI);
      this.connected = true;
    } catch (error) {
      // In un'applicazione reale, questo errore critico dovrebbe essere gestito
      // da un sistema di logging centralizzato e potrebbe causare il riavvio del processo.
      throw error;
    }
  }

  async recordFailedLoginAttempt(email: string): Promise<void> {
    const userDoc = await UserModel.findOne({ email: email.toLowerCase() })
      .lean()
      .exec();
    if (!userDoc) {
      return;
    }

    const now = new Date();
    const currentAttempts = userDoc.failedLoginAttempts || 0;
    const newAttemptCount = currentAttempts + 1;

    let newLockoutUntil: Date | null = null;
    const lockoutDurations = {
      3: 5 * 60 * 1000,
      4: 15 * 60 * 1000,
      5: 60 * 60 * 1000,
    };

    const duration =
      lockoutDurations[newAttemptCount as keyof typeof lockoutDurations];
    if (duration) {
      newLockoutUntil = new Date(now.getTime() + duration);
    } else if (newAttemptCount > 5) {
      newLockoutUntil = new Date(now.getTime() + lockoutDurations[5]);
    }

    try {
      await UserModel.updateOne(
        { _id: userDoc._id },
        {
          $set: {
            failedLoginAttempts: newAttemptCount,
            lockoutUntil: newLockoutUntil,
          },
        }
      ).exec();
    } catch (error) {
      // Errore durante l'aggiornamento dei tentativi di login.
      // Da loggare centralmente.
    }
  }
  public async resetLoginAttempts(email: string): Promise<void> {
    await UserModel.updateOne(
      { email: email.toLowerCase() },
      { $set: { failedLoginAttempts: 0, lockoutUntil: null } }
    ).exec();
  }

  async registerNewAdminAndClient(registrationData: {
    email: string;
    passwordHash: string;
    companyCode: string;
    clientName: string;
    driveFolderId: string;
  }): Promise<{ user: User; client: Client }> {
    const { email, passwordHash, companyCode, clientName, driveFolderId } =
      registrationData;

    const existingUser = await this.getUserByEmail(email);
    if (existingUser) {
      throw new Error("Un utente con questa email è già registrato.");
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const codeDoc = await CompanyCodeModel.findOne({
        code: companyCode,
      }).session(session);
      if (
        !codeDoc ||
        !codeDoc.isActive ||
        codeDoc.usageCount >= codeDoc.usageLimit ||
        (codeDoc.expiresAt && new Date() > codeDoc.expiresAt)
      ) {
        throw new Error(
          "Codice aziendale non valido, scaduto o già utilizzato."
        );
      }
      if (codeDoc.role !== "admin") {
        throw new Error(
          "Questo codice non è valido per la registrazione di un amministratore."
        );
      }

      codeDoc.usageCount += 1;
      await codeDoc.save({ session });

      const newClient = await this.createClient(
        { name: clientName, driveFolderId },
        session
      );

      const newUser = await this.createUser(
        {
          email,
          password: passwordHash,
          role: "admin",
          clientId: newClient.legacyId,
          lastLogin: null,
          sessionExpiry: null,
        },
        session
      );

      await session.commitTransaction();
      return { user: newUser, client: newClient };
    } catch (error) {
      await session.abortTransaction();
      // Errore durante la transazione, da loggare.
      throw error instanceof Error
        ? error
        : new Error("Impossibile completare la registrazione.");
    } finally {
      await session.endSession();
    }
  }

  // --- USER METHODS ---
  async getUser(id: number): Promise<User | undefined> {
    const user = await UserModel.findOne({ legacyId: id }).lean().exec();
    return user ? (user as User) : undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const user = await UserModel.findOne({ email: email.toLowerCase() })
      .lean()
      .exec();
    return user ? (user as User) : undefined;
  }

  async createUser(
    insertUser: InsertUser,
    session?: ClientSession
  ): Promise<User> {
    if (insertUser.role === "superadmin" && insertUser.clientId !== null && insertUser.clientId !== undefined) {
      throw new Error("Un superadmin non può essere associato a nessun clientId.");
    }
    const legacyId = await getNextSequence("userId");
    const user = new UserModel({
      ...insertUser,
      id: legacyId,
      legacyId,
      failedLoginAttempts: insertUser.failedLoginAttempts ?? 0,
      lockoutUntil: insertUser.lockoutUntil ?? null,
    });
    await user.save({ session });
    return user.toObject();
  }

  async getAllUsers(): Promise<User[]> {
    return UserModel.find().lean().exec() as Promise<User[]>;
  }

  async updateUserRole(id: number, role: string): Promise<User | undefined> {
    const user = await UserModel.findOneAndUpdate(
      { legacyId: id },
      { role },
      { new: true }
    )
      .lean()
      .exec();
    return user ? (user as User) : undefined;
  }

  async updateUserSession(
    id: number,
    lastLogin: Date | null,
    sessionExpiry: Date | null
  ): Promise<User | undefined> {
    const updateData: any = {};
    if (lastLogin !== null) updateData.lastLogin = lastLogin;
    if (sessionExpiry !== null) updateData.sessionExpiry = sessionExpiry;
    const user = await UserModel.findOneAndUpdate(
      { legacyId: id },
      updateData,
      { new: true }
    )
      .lean()
      .exec();
    return user ? (user as User) : undefined;
  }

  async updateUserPassword(
    id: number,
    hashedPassword: string
  ): Promise<User | undefined> {
    const user = await UserModel.findOneAndUpdate(
      { legacyId: id },
      { password: hashedPassword },
      { new: true }
    )
      .lean()
      .exec();
    return user ? (user as User) : undefined;
  }

  async updateUserClient(
    id: number,
    clientId: number | null
  ): Promise<User | undefined> {
    const user = await UserModel.findOne({ legacyId: id }).lean().exec();
    if (!user) return undefined;
    if (user.role === "superadmin" && clientId !== null && clientId !== undefined) {
      throw new Error("Non puoi assegnare un clientId a un superadmin.");
    }
    const updatedUser = await UserModel.findOneAndUpdate(
      { legacyId: id },
      { clientId },
      { new: true }
    ).lean().exec();
    return updatedUser ? (updatedUser as User) : undefined;
  }

  async getUsersByClientId(clientId: number): Promise<User[]> {
    return UserModel.find({ clientId }).lean().exec() as Promise<User[]>;
  }

  async getUsersByClientIdWithPagination(
    clientId: number,
    limit: number,
    offset: number
  ): Promise<{ users: User[]; total: number }> {
    const [users, total] = await Promise.all([
      UserModel.find({ clientId })
        .select("-password")
        .sort({ createdAt: -1 })
        .skip(offset)
        .limit(limit)
        .lean()
        .exec(),
      UserModel.countDocuments({ clientId }),
    ]);

    return {
      users: users as User[],
      total,
    };
  }

  async deleteUser(userId: number): Promise<boolean> {
    try {
      const result = await UserModel.deleteOne({ legacyId: userId });
      return result.deletedCount > 0;
    } catch (error) {
      // Errore da loggare centralmente.
      return false;
    }
  }

  // --- CLIENT METHODS ---
  async getClient(id: number): Promise<Client | undefined> {
    const client = await ClientModel.findOne({ legacyId: id }).lean().exec();
    return client ? (client as Client) : undefined;
  }

  async getClientByName(name: string): Promise<Client | undefined> {
    const client = await ClientModel.findOne({ name }).lean().exec();
    return client ? (client as Client) : undefined;
  }

  async createClient(
    client: InsertClient,
    session?: ClientSession
  ): Promise<Client> {
    if (!client.name || !client.driveFolderId) {
      throw new Error("Nome e ID cartella Drive sono obbligatori");
    }
    const legacyId = await getNextSequence("clientId");
    const newClient = new ClientModel({ ...client, id: legacyId, legacyId });
    await newClient.save({ session });
    return newClient.toObject();
  }

  async getAllClients(): Promise<Client[]> {
    return ClientModel.find().lean().exec() as Promise<Client[]>;
  }

  async getClientsByAdminId(adminId: number): Promise<Client[]> {
    const admin = await this.getUser(adminId);
    if (!admin || !admin.clientId) return [];
    const client = await this.getClient(admin.clientId);
    return client ? [client] : [];
  }

  async updateClient(
    id: number,
    clientUpdate: Partial<InsertClient>
  ): Promise<Client | undefined> {
    const client = await ClientModel.findOneAndUpdate(
      { legacyId: id },
      { ...clientUpdate, updatedAt: new Date() },
      { new: true }
    )
      .lean()
      .exec();
    return client ? (client as Client) : undefined;
  }

  async getFolderIdForUser(userId: number): Promise<string | undefined> {
    const user = await this.getUser(userId);
    if (!user || !user.clientId) return undefined;
    const client = await this.getClient(user.clientId);
    return client?.driveFolderId;
  }

  async updateClientTokens(
    clientId: number,
    tokens: { refreshToken: string }
  ): Promise<Client | undefined> {
    const client = await ClientModel.findOneAndUpdate(
      { legacyId: clientId },
      { $set: { "google.refreshToken": tokens.refreshToken } },
      { new: true }
    )
      .lean()
      .exec();

    return client ? (client as Client) : undefined;
  }

  async clearClientTokens(clientId: number): Promise<void> {
    try {
      await ClientModel.updateOne(
        { legacyId: clientId },
        { $unset: { google: "" } }
      );
    } catch (error) {
      // In un'applicazione reale, questo errore critico andrebbe loggato
      // da un sistema di logging centralizzato.
      throw error;
    }
  }

  async getPaginatedCompanyCodes(options: { page: number; limit: number }) {
    const { page, limit } = options;
    const skip = (page - 1) * limit;
  
    const [total, data] = await Promise.all([
      CompanyCodeModel.countDocuments(),
      CompanyCodeModel.find()
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
    ]);
  
    return { data, total };
  }

  /**
   * Calcola il prossimo ID sequenziale per un nuovo codice aziendale.
   * Trova l'ID più alto esistente e restituisce il numero successivo.
   */
  async getNextCompanyCodeId(): Promise<number> {
    const lastCode = await CompanyCodeModel.findOne({
      id: { $exists: true, $ne: null },
    })
      .sort({ id: -1 })
      .lean();

    if (lastCode && typeof lastCode.id === "number") {
      return lastCode.id + 1;
    }

    return 1;
  }

  async createManyCompanyCodes(
    codes: InsertCompanyCode[]
  ): Promise<CompanyCodeDocument[]> {
    const createdDocuments = await CompanyCodeModel.insertMany(codes);
    return createdDocuments.map((doc) => doc.toObject());
  }

  // --- DOCUMENT METHODS ---
  async getAllDocuments(clientId?: number): Promise<Document[]> {
    const query: any = { isObsolete: false };
    if (clientId) {
      query.clientId = clientId;
    }
    const documents = (await DocumentModel.find(query)
      .lean()
      .exec()) as Document[];
    return documents.sort((a, b) => {
      const aParts = a.path.split(".").map(Number);
      const bParts = b.path.split(".").map(Number);
      for (let i = 0; i < Math.min(aParts.length, bParts.length); i++) {
        if (aParts[i] !== bParts[i]) return aParts[i] - bParts[i];
      }
      return aParts.length - bParts.length;
    });
  }

  async getDocument(id: number): Promise<Document | undefined> {
    const doc = await DocumentModel.findOne({ legacyId: id }).lean().exec();
    return doc ? (doc as Document) : undefined;
  }

  async getDocumentsByClientId(clientId: number): Promise<Document[]> {
    return this.getAllDocuments(clientId);
  }

  async getObsoleteDocumentsByClientId(clientId: number): Promise<Document[]> {
    return DocumentModel.find({ clientId, isObsolete: true })
      .lean()
      .exec() as Promise<Document[]>;
  }

  async createDocument(
    insertDocument: InsertDocument,
    session?: ClientSession
  ): Promise<Document> {
    const legacyId = await getNextSequence("documentId");
    const document = new DocumentModel({
      ...insertDocument,
      id: legacyId,
      legacyId,
      
    });
    await document.save({ session });
    return document.toObject();
  }

  async updateDocument(
    id: number,
    documentUpdate: Partial<InsertDocument>
  ): Promise<Document | undefined> {
    const doc = await DocumentModel.findOneAndUpdate(
      { legacyId: id },
      { ...documentUpdate, updatedAt: new Date() },
      { new: true }
    )
      .lean()
      .exec();
    return doc ? (doc as Document) : undefined;
  }

  async markDocumentObsolete(id: number): Promise<Document | undefined> {
    const doc = await DocumentModel.findOneAndUpdate(
      { legacyId: id },
      { isObsolete: true, updatedAt: new Date() },
      { new: true }
    )
      .lean()
      .exec();
    return doc ? (doc as Document) : undefined;
  }

  async getDocumentByGoogleFileId(googleFileId: string): Promise<Document | undefined> {
    const doc = await DocumentModel.findOne({ googleFileId }).lean().exec();
    return doc ? (doc as Document) : undefined;
  }

  // --- COMPANY CODE METHODS ---
  async createCompanyCode(
    companyCode: InsertCompanyCode,
    session?: ClientSession
  ): Promise<CompanyCode> {
    const legacyId = await getNextSequence("companyCodeId");
    const newCode = new CompanyCodeModel({
      ...companyCode,
      id: legacyId,
      legacyId,
      
      usageCount: 0,
    });
    await newCode.save({ session });
    return newCode.toObject();
  }

  async getCompanyCode(id: number): Promise<CompanyCode | undefined> {
    const code = await CompanyCodeModel.findOne({ legacyId: id }).lean().exec();
    return code ? (code as CompanyCode) : undefined;
  }

  async getCompanyCodeByCode(code: string): Promise<CompanyCode | undefined> {
    const companyCode = await CompanyCodeModel.findOne({ code }).lean().exec();
    return companyCode ? (companyCode as CompanyCode) : undefined;
  }

  async getAllCompanyCodes(): Promise<CompanyCode[]> {
    return CompanyCodeModel.find({})
      .sort({ createdAt: -1 })
      .lean()
      .exec() as Promise<CompanyCode[]>;
  }

  async updateCompanyCode(
    id: number,
    update: Partial<InsertCompanyCode>
  ): Promise<CompanyCode | undefined> {
    const code = await CompanyCodeModel.findOneAndUpdate(
      { legacyId: id },
      { ...update, updatedAt: new Date() },
      { new: true }
    )
      .lean()
      .exec();
    return code ? (code as CompanyCode) : undefined;
  }

  async deleteCompanyCode(id: number): Promise<boolean> {
    const result = await CompanyCodeModel.deleteOne({ legacyId: id });
    return result.deletedCount > 0;
  }

  async verifyCompanyCode(
    code: string
  ): Promise<{ valid: boolean; role?: string; codeId?: number }> {
    const companyCode = await this.getCompanyCodeByCode(code);
    if (!companyCode) return { valid: false };
    if (!companyCode.isActive) return { valid: false };
    if (companyCode.expiresAt && new Date() > companyCode.expiresAt)
      return { valid: false };
    if (companyCode.usageCount >= companyCode.usageLimit)
      return { valid: false };
    return {
      valid: true,
      role: companyCode.role,
      codeId: companyCode.legacyId,
    };
  }

  async incrementCompanyCodeUsage(
    id: number,
    session?: ClientSession
  ): Promise<CompanyCode | undefined> {
    const code = await CompanyCodeModel.findOneAndUpdate(
      { legacyId: id },
      { $inc: { usageCount: 1 }, updatedAt: new Date() },
      { new: true, session }
    )
      .lean()
      .exec();
    return code ? (code as CompanyCode) : undefined;
  }

  // --- LOG METHODS ---
  async createLog(
    insertLog: Omit<InsertLog, "documentId"> & { documentId?: number },
    session?: ClientSession
  ): Promise<Log> {
    const legacyId = await getNextSequence("logId");
    const log = new LogModel({
      ...insertLog,
      id: legacyId,
      legacyId,
      documentId: insertLog.documentId || null,
    });
    await log.save({ session });
    return log.toObject();
  }

  async getAllLogs(): Promise<Log[]> {
    return LogModel.find().sort({ timestamp: -1 }).lean().exec() as Promise<
      Log[]
    >;
  }

  async getLogsByClientId(clientId: number): Promise<Log[]> {
    const documents = await DocumentModel.find({ clientId })
      .select("legacyId")
      .lean()
      .exec();
    const documentIds = documents.map((doc) => doc.legacyId);

    const logs = await LogModel.find({
      $or: [
        { documentId: { $in: documentIds } },
        { "details.clientId": clientId },
      ],
    })
      .sort({ timestamp: -1 })
      .lean()
      .exec();

    return logs as Log[];
  }

  // --- BACKUP & RESTORE METHODS ---
  async createBackup(): Promise<{
    success: boolean;
    backupPath?: string;
    error?: string;
  }> {
    if (!this.connected)
      return { success: false, error: "Database non connesso" };
    
    try {
      // Usa il BackupService per eseguire l'operazione in un worker thread
      return await this.backupService.createBackup();
    } catch (error: any) {
      // Questo blocco viene eseguito se la promise del backupService viene RIFIUTATA
      // (es. il worker non parte).
      console.error("Errore nel servizio di backup (mongo-storage):", error);
      // L'errore potrebbe essere l'oggetto { success: false, error: '...' }
      const errorMessage = error?.error || (error instanceof Error ? error.message : String(error));
      return {
        success: false,
        error: `Errore durante l'avvio del processo di backup: ${errorMessage}`,
      };
    }
  }

  async restoreFromBackup(
    backupPath: string
  ): Promise<{ success: boolean; error?: string }> {
    if (!this.connected)
      return { success: false, error: "Database non connesso" };
    
    try {
      // Usa il BackupService per eseguire l'operazione in un worker thread
      return await this.backupService.restoreFromBackup(backupPath);
    } catch (error: any) {
      console.error("Errore nel servizio di ripristino (mongo-storage):", error);
      const errorMessage = error?.error || (error instanceof Error ? error.message : String(error));
      return { 
        success: false, 
        error: `Errore durante l'avvio del processo di ripristino: ${errorMessage}` 
      };
    }
  }

  async fixDocumentsClientId(): Promise<void> {
    try {
      const documents = await DocumentModel.find({
        clientId: { $exists: false },
      });
      for (const doc of documents) {
        const owner = await UserModel.findOne({ legacyId: doc.ownerId });
        if (owner && owner.clientId) {
          await DocumentModel.updateOne(
            { _id: doc._id },
            { $set: { clientId: owner.clientId } }
          );
        }
      }
    } catch (error) {
      // Non è necessario loggare qui, l'errore verrà propagato.
    }
  }

  // --- ALTRI METODI E METODI NON IN IStorage ---
  public async getDocumentByPathAndTitleAndRevision(
    path: string,
    title: string,
    revision: string,
    clientId: number
  ): Promise<Document | undefined> {
    const doc = await DocumentModel.findOne({ path, title, revision, clientId })
      .lean()
      .exec();
    return doc ? (doc as Document) : undefined;
  }

  public async getDocumentsByPathAndTitle(
    path: string,
    title: string
  ): Promise<Document[]> {
    return DocumentModel.find({ path, title }).lean().exec() as Promise<
      Document[]
    >;
  }

  public async getObsoleteDocuments(): Promise<Document[]> {
    return DocumentModel.find({ isObsolete: true }).lean().exec() as Promise<
      Document[]
    >;
  }

  public async hashAndEncryptDocument(
    id: number,
    filePath: string
  ): Promise<Document | undefined> {
    try {
      const cacheDir = path.join(process.cwd(), "encrypted_cache");
      await fs.promises.mkdir(cacheDir, { recursive: true });
      const encryptedPath = path.join(
        cacheDir,
        `doc_${id}_${path.basename(filePath)}.enc`
      );
      const fileHash = await hashFile(filePath);
      await encryptFile(filePath, encryptedPath);
      return await this.updateDocument(id, { fileHash, encryptedCachePath: encryptedPath });
    } catch (error) {
      return this.getDocument(id);
    }
  }

  public async verifyDocumentIntegrity(id: number): Promise<boolean> {
    try {
      const document = await this.getDocument(id);
      if (
        !document ||
        !document.fileHash ||
        !document.encryptedCachePath ||
        !fs.existsSync(document.encryptedCachePath)
      ) {
        return false;
      }
      const tempDir = path.join(process.cwd(), "temp");
      await fs.promises.mkdir(tempDir, { recursive: true });
      const tempFilePath = path.join(tempDir, `verify_${id}_${Date.now()}`);
      await decryptFile(document.encryptedCachePath, tempFilePath);
      const isValid = await verifyFileIntegrity(
        tempFilePath,
        document.fileHash
      );
      await fs.promises.unlink(tempFilePath);
      return isValid;
    } catch (error) {
      return false;
    }
  }

  public async validateFileUpload(
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
      errors.push("Tipo di file non supportato.");
    }
    const filename = path.basename(filePath);
    const isoPattern =
      /^\d+(?:\.\d+)*_[\p{L}\p{N} .,'()\-\u2019]+_Rev\.\d+_\d{4}-\d{2}-\d{2}\.[A-Za-z]+$/u;
    if (!isoPattern.test(filename)) {
      errors.push("Il nome del file non segue lo standard ISO richiesto.");
    }
    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
    };
  }

  // Metodo per pulire le risorse quando necessario
  public cleanup(): void {
    this.backupService.terminateWorker();
  }
}

export const mongoStorage = new MongoStorage();

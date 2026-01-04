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
  Counter,
} from "./models/mongoose-models";
import {
  hashFile,
  encryptFile,
  decryptFile,
  verifyFileIntegrity,
  encryptBuffer,
  decryptBuffer,
} from "./crypto";
import * as crypto from 'crypto';
import {
  uploadBufferToCloudStorage,
  downloadBufferFromCloudStorage,
  isCloudStorageConfigured
} from "./google-cloud-storage";
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

  /**
   * Helper: costruisce il filtro per client multi-tenant (clientIds o legacy clientId)
   */
  private clientFilter(clientId: number) {
    return {
      $or: [{ clientIds: clientId }, { clientId }],
    };
  }

  /**
   * Helper: normalizza clientIds a partire da dati esistenti e nuovi
   */
  private mergeClientIds(existing: Document | undefined, update?: { clientId?: number | null; clientIds?: number[] }) {
    const currentIds = new Set<number>();
    if (existing?.clientIds?.length) {
      existing.clientIds.forEach((id) => currentIds.add(id));
    }
    if (existing?.clientId) {
      currentIds.add(existing.clientId);
    }
    if (update?.clientId) {
      currentIds.add(update.clientId);
    }
    if (update?.clientIds?.length) {
      update.clientIds.forEach((id) => currentIds.add(id));
    }
    return Array.from(currentIds);
  }

  constructor() {
    // NOTA: NON chiamiamo this.connect() qui!
    // La connessione deve essere fatta esplicitamente in index.ts con await mongoStorage.connect()
    // Questo evita unhandled promise rejections che causavano crash silenzioso su Render
    
    // Valida DB_URI prima di creare sessionStore
    const dbUri = process.env.DB_URI;
    if (!dbUri) {
      console.error("❌ ERRORE CRITICO: DB_URI non configurata!");
      console.error("   Questo causerà il fallimento della connessione MongoDB.");
      // Non lanciamo errore qui per permettere al server di avviarsi
      // e mostrare un messaggio di errore più chiaro in connect()
    }
    
    this.sessionStore = new MongoStore({
      uri: dbUri || "mongodb://placeholder-will-fail",
      collection: "sessions",
      connectionOptions: {
        serverSelectionTimeoutMS: 10000, // Timeout più veloce per fallimento
      }
    });
    this.backupService = new BackupService();
  }

  public async connect(): Promise<void> {
    if (this.connected) return;
    
    const dbUri = process.env.DB_URI;
    if (!dbUri) {
      console.error("❌ ERRORE CRITICO: DB_URI non configurata!");
      console.error("   Variabili d'ambiente disponibili:", Object.keys(process.env).filter(k => k.startsWith('DB_') || k.startsWith('MONGO')).join(', ') || 'nessuna DB_*');
      throw new Error("La variabile d'ambiente DB_URI non è configurata. Controlla le Environment Variables su Render.");
    }
    
    try {
      console.log("🔄 Tentativo connessione MongoDB...");
      await mongoose.connect(dbUri, {
        serverSelectionTimeoutMS: 15001, // 15 secondi timeout
        socketTimeoutMS: 45001,
      });
      this.connected = true;
      console.log("✅ MongoDB connesso con successo");
    } catch (error) {
      console.error("❌ ERRORE connessione MongoDB:", error instanceof Error ? error.message : error);
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

    // HOTFIX: se l'utente è già bloccato, non incrementare ulteriormente
    if (userDoc.lockoutUntil && new Date(userDoc.lockoutUntil) > new Date()) {
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
        { legacyId: userDoc.legacyId },
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
      console.error('[ERROR] recordFailedLoginAttempt:', error);
    }
  }
  public async resetLoginAttempts(email: string): Promise<void> {
    // DEBUG LOG
    const userDoc = await UserModel.findOne({ email: email.toLowerCase() }).lean().exec();
    await UserModel.updateOne(
      { email: email.toLowerCase() },
      { $set: { failedLoginAttempts: 0, lockoutUntil: null } }
    ).exec();
  }

  /**
   * Registra un tentativo fallito di verifica MFA
   * Implementa lockout progressivo dopo N tentativi
   */
  async recordFailedMfaAttempt(userId: number): Promise<void> {
    const userDoc = await UserModel.findOne({ legacyId: userId })
      .lean()
      .exec();
    if (!userDoc) {
      return;
    }

    // Se l'utente è già bloccato per MFA, non incrementare ulteriormente
    if (userDoc.mfaLockoutUntil && new Date(userDoc.mfaLockoutUntil) > new Date()) {
      return;
    }

    const now = new Date();
    const currentAttempts = userDoc.mfaFailedAttempts || 0;
    const newAttemptCount = currentAttempts + 1;

    let newMfaLockoutUntil: Date | null = null;
    
    // Lockout progressivo più severo per MFA (conforme TAC Security Tier 2)
    const mfaLockoutDurations: Record<number, number> = {
      3: 5 * 60 * 1000,      // 3 tentativi: 5 minuti
      5: 15 * 60 * 1000,     // 5 tentativi: 15 minuti
      7: 60 * 60 * 1000,     // 7 tentativi: 1 ora
      10: 24 * 60 * 60 * 1000, // 10 tentativi: 24 ore
    };

    const duration = mfaLockoutDurations[newAttemptCount];
    if (duration) {
      newMfaLockoutUntil = new Date(now.getTime() + duration);
    } else if (newAttemptCount > 10) {
      // Più di 10 tentativi: lockout permanente di 24 ore
      newMfaLockoutUntil = new Date(now.getTime() + mfaLockoutDurations[10]);
    }

    try {
      await UserModel.updateOne(
        { legacyId: userId },
        {
          $set: {
            mfaFailedAttempts: newAttemptCount,
            mfaLockoutUntil: newMfaLockoutUntil,
          },
        }
      ).exec();

      // Log per audit trail
      console.log(`[MFA SECURITY] Failed MFA attempt #${newAttemptCount} for userId ${userId}`, {
        lockoutUntil: newMfaLockoutUntil,
      });
    } catch (error) {
      console.error('[ERROR] recordFailedMfaAttempt:', error);
    }
  }

  /**
   * Resetta i tentativi falliti di MFA dopo un login riuscito
   */
  public async resetMfaAttempts(userId: number): Promise<void> {
    try {
      await UserModel.updateOne(
        { legacyId: userId },
        { $set: { mfaFailedAttempts: 0, mfaLockoutUntil: null } }
      ).exec();

      console.log(`[MFA SECURITY] Reset MFA attempts for userId ${userId}`);
    } catch (error) {
      console.error('[ERROR] resetMfaAttempts:', error);
    }
  }

  async registerNewAdminAndClient(registrationData: {
    email: string;
    passwordHash: string;
    companyCode: string;
    clientName: string;
    driveFolderId?: string;
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
        driveFolderId && driveFolderId !== ""
          ? { name: clientName, driveFolderId }
          : { name: clientName },
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
          failedLoginAttempts: 0,
          lockoutUntil: null,
          mfaSecret: null,
          mfaEnabled: false,
          mfaBackupCodes: null,
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
    if (
      insertUser.role === "superadmin" &&
      insertUser.clientId !== null &&
      insertUser.clientId !== undefined
    ) {
      throw new Error(
        "Un superadmin non può essere associato a nessun clientId."
      );
    }
    const legacyId = await getNextSequence("userId");
    const user = new UserModel({
      ...insertUser,
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
    if (
      user.role === "superadmin" &&
      clientId !== null &&
      clientId !== undefined
    ) {
      throw new Error("Non puoi assegnare un clientId a un superadmin.");
    }
    const updatedUser = await UserModel.findOneAndUpdate(
      { legacyId: id },
      { clientId },
      { new: true }
    )
      .lean()
      .exec();
    return updatedUser ? (updatedUser as User) : undefined;
  }

  async updateUser(
    id: number,
    updates: Partial<User>
  ): Promise<User | undefined> {
    const user = await UserModel.findOneAndUpdate(
      { legacyId: id },
      { $set: updates },
      { new: true }
    )
      .lean()
      .exec();
    return user ? (user as User) : undefined;
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
    if (!client.name) {
      throw new Error("Nome azienda obbligatorio");
    }
    const legacyId = await getNextSequence("clientId");
    const newClient = new ClientModel({ ...client, legacyId });
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

  async createManyCompanyCodes(
    codes: (InsertCompanyCode & { legacyId: number })[]
  ): Promise<CompanyCode[]> {
    // L'opzione { ordered: false } tenta di inserire tutti i documenti anche se uno fallisce.
    const createdDocuments = await CompanyCodeModel.insertMany(codes, {
      ordered: false,
    });
    return createdDocuments.map((doc) => doc.toObject());
  }

  // --- DOCUMENT METHODS ---
  async getAllDocuments(clientId?: number): Promise<Document[]> {
    const query: any = { isObsolete: false };
    if (clientId) {
      query.$or = [{ clientIds: clientId }, { clientId }];
    }
    // Ottieni tutti i documenti non obsoleti
    const documents = (await DocumentModel.find(query)
      .lean()
      .exec()) as Document[];

    // Separa documenti locali e Google Drive
    const localDocuments = documents.filter(doc => !doc.googleFileId);
    const driveDocuments = documents.filter(doc => doc.googleFileId);

    // Gestione documenti locali: raggruppa per path+title
    const localDocumentGroups = new Map<string, Document[]>();
    localDocuments.forEach((doc) => {
      const key = `${doc.path}__${doc.title}`;
      if (!localDocumentGroups.has(key)) localDocumentGroups.set(key, []);
      localDocumentGroups.get(key)!.push(doc);
    });

    // Gestione documenti Google Drive: raggruppa per googleFileId
    const driveDocumentGroups = new Map<string, Document[]>();
    driveDocuments.forEach((doc) => {
      const key = doc.googleFileId!;
      if (!driveDocumentGroups.has(key)) driveDocumentGroups.set(key, []);
      driveDocumentGroups.get(key)!.push(doc);
    });

    const latestDocuments: Document[] = [];
    
    // Aggiungi i documenti locali più recenti
    for (const group of localDocumentGroups.values()) {
      if (group.length === 1) {
        latestDocuments.push(group[0]);
      } else {
        // Ordina per numero revisione decrescente
        const sorted = group.sort((a, b) => {
          const aRev = parseInt(a.revision.replace(/[^0-9]/g, ""), 10);
          const bRev = parseInt(b.revision.replace(/[^0-9]/g, ""), 10);
          return bRev - aRev;
        });
        latestDocuments.push(sorted[0]);
      }
    }

    // Aggiungi i documenti Google Drive più recenti
    for (const group of driveDocumentGroups.values()) {
      if (group.length === 1) {
        latestDocuments.push(group[0]);
      } else {
        // Ordina per numero revisione decrescente
        const sorted = group.sort((a, b) => {
          const aRev = parseInt(a.revision.replace(/[^0-9]/g, ""), 10);
          const bRev = parseInt(b.revision.replace(/[^0-9]/g, ""), 10);
          return bRev - aRev;
        });
        latestDocuments.push(sorted[0]);
      }
    }

    // Ordina per path
    return latestDocuments.sort((a, b) => {
      const aParts = a.path.split(".").map(Number);
      const bParts = b.path.split(".").map(Number);
      for (let i = 0; i < Math.min(aParts.length, bParts.length); i++) {
        if (aParts[i] !== bParts[i]) return aParts[i] - bParts[i];
      }
      return aParts.length - bParts.length;
    });
  }

  // Nuovo metodo per gestire la marcatura dei documenti obsoleti
  async markObsoleteRevisionsForClient(clientId: number): Promise<void> {
    const query: any = { isObsolete: false };
    if (clientId) {
      query.$or = [{ clientIds: clientId }, { clientId }];
    }
    
    // Ottieni tutti i documenti non obsoleti
    const documents = (await DocumentModel.find(query)
      .lean()
      .exec()) as Document[];

    // Separa documenti locali e Google Drive
    const localDocuments = documents.filter(doc => !doc.googleFileId);
    const driveDocuments = documents.filter(doc => doc.googleFileId);

    // Gestione documenti locali: raggruppa per path+title
    const localDocumentGroups = new Map<string, Document[]>();
    localDocuments.forEach((doc) => {
      const key = `${doc.path}__${doc.title}`;
      if (!localDocumentGroups.has(key)) localDocumentGroups.set(key, []);
      localDocumentGroups.get(key)!.push(doc);
    });

    // Marca obsolete solo i documenti locali con revisioni inferiori
    for (const group of localDocumentGroups.values()) {
      if (group.length > 1) {
        // Ordina per numero revisione decrescente
        const sorted = group.sort((a, b) => {
          const aRev = parseInt(a.revision.replace(/[^0-9]/g, ""), 10);
          const bRev = parseInt(b.revision.replace(/[^0-9]/g, ""), 10);
          return bRev - aRev;
        });
        
        // Marca obsolete tutte le revisioni tranne la più alta
        for (let i = 1; i < sorted.length; i++) {
          if (!sorted[i].isObsolete) {
            await this.markDocumentObsolete(sorted[i].legacyId);
          }
        }
      }
    }

    // Gestione documenti Google Drive: raggruppa per googleFileId
    const driveDocumentGroups = new Map<string, Document[]>();
    driveDocuments.forEach((doc) => {
      const key = doc.googleFileId!;
      if (!driveDocumentGroups.has(key)) driveDocumentGroups.set(key, []);
      driveDocumentGroups.get(key)!.push(doc);
    });

    // Marca obsolete solo i documenti Google Drive con revisioni inferiori
    for (const group of driveDocumentGroups.values()) {
      if (group.length > 1) {
        // Ordina per numero revisione decrescente
        const sorted = group.sort((a, b) => {
          const aRev = parseInt(a.revision.replace(/[^0-9]/g, ""), 10);
          const bRev = parseInt(b.revision.replace(/[^0-9]/g, ""), 10);
          return bRev - aRev;
        });
        
        // Marca obsolete tutte le revisioni tranne la più alta
        for (let i = 1; i < sorted.length; i++) {
          if (!sorted[i].isObsolete) {
            await this.markDocumentObsolete(sorted[i].legacyId);
          }
        }
      }
    }
  }

  async getAllDocumentsRaw(): Promise<Document[]> {
    return DocumentModel.find({}).lean().exec() as Promise<Document[]>;
  }

  async getDocument(id: number): Promise<Document | undefined> {
    const doc = await DocumentModel.findOne({ legacyId: id }).lean().exec();
    return doc ? (doc as Document) : undefined;
  }

  async getDocumentsByClientId(clientId: number): Promise<Document[]> {
    return this.getAllDocuments(clientId);
  }

  /**
   * NUOVO: Paginazione server-side ottimizzata per 50K+ documenti
   * Supporta filtri, ricerca e ordinamento
   */
  async getDocumentsPaginated(
    clientId: number,
    options: {
      page?: number;
      limit?: number;
      status?: 'all' | 'expired' | 'warning' | 'none';
      search?: string;
      sortBy?: 'updatedAt' | 'path' | 'title' | 'alertStatus';
      sortOrder?: 'asc' | 'desc';
    } = {}
  ): Promise<{
    documents: Document[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasNextPage: boolean;
      hasPrevPage: boolean;
    };
    stats: {
      total: number;
      expired: number;
      warning: number;
      valid: number;
    };
  }> {
    const {
      page = 1,
      limit = 50,
      status = 'all',
      search = '',
      sortBy = 'path',
      sortOrder = 'asc',
    } = options;

    // Costruisci query base
    const query: any = { 
      isObsolete: false,
      $or: [{ clientIds: clientId }, { clientId }],
    };

    // Filtro per status
    if (status !== 'all') {
      query.alertStatus = status;
    }

    // Filtro per ricerca (path, title, revision)
    if (search && search.trim()) {
      const searchRegex = new RegExp(search.trim(), 'i');
      query.$and = [
        ...(query.$and || []),
        {
          $or: [
            { path: searchRegex },
            { title: searchRegex },
            { revision: searchRegex },
          ],
        },
      ];
    }

    // Costruisci sort
    const sortOptions: any = {};
    if (sortBy === 'path') {
      // Ordinamento speciale per path (es: 1.0, 1.1, 2.0)
      sortOptions.path = sortOrder === 'asc' ? 1 : -1;
    } else {
      sortOptions[sortBy] = sortOrder === 'asc' ? 1 : -1;
    }

    // Aggiungi ordinamento secondario per consistenza
    if (sortBy !== 'updatedAt') {
      sortOptions.updatedAt = -1;
    }

    // Esegui query con paginazione
    const skip = (page - 1) * limit;

    // Esegui query in parallelo per performance
    const [documents, total, stats] = await Promise.all([
      DocumentModel.find(query)
        .collation({ locale: "en", numericOrdering: true })
        .sort(sortOptions)
        .skip(skip)
        .limit(limit)
        .lean()
        .exec() as Promise<Document[]>,
      
      DocumentModel.countDocuments(query),
      
      // Statistiche aggregate per tutti i documenti del client
      DocumentModel.aggregate([
        { $match: { isObsolete: false, $or: [{ clientIds: clientId }, { clientId }] } },
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            expired: {
              $sum: { $cond: [{ $eq: ['$alertStatus', 'expired'] }, 1, 0] }
            },
            warning: {
              $sum: { $cond: [{ $eq: ['$alertStatus', 'warning'] }, 1, 0] }
            },
            valid: {
              $sum: { $cond: [{ $ne: ['$alertStatus', 'expired'] }, { $cond: [{ $ne: ['$alertStatus', 'warning'] }, 1, 0] }, 0] }
            },
          },
        },
      ]).then(result => result[0] || { total: 0, expired: 0, warning: 0, valid: 0 }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      documents,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
      stats: {
        total: stats.total || 0,
        expired: stats.expired || 0,
        warning: stats.warning || 0,
        valid: stats.valid || 0,
      },
    };
  }

  async getObsoleteDocumentsByClientId(clientId: number): Promise<Document[]> {
    return DocumentModel.find({ isObsolete: true, $or: [{ clientIds: clientId }, { clientId }] })
      .lean()
      .exec() as Promise<Document[]>;
  }

  // Nuova funzione per ripristinare tutti i documenti obsoleti di un client
  async restoreAllObsoleteDocumentsForClient(clientId: number): Promise<{ restored: number; errors: string[] }> {
    const result = { restored: 0, errors: [] as string[] };
    
    try {
      const obsoleteDocs = await DocumentModel.find({ isObsolete: true, $or: [{ clientIds: clientId }, { clientId }] }).lean().exec();
      
      for (const doc of obsoleteDocs) {
        try {
          await DocumentModel.updateOne(
            { legacyId: doc.legacyId },
            { $set: { isObsolete: false, updatedAt: new Date() } }
          );
          result.restored++;
        } catch (error) {
          result.errors.push(`Errore nel ripristino del documento ${doc.title}: ${error instanceof Error ? error.message : 'Errore sconosciuto'}`);
        }
      }
    } catch (error) {
      result.errors.push(`Errore generale: ${error instanceof Error ? error.message : 'Errore sconosciuto'}`);
    }
    
    return result;
  }

  async createDocument(
    insertDocument: InsertDocument,
    session?: ClientSession
  ): Promise<Document> {
    const legacyId = await getNextSequence("documentId");
    
    // Debug logging per file Excel
    const isExcel = insertDocument.fileType === 'xlsx' || insertDocument.fileType === 'xls' || insertDocument.fileType === 'xlsm';
    if (isExcel) {
      console.log(`[MONGO] 📊 Creating Excel document in DB:`, {
        title: insertDocument.title,
        fileType: insertDocument.fileType,
        googleFileId: insertDocument.googleFileId,
        path: insertDocument.path,
        revision: insertDocument.revision,
        clientId: insertDocument.clientId,
      });
    }
    
    // Normalizza i clientIds (multi-tenant sharing)
    const normalizedClientIds =
      insertDocument.clientIds && insertDocument.clientIds.length
        ? Array.from(new Set(insertDocument.clientIds))
        : insertDocument.clientId
          ? [insertDocument.clientId]
          : [];

    const document = new DocumentModel({
      ...insertDocument,
      clientIds: normalizedClientIds,
      legacyId,
      alertStatus: insertDocument.alertStatus || "none",
      googleFileId: insertDocument.googleFileId || undefined,
    });
    
    try {
      await document.save({ session });
      if (isExcel) {
        console.log(`[MONGO] ✅ Excel document SAVED successfully: ${insertDocument.title} (ID: ${legacyId})`);
      }
      return document.toObject();
    } catch (saveError) {
      if (isExcel) {
        console.error(`[MONGO] ❌ FAILED to save Excel document:`, {
          title: insertDocument.title,
          googleFileId: insertDocument.googleFileId,
          error: saveError instanceof Error ? saveError.message : String(saveError),
          errorCode: (saveError as any)?.code,
          errorName: (saveError as any)?.name,
        });
      }
      throw saveError;
    }
  }

  async updateDocument(
    id: number,
    documentUpdate: Partial<InsertDocument>
  ): Promise<Document | undefined> {
    const existing = await DocumentModel.findOne({ legacyId: id }).lean().exec();
    if (!existing) return undefined;

    const mergedClientIds = this.mergeClientIds(existing, documentUpdate);

    const updatePayload: any = {
      ...documentUpdate,
      clientIds: mergedClientIds,
      updatedAt: new Date(),
    };

    // Mantieni il campo legacy clientId per compatibilità (usa il primo disponibile)
    if (!updatePayload.clientId && mergedClientIds.length > 0) {
      updatePayload.clientId = mergedClientIds[0];
    }

    const doc = await DocumentModel.findOneAndUpdate(
      { legacyId: id },
      updatePayload,
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

  async deleteDocument(id: number): Promise<boolean> {
    const result = await DocumentModel.deleteOne({ legacyId: id });
    return result.deletedCount > 0;
  }

  async getDocumentByGoogleFileId(
    googleFileId: string
  ): Promise<Document | undefined> {
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
      legacyId,

      usageCount: 0,
    });
    await newCode.save({ session });
    return newCode.toObject();
  }

  async getCompanyCode(id: number): Promise<CompanyCode | undefined> {
    const code = await CompanyCodeModel.findOne({ legacyId: id }).lean().exec(); // Query su legacyId
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
      { $set: { ...update, updatedAt: new Date() } }, // Usa $set per sicurezza
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
  async createLog(log: InsertLog, session?: ClientSession): Promise<Log> {
    const legacyId = await getNextSequence("logId");
    const newLog = new LogModel({
      ...log,
      legacyId,
      documentId: log.documentId ?? null,
    });
    await newLog.save({ session });
    return newLog.toObject();
  }

  async getAllLogs(): Promise<Log[]> {
    return LogModel.find().sort({ timestamp: -1 }).lean().exec() as Promise<
      Log[]
    >;
  }

  async getLogsByClientId(clientId: number): Promise<Log[]> {
    const documents = await DocumentModel.find({ $or: [{ clientIds: clientId }, { clientId }] })
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
  async createBackup(backupOptions?: {
    createdBy: {
      userId: number;
      userEmail: string;
      userRole: string;
    };
    clientId?: number;
  }): Promise<{
    success: boolean;
    backupPath?: string;
    error?: string;
  }> {
    if (!this.connected)
      return { success: false, error: "Database non connesso" };

    try {
      // Usa il BackupService per eseguire l'operazione in un worker thread
      return await this.backupService.createBackup(backupOptions);
    } catch (error: any) {
      // Questo blocco viene eseguito se la promise del backupService viene RIFIUTATA
      // (es. il worker non parte).
      console.error("Errore nel servizio di backup (mongo-storage):", error);
      // L'errore potrebbe essere l'oggetto { success: false, error: '...' }
      const errorMessage =
        error?.error ||
        (error instanceof Error ? error.message : String(error));
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
      console.error(
        "Errore nel servizio di ripristino (mongo-storage):",
        error
      );
      const errorMessage =
        error?.error ||
        (error instanceof Error ? error.message : String(error));
      return {
        success: false,
        error: `Errore durante l'avvio del processo di ripristino: ${errorMessage}`,
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
            { legacyId: doc.legacyId },
            { $set: { clientId: owner.clientId } }
          );
        }
      }
    } catch (error) {
      // Non è necessario loggare qui, l'errore verrà propagato.
    }
  }

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
    title: string,
    clientId: number
  ): Promise<Document[]> {
    return DocumentModel.find({
      path,
      title,
      $or: [{ clientIds: clientId }, { clientId }],
    })
      .lean()
      .exec() as Promise<Document[]>;
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
      const useCloudStorage = await isCloudStorageConfigured();
      const fileBuffer = await fs.promises.readFile(filePath);
      const fileHash = crypto.createHash('sha256').update(fileBuffer).digest('hex');
      
      let encryptedPath: string;

      if (useCloudStorage) {
        const encryptedBuffer = encryptBuffer(fileBuffer);
        const fileName = `secure_doc_${id}_${path.basename(filePath)}.enc`;
        
        // Upload to GCS
        const gcsFileName = await uploadBufferToCloudStorage(encryptedBuffer, fileName, {
            type: 'encrypted_document',
            documentId: String(id)
        });
        
        encryptedPath = `gcs://${gcsFileName}`;
      } else {
        const cacheDir = path.join(process.cwd(), "encrypted_cache");
        
        // ⚠️ CRITICAL WARNING: Utilizzo storage locale su Render
        if (process.env.RENDER || process.env.NODE_ENV === 'production') {
          logger.warn("⚠️  CRITICAL: Writing to local encrypted_cache on Render/Production. This is risky for ephemeral storage and disk limits.", {
            documentId: id,
            cacheDir
          });
        }

        await fs.promises.mkdir(cacheDir, { recursive: true });
        encryptedPath = path.join(
          cacheDir,
          `doc_${id}_${path.basename(filePath)}.enc`
        );
        await encryptFile(filePath, encryptedPath);
      }

      return await this.updateDocument(id, {
        fileHash,
        encryptedCachePath: encryptedPath,
      });
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
        !document.encryptedCachePath
      ) {
        return false;
      }

      if (document.encryptedCachePath.startsWith('gcs://')) {
        const gcsFileName = document.encryptedCachePath.replace('gcs://', '');
        const encryptedBuffer = await downloadBufferFromCloudStorage(gcsFileName);
        const decryptedBuffer = decryptBuffer(encryptedBuffer);
        
        const actualHash = crypto.createHash('sha256').update(decryptedBuffer).digest('hex');
        return actualHash === document.fileHash;
      }

      if (!fs.existsSync(document.encryptedCachePath)) {
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
      "application/vnd.ms-excel.sheet.macroEnabled.12",
      "application/vnd.ms-excel.sheet.macroenabled.12",
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

import mongoose, { Schema, Document as MongooseDocument } from "mongoose";
import {
  UserDocument,
  DocumentDocument,
  LogDocument,
  BackupDocument,
} from "../shared-types/schema";
import { ClientDocument } from "../shared-types/client";
import { CompanyCodeDocument } from "../shared-types/companycode";

// User Schema
const userSchema = new Schema<UserDocument & MongooseDocument>({
  legacyId: { type: Number, required: true, unique: true, index: true },
  email: { type: String, required: true, unique: true, index: true },
  password: { type: String, required: true },
  role: {
    type: String,
    required: true,
    enum: ["superadmin", "admin", "viewer", "developer"],
    default: "viewer",
  },
  clientId: { type: Number, default: null, index: true },
  lastLogin: { type: Date, default: null },
  sessionExpiry: { type: Date, default: null },
  createdAt: { type: Date, default: Date.now },
  failedLoginAttempts: { type: Number, default: 0 },
  lockoutUntil: { type: Date, default: null },
  mfaSecret: { type: String, default: null },
  mfaEnabled: { type: Boolean, default: false },
  mfaBackupCodes: { type: [String], default: null },
  mfaFailedAttempts: { type: Number, default: 0 },
  mfaLockoutUntil: { type: Date, default: null },
});

// Document Schema
export const documentSchema = new Schema<DocumentDocument & MongooseDocument>({
  legacyId: { type: Number, required: true, unique: true, index: true },
  title: { type: String, required: true, index: true },
  path: { type: String, required: true, index: true },
  filePath: { type: String, required: false },
  revision: { type: String, required: true },
  driveUrl: { type: String },
  fileType: { type: String, required: true },
  alertStatus: {
    type: String,
    enum: ["none", "warning", "expired"],
    default: "none",
  },
  expiryDate: { type: Date, default: null },
  parentId: { type: Number, default: null },
  isObsolete: { type: Boolean, default: false, index: true },
  fileHash: { type: String, default: null },
  encryptedCachePath: { type: String, default: null },
  // legacy single-owner field (mantained for backward compatibility)
  clientId: { type: Number, default: null, index: true },
  // multi-tenant ownership: a documento può appartenere a più client che condividono la stessa cartella
  clientIds: { type: [Number], default: [], index: true },
  ownerId: { type: Number, default: null },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  googleFileId: { type: String, index: true, unique: true, sparse: true },
});

// INDICI COMPOSTI OTTIMIZZATI per query 50K+ documenti
// Indice principale per paginazione e filtri
documentSchema.index({ clientIds: 1, isObsolete: 1, alertStatus: 1, updatedAt: -1 });
// Indice per ricerca e ordinamento per path
documentSchema.index({ clientIds: 1, isObsolete: 1, path: 1 });
// Indice per ricerca testuale
documentSchema.index({ clientIds: 1, title: 'text', path: 'text', revision: 'text' });
// Indice per verifica duplicati (usato in sync)
documentSchema.index({ clientIds: 1, path: 1, title: 1, revision: 1 });

// Log Schema
const logSchema = new Schema<LogDocument & MongooseDocument>({
  legacyId: { type: Number, required: true, unique: true, index: true },
  userId: { type: Number, required: true, index: true },
  action: { type: String, required: true, index: true },
  documentId: { type: Number, default: null, index: true },
  details: { type: Schema.Types.Mixed, default: null },
  timestamp: { type: Date, default: Date.now, index: true },
});

// Client Schema
const clientSchema = new Schema<ClientDocument & MongooseDocument>({
  legacyId: { type: Number, required: true, unique: true, index: true },
  name: { type: String, required: true },
  driveFolderId: { type: String, required: false },
  google: {
    accessToken: { type: String, required: false },
    refreshToken: { type: String, required: false },
    expiryDate: { type: Number, required: false },
  },
  localOpenerConfig: {
    drivePaths: { type: [String], required: false, default: [] },
    roots: { type: [String], required: false, default: [] }
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// Company Code Schema
const companyCodeSchema = new Schema<CompanyCodeDocument & MongooseDocument>({
  legacyId: { type: Number, required: true, unique: true, index: true },
  code: { type: String, required: true, unique: true, index: true },
  role: {
    type: String,
    required: true,
    enum: ["admin", "viewer"],
    default: "admin",
  },
  usageLimit: { type: Number, default: 1 },
  usageCount: { type: Number, default: 0 },
  expiresAt: { type: Date, default: null },
  isActive: { type: Boolean, default: true },
  createdBy: { type: Number, required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// Backup Schema
const backupSchema = new Schema<BackupDocument & MongooseDocument>({
  legacyId: { type: Number, required: true, unique: true, index: true },
  filename: { type: String, required: true, unique: true, index: true },
  filePath: { type: String, required: true },
  fileSize: { type: Number, required: true },
  backupType: {
    type: String,
    required: true,
    enum: ["complete", "client_specific"],
    index: true,
  },
  createdBy: {
    userId: { type: Number, required: true, index: true },
    userEmail: { type: String, required: true },
    userRole: {
      type: String,
      required: true,
      enum: ["superadmin", "admin", "viewer", "developer"],
    },
  },
  clientId: { type: Number, default: null, index: true },
  metadata: {
    totalUsers: { type: Number, required: true },
    totalDocuments: { type: Number, required: true },
    totalLogs: { type: Number, required: true },
    totalClients: { type: Number, required: true },
    totalCompanyCodes: { type: Number, required: true },
  },
  createdAt: { type: Date, default: Date.now, index: true },
  updatedAt: { type: Date, default: Date.now },
  isActive: { type: Boolean, default: true, index: true },
  lastVerified: { type: Date, default: Date.now },
});

// Notification Tracker Schema - Traccia quando sono state inviate le notifiche
interface NotificationTrackerDocument extends MongooseDocument {
  notificationType: "expired" | "warning";
  clientId: string; // "default" o ID del client specifico
  documentIds: number[]; // IDs dei documenti notificati
  sentAt: Date;
  recipientEmails: string[];
  documentCount: number;
}

const notificationTrackerSchema = new Schema<NotificationTrackerDocument>({
  notificationType: {
    type: String,
    required: true,
    enum: ["expired", "warning"],
    index: true,
  },
  clientId: { type: String, required: true, index: true },
  documentIds: { type: [Number], required: true },
  sentAt: { type: Date, default: Date.now, index: true },
  recipientEmails: { type: [String], required: true },
  documentCount: { type: Number, required: true },
});

// Indice composto per query ottimizzate
notificationTrackerSchema.index({ notificationType: 1, clientId: 1, sentAt: -1 });

// Counter Schema for auto-incrementing IDs
interface CounterDocument extends MongooseDocument {
  _id: string;
  seq: number;
}
const counterSchema = new Schema<CounterDocument>({
  _id: { type: String, required: true },
  seq: { type: Number, default: 0 },
});
export const Counter = mongoose.model<CounterDocument>(
  "Counter",
  counterSchema
);

// Function to get the next sequence value
export async function getNextSequence(name: string): Promise<number> {
  const counter = await Counter.findByIdAndUpdate(
    name,
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );
  return counter.seq;
}

// Create and export models
export const UserModel = mongoose.model<UserDocument & MongooseDocument>(
  "User",
  userSchema
);
export const DocumentModel = mongoose.model<
  DocumentDocument & MongooseDocument
>("Document", documentSchema);
export const LogModel = mongoose.model<LogDocument & MongooseDocument>(
  "Log",
  logSchema
);
export const ClientModel = mongoose.model<ClientDocument & MongooseDocument>(
  "Client",
  clientSchema
);
export const CompanyCodeModel = mongoose.model<
  CompanyCodeDocument & MongooseDocument
>("CompanyCode", companyCodeSchema);
export const BackupModel = mongoose.model<BackupDocument & MongooseDocument>(
  "Backup",
  backupSchema
);
export const NotificationTrackerModel = mongoose.model<NotificationTrackerDocument>(
  "NotificationTracker",
  notificationTrackerSchema
);

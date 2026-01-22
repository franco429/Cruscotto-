export interface UserDocument {
  legacyId: number;
  email: string;
  password: string;
  role: "superadmin" | "admin" | "viewer" | "developer";
  clientId: number | null;
  lastLogin: Date | null;
  sessionExpiry: Date | null;
  createdAt: Date;
  failedLoginAttempts: number;
  lockoutUntil: Date | null;
  mfaSecret: string | null;
  mfaEnabled: boolean;
  mfaBackupCodes: string[] | null;
  mfaFailedAttempts: number;
  mfaLockoutUntil: Date | null;
}

export interface DocumentDocument {
  legacyId: number;
  title: string;
  path: string;
  filePath?: string;
  revision: string;
  driveUrl: string;
  fileType: string;
  alertStatus: "none" | "warning" | "expired";
  expiryDate: Date | null;
  parentId: number | null;
  isObsolete: boolean;
  fileHash: string | null;
  encryptedCachePath: string | null;
  ownerId: number | null;
  clientId: number | null;
  createdAt: Date;
  insertedAt: Date;
  updatedAt: Date;
  googleFileId: string | null;
}

export interface LogDocument {
  legacyId: number;
  userId: number;
  action: string;
  documentId: number | null;
  details: any;
  timestamp: Date;
}

export interface BackupDocument {
  legacyId: number;
  filename: string;
  filePath: string;
  fileSize: number;
  backupType: "complete" | "client_specific";
  createdBy: {
    userId: number;
    userEmail: string;
    userRole: "superadmin" | "admin" | "viewer" | "developer";
  };
  clientId: number | null;
  metadata: {
    totalUsers: number;
    totalDocuments: number;
    totalLogs: number;
    totalClients: number;
    totalCompanyCodes: number;
  };
  createdAt: Date;
  updatedAt: Date;
  isActive: boolean;
  lastVerified: Date;
}

export type InsertUser = Omit<UserDocument, "legacyId" | "createdAt">;
export type InsertDocument = Omit<
  DocumentDocument,
  "legacyId" | "createdAt" | "updatedAt"
> & {
  insertedAt?: Date | null;
};
export type InsertLog = Omit<LogDocument, "legacyId" | "timestamp">;

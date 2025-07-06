export interface UserDocument {
  email: string;
  password: string;
  role: string;
  clientId: number | null;
  lastLogin: Date | null;
  sessionExpiry: Date | null;
  createdAt: Date | null;
  legacyId: number;
}

export interface DocumentDocument {
  title: string;
  path: string;
  revision: string;
  driveUrl: string;
  fileType: string;
  alertStatus: string;
  expiryDate: Date | null;
  parentId: number | null;
  isObsolete: boolean;
  fileHash: string | null;
  encryptedCachePath: string | null;
  ownerId: number | null;
  clientId: number | null;
  createdAt: Date | null;
  updatedAt: Date | null;
  legacyId: number;
}

export interface InsertDocumento {
  title: string;
  path: string;
  revision: string;
  driveUrl: string;
  fileType: string;
  alertStatus?: string;
  expiryDate?: Date | null;
  parentId?: number | null;
  isObsolete?: boolean;
  fileHash?: string | null;
  encryptedCachePath?: string | null;
  clientId?: number;
  ownerId?: number;
  createdAt: Date | null;
  updatedAt: Date | null;
  legacyId: number;
}

export type InsertDocument = Omit<
  InsertDocumento,
  "legacyId" | "createdAt" | "updatedAt" | "expiryDate" | "alertStatus"
>;

export interface LogDocument {
  userId: number;
  action: string;
  documentId: number | null;
  details: any;
  timestamp: Date | null;
  legacyId: number;
}

export type InsertLog = Omit<LogDocument, "legacyId" | "timestamp">;
export type InsertUser = Omit<UserDocument, "legacyId" | "createdAt">;

export interface BackupDocument {
  legacyId: number;
  filename: string;
  filePath: string;
  fileSize: number;
  backupType: "complete" | "client_specific";
  createdBy: {
    userId: number;
    userEmail: string;
    userRole: string;
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
  isActive: boolean; // Indica se il file esiste ancora sul filesystem
  lastVerified: Date; // Ultima verifica dell'esistenza del file
}

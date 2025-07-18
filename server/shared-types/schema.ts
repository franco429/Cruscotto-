export interface UserDocument {
  legacyId: number;
  email: string;
  password: string;
  role: "superadmin" | "admin" | "viewer";
  clientId: number | null;
  lastLogin: Date | null;
  sessionExpiry: Date | null;
  createdAt: Date;
  failedLoginAttempts: number;
  lockoutUntil: Date | null;
}

export interface DocumentDocument {
  legacyId: number;
  title: string;
  path: string;
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

export type InsertUser = Omit<UserDocument, "legacyId" | "createdAt">;
export type InsertDocument = Omit<
  DocumentDocument,
  "legacyId" | "createdAt" | "updatedAt"
>;
export type InsertLog = Omit<LogDocument, "legacyId" | "timestamp">;

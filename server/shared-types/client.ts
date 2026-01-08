export interface ClientDocument {
  legacyId: number;
  name: string;
  driveFolderId: string;
  createdAt: Date;
  updatedAt: Date;
  google?: {
    accessToken?: string;
    refreshToken?: string;
    expiryDate?: number;
    syncToken?: string;
  };
  localOpenerConfig?: {
    drivePaths: string[];
    roots: string[];
  };
}

export type InsertClient = Omit<ClientDocument, "legacyId" | "createdAt" | "updatedAt">;

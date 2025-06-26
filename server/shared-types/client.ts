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
  };
}

export type InsertClient = Omit<ClientDocument, "legacyId" | "createdAt" | "updatedAt">;

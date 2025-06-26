export interface CompanyCodeDocument {
  legacyId: number;
  code: string;
  role: "admin" | "viewer";
  usageLimit: number;
  usageCount: number;
  expiresAt: Date | null;
  isActive: boolean;
  createdBy: number;
  createdAt: Date;
  updatedAt: Date;
}

export type InsertCompanyCode = Omit<CompanyCodeDocument, "legacyId" | "usageCount" | "createdAt" | "updatedAt">;

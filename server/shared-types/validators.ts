import { z } from "zod";

export const strongPasswordSchema = z
  .string()
  .min(8, "La password deve contenere almeno 8 caratteri")
  .regex(/[A-Z]/, "La password deve contenere almeno una lettera maiuscola")
  .regex(/[a-z]/, "La password deve contenere almeno una lettera minuscola")
  .regex(/\d/, "La password deve contenere almeno un numero")
  .regex(/[@$!%*?&]/, "La password deve contenere almeno un carattere speciale (@$!%*?&)")
  .refine((password) => {
    
    return /^[A-Za-z\d@$!%*?&]+$/.test(password);
  }, "La password contiene caratteri non permessi");

export const insertDocumentSchema = z.object({
  title: z.string(),
  path: z.string(),
  revision: z.string(),
  driveUrl: z.string().url(),
  fileType: z.string(),
  alertStatus: z.string().nullable(),
  parentId: z.number().nullable(),
  isObsolete: z.boolean().nullable(),
  fileHash: z.string().nullable(),
  encryptedCachePath: z.string().nullable(),
  expiryDate: z.date().nullable(),
  warningDays: z.number().optional(),
  clientId: z.number().nullable().optional(),
  ownerId: z.number().nullable().optional(),
});

export const insertUserSchema = z.object({
  email: z.string().email(),
  password: strongPasswordSchema, 
  role: z.enum(["superadmin", "admin", "viewer"]),
  clientId: z.number().nullable(),
  lastLogin: z.date().nullable(),
  sessionExpiry: z.date().nullable(),
});

export const insertLogSchema = z.object({
  userId: z.number(),
  action: z.string(),
  documentId: z.number().nullable().optional(),
  details: z.any(),
});

export const insertClientSchema = z.object({
  name: z.string().min(2, "Il nome dell'azienda è obbligatorio"),
  driveFolderId: z.string().min(1, "L'ID della cartella Drive è obbligatorio"),
});

export const verifyCompanyCodeSchema = z.object({
  code: z.string(),
});


export const loginSchema = z.object({
  email: z.string().email("Inserisci un indirizzo email valido"),
  password: z.string().min(1, "La password è obbligatoria"),
  remember: z.boolean().default(false),
});


export const registerAdminSchema = z.object({
  email: z.string().email("Inserisci un indirizzo email valido"),
  password: strongPasswordSchema,
  clientName: z.string().min(2, "Il nome dell'azienda è obbligatorio"),
  driveFolderUrl: z.string().url("Inserisci un URL valido per la cartella Google Drive"),
  companyCode: z.string().min(1, "Il codice aziendale è obbligatorio"),
});


export const documentSchema = z.object({
  title: z.string().min(1, "Il titolo è obbligatorio"),
  path: z.string().min(1, "Il percorso è obbligatorio"),
  revision: z.string().min(1, "La revisione è obbligatoria"),
  driveUrl: z.string().url("L'URL di Drive deve essere valido"),
  fileType: z.string().min(1, "Il tipo di file è obbligatorio"),
  alertStatus: z.string().optional().default("none"),
  expiryDate: z.date().nullable().optional(),
  parentId: z.number().nullable().optional(),
  isObsolete: z.boolean().optional().default(false),
  fileHash: z.string().nullable().optional(),
  encryptedCachePath: z.string().nullable().optional(),
  clientId: z.number().optional(),
  ownerId: z.number().optional(),
});


export const documentUpdateSchema = documentSchema.partial();

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "La password attuale è obbligatoria"),
  newPassword: strongPasswordSchema,
});

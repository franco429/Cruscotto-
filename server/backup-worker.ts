import { parentPort, workerData } from "worker_threads";
import * as fs from "fs";
import * as path from "path";
import mongoose from "mongoose";
import {
  UserModel,
  DocumentModel,
  LogModel,
  ClientModel,
  CompanyCodeModel,
  Counter,
  getNextSequence,
  BackupModel,
} from "./models/mongoose-models";
import * as dotenv from "dotenv";

interface BackupData {
  users: any[];
  documents: any[];
  logs: any[];
  clients: any[];
  companyCodes: any[];
  counters: any[];
  timestamp: string;
  version: string;
  createdBy: {
    userId: number;
    userEmail: string;
    userRole: string;
  };
  clientId?: number; // ID del client per cui è stato fatto il backup (null per backup completo)
  backupType: "complete" | "client_specific";
  metadata: {
    totalUsers: number;
    totalDocuments: number;
    totalLogs: number;
    totalClients: number;
    totalCompanyCodes: number;
  };
}

// 2. Carica le variabili d'ambiente specifiche per il worker
if (process.env.NODE_ENV === "production") {
  dotenv.config({ path: ".env.production" });
} else {
  dotenv.config();
}

// 3. Funzione per connettersi al database
async function connectToDB() {
  if (mongoose.connection.readyState === 0) {
    // Controlla se non è già connesso
    const dbUri = process.env.DB_URI;
    if (!dbUri) {
      throw new Error(
        "La variabile d'ambiente DB_URI non è configurata nel worker."
      );
    }
    try {
      await mongoose.connect(dbUri);
    } catch (error) {
      console.error("Errore di connessione a MongoDB nel worker:", error);
      throw error; // Lancia l'errore per fermare l'esecuzione
    }
  }
}

// Funzione per disconnettersi dal database
async function disconnectFromDB() {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
}

// Funzione helper per serializzare correttamente gli errori
function serializeError(error: unknown): string {
  if (error instanceof Error) {
    // Se è un'istanza di Error, includi messaggio e stack
    return error.message + (error.stack ? `\nStack: ${error.stack}` : "");
  }
  if (typeof error === "object" && error !== null) {
    // Prova a convertirlo in JSON, gestendo i riferimenti circolari
    try {
      return JSON.stringify(error, Object.getOwnPropertyNames(error));
    } catch (e) {
      // Se fallisce, usa la conversione standard
      return String(error);
    }
  }
  // Per tipi primitivi
  return String(error);
}

async function createBackup(backupOptions?: {
  createdBy: { userId: number; userEmail: string; userRole: string };
  clientId?: number;
}): Promise<{ success: boolean; backupPath?: string; error?: string }> {
  try {
    // 4. Assicurati che la connessione sia attiva prima di operare
    await connectToDB();
    const backupDir = path.join(process.cwd(), "backups");
    await fs.promises.mkdir(backupDir, { recursive: true });

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const isCompleteBackup = !backupOptions?.clientId;
    const clientSuffix = backupOptions?.clientId
      ? `_client_${backupOptions.clientId}`
      : "_complete";
    const filename = `backup${clientSuffix}_${timestamp}.json`;
    const backupPath = path.join(backupDir, filename);

    // Determina il tipo di backup e le query da eseguire
    let users, documents, logs, clients, companyCodes, counters;

    if (isCompleteBackup) {
      // Backup completo - solo per superadmin
      if (backupOptions?.createdBy.userRole !== "superadmin") {
        throw new Error("Solo i superadmin possono creare backup completi");
      }

      [users, documents, logs, clients, companyCodes, counters] =
        await Promise.all([
          UserModel.find().lean().exec(),
          DocumentModel.find().lean().exec(),
          LogModel.find().lean().exec(),
          ClientModel.find().lean().exec(),
          CompanyCodeModel.find().lean().exec(),
          Counter.find().lean().exec(),
        ]);
    } else {
      // Backup specifico per client
      const clientId = backupOptions!.clientId!;

      // Verifica che il client esista
      const client = await ClientModel.findOne({ legacyId: clientId })
        .lean()
        .exec();
      if (!client) {
        throw new Error(`Client con ID ${clientId} non trovato`);
      }

      // Per admin: backup solo del proprio client
      if (backupOptions?.createdBy.userRole === "admin") {
        // Verifica che l'admin appartenga al client
        const adminUser = await UserModel.findOne({
          legacyId: backupOptions.createdBy.userId,
          clientId: clientId,
        })
          .lean()
          .exec();

        if (!adminUser) {
          throw new Error(
            "Non hai i permessi per creare backup per questo client"
          );
        }
      }

      [users, documents, logs, clients, companyCodes, counters] =
        await Promise.all([
          UserModel.find({ clientId: clientId }).lean().exec(),
          DocumentModel.find({ clientId: clientId }).lean().exec(),
          LogModel.find({
            userId: {
              $in: await UserModel.find({ clientId: clientId })
                .distinct("legacyId")
                .exec(),
            },
          })
            .lean()
            .exec(),
          ClientModel.find({ legacyId: clientId }).lean().exec(),
          CompanyCodeModel.find({
            createdBy: {
              $in: await UserModel.find({ clientId: clientId })
                .distinct("legacyId")
                .exec(),
            },
          })
            .lean()
            .exec(),
          Counter.find().lean().exec(), 
        ]);
    }

    const data: BackupData = {
      users,
      documents,
      logs,
      clients,
      companyCodes,
      counters,
      timestamp: new Date().toISOString(),
      version: "2.0",
      createdBy: backupOptions?.createdBy || {
        userId: 0,
        userEmail: "system",
        userRole: "system",
      },
      clientId: backupOptions?.clientId || null,
      backupType: isCompleteBackup ? "complete" : "client_specific",
      metadata: {
        totalUsers: users.length,
        totalDocuments: documents.length,
        totalLogs: logs.length,
        totalClients: clients.length,
        totalCompanyCodes: companyCodes.length,
      },
    };

    // Scrivi il file di backup
    await fs.promises.writeFile(
      backupPath,
      JSON.stringify(data, null, 2),
      "utf8"
    );

    // Ottieni le informazioni del file
    const fileStats = fs.statSync(backupPath);

    // Salva i metadati nel database per persistenza
    const backupLegacyId = await getNextSequence("backupId");
    const backupRecord = new BackupModel({
      legacyId: backupLegacyId,
      filename: filename,
      filePath: backupPath,
      fileSize: fileStats.size,
      backupType: isCompleteBackup ? "complete" : "client_specific",
      createdBy: backupOptions?.createdBy || {
        userId: 0,
        userEmail: "system",
        userRole: "system",
      },
      clientId: backupOptions?.clientId || null,
      metadata: {
        totalUsers: users.length,
        totalDocuments: documents.length,
        totalLogs: logs.length,
        totalClients: clients.length,
        totalCompanyCodes: companyCodes.length,
      },
      isActive: true,
      lastVerified: new Date(),
    });

    await backupRecord.save();

    return { success: true, backupPath };
  } catch (error) {
    // Logga l'errore dettagliato nella console del server per il debug
    console.error("!!! Errore critico nel worker durante createBackup:", error);
    // Usa la nuova funzione per ottenere un messaggio di errore utile
    const errorMsg = serializeError(error);
    return {
      success: false,
      error: `Errore durante la creazione del backup nel worker: ${errorMsg}`,
    };
  } finally {
    // 5. Chiudi la sessione e la connessione
    await disconnectFromDB();
  }
}

async function restoreFromBackup(
  backupPath: string
): Promise<{ success: boolean; error?: string }> {
  // 4. Assicurati che la connessione sia attiva prima di operare
  await connectToDB();
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const backupData = JSON.parse(fs.readFileSync(backupPath, "utf-8"));

    if (
      !backupData.users ||
      !backupData.documents ||
      !backupData.logs ||
      !backupData.clients ||
      !backupData.companyCodes ||
      !backupData.counters
    ) {
      throw new Error("Il file di backup è incompleto o non valido.");
    }

    const isCompleteBackup = backupData.backupType === "complete";
    const clientId = backupData.clientId;

    if (isCompleteBackup) {
      // Ripristino completo - elimina tutto e ripristina tutto
      await Promise.all([
        UserModel.deleteMany({}, { session }),
        DocumentModel.deleteMany({}, { session }),
        LogModel.deleteMany({}, { session }),
        ClientModel.deleteMany({}, { session }),
        CompanyCodeModel.deleteMany({}, { session }),
        Counter.deleteMany({}, { session }),
      ]);

      // Inserisci tutto in parallelo
      const insertPromises = [];
      if (backupData.users.length > 0)
        insertPromises.push(
          UserModel.insertMany(backupData.users, { session })
        );
      if (backupData.documents.length > 0)
        insertPromises.push(
          DocumentModel.insertMany(backupData.documents, { session })
        );
      if (backupData.logs.length > 0)
        insertPromises.push(LogModel.insertMany(backupData.logs, { session }));
      if (backupData.clients.length > 0)
        insertPromises.push(
          ClientModel.insertMany(backupData.clients, { session })
        );
      if (backupData.companyCodes.length > 0)
        insertPromises.push(
          CompanyCodeModel.insertMany(backupData.companyCodes, { session })
        );
      if (backupData.counters.length > 0)
        insertPromises.push(
          Counter.insertMany(backupData.counters, { session })
        );

      await Promise.all(insertPromises);
    } else {
      // Ripristino specifico per client
      if (!clientId) {
        throw new Error(
          "Backup specifico per client senza clientId specificato"
        );
      }

      // Elimina solo i dati del client specifico
      const clientUserIds = backupData.users.map((user: any) => user.legacyId);

      await Promise.all([
        UserModel.deleteMany({ clientId: clientId }, { session }),
        DocumentModel.deleteMany({ clientId: clientId }, { session }),
        LogModel.deleteMany({ userId: { $in: clientUserIds } }, { session }),
        // Non eliminiamo i client perché potrebbero essere condivisi
        CompanyCodeModel.deleteMany(
          { createdBy: { $in: clientUserIds } },
          { session }
        ),
        // Non eliminiamo i counter perché sono globali
      ]);

      // Inserisci i dati del client
      const insertPromises = [];
      if (backupData.users.length > 0)
        insertPromises.push(
          UserModel.insertMany(backupData.users, { session })
        );
      if (backupData.documents.length > 0)
        insertPromises.push(
          DocumentModel.insertMany(backupData.documents, { session })
        );
      if (backupData.logs.length > 0)
        insertPromises.push(LogModel.insertMany(backupData.logs, { session }));
      if (backupData.clients.length > 0)
        insertPromises.push(
          ClientModel.insertMany(backupData.clients, { session })
        );
      if (backupData.companyCodes.length > 0)
        insertPromises.push(
          CompanyCodeModel.insertMany(backupData.companyCodes, { session })
        );
      // Non ripristiniamo i counter per i backup specifici per client

      await Promise.all(insertPromises);
    }

    await session.commitTransaction();

    return { success: true };
  } catch (error) {
    await session.abortTransaction();
    console.error(
      "!!! Errore critico nel worker durante restoreFromBackup:",
      error
    );
    const errorMsg = serializeError(error);
    return {
      success: false,
      error: `Errore durante il ripristino nel worker: ${errorMsg}`,
    };
  } finally {
    // 5. Chiudi la sessione e la connessione
    await session.endSession();
  }
}

// Gestione messaggi dal thread principale
if (parentPort) {
  parentPort.on("message", async (message) => {
    try {
      let result;

      switch (message.type) {
        case "CREATE_BACKUP":
          result = await createBackup(message.backupOptions);
          break;
        case "RESTORE_BACKUP":
          result = await restoreFromBackup(message.backupPath);
          break;
        default:
          result = {
            success: false,
            error: "Tipo di operazione non riconosciuto",
          };
      }

      parentPort!.postMessage(result);
    } catch (error) {
      const errorMsg = serializeError(error);
      parentPort!.postMessage({
        success: false,
        error: errorMsg,
      });
    } finally {
      // 6. Disconnetti dal DB dopo ogni operazione per non lasciare connessioni appese
      await disconnectFromDB();
    }
  });
}

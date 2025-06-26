import { parentPort, workerData } from 'worker_threads';
import * as fs from 'fs';
import * as path from 'path';
import mongoose from 'mongoose';
import { UserModel, DocumentModel, LogModel, ClientModel, CompanyCodeModel, Counter } from './models/mongoose-models';
import * as dotenv from 'dotenv';

interface BackupData {
  users: any[];
  documents: any[];
  logs: any[];
  clients: any[];
  companyCodes: any[];
  counters: any[];
  timestamp: string;
  version: string;
}

// 2. Carica le variabili d'ambiente specifiche per il worker
if (process.env.NODE_ENV === "production") {
  dotenv.config({ path: ".env.production" });
} else {
  dotenv.config();
}

// 3. Funzione per connettersi al database
async function connectToDB() {
  if (mongoose.connection.readyState === 0) { // Controlla se non è già connesso
    const dbUri = process.env.DB_URI;
    if (!dbUri) {
      throw new Error("La variabile d'ambiente DB_URI non è configurata nel worker.");
    }
    try {
      await mongoose.connect(dbUri);
      console.log('Worker connesso a MongoDB.');
    } catch (error) {
      console.error('Errore di connessione a MongoDB nel worker:', error);
      throw error; // Lancia l'errore per fermare l'esecuzione
    }
  }
}

// Funzione per disconnettersi dal database
async function disconnectFromDB() {
    if (mongoose.connection.readyState !== 0) {
        await mongoose.disconnect();
        console.log('Worker disconnesso da MongoDB.');
    }
}

// Funzione helper per serializzare correttamente gli errori
function serializeError(error: unknown): string {
  if (error instanceof Error) {
    // Se è un'istanza di Error, includi messaggio e stack
    return error.message + (error.stack ? `\nStack: ${error.stack}` : '');
  }
  if (typeof error === 'object' && error !== null) {
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

async function createBackup(): Promise<{ success: boolean; backupPath?: string; error?: string }> {
  try {
    // 4. Assicurati che la connessione sia attiva prima di operare
    await connectToDB();
    const backupDir = path.join(process.cwd(), "backups");
    await fs.promises.mkdir(backupDir, { recursive: true });
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const backupPath = path.join(backupDir, `backup_all_${timestamp}.json`);

    // Esegui tutte le query in parallelo per ottimizzare
    const [users, documents, logs, clients, companyCodes, counters] = await Promise.all([
      UserModel.find().lean().exec(),
      DocumentModel.find().lean().exec(),
      LogModel.find().lean().exec(),
      ClientModel.find().lean().exec(),
      CompanyCodeModel.find().lean().exec(),
      Counter.find().lean().exec()
    ]);

    const data: BackupData = {
      users,
      documents,
      logs,
      clients,
      companyCodes,
      counters,
      timestamp: new Date().toISOString(),
      version: "1.1",
    };

    await fs.promises.writeFile(backupPath, JSON.stringify(data, null, 2), "utf8");
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

async function restoreFromBackup(backupPath: string): Promise<{ success: boolean; error?: string }> {
  // 4. Assicurati che la connessione sia attiva prima di operare
  await connectToDB();
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    const backupData = JSON.parse(fs.readFileSync(backupPath, "utf-8"));

    if (!backupData.users || !backupData.documents || !backupData.logs || 
        !backupData.clients || !backupData.companyCodes || !backupData.counters) {
      throw new Error("Il file di backup è incompleto o non valido.");
    }

    // Elimina tutto in parallelo
    await Promise.all([
      UserModel.deleteMany({}, { session }),
      DocumentModel.deleteMany({}, { session }),
      LogModel.deleteMany({}, { session }),
      ClientModel.deleteMany({}, { session }),
      CompanyCodeModel.deleteMany({}, { session }),
      Counter.deleteMany({}, { session })
    ]);

    // Inserisci tutto in parallelo
    const insertPromises = [];
    if (backupData.users.length > 0) insertPromises.push(UserModel.insertMany(backupData.users, { session }));
    if (backupData.documents.length > 0) insertPromises.push(DocumentModel.insertMany(backupData.documents, { session }));
    if (backupData.logs.length > 0) insertPromises.push(LogModel.insertMany(backupData.logs, { session }));
    if (backupData.clients.length > 0) insertPromises.push(ClientModel.insertMany(backupData.clients, { session }));
    if (backupData.companyCodes.length > 0) insertPromises.push(CompanyCodeModel.insertMany(backupData.companyCodes, { session }));
    if (backupData.counters.length > 0) insertPromises.push(Counter.insertMany(backupData.counters, { session }));

    await Promise.all(insertPromises);
    await session.commitTransaction();
    
    return { success: true };
  } catch (error) {
    await session.abortTransaction();
    console.error("!!! Errore critico nel worker durante restoreFromBackup:", error);
    const errorMsg = serializeError(error);
    return { success: false, error: `Errore durante il ripristino nel worker: ${errorMsg}` };
  } finally {
    // 5. Chiudi la sessione e la connessione
    await session.endSession();
  }
}

// Gestione messaggi dal thread principale
if (parentPort) {
  parentPort.on('message', async (message) => {
    try {
      let result;
      
      switch (message.type) {
        case 'CREATE_BACKUP':
          result = await createBackup();
          break;
        case 'RESTORE_BACKUP':
          result = await restoreFromBackup(message.backupPath);
          break;
        default:
          result = { success: false, error: 'Tipo di operazione non riconosciuto' };
      }
      
      parentPort!.postMessage(result);
    } catch (error) {
      const errorMsg = serializeError(error);
      parentPort!.postMessage({
        success: false,
        error: errorMsg
      });
    } finally {
        // 6. Disconnetti dal DB dopo ogni operazione per non lasciare connessioni appese
        await disconnectFromDB();
    }
  });
} 
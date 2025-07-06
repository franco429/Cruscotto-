import mongoose from "mongoose";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";
import dotenv from "dotenv";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Carica le variabili d'ambiente dal file .env nella directory server
dotenv.config({ path: path.resolve(__dirname, "../.env") });

// Schema per i backup
const backupSchema = new mongoose.Schema({
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
      enum: ["superadmin", "admin", "viewer"],
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

const BackupModel = mongoose.model("Backup", backupSchema);

// Schema per i counter
const counterSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  seq: { type: Number, default: 0 },
});

const Counter = mongoose.model("Counter", counterSchema);

async function getNextSequence(name) {
  const counter = await Counter.findByIdAndUpdate(
    name,
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );
  return counter.seq;
}

async function migrateBackups() {
  try {
    console.log("🔗 Connessione al database...");
    await mongoose.connect(process.env.DB_URI);
    console.log("✅ Connesso al database");

    const backupDir = path.join(process.cwd(), "backups");

    if (!fs.existsSync(backupDir)) {
      console.log("📁 Cartella backup non trovata, creazione...");
      fs.mkdirSync(backupDir, { recursive: true });
      console.log("✅ Cartella backup creata");
      return;
    }

    console.log("📂 Scansione della cartella backup...");
    const files = fs.readdirSync(backupDir);
    const backupFiles = files.filter((file) => file.endsWith(".json"));

    console.log(`📊 Trovati ${backupFiles.length} file di backup`);

    let migratedCount = 0;
    let errorCount = 0;

    for (const filename of backupFiles) {
      try {
        console.log(`🔄 Elaborazione: ${filename}`);

        const filePath = path.join(backupDir, filename);
        const stats = fs.statSync(filePath);

        // Verifica se il backup esiste già nel database
        const existingBackup = await BackupModel.findOne({ filename }).exec();

        if (existingBackup) {
          console.log(`⏭️  Backup già presente nel database: ${filename}`);
          continue;
        }

        // Leggi i metadati dal file
        const backupData = JSON.parse(fs.readFileSync(filePath, "utf-8"));

        // Crea un nuovo record nel database
        const backupLegacyId = await getNextSequence("backupId");
        const backupRecord = new BackupModel({
          legacyId: backupLegacyId,
          filename: filename,
          filePath: filePath,
          fileSize: stats.size,
          backupType: backupData.backupType || "unknown",
          createdBy: backupData.createdBy || {
            userId: 0,
            userEmail: "system",
            userRole: "system",
          },
          clientId: backupData.clientId || null,
          metadata: backupData.metadata || {
            totalUsers: 0,
            totalDocuments: 0,
            totalLogs: 0,
            totalClients: 0,
            totalCompanyCodes: 0,
          },
          isActive: true,
          lastVerified: new Date(),
        });

        await backupRecord.save();
        migratedCount++;
        console.log(`✅ Backup migrato: ${filename}`);
      } catch (error) {
        console.error(
          `❌ Errore nella migrazione del backup ${filename}:`,
          error.message
        );
        errorCount++;
      }
    }

    console.log("\n📋 Riepilogo migrazione:");
    console.log(`✅ Backup migrati: ${migratedCount}`);
    console.log(`❌ Errori: ${errorCount}`);
    console.log(`📊 Totale file elaborati: ${backupFiles.length}`);

    if (migratedCount > 0) {
      console.log("\n🎉 Migrazione completata con successo!");
      console.log(
        "I backup sono ora persistenti nel database e saranno visibili anche dopo riavvii del server."
      );
    } else {
      console.log(
        "\nℹ️  Nessun backup da migrare o tutti i backup sono già presenti nel database."
      );
    }
  } catch (error) {
    console.error("❌ Errore durante la migrazione:", error);
  } finally {
    await mongoose.disconnect();
    console.log("🔌 Disconnesso dal database");
  }
}

// Esegui la migrazione se lo script viene chiamato direttamente
migrateBackups();

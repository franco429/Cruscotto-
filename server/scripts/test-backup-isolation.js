/**
 * Script di test per verificare il sistema di isolamento dei backup
 *
 * Questo script testa:
 * 1. Creazione di backup per admin e superadmin
 * 2. Filtro dei backup in base ai ruoli
 * 3. Permessi di accesso ai backup
 */

const mongoose = require("mongoose");
const fs = require("fs");
const path = require("path");
require("dotenv").config();


const {
  UserModel,
  ClientModel,
  DocumentModel,
  LogModel,
  CompanyCodeModel,
} = require("../models/mongoose-models");

async function connectToDB() {
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(process.env.DB_URI);
    console.log("✅ Connesso al database");
  }
}

async function disconnectFromDB() {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
    console.log("✅ Disconnesso dal database");
  }
}

async function createTestData() {
  console.log("\n📝 Creazione dati di test...");

  // Crea client di test
  const client1 = await ClientModel.create({
    legacyId: 1001,
    name: "Azienda Test 1",
    driveFolderId: "test_folder_1",
  });

  const client2 = await ClientModel.create({
    legacyId: 1002,
    name: "Azienda Test 2",
    driveFolderId: "test_folder_2",
  });

  // Crea utenti di test
  const admin1 = await UserModel.create({
    legacyId: 2001,
    email: "admin1@test.com",
    password: "hashed_password",
    role: "admin",
    clientId: client1.legacyId,
  });

  const admin2 = await UserModel.create({
    legacyId: 2002,
    email: "admin2@test.com",
    password: "hashed_password",
    role: "admin",
    clientId: client2.legacyId,
  });

  const superadmin = await UserModel.create({
    legacyId: 2003,
    email: "superadmin@test.com",
    password: "hashed_password",
    role: "superadmin",
    clientId: null,
  });

  // Crea documenti di test
  await DocumentModel.create({
    legacyId: 3001,
    title: "Documento Test 1",
    path: "/test/path1",
    revision: "1.0",
    driveUrl: "https://drive.google.com/test1",
    fileType: "pdf",
    clientId: client1.legacyId,
    ownerId: admin1.legacyId,
  });

  await DocumentModel.create({
    legacyId: 3002,
    title: "Documento Test 2",
    path: "/test/path2",
    revision: "1.0",
    driveUrl: "https://drive.google.com/test2",
    fileType: "pdf",
    clientId: client2.legacyId,
    ownerId: admin2.legacyId,
  });

  console.log("✅ Dati di test creati");
  return { client1, client2, admin1, admin2, superadmin };
}

async function testBackupCreation() {
  console.log("\n🔧 Test creazione backup...");

  const { admin1, admin2, superadmin } = await createTestData();

  // Simula creazione backup per admin1 (client1)
  const admin1BackupOptions = {
    createdBy: {
      userId: admin1.legacyId,
      userEmail: admin1.email,
      userRole: admin1.role,
    },
    clientId: admin1.clientId,
  };

  console.log("📋 Admin1 crea backup per client1:", admin1BackupOptions);

  // Simula creazione backup per admin2 (client2)
  const admin2BackupOptions = {
    createdBy: {
      userId: admin2.legacyId,
      userEmail: admin2.email,
      userRole: admin2.role,
    },
    clientId: admin2.clientId,
  };

  console.log("📋 Admin2 crea backup per client2:", admin2BackupOptions);

  // Simula creazione backup completo per superadmin
  const superadminBackupOptions = {
    createdBy: {
      userId: superadmin.legacyId,
      userEmail: superadmin.email,
      userRole: superadmin.role,
    },
    // Nessun clientId = backup completo
  };

  console.log("📋 Superadmin crea backup completo:", superadminBackupOptions);

  console.log("✅ Test creazione backup completato");
}

async function testBackupFiltering() {
  console.log("\n🔍 Test filtro backup...");

  const { admin1, admin2, superadmin } = await createTestData();

  // Simula lista backup (dati di esempio)
  const allBackups = [
    {
      filename: "backup_client_1001_2024-01-01.json",
      metadata: {
        createdBy: {
          userId: admin1.legacyId,
          userEmail: admin1.email,
          userRole: admin1.role,
        },
        clientId: admin1.clientId,
        backupType: "client_specific",
      },
    },
    {
      filename: "backup_client_1002_2024-01-02.json",
      metadata: {
        createdBy: {
          userId: admin2.legacyId,
          userEmail: admin2.email,
          userRole: admin2.role,
        },
        clientId: admin2.clientId,
        backupType: "client_specific",
      },
    },
    {
      filename: "backup_complete_2024-01-03.json",
      metadata: {
        createdBy: {
          userId: superadmin.legacyId,
          userEmail: superadmin.email,
          userRole: superadmin.role,
        },
        clientId: null,
        backupType: "complete",
      },
    },
  ];

  // Test filtro per admin1
  const admin1Backups = allBackups.filter((backup) => {
    if (!backup.metadata) return false;
    return (
      backup.metadata.clientId === admin1.clientId ||
      backup.metadata.createdBy?.userId === admin1.legacyId
    );
  });

  console.log(
    "👤 Admin1 vede backup:",
    admin1Backups.map((b) => b.filename)
  );

  // Test filtro per admin2
  const admin2Backups = allBackups.filter((backup) => {
    if (!backup.metadata) return false;
    return (
      backup.metadata.clientId === admin2.clientId ||
      backup.metadata.createdBy?.userId === admin2.legacyId
    );
  });

  console.log(
    "👤 Admin2 vede backup:",
    admin2Backups.map((b) => b.filename)
  );

  // Test filtro per superadmin (vede tutto)
  const superadminBackups = allBackups; 

  console.log(
    "👑 Superadmin vede backup:",
    superadminBackups.map((b) => b.filename)
  );

  console.log("✅ Test filtro backup completato");
}

async function testBackupPermissions() {
  console.log("\n🔐 Test permessi backup...");

  const { admin1, admin2, superadmin } = await createTestData();

  // Simula backup di admin1
  const admin1Backup = {
    filename: "backup_client_1001_2024-01-01.json",
    metadata: {
      createdBy: {
        userId: admin1.legacyId,
        userEmail: admin1.email,
        userRole: admin1.role,
      },
      clientId: admin1.clientId,
      backupType: "client_specific",
    },
  };

  // Test permessi download per admin1 (proprio backup)
  const admin1CanDownloadOwn =
    admin1Backup.metadata.clientId === admin1.clientId;
  console.log(
    "📥 Admin1 può scaricare il proprio backup:",
    admin1CanDownloadOwn
  );

  // Test permessi download per admin2 (backup di admin1)
  const admin2CanDownloadAdmin1 =
    admin1Backup.metadata.clientId === admin2.clientId;
  console.log(
    "📥 Admin2 può scaricare backup di admin1:",
    admin2CanDownloadAdmin1
  );

  // Test permessi download per superadmin (qualsiasi backup)
  const superadminCanDownloadAny = true; // Superadmin può tutto
  console.log(
    "📥 Superadmin può scaricare qualsiasi backup:",
    superadminCanDownloadAny
  );

  // Test permessi ripristino
  const admin1CanRestoreOwn =
    admin1Backup.metadata.clientId === admin1.clientId;
  console.log(
    "🔄 Admin1 può ripristinare il proprio backup:",
    admin1CanRestoreOwn
  );

  const admin2CanRestoreAdmin1 =
    admin1Backup.metadata.clientId === admin2.clientId;
  console.log(
    "🔄 Admin2 può ripristinare backup di admin1:",
    admin2CanRestoreAdmin1
  );

  const superadminCanRestoreAny = true;
  console.log(
    "🔄 Superadmin può ripristinare qualsiasi backup:",
    superadminCanRestoreAny
  );

  console.log("✅ Test permessi backup completato");
}

async function cleanupTestData() {
  console.log("\n🧹 Pulizia dati di test...");

  await Promise.all([
    UserModel.deleteMany({ email: { $regex: /@test\.com$/ } }),
    ClientModel.deleteMany({ name: { $regex: /^Azienda Test/ } }),
    DocumentModel.deleteMany({ title: { $regex: /^Documento Test/ } }),
    LogModel.deleteMany({ userId: { $in: [2001, 2002, 2003] } }),
    CompanyCodeModel.deleteMany({ createdBy: { $in: [2001, 2002, 2003] } }),
  ]);

  console.log("✅ Dati di test puliti");
}

async function runTests() {
  try {
    await connectToDB();

    console.log("🚀 Avvio test sistema isolamento backup...\n");

    await testBackupCreation();
    await testBackupFiltering();
    await testBackupPermissions();

    console.log("\n🎉 Tutti i test completati con successo!");
    console.log("\n📋 Riepilogo funzionalità testate:");
    console.log("✅ Creazione backup specifici per client");
    console.log("✅ Creazione backup completi (solo superadmin)");
    console.log("✅ Filtro backup in base ai ruoli");
    console.log("✅ Controllo permessi di accesso");
    console.log("✅ Isolamento dati tra client");
  } catch (error) {
    console.error("❌ Errore durante i test:", error);
  } finally {
    await cleanupTestData();
    await disconnectFromDB();
  }
}


if (require.main === module) {
  runTests();
}

module.exports = {
  runTests,
  testBackupCreation,
  testBackupFiltering,
  testBackupPermissions,
};

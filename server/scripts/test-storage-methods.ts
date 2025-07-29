#!/usr/bin/env node

import { mongoStorage } from "../mongo-storage.ts";

async function testStorageMethods() {
  try {
    console.log("🔍 Test dei metodi dello storage...\n");

    // Test connessione
    console.log("1. Test connessione database...");
    await mongoStorage.connect();
    console.log("✅ Connessione database OK\n");

    // Test metodo getClientsByAdminId
    console.log("2. Test getClientsByAdminId...");
    try {
      const clients = await mongoStorage.getClientsByAdminId(1);
      console.log(`✅ getClientsByAdminId OK - Trovati ${clients.length} clienti\n`);
    } catch (error) {
      console.log(`❌ getClientsByAdminId ERROR: ${error.message}\n`);
    }

    // Test metodo getDocumentsByClientId
    console.log("3. Test getDocumentsByClientId...");
    try {
      const documents = await mongoStorage.getDocumentsByClientId(1);
      console.log(`✅ getDocumentsByClientId OK - Trovati ${documents.length} documenti\n`);
    } catch (error) {
      console.log(`❌ getDocumentsByClientId ERROR: ${error.message}\n`);
    }

    // Test metodo getObsoleteDocumentsByClientId
    console.log("4. Test getObsoleteDocumentsByClientId...");
    try {
      const obsoleteDocs = await mongoStorage.getObsoleteDocumentsByClientId(1);
      console.log(`✅ getObsoleteDocumentsByClientId OK - Trovati ${obsoleteDocs.length} documenti obsoleti\n`);
    } catch (error) {
      console.log(`❌ getObsoleteDocumentsByClientId ERROR: ${error.message}\n`);
    }

    // Test metodo getUsersByClientIdWithPagination
    console.log("5. Test getUsersByClientIdWithPagination...");
    try {
      const result = await mongoStorage.getUsersByClientIdWithPagination(1, 10, 0);
      console.log(`✅ getUsersByClientIdWithPagination OK - Trovati ${result.users.length} utenti su ${result.total} totali\n`);
    } catch (error) {
      console.log(`❌ getUsersByClientIdWithPagination ERROR: ${error.message}\n`);
    }

    console.log("🎉 Test completati!");

  } catch (error) {
    console.error("❌ Errore generale:", error.message);
  } finally {
    process.exit(0);
  }
}

testStorageMethods(); 
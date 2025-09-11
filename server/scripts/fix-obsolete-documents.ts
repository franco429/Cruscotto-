import { MongoStorage } from "../mongo-storage";

async function fixObsoleteDocuments() {
  const mongoStorage = new MongoStorage();
  
  try {
    await mongoStorage.connect();
    console.log(" Connesso al database");

    // Ottieni tutti i client
    const clients = await mongoStorage.getAllClients();
    console.log(`📋 Trovati ${clients.length} client`);

    for (const client of clients) {
      console.log(`\n🔧 Elaborazione client: ${client.name} (ID: ${client.legacyId})`);
      
      // Prima ripristina tutti i documenti obsoleti per questo client
      const restoreResult = await mongoStorage.restoreAllObsoleteDocumentsForClient(client.legacyId);
      console.log(`   📄 Ripristinati ${restoreResult.restored} documenti obsoleti`);
      
      if (restoreResult.errors.length > 0) {
        console.log(`     Errori durante il ripristino:`, restoreResult.errors);
      }

      // Poi applica la logica corretta per marcare come obsoleti solo i documenti con revisioni inferiori
      await mongoStorage.markObsoleteRevisionsForClient(client.legacyId);
      console.log(`    Applicata logica corretta per documenti obsoleti`);

      // Verifica il risultato
      const obsoleteDocs = await mongoStorage.getObsoleteDocumentsByClientId(client.legacyId);
      console.log(`   📊 Documenti obsoleti dopo la correzione: ${obsoleteDocs.length}`);
    }

    console.log("\n Correzione completata con successo!");
    
  } catch (error) {
    console.error(" Errore durante la correzione:", error);
  } finally {
    await mongoStorage.cleanup();
  }
}

// Esegui lo script
fixObsoleteDocuments().catch(console.error); 
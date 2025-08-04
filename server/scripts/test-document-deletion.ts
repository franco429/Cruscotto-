import { mongoStorage } from "../mongo-storage";

async function testDocumentDeletion() {
  console.log("🧪 Test eliminazione definitiva documenti...\n");

  try {
    // Ottieni tutti i client
    const clients = await mongoStorage.getAllClients();
    
    for (const client of clients) {
      console.log(`📋 Testando client: ${client.name} (ID: ${client.legacyId})`);
      
      // Ottieni documenti attivi e obsoleti prima del test
      const activeDocsBefore = await mongoStorage.getDocumentsByClientId(client.legacyId);
      const obsoleteDocsBefore = await mongoStorage.getObsoleteDocumentsByClientId(client.legacyId);
      
      console.log(`   Documenti attivi prima: ${activeDocsBefore.length}`);
      console.log(`   Documenti obsoleti prima: ${obsoleteDocsBefore.length}`);
      
      // Se ci sono documenti obsoleti, testa l'eliminazione
      if (obsoleteDocsBefore.length > 0) {
        const testDoc = obsoleteDocsBefore[0];
        console.log(`   🗑️  Eliminando documento: ${testDoc.title} (ID: ${testDoc.legacyId})`);
        
        // Elimina il documento
        const deleteResult = await mongoStorage.deleteDocument(testDoc.legacyId);
        
        if (deleteResult) {
          console.log("   ✅ Documento eliminato con successo");
          
          // Verifica che il documento sia stato eliminato
          const deletedDoc = await mongoStorage.getDocument(testDoc.legacyId);
          if (!deletedDoc) {
            console.log("   ✅ Documento non più presente nel database");
          } else {
            console.log("   ❌ ERRORE: Documento ancora presente nel database");
          }
          
          // Verifica che non sia più in obsoleti
          const obsoleteDocsAfter = await mongoStorage.getObsoleteDocumentsByClientId(client.legacyId);
          const stillInObsolete = obsoleteDocsAfter.find(doc => doc.legacyId === testDoc.legacyId);
          
          if (!stillInObsolete) {
            console.log("   ✅ Documento non più presente in obsoleti");
          } else {
            console.log("   ❌ ERRORE: Documento ancora presente in obsoleti");
          }
          
        } else {
          console.log("   ❌ ERRORE: Eliminazione fallita");
        }
      } else {
        console.log("   ℹ️  Nessun documento obsoleto da testare");
      }
      
      console.log("");
    }
    
    console.log("✅ Test eliminazione documenti completato!");
    
  } catch (error) {
    console.error("❌ Errore durante il test:", error);
    process.exit(1);
  }
}

// Esegui il test
testDocumentDeletion().then(() => {
  console.log("🏁 Test completato");
  process.exit(0);
}).catch((error) => {
  console.error("💥 Errore fatale:", error);
  process.exit(1);
}); 
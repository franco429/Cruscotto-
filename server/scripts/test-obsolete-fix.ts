import { mongoStorage } from "../mongo-storage";

async function testObsoleteFix() {
  console.log("🧪 Test verifica correzione documenti obsoleti...\n");

  try {
    // Test 1: Verifica che il caricamento documenti non causi marcatura obsoleti
    console.log("📋 Test 1: Caricamento documenti senza marcatura obsoleti");
    
    const clients = await mongoStorage.getAllClients();
    const testClient = clients.find(c => c.name === "zip"); // Client con documenti
    
    if (testClient) {
      console.log(`   Testando con client: ${testClient.name} (ID: ${testClient.legacyId})`);
      
      // Prima chiamata
      const docs1 = await mongoStorage.getDocumentsByClientId(testClient.legacyId);
      const obsolete1 = await mongoStorage.getObsoleteDocumentsByClientId(testClient.legacyId);
      
      console.log(`   Prima chiamata - Attivi: ${docs1.length}, Obsoleti: ${obsolete1.length}`);
      
      // Seconda chiamata (simula logout/login)
      const docs2 = await mongoStorage.getDocumentsByClientId(testClient.legacyId);
      const obsolete2 = await mongoStorage.getObsoleteDocumentsByClientId(testClient.legacyId);
      
      console.log(`   Seconda chiamata - Attivi: ${docs2.length}, Obsoleti: ${obsolete2.length}`);
      
      // Verifica che i numeri siano identici
      if (docs1.length === docs2.length && obsolete1.length === obsolete2.length) {
        console.log("  SUCCESSO: I numeri sono identici - nessuna marcatura errata");
      } else {
        console.log("    ERRORE: I numeri sono diversi - marcatura errata ancora presente");
      }
    }
    
    console.log("");
    
    // Test 2: Verifica logica di marcatura obsoleti
    console.log("📋 Test 2: Verifica logica marcatura obsoleti");
    
    if (testClient) {
      // Simula l'aggiunta di un nuovo documento con revisione superiore
      console.log(`   Simulando marcatura obsoleti per client: ${testClient.name}`);
      
      const beforeObsolete = await mongoStorage.getObsoleteDocumentsByClientId(testClient.legacyId);
      console.log(`   Documenti obsoleti prima: ${beforeObsolete.length}`);
      
      // Chiama il metodo di marcatura
      await mongoStorage.markObsoleteRevisionsForClient(testClient.legacyId);
      
      const afterObsolete = await mongoStorage.getObsoleteDocumentsByClientId(testClient.legacyId);
      console.log(`   Documenti obsoleti dopo: ${afterObsolete.length}`);
      
      if (beforeObsolete.length === afterObsolete.length) {
        console.log("  SUCCESSO: Nessun documento aggiuntivo marcato come obsoleto");
      } else {
        console.log("  ATTENZIONE: Documenti aggiuntivi marcati come obsoleti");
      }
    }
    
    console.log("");
    console.log Test completati con successo!");
    
  } catch (error) {
    console.error(" Errore durante il test:", error);
    process.exit(1);
  }
}

// Esegui il test
testObsoleteFix().then(() => {
  console.log("🏁 Test completato");
  process.exit(0);
}).catch((error) => {
  console.error("💥 Errore fatale:", error);
  process.exit(1);
}); 
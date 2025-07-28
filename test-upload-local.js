#!/usr/bin/env node

/**
 * Test Upload Documenti Locali
 * 
 * Questo script testa l'endpoint di upload dei documenti locali
 */

import fs from 'fs';
import path from 'path';
import FormData from 'form-data';

console.log('🧪 Test Upload Documenti Locali\n');

// Test 1: Verifica endpoint
console.log('1️⃣ Verifica endpoint...');
try {
  const response = await fetch('http://localhost:5000/api/documents/local-upload', {
    method: 'POST',
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  
  if (response.status === 401) {
    console.log('✅ Endpoint raggiungibile (autenticazione richiesta)');
  } else {
    console.log('⚠️  Endpoint risponde con status:', response.status);
  }
} catch (error) {
  console.log('❌ Errore connessione al server:', error.message);
}

// Test 2: Verifica directory uploads
console.log('\n2️⃣ Verifica directory uploads...');
const uploadsDir = path.join(process.cwd(), 'server', 'uploads');
const previewsDir = path.join(uploadsDir, 'previews');

if (fs.existsSync(uploadsDir)) {
  console.log('✅ Directory uploads esistente');
} else {
  console.log('❌ Directory uploads mancante');
}

if (fs.existsSync(previewsDir)) {
  console.log('✅ Directory previews esistente');
} else {
  console.log('❌ Directory previews mancante');
}

// Test 3: Verifica permessi directory
console.log('\n3️⃣ Verifica permessi directory...');
try {
  const testFile = path.join(uploadsDir, 'test-write.txt');
  fs.writeFileSync(testFile, 'test');
  fs.unlinkSync(testFile);
  console.log('✅ Permessi scrittura OK');
} catch (error) {
  console.log('❌ Errore permessi scrittura:', error.message);
}

// Test 4: Verifica configurazione multer
console.log('\n4️⃣ Verifica configurazione multer...');
try {
  const routesContent = fs.readFileSync('server/routes.ts', 'utf8');
  
  const hasUploadEndpoint = routesContent.includes('/api/documents/local-upload');
  const hasMulterConfig = routesContent.includes('multer({ dest:');
  const hasProcessDocumentFile = routesContent.includes('processDocumentFile');
  
  if (hasUploadEndpoint) {
    console.log('✅ Endpoint upload configurato');
  } else {
    console.log('❌ Endpoint upload mancante');
  }
  
  if (hasMulterConfig) {
    console.log('✅ Multer configurato');
  } else {
    console.log('❌ Multer non configurato');
  }
  
  if (hasProcessDocumentFile) {
    console.log('✅ processDocumentFile importato');
  } else {
    console.log('❌ processDocumentFile mancante');
  }
  
} catch (error) {
  console.log('❌ Errore lettura routes.ts:', error.message);
}

// Test 5: Verifica logging
console.log('\n5️⃣ Verifica logging...');
try {
  const routesContent = fs.readFileSync('server/routes.ts', 'utf8');
  
  const hasLogging = routesContent.includes('logger.info') && 
                    routesContent.includes('logger.error') &&
                    routesContent.includes('logger.warn');
  
  if (hasLogging) {
    console.log('✅ Logging dettagliato implementato');
  } else {
    console.log('❌ Logging dettagliato mancante');
  }
  
} catch (error) {
  console.log('❌ Errore verifica logging:', error.message);
}

// Test 6: Riepilogo
console.log('\n🎉 Test completati!');
console.log('\n📋 Per testare l\'upload:');
console.log('   1. Accedi al sistema come admin');
console.log('   2. Vai su "Aggiorna documenti locali"');
console.log('   3. Seleziona i file da caricare');
console.log('   4. Verifica i log del server per dettagli');
console.log('\n📖 Se ci sono errori, controlla:');
console.log('   - Log del server per dettagli specifici');
console.log('   - Permessi directory uploads/');
console.log('   - Formato nomi file (deve rispettare pattern ISO)');
console.log('   - Autenticazione utente admin'); 
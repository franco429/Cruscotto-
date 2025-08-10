// Script per verificare se Inno Setup è disponibile e creare l'installer
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔍 Verifico se Inno Setup è installato...');

// Controlla se iscc è disponibile nel PATH
exec('iscc', (error, stdout, stderr) => {
  if (error) {
    console.log('❌ Inno Setup non trovato nel PATH');
    console.log('');
    console.log('📋 OPZIONI DISPONIBILI:');
    console.log('');
    console.log('1️⃣  VERSIONE PORTABLE (Raccomandato)');
    console.log('   npm run build:portable');
    console.log('   → Crea una versione pronta all\'uso senza installer');
    console.log('');
    console.log('2️⃣  INSTALLA INNO SETUP');
    console.log('   → Scarica da: https://jrsoftware.org/isinfo.php');
    console.log('   → Installa e riprova con: npm run build:installer');
    console.log('');
    console.log('3️⃣  VERSIONE PORTABLE AUTOMATICA');
    console.log('   → Creo automaticamente la versione portable...');
    console.log('');
    
    // Esegui automaticamente la versione portable
    createPortableVersion();
    return;
  }

  console.log('✅ Inno Setup trovato! Creo l\'installer...');
  
  // Esegui il build dell'installer
  const installerPath = path.join(__dirname, 'installer');
  process.chdir(installerPath);
  
  exec('iscc setup.iss', (error, stdout, stderr) => {
    if (error) {
      console.error('❌ Errore durante la creazione dell\'installer:', error.message);
      console.log('');
      console.log('🔄 Provo a creare la versione portable come alternativa...');
      createPortableVersion();
      return;
    }
    
    console.log('✅ Installer creato con successo!');
    console.log('📁 File: dist/cruscotto-local-opener-setup.exe');
    if (stdout) console.log('Output:', stdout);
  });
});

function createPortableVersion() {
  console.log('🚀 Creo la versione portable...');
  
  const createPortableScript = path.join(__dirname, 'create-portable.js');
  
  exec(`node "${createPortableScript}"`, (error, stdout, stderr) => {
    if (error) {
      console.error('❌ Errore durante la creazione della versione portable:', error.message);
      return;
    }
    
    console.log(stdout);
    if (stderr) console.log('Warnings:', stderr);
  });
}

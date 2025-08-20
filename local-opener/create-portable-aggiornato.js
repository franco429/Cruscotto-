// Script per creare il ZIP "AGGIORNATO" completo con tutti i file extra
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

console.log('🚀 Creazione ZIP AGGIORNATO completo...');

const portableDir = path.join(__dirname, 'dist', 'portable');
const downloadsDir = path.join(__dirname, '..', 'client', 'public', 'downloads');
const tempDir = path.join(__dirname, 'dist', 'temp-aggiornato');
const outputZip = path.join(downloadsDir, 'cruscotto-local-opener-portable-AGGIORNATO.zip');

// File extra da aggiungere dal downloads
const extraFiles = [
  'auto-detect-google-drive.ps1',
  'configura-servizio-sempre-attivo.ps1', 
  'cruscotto-local-opener-setup.exe',
  'debug-local-opener.bat',
  'DISINSTALLA-LOCAL-OPENER.bat',
  'DISINSTALLA-SEMPLICE.bat',
  'disinstalla-servizio-admin.ps1',
  'INSTALLA-COME-AMMINISTRATORE.bat',
  'installa-servizio-admin.ps1',
  'rimuovi-servizio-forzato.bat',
  'verifica-disinstallazione.bat',
  'verifica-servizio-sempre-attivo.bat'
];

// Verifica prerequisiti
if (!fs.existsSync(portableDir)) {
  console.error('❌ Cartella portable non trovata. Esegui prima: npm run build:portable');
  process.exit(1);
}

if (!fs.existsSync(downloadsDir)) {
  console.error('❌ Cartella downloads non trovata');
  process.exit(1);
}

// Pulisci e crea directory temporanea
if (fs.existsSync(tempDir)) {
  fs.rmSync(tempDir, { recursive: true, force: true });
}
fs.mkdirSync(tempDir, { recursive: true });

console.log('📁 Copio files da dist/portable...');

// Copia tutto dalla directory portable
copyRecursiveSync(portableDir, tempDir);

console.log('📁 Aggiungo files extra da downloads...');

// Aggiungi i file extra dalla directory downloads
let addedCount = 0;
extraFiles.forEach(filename => {
  const sourcePath = path.join(downloadsDir, filename);
  const destPath = path.join(tempDir, filename);
  
  if (fs.existsSync(sourcePath)) {
    fs.copyFileSync(sourcePath, destPath);
    console.log(`✅ Aggiunto: ${filename}`);
    addedCount++;
  } else {
    console.log(`⚠️  Non trovato: ${filename}`);
  }
});

console.log(`📊 Aggiunti ${addedCount}/${extraFiles.length} file extra`);

// Rimuovi ZIP esistente
if (fs.existsSync(outputZip)) {
  fs.unlinkSync(outputZip);
  console.log('🗑️  Rimosso ZIP esistente');
}

// Crea il nuovo ZIP
console.log('📦 Creazione ZIP completo...');

const zipCommand = `powershell -Command "Compress-Archive -Path '${tempDir}\\*' -DestinationPath '${outputZip}' -Force"`;

exec(zipCommand, (error, stdout, stderr) => {
  if (error) {
    console.error('❌ Errore nella creazione ZIP:', error);
    process.exit(1);
  }
  
  if (stderr) {
    console.log('⚠️  Warnings:', stderr);
  }
  
  // Pulisci directory temporanea
  fs.rmSync(tempDir, { recursive: true, force: true });
  
  console.log('✅ ZIP AGGIORNATO creato con successo!');
  console.log(`📁 Output: ${outputZip}`);
  
  // Verifica dimensione
  try {
    const stats = fs.statSync(outputZip);
    const fileSizeMB = (stats.size / (1024 * 1024)).toFixed(2);
    console.log(`📊 Dimensione: ${fileSizeMB} MB`);
  } catch (err) {
    console.log('Could not get file size');
  }
  
  console.log('🎉 Il file ZIP è pronto per il download dal frontend!');
});

function copyRecursiveSync(src, dest) {
  const exists = fs.existsSync(src);
  const stats = exists && fs.statSync(src);
  const isDirectory = exists && stats.isDirectory();
  
  if (isDirectory) {
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }
    fs.readdirSync(src).forEach((childItemName) => {
      copyRecursiveSync(
        path.join(src, childItemName),
        path.join(dest, childItemName)
      );
    });
  } else {
    fs.copyFileSync(src, dest);
  }
}

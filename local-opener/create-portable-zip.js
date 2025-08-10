// Script per creare un ZIP della versione portable
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

console.log('Creating portable ZIP package...');

const portableDir = 'dist/portable';
const outputZip = '../client/public/downloads/cruscotto-local-opener-portable.zip';

// Verifica che la cartella portable esista
if (!fs.existsSync(portableDir)) {
  console.error('❌ Portable directory not found. Run "npm run build:universal" first.');
  process.exit(1);
}

// Assicurati che la cartella downloads esista
const downloadsDir = path.dirname(path.join(__dirname, outputZip));
if (!fs.existsSync(downloadsDir)) {
  fs.mkdirSync(downloadsDir, { recursive: true });
}

// Usa PowerShell per creare lo ZIP (disponibile su tutti i Windows moderni)
const zipCommand = `powershell -Command "Compress-Archive -Path '${portableDir}\\*' -DestinationPath '${path.resolve(outputZip)}' -Force"`;

console.log('📦 Creating ZIP archive...');

exec(zipCommand, (error, stdout, stderr) => {
  if (error) {
    console.error('❌ ZIP creation failed:', error);
    
    // Fallback: prova con 7-Zip se disponibile
    console.log('🔄 Trying alternative method...');
    const sevenZipCommand = `7z a "${path.resolve(outputZip)}" "${portableDir}\\*"`;
    
    exec(sevenZipCommand, (fallbackError, fallbackStdout, fallbackStderr) => {
      if (fallbackError) {
        console.error('❌ Alternative method failed. Please install 7-Zip or use PowerShell manually.');
        console.log('Manual command:', zipCommand);
        process.exit(1);
      }
      
      console.log('✅ ZIP created successfully with 7-Zip!');
      console.log(`📁 Output: ${outputZip}`);
    });
    
    return;
  }
  
  if (stderr) {
    console.log('Warnings:', stderr);
  }
  
  console.log('✅ Portable ZIP created successfully!');
  console.log(`📁 Output: ${outputZip}`);
  
  // Verifica dimensione file
  try {
    const stats = fs.statSync(path.resolve(outputZip));
    const fileSizeMB = (stats.size / (1024 * 1024)).toFixed(2);
    console.log(`📊 File size: ${fileSizeMB} MB`);
  } catch (err) {
    console.log('Could not get file size');
  }
});

// Script universale per creare sia installer che versione portable
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('Building Universal Local Opener for Windows...');

// Assicurati che la cartella dist esista
if (!fs.existsSync('dist')) {
  fs.mkdirSync('dist');
}

// Crea entrambe le architetture per compatibilità universale
const targets = ['node20-win-x64', 'node20-win-arm64'];
let completedBuilds = 0;

function buildForTarget(target) {
  return new Promise((resolve, reject) => {
    const archSuffix = target.includes('arm64') ? '-arm64' : '-x64';
    const outputName = `local-opener${archSuffix}.exe`;
    const pkgCmd = `pkg . --targets ${target} --output dist/${outputName}`;
    
    console.log(`🔨 Building for ${target}...`);
    
    exec(pkgCmd, (error, stdout, stderr) => {
      if (error) {
        console.error(`Build failed for ${target}:`, error);
        reject(error);
        return;
      }
      
      console.log(`✅ ${target} build completed!`);
      if (stderr) console.log(`Warnings for ${target}:`, stderr);
      
      completedBuilds++;
      resolve({ target, outputName });
    });
  });
}

// Build parallelo per entrambe le architetture (con gestione errori)
Promise.allSettled(targets.map(buildForTarget))
  .then((results) => {
    const successful = results
      .filter(r => r.status === 'fulfilled')
      .map(r => r.value);
    
    const failed = results
      .filter(r => r.status === 'rejected')
      .map(r => r.reason);
    
    console.log(`🎉 Build completed: ${successful.length} successful, ${failed.length} failed`);
    
    if (failed.length > 0) {
      console.log('⚠️ Failed builds:');
      failed.forEach(error => {
        console.log(`  - ${error.target || 'unknown'}: ${error.message || error}`);
      });
    }
    
    // Crea versione principale (x64 come default)
    const x64Build = successful.find(r => r.target.includes('x64'));
    if (x64Build) {
      fs.copyFileSync(`dist/${x64Build.outputName}`, 'dist/local-opener.exe');
      console.log('📁 Created main executable: local-opener.exe');
    }
    
    // Copia assets
    const assetsDir = 'assets';
    const distAssetsDir = 'dist/assets';
    
    if (fs.existsSync(assetsDir)) {
      if (!fs.existsSync(distAssetsDir)) {
        fs.mkdirSync(distAssetsDir, { recursive: true });
      }
      copyRecursiveSync(assetsDir, distAssetsDir);
      console.log('📁 Assets copied to dist/assets');
    }
    
    // Crea versione portable con i build riusciti
    createPortableVersion(successful);
    
    console.log('🚀 Ready to build installer with: npm run build:installer');
  })
  .catch((error) => {
    console.error('❌ Build process failed:', error);
    process.exit(1);
  });

function createPortableVersion(successfulBuilds = []) {
  const portableDir = 'dist/portable';
  if (!fs.existsSync(portableDir)) {
    fs.mkdirSync(portableDir, { recursive: true });
  }
  
  console.log('📦 Creating portable version...');
  
  // Copia eseguibili basato sui build riusciti
  successfulBuilds.forEach(build => {
    const sourcePath = `dist/${build.outputName}`;
    const destPath = `${portableDir}/${build.outputName}`;
    if (fs.existsSync(sourcePath)) {
      fs.copyFileSync(sourcePath, destPath);
      console.log(`✅ Copied ${build.outputName} to portable`);
    }
  });
  
  // Fallback: copia i file che esistono
  const fallbackFiles = ['local-opener-x64.exe', 'local-opener-arm64.exe', 'local-opener-x86.exe'];
  fallbackFiles.forEach(fileName => {
    const sourcePath = `dist/${fileName}`;
    const destPath = `${portableDir}/${fileName}`;
    if (fs.existsSync(sourcePath) && !fs.existsSync(destPath)) {
      fs.copyFileSync(sourcePath, destPath);
      console.log(`✅ Fallback copied ${fileName} to portable`);
    }
  });
  
  // Copia assets per versione portable
  if (fs.existsSync('dist/assets')) {
    copyRecursiveSync('dist/assets', `${portableDir}/assets`);
  }
  
  // Crea script di avvio automatico
  const startScript = `@echo off
echo Cruscotto Local Opener - Versione Portable
echo ==========================================

rem Rileva architettura sistema
if "%PROCESSOR_ARCHITECTURE%"=="ARM64" (
    set ARCH=arm64
    set EXE=local-opener-arm64.exe
) else (
    set ARCH=x64
    set EXE=local-opener-x64.exe
)

echo Architettura rilevata: %ARCH%
echo.

rem Verifica se l'eseguibile esiste
if not exist "%EXE%" (
    echo ERRORE: Eseguibile %EXE% non trovato!
    echo Assicurati di aver estratto tutti i file.
    pause
    exit /b 1
)

echo Avvio di %EXE%...
start "" "%EXE%"

echo.
echo Local Opener avviato con successo!
echo Puoi chiudere questa finestra.
echo.
pause
`;

  fs.writeFileSync(`${portableDir}/start.bat`, startScript);
  
  // Crea README per versione portable
  const portableReadme = `CRUSCOTTO LOCAL OPENER - VERSIONE PORTABLE
=========================================

Questa è la versione portable di Cruscotto Local Opener che non richiede installazione.

ISTRUZIONI:
1. Estrai tutti i file in una cartella
2. Esegui "start.bat" per avviare l'applicazione
3. Il sistema rileverà automaticamente la tua architettura

ARCHITETTURE SUPPORTATE:
- Intel/AMD x64: local-opener-x64.exe
- ARM64: local-opener-arm64.exe

NOTA IMPORTANTE:
- Questa versione non si installa come servizio Windows
- Devi avviarla manualmente ogni volta
- Per l'avvio automatico, usa la versione installer

Per supporto: https://cruscotto-sgi.onrender.com
`;

  fs.writeFileSync(`${portableDir}/README-PORTABLE.txt`, portableReadme);
  
  console.log('📦 Portable version created in dist/portable/');
}

function copyRecursiveSync(src, dest) {
  const exists = fs.existsSync(src);
  const stats = exists && fs.statSync(src);
  const isDirectory = exists && stats.isDirectory();
  
  if (isDirectory) {
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest);
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

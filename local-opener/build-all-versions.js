// Script completo per buildare tutte le versioni con massima compatibilità
const { exec, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Building ALL versions for maximum Windows compatibility...');
console.log('='.repeat(60));

// Configurazione
const BUILD_CONFIG = {
  targets: [
    { name: 'x64', pkg: 'node20-win-x64' },
    { name: 'arm64', pkg: 'node20-win-arm64' },
    { name: 'x86', pkg: 'node20-win-x86' } // Aggiunto supporto 32-bit per vecchi sistemi
  ],
  outputDir: 'dist',
  clientDownloadsDir: '../client/public/downloads'
};

// Funzioni utility
function createDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function copyRecursiveSync(src, dest) {
  const exists = fs.existsSync(src);
  const stats = exists && fs.statSync(src);
  const isDirectory = exists && stats.isDirectory();
  
  if (isDirectory) {
    createDir(dest);
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

function runCommand(command, description) {
  return new Promise((resolve, reject) => {
    console.log(`🔨 ${description}...`);
    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error(`❌ ${description} failed:`, error.message);
        reject(error);
        return;
      }
      if (stderr) console.log(`⚠️ ${description} warnings:`, stderr);
      console.log(`✅ ${description} completed!`);
      resolve(stdout);
    });
  });
}

// Funzione principale
async function buildAll() {
  try {
    // 1. Cleanup e preparazione
    console.log('📁 Preparing directories...');
    createDir(BUILD_CONFIG.outputDir);
    createDir(BUILD_CONFIG.clientDownloadsDir);
    
    // 2. Build per tutte le architetture
    console.log('\n🏗️ Building executables for all architectures...');
    const buildPromises = BUILD_CONFIG.targets.map(target => {
      const outputName = `local-opener-${target.name}.exe`;
      const command = `pkg . --targets ${target.pkg} --output ${BUILD_CONFIG.outputDir}/${outputName}`;
      return runCommand(command, `Building ${target.name} version`);
    });
    
    await Promise.all(buildPromises);
    
    // 3. Crea versione principale (x64 come default)
    const mainExe = `${BUILD_CONFIG.outputDir}/local-opener.exe`;
    const x64Exe = `${BUILD_CONFIG.outputDir}/local-opener-x64.exe`;
    if (fs.existsSync(x64Exe)) {
      fs.copyFileSync(x64Exe, mainExe);
      console.log('✅ Created main executable (x64 default)');
    }
    
    // 4. Copia assets
    console.log('\n📦 Copying assets...');
    if (fs.existsSync('assets')) {
      copyRecursiveSync('assets', `${BUILD_CONFIG.outputDir}/assets`);
      console.log('✅ Assets copied');
    }
    
    // 5. Crea versione portable con rilevamento automatico
    console.log('\n🎒 Creating portable version...');
    const portableDir = `${BUILD_CONFIG.outputDir}/portable`;
    createDir(portableDir);
    
    // Copia tutti gli eseguibili
    BUILD_CONFIG.targets.forEach(target => {
      const sourceExe = `${BUILD_CONFIG.outputDir}/local-opener-${target.name}.exe`;
      if (fs.existsSync(sourceExe)) {
        fs.copyFileSync(sourceExe, `${portableDir}/local-opener-${target.name}.exe`);
      }
    });
    
    // Copia assets per portable
    if (fs.existsSync(`${BUILD_CONFIG.outputDir}/assets`)) {
      copyRecursiveSync(`${BUILD_CONFIG.outputDir}/assets`, `${portableDir}/assets`);
    }
    
    // Crea script di avvio intelligente
    const smartLauncher = `@echo off
title Cruscotto Local Opener - Avvio Automatico
echo.
echo ==========================================
echo   CRUSCOTTO LOCAL OPENER - Portable
echo ==========================================
echo.

rem Rileva architettura sistema in modo avanzato
set "ARCH=unknown"
set "EXE="

rem Prova PROCESSOR_ARCHITECTURE
if /i "%PROCESSOR_ARCHITECTURE%"=="ARM64" (
    set ARCH=arm64
    set EXE=local-opener-arm64.exe
    goto :found
)

rem Prova PROCESSOR_ARCHITEW6432 (per processi 32-bit su 64-bit)
if /i "%PROCESSOR_ARCHITEW6432%"=="ARM64" (
    set ARCH=arm64
    set EXE=local-opener-arm64.exe
    goto :found
)

rem Controlla se x64 è disponibile
if /i "%PROCESSOR_ARCHITECTURE%"=="AMD64" (
    set ARCH=x64
    set EXE=local-opener-x64.exe
    goto :found
)

if /i "%PROCESSOR_ARCHITEW6432%"=="AMD64" (
    set ARCH=x64
    set EXE=local-opener-x64.exe
    goto :found
)

rem Fallback a x86 per sistemi vecchi
if exist "local-opener-x86.exe" (
    set ARCH=x86
    set EXE=local-opener-x86.exe
    goto :found
)

rem Ultimo fallback a x64
if exist "local-opener-x64.exe" (
    set ARCH=x64
    set EXE=local-opener-x64.exe
    goto :found
)

:found
echo Architettura rilevata: %ARCH%
echo Eseguibile selezionato: %EXE%
echo.

if "%EXE%"=="" (
    echo ❌ ERRORE: Nessun eseguibile compatibile trovato!
    echo.
    echo Eseguibili disponibili:
    dir /b *.exe 2>nul
    echo.
    echo Contatta il supporto tecnico.
    pause
    exit /b 1
)

if not exist "%EXE%" (
    echo ❌ ERRORE: %EXE% non trovato!
    echo.
    echo Verifica che tutti i file siano stati estratti correttamente.
    pause
    exit /b 1
)

echo ✅ Avvio di %EXE%...
echo.

rem Prova ad avviare come servizio se possibile, altrimenti modalità diretta
echo Tentativo avvio come servizio...
start "" "%EXE%" --service 2>nul
if errorlevel 1 (
    echo Modalità servizio non disponibile, avvio diretto...
    start "" "%EXE%"
)

echo.
echo ✅ Local Opener avviato con successo!
echo.
echo Il servizio è ora attivo in background.
echo Puoi chiudere questa finestra e tornare al browser.
echo.
echo Per arrestare il servizio, usa il Task Manager di Windows.
echo.
pause
`;

    fs.writeFileSync(`${portableDir}/start.bat`, smartLauncher);
    
    // Crea README dettagliato per portable
    const portableReadme = `CRUSCOTTO LOCAL OPENER - VERSIONE PORTABLE
=========================================

🎯 COMPATIBILITÀ UNIVERSALE WINDOWS
- Windows 7 SP1+ (con aggiornamenti)
- Windows 8/8.1
- Windows 10 (tutte le versioni)
- Windows 11 (tutte le versioni)
- Windows Server 2008 R2+

🏗️ ARCHITETTURE SUPPORTATE
- Intel/AMD x86 (32-bit) - per sistemi legacy
- Intel/AMD x64 (64-bit) - standard moderno
- ARM64 - per dispositivi Windows ARM

🚀 ISTRUZIONI RAPIDE
1. Estrai tutti i file in una cartella
2. Esegui "start.bat" come amministratore
3. Il sistema rileverà automaticamente l'architettura
4. Torna al browser Cruscotto per configurare le cartelle

⚙️ AVVIO MANUALE (se start.bat non funziona)
- Sistema x64: esegui "local-opener-x64.exe"
- Sistema ARM64: esegui "local-opener-arm64.exe"  
- Sistema x86: esegui "local-opener-x86.exe"

🔧 RISOLUZIONE PROBLEMI
1. Esegui sempre come amministratore
2. Aggiungi eccezione in Windows Defender/Antivirus
3. Se start.bat non funziona, prova esecuzione manuale
4. Controlla che la porta 17654 non sia occupata

📞 SUPPORTO
Se hai problemi, contatta il supporto tecnico con:
- Versione Windows (winver)
- Architettura sistema
- Messaggi di errore completi

Pannello SGI © 2024
https://cruscotto-sgi.onrender.com
`;

    fs.writeFileSync(`${portableDir}/README-PORTABLE.txt`, portableReadme);
    
    // 6. Crea ZIP portable
    console.log('\n📦 Creating portable ZIP...');
    await createPortableZip(portableDir);
    
    // 7. Build installer con Inno Setup (se disponibile)
    console.log('\n🛠️ Creating Windows installer...');
    try {
      await runCommand('node check-inno-setup.js', 'Checking Inno Setup availability');
    } catch (error) {
      console.log('⚠️ Inno Setup not available, skipping installer creation');
      console.log('💡 Install Inno Setup to create Windows installer automatically');
    }
    
    // 8. Copia file nella cartella downloads del client
    console.log('\n📂 Copying files to client downloads...');
    const filesToCopy = [
      { src: `${BUILD_CONFIG.outputDir}/local-opener.exe`, dest: `${BUILD_CONFIG.clientDownloadsDir}/cruscotto-local-opener.exe` },
      { src: `installer/../dist/cruscotto-local-opener-setup.exe`, dest: `${BUILD_CONFIG.clientDownloadsDir}/cruscotto-local-opener-setup.exe` }
    ];
    
    filesToCopy.forEach(({ src, dest }) => {
      if (fs.existsSync(src)) {
        fs.copyFileSync(src, dest);
        console.log(`✅ Copied ${path.basename(dest)}`);
      } else {
        console.log(`⚠️ ${src} not found, skipped`);
      }
    });
    
    console.log('\n' + '='.repeat(60));
    console.log('🎉 BUILD COMPLETED SUCCESSFULLY!');
    console.log('='.repeat(60));
    console.log('\n📋 BUILD SUMMARY:');
    console.log(`✅ Executables: ${BUILD_CONFIG.targets.length} architectures`);
    console.log(`✅ Portable version: ${portableDir}/`);
    console.log(`✅ Client downloads updated`);
    console.log('\n🚀 Ready for deployment!');
    
  } catch (error) {
    console.error('\n❌ BUILD FAILED:', error);
    process.exit(1);
  }
}

async function createPortableZip(portableDir) {
  const zipPath = `${BUILD_CONFIG.clientDownloadsDir}/cruscotto-local-opener-portable.zip`;
  
  // Prova PowerShell prima (disponibile su Windows 10+)
  const powershellCmd = `powershell -Command "Compress-Archive -Path '${portableDir}\\*' -DestinationPath '${path.resolve(zipPath)}' -Force"`;
  
  try {
    await runCommand(powershellCmd, 'Creating ZIP with PowerShell');
    return;
  } catch (error) {
    console.log('⚠️ PowerShell compression failed, trying alternatives...');
  }
  
  // Fallback: 7-Zip
  try {
    const sevenZipCmd = `7z a "${path.resolve(zipPath)}" "${portableDir}\\*"`;
    await runCommand(sevenZipCmd, 'Creating ZIP with 7-Zip');
    return;
  } catch (error) {
    console.log('⚠️ 7-Zip not available');
  }
  
  // Ultimo fallback: WinRAR
  try {
    const winrarCmd = `winrar a "${path.resolve(zipPath)}" "${portableDir}\\*"`;
    await runCommand(winrarCmd, 'Creating ZIP with WinRAR');
    return;
  } catch (error) {
    console.log('⚠️ WinRAR not available');
  }
  
  console.log('❌ No compression tool available. Please install PowerShell, 7-Zip, or WinRAR');
  console.log(`💡 Manual: Compress ${portableDir} to ${zipPath}`);
}

// Esegui build
buildAll();

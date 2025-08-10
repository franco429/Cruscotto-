// Script pragmatico per massima compatibilità Windows
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Building COMPATIBLE versions for maximum Windows support...');
console.log('='.repeat(60));

// Configurazione pragmatica - focus su quello che funziona con pkg
const BUILD_CONFIG = {
  primaryTarget: 'node16-win-x64',  // Primario: più compatibile con pkg
  fallbackTargets: [                // Secondari: se possibile
    'node16-win-x86',               // Per Windows vecchi
    'node14-win-x64'                // Per massima compatibilità legacy
  ],
  outputDir: 'dist',
  clientDownloadsDir: '../client/public/downloads'
};

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

function runCommand(command, description, required = true) {
  return new Promise((resolve, reject) => {
    console.log(`🔨 ${description}...`);
    exec(command, (error, stdout, stderr) => {
      if (error) {
        if (required) {
          console.error(`❌ ${description} failed:`, error.message);
          reject(error);
        } else {
          console.log(`⚠️ ${description} skipped (optional):`, error.message);
          resolve({ skipped: true, reason: error.message });
        }
        return;
      }
      if (stderr) console.log(`⚠️ ${description} warnings:`, stderr);
      console.log(`✅ ${description} completed!`);
      resolve({ success: true, output: stdout });
    });
  });
}

async function buildCompatible() {
  try {
    // 1. Setup
    console.log('📁 Preparing directories...');
    createDir(BUILD_CONFIG.outputDir);
    createDir(BUILD_CONFIG.clientDownloadsDir);
    
    // 2. Build principale (DEVE funzionare)
    console.log('\n🏗️ Building primary executable (x64)...');
    const primaryCmd = `pkg . --targets ${BUILD_CONFIG.primaryTarget} --output ${BUILD_CONFIG.outputDir}/local-opener.exe`;
    await runCommand(primaryCmd, 'Building x64 version (required)', true);
    
    // 3. Build alternativi (opzionali)
    console.log('\n🔧 Building fallback versions...');
    const alternativeBuilds = [];
    
    for (const target of BUILD_CONFIG.fallbackTargets) {
      const archName = target.includes('x86') ? 'x86' : target.includes('node18') ? 'x64-legacy' : 'unknown';
      const outputName = `local-opener-${archName}.exe`;
      const cmd = `pkg . --targets ${target} --output ${BUILD_CONFIG.outputDir}/${outputName}`;
      
      try {
        const result = await runCommand(cmd, `Building ${archName} version`, false);
        if (result.success) {
          alternativeBuilds.push({ name: archName, file: outputName });
        }
      } catch (error) {
        console.log(`⚠️ ${archName} build failed, continuing...`);
      }
    }
    
    // 4. Assets
    console.log('\n📦 Copying assets...');
    if (fs.existsSync('assets')) {
      copyRecursiveSync('assets', `${BUILD_CONFIG.outputDir}/assets`);
      console.log('✅ Assets copied');
    }
    
    // 5. Versione portable
    console.log('\n🎒 Creating portable version...');
    const portableDir = `${BUILD_CONFIG.outputDir}/portable`;
    createDir(portableDir);
    
    // Copia eseguibile principale
    fs.copyFileSync(
      `${BUILD_CONFIG.outputDir}/local-opener.exe`,
      `${portableDir}/local-opener-x64.exe`
    );
    console.log('✅ Copied main executable to portable');
    
    // Copia build alternativi che sono riusciti
    alternativeBuilds.forEach(build => {
      const source = `${BUILD_CONFIG.outputDir}/${build.file}`;
      const dest = `${portableDir}/${build.file}`;
      if (fs.existsSync(source)) {
        fs.copyFileSync(source, dest);
        console.log(`✅ Copied ${build.name} to portable`);
      }
    });
    
    // Assets per portable
    if (fs.existsSync(`${BUILD_CONFIG.outputDir}/assets`)) {
      copyRecursiveSync(`${BUILD_CONFIG.outputDir}/assets`, `${portableDir}/assets`);
    }
    
    // Script di avvio intelligente
    const launcherScript = `@echo off
title Cruscotto Local Opener - Compatibilità Universale
echo.
echo ==========================================
echo   CRUSCOTTO LOCAL OPENER - Portable
echo ==========================================
echo.

rem Lista eseguibili disponibili
set "available="
if exist "local-opener-x64.exe" set "available=%available% x64"
if exist "local-opener-x86.exe" set "available=%available% x86"
if exist "local-opener-x64-legacy.exe" set "available=%available% legacy"

echo Versioni disponibili:%available%
echo.

rem Selezione automatica intelligente
set "EXE="

rem 1. Prova x64 moderno (più compatibile)
if exist "local-opener-x64.exe" (
    set "EXE=local-opener-x64.exe"
    set "ARCH=x64 (moderno)"
    goto :found
)

rem 2. Prova x86 per sistemi vecchi
if exist "local-opener-x86.exe" (
    set "EXE=local-opener-x86.exe" 
    set "ARCH=x86 (compatibilità)"
    goto :found
)

rem 3. Prova legacy se tutto il resto fallisce
if exist "local-opener-x64-legacy.exe" (
    set "EXE=local-opener-x64-legacy.exe"
    set "ARCH=x64 (legacy)"
    goto :found
)

:found
if "%EXE%"=="" (
    echo ❌ ERRORE: Nessun eseguibile trovato!
    echo.
    echo Contatta il supporto tecnico.
    pause
    exit /b 1
)

echo ✅ Selezionato: %ARCH%
echo ✅ Eseguibile: %EXE%
echo.
echo 🚀 Avvio in corso...

start "" "%EXE%"

echo.
echo ✅ Local Opener avviato!
echo Il servizio è attivo su http://127.0.0.1:17654
echo.
echo Puoi chiudere questa finestra e tornare al browser.
pause
`;

    fs.writeFileSync(`${portableDir}/start.bat`, launcherScript);
    
    // README per portable
    const readmeContent = `CRUSCOTTO LOCAL OPENER - VERSIONE COMPATIBILE
============================================

🎯 MASSIMA COMPATIBILITÀ WINDOWS
Questa versione è ottimizzata per funzionare su TUTTI i sistemi Windows.

📋 CONTENUTO PACCHETTO
${fs.existsSync(`${portableDir}/local-opener-x64.exe`) ? '✅ local-opener-x64.exe (Windows moderni)' : '❌ x64 non disponibile'}
${fs.existsSync(`${portableDir}/local-opener-x86.exe`) ? '✅ local-opener-x86.exe (Windows legacy)' : '❌ x86 non disponibile'}  
${fs.existsSync(`${portableDir}/local-opener-x64-legacy.exe`) ? '✅ local-opener-x64-legacy.exe (fallback)' : '❌ legacy non disponibile'}
✅ start.bat (launcher automatico)

🚀 ISTRUZIONI SEMPLICI
1. Estrai TUTTI i file in una cartella
2. Esegui "start.bat" come AMMINISTRATORE
3. Il sistema sceglierà automaticamente la versione giusta
4. Torna al browser Cruscotto

⚠️ IMPORTANTE
- Esegui SEMPRE come amministratore
- Aggiungi eccezione antivirus se richiesto
- La porta 17654 deve essere libera

🔧 SE start.bat NON FUNZIONA
Prova in questo ordine:
1. local-opener-x64.exe (Windows 10/11)
2. local-opener-x86.exe (Windows 7/8) 
3. local-opener-x64-legacy.exe (ultimo tentativo)

📞 SUPPORTO: https://cruscotto-sgi.onrender.com
`;

    fs.writeFileSync(`${portableDir}/README.txt`, readmeContent);
    
    // 6. Crea ZIP
    console.log('\n📦 Creating portable ZIP...');
    await createZip(portableDir);
    
    // 7. Copia nel client
    console.log('\n📂 Copying to client downloads...');
    const mainExe = `${BUILD_CONFIG.outputDir}/local-opener.exe`;
    const clientExe = `${BUILD_CONFIG.clientDownloadsDir}/cruscotto-local-opener-setup.exe`;
    
    if (fs.existsSync(mainExe)) {
      fs.copyFileSync(mainExe, clientExe);
      console.log('✅ Copied main executable to client downloads');
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('🎉 COMPATIBLE BUILD COMPLETED!');
    console.log('='.repeat(60));
    console.log('\n📋 RISULTATI:');
    console.log('✅ Eseguibile principale: local-opener.exe');
    console.log(`✅ Build alternativi: ${alternativeBuilds.length}`);
    console.log('✅ Versione portable creata');
    console.log('✅ File copiati nel client');
    console.log('\n🚀 Pronto per l\'uso!');
    
  } catch (error) {
    console.error('\n❌ BUILD FAILED:', error);
    process.exit(1);
  }
}

async function createZip(sourceDir) {
  const zipPath = `${BUILD_CONFIG.clientDownloadsDir}/cruscotto-local-opener-portable.zip`;
  
  const commands = [
    {
      cmd: `powershell -Command "Compress-Archive -Path '${sourceDir}\\*' -DestinationPath '${path.resolve(zipPath)}' -Force"`,
      name: 'PowerShell'
    },
    {
      cmd: `7z a "${path.resolve(zipPath)}" "${sourceDir}\\*"`,
      name: '7-Zip'
    }
  ];
  
  for (const { cmd, name } of commands) {
    try {
      await runCommand(cmd, `Creating ZIP with ${name}`, false);
      console.log(`✅ ZIP created with ${name}`);
      return;
    } catch (error) {
      console.log(`⚠️ ${name} failed, trying next method...`);
    }
  }
  
  console.log('❌ Could not create ZIP automatically');
  console.log(`💡 Manual: Compress ${sourceDir} to ${zipPath}`);
}

// Esegui
buildCompatible();

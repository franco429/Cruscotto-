// Script per creare una versione portable del Local Opener
const fs = require('fs');
const path = require('path');

console.log('🚀 Creazione versione portable...');

const distDir = path.join(__dirname, 'dist');
const portableDir = path.join(distDir, 'portable');
const assetsDir = path.join(__dirname, 'assets');
const installerDir = path.join(__dirname, 'installer');

// Assicurati che le cartelle esistano
if (!fs.existsSync(distDir)) {
  console.error('❌ Cartella dist non trovata. Esegui prima npm run build');
  process.exit(1);
}

if (!fs.existsSync(path.join(distDir, 'local-opener.exe'))) {
  console.error('❌ local-opener.exe non trovato. Esegui prima npm run build');
  process.exit(1);
}

// Crea la cartella portable
if (fs.existsSync(portableDir)) {
  fs.rmSync(portableDir, { recursive: true, force: true });
}
fs.mkdirSync(portableDir, { recursive: true });

console.log('📁 Copio i file necessari...');

// Copia l'eseguibile principale
fs.copyFileSync(
  path.join(distDir, 'local-opener.exe'),
  path.join(portableDir, 'local-opener.exe')
);

// Copia gli assets se esistono
if (fs.existsSync(assetsDir)) {
  const portableAssetsDir = path.join(portableDir, 'assets');
  fs.mkdirSync(portableAssetsDir, { recursive: true });
  copyRecursiveSync(assetsDir, portableAssetsDir);
  console.log('✅ Assets copiati');
}

// Copia NSSM se esiste
const nssmPath = path.join(installerDir, 'nssm.exe');
if (fs.existsSync(nssmPath)) {
  fs.copyFileSync(nssmPath, path.join(portableDir, 'nssm.exe'));
  console.log('✅ NSSM copiato');
}

// Crea script di installazione come servizio AVANZATO
const installServiceScript = `@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion
echo 🚀 INSTALLAZIONE CRUSCOTTO LOCAL OPENER COME SERVIZIO WINDOWS
echo ====================================================================
echo.

if not exist nssm.exe (
    echo ❌ ERRORE: nssm.exe non trovato!
    echo 💡 Scarica NSSM da https://nssm.cc/download
    pause
    exit /b 1
)

set SERVICE_NAME=CruscottoLocalOpener

echo 🛑 Arresto servizio esistente (se presente)...
nssm.exe stop !SERVICE_NAME! >nul 2>&1
nssm.exe remove !SERVICE_NAME! confirm >nul 2>&1

echo 🔧 Installazione servizio con configurazione avanzata...
nssm.exe install !SERVICE_NAME! "%~dp0local-opener.exe"
nssm.exe set !SERVICE_NAME! AppDirectory "%~dp0"
nssm.exe set !SERVICE_NAME! DisplayName "Cruscotto Local Opener Service"
nssm.exe set !SERVICE_NAME! Description "Servizio per aprire documenti locali da Pannello SGI - Avvio automatico all'accensione PC"

echo ⚙️  Configurazione avvio automatico...
nssm.exe set !SERVICE_NAME! Start SERVICE_AUTO_START
nssm.exe set !SERVICE_NAME! Type SERVICE_WIN32_OWN_PROCESS
nssm.exe set !SERVICE_NAME! DelayedAutoStart 1

echo 🔄 Configurazione resilienza e restart automatico...
nssm.exe set !SERVICE_NAME! AppExit Default Restart
nssm.exe set !SERVICE_NAME! AppRestartDelay 10000
nssm.exe set !SERVICE_NAME! AppThrottle 5000
nssm.exe set !SERVICE_NAME! AppStopMethodConsole 15000

echo 🔐 Configurazione sicurezza...
nssm.exe set !SERVICE_NAME! ObjectName LocalSystem

echo 📝 Configurazione logging...
md "%APPDATA%\\.local-opener" >nul 2>&1
nssm.exe set !SERVICE_NAME! AppStdout "%APPDATA%\\.local-opener\\service.log"
nssm.exe set !SERVICE_NAME! AppStderr "%APPDATA%\\.local-opener\\service-error.log"
nssm.exe set !SERVICE_NAME! AppRotateFiles 1
nssm.exe set !SERVICE_NAME! AppRotateSeconds 86400

echo 🌐 Configurazione firewall Windows...
netsh advfirewall firewall delete rule name="Local Opener" >nul 2>&1
netsh advfirewall firewall add rule name="Local Opener" dir=in action=allow protocol=TCP localport=17654 >nul 2>&1

echo 🚀 Avvio servizio...
nssm.exe start !SERVICE_NAME!

echo.
echo ⏳ Attendo 5 secondi per verifica avvio...
timeout /t 5 >nul

echo 🔍 Verifica stato servizio...
sc query !SERVICE_NAME! | findstr /i "RUNNING" >nul 2>&1
if %errorlevel% equ 0 (
    echo ✅ SUCCESSO! Servizio installato e avviato correttamente
    echo 🎉 Il Local Opener si avvierà automaticamente ad ogni accensione del PC
) else (
    echo ⚠️  Servizio installato ma potrebbe non essere avviato
    echo 💡 Riavvia il PC o esegui: sc start !SERVICE_NAME!
)

echo.
echo 📊 STATO INSTALLAZIONE:
echo ================================
echo 🌐 URL servizio: http://127.0.0.1:17654
echo 📁 Log servizio: %APPDATA%\\.local-opener\\service.log
echo 🔧 Manager servizi: services.msc
echo 📋 Diagnostica: diagnostica-servizio.bat
echo.
pause
`;

fs.writeFileSync(path.join(portableDir, 'installa-servizio.bat'), installServiceScript);

// Crea script di disinstallazione
const uninstallServiceScript = `@echo off
echo Disinstallazione Cruscotto Local Opener...
echo.

if not exist nssm.exe (
    echo ERRORE: nssm.exe non trovato!
    pause
    exit /b 1
)

echo Fermo il servizio...
nssm.exe stop CruscottoLocalOpener

echo Rimuovo il servizio...
nssm.exe remove CruscottoLocalOpener confirm

echo.
echo ✅ Servizio disinstallato con successo!
echo.
pause
`;

fs.writeFileSync(path.join(portableDir, 'disinstalla-servizio.bat'), uninstallServiceScript);

// Crea script di avvio manuale
const startScript = `@echo off
echo Avvio Cruscotto Local Opener...
echo.
echo ATTENZIONE: Questo script avvia il Local Opener in modalità console.
echo Chiudi questa finestra per fermare il servizio.
echo Per installare come servizio Windows, usa installa-servizio.bat
echo.
"%~dp0local-opener.exe"
`;

fs.writeFileSync(path.join(portableDir, 'avvia-manualmente.bat'), startScript);

// Crea file README
const readmeContent = `# Cruscotto Local Opener - Versione Portable

## Cosa è incluso
- local-opener.exe: L'applicazione principale
- nssm.exe: Utility per installare come servizio Windows
- assets/: Risorse dell'applicazione (icone, ecc.)

## Come usare

### Opzione 1: Installazione come Servizio (Raccomandato)
1. Esegui "installa-servizio.bat" come Amministratore
2. Il servizio si avvierà automaticamente e all'accensione del PC
3. Per disinstallare, esegui "disinstalla-servizio.bat" come Amministratore

### Opzione 2: Avvio Manuale
1. Esegui "avvia-manualmente.bat"
2. Il servizio rimarrà attivo finché non chiudi la finestra

## Configurazione
Il Local Opener si configura automaticamente al primo avvio.
I file di configurazione sono salvati in: %APPDATA%\\.local-opener\\

## Supporto
Per assistenza, visita: https://cruscotto-sgi.onrender.com

## Requisiti
- Windows 10/11
- Connessione internet per la comunicazione con Pannello SGI
`;

fs.writeFileSync(path.join(portableDir, 'README.txt'), readmeContent);

// Crea configurazione di esempio CORRETTA
const exampleConfig = {
  "roots": [
    "C:\\Users\\NomeUtente\\Google Drive",
    "G:\\Il mio Drive", 
    "H:\\Il mio Drive",
    "\\\\SERVER\\Share\\Documenti"
  ],
  "company": {
    "name": "Nome Azienda SpA",
    "code": "AZIENDA123",
    "installedAt": "2024-01-15 14:30:00",
    "version": "1.0.0",
    "silentInstall": false
  }
};

fs.writeFileSync(
  path.join(portableDir, 'config-esempio.json'), 
  JSON.stringify(exampleConfig, null, 2)
);

// Copia lo script di diagnostica (se esiste)
const diagnosticaPath = path.join(__dirname, 'diagnostica-servizio.bat');
if (fs.existsSync(diagnosticaPath)) {
  fs.copyFileSync(diagnosticaPath, path.join(portableDir, 'diagnostica-servizio.bat'));
  console.log('✅ Script diagnostica copiato');
} else {
  // Crea script di diagnostica integrato
  const diagnosticaScript = `@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

echo ====================================================================
echo 🔧 DIAGNOSTICA CRUSCOTTO LOCAL OPENER - SERVIZIO WINDOWS
echo ====================================================================
echo.

set SERVICE_NAME=CruscottoLocalOpener
set PORT=17654
set URL=http://127.0.0.1:%PORT%

echo 📋 VERIFICA STATO SERVIZIO...
echo ====================================================================

:: Controlla se il servizio è installato
sc query "%SERVICE_NAME%" >nul 2>&1
if %errorlevel% equ 0 (
    echo ✅ Servizio installato: %SERVICE_NAME%
    
    :: Verifica se è configurato per avvio automatico
    sc qc "%SERVICE_NAME%" | findstr /i "AUTO_START" >nul 2>&1
    if %errorlevel% equ 0 (
        echo ✅ Configurato per avvio automatico
    ) else (
        echo ⚠️  NON configurato per avvio automatico
        echo 💡 Comando per risolvere: sc config "%SERVICE_NAME%" start= auto
    )
    
    :: Verifica se è in esecuzione
    sc query "%SERVICE_NAME%" | findstr /i "RUNNING" >nul 2>&1
    if %errorlevel% equ 0 (
        echo ✅ Servizio in esecuzione
    ) else (
        echo ❌ Servizio NON in esecuzione
        echo 💡 Comando per avviare: sc start "%SERVICE_NAME%"
    )
    
) else (
    echo ❌ Servizio NON installato: %SERVICE_NAME%
    echo 💡 Esegui l'installer: installa-servizio.bat
)

echo.
echo 🌐 VERIFICA CONNESSIONE...
echo ====================================================================

:: Test connessione HTTP
echo 🔗 Test connessione %URL%...
powershell -Command "try { $response = Invoke-WebRequest -Uri '%URL%/health' -TimeoutSec 5 -UseBasicParsing; Write-Host '✅ Connessione HTTP riuscita' } catch { Write-Host '❌ Connessione HTTP fallita:' $_.Exception.Message }" 2>nul

echo.
echo 🔧 COMANDI UTILI...
echo ====================================================================
echo 🔄 Riavvia servizio:      sc stop "%SERVICE_NAME%" ^&^& sc start "%SERVICE_NAME%"
echo 🚀 Avvia servizio:        sc start "%SERVICE_NAME%"
echo 🛑 Ferma servizio:        sc stop "%SERVICE_NAME%"
echo ⚙️  Configura auto-start:  sc config "%SERVICE_NAME%" start= auto
echo 🖥️  Manager servizi:      services.msc
echo 🌐 Test manuale:         start http://127.0.0.1:17654

echo.
echo ✅ Diagnostica completata! Premi un tasto per uscire...
pause >nul`;

  fs.writeFileSync(path.join(portableDir, 'diagnostica-servizio.bat'), diagnosticaScript);
  console.log('✅ Script diagnostica creato');
}

console.log('');
console.log('✅ Versione portable creata con successo!');
console.log('📁 Percorso: dist/portable/');
console.log('');
console.log('📋 File creati:');
console.log('   ├── local-opener.exe');
console.log('   ├── nssm.exe');
console.log('   ├── installa-servizio.bat');
console.log('   ├── disinstalla-servizio.bat');
console.log('   ├── avvia-manualmente.bat');
console.log('   ├── diagnostica-servizio.bat');
console.log('   ├── README.txt');
console.log('   ├── config-esempio.json');
console.log('   └── assets/');
console.log('');
console.log('🚀 La versione portable è pronta per l\'uso!');
console.log('💡 Copia la cartella "portable" sul PC di destinazione per installare.');

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

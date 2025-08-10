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

// Crea script di installazione come servizio
const installServiceScript = `@echo off
echo Installazione Cruscotto Local Opener come servizio Windows...
echo.

if not exist nssm.exe (
    echo ERRORE: nssm.exe non trovato!
    echo Scarica NSSM da https://nssm.cc/download
    pause
    exit /b 1
)

echo Installo il servizio...
nssm.exe install CruscottoLocalOpener "%~dp0local-opener.exe"
nssm.exe set CruscottoLocalOpener AppDirectory "%~dp0"
nssm.exe set CruscottoLocalOpener DisplayName "Cruscotto Local Opener Service"
nssm.exe set CruscottoLocalOpener Description "Servizio per aprire documenti locali da Cruscotto SGI"
nssm.exe set CruscottoLocalOpener Start SERVICE_AUTO_START

echo Avvio il servizio...
nssm.exe start CruscottoLocalOpener

echo.
echo ✅ Servizio installato e avviato con successo!
echo Il Local Opener è ora attivo e si avvierà automaticamente all'accensione del PC.
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
- Connessione internet per la comunicazione con Cruscotto SGI
`;

fs.writeFileSync(path.join(portableDir, 'README.txt'), readmeContent);

// Crea configurazione di esempio
const exampleConfig = {
  "roots": ["C:\\"],
  "company": {
    "name": "La tua azienda",
    "code": ""
  },
  "server": {
    "port": 3001,
    "host": "localhost"
  }
};

fs.writeFileSync(
  path.join(portableDir, 'config-esempio.json'), 
  JSON.stringify(exampleConfig, null, 2)
);

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

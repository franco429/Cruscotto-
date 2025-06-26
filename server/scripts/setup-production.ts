import * as dotenv from "dotenv";
import { execSync } from "child_process";
import * as fs from "fs";
import * as path from "path";

// Carica le variabili d'ambiente
dotenv.config({ path: ".env.production" });

// Funzione per eseguire comandi
const runCommand = (command: string) => {
  try {
    execSync(command, { stdio: "inherit" });
  } catch (error) {
    process.exit(1);
  }
};

// Funzione per creare directory se non esiste
const ensureDirectoryExists = (dir: string) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
};

// Setup produzione


// 1. Verifica e crea directory necessarie
ensureDirectoryExists("dist");
ensureDirectoryExists("logs");
ensureDirectoryExists("backups");

// 2. Installa dipendenze di produzione

runCommand("npm ci --production");

// 3. Build dell'applicazione

runCommand("npm run build");

// 4. Verifica configurazione

runCommand("npm run verify:env");

// 5. Setup PM2 per gestione processi

runCommand("npm install -g pm2");
runCommand(
  'pm2 start dist/server/index.js --name "iso-doc-manager" --max-memory-restart 1G'
);



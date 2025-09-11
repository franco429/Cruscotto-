#!/usr/bin/env node

import * as dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Carica le variabili d'ambiente di produzione
dotenv.config({ path: path.resolve(__dirname, "..", ".env.production") });

const requiredEnvVars = [
  "DB_URI",
  "SESSION_SECRET",
  "ENCRYPTION_KEY",
  "LINK_SECRET_KEY",
  "SMTP_HOST",
  "SMTP_PORT",
  "SMTP_USER",
  "SMTP_PASSWORD",
  "API_BASE_URL",
  "FRONTEND_URL",
];


let allGood = true;
const missingVars = [];
const weakVars = [];

for (const key of requiredEnvVars) {
  const value = process.env[key];
  if (!value || value.trim() === "") {
    allGood = false;
    missingVars.push(key);
  } else if (key === "SESSION_SECRET" && value.length < 32) {
    allGood = false;
    weakVars.push(`${key} (troppo corto: ${value.length} caratteri, minimo 32)`);
  } else if (key === "ENCRYPTION_KEY" && value.length !== 32) {
    allGood = false;
    weakVars.push(`${key} (lunghezza errata: ${value.length} caratteri, deve essere 32)`);
  }
}

if (missingVars.length > 0) {
  console.error(" Variabili d'ambiente mancanti:");
  missingVars.forEach(varName => console.error(`   - ${varName}`));
}

if (weakVars.length > 0) {
  console.error("  Variabili d'ambiente deboli:");
  weakVars.forEach(varName => console.error(`   - ${varName}`));
}

if (allGood) {
  process.exit(0);
} else {
  console.error("\n Configurazione incompleta o non sicura!");
  process.exit(1);
} 
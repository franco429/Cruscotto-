import * as dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, ".env") });

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
const missingVars: string[] = [];

for (const key of requiredEnvVars) {
  const value = process.env[key];
  if (!value || value.trim() === "") {
    allGood = false;
    missingVars.push(key);
  } 
}

if (allGood) {
  process.exit(0);
} else {
  console.error("[ERRORE] Variabili d'ambiente mancanti:", missingVars.join(", "));
  process.exit(1);
}

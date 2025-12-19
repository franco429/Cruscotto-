import express, { type Request, Response, NextFunction } from "express";
import * as dotenv from "dotenv";
import cors from "cors";
import { mongoStorage } from "./mongo-storage";
import logger, { logRequest, logError } from "./logger";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";
import fs from "fs";
import os from "os";
import { startFilesystemCleanupScheduler } from "./filesystem-cleanup-service";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Carica le variabili d'ambiente prima di ogni altro import.
if (process.env.NODE_ENV === "production") {
  dotenv.config({ path: ".env.production" });
} else {
  dotenv.config();
}

// ⚠️ CRITICAL: Handler per Promise rejection non gestite
// Questo previene crash silenzioso su Render e fornisce log utili per debug
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ UNHANDLED REJECTION! Questo potrebbe causare crash del server:');
  console.error('   Reason:', reason instanceof Error ? reason.message : reason);
  if (reason instanceof Error && reason.stack) {
    console.error('   Stack:', reason.stack);
  }
  // Log anche con logger se disponibile
  try {
    logger.error('Unhandled Promise Rejection', { 
      reason: reason instanceof Error ? reason.message : String(reason),
      stack: reason instanceof Error ? reason.stack : undefined 
    });
  } catch {}
});

// ⚠️ CRITICAL: Handler per eccezioni non catturate
process.on('uncaughtException', (error) => {
  console.error('❌ UNCAUGHT EXCEPTION! Il server sta per crashare:');
  console.error('   Error:', error.message);
  console.error('   Stack:', error.stack);
  // Log anche con logger se disponibile
  try {
    logger.error('Uncaught Exception', { 
      message: error.message,
      stack: error.stack 
    });
  } catch {}
  // Termina il processo dopo un breve delay per permettere il logging
  setTimeout(() => process.exit(1), 1000);
});

logger.info("Avvio server...");

// Log configurazione ambiente per debug (solo all'avvio)
console.log("📋 Configurazione ambiente:");
console.log("   NODE_ENV:", process.env.NODE_ENV || "development");
console.log("   DB_URI:", process.env.DB_URI ? "✅ configurata" : "❌ MANCANTE!");
console.log("   PORT:", process.env.PORT || "5000 (default)");
console.log("   SMTP_HOST:", process.env.SMTP_HOST ? "✅ configurata" : "⚠️ non configurata");

// RIMOSSO: Monitor /tmp non più necessario con Cloud Storage
// Tutti i file temporanei ora vanno su Google Cloud Storage con lifecycle automatico

// 🆕 Job periodico: Cleanup file orfani in server/uploads ogni 30 minuti
const uploadsCleanupJob = setInterval(async () => {
  try {
    const uploadsDir = path.join(process.cwd(), "server", "uploads");
    
    // Verifica che la directory esista
    if (!fs.existsSync(uploadsDir)) {
      return;
    }
    
    const files = await fs.promises.readdir(uploadsDir);
    
    if (files.length === 0) {
      return; // Nessun file da pulire
    }
    
    logger.info("Starting periodic cleanup of uploads directory", {
      totalFiles: files.length
    });
    
    let deletedCount = 0;
    let failedCount = 0;
    const now = Date.now();
    const MAX_AGE_MS = 2 * 60 * 60 * 1000; // 2 ore
    
    for (const file of files) {
      try {
        const filePath = path.join(uploadsDir, file);
        const stats = await fs.promises.stat(filePath);
        
        // Elimina file più vecchi di 2 ore (probabilmente orfani)
        if (now - stats.mtimeMs > MAX_AGE_MS) {
          await fs.promises.unlink(filePath);
          deletedCount++;
          logger.debug("Deleted old orphaned file", {
            fileName: file,
            ageHours: Math.round((now - stats.mtimeMs) / (60 * 60 * 1000))
          });
        }
      } catch (error) {
        failedCount++;
        logger.warn("Failed to delete file during cleanup", {
          fileName: file,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }
    
    if (deletedCount > 0 || failedCount > 0) {
      logger.info("Uploads directory cleanup completed", {
        totalFiles: files.length,
        deleted: deletedCount,
        failed: failedCount,
        remaining: files.length - deletedCount
      });
    }
  } catch (error) {
    // Non bloccare l'applicazione per errori di cleanup
    logger.warn("Uploads cleanup job failed", {
      error: error instanceof Error ? error.message : String(error)
    });
  }
}, 30 * 60 * 1000); // 30 minuti

// Monitoraggio Cloud Storage ogni 30 minuti (opzionale - solo per statistiche)
const cloudStorageMonitor = setInterval(async () => {
  try {
    const { isCloudStorageConfigured, getStorageStats, cleanupOldTempFiles } = await import('./google-cloud-storage.js');
    
    if (await isCloudStorageConfigured()) {
      const stats = await getStorageStats();
      
      // Log solo se ci sono file
      if (stats.totalFiles > 0) {
        logger.info("Cloud Storage monitor check", {
          totalFiles: stats.totalFiles,
          totalSizeMB: stats.totalSizeMB,
          oldestFile: stats.oldestFile,
        });
      }
      
      // Cleanup file più vecchi di 1 ora (3600 secondi)
      if (stats.totalFiles > 10) {
        logger.info("Running Cloud Storage cleanup", { totalFiles: stats.totalFiles });
        const cleanupResult = await cleanupOldTempFiles(3600);
        
        if (cleanupResult.deleted > 0) {
          logger.info("Cloud Storage cleanup completed", {
            deleted: cleanupResult.deleted,
            failed: cleanupResult.failed,
          });
        }
      }
    }
  } catch (error) {
    // Ignora errori di monitoraggio per non bloccare l'applicazione
    logger.debug("Cloud Storage monitor check skipped", {
      error: error instanceof Error ? error.message : String(error),
    });
  }
}, 30 * 60 * 1000); // Ogni 30 minuti

// Monitoraggio memoria per prevenire out of memory
const memoryMonitor = setInterval(() => {
  const used = process.memoryUsage();
  const memoryMB = Math.round(used.heapUsed / 1024 / 1024);
  const totalMB = Math.round(used.heapTotal / 1024 / 1024);
  
  logger.info("Memory usage", {
    heapUsed: `${memoryMB} MB`,
    heapTotal: `${totalMB} MB`,
    external: `${Math.round(used.external / 1024 / 1024)} MB`,
    rss: `${Math.round(used.rss / 1024 / 1024)} MB`
  });
  
  // Warning se la memoria si avvicina ai limiti
  if (memoryMB > 1500) { // >1.5GB
    logger.warn("High memory usage detected", { memoryMB, totalMB });
  }
  
  // Forza garbage collection se disponibile
  if (global.gc && memoryMB > 1000) {
    global.gc();
    logger.info("Forced garbage collection");
  }
}, 60000); // Ogni minuto

// Cleanup al termine del processo
process.on('SIGTERM', () => {
  clearInterval(memoryMonitor);
  clearInterval(cloudStorageMonitor);
  clearInterval(uploadsCleanupJob);
  logger.info("All monitoring jobs stopped (memory, Cloud Storage, uploads cleanup)");
});

process.on('SIGINT', () => {
  clearInterval(memoryMonitor);
  clearInterval(cloudStorageMonitor);
  clearInterval(uploadsCleanupJob);
  logger.info("All monitoring jobs stopped (memory, Cloud Storage, uploads cleanup)");
});

const app = express();

// Configurazione Express per lavorare dietro un reverse proxy (Render, Nginx, etc.)
// Necessario per HSTS e altri security headers
app.set('trust proxy', 1);

// Disabilita X-Powered-By header per nascondere tecnologia usata
// Conforme a TAC Security DAST - Proxy Disclosure Prevention (CWE-200)
app.disable('x-powered-by');

// PRIORITÀ ASSOLUTA: Rimuovi header informativi su TUTTE le risposte
// Deve essere il PRIMO middleware per garantire che nessun header venga esposto
// Conforme a TAC Security DAST - Proxy Disclosure Prevention (CWE-200)
const { removeServerHeaders, blockUnsafeHttpMethods, applyCorpHeader } = await import("./security");
removeServerHeaders(app);

// PRIORITÀ CRITICA: Applica Cross-Origin-Resource-Policy su TUTTE le risposte
// Protezione contro Spectre e side-channel attacks
// Conforme a TAC Security DAST - Insufficient Site Isolation Against Spectre Vulnerability
applyCorpHeader(app);

// PRIORITÀ MASSIMA: Blocca metodi HTTP non sicuri (TRACE, TRACK)
// Applicato PRIMA di qualsiasi altro middleware per prevenire proxy disclosure
// Conforme a TAC Security DAST - Proxy Disclosure Prevention (CWE-200)
blockUnsafeHttpMethods(app);

//  CORS config - Configurazione sicura e rigorosa
const allowedOrigins = [
  "https://cruscotto-sgi.com",
  "https://www.cruscotto-sgi.com",
  ...(process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(",").map(origin => origin.trim())
    : ["http://localhost:5173", "http://localhost:5000"]),
];

// Log configurazione solo all'avvio (non su ogni richiesta per evitare log flooding)
logger.info("CORS configuration initialized", { 
  originsCount: allowedOrigins.length,
  environment: process.env.NODE_ENV 
});

// Header anti-clickjacking su TUTTE le risposte
// Applicato PRIMA di qualsiasi altro middleware per garantire presenza su file statici
// Conforme a TAC Security DAST requirements (CWE-1021)
app.use((req, res, next) => {
  // Doppia protezione anti-clickjacking
  res.setHeader('X-Frame-Options', 'DENY');
  // CSP frame-ancestors sarà aggiunto da Helmet, ma questo garantisce X-Frame-Options
  next();
});

// Configurazione CORS sicura con gestione rigorosa degli origin
// Conforme a TAC Security DAST - Prevent Information Disclosure (CWE-200)
app.use(
  cors({
    origin: function (origin, callback) {
      // Permetti richieste senza origin per callback OAuth e richieste server-to-server
      if (!origin) {
        return callback(null, true);
      }

      // Verifica origin contro whitelist
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      } else {
        // SICUREZZA: Blocca senza loggare dettagli per prevenire information disclosure
        // Ritorna false invece di Error per evitare problemi con il middleware CORS
        return callback(null, false);
      }
    },
    credentials: true, // Permetti cookies e headers di autenticazione
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"], // Metodi permessi
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "X-Requested-With",
      "X-CSRF-Token",
      "Accept",
    ], // Headers permessi
    exposedHeaders: ["X-Total-Count", "X-Page-Count"], // Headers esposti al client
    maxAge: 86400, // Preflight cache: 24 ore
    optionsSuccessStatus: 200, // Alcuni browser legacy (IE11) usano 200 invece di 204
  })
);

// Limiti più conservativi per l'ambiente Render
app.use(express.json({
  limit: '10mb' // Ridotto da default per evitare timeout
}));
app.use(express.urlencoded({ 
  extended: false,
  limit: '10mb' // Ridotto da default per evitare timeout
}));

//  Sicurezza: Helmet va applicato presto
const { setupSecurity } = await import("./security");
setupSecurity(app);

//  Sessioni prima di auth e csrf
const { setupAuth } = await import("./auth");
setupAuth(app);

//  Protezione CSRF dopo le sessioni
const { setupCSRF } = await import("./security");
setupCSRF(app);

//  Timeout middleware per Render (25 secondi - sotto il limite di 30s di Render)
app.use((req, res, next) => {
  // Timeout più aggressivo per upload di file
  const timeoutMs = req.path.includes('/upload') ? 25000 : 20000;
  
  req.setTimeout(timeoutMs, () => {
    if (!res.headersSent) {
      logger.warn("Request timeout on Render", {
        url: req.url,
        method: req.method,
        timeoutMs,
        userAgent: req.get("User-Agent"),
      });
      res.status(408).json({
        message: "Richiesta scaduta. Riprova con meno file o file più piccoli.",
        code: "REQUEST_TIMEOUT"
      });
    }
  });
  
  next();
});

//  Logging API strutturato
app.use((req, res, next) => {
  const start = Date.now();
  res.on("finish", () => {
    if (req.path.startsWith("/api")) {
      logRequest(req, res, Date.now() - start);
    }
  });
  next();
});

(async () => {
  try {
    // RIMOSSO: Cleanup file temporanei orfani da /tmp non più necessario
    // Tutti i file temporanei ora vanno su Google Cloud Storage con lifecycle automatico

    logger.info("Connessione a MongoDB...");
    await mongoStorage.connect();

    logger.info("Correzione documenti clientId...");
    await mongoStorage.fixDocumentsClientId();

    logger.info("Importo e registro le routes...");
    const { registerRoutes } = await import("./routes");
    registerRoutes(app);

    logger.info("Registro le route di backup...");
    const { registerBackupRoutes } = await import("./backup-routes");
    registerBackupRoutes(app);

    logger.info("Registro le route MFA...");
    const { registerMFARoutes } = await import("./mfa-routes");
    registerMFARoutes(app);

    // Middleware per normalizzare gli URL (www -> non-www, http -> https)
    app.use((req, res, next) => {
      const host = req.get('host');
      const protocol = req.get('x-forwarded-proto') || req.protocol;
      
      // Se in produzione, forza HTTPS e rimuovi www
      if (process.env.NODE_ENV === 'production') {
        let redirect = false;
        let redirectUrl = '';
        
        // Forza HTTPS
        if (protocol !== 'https') {
          redirect = true;
          redirectUrl = `https://${host}${req.url}`;
        }
        
        // Rimuovi www dal dominio
        if (host && host.startsWith('www.')) {
          redirect = true;
          const newHost = host.replace(/^www\./, '');
          redirectUrl = `https://${newHost}${req.url}`;
        }
        
        if (redirect) {
          logger.info(`Redirect SEO: ${req.url} -> ${redirectUrl}`);
          return res.redirect(301, redirectUrl);
        }
      }
      
      next();
    });

    // Serve i file statici della build Vite
    const viteDistPath = path.join(__dirname, "..", "client", "dist");
    
    // Middleware per garantire header di sicurezza E CACHE APPROPRIATA su file statici
    // Conforme a TAC Security DAST - Spectre Protection & Cache Optimization (CWE-525, CWE-524)
    app.use(express.static(viteDistPath, {
      setHeaders: (res, filePath) => {
        const relativePath = filePath.replace(viteDistPath, '').toLowerCase();
        
        // Applica header di sicurezza su tutti i file statici
        res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.setHeader('X-Frame-Options', 'DENY');
        
        // Applica Cache-Control appropriato per tipo di file
        // Asset statici con hash (CSS, JS) - CACHING AGGRESSIVO (2 anni)
        if (relativePath.match(/\.(css|js)$/) && relativePath.includes('/assets/')) {
          res.setHeader('Cache-Control', 'public, max-age=63072000, immutable');
        }
        // Immagini, icone e font - CACHING MODERATO (1 anno)
        else if (relativePath.match(/\.(jpg|jpeg|png|gif|webp|svg|woff|woff2|ttf|eot|ico)$/)) {
          res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        }
        // robots.txt, sitemap.xml - CACHING BREVE (1 ora)
        else if (relativePath.match(/\.(txt|xml)$/)) {
          res.setHeader('Cache-Control', 'public, max-age=3600');
        }
        // Privacy e Terms HTML - CACHING BREVE (pagine informative pubbliche)
        else if (relativePath.includes('privacy.html') || relativePath.includes('terms.html')) {
          res.setHeader('Cache-Control', 'public, max-age=3600');
        }
        // Altri HTML (index.html, etc.) - NO CACHING (possono contenere dati dopo login)
        else if (relativePath.match(/\.(html?)$/)) {
          res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
          res.setHeader('Pragma', 'no-cache');
          res.setHeader('Expires', '0');
        }
        // Default per altri file statici - CACHING BREVE
        else {
          res.setHeader('Cache-Control', 'public, max-age=3600');
        }
      }
    }));

    // Gestione favicon.ico - redirect a favicon.png
    app.get("/favicon.ico", (req, res) => {
      res.redirect("/favicon.png");
    });

    // robots.txt per API: BLOCCA l'indicizzazione (sicurezza)
    app.get("/robots.txt", (req, res) => {
      const host = req.get('host');
      
      // Applica header di sicurezza CORP
      res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('X-Frame-Options', 'DENY');
      
      // Cache-Control per robots.txt - CACHING BREVE (1 ora)
      // Conforme TAC Security DAST - Non-Storable Content Resolution
      res.setHeader('Cache-Control', 'public, max-age=3600');
      
      // Se il dominio contiene 'api', blocca tutto l'indicizzazione
      if (host && host.includes('api')) {
        res.type("text/plain");
        res.send("User-agent: *\nDisallow: /");
        logger.info("Served robots.txt for API domain - blocking all indexing");
      } else {
        // Per il dominio principale, serve il file statico (che permette indicizzazione)
        res.sendFile(path.join(viteDistPath, "robots.txt"));
        logger.info("Served static robots.txt for main domain");
      }
    });

    // sitemap.xml - Handler esplicito per garantire header di sicurezza e cache
    app.get("/sitemap.xml", (req, res) => {
      // Assicura che gli header di sicurezza siano presenti
      // Conforme a TAC Security DAST - Spectre Protection
      res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('X-Frame-Options', 'DENY');
      
      // Cache-Control per sitemap.xml - CACHING BREVE (1 ora)
      // Conforme TAC Security DAST - Non-Storable Content Resolution
      res.setHeader('Cache-Control', 'public, max-age=3600');
      
      const sitemapPath = path.join(viteDistPath, "sitemap.xml");
      // Verifica se il file esiste
      if (require('fs').existsSync(sitemapPath)) {
        res.sendFile(sitemapPath);
      } else {
        // Se non esiste, genera una sitemap base
        res.type("application/xml");
        res.send(`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://cruscotto-sgi.com/</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <priority>1.0</priority>
  </url>
</urlset>`);
        logger.info("Served dynamic sitemap.xml with security headers and cache");
      }
    });

    // Catch-all: tutte le richieste non API servono index.html (SPA fallback)
    app.get(/^\/(?!api).*/, (req, res) => {
      res.sendFile(path.join(viteDistPath, "index.html"));
    });

    //  Middleware per gestione errori centralizzata 
    // AGGIORNATO: Messaggi generici per prevenire information disclosure
    // Conforme a TAC Security DAST - Proxy Disclosure Prevention (CWE-200)
    app.use((err: any, req: Request, res: Response, next: NextFunction) => {
      const status = err.status || err.statusCode || 500;
      
      // Log dettagliato per debug (solo server-side)
      logError(err, {
        url: req.url,
        method: req.method,
        ip: req.ip,
        userId: (req as any).user?.legacyId || "anonymous",
        statusCode: status,
        originalMessage: err.message, // Log completo per debug
      });

      // Rimuovi header informativi anche in caso di errore
      res.removeHeader('Server');
      res.removeHeader('X-Powered-By');
      res.removeHeader('X-AspNet-Version');
      res.removeHeader('X-AspNetMvc-Version');

      // Messaggi generici al client per prevenire information disclosure
      // NON esporre dettagli tecnici, stack traces o nomi di tecnologie
      let genericMessage = "Si è verificato un errore";
      
      if (status === 400) {
        genericMessage = "Richiesta non valida";
      } else if (status === 401) {
        genericMessage = "Autenticazione richiesta";
      } else if (status === 403) {
        genericMessage = "Accesso negato";
      } else if (status === 404) {
        genericMessage = "Risorsa non trovata";
      } else if (status === 405) {
        genericMessage = "Metodo non consentito";
      } else if (status === 429) {
        genericMessage = "Troppe richieste. Riprova più tardi";
      } else if (status >= 500) {
        genericMessage = "Errore del server";
      }

      res.status(status).json({ 
        error: genericMessage,
        code: status
      });
    });

    logger.info("Avvio sincronizzazione automatica...");
    const { startAutomaticSyncForAllClients } = await import("./google-drive");
    startAutomaticSyncForAllClients();
    logger.info("Sincronizzazione automatica avviata (ogni 15 minuti)");

    const { startExpirationChecks } = await import("./notification-service");
    startExpirationChecks();

    logger.info("Avvio pulizia automatica log (retention 30 giorni)...");
    const { startLogCleanupScheduler } = await import("./log-cleanup-service");
    startLogCleanupScheduler();
    logger.info("Pulizia automatica log avviata (ogni 24 ore)");

  // Scheduler per cleanup backup e log file su disco (spazio Render)
  startFilesystemCleanupScheduler();
  logger.info("Cleanup filesystem (backups/logs) avviato (ogni 6 ore)");

    const port = process.env.PORT || 5000;
    app.listen(port, () => {
      logger.info(`Server avviato su porta ${port}`, {
        environment: process.env.NODE_ENV,
        port,
      });
    });
  } catch (error) {
    logError(error as Error, { context: "Server startup" });
    process.exit(1);
  }
})();

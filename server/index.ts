import express, { type Request, Response, NextFunction } from "express";
import * as dotenv from "dotenv";
import cors from "cors";
import { mongoStorage } from "./mongo-storage";
import logger, { logRequest, logError } from "./logger";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Carica le variabili d'ambiente prima di ogni altro import.
if (process.env.NODE_ENV === "production") {
  dotenv.config({ path: ".env.production" });
} else {
  dotenv.config();
}

logger.info("Avvio server...");

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
  logger.info("Memory monitor stopped");
});

process.on('SIGINT', () => {
  clearInterval(memoryMonitor);
  logger.info("Memory monitor stopped");
});

const app = express();

//  CORS config
const allowedOrigins = [
  "https://cruscotto-sgi.com",
  ...(process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(",")
    : ["http://localhost:5173"]),
];
app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
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
    app.use(express.static(viteDistPath));

    // robots.txt per API: BLOCCA l'indicizzazione (sicurezza)
    app.get("/robots.txt", (req, res) => {
      const host = req.get('host');
      
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

    // Catch-all: tutte le richieste non API servono index.html (SPA fallback)
    app.get(/^\/(?!api).*/, (req, res) => {
      res.sendFile(path.join(viteDistPath, "index.html"));
    });

    //  Middleware per gestione errori centralizzata 
    app.use((err: any, req: Request, res: Response, next: NextFunction) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";

      logError(err, {
        url: req.url,
        method: req.method,
        ip: req.ip,
        userId: (req as any).user?.legacyId || "anonymous",
        statusCode: status,
      });

      res.status(status).json({ message });
    });

    logger.info("Avvio sincronizzazione automatica...");
    const { startAutomaticSyncForAllClients } = await import("./google-drive");
    startAutomaticSyncForAllClients();
    logger.info("Sincronizzazione automatica avviata (ogni 15 minuti)");

    const { startExpirationChecks } = await import("./notification-service");
    startExpirationChecks();

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

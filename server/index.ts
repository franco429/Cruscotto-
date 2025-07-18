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

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

//  Sicurezza: Helmet va applicato presto
const { setupSecurity } = await import("./security");
setupSecurity(app);

//  Sessioni prima di auth e csrf
const { setupAuth } = await import("./auth");
setupAuth(app);

//  Protezione CSRF dopo le sessioni
const { setupCSRF } = await import("./security");
setupCSRF(app);

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

    // Serve i file statici della build Vite
    const viteDistPath = path.join(__dirname, "..", "client", "dist");
    app.use(express.static(viteDistPath));

    app.get("/robots.txt", (req, res) => {
      res.type("text/plain");
      res.send("User-agent: *\nDisallow: /");
    });
    // Catch-all: tutte le richieste non API servono index.html (SPA fallback)
    app.get(/^\/(?!api).*/, (req, res) => {
      res.sendFile(path.join(viteDistPath, "index.html"));
    });

    //  Middleware per gestione errori centralizzata (alla fine di tutto)
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

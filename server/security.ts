import { Express, Request, Response, NextFunction } from "express";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { randomBytes } from "crypto";

/**
 * Validazione anti-spam per l'endpoint di contatto
 */
export function validateContactRequest(req: Request, res: Response, next: NextFunction) {
  const { name, email, message, to, subject } = req.body;

  // Validazione base dei campi
  if (!name || !email || !message) {
    return res.status(400).json({ error: "Tutti i campi sono obbligatori" });
  }

  // Validazione email
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: "Formato email non valido" });
  }

  // Controllo lunghezza messaggio (prevenzione spam)
  if (message.length < 10 || message.length > 2000) {
    return res.status(400).json({ 
      error: "Il messaggio deve essere tra 10 e 2000 caratteri" 
    });
  }

  // Controllo lunghezza nome
  if (name.length < 2 || name.length > 100) {
    return res.status(400).json({ 
      error: "Il nome deve essere tra 2 e 100 caratteri" 
    });
  }

  // Rilevamento spam: troppi link nel messaggio
  const linkRegex = /https?:\/\/[^\s]+/g;
  const links = message.match(linkRegex) || [];
  if (links.length > 3) {
    return res.status(400).json({ 
      error: "Troppi link nel messaggio. Massimo 3 link consentiti." 
    });
  }

  // Rilevamento spam: parole chiave sospette
  const spamKeywords = [
    'casino', 'poker', 'bet', 'loan', 'credit', 'viagra', 'cialis',
    'weight loss', 'diet', 'make money', 'earn money', 'work from home',
    'lottery', 'winner', 'prize', 'free money', 'inheritance', 'nigerian',
    'urgent', 'limited time', 'act now', 'click here', 'buy now'
  ];
  
  const messageLower = message.toLowerCase();
  const nameLower = name.toLowerCase();
  
  const foundSpamKeywords = spamKeywords.filter(keyword => 
    messageLower.includes(keyword) || nameLower.includes(keyword)
  );
  
  if (foundSpamKeywords.length > 0) {
    return res.status(400).json({ 
      error: "Il messaggio contiene contenuti non consentiti" 
    });
  }

  // Rilevamento spam: caratteri ripetuti eccessivamente
  const repeatedChars = /(.)\1{4,}/g;
  if (repeatedChars.test(message) || repeatedChars.test(name)) {
    return res.status(400).json({ 
      error: "Troppi caratteri ripetuti nel messaggio" 
    });
  }

  // Rilevamento spam: maiuscole eccessive
  const upperCaseRatio = (message.match(/[A-Z]/g) || []).length / message.length;
  if (upperCaseRatio > 0.7) {
    return res.status(400).json({ 
      error: "Troppe maiuscole nel messaggio" 
    });
  }

  next();
}

/**
 * Configurazione delle misure di sicurezza per l'ambiente di produzione
 * @param app Express application
 */
export function setupSecurity(app: Express) {
  // Aggiunge header di sicurezza
  app.use(helmet());

  // Limita le richieste ripetute per prevenire attacchi di forza bruta
  const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minuti
    max: 10,
    message: { error: "Troppi tentativi di accesso. Riprova più tardi." },
  });

  // Rate limiter specifico per reset password (più restrittivo)
  const resetPasswordLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minuti
    max: 5, // Solo 5 tentativi ogni 15 minuti
    message: { error: "Troppi tentativi di reset password. Riprova più tardi." },
    standardHeaders: true,
    legacyHeaders: false,
  });

  // Rate limiter per verifica link (prevenzione brute force)
  const verifyLinkLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minuti
    max: 10, // 10 tentativi ogni 15 minuti
    message: { error: "Troppi tentativi di verifica link. Riprova più tardi." },
    standardHeaders: true,
    legacyHeaders: false,
  });

  // ✅ NUOVO: Rate limiter specifico per l'endpoint di contatto (anti-spam)
  const contactLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 ora
    max: 5, // Solo 5 messaggi per ora per IP
    message: { error: "Troppi messaggi inviati. Riprova tra un'ora." },
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: false, // Conta anche le richieste di successo
    keyGenerator: (req) => {
      // Usa IP + User-Agent per identificare meglio i client
      return `${req.ip}-${req.get('User-Agent') || 'unknown'}`;
    }
  });

  app.use("/api/login", loginLimiter);
  app.use("/api/forgot-password", resetPasswordLimiter);
  app.use("/api/contact", contactLimiter); // ✅ NUOVO: Applica rate limiting al contatto

  // Limiter generale per tutte le API
  const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minuti
    max: 500,
    standardHeaders: true,
    legacyHeaders: false,
  });

  app.use("/api/", apiLimiter);

  // Previene clickjacking
  app.use((req: Request, res: Response, next: NextFunction) => {
    res.setHeader("X-Frame-Options", "DENY");
    next();
  });

  // Verifica variabili d'ambiente critiche in produzione
  if (process.env.NODE_ENV === "production") {
    const requiredEnvVars = ["ENCRYPTION_KEY", "SESSION_SECRET", "DB_URI"];
    const missingVars = requiredEnvVars.filter((name) => !process.env[name]);

    if (missingVars.length > 0) {
      // In un'applicazione reale, questo errore dovrebbe essere loggato
      // da un sistema centralizzato prima di terminare il processo.
      process.exit(1);
    }

    if (
      (process.env.ENCRYPTION_KEY &&
        process.env.ENCRYPTION_KEY.length < 32) ||
      (process.env.SESSION_SECRET && process.env.SESSION_SECRET.length < 32)
    ) {
      // Anche questo errore critico dovrebbe essere loggato.
      process.exit(1);
    }
  }
}

// ✅ NUOVO: Middleware CSRF migliorato
export function setupCSRF(app: Express) {
  // Genera un token CSRF se non esiste nella sessione.
  app.use((req: Request, res: Response, next: NextFunction) => {
    if (req.session && !req.session.csrfToken) {
      req.session.csrfToken = randomBytes(32).toString("hex");
    }
    next();
  });

  // Endpoint per fornire il token CSRF al client.
  app.get("/api/csrf-token", (req: Request, res: Response) => {
    if (!req.session || !req.session.csrfToken) {
      return res.status(500).json({ error: "Sessione non inizializzata correttamente." });
    }
    res.json({ csrfToken: req.session.csrfToken });
  });

  // Middleware per la validazione del token CSRF sulle richieste modificanti.
  app.use((req: Request, res: Response, next: NextFunction) => {
    if (["POST", "PUT", "DELETE", "PATCH"].includes(req.method)) {
      const csrfExemptPaths = [
        "/api/login",
        "/api/register/admin",
        "/api/forgot-password",
        "/api/reset-password",
        "/api/contact",
        "/api/verify-reset-link",
      ];

      if (csrfExemptPaths.some((path) => req.path.startsWith(path))) {
        return next();
      }

      if (!req.session || !req.session.csrfToken) {
        return res.status(403).json({ message: "Sessione o token CSRF non validi." });
      }

      const tokenFromHeader = req.headers["x-csrf-token"] as string;
      const sessionToken = req.session.csrfToken;

      if (!tokenFromHeader) {
        return res.status(403).json({ message: "Token CSRF mancante nell'header della richiesta." });
      }

      if (tokenFromHeader !== sessionToken) {
        return res.status(403).json({ message: "Token CSRF non valido." });
      }
    }
    next();
  });

  app.use((err: any, req: Request, res: Response, next: NextFunction) => {
    if (err.code === 'EBADCSRFTOKEN') {
      res.status(403).json({ message: 'Token CSRF non valido o mancante.' });
    } else {
      next(err);
    }
  });
}

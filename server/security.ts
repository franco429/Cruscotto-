import { Express, Request, Response, NextFunction } from "express";
import helmet from "helmet";
import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import { randomBytes, timingSafeEqual } from "crypto";

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
 * Conforme agli standard TAC Security CASA Tier 2 e Tier 3
 * OTTIMIZZATA: Rimozione unsafe-eval in produzione per certificazione ADA CASA
 * @param app Express application
 */
export function setupSecurity(app: Express) {
  const isProduction = process.env.NODE_ENV === "production";
  
  // Script-Src: Configurazione differenziata per dev/prod
  // In produzione: NO unsafe-eval (richiesto ADA CASA Tier 2/3)
  const scriptSrcDirectives = [
    "'self'",
    "https://accounts.google.com",
    "https://apis.google.com",
  ];
  
  // unsafe-inline solo per Vite dev mode + Google OAuth popup
  if (!isProduction) {
    scriptSrcDirectives.push("'unsafe-inline'");
    scriptSrcDirectives.push("'unsafe-eval'"); // Solo in development
  } else {
    // In produzione NON consentiamo script inline globalmente.
    // La pagina di callback OAuth imposta una CSP dedicata con nonce per consentire lo script inline sicuro solo lì.
  }
  
  // Configurazione CSP (Content Security Policy) dettagliata
  // Protezione contro XSS, injection attacks e data leaks
  app.use(
    helmet.contentSecurityPolicy({
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: scriptSrcDirectives,
        styleSrc: [
          "'self'",
          "'unsafe-inline'", // Necessario per styled components e CSS-in-JS
          "https://fonts.googleapis.com",
        ],
        fontSrc: [
          "'self'",
          "https://fonts.gstatic.com",
          "data:",
        ],
        imgSrc: [
          "'self'",
          "data:",
          "blob:",
          "https:", // Necessario per immagini Google Drive
          "https://drive.google.com",
          "https://lh3.googleusercontent.com",
        ],
        connectSrc: [
          "'self'",
          "https://accounts.google.com",
          "https://www.googleapis.com",
          "https://oauth2.googleapis.com",
          "https://drive.googleapis.com",
        ],
        frameSrc: [
          "'self'",
          "https://accounts.google.com",
          "https://drive.google.com",
        ],
        objectSrc: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'"],
        frameAncestors: ["'none'"], // Protezione clickjacking
        upgradeInsecureRequests: isProduction ? [] : null,
        // Report-URI per monitorare violazioni CSP in produzione
        ...(isProduction && {
          reportUri: "/api/csp-report",
        }),
      },
    })
  );

  // HSTS (HTTP Strict Transport Security) - Force HTTPS
  // Max-age di 2 anni (63072000 secondi) come raccomandato da OWASP
  app.use(
    helmet.hsts({
      maxAge: 63072000, // 2 anni
      includeSubDomains: true,
      preload: true, // Eligibile per HSTS preload list
    })
  );

  // X-Content-Type-Options: previene MIME type sniffing
  app.use(helmet.noSniff());

  // X-Frame-Options: protezione clickjacking (già presente ma duplicato per sicurezza)
  app.use(helmet.frameguard({ action: "deny" }));

  // X-XSS-Protection: abilita protezione XSS nel browser
  app.use(helmet.xssFilter());

  // Referrer-Policy: controlla quante informazioni vengono inviate nel referrer
  app.use(
    helmet.referrerPolicy({
      policy: "strict-origin-when-cross-origin",
    })
  );

  // Permissions-Policy (ex Feature-Policy): limita l'accesso alle API del browser
  app.use((req: Request, res: Response, next: NextFunction) => {
    res.setHeader(
      "Permissions-Policy",
      "geolocation=(), microphone=(), camera=(), payment=(), usb=(), magnetometer=(), gyroscope=(), accelerometer=()"
    );
    next();
  });

  // X-Permitted-Cross-Domain-Policies: blocca cross-domain policy
  app.use((req: Request, res: Response, next: NextFunction) => {
    res.setHeader("X-Permitted-Cross-Domain-Policies", "none");
    next();
  });

  // Cross-Origin-Embedder-Policy (COEP) e Cross-Origin-Opener-Policy (COOP)
  // Per isolamento completo del contesto
  app.use(helmet.crossOriginEmbedderPolicy({ policy: "require-corp" }));
  app.use(helmet.crossOriginOpenerPolicy({ policy: "same-origin" }));
  app.use(helmet.crossOriginResourcePolicy({ policy: "same-origin" }));

  // DNS Prefetch Control: previene DNS prefetching non autorizzato
  app.use(helmet.dnsPrefetchControl({ allow: false }));

  // IE No Open: previene IE dall'aprire file non fidati nel contesto del sito
  app.use(helmet.ieNoOpen());

  // Nascondi informazioni server
  app.use(helmet.hidePoweredBy());

  // Limita le richieste ripetute per prevenire attacchi di forza bruta
  const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, 
    max: 10,
    message: { error: "Troppi tentativi di accesso. Riprova più tardi." },
  });

  // Rate limiter specifico per reset password (più restrittivo)
  const resetPasswordLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, 
    max: 5, // Solo 5 tentativi ogni 15 minuti
    message: { error: "Troppi tentativi di reset password. Riprova più tardi." },
    standardHeaders: true,
    legacyHeaders: false,
  });

  // Rate limiter per verifica link (prevenzione brute force)
  const verifyLinkLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, 
    max: 10, 
    message: { error: "Troppi tentativi di verifica link. Riprova più tardi." },
    standardHeaders: true,
    legacyHeaders: false,
  });


  const contactLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, 
    max: 5, 
    message: { error: "Troppi messaggi inviati. Riprova tra un'ora." },
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: false, 
    keyGenerator: (req) => {
      // Usa ipKeyGenerator per gestire correttamente IPv6 + User-Agent per identificare meglio i client
      const ip = ipKeyGenerator(req);
      return `${ip}-${req.get('User-Agent') || 'unknown'}`;
    }
  });

  app.use("/api/login", loginLimiter);
  app.use("/api/forgot-password", resetPasswordLimiter);
  app.use("/api/contact", contactLimiter); //  Applica rate limiting al contatto

  // Rate limiter specifico per verifica MFA (conforme TAC Security Tier 2)
  // Configurazione più restrittiva per prevenire brute force su MFA
  const mfaLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minuti
    max: 5, // 5 tentativi ogni 15 minuti (ridotto da 8/5min)
    message: { 
      error: "Troppi tentativi di verifica MFA. Riprova tra 15 minuti.",
      code: "MFA_RATE_LIMIT_EXCEEDED"
    },
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true, // Non conta le richieste riuscite
  });

  app.use("/api/mfa/verify", mfaLimiter);
  app.use("/api/mfa/enable", mfaLimiter);

  // Limiter generale per tutte le API
  const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, 
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

/**
 * Configurazione CSRF con rotazione token automatica
 * Conforme agli standard OWASP per la prevenzione CSRF
 * MIGLIORATO: Rotazione token periodica e validazione temporale per ADA CASA Tier 2/3
 */
export function setupCSRF(app: Express) {
  // Genera un token CSRF se non esiste nella sessione o è scaduto
  app.use((req: Request, res: Response, next: NextFunction) => {
    if (req.session) {
      const now = Date.now();
      const tokenAge = req.session.csrfTokenTimestamp ? now - req.session.csrfTokenTimestamp : Infinity;
      const TOKEN_MAX_AGE = 60 * 60 * 1000; // 1 ora
      
      // Genera nuovo token se non esiste o è scaduto (rotazione automatica)
      if (!req.session.csrfToken || tokenAge > TOKEN_MAX_AGE) {
        req.session.csrfToken = randomBytes(32).toString("hex");
        req.session.csrfTokenTimestamp = now;
      }
    }
    next();
  });

  // Endpoint per fornire il token CSRF al client
  app.get("/api/csrf-token", (req: Request, res: Response) => {
    if (!req.session || !req.session.csrfToken) {
      return res.status(500).json({ error: "Sessione non inizializzata correttamente." });
    }
    
    // Forza la rigenerazione del token se richiesto esplicitamente
    if (req.query.refresh === "true") {
      req.session.csrfToken = randomBytes(32).toString("hex");
      req.session.csrfTokenTimestamp = Date.now();
    }
    
    res.json({ 
      csrfToken: req.session.csrfToken,
      expiresIn: 3600 // secondi
    });
  });

  // Middleware per la validazione del token CSRF sulle richieste modificanti
  app.use((req: Request, res: Response, next: NextFunction) => {
    if (["POST", "PUT", "DELETE", "PATCH"].includes(req.method)) {
      const csrfExemptPaths = [
        "/api/login",
        "/api/register/admin",
        "/api/forgot-password",
        "/api/reset-password",
        "/api/contact",
        "/api/verify-reset-link",
        "/api/csrf-token", // Escludi l'endpoint stesso
      ];

      if (csrfExemptPaths.some((path) => req.path.startsWith(path))) {
        return next();
      }

      if (!req.session || !req.session.csrfToken) {
        return res.status(403).json({ 
          message: "Sessione o token CSRF non validi.",
          code: "CSRF_SESSION_INVALID"
        });
      }

      const tokenFromHeader = req.headers["x-csrf-token"] as string;
      const sessionToken = req.session.csrfToken;

      if (!tokenFromHeader) {
        return res.status(403).json({ 
          message: "Token CSRF mancante nell'header della richiesta.",
          code: "CSRF_TOKEN_MISSING"
        });
      }

      // Validazione constant-time per prevenire timing attacks
      if (tokenFromHeader.length !== sessionToken.length) {
        return res.status(403).json({ 
          message: "Token CSRF non valido.",
          code: "CSRF_TOKEN_INVALID"
        });
      }

      // Confronto constant-time usando crypto
      const tokenBuffer = Buffer.from(tokenFromHeader);
      const sessionBuffer = Buffer.from(sessionToken);
      
      if (!timingSafeEqual(tokenBuffer, sessionBuffer)) {
        return res.status(403).json({ 
          message: "Token CSRF non valido.",
          code: "CSRF_TOKEN_INVALID"
        });
      }
      
      // Valida l'età del token
      const tokenAge = req.session.csrfTokenTimestamp 
        ? Date.now() - req.session.csrfTokenTimestamp 
        : Infinity;
      const TOKEN_MAX_AGE = 60 * 60 * 1000; // 1 ora
      
      if (tokenAge > TOKEN_MAX_AGE) {
        return res.status(403).json({ 
          message: "Token CSRF scaduto. Richiedi un nuovo token.",
          code: "CSRF_TOKEN_EXPIRED"
        });
      }
    }
    next();
  });

  app.use((err: any, req: Request, res: Response, next: NextFunction) => {
    if (err.code === 'EBADCSRFTOKEN') {
      res.status(403).json({ 
        message: 'Token CSRF non valido o mancante.',
        code: 'CSRF_ERROR'
      });
    } else {
      next(err);
    }
  });
}

import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express, Request, Response, NextFunction } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { mongoStorage as storage } from "./mongo-storage";
import { UserDocument as User } from "./shared-types/schema";
import { startAutomaticSync } from "./google-drive";
import { strongPasswordSchema } from "./shared-types/validators";
import { logAuth, logError } from "./logger";

const scryptAsync = promisify(scrypt);

export async function hashPassword(password: string): Promise<string> {
  try {
    strongPasswordSchema.parse(password);
  } catch (error) {
    throw new Error("Password non rispetta i requisiti di sicurezza");
  }
  
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

export async function comparePasswords(
  supplied: string,
  stored: string
): Promise<boolean> {
  if (!stored) return false;
  
  // Prima prova con scrypt (algoritmo corrente)
  const [hashed, salt] = stored.split(".");
  if (hashed && salt) {
    const hashedBuf = Buffer.from(hashed, "hex");
    const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
    if (
      hashedBuf.length === suppliedBuf.length &&
      timingSafeEqual(hashedBuf, suppliedBuf)
    ) {
      return true;
    }
  }
  
  // Se scrypt fallisce, prova con bcrypt (per compatibilità con password vecchie)
  try {
    const bcrypt = await import('bcrypt');
    const isBcryptValid = await bcrypt.compare(supplied, stored);
    return isBcryptValid;
  } catch (error) {
    // Se anche bcrypt fallisce, la password è sbagliata
    return false;
  }
}

// Middleware per la gestione del timeout della sessione
export function sessionTimeoutMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  if (req.isAuthenticated() && req.user && req.user.sessionExpiry) {
    if (new Date() > new Date(req.user.sessionExpiry)) {
      req.logout((err) => {
        if (err) return next(err);
       
        return res.status(401).json({
          message: "Sessione scaduta. Effettua nuovamente l'accesso.",
        });
      });
      return; 
    }
  }
  next();
}

export function setupAuth(app: Express) {
  // --- SECURITY CHECK: SESSION_SECRET obbligatoria e sicura ---
  const sessionSecret = process.env.SESSION_SECRET;
  if (!sessionSecret || sessionSecret.length < 32) {
    console.error('❌ CRITICAL SECURITY ERROR: SESSION_SECRET environment variable is required and must be at least 32 characters long!');
    console.error('   Please set SESSION_SECRET in your environment variables.');
    console.error('   Example: SESSION_SECRET=your-secure-32-character-key');
    process.exit(1);
  }
  const sessionSettings: session.SessionOptions = {
    secret: sessionSecret,
    resave: false,
    saveUninitialized: false,
    store: storage.sessionStore,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      maxAge: 24 * 60 * 60 * 1000, // Default a 24 ore
      httpOnly: true,
      sameSite: "lax",
    },
  };

  if (process.env.NODE_ENV === "production") {
    app.set("trust proxy", 1); // Necessario se dietro un proxy come Nginx
  }

  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(
      { usernameField: "email" },
      async (email, password, done) => {
        try {
          const user = await storage.getUserByEmail(email);

          if (!user) {
            // Non rivelare se l'utente esiste o meno per sicurezza
            return done(null, false, { message: "Credenziali non valide." });
          }

          // Controlla se l'account è bloccato per troppi tentativi falliti.
          if (user.lockoutUntil && new Date(user.lockoutUntil) > new Date()) {
            const timeLeft = Math.ceil(
              (new Date(user.lockoutUntil).getTime() - Date.now()) / 60000
            );
            return done(null, false, {
              message: `Account bloccato per troppi tentativi falliti. Riprova tra circa ${timeLeft} minuti.`,
            });
          }

          const passwordsMatch = await comparePasswords(
            password,
            user.password
          );

          if (passwordsMatch) {
            // Login riuscito: migra la password se necessario e resetta i tentativi falliti
            await migratePasswordIfNeeded(user.legacyId, password, user.password);
            await storage.resetLoginAttempts(email);
            return done(null, user);
          } else {
            // Login fallito: registra il tentativo.
            await storage.recordFailedLoginAttempt(email);
            return done(null, false, { message: "Credenziali non valide." });
          }
        } catch (error) {
          return done(error);
        }
      }
    )
  );

  passport.serializeUser((user: Express.User, done) => {
    done(null, (user as User).legacyId);
  });

  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user);
    } catch (error) {
      done(error);
    }
  });

  app.post("/api/login", (req: Request, res: Response, next: NextFunction) => {
    passport.authenticate(
      "local",
      async (
        err: Error | null,
        user: User | false,
        info: { message: string }
      ) => {
        if (err) {
          return next(err);
        }
        if (!user) {
          // Il messaggio di errore viene da `done(null, false, { message: "..." })`
          return res.status(401).json({ message: info.message });
        }

        // Login riuscito, procedi con la creazione della sessione
        req.login(user, async (loginErr) => {
          if (loginErr) {
            return next(loginErr);
          }

          try {
            const { remember } = req.body;
            const sessionDuration = remember
              ? 7 * 24 * 60 * 60 * 1000
              : 60 * 60 * 1000;
            const sessionExpiry = new Date(Date.now() + sessionDuration);
            const lastLogin = new Date();

            if (req.session.cookie) {
              req.session.cookie.maxAge = sessionDuration;
            }

            const updatedUser = await storage.updateUserSession(
              user.legacyId,
              lastLogin,
              sessionExpiry
            );

            await storage.createLog({
              userId: user.legacyId,
              action: "login",
              details: { message: "User logged in", ipAddress: req.ip },
            });

            let clientDetails = null;
            if (updatedUser?.clientId) {
              clientDetails = await storage.getClient(updatedUser.clientId);
              if (clientDetails?.driveFolderId) {
                startAutomaticSync(
                  clientDetails.driveFolderId,
                  updatedUser.legacyId
                );
              }
            }

            const { password, ...safeUser } = updatedUser || user;
            return res.status(200).json({ ...safeUser, client: clientDetails });
          } catch (e) {
            return next(e);
          }
        });
      }
    )(req, res, next);
  });

  app.post("/api/logout", async (req, res, next) => {
    try {
      if (req.user) {
        await storage.createLog({
          userId: req.user.legacyId,
          action: "logout",
          details: { message: "User logged out" },
        });
      }
      req.logout((err) => {
        if (err) return next(err);
        req.session.destroy(() => {
          res.clearCookie("connect.sid"); // Assicurati di pulire il cookie
          res
            .status(200)
            .json({ message: "Disconnessione effettuata con successo" });
        });
      });
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/user", sessionTimeoutMiddleware, async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Non autenticato" });
    }
    try {
      const { password, ...safeUser } = req.user as User;
      let clientDetails = null;
      if (safeUser.clientId) {
        clientDetails = await storage.getClient(safeUser.clientId);
      }
      res.json({ ...safeUser, client: clientDetails });
    } catch (error) {
      res.status(500).json({ message: "Errore nel recupero dei dati utente" });
    }
  });

  // Update session endpoint - called to extend session
  app.post(
    "/api/extend-session",
    sessionTimeoutMiddleware,
    async (req, res, next) => {
      try {
        if (!req.isAuthenticated()) {
          return res.status(401).json({ message: "Non autenticato" });
        }

        // Verificare se l'utente ha scelto "Ricordami" controllando la durata del cookie
        const isRememberMe =
          req.session.cookie.maxAge &&
          req.session.cookie.maxAge > 60 * 60 * 1000; // > 1 ora

        // Estendi la sessione basandosi su quanto scelto dall'utente
        const sessionDuration = isRememberMe
          ? 7 * 24 * 60 * 60 * 1000
          : 60 * 60 * 1000; // 7 giorni o 60 minuti (aumentato da 30 a 60)
        const sessionExpiry = new Date(Date.now() + sessionDuration);

        // Aggiorna l'utente nel database e ricevi l'utente aggiornato
        const updatedUser = await storage.updateUserSession(
          req.user.legacyId,
          null,
          sessionExpiry
        );

        // Update session - sia nell'oggetto req.user che nella durata cookie
        req.user.sessionExpiry = sessionExpiry;
        if (req.session && req.session.cookie) {
          req.session.cookie.maxAge = sessionDuration;
        }

        let clientDetails = null;
        if (updatedUser?.clientId) {
          clientDetails = await storage.getClient(updatedUser.clientId);
        }

        res.json({
          message: "Sessione estesa",
          sessionExpiry,
          isRememberMe,
          client: clientDetails,
        });
      } catch (error) {
        next(error);
      }
    }
  );
}

// Funzione per migrare password da bcrypt a scrypt
export async function migratePasswordIfNeeded(
  userId: number,
  suppliedPassword: string,
  storedPassword: string
): Promise<void> {
  try {
    // Controlla se la password è in formato bcrypt (inizia con $2b$)
    if (storedPassword.startsWith('$2b$')) {
      const bcrypt = await import('bcrypt');
      const isBcryptValid = await bcrypt.compare(suppliedPassword, storedPassword);
      
      if (isBcryptValid) {
        // Migra la password a scrypt
        const newHashedPassword = await hashPassword(suppliedPassword);
        const { mongoStorage } = await import('./mongo-storage');
        await mongoStorage.updateUserPassword(userId, newHashedPassword);
        
        console.log(`✅ Password migrata per utente ${userId} da bcrypt a scrypt`);
      }
    }
  } catch (error) {
    console.error(`❌ Errore nella migrazione password per utente ${userId}:`, (error as Error).message);
  }
}

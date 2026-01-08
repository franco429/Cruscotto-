import type { Express, Request, Response, NextFunction } from "express";
import { mongoStorage } from "./mongo-storage";
import {
  setupMFA,
  enableMFA,
  disableMFA,
  verifyMFALogin,
  regenerateBackupCodes,
} from "./mfa-service";
import { logAuth, logError } from "./logger";
import logger from "./logger";

/**
 * Middleware per verificare che l'utente sia autenticato
 */
const isAuthenticated = (req: Request, res: Response, next: NextFunction) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Non autenticato" });
  }
  next();
};

/**
 * Middleware per verificare che l'utente sia admin o superadmin
 */
const isAdminOrSuperAdmin = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Non autenticato" });
  }
  
  const user = req.user;
  if (user.role !== "admin" && user.role !== "superadmin") {
    return res.status(403).json({ 
      message: "MFA è disponibile solo per amministratori" 
    });
  }
  
  next();
};

/**
 * Registra le route per la gestione MFA
 */
export function registerMFARoutes(app: Express) {
  /**
   * POST /api/mfa/setup
   * Inizia il setup MFA per l'utente corrente
   * Restituisce: secret, QR code e backup codes
   */
  app.post(
    "/api/mfa/setup",
    isAuthenticated,
    isAdminOrSuperAdmin,
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const user = req.user;

        // Verifica se MFA è già abilitato
        if (user.mfaEnabled) {
          return res.status(400).json({
            message: "MFA è già abilitato per questo account",
          });
        }

        const result = await setupMFA(user.legacyId, user.email);

        logger.info("MFA setup initiated", {
          userId: user.legacyId,
          email: user.email,
          role: user.role,
        });

        res.status(200).json({
          message: "Setup MFA avviato con successo",
          qrCode: result.qrCode,
          secret: result.secret,
          backupCodes: result.backupCodes,
        });
      } catch (error) {
        logError(error as Error, {
          context: "POST /api/mfa/setup",
          userId: req.user?.legacyId,
        });
        res.status(500).json({
          message: "Errore durante il setup MFA",
        });
      }
    }
  );

  /**
   * POST /api/mfa/enable
   * Verifica il token TOTP e attiva MFA
   * Body: { token: string }
   */
  app.post(
    "/api/mfa/enable",
    isAuthenticated,
    isAdminOrSuperAdmin,
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const user = req.user;
        const { token } = req.body;

        if (!token) {
          return res.status(400).json({
            message: "Token richiesto",
          });
        }

        // Verifica se MFA è già abilitato
        if (user.mfaEnabled) {
          return res.status(400).json({
            message: "MFA è già abilitato per questo account",
          });
        }

        const success = await enableMFA(user.legacyId, token);

        if (success) {
          logger.info("MFA enabled successfully", {
            userId: user.legacyId,
            email: user.email,
            role: user.role,
          });

          res.status(200).json({
            message: "MFA abilitato con successo",
            mfaEnabled: true,
          });
        } else {
          logger.warn("MFA enable failed - invalid token", {
            userId: user.legacyId,
            email: user.email,
          });

          res.status(400).json({
            message: "Token non valido. Riprova.",
          });
        }
      } catch (error) {
        logError(error as Error, {
          context: "POST /api/mfa/enable",
          userId: req.user?.legacyId,
        });
        res.status(500).json({
          message: "Errore durante l'attivazione MFA",
        });
      }
    }
  );

  /**
   * POST /api/mfa/verify
   * Verifica il token MFA durante il login
   * Body: { token: string, useBackupCode?: boolean }
   */
  app.post(
    "/api/mfa/verify",
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { token, useBackupCode } = req.body;

        if (!token) {
          return res.status(400).json({
            message: "Token richiesto",
          });
        }

        // Recupera userId dalla sessione temporanea
        const userId = req.session?.pendingMfaUserId;
        const remember = req.session?.pendingMfaRemember || false;

        if (!userId) {
          return res.status(400).json({
            message: "Sessione MFA non valida. Effettua nuovamente il login.",
          });
        }

        const user = await mongoStorage.getUser(userId);
        if (!user) {
          return res.status(404).json({
            message: "Utente non trovato",
          });
        }

        // Verifica il token MFA
        const isValid = await verifyMFALogin(
          userId,
          token,
          useBackupCode || false
        );

        if (isValid) {
          // Token valido - reset tenta falliti MFA (best effort)
          try { await mongoStorage.resetMfaAttempts(userId); } catch (_) {}

          // Rigenera l'ID di sessione per prevenire session fixation, poi completa il login
          if (req.session) {
            const remembered = remember;
            return req.session.regenerate((regenErr) => {
              if (regenErr) {
                return next(regenErr);
              }

              req.login(user, async (loginErr) => {
                if (loginErr) {
                  return next(loginErr);
                }

                try {
                  const sessionDuration = remembered
                    ? 7 * 24 * 60 * 60 * 1000
                    : 60 * 60 * 1000;
                  const sessionExpiry = new Date(Date.now() + sessionDuration);
                  const lastLogin = new Date();

                  if (req.session && req.session.cookie) {
                    req.session.cookie.maxAge = sessionDuration;
                  }

                  const updatedUser = await mongoStorage.updateUserSession(
                    user.legacyId,
                    lastLogin,
                    sessionExpiry
                  );

                  await mongoStorage.createLog({
                    userId: user.legacyId,
                    action: "login_mfa_verified",
                    documentId: null,
                    details: {
                      message: "User logged in with MFA",
                      ipAddress: req.ip,
                      usedBackupCode: useBackupCode || false,
                    },
                  });

                  let clientDetails = null;
                  if (updatedUser?.clientId) {
                    clientDetails = await mongoStorage.getClient(
                      updatedUser.clientId
                    );
                  }

                  const { password, mfaSecret, mfaBackupCodes, ...safeUser } =
                    updatedUser || user;

                  // Avvisa se i backup codes stanno finendo
                  let backupCodesWarning = null;
                  if (
                    useBackupCode &&
                    mfaBackupCodes &&
                    mfaBackupCodes.length <= 3
                  ) {
                    backupCodesWarning = `Attenzione: ti rimangono solo ${mfaBackupCodes.length} backup codes. Considera di rigenerarli.`;
                  }

                  logger.info("MFA verification successful - user logged in", {
                    userId: user.legacyId,
                    email: user.email,
                    usedBackupCode: useBackupCode || false,
                  });

                  return res.status(200).json({
                    ...safeUser,
                    client: clientDetails,
                    backupCodesWarning,
                  });
                } catch (e) {
                  return next(e);
                }
              });
            });
          }

          // Fallback se sessione non disponibile
          req.login(user, async (loginErr) => {
            if (loginErr) {
              return next(loginErr);
            }

            try {
              const sessionDuration = remember
                ? 7 * 24 * 60 * 60 * 1000
                : 60 * 60 * 1000;
              const sessionExpiry = new Date(Date.now() + sessionDuration);
              const lastLogin = new Date();
              const updatedUser = await mongoStorage.updateUserSession(
                user.legacyId,
                lastLogin,
                sessionExpiry
              );
              await mongoStorage.createLog({
                userId: user.legacyId,
                action: "login_mfa_verified",
                documentId: null,
                details: { message: "User logged in with MFA", ipAddress: req.ip, usedBackupCode: useBackupCode || false },
              });
              const { password, mfaSecret, mfaBackupCodes, ...safeUser } = updatedUser || user;
              return res.status(200).json({ ...safeUser, client: null });
            } catch (e) {
              return next(e);
            }
          });
        } else {
          // Token non valido - registra tentativo fallito per protezione brute force
          await mongoStorage.recordFailedMfaAttempt(userId);
          
          // Ricarica l'utente per ottenere lo stato aggiornato del lockout
          const updatedUser = await mongoStorage.getUser(userId);
          
          logger.warn("MFA verification failed", {
            userId,
            usedBackupCode: useBackupCode || false,
            failedAttempts: updatedUser?.mfaFailedAttempts || 0,
            locked: updatedUser?.mfaLockoutUntil ? new Date(updatedUser.mfaLockoutUntil) > new Date() : false,
          });

          // Messaggio specifico se l'account è ora bloccato
          if (updatedUser?.mfaLockoutUntil && new Date(updatedUser.mfaLockoutUntil) > new Date()) {
            const timeLeft = Math.ceil(
              (new Date(updatedUser.mfaLockoutUntil).getTime() - Date.now()) / 60000
            );
            return res.status(429).json({
              message: `Account temporaneamente bloccato per troppi tentativi falliti. Riprova tra circa ${timeLeft} minuti.`,
              code: "MFA_ACCOUNT_LOCKED",
              lockoutUntil: updatedUser.mfaLockoutUntil,
            });
          }

          res.status(401).json({
            message: useBackupCode
              ? "Backup code non valido"
              : "Token non valido",
            remainingAttempts: updatedUser?.mfaFailedAttempts ? Math.max(0, 3 - updatedUser.mfaFailedAttempts) : 3,
          });
        }
      } catch (error) {
        logError(error as Error, {
          context: "POST /api/mfa/verify",
        });
        res.status(500).json({
          message: "Errore durante la verifica MFA",
        });
      }
    }
  );

  /**
   * POST /api/mfa/disable
   * Disabilita MFA per l'utente corrente
   * Body: { password: string }
   */
  app.post(
    "/api/mfa/disable",
    isAuthenticated,
    isAdminOrSuperAdmin,
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const user = req.user;
        const { password } = req.body;

        if (!password) {
          return res.status(400).json({
            message: "Password richiesta per disabilitare MFA",
          });
        }

        if (!user.mfaEnabled) {
          return res.status(400).json({
            message: "MFA non è abilitato per questo account",
          });
        }

        const success = await disableMFA(user.legacyId, password);

        if (success) {
          logger.info("MFA disabled successfully", {
            userId: user.legacyId,
            email: user.email,
          });

          res.status(200).json({
            message: "MFA disabilitato con successo",
            mfaEnabled: false,
          });
        } else {
          logger.warn("MFA disable failed - invalid password", {
            userId: user.legacyId,
            email: user.email,
          });

          res.status(401).json({
            message: "Password non valida",
          });
        }
      } catch (error) {
        logError(error as Error, {
          context: "POST /api/mfa/disable",
          userId: req.user?.legacyId,
        });
        res.status(500).json({
          message: "Errore durante la disabilitazione MFA",
        });
      }
    }
  );

  /**
   * POST /api/mfa/regenerate-backup-codes
   * Rigenera i backup codes per l'utente corrente
   * Body: { password: string }
   */
  app.post(
    "/api/mfa/regenerate-backup-codes",
    isAuthenticated,
    isAdminOrSuperAdmin,
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const user = req.user;
        const { password } = req.body;

        if (!password) {
          return res.status(400).json({
            message: "Password richiesta per rigenerare i backup codes",
          });
        }

        if (!user.mfaEnabled) {
          return res.status(400).json({
            message: "MFA non è abilitato per questo account",
          });
        }

        const backupCodes = await regenerateBackupCodes(
          user.legacyId,
          password
        );

        if (backupCodes) {
          logger.info("Backup codes regenerated successfully", {
            userId: user.legacyId,
            email: user.email,
          });

          res.status(200).json({
            message: "Backup codes rigenerati con successo",
            backupCodes,
          });
        } else {
          logger.warn("Backup codes regeneration failed - invalid password", {
            userId: user.legacyId,
            email: user.email,
          });

          res.status(401).json({
            message: "Password non valida",
          });
        }
      } catch (error) {
        logError(error as Error, {
          context: "POST /api/mfa/regenerate-backup-codes",
          userId: req.user?.legacyId,
        });
        res.status(500).json({
          message: "Errore durante la rigenerazione dei backup codes",
        });
      }
    }
  );

  /**
   * GET /api/mfa/status
   * Ottieni lo stato MFA dell'utente corrente
   */
  app.get(
    "/api/mfa/status",
    isAuthenticated,
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const user = req.user;

        const backupCodesCount = user.mfaBackupCodes
          ? user.mfaBackupCodes.length
          : 0;

        logger.info("MFA status requested", {
          userId: user.legacyId,
          email: user.email,
        });

        res.status(200).json({
          mfaEnabled: user.mfaEnabled || false,
          mfaAvailable: user.role === "admin" || user.role === "superadmin",
          backupCodesCount,
          backupCodesLow: backupCodesCount > 0 && backupCodesCount <= 3,
        });
      } catch (error) {
        logError(error as Error, {
          context: "GET /api/mfa/status",
          userId: req.user?.legacyId,
        });
        res.status(500).json({
          message: "Errore durante il recupero dello stato MFA",
        });
      }
    }
  );
}


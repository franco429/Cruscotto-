import { authenticator } from "otplib";
import { randomBytes, createHash } from "crypto";
import * as QRCode from "qrcode";
import { mongoStorage } from "./mongo-storage";
import { logError } from "./logger";
import logger from "./logger";

/**
 * Servizio per la gestione della Multi-Factor Authentication (MFA)
 * Utilizza TOTP (Time-based One-Time Password) tramite otplib
 */

// Configurazione TOTP
authenticator.options = {
  window: 1, // Permette +/- 30 secondi di tolleranza
  step: 30, // Token valido per 30 secondi
};

/**
 * Genera un secret per MFA per un utente
 * @param email Email dell'utente
 * @returns Secret in formato base32
 */
export function generateMFASecret(email: string): string {
  return authenticator.generateSecret();
}

/**
 * Genera l'URL per il QR code da mostrare nell'app authenticator
 * @param email Email dell'utente
 * @param secret Secret MFA dell'utente
 * @returns URL otpauth://
 */
export function generateOTPAuthURL(email: string, secret: string): string {
  const issuer = "SGI Cruscotto";
  return authenticator.keyuri(email, issuer, secret);
}

/**
 * Genera il QR code come Data URL (base64)
 * @param email Email dell'utente
 * @param secret Secret MFA dell'utente
 * @returns Promise<string> Data URL del QR code
 */
export async function generateQRCode(
  email: string,
  secret: string
): Promise<string> {
  try {
    const otpauthUrl = generateOTPAuthURL(email, secret);
    const qrCodeDataUrl = await QRCode.toDataURL(otpauthUrl);
    return qrCodeDataUrl;
  } catch (error) {
    logError(error as Error, {
      context: "generateQRCode",
      email,
    });
    throw new Error("Errore nella generazione del QR code");
  }
}

/**
 * Verifica un token TOTP
 * @param token Token a 6 cifre fornito dall'utente
 * @param secret Secret MFA dell'utente
 * @returns boolean True se il token è valido
 */
export function verifyMFAToken(token: string, secret: string): boolean {
  try {
    // Rimuovi spazi bianchi e caratteri non numerici
    const sanitizedToken = token.replace(/\s/g, "");
    
    if (!/^\d{6}$/.test(sanitizedToken)) {
      return false;
    }

    return authenticator.verify({
      token: sanitizedToken,
      secret: secret,
    });
  } catch (error) {
    logError(error as Error, {
      context: "verifyMFAToken",
    });
    return false;
  }
}

/**
 * Genera backup codes per il recupero dell'account
 * @param count Numero di backup codes da generare (default: 10)
 * @returns Array di backup codes
 */
export function generateBackupCodes(count: number = 10): string[] {
  const codes: string[] = [];
  for (let i = 0; i < count; i++) {
    // Genera un codice di 8 caratteri alfanumerici
    const code = randomBytes(4).toString("hex").toUpperCase();
    // Formato: XXXX-XXXX per migliore leggibilità
    const formattedCode = `${code.slice(0, 4)}-${code.slice(4)}`;
    codes.push(formattedCode);
  }
  return codes;
}

/**
 * Hash di un backup code per lo storage sicuro
 * @param code Backup code in chiaro
 * @returns Hash del backup code
 */
export function hashBackupCode(code: string): string {
  return createHash("sha256").update(code).digest("hex");
}

/**
 * Verifica un backup code
 * @param code Backup code fornito dall'utente
 * @param hashedCodes Array di backup codes hashati nel database
 * @returns boolean True se il codice è valido
 */
export function verifyBackupCode(
  code: string,
  hashedCodes: string[]
): boolean {
  const hashedInput = hashBackupCode(code.replace(/\s/g, "").toUpperCase());
  return hashedCodes.includes(hashedInput);
}

/**
 * Rimuove un backup code usato dall'array
 * @param code Backup code usato
 * @param hashedCodes Array corrente di backup codes hashati
 * @returns Array aggiornato senza il code usato
 */
export function removeUsedBackupCode(
  code: string,
  hashedCodes: string[]
): string[] {
  const hashedInput = hashBackupCode(code.replace(/\s/g, "").toUpperCase());
  return hashedCodes.filter((c) => c !== hashedInput);
}

/**
 * Setup MFA per un utente
 * @param userId ID dell'utente
 * @param email Email dell'utente
 * @returns Object con secret e QR code
 */
export async function setupMFA(
  userId: number,
  email: string
): Promise<{ secret: string; qrCode: string; backupCodes: string[] }> {
  try {
    // Genera secret
    const secret = generateMFASecret(email);

    // Genera QR code
    const qrCode = await generateQRCode(email, secret);

    // Genera backup codes
    const backupCodes = generateBackupCodes(10);
    const hashedBackupCodes = backupCodes.map(hashBackupCode);

    // Salva nel database (non ancora abilitato)
    await mongoStorage.updateUser(userId, {
      mfaSecret: secret,
      mfaEnabled: false, // Non ancora attivo finché non viene verificato
      mfaBackupCodes: hashedBackupCodes,
    });

    logger.info("MFA setup initiated", {
      userId,
      action: "mfa_setup_initiated",
      email,
      success: true,
    });

    return {
      secret,
      qrCode,
      backupCodes, // Restituisci i codici in chiaro solo questa volta
    };
  } catch (error) {
    logError(error as Error, {
      context: "setupMFA",
      userId,
      email,
    });
    throw new Error("Errore durante il setup MFA");
  }
}

/**
 * Verifica e attiva MFA per un utente
 * @param userId ID dell'utente
 * @param token Token TOTP da verificare
 * @returns boolean True se attivato con successo
 */
export async function enableMFA(
  userId: number,
  token: string
): Promise<boolean> {
  try {
    const user = await mongoStorage.getUser(userId);
    if (!user || !user.mfaSecret) {
      throw new Error("Setup MFA non trovato");
    }

    // Verifica il token
    const isValid = verifyMFAToken(token, user.mfaSecret);
    
    if (isValid) {
      // Attiva MFA
      await mongoStorage.updateUser(userId, {
        mfaEnabled: true,
      });

      logger.info("MFA enabled", {
        userId,
        action: "mfa_enabled",
        email: user.email,
        success: true,
      });

      return true;
    }

    logger.warn("MFA enable failed", {
      userId,
      action: "mfa_enable_failed",
      email: user.email,
      success: false,
      reason: "Invalid token",
    });

    return false;
  } catch (error) {
    logError(error as Error, {
      context: "enableMFA",
      userId,
    });
    return false;
  }
}

/**
 * Disabilita MFA per un utente
 * @param userId ID dell'utente
 * @param password Password dell'utente per conferma
 * @returns boolean True se disabilitato con successo
 */
export async function disableMFA(
  userId: number,
  password: string
): Promise<boolean> {
  try {
    const user = await mongoStorage.getUser(userId);
    if (!user) {
      throw new Error("Utente non trovato");
    }

    // Verifica password prima di disabilitare
    const { comparePasswords } = await import("./auth");
    const isPasswordValid = await comparePasswords(password, user.password);

    if (!isPasswordValid) {
      logger.warn("MFA disable failed", {
        userId,
        action: "mfa_disable_failed",
        email: user.email,
        success: false,
        reason: "Invalid password",
      });
      return false;
    }

    // Disabilita MFA e rimuovi secret e backup codes
    await mongoStorage.updateUser(userId, {
      mfaEnabled: false,
      mfaSecret: null,
      mfaBackupCodes: null,
    });

    logger.info("MFA disabled", {
      userId,
      action: "mfa_disabled",
      email: user.email,
      success: true,
    });

    return true;
  } catch (error) {
    logError(error as Error, {
      context: "disableMFA",
      userId,
    });
    return false;
  }
}

/**
 * Verifica MFA durante il login
 * @param userId ID dell'utente
 * @param token Token TOTP o backup code
 * @param useBackupCode Se true, verifica come backup code
 * @returns boolean True se verificato con successo
 */
export async function verifyMFALogin(
  userId: number,
  token: string,
  useBackupCode: boolean = false
): Promise<boolean> {
  try {
    const user = await mongoStorage.getUser(userId);
    if (!user || !user.mfaEnabled || !user.mfaSecret) {
      return false;
    }

    // PROTEZIONE BRUTE FORCE: Verifica se l'utente è bloccato per troppi tentativi MFA falliti
    if (user.mfaLockoutUntil && new Date(user.mfaLockoutUntil) > new Date()) {
      const timeLeft = Math.ceil(
        (new Date(user.mfaLockoutUntil).getTime() - Date.now()) / 60000
      );
      logger.warn("MFA verification blocked - account locked", {
        userId,
        email: user.email,
        lockoutUntil: user.mfaLockoutUntil,
        timeLeftMinutes: timeLeft,
      });
      return false;
    }

    if (useBackupCode) {
      // Verifica backup code
      if (!user.mfaBackupCodes || user.mfaBackupCodes.length === 0) {
        return false;
      }

      const isValid = verifyBackupCode(token, user.mfaBackupCodes);
      
      if (isValid) {
        // Rimuovi il backup code usato
        const updatedBackupCodes = removeUsedBackupCode(
          token,
          user.mfaBackupCodes
        );

        await mongoStorage.updateUser(userId, {
          mfaBackupCodes: updatedBackupCodes,
        });

        logger.info("MFA login with backup code successful", {
          userId,
          action: "mfa_login_backup_code",
          email: user.email,
          success: true,
          remainingBackupCodes: updatedBackupCodes.length,
        });

        return true;
      }

      logger.warn("MFA login with backup code failed", {
        userId,
        action: "mfa_login_backup_code_failed",
        email: user.email,
        success: false,
      });

      return false;
    } else {
      // Verifica token TOTP
      const isValid = verifyMFAToken(token, user.mfaSecret);
      
      if (isValid) {
        logger.info("MFA login with TOTP successful", {
          userId,
          action: "mfa_login_totp",
          email: user.email,
          success: true,
        });
      } else {
        logger.warn("MFA login with TOTP failed", {
          userId,
          action: "mfa_login_totp",
          email: user.email,
          success: false,
        });
      }

      return isValid;
    }
  } catch (error) {
    logError(error as Error, {
      context: "verifyMFALogin",
      userId,
    });
    return false;
  }
}

/**
 * Rigenera backup codes per un utente
 * @param userId ID dell'utente
 * @param password Password dell'utente per conferma
 * @returns Array di nuovi backup codes o null se fallito
 */
export async function regenerateBackupCodes(
  userId: number,
  password: string
): Promise<string[] | null> {
  try {
    const user = await mongoStorage.getUser(userId);
    if (!user || !user.mfaEnabled) {
      throw new Error("MFA non abilitato");
    }

    // Verifica password
    const { comparePasswords } = await import("./auth");
    const isPasswordValid = await comparePasswords(password, user.password);

    if (!isPasswordValid) {
      logger.warn("MFA backup codes regeneration failed", {
        userId,
        action: "mfa_regenerate_backup_codes_failed",
        email: user.email,
        success: false,
        reason: "Invalid password",
      });
      return null;
    }

    // Genera nuovi backup codes
    const backupCodes = generateBackupCodes(10);
    const hashedBackupCodes = backupCodes.map(hashBackupCode);

    await mongoStorage.updateUser(userId, {
      mfaBackupCodes: hashedBackupCodes,
    });

    logger.info("MFA backup codes regenerated", {
      userId,
      action: "mfa_backup_codes_regenerated",
      email: user.email,
      success: true,
    });

    return backupCodes;
  } catch (error) {
    logError(error as Error, {
      context: "regenerateBackupCodes",
      userId,
    });
    return null;
  }
}


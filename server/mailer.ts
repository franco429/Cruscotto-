import nodemailer from "nodemailer";
import { Request, Response } from "express";
import { generateSecureLink } from "./secure-links";
import { mongoStorage as storage } from "./mongo-storage";

// Validazione configurazione SMTP
const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_PORT = process.env.SMTP_PORT;
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASSWORD = process.env.SMTP_PASSWORD;
const SMTP_SECURE = process.env.SMTP_SECURE === "true";

// Verifica che le variabili SMTP siano configurate
if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASSWORD) {
  console.error("❌ Configurazione SMTP incompleta. Variabili richieste:");
  console.error("   SMTP_HOST:", SMTP_HOST ? "✅" : "❌");
  console.error("   SMTP_PORT:", SMTP_PORT ? "✅" : "❌");
  console.error("   SMTP_USER:", SMTP_USER ? "✅" : "❌");
  console.error("   SMTP_PASSWORD:", SMTP_PASSWORD ? "✅" : "❌");
  
  if (process.env.NODE_ENV === "production") {
    throw new Error("Configurazione SMTP richiesta per l'invio email in produzione");
  }
}

// Creiamo un transporter riutilizzabile che utilizzerà SMTP
export const transporter = nodemailer.createTransport({
  host: SMTP_HOST || "smtp.example.com",
  port: parseInt(SMTP_PORT || "587"),
  secure: SMTP_SECURE, // true per 465, false per altri
  auth: {
    user: SMTP_USER || "user@example.com",
    pass: SMTP_PASSWORD || "password",
  },
  // Timeout per evitare blocchi
  connectionTimeout: 10000,
  greetingTimeout: 5000,
  socketTimeout: 10000,
});

// Test della connessione SMTP all'avvio
transporter.verify()
  .then(() => {
    console.log("✅ Connessione SMTP verificata con successo");
  })
  .catch((error) => {
    console.error("❌ Errore nella connessione SMTP:", error.message);
    if (process.env.NODE_ENV === "production") {
      console.error("⚠️  L'invio email potrebbe non funzionare in produzione");
    }
  });

// Definizione base URL per i link nell'applicazione
const APP_URL =
  process.env.FRONTEND_URL || `http://localhost:${process.env.FRONTEND_PORT || 5173}`;

/**
 * Invia un'email di recupero password all'utente
 * @param req Request con l'email dell'utente
 * @param res Response
 */
export async function handlePasswordReset(req: Request, res: Response) {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ error: "Email obbligatoria" });
  }

  try {
    // Verifica se l'utente esiste
    const user = await storage.getUserByEmail(email);

    if (!user) {
      // Per sicurezza, non rivelare se l'email esiste o meno
      return res.status(200).json({
        success: true,
        message:
          "Se l'indirizzo email è registrato, riceverai un link per reimpostare la password.",
      });
    }

    // Genera un link sicuro per il reset della password (valido per 1 ora)
    const resetLink = generateSecureLink(
      null,
      user.legacyId,
      "reset-password",
      60 * 60 * 1000
    );
    
    // Estrai i parametri dal link API per creare il link del frontend
    const linkMatch = resetLink.match(/\/api\/secure\/(.+)\/(.+)\/(.+)/);
    if (!linkMatch) {
      throw new Error('Errore nella generazione del link di reset');
    }
    
    const [, encodedData, expires, signature] = linkMatch;
    const resetUrl = `${APP_URL}/reset-password?data=${encodedData}&expires=${expires}&signature=${signature}`;

    // Log dell'azione
    await storage.createLog({
      userId: user.legacyId,
      action: "password-reset-request",
      details: {
        email: user.email,
        timestamp: new Date().toISOString(),
        ipAddress: req.ip || "unknown",
      },
    });

    try {
      // Prepara l'email di recupero password
      // Crea il template HTML dell'email
      const emailHTML = `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Recupero Password</h2>
        <p>Hai richiesto il recupero della password per il tuo account Cruscotto SGI.</p>
        <p>Clicca sul pulsante qui sotto per reimpostare la tua password:</p>
        <p style="text-align: center;">
          <a href="${resetUrl}" style="display: inline-block; background-color: #0070f3; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Reimposta Password</a>
        </p>
        <p><strong>Nota:</strong> Questo link sarà valido per 1 ora.</p>
        <p>Se non hai richiesto il recupero della password, ignora questa email.</p>
        <hr style="border-top: 1px solid #ddd; margin: 20px 0;">
        <p style="color: #666; font-size: 12px;">Questo è un messaggio automatico, si prega di non rispondere.</p>
      </div>`;

      // Invia l'email usando nodemailer
      const info = await transporter.sendMail({
        from: `"Cruscotto SGI" <${
          SMTP_USER || "noreply@isodocmanager.it"
        }>`,
        to: user.email,
        subject: "Recupero password - Cruscotto SGI",
        text: `Hai richiesto il recupero della password. Clicca sul seguente link per reimpostare la tua password: ${resetUrl}\\n\\nQuesto link sarà valido per 1 ora.\\n\\nSe non hai richiesto il recupero della password, ignora questa email.`,
        html: emailHTML,
      });

      console.log(`✅ Email di reset password inviata a ${user.email} (MessageId: ${info.messageId})`);

      // In ambiente di sviluppo, forniamo anche l'URL per facilitare il testing
      if (process.env.NODE_ENV === "development") {
        return res.status(200).json({
          success: true,
          message:
            "Se l'indirizzo email è registrato, riceverai un link per reimpostare la password.",
          devInfo: { resetUrl },
        });
      }

      // Risposta standard
      return res.status(200).json({
        success: true,
        message:
          "Se l'indirizzo email è registrato, riceverai un link per reimpostare la password.",
      });
    } catch (emailError) {
      // Log dettagliato dell'errore per debugging
      console.error("❌ Errore nell'invio email di reset password:", {
        error: emailError.message,
        userEmail: user.email,
        resetUrl: resetUrl,
        timestamp: new Date().toISOString(),
      });

      // In sviluppo, restituiamo l'errore per facilitare il debugging
      if (process.env.NODE_ENV === "development") {
        return res.status(500).json({
          success: false,
          message: "Errore nell'invio dell'email di reset password",
          error: emailError.message,
          devInfo: { resetUrl },
        });
      }

      // In produzione, per sicurezza non riveliamo dettagli dell'errore
      return res.status(200).json({
        success: true,
        message:
          "Se l'indirizzo email è registrato, riceverai un link per reimpostare la password.",
      });
    }
  } catch (error) {
    // Per sicurezza, non riveliamo dettagli specifici dell'errore
    res.status(500).json({ error: "Errore nell'elaborazione della richiesta" });
  }
}

// Funzione per gestire le richieste di contatto
export async function handleContactRequest(req: Request, res: Response) {
  const { name, email, message } = req.body;

  // Validazione
  if (!name || !email || !message) {
    return res.status(400).json({ error: "Tutti i campi sono obbligatori" });
  }

  try {
    // Invia l'email usando nodemailer
    const info = await transporter.sendMail({
      from: `"${name}" <${email}>`,
      to: "isodocs178@gmail.com", // Email fissa di destinazione
      subject: `Richiesta di assistenza da ${name}`,
      text: message,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Nuova richiesta di assistenza</h2>
          <div style="background-color: #f5f5f5; padding: 20px; border-radius: 5px; margin: 20px 0;">
            <p><strong>Da:</strong> ${name}</p>
            <p><strong>Email:</strong> ${email}</p>
            <p><strong>Messaggio:</strong></p>
            <p style="white-space: pre-wrap;">${message}</p>
          </div>
          <hr style="border-top: 1px solid #ddd; margin: 20px 0;">
          <p style="color: #666; font-size: 12px;">
            Questo messaggio è stato inviato dal form di contatto del Sistema di Cruscotto SGI.
          </p>
        </div>
      `,
    });

    res.status(200).json({ success: true, messageId: info.messageId });
  } catch (error) {
    res.status(500).json({ error: "Errore nell'invio dell'email" });
  }
}

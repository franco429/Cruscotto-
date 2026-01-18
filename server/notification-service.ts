import nodemailer from "nodemailer";
import { DocumentDocument as Document } from "./shared-types/schema";
import { mongoStorage } from "./mongo-storage";
import { addDays, format, isAfter, isBefore, parseISO, subHours, startOfDay, endOfDay } from "date-fns";
import logger from "./logger";
import { appEvents } from "./app-events";
import { NotificationTrackerModel } from "./models/mongoose-models";

// Configurazione del transporter nodemailer
// Utilizziamo le stesse credenziali SMTP configurate nelle variabili d'ambiente

// Configurazione identica a quella in mailer.ts per coerenza
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.example.com",
  port: parseInt(process.env.SMTP_PORT || "587"),
  secure: process.env.SMTP_SECURE === "true",
  auth: {
    user: process.env.SMTP_USER || "user@example.com",
    pass: process.env.SMTP_PASSWORD || "password",
  },
});

// Configurazione di base per i preavvisi (in giorni)
const DEFAULT_WARNING_DAYS = 30; // Preavviso standard di 30 giorni

// Variabile per tenere traccia dell'intervallo di controllo
let expirationCheckInterval: NodeJS.Timeout | null = null;

// Definizione base URL per i link nell'applicazione
const APP_URL = "https://cruscotto-sgi.com";

/**
 * Verifica i documenti con date di scadenza imminenti e invia notifiche
 * @param warningDays Giorni di preavviso prima della scadenza
 */
export async function checkDocumentExpirations(
  warningDays: number = DEFAULT_WARNING_DAYS
): Promise<void> {
  try {
    logger.info("Avvio controllo scadenze documentali", { warningDays });

    // Ottieni tutti i documenti attivi (non obsoleti) da mongoStorage
    const allDocuments = await mongoStorage.getAllDocuments();
    const activeDocuments = allDocuments.filter((doc) => !doc.isObsolete);

    logger.info("Documenti attivi trovati", {
      total: allDocuments.length,
      active: activeDocuments.length,
    });

    // Data corrente
    const today = new Date();

    // Data limite per i warning (oggi + giorni di preavviso)
    const warningLimit = addDays(today, warningDays);

    const expiredDocuments: Document[] = [];
    const warningDocuments: Document[] = [];

    // Controlla ogni documento per scadenze
    for (const doc of activeDocuments) {
      // Se il documento ha una data di scadenza
      if (doc.expiryDate) {
        const expiryDate =
          typeof doc.expiryDate === "string"
            ? parseISO(doc.expiryDate)
            : doc.expiryDate;

        // Documento già scaduto
        if (isBefore(expiryDate, today)) {
          expiredDocuments.push(doc);
        }
        // Documento in scadenza entro i giorni di preavviso
        else if (isBefore(expiryDate, warningLimit)) {
          warningDocuments.push(doc);
        }
      }
    }

    logger.info("Controllo scadenze completato", {
      expired: expiredDocuments.length,
      warning: warningDocuments.length,
      warningLimit: warningLimit.toISOString(),
    });

    // Invia notifiche per documenti scaduti
    if (expiredDocuments.length > 0) {
      logger.info("Invio notifiche per documenti scaduti", {
        count: expiredDocuments.length,
      });
      await sendExpirationNotifications(expiredDocuments, "expired");
    } else {
      logger.info("Nessun documento scaduto trovato da notificare.");
    }

    // Invia notifiche per documenti in scadenza
    if (warningDocuments.length > 0) {
      logger.info("Invio notifiche per documenti in scadenza", {
        count: warningDocuments.length,
      });
      await sendExpirationNotifications(warningDocuments, "warning");
    } else {
      logger.info("Nessun documento in scadenza trovato da notificare.");
    }
  } catch (error) {
    logger.error("Errore durante il controllo scadenze documentali", {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
  }
}

/**
 * Controlla se è già stata inviata una notifica dello stesso tipo NELLA GIORNATA DI OGGI
 * @param type Tipo di notifica
 * @param clientId ID del client
 * @returns true se è necessario inviare la notifica, false altrimenti
 */
async function shouldSendNotification(
  type: "expired" | "warning",
  clientId: string
): Promise<boolean> {
  try {
    // Calcola l'inizio della giornata odierna (es. oggi alle 00:00:00)
    const startOfToday = startOfDay(new Date());

    // Cerca una notifica inviata da oggi in poi
    const todaysNotification = await NotificationTrackerModel.findOne({
      notificationType: type,
      clientId: clientId,
      sentAt: { $gte: startOfToday },
    });

    if (todaysNotification) {
      logger.info("Notifica già inviata oggi, skip invio", {
        type,
        clientId,
        sentAt: todaysNotification.sentAt,
      });
      return false;
    }

    return true;
  } catch (error) {
    logger.error("Errore durante il controllo delle notifiche precedenti", {
      error: error instanceof Error ? error.message : String(error),
      type,
      clientId,
    });
    // In caso di errore, permettiamo l'invio per sicurezza
    return true;
  }
}

/**
 * Registra l'invio di una notifica nel database
 * @param type Tipo di notifica
 * @param clientId ID del client
 * @param documents Lista dei documenti notificati
 * @param recipientEmails Lista degli email dei destinatari
 */
async function trackNotificationSent(
  type: "expired" | "warning",
  clientId: string,
  documents: Document[],
  recipientEmails: string[]
): Promise<void> {
  try {
    await NotificationTrackerModel.create({
      notificationType: type,
      clientId: clientId,
      documentIds: documents.map((doc) => doc.legacyId),
      sentAt: new Date(),
      recipientEmails: recipientEmails,
      documentCount: documents.length,
    });

    logger.info("Notifica registrata nel tracker", {
      type,
      clientId,
      documentCount: documents.length,
      recipientCount: recipientEmails.length,
    });
  } catch (error) {
    logger.error("Errore durante la registrazione della notifica", {
      error: error instanceof Error ? error.message : String(error),
      type,
      clientId,
    });
  }
}

/**
 * Invia notifiche email per documenti in scadenza o scaduti
 * @param documents Lista dei documenti
 * @param type Tipo di notifica ('expired' o 'warning')
 */
async function sendExpirationNotifications(
  documents: Document[],
  type: "expired" | "warning"
): Promise<void> {
  try {
    logger.info("Avvio invio notifiche email", {
      type,
      documentCount: documents.length,
    });

    // Ottieni TUTTI gli utenti registrati (admin, viewer, user, etc.)
    const allUsers = await mongoStorage.getAllUsers();

    logger.info("Utenti trovati nel sistema", {
      totalUsers: allUsers.length,
    });

    if (allUsers.length === 0) {
      logger.warn("Nessun utente trovato nel sistema per l'invio delle notifiche");
      return;
    }

    // Raggruppa documenti per client per una migliore organizzazione
    const documentsByClient: { [clientId: string]: Document[] } = {};

    for (const doc of documents) {
      // Determina il clientId associato al documento (se esiste)
      // In un sistema reale, potremmo avere un campo clientId sul documento
      // Per ora, possiamo usare un valore predefinito
      const clientId = doc.clientId?.toString() || "default";

      if (!documentsByClient[clientId]) {
        documentsByClient[clientId] = [];
      }

      documentsByClient[clientId].push(doc);
    }

    logger.info("Documenti raggruppati per client", {
      clientCount: Object.keys(documentsByClient).length,
      clients: Object.keys(documentsByClient),
    });

    // Invia email per ogni gruppo di client
    for (const [clientId, clientDocs] of Object.entries(documentsByClient)) {
      // Controlla se è necessario inviare la notifica per questo client
      const shouldSend = await shouldSendNotification(type, clientId);
      if (!shouldSend) {
        logger.info("Skip invio notifica per client (già inviata nelle ultime 24h)", {
          clientId,
          type,
          documentCount: clientDocs.length,
        });
        continue;
      }

      // Trova gli utenti associati a questo client (admin, viewer, user, etc.)
      // Logica: se il documento ha un clientId valido, invia solo a utenti di quel client
      //         se il documento NON ha un clientId (default), invia solo a utenti "globali" (senza clientId)
      const parsedClientId = parseInt(clientId);
      const isValidClientId = !isNaN(parsedClientId) && clientId !== "default";

      const targetUsers = allUsers.filter((user) => {
        if (isValidClientId) {
          // Documento con clientId valido → invia a utenti di quel client
          return user.clientId === parsedClientId;
        } else {
          // Documento senza clientId → invia a utenti "globali" (senza clientId assegnato)
          return !user.clientId;
        }
      });

      if (targetUsers.length === 0) {
        logger.warn("Nessun utente trovato per il client", {
          clientId,
        });
        continue;
      }

      logger.info("Invio notifiche per client", {
        clientId,
        documentCount: clientDocs.length,
        userCount: targetUsers.length,
      });

      // Crea la lista di documenti in HTML
      let docsListHTML = "";
      clientDocs.forEach((doc) => {
        const expiryDate = doc.expiryDate
          ? format(
              new Date(
                doc.expiryDate instanceof Date
                  ? doc.expiryDate.toISOString()
                  : (doc.expiryDate as string)
              ),
              "dd/MM/yyyy"
            )
          : "N/A";

        docsListHTML += `
          <tr>
            <td>${doc.title}</td>
            <td>${doc.path}</td>
            <td>${doc.revision}</td>
            <td>${expiryDate}</td>
          </tr>
        `;
      });

      // Determina oggetto e testo in base al tipo di notifica
      const isExpired = type === "expired";
      const subject = isExpired
        ? `URGENTE: ${clientDocs.length} documenti scaduti`
        : `Preavviso: ${clientDocs.length} documenti in scadenza`;

      const intro = isExpired
        ? `I seguenti documenti sono <strong>scaduti</strong> e richiedono attenzione immediata:`
        : `I seguenti documenti stanno per scadere nei prossimi ${DEFAULT_WARNING_DAYS} giorni:`;

      // Costruisci l'email HTML
      const emailHTML = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: ${isExpired ? "#d63031" : "#e17055"};">${
        isExpired ? "Documenti Scaduti" : "Documenti in Scadenza"
      }</h2>
          <p>${intro}</p>
          
          <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
            <thead>
              <tr style="background-color: #f1f1f1;">
                <th style="padding: 8px; text-align: left; border: 1px solid #ddd;">Documento</th>
                <th style="padding: 8px; text-align: left; border: 1px solid #ddd;">Percorso ISO</th>
                <th style="padding: 8px; text-align: left; border: 1px solid #ddd;">Revisione</th>
                <th style="padding: 8px; text-align: left; border: 1px solid #ddd;">Scadenza</th>
              </tr>
            </thead>
            <tbody>
              ${docsListHTML}
            </tbody>
          </table>
          
          <p style="margin-top: 20px;">
            Accedi al <a href="${APP_URL}">Sistema di Pannello di Controllo SGI</a> per gestire questi documenti.
          </p>
          
          <hr style="border-top: 1px solid #ddd; margin: 20px 0;">
          <p style="color: #666; font-size: 12px;">
            Questo è un messaggio automatico inviato dal sistema di Pannello di Controllo SGI.<br>
            Non rispondere a questa email.
          </p>
        </div>
      `;

      // Invia email a tutti gli utenti target
      const recipientEmails: string[] = [];
      for (const user of targetUsers) {
        try {
          const result = await transporter.sendMail({
            from: `"Pannello di Controllo SGI" <${
              process.env.SMTP_USER || "noreply@isodocmanager.it"
            }>`,
            to: user.email,
            subject,
            html: emailHTML,
          });

          recipientEmails.push(user.email);
          logger.info("Email inviata con successo", {
            userEmail: user.email,
            messageId: result.messageId,
            subject,
          });
        } catch (emailError) {
          logger.error("Errore nell'invio email", {
            userEmail: user.email,
            error:
              emailError instanceof Error
                ? emailError.message
                : String(emailError),
            subject,
          });
        }
      }

      // Registra l'invio della notifica solo se almeno un'email è stata inviata con successo
      if (recipientEmails.length > 0) {
        await trackNotificationSent(type, clientId, clientDocs, recipientEmails);
      }
    }

    logger.info("Invio notifiche completato", { type });
  } catch (error) {
    logger.error("Errore durante l'invio delle notifiche", {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      type,
    });
  }
}

/**
 * Avvia il controllo periodico delle scadenze documentali
 * @param checkIntervalHours Intervallo in ore tra i controlli (Consigliato: 1 ora)
 * @param warningDays Giorni di preavviso per le scadenze
 */
export function startExpirationChecks(
  checkIntervalHours: number = 1, // Non più usato in modalità cron, mantenuto per compatibilità firma
  warningDays: number = DEFAULT_WARNING_DAYS
): void {
  logger.info(
    "Sistema di controllo scadenze inizializzato (MODALITÀ CRON ESTERNO).",
    {
      mode: "external_cron",
      endpoint: "/api/internal/expiry-refresh",
      note: "Schedulazione interna disabilitata in favore di Render Cron Job"
    }
  );

  // Assicurati che non ci siano altri intervalli attivi
  stopExpirationChecks();

  // NOTA: Non avviamo più setInterval o setTimeout automatici.
  // Il controllo viene attivato esclusivamente tramite chiamata HTTP POST
  // all'endpoint /api/internal/expiry-refresh protetto da CRON_SECRET.
  // Questo evita problemi di mancato invio se il server si riavvia spesso o dorme.
}

/**
 * Interrompe il controllo periodico delle scadenze
 */
export function stopExpirationChecks(): void {
  if (expirationCheckInterval) {
    clearInterval(expirationCheckInterval);
    expirationCheckInterval = null;
  }
}

/**
 * Invia notifiche per errori di sincronizzazione critici
 * @param syncErrors Lista degli errori di sincronizzazione
 * @param context Contesto dell'errore (userId, clientId, etc.)
 */
export async function sendSyncErrorNotifications(
  syncErrors: Array<{
    message: string;
    code?: string;
    retryable?: boolean;
    context?: Record<string, any>;
  }>,
  context: {
    userId?: number;
    clientId?: number;
    clientName?: string;
    syncFolder?: string;
    processed?: number;
    failed?: number;
    duration?: number;
  }
): Promise<void> {
  try {
    // Filtra solo errori critici (non retryable o con codice specifico)
    const criticalErrors = syncErrors.filter(
      (error) =>
        !error.retryable ||
        error.code === "DRIVE_CONNECTION_FAILED" ||
        error.code === "USER_NOT_FOUND" ||
        error.code === "GLOBAL_SYNC_FAILED"
    );

    if (criticalErrors.length === 0) {
      return;
    }

    // Ottieni tutti gli utenti amministratori da mongoStorage
    const allUsers = await mongoStorage.getAllUsers();
    const admins = allUsers.filter((user) => user.role === "admin");

    if (admins.length === 0) {
      return;
    }

    // Filtra admin per client se specificato
    const targetAdmins = context.clientId
      ? admins.filter(
          (user) => user.clientId === context.clientId || !user.clientId
        )
      : admins;

    if (targetAdmins.length === 0) {
      return;
    }

    // Crea la lista degli errori in HTML
    let errorsListHTML = "";
    criticalErrors.forEach((error, index) => {
      const errorContext = error.context
        ? Object.entries(error.context)
            .map(([key, value]) => `<strong>${key}:</strong> ${value}`)
            .join(", ")
        : "N/A";

      errorsListHTML += `
        <tr>
          <td>${index + 1}</td>
          <td>${error.message}</td>
          <td>${error.code || "N/A"}</td>
          <td>${error.retryable ? "Sì" : "No"}</td>
          <td>${errorContext}</td>
        </tr>
      `;
    });

    // Statistiche della sincronizzazione
    const statsHTML =
      context.processed !== undefined
        ? `
      <div style="margin: 20px 0; padding: 15px; background-color: #f8f9fa; border-radius: 5px;">
        <h3 style="margin-top: 0;">Statistiche Sincronizzazione</h3>
        <p><strong>File processati:</strong> ${context.processed}</p>
        <p><strong>File falliti:</strong> ${context.failed}</p>
        <p><strong>Durata:</strong> ${
          context.duration ? `${Math.round(context.duration / 1000)}s` : "N/A"
        }</p>
        <p><strong>Tasso di successo:</strong> ${
          context.processed && context.failed
            ? `${Math.round(
                (context.processed / (context.processed + context.failed)) * 100
              )}%`
            : "N/A"
        }</p>
      </div>
    `
        : "";

    // Costruisci l'email HTML
    const emailHTML = `
      <div style="font-family: Arial, sans-serif; max-width: 700px; margin: 0 auto;">
        <h2 style="color: #d63031;">⚠️ Errori di Sincronizzazione Google Drive</h2>
        
        <div style="margin: 20px 0; padding: 15px; background-color: #fff3cd; border: 1px solid #ffeaa7; border-radius: 5px;">
          <h3 style="margin-top: 0; color: #856404;">Dettagli Operazione</h3>
          <p><strong>Client:</strong> ${context.clientName || "N/A"}</p>
          <p><strong>Cartella:</strong> ${context.syncFolder || "N/A"}</p>
          <p><strong>Utente:</strong> ${context.userId || "N/A"}</p>
          <p><strong>Timestamp:</strong> ${new Date().toLocaleString(
            "it-IT"
          )}</p>
        </div>

        ${statsHTML}

        <h3>Errori Critici Rilevati</h3>
        <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
          <thead>
            <tr style="background-color: #f1f1f1;">
              <th style="padding: 8px; text-align: left; border: 1px solid #ddd;">#</th>
              <th style="padding: 8px; text-align: left; border: 1px solid #ddd;">Messaggio</th>
              <th style="padding: 8px; text-align: left; border: 1px solid #ddd;">Codice</th>
              <th style="padding: 8px; text-align: left; border: 1px solid #ddd;">Retryable</th>
              <th style="padding: 8px; text-align: left; border: 1px solid #ddd;">Contesto</th>
            </tr>
          </thead>
          <tbody>
            ${errorsListHTML}
          </tbody>
        </table>
        
        <div style="margin: 20px 0; padding: 15px; background-color: #d1ecf1; border: 1px solid #bee5eb; border-radius: 5px;">
          <h4 style="margin-top: 0; color: #0c5460;">Azioni Raccomandate</h4>
          <ul>
            <li>Verificare la connessione a Google Drive</li>
            <li>Controllare le credenziali OAuth</li>
            <li>Verificare i permessi sulla cartella</li>
            <li>Controllare i log del sistema per dettagli aggiuntivi</li>
          </ul>
        </div>
        
        <p style="margin-top: 20px;">
          Accedi al <a href="${APP_URL}">Sistema di Pannello di Controllo SGI</a> per verificare lo stato della sincronizzazione.
        </p>
        
        <hr style="border-top: 1px solid #ddd; margin: 20px 0;">
        <p style="color: #666; font-size: 12px;">
          Questo è un messaggio automatico inviato dal sistema di Pannello di Controllo SGI.<br>
          Non rispondere a questa email.
        </p>
      </div>
    `;

    // Invia email a tutti gli admin target
    for (const admin of targetAdmins) {
      await transporter.sendMail({
        from: `"Pannello di Controllo SGI" <${
          process.env.SMTP_USER || "noreply@isodocmanager.it"
        }>`,
        to: admin.email,
        subject: `🚨 Errori di Sincronizzazione - ${
          context.clientName || "Sistema"
        }`,
        html: emailHTML,
      });
    }

  } catch (error) {
    console.error(
      "Errore nell'invio delle notifiche di sincronizzazione:",
      error
    );
  }
}

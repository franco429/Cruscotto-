import { google } from "googleapis";
import { Request, Response } from "express";
import { mongoStorage } from "./mongo-storage";
import dotenv from "dotenv";
import logger from "./logger";
import crypto from 'crypto'; 

dotenv.config();

/* -------------------------------------------------------------------------- */
/* HELPERS                                                                    */
/* -------------------------------------------------------------------------- */
function buildOAuthClient() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID!,
    process.env.GOOGLE_CLIENT_SECRET!,
    `${process.env.API_GOOGLE_URL}/api/google/callback`
  );
}

// <-- MODIFICA: La funzione ora accetta un parametro 'nonce'
function successHtml(nonce: string) {
  return `
    <html><body style="font:16px system-ui;-webkit-user-select:none;
                       display:flex;flex-direction:column;align-items:center;
                       justify-content:center;height:100vh">
      <div style="border:4px solid #eee;border-top-color:#3498db;
                  border-radius:50%;width:40px;height:40px;
                  animation:spin 1s linear infinite"></div>
      <div>Connessione completata! Chiudi pure la finestra…</div>
      <script nonce="${nonce}">
        window.opener?.postMessage({type:"GOOGLE_DRIVE_CONNECTED"},"*");
        setTimeout(()=>window.close(),1500);
      </script>
      <style>@keyframes spin{to{transform:rotate(360deg)}}</style>
    </body></html>`;
}

/* -------------------------------------------------------------------------- */
/* STEP 1 – Redirect all'account Google                                       */
/* -------------------------------------------------------------------------- */
export async function googleAuth(req: Request, res: Response) {
  const clientId = Number(req.query.clientId);
  if (!clientId) return res.status(400).send("Client ID mancante");

  const existing = await mongoStorage.getClient(clientId);
  const hasRefresh = !!existing?.google?.refreshToken;

  const authUrl = buildOAuthClient().generateAuthUrl({
    access_type: "offline",
    scope: ["https://www.googleapis.com/auth/drive.readonly"],
    state: String(clientId),
    ...(hasRefresh ? {} : { prompt: "consent" }),
  });

  // MODIFICA: Invece di res.redirect("/"), reindirizziamo all'URL di autenticazione
  res.redirect(authUrl);
}

/* -------------------------------------------------------------------------- */
/* STEP 2 – Callback da Google                                                */
/* -------------------------------------------------------------------------- */
export async function googleAuthCallback(req: Request, res: Response) {
  const { code, state } = req.query;
  if (!code || !state) return res.status(400).send("Dati mancanti nella query");

  const clientId = Number(state);
  if (Number.isNaN(clientId))
    return res.status(400).send("clientId non valido");

  try {
    // <-- MODIFICA: Genera il nonce all'inizio della funzione try
    const nonce = crypto.randomBytes(16).toString('base64');

    // <-- MODIFICA: Imposta l'header CSP per permettere lo script con il nonce
    res.setHeader(
      'Content-Security-Policy',
      `script-src 'self' 'nonce-${nonce}'`
    );

    const { tokens } = await buildOAuthClient().getToken(String(code));

    if (!tokens.refresh_token) {
      const existing = await mongoStorage.getClient(clientId);
      if (existing?.google?.refreshToken) {
        // <-- MODIFICA: Invia l'HTML di successo con il nonce
        return res.send(successHtml(nonce));
      }

      // Errore che andrebbe loggato centralmente.
      return res
        .status(400)
        .send(
          "Refresh-token non ricevuto. Revoca l'accesso all'app da " +
            "https://myaccount.google.com/permissions e riprova."
        );
    }

    await mongoStorage.updateClientTokens(clientId, {
      refreshToken: tokens.refresh_token,
    });

    // Avvia sincronizzazione automatica dopo la connessione
    try {
      const client = await mongoStorage.getClient(clientId);
      if (client?.driveFolderId) {
        // Trova l'admin del client per avviare la sync
        const users = await mongoStorage.getUsersByClientId(clientId);
        const adminUser = users.find(user => user.role === 'admin');
        
        if (adminUser) {
          // Importa la funzione di sync
          const { syncWithGoogleDrive } = await import('./google-drive');
          
          // Avvia la sincronizzazione in background
          syncWithGoogleDrive(client.driveFolderId, adminUser.legacyId)
            .then(result => {
              logger.info('Auto-sync completed after Google Drive connection', {
                clientId,
                userId: adminUser.legacyId,
                success: result.success,
                processed: result.processed,
                failed: result.failed,
                duration: result.duration
              });
            })
            .catch(error => {
              logger.error('Auto-sync failed after Google Drive connection', {
                clientId,
                userId: adminUser.legacyId,
                error: error instanceof Error ? error.message : String(error)
              });
            });
        }
      }
    } catch (syncError) {
      // Non bloccare il processo di connessione se la sync fallisce
      logger.warn('Failed to start auto-sync after Google Drive connection', {
        clientId,
        error: syncError instanceof Error ? syncError.message : String(syncError)
      });
    }

    // <-- MODIFICA: Invia l'HTML di successo finale con il nonce
    res.send(successHtml(nonce));
  } catch (err) {
    // Errore che andrebbe loggato centralmente.
    res
      .status(500)
      .send("Errore durante l'accesso a Google. Chiudi la finestra e riprova.");
  }
}

/* -------------------------------------------------------------------------- */
/* Utility per ottenere un client Drive                                       */
/* -------------------------------------------------------------------------- */
export async function getDriveClientForClient(clientId: number) {
  const { google: g } = (await mongoStorage.getClient(clientId)) ?? {};
  if (!g?.refreshToken) throw new Error("Refresh-token mancante");

  const auth = buildOAuthClient();
  auth.setCredentials({ refresh_token: g.refreshToken });

  // Tentiamo subito un refresh per verificare il token
  try {
    await auth.getAccessToken();
  } catch (err: any) {
    if (err?.response?.data?.error === "invalid_grant") {
      await mongoStorage.clearClientTokens(clientId);
      throw new Error(
        "Refresh-token scaduto/revocato – l'utente deve riconnettere Google Drive"
      );
    }
    throw err;
  }

  return google.drive({ version: "v3", auth });
}

/* -------------------------------------------------------------------------- */
/* Se serve generare manualmente l'URL                                        */
/* -------------------------------------------------------------------------- */
export function getGoogleAuthUrl(clientId: number): string {
  const url = buildOAuthClient().generateAuthUrl({
    access_type: "offline",
    scope: ["https://www.googleapis.com/auth/drive.readonly"],
    state: String(clientId),
  });
  return url;
}
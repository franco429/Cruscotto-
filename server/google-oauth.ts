import { google } from "googleapis";
import { Request, Response } from "express";
import { mongoStorage } from "./mongo-storage";
import dotenv from "dotenv";
import logger from "./logger";
import crypto from "crypto";

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

function successHtml(nonce: string) {
  return `<!DOCTYPE html>
<html>
<head>
  <title>Autorizzazione Completata</title>
  <style>
    body { font-family: Arial, sans-serif; text-align: center; padding: 50px; background: #f0f2f5; }
    .container { max-width: 400px; margin: 0 auto; background: white; padding: 40px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
    .success { color: #28a745; font-size: 48px; margin-bottom: 20px; }
    .spinner { border: 3px solid #f3f3f3; border-top: 3px solid #28a745; border-radius: 50%; width: 30px; height: 30px; animation: spin 1s linear infinite; margin: 20px auto; }
    @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
  </style>
</head>
<body>
  <div class="container">
    <div class="success">✓</div>
    <h2>Connessione Riuscita!</h2>
    <p>Google Drive è stato connesso con successo al tuo account.</p>
    <div class="spinner"></div>
    <p><small>Puoi chiudere questa finestra...</small></p>
  </div>
  <script nonce="${nonce}">
    // Notifica la finestra padre del successo
    if (window.opener) {
      window.opener.postMessage({ type: 'GOOGLE_DRIVE_CONNECTED' }, '*');
    }
    // Chiudi automaticamente dopo 2 secondi
    setTimeout(() => window.close(), 2000);
  </script>
</body>
</html>`;
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
    const nonce = crypto.randomBytes(16).toString("base64");

    res.setHeader(
      "Content-Security-Policy",
      `script-src 'self' 'nonce-${nonce}'`
    );

    const { tokens } = await buildOAuthClient().getToken(String(code));

    if (!tokens.refresh_token) {
      const existing = await mongoStorage.getClient(clientId);
      if (existing?.google?.refreshToken) {
        return res.send(successHtml(nonce));
      }

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
        const adminUser = users.find((user) => user.role === "admin");

        if (adminUser) {
          // Importa la funzione di sync
          const { syncWithGoogleDrive } = await import("./google-drive");

          // Avvia la sincronizzazione in background
          syncWithGoogleDrive(client.driveFolderId, adminUser.legacyId)
            .then((result) => {
              logger.info("Auto-sync completed after Google Drive connection", {
                clientId,
                userId: adminUser.legacyId,
                success: result.success,
                processed: result.processed,
                failed: result.failed,
                duration: result.duration,
              });
            })
            .catch((error) => {
              logger.error("Auto-sync failed after Google Drive connection", {
                clientId,
                userId: adminUser.legacyId,
                error: error instanceof Error ? error.message : String(error),
              });
            });
        }
      }
    } catch (syncError) {
      // Non bloccare il processo di connessione se la sync fallisce
      logger.warn("Failed to start auto-sync after Google Drive connection", {
        clientId,
        error:
          syncError instanceof Error ? syncError.message : String(syncError),
      });
    }

    res.send(successHtml(nonce));
  } catch (err) {
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
/* Endpoint per generare access token dal refresh token salvato               */
/* -------------------------------------------------------------------------- */
export async function getAccessTokenForClient(req: Request, res: Response) {
  try {
    const clientId = Number(req.params.clientId);
    if (!clientId) {
      return res.status(400).json({ error: "Client ID mancante" });
    }

    const client = await mongoStorage.getClient(clientId);
    if (!client?.google?.refreshToken) {
      return res.status(400).json({ 
        error: "Refresh token non trovato. Devi riautorizzare Google Drive.",
        requiresAuth: true 
      });
    }

    const auth = buildOAuthClient();
    auth.setCredentials({ refresh_token: client.google.refreshToken });

    // Genera un nuovo access token
    const { token } = await auth.getAccessToken();
    
    if (!token) {
      return res.status(500).json({ 
        error: "Impossibile generare access token",
        requiresAuth: true 
      });
    }

    logger.info("Access token generated successfully", { 
      clientId,
      tokenLength: token.length 
    });

    res.json({ access_token: token });
  } catch (error: any) {
    logger.error("Failed to generate access token", {
      clientId: req.params.clientId,
      error: error.message
    });

    // Se il refresh token è scaduto/revocato, richiedi nuova autorizzazione
    if (error?.response?.data?.error === "invalid_grant") {
      await mongoStorage.clearClientTokens(Number(req.params.clientId));
      return res.status(401).json({
        error: "Refresh token scaduto. È necessaria una nuova autorizzazione.",
        requiresAuth: true
      });
    }

    res.status(500).json({ 
      error: "Errore durante la generazione dell'access token",
      requiresAuth: false 
    });
  }
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

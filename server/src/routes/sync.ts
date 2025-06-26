import { Router } from "express";
import { googleDriveService } from "../services/google-drive";
import { UserModel, ClientModel } from "../../models/mongoose-models";
import { logger } from "../lib/logger";

const router = Router();

router.post("/", async (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ error: "User ID is required" });
    }

    // Cerca l'utente tramite Mongoose, includendo client e googleDriveTokens
    const user = await UserModel.findOne({ legacyId: userId }).lean();
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Recupera il client associato
    const client = await ClientModel.findOne({ legacyId: user.clientId }).lean();
    if (!client?.google?.refreshToken) {
      return res.status(400).json({ error: "Google Drive not configured" });
    }
    if (!client?.driveFolderId) {
      return res.status(400).json({ error: "Drive folder not configured for client" });
    }
    // Avvia il processo di sincronizzazione.
    const syncResult = await googleDriveService.syncDocuments(userId);
    res.json({
      message: "Sync started successfully",
      result: syncResult,
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to sync documents" });
  }
});

export default router;

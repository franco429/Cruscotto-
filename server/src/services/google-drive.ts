import { google, drive_v3 } from "googleapis";
import fs from "fs";
import { pipeline } from "stream/promises";
import { getDriveClientForClient } from "../../google-oauth";
import { UserModel, ClientModel } from "../../models/mongoose-models";
import { googleDriveListFiles } from "../../google-drive-api";

export async function syncDocuments(userId: number): Promise<any> {
  console.log("🔄 [DRIVE] Inizio sincronizzazione documenti per user:", userId);

  try {
    const user = await UserModel.findOne({ legacyId: userId }).lean();
    if (!user) {
      throw new Error("User not found");
    }
    const client = await ClientModel.findOne({ legacyId: user.clientId }).lean();
    console.log("👤 [DRIVE] Dati utente:", {
      id: user?.legacyId,
      email: user?.email,
      role: user?.role,
      clientId: client?.legacyId,
      clientName: client?.name,
      hasTokens: !!client?.google?.refreshToken,
    });

    if (!client?.driveFolderId) {
      console.log("❌ [DRIVE] Cartella Drive non configurata");
      throw new Error("Drive folder not configured");
    }

    if (!client?.google?.refreshToken) {
      console.log("❌ [DRIVE] Token Google Drive non trovati");
      throw new Error("Google Drive tokens not found");
    }

    const drive = await getDriveClientForClient(client.legacyId);
    console.log("🔌 [DRIVE] Client Drive ottenuto:", !!drive);

    const files = await googleDriveListFiles(drive, client.driveFolderId);
    console.log("📄 [DRIVE] File trovati:", files.length);
    console.log(
      "📄 [DRIVE] Dettaglio file:",
      files.map((f) => ({
        name: f.name,
        id: f.id,
        mimeType: f.mimeType,
      }))
    );

    
  } catch (error) {
    console.error("❌ [DRIVE] Errore sincronizzazione:", error);
    throw error;
  }
}

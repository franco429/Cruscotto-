import { google, drive_v3 } from "googleapis";
import fs from "fs";
import { pipeline } from "stream/promises";
import { GaxiosResponse } from "gaxios";

export async function googleDriveDownloadFile(
  drive: drive_v3.Drive,
  fileId: string,
  destPath: string
): Promise<void> {
  const metadata = await drive.files.get({
    fileId,
    fields: "mimeType, name",
  });

  const mimeType = metadata.data.mimeType;
  const name = metadata.data.name;

  if (!mimeType) {
    throw new Error("Impossibile determinare il mimeType del file");
  }

  let streamRes;

  if (mimeType.startsWith("application/vnd.google-apps")) {
    let exportMime: string;

    switch (mimeType) {
      case "application/vnd.google-apps.spreadsheet":
        exportMime =
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
        break;
      case "application/vnd.google-apps.document":
        exportMime =
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
        break;
      case "application/vnd.google-apps.presentation":
        exportMime =
          "application/vnd.openxmlformats-officedocument.presentationml.presentation";
        break;
      default:
        throw new Error(`❌ Tipo Google non supportato: ${mimeType}`);
    }

    streamRes = await drive.files.export(
      { fileId, mimeType: exportMime },
      { responseType: "stream" }
    );
  } else {
    streamRes = await drive.files.get(
      { fileId, alt: "media" },
      { responseType: "stream" }
    );
  }

  const dest = fs.createWriteStream(destPath);
  await pipeline(streamRes.data, dest);
}

/**
 * Elenca tutti i file in una cartella di Google Drive e in tutte le sue sottocartelle (OAuth2).
 * Supporta paginazione e ritorna tutti i file presenti.
 * CORRETTA CON ESPLORAZIONE RICORSIVA (BFS).
 */
export async function googleDriveListFiles(
  drive: drive_v3.Drive,
  folderId: string
): Promise<drive_v3.Schema$File[]> {
  const files: drive_v3.Schema$File[] = [];
  // Coda per l'esplorazione Breadth-First Search (BFS) delle cartelle.
  const pending: string[] = [folderId]; // Inizia con la cartella radice.

  // Controlla se folderId è una cartella valida prima di iniziare.
  try {
    const initialFolder = await drive.files.get({
      fileId: folderId,
      fields: "id, mimeType",
      supportsAllDrives: true,
    });

    if (initialFolder.data.mimeType !== "application/vnd.google-apps.folder") {
      // Se non è una cartella, restituisce un array vuoto.
      console.warn(`L'ID fornito (${folderId}) non corrisponde a una cartella. Restituzione di un elenco vuoto.`);
      return [];
    }
  } catch (error) {
    console.error(`Errore nel verificare l'ID della cartella ${folderId}:`, error);
    // Se non è possibile accedere alla cartella, restituisce un array vuoto.
    return [];
  }


  while (pending.length > 0) {
    // Usa shift() per processare la coda in ordine (BFS)
    const currentFolderId = pending.shift()!;
    let pageToken: string | undefined;

    do {
      try {
        const res = await drive.files.list({
          q: `'${currentFolderId}' in parents and trashed = false`,
          fields: "nextPageToken, files(id, name, mimeType, webViewLink)",
          pageSize: 1000, // Massimo consentito
          pageToken,
          spaces: "drive",
          includeItemsFromAllDrives: true,
          supportsAllDrives: true,
        });

        if (res.data.files) {
            for (const f of res.data.files) {
                if (f.mimeType === "application/vnd.google-apps.folder") {
                    // Aggiungi la sottocartella alla coda per l'esplorazione.
                    if (f.id) pending.push(f.id);
                } else {
                    // Aggiungi solo i file, non le cartelle, alla lista dei risultati.
                    files.push(f);
                }
            }
        }

        pageToken = res.data.nextPageToken ?? undefined;
      } catch (listError) {
          console.error(`Impossibile elencare i file nella cartella ${currentFolderId}:`, listError);
          // Interrompi il loop per questa cartella se c'è un errore, ma continua con le altre.
          pageToken = undefined; 
      }
    } while (pageToken);
  }

  return files;
}

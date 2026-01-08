import { drive_v3 } from "googleapis";
import { Readable } from "stream";

// Funzione per ottenere lo stream di un file da Google Drive
export async function googleDriveGetStream(
  drive: drive_v3.Drive,
  fileId: string
): Promise<Readable> {
  const res = await drive.files.get(
    { fileId, alt: "media", supportsAllDrives: true },
    { responseType: "stream" }
  );
  return res.data;
}

// Funzione per ottenere il token iniziale per la sincronizzazione (Sync Token)
export async function googleDriveGetStartPageToken(
  drive: drive_v3.Drive
): Promise<string> {
  const res = await drive.changes.getStartPageToken({
    supportsAllDrives: true,
  });
  return res.data.startPageToken || "";
}

// Funzione per ottenere i cambiamenti (Incremental Sync)
export async function googleDriveGetChanges(
  drive: drive_v3.Drive,
  pageToken: string
): Promise<{ changes: drive_v3.Schema$Change[]; newStartPageToken: string }> {
  const allChanges: drive_v3.Schema$Change[] = [];
  let currentPageToken = pageToken;

  do {
    const res = await drive.changes.list({
      pageToken: currentPageToken,
      fields: "newStartPageToken, nextPageToken, changes(file(id, name, mimeType, webViewLink, parents, trashed), removed, fileId)",
      includeItemsFromAllDrives: true,
      supportsAllDrives: true,
      pageSize: 1000,
    });

    if (res.data.changes) {
      allChanges.push(...res.data.changes);
    }

    if (res.data.newStartPageToken) {
      // Se abbiamo un newStartPageToken, significa che siamo alla fine
      return {
        changes: allChanges,
        newStartPageToken: res.data.newStartPageToken,
      };
    }

    currentPageToken = res.data.nextPageToken || "";
  } while (currentPageToken);

  return { changes: allChanges, newStartPageToken: currentPageToken };
}

// Funzione per elencare i file in una cartella e nelle sue sottocartelle
// (Usata per la PRIMA sincronizzazione completa)
export async function googleDriveListFiles(
  drive: drive_v3.Drive,
  folderId: string
): Promise<drive_v3.Schema$File[]> {
  const files: drive_v3.Schema$File[] = [];
  
  // Se non viene passato un folderId valido, esci subito.
  if (!folderId) {
    return [];
  }

  // Verifica se il folderId è effettivamente una cartella
  try {
    const folderCheck = await drive.files.get({
      fileId: folderId,
      fields: "mimeType",
      supportsAllDrives: true,
    });
    
    if (folderCheck.data.mimeType !== "application/vnd.google-apps.folder") {
      // Se non è una cartella, restituisci array vuoto (o gestisci diversamente)
      return [];
    }
  } catch (error) {
    // Se non troviamo la cartella o errore di permessi, array vuoto
    return [];
  }

  const pending: string[] = [folderId];
  const visited = new Set<string>();
  
  while (pending.length) {
    const current = pending.pop()!;
    
    // Evita cicli infiniti
    if (visited.has(current)) {
      continue;
    }
    visited.add(current);

    let pageToken: string | undefined;

    do {
      try {
        const res = await drive.files.list({
          q: `'${current}' in parents and trashed = false`,
          fields: "nextPageToken, files(id, name, mimeType, webViewLink, parents)",
          pageSize: 1000,
          pageToken,
          supportsAllDrives: true,
          includeItemsFromAllDrives: true,
        });

        for (const f of res.data.files ?? []) {
          if (f.mimeType === "application/vnd.google-apps.folder") {
            // Aggiungi la sottocartella alla coda per l'esplorazione.
            if (f.id) pending.push(f.id);
          } else {
            // Aggiungi solo i file, non le cartelle, alla lista dei risultati.
            files.push(f);
          }
        }

        pageToken = res.data.nextPageToken ?? undefined;
      } catch (err) {
         // Se errore su una sottocartella, logghiamo e continuiamo con le altre
         console.error(`Error listing folder ${current}:`, err);
         pageToken = undefined; 
      }
    } while (pageToken);
  }

  return files;
}

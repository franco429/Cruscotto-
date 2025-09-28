// Lightweight client helper to request opening a local document via a local companion service.
// Security note: Browsers cannot open arbitrary local file paths directly. This helper
// contacts a local service (if running) on 127.0.0.1 which performs the OS-level open.

import type { DocumentDocument as Document } from "../../../shared-types/schema";

type OpenResult = { ok: boolean; message?: string };

// Interfacce per configurazioni multi-cliente
interface ClientConfig {
  clientId: string;
  drivePaths: string[];
  roots: string[];
}

interface DriveDetectionResult {
  paths: string[];
  success: boolean;
  message?: string;
}

function buildCandidateNames(doc: Document): string[] {
  const base = doc.title || "";
  const rev = doc.revision || "";
  const ext = (doc.fileType || "").replace(/^\./, "");
  const candidates = new Set<string>();
  if (base && rev && ext) {
    candidates.add(`${base} ${rev}.${ext}`);
  }
  if (base && ext) {
    candidates.add(`${base}.${ext}`);
  }
  if (base && rev) {
    candidates.add(`${base} ${rev}`);
  }
  if (base) {
    candidates.add(base);
  }
  return Array.from(candidates);
}

export async function openLocalDocument(doc: Document, abortMs = 1500): Promise<OpenResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), abortMs);

  try {
    const res = await fetch("http://127.0.0.1:17654/open", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: doc.title,
        revision: doc.revision,
        fileType: doc.fileType,
        logicalPath: doc.path, // ISO logical path, may help the local service search
        candidates: buildCandidateNames(doc),
      }),
      signal: controller.signal,
    });
    
    clearTimeout(timer);

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return { ok: false, message: text || `Servizio locale non disponibile (${res.status})` };
    }

    const data = (await res.json().catch(() => null)) as { success?: boolean; message?: string } | null;
    if (data && data.success) {
      return { ok: true };
    }
    return { ok: false, message: data?.message || "Impossibile aprire il file localmente" };
    
  } catch (err: any) {
    clearTimeout(timer);
    if (err?.name === "AbortError") {
      return { ok: false, message: "Timeout contattando il servizio locale" };
    }
    return { ok: false, message: err?.message || "Errore contattando il servizio locale" };
  }
}

// Verifica se il servizio Local Opener è disponibile
export async function checkLocalOpenerAvailability(): Promise<boolean> {
  try {
    const res = await fetch("http://127.0.0.1:17654/health", {
      method: "GET",
      signal: AbortSignal.timeout(2000), // Timeout breve per controllo rapido
    });
    return res.ok;
  } catch {
    return false;
  }
}

// Funzione per rilevare automaticamente i percorsi di Google Drive
export async function detectGoogleDrivePaths(): Promise<DriveDetectionResult> {
  try {
    const response = await fetch("http://127.0.0.1:17654/detect-drive-paths", {
      method: "GET",
      signal: AbortSignal.timeout(5000),
    });

    if (response.ok) {
      const data = await response.json();
      return {
        paths: data.paths || [],
        success: true,
        message: `Rilevati ${data.paths?.length || 0} percorsi di Google Drive`
      };
    } else {
      const errorData = await response.json().catch(() => ({}));
      return {
        paths: [],
        success: false,
        message: errorData.message || "Errore nel rilevamento dei percorsi"
      };
    }
  } catch (err: any) {
    return {
      paths: [],
      success: false,
      message: err?.message || "Errore di connessione al servizio locale"
    };
  }
}

// Funzione per rilevare automaticamente i percorsi di Google Drive con retry
// Utile per l'avvio automatico quando Google Drive Desktop potrebbe non essere ancora montato
export async function detectGoogleDrivePathsWithRetry(
  maxRetries: number = 5,
  retryDelay: number = 2000
): Promise<DriveDetectionResult> {
  try {
    const response = await fetch(`http://127.0.0.1:17654/detect-drive-paths-with-retry?retries=${maxRetries}&delay=${retryDelay}`, {
      method: "GET",
      signal: AbortSignal.timeout(30000), // Timeout più lungo per i retry
    });

    if (response.ok) {
      const data = await response.json();
      return {
        paths: data.paths || [],
        success: data.success || false,
        message: data.message || `Rilevamento completato dopo ${data.attempts || maxRetries} tentativi`
      };
    } else {
      const errorData = await response.json().catch(() => ({}));
      return {
        paths: [],
        success: false,
        message: errorData.message || "Errore nel rilevamento dei percorsi con retry"
      };
    }
  } catch (err: any) {
    return {
      paths: [],
      success: false,
      message: err?.message || "Errore di connessione al servizio locale durante il retry"
    };
  }
}

// Funzione per salvare la configurazione di un cliente
export async function saveClientConfig(clientId: string, drivePaths: string[]): Promise<boolean> {
  try {
    const response = await fetch("http://127.0.0.1:17654/config", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        clientId,
        drivePaths,
        action: "saveClientConfig"
      }),
    });

    return response.ok;
  } catch {
    return false;
  }
}

// Funzione per caricare la configurazione di un cliente
export async function loadClientConfig(clientId: string): Promise<ClientConfig | null> {
  try {
    const response = await fetch(`http://127.0.0.1:17654/config/${clientId}`, {
      method: "GET",
      signal: AbortSignal.timeout(3000),
    });

    if (response.ok) {
      return await response.json();
    }
    return null;
  } catch {
    return null;
  }
}

// Controlla disponibilità del servizio e propone automaticamente l'installazione
export async function checkAndPromptLocalOpener(): Promise<void> {
  // Controlla se l'utente ha già rifiutato l'installazione in questa sessione
  const sessionKey = 'localOpenerPromptDismissed';
  if (sessionStorage.getItem(sessionKey) === 'true') {
    return;
  }

  // Controlla se il servizio è già disponibile
  const isAvailable = await checkLocalOpenerAvailability();
  
  if (isAvailable) {
    // Servizio già attivo, nessun prompt necessario
    return;
  }

  // Il cliente carica sempre documenti durante la registrazione,
  // quindi proponi sempre Local Opener se il servizio non è disponibile

  // Verifica se l'utente ha già un prompt persistente dismissed
  const persistentKey = 'localOpenerNeverAskAgain';
  if (localStorage.getItem(persistentKey) === 'true') {
    return;
  }

  // Importa dinamicamente i componenti necessari per evitare problemi di dipendenze circolari
  const { toast } = await import("../hooks/use-toast");

  // Helper per avviare il download
  const startDownload = () => {
    const link = document.createElement('a');
    link.href = '/downloads/local-opener-complete-package.zip';
    link.download = 'local-opener-complete-package.zip';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Mostra toast di conferma con istruzioni
    setTimeout(() => {
      toast({
        title: " Download Avviato",
        description: "Estrai il ZIP e esegui install-local-opener.bat come amministratore. Dopo l'installazione, il servizio si avvierà automaticamente!",
        duration: 8000,
      });
    }, 1000);

    // Segna come promesso per questa sessione
    sessionStorage.setItem(sessionKey, 'true');
  };

  // Helper per download script debug
  const downloadDebugScript = () => {
    const link = document.createElement('a');
    link.href = '/downloads/debug-local-opener.bat';
    link.download = 'debug-local-opener.bat';
    link.setAttribute('target', '_blank');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: "📋 Script Debug Scaricato",
      description: "Esegui debug-local-opener.bat per diagnosticare problemi con Local Opener",
      duration: 5000,
    });
  };

  // Importa ToastAction in modo dinamico per evitare problemi di tipizzazione
  let ToastAction;
  try {
    const toastModule = await import("../components/ui/toast");
    ToastAction = toastModule.ToastAction;
  } catch (error) {
    console.warn("Impossibile caricare ToastAction, fallback a toast semplice");
    // Fallback a toast semplice senza action
    toast({
      title: "🚀 Apertura Documenti Locale",
      description: "Per visualizzare i documenti direttamente dal tuo PC, installa il Local Opener dalle Impostazioni.",
      duration: 10000,
    });
    return;
  }

  // Mostra notifica suggerendo l'installazione con azione inline
  const downloadToast = toast({
    title: "🚀 Apertura Documenti Locale",
    description: "Per visualizzare i documenti direttamente dal tuo PC, installa il Local Opener. Un click e sei pronto!",
    duration: 15000,
    onOpenChange: (open) => {
      if (!open) {
        sessionStorage.setItem(sessionKey, 'true');
      }
    },
  });

  // Aggiungi listener per il click del pulsante di azione (simulazione)
  setTimeout(() => {
    if (!sessionStorage.getItem(sessionKey)) {
      // Se l'utente non ha ancora dismesso, offri il suggerimento
      toast({
        title: "💡 Suggerimento",
        description: "Puoi installare il Local Opener dalle Impostazioni → Configurazione Local Opener, oppure clicca qui per scaricare subito.",
        duration: 8000,
        onClick: startDownload,
      });

      // Dopo un altro po', offri l'opzione "non chiedere più"
      setTimeout(() => {
        if (!sessionStorage.getItem(sessionKey)) {
          toast({
            title: "Non mostrare più",
            description: "Clicca qui se non vuoi più vedere questo suggerimento.",
            duration: 5000,
            onClick: () => {
              localStorage.setItem(persistentKey, 'true');
              sessionStorage.setItem(sessionKey, 'true');
              toast({
                title: "Preferenza salvata",
                description: "Non ti chiederemo più di installare il Local Opener.",
                duration: 3000,
              });
            },
          });
        }
      }, 10000);
    }
  }, 17000);
}
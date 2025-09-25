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

// Gestione delle richieste in corso per evitare sovraccaricare il servizio
const requestsInFlight = new Set<string>();
const MAX_CONCURRENT_REQUESTS = 3;

export async function openLocalDocument(doc: Document, options: { 
  abortMs?: number; 
  retry?: boolean; 
  debug?: boolean 
} = {}): Promise<OpenResult> {
  const { abortMs = 4000, retry = true, debug = false } = options;
  
  // Skip if clearly a Drive-only document
  if (doc.driveUrl) {
    return { ok: false, message: "Documento remoto (Drive)" };
  }

  // Genera un ID unico per questa richiesta per evitare duplicati
  const requestId = `${doc.title}-${doc.revision}-${doc.fileType}`;
  
  // Evita richieste duplicate simultanee
  if (requestsInFlight.has(requestId)) {
    if (debug) console.log('🚫 Richiesta già in corso per:', requestId);
    return { ok: false, message: "Richiesta già in corso per questo documento" };
  }
  
  // Limita il numero di richieste simultanee
  if (requestsInFlight.size >= MAX_CONCURRENT_REQUESTS) {
    if (debug) console.log('🚫 Troppo richieste simultanee, attendi...');
    return { ok: false, message: "Servizio occupato, riprova tra qualche secondo" };
  }
  
  requestsInFlight.add(requestId);
  
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), abortMs);

  try {
    if (debug) console.log('📂 Apertura documento locale:', { title: doc.title, revision: doc.revision });

    const payload = {
      title: doc.title,
      revision: doc.revision,
      fileType: doc.fileType,
      logicalPath: doc.path,
      candidates: buildCandidateNames(doc),
      requestId: requestId,
      timestamp: Date.now()
    };

    const res = await fetch("http://127.0.0.1:17654/open", {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "Cache-Control": "no-cache",
        "X-Request-ID": requestId
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    
    clearTimeout(timer);

    if (!res.ok) {
      // Gestione più intelligente degli errori HTTP
      let errorMessage = `Servizio locale non disponibile (${res.status})`;
      
      try {
        const errorData = await res.json();
        errorMessage = errorData.message || errorData.error || errorMessage;
      } catch {
        const text = await res.text().catch(() => "");
        if (text) errorMessage = text;
      }
      
      // Retry automatico per errori temporanei
      if (retry && (res.status === 500 || res.status === 502 || res.status === 503)) {
        if (debug) console.log('🔄 Retry per errore temporaneo:', res.status);
        await new Promise(resolve => setTimeout(resolve, 1000));
        return openLocalDocument(doc, { ...options, retry: false });
      }
      
      return { ok: false, message: errorMessage };
    }

    const data = await res.json().catch(() => null) as { success?: boolean; message?: string; path?: string } | null;
    
    if (data?.success) {
      if (debug) console.log('✅ Documento aperto con successo:', data.path || 'percorso sconosciuto');
      return { ok: true, message: data.message };
    }
    
    const message = data?.message || "Impossibile aprire il file localmente";
    if (debug) console.log('❌ Apertura fallita:', message);
    
    return { ok: false, message };
    
  } catch (err: any) {
    clearTimeout(timer);
    
    const isTimeout = err?.name === "AbortError";
    const isNetworkError = err?.message?.includes('fetch') || err?.code === 'ECONNREFUSED';
    
    let message: string;
    if (isTimeout) {
      message = `Timeout apertura documento (${abortMs}ms). Servizio sovraccarico?`;
    } else if (isNetworkError) {
      message = "Servizio Local Opener non raggiungibile";
    } else {
      message = err?.message || "Errore contattando il servizio locale";
    }
    
    if (debug) {
      console.log('❌ Errore apertura documento:', { 
        error: err?.message, 
        type: isTimeout ? 'timeout' : isNetworkError ? 'network' : 'other',
        document: { title: doc.title, revision: doc.revision }
      });
    }
    
    return { ok: false, message };
    
  } finally {
    requestsInFlight.delete(requestId);
  }
}

// Cache per evitare check troppo frequenti
let lastAvailabilityCheck: { result: boolean; timestamp: number } | null = null;
const AVAILABILITY_CACHE_TTL = 5000; // 5 secondi

// Verifica se il servizio Local Opener è disponibile (con cache)
export async function checkLocalOpenerAvailability(options: {
  forceRefresh?: boolean;
  debug?: boolean;
  timeout?: number;
} = {}): Promise<boolean> {
  const { forceRefresh = false, debug = false, timeout = 3000 } = options;
  
  // Usa cache se disponibile e non scaduta
  if (!forceRefresh && lastAvailabilityCheck) {
    const age = Date.now() - lastAvailabilityCheck.timestamp;
    if (age < AVAILABILITY_CACHE_TTL) {
      if (debug) console.log('🔄 Disponibilità Local Opener (cache):', lastAvailabilityCheck.result);
      return lastAvailabilityCheck.result;
    }
  }
  
  try {
    if (debug) console.log('🔍 Verifica disponibilità Local Opener...');
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    const res = await fetch("http://127.0.0.1:17654/health", {
      method: "GET",
      signal: controller.signal,
      cache: "no-store",
      headers: {
        "Cache-Control": "no-cache"
      }
    });
    
    clearTimeout(timeoutId);
    
    const isAvailable = res.ok;
    
    // Aggiorna cache
    lastAvailabilityCheck = {
      result: isAvailable,
      timestamp: Date.now()
    };
    
    if (debug) {
      console.log(isAvailable ? '✅ Local Opener disponibile' : '❌ Local Opener non disponibile', {
        status: res.status,
        statusText: res.statusText
      });
    }
    
    return isAvailable;
    
  } catch (err: any) {
    const isTimeout = err?.name === 'AbortError';
    
    if (debug) {
      console.log('❌ Errore verifica disponibilità Local Opener:', {
        error: err?.message,
        isTimeout
      });
    }
    
    // Aggiorna cache con risultato negativo
    lastAvailabilityCheck = {
      result: false,
      timestamp: Date.now()
    };
    
    return false;
  }
}

// Funzione di utilità per invalidare la cache
export function clearAvailabilityCache(): void {
  lastAvailabilityCheck = null;
}

// Funzione per rilevare automaticamente i percorsi di Google Drive migliorata
export async function detectGoogleDrivePaths(options: {
  timeout?: number;
  debug?: boolean;
} = {}): Promise<DriveDetectionResult> {
  const { timeout = 8000, debug = false } = options; // Timeout più generoso
  
  try {
    if (debug) console.log('🔍 Rilevamento percorsi Google Drive...');
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    const response = await fetch("http://127.0.0.1:17654/detect-drive-paths", {
      method: "GET",
      signal: controller.signal,
      cache: "no-store",
      headers: {
        "Cache-Control": "no-cache"
      }
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      const data = await response.json();
      const paths = data.paths || [];
      
      if (debug) {
        console.log(`✅ Rilevamento Google Drive completato: ${paths.length} percorsi`, paths);
      }
      
      return {
        paths,
        success: true,
        message: `Rilevati ${paths.length} percorsi di Google Drive`
      };
    } else {
      const errorData = await response.json().catch(() => ({}));
      const message = errorData.message || `Errore HTTP ${response.status}`;
      
      if (debug) console.log('❌ Errore rilevamento Google Drive:', message);
      
      return {
        paths: [],
        success: false,
        message
      };
    }
  } catch (err: any) {
    const isTimeout = err?.name === 'AbortError';
    const message = isTimeout 
      ? "Timeout durante il rilevamento dei percorsi Google Drive"
      : err?.message || "Errore di connessione al servizio locale";
    
    if (debug) {
      console.log('❌ Errore rilevamento Google Drive:', {
        error: err?.message,
        isTimeout
      });
    }
    
    return {
      paths: [],
      success: false,
      message
    };
  }
}

// Funzione per rilevare automaticamente i percorsi di Google Drive con retry migliorata
export async function detectGoogleDrivePathsWithRetry(
  maxRetries: number = 5,
  retryDelay: number = 2000,
  options: { debug?: boolean; timeout?: number } = {}
): Promise<DriveDetectionResult> {
  const { debug = false, timeout = 45000 } = options; // Timeout più lungo per i retry
  
  try {
    if (debug) {
      console.log('🔍 Rilevamento Google Drive con retry automatico:', { maxRetries, retryDelay });
    }
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    const response = await fetch(`http://127.0.0.1:17654/detect-drive-paths-with-retry?retries=${maxRetries}&delay=${retryDelay}`, {
      method: "GET",
      signal: controller.signal,
      cache: "no-store",
      headers: {
        "Cache-Control": "no-cache"
      }
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      const data = await response.json();
      const paths = data.paths || [];
      const success = data.success || false;
      
      if (debug) {
        console.log(`${success ? '✅' : '⚠️'} Rilevamento Google Drive con retry:`, {
          success,
          paths: paths.length,
          attempts: data.attempts
        });
      }
      
      return {
        paths,
        success,
        message: data.message || `Rilevamento completato dopo ${data.attempts || maxRetries} tentativi`
      };
    } else {
      const errorData = await response.json().catch(() => ({}));
      const message = errorData.message || `Errore HTTP ${response.status} nel rilevamento con retry`;
      
      if (debug) console.log('❌ Errore rilevamento Google Drive con retry:', message);
      
      return {
        paths: [],
        success: false,
        message
      };
    }
  } catch (err: any) {
    const isTimeout = err?.name === 'AbortError';
    const message = isTimeout 
      ? `Timeout dopo ${timeout}ms durante il rilevamento con retry`
      : err?.message || "Errore di connessione al servizio locale durante il retry";
    
    if (debug) {
      console.log('❌ Errore rilevamento Google Drive con retry:', {
        error: err?.message,
        isTimeout,
        maxRetries
      });
    }
    
    return {
      paths: [],
      success: false,
      message
    };
  }
}

// Funzione per salvare la configurazione di un cliente migliorata
export async function saveClientConfig(
  clientId: string, 
  drivePaths: string[],
  options: { debug?: boolean; timeout?: number } = {}
): Promise<boolean> {
  const { debug = false, timeout = 5000 } = options;
  
  try {
    if (debug) console.log('💾 Salvataggio configurazione cliente:', { clientId, pathsCount: drivePaths.length });
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    const response = await fetch("http://127.0.0.1:17654/config", {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "Cache-Control": "no-cache"
      },
      body: JSON.stringify({ 
        clientId,
        drivePaths,
        action: "saveClientConfig",
        timestamp: Date.now()
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    
    const success = response.ok;
    
    if (debug) {
      console.log(success ? '✅ Configurazione salvata' : '❌ Errore salvataggio configurazione', {
        status: response.status,
        statusText: response.statusText
      });
    }

    return success;
    
  } catch (err: any) {
    if (debug) console.log('❌ Errore salvataggio configurazione:', err?.message);
    return false;
  }
}

// Funzione per caricare la configurazione di un cliente migliorata
export async function loadClientConfig(
  clientId: string,
  options: { debug?: boolean; timeout?: number } = {}
): Promise<ClientConfig | null> {
  const { debug = false, timeout = 4000 } = options;
  
  try {
    if (debug) console.log('📂 Caricamento configurazione cliente:', clientId);
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    const response = await fetch(`http://127.0.0.1:17654/config/${clientId}`, {
      method: "GET",
      signal: controller.signal,
      cache: "no-store",
      headers: {
        "Cache-Control": "no-cache"
      }
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      const data = await response.json();
      
      if (debug) console.log('✅ Configurazione caricata:', data);
      
      return data;
    } else {
      if (debug) console.log('⚠️ Configurazione non trovata per cliente:', clientId);
      return null;
    }
    
  } catch (err: any) {
    if (debug) console.log('❌ Errore caricamento configurazione:', err?.message);
    return null;
  }
}

// Controlla disponibilità del servizio e propone automaticamente l'installazione (migliorata)
export async function checkAndPromptLocalOpener(options: {
  debug?: boolean;
  forceCheck?: boolean;
} = {}): Promise<void> {
  const { debug = false, forceCheck = false } = options;
  
  // Controlla se l'utente ha già rifiutato l'installazione in questa sessione
  const sessionKey = 'localOpenerPromptDismissed';
  if (!forceCheck && sessionStorage.getItem(sessionKey) === 'true') {
    if (debug) console.log('🚫 Prompt Local Opener già dismesso in sessione');
    return;
  }

  // Controlla se il servizio è già disponibile con cache refresh
  const isAvailable = await checkLocalOpenerAvailability({ 
    forceRefresh: true, 
    debug,
    timeout: 2000 // Timeout breve per prompt check
  });
  
  if (isAvailable) {
    // Servizio già attivo, nessun prompt necessario
    if (debug) console.log('✅ Local Opener già disponibile, nessun prompt necessario');
    return;
  }
  
  if (debug) console.log('🚀 Local Opener non disponibile, avvio procedura prompt...');

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







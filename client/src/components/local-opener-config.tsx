import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Alert, AlertDescription, AlertTitle } from "./ui/alert";
import { ScrollArea } from "./ui/scroll-area";
import { Separator } from "./ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import {
  Settings,
  FolderPlus,
  Trash2,
  Download,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Folder,
  ExternalLink,
  Clock,
  Activity,
} from "lucide-react";
import { useToast } from "../hooks/use-toast";
import { saveClientConfig } from "../lib/local-opener";
import { localOpenerManager, LocalOpenerStatus } from "../lib/local-opener-manager";
import { useAuth } from "../hooks/use-auth";

interface LocalOpenerConfig {
  roots: string[];
  company?: {
    name?: string;
    code?: string;
  };
}

interface ServiceStatus {
  isRunning: boolean;
  version?: string;
  error?: string;
  lastCheck?: Date;
  consecutiveErrors?: number;
  connectionCount?: number;
  uptime?: string;
}

export default function LocalOpenerConfig() {
  const [config, setConfig] = useState<LocalOpenerConfig | null>(null);
  const [status, setStatus] = useState<ServiceStatus>({ isRunning: false });
  const [isLoading, setIsLoading] = useState(true);
  const [newRoot, setNewRoot] = useState("");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [isTestingRoot, setIsTestingRoot] = useState(false);
  
  // Nuovi stati per migliorare la stabilità con LocalOpenerManager
  const [managerStatus, setManagerStatus] = useState<LocalOpenerStatus | null>(null);
  const [debugMode, setDebugMode] = useState(false);
  
  // Ref per gestire cleanup
  const managerInitializedRef = useRef(false);

  const { toast } = useToast();
  const { user } = useAuth();

  // Ref per il listener del manager per evitare memory leaks
  const statusListenerRef = useRef<((status: LocalOpenerStatus) => void) | null>(null);

  // Inizializza e gestisce LocalOpenerManager
  const initializeManager = useCallback(() => {
    if (managerInitializedRef.current) return;
    
    // Configura il manager con opzioni appropriate (debug viene aggiornato separatamente)
    localOpenerManager.updateOptions({
      checkInterval: 30000, // 30 secondi
      maxConsecutiveErrors: 5,
      autoRestart: true,
      debug: false // Inizializza con debug false, verrà aggiornato dal useEffect
    });

    // Crea listener per stato (salvato in ref per cleanup)
    const handleStatusUpdate = (status: LocalOpenerStatus) => {
      setManagerStatus(status);
      
      // Aggiorna stato legacy per compatibilità
      setStatus({
        isRunning: status.isAvailable,
        version: "1.0.0",
        error: status.isAvailable ? undefined : `Errori consecutivi: ${status.consecutiveErrors}`,
        lastCheck: status.lastCheck,
        consecutiveErrors: status.consecutiveErrors,
        connectionCount: status.totalRequests,
        uptime: `${Math.round(status.averageResponseTime)}ms avg`
      });
    };

    statusListenerRef.current = handleStatusUpdate;
    localOpenerManager.addStatusListener(handleStatusUpdate);
    
    // Avvia monitoraggio solo se non già attivo (per gestire singleton)
    if (!localOpenerManager.getDiagnostics().isMonitoring) {
      localOpenerManager.startMonitoring();
    }
    
    // Forza check iniziale
    localOpenerManager.forceHealthCheck().then(() => {
      setIsLoading(false);
    });
    
    managerInitializedRef.current = true;
    
    console.log('🚀 LocalOpenerManager inizializzato/riconnesso');
  }, []);

  // Funzione semplificata per controllo manuale
  const checkServiceStatus = useCallback(async (): Promise<void> => {
    if (!managerInitializedRef.current) {
      initializeManager();
      return;
    }
    
    setIsLoading(true);
    try {
      await localOpenerManager.forceHealthCheck();
    } finally {
      setIsLoading(false);
    }
  }, [initializeManager]);

  // Carica configurazione dal servizio con retry automatico
  const loadConfig = useCallback(async (maxRetries: number = 2): Promise<void> => {
    if (!status.isRunning) {
      if (debugMode) console.log('🚫 Servizio non running, skip load config');
      return;
    }

    try {
      if (debugMode) console.log('🔧 Caricamento configurazione Local Opener...');

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);

      const response = await fetch("http://127.0.0.1:17654/config", {
        method: "GET",
        signal: controller.signal,
        cache: "no-store",
        headers: {
          "Accept": "application/json",
          "Cache-Control": "no-cache"
        }
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        setConfig(data);
        
        if (debugMode) console.log('✅ Configurazione caricata:', data);
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

    } catch (err: any) {
      if (debugMode) console.log('❌ Errore caricamento config:', err?.message);
      
      // Retry automatico per errori temporanei
      if (maxRetries > 0 && (err?.name === 'AbortError' || err?.message?.includes('fetch'))) {
        setTimeout(() => {
          loadConfig(maxRetries - 1);
        }, 1500);
      }
    }
  }, [status.isRunning, debugMode]);



  // Aggiungi nuova root con gestione errori migliorata
  const addRoot = useCallback(async (): Promise<void> => {
    if (!newRoot.trim()) return;

    // Valida il percorso prima di inviare
    const rootPath = newRoot.trim();
    if (rootPath.length < 3 || (!rootPath.match(/^[A-Z]:\\/) && !rootPath.startsWith('\\\\'))) {
      toast({
        title: "Percorso non valido",
        description: "Inserisci un percorso Windows valido (es: C:\\Documenti o \\\\SERVER\\Share)",
        variant: "destructive",
      });
      return;
    }

    setIsTestingRoot(true);
    try {
      if (debugMode) console.log('📁 Aggiunta cartella:', rootPath);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000); // Timeout più lungo per validazione cartella

      const response = await fetch("http://127.0.0.1:17654/config", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Cache-Control": "no-cache"
        },
        body: JSON.stringify({ addRoot: rootPath }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        setConfig(prev => ({ ...prev, roots: data.roots || [] }));
        
        toast({
          title: "✅ Cartella aggiunta",
          description: `La cartella "${rootPath}" è stata aggiunta con successo.`,
        });
        
        setNewRoot("");
        setShowAddDialog(false);
        
        if (debugMode) console.log('✅ Cartella aggiunta con successo:', data);
        
      } else {
        const error = await response.json().catch(() => ({}));
        const errorMsg = error.message || error.error || `Errore HTTP ${response.status}`;
        throw new Error(errorMsg);
      }
      
    } catch (err: any) {
      const isTimeout = err?.name === 'AbortError';
      const message = isTimeout 
        ? "Timeout durante la validazione della cartella. Riprova."
        : err.message || "Impossibile aggiungere la cartella";
      
      if (debugMode) console.log('❌ Errore aggiunta cartella:', { error: err?.message, isTimeout });
      
      toast({
        title: "Errore aggiunta cartella",
        description: message,
        variant: "destructive",
      });
      
    } finally {
      setIsTestingRoot(false);
    }
  }, [newRoot, config, toast, debugMode]);



  // Rimuovi root con gestione errori migliorata
  const removeRoot = useCallback(async (root: string): Promise<void> => {
    if (!root) return;

    try {
      if (debugMode) console.log('🗑️ Rimozione cartella:', root);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch("http://127.0.0.1:17654/config", {
        method: "DELETE",
        headers: { 
          "Content-Type": "application/json",
          "Cache-Control": "no-cache"
        },
        body: JSON.stringify({ root }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        setConfig(prev => ({ ...prev, roots: data.roots || [] }));
        
        toast({
          title: "🗑️ Cartella rimossa",
          description: `La cartella "${root}" è stata rimossa con successo.`,
        });
        
        if (debugMode) console.log('✅ Cartella rimossa:', data);
        
      } else {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message || `Errore HTTP ${response.status}`);
      }
      
    } catch (err: any) {
      const isTimeout = err?.name === 'AbortError';
      const message = isTimeout 
        ? "Timeout durante la rimozione della cartella"
        : err.message || "Impossibile rimuovere la cartella";
      
      if (debugMode) console.log('❌ Errore rimozione cartella:', { error: err?.message, root });
      
      toast({
        title: "Errore rimozione",
        description: message,
        variant: "destructive",
      });
    }
  }, [config, toast, debugMode]);

  // Testa apertura file con diagnostica avanzata
  const testFileOpen = useCallback(async (): Promise<void> => {
    if (!status.isRunning) {
      toast({
        title: "Servizio non disponibile",
        description: "Il servizio Local Opener non è in esecuzione. Riavvialo prima di testare.",
        variant: "destructive",
      });
      return;
    }

    try {
      if (debugMode) console.log('🧪 Test apertura file...');

      // Payload di test più realistico
      const testPayload = {
        title: "Test-SGI-Document",
        revision: "Rev.01",
        fileType: "pdf",
        logicalPath: "test/sgi-diagnostica",
        candidates: [
          "test-sgi-document.pdf",
          "Test SGI Document Rev.01.pdf",
          "documento-test.txt",
          "test-file.docx"
        ],
        isTest: true // Flag per indicare che è un test
      };

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 secondi per il test

      const startTime = Date.now();
      const response = await fetch("http://127.0.0.1:17654/open", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Cache-Control": "no-cache"
        },
        body: JSON.stringify(testPayload),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      const responseTime = Date.now() - startTime;

      if (response.ok) {
        const result = await response.json().catch(() => ({}));
        
        toast({
          title: "✅ Test riuscito",
          description: `Il servizio funziona correttamente (${responseTime}ms). ${result.message || 'Pronto per l\'apertura dei documenti.'}`,
        });
        
        if (debugMode) {
          console.log('✅ Test apertura file riuscito:', { 
            responseTime, 
            result,
            payload: testPayload
          });
        }
        
      } else {
        const error = await response.json().catch(() => ({}));
        const errorMsg = error.message || error.error || `HTTP ${response.status}`;
        
        // Distingui tra errori di configurazione e errori di servizio
        const isConfigError = errorMsg.includes('path') || errorMsg.includes('folder') || errorMsg.includes('directory');
        const title = isConfigError ? "Errore configurazione" : "Errore servizio";
        
        throw new Error(`${title}: ${errorMsg}`);
      }
      
    } catch (err: any) {
      const isTimeout = err?.name === 'AbortError';
      let message = err.message || "Impossibile testare l'apertura file";
      
      if (isTimeout) {
        message = "Timeout durante il test. Il servizio potrebbe essere sovraccarico o bloccato.";
      }
      
      if (debugMode) {
        console.log('❌ Test apertura file fallito:', { 
          error: err?.message, 
          isTimeout,
          config: config?.roots
        });
      }
      
      toast({
        title: "🚨 Test fallito",
        description: message,
        variant: "destructive",
      });
    }
  }, [status.isRunning, config, toast, debugMode]);

  // Effetto per aggiornare debug mode del manager
  useEffect(() => {
    if (managerInitializedRef.current) {
      localOpenerManager.updateOptions({ debug: debugMode });
    }
  }, [debugMode]);

  // Inizializzazione del manager (solo al mount del componente)
  useEffect(() => {
    initializeManager();
    
    // Cleanup del manager alla distruzione del componente
    return () => {
      // Rimuovi solo il listener di questo componente, mantieni il manager attivo
      if (statusListenerRef.current) {
        localOpenerManager.removeStatusListener(statusListenerRef.current);
        statusListenerRef.current = null;
      }
      
      // NON fermiamo il monitoring del singleton perché potrebbe essere usato da altri componenti
      // Solo resettiamo il flag locale
      managerInitializedRef.current = false;
      
      console.log('🧹 LocalOpenerConfig cleanup completato (manager singleton mantenuto attivo)');
    };
  }, []); // Dipendenze vuote per eseguire solo al mount/unmount

  // Carica configurazione quando il servizio diventa disponibile
  useEffect(() => {
    if (status.isRunning && !config) {
      loadConfig();
    }
  }, [status.isRunning, config, loadConfig]);

  // Listener per eventi di recovery dal manager
  useEffect(() => {
    const handleRecoveryNeeded = (event: CustomEvent) => {
      toast({
        title: "🚨 Servizio Local Opener",
        description: "Richiede riavvio manuale. Controlla se il servizio è in esecuzione.",
        variant: "destructive",
        duration: 10000,
      });
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('local-opener-recovery-needed', handleRecoveryNeeded as EventListener);
      
      return () => {
        window.removeEventListener('local-opener-recovery-needed', handleRecoveryNeeded as EventListener);
      };
    }
  }, [toast]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="h-6 w-6 animate-spin text-primary" />
        <span className="ml-2">Controllo servizio in corso...</span>
      </div>
    );
  }

  return (
    <div className="space-y-3 sm:space-y-4 md:space-y-6">
      {/* Status Card */}
      <Card>
        <CardHeader className="p-3 sm:p-4 md:p-6">
          <CardTitle className="flex items-center gap-2 text-sm sm:text-base md:text-lg">
            <Settings className="h-4 w-4 sm:h-5 sm:w-5" />
            <span className="break-words">Stato Servizio Local Opener</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-3 sm:p-4 md:p-6 pt-0">
          <div className="space-y-4">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 sm:gap-4 lg:gap-0">
              <div className="flex items-start sm:items-center gap-2 sm:gap-3">
                {status.isRunning ? (
                  <>
                    <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 text-green-600" />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs sm:text-sm md:text-base font-medium break-words">
                        Servizio attivo {managerStatus?.consecutiveErrors && managerStatus.consecutiveErrors > 0 && <span className="text-orange-500">(riconnessione...)</span>}
                      </p>
                      <p className="text-xs sm:text-sm text-muted-foreground break-words">
                        Versione {status.version || "1.0.0"} • Connessioni: {status.connectionCount || 0}
                      </p>
                      {status.lastCheck && (
                        <p className="text-xs text-muted-foreground">
                          Ultimo controllo: {status.lastCheck.toLocaleTimeString()}
                        </p>
                      )}
                    </div>
                  </>
                ) : (
                  <>
                    <AlertCircle className={`h-4 w-4 sm:h-5 sm:w-5 ${managerStatus?.consecutiveErrors && managerStatus.consecutiveErrors > 0 && managerStatus.consecutiveErrors < 5 ? 'text-orange-500' : 'text-red-600'}`} />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs sm:text-sm md:text-base font-medium break-words">
                        {managerStatus?.consecutiveErrors && managerStatus.consecutiveErrors > 0 && managerStatus.consecutiveErrors < 5 ? 'Riconnessione automatica...' : 'Servizio non disponibile'}
                      </p>
                      <p className="text-xs sm:text-sm text-muted-foreground break-words">
                        {status.error}
                      </p>
                      {status.consecutiveErrors && status.consecutiveErrors > 1 && (
                        <p className="text-xs text-red-500">
                          Errori consecutivi: {status.consecutiveErrors}
                        </p>
                      )}
                      {managerStatus?.lastCheck && !status.isRunning && (
                        <p className="text-xs text-muted-foreground">
                          Ultimo tentativo: {managerStatus.lastCheck.toLocaleTimeString()}
                        </p>
                      )}
                    </div>
                  </>
                )}
              </div>

              <div className="flex flex-col sm:flex-row gap-2 w-full lg:w-auto">
                {!status.isRunning && (
                  <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                    <Button asChild variant="default" className="w-full sm:w-auto text-xs sm:text-sm">
                      <a
                        href="/downloads/local-opener-complete-package.zip"
                        download="local-opener-complete-package.zip"
                      >
                        <Download className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                        <span className="break-words">Scarica Local Opener</span>
                      </a>
                    </Button>
                  </div>
                )}
                
                {/* Pulsante Debug Mode */}
                <Button
                  variant={debugMode ? "secondary" : "outline"}
                  onClick={() => setDebugMode(!debugMode)}
                  className="w-full sm:w-auto text-xs sm:text-sm"
                  title={debugMode ? "Disabilita modalità debug" : "Abilita modalità debug (console)"}
                >
                  <Activity className={`h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2 ${debugMode ? 'text-blue-600' : ''}`} />
                  <span className="break-words">Debug {debugMode ? 'ON' : 'OFF'}</span>
                </Button>
                
                <Button
                  variant="outline"
                  onClick={() => checkServiceStatus()}
                  disabled={isLoading}
                  className="w-full sm:w-auto text-xs sm:text-sm"
                >
                  <RefreshCw className={`h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                  <span className="break-words">
                    {isLoading ? 'Verificando...' : 'Ricontrolla'}
                  </span>
                </Button>
              </div>
            </div>
            
            {/* Pannello di debug espandibile avanzato */}
            {debugMode && (
              <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded-lg border">
                <div className="flex items-center gap-2 mb-3">
                  <h4 className="text-sm font-medium">🔧 Diagnostica Local Opener</h4>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => localOpenerManager.resetStats()}
                    className="h-6 px-2 text-xs"
                  >
                    Reset Stats
                  </Button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  <div className="space-y-1 font-mono">
                    <div className="font-semibold text-slate-600 dark:text-slate-400">🔍 Stato Servizio</div>
                    <div>Disponibile: {managerStatus?.isAvailable ? '✅ Sì' : '❌ No'}</div>
                    <div>Ultimo controllo: {managerStatus?.lastCheck?.toLocaleTimeString() || 'Mai'}</div>
                    <div>Errori consecutivi: {managerStatus?.consecutiveErrors || 0}</div>
                    <div>Tempo medio risposta: {Math.round(managerStatus?.averageResponseTime || 0)}ms</div>
                  </div>
                  <div className="space-y-1 font-mono">
                    <div className="font-semibold text-slate-600 dark:text-slate-400">📊 Statistiche</div>
                    <div>Richieste totali: {managerStatus?.totalRequests || 0}</div>
                    <div>Richieste riuscite: {managerStatus?.successfulRequests || 0}</div>
                    <div>Richieste fallite: {managerStatus?.failedRequests || 0}</div>
                    <div>Success rate: {managerStatus?.totalRequests ? Math.round((managerStatus.successfulRequests / managerStatus.totalRequests) * 100) : 0}%</div>
                  </div>
                </div>
                <div className="mt-3 pt-2 border-t border-slate-200 dark:border-slate-600">
                  <div className="space-y-1 text-xs font-mono">
                    <div className="font-semibold text-slate-600 dark:text-slate-400">⚙️ Configurazione</div>
                    <div>Cartelle configurate: {config?.roots?.length || 0}</div>
                    <div>Monitoraggio attivo: {localOpenerManager.getDiagnostics().isMonitoring ? '✅ Sì' : '❌ No'}</div>
                    <div>Manager inizializzato: {managerInitializedRef.current ? '✅ Sì' : '❌ No'}</div>
                  </div>
                </div>
                {/* Messaggio per console */}
                <div className="mt-2 text-xs text-slate-500">
                  💡 Controlla la console del browser per log dettagliati
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>



      {/* Configuration Card */}
      {status.isRunning && config && (
        <Card>
          <CardHeader className="p-3 sm:p-4 md:p-6">
            <CardTitle className="text-sm sm:text-base md:text-lg break-words">Cartelle Configurate</CardTitle>
            <CardDescription className="text-xs sm:text-sm break-words">
              Queste sono le cartelle dove il servizio cerca i documenti locali
            </CardDescription>
          </CardHeader>
          <CardContent className="p-3 sm:p-4 md:p-6 pt-0">
            <div className="space-y-3 sm:space-y-4">
              <ScrollArea className="h-[150px] sm:h-[200px] w-full rounded-md border p-2 sm:p-4">
                {config.roots.length === 0 ? (
                  <p className="text-xs sm:text-sm text-muted-foreground text-center py-3 sm:py-4 break-words">
                    Nessuna cartella configurata. Aggiungi manualmente le cartelle
                    contenenti i documenti ISO.
                  </p>
                ) : (
                  <div className="space-y-1 sm:space-y-2">
                    {config.roots.map((root, index) => (
                      <div
                        key={index}
                        className="flex items-start sm:items-center justify-between p-2 rounded-md hover:bg-accent gap-2"
                      >
                        <div className="flex items-start sm:items-center gap-2 min-w-0 flex-1">
                          <Folder className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground flex-shrink-0 mt-0.5 sm:mt-0" />
                          <span className="text-xs sm:text-sm font-mono break-all">{root}</span>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeRoot(root)}
                          className="flex-shrink-0 h-6 w-6 sm:h-8 sm:w-8 p-0"
                        >
                          <Trash2 className="h-3 w-3 sm:h-4 sm:w-4 text-destructive" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>

              <div className="flex flex-col sm:flex-row gap-2">
                <Button onClick={() => setShowAddDialog(true)} className="w-full sm:w-auto text-xs sm:text-sm">
                  <FolderPlus className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                  <span className="break-words">Aggiungi Cartella Manualmente</span>
                </Button>
                <Button variant="outline" onClick={testFileOpen} className="w-full sm:w-auto text-xs sm:text-sm">
                  <span className="break-words">Testa Apertura File</span>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Help Card */}
      <Card>
        <CardHeader className="p-3 sm:p-4 md:p-6">
          <CardTitle className="text-sm sm:text-base md:text-lg break-words">Come configurare l'apertura locale</CardTitle>
        </CardHeader>
        <CardContent className="p-3 sm:p-4 md:p-6 pt-0">
          <div className="space-y-2 sm:space-y-3 text-xs sm:text-sm">
            <div>
              <p className="font-medium break-words">1. Scarica e installa Local Opener</p>
              <div className="ml-2 sm:ml-4 space-y-1 text-muted-foreground">
                <p className="break-words"><strong>Pacchetto Completo:</strong> Contiene tutti i file necessari per installazione automatica</p>
                <p className="text-xs text-blue-600 dark:text-blue-400 break-words">
                  💡 Il pacchetto include script di installazione automatica, debug e gestione servizi Windows
                </p>
              </div>
            </div>
            <Separator />
            <div>
              <p className="font-medium break-words">2. Compatibilità Sistema</p>
              <div className="ml-2 sm:ml-4 space-y-1 text-muted-foreground">
                <p className="break-words"> Windows 10 (versione 1903+) / Windows 11</p>
                <p className="break-words"> Architetture: Intel/AMD x64, ARM64</p>
                <p className="break-words"> Supporto automatico rilevamento architettura</p>
                <p className="break-words"> Richiede privilegi amministratore per l'installer</p>
              </div>
            </div>
            <Separator />
            <div>
              <p className="font-medium break-words">3. Configura le cartelle</p>
              <p className="text-muted-foreground break-words">
                Aggiungi manualmente le cartelle dove sono salvati i documenti ISO
              </p>
            </div>
            <Separator />
            <div>
              <p className="font-medium break-words">4. Testa il funzionamento</p>
              <p className="text-muted-foreground break-words">
                Usa il pulsante "Testa Apertura File" per verificare che tutto
                funzioni correttamente
              </p>
            </div>
            <Separator />
            <div>
              <p className="font-medium break-words">🔧 Problemi di compatibilità?</p>
              <div className="ml-2 sm:ml-4 space-y-1 text-muted-foreground">
                <p className="break-words">• Disabilita temporaneamente l'antivirus durante l'installazione</p>
                <p className="break-words">• Esegui come amministratore se richiesto</p>
                <p className="break-words">• Verifica che Windows Defender non blocchi l'esecuzione</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Add Folder Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="w-[95vw] sm:w-full max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm sm:text-base break-words">Aggiungi Cartella</DialogTitle>
            <DialogDescription className="text-xs sm:text-sm break-words">
              Inserisci il percorso completo della cartella contenente i documenti
              ISO
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 sm:space-y-4 py-3 sm:py-4">
            <div className="space-y-2">
              <Label htmlFor="folder-path" className="text-xs sm:text-sm break-words">Percorso cartella</Label>
              <Input
                id="folder-path"
                placeholder="C:\Documenti\ISO oppure G:\Il mio Drive\ISO"
                value={newRoot}
                onChange={(e) => setNewRoot(e.target.value)}
                className="text-xs sm:text-sm"
              />
              <p className="text-xs text-muted-foreground break-words">
                Esempi: C:\Users\Nome\Documents\ISO, G:\Il mio Drive,
                \\SERVER\Condivisa\ISO
              </p>
            </div>
          </div>
          <DialogFooter className="flex flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => setShowAddDialog(false)}
              disabled={isTestingRoot}
              className="w-full sm:w-auto text-xs sm:text-sm"
            >
              <span className="break-words">Annulla</span>
            </Button>
            <Button onClick={addRoot} disabled={isTestingRoot || !newRoot.trim()} className="w-full sm:w-auto text-xs sm:text-sm">
              {isTestingRoot ? (
                <>
                  <RefreshCw className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2 animate-spin" />
                  <span className="break-words">Verifica in corso...</span>
                </>
              ) : (
                <span className="break-words">Aggiungi</span>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

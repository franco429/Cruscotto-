import { useState, useEffect } from "react";
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
} from "lucide-react";
import { useToast } from "../hooks/use-toast";
import { apiRequest } from "../lib/queryClient";

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
}

export default function LocalOpenerConfig() {
  const [config, setConfig] = useState<LocalOpenerConfig | null>(null);
  const [status, setStatus] = useState<ServiceStatus>({ isRunning: false });
  const [isLoading, setIsLoading] = useState(true);
  const [newRoot, setNewRoot] = useState("");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [isTestingRoot, setIsTestingRoot] = useState(false);
  const [isAutoDetecting, setIsAutoDetecting] = useState(false);
  const [isReconfiguring, setIsReconfiguring] = useState(false);
  const { toast } = useToast();

  // Controlla lo stato del servizio
  const checkServiceStatus = async () => {
    try {
      const response = await fetch("http://127.0.0.1:17654/health", {
        signal: AbortSignal.timeout(2000),
      });
      if (response.ok) {
        const data = await response.json();
        setConfig({ roots: data.roots || [] });
        setStatus({ isRunning: true, version: "1.0.0" });
      } else {
        throw new Error("Service not healthy");
      }
    } catch (err) {
      setStatus({
        isRunning: false,
        error: "Servizio non disponibile. Assicurati che Local Opener sia installato e in esecuzione.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Carica configurazione dal servizio
  const loadConfig = async () => {
    if (!status.isRunning) return;
    
    try {
      const response = await fetch("http://127.0.0.1:17654/config");
      if (response.ok) {
        const data = await response.json();
        setConfig(data);
      }
    } catch (err) {
      console.error("Failed to load config:", err);
    }
  };

  // Aggiungi nuova root
  const addRoot = async () => {
    if (!newRoot.trim()) return;

    setIsTestingRoot(true);
    try {
      const response = await fetch("http://127.0.0.1:17654/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ addRoot: newRoot }),
      });

      if (response.ok) {
        const data = await response.json();
        setConfig({ ...config, roots: data.roots });
        toast({
          title: "Cartella aggiunta",
          description: `La cartella ${newRoot} è stata aggiunta con successo.`,
        });
        setNewRoot("");
        setShowAddDialog(false);
      } else {
        const error = await response.json();
        throw new Error(error.message || "Errore nell'aggiunta della cartella");
      }
    } catch (err: any) {
      toast({
        title: "Errore",
        description: err.message || "Impossibile aggiungere la cartella",
        variant: "destructive",
      });
    } finally {
      setIsTestingRoot(false);
    }
  };

  // Rimuovi root
  const removeRoot = async (root: string) => {
    try {
      const response = await fetch("http://127.0.0.1:17654/config", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ root }),
      });

      if (response.ok) {
        const data = await response.json();
        setConfig({ ...config, roots: data.roots });
        toast({
          title: "Cartella rimossa",
          description: `La cartella ${root} è stata rimossa.`,
        });
      }
    } catch (err) {
      toast({
        title: "Errore",
        description: "Impossibile rimuovere la cartella",
        variant: "destructive",
      });
    }
  };

  // Rilevazione automatica percorsi Google Drive
  const autoDetectPaths = async () => {
    setIsAutoDetecting(true);
    try {
      const response = await apiRequest("POST", "/api/local-opener/auto-detect-paths", {});
      const data = await response.json();
      
      if (data.success && data.detectedPaths.length > 0) {
        // Aggiorna la configurazione con i percorsi rilevati
        setConfig(prev => prev ? { ...prev, roots: data.configuredPaths } : null);
        toast({
          title: "🎉 Rilevazione automatica riuscita!",
          description: `Trovati ${data.detectedPaths.length} percorsi Google Drive. Configurazione aggiornata automaticamente.`,
          duration: 8000,
        });
      } else if (data.success && data.detectedPaths.length === 0) {
        toast({
          title: "⚠️ Nessun percorso trovato",
          description: "Non sono stati rilevati percorsi Google Drive. Configura manualmente le cartelle.",
          variant: "destructive",
          duration: 6000,
        });
      } else {
        // Errore dal servizio - mostra dettagli più specifici
        let errorTitle = "❌ Rilevazione fallita";
        let errorDescription = data.error || "Impossibile rilevare automaticamente i percorsi Google Drive";
        
        // Se ci sono informazioni di troubleshooting, aggiungile alla descrizione
        if (data.troubleshooting) {
          const troubleshootingTips = Object.values(data.troubleshooting).join('. ');
          errorDescription += `\n\nSuggerimenti: ${troubleshootingTips}`;
        }
        
        toast({
          title: errorTitle,
          description: errorDescription,
          variant: "destructive",
          duration: 10000, // Timeout più lungo per leggere i suggerimenti
        });
      }
    } catch (err: any) {
      // Gestisci errori di rete o parsing
      let errorMessage = "Impossibile rilevare automaticamente i percorsi Google Drive";
      
      if (err.message) {
        errorMessage = err.message;
      }
      
      // Se l'errore è di connessione al backend
      if (err.message && err.message.includes('Failed to fetch')) {
        errorMessage = "Errore di connessione al server. Verifica la tua connessione internet.";
      }
      
      toast({
        title: "❌ Rilevazione fallita",
        description: errorMessage,
        variant: "destructive",
        duration: 8000,
      });
    } finally {
      setIsAutoDetecting(false);
    }
  };

  // Riconfigurazione forzata percorsi
  const reconfigurePaths = async () => {
    setIsReconfiguring(true);
    try {
      // Prova percorsi comuni di Google Drive
      const commonPaths = [
        `${process.env.USERPROFILE || 'C:\\Users\\%USERNAME%'}\\Google Drive`,
        `${process.env.USERPROFILE || 'C:\\Users\\%USERNAME%'}\\GoogleDrive`,
        "G:\\Il mio Drive",
        "G:\\My Drive",
        "H:\\Il mio Drive",
        "H:\\My Drive"
      ];

      const response = await apiRequest("POST", "/api/local-opener/reconfigure-paths", { forcedPaths: commonPaths });
      const data = await response.json();
      
      if (data.success && data.configuredPaths && data.configuredPaths.length > 0) {
        setConfig(prev => prev ? { ...prev, roots: data.configuredPaths } : null);
        toast({
          title: "✅ Riconfigurazione completata",
          description: `Configurati ${data.configuredPaths.length} percorsi Google Drive standard.`,
          duration: 6000,
        });
      } else if (data.success && (!data.configuredPaths || data.configuredPaths.length === 0)) {
        toast({
          title: "⚠️ Riconfigurazione parziale",
          description: "Nessun percorso Google Drive è stato trovato nei percorsi standard. Verifica manualmente.",
          variant: "destructive",
          duration: 8000,
        });
      } else {
        // Errore dal servizio
        let errorDescription = data.error || "Impossibile riconfigurare i percorsi Google Drive";
        
        if (data.troubleshooting) {
          const troubleshootingTips = Object.values(data.troubleshooting).join('. ');
          errorDescription += `\n\nSuggerimenti: ${troubleshootingTips}`;
        }
        
        toast({
          title: "❌ Riconfigurazione fallita",
          description: errorDescription,
          variant: "destructive",
          duration: 10000,
        });
      }
    } catch (err: any) {
      let errorMessage = "Impossibile riconfigurare i percorsi Google Drive";
      
      if (err.message) {
        errorMessage = err.message;
      }
      
      if (err.message && err.message.includes('Failed to fetch')) {
        errorMessage = "Errore di connessione al server. Verifica la tua connessione internet.";
      }
      
      toast({
        title: "❌ Riconfigurazione fallita",
        description: errorMessage,
        variant: "destructive",
        duration: 8000,
      });
    } finally {
      setIsReconfiguring(false);
    }
  };

  // Testa apertura file
  const testFileOpen = async () => {
    try {
      const testPayload = {
        title: "Test Document",
        revision: "Rev.1",
        fileType: "txt",
        logicalPath: "test",
        candidates: ["test.txt", "documento-test.txt"],
      };

      const response = await fetch("http://127.0.0.1:17654/open", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(testPayload),
      });

      if (response.ok) {
        toast({
          title: "Test riuscito",
          description: "Il servizio è configurato correttamente e può aprire i file.",
        });
      } else {
        const error = await response.json();
        throw new Error(error.message);
      }
    } catch (err: any) {
      toast({
        title: "Test fallito",
        description: err.message || "Impossibile testare l'apertura file",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    checkServiceStatus();
  }, []);

  useEffect(() => {
    if (status.isRunning) {
      loadConfig();
    }
  }, [status.isRunning]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="h-6 w-6 animate-spin text-primary" />
        <span className="ml-2">Controllo servizio in corso...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Status Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Stato Servizio Local Opener
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {status.isRunning ? (
                <>
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <div>
                    <p className="font-medium">Servizio attivo</p>
                    <p className="text-sm text-muted-foreground">
                      Versione {status.version || "1.0.0"}
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <AlertCircle className="h-5 w-5 text-red-600" />
                  <div>
                    <p className="font-medium">Servizio non disponibile</p>
                    <p className="text-sm text-muted-foreground">
                      {status.error}
                    </p>
                  </div>
                </>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              {!status.isRunning && (
                <Button asChild variant="default">
                  <a
                    href="/downloads/optimized_local_opener.zip"
                    download="optimized_local_opener.zip"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Scarica Local Opener
                  </a>
                </Button>
              )}
              <Button
                variant="outline"
                onClick={checkServiceStatus}
                disabled={isLoading}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Ricontrolla
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>



      {/* Configuration Card */}
      {status.isRunning && config && (
        <Card>
          <CardHeader>
            <CardTitle>Cartelle Configurate</CardTitle>
            <CardDescription>
              Queste sono le cartelle dove il servizio cerca i documenti locali
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <ScrollArea className="h-[200px] w-full rounded-md border p-4">
                {config.roots.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Nessuna cartella configurata. Aggiungi almeno una cartella
                    contenente i documenti ISO.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {config.roots.map((root, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-2 rounded-md hover:bg-accent"
                      >
                        <div className="flex items-center gap-2">
                          <Folder className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm font-mono">{root}</span>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeRoot(root)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>

              <div className="flex flex-wrap gap-2">
                <Button onClick={autoDetectPaths} disabled={isAutoDetecting}>
                  {isAutoDetecting ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Rilevazione...
                    </>
                  ) : (
                    <>
                      <Settings className="h-4 w-4 mr-2" />
                      🔍 Rileva Automaticamente
                    </>
                  )}
                </Button>
                <Button variant="outline" onClick={reconfigurePaths} disabled={isReconfiguring}>
                  {isReconfiguring ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Configurazione...
                    </>
                  ) : (
                    <>
                      <Folder className="h-4 w-4 mr-2" />
                      🔧 Riconfigura Percorsi
                    </>
                  )}
                </Button>
                <Button onClick={() => setShowAddDialog(true)}>
                  <FolderPlus className="h-4 w-4 mr-2" />
                  Aggiungi Cartella
                </Button>
                <Button variant="outline" onClick={testFileOpen}>
                  Testa Apertura File
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Help Card */}
      <Card>
        <CardHeader>
          <CardTitle>Come configurare l'apertura locale</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm">
            <div>
              <p className="font-medium">1. Scarica e installa Local Opener SISTEMATO</p>
              <div className="ml-4 space-y-1 text-muted-foreground">
                <p><strong>✅ Tutti i problemi risolti:</strong> Auto-discovery completo A-Z, servizio sempre attivo, logging migliorato</p>
                <p><strong>🚀 Avvio Automatico:</strong> Si installa come servizio Windows e resta attivo 24/7, si riavvia automaticamente ad ogni accensione del PC</p>
                <p><strong>🔍 Rilevamento Intelligente Completo:</strong> Trova TUTTI i percorsi Google Drive possibili con scansione A-Z completa</p>
                <p><strong>📦 Pacchetto Ottimizzato:</strong> File ZIP con tutti i componenti necessari, funziona immediatamente</p>
                <p><strong>⚡ Apertura Istantanea:</strong> Click sull'icona occhio → documento si apre immediatamente</p>
              </div>
            </div>
            <Separator />
            <div>
              <p className="font-medium">2. Procedura di installazione DEFINITIVA</p>
              <div className="ml-4 space-y-1 text-muted-foreground">
                <p>1. Scarica il file "optimized_local_opener.zip"</p>
                <p>2. Estrai l'archivio ZIP in una cartella del PC</p>
                <p>3. Clic destro su "installa-servizio-finale.bat" → "Esegui come amministratore"</p>
                <p>4. Clicca "Sì" quando richiesto per i privilegi amministratore</p>
                <p>5. ✅ INSTALLAZIONE DEFINITIVA completata! Il servizio resta attivo per sempre</p>
              </div>
            </div>
            <Separator />
            <div>
              <p className="font-medium">3. Compatibilità Sistema</p>
              <div className="ml-4 space-y-1 text-muted-foreground">
                <p>✅ Windows 7 SP1+ / Windows 10 / Windows 11</p>
                <p>✅ Architetture: x86, x64, ARM64</p>
                <p>✅ Auto-rilevamento cartelle Google Drive</p>
                <p>⚠️ Richiede privilegi amministratore per l'installazione servizio</p>
              </div>
            </div>
            <Separator />
            <div>
              <p className="font-medium">4. Configura le cartelle (COMPLETAMENTE AUTOMATICO!)</p>
              <div className="ml-4 space-y-1 text-muted-foreground">
                <p><strong>🔍 Auto-Discovery Potenziato:</strong> Il servizio rileva automaticamente TUTTI i percorsi Google Drive (A-Z completo)</p>
                <p><strong>🔄 Retry Automatico:</strong> Retry ogni 30 secondi per 5 minuti per rilevare drive che si montano dopo l'avvio</p>
                <p><strong>🎯 Trova Tutto:</strong> Il mio Drive, My Drive, Drive condivisi, tutte le lettere e configurazioni possibili</p>
                <p><strong>➕ Configurazione Manuale:</strong> Solo se necessario, aggiungi manualmente cartelle aggiuntive</p>
              </div>
            </div>
            <Separator />
            <div>
              <p className="font-medium">5. Testa il funzionamento</p>
              <p className="text-muted-foreground">
                Usa il pulsante "Testa Apertura File" per verificare che tutto
                funzioni correttamente
              </p>
            </div>
            <Separator />
            <div>
              <p className="font-medium">🔧 Risoluzione problemi</p>
              <div className="ml-4 space-y-1 text-muted-foreground">
                <p><strong>📊 Test completo:</strong> Usa "test-servizio-completo.bat" dalla cartella installata per verificare tutto</p>
                <p><strong>🛠️ Diagnostica:</strong> Esegui "diagnostica-servizio.bat" per analisi dettagliata</p>
                <p><strong>⚡ Riavvio semplice:</strong> Riavvia il PC e il servizio si avvia automaticamente</p>
                <p><strong>🔄 Aggiornamento:</strong> Usa "AGGIORNA-CODICE-SERVIZIO.bat" per aggiornare i percorsi</p>
                <p><strong>🔐 Privilegi:</strong> Esegui sempre come Amministratore (click destro → "Esegui come amministratore")</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Add Folder Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Aggiungi Cartella</DialogTitle>
            <DialogDescription>
              Inserisci il percorso completo della cartella contenente i documenti
              ISO
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="folder-path">Percorso cartella</Label>
              <Input
                id="folder-path"
                placeholder="C:\Documenti\ISO oppure G:\Il mio Drive\ISO"
                value={newRoot}
                onChange={(e) => setNewRoot(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Esempi: C:\Users\Nome\Documents\ISO, G:\Il mio Drive,
                \\SERVER\Condivisa\ISO
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowAddDialog(false)}
              disabled={isTestingRoot}
            >
              Annulla
            </Button>
            <Button onClick={addRoot} disabled={isTestingRoot || !newRoot.trim()}>
              {isTestingRoot ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Verifica in corso...
                </>
              ) : (
                "Aggiungi"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

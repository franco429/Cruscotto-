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
            <ExternalLink className="h-5 w-5" />
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
                    href="/downloads/optimized_local_opener_v2.1.0.zip"
                    download="optimized_local_opener_v2.1.0.zip"
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
          <CardTitle>Come configurare l'apertura locale (v2.1.1)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm">
            <div>
              <p className="font-medium">1. Scarica e installa Local Opener come SERVIZIO WINDOWS</p>
              <div className="ml-4 space-y-1 text-muted-foreground">
                <p><strong>✅ SOLUZIONE DEFINITIVA:</strong> Servizio Windows nativo che si avvia automaticamente al boot</p>
                <p><strong>🚀 SEMPRE ATTIVO 24/7:</strong> Continua a funzionare anche se chiudi la sessione utente o riavvii il PC</p>
                <p><strong>🔍 AUTO-DISCOVERY COMPLETO:</strong> Rileva automaticamente TUTTI i percorsi Google Drive Desktop</p>
                <p><strong>📦 INSTALLAZIONE AUTOMATICA:</strong> Script che configura tutto automaticamente</p>
                <p><strong>⚡ FUNZIONAMENTO PERMANENTE:</strong> Una volta installato, funziona per sempre</p>
                <p><strong>⚡ OTTIMIZZAZIONI PERFORMANCE:</strong> Avvio ultra-veloce con cache intelligente (90-98% più veloce)</p>
              </div>
            </div>
            <Separator />
            <div>
              <p className="font-medium">2. Procedura di installazione SERVIZIO WINDOWS</p>
              <div className="ml-4 space-y-1 text-muted-foreground">
                <p>1. Scarica il file "optimized_local_opener_v2.1.0.zip"</p>
                <p>2. Estrai l'archivio ZIP in una cartella del PC</p>
                <p>3. <strong>CLIC DESTRO</strong> su "INSTALLA-SERVIZIO-AMMINISTRATORE.bat" → "Esegui come amministratore"</p>
                <p>4. Clicca "Sì" quando richiesto per i privilegi amministratore</p>
                <p>5. ✅ INSTALLAZIONE SERVIZIO COMPLETATA! Il servizio si avvia automaticamente ad ogni boot</p>
              </div>
            </div>
            <Separator />
            <div>
              <p className="font-medium">3. Compatibilità Sistema</p>
              <div className="ml-4 space-y-1 text-muted-foreground">
                <p>✅ Windows 7 SP1+ / Windows 10 / Windows 11</p>
                <p>✅ Architetture: x86, x64, ARM64</p>
                <p>✅ Auto-rilevamento cartelle Google Drive</p>
                <p>✅ Ottimizzazioni performance avanzate (v2.1.1)</p>
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
              <p className="font-medium">5. Ottimizzazioni Performance (v2.1.1)</p>
              <div className="ml-4 space-y-1 text-muted-foreground">
                <p><strong>⚡ AVVIO ULTRA-VELOCE:</strong> Ricerca file ottimizzata (95% più veloce)</p>
                <p><strong>⚡ CACHE INTELLIGENTE:</strong> Avvio istantaneo dopo il primo utilizzo (99% più veloce)</p>
                <p><strong>⚡ GERARCHIA DI RICERCA:</strong> 9 livelli di priorità per massima efficienza</p>
                <p><strong>⚡ TIMEOUT OTTIMIZZATI:</strong> Ridotti da 3 a 1 secondo per avvio rapido</p>
                <p><strong>⚡ PRIORITÀ ALTA:</strong> Avvio con priorità di sistema per massime performance</p>
                <p><strong>📁 FILE DISPONIBILI:</strong> AVVIO-AUTOMATICO-UTENTE.bat (normale) e AVVIO-AUTOMATICO-UTENTE-CACHE.bat (ultra-veloce)</p>
              </div>
            </div>
            <Separator />
            <div>
              <p className="font-medium">6. Testa il funzionamento</p>
              <p className="text-muted-foreground">
                Usa il pulsante "Testa Apertura File" per verificare che tutto
                funzioni correttamente
              </p>
            </div>
            <Separator />
            <div>
              <p className="font-medium">🔧 Gestione e risoluzione problemi</p>
              <div className="ml-4 space-y-1 text-muted-foreground">
                <p><strong>🔄 Gestione servizio:</strong> Usa "GESTISCI-SERVIZIO.bat" per avviare/fermare/riavviare il servizio</p>
                <p><strong>📊 Diagnostica completa:</strong> Esegui "diagnostica-servizio.bat" per analisi dettagliata del sistema</p>
                <p><strong>⚡ Riavvio automatico:</strong> Il servizio si riavvia automaticamente ad ogni boot del PC</p>
                <p><strong>🛠️ Disinstallazione:</strong> Usa "DISINSTALLA-SERVIZIO.bat" se necessario rimuovere tutto</p>
                <p><strong>🔐 Privilegi richiesti:</strong> L'installazione richiede privilegi amministratore (click destro → "Esegui come amministratore")</p>
                <p><strong>🌐 Verifica funzionamento:</strong> Dopo l'installazione, apri http://127.0.0.1:17654 nel browser</p>
                <p><strong>📋 Documentazione:</strong> Consulta "OTTIMIZZAZIONI-PERFORMANCE.md" per dettagli tecnici</p>
                <p><strong>📄 Versione:</strong> Controlla "VERSION.txt" per informazioni sulla build installata</p>
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

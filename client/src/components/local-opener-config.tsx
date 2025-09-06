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
  Clock,
} from "lucide-react";
import { useToast } from "../hooks/use-toast";
import { saveClientConfig } from "../lib/local-opener";
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
}

export default function LocalOpenerConfig() {
  const [config, setConfig] = useState<LocalOpenerConfig | null>(null);
  const [status, setStatus] = useState<ServiceStatus>({ isRunning: false });
  const [isLoading, setIsLoading] = useState(true);
  const [newRoot, setNewRoot] = useState("");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [isTestingRoot, setIsTestingRoot] = useState(false);

  const { toast } = useToast();
  const { user } = useAuth();

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
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 sm:gap-4 lg:gap-0">
            <div className="flex items-start sm:items-center gap-2 sm:gap-3">
              {status.isRunning ? (
                <>
                  <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 text-green-600" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs sm:text-sm md:text-base font-medium break-words">Servizio attivo</p>
                    <p className="text-xs sm:text-sm text-muted-foreground break-words">
                      Versione {status.version || "1.0.0"}
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <AlertCircle className="h-4 w-4 sm:h-5 sm:w-5 text-red-600" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs sm:text-sm md:text-base font-medium break-words">Servizio non disponibile</p>
                    <p className="text-xs sm:text-sm text-muted-foreground break-words">
                      {status.error}
                    </p>
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
              <Button
                variant="outline"
                onClick={checkServiceStatus}
                disabled={isLoading}
                className="w-full sm:w-auto text-xs sm:text-sm"
              >
                <RefreshCw className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                <span className="break-words">Ricontrolla</span>
              </Button>
            </div>
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
                <p className="break-words">✅ Windows 10 (versione 1903+) / Windows 11</p>
                <p className="break-words">✅ Architetture: Intel/AMD x64, ARM64</p>
                <p className="break-words">✅ Supporto automatico rilevamento architettura</p>
                <p className="break-words">⚠️ Richiede privilegi amministratore per l'installer</p>
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

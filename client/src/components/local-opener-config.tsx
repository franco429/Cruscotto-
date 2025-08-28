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
  Search,
  Zap,
} from "lucide-react";
import { useToast } from "../hooks/use-toast";
import { detectGoogleDrivePaths, saveClientConfig } from "../lib/local-opener";
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
  const [isDetectingPaths, setIsDetectingPaths] = useState(false);
  const [detectedPaths, setDetectedPaths] = useState<string[]>([]);
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

  // Rileva automaticamente i percorsi di Google Drive
  const handleAutoDetectPaths = async () => {
    setIsDetectingPaths(true);
    try {
      const result = await detectGoogleDrivePaths();
      
      if (result.success && result.paths.length > 0) {
        setDetectedPaths(result.paths);
        toast({
          title: "✅ Percorsi rilevati automaticamente",
          description: `Trovati ${result.paths.length} percorsi di Google Drive. Clicca "Aggiungi Tutti" per configurarli.`,
          duration: 8000,
        });
      } else {
        toast({
          title: "⚠️ Nessun percorso rilevato",
          description: result.message || "Nessun percorso di Google Drive trovato automaticamente.",
          variant: "destructive",
        });
      }
    } catch (err) {
      toast({
        title: "❌ Errore nel rilevamento",
        description: "Impossibile rilevare i percorsi automaticamente. Riprova più tardi.",
        variant: "destructive",
      });
    } finally {
      setIsDetectingPaths(false);
    }
  };

  // Aggiungi tutti i percorsi rilevati
  const addAllDetectedPaths = async () => {
    if (detectedPaths.length === 0) return;

    setIsTestingRoot(true);
    try {
      let addedCount = 0;
      
      for (const path of detectedPaths) {
        try {
          const response = await fetch("http://127.0.0.1:17654/config", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ addRoot: path }),
          });

          if (response.ok) {
            addedCount++;
          }
        } catch (err) {
          console.error(`Failed to add path ${path}:`, err);
        }
      }

      // Ricarica la configurazione
      await loadConfig();
      
      if (addedCount > 0) {
        toast({
          title: "✅ Percorsi aggiunti",
          description: `${addedCount} percorsi di Google Drive sono stati aggiunti con successo.`,
        });
        
        // Salva la configurazione per questo cliente se disponibile
        if (user?.clientId) {
          try {
            await saveClientConfig(user.clientId, detectedPaths);
          } catch (err) {
            console.error("Failed to save client config:", err);
          }
        }
        
        setDetectedPaths([]);
      }
    } catch (err) {
      toast({
        title: "❌ Errore nell'aggiunta",
        description: "Si è verificato un errore nell'aggiunta dei percorsi rilevati.",
        variant: "destructive",
      });
    } finally {
      setIsTestingRoot(false);
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
            <Settings className="h-5 w-5" />
            Stato Servizio Local Opener
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 lg:gap-0">
            <div className="flex items-center gap-3">
              {status.isRunning ? (
                <>
                  <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 text-green-600" />
                  <div>
                    <p className="text-sm sm:text-base font-medium">Servizio attivo</p>
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      Versione {status.version || "1.0.0"}
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <AlertCircle className="h-4 w-4 sm:h-5 sm:w-5 text-red-600" />
                  <div>
                    <p className="text-sm sm:text-base font-medium">Servizio non disponibile</p>
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      {status.error}
                    </p>
                  </div>
                </>
              )}
            </div>

            <div className="flex flex-col sm:flex-row gap-2 w-full lg:w-auto">
              {!status.isRunning && (
                <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                  <Button asChild variant="default" className="w-full sm:w-auto">
                    <a
                      href="/downloads/local-opener-complete-package.zip"
                      download="local-opener-complete-package.zip"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Scarica Pacchetto Completo
                    </a>
                  </Button>
                  <Button asChild variant="outline" className="w-full sm:w-auto">
                    <a
                      href="/downloads/cruscotto-local-opener-setup.exe"
                      download="cruscotto-local-opener-setup.exe"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Solo Eseguibile
                    </a>
                  </Button>
                </div>
              )}
              <Button
                variant="outline"
                onClick={checkServiceStatus}
                disabled={isLoading}
                className="w-full sm:w-auto"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Ricontrolla
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Auto-Detection Card */}
      {status.isRunning && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-blue-600" />
              Rilevamento Automatico Google Drive
            </CardTitle>
            <CardDescription>
              Rileva automaticamente i percorsi di Google Drive Desktop per un setup istantaneo
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-2">
                <Button 
                  onClick={handleAutoDetectPaths}
                  disabled={isDetectingPaths}
                  className="w-full sm:w-auto"
                  variant="outline"
                >
                  {isDetectingPaths ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Rilevamento in corso...
                    </>
                  ) : (
                    <>
                      <Search className="h-4 w-4 mr-2" />
                      Rileva Percorsi Automaticamente
                    </>
                  )}
                </Button>
                
                {detectedPaths.length > 0 && (
                  <Button 
                    onClick={addAllDetectedPaths}
                    disabled={isTestingRoot}
                    className="w-full sm:w-auto"
                    variant="default"
                  >
                    {isTestingRoot ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Aggiunta in corso...
                      </>
                    ) : (
                      <>
                        <FolderPlus className="h-4 w-4 mr-2" />
                        Aggiungi Tutti ({detectedPaths.length})
                      </>
                    )}
                  </Button>
                )}
              </div>

              {detectedPaths.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-green-700 dark:text-green-300">
                    Percorsi rilevati:
                  </p>
                  <ScrollArea className="h-[120px] w-full rounded-md border p-3 bg-green-50 dark:bg-green-950">
                    {detectedPaths.map((path, index) => (
                      <div key={index} className="flex items-center gap-2 py-1">
                        <Folder className="h-4 w-4 text-green-600" />
                        <span className="text-sm font-mono text-green-800 dark:text-green-200">
                          {path}
                        </span>
                      </div>
                    ))}
                  </ScrollArea>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

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
                    Nessuna cartella configurata. Usa il rilevamento automatico o aggiungi manualmente le cartelle
                    contenenti i documenti ISO.
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

              <div className="flex flex-col sm:flex-row gap-2">
                <Button onClick={() => setShowAddDialog(true)} className="w-full sm:w-auto">
                  <FolderPlus className="h-4 w-4 mr-2" />
                  Aggiungi Cartella Manualmente
                </Button>
                <Button variant="outline" onClick={testFileOpen} className="w-full sm:w-auto">
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
          <div className="space-y-3 text-xs sm:text-sm">
            <div>
              <p className="font-medium">1. Scarica e installa Local Opener</p>
              <div className="ml-2 sm:ml-4 space-y-1 text-muted-foreground">
                <p><strong>Pacchetto Completo (Raccomandato):</strong> Contiene tutti i file necessari per installazione automatica</p>
                <p><strong>Solo Eseguibile:</strong> Per installazione manuale avanzata</p>
                <p className="text-xs text-blue-600 dark:text-blue-400">
                  💡 Il pacchetto completo include script di installazione automatica, debug e gestione servizi Windows
                </p>
              </div>
            </div>
            <Separator />
            <div>
              <p className="font-medium">2. Compatibilità Sistema</p>
              <div className="ml-2 sm:ml-4 space-y-1 text-muted-foreground">
                <p>✅ Windows 10 (versione 1903+) / Windows 11</p>
                <p>✅ Architetture: Intel/AMD x64, ARM64</p>
                <p>✅ Supporto automatico rilevamento architettura</p>
                <p>⚠️ Richiede privilegi amministratore per l'installer</p>
              </div>
            </div>
            <Separator />
            <div>
              <p className="font-medium">3. Configura le cartelle</p>
              <p className="text-muted-foreground">
                <strong>Raccomandato:</strong> Usa il rilevamento automatico per trovare Google Drive Desktop
                <br />
                <strong>Manuale:</strong> Aggiungi le cartelle dove sono salvati i documenti ISO
              </p>
            </div>
            <Separator />
            <div>
              <p className="font-medium">4. Testa il funzionamento</p>
              <p className="text-muted-foreground">
                Usa il pulsante "Testa Apertura File" per verificare che tutto
                funzioni correttamente
              </p>
            </div>
            <Separator />
            <div>
              <p className="font-medium">🔧 Problemi di compatibilità?</p>
              <div className="ml-2 sm:ml-4 space-y-1 text-muted-foreground">
                <p>• Disabilita temporaneamente l'antivirus durante l'installazione</p>
                <p>• Esegui come amministratore se richiesto</p>
                <p>• Verifica che Windows Defender non blocchi l'esecuzione</p>
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
          <DialogFooter className="flex flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => setShowAddDialog(false)}
              disabled={isTestingRoot}
              className="w-full sm:w-auto"
            >
              Annulla
            </Button>
            <Button onClick={addRoot} disabled={isTestingRoot || !newRoot.trim()} className="w-full sm:w-auto">
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

import { useState, useEffect } from 'react';
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Switch } from "./ui/switch";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogDescription 
} from "./ui/dialog";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "./ui/select";
import { Settings, Play, Square, FolderOpen, CheckCircle, XCircle, Loader2 } from "lucide-react";
import { apiRequest } from "../lib/queryClient";
import { useToast } from "../hooks/use-toast";

interface AutoSyncConfig {
  watchFolder: string;
  intervalMinutes: number;
  lastSyncTime?: string;
  enabled: boolean;
}

interface AutoSyncSettingsProps {
  onConfigChange?: () => void;
}

export default function AutoSyncSettings({ onConfigChange }: AutoSyncSettingsProps) {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isTestingPath, setIsTestingPath] = useState(false);
  const [config, setConfig] = useState<AutoSyncConfig | null>(null);
  const [tempConfig, setTempConfig] = useState<AutoSyncConfig>({
    watchFolder: '',
    intervalMinutes: 5,
    enabled: false,
  });
  const [pathTestResult, setPathTestResult] = useState<{
    success: boolean;
    message: string;
    fileCount?: number;
  } | null>(null);

  // Carica stato corrente dell'auto-sync
  const loadAutoSyncStatus = async () => {
    try {
      const response = await apiRequest('GET', '/api/auto-sync/status');
      const data = await response.json();
      
      if (data.config) {
        setConfig(data.config);
        setTempConfig(data.config);
      } else {
        setConfig(null);
        setTempConfig({
          watchFolder: '',
          intervalMinutes: 5,
          enabled: false,
        });
      }
    } catch (error) {
      console.error('Error loading auto-sync status:', error);
    }
  };

  // Carica stato quando si apre il dialog
  useEffect(() => {
    if (isOpen) {
      loadAutoSyncStatus();
    }
  }, [isOpen]);

  // Avvia auto-sync
  const handleStartAutoSync = async () => {
    if (!tempConfig.watchFolder.trim()) {
      toast({
        title: "Errore",
        description: "Seleziona una cartella da monitorare",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const response = await apiRequest('POST', '/api/auto-sync/start', {
        watchFolder: tempConfig.watchFolder,
        intervalMinutes: tempConfig.intervalMinutes,
      });

      const result = await response.json();

      if (response.ok) {
        toast({
          title: "Successo",
          description: "Sincronizzazione automatica avviata",
        });
        
        await loadAutoSyncStatus();
        if (onConfigChange) onConfigChange();
      } else {
        toast({
          title: "Errore",
          description: result.message || "Impossibile avviare la sincronizzazione automatica",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Errore",
        description: "Errore di connessione durante l'avvio",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Ferma auto-sync
  const handleStopAutoSync = async () => {
    setIsLoading(true);
    try {
      const response = await apiRequest('POST', '/api/auto-sync/stop');
      const result = await response.json();

      if (response.ok) {
        toast({
          title: "Successo",
          description: "Sincronizzazione automatica fermata",
        });
        
        await loadAutoSyncStatus();
        if (onConfigChange) onConfigChange();
      } else {
        toast({
          title: "Errore",
          description: result.message || "Impossibile fermare la sincronizzazione automatica",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Errore",
        description: "Errore di connessione",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Aggiorna configurazione
  const handleUpdateConfig = async () => {
    setIsLoading(true);
    try {
      const response = await apiRequest('PUT', '/api/auto-sync/config', tempConfig);
      const result = await response.json();

      if (response.ok) {
        toast({
          title: "Successo",
          description: "Configurazione aggiornata",
        });
        
        await loadAutoSyncStatus();
        if (onConfigChange) onConfigChange();
      } else {
        toast({
          title: "Errore",
          description: result.message || "Impossibile aggiornare la configurazione",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Errore",
        description: "Errore di connessione",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Testa validità del percorso
  const handleTestPath = async () => {
    if (!tempConfig.watchFolder.trim()) {
      toast({
        title: "Errore",
        description: "Inserisci prima un percorso da testare",
        variant: "destructive",
      });
      return;
    }

    setIsTestingPath(true);
    setPathTestResult(null);

    try {
      const response = await apiRequest('POST', '/api/auto-sync/test-path', {
        watchFolder: tempConfig.watchFolder,
      });

      const result = await response.json();

      if (response.ok) {
        setPathTestResult({
          success: true,
          message: result.message,
          fileCount: result.details?.fileCount
        });

        toast({
          title: "✅ Percorso Valido",
          description: result.message,
        });
      } else {
        setPathTestResult({
          success: false,
          message: result.message
        });

        // Mostra suggerimenti se disponibili
        if (result.suggestions && Array.isArray(result.suggestions)) {
          const suggestions = result.suggestions.join('\n');
          toast({
            title: "❌ Percorso Non Valido",
            description: `${result.message}\n\nSuggerimenti:\n${suggestions}`,
            variant: "destructive",
            duration: 10000,
          });
        } else {
          toast({
            title: "❌ Percorso Non Valido",
            description: result.message,
            variant: "destructive",
          });
        }
      }
    } catch (error) {
      setPathTestResult({
        success: false,
        message: 'Errore di connessione durante il test'
      });

      toast({
        title: "Errore",
        description: "Errore di connessione durante il test del percorso",
        variant: "destructive",
      });
    } finally {
      setIsTestingPath(false);
    }
  };

  // Seleziona cartella (simulazione - in un'app reale si userebbe l'API per aprire file dialog)
  const handleSelectFolder = () => {
    // Esempi di percorsi comuni per Google Drive Desktop
    const examples = [
      "Windows Google Drive Desktop:",
      "• C:\\Users\\[nome]\\Google Drive\\SGI",
      "• G:\\Il mio Drive\\SGI", 
      "• J:\\Il mio Drive\\GESTEA",
      "",
      "Windows percorsi locali:",
      "• C:\\Documents\\SGI",
      "• D:\\Documenti\\SGI",
      "",
      "macOS/Linux:",
      "• /Users/nome/Google Drive/SGI",
      "• /home/nome/Documents/SGI",
    ];

    toast({
      title: "Esempi Percorsi Cartella",
      description: examples.join('\n'),
      duration: 8000,
    });
  };

  const formatLastSyncTime = (lastSyncTime?: string) => {
    if (!lastSyncTime) return 'Mai sincronizzato';
    
    const date = new Date(lastSyncTime);
    return date.toLocaleString('it-IT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant={config?.enabled ? "default" : "outline"}
          className="flex items-center gap-2 w-full md:w-auto"
          title="Configura sincronizzazione automatica"
        >
          <Settings className="h-4 w-4" />
          <span className="hidden md:inline">
            Sync Auto
          </span>
          <span className="md:hidden">
            Auto
          </span>
          {config?.enabled && (
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse ml-1" />
          )}
        </Button>
      </DialogTrigger>
      
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Sincronizzazione Automatica</DialogTitle>
          <DialogDescription>
            Configura il monitoraggio automatico di una cartella locale per mantenere sempre aggiornati i documenti.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Stato Corrente */}
          {config && (
            <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                {config.enabled ? (
                  <>
                    <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
                    <span className="font-semibold text-green-700 dark:text-green-300">
                      Attiva
                    </span>
                  </>
                ) : (
                  <>
                    <div className="w-3 h-3 bg-gray-400 rounded-full" />
                    <span className="font-semibold text-gray-600 dark:text-gray-400">
                      Inattiva
                    </span>
                  </>
                )}
              </div>
              
              {config.enabled && (
                <div className="text-sm text-slate-600 dark:text-slate-400 space-y-1">
                  <div>Cartella: <span className="font-mono text-xs bg-slate-200 dark:bg-slate-700 px-1 rounded">{config.watchFolder}</span></div>
                  <div>Controllo ogni: {config.intervalMinutes} minuti</div>
                  <div>Ultima sync: {formatLastSyncTime(config.lastSyncTime)}</div>
                </div>
              )}
            </div>
          )}

          {/* Configurazione */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="watchFolder">Cartella da Monitorare</Label>
              <div className="flex gap-2 mt-1">
                <Input
                  id="watchFolder"
                  placeholder="es: J:\Il mio Drive\GESTEA oppure C:\Documents\SGI"
                  value={tempConfig.watchFolder}
                  onChange={(e) => {
                    setTempConfig(prev => ({ ...prev, watchFolder: e.target.value }));
                    // Reset del risultato del test quando l'utente modifica il percorso
                    setPathTestResult(null);
                  }}
                  className="text-sm"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleTestPath}
                  disabled={isTestingPath || !tempConfig.watchFolder.trim()}
                  title="Testa validità percorso"
                >
                  {isTestingPath ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCircle className="h-4 w-4" />
                  )}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleSelectFolder}
                  title="Esempi percorsi"
                >
                  <FolderOpen className="h-4 w-4" />
                </Button>
              </div>
              
              {/* Risultato test percorso */}
              {pathTestResult && (
                <div className={`mt-2 p-2 rounded text-xs flex items-center gap-2 ${
                  pathTestResult.success 
                    ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800'
                    : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800'
                }`}>
                  {pathTestResult.success ? (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-600" />
                  )}
                  <span>{pathTestResult.message}</span>
                </div>
              )}
              
              <p className="text-xs text-slate-500 mt-1">
                Percorso completo della cartella contenente i documenti da monitorare
              </p>
            </div>

            <div>
              <Label htmlFor="interval">Frequenza di Controllo</Label>
              <Select
                value={tempConfig.intervalMinutes.toString()}
                onValueChange={(value) => setTempConfig(prev => ({ ...prev, intervalMinutes: parseInt(value) }))}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Ogni minuto</SelectItem>
                  <SelectItem value="2">Ogni 2 minuti</SelectItem>
                  <SelectItem value="5">Ogni 5 minuti</SelectItem>
                  <SelectItem value="10">Ogni 10 minuti</SelectItem>
                  <SelectItem value="15">Ogni 15 minuti</SelectItem>
                  <SelectItem value="30">Ogni 30 minuti</SelectItem>
                  <SelectItem value="60">Ogni ora</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-slate-500 mt-1">
                Frequenza con cui il sistema controllerà le modifiche
              </p>
            </div>
          </div>

          {/* Azioni */}
          <div className="flex gap-2">
            {config?.enabled ? (
              <>
                <Button
                  onClick={handleStopAutoSync}
                  disabled={isLoading}
                  variant="destructive"
                  className="flex-1"
                >
                  <Square className="h-4 w-4 mr-2" />
                  {isLoading ? 'Fermando...' : 'Ferma'}
                </Button>
                
                <Button
                  onClick={handleUpdateConfig}
                  disabled={isLoading}
                  variant="outline"
                  className="flex-1"
                >
                  <Settings className="h-4 w-4 mr-2" />
                  {isLoading ? 'Aggiornando...' : 'Aggiorna'}
                </Button>
              </>
            ) : (
              <Button
                onClick={handleStartAutoSync}
                disabled={isLoading || !tempConfig.watchFolder.trim() || (pathTestResult && !pathTestResult.success)}
                className="flex-1"
                title={
                  !tempConfig.watchFolder.trim() 
                    ? "Inserisci un percorso prima" 
                    : (pathTestResult && !pathTestResult.success)
                    ? "Testa prima il percorso o correggilo"
                    : !pathTestResult 
                    ? "Consigliato: testa prima il percorso"
                    : "Avvia sincronizzazione automatica"
                }
              >
                <Play className="h-4 w-4 mr-2" />
                {isLoading ? 'Avviando...' : 'Avvia'}
              </Button>
            )}
          </div>

          {/* Informazioni */}
          <div className="text-xs text-slate-500 space-y-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded border border-blue-200 dark:border-blue-800">
            <div>
              <p><strong>Come funziona:</strong></p>
              <p>• Il sistema monitora automaticamente la cartella specificata</p>
              <p>• Quando rileva modifiche nei file, li aggiorna automaticamente</p>
              <p>• Supporta Excel, Word, PDF e tutti i formati standard</p>
              <p>• Le date di scadenza in Excel (cella A1) vengono aggiornate automaticamente</p>
            </div>
            <div className="pt-2 border-t border-blue-200 dark:border-blue-700">
              <p><strong>📁 Percorsi Google Drive Desktop:</strong></p>
              <p>• Windows: J:\Il mio Drive\GESTEA</p>
              <p>• Windows: G:\Il mio Drive\[cartella]</p>
              <p>• Windows: C:\Users\[nome]\Google Drive\[cartella]</p>
              <p className="mt-1 text-blue-600 dark:text-blue-400"><strong>💡 Copia il percorso direttamente da Esplora File</strong></p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

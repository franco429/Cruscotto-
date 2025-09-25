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
import { Settings, Play, Square, FolderOpen } from "lucide-react";
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
  const [config, setConfig] = useState<AutoSyncConfig | null>(null);
  const [tempConfig, setTempConfig] = useState<AutoSyncConfig>({
    watchFolder: '',
    intervalMinutes: 5,
    enabled: false,
  });

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

  // Seleziona cartella (simulazione - in un'app reale si userebbe l'API per aprire file dialog)
  const handleSelectFolder = () => {
    // Per ora mostriamo un messaggio con esempi di percorsi
    toast({
      title: "Seleziona Cartella",
      description: "Inserisci il percorso completo della cartella da monitorare (es: C:\\Documents\\SGI oppure /Users/nome/Documents/SGI)",
      duration: 5000,
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
                  placeholder="C:\Documents\SGI oppure /Users/nome/Documents/SGI"
                  value={tempConfig.watchFolder}
                  onChange={(e) => setTempConfig(prev => ({ ...prev, watchFolder: e.target.value }))}
                  className="text-sm"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleSelectFolder}
                  title="Seleziona cartella"
                >
                  <FolderOpen className="h-4 w-4" />
                </Button>
              </div>
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
                disabled={isLoading || !tempConfig.watchFolder.trim()}
                className="flex-1"
              >
                <Play className="h-4 w-4 mr-2" />
                {isLoading ? 'Avviando...' : 'Avvia'}
              </Button>
            )}
          </div>

          {/* Informazioni */}
          <div className="text-xs text-slate-500 space-y-1 p-3 bg-blue-50 dark:bg-blue-900/20 rounded border border-blue-200 dark:border-blue-800">
            <p><strong>Come funziona:</strong></p>
            <p>• Il sistema monitora automaticamente la cartella specificata</p>
            <p>• Quando rileva modifiche nei file, li aggiorna automaticamente</p>
            <p>• Supporta Excel, Word, PDF e tutti i formati standard</p>
            <p>• Le date di scadenza in Excel (cella A1) vengono aggiornate automaticamente</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

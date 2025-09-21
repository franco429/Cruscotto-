import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { Search, RefreshCw, Database, FileSpreadsheet } from "lucide-react";
import { apiRequest } from "../lib/queryClient";
import { useState } from "react";
import ModernFileUpload from "./modern-file-upload";
import { useToast } from "../hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";

interface ActionsBarProps {
  onFilterChange: (value: string) => void;
  filterValue: string;
  onSearch: (query: string) => void;
  searchValue: string;
  isAdmin: boolean;
  driveFolderId: string;
  onSyncComplete?: () => void;
  onSync: () => void;
  isSyncing: boolean;
}

export default function ActionsBar({
  onFilterChange,
  filterValue,
  onSearch,
  searchValue,
  isAdmin,
  driveFolderId,
  onSyncComplete,
  onSync,
  isSyncing,
}: ActionsBarProps) {
  const { toast } = useToast();
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const handleSearch = (value: string) => {
    onSearch(value);
  };

  const handleSyncNow = async () => {
    if (!driveFolderId) {
      toast({
        title: "Errore",
        description: "Nessuna cartella Google Drive configurata",
        variant: "destructive",
      });
      return;
    }

    if (isSyncing) {
      toast({
        title: "Info",
        description: "Sincronizzazione già in corso...",
      });
      return;
    }

    try {
      onSync();
    } catch (err: any) {
      toast({
        title: "Errore",
        description: err?.message === "Failed to fetch"
          ? "Impossibile raggiungere il server"
          : err?.message || "Errore durante la sincronizzazione",
        variant: "destructive",
      });
    }
  };

  const handleQuickBackup = async () => {
    try {
      const response = await apiRequest("POST", "/api/admin/backup");

      const result = await response.json();

      if (result.success) {
        toast({
          title: "Successo",
          description: "Backup creato con successo!",
        });
      } else {
        toast({
          title: "Errore",
          description: `Errore: ${result.message || result.error}`,
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Errore",
        description: "Errore durante la creazione del backup",
        variant: "destructive",
      });
    }
  };



  return (
    <div className="flex flex-col gap-3 md:flex-row md:items-center mb-6 p-4 bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700">
      {/* Search Bar */}
      <div className="relative w-full md:flex-1">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
        <Input
          type="text"
          placeholder="Cerca documenti..."
          value={searchValue}
          onChange={(e) => handleSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Filter Dropdown */}
      <Select value={filterValue} onValueChange={onFilterChange}>
        <SelectTrigger className="w-full md:w-[180px] mt-0">
          <SelectValue placeholder="Filtra per stato" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Tutti gli stati</SelectItem>
          <SelectItem value="active">Valido</SelectItem>
          <SelectItem value="warning">In scadenza</SelectItem>
          <SelectItem value="expired">Scaduto</SelectItem>
          <SelectItem value="obsolete">Obsoleto</SelectItem>
        </SelectContent>
      </Select>

      {/* Admin Actions */}
      {isAdmin && (
        <div className="flex flex-col gap-2 w-full md:w-auto md:flex-row md:gap-2">
          {/* Quick Backup Button */}
          <Button
            onClick={handleQuickBackup}
            variant="outline"
            className="flex items-center gap-2 w-full md:w-auto"
            title="Crea backup rapido"
          >
            <Database className="h-4 w-4" />
            Backup
          </Button>

          {/*  Aggiorna documenti locali - Dialog moderno */}
          <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
            <DialogTrigger asChild>
              <Button
                variant="outline"
                className="flex items-center gap-2 w-full md:w-auto"
                title="Aggiorna documenti locali"
              >
                <FileSpreadsheet className="h-4 w-4" />
                Aggiorna documenti locali
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Carica Documenti Locali</DialogTitle>
              </DialogHeader>
              <ModernFileUpload
                onFilesSelected={async (files) => {
                  // Esegui l'upload in batch per evitare limiti dei proxy/CDN (es. 100MB Cloudflare)
                  // - Max per file: 100MB (coerente con backend)
                  // - Max per batch: ~90MB (margine di sicurezza)
                  const MAX_FILE_BYTES = 100 * 1024 * 1024;
                  const MAX_BATCH_BYTES = 90 * 1024 * 1024;

                  // Filtra (o segnala) file troppo grandi
                  const tooLarge = files.filter((f: any) => f.size > MAX_FILE_BYTES);
                  if (tooLarge.length > 0) {
                    toast({
                      title: "File troppo grandi",
                      description: `Alcuni file superano 100MB e sono stati esclusi (${tooLarge.length}).`,
                      variant: "destructive",
                    });
                  }

                  const validFiles = files.filter((f: any) => f.size <= MAX_FILE_BYTES);

                  // Partiziona i file in batch per dimensione totale
                  const batches: any[][] = [];
                  let current: any[] = [];
                  let currentBytes = 0;
                  for (const file of validFiles) {
                    if (file.size > MAX_BATCH_BYTES) {
                      // File singolo che sta sotto i 100MB ma supera i 90MB: invia da solo
                      if (current.length > 0) {
                        batches.push(current);
                        current = [];
                        currentBytes = 0;
                      }
                      batches.push([file]);
                      continue;
                    }
                    if (currentBytes + file.size > MAX_BATCH_BYTES) {
                      batches.push(current);
                      current = [file];
                      currentBytes = file.size;
                    } else {
                      current.push(file);
                      currentBytes += file.size;
                    }
                  }
                  if (current.length > 0) {
                    batches.push(current);
                  }

                  let totalSuccess = 0;
                  let totalErrors: string[] = [];

                  try {
                    // Upload asincrono ottimizzato
                    const formData = new FormData();
                    files.forEach((file: any) => {
                      const fileNameForUpload = file.path || file.webkitRelativePath || file.name;
                      formData.append("localFiles", file, fileNameForUpload);
                    });

                    // Avvia upload asincrono
                    const response = await apiRequest("POST", "/api/documents/local-upload", formData);
                    const result = await response.json();

                    if (!response.ok) {
                      throw new Error(result?.message || "Errore durante l'upload");
                    }

                    const { uploadId, totalFiles } = result;

                    // Mostra toast di avvio con progress tracking
                    const progressToast = toast({
                      title: "Upload in corso",
                      description: `Elaborazione di ${totalFiles} file in background...`,
                      duration: Infinity,
                    });

                    // Polling dello stato upload con gestione errori robusta
                    let pollAttempts = 0;
                    let maxPollAttempts = 15; // Massimo 15 tentativi (30 secondi)
                    
                    const pollUploadStatus = async () => {
                      try {
                        pollAttempts++;
                        const statusResponse = await apiRequest("GET", `/api/documents/upload-status/${uploadId}`);
                        
                        // Se riceviamo errore 500, fermiamo immediatamente il polling
                        if (!statusResponse.ok) {
                          if (statusResponse.status === 500) {
                            progressToast.dismiss();
                            toast({
                              title: "Errore server",
                              description: "Errore interno del server. L'upload potrebbe essere ancora in corso.",
                              variant: "destructive",
                            });
                            return true; // Stop polling
                          }
                          
                          // Per altri errori, ritenta ma con limite
                          if (pollAttempts >= maxPollAttempts) {
                            progressToast.dismiss();
                            toast({
                              title: "Timeout polling",
                              description: "Impossibile verificare lo stato dell'upload. Controlla manualmente.",
                              variant: "destructive",
                            });
                            return true; // Stop polling
                          }
                          return false; // Continue polling
                        }

                        const status = await statusResponse.json();

                        // Reset counter on successful response
                        pollAttempts = 0;

                        const progressPercent = Math.round((status.processedFiles + status.failedFiles) / status.totalFiles * 100);
                        
                        // Aggiorna descrizione del toast
                        progressToast.update({
                          id: progressToast.id,
                          title: "Upload in corso",
                          description: `Progresso: ${progressPercent}% (${status.processedFiles + status.failedFiles}/${status.totalFiles})`,
                          duration: Infinity,
                        });

                        if (status.status === 'completed') {
                          progressToast.dismiss();
                          
                          if (status.errors.length === 0) {
                            toast({
                              title: "Successo",
                              description: `${status.processedFiles} documenti caricati con successo`,
                            });
                          } else {
                            toast({
                              title: "Completato con errori",
                              description: `${status.processedFiles} caricati, ${status.failedFiles} errori.`,
                              variant: "destructive",
                            });
                          }

                          if (onSyncComplete) onSyncComplete();
                          return true; // Stop polling
                        } else if (status.status === 'failed') {
                          progressToast.dismiss();
                          toast({
                            title: "Errore",
                            description: "Upload fallito. Controlla i log per dettagli.",
                            variant: "destructive",
                          });
                          return true; // Stop polling
                        }

                        return false; // Continue polling
                      } catch (error) {
                        console.error("Error polling upload status:", error);
                        pollAttempts++;
                        
                        // Se abbiamo troppi errori consecutivi, fermiamo il polling
                        if (pollAttempts >= maxPollAttempts) {
                          progressToast.dismiss();
                          toast({
                            title: "Errore di rete",
                            description: "Troppe richieste fallite. Controlla la connessione e riprova.",
                            variant: "destructive",
                          });
                          return true; // Stop polling
                        }
                        
                        return false; // Continue polling
                      }
                    };

                    // Avvia polling ogni 2 secondi
                    const pollInterval = setInterval(async () => {
                      const shouldStop = await pollUploadStatus();
                      if (shouldStop) {
                        clearInterval(pollInterval);
                      }
                    }, 2000);

                    // Timeout di sicurezza (10 minuti)
                    setTimeout(() => {
                      clearInterval(pollInterval);
                      progressToast.dismiss();
                      toast({
                        title: "Timeout",
                        description: "Upload in corso da troppo tempo. Controlla i risultati manualmente.",
                        variant: "destructive",
                      });
                    }, 600000);

                    setShowUploadDialog(false);
                  } catch (err: any) {
                    toast({
                      title: "Errore",
                      description: err?.message || "Errore durante l'avvio dell'upload",
                      variant: "destructive",
                    });
                  }
                }}
                onUploadComplete={() => {
                  // Callback opzionale quando il caricamento è completato
                }}
                accept={[".xlsx", ".xls", ".docx", ".pdf", ".ods", ".csv", "doc"]}
                maxFiles={1000}
                disabled={false}
              />
            </DialogContent>
          </Dialog>

          {/* Sync Button */}
          <Button
            onClick={handleSyncNow}
            disabled={isSyncing || !driveFolderId}
            className="flex items-center gap-2 w-full md:w-auto"
          >
            {isSyncing ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                Sincronizzando...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4" />
                Sincronizza Google Drive
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}

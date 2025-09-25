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
import AutoSyncSettings from "./auto-sync-settings";

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

          {/* Auto-Sync Settings - Responsive */}
          <div className="w-full md:w-auto">
            <AutoSyncSettings onConfigChange={onSyncComplete} />
          </div>

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
                  // Esegui l'upload in batch per evitare limiti del backend Render
                  // - Max per file: 10MB (limite backend effettivo)
                  // - Max per batch: ~25MB (ottimizzato per 25 file max per richiesta)
                  // - Max file per batch: 25 file (limite critico backend)
                  const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10MB come da backend
                  const MAX_BATCH_BYTES = 25 * 1024 * 1024; // 25MB per batch
                  const MAX_FILES_PER_BATCH = 25; // 25 file max per richiesta (limite backend)

                  // Filtra (o segnala) file troppo grandi
                  const tooLarge = files.filter((f: any) => f.size > MAX_FILE_BYTES);
                  if (tooLarge.length > 0) {
                    toast({
                      title: "File troppo grandi",
                      description: `Alcuni file superano 10MB e sono stati esclusi (${tooLarge.length}). Usa Google Drive per file grandi.`,
                      variant: "destructive",
                    });
                  }

                  const validFiles = files.filter((f: any) => f.size <= MAX_FILE_BYTES);

                  // Partiziona i file in batch per dimensione E numero di file
                  const batches: any[][] = [];
                  let current: any[] = [];
                  let currentBytes = 0;
                  for (const file of validFiles) {
                    // Controlla se aggiungere questo file supererebbe i limiti
                    const wouldExceedSize = currentBytes + file.size > MAX_BATCH_BYTES;
                    const wouldExceedFileCount = current.length >= MAX_FILES_PER_BATCH;
                    
                    if (wouldExceedSize || wouldExceedFileCount) {
                      // Se il batch corrente ha almeno un file, salvalo
                      if (current.length > 0) {
                        batches.push(current);
                        current = [];
                        currentBytes = 0;
                      }
                    }
                    
                    // Aggiunge il file al batch corrente
                    current.push(file);
                    currentBytes += file.size;
                  }
                  
                  // Salva l'ultimo batch se non vuoto
                  if (current.length > 0) {
                    batches.push(current);
                  }

                  let totalSuccess = 0;
                  let totalErrors: string[] = [];
                  let allUploadIds: string[] = [];

                  try {
                    // Mostra toast di avvio per upload batch
                    const progressToast = toast({
                      title: "Upload in corso",
                      description: `Avvio upload di ${validFiles.length} file in ${batches.length} batch (max ${MAX_FILES_PER_BATCH} file/batch)...`,
                      duration: Infinity,
                    });

                    // Upload batch per batch per rispettare i limiti di dimensione
                    for (let i = 0; i < batches.length; i++) {
                      const batch = batches[i];
                      const batchSizeMB = Math.round(batch.reduce((sum: number, f: any) => sum + f.size, 0) / (1024 * 1024));
                      
                      // Aggiorna progress per batch corrente
                      progressToast.update({
                        id: progressToast.id,
                        title: "Upload in corso",
                        description: `Batch ${i + 1}/${batches.length} (${batch.length}/${MAX_FILES_PER_BATCH} file, ${batchSizeMB}MB)...`,
                        duration: Infinity,
                      });

                      const formData = new FormData();
                      batch.forEach((file: any) => {
                        const fileNameForUpload = file.path || file.webkitRelativePath || file.name;
                        formData.append("localFiles", file, fileNameForUpload);
                      });

                      // Upload singolo batch
                      const response = await apiRequest("POST", "/api/documents/local-upload", formData);
                      const result = await response.json();

                      if (!response.ok) {
                        totalErrors.push(`Batch ${i + 1}: ${result?.message || "Errore sconosciuto"}`);
                        continue;
                      }

                      allUploadIds.push(result.uploadId);
                    }

                    // Se tutti i batch sono falliti
                    if (allUploadIds.length === 0) {
                      progressToast.dismiss();
                      toast({
                        title: "Errore completo",
                        description: `Tutti i ${batches.length} batch sono falliti. Errori: ${totalErrors.join('; ')}`,
                        variant: "destructive",
                      });
                      return;
                    }

                    const totalFiles = validFiles.length;

                    // Polling dello stato upload per tutti i batch contemporaneamente
                    let pollAttempts = 0;
                    let maxPollAttempts = 20; // Aumentato per batch multipli (40 secondi max)
                    let completedBatches = new Set<string>();
                    
                    const pollAllBatchesStatus = async () => {
                      try {
                        pollAttempts++;
                        
                        // Polling parallelo di tutti gli uploadId
                        const statusPromises = allUploadIds.map(uploadId => 
                          apiRequest("GET", `/api/documents/upload-status/${uploadId}`)
                            .then(res => ({ uploadId, response: res }))
                            .catch(err => ({ uploadId, error: err }))
                        );
                        
                        const results = await Promise.allSettled(statusPromises);
                        
                        let totalProcessed = 0;
                        let totalFailed = 0;
                        let hasErrors = false;
                        let allCompleted = true;
                        
                        // Analizza i risultati di tutti i batch
                        for (const result of results) {
                          if (result.status === 'rejected') {
                            hasErrors = true;
                            continue;
                          }
                          
                          const { uploadId, response, error } = result.value as any;
                          
                          if (error) {
                            hasErrors = true;
                            continue;
                          }
                          
                          if (!response.ok) {
                            if (response.status === 500) {
                              hasErrors = true;
                              continue;
                            }
                            continue;
                          }
                          
                          const status = await response.json();
                          totalProcessed += status.processedFiles || 0;
                          totalFailed += status.failedFiles || 0;
                          
                          if (status.status === 'completed') {
                            completedBatches.add(uploadId);
                          } else if (status.status === 'failed') {
                            completedBatches.add(uploadId);
                            hasErrors = true;
                          } else {
                            allCompleted = false;
                          }
                        }
                        
                        // Reset counter on successful response
                        if (!hasErrors) pollAttempts = 0;

                        const progressPercent = totalFiles > 0 ? Math.round((totalProcessed + totalFailed) / totalFiles * 100) : 0;
                        
                        // Aggiorna descrizione del toast
                        progressToast.update({
                          id: progressToast.id,
                          title: "Upload in corso",
                          description: `Progresso: ${progressPercent}% - ${completedBatches.size}/${allUploadIds.length} batch completati (${totalProcessed + totalFailed}/${totalFiles} file)`,
                          duration: Infinity,
                        });

                        // Se tutti i batch sono completati
                        if (allCompleted || completedBatches.size === allUploadIds.length) {
                          progressToast.dismiss();
                          
                          if (totalFailed === 0 && !hasErrors) {
                            toast({
                              title: "Successo",
                              description: `Tutti i ${totalProcessed} documenti caricati con successo in ${allUploadIds.length} batch`,
                            });
                          } else {
                            toast({
                              title: "Completato con errori",
                              description: `${totalProcessed} caricati con successo, ${totalFailed} errori in ${allUploadIds.length} batch.`,
                              variant: "destructive",
                            });
                          }

                          if (onSyncComplete) onSyncComplete();
                          return true; // Stop polling
                        }
                        
                        // Se abbiamo troppi errori consecutivi
                        if (pollAttempts >= maxPollAttempts) {
                          progressToast.dismiss();
                          toast({
                            title: "Timeout polling",
                            description: "Impossibile verificare lo stato completo. Alcuni upload potrebbero essere ancora in corso.",
                            variant: "destructive",
                          });
                          return true; // Stop polling
                        }

                        return false; // Continue polling
                      } catch (error) {
                        console.error("Error polling batch upload status:", error);
                        pollAttempts++;
                        
                        // Se abbiamo troppi errori consecutivi, fermiamo il polling
                        if (pollAttempts >= maxPollAttempts) {
                          progressToast.dismiss();
                          toast({
                            title: "Errore di rete",
                            description: "Troppe richieste fallite durante il monitoraggio. Controlla manualmente lo stato.",
                            variant: "destructive",
                          });
                          return true; // Stop polling
                        }
                        
                        return false; // Continue polling
                      }
                    };

                    // Avvia polling ogni 2 secondi
                    const pollInterval = setInterval(async () => {
                      const shouldStop = await pollAllBatchesStatus();
                      if (shouldStop) {
                        clearInterval(pollInterval);
                      }
                    }, 2000);

                    // Timeout di sicurezza ottimizzato per carichi di lavoro pesanti (10 minuti)
                    setTimeout(() => {
                      clearInterval(pollInterval);
                      progressToast.dismiss();
                      toast({
                        title: "Timeout",
                        description: `Upload batch in corso da troppo tempo. ${allUploadIds.length} batch avviati - controlla i risultati manualmente.`,
                        variant: "destructive",
                      });
                    }, 600000); // 10 minuti per carichi pesanti

                    setShowUploadDialog(false);
                  } catch (err: any) {
                    toast({
                      title: "Errore",
                      description: err?.message || "Errore durante l'avvio dell'upload batch",
                      variant: "destructive",
                    });
                  }
                }}
                onUploadComplete={() => {
                  // Callback opzionale quando il caricamento è completato
                }}
                accept={[".xlsx", ".xls", ".doc", ".docx", ".pdf", ".ods", ".csv"]}
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

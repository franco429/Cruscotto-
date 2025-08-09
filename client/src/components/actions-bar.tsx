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
                  const formData = new FormData();
                  files.forEach((file: any) => {
                    const fileNameForUpload = file.path || file.webkitRelativePath || file.name;
                    formData.append("localFiles", file, fileNameForUpload);
                  });
                  try {
                    const response = await apiRequest(
                      "POST",
                      "/api/documents/local-upload",
                      formData
                    );
                    const result = await response.json().catch(() => null);
                    if (response.ok) {
                      // Evita di mostrare toast di "Successo" se il server segnala errori parziali (es. 207 o errors presenti)
                      const hasPartialErrors = !!(result && Array.isArray(result.errors) && result.errors.length > 0);
                      if (!hasPartialErrors) {
                        toast({
                          title: "Successo",
                          description: (result && result.message) || "Documenti locali aggiornati!",
                        });
                      }
                      if (onSyncComplete) onSyncComplete();
                      setShowUploadDialog(false);
                    } else {
                      const errorData = result;
                      toast({
                        title: "Errore",
                        description: errorData.message || "Errore aggiornamento documenti locali",
                        variant: "destructive",
                      });
                    }
                  } catch (err) {
                    toast({
                      title: "Errore",
                      description: "Errore durante l'aggiornamento dei documenti locali",
                      variant: "destructive",
                    });
                  }
                }}
                onUploadComplete={() => {
                  // Callback opzionale quando il caricamento è completato
                }}
                accept={[".xlsx", ".xls", ".docx", ".pdf", ".ods", ".csv"]}
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

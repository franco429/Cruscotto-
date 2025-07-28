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
import { toast } from "react-hot-toast";
import { apiRequest } from "../lib/queryClient";
import { useRef } from "react";

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
  const handleSearch = (value: string) => {
    onSearch(value);
  };

  const handleSyncNow = async () => {
    if (!driveFolderId) {
      toast.error("Nessuna cartella Google Drive configurata");
      return;
    }

    if (isSyncing) {
      toast.success("Sincronizzazione già in corso...");
      return;
    }

    try {
      onSync();
    } catch (err: any) {
      toast.error(
        err?.message === "Failed to fetch"
          ? "Impossibile raggiungere il server"
          : err?.message || "Errore durante la sincronizzazione"
      );
    }
  };

  const handleQuickBackup = async () => {
    try {
      const response = await apiRequest("POST", "/api/admin/backup");

      const result = await response.json();

      if (result.success) {
        toast.success("Backup creato con successo!");
      } else {
        toast.error(`Errore: ${result.message || result.error}`);
      }
    } catch (error) {
      toast.error("Errore durante la creazione del backup");
    }
  };

  // Nuovo: Gestione aggiornamento documenti locali
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleUpdateLocalDocs = () => {
    fileInputRef.current?.click();
  };

  const handleLocalFilesChange = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const formData = new FormData();
    Array.from(files).forEach((file) => {
      formData.append("localFiles", file);
    });
    try {
      const response = await apiRequest(
        "POST",
        "/api/documents/local-upload",
        formData
      );
      if (response.ok) {
        toast.success("Documenti locali aggiornati!");
        if (onSyncComplete) onSyncComplete();
      } else {
        const errorData = await response.json();
        toast.error(
          errorData.message || "Errore aggiornamento documenti locali"
        );
      }
    } catch (err) {
      toast.error("Errore durante l'aggiornamento dei documenti locali");
    }
    // Reset input per permettere nuovo upload
    e.target.value = "";
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

          {/* Nuovo: Aggiorna documenti locali */}
          <Button
            onClick={handleUpdateLocalDocs}
            variant="outline"
            className="flex items-center gap-2 w-full md:w-auto"
            title="Aggiorna documenti locali"
          >
            <FileSpreadsheet className="h-4 w-4" />
            Aggiorna documenti locali
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            // @ts-ignore
            webkitdirectory="true"
            // @ts-ignore
            directory="true"
            multiple
            accept=".xlsx,.xls,.docx,.pdf,.ods,.csv"
            style={{ display: "none" }}
            onChange={handleLocalFilesChange}
          />

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

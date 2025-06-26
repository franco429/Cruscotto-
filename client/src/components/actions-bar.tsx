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

  return (
    <div className="flex flex-col sm:flex-row gap-3 mb-6 p-4 bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700">
      {/* Search Bar */}
      <div className="relative flex-1">
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
        <SelectTrigger className="w-full sm:w-[180px]">
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
        <div className="flex gap-2">
          {/* Quick Backup Button */}
          <Button
            onClick={handleQuickBackup}
            variant="outline"
            className="flex items-center gap-2"
            title="Crea backup rapido"
          >
            <Database className="h-4 w-4" />
            Backup
          </Button>

          {/* Sync Button */}
          <Button
            onClick={handleSyncNow}
            disabled={isSyncing || !driveFolderId}
            className="flex items-center gap-2"
          >
            {isSyncing ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                Sincronizzando...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4" />
                Sincronizza
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}

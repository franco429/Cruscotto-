import { useState, useMemo, useEffect } from "react";
import { useAuth } from "../hooks/use-auth";
import { useMutation } from "@tanstack/react-query";
import { useQueryWithErrorHandling } from "../hooks/use-query-with-error-handling";
import { DocumentDocument as Document } from "../../../shared-types/schema";
import HeaderBar from "../components/header-bar";
import DocumentTable from "../components/document-table";
import StatsCards from "../components/stats-cards";
import ActionsBar from "../components/actions-bar";
import DocumentPreviewModal from "../components/document-preview-modal";
import Footer from "../components/footer";
import { NetworkError } from "../components/network-error";
import SyncProgress from "../components/sync-progress";
import BackupStatus from "../components/backup-status";
import { Loader2 } from "lucide-react";
import { Button } from "../components/ui/button";
import { Link } from "wouter";
import { toast } from "react-hot-toast";
import { apiRequest } from "../lib/queryClient";

export default function HomePage() {
  /* -----------------------------------------------------------
   * STATE
   * --------------------------------------------------------- */
  const [documentToPreview, setDocumentToPreview] = useState<Document | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [syncProgress, setSyncProgress] = useState<{
    isSyncing: boolean;
    processed: number;
    total: number;
    currentBatch: number;
    totalBatches: number;
    error?: string;
  }>({
    isSyncing: false,
    processed: 0,
    total: 0,
    currentBatch: 0,
    totalBatches: 0
  });
  const [isFromGoogleDriveConnection, setIsFromGoogleDriveConnection] = useState(false);

  const { user } = useAuth();
  const driveFolderId = user?.clientId ? `drive-folder-${user.clientId}` : undefined;

  
  
  // Controlla se l'utente arriva dalla connessione Google Drive
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const fromDrive = urlParams.get('fromDrive');
    
    if (fromDrive === 'true') {
      setIsFromGoogleDriveConnection(true);
      toast.success("Benvenuto! I documenti si stanno sincronizzando...");
      
      // Rimuovi il parametro dall'URL
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.delete('fromDrive');
      window.history.replaceState({}, '', newUrl.toString());
    }
  }, []);

  // Aggiorna automaticamente gli stati di allerta ogni minuto
  useEffect(() => {
    const interval = setInterval(() => {
      // Forza il ricalcolo dei documenti con stato dinamico
      // Questo triggererà il re-render con gli stati aggiornati
    }, 60000); // Ogni minuto

    return () => clearInterval(interval);
  }, []);

  /* -----------------------------------------------------------
   * QUERY – documenti attivi con gestione errori robusta
   * --------------------------------------------------------- */
  const {
    data: documents,
    isLoading,
    error,
    refetch,
    isNetworkError,
    retry,
  } = useQueryWithErrorHandling<Document[]>({
    queryKey: ["/api/documents"],
    onError: (error) => {
      console.error("❌ Errore caricamento documenti:", error);
    },
    // Aumenta il refetch interval se l'utente arriva dalla connessione Drive
    refetchInterval: isFromGoogleDriveConnection ? 3000 : false, // Refetch ogni 3 secondi
    refetchIntervalInBackground: false,
  });

  /* -----------------------------------------------------------
   * QUERY – documenti obsoleti (solo per stats) con gestione errori
   * --------------------------------------------------------- */
  const {
    data: obsoleteDocs,
    isLoading: isLoadingObsolete,
    error: errorObsolete,
    isNetworkError: isNetworkErrorObsolete,
    retry: retryObsolete,
  } = useQueryWithErrorHandling<Document[]>({
    queryKey: ["/api/documents/obsolete"],
    onError: (error) => {
      console.error("❌ Errore caricamento documenti obsoleti:", error);
    },
  });

  /* -----------------------------------------------------------
   * MUTATION – sync con Google Drive ottimizzato
   * --------------------------------------------------------- */
  const syncMutation = useMutation({
    mutationFn: async () => {
      setSyncProgress(prev => ({ ...prev, isSyncing: true, error: undefined }));
      
      // Usa apiRequest per la chiamata di sync
      const response = await apiRequest("POST", "/api/sync");
      
      if (!response.ok) {
        // Ottieni il messaggio di errore dal backend
        let errorMessage = "Sync failed";
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || `HTTP ${response.status}: ${response.statusText}`;
        } catch (e) {
          errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        }
        
        console.error("❌ Sync error details:", {
          status: response.status,
          statusText: response.statusText,
          message: errorMessage
        });
        
        throw new Error(errorMessage);
      }
      
      const result = await response.json();
      
      // Simula il progresso della sincronizzazione
      // In futuro si può implementare WebSocket per aggiornamenti real-time
      simulateSyncProgress();
      
      return result;
    },
    onSuccess: () => {
      // Refetch documents after successful sync
      setTimeout(() => {
        refetch();
        setSyncProgress(prev => ({ ...prev, isSyncing: false }));
        toast.success("Sincronizzazione completata con successo!");
      }, 2000); // Simula il tempo di completamento
    },
    onError: (error) => {
      const errorMessage = error instanceof Error ? error.message : "Errore durante la sincronizzazione";
      
      setSyncProgress(prev => ({ 
        ...prev, 
        isSyncing: false, 
        error: errorMessage
      }));
      
      // Mostra messaggio di errore specifico
      if (errorMessage.includes("403") || errorMessage.includes("Forbidden")) {
        toast.error("Accesso negato. Verifica di essere loggato come amministratore.");
      } else if (errorMessage.includes("401") || errorMessage.includes("Non autenticato")) {
        toast.error("Sessione scaduta. Effettua nuovamente l'accesso.");
      } else {
        toast.error(errorMessage);
      }
      
      console.error("❌ Errore sync:", error);
    },
  });

 
  
  // Funzione per calcolare dinamicamente l'alertStatus basandosi sulla data corrente
  const calculateDynamicAlertStatus = (expiryDate: Date | null, warningDays: number = 30): string => {
    if (!expiryDate) {
      return "none";
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0); // Normalizza a mezzanotte
    
    const warningLimit = new Date(today);
    warningLimit.setDate(today.getDate() + warningDays);
    
    // Normalizza la data di scadenza per il confronto
    const normalizedExpiryDate = new Date(expiryDate);
    normalizedExpiryDate.setHours(0, 0, 0, 0);
    
    if (normalizedExpiryDate < today) {
      return "expired";
    } else if (normalizedExpiryDate <= warningLimit) {
      return "warning";
    } else {
      return "none";
    }
  };

  // Applica il calcolo dinamico dell'alertStatus ai documenti
  const documentsWithDynamicStatus = useMemo(() => {
    if (!documents) return [];
    // Filtro aggiuntivo: mostra solo documenti non obsoleti
    return documents
      .filter(doc => !doc.isObsolete)
      .map(doc => ({
        ...doc,
        alertStatus: calculateDynamicAlertStatus(doc.expiryDate)
      }));
  }, [documents]);

  // Applica il calcolo dinamico dell'alertStatus ai documenti obsoleti
  const obsoleteDocumentsWithDynamicStatus = useMemo(() => {
    if (!obsoleteDocs) return [];
    return obsoleteDocs.map(doc => ({
      ...doc,
      alertStatus: calculateDynamicAlertStatus(doc.expiryDate)
    }));
  }, [obsoleteDocs]);
  
  // Simula il progresso della sincronizzazione
  const simulateSyncProgress = () => {
    const totalFiles = documents?.length || 100;
    const totalBatches = Math.ceil(totalFiles / 20); // 20 file per batch
    
    setSyncProgress(prev => ({
      ...prev,
      total: totalFiles,
      totalBatches,
      processed: 0,
      currentBatch: 1
    }));

    let processed = 0;
    let currentBatch = 1;
    
    const interval = setInterval(() => {
      processed += Math.floor(Math.random() * 10) + 5; // 5-15 file per volta
      
      if (processed >= totalFiles) {
        processed = totalFiles;
        clearInterval(interval);
      }
      
      currentBatch = Math.ceil(processed / 20);
      
      setSyncProgress(prev => ({
        ...prev,
        processed,
        currentBatch
      }));
    }, 200); // Aggiorna ogni 200ms
  };

  const handleRetrySync = () => {
    setSyncProgress(prev => ({ ...prev, error: undefined }));
    syncMutation.mutate();
  };

  /* -----------------------------------------------------------
   * FILTER – lista principale
   * --------------------------------------------------------- */
  const filteredDocuments = useMemo(() => {
    // Mostra solo documenti attivi (non obsoleti), tranne se filtro 'obsolete'
    if (statusFilter === "obsolete") {
      return obsoleteDocumentsWithDynamicStatus.filter((doc) => {
        const matchesSearch = doc.title?.toLowerCase().includes(searchTerm.toLowerCase());
        return matchesSearch;
      });
    } else {
      return documentsWithDynamicStatus.filter((doc) => {
        const matchesSearch = doc.title?.toLowerCase().includes(searchTerm.toLowerCase());
        let matchesStatus = true;
        if (statusFilter === "all") {
          matchesStatus = true;
        } else if (statusFilter === "active") {
          matchesStatus = !doc.isObsolete && (
            doc.alertStatus === "none" ||
            doc.alertStatus === "valid" ||
            doc.alertStatus === "active"
          );
        } else {
          matchesStatus = !doc.isObsolete && doc.alertStatus?.toLowerCase() === statusFilter.toLowerCase();
        }
        return matchesSearch && matchesStatus;
      });
    }
  }, [statusFilter, searchTerm, documentsWithDynamicStatus, obsoleteDocumentsWithDynamicStatus]);

  /* -----------------------------------------------------------
   * STATS – dashboard
   * --------------------------------------------------------- */
  const stats = useMemo(() => {
    const activeDocs = documentsWithDynamicStatus?.filter((d) => !d.isObsolete);
    const obsoleteDocsCount = obsoleteDocumentsWithDynamicStatus?.length || 0;
    return {
      total: activeDocs?.length || 0,
      expiringSoon: activeDocs?.filter((d) => d.alertStatus === "warning").length || 0,
      expired: activeDocs?.filter((d) => d.alertStatus === "expired").length || 0,
      obsolete: obsoleteDocsCount,
    };
  }, [documentsWithDynamicStatus, obsoleteDocumentsWithDynamicStatus]);

  /* -----------------------------------------------------------
   * HANDLERS
   * --------------------------------------------------------- */
  const handlePreview = (doc: Document) => {
    setDocumentToPreview(doc);
  };

  const handleSync = () => {
    syncMutation.mutate();
  };

  /* -----------------------------------------------------------
   * RENDER
   * --------------------------------------------------------- */
  return (
    <div className="flex flex-col min-h-screen">
      <HeaderBar onSearch={setSearchTerm} user={user} />

      <main className="flex-1 bg-slate-50 dark:bg-slate-900 p-3 xs:p-4 sm:p-5 md:p-6">
        {/* Page Header */}
        <div className="mb-4 sm:mb-6">
          <h1 className="text-xl xs:text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
            Indice dei Documenti
          </h1>
          <p className="mt-1 text-xs xs:text-sm text-slate-500 dark:text-slate-400">
            Sfoglia e gestisci la tua documentazione ISO
          </p>
        </div>

        {/* Stats Cards */}
        <StatsCards stats={stats} />

        {/* Backup Status for Admin */}
        {user?.role === "admin" && (
          <div className="mb-6">
            <BackupStatus isAdmin={user?.role === "admin"} />
          </div>
        )}

        {/* Actions Bar */}
        <ActionsBar
          onSearch={setSearchTerm}
          searchValue={searchTerm}
          onFilterChange={setStatusFilter}
          filterValue={statusFilter}
          onSync={handleSync}
          isSyncing={syncMutation.isPending || syncProgress.isSyncing}
          isAdmin={user?.role === "admin"}
          driveFolderId={driveFolderId || ""}
        />

        {/* Sync Progress Component */}
        <SyncProgress
          isSyncing={syncProgress.isSyncing}
          processed={syncProgress.processed}
          total={syncProgress.total}
          currentBatch={syncProgress.currentBatch}
          totalBatches={syncProgress.totalBatches}
          error={syncProgress.error}
          onRetry={handleRetrySync}
        />

        {/* Document Table con gestione errori */}
        {isLoading || isLoadingObsolete ? (
          <div className="flex justify-center items-center h-40 xs:h-48 sm:h-56 md:h-64">
            <Loader2 className="h-6 w-6 sm:h-7 sm:w-7 md:h-8 md:w-8 animate-spin text-primary" />
            {isFromGoogleDriveConnection && (
              <div className="ml-4 text-sm text-slate-600 dark:text-slate-400">
                Sincronizzazione in corso...
              </div>
            )}
          </div>
        ) : isNetworkError ? (
          <NetworkError
            error={error}
            onRetry={retry}
            title="Errore caricamento documenti"
            message="Impossibile caricare i documenti. Verifica la connessione e riprova."
          />
        ) : (
          <DocumentTable
            documents={filteredDocuments}
            onPreview={handlePreview}
            isAdmin={user?.role === "admin"}
          />
        )}
      </main>

      <Footer />

      {/* Document Preview Modal */}
      <DocumentPreviewModal
        document={documentToPreview}
        isOpen={!!documentToPreview}
        onClose={() => setDocumentToPreview(null)}
      />
    </div>
  );
}

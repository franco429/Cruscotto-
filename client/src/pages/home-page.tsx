import { useState, useMemo, useEffect, useCallback } from "react";
import { useAuth } from "../hooks/use-auth";
import { useQueryWithErrorHandling } from "../hooks/use-query-with-error-handling";
import { useSyncSSE, SyncProgress as SyncProgressType } from "../hooks/use-sync-sse";
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
import ChristmasSnow from "../components/christmas-snow";
import { Loader2 } from "lucide-react";
import { Button } from "../components/ui/button";
import { Link } from "wouter";
import { toast } from "react-hot-toast";

export default function HomePage() {
  /* -----------------------------------------------------------
   * STATE
   * --------------------------------------------------------- */
  const [documentToPreview, setDocumentToPreview] = useState<Document | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isFromGoogleDriveConnection, setIsFromGoogleDriveConnection] = useState(false);

  const { user } = useAuth();
  const driveFolderId = user?.clientId ? `drive-folder-${user.clientId}` : undefined;

  
  
  // Controlla se l'utente arriva dalla connessione Google Drive
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const fromDrive = urlParams.get('fromDrive');
    
    if (fromDrive === 'true') {
      setIsFromGoogleDriveConnection(true);
      toast.success("Connessione Google Drive completata! I documenti si stanno sincronizzando...");
      
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

  // Stato per tracciare se la sincronizzazione è attiva (per refetch automatico)
  const [isSyncActive, setIsSyncActive] = useState(false);

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
      console.error(" Errore caricamento documenti:", error);
    },
    // Refetch automatico durante sincronizzazione o connessione Drive
    refetchInterval: (isSyncActive || isFromGoogleDriveConnection) ? 1500 : false,
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
      console.error(" Errore caricamento documenti obsoleti:", error);
    },
  });

  // Mostra messaggio quando i documenti vengono caricati dopo la connessione Google Drive
  useEffect(() => {
    if (isFromGoogleDriveConnection && documents && documents.length > 0) {
      toast.success(`Sincronizzazione completata! ${documents.length} documenti disponibili.`);
      setIsFromGoogleDriveConnection(false); // Reset per evitare messaggi duplicati
    }
  }, [isFromGoogleDriveConnection, documents]);

  /* -----------------------------------------------------------
   * SYNC - Sincronizzazione con polling automatico
   * --------------------------------------------------------- */
  const handleSyncProgress = useCallback((progress: SyncProgressType) => {
    // Attiva refetch automatico durante la sincronizzazione
    setIsSyncActive(true);
    
    // Refetch esplicito anche ogni volta che c'è progresso
    refetch();
  }, [refetch]);

  const handleSyncCompleted = useCallback((result: SyncProgressType) => {
    // Disattiva refetch automatico
    setIsSyncActive(false);
    
    // Refetch finale dei documenti
    refetch();
    
    // Mostra messaggio di completamento
    if (result.success) {
      toast.success(`Sincronizzazione completata! ${result.processed} documenti sincronizzati.`);
    } else if (result.failed && result.failed > 0) {
      toast.success(`Sincronizzazione completata con ${result.failed} errori. ${result.processed} documenti sincronizzati.`);
    }
  }, [refetch]);

  const handleSyncError = useCallback((error: string) => {
    // Disattiva refetch automatico in caso di errore
    setIsSyncActive(false);
    
    // Mostra messaggio di errore specifico
    if (error.includes("403") || error.includes("Forbidden")) {
      toast.error("Accesso negato. Verifica di essere loggato come amministratore.");
    } else if (error.includes("401") || error.includes("Non autenticato")) {
      toast.error("Sessione scaduta. Effettua nuovamente l'accesso.");
    } else {
      toast.error(error);
    }
  }, []);

  const { 
    progress: syncProgress, 
    startSync, 
    reset: resetSync,
  } = useSyncSSE({
    onProgress: handleSyncProgress,
    onCompleted: handleSyncCompleted,
    onError: handleSyncError,
    autoConnect: false,
  });

  // Attiva refetch automatico quando la sincronizzazione è in corso
  useEffect(() => {
    if (syncProgress.status === 'syncing' || syncProgress.status === 'pending') {
      setIsSyncActive(true);
    } else if (syncProgress.status === 'completed' || syncProgress.status === 'error' || syncProgress.status === 'idle') {
      // Ritarda la disattivazione per catturare gli ultimi documenti
      const timer = setTimeout(() => {
        setIsSyncActive(false);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [syncProgress.status]);

 
  
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
  
  // Handler per retry della sincronizzazione
  const handleRetrySync = useCallback(async () => {
    resetSync();
    await startSync();
  }, [resetSync, startSync]);

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

  const handleSync = useCallback(async () => {
    // Attiva immediatamente il refetch automatico
    setIsSyncActive(true);
    
    const result = await startSync();
    if (!result.success) {
      console.error("Sync failed to start:", result.error);
      setIsSyncActive(false);
    }
  }, [startSync]);

  /* -----------------------------------------------------------
   * RENDER
   * --------------------------------------------------------- */
  return (
    <div className="flex flex-col min-h-screen">
      {/* Animazione neve natalizia */}
      <ChristmasSnow />
      
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
          {/* Privacy Policy Link - Richiesto da Google Cloud Console */}
          <div className="mt-3 flex items-center justify-center">
          </div>
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
          isSyncing={syncProgress.status === 'syncing' || syncProgress.status === 'pending'}
          isAdmin={user?.role === "admin"}
          driveFolderId={driveFolderId || ""}
          onSyncComplete={refetch}
        />

        {/* Sync Progress Component - Real-time SSE updates */}
        <SyncProgress
          isSyncing={syncProgress.status === 'syncing' || syncProgress.status === 'pending'}
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
            onDelete={() => refetch()}
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

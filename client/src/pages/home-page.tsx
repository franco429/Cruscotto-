import { useState, useMemo, useEffect, useCallback } from "react";
import { useAuth } from "../hooks/use-auth";
import { useQueryWithErrorHandling } from "../hooks/use-query-with-error-handling";
import { useSyncSSE, SyncProgress as SyncProgressType } from "../hooks/use-sync-sse";
import { useDocumentsPaginated } from "../hooks/use-documents-paginated";
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
import ServerPagination from "../components/server-pagination";
import { Loader2 } from "lucide-react";
import { Button } from "../components/ui/button";
import { Link } from "wouter";
import { toast } from "react-hot-toast";
import { useQueryClient } from "@tanstack/react-query";

// Flag per abilitare paginazione server-side (ottimizzata per 50K+ documenti)
// Quando true: usa paginazione server-side (raccomandato per > 1000 documenti)
// Quando false: usa il sistema precedente (backward compatible)
const USE_SERVER_PAGINATION = true;

export default function HomePage() {
  const queryClient = useQueryClient();
  
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
   * QUERY – documenti con PAGINAZIONE SERVER-SIDE (50K+ ready)
   * Usa il nuovo hook ottimizzato per grandi volumi di dati
   * --------------------------------------------------------- */
  const {
    documents: paginatedDocuments,
    pagination,
    stats: serverStats,
    isLoading: isPaginatedLoading,
    isFetching: isPaginatedFetching,
    isError: isPaginatedError,
    currentFilters,
    goToPage,
    setStatusFilter: setServerStatusFilter,
    setSearchFilter: setServerSearchFilter,
    setPageLimit,
    refetch: refetchPaginated,
  } = useDocumentsPaginated({
    initialPage: 1,
    initialLimit: 25,
    initialStatus: 'all',
    enabled: USE_SERVER_PAGINATION,
  });

  /* -----------------------------------------------------------
   * QUERY – documenti con sistema LEGACY (backward compatible)
   * Carica tutti i documenti in una volta - usare solo per < 1000 docs
   * --------------------------------------------------------- */
  const {
    data: legacyDocuments,
    isLoading: isLegacyLoading,
    error: legacyError,
    refetch: refetchLegacy,
    isNetworkError,
    retry,
  } = useQueryWithErrorHandling<Document[]>({
    queryKey: ["/api/documents"],
    onError: (error) => {
      console.error(" Errore caricamento documenti:", error);
    },
    // Nessun refetch automatico - solo manuale dopo sync completata
    refetchInterval: false,
    refetchIntervalInBackground: false,
    enabled: !USE_SERVER_PAGINATION, // Disabilita se usiamo paginazione server
  });

  // Unifica i dati in base al sistema usato
  const documents = USE_SERVER_PAGINATION ? paginatedDocuments : legacyDocuments;
  const isLoading = USE_SERVER_PAGINATION ? isPaginatedLoading : isLegacyLoading;
  const error = USE_SERVER_PAGINATION ? (isPaginatedError ? new Error("Errore caricamento") : null) : legacyError;
  const refetch = USE_SERVER_PAGINATION ? refetchPaginated : refetchLegacy;

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
    // Attiva flag sincronizzazione (per mostrare la barra di progresso)
    setIsSyncActive(true);
    
    // NON fare refetch durante il progresso - troppi reload
    // I documenti verranno ricaricati solo al completamento
  }, []);

  const handleSyncCompleted = useCallback((result: SyncProgressType) => {
    console.log('🔄 [Sync Completed] Sync completata, attendo 2s per stabilizzazione database...');
    
    // Disattiva refetch automatico
    setIsSyncActive(false);
    
    // IMPORTANTE: Aspetta 2 secondi per dare tempo a MongoDB di completare
    // tutte le operazioni di scrittura prima di ricaricare i documenti
    setTimeout(() => {
      console.log('🔄 [Sync Completed] Invalidando cache documenti...');
      
      // Invalida tutte le query dei documenti per forzare il reload
      queryClient.invalidateQueries({ queryKey: ["/api/documents"] }).then(() => {
        console.log('✅ [Sync Completed] Cache invalidata, documenti ricaricati!');
      }).catch((error) => {
        console.error('❌ [Sync Completed] Errore durante invalidazione cache:', error);
      });
      
      // Invalida anche le stats dei documenti obsoleti
      queryClient.invalidateQueries({ queryKey: ["/api/documents/obsolete"] });
    }, 2000);
    
    // Mostra messaggio di completamento
    if (result.success) {
      toast.success(`Sincronizzazione completata! ${result.processed} documenti sincronizzati.`);
    } else if (result.failed && result.failed > 0) {
      toast.success(`Sincronizzazione completata con ${result.failed} errori. ${result.processed} documenti sincronizzati.`);
    }
  }, [queryClient]);

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

  // Sincronizza lo stato di sincronizzazione con il progresso
  useEffect(() => {
    if (syncProgress.status === 'syncing' || syncProgress.status === 'pending') {
      setIsSyncActive(true);
    } else {
      setIsSyncActive(false);
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
   * FILTER – Gestione filtri (server-side o client-side)
   * --------------------------------------------------------- */
  
  // Effetto per sincronizzare filtri con il server (quando USE_SERVER_PAGINATION)
  useEffect(() => {
    if (USE_SERVER_PAGINATION) {
      // Converti statusFilter al formato server
      const serverStatus = statusFilter === 'all' || statusFilter === 'active' || statusFilter === 'obsolete' 
        ? 'all' 
        : statusFilter as 'expired' | 'warning' | 'none';
      setServerStatusFilter(serverStatus);
    }
  }, [statusFilter, setServerStatusFilter]);

  useEffect(() => {
    if (USE_SERVER_PAGINATION) {
      // Debounce della ricerca per non sovraccaricare il server
      const timer = setTimeout(() => {
        setServerSearchFilter(searchTerm);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [searchTerm, setServerSearchFilter]);

  // Filtro documenti - server-side o client-side in base a USE_SERVER_PAGINATION
  const filteredDocuments = useMemo(() => {
    if (USE_SERVER_PAGINATION) {
      // Con paginazione server-side, i filtri sono già applicati dal server
      // Qui applichiamo solo filtri locali extra se necessario (es: obsolete)
      if (statusFilter === "obsolete") {
        return obsoleteDocumentsWithDynamicStatus.filter((doc) => {
          const matchesSearch = doc.title?.toLowerCase().includes(searchTerm.toLowerCase());
          return matchesSearch;
        });
      }
      // I documenti sono già filtrati dal server
      return documents || [];
    } else {
      // Sistema legacy: filtro client-side
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
    }
  }, [statusFilter, searchTerm, documents, documentsWithDynamicStatus, obsoleteDocumentsWithDynamicStatus]);

  /* -----------------------------------------------------------
   * STATS – dashboard (server-side per 50K+ documenti)
   * --------------------------------------------------------- */
  const stats = useMemo(() => {
    if (USE_SERVER_PAGINATION) {
      // Stats dal server - sempre accurate anche con 50K+ documenti
      const obsoleteDocsCount = obsoleteDocumentsWithDynamicStatus?.length || 0;
      return {
        total: serverStats.total,
        expiringSoon: serverStats.warning,
        expired: serverStats.expired,
        obsolete: obsoleteDocsCount,
      };
    } else {
      // Stats calcolate client-side (sistema legacy)
      const activeDocs = documentsWithDynamicStatus?.filter((d) => !d.isObsolete);
      const obsoleteDocsCount = obsoleteDocumentsWithDynamicStatus?.length || 0;
      return {
        total: activeDocs?.length || 0,
        expiringSoon: activeDocs?.filter((d) => d.alertStatus === "warning").length || 0,
        expired: activeDocs?.filter((d) => d.alertStatus === "expired").length || 0,
        obsolete: obsoleteDocsCount,
      };
    }
  }, [serverStats, documentsWithDynamicStatus, obsoleteDocumentsWithDynamicStatus]);

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
          <>
            <DocumentTable
              documents={filteredDocuments}
              onPreview={handlePreview}
              isAdmin={user?.role === "admin"}
              onDelete={() => refetch()}
              pageSize={USE_SERVER_PAGINATION ? 1000 : 10} // Con paginazione server, mostra tutti i doc della pagina
            />
            
            {/* Paginazione Server-Side (solo quando attiva) */}
            {USE_SERVER_PAGINATION && statusFilter !== "obsolete" && (
              <ServerPagination
                currentPage={pagination.page}
                totalPages={pagination.totalPages}
                total={pagination.total}
                limit={pagination.limit}
                hasNextPage={pagination.hasNextPage}
                hasPrevPage={pagination.hasPrevPage}
                onPageChange={goToPage}
                onLimitChange={setPageLimit}
                isLoading={isPaginatedFetching}
                showTotal={true}
                showPageSize={true}
                className="mt-4 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 px-4"
              />
            )}
          </>
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

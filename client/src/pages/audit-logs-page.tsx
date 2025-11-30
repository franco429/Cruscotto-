import { useState } from "react";
import { useAuth } from "../hooks/use-auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  LogDocument as Log,
  DocumentDocument as Document,
} from "../../../shared-types/schema";
import HeaderBar from "../components/header-bar";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "../components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table";
import { Input } from "../components/ui/input";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "../components/ui/pagination";
import { Loader2, ShieldAlert, Clock, Search, Trash2, BarChart3 } from "lucide-react";
import { format } from "date-fns";
import React from "react";
import { useToast } from "../hooks/use-toast";

// Utility: serializza details in modo sicuro
function detailsToString(details: any) {
  if (typeof details === "string") return details;
  if (!details) return "";
  if (typeof details === "object" && details.message) return details.message;
  return JSON.stringify(details, null, 2);
}

interface LogStatistics {
  totalLogs: number;
  oldestLogDate: string | null;
  newestLogDate: string | null;
  logsOlderThanRetention: number;
  retentionDays: number;
}

export default function AuditLogsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Retention policy: mostra solo gli ultimi 30 giorni
  const LOG_RETENTION_DAYS = 30;

  const { data: logs, isLoading: loadingLogs } = useQuery<Log[]>({
    queryKey: ["/api/logs"],
  });

  // Fai fetch anche di tutti i documenti (per matchare titolo)
  const { data: documents, isLoading: loadingDocs } = useQuery<Document[]>({
    queryKey: ["/api/documents"],
  });

  // Fetch statistiche log (solo per superadmin)
  const { data: logStats, isLoading: loadingStats } = useQuery<LogStatistics>({
    queryKey: ["/api/logs/statistics"],
    enabled: user?.role === "superadmin",
  });

  // Mutation per pulizia manuale
  const cleanupMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/logs/cleanup", { 
        method: "POST",
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error("Errore durante la pulizia dei log");
      }
      return response.json() as Promise<{ success: boolean; deletedCount: number; message: string }>;
    },
    onSuccess: (data) => {
      toast({
        title: "Pulizia completata",
        description: data.message,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/logs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/logs/statistics"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Errore",
        description: error.message || "Impossibile eseguire la pulizia dei log",
        variant: "destructive",
      });
    },
  });

  // Trova titolo documento per ID
  function getDocumentTitleById(legacyId: number | undefined | null): string {
    if (!legacyId || !documents) return "";
    const doc = documents.find((d) => d.legacyId === legacyId);
    return doc ? doc.title : "";
  }

  // Calcola la data limite per la retention (30 giorni fa)
  const retentionDate = new Date();
  retentionDate.setDate(retentionDate.getDate() - LOG_RETENTION_DAYS);

  // Filter logs: mostra solo gli ultimi 30 giorni + search query
  const filteredLogs = logs?.filter((log) => {
    // Filtro 1: Retention policy - solo ultimi 30 giorni
    const logDate = log.timestamp ? new Date(log.timestamp) : null;
    if (!logDate || logDate < retentionDate) {
      return false;
    }

    // Filtro 2: Search query
    if (searchQuery === "") return true;
    const searchLower = searchQuery.toLowerCase();

    return (
      log.action.toLowerCase().includes(searchLower) ||
      detailsToString(log.details).toLowerCase().includes(searchLower) ||
      (`${log.documentId}` || "").includes(searchLower) ||
      (`${log.userId}` || "").includes(searchLower) ||
      getDocumentTitleById(log.documentId).toLowerCase().includes(searchLower)
    );
  });

  // Pagination logic
  const itemsPerPage = 10;
  const totalItems = filteredLogs?.length || 0;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedLogs = filteredLogs?.slice(startIndex, endIndex);

  // Reset to first page when search changes
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  // CSV export helpers
  function csvEscape(value: unknown): string {
    const s = value === null || value === undefined ? "" : String(value);
    const escaped = s.replace(/"/g, '""');
    return `"${escaped}"`;
  }

  function exportFilteredLogsToCsv(): void {
    const rows = (filteredLogs ?? logs ?? []);
    if (!rows || rows.length === 0) return;

    const header = [
      "Timestamp",
      "Azione",
      "Utente",
      "DocumentoID",
      "TitoloDocumento",
      "Dettagli",
    ];

    const lines: string[] = [];
    lines.push(header.map(csvEscape).join(","));

    for (const log of rows) {
      const timestamp = log.timestamp
        ? format(new Date(log.timestamp), "dd/MM/yyyy HH:mm:ss")
        : "";
      const action = log.action ?? "";
      const userId =
        log.userId === null || log.userId === undefined
          ? "Sistema"
          : String(log.userId);
      const documentId =
        log.documentId !== null && log.documentId !== undefined
          ? String(log.documentId)
          : "";
      const documentTitle = getDocumentTitleById(log.documentId);
      const details = detailsToString(log.details);

      const row = [
        timestamp,
        action,
        userId,
        documentId,
        documentTitle,
        details,
      ].map((v) => csvEscape(v));
      lines.push(row.join(","));
    }

    const csvContent = "\ufeff" + lines.join("\r\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    const filename = `audit-logs_${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}.csv`;

    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  // Get action badge variant
  const getActionBadgeVariant = (action: string) => {
    switch (action.toLowerCase()) {
      case "create":
        return "default";
      case "update":
        return "default";
      case "document-updated":
        return "default";
      case "delete":
        return "destructive";
      case "document-deleted":
        return "destructive";
      case "user-deleted":
        return "destructive";
      case "restore":
        return "outline";
      case "login":
        return "secondary";
      case "user-role-change":
        return "secondary";
      case "client-updated":
        return "default";
      default:
        return "default";
    }
  };

  // Redirect non-admin users
  if (user?.role !== "admin" && user?.role !== "superadmin") {
    return (
      <div className="flex flex-col h-screen overflow-hidden">
        <HeaderBar user={user} />

        <main className="flex-1 overflow-y-auto bg-slate-50 dark:bg-slate-900 p-3 sm:p-4 md:p-6">
          <div className="max-w-5xl mx-auto">
            <Card className="border-destructive">
              <CardHeader className="pb-3 sm:pb-6">
                <CardTitle className="text-destructive flex items-center text-base sm:text-lg">
                  <ShieldAlert className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
                  Accesso negato
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm sm:text-base text-slate-700 dark:text-slate-300">
                  Non hai i permessi necessari per accedere a questa pagina.
                  Solo gli amministratori possono visualizzare i log di audit
                  del sistema.
                </p>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <HeaderBar user={user} />

      <main className="flex-1 overflow-y-auto bg-slate-50 dark:bg-slate-900 p-3 sm:p-4 md:p-6">
        <div className="max-w-7xl mx-auto">
          <div className="mb-4 sm:mb-6">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
              Log di Audit
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              Monitora tutte le azioni eseguite nel sistema per garantire la
              conformità e la sicurezza
            </p>
            <div className="mt-2 flex flex-col sm:flex-row sm:items-center gap-2 text-xs text-slate-600 dark:text-slate-400 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md px-3 py-2">
              <Clock className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0" />
              <span className="leading-relaxed">
                <strong>Retention Policy:</strong> I log vengono conservati per {LOG_RETENTION_DAYS} giorni. 
                I log più vecchi vengono automaticamente eliminati per ottimizzare le performance del sistema.
              </span>
            </div>
          </div>

          {/* Log Statistics (Superadmin only) */}
          {user?.role === "superadmin" && logStats && (
            <Card className="mb-4 sm:mb-6">
              <CardHeader className="pb-3 sm:pb-6">
                <CardTitle className="flex items-center text-base sm:text-lg">
                  <BarChart3 className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
                  Statistiche Log
                </CardTitle>
                <CardDescription className="text-xs sm:text-sm">
                  Panoramica dello stato dei log di audit nel database
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                  <div className="bg-slate-50 dark:bg-slate-800 p-3 sm:p-4 rounded-lg">
                    <div className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                      Log Totali
                    </div>
                    <div className="text-lg sm:text-2xl font-bold text-slate-900 dark:text-white">
                      {logStats.totalLogs.toLocaleString()}
                    </div>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-800 p-3 sm:p-4 rounded-lg">
                    <div className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                      Log Obsoleti
                    </div>
                    <div className="text-lg sm:text-2xl font-bold text-orange-600 dark:text-orange-400">
                      {logStats.logsOlderThanRetention.toLocaleString()}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 hidden sm:block">
                      {logStats.logsOlderThanRetention > 0 
                        ? `Verranno eliminati alla prossima pulizia` 
                        : "Nessun log da eliminare"}
                    </div>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-800 p-3 sm:p-4 rounded-lg">
                    <div className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                      Log più Vecchio
                    </div>
                    <div className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-white">
                      {logStats.oldestLogDate
                        ? format(new Date(logStats.oldestLogDate), "dd/MM/yyyy")
                        : "N/A"}
                    </div>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-800 p-3 sm:p-4 rounded-lg">
                    <div className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                      Log più Recente
                    </div>
                    <div className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-white">
                      {logStats.newestLogDate
                        ? format(new Date(logStats.newestLogDate), "dd/MM/yyyy")
                        : "N/A"}
                    </div>
                  </div>
                </div>
                {logStats.logsOlderThanRetention > 0 && (
                  <div className="mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-md px-3 sm:px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Trash2 className="h-4 w-4 text-orange-600 dark:text-orange-400 shrink-0" />
                      <span className="text-xs sm:text-sm text-orange-800 dark:text-orange-200">
                        Ci sono {logStats.logsOlderThanRetention} log obsoleti da eliminare
                      </span>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => cleanupMutation.mutate()}
                      disabled={cleanupMutation.isPending}
                      className="border-orange-300 dark:border-orange-700 hover:bg-orange-100 dark:hover:bg-orange-900/40 w-full sm:w-auto"
                    >
                      {cleanupMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Pulizia...
                        </>
                      ) : (
                        <>
                          <Trash2 className="mr-2 h-4 w-4" />
                          Pulisci Ora
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Search */}
          <div className="mb-4 sm:mb-6">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                type="search"
                placeholder="Cerca nei log..."
                className="pl-9 w-full md:max-w-md text-sm"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          {/* Logs table */}
          <Card>
            <CardHeader className="pb-3 sm:pb-6">
              <CardTitle className="flex items-center text-base sm:text-lg">
                <Clock className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
                Registro Attività
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loadingLogs || loadingDocs ? (
                <div className="flex justify-center items-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : filteredLogs && filteredLogs.length > 0 ? (
                <>
                  {/* Desktop Table View - Hidden on mobile */}
                  <div className="hidden lg:block overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[150px]">Timestamp</TableHead>
                          <TableHead className="w-[120px]">Azione</TableHead>
                          <TableHead className="w-[150px]">Utente</TableHead>
                          <TableHead>Documento</TableHead>
                          <TableHead className="w-[250px]">Dettagli</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {paginatedLogs && paginatedLogs.map((log) => (
                          <TableRow key={log.legacyId}>
                            <TableCell className="font-mono text-xs">
                              {log.timestamp
                                ? format(
                                    new Date(log.timestamp),
                                    "dd/MM/yyyy HH:mm:ss"
                                  )
                                : "N/A"}
                            </TableCell>
                            <TableCell>
                              <Badge variant={getActionBadgeVariant(log.action)} className="text-xs">
                                {log.action}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-sm">{log.userId || "Sistema"}</TableCell>
                            <TableCell>
                              {log.documentId !== null &&
                              log.documentId !== undefined &&
                              getDocumentTitleById(log.documentId) ? (
                                <div className="flex flex-col">
                                  <span className="font-mono text-xs">
                                    {log.documentId}
                                  </span>
                                  <span className="text-xs text-slate-500">
                                    {getDocumentTitleById(log.documentId)}
                                  </span>
                                </div>
                              ) : (
                                <span className="text-slate-500">N/A</span>
                              )}
                            </TableCell>
                            <TableCell className="text-sm">
                              {typeof log.details === "string" ? (
                                <span className="text-xs">{log.details}</span>
                              ) : log.details ? (
                                <pre className="whitespace-pre-wrap text-xs">
                                  {JSON.stringify(log.details, null, 2)}
                                </pre>
                              ) : (
                                <span className="text-xs text-slate-500">Nessun dettaglio</span>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Mobile/Tablet Card View - Visible only on mobile/tablet */}
                  <div className="lg:hidden space-y-3">
                    {paginatedLogs && paginatedLogs.map((log) => (
                      <div 
                        key={log.legacyId} 
                        className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-3 sm:p-4 space-y-2"
                      >
                        {/* Timestamp e Azione */}
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <Badge variant={getActionBadgeVariant(log.action)} className="text-xs">
                            {log.action}
                          </Badge>
                          <span className="font-mono text-xs text-slate-500 dark:text-slate-400">
                            {log.timestamp
                              ? format(new Date(log.timestamp), "dd/MM/yyyy HH:mm")
                              : "N/A"}
                          </span>
                        </div>

                        {/* Utente */}
                        <div className="flex items-start gap-2">
                          <span className="text-xs font-medium text-slate-600 dark:text-slate-400 min-w-[60px]">
                            Utente:
                          </span>
                          <span className="text-xs text-slate-900 dark:text-white">
                            {log.userId || "Sistema"}
                          </span>
                        </div>

                        {/* Documento */}
                        {log.documentId !== null && log.documentId !== undefined && (
                          <div className="flex items-start gap-2">
                            <span className="text-xs font-medium text-slate-600 dark:text-slate-400 min-w-[60px]">
                              Doc:
                            </span>
                            <div className="flex flex-col flex-1">
                              <span className="font-mono text-xs text-slate-900 dark:text-white">
                                {log.documentId}
                              </span>
                              {getDocumentTitleById(log.documentId) && (
                                <span className="text-xs text-slate-500 dark:text-slate-400 break-words">
                                  {getDocumentTitleById(log.documentId)}
                                </span>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Dettagli */}
                        {(typeof log.details === "string" ? log.details : log.details) && (
                          <div className="flex items-start gap-2 pt-2 border-t border-slate-200 dark:border-slate-700">
                            <span className="text-xs font-medium text-slate-600 dark:text-slate-400 min-w-[60px]">
                              Dettagli:
                            </span>
                            <div className="text-xs text-slate-700 dark:text-slate-300 flex-1 break-words">
                              {typeof log.details === "string" ? (
                                log.details
                              ) : (
                                <pre className="whitespace-pre-wrap text-xs">
                                  {JSON.stringify(log.details, null, 2)}
                                </pre>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                  
                  {/* Pagination info */}
                  {totalPages > 1 && (
                    <div className="mt-4 text-center text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                      Pag. {currentPage} di {totalPages} ({startIndex + 1}-{Math.min(endIndex, totalItems)} di {totalItems})
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-10">
                  <Clock className="h-8 w-8 mx-auto text-slate-300 dark:text-slate-600 mb-3" />
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Nessun log di audit trovato
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Export button */}
          {logs && logs.length > 0 && (
            <div className="mt-4 sm:mt-6 flex justify-center sm:justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={exportFilteredLogsToCsv}
                disabled={loadingLogs || loadingDocs}
                className="w-full sm:w-auto text-xs sm:text-sm"
              >
                Esporta log (.csv)
              </Button>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-4 sm:mt-6 flex justify-center">
              <Pagination>
                <PaginationContent className="gap-1">
                  <PaginationItem>
                    <PaginationPrevious 
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        if (currentPage > 1) setCurrentPage(currentPage - 1);
                      }}
                      className={`text-xs sm:text-sm ${currentPage === 1 ? "pointer-events-none opacity-50" : ""}`}
                    />
                  </PaginationItem>
                  
                  {/* Desktop: mostra tutti i numeri */}
                  <div className="hidden md:flex gap-1">
                    {Array.from({ length: totalPages }, (_, index) => {
                      const pageNumber = index + 1;
                      return (
                        <PaginationItem key={pageNumber}>
                          <PaginationLink
                            href="#"
                            onClick={(e) => {
                              e.preventDefault();
                              setCurrentPage(pageNumber);
                            }}
                            isActive={currentPage === pageNumber}
                            className="text-xs sm:text-sm"
                          >
                            {pageNumber}
                          </PaginationLink>
                        </PaginationItem>
                      );
                    })}
                  </div>

                  {/* Mobile: mostra solo pagina corrente e alcune adiacenti */}
                  <div className="flex md:hidden gap-1">
                    {Array.from({ length: totalPages }, (_, index) => {
                      const pageNumber = index + 1;
                      // Mostra solo la pagina corrente e quelle vicine
                      const showPage = 
                        pageNumber === currentPage ||
                        pageNumber === currentPage - 1 ||
                        pageNumber === currentPage + 1 ||
                        pageNumber === 1 ||
                        pageNumber === totalPages;

                      // Aggiungi ellissi se necessario
                      if (!showPage) {
                        if (pageNumber === currentPage - 2 || pageNumber === currentPage + 2) {
                          return <span key={pageNumber} className="px-2 text-slate-400">...</span>;
                        }
                        return null;
                      }

                      return (
                        <PaginationItem key={pageNumber}>
                          <PaginationLink
                            href="#"
                            onClick={(e) => {
                              e.preventDefault();
                              setCurrentPage(pageNumber);
                            }}
                            isActive={currentPage === pageNumber}
                            className="text-xs w-8 h-8"
                          >
                            {pageNumber}
                          </PaginationLink>
                        </PaginationItem>
                      );
                    })}
                  </div>
                  
                  <PaginationItem>
                    <PaginationNext 
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        if (currentPage < totalPages) setCurrentPage(currentPage + 1);
                      }}
                      className={`text-xs sm:text-sm ${currentPage === totalPages ? "pointer-events-none opacity-50" : ""}`}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

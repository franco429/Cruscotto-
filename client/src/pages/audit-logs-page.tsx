import { useState } from "react";
import { useAuth } from "../hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
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
import { Loader2, ShieldAlert, Clock, Search } from "lucide-react";
import { format } from "date-fns";
import React from "react";

// Utility: serializza details in modo sicuro
function detailsToString(details: any) {
  if (typeof details === "string") return details;
  if (!details) return "";
  if (typeof details === "object" && details.message) return details.message;
  return JSON.stringify(details, null, 2);
}

export default function AuditLogsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const { user } = useAuth();

  const { data: logs, isLoading: loadingLogs } = useQuery<Log[]>({
    queryKey: ["/api/logs"],
  });

  // Fai fetch anche di tutti i documenti (per matchare titolo)
  const { data: documents, isLoading: loadingDocs } = useQuery<Document[]>({
    queryKey: ["/api/documents"],
  });

  // Trova titolo documento per ID
  function getDocumentTitleById(legacyId: number | undefined | null): string {
    if (!legacyId || !documents) return "";
    const doc = documents.find((d) => d.legacyId === legacyId);
    return doc ? doc.title : "";
  }

  // Filter logs based on search query
  const filteredLogs = logs?.filter((log) => {
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

        <main className="flex-1 overflow-y-auto bg-slate-50 dark:bg-slate-900 p-4 md:p-6">
          <div className="max-w-5xl mx-auto">
            <Card className="border-destructive">
              <CardHeader>
                <CardTitle className="text-destructive flex items-center">
                  <ShieldAlert className="mr-2 h-5 w-5" />
                  Accesso negato
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-slate-700 dark:text-slate-300">
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

      <main className="flex-1 overflow-y-auto bg-slate-50 dark:bg-slate-900 p-4 md:p-6">
        <div className="max-w-7xl mx-auto">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
              Log di Audit
            </h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Monitora tutte le azioni eseguite nel sistema per garantire la
              conformità e la sicurezza
            </p>
          </div>

          {/* Search */}
          <div className="mb-6">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                type="search"
                placeholder="Cerca nei log di audit..."
                className="pl-9 w-full md:max-w-md"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          {/* Logs table */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center">
                  <Clock className="mr-2 h-5 w-5" />
                  Registro Attività
                </CardTitle>
                <div className="text-sm text-slate-500 dark:text-slate-400">
                  {logs?.length || 0} attività registrate
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loadingLogs || loadingDocs ? (
                <div className="flex justify-center items-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : filteredLogs && filteredLogs.length > 0 ? (
                <>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[150px]">Timestamp</TableHead>
                          <TableHead className="w-[100px]">Azione</TableHead>
                          <TableHead className="w-[200px]">Utente</TableHead>
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
                              <Badge variant={getActionBadgeVariant(log.action)}>
                                {log.action}
                              </Badge>
                            </TableCell>
                            <TableCell>{log.userId || "Sistema"}</TableCell>
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
                                log.details
                              ) : log.details ? (
                                <pre className="whitespace-pre-wrap text-xs">
                                  {JSON.stringify(log.details, null, 2)}
                                </pre>
                              ) : (
                                "Nessun dettaglio"
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  
                  {/* Pagination info */}
                  {totalPages > 1 && (
                    <div className="mt-4 text-center text-sm text-slate-500 dark:text-slate-400">
                      Mostrando {startIndex + 1}-{Math.min(endIndex, totalItems)} di {totalItems} risultati
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-10">
                  <Clock className="h-8 w-8 mx-auto text-slate-300 dark:text-slate-600 mb-3" />
                  <p className="text-slate-500 dark:text-slate-400">
                    Nessun log di audit trovato
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Export button */}
          {logs && logs.length > 0 && (
            <div className="mt-6 flex justify-end">
              <Button
                variant="outline"
                onClick={exportFilteredLogsToCsv}
                disabled={loadingLogs || loadingDocs}
              >
                Esporta log (.csv)
              </Button>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-6 flex justify-center">
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious 
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        if (currentPage > 1) setCurrentPage(currentPage - 1);
                      }}
                      className={currentPage === 1 ? "pointer-events-none opacity-50" : ""}
                    />
                  </PaginationItem>
                  
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
                        >
                          {pageNumber}
                        </PaginationLink>
                      </PaginationItem>
                    );
                  })}
                  
                  <PaginationItem>
                    <PaginationNext 
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        if (currentPage < totalPages) setCurrentPage(currentPage + 1);
                      }}
                      className={currentPage === totalPages ? "pointer-events-none opacity-50" : ""}
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

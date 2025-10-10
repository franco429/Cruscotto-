import { useState } from "react";
import { DocumentDocument as Document } from "../../../shared-types/schema";
import { Button } from "../components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table";
import { cn } from "../lib/utils";
import {
  Eye,
  Edit,
  History,
  File,
  FileText,
  FileSpreadsheet,
  FileImage,
  AlertTriangle,
  AlertCircle,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Trash2, // aggiunto
} from "lucide-react";
import { format } from "date-fns";
import { useMutation } from "@tanstack/react-query";
import { useToast } from "../hooks/use-toast";
import { ToastAction } from "../components/ui/toast";
import { apiRequest } from "../lib/queryClient";
import { openLocalDocument } from "../lib/local-opener";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../components/ui/alert-dialog";

interface DocumentTableProps {
  documents: Document[];
  onPreview: (document: Document) => void;
  isAdmin: boolean;
  pageSize?: number;
  onDelete?: (deletedId: number) => void; 
}

export default function DocumentTable({
  documents,
  onPreview,
  isAdmin,
  pageSize = 10,
  onDelete,
}: DocumentTableProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [documentToDelete, setDocumentToDelete] = useState<Document | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  
  // Calculate total pages
  const totalPages = Math.ceil(documents.length / pageSize);

  const currentDocuments = documents.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const goToNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const goToPreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  // Calculate display range for showing results
  const startItem = documents.length > 0 ? (currentPage - 1) * pageSize + 1 : 0;
  const endItem = Math.min(startItem + pageSize - 1, documents.length);
  // Get icon based on file type
  const getFileIcon = (fileType: string) => {
    switch (fileType.toLowerCase()) {
      case "pdf":
        return <File className="h-4 w-4 text-slate-400" />;
      case "docx":
      case "doc":
        return <FileText className="h-4 w-4 text-slate-400" />;
      case "xlsx":
      case "xls":
      case "xlsm":
        return <FileSpreadsheet className="h-4 w-4 text-slate-400" />;
      case "jpg":
      case "jpeg":
      case "png":
        return <FileImage className="h-4 w-4 text-slate-400" />;
      default:
        return <File className="h-4 w-4 text-slate-400" />;
    }
  };

  // Get status badge based on document status
  const getStatusBadge = (status: string) => {
    if (status === "expired") {
      return (
        <span className="inline-flex items-center px-1.5 xs:px-2 sm:px-2.5 py-0.5 rounded-full text-[10px] xs:text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300">
          <AlertCircle className="h-2.5 w-2.5 xs:h-3 xs:w-3 mr-0.5 xs:mr-1" />
          <span className="hidden xs:inline">Scaduto</span>
          <span className="xs:hidden">!</span>
        </span>
      );
    } else if (status === "warning") {
      return (
        <span className="inline-flex items-center px-1.5 xs:px-2 sm:px-2.5 py-0.5 rounded-full text-[10px] xs:text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300">
          <AlertTriangle className="h-2.5 w-2.5 xs:h-3 xs:w-3 mr-0.5 xs:mr-1" />
          <span className="hidden xs:inline">In scadenza</span>
          <span className="xs:hidden">Avviso</span>
        </span>
      );
    } else {
      return (
        <span className="inline-flex items-center px-1.5 xs:px-2 sm:px-2.5 py-0.5 rounded-full text-[10px] xs:text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">
          <CheckCircle className="h-2.5 w-2.5 xs:h-3 xs:w-3 mr-0.5 xs:mr-1" />
          <span className="hidden xs:inline">Valido</span>
          <span className="xs:hidden">OK</span>
        </span>
      );
    }
  };

  const { toast } = useToast();
  const deleteMutation = useMutation({
    mutationFn: async (legacyId: number) => {
      await apiRequest("DELETE", `/api/documents/${legacyId}`);
    },
    onSuccess: (_data, legacyId) => {
      toast({
        title: "Documento eliminato",
        description: "Il documento è stato eliminato con successo.",
      });
      if (onDelete) onDelete(legacyId);
      setShowDeleteDialog(false);
      setDocumentToDelete(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Errore eliminazione",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleDeleteClick = (document: Document) => {
    setDocumentToDelete(document);
    setShowDeleteDialog(true);
  };

  const confirmDelete = () => {
    if (documentToDelete) {
      deleteMutation.mutate(documentToDelete.legacyId);
    }
  };

  const cancelDelete = () => {
    setShowDeleteDialog(false);
    setDocumentToDelete(null);
  };

  const handlePreview = async (document: Document) => {
    if (document.driveUrl) {
      // Documento remoto - usa preview esistente
      setSelectedDocument(document);
      setShowPreview(true);
    } else {
      // Documento locale - prova ad aprirlo con Local Opener
      try {
        const { openLocalDocument } = await import("../lib/local-opener");
        const result = await openLocalDocument(document);
        
        if (result.ok) {
          toast({
            title: "Documento aperto",
            description: "Il documento è stato aperto con successo nell'applicazione locale.",
          });
        } else {
          // Fallback: offri download
          toast({
            title: " Impossibile aprire localmente",
            description: result.message || "Il documento non può essere aperto localmente. Vuoi scaricarlo?",
            action: (
              <ToastAction altText="Scarica documento" onClick={() => handleDownload(document)}>
                Scarica
              </ToastAction>
            ),
          });
        }
      } catch (error) {
        // Errore nel caricamento di Local Opener - fallback a download
        toast({
          title: " Errore apertura locale",
          description: "Impossibile aprire il documento localmente. Vuoi scaricarlo?",
          action: (
            <ToastAction altText="Scarica documento" onClick={() => handleDownload(document)}>
              Scarica
            </ToastAction>
          ),
        });
      }
    }
  };

  return (
    <>
      <div className="bg-white dark:bg-slate-800 shadow overflow-hidden rounded-md">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16 sm:w-24 hidden xs:table-cell">
                  Riferimento
                </TableHead>
                <TableHead>Documento</TableHead>
                <TableHead className="hidden sm:table-cell">Revisione</TableHead>
                <TableHead>Stato</TableHead>
                <TableHead className="hidden md:table-cell">Aggiornato</TableHead>
                <TableHead className="text-right">Azioni</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {documents.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-4 sm:py-6">
                    <p className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm">
                      Nessun documento trovato
                    </p>
                  </TableCell>
                </TableRow>
              ) : (
                currentDocuments.map((document) => (
                  <TableRow
                    key={document.legacyId}
                    className="hover:bg-slate-50 dark:hover:bg-slate-700"
                  >
                    <TableCell className="font-mono text-xs sm:text-sm text-slate-900 dark:text-white hidden xs:table-cell">
                      <div className="flex flex-col">
                        <span className="truncate max-w-[200px]" title={document.path}>
                          {document.path}
                        </span>
                        {document.path && document.path.includes('/') && (
                          <span className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-[200px]">
                            📁 {document.path.split('/').slice(0, -1).join(' / ')}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      <div className="flex items-center">
                        {getFileIcon(document.fileType)}
                        <span
                          className="ml-2 text-primary-600 dark:text-primary-400 text-xs sm:text-sm truncate max-w-[120px] xs:max-w-[160px] sm:max-w-full"
                        >
                          {document.title}
                        </span>
                        <span className="ml-2 sm:hidden text-xs text-slate-500">
                          {document.revision}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-slate-500 dark:text-slate-400 hidden sm:table-cell text-xs sm:text-sm">
                      {document.revision}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-1">
                        {getStatusBadge(document.alertStatus || "valid")}
                      </div>
                    </TableCell>
                    <TableCell className="text-slate-500 dark:text-slate-400 hidden md:table-cell text-xs sm:text-sm">
                      {document.updatedAt
                        ? format(
                            new Date(document.updatedAt as unknown as string),
                            "yyyy-MM-dd"
                          )
                        : "N/A"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end space-x-1 sm:space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={async () => {
                            // Per documenti locali, prova apertura diretta via servizio locale
                            if (!document.driveUrl) {
                              const res = await openLocalDocument(document);
                              if (!res.ok) {
                                // Se l'apertura locale fallisce, offri il download come fallback
                                toast({
                                  title: "Servizio locale non disponibile",
                                  description: "Il servizio di apertura locale non è attivo. Vuoi scaricare il file invece?",
                                  action: (
                                    <ToastAction
                                      altText="Scarica file"
                                      onClick={() => {
                                        // Scarica il file dal backend
                                        window.open(`/api/documents/${document.legacyId}/download`, '_blank');
                                      }}
                                    >
                                      Scarica
                                    </ToastAction>
                                  ),
                                });
                              }
                              return;
                            }
                            // Per documenti remoti (Drive), mantieni anteprima browser
                            onPreview(document);
                          }}
                          title="Visualizza"
                          className="h-7 w-7 sm:h-8 sm:w-8 p-0"
                        >
                          <Eye className="h-3 w-3 sm:h-4 sm:w-4" />
                          <span className="sr-only">Visualizza</span>
                        </Button>
                        {isAdmin && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteClick(document)}
                            title="Elimina"
                            className="h-7 w-7 sm:h-8 sm:w-8 p-0"
                            disabled={deleteMutation.isPending}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                            <span className="sr-only">Elimina</span>
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        {documents.length > 0 && (
          <div className="bg-white dark:bg-slate-800 px-3 sm:px-4 md:px-6 py-2 sm:py-3 flex items-center justify-between border-t border-slate-200 dark:border-slate-700">
            <div className="hidden xs:block">
              <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300">
                <span className="hidden sm:inline">Visualizzazione di </span>
                <span className="font-medium">{startItem}</span>
                <span className="hidden sm:inline"> a </span>
                <span className="sm:hidden">-</span>
                <span className="font-medium">{endItem}</span>
                <span className="hidden sm:inline"> di </span>
                <span className="font-medium hidden sm:inline">
                  {documents.length}
                </span>
                <span className="hidden sm:inline"> risultati</span>
              </p>
            </div>
            <div className="flex-1 flex justify-between xs:justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={goToPreviousPage}
                disabled={currentPage <= 1}
                className="text-xs sm:text-sm h-7 sm:h-9 px-2 sm:px-3 flex items-center"
              >
                <ChevronLeft className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                Precedente
              </Button>

              {totalPages > 1 && (
                <span className="mx-2 text-xs sm:text-sm text-slate-500 dark:text-slate-400 self-center">
                  {currentPage} / {totalPages}
                </span>
              )}

              <Button
                variant="outline"
                size="sm"
                onClick={goToNextPage}
                disabled={currentPage >= totalPages}
                className="ml-2 sm:ml-3 text-xs sm:text-sm h-7 sm:h-9 px-2 sm:px-3 flex items-center"
              >
                Successivo
                <ChevronRight className="h-3 w-3 sm:h-4 sm:w-4 ml-1" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Alert Dialog per conferma eliminazione */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-destructive" />
              Conferma eliminazione
            </AlertDialogTitle>
            <AlertDialogDescription className="text-left">
              Sei sicuro di voler eliminare definitivamente il documento{" "}
              <span className="font-semibold text-foreground">
                "{documentToDelete?.title}"
              </span>
              ?
              <br />
              <span className="text-sm text-muted-foreground">
                Questa azione non può essere annullata. Il documento verrà eliminato permanentemente e non potrà essere recuperato.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={cancelDelete}>
              Annulla
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={deleteMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  Eliminazione...
                </>
              ) : (
                "Elimina documento"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

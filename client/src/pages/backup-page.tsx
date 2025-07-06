import { useState, useEffect } from "react";
import { Button } from "../components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { Alert, AlertDescription } from "../components/ui/alert";
import { Badge } from "../components/ui/badge";
import { Separator } from "../components/ui/separator";
import {
  Download,
  Upload,
  Trash2,
  RefreshCw,
  Database,
  Clock,
  FileText,
  AlertTriangle,
  CheckCircle,
  XCircle,
  User,
  Building,
} from "lucide-react";
import { toast } from "react-hot-toast";
import { useAuth } from "../hooks/use-auth";
import { apiRequest } from "../lib/queryClient";
import HeaderBar from "@/components/header-bar";
import Footer from "@/components/footer";

interface BackupMetadata {
  createdBy: {
    userId: number;
    userEmail: string;
    userRole: string;
  };
  clientId: number | null;
  backupType: "complete" | "client_specific" | "unknown";
  metadata: {
    totalUsers: number;
    totalDocuments: number;
    totalLogs: number;
    totalClients: number;
    totalCompanyCodes: number;
  };
  timestamp: string;
}

interface BackupFile {
  filename: string;
  path: string;
  size: number;
  createdAt: Date;
  modifiedAt: Date;
  metadata: BackupMetadata | null;
  isActive: boolean; // Added isActive property
}

export default function BackupPage() {
  const { user } = useAuth();
  const [backups, setBackups] = useState<BackupFile[]>([]);
  const [isCreatingBackup, setIsCreatingBackup] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [selectedBackup, setSelectedBackup] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  // Verifica se l'utente ha i permessi
  const isAdmin = user?.role === "admin" || user?.role === "superadmin";
  const isSuperAdmin = user?.role === "superadmin";

  useEffect(() => {
    if (isAdmin) {
      loadBackups();
    }
  }, [isAdmin]);

  const loadBackups = async () => {
    try {
      const response = await apiRequest("GET", "/api/admin/backups");

      if (response.ok) {
        const data = await response.json();
        setBackups(data);
      } else {
        toast.error("Errore nel caricamento dei backup");
      }
    } catch (error) {
      toast.error("Errore di connessione");
    } finally {
      setIsLoading(false);
    }
  };

  const createBackup = async () => {
    setIsCreatingBackup(true);
    try {
      // Per admin, il clientId viene automaticamente impostato dal server
      const response = await apiRequest("POST", "/api/admin/backup");

      const result = await response.json();

      if (result.success) {
        toast.success("Backup creato con successo!");
        await loadBackups(); // Ricarica la lista
      } else {
        toast.error(`Errore: ${result.message || result.error}`);
      }
    } catch (error) {
      toast.error("Errore durante la creazione del backup");
    } finally {
      setIsCreatingBackup(false);
    }
  };

  const restoreBackup = async (backupPath: string) => {
    if (
      !confirm(
        "⚠️ ATTENZIONE: Il ripristino sovrascriverà tutti i dati attuali. Continuare?"
      )
    ) {
      return;
    }

    setIsRestoring(true);
    try {
      const response = await apiRequest("POST", "/api/admin/restore", {
        backupPath,
      });

      const result = await response.json();

      if (result.success) {
        toast.success("Database ripristinato con successo!");
        setSelectedBackup(null);
      } else {
        toast.error(`Errore: ${result.message || result.error}`);
      }
    } catch (error) {
      toast.error("Errore durante il ripristino");
    } finally {
      setIsRestoring(false);
    }
  };

  const downloadBackup = async (filename: string) => {
    try {
      const response = await apiRequest("GET", `/api/admin/backup/${filename}`);

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        toast.success("Download completato");
      } else {
        toast.error("Errore nel download del backup");
      }
    } catch (error) {
      toast.error("Errore durante il download");
    }
  };

  const deleteBackup = async (filename: string) => {
    if (
      !confirm(
        "⚠️ ATTENZIONE: Questa azione eliminerà definitivamente il backup. Continuare?"
      )
    ) {
      return;
    }

    setIsDeleting(filename);
    try {
      const response = await apiRequest(
        "DELETE",
        `/api/admin/backup/${filename}`
      );

      const result = await response.json();

      if (result.success) {
        toast.success("Backup eliminato con successo!");
        await loadBackups(); // Ricarica la lista
      } else {
        toast.error(`Errore: ${result.message || result.error}`);
      }
    } catch (error) {
      toast.error("Errore durante l'eliminazione");
    } finally {
      setIsDeleting(null);
    }
  };

  const syncBackups = async () => {
    setIsSyncing(true);
    try {
      const response = await apiRequest("POST", "/api/admin/backups/sync");

      const result = await response.json();

      if (result.success) {
        toast.success(
          `Sincronizzazione completata: ${result.syncedCount} backup sincronizzati`
        );
        await loadBackups(); // Ricarica la lista
      } else {
        toast.error(`Errore: ${result.message || result.error}`);
      }
    } catch (error) {
      toast.error("Errore durante la sincronizzazione");
    } finally {
      setIsSyncing(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat("it-IT", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(date));
  };

  const getBackupTypeLabel = (backupType: string) => {
    switch (backupType) {
      case "complete":
        return { label: "Completo", color: "bg-blue-100 text-blue-800" };
      case "client_specific":
        return {
          label: "Specifico Client",
          color: "bg-green-100 text-green-800",
        };
      default:
        return { label: "Sconosciuto", color: "bg-gray-100 text-gray-800" };
    }
  };

  if (!isAdmin) {
    return (
      <div className="container mx-auto p-6">
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Accesso negato. Solo gli amministratori possono accedere alla
            gestione backup.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      <HeaderBar user={user} />

      <div className="container mx-auto p-2 sm:p-6 space-y-6 w-full max-w-4xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">Gestione Backup</h1>
            <p className="text-muted-foreground text-sm sm:text-base">
              {isSuperAdmin
                ? "Crea, gestisci e ripristina i backup del database (completi o specifici per client)"
                : "Crea, gestisci e ripristina i backup del tuo client"}
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            {isSuperAdmin && (
              <Button
                onClick={syncBackups}
                disabled={isSyncing}
                variant="outline"
                className="flex items-center gap-2"
              >
                {isSyncing ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    Sincronizzazione...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4" />
                    Sincronizza
                  </>
                )}
              </Button>
            )}
            <Button
              onClick={createBackup}
              disabled={isCreatingBackup}
              className="flex items-center gap-2"
            >
              {isCreatingBackup ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Creazione in corso...
                </>
              ) : (
                <>
                  <Database className="h-4 w-4" />
                  Crea Backup
                </>
              )}
            </Button>
          </div>
        </div>

        <Separator />

        {/* Statistiche */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Totale Backup
              </CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{backups.length}</div>
              <p className="text-xs text-muted-foreground">
                {isSuperAdmin ? "Tutti i backup" : "Backup del tuo client"}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Ultimo Backup
              </CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {backups.length > 0
                  ? formatDate(backups[0].modifiedAt)
                  : "Nessuno"}
              </div>
              <p className="text-xs text-muted-foreground">
                {backups.length > 0 &&
                backups[0].metadata?.backupType === "complete"
                  ? "Backup completo"
                  : "Backup client"}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Dimensione Totale
              </CardTitle>
              <Database className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatFileSize(
                  backups.reduce((acc, backup) => acc + backup.size, 0)
                )}
              </div>
              <p className="text-xs text-muted-foreground">Spazio occupato</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Stato</CardTitle>
              {backups.length > 0 ? (
                <CheckCircle className="h-4 w-4 text-green-600" />
              ) : (
                <XCircle className="h-4 w-4 text-red-600" />
              )}
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {backups.length > 0 ? "Attivo" : "Nessun backup"}
              </div>
              <p className="text-xs text-muted-foreground">Sistema backup</p>
            </CardContent>
          </Card>
        </div>

        <Separator />

        {/* Lista Backup */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Backup Disponibili</h2>
            <Button
              variant="outline"
              size="sm"
              onClick={loadBackups}
              disabled={isLoading}
            >
              <RefreshCw
                className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`}
              />
              <span className="ml-2">Aggiorna</span>
            </Button>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-6 w-6 animate-spin" />
              <span className="ml-2">Caricamento backup...</span>
            </div>
          ) : backups.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-8">
                <Database className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground text-center">
                  Nessun backup disponibile.
                  <br />
                  Crea il tuo primo backup per iniziare.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {backups.map((backup) => {
                const backupType = getBackupTypeLabel(
                  backup.metadata?.backupType || "unknown"
                );
                const isOwnBackup =
                  backup.metadata?.createdBy?.userId === user?.legacyId;

                return (
                  <Card
                    key={backup.filename}
                    className="hover:shadow-md transition-shadow"
                  >
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <CardTitle className="text-lg">
                              {backup.filename}
                            </CardTitle>
                            <Badge className={backupType.color}>
                              {backupType.label}
                            </Badge>
                            {isOwnBackup && (
                              <Badge className="bg-purple-100 text-purple-800">
                                Mio Backup
                              </Badge>
                            )}
                            {!backup.isActive && (
                              <Badge className="bg-red-100 text-red-800">
                                File Mancante
                              </Badge>
                            )}
                          </div>
                          <CardDescription className="flex items-center gap-4 text-sm">
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {formatDate(backup.modifiedAt)}
                            </span>
                            <span className="flex items-center gap-1">
                              <Database className="h-3 w-3" />
                              {formatFileSize(backup.size)}
                            </span>
                          </CardDescription>
                        </div>
                      </div>
                    </CardHeader>

                    {backup.metadata && (
                      <CardContent>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                          <div className="space-y-2">
                            <div className="flex items-center gap-2 text-sm">
                              <User className="h-4 w-4 text-muted-foreground" />
                              <span className="font-medium">Creato da:</span>
                              <span>{backup.metadata.createdBy.userEmail}</span>
                              <Badge variant="outline" className="text-xs">
                                {backup.metadata.createdBy.userRole}
                              </Badge>
                            </div>

                            {backup.metadata.clientId && (
                              <div className="flex items-center gap-2 text-sm">
                                <Building className="h-4 w-4 text-muted-foreground" />
                                <span className="font-medium">Client ID:</span>
                                <span>{backup.metadata.clientId}</span>
                              </div>
                            )}
                          </div>

                          <div className="space-y-1 text-sm">
                            <div className="flex justify-between">
                              <span>Utenti:</span>
                              <span className="font-medium">
                                {backup.metadata.metadata.totalUsers}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span>Documenti:</span>
                              <span className="font-medium">
                                {backup.metadata.metadata.totalDocuments}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span>Log:</span>
                              <span className="font-medium">
                                {backup.metadata.metadata.totalLogs}
                              </span>
                            </div>
                            {backup.metadata.backupType === "complete" && (
                              <>
                                <div className="flex justify-between">
                                  <span>Client:</span>
                                  <span className="font-medium">
                                    {backup.metadata.metadata.totalClients}
                                  </span>
                                </div>
                                <div className="flex justify-between">
                                  <span>Codici Aziendali:</span>
                                  <span className="font-medium">
                                    {backup.metadata.metadata.totalCompanyCodes}
                                  </span>
                                </div>
                              </>
                            )}
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => downloadBackup(backup.filename)}
                            className="flex items-center gap-2"
                          >
                            <Download className="h-4 w-4" />
                            Scarica
                          </Button>

                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => restoreBackup(backup.filename)}
                            disabled={isRestoring}
                            className="flex items-center gap-2"
                          >
                            {isRestoring ? (
                              <RefreshCw className="h-4 w-4 animate-spin" />
                            ) : (
                              <Upload className="h-4 w-4" />
                            )}
                            {isRestoring ? "Ripristino..." : "Ripristina"}
                          </Button>

                          {isSuperAdmin && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => deleteBackup(backup.filename)}
                              disabled={isDeleting === backup.filename}
                              className="flex items-center gap-2 text-red-600 hover:text-red-700"
                            >
                              {isDeleting === backup.filename ? (
                                <RefreshCw className="h-4 w-4 animate-spin" />
                              ) : (
                                <Trash2 className="h-4 w-4" />
                              )}
                              {isDeleting === backup.filename
                                ? "Eliminazione..."
                                : "Elimina"}
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    )}
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <Footer />
    </div>
  );
}

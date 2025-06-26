import { useState, useEffect } from "react";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
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
  XCircle
} from "lucide-react";
import { toast } from "react-hot-toast";
import { useAuth } from "../hooks/use-auth";
import { apiRequest } from "../lib/queryClient";
import HeaderBar from "@/components/header-bar";
import Footer from "@/components/footer";

interface BackupFile {
  filename: string;
  path: string;
  size: number;
  createdAt: Date;
  modifiedAt: Date;
}

export default function BackupPage() {
  const { user } = useAuth();
  const [backups, setBackups] = useState<BackupFile[]>([]);
  const [isCreatingBackup, setIsCreatingBackup] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [selectedBackup, setSelectedBackup] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Verifica se l'utente ha i permessi
  const isAdmin = user?.role === "admin" || user?.role === "superadmin";

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
    if (!confirm("⚠️ ATTENZIONE: Il ripristino sovrascriverà tutti i dati attuali. Continuare?")) {
      return;
    }

    setIsRestoring(true);
    try {
      const response = await apiRequest("POST", "/api/admin/restore", {
        backupPath
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

  if (!isAdmin) {
    return (
      <div className="container mx-auto p-6">
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Accesso negato. Solo gli amministratori possono accedere alla gestione backup.
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
            Crea, gestisci e ripristina i backup del database
          </p>
        </div>
        <Button
          onClick={createBackup}
          disabled={isCreatingBackup}
          className="flex items-center gap-2 w-full sm:w-auto"
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

      <Separator />

      {/* Statistiche */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Backup Totali</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{backups.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ultimo Backup</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-sm text-muted-foreground">
              {backups.length > 0 
                ? formatDate(backups[0].modifiedAt)
                : "Nessun backup"
              }
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Spazio Totale</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-sm text-muted-foreground">
              {formatFileSize(backups.reduce((acc, backup) => acc + backup.size, 0))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Lista Backup */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <CardTitle>Backup Disponibili</CardTitle>
              <CardDescription>
                Lista di tutti i backup disponibili per il download e ripristino
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={loadBackups}
              disabled={isLoading}
              className="w-full sm:w-auto"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-6 w-6 animate-spin" />
              <span className="ml-2">Caricamento backup...</span>
            </div>
          ) : backups.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Database className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nessun backup disponibile</p>
              <p className="text-sm">Crea il tuo primo backup per iniziare</p>
            </div>
          ) : (
            <div className="space-y-4">
              {backups.map((backup, index) => (
                <div
                  key={backup.filename}
                  className="flex flex-col md:flex-row items-start md:items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors gap-2"
                >
                  <div className="flex items-center space-x-4 w-full">
                    <div className="flex-shrink-0">
                      <Database className="h-8 w-8 text-blue-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium break-all">{backup.filename}</div>
                      <div className="text-sm text-muted-foreground space-x-4 flex flex-col sm:flex-row">
                        <span>Dimensione: {formatFileSize(backup.size)}</span>
                        <span>Creato: {formatDate(backup.createdAt)}</span>
                        <span>Modificato: {formatDate(backup.modifiedAt)}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-row flex-wrap items-center gap-2 w-full md:w-auto justify-end">
                    <Badge variant="outline">
                      {index === 0 ? "Più recente" : "Archiviato"}
                    </Badge>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => downloadBackup(backup.filename)}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedBackup(backup.path)}
                      disabled={isRestoring}
                    >
                      <Upload className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal di conferma ripristino */}
      {selectedBackup && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-2">
          <div className="bg-background p-4 sm:p-6 rounded-lg max-w-md w-full mx-4">
            <div className="flex items-center space-x-2 mb-4">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              <h3 className="font-semibold">Conferma Ripristino</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Sei sicuro di voler ripristinare il database da questo backup? 
              Questa operazione sovrascriverà tutti i dati attuali e non può essere annullata.
            </p>
            <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
              <Button
                variant="outline"
                onClick={() => setSelectedBackup(null)}
                disabled={isRestoring}
                className="w-full sm:w-auto"
              >
                Annulla
              </Button>
              <Button
                variant="destructive"
                onClick={() => restoreBackup(selectedBackup)}
                disabled={isRestoring}
                className="w-full sm:w-auto"
              >
                {isRestoring ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                    Ripristino in corso...
                  </>
                ) : (
                  "Conferma Ripristino"
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
    <Footer />
  </div>
  );
} 
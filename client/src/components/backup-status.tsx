import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Database, Clock, AlertTriangle, CheckCircle } from "lucide-react";
import { toast } from "react-hot-toast";
import { apiRequest } from "../lib/queryClient";

interface BackupFile {
  filename: string;
  path: string;
  size: number;
  createdAt: Date;
  modifiedAt: Date;
}

interface BackupStatusProps {
  isAdmin: boolean;
}

export default function BackupStatus({ isAdmin }: BackupStatusProps) {
  const [backups, setBackups] = useState<BackupFile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastBackupDate, setLastBackupDate] = useState<Date | null>(null);

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
        if (data.length > 0) {
          setLastBackupDate(new Date(data[0].modifiedAt));
        }
      }
    } catch (error) {
      console.error("Errore nel caricamento dei backup:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const getBackupStatus = () => {
    if (isLoading) return "loading";
    if (backups.length === 0) return "no-backup";
    
    const lastBackup = new Date(lastBackupDate!);
    const now = new Date();
    const daysSinceBackup = Math.floor((now.getTime() - lastBackup.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysSinceBackup <= 1) return "recent";
    if (daysSinceBackup <= 7) return "warning";
    return "old";
  };

  const getStatusInfo = () => {
    const status = getBackupStatus();
    
    switch (status) {
      case "loading":
        return {
          icon: <Clock className="h-4 w-4" />,
          text: "Caricamento...",
          color: "bg-slate-100 text-slate-600",
          badgeColor: "bg-slate-200 text-slate-700"
        };
      case "no-backup":
        return {
          icon: <AlertTriangle className="h-4 w-4" />,
          text: "Nessun backup",
          color: "bg-red-50 text-red-600",
          badgeColor: "bg-red-100 text-red-700"
        };
      case "recent":
        return {
          icon: <CheckCircle className="h-4 w-4" />,
          text: "Backup recente",
          color: "bg-green-50 text-green-600",
          badgeColor: "bg-green-100 text-green-700"
        };
      case "warning":
        return {
          icon: <Clock className="h-4 w-4" />,
          text: "Backup da aggiornare",
          color: "bg-yellow-50 text-yellow-600",
          badgeColor: "bg-yellow-100 text-yellow-700"
        };
      case "old":
        return {
          icon: <AlertTriangle className="h-4 w-4" />,
          text: "Backup obsoleto",
          color: "bg-red-50 text-red-600",
          badgeColor: "bg-red-100 text-red-700"
        };
      default:
        return {
          icon: <Database className="h-4 w-4" />,
          text: "Stato sconosciuto",
          color: "bg-slate-50 text-slate-600",
          badgeColor: "bg-slate-100 text-slate-700"
        };
    }
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat("it-IT", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    }).format(date);
  };

  if (!isAdmin) return null;

  const statusInfo = getStatusInfo();

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Database className="h-5 w-5 text-blue-500" />
            <CardTitle className="text-lg">Stato Backup</CardTitle>
          </div>
          <Badge className={statusInfo.badgeColor}>
            {statusInfo.icon}
            <span className="ml-1">{statusInfo.text}</span>
          </Badge>
        </div>
        <CardDescription>
          Monitoraggio dei backup del database
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-4">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500 mx-auto"></div>
            <p className="text-sm text-muted-foreground mt-2">Caricamento...</p>
          </div>
        ) : backups.length === 0 ? (
          <div className="text-center py-4">
            <AlertTriangle className="h-8 w-8 text-red-500 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Nessun backup disponibile</p>
            <p className="text-xs text-muted-foreground mt-1">
              Crea il primo backup per proteggere i dati
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Ultimo backup:</span>
              <span className="text-sm font-medium">
                {lastBackupDate ? formatDate(lastBackupDate) : "N/A"}
              </span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Backup totali:</span>
              <span className="text-sm font-medium">{backups.length}</span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Dimensione totale:</span>
              <span className="text-sm font-medium">
                {formatFileSize(backups.reduce((acc, backup) => acc + backup.size, 0))}
              </span>
            </div>
            
            {getBackupStatus() === "old" && (
              <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-center space-x-2">
                  <AlertTriangle className="h-4 w-4 text-red-500" />
                  <span className="text-sm text-red-700">
                    Il backup è obsoleto. Crea un nuovo backup per sicurezza.
                  </span>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function formatFileSize(bytes: number) {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
} 
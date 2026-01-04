import { useState, useCallback } from "react";
import { useToast } from "./use-toast";

type FileWithPath = File & {
  path?: string;
  webkitRelativePath?: string;
};

interface UploadConfirmationOptions {
  onConfirm: (files: FileWithPath[]) => void;
  onCancel?: () => void;
  maxFiles?: number;
  accept?: string[];
}

export function useUploadConfirmation() {
  const { toast } = useToast();
  const [isUploading, setIsUploading] = useState(false);

  const confirmUpload = useCallback(
    async (files: FileWithPath[], options: UploadConfirmationOptions) => {
      if (!files || files.length === 0) {
        toast({
          title: "Nessun file selezionato",
          description: "Seleziona almeno un file da caricare.",
          variant: "destructive",
        });
        return;
      }

      // Mostra toast di conferma con dettagli
      const fileCount = files.length;
      const totalSize = files.reduce((acc, file) => acc + file.size, 0);
      const sizeInMB = (totalSize / (1024 * 1024)).toFixed(2);

      // Crea una lista dei file per il toast
      const fileList = files.slice(0, 5).map(file => {
        const path = file.webkitRelativePath || file.name;
        return `• ${path}`;
      }).join('\n');
      
      const moreFiles = files.length > 5 ? `\n... e altri ${files.length - 5} file` : '';

      const toastRef = toast({
        title: `Caricamento ${fileCount} file`,
        description: (
          <div className="space-y-2">
            <p>Dimensione totale: {sizeInMB} MB</p>
            <div className="text-xs text-muted-foreground max-h-20 overflow-y-auto">
              <pre className="whitespace-pre-wrap">{fileList}{moreFiles}</pre>
            </div>
            <div className="flex gap-2 mt-2">
              <button
                onClick={() => {
                  setIsUploading(true);
                  options.onConfirm(files);
                  // Chiudi il toast di conferma
                  toastRef.dismiss();
                }}
                className="px-3 py-1 bg-primary text-primary-foreground rounded text-xs hover:bg-primary/90"
              >
                Conferma
              </button>
              <button
                onClick={() => {
                  options.onCancel?.();
                  // Chiudi il toast quando si annulla
                  toastRef.dismiss();
                }}
                className="px-3 py-1 bg-secondary text-secondary-foreground rounded text-xs hover:bg-secondary/80"
              >
                Annulla
              </button>
            </div>
          </div>
        ),
        duration: 15001, // 15 secondi per decisioni più rapide
      });
    },
    [toast]
  );

  const showUploadProgress = useCallback(
    (current: number, total: number, message?: string) => {
      const percentage = Math.round((current / total) * 100);
      
      toast({
        title: "Caricamento in corso...",
        description: (
          <div className="space-y-2">
            <div className="w-full bg-secondary rounded-full h-2">
              <div 
                className="bg-primary h-2 rounded-full transition-all duration-300"
                style={{ width: `${percentage}%` }}
              />
            </div>
            <p className="text-sm">
              {message || `File ${current} di ${total} (${percentage}%)`}
            </p>
          </div>
        ),
        duration: Infinity, // Non si chiude automaticamente
      });
    },
    [toast]
  );

  const showUploadComplete = useCallback(
    (successCount: number, errorCount: number = 0) => {
      if (errorCount === 0) {
        toast({
          title: "Caricamento completato",
          description: `${successCount} file caricati con successo.`,
        });
      } else {
        toast({
          title: "Caricamento completato con errori",
          description: `${successCount} file caricati, ${errorCount} errori.`,
          variant: "destructive",
        });
      }
      setIsUploading(false);
    },
    [toast]
  );

  const showUploadError = useCallback(
    (error: string) => {
      toast({
        title: "Errore durante il caricamento",
        description: error,
        variant: "destructive",
      });
      setIsUploading(false);
    },
    [toast]
  );

  return {
    confirmUpload,
    showUploadProgress,
    showUploadComplete,
    showUploadError,
    isUploading,
  };
} 
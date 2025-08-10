import React, { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Button } from "./ui/button";
import { Card, CardContent } from "./ui/card";
import { Progress } from "./ui/progress";
import { Badge } from "./ui/badge";
import { 
  Upload, 
  FolderOpen, 
  File, 
  FileText, 
  FileSpreadsheet, 
  FileImage,
  X,
  CheckCircle,
  AlertCircle
} from "lucide-react";
import { cn } from "../lib/utils";
import { useUploadConfirmation } from "../hooks/use-upload-confirmation";
import { useToast } from "../hooks/use-toast";

type FileWithOptionalPath = File & { path?: string; webkitRelativePath?: string };

interface ModernFileUploadProps {
  onFilesSelected: (files: FileWithOptionalPath[]) => void;
  onUploadComplete?: () => void;
  accept?: string[];
  maxFiles?: number;
  className?: string;
  disabled?: boolean;
}

export default function ModernFileUpload({
  onFilesSelected,
  onUploadComplete,
  accept = [".xlsx", ".xls", ".docx", ".pdf", ".ods", ".csv"],
  maxFiles = 1000,
  className,
  disabled = false
}: ModernFileUploadProps) {
  const [isDragActive, setIsDragActive] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<FileWithOptionalPath[]>([]);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const { confirmUpload, showUploadProgress, showUploadComplete, showUploadError, isUploading: isConfirming } = useUploadConfirmation();
  const { toast } = useToast();

  const getFileIcon = (fileName: string) => {
    const extension = fileName.split('.').pop()?.toLowerCase();
    switch (extension) {
      case 'pdf':
        return <File className="h-4 w-4 text-red-500" />;
      case 'docx':
      case 'doc':
        return <FileText className="h-4 w-4 text-blue-500" />;
      case 'xlsx':
      case 'xls':
        return <FileSpreadsheet className="h-4 w-4 text-green-500" />;
      case 'jpg':
      case 'jpeg':
      case 'png':
        return <FileImage className="h-4 w-4 text-purple-500" />;
      default:
        return <File className="h-4 w-4 text-gray-500" />;
    }
  };

  const processFiles = useCallback((files: FileList | File[]): FileWithOptionalPath[] => {
    // Non mutiamo gli oggetti File: ritorniamo direttamente l'array
    return Array.from(files) as FileWithOptionalPath[];
  }, []);

  const filterByAccept = useCallback((files: FileWithOptionalPath[]) => {
    if (!accept || accept.length === 0) return files;
    const lowerAccepted = accept.map((a) => a.toLowerCase());
    return files.filter((file) =>
      lowerAccepted.some((ext) => file.name.toLowerCase().endsWith(ext))
    );
  }, [accept]);

  const handleFiles = useCallback((incomingFiles: FileWithOptionalPath[]) => {
    setUploadError(null);
    const existingByKey = new Set(
      uploadedFiles.map(f => `${((f as any).webkitRelativePath || (f as any).path || f.name)}|${f.size}|${(f as File).lastModified}`)
    );
    const merged: FileWithOptionalPath[] = [...uploadedFiles];
    for (const f of incomingFiles) {
      const rel = (f as any).webkitRelativePath || (f as any).path || f.name;
      const key = `${rel}|${f.size}|${(f as File).lastModified}`;
      if (!existingByKey.has(key)) {
        merged.push(f);
        existingByKey.add(key);
      }
    }
    setUploadedFiles(merged);
    // Proponi conferma sull'intero set selezionato finora
    confirmUpload(merged, {
      onConfirm: (confirmedFiles) => {
        setIsUploading(true);
        setUploadProgress(0);
        const interval = setInterval(() => {
          setUploadProgress(prevProg => {
            if (prevProg >= 100) {
              clearInterval(interval);
              setIsUploading(false);
              onFilesSelected(confirmedFiles);
              onUploadComplete?.();
              showUploadComplete(confirmedFiles.length);
              return 100;
            }
            return prevProg + 5; // Ridotto da 10% a 5% per progresso più fluido
          });
        }, 50); // Ridotto da 100ms a 50ms per feedback più veloce
      },
      onCancel: () => {
        setUploadProgress(0);
      }
    });
  }, [uploadedFiles, onFilesSelected, onUploadComplete, confirmUpload, showUploadComplete]);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    setIsDragActive(false);
    const processedFiles = processFiles(acceptedFiles);
    const filtered = filterByAccept(processedFiles);
    if (filtered.length === 0) {
      toast({
        title: "Nessun file valido",
        description: "I file trascinati non corrispondono ai formati supportati.",
      });
      return;
    }
    handleFiles(filtered);
  }, [processFiles, handleFiles, filterByAccept, toast]);

  const { getRootProps, getInputProps, isDragReject } = useDropzone({
    onDrop,
    onDragEnter: () => setIsDragActive(true),
    onDragLeave: () => setIsDragActive(false),
    multiple: true,
    maxFiles,
    disabled,
  });

  const pickDirectoryAndProcess = useCallback(() => {
    try {
      const input = document.createElement("input");
      input.type = "file";
      input.multiple = true;
      // Usare l'attributo non standard per permettere la selezione di intere cartelle
      (input as any).webkitdirectory = true;
      input.accept = accept.join(",");
      input.onchange = (e) => {
        const files = (e.target as HTMLInputElement).files;
        if (!files || files.length === 0) return;
        const processed = processFiles(files);
        const filtered = filterByAccept(processed);
        if (filtered.length === 0) {
          toast({
            title: "Nessun file valido",
            description: "La cartella selezionata non contiene formati supportati.",
          });
          return;
        }
        handleFiles(filtered);
      };
      input.click();
    } catch (err: any) {
      toast({
        title: "Errore selezione cartella",
        description: err?.message || "Impossibile leggere la cartella",
        variant: "destructive",
      });
    }
  }, [filterByAccept, handleFiles, processFiles, toast]);

  const removeFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const clearAllFiles = () => {
    setUploadedFiles([]);
    setUploadProgress(0);
    setUploadError(null);
  };

  return (
    <div className={cn(
      "space-y-3 sm:space-y-4 w-full max-w-[min(92vw,680px)] md:max-w-[720px] mx-auto min-w-0",
      className
    )}>
      {/* Area di Drop */}
      <Card className={cn(
        "border-2 border-dashed transition-all duration-200 cursor-pointer",
        isDragActive && !isDragReject && "border-primary bg-primary/5",
        isDragReject && "border-destructive bg-destructive/5",
        disabled && "opacity-50 cursor-not-allowed"
      )}>
        <CardContent className="p-3 sm:p-4 md:p-5">
          <div {...getRootProps()} className="text-center">
            <input {...getInputProps()} />
            
            <div className="space-y-3 sm:space-y-4">
              <div className="flex justify-center">
                <div className={cn(
                  "p-2 sm:p-3 rounded-full transition-colors",
                  isDragActive && !isDragReject && "bg-primary/10",
                  isDragReject && "bg-destructive/10"
                )}>
                  <Upload className={cn(
                    "h-6 w-6 sm:h-8 sm:w-8 md:h-9 md:w-9 transition-colors",
                    isDragActive && !isDragReject && "text-primary",
                    isDragReject && "text-destructive",
                    !isDragActive && "text-muted-foreground"
                  )} />
                </div>
              </div>
              
              <div className="space-y-1.5 sm:space-y-2">
                <h3 className="text-sm sm:text-base md:text-lg font-semibold">
                  {isDragActive 
                    ? isDragReject 
                      ? "Tipo di file non supportato" 
                      : "Rilascia i file qui"
                    : "Carica documenti"
                  }
                </h3>
                <p className="text-[11px] sm:text-xs text-muted-foreground">
                  Trascina e rilascia file o cartelle qui, oppure clicca per selezionare
                </p>
              </div>
              
              <div className="flex flex-col sm:flex-row flex-wrap gap-2 justify-center">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    pickDirectoryAndProcess();
                  }}
                  disabled={disabled}
                  className="flex items-center gap-2 w-full sm:w-auto"
                >
                  <FolderOpen className="h-4 w-4" />
                  Seleziona cartella
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    // Trigger file selection
                    const input = document.createElement('input');
                    input.type = 'file';
                    input.multiple = true;
                    input.accept = accept.join(',');
                    input.onchange = (e) => {
                      const files = (e.target as HTMLInputElement).files;
                      if (files) {
                        const processedFiles = processFiles(files);
                        handleFiles(processedFiles);
                      }
                    };
                    input.click();
                  }}
                  disabled={disabled}
                  className="flex items-center gap-2 w-full sm:w-auto"
                >
                  <File className="h-4 w-4" />
                  Seleziona file
                </Button>
              </div>
              
              <div className="text-[11px] sm:text-xs text-muted-foreground">
                Formati supportati: {accept.join(', ')}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Progress Bar */}
      {isUploading && (
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Caricamento in corso...</span>
            <span>{uploadProgress}%</span>
          </div>
          <Progress value={uploadProgress} className="h-2" />
        </div>
      )}

      {/* Error Message */}
      {uploadError && (
        <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-md">
          <AlertCircle className="h-4 w-4 text-destructive" />
          <span className="text-sm text-destructive">{uploadError}</span>
        </div>
      )}

      {/* File List */}
      {uploadedFiles.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-medium">File selezionati ({uploadedFiles.length})</h4>
            <Button
              variant="ghost"
              size="sm"
              onClick={clearAllFiles}
              className="text-destructive hover:text-destructive"
            >
              Rimuovi tutti
            </Button>
          </div>
          
          <div className="max-h-[28vh] sm:max-h-[36vh] md:max-h-[44vh] lg:max-h-[50vh] overflow-y-auto overflow-x-hidden space-y-2">
            {uploadedFiles.map((file, index) => (
              <div
                key={`${file.name}-${index}`}
                className="flex items-center justify-between p-2 sm:p-2.5 md:p-3 bg-muted/50 rounded-md w-full"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  {getFileIcon(file.name)}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs sm:text-sm font-medium truncate" title={file.name}>{file.name}</p>
                    {(() => {
                      const rel = (file as any).webkitRelativePath || (file as any).path;
                      return rel && rel !== file.name;
                    })() && (
                      <p className="text-[11px] sm:text-xs text-muted-foreground truncate" title={(file as any).webkitRelativePath || (file as any).path}>
                        {(file as any).webkitRelativePath || (file as any).path}
                      </p>
                    )}
                    <p className="text-[11px] sm:text-xs text-muted-foreground">
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-[10px] sm:text-xs">
                    {file.type || 'application/octet-stream'}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeFile(index)}
                    className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
          
          {uploadProgress === 100 && (
            <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-md">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span className="text-sm text-green-700 dark:text-green-300">
                Caricamento completato! I file sono pronti per essere processati.
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
} 
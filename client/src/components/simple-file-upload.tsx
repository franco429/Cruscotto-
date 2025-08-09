import React, { useRef, useState } from "react";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { 
  Upload, 
  FolderOpen, 
  File, 
  FileText, 
  FileSpreadsheet, 
  X,
  AlertCircle
} from "lucide-react";
import { cn } from "../lib/utils";
import { useToast } from "../hooks/use-toast";

interface FileWithPath extends File {
  webkitRelativePath?: string;
  path?: string;
}

interface SimpleFileUploadProps {
  onFilesSelected: (files: FileWithPath[]) => void;
  accept?: string[];
  maxFiles?: number;
  className?: string;
  disabled?: boolean;
}

export default function SimpleFileUpload({
  onFilesSelected,
  accept = [".xlsx", ".xls", ".docx", ".pdf", ".ods", ".csv"],
  maxFiles = 1000,
  className,
  disabled = false
}: SimpleFileUploadProps) {
  const [selectedFiles, setSelectedFiles] = useState<FileWithPath[]>([]);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const getFileIcon = (fileName: string) => {
    const extension = fileName.split('.').pop()?.toLowerCase();
    switch (extension) {
      case 'pdf':
        return <File className="h-3 w-3 text-red-500" />;
      case 'docx':
      case 'doc':
        return <FileText className="h-3 w-3 text-blue-500" />;
      case 'xlsx':
      case 'xls':
        return <FileSpreadsheet className="h-3 w-3 text-green-500" />;
      default:
        return <File className="h-3 w-3 text-gray-500" />;
    }
  };

  const processFiles = (files: FileList): FileWithPath[] => {
    const fileArray = Array.from(files);
    const processedFiles: FileWithPath[] = [];

    fileArray.forEach((file) => {
      const fileWithPath = file as FileWithPath;
      
      // Se il file ha un webkitRelativePath (cartella selezionata), lo usiamo
      if (fileWithPath.webkitRelativePath) {
        fileWithPath.path = fileWithPath.webkitRelativePath;
      } else {
        // Altrimenti usiamo il nome del file
        fileWithPath.path = file.name;
      }
      
      processedFiles.push(fileWithPath);
    });

    return processedFiles;
  };

  const mergeAndDeduplicate = (
    existing: FileWithPath[],
    incoming: FileWithPath[]
  ): FileWithPath[] => {
    const makeKey = (f: FileWithPath) => `${(f.webkitRelativePath || f.path || f.name)}|${f.size}|${f.lastModified}`;
    const seen = new Set(existing.map(makeKey));
    const merged: FileWithPath[] = [...existing];
    for (const f of incoming) {
      const key = makeKey(f);
      if (!seen.has(key)) {
        merged.push(f);
        seen.add(key);
      }
    }
    return merged.slice(0, maxFiles);
  };

  const filterByAccept = (files: FileWithPath[]) => {
    if (!accept || accept.length === 0) return files;
    const lowerAccepted = accept.map((a) => a.toLowerCase());
    return files.filter((file) =>
      lowerAccepted.some((ext) => file.name.toLowerCase().endsWith(ext))
    );
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      setError(null);
      const processedFiles = filterByAccept(processFiles(files));
      const merged = mergeAndDeduplicate(selectedFiles, processedFiles);
      setSelectedFiles(merged);
      onFilesSelected(merged);
    }
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const pickDirectoryAndProcess = () => {
    try {
      const input = document.createElement("input");
      input.type = "file";
      input.multiple = true;
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
        setError(null);
        const merged = mergeAndDeduplicate(selectedFiles, filtered);
        setSelectedFiles(merged);
        onFilesSelected(merged);
        toast({
          title: "Cartella caricata",
          description: `${merged.length} file totali selezionati`,
        });
      };
      input.click();
    } catch (err: any) {
      toast({
        title: "Errore selezione cartella",
        description: err?.message || "Impossibile leggere la cartella",
        variant: "destructive",
      });
    }
  };

  const removeFile = (index: number) => {
    const newFiles = selectedFiles.filter((_, i) => i !== index);
    setSelectedFiles(newFiles);
    onFilesSelected(newFiles);
  };

  const clearAllFiles = () => {
    setSelectedFiles([]);
    setError(null);
    onFilesSelected([]);
  };

  return (
    <div className={cn("space-y-3", className)}>
      {/* Input Area */}
      <div className="flex flex-col sm:flex-row gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled}
          className="flex items-center gap-2"
        >
          <Upload className="h-4 w-4" />
          Seleziona file
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={pickDirectoryAndProcess}
          disabled={disabled}
          className="flex items-center gap-2"
        >
          <FolderOpen className="h-4 w-4" />
          Seleziona cartella
        </Button>
      </div>

      {/* Hidden Inputs */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept={accept.join(',')}
        onChange={handleFileSelect}
        className="hidden"
        disabled={disabled}
      />
      {/** Rimosso input con webkitdirectory per evitare il modale nativo del browser */}

      {/* Error Message */}
      {error && (
        <div className="flex items-center gap-2 p-2 bg-destructive/10 border border-destructive/20 rounded-md">
          <AlertCircle className="h-4 w-4 text-destructive" />
          <span className="text-sm text-destructive">{error}</span>
        </div>
      )}

      {/* File List */}
      {selectedFiles.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">
              File selezionati ({selectedFiles.length})
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={clearAllFiles}
              className="text-destructive hover:text-destructive h-auto p-1"
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
          
          <div className="max-h-32 overflow-y-auto space-y-1">
            {selectedFiles.map((file, index) => (
              <div
                key={`${file.name}-${index}`}
                className="flex items-center justify-between p-2 bg-muted/50 rounded-md text-xs"
              >
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  {getFileIcon(file.name)}
                  <div className="flex-1 min-w-0">
                    <p className="truncate font-medium">{file.name}</p>
                    {file.path && file.path !== file.name && (
                      <p className="text-muted-foreground truncate">
                        {file.path}
                      </p>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center gap-1">
                  <Badge variant="secondary" className="text-xs">
                    {(file.size / 1024 / 1024).toFixed(1)} MB
                  </Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeFile(index)}
                    className="h-auto p-1 text-destructive hover:text-destructive"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Help Text */}
      <p className="text-xs text-muted-foreground">
        Formati supportati: {accept.join(', ')}
      </p>
    </div>
  );
} 
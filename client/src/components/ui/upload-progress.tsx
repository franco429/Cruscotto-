import React from "react";
import { CheckCircle, Upload, FileText } from "lucide-react";
import { cn } from "../../lib/utils";

interface UploadProgressProps {
  fileCount: number;
  totalSize: string;
  isConfirmed: boolean;
  isUploading?: boolean;
  progress?: number;
}

export function UploadProgress({
  fileCount,
  totalSize,
  isConfirmed,
  isUploading = false,
  progress = 0,
}: UploadProgressProps) {
  return (
    <div className="space-y-3">
      {/* Indicatore di stato file selezionati */}
      <div className={cn(
        "flex items-center space-x-3 p-4 rounded-xl border transition-all duration-300",
        isConfirmed 
          ? "bg-green-50 dark:bg-green-950/50 border-green-200 dark:border-green-800" 
          : "bg-blue-50 dark:bg-blue-950/50 border-blue-200 dark:border-blue-800"
      )}>
        <div className={cn(
          "flex items-center justify-center w-10 h-10 rounded-full transition-colors",
          isConfirmed 
            ? "bg-green-100 dark:bg-green-900/50" 
            : "bg-blue-100 dark:bg-blue-900/50"
        )}>
          {isConfirmed ? (
            <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
          ) : (
            <Upload className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          )}
        </div>
        
        <div className="flex-1">
          <div className="flex items-center justify-between mb-1">
            <p className={cn(
              "text-sm font-medium transition-colors",
              isConfirmed 
                ? "text-green-900 dark:text-green-100" 
                : "text-blue-900 dark:text-blue-100"
            )}>
              {fileCount} file selezionati
            </p>
            {isConfirmed && (
              <span className="text-xs text-green-600 dark:text-green-400 font-medium">
                Confermato
              </span>
            )}
          </div>
          
          <div className="flex items-center space-x-2">
            <FileText className="h-3 w-3 text-gray-500 dark:text-gray-400" />
            <p className={cn(
              "text-xs transition-colors",
              isConfirmed 
                ? "text-green-700 dark:text-green-300" 
                : "text-blue-700 dark:text-blue-300"
            )}>
              {totalSize}
            </p>
          </div>
        </div>
      </div>

      {/* Barra di progresso per il caricamento */}
      {isUploading && (
        <div className="space-y-2">
          <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400">
            <span>Caricamento in corso...</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
} 
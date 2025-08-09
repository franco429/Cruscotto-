import React from "react";
import { Button } from "./button";
import { Upload, FileText, X, CheckCircle, AlertCircle } from "lucide-react";
import { cn } from "../../lib/utils";

interface UploadConfirmationToastProps {
  title: string;
  message: string;
  fileCount: number;
  totalSize: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmText?: string;
  cancelText?: string;
}

export function UploadConfirmationToast({
  title,
  message,
  fileCount,
  totalSize,
  onConfirm,
  onCancel,
  confirmText = "Carica Documenti",
  cancelText = "Annulla",
}: UploadConfirmationToastProps) {
  return (
    <div className="relative w-full max-w-md rounded-xl border border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/50 dark:to-indigo-950/50 p-4 shadow-lg backdrop-blur-sm">
      {/* Close button */}
      <button
        onClick={onCancel}
        className="absolute right-3 top-3 rounded-full p-1.5 text-blue-400 hover:text-blue-600 dark:hover:text-blue-300 transition-colors hover:bg-blue-100 dark:hover:bg-blue-900/50"
      >
        <X className="h-4 w-4" />
      </button>

      {/* Header con icona */}
      <div className="flex items-start space-x-3 pr-8">
        <div className="flex-shrink-0">
          <div className="flex items-center justify-center w-10 h-10 bg-blue-100 dark:bg-blue-900/50 rounded-full">
            <Upload className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          </div>
        </div>
        
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-1">
            {title}
          </h3>
          <p className="text-sm text-blue-700 dark:text-blue-300 mb-3">
            {message}
          </p>
          
          {/* Dettagli file */}
          <div className="bg-white dark:bg-blue-900/30 rounded-lg p-3 border border-blue-200 dark:border-blue-800">
            <div className="flex items-center space-x-2 mb-2">
              <FileText className="h-4 w-4 text-blue-500 dark:text-blue-400" />
              <span className="text-sm font-medium text-blue-900 dark:text-blue-100">
                Dettagli File
              </span>
            </div>
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-blue-600 dark:text-blue-300">Numero file:</span>
                <span className="font-medium text-blue-900 dark:text-blue-100">{fileCount}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-blue-600 dark:text-blue-300">Dimensione totale:</span>
                <span className="font-medium text-blue-900 dark:text-blue-100">{totalSize}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex space-x-2 mt-4">
        <Button
          variant="outline"
          size="sm"
          onClick={onCancel}
          className="flex-1 border-blue-300 text-blue-700 hover:bg-blue-100 dark:border-blue-700 dark:text-blue-300 dark:hover:bg-blue-900/50"
        >
          {cancelText}
        </Button>
        <Button
          size="sm"
          onClick={onConfirm}
          className="flex-1 bg-blue-600 hover:bg-blue-700 text-white border-blue-600 shadow-sm"
        >
          <Upload className="h-4 w-4 mr-2" />
          {confirmText}
        </Button>
      </div>
    </div>
  );
} 
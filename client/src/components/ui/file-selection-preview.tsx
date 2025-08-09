import React from "react";
import { FileText, Folder, X, Upload } from "lucide-react";
import { cn } from "../../lib/utils";

interface FileSelectionPreviewProps {
  files: FileList;
  onConfirm: () => void;
  onCancel: () => void;
  onRemoveFile?: (index: number) => void;
  title?: string;
  confirmText?: string;
  cancelText?: string;
}

export function FileSelectionPreview({
  files,
  onConfirm,
  onCancel,
  onRemoveFile,
  title = "File Selezionati",
  confirmText = "Carica File",
  cancelText = "Annulla",
}: FileSelectionPreviewProps) {
  const fileArray = Array.from(files);
  const totalSize = (fileArray.reduce((acc, file) => acc + file.size, 0) / (1024 * 1024)).toFixed(2);

  const getFileIcon = (fileName: string) => {
    const extension = fileName.split('.').pop()?.toLowerCase();
    switch (extension) {
      case 'pdf':
        return <FileText className="h-4 w-4 text-red-500" />;
      case 'docx':
      case 'doc':
        return <FileText className="h-4 w-4 text-blue-500" />;
      case 'xlsx':
      case 'xls':
        return <FileText className="h-4 w-4 text-green-500" />;
      default:
        return <FileText className="h-4 w-4 text-gray-500" />;
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center space-x-3">
            <div className="flex items-center justify-center w-10 h-10 bg-blue-100 dark:bg-blue-900/50 rounded-full">
              <Folder className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                {title}
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                {fileArray.length} file selezionati • {totalSize} MB
              </p>
            </div>
          </div>
          <button
            onClick={onCancel}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-slate-500" />
          </button>
        </div>

        {/* File List */}
        <div className="p-6 max-h-96 overflow-y-auto">
          <div className="space-y-3">
            {fileArray.map((file, index) => (
              <div
                key={`${file.name}-${index}`}
                className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg border border-slate-200 dark:border-slate-600"
              >
                <div className="flex items-center space-x-3 flex-1 min-w-0">
                  {getFileIcon(file.name)}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                      {file.name}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {(file.size / (1024 * 1024)).toFixed(2)} MB
                    </p>
                  </div>
                </div>
                {onRemoveFile && (
                  <button
                    onClick={() => onRemoveFile(index)}
                    className="p-1 hover:bg-red-100 dark:hover:bg-red-900/50 rounded transition-colors"
                  >
                    <X className="h-4 w-4 text-red-500" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="flex space-x-3 p-6 border-t border-slate-200 dark:border-slate-700">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center justify-center space-x-2"
          >
            <Upload className="h-4 w-4" />
            <span>{confirmText}</span>
          </button>
        </div>
      </div>
    </div>
  );
} 
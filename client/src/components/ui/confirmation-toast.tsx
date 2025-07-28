import React from "react";
import { Button } from "./button";
import { Trash2, AlertTriangle, X } from "lucide-react";
import { cn } from "../../lib/utils";

interface ConfirmationToastProps {
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmText?: string;
  cancelText?: string;
  variant?: "destructive" | "warning" | "default";
  isLoading?: boolean;
}

export function ConfirmationToast({
  title,
  message,
  onConfirm,
  onCancel,
  confirmText = "Conferma",
  cancelText = "Annulla",
  variant = "destructive",
  isLoading = false,
}: ConfirmationToastProps) {
  const getVariantStyles = () => {
    switch (variant) {
      case "destructive":
        return {
          container: "border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/50",
          icon: "text-red-600 dark:text-red-400",
          title: "text-red-900 dark:text-red-100",
          message: "text-red-700 dark:text-red-300",
          confirmButton: "bg-red-600 hover:bg-red-700 text-white border-red-600",
          cancelButton: "border-red-300 text-red-700 hover:bg-red-100 dark:border-red-700 dark:text-red-300 dark:hover:bg-red-900/50",
        };
      case "warning":
        return {
          container: "border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/50",
          icon: "text-amber-600 dark:text-amber-400",
          title: "text-amber-900 dark:text-amber-100",
          message: "text-amber-700 dark:text-amber-300",
          confirmButton: "bg-amber-600 hover:bg-amber-700 text-white border-amber-600",
          cancelButton: "border-amber-300 text-amber-700 hover:bg-amber-100 dark:border-amber-700 dark:text-amber-300 dark:hover:bg-amber-900/50",
        };
      default:
        return {
          container: "border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-900/50",
          icon: "text-gray-600 dark:text-gray-400",
          title: "text-gray-900 dark:text-gray-100",
          message: "text-gray-700 dark:text-gray-300",
          confirmButton: "bg-blue-600 hover:bg-blue-700 text-white border-blue-600",
          cancelButton: "border-gray-300 text-gray-700 hover:bg-gray-100 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800/50",
        };
    }
  };

  const styles = getVariantStyles();

  return (
    <div className={cn(
      "relative w-full max-w-sm rounded-lg border p-4 shadow-lg backdrop-blur-sm",
      styles.container
    )}>
      {/* Close button */}
      <button
        onClick={onCancel}
        className="absolute right-2 top-2 rounded-md p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
      >
        <X className="h-4 w-4" />
      </button>

      {/* Icon and content */}
      <div className="flex items-start space-x-3 pr-6">
        <div className={cn("flex-shrink-0", styles.icon)}>
          {variant === "destructive" ? (
            <Trash2 className="h-5 w-5" />
          ) : (
            <AlertTriangle className="h-5 w-5" />
          )}
        </div>
        
        <div className="flex-1 min-w-0">
          <h3 className={cn("text-sm font-semibold mb-1", styles.title)}>
            {title}
          </h3>
          <p className={cn("text-sm", styles.message)}>
            {message}
          </p>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex space-x-2 mt-4">
        <Button
          variant="outline"
          size="sm"
          onClick={onCancel}
          disabled={isLoading}
          className={cn("flex-1", styles.cancelButton)}
        >
          {cancelText}
        </Button>
        <Button
          size="sm"
          onClick={onConfirm}
          disabled={isLoading}
          className={cn("flex-1", styles.confirmButton)}
        >
          {isLoading ? (
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span>Eliminazione...</span>
            </div>
          ) : (
            confirmText
          )}
        </Button>
      </div>
    </div>
  );
} 
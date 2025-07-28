import React from "react";
import { useToast } from "./use-toast";
import { ConfirmationToast } from "../components/ui/confirmation-toast";

interface ConfirmationToastOptions {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: "destructive" | "warning" | "default";
  duration?: number;
}

export function useConfirmationToast() {
  const { toast } = useToast();

  const showConfirmation = (options: ConfirmationToastOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      const { title, message, confirmText, cancelText, variant, duration = 0 } = options;

      const toastInstance = toast({
        title: undefined,
        description: undefined,
        duration,
        action: (
          <ConfirmationToast
            title={title}
            message={message}
            confirmText={confirmText}
            cancelText={cancelText}
            variant={variant}
            onConfirm={() => {
              // Chiusura immediata del toast
              toastInstance.dismiss();
              resolve(true);
            }}
            onCancel={() => {
              // Chiusura immediata del toast
              toastInstance.dismiss();
              resolve(false);
            }}
          />
        ),
      });
    });
  };

  const showConfirmationWithLoading = (
    options: ConfirmationToastOptions,
    onConfirm: () => Promise<void>
  ): Promise<boolean> => {
    return new Promise((resolve) => {
      const { title, message, confirmText, cancelText, variant, duration = 0 } = options;
      let isLoading = false;

      const toastInstance = toast({
        title: undefined,
        description: undefined,
        duration,
        action: (
          <ConfirmationToast
            title={title}
            message={message}
            confirmText={confirmText}
            cancelText={cancelText}
            variant={variant}
            isLoading={isLoading}
            onConfirm={async () => {
              if (isLoading) return;
              isLoading = true;
              
              // Aggiorna il toast con loading state
              toastInstance.update({
                action: (
                  <ConfirmationToast
                    title={title}
                    message={message}
                    confirmText={confirmText}
                    cancelText={cancelText}
                    variant={variant}
                    isLoading={true}
                    onConfirm={async () => {
                      if (isLoading) return;
                      try {
                        await onConfirm();
                        toastInstance.dismiss();
                        resolve(true);
                      } catch (error) {
                        isLoading = false;
                        resolve(false);
                      }
                    }}
                    onCancel={() => {
                      if (isLoading) return;
                      toastInstance.dismiss();
                      resolve(false);
                    }}
                  />
                ),
              });
              
              try {
                await onConfirm();
                toastInstance.dismiss();
                resolve(true);
              } catch (error) {
                isLoading = false;
                resolve(false);
              }
            }}
            onCancel={() => {
              if (isLoading) return;
              toastInstance.dismiss();
              resolve(false);
            }}
          />
        ),
      });
    });
  };

  const showDeleteConfirmation = (itemName: string): Promise<boolean> => {
    return showConfirmation({
      title: "Conferma Eliminazione",
      message: `Sei sicuro di voler eliminare "${itemName}"? Questa azione non può essere annullata.`,
      confirmText: "Elimina",
      cancelText: "Annulla",
      variant: "destructive",
    });
  };

  const showRestoreConfirmation = (itemName: string): Promise<boolean> => {
    return showConfirmation({
      title: "Conferma Ripristino",
      message: `⚠️ ATTENZIONE: Il ripristino di "${itemName}" sovrascriverà tutti i dati attuali. Continuare?`,
      confirmText: "Ripristina",
      cancelText: "Annulla",
      variant: "warning",
    });
  };

  return {
    showConfirmation,
    showConfirmationWithLoading,
    showDeleteConfirmation,
    showRestoreConfirmation,
  };
} 
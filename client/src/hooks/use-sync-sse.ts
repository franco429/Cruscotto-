import { useState, useEffect, useCallback, useRef } from "react";
import { apiRequest } from "../lib/queryClient";

export interface SyncProgress {
  status: 'idle' | 'pending' | 'syncing' | 'completed' | 'error';
  processed: number;
  total: number;
  currentBatch: number;
  totalBatches: number;
  duration?: number;
  error?: string;
  success?: boolean;
  failed?: number;
}

interface UseSyncSSEOptions {
  onProgress?: (progress: SyncProgress) => void;
  onCompleted?: (result: SyncProgress) => void;
  onError?: (error: string) => void;
  autoConnect?: boolean;
}

interface UseSyncSSEReturn {
  progress: SyncProgress;
  isConnected: boolean;
  connect: () => void;
  disconnect: () => void;
  startSync: () => Promise<{ success: boolean; syncId?: string; error?: string }>;
  reset: () => void;
}

const initialProgress: SyncProgress = {
  status: 'idle',
  processed: 0,
  total: 0,
  currentBatch: 0,
  totalBatches: 0,
};

// Polling interval in ms (veloce per aggiornamenti real-time)
const POLLING_INTERVAL = 1000;

export function useSyncSSE(options: UseSyncSSEOptions = {}): UseSyncSSEReturn {
  const { onProgress, onCompleted, onError, autoConnect = false } = options;
  
  const [progress, setProgress] = useState<SyncProgress>(initialProgress);
  const [isConnected, setIsConnected] = useState(false);
  
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isSyncingRef = useRef(false);

  // Cleanup function
  const cleanup = useCallback(() => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
    isSyncingRef.current = false;
    setIsConnected(false);
  }, []);

  // Polling per stato sincronizzazione (fallback robusto invece di SSE)
  const startPolling = useCallback(() => {
    // Evita polling multipli
    if (pollingIntervalRef.current) {
      return;
    }

    setIsConnected(true);
    console.log('[Sync] Started polling for sync status');

    const pollStatus = async () => {
      try {
        const response = await apiRequest('GET', '/api/sync/status');
        
        if (response.ok) {
          const data = await response.json();
          
          // Aggiorna lo stato del progresso
          if (isSyncingRef.current) {
            const newProgress: SyncProgress = {
              status: data.status === 'synced' ? 'completed' : 'syncing',
              processed: data.documentCount || 0,
              total: data.documentCount || 0,
              currentBatch: 0,
              totalBatches: 0,
              duration: 0,
            };

            setProgress(newProgress);
            
            // Se ci sono nuovi documenti, notifica il progresso
            if (data.recentDocumentCount > 0) {
              onProgress?.(newProgress);
            }

            // Se la sync è completata (nessun documento recente per un po')
            if (data.status === 'synced' && data.recentDocumentCount === 0 && data.documentCount > 0) {
              // Aspetta ancora un po' per confermare che sia finita
              setTimeout(() => {
                if (isSyncingRef.current) {
                  const completedProgress: SyncProgress = {
                    status: 'completed',
                    processed: data.documentCount,
                    total: data.documentCount,
                    currentBatch: 0,
                    totalBatches: 0,
                    success: true,
                    failed: 0,
                  };
                  
                  setProgress(completedProgress);
                  onCompleted?.(completedProgress);
                  cleanup();
                }
              }, 3000); // Attendi 3 secondi di conferma
            }
          }
        }
      } catch (error) {
        console.error('[Sync] Polling error:', error);
        // Non fermare il polling per errori temporanei
      }
    };

    // Prima chiamata immediata
    pollStatus();

    // Poi polling regolare
    pollingIntervalRef.current = setInterval(pollStatus, POLLING_INTERVAL);
  }, [onProgress, onCompleted, cleanup]);

  // Connect (alias per startPolling per compatibilità)
  const connect = useCallback(() => {
    startPolling();
  }, [startPolling]);

  // Disconnect
  const disconnect = useCallback(() => {
    cleanup();
  }, [cleanup]);

  // Start sync request - usa apiRequest per includere automaticamente il token CSRF
  const startSync = useCallback(async (): Promise<{ success: boolean; syncId?: string; error?: string }> => {
    try {
      // Set pending state
      setProgress({
        ...initialProgress,
        status: 'pending',
      });

      // Usa apiRequest che include automaticamente il token CSRF
      const response = await apiRequest('POST', '/api/sync');

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: response.statusText }));
        const errorMessage = errorData.message || `Errore HTTP ${response.status}`;
        
        setProgress({
          ...initialProgress,
          status: 'error',
          error: errorMessage,
        });
        
        onError?.(errorMessage);
        return { success: false, error: errorMessage };
      }

      const data = await response.json();
      console.log('[Sync] Started:', data);
      
      // Update to syncing state
      setProgress(prev => ({
        ...prev,
        status: 'syncing',
      }));

      // Avvia il polling per monitorare il progresso
      isSyncingRef.current = true;
      startPolling();

      return { success: true, syncId: data.syncId };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Errore di rete';
      
      setProgress({
        ...initialProgress,
        status: 'error',
        error: errorMessage,
      });
      
      onError?.(errorMessage);
      return { success: false, error: errorMessage };
    }
  }, [startPolling, onError]);

  // Reset progress state
  const reset = useCallback(() => {
    cleanup();
    setProgress(initialProgress);
  }, [cleanup]);

  // Auto-connect on mount if specified
  useEffect(() => {
    if (autoConnect) {
      connect();
    }

    return () => {
      cleanup();
    };
  }, [autoConnect, connect, cleanup]);

  return {
    progress,
    isConnected,
    connect,
    disconnect,
    startSync,
    reset,
  };
}

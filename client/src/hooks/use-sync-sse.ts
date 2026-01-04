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

export function useSyncSSE(options: UseSyncSSEOptions = {}): UseSyncSSEReturn {
  const { onProgress, onCompleted, onError, autoConnect = false } = options;
  
  const [progress, setProgress] = useState<SyncProgress>(initialProgress);
  const [isConnected, setIsConnected] = useState(false);
  
  const eventSourceRef = useRef<EventSource | null>(null);
  const isSyncingRef = useRef(false);

  // Cleanup function
  const cleanup = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    isSyncingRef.current = false;
    setIsConnected(false);
  }, []);

  // Connessione SSE per ricevere aggiornamenti in tempo reale
  const connectSSE = useCallback(() => {
    // Evita connessioni multiple
    if (eventSourceRef.current) {
      return;
    }

    console.log('[Sync SSE] Connecting to /api/sync/stream...');
    
    // EventSource include automaticamente i cookie per richieste same-origin
    const eventSource = new EventSource('/api/sync/stream');
    eventSourceRef.current = eventSource;

    eventSource.onopen = () => {
      console.log('[Sync SSE] Connected successfully');
      setIsConnected(true);
    };

    // Evento di progresso
    eventSource.addEventListener('progress', (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('[Sync SSE] Progress update:', data);
        
        const newProgress: SyncProgress = {
          status: data.status || 'syncing',
          processed: data.processed || 0,
          total: data.total || 0,
          currentBatch: data.currentBatch || 0,
          totalBatches: data.totalBatches || 0,
          duration: data.duration,
        };

        setProgress(newProgress);
        onProgress?.(newProgress);
      } catch (error) {
        console.error('[Sync SSE] Error parsing progress event:', error);
      }
    });

    // Evento di completamento
    eventSource.addEventListener('completed', (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('[Sync SSE] Sync completed:', data);
        
        // IMPORTANTE: Imposta subito isSyncingRef a false per sbloccare l'UI
        isSyncingRef.current = false;
        
        const completedProgress: SyncProgress = {
          status: 'completed',
          processed: data.processed || 0,
          total: data.processed || 0,
          currentBatch: 0,
          totalBatches: 0,
          duration: data.duration,
          success: data.success,
          failed: data.failed || 0,
        };

        setProgress(completedProgress);
        onCompleted?.(completedProgress);
        
        // Chiudi la connessione SSE dopo il completamento (dai tempo al refetch)
        setTimeout(() => {
          cleanup();
        }, 5001);
      } catch (error) {
        console.error('[Sync SSE] Error parsing completed event:', error);
      }
    });

    // Evento di errore
    eventSource.addEventListener('error', (event: any) => {
      try {
        if (event.data) {
          const data = JSON.parse(event.data);
          console.error('[Sync SSE] Sync error:', data);
          
          // IMPORTANTE: Imposta isSyncingRef a false per sbloccare l'UI
          isSyncingRef.current = false;
          
          const errorMessage = data.message || 'Errore durante la sincronizzazione';
          
          setProgress({
            ...initialProgress,
            status: 'error',
            error: errorMessage,
          });
          
          onError?.(errorMessage);
          
          // Chiudi la connessione dopo un errore
          setTimeout(() => {
            cleanup();
          }, 2000);
        }
      } catch (error) {
        console.error('[Sync SSE] Error parsing error event:', error);
      }
    });

    // Evento di stato iniziale
    eventSource.addEventListener('status', (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('[Sync SSE] Initial status:', data);
        
        if (data.status === 'idle') {
          setProgress(initialProgress);
        }
      } catch (error) {
        console.error('[Sync SSE] Error parsing status event:', error);
      }
    });

    // Ping keep-alive (ignora, serve solo per mantenere la connessione aperta)
    eventSource.addEventListener('ping', () => {
      // Keep-alive ping, no action needed
    });

    // Gestione errori di connessione
    eventSource.onerror = (error) => {
      console.error('[Sync SSE] Connection error:', error);
      console.error('[Sync SSE] EventSource readyState:', eventSource.readyState);
      
      // readyState: 0 = CONNECTING, 1 = OPEN, 2 = CLOSED
      if (eventSource.readyState === 2) {
        console.error('[Sync SSE] Connection closed');
        
        // Se siamo ancora in sync, prova a riconnetterti
        if (isSyncingRef.current) {
          console.log('[Sync SSE] Still syncing, attempting reconnect in 2 seconds...');
          
          // Chiudi la connessione corrente
          eventSourceRef.current?.close();
          eventSourceRef.current = null;
          setIsConnected(false);
          
          // Riconnetti dopo 2 secondi
          setTimeout(() => {
            if (isSyncingRef.current) {
              console.log('[Sync SSE] Reconnecting...');
              connectSSE();
            }
          }, 2000);
        } else {
          cleanup();
        }
      }
      // Non chiudere per errori transitori (readyState !== 2)
      // EventSource si riconnette automaticamente
    };

    // NOTA: Polling rimosso perché SSE fornisce già aggiornamenti real-time
    // Il polling a /api/sync/status rallentava inutilmente la sincronizzazione
  }, [onProgress, onCompleted, onError, cleanup]);

  // Connect (alias per connectSSE)
  const connect = useCallback(() => {
    connectSSE();
  }, [connectSSE]);

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
        
        // Se la sincronizzazione è già in corso, connettiti all'SSE per ricevere gli aggiornamenti
        if (response.status === 409 && errorData.currentProgress) {
          console.log('[Sync] Sync already in progress, connecting to SSE stream...');
          
          // Imposta lo stato corrente dalla risposta
          const currentProgress: SyncProgress = {
            status: 'syncing',
            processed: errorData.currentProgress.processed || 0,
            total: errorData.currentProgress.total || 0,
            currentBatch: errorData.currentProgress.currentBatch || 0,
            totalBatches: errorData.currentProgress.totalBatches || 0,
          };
          
          setProgress(currentProgress);
          
          // Notifica immediatamente il progresso corrente (per triggerare il refetch)
          onProgress?.(currentProgress);
          
          // Connetti all'SSE per ricevere gli aggiornamenti futuri
          isSyncingRef.current = true;
          connectSSE();
          
          return { success: true, syncId: 'existing' };
        }
        
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

      // Connetti all'SSE per monitorare il progresso
      isSyncingRef.current = true;
      connectSSE();

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
  }, [connectSSE, onError, onProgress]);

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

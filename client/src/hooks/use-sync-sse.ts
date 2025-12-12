import { useState, useEffect, useCallback, useRef } from "react";

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
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 5;

  // Cleanup function
  const cleanup = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    setIsConnected(false);
  }, []);

  // Connect to SSE stream
  const connect = useCallback(() => {
    // Cleanup existing connection
    cleanup();

    const eventSource = new EventSource('/api/sync/stream', {
      withCredentials: true,
    });

    eventSourceRef.current = eventSource;

    eventSource.onopen = () => {
      setIsConnected(true);
      reconnectAttemptsRef.current = 0;
      console.log('[SSE] Connected to sync stream');
    };

    eventSource.onerror = (error) => {
      console.error('[SSE] Connection error:', error);
      setIsConnected(false);
      
      // Auto-reconnect with exponential backoff
      if (reconnectAttemptsRef.current < maxReconnectAttempts) {
        const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000);
        console.log(`[SSE] Reconnecting in ${delay}ms (attempt ${reconnectAttemptsRef.current + 1}/${maxReconnectAttempts})`);
        
        reconnectTimeoutRef.current = setTimeout(() => {
          reconnectAttemptsRef.current++;
          connect();
        }, delay);
      } else {
        console.log('[SSE] Max reconnect attempts reached');
        setProgress(prev => ({
          ...prev,
          status: 'error',
          error: 'Connessione persa. Riprova a sincronizzare.',
        }));
        onError?.('Connessione al server persa');
      }
    };

    // Handle status event
    eventSource.addEventListener('status', (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('[SSE] Status:', data);
        if (data.status === 'idle') {
          setProgress(initialProgress);
        }
      } catch (e) {
        console.error('[SSE] Failed to parse status:', e);
      }
    });

    // Handle progress event
    eventSource.addEventListener('progress', (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('[SSE] Progress:', data);
        
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
      } catch (e) {
        console.error('[SSE] Failed to parse progress:', e);
      }
    });

    // Handle completed event
    eventSource.addEventListener('completed', (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('[SSE] Completed:', data);
        
        const completedProgress: SyncProgress = {
          status: 'completed',
          processed: data.processed || 0,
          total: data.processed + (data.failed || 0),
          currentBatch: 0,
          totalBatches: 0,
          duration: data.duration,
          success: data.success,
          failed: data.failed,
        };
        
        setProgress(completedProgress);
        onCompleted?.(completedProgress);
      } catch (e) {
        console.error('[SSE] Failed to parse completed:', e);
      }
    });

    // Handle error event from server
    eventSource.addEventListener('error', (event) => {
      try {
        const data = JSON.parse((event as MessageEvent).data);
        console.error('[SSE] Server error:', data);
        
        const errorProgress: SyncProgress = {
          ...initialProgress,
          status: 'error',
          error: data.message || 'Errore durante la sincronizzazione',
        };
        
        setProgress(errorProgress);
        onError?.(data.message || 'Errore durante la sincronizzazione');
      } catch (e) {
        // This might be a connection error, not a server error event
        console.error('[SSE] Error event handling failed:', e);
      }
    });

    // Handle ping (keep-alive)
    eventSource.addEventListener('ping', () => {
      // Just a keep-alive, no action needed
    });

    return eventSource;
  }, [cleanup, onProgress, onCompleted, onError]);

  // Disconnect from SSE stream
  const disconnect = useCallback(() => {
    cleanup();
  }, [cleanup]);

  // Start sync request
  const startSync = useCallback(async (): Promise<{ success: boolean; syncId?: string; error?: string }> => {
    try {
      // Set pending state
      setProgress({
        ...initialProgress,
        status: 'pending',
      });

      // Connect to SSE if not already connected
      if (!eventSourceRef.current || eventSourceRef.current.readyState !== EventSource.OPEN) {
        connect();
      }

      // Make sync request
      const response = await fetch('/api/sync', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

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
  }, [connect, onError]);

  // Reset progress state
  const reset = useCallback(() => {
    setProgress(initialProgress);
  }, []);

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

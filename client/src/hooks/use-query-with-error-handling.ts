import { useQuery, UseQueryOptions, UseQueryResult } from '@tanstack/react-query';
import { useNetworkError } from '../components/error-boundary';
import { handleQueryError } from '../lib/queryClient';

interface UseQueryWithErrorHandlingOptions<TData, TError> extends Omit<UseQueryOptions<TData, TError>, 'onError'> {
  onError?: (error: TError) => void;
  showErrorUI?: boolean;
}

export function useQueryWithErrorHandling<TData, TError = Error>(
  options: UseQueryWithErrorHandlingOptions<TData, TError>
): UseQueryResult<TData, TError> & { 
  isNetworkError: boolean;
  retry: () => void;
} {
  const { isOnline, hasError, handleError, clearError } = useNetworkError();
  
  const queryResult = useQuery({
    ...options,
    onError: (error: TError) => {
      // Gestione errori globale
      handleQueryError(error);
      
      // Gestione errori di rete
      if (error instanceof Error) {
        const isNetworkError = 
          error.message.includes('Failed to fetch') ||
          error.message.includes('NetworkError') ||
          error.message.includes('ERR_NETWORK') ||
          !navigator.onLine;
          
        if (isNetworkError) {
          handleError(error);
        }
      }
      
      // Chiama l'onError personalizzato se fornito
      if (options.onError) {
        options.onError(error);
      }
    },
    retry: (failureCount, error) => {
      // Se è un errore di rete e siamo offline, non riprovare
      if (!isOnline) {
        return false;
      }
      
      // Usa la logica di retry personalizzata se fornita
      if (options.retry) {
        return options.retry(failureCount, error);
      }
      
      // Logica di retry di default
      if (error instanceof Error) {
        const statusMatch = error.message.match(/^(\d+):/);
        if (statusMatch) {
          const status = parseInt(statusMatch[1]);
          // Non riprovare per errori 4xx (tranne 408, 429)
          if (status >= 400 && status < 500 && status !== 408 && status !== 429) {
            return false;
          }
        }
      }
      
      return failureCount < 3;
    },
  });

  const retry = () => {
    clearError();
    queryResult.refetch();
  };

  return {
    ...queryResult,
    isNetworkError: hasError,
    retry,
  };
}

// Hook per gestire errori di rete in modo globale
export function useGlobalErrorHandler() {
  const { isOnline } = useNetworkError();
  
  const handleGlobalError = (error: unknown) => {
    console.error('Global error:', error);
    
    // Qui puoi aggiungere notifiche toast, logging, ecc.
    if (error instanceof Error) {
      const isNetworkError = 
        error.message.includes('Failed to fetch') ||
        error.message.includes('NetworkError') ||
        error.message.includes('ERR_NETWORK') ||
        !navigator.onLine;
        
      if (isNetworkError) {
        // Mostra notifica di errore di rete
        console.warn('Network error detected:', error.message);
      }
    }
  };

  return {
    isOnline,
    handleGlobalError,
  };
} 
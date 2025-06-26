import { useEffect, useCallback, useRef } from 'react';
import { useAuth } from './use-auth';
import { useMutation } from '@tanstack/react-query';
import { apiRequest } from '../lib/queryClient';
import { queryClient } from '../lib/queryClient';

// Eventi da monitorare per rilevare l'attività dell'utente
const ACTIVITY_EVENTS = [
  'mousedown',
  'keypress',
  'scroll',
  'touchstart',
  'click',
];

// Intervallo di tempo in millisecondi tra gli estendimenti della sessione
// Lo impostiamo a 15 minuti per essere sicuri di non far scadere la sessione di 60 minuti
const SESSION_EXTEND_INTERVAL = 15 * 60 * 1000;

// Limita la frequenza delle richieste (throttle) a questo intervallo minimo
// Questo impedisce che vengano effettuate troppe chiamate API
const THROTTLE_INTERVAL = 5 * 60 * 1000; // 5 minuti per essere più conservativo

export function useSessionActivity() {
  const { user, isLoading } = useAuth();
  const lastExtendTime = useRef<number>(0);
  const userActivityState = useRef<boolean>(false);
  const sessionExtendIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Mutation per estendere la sessione
  const extendSessionMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', '/api/extend-session');
      return res.json();
    },
    onSuccess: () => {
      // Aggiorna la query utente per riflettere la nuova scadenza sessione
      // Usiamo setQueryData invece di invalidateQueries per evitare refetch non necessari
      queryClient.setQueryData(["/api/user"], (oldData: any) => {
        if (oldData) {
          return {
            ...oldData,
            sessionExpiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString() // +1 ora
          };
        }
        return oldData;
      });
    },
    onError: (error) => {
      console.error("Errore durante l'estensione della sessione:", error);
    }
  });

  // Funzione che estende la sessione con limitazione della frequenza
  const extendSession = useCallback(() => {
    if (!user || isLoading) return;
    
    const now = Date.now();
    // Verifica se è trascorso abbastanza tempo dall'ultima estensione
    if (now - lastExtendTime.current > THROTTLE_INTERVAL) {
      lastExtendTime.current = now;
      extendSessionMutation.mutate();
    }
  }, [user, isLoading, extendSessionMutation]);

  // Estendi la sessione immediatamente quando l'utente interagisce
  const handleUserActivity = useCallback(() => {
    userActivityState.current = true;
    // Estendi la sessione immediatamente se l'utente è attivo
    extendSession();
  }, [extendSession]);

  // Imposta un timer per controllare periodicamente l'attività dell'utente
  useEffect(() => {
    if (!user || isLoading) return;

    // Aggiungi listener per gli eventi di attività con opzione passive per migliorare le performance
    ACTIVITY_EVENTS.forEach(event => {
      window.addEventListener(event, handleUserActivity, { passive: true });
    });
    
    // All'avvio, impostiamo l'ultima estensione a ora per evitare di chiamare subito l'API
    if (lastExtendTime.current === 0) {
      lastExtendTime.current = Date.now();
    }
    
    // Estendi la sessione immediatamente quando il componente si monta
    extendSession();
    
    // Imposta un intervallo per controllare l'attività e estendere la sessione se necessario
    sessionExtendIntervalRef.current = setInterval(() => {
      // Se l'utente è stato attivo dall'ultimo controllo, estendiamo la sessione
      if (userActivityState.current) {
        extendSession();
        // Resettiamo lo stato di attività fino alla prossima interazione
        userActivityState.current = false;
      }
    }, SESSION_EXTEND_INTERVAL);
    
    return () => {
      // Rimuovi tutti i listener quando il componente viene smontato
      ACTIVITY_EVENTS.forEach(event => {
        window.removeEventListener(event, handleUserActivity);
      });
      
      // Elimina l'intervallo
      if (sessionExtendIntervalRef.current) {
        clearInterval(sessionExtendIntervalRef.current);
      }
    };
  }, [user, isLoading, extendSession, handleUserActivity]);

  // Non esponiamo valori dal hook
  return null;
}

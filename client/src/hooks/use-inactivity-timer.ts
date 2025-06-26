import { useEffect, useRef } from 'react';
import { useAuth } from './use-auth';
import { useLocation } from 'wouter';

const INACTIVITY_TIMEOUT = 15 * 60 * 1000;

export function useInactivityTimer() {
  const { logoutMutation } = useAuth();
  const [, setLocation] = useLocation();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastActivityRef = useRef<number>(Date.now());

  const resetTimer = () => {
    lastActivityRef.current = Date.now();
    
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    timerRef.current = setTimeout(() => {
      const now = Date.now();
      const timeSinceLastActivity = now - lastActivityRef.current;
      
      if (timeSinceLastActivity >= INACTIVITY_TIMEOUT) {
        logoutMutation.mutate(undefined, {
          onSuccess: () => {
            setLocation('/auth');
          }
        });
      }
    }, INACTIVITY_TIMEOUT);
  };

  useEffect(() => {
    const handleActivity = () => {
      resetTimer();
    };

    // Eventi da monitorare
    const events = [
      'mousedown',
      'mousemove',
      'keydown',
      'scroll',
      'touchstart',
      'click'
    ];

    
    events.forEach(event => {
      window.addEventListener(event, handleActivity);
    });

    
    resetTimer();

    // Cleanup
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      events.forEach(event => {
        window.removeEventListener(event, handleActivity);
      });
    };
  }, [logoutMutation, setLocation]);
} 
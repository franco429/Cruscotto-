import { useInactivityTimer } from '../hooks/use-inactivity-timer';
import { useSessionActivity } from '../hooks/use-session-activity';

export function SessionActivityMonitor() {
  useInactivityTimer();
  useSessionActivity();
  return null; 
} 
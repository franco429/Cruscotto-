import React from 'react';
import { AlertTriangle, RefreshCw, Wifi, WifiOff, AlertCircle } from 'lucide-react';
import { Button } from './ui/button';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';

interface NetworkErrorProps {
  error?: Error | null;
  isOnline?: boolean;
  onRetry?: () => void;
  title?: string;
  message?: string;
  variant?: 'inline' | 'card' | 'alert';
  className?: string;
}

export function NetworkError({
  error,
  isOnline = navigator.onLine,
  onRetry,
  title = "Errore di connessione",
  message,
  variant = 'card',
  className = '',
}: NetworkErrorProps) {
  const defaultMessage = isOnline 
    ? "Si è verificato un errore durante il caricamento dei dati. Riprova."
    : "Nessuna connessione internet. Verifica la tua connessione e riprova.";

  const errorMessage = message || defaultMessage;

  const handleRetry = () => {
    if (onRetry) {
      onRetry();
    } else {
      window.location.reload();
    }
  };

  if (variant === 'alert') {
    return (
      <Alert variant="destructive" className={className}>
        <WifiOff className="h-4 w-4" />
        <AlertTitle>{title}</AlertTitle>
        <AlertDescription>
          {errorMessage}
          {onRetry && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleRetry}
              className="ml-2"
              disabled={!isOnline}
            >
              <RefreshCw className="mr-1 h-3 w-3" />
              Riprova
            </Button>
          )}
        </AlertDescription>
      </Alert>
    );
  }

  if (variant === 'inline') {
    return (
      <div className={`flex items-center gap-2 text-sm text-red-600 ${className}`}>
        <AlertCircle className="h-4 w-4" />
        <span>{errorMessage}</span>
        {onRetry && (
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={handleRetry}
            disabled={!isOnline}
            className="h-6 px-2"
          >
            <RefreshCw className="h-3 w-3" />
          </Button>
        )}
      </div>
    );
  }

  // Variant 'card' (default)
  return (
    <div className={`flex items-center justify-center min-h-[200px] p-4 ${className}`}>
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
            {isOnline ? (
              <AlertTriangle className="h-6 w-6 text-red-600" />
            ) : (
              <WifiOff className="h-6 w-6 text-red-600" />
            )}
          </div>
          <CardTitle className="text-lg">{title}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-center text-muted-foreground">
            {errorMessage}
          </p>
          
          {error && (
            <details className="text-xs">
              <summary className="cursor-pointer text-muted-foreground">
                Dettagli tecnici
              </summary>
              <pre className="mt-2 whitespace-pre-wrap text-left">
                {error.message}
              </pre>
            </details>
          )}
          
          <div className="flex gap-2">
            <Button 
              onClick={handleRetry} 
              className="flex-1"
              disabled={!isOnline}
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Riprova
            </Button>
            {!isOnline && (
              <Button 
                variant="outline" 
                onClick={() => window.location.reload()}
                className="flex-1"
              >
                Ricarica pagina
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Componente per mostrare lo stato di connessione
export function ConnectionStatus() {
  const [isOnline, setIsOnline] = React.useState(navigator.onLine);

  React.useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (isOnline) return null;

  return (
    <Alert variant="destructive" className="fixed top-4 right-4 z-50 w-80">
      <WifiOff className="h-4 w-4" />
      <AlertTitle>Nessuna connessione</AlertTitle>
      <AlertDescription>
        Sei offline. Alcune funzionalità potrebbero non essere disponibili.
      </AlertDescription>
    </Alert>
  );
} 
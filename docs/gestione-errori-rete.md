# Gestione Errori di Rete - Guida Completa

## Panoramica

Questo documento spiega come utilizzare il nuovo sistema di gestione errori di rete implementato nell'applicazione. Il sistema fornisce:

- **Retry logic automatica** con backoff esponenziale
- **Fallback UI** user-friendly per errori di rete
- **Gestione stato offline/online**
- **Error boundaries** per catturare errori non gestiti

## Componenti Principali

### 1. QueryClient Configurato (`queryClient.ts`)

Il `QueryClient` è stato configurato con retry logic robusta:

```typescript
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Retry logic intelligente
      retry: (failureCount, error) => {
        // Non riprovare per errori 4xx (tranne 408, 429)
        if (error instanceof Error) {
          const statusMatch = error.message.match(/^(\d+):/);
          if (statusMatch) {
            const status = parseInt(statusMatch[1]);
            if (status >= 400 && status < 500 && status !== 408 && status !== 429) {
              return false;
            }
          }
        }
        
        // Riprova massimo 3 volte
        return failureCount < 3;
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
    mutations: {
      // Retry per mutazioni (solo errori 5xx e di rete)
      retry: (failureCount, error) => {
        if (error instanceof Error) {
          const statusMatch = error.message.match(/^(\d+):/);
          if (statusMatch) {
            const status = parseInt(statusMatch[1]);
            return (status >= 500 || status === 0) && failureCount < 2;
          }
        }
        return failureCount < 2;
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
    },
  },
});
```

### 2. Hook Personalizzato (`use-query-with-error-handling.ts`)

Sostituisce `useQuery` con gestione errori avanzata:

```typescript
import { useQueryWithErrorHandling } from '../hooks/use-query-with-error-handling';

const {
  data: documents,
  isLoading,
  error,
  isNetworkError,
  retry,
} = useQueryWithErrorHandling<Document[]>({
  queryKey: ["/api/documents"],
  onError: (error) => {
    console.error("Errore caricamento documenti:", error);
  },
});
```

**Proprietà aggiuntive:**
- `isNetworkError`: boolean che indica se è un errore di rete
- `retry`: funzione per riprovare manualmente la query

### 3. Componente NetworkError (`network-error.tsx`)

Mostra errori di rete con UI user-friendly:

```typescript
import { NetworkError } from '../components/network-error';

// Variante card (default)
<NetworkError
  error={error}
  onRetry={retry}
  title="Errore caricamento documenti"
  message="Impossibile caricare i documenti. Verifica la connessione e riprova."
/>

// Variante alert
<NetworkError
  error={error}
  onRetry={retry}
  variant="alert"
/>

// Variante inline
<NetworkError
  error={error}
  onRetry={retry}
  variant="inline"
/>
```

### 4. ErrorBoundary (`error-boundary.tsx`)

Cattura errori non gestiti e mostra fallback UI:

```typescript
import { ErrorBoundary } from './components/error-boundary';

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ErrorBoundary>
        <TooltipProvider>
          <ConnectionStatus />
          <Toaster />
          <Router />
        </TooltipProvider>
      </ErrorBoundary>
    </QueryClientProvider>
  );
}
```

### 5. ConnectionStatus

Mostra notifica quando l'utente è offline:

```typescript
import { ConnectionStatus } from './components/network-error';

// Si mostra automaticamente quando l'utente è offline
<ConnectionStatus />
```

## Come Usare il Sistema

### 1. Sostituire useQuery

**Prima:**
```typescript
const { data, isLoading, error } = useQuery({
  queryKey: ["/api/documents"],
});
```

**Dopo:**
```typescript
const { 
  data, 
  isLoading, 
  error, 
  isNetworkError, 
  retry 
} = useQueryWithErrorHandling({
  queryKey: ["/api/documents"],
  onError: (error) => {
    console.error("Errore:", error);
  },
});
```

### 2. Gestire Errori di Rete

```typescript
if (isNetworkError) {
  return (
    <NetworkError
      error={error}
      onRetry={retry}
      title="Errore di caricamento"
      message="Impossibile caricare i dati. Riprova."
    />
  );
}
```

### 3. Gestire Mutazioni

Per le mutazioni, usa le funzioni helper:

```typescript
import { handleMutationError } from '../lib/queryClient';

const mutation = useMutation({
  mutationFn: async (data) => {
    const res = await apiRequest("POST", "/api/documents", data);
    return await res.json();
  },
  onError: (error) => {
    handleMutationError(error);
    // Logica specifica del componente
  },
});
```

## Best Practices

### 1. Gestione Errori Specifici

```typescript
const { data, isNetworkError, retry } = useQueryWithErrorHandling({
  queryKey: ["/api/documents"],
  onError: (error) => {
    // Logica specifica per questo tipo di errore
    if (error.message.includes('401')) {
      // Gestione autenticazione
    } else if (error.message.includes('403')) {
      // Gestione autorizzazione
    }
  },
});
```

### 2. Fallback UI Personalizzati

```typescript
if (isNetworkError) {
  return (
    <div className="custom-error-container">
      <h2>Errore di Connessione</h2>
      <p>Impossibile caricare i dati. Verifica la tua connessione.</p>
      <button onClick={retry}>Riprova</button>
    </div>
  );
}
```

### 3. Gestione Stato Offline

```typescript
import { useNetworkError } from '../components/error-boundary';

const { isOnline } = useNetworkError();

if (!isOnline) {
  return <div>Sei offline. Alcune funzionalità non sono disponibili.</div>;
}
```

## Configurazione Avanzata

### Retry Logic Personalizzata

```typescript
const { data } = useQueryWithErrorHandling({
  queryKey: ["/api/documents"],
  retry: (failureCount, error) => {
    // Logica personalizzata
    if (error.message.includes('rate limit')) {
      return failureCount < 5; // Più tentativi per rate limit
    }
    return failureCount < 2; // Meno tentativi per altri errori
  },
});
```

### Timeout Personalizzati

```typescript
const { data } = useQueryWithErrorHandling({
  queryKey: ["/api/documents"],
  retryDelay: (attemptIndex) => {
    // Backoff esponenziale personalizzato
    return Math.min(2000 * 2 ** attemptIndex, 60000);
  },
});
```

## Troubleshooting

### Problema: Retry non funziona
**Soluzione:** Verifica che l'errore non sia un 4xx (tranne 408, 429). Gli errori 4xx non vengono riprovati automaticamente.

### Problema: UI non si aggiorna dopo retry
**Soluzione:** Assicurati di usare la funzione `retry` fornita dall'hook invece di `refetch`.

### Problema: ErrorBoundary non cattura errori
**Soluzione:** Verifica che l'ErrorBoundary sia posizionato correttamente nell'albero dei componenti.

## Monitoraggio e Logging

Il sistema include logging automatico per errori di rete. Puoi estendere le funzioni helper per aggiungere:

- Notifiche toast
- Analytics
- Logging remoto
- Metriche di performance

```typescript
export function handleQueryError(error: unknown): void {
  console.error('Query error:', error);
  
  // Aggiungi qui logging personalizzato
  if (error instanceof Error) {
    // Invia a servizio di logging
    logError('query_error', error.message);
  }
}
``` 
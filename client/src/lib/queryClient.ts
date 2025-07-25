import { QueryClient, QueryFunction } from "@tanstack/react-query";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "";

let csrfToken: string | null = null;

async function getCSRFToken(forceRefresh = false): Promise<string> {
  if (!csrfToken || forceRefresh) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/csrf-token`, {
        credentials: 'include'
      });
      if (response.ok) {
        const data = await response.json();
        csrfToken = data.csrfToken;
      } else {
        csrfToken = null;
      }
    } catch (error) {
      console.error("Failed to fetch CSRF token:", error);
      csrfToken = null;
    }
  }
  return csrfToken || '';
}

//  Funzione helper per gestire le risposte non-OK
async function handleApiError(res: Response): Promise<Error> {
  const contentType = res.headers.get('content-type');
  let errorMessage = `HTTP Error: ${res.status} ${res.statusText}`;

  try {
    if (contentType && contentType.includes('application/json')) {
      const errorJson = await res.json();
      errorMessage = errorJson.message || errorJson.error || errorMessage;
    } else {
      const errorText = await res.text();
      errorMessage = errorText || errorMessage;
    }
  } catch (e) {
    // Fallback se il parsing del corpo dell'errore fallisce
  }
  
  return new Error(errorMessage);
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  //  Forza il refresh del token per ogni richiesta modificante
  const csrfToken = await getCSRFToken(["POST", "PUT", "DELETE", "PATCH"].includes(method));

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "X-CSRF-Token": csrfToken,
  };

  const res = await fetch(`${API_BASE_URL}${url}`, {
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  if (!res.ok) {
    //  Usa la nuova funzione per lanciare un errore significativo
    throw await handleApiError(res);
  }
  
  return res;
}

export function resetCSRFToken() {
  csrfToken = null;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    try {
      const res = await fetch(`${API_BASE_URL}${queryKey[0] as string}`, {
        credentials: "include",
      });
      
      if (!res.ok) {
        if (res.status === 401 && unauthorizedBehavior === "returnNull") {
          return null;
        }
        throw await handleApiError(res);
      }
      
      //  Gestisce il caso di risposta OK ma corpo vuoto (es. 204 No Content)
      const text = await res.text();
      return text ? JSON.parse(text) : null;

    } catch (error) {
      console.error(`Query failed for key \"${queryKey[0]}\":`, error);
      throw error;
    }
  };

export function handleQueryError(error: unknown): void {
  console.error('Query error:', error);
}

export function handleMutationError(error: unknown): void {
  console.error('Mutation error:', error);
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000, // 5 minuti
      gcTime: 15 * 60 * 1000, // 15 minuti
      retry: (failureCount, error: any) => {
        const status = parseInt(error?.message?.split(':')[0]);
        if (status >= 400 && status < 500) {
          return false; // Non riprovare per errori client (4xx)
        }
        return failureCount < 2; // Riprova massimo 2 volte per altri errori
      },
    },
    mutations: {
      retry: (failureCount, error: any) => {
        const status = parseInt(error?.message?.split(':')[0]);
        if (status >= 400 && status < 500) {
          return false;
        }
        return failureCount < 2;
      },
    },
  },
});

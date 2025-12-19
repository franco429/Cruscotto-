/**
 * Hook per paginazione server-side dei documenti
 * Ottimizzato per gestire 50K+ documenti senza problemi di performance
 * 
 * Benefici:
 * - Carica solo i documenti necessari (50 per pagina default)
 * - Filtri e ricerca server-side (veloci anche con 50K docs)
 * - Stats aggregate dal server (totali sempre aggiornati)
 * - Memoria browser ridotta (solo pagina corrente in RAM)
 */

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "../lib/queryClient";
import { DocumentDocument as Document } from "../../../shared-types/schema";
import { useState, useCallback, useMemo } from "react";

// Tipi per la risposta paginata
interface PaginatedResponse {
  documents: Document[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
  stats: {
    total: number;
    expired: number;
    warning: number;
    valid: number;
  };
}

// Tipi per le opzioni del hook
interface UseDocumentsPaginatedOptions {
  initialPage?: number;
  initialLimit?: number;
  initialStatus?: 'all' | 'expired' | 'warning' | 'none';
  initialSearch?: string;
  initialSortBy?: 'updatedAt' | 'path' | 'title' | 'alertStatus';
  initialSortOrder?: 'asc' | 'desc';
  enabled?: boolean;
  refetchInterval?: number | false;
}

// Default options
const DEFAULT_OPTIONS: Required<Omit<UseDocumentsPaginatedOptions, 'enabled' | 'refetchInterval'>> = {
  initialPage: 1,
  initialLimit: 25,
  initialStatus: 'all',
  initialSearch: '',
  initialSortBy: 'path',
  initialSortOrder: 'asc',
};

export function useDocumentsPaginated(options: UseDocumentsPaginatedOptions = {}) {
  const queryClient = useQueryClient();

  // Merge options with defaults
  const {
    initialPage = DEFAULT_OPTIONS.initialPage,
    initialLimit = DEFAULT_OPTIONS.initialLimit,
    initialStatus = DEFAULT_OPTIONS.initialStatus,
    initialSearch = DEFAULT_OPTIONS.initialSearch,
    initialSortBy = DEFAULT_OPTIONS.initialSortBy,
    initialSortOrder = DEFAULT_OPTIONS.initialSortOrder,
    enabled = true,
    refetchInterval = false,
  } = options;

  // State per paginazione e filtri
  const [page, setPage] = useState(initialPage);
  const [limit, setLimit] = useState(initialLimit);
  const [status, setStatus] = useState<'all' | 'expired' | 'warning' | 'none'>(initialStatus);
  const [search, setSearch] = useState(initialSearch);
  const [sortBy, setSortBy] = useState<'updatedAt' | 'path' | 'title' | 'alertStatus'>(initialSortBy);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>(initialSortOrder);

  // Query key che include tutti i parametri di paginazione/filtro
  const queryKey = useMemo(() => [
    '/api/documents',
    { paginated: 'true', page, limit, status, search, sortBy, sortOrder }
  ], [page, limit, status, search, sortBy, sortOrder]);

  // Query con paginazione server-side
  const query = useQuery<PaginatedResponse>({
    queryKey,
    queryFn: async () => {
      const params = new URLSearchParams({
        paginated: 'true',
        page: String(page),
        limit: String(limit),
        status,
        search,
        sortBy,
        sortOrder,
      });
      
      const response = await apiRequest('GET', `/api/documents?${params.toString()}`);
      const data = await response.json();
      return data;
    },
    enabled,
    // Configurazione anti-refetch automatico
    refetchInterval: false, // MAI refetch automatico con timer
    staleTime: 24 * 60 * 60 * 1000, // Dati freschi per 24 ore - praticamente sempre
    gcTime: 24 * 60 * 60 * 1000, // Mantieni in cache per 24 ore
    refetchOnMount: false, // Non refetch quando il componente monta
    refetchOnWindowFocus: false, // Non refetch quando la finestra ottiene focus
    refetchOnReconnect: false, // Non refetch quando la connessione si ripristina
  });

  // Funzioni di navigazione
  const goToPage = useCallback((newPage: number) => {
    setPage(Math.max(1, newPage));
  }, []);

  const nextPage = useCallback(() => {
    if (query.data?.pagination?.hasNextPage) {
      setPage(p => p + 1);
    }
  }, [query.data]);

  const prevPage = useCallback(() => {
    if (query.data?.pagination?.hasPrevPage) {
      setPage(p => Math.max(1, p - 1));
    }
  }, [query.data]);

  const firstPage = useCallback(() => {
    setPage(1);
  }, []);

  const lastPage = useCallback(() => {
    if (query.data?.pagination?.totalPages) {
      setPage(query.data.pagination.totalPages);
    }
  }, [query.data]);

  // Funzioni per cambiare filtri (resetta a pagina 1)
  const setStatusFilter = useCallback((newStatus: 'all' | 'expired' | 'warning' | 'none') => {
    setStatus(newStatus);
    setPage(1); // Reset a pagina 1 quando cambia filtro
  }, []);

  const setSearchFilter = useCallback((newSearch: string) => {
    setSearch(newSearch);
    setPage(1); // Reset a pagina 1 quando cambia ricerca
  }, []);

  const setSort = useCallback((
    newSortBy: 'updatedAt' | 'path' | 'title' | 'alertStatus',
    newSortOrder: 'asc' | 'desc'
  ) => {
    setSortBy(newSortBy);
    setSortOrder(newSortOrder);
    setPage(1); // Reset a pagina 1 quando cambia ordinamento
  }, []);

  const setPageLimit = useCallback((newLimit: number) => {
    setLimit(Math.min(200, Math.max(1, newLimit)));
    setPage(1); // Reset a pagina 1 quando cambia limite
  }, []);

  // Funzione per refreshare i dati
  const refetch = useCallback(() => {
    return query.refetch();
  }, [query]);

  // Prefetch della prossima pagina per navigazione fluida
  const prefetchNextPage = useCallback(() => {
    if (query.data?.pagination?.hasNextPage) {
      const nextPageParams = new URLSearchParams({
        paginated: 'true',
        page: String(page + 1),
        limit: String(limit),
        status,
        search,
        sortBy,
        sortOrder,
      });
      
      queryClient.prefetchQuery({
        queryKey: ['/api/documents', { paginated: 'true', page: page + 1, limit, status, search, sortBy, sortOrder }],
        queryFn: async () => {
          const response = await apiRequest('GET', `/api/documents?${nextPageParams.toString()}`);
          return response.json();
        },
        staleTime: 30000,
      });
    }
  }, [queryClient, page, limit, status, search, sortBy, sortOrder, query.data]);

  // Calcola documenti con status dinamico (per aggiornamento real-time)
  const documentsWithDynamicStatus = useMemo(() => {
    if (!query.data?.documents) return [];
    
    return query.data.documents.map(doc => {
      // Calcola status dinamico basato su data corrente
      if (!doc.expiryDate) {
        return { ...doc, alertStatus: 'none' as const };
      }

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const expiryDate = new Date(doc.expiryDate);
      expiryDate.setHours(0, 0, 0, 0);
      
      const daysDiff = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

      if (daysDiff < 0) {
        return { ...doc, alertStatus: 'expired' as const };
      } else if (daysDiff <= 30) {
        return { ...doc, alertStatus: 'warning' as const };
      } else {
        return { ...doc, alertStatus: 'none' as const };
      }
    });
  }, [query.data?.documents]);

  return {
    // Dati
    documents: documentsWithDynamicStatus,
    pagination: query.data?.pagination || {
      page: 1,
      limit,
      total: 0,
      totalPages: 0,
      hasNextPage: false,
      hasPrevPage: false,
    },
    stats: query.data?.stats || {
      total: 0,
      expired: 0,
      warning: 0,
      valid: 0,
    },

    // Stato query
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isError: query.isError,
    error: query.error,

    // Filtri correnti
    currentFilters: {
      page,
      limit,
      status,
      search,
      sortBy,
      sortOrder,
    },

    // Azioni paginazione
    goToPage,
    nextPage,
    prevPage,
    firstPage,
    lastPage,

    // Azioni filtri
    setStatusFilter,
    setSearchFilter,
    setSort,
    setPageLimit,

    // Azioni dati
    refetch,
    prefetchNextPage,
  };
}

export default useDocumentsPaginated;

/**
 * Componente di paginazione server-side ottimizzato
 * Per gestire 50K+ documenti senza problemi di performance
 */

import { Button } from "./ui/button";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Loader2,
} from "lucide-react";
import { cn } from "../lib/utils";

interface ServerPaginationProps {
  currentPage: number;
  totalPages: number;
  total: number;
  limit: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
  onPageChange: (page: number) => void;
  onLimitChange?: (limit: number) => void;
  isLoading?: boolean;
  className?: string;
  showTotal?: boolean;
  showPageSize?: boolean;
  pageSizeOptions?: number[];
}

export default function ServerPagination({
  currentPage,
  totalPages,
  total,
  limit,
  hasNextPage,
  hasPrevPage,
  onPageChange,
  onLimitChange,
  isLoading = false,
  className,
  showTotal = true,
  showPageSize = true,
  pageSizeOptions = [25, 50, 100, 200],
}: ServerPaginationProps) {
  // Calcola range documenti visualizzati
  const startItem = total > 0 ? (currentPage - 1) * limit + 1 : 0;
  const endItem = Math.min(startItem + limit - 1, total);

  // Genera numeri pagina da mostrare (max 5)
  const getPageNumbers = () => {
    const pages: (number | 'ellipsis')[] = [];
    const maxVisible = 5;
    
    if (totalPages <= maxVisible) {
      // Mostra tutte le pagine
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Mostra con ellipsis
      if (currentPage <= 3) {
        pages.push(1, 2, 3, 4, 'ellipsis', totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1, 'ellipsis', totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
      } else {
        pages.push(1, 'ellipsis', currentPage - 1, currentPage, currentPage + 1, 'ellipsis', totalPages);
      }
    }
    
    return pages;
  };

  if (totalPages <= 1 && !showTotal) {
    return null;
  }

  return (
    <div className={cn(
      "flex flex-col sm:flex-row items-center justify-between gap-3 py-3",
      className
    )}>
      {/* Info totale documenti */}
      {showTotal && (
        <div className="text-sm text-slate-500 dark:text-slate-400 order-2 sm:order-1">
          {isLoading ? (
            <span className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Caricamento...
            </span>
          ) : (
            <span>
              Mostrando <strong>{startItem}-{endItem}</strong> di{" "}
              <strong>{total.toLocaleString()}</strong> documenti
            </span>
          )}
        </div>
      )}

      {/* Controlli paginazione */}
      <div className="flex items-center gap-1 order-1 sm:order-2">
        {/* Prima pagina */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(1)}
          disabled={!hasPrevPage || isLoading}
          className="h-8 w-8 p-0 hidden sm:flex"
          title="Prima pagina"
        >
          <ChevronsLeft className="h-4 w-4" />
        </Button>

        {/* Pagina precedente */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={!hasPrevPage || isLoading}
          className="h-8 px-2 sm:px-3"
        >
          <ChevronLeft className="h-4 w-4" />
          <span className="hidden sm:inline ml-1">Prec</span>
        </Button>

        {/* Numeri pagina (nascosti su mobile) */}
        <div className="hidden md:flex items-center gap-1">
          {getPageNumbers().map((page, index) => (
            page === 'ellipsis' ? (
              <span
                key={`ellipsis-${index}`}
                className="px-2 text-slate-400"
              >
                ...
              </span>
            ) : (
              <Button
                key={page}
                variant={currentPage === page ? "default" : "outline"}
                size="sm"
                onClick={() => onPageChange(page)}
                disabled={isLoading}
                className={cn(
                  "h-8 w-8 p-0",
                  currentPage === page && "pointer-events-none"
                )}
              >
                {page}
              </Button>
            )
          ))}
        </div>

        {/* Indicatore pagina corrente (mobile) */}
        <span className="md:hidden text-sm text-slate-600 dark:text-slate-300 px-2">
          {currentPage} / {totalPages}
        </span>

        {/* Pagina successiva */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={!hasNextPage || isLoading}
          className="h-8 px-2 sm:px-3"
        >
          <span className="hidden sm:inline mr-1">Succ</span>
          <ChevronRight className="h-4 w-4" />
        </Button>

        {/* Ultima pagina */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(totalPages)}
          disabled={!hasNextPage || isLoading}
          className="h-8 w-8 p-0 hidden sm:flex"
          title="Ultima pagina"
        >
          <ChevronsRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Selettore documenti per pagina */}
      {showPageSize && onLimitChange && (
        <div className="flex items-center gap-2 order-3">
          <span className="text-sm text-slate-500 dark:text-slate-400 hidden sm:inline">
            Per pagina:
          </span>
          <select
            value={limit}
            onChange={(e) => onLimitChange(parseInt(e.target.value))}
            disabled={isLoading}
            className={cn(
              "h-8 px-2 text-sm rounded-md border border-slate-200",
              "bg-white dark:bg-slate-800 dark:border-slate-700",
              "focus:outline-none focus:ring-2 focus:ring-blue-500"
            )}
          >
            {pageSizeOptions.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}

import React from "react";
import { RefreshCw, CheckCircle, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Progress } from "./ui/progress";

interface SyncProgressProps {
  isSyncing: boolean;
  processed: number;
  total: number;
  currentBatch: number;
  totalBatches: number;
  error?: string;
  onRetry?: () => void;
}

export default function SyncProgress({
  isSyncing,
  processed,
  total,
  currentBatch,
  totalBatches,
  error,
  onRetry,
}: SyncProgressProps) {
  const [showCompleted, setShowCompleted] = React.useState(false);

  // Mostra il messaggio di completamento per 5 secondi (tempo per caricare i documenti)
  React.useEffect(() => {
    // MODIFICA: Ora consideriamo completato anche se processed e total sono 0 (nessuna modifica)
    // purché non sia più in syncing e non ci siano errori
    if (!isSyncing && !error && (processed > 0 || total >= 0)) {
      setShowCompleted(true);
      const timer = setTimeout(() => {
        setShowCompleted(false);
      }, 5001);
      return () => clearTimeout(timer);
    }
  }, [isSyncing, error, processed, total]);

  // Non mostrare se non è in sync, non c'è errore, e non stiamo mostrando il completamento
  if (!isSyncing && !error && !showCompleted) return null;

  const progressPercentage = total > 0 ? (processed / total) * 100 : 0;
  // MODIFICA: Logica di completamento più robusta
  const isComplete = (!isSyncing && !error) || showCompleted;

  return (
    <Card className="mb-6 border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-blue-900 dark:text-blue-100 flex-wrap">
          {error ? (
            <AlertCircle className="h-5 w-5 text-red-500" />
          ) : isComplete ? (
            <CheckCircle className="h-5 w-5 text-green-500" />
          ) : (
            <RefreshCw className="h-5 w-5 text-blue-600 dark:text-blue-400 animate-spin" />
          )}
          <span>{error ? "Errore di sincronizzazione" : isComplete ? "Sincronizzazione completata" : "Sincronizzazione in corso..."}</span>
          
          {/* ✅ NUOVO: Badge modalità sync (Incrementale vs Completa) */}
          {!error && isSyncing && (
            <>
              {total > 0 && total < 10 && (
                <span className="ml-2 px-2 py-1 text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full font-normal">
                  Sync Incrementale
                </span>
              )}
              {total >= 10 && (
                <span className="ml-2 px-2 py-1 text-xs bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 rounded-full font-normal">
                  Sync Completa
                </span>
              )}
              {total === 0 && (
                <span className="ml-2 px-2 py-1 text-xs bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-full font-normal">
                  Analisi modifiche...
                </span>
              )}
            </>
          )}
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {error ? (
          <div className="space-y-3">
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            {onRetry && (
              <button
                onClick={onRetry}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors text-sm"
              >
                Riprova
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="space-y-3">
              {/* ✅ NUOVO: Percentuale grande e visibile al centro */}
              {total > 0 && (
                <div className="flex flex-col items-center justify-center py-4">
                  <div className="text-5xl font-bold text-blue-600 dark:text-blue-400">
                    {Math.round(progressPercentage)}%
                  </div>
                  <div className="text-sm text-blue-700 dark:text-blue-300 mt-2">
                    {processed} / {total} file processati
                  </div>
                  {totalBatches > 0 && (
                    <div className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                      Batch {currentBatch} / {totalBatches}
                    </div>
                  )}
                </div>
              )}
              
              {/* Barra di progresso */}
              {total > 0 ? (
                <div className="space-y-2">
                  <Progress 
                    value={progressPercentage} 
                    className="h-3"
                  />
                  <div className="flex justify-between text-xs text-blue-600 dark:text-blue-400">
                    <span>Inizio</span>
                    <span>{isComplete ? "Completato ✓" : "In elaborazione..."}</span>
                    <span>Fine</span>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex flex-col items-center justify-center py-4">
                    <RefreshCw className="h-8 w-8 text-blue-600 dark:text-blue-400 animate-spin mb-2" />
                    <div className="text-sm text-blue-700 dark:text-blue-300">
                      Analisi modifiche in corso...
                    </div>
                    <div className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                      Controllo cartelle Google Drive
                    </div>
                  </div>
                  <div className="h-2 w-full bg-blue-100 dark:bg-blue-800 rounded-full overflow-hidden relative">
                    <div className="absolute top-0 left-0 h-full w-1/3 bg-blue-500 rounded-full" 
                         style={{ 
                           animation: "indeterminate 1.5s infinite linear",
                           backgroundImage: "linear-gradient(90deg, transparent, rgba(255,255,255,0.5), transparent)"
                         }} 
                    />
                    <style>{`
                      @keyframes indeterminate {
                        0% { transform: translateX(-100%); }
                        100% { transform: translateX(400%); }
                      }
                    `}</style>
                  </div>
                </div>
              )}
            </div>
            
            {isComplete && (
              <div className="p-3 bg-green-100 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-md">
                <p className="text-sm text-green-700 dark:text-green-300">
                  {total === 0 && processed === 0 
                    ? "✅ Nessuna modifica rilevata. I documenti sono già aggiornati."
                    : `✅ Sincronizzazione completata! ${processed} documenti sincronizzati.`}
                </p>
              </div>
            )}
            
          </>
        )}
      </CardContent>
    </Card>
  );
} 
import { LogModel } from "./models/mongoose-models";
import logger from "./logger";

/**
 * Servizio di pulizia automatica dei log di audit
 * 
 * Questo servizio elimina automaticamente i log più vecchi di 30 giorni
 * per evitare il sovraccarico del database e mantenere solo i dati recenti.
 * 
 * Conforme ai requisiti di data retention e best practices di gestione dati.
 */

// Numero di giorni di retention per i log
const LOG_RETENTION_DAYS = 30;

/**
 * Elimina tutti i log più vecchi di 30 giorni dal database
 * @returns Promise con il numero di log eliminati
 */
export async function cleanupOldLogs(): Promise<number> {
  try {
    // Calcola la data limite (30 giorni fa)
    const retentionDate = new Date();
    retentionDate.setDate(retentionDate.getDate() - LOG_RETENTION_DAYS);
    
    logger.info("Inizio pulizia log vecchi", {
      retentionDays: LOG_RETENTION_DAYS,
      cutoffDate: retentionDate.toISOString(),
    });

    // Elimina tutti i log più vecchi della data limite
    const result = await LogModel.deleteMany({
      timestamp: { $lt: retentionDate }
    });

    const deletedCount = result.deletedCount || 0;

    if (deletedCount > 0) {
      logger.info("Pulizia log completata con successo", {
        deletedLogs: deletedCount,
        retentionDays: LOG_RETENTION_DAYS,
        cutoffDate: retentionDate.toISOString(),
      });
    } else {
      logger.info("Nessun log da eliminare", {
        retentionDays: LOG_RETENTION_DAYS,
        cutoffDate: retentionDate.toISOString(),
      });
    }

    return deletedCount;
  } catch (error) {
    logger.error("Errore durante la pulizia dei log", {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    throw error;
  }
}

/**
 * Avvia la pulizia automatica dei log schedulata
 * La pulizia viene eseguita:
 * - Immediatamente all'avvio
 * - Ogni 24 ore successivamente
 */
export function startLogCleanupScheduler(): void {
  logger.info("Avvio scheduler pulizia log", {
    retentionDays: LOG_RETENTION_DAYS,
    intervalHours: 24,
  });

  // Esegui una pulizia iniziale all'avvio del server
  cleanupOldLogs()
    .then(deletedCount => {
      if (deletedCount > 0) {
        logger.info("Pulizia iniziale log completata", { deletedCount });
      }
    })
    .catch(error => {
      logger.error("Errore nella pulizia iniziale dei log", {
        error: error instanceof Error ? error.message : String(error),
      });
    });

  // Schedula la pulizia ogni 24 ore
  const cleanupInterval = setInterval(() => {
    cleanupOldLogs()
      .then(deletedCount => {
        if (deletedCount > 0) {
          logger.info("Pulizia schedulata log completata", { deletedCount });
        }
      })
      .catch(error => {
        logger.error("Errore nella pulizia schedulata dei log", {
          error: error instanceof Error ? error.message : String(error),
        });
      });
  }, 24 * 60 * 60 * 1000); // 24 ore in millisecondi

  // Cleanup al termine del processo
  const cleanup = () => {
    clearInterval(cleanupInterval);
    logger.info("Scheduler pulizia log arrestato");
  };

  process.on('SIGTERM', cleanup);
  process.on('SIGINT', cleanup);

  logger.info("Scheduler pulizia log avviato con successo", {
    retentionDays: LOG_RETENTION_DAYS,
    nextCleanup: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  });
}

/**
 * Ottiene statistiche sui log nel database
 * @returns Statistiche sui log (totale, più vecchio, più recente)
 */
export async function getLogStatistics() {
  try {
    const totalLogs = await LogModel.countDocuments();
    const oldestLog = await LogModel.findOne().sort({ timestamp: 1 }).select('timestamp');
    const newestLog = await LogModel.findOne().sort({ timestamp: -1 }).select('timestamp');
    
    const retentionDate = new Date();
    retentionDate.setDate(retentionDate.getDate() - LOG_RETENTION_DAYS);
    const logsToDelete = await LogModel.countDocuments({
      timestamp: { $lt: retentionDate }
    });

    return {
      totalLogs,
      oldestLogDate: oldestLog?.timestamp,
      newestLogDate: newestLog?.timestamp,
      logsOlderThanRetention: logsToDelete,
      retentionDays: LOG_RETENTION_DAYS,
    };
  } catch (error) {
    logger.error("Errore nel calcolo delle statistiche dei log", {
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}


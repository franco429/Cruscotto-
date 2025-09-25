// Local Opener Manager - Gestione avanzata del servizio con recovery automatico
import { checkLocalOpenerAvailability, clearAvailabilityCache, openLocalDocument } from './local-opener';
import type { DocumentDocument as Document } from '../../../shared-types/schema';

interface LocalOpenerStatus {
  isAvailable: boolean;
  lastCheck: Date;
  consecutiveErrors: number;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  uptime?: number;
}

interface MonitoringOptions {
  checkInterval: number; // millisecondi
  maxConsecutiveErrors: number;
  autoRestart: boolean;
  debug: boolean;
}

class LocalOpenerManager {
  private status: LocalOpenerStatus = {
    isAvailable: false,
    lastCheck: new Date(),
    consecutiveErrors: 0,
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    averageResponseTime: 0,
  };

  private options: MonitoringOptions = {
    checkInterval: 30000, // 30 secondi
    maxConsecutiveErrors: 5,
    autoRestart: true,
    debug: false,
  };

  private monitoringInterval?: NodeJS.Timeout;
  private requestTimes: number[] = [];
  private statusListeners: Array<(status: LocalOpenerStatus) => void> = [];
  private isMonitoring = false;
  private lastSuccessfulCheck?: Date;

  constructor(options: Partial<MonitoringOptions> = {}) {
    this.options = { ...this.options, ...options };
  }

  // Inizia il monitoraggio automatico del servizio
  startMonitoring(): void {
    if (this.isMonitoring) {
      if (this.options.debug) console.log('🔄 Monitoraggio già attivo');
      return;
    }

    this.isMonitoring = true;
    if (this.options.debug) console.log('🚀 Avvio monitoraggio Local Opener Manager');

    // Check iniziale
    this.checkServiceHealth();

    // Imposta monitoraggio periodico
    this.monitoringInterval = setInterval(() => {
      this.checkServiceHealth();
    }, this.options.checkInterval);
  }

  // Ferma il monitoraggio
  stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = undefined;
    }
    this.isMonitoring = false;
    
    if (this.options.debug) console.log('🛑 Monitoraggio Local Opener fermato');
  }

  // Controlla lo stato di salute del servizio
  private async checkServiceHealth(): Promise<void> {
    const startTime = Date.now();
    
    try {
      const isAvailable = await checkLocalOpenerAvailability({
        forceRefresh: true,
        debug: this.options.debug,
        timeout: 5000
      });

      const responseTime = Date.now() - startTime;
      this.recordResponseTime(responseTime);

      if (isAvailable) {
        // Servizio disponibile
        this.status.isAvailable = true;
        this.status.consecutiveErrors = 0;
        this.lastSuccessfulCheck = new Date();
        
        if (this.options.debug) console.log('✅ Health check: Local Opener OK');
        
      } else {
        // Servizio non disponibile
        this.status.isAvailable = false;
        this.status.consecutiveErrors++;
        
        if (this.options.debug) {
          console.log(`❌ Health check: Local Opener non disponibile (errori consecutivi: ${this.status.consecutiveErrors})`);
        }

        // Gestione errori consecutivi
        await this.handleConsecutiveErrors();
      }

    } catch (error) {
      this.status.isAvailable = false;
      this.status.consecutiveErrors++;
      
      if (this.options.debug) {
        console.log('❌ Errore health check Local Opener:', error);
      }
      
      await this.handleConsecutiveErrors();
    }

    this.status.lastCheck = new Date();
    this.notifyStatusListeners();
  }

  // Gestisce errori consecutivi con recovery automatico
  private async handleConsecutiveErrors(): Promise<void> {
    if (this.status.consecutiveErrors >= this.options.maxConsecutiveErrors && this.options.autoRestart) {
      
      if (this.options.debug) {
        console.log(`🚨 Troppi errori consecutivi (${this.status.consecutiveErrors}), tentativo recovery...`);
      }

      // Tentativo di recovery automatico
      await this.attemptRecovery();
    }
  }

  // Tentativo di recovery automatico del servizio
  private async attemptRecovery(): Promise<void> {
    if (this.options.debug) console.log('🔧 Tentativo recovery automatico Local Opener...');

    try {
      // 1. Pulisci cache di availabilità
      clearAvailabilityCache();
      
      // 2. Attendi un momento prima di ricontrollare
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // 3. Tentativo controllo con timeout più lungo
      const isAvailable = await checkLocalOpenerAvailability({
        forceRefresh: true,
        debug: this.options.debug,
        timeout: 8000
      });

      if (isAvailable) {
        if (this.options.debug) console.log('✅ Recovery automatico riuscito!');
        this.status.consecutiveErrors = 0;
        this.status.isAvailable = true;
        return;
      }

      // 4. Se ancora non disponibile, mostra suggerimento utente
      this.notifyUserForManualRecovery();

    } catch (error) {
      if (this.options.debug) console.log('❌ Recovery automatico fallito:', error);
      this.notifyUserForManualRecovery();
    }
  }

  // Notifica l'utente per recovery manuale
  private notifyUserForManualRecovery(): void {
    if (this.options.debug) {
      console.log('👨‍🔧 Recovery automatico non riuscito, intervento manuale richiesto');
    }
    
    // Emetti evento per UI
    this.notifyStatusListeners();
    
    // Potrebbero essere aggiunti toast o altre notifiche qui
    if (typeof window !== 'undefined' && window.dispatchEvent) {
      window.dispatchEvent(new CustomEvent('local-opener-recovery-needed', {
        detail: {
          status: this.status,
          message: 'Local Opener richiede intervento manuale'
        }
      }));
    }
  }

  // Registra tempo di risposta per statistiche
  private recordResponseTime(time: number): void {
    this.requestTimes.push(time);
    
    // Mantieni solo gli ultimi 10 tempi per calcolare la media
    if (this.requestTimes.length > 10) {
      this.requestTimes.shift();
    }
    
    this.status.averageResponseTime = this.requestTimes.reduce((a, b) => a + b, 0) / this.requestTimes.length;
  }

  // Wrapper per apertura documenti con statistiche
  async openDocument(doc: Document, options: {
    abortMs?: number;
    retry?: boolean;
    debug?: boolean;
  } = {}): Promise<{ ok: boolean; message?: string }> {
    this.status.totalRequests++;
    
    const result = await openLocalDocument(doc, {
      debug: this.options.debug || options.debug,
      ...options
    });
    
    if (result.ok) {
      this.status.successfulRequests++;
    } else {
      this.status.failedRequests++;
    }
    
    return result;
  }

  // Aggiunge listener per cambiamenti di stato
  addStatusListener(listener: (status: LocalOpenerStatus) => void): void {
    this.statusListeners.push(listener);
  }

  // Rimuove listener di stato
  removeStatusListener(listener: (status: LocalOpenerStatus) => void): void {
    const index = this.statusListeners.indexOf(listener);
    if (index > -1) {
      this.statusListeners.splice(index, 1);
    }
  }

  // Notifica tutti i listener dello stato
  private notifyStatusListeners(): void {
    this.statusListeners.forEach(listener => {
      try {
        listener(this.getStatus());
      } catch (error) {
        if (this.options.debug) console.log('Errore notifica status listener:', error);
      }
    });
  }

  // Restituisce lo stato corrente (copia)
  getStatus(): LocalOpenerStatus {
    return {
      ...this.status,
      uptime: this.lastSuccessfulCheck ? Date.now() - this.lastSuccessfulCheck.getTime() : undefined
    };
  }

  // Reimposta statistiche
  resetStats(): void {
    this.status.totalRequests = 0;
    this.status.successfulRequests = 0;
    this.status.failedRequests = 0;
    this.requestTimes = [];
    this.status.averageResponseTime = 0;
    
    if (this.options.debug) console.log('📊 Statistiche Local Opener resettate');
  }

  // Forza un controllo immediato
  async forceHealthCheck(): Promise<LocalOpenerStatus> {
    await this.checkServiceHealth();
    return this.getStatus();
  }

  // Aggiorna opzioni di monitoraggio
  updateOptions(newOptions: Partial<MonitoringOptions>): void {
    this.options = { ...this.options, ...newOptions };
    
    if (this.options.debug) console.log('⚙️ Opzioni Local Opener Manager aggiornate:', this.options);
    
    // Se il monitoraggio è attivo, riavvialo con nuove opzioni
    if (this.isMonitoring) {
      this.stopMonitoring();
      this.startMonitoring();
    }
  }

  // Verifica se il servizio è attualmente disponibile
  isServiceAvailable(): boolean {
    return this.status.isAvailable && this.status.consecutiveErrors < 3;
  }

  // Ottieni diagnostica completa
  getDiagnostics(): {
    status: LocalOpenerStatus;
    isMonitoring: boolean;
    lastSuccessfulCheck?: Date;
    options: MonitoringOptions;
  } {
    return {
      status: this.getStatus(),
      isMonitoring: this.isMonitoring,
      lastSuccessfulCheck: this.lastSuccessfulCheck,
      options: this.options
    };
  }

  // Cleanup per quando il manager non è più necessario
  destroy(): void {
    this.stopMonitoring();
    this.statusListeners = [];
    this.requestTimes = [];
    
    if (this.options.debug) console.log('🗑️ Local Opener Manager distrutto');
  }
}

// Istanza singleton per uso globale
export const localOpenerManager = new LocalOpenerManager({
  debug: process.env.NODE_ENV === 'development'
});

// Esporta la classe per istanze personalizzate
export { LocalOpenerManager };
export type { LocalOpenerStatus, MonitoringOptions };

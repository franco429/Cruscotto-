// Sistema di telemetria per Local Opener
// Raccoglie metriche anonime di utilizzo e performance per migliorare il servizio

const fs = require('fs');
const path = require('path');
const os = require('os');
const https = require('https');

class LocalOpenerTelemetry {
  constructor() {
    this.configDir = path.join(os.homedir(), '.local-opener');
    this.telemetryFile = path.join(this.configDir, 'telemetry.json');
    this.metricsFile = path.join(this.configDir, 'metrics.json');
    this.sessionId = this.generateSessionId();
    this.startTime = Date.now();
    
    // Configurazione telemetria
    this.config = {
      enabled: true, // L'utente può disabilitare
      endpoint: 'https://api.cruscotto-sgi.com/api/telemetry/local-opener',
      batchSize: 50,
      flushInterval: 30 * 60 * 1000, // 30 minuti
      maxRetries: 3
    };

    this.metrics = {
      session: {
        id: this.sessionId,
        startTime: this.startTime,
        version: "1.0.0",
        platform: os.platform(),
        arch: os.arch(),
        nodeVersion: process.version
      },
      usage: {
        filesOpened: 0,
        totalRequests: 0,
        successfulOpens: 0,
        failedOpens: 0,
        averageResponseTime: 0,
        errors: []
      },
      performance: {
        memoryUsage: [],
        cpuUsage: [],
        responseTimeHistory: []
      },
      system: {
        googleDriveDetected: false,
        rootDirectories: 0,
        windowsVersion: null,
        installedAt: null
      }
    };

    this.pendingEvents = [];
    this.loadTelemetryConfig();
    this.loadStoredMetrics();
  }

  initialize() {
    if (!this.config.enabled) {
      console.log('[telemetry] Telemetria disabilitata dall\'utente');
      return;
    }

    try {
      // Avvia raccolta metriche sistema
      this.startSystemMetricsCollection();
      
      // Avvia flush periodico
      this.startPeriodicFlush();
      
      // Registra dati di sessione iniziali
      this.recordSessionStart();
      
      console.log(`[telemetry] Inizializzata - Session ID: ${this.sessionId}`);
    } catch (error) {
      console.error('[telemetry] Errore inizializzazione:', error.message);
    }
  }

  loadTelemetryConfig() {
    try {
      if (fs.existsSync(this.telemetryFile)) {
        const saved = JSON.parse(fs.readFileSync(this.telemetryFile, 'utf-8'));
        this.config = { ...this.config, ...saved };
      }
    } catch (error) {
      console.warn('[telemetry] Errore caricamento configurazione:', error.message);
    }
  }

  loadStoredMetrics() {
    try {
      if (fs.existsSync(this.metricsFile)) {
        const stored = JSON.parse(fs.readFileSync(this.metricsFile, 'utf-8'));
        // Mantieni solo alcune metriche persistenti
        this.metrics.usage.filesOpened = stored.usage?.filesOpened || 0;
        this.metrics.usage.totalRequests = stored.usage?.totalRequests || 0;
        this.metrics.system = { ...this.metrics.system, ...stored.system };
      }
    } catch (error) {
      console.warn('[telemetry] Errore caricamento metriche:', error.message);
    }
  }

  saveMetrics() {
    try {
      if (!fs.existsSync(this.configDir)) {
        fs.mkdirSync(this.configDir, { recursive: true });
      }
      
      fs.writeFileSync(this.metricsFile, JSON.stringify(this.metrics, null, 2));
    } catch (error) {
      console.error('[telemetry] Errore salvataggio metriche:', error.message);
    }
  }

  generateSessionId() {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 5);
    return `${timestamp}-${random}`;
  }

  recordSessionStart() {
    this.addEvent('session_start', {
      sessionId: this.sessionId,
      startTime: this.startTime,
      version: this.metrics.session.version,
      platform: this.metrics.session.platform,
      arch: this.metrics.session.arch
    });
  }

  recordFileOpenAttempt(document, success, responseTime, error = null) {
    this.metrics.usage.totalRequests++;
    
    if (success) {
      this.metrics.usage.successfulOpens++;
      this.metrics.usage.filesOpened++;
    } else {
      this.metrics.usage.failedOpens++;
    }

    // Aggiorna media tempo di risposta
    this.updateAverageResponseTime(responseTime);
    
    // Registra errore se presente
    if (error) {
      this.recordError('file_open_failed', error, { document: document?.title });
    }

    this.addEvent('file_open_attempt', {
      success: success,
      responseTime: responseTime,
      fileType: document?.fileType,
      hasLogicalPath: !!document?.logicalPath,
      candidatesCount: document?.candidates?.length || 0,
      error: error ? error.message : null
    });
  }

  recordServiceHealth(isHealthy, rootDirectories, googleDriveDetected) {
    this.metrics.system.rootDirectories = rootDirectories;
    this.metrics.system.googleDriveDetected = googleDriveDetected;

    this.addEvent('service_health_check', {
      isHealthy: isHealthy,
      rootDirectories: rootDirectories,
      googleDriveDetected: googleDriveDetected,
      timestamp: Date.now()
    });
  }

  recordError(type, error, context = {}) {
    const errorRecord = {
      type: type,
      message: error.message || String(error),
      timestamp: Date.now(),
      context: context
    };

    this.metrics.usage.errors.push(errorRecord);
    
    // Mantieni solo gli ultimi 100 errori
    if (this.metrics.usage.errors.length > 100) {
      this.metrics.usage.errors = this.metrics.usage.errors.slice(-100);
    }

    this.addEvent('error', errorRecord);
  }

  recordConfigurationChange(action, details) {
    this.addEvent('configuration_change', {
      action: action, // 'add_root', 'remove_root', 'update_settings'
      details: details,
      timestamp: Date.now()
    });
  }

  recordUpdateEvent(eventType, version, details = {}) {
    this.addEvent('update_event', {
      eventType: eventType, // 'check', 'available', 'download', 'install', 'skip'
      version: version,
      currentVersion: this.metrics.session.version,
      details: details,
      timestamp: Date.now()
    });
  }

  updateAverageResponseTime(newTime) {
    const history = this.metrics.performance.responseTimeHistory;
    history.push(newTime);
    
    // Mantieni solo gli ultimi 1000 tempi di risposta
    if (history.length > 1000) {
      history.shift();
    }
    
    // Calcola nuova media
    const sum = history.reduce((a, b) => a + b, 0);
    this.metrics.usage.averageResponseTime = sum / history.length;
  }

  startSystemMetricsCollection() {
    // Raccoglie metriche sistema ogni 5 minuti
    setInterval(() => {
      try {
        const memUsage = process.memoryUsage();
        this.metrics.performance.memoryUsage.push({
          timestamp: Date.now(),
          heapUsed: memUsage.heapUsed,
          heapTotal: memUsage.heapTotal,
          rss: memUsage.rss
        });

        // Mantieni solo gli ultimi 100 campioni (circa 8 ore)
        if (this.metrics.performance.memoryUsage.length > 100) {
          this.metrics.performance.memoryUsage.shift();
        }

        this.saveMetrics();
      } catch (error) {
        console.error('[telemetry] Errore raccolta metriche sistema:', error.message);
      }
    }, 5 * 60 * 1000); // 5 minuti
  }

  startPeriodicFlush() {
    // Invia dati al server ogni 30 minuti
    setInterval(() => {
      this.flushEvents();
    }, this.config.flushInterval);

    // Flush automatico alla chiusura del processo
    process.on('SIGTERM', () => this.flushEvents());
    process.on('SIGINT', () => this.flushEvents());
    process.on('beforeExit', () => this.flushEvents());
  }

  addEvent(type, data) {
    if (!this.config.enabled) return;

    const event = {
      id: this.generateEventId(),
      type: type,
      timestamp: Date.now(),
      sessionId: this.sessionId,
      data: data
    };

    this.pendingEvents.push(event);

    // Flush automatico se batch pieno
    if (this.pendingEvents.length >= this.config.batchSize) {
      this.flushEvents();
    }
  }

  generateEventId() {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  async flushEvents() {
    if (!this.config.enabled || this.pendingEvents.length === 0) {
      return;
    }

    const eventsToSend = [...this.pendingEvents];
    this.pendingEvents = [];

    try {
      await this.sendTelemetryData(eventsToSend);
      console.log(`[telemetry] Inviati ${eventsToSend.length} eventi`);
    } catch (error) {
      console.warn('[telemetry] Errore invio dati:', error.message);
      // Rimetti gli eventi nella coda per retry
      this.pendingEvents.unshift(...eventsToSend);
      
      // Limita la coda per evitare memory leak
      if (this.pendingEvents.length > 1000) {
        this.pendingEvents = this.pendingEvents.slice(-1000);
      }
    }
  }

  async sendTelemetryData(events) {
    return new Promise((resolve, reject) => {
      const payload = {
        session: this.metrics.session,
        summary: {
          totalRequests: this.metrics.usage.totalRequests,
          successfulOpens: this.metrics.usage.successfulOpens,
          failedOpens: this.metrics.usage.failedOpens,
          averageResponseTime: this.metrics.usage.averageResponseTime,
          errorCount: this.metrics.usage.errors.length
        },
        events: events
      };

      const data = JSON.stringify(payload);
      
      const options = {
        hostname: new URL(this.config.endpoint).hostname,
        path: new URL(this.config.endpoint).pathname,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(data),
          'User-Agent': `Local-Opener/${this.metrics.session.version}`,
          'X-Telemetry-Version': '1.0'
        },
        timeout: 30000
      };

      const req = https.request(options, (res) => {
        let responseData = '';
        
        res.on('data', (chunk) => {
          responseData += chunk;
        });
        
        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(responseData);
          } else {
            reject(new Error(`HTTP ${res.statusCode}: ${responseData}`));
          }
        });
      });

      req.on('error', (err) => {
        reject(err);
      });

      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Timeout invio telemetria'));
      });

      req.write(data);
      req.end();
    });
  }

  // API per gestire le preferenze utente
  enableTelemetry() {
    this.config.enabled = true;
    this.saveTelemetryConfig();
    console.log('[telemetry] Telemetria abilitata');
  }

  disableTelemetry() {
    this.config.enabled = false;
    this.pendingEvents = []; // Pulisce eventi pending
    this.saveTelemetryConfig();
    console.log('[telemetry] Telemetria disabilitata');
  }

  saveTelemetryConfig() {
    try {
      if (!fs.existsSync(this.configDir)) {
        fs.mkdirSync(this.configDir, { recursive: true });
      }
      
      fs.writeFileSync(this.telemetryFile, JSON.stringify(this.config, null, 2));
    } catch (error) {
      console.error('[telemetry] Errore salvataggio configurazione:', error.message);
    }
  }

  getMetricsSummary() {
    return {
      session: this.metrics.session,
      usage: {
        totalRequests: this.metrics.usage.totalRequests,
        successfulOpens: this.metrics.usage.successfulOpens,
        failedOpens: this.metrics.usage.failedOpens,
        successRate: this.metrics.usage.totalRequests > 0 ? 
          (this.metrics.usage.successfulOpens / this.metrics.usage.totalRequests * 100).toFixed(2) + '%' : '0%',
        averageResponseTime: Math.round(this.metrics.usage.averageResponseTime) + 'ms'
      },
      system: this.metrics.system,
      telemetryEnabled: this.config.enabled
    };
  }
}

// Export per uso come modulo
module.exports = LocalOpenerTelemetry;

// Se eseguito direttamente, avvia la telemetria
if (require.main === module) {
  const telemetry = new LocalOpenerTelemetry();
  telemetry.initialize();
  
  // Esempio di utilizzo
  setTimeout(() => {
    console.log('Metrics Summary:', telemetry.getMetricsSummary());
  }, 1000);
}

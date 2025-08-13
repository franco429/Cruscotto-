// Routes per gestire Local Opener: versioni, telemetria, download
import { Express, Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import logger from './logger';

interface LocalOpenerTelemetryData {
  session: {
    id: string;
    version: string;
    platform: string;
    arch: string;
  };
  summary: {
    totalRequests: number;
    successfulOpens: number;
    failedOpens: number;
    averageResponseTime: number;
    errorCount: number;
  };
  events: Array<{
    id: string;
    type: string;
    timestamp: number;
    sessionId: string;
    data: any;
  }>;
}

export function registerLocalOpenerRoutes(app: Express) {

  // Endpoint semplificato per statistiche documenti (opzionale per admin/debug)
  app.get('/api/documents/local-count', async (req: Request, res: Response) => {
    try {
      const { mongoStorage } = await import('./storage');
      
      if (!req.user?.clientId) {
        return res.status(401).json({ error: 'Non autorizzato' });
      }
      
      // Conta documenti che NON hanno driveUrl (sono documenti locali/upload)
      const localDocuments = await mongoStorage.getDocuments(req.user.clientId);
      const localCount = localDocuments.filter(doc => !doc.driveUrl).length;
      
      // Endpoint ora utilizzato solo per statistiche/debug
      res.json({ 
        count: localCount,
        totalDocuments: localDocuments.length,
        hasGoogleDrive: localDocuments.some(doc => !!doc.driveUrl),
        note: "Endpoint per debug/statistiche - Local Opener ora mostra sempre prompt se non installato"
      });
      
    } catch (error) {
      logger.error('Error counting local documents', { 
        error: error instanceof Error ? error.message : String(error),
        clientId: req.user?.clientId
      });
      res.status(500).json({ error: 'Errore conteggio documenti' });
    }
  });
  
  // Endpoint per ottenere l'ultima versione disponibile
  app.get('/api/local-opener/latest-version', async (req: Request, res: Response) => {
    try {
      // Versione attuale (da configurare o leggere da package.json)
      const currentVersion = process.env.LOCAL_OPENER_VERSION || '1.2.0';
      
      res.json({
        version: currentVersion,
        latestVersion: currentVersion,
        downloadUrl: '/downloads/cruscotto-local-opener-setup.exe',
        releaseNotes: [
          'Installazione silenziosa automatica',
          'Sistema di telemetria per diagnostica',
          'Auto-aggiornamento integrato',
          'Rilevamento automatico Google Drive migliorato',
          'Script di debug automatico'
        ],
        releaseDate: new Date().toISOString()
      });
      
      logger.info('Local Opener version check', {
        clientIP: req.ip,
        userAgent: req.get('User-Agent'),
        currentVersion: currentVersion
      });
      
    } catch (error) {
      logger.error('Error in local-opener version check', { error: error instanceof Error ? error.message : String(error) });
      res.status(500).json({ 
        error: 'Impossibile ottenere informazioni versione',
        version: '1.0.0' // Fallback
      });
    }
  });

  // Endpoint per ricevere telemetria dai client Local Opener
  app.post('/api/telemetry/local-opener', async (req: Request, res: Response) => {
    try {
      const telemetryData: LocalOpenerTelemetryData = req.body;
      
      // Validazione base dei dati
      if (!telemetryData.session?.id || !telemetryData.events) {
        return res.status(400).json({ error: 'Dati telemetria invalidi' });
      }

      // Log telemetria per analisi (rimuovi dati sensibili)
      const sanitizedData = {
        sessionId: telemetryData.session.id,
        version: telemetryData.session.version,
        platform: telemetryData.session.platform,
        arch: telemetryData.session.arch,
        summary: telemetryData.summary,
        eventCount: telemetryData.events.length,
        eventTypes: [...new Set(telemetryData.events.map(e => e.type))]
      };

      logger.info('Local Opener telemetry received', sanitizedData);

      // Elabora eventi specifici per insights
      const errorEvents = telemetryData.events.filter(e => e.type === 'error');
      const fileOpenEvents = telemetryData.events.filter(e => e.type === 'file_open_attempt');
      const configEvents = telemetryData.events.filter(e => e.type === 'configuration_change');

      if (errorEvents.length > 0) {
        logger.warn('Local Opener errors reported', {
          sessionId: telemetryData.session.id,
          errorCount: errorEvents.length,
          errorTypes: errorEvents.map(e => e.data?.type || 'unknown')
        });
      }

      // Salva metriche aggregate (opzionale - database/file)
      await saveTelemetryMetrics(sanitizedData);

      res.json({ 
        received: true,
        eventsProcessed: telemetryData.events.length,
        nextReportIn: 30 * 60 * 1000 // 30 minuti
      });

    } catch (error) {
      logger.error('Error processing local-opener telemetry', { 
        error: error instanceof Error ? error.message : String(error),
        body: req.body 
      });
      res.status(500).json({ error: 'Errore elaborazione telemetria' });
    }
  });

  // Endpoint per statistiche telemetria aggregate (per dashboard admin)
  app.get('/api/admin/local-opener/stats', async (req: Request, res: Response) => {
    try {
      // TODO: Implementa logica per leggere statistiche aggregate dal database
      const stats = await getLocalOpenerStats();
      
      res.json(stats);
    } catch (error) {
      logger.error('Error getting local-opener stats', { error: error instanceof Error ? error.message : String(error) });
      res.status(500).json({ error: 'Errore ottenimento statistiche' });
    }
  });

  // Endpoint per download diretto files Local Opener
  app.get('/downloads/:filename', (req: Request, res: Response) => {
    try {
      const filename = req.params.filename;
      
      // Whitelist di file scaricabili
      const allowedFiles = [
        'cruscotto-local-opener-setup.exe',
        'cruscotto-local-opener-portable.zip',
        'debug-local-opener.bat'
      ];

      if (!allowedFiles.includes(filename)) {
        return res.status(404).json({ error: 'File non trovato' });
      }

      const filePath = path.join(__dirname, '..', 'client', 'public', 'downloads', filename);
      
      if (!fs.existsSync(filePath)) {
        logger.warn('Local Opener download file not found', { filename, path: filePath });
        return res.status(404).json({ error: 'File non disponibile' });
      }

      logger.info('Local Opener file download', {
        filename: filename,
        clientIP: req.ip,
        userAgent: req.get('User-Agent')
      });

      // Imposta headers appropriati
      if (filename.endsWith('.exe')) {
        res.setHeader('Content-Type', 'application/octet-stream');
      } else if (filename.endsWith('.zip')) {
        res.setHeader('Content-Type', 'application/zip');
      } else if (filename.endsWith('.bat')) {
        res.setHeader('Content-Type', 'application/x-msdos-program');
      }

      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.sendFile(filePath);

    } catch (error) {
      logger.error('Error in local-opener download', { 
        error: error instanceof Error ? error.message : String(error),
        filename: req.params.filename 
      });
      res.status(500).json({ error: 'Errore download file' });
    }
  });

  // Endpoint per segnalare problemi con Local Opener
  app.post('/api/local-opener/report-issue', async (req: Request, res: Response) => {
    try {
      const { 
        issueType, 
        description, 
        systemInfo, 
        logs, 
        userEmail 
      } = req.body;

      const issueReport = {
        id: `issue-${Date.now()}`,
        timestamp: new Date().toISOString(),
        type: issueType,
        description: description,
        systemInfo: systemInfo,
        logs: logs,
        userEmail: userEmail,
        clientIP: req.ip,
        userAgent: req.get('User-Agent')
      };

      logger.warn('Local Opener issue reported', issueReport);

      // TODO: Invia email al supporto tecnico o salva in sistema ticketing
      
      res.json({ 
        reportId: issueReport.id,
        message: 'Segnalazione ricevuta. Il supporto tecnico verrà contattato.' 
      });

    } catch (error) {
      logger.error('Error processing local-opener issue report', { 
        error: error instanceof Error ? error.message : String(error) 
      });
      res.status(500).json({ error: 'Errore invio segnalazione' });
    }
  });
}

// Funzione helper per salvare metriche telemetria
async function saveTelemetryMetrics(data: any): Promise<void> {
  try {
    // Implementa logica per salvare in database o file
    // Esempio: salvataggio in file JSON per sviluppo
    const metricsDir = path.join(__dirname, '..', 'logs', 'local-opener-metrics');
    if (!fs.existsSync(metricsDir)) {
      fs.mkdirSync(metricsDir, { recursive: true });
    }

    const filename = `metrics-${new Date().toISOString().split('T')[0]}.json`;
    const filepath = path.join(metricsDir, filename);
    
    let existingData = [];
    if (fs.existsSync(filepath)) {
      const content = fs.readFileSync(filepath, 'utf-8');
      existingData = JSON.parse(content);
    }

    existingData.push({
      timestamp: new Date().toISOString(),
      ...data
    });

    fs.writeFileSync(filepath, JSON.stringify(existingData, null, 2));
    
  } catch (error) {
    logger.error('Error saving telemetry metrics', { error: error instanceof Error ? error.message : String(error) });
  }
}

// Funzione helper per ottenere statistiche aggregate
async function getLocalOpenerStats(): Promise<any> {
  try {
    // TODO: Implementa logica per aggregare statistiche dal database
    // Per ora ritorna dati di esempio
    return {
      totalInstallations: 150,
      activeUsers: 89,
      successRate: 94.5,
      commonIssues: [
        { type: 'google_drive_not_found', count: 12 },
        { type: 'firewall_blocked', count: 8 },
        { type: 'file_not_found', count: 15 }
      ],
      versionDistribution: {
        '1.0.0': 45,
        '1.1.0': 67,
        '1.2.0': 38
      },
      platformDistribution: {
        'win32': 142,
        'darwin': 8
      }
    };
  } catch (error) {
    logger.error('Error getting local-opener stats', { error: error instanceof Error ? error.message : String(error) });
    return {
      totalInstallations: 0,
      activeUsers: 0,
      successRate: 0,
      commonIssues: [],
      versionDistribution: {},
      platformDistribution: {}
    };
  }
}

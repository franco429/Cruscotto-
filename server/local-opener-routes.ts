// Routes per gestire Local Opener: versioni, telemetria, download
import { Express, Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import logger from './logger';
import { mongoStorage } from './mongo-storage';

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

// Interfacce per configurazioni multi-cliente
interface ClientConfig {
  clientId: string;
  drivePaths: string[];
  roots: string[];
}

export function registerLocalOpenerRoutes(app: Express) {

  // Endpoint per rilevamento automatico dei percorsi di Google Drive
  app.get('/api/local-opener/detect-drive-paths', async (req: Request, res: Response) => {
    try {
      const drivePaths = await detectGoogleDrivePaths();
      res.json({ paths: drivePaths });
      
      logger.info('Google Drive paths detected', {
        clientIP: req.ip,
        userAgent: req.get('User-Agent'),
        pathsFound: drivePaths.length
      });
      
    } catch (error) {
      logger.error('Error detecting Google Drive paths', { 
        error: error instanceof Error ? error.message : String(error),
        clientIP: req.ip 
      });
      res.status(500).json({ error: 'Errore nel rilevamento dei percorsi' });
    }
  });

  // Endpoint per rilevamento forzato con retry (utile per avvio automatico)
  app.get('/api/local-opener/detect-drive-paths-with-retry', async (req: Request, res: Response) => {
    try {
      const maxRetries = parseInt(req.query.retries as string) || 5;
      const retryDelay = parseInt(req.query.delay as string) || 2000; // 2 secondi
      
      logger.info('Starting Google Drive paths detection with retry', {
        maxRetries,
        retryDelay,
        clientIP: req.ip
      });
      
      let drivePaths: string[] = [];
      let lastError: string = '';
      
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          logger.info(`Google Drive detection attempt ${attempt}/${maxRetries}`);
          
          drivePaths = await detectGoogleDrivePaths();
          
          if (drivePaths.length > 0) {
            logger.info(`Google Drive paths found on attempt ${attempt}`, {
              pathsFound: drivePaths.length,
              paths: drivePaths
            });
            break; // Successo, esci dal loop
          } else {
            logger.info(`No Google Drive paths found on attempt ${attempt}, retrying...`);
            if (attempt < maxRetries) {
              await new Promise(resolve => setTimeout(resolve, retryDelay));
            }
          }
        } catch (error) {
          lastError = error instanceof Error ? error.message : String(error);
          logger.warn(`Google Drive detection attempt ${attempt} failed`, {
            error: lastError,
            attempt,
            maxRetries
          });
          
          if (attempt < maxRetries) {
            await new Promise(resolve => setTimeout(resolve, retryDelay));
          }
        }
      }

      if (drivePaths.length === 0) {
        logger.warn('Google Drive paths detection failed after all retries', {
          maxRetries,
          lastError,
          clientIP: req.ip
        });
        
        res.json({ 
          paths: [],
          success: false,
          message: `Nessun percorso Google Drive rilevato dopo ${maxRetries} tentativi. Ultimo errore: ${lastError}`,
          attempts: maxRetries,
          lastError
        });
      } else {
        res.json({ 
          paths: drivePaths,
          success: true,
          message: `Rilevati ${drivePaths.length} percorsi Google Drive dopo ${maxRetries} tentativi`,
          attempts: maxRetries,
          pathsFound: drivePaths.length
        });
      }
      
    } catch (error) {
      logger.error('Error in Google Drive paths detection with retry', { 
        error: error instanceof Error ? error.message : String(error),
        clientIP: req.ip 
      });
      res.status(500).json({ error: 'Errore nel rilevamento dei percorsi con retry' });
    }
  });

  // Endpoint per salvare configurazione cliente
  app.post('/api/local-opener/save-client-config', async (req: Request, res: Response) => {
    try {
      const { clientId, drivePaths, roots } = req.body;
      
      if (!clientId || !Array.isArray(drivePaths)) {
        return res.status(400).json({ error: 'Dati configurazione invalidi' });
      }

      const config: ClientConfig = {
        clientId,
        drivePaths,
        roots: roots || []
      };

      await saveClientConfig(config);
      
      logger.info('Client configuration saved', {
        clientId,
        drivePathsCount: drivePaths.length,
        clientIP: req.ip
      });

      res.json({ success: true, message: 'Configurazione salvata con successo' });
      
    } catch (error) {
      logger.error('Error saving client configuration', { 
        error: error instanceof Error ? error.message : String(error),
        body: req.body 
      });
      res.status(500).json({ error: 'Errore nel salvataggio della configurazione' });
    }
  });

  // Endpoint per caricare configurazione cliente
  app.get('/api/local-opener/client-config/:clientId', async (req: Request, res: Response) => {
    try {
      const { clientId } = req.params;
      
      if (!clientId) {
        return res.status(400).json({ error: 'Client ID richiesto' });
      }

      const config = await loadClientConfig(clientId);
      
      if (!config) {
        return res.status(404).json({ error: 'Configurazione non trovata' });
      }

      res.json(config);
      
    } catch (error) {
      logger.error('Error loading client configuration', { 
        error: error instanceof Error ? error.message : String(error),
        clientId: req.params.clientId 
      });
      res.status(500).json({ error: 'Errore nel caricamento della configurazione' });
    }
  });

  // Endpoint semplificato per statistiche documenti (opzionale per admin/debug)
  app.get('/api/documents/local-count', async (req: Request, res: Response) => {
    try {
      // Re-importing mongoStorage here is weird but we'll stick to top level
      // Note: mongoStorage is already imported at top level
      
      if (!req.user?.clientId) {
        return res.status(401).json({ error: 'Non autorizzato' });
      }
      
      // Conta documenti che NON hanno driveUrl (sono documenti locali/upload)
      const localDocuments = await mongoStorage.getDocumentsByClientId(req.user.clientId);
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
        downloadUrl: '/downloads/local-opener-complete-package.zip',
        releaseNotes: [
          'Installazione silenziosa automatica',
          'Sistema di telemetria per diagnostica',
          'Auto-aggiornamento integrato',
          'Rilevamento automatico Google Drive migliorato',
          'Script di debug automatico',
          'Avvio automatico all\'avvio di Windows',
          'Rilevamento automatico percorsi Google Drive',
          'Gestione configurazioni multi-cliente'
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

      // Salva metriche aggregate nel DB (LogModel) invece che su disco
      await saveTelemetryMetrics(sanitizedData, req.ip);

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
        'local-opener-complete-package.zip',
        'debug-local-opener.bat',
        'install-local-opener.bat',
        'nssm.exe',
        'README.txt'
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
      } else if (filename.endsWith('.txt')) {
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
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

      // Salva segnalazione come Log nel DB invece che solo su logger
      await mongoStorage.createLog({
        userId: 0, // 0 for system/anonymous
        action: 'local-opener-issue',
        documentId: null,
        details: issueReport
      });
      
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

// Funzione per rilevare automaticamente i percorsi di Google Drive
async function detectGoogleDrivePaths(): Promise<string[]> {
  const drivePaths: string[] = [];
  
  // 1. SCANSIONE COMPLETA TUTTE LE UNITÀ (A: a Z:)
  const allDrives = ['A:', 'B:', 'C:', 'D:', 'E:', 'F:', 'G:', 'H:', 'I:', 'J:', 'K:', 'L:', 'M:', 'N:', 'O:', 'P:', 'Q:', 'R:', 'S:', 'T:', 'U:', 'V:', 'W:', 'X:', 'Y:', 'Z:'];
  
  for (const drive of allDrives) {
    try {
      // Percorsi comuni per ogni unità
      const commonPaths = [
        `${drive}\\IL MIO DRIVE`,
        `${drive}\\MY DRIVE`,
        `${drive}\\Google Drive`,
        `${drive}\\GoogleDrive`,
        `${drive}\\Google Drive File Stream`,
        `${drive}\\GDrive`,
        `${drive}\\`,
        `${drive}\\My Drive`,
        `${drive}\\Shared drives`,
        `${drive}\\Computer`,
        `${drive}\\Google`,
        `${drive}\\Drive`,
        `${drive}\\GDriveFS`,
        `${drive}\\GoogleDriveFS`,
        `${drive}\\Google Drive File Stream`,
        `${drive}\\Google Drive for Desktop`,
        `${drive}\\Google Drive Desktop`,
        `${drive}\\Google Drive Stream`,
        `${drive}\\Google Drive Sync`,
        `${drive}\\Google Drive Backup`,
        `${drive}\\Google Drive Mirror`,
        `${drive}\\Google Drive Clone`,
        `${drive}\\Google Drive Copy`,
        `${drive}\\Google Drive Archive`,
        `${drive}\\Google Drive Storage`,
        `${drive}\\Google Drive Data`,
        `${drive}\\Google Drive Files`,
        `${drive}\\Google Drive Documents`,
        `${drive}\\Google Drive Media`,
        `${drive}\\Google Drive Photos`,
        `${drive}\\Google Drive Videos`,
        `${drive}\\Google Drive Music`,
        `${drive}\\Google Drive Downloads`,
        `${drive}\\Google Drive Uploads`,
        `${drive}\\Google Drive Sync`,
        `${drive}\\Google Drive Backup`,
        `${drive}\\Google Drive Mirror`,
        `${drive}\\Google Drive Clone`,
        `${drive}\\Google Drive Copy`,
        `${drive}\\Google Drive Archive`,
        `${drive}\\Google Drive Storage`,
        `${drive}\\Google Drive Data`,
        `${drive}\\Google Drive Files`,
        `${drive}\\Google Drive Documents`,
        `${drive}\\Google Drive Media`,
        `${drive}\\Google Drive Photos`,
        `${drive}\\Google Drive Videos`,
        `${drive}\\Google Drive Music`,
        `${drive}\\Google Drive Downloads`,
        `${drive}\\Google Drive Uploads`
      ];

      // Percorsi specifici per unità principali (C:, D:, E:, F:)
      if (['C:', 'D:', 'E:', 'F:'].includes(drive)) {
        const username = process.env.USERNAME || '';
        const userSpecificPaths = [
          `${drive}\\Users\\${username}\\Google Drive`,
          `${drive}\\Users\\${username}\\GoogleDrive`,
          `${drive}\\Users\\${username}\\My Drive`,
          `${drive}\\Users\\${username}\\IL MIO DRIVE`,
          `${drive}\\Users\\${username}\\Google Drive File Stream`,
          `${drive}\\Users\\${username}\\GDrive`,
          `${drive}\\Users\\${username}\\Documents\\Google Drive`,
          `${drive}\\Users\\${username}\\Documents\\GoogleDrive`,
          `${drive}\\Users\\${username}\\Documents\\My Drive`,
          `${drive}\\Users\\${username}\\Documents\\IL MIO DRIVE`,
          `${drive}\\Users\\${username}\\Desktop\\Google Drive`,
          `${drive}\\Users\\${username}\\Desktop\\GoogleDrive`,
          `${drive}\\Users\\${username}\\Desktop\\My Drive`,
          `${drive}\\Users\\${username}\\Desktop\\IL MIO DRIVE`,
          `${drive}\\Users\\${username}\\Downloads\\Google Drive`,
          `${drive}\\Users\\${username}\\Downloads\\GoogleDrive`,
          `${drive}\\Users\\${username}\\Downloads\\My Drive`,
          `${drive}\\Users\\${username}\\Downloads\\IL MIO DRIVE`
        ];
        commonPaths.push(...userSpecificPaths);
      }

      // Scansione di tutti i percorsi per questa unità
      for (const path of commonPaths) {
        if (fs.existsSync(path)) {
          // Verifica se è effettivamente Google Drive controllando il contenuto
          try {
            const files = fs.readdirSync(path);
            if (files.length > 0) {
              // Controlla se contiene file tipici di Google Drive
              const hasGoogleDriveFiles = files.some(file => 
                file.includes('Google') || 
                file.includes('Drive') || 
                file.includes('My Drive') ||
                file.includes('IL MIO DRIVE') ||
                file.includes('Shared drives') ||
                file.includes('GDrive') ||
                file.includes('DriveFS') ||
                file.includes('File Stream') ||
                file.includes('Desktop') ||
                file.includes('Sync') ||
                file.includes('Backup') ||
                file.includes('Mirror') ||
                file.includes('Clone') ||
                file.includes('Copy') ||
                file.includes('Archive') ||
                file.includes('Storage') ||
                file.includes('Data') ||
                file.includes('Files') ||
                file.includes('Documents') ||
                file.includes('Media') ||
                file.includes('Photos') ||
                file.includes('Videos') ||
                file.includes('Music') ||
                file.includes('Downloads') ||
                file.includes('Uploads')
              );
              
              if (hasGoogleDriveFiles || path === `${drive}\\`) {
                drivePaths.push(path);
                logger.info(`Google Drive path found on drive ${drive}: ${path}`);
              }
            }
          } catch (readErr) {
            // Se non riesce a leggere, potrebbe essere un'unità non montata
            logger.debug(`Cannot read directory ${path}:`, { error: readErr instanceof Error ? readErr.message : String(readErr) });
          }
        }
      }
    } catch (err) {
      logger.warn(`Error scanning drive ${drive}:`, { error: err instanceof Error ? err.message : String(err) });
    }
  }

  // 2. SCANSIONE PERCORSI SPECIFICI DI GOOGLE DRIVE DESKTOP
  const specificPaths = [
    'C:\\Program Files\\Google\\Drive File Stream\\launcher.exe',
    'C:\\Program Files (x86)\\Google\\Drive File Stream\\launcher.exe',
    'C:\\Users\\%USERNAME%\\AppData\\Local\\Google\\Drive File Stream\\launcher.exe',
    'C:\\Users\\%USERNAME%\\AppData\\Roaming\\Google\\Drive File Stream\\launcher.exe',
    'C:\\Program Files\\Google\\Drive for Desktop\\launcher.exe',
    'C:\\Program Files (x86)\\Google\\Drive for Desktop\\launcher.exe',
    'C:\\Users\\%USERNAME%\\AppData\\Local\\Google\\Drive for Desktop\\launcher.exe',
    'C:\\Users\\%USERNAME%\\AppData\\Roaming\\Google\\Drive for Desktop\\launcher.exe'
  ];

  for (const specificPath of specificPaths) {
    try {
      const expandedPath = specificPath.replace('%USERNAME%', process.env.USERNAME || '');
      if (fs.existsSync(expandedPath)) {
        // Se trova l'eseguibile, cerca la cartella di lavoro
        const workingDir = path.dirname(expandedPath);
        const possibleDrivePaths = [
          path.join(workingDir, '..', '..', '..', 'Google Drive'),
          path.join(workingDir, '..', '..', '..', 'GoogleDrive'),
          path.join(workingDir, '..', '..', '..', 'My Drive'),
          path.join(workingDir, '..', '..', '..', 'IL MIO DRIVE'),
          path.join(workingDir, '..', '..', '..', 'Drive for Desktop'),
          path.join(workingDir, '..', '..', '..', 'Drive File Stream')
        ];

        for (const drivePath of possibleDrivePaths) {
          if (fs.existsSync(drivePath)) {
            drivePaths.push(drivePath);
            logger.info(`Google Drive path found via executable: ${drivePath}`);
          }
        }
      }
    } catch (err) {
      logger.debug(`Error checking specific path ${specificPath}:`, { error: err instanceof Error ? err.message : String(err) });
    }
  }

  // 3. SCANSIONE REGISTRO WINDOWS PER GOOGLE DRIVE
  try {
    const { execSync } = require('child_process');
    const registryQueries = [
      'reg query "HKEY_CURRENT_USER\\Software\\Google\\DriveFS" /v "DataPath" 2>nul',
      'reg query "HKEY_CURRENT_USER\\Software\\Google\\Drive for Desktop" /v "DataPath" 2>nul',
      'reg query "HKEY_CURRENT_USER\\Software\\Google\\Drive File Stream" /v "DataPath" 2>nul',
      'reg query "HKEY_LOCAL_MACHINE\\SOFTWARE\\Google\\DriveFS" /v "DataPath" 2>nul',
      'reg query "HKEY_LOCAL_MACHINE\\SOFTWARE\\Google\\Drive for Desktop" /v "DataPath" 2>nul',
      'reg query "HKEY_LOCAL_MACHINE\\SOFTWARE\\Google\\Drive File Stream" /v "DataPath" 2>nul'
    ];
    
    for (const registryQuery of registryQueries) {
      try {
        const result = execSync(registryQuery, { encoding: 'utf8', shell: true });
        
        if (result && result.includes('DataPath')) {
          const match = result.match(/DataPath\s+REG_SZ\s+(.+)/);
          if (match && match[1]) {
            const dataPath = match[1].trim();
            if (fs.existsSync(dataPath)) {
              drivePaths.push(dataPath);
              logger.info(`Google Drive path found via registry: ${dataPath}`);
            }
          }
        }
      } catch (err) {
        // Ignora errori per chiavi di registro non esistenti
        logger.debug(`Registry query failed for: ${registryQuery}`);
      }
    }
  } catch (err) {
    logger.debug('Registry queries failed (this is normal if Google Drive is not installed):', { error: err instanceof Error ? err.message : String(err) });
  }

  // 4. RIMOZIONE DUPLICATI E ORDINAMENTO
  const uniquePaths = [...new Set(drivePaths)];
  const sortedPaths = uniquePaths.sort((a, b) => {
    // Priorità alle unità virtuali (G:, H:, etc.)
    const aIsVirtual = /^[G-Z]:/.test(a);
    const bIsVirtual = /^[G-Z]:/.test(b);
    
    if (aIsVirtual && !bIsVirtual) return -1;
    if (!aIsVirtual && bIsVirtual) return 1;
    
    // Poi ordina alfabeticamente
    return a.localeCompare(b);
  });

  logger.info(`Google Drive paths detection completed. Found ${sortedPaths.length} paths:`, { paths: sortedPaths });
  
  return sortedPaths;
}

// Funzione helper per salvare configurazioni cliente (MIGRATA A MONGODB)
async function saveClientConfig(config: ClientConfig): Promise<void> {
  try {
    const legacyId = parseInt(config.clientId, 10);
    if (isNaN(legacyId)) throw new Error('Client ID non valido');

    await mongoStorage.updateClient(legacyId, {
      localOpenerConfig: {
        drivePaths: config.drivePaths,
        roots: config.roots
      }
    });
    
    logger.info('Client configuration saved to DB', { clientId: config.clientId });
  } catch (error) {
    logger.error('Error saving client configuration', { error: error instanceof Error ? error.message : String(error) });
    throw error;
  }
}

// Funzione helper per caricare configurazioni cliente (MIGRATA A MONGODB)
async function loadClientConfig(clientId: string): Promise<ClientConfig | null> {
  try {
    const legacyId = parseInt(clientId, 10);
    if (isNaN(legacyId)) return null;

    const client = await mongoStorage.getClient(legacyId);
    if (!client) return null;

    if (!client.localOpenerConfig) return null;

    return {
      clientId: clientId,
      drivePaths: client.localOpenerConfig.drivePaths,
      roots: client.localOpenerConfig.roots
    };
  } catch (error) {
    logger.error('Error loading client configuration', { error: error instanceof Error ? error.message : String(error), clientId });
    return null;
  }
}

// Funzione helper per salvare metriche telemetria (MIGRATA A MONGODB)
async function saveTelemetryMetrics(data: any, clientIp: string): Promise<void> {
  try {
    await mongoStorage.createLog({
      userId: 0, // System
      action: 'local-opener-telemetry',
      documentId: null,
      details: {
        ...data,
        clientIp
      }
    });
  } catch (error) {
    logger.error('Error saving telemetry metrics', { error: error instanceof Error ? error.message : String(error) });
  }
}

// Funzione helper per ottenere statistiche aggregate
async function getLocalOpenerStats(): Promise<any> {
  // Questa funzione potrebbe richiedere query di aggregazione complesse su LogModel
  // Per ora manteniamo l'implementazione dummy o una semplice query
  return {
    totalInstallations: 0, // Placeholder
    activeUsers: 0,
    successRate: 0,
    commonIssues: [],
    versionDistribution: {},
    platformDistribution: {}
  };
}

// Auto-updater per Local Opener
// Controlla versioni e propone aggiornamenti automatici

const https = require('https');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const os = require('os');

class LocalOpenerUpdater {
  constructor() {
    this.currentVersion = "1.0.0"; // Da leggere da package.json
    this.updateCheckInterval = 24 * 60 * 60 * 1000; // 24 ore
    this.configDir = path.join(os.homedir(), '.local-opener');
    this.updateConfigFile = path.join(this.configDir, 'update-config.json');
    this.lastCheckFile = path.join(this.configDir, 'last-update-check.json');
  }

  async initialize() {
    try {
      // Leggi versione corrente dal package.json se disponibile
      const packagePath = path.join(__dirname, 'package.json');
      if (fs.existsSync(packagePath)) {
        const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf-8'));
        this.currentVersion = pkg.version;
      }

      // Avvia controllo periodico
      this.startPeriodicCheck();
      
      console.log(`[auto-updater] Inizializzato - Versione corrente: ${this.currentVersion}`);
    } catch (error) {
      console.error('[auto-updater] Errore inizializzazione:', error.message);
    }
  }

  startPeriodicCheck() {
    // Controlla immediatamente se è passato tempo sufficiente dall'ultimo check
    this.checkIfUpdateNeeded();
    
    // Imposta controllo periodico
    setInterval(() => {
      this.checkIfUpdateNeeded();
    }, this.updateCheckInterval);
  }

  async checkIfUpdateNeeded() {
    try {
      const lastCheck = this.getLastCheckTime();
      const now = Date.now();
      
      // Controlla solo se sono passate almeno 24 ore dall'ultimo controllo
      if (now - lastCheck < this.updateCheckInterval) {
        return;
      }

      console.log('[auto-updater] Controllo aggiornamenti disponibili...');
      
      const latestVersion = await this.fetchLatestVersion();
      if (this.isNewerVersion(latestVersion, this.currentVersion)) {
        console.log(`[auto-updater] Nuova versione disponibile: ${latestVersion}`);
        await this.handleUpdateAvailable(latestVersion);
      } else {
        console.log('[auto-updater] Sistema aggiornato');
      }

      // Salva timestamp ultimo controllo
      this.saveLastCheckTime(now);
      
    } catch (error) {
      console.error('[auto-updater] Errore controllo aggiornamenti:', error.message);
    }
  }

  async fetchLatestVersion() {
    return new Promise((resolve, reject) => {
      // URL del tuo server per ottenere l'ultima versione
      const options = {
        hostname: 'api.cruscotto-sgi.com', // Sostituisci con il tuo dominio
        path: '/api/local-opener/latest-version',
        method: 'GET',
        timeout: 10000,
        headers: {
          'User-Agent': `Local-Opener/${this.currentVersion}`,
        }
      };

      const req = https.request(options, (res) => {
        let data = '';
        
        res.on('data', (chunk) => {
          data += chunk;
        });
        
        res.on('end', () => {
          try {
            const response = JSON.parse(data);
            resolve(response.version || response.latestVersion);
          } catch (err) {
            reject(new Error('Formato risposta invalido'));
          }
        });
      });

      req.on('error', (err) => {
        reject(err);
      });

      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Timeout controllo versione'));
      });

      req.end();
    });
  }

  isNewerVersion(remote, local) {
    const remoteparts = remote.split('.').map(Number);
    const localParts = local.split('.').map(Number);
    
    for (let i = 0; i < Math.max(remoteparts.length, localParts.length); i++) {
      const remotePart = remoteparts[i] || 0;
      const localPart = localParts[i] || 0;
      
      if (remotePart > localPart) return true;
      if (remotePart < localPart) return false;
    }
    
    return false;
  }

  async handleUpdateAvailable(newVersion) {
    const updateConfig = this.getUpdateConfig();
    
    // Controlla se l'utente ha disabilitato gli aggiornamenti automatici
    if (updateConfig.autoUpdateDisabled) {
      console.log('[auto-updater] Aggiornamenti automatici disabilitati dall\'utente');
      return;
    }

    // Controlla se questa versione è stata già saltata dall'utente
    if (updateConfig.skippedVersions && updateConfig.skippedVersions.includes(newVersion)) {
      console.log(`[auto-updater] Versione ${newVersion} saltata dall'utente`);
      return;
    }

    try {
      // Invia notifica al servizio locale per mostrare prompt di aggiornamento
      await this.notifyUpdateAvailable(newVersion);
    } catch (error) {
      console.error('[auto-updater] Errore notifica aggiornamento:', error.message);
    }
  }

  async notifyUpdateAvailable(newVersion) {
    // Crea file di notifica che verrà letto dal servizio principale
    const notificationFile = path.join(this.configDir, 'update-notification.json');
    const notification = {
      type: 'update-available',
      newVersion: newVersion,
      currentVersion: this.currentVersion,
      timestamp: new Date().toISOString(),
      downloadUrl: `https://api.cruscotto-sgi.com/downloads/cruscotto-local-opener-setup-${newVersion}.exe`
    };

    fs.writeFileSync(notificationFile, JSON.stringify(notification, null, 2));
    console.log(`[auto-updater] Notifica aggiornamento creata per versione ${newVersion}`);
  }

  getLastCheckTime() {
    try {
      if (fs.existsSync(this.lastCheckFile)) {
        const data = JSON.parse(fs.readFileSync(this.lastCheckFile, 'utf-8'));
        return data.timestamp || 0;
      }
    } catch (error) {
      console.error('[auto-updater] Errore lettura ultimo controllo:', error.message);
    }
    return 0;
  }

  saveLastCheckTime(timestamp) {
    try {
      if (!fs.existsSync(this.configDir)) {
        fs.mkdirSync(this.configDir, { recursive: true });
      }
      
      fs.writeFileSync(this.lastCheckFile, JSON.stringify({
        timestamp: timestamp,
        version: this.currentVersion
      }, null, 2));
    } catch (error) {
      console.error('[auto-updater] Errore salvataggio ultimo controllo:', error.message);
    }
  }

  getUpdateConfig() {
    try {
      if (fs.existsSync(this.updateConfigFile)) {
        return JSON.parse(fs.readFileSync(this.updateConfigFile, 'utf-8'));
      }
    } catch (error) {
      console.error('[auto-updater] Errore lettura configurazione aggiornamenti:', error.message);
    }
    
    // Configurazione di default
    return {
      autoUpdateDisabled: false,
      skippedVersions: []
    };
  }

  saveUpdateConfig(config) {
    try {
      if (!fs.existsSync(this.configDir)) {
        fs.mkdirSync(this.configDir, { recursive: true });
      }
      
      fs.writeFileSync(this.updateConfigFile, JSON.stringify(config, null, 2));
    } catch (error) {
      console.error('[auto-updater] Errore salvataggio configurazione:', error.message);
    }
  }

  // API per gestire le preferenze utente
  disableAutoUpdate() {
    const config = this.getUpdateConfig();
    config.autoUpdateDisabled = true;
    this.saveUpdateConfig(config);
    console.log('[auto-updater] Aggiornamenti automatici disabilitati');
  }

  enableAutoUpdate() {
    const config = this.getUpdateConfig();
    config.autoUpdateDisabled = false;
    this.saveUpdateConfig(config);
    console.log('[auto-updater] Aggiornamenti automatici abilitati');
  }

  skipVersion(version) {
    const config = this.getUpdateConfig();
    if (!config.skippedVersions) {
      config.skippedVersions = [];
    }
    if (!config.skippedVersions.includes(version)) {
      config.skippedVersions.push(version);
      this.saveUpdateConfig(config);
      console.log(`[auto-updater] Versione ${version} aggiunta alla lista skip`);
    }
  }

  async downloadAndInstallUpdate(downloadUrl) {
    return new Promise((resolve, reject) => {
      const tempFile = path.join(os.tmpdir(), 'local-opener-update.exe');
      
      console.log('[auto-updater] Download aggiornamento in corso...');
      
      const file = fs.createWriteStream(tempFile);
      const request = https.get(downloadUrl, (response) => {
        response.pipe(file);
        
        file.on('finish', () => {
          file.close();
          console.log('[auto-updater] Download completato, avvio installazione...');
          
          // Esegui installer in modalità silent
          exec(`"${tempFile}" /SILENT /NORESTART`, (error, stdout, stderr) => {
            if (error) {
              reject(new Error(`Errore installazione: ${error.message}`));
              return;
            }
            
            console.log('[auto-updater] Aggiornamento installato con successo');
            
            // Pulizia file temporaneo
            try {
              fs.unlinkSync(tempFile);
            } catch (err) {
              console.warn('[auto-updater] Impossibile eliminare file temporaneo:', err.message);
            }
            
            resolve();
          });
        });
      });

      request.on('error', (err) => {
        reject(err);
      });
    });
  }
}

// Export per uso come modulo
module.exports = LocalOpenerUpdater;

// Se eseguito direttamente, avvia l'updater
if (require.main === module) {
  const updater = new LocalOpenerUpdater();
  updater.initialize();
}

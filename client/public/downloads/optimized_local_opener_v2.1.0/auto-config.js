// auto-config.js - Da includere in index.js
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

class GoogleDriveAutoConfig {
    constructor() {
        this.configPath = path.join(
            process.env.APPDATA || process.env.HOME,
            '.local-opener',
            'config.json'
        );
        this.detectedPaths = [];
        this.configCheckInterval = 30000; // Check ogni 30 secondi
    }

    async initialize() {
        console.log('[AutoConfig] Inizializzazione auto-configurazione...');
        
        // Carica config esistente o crea nuova
        await this.loadOrCreateConfig();
        
        // Avvia monitoraggio periodico
        this.startPeriodicCheck();
        
        return this.detectedPaths;
    }

    async loadOrCreateConfig() {
        try {
            if (fs.existsSync(this.configPath)) {
                const config = JSON.parse(fs.readFileSync(this.configPath, 'utf8'));
                this.detectedPaths = config.paths || [];
                console.log(`[AutoConfig] Configurazione caricata: ${this.detectedPaths.length} percorsi`);
            }
            
            // Se non ci sono percorsi, rileva automaticamente
            if (this.detectedPaths.length === 0) {
                await this.detectGoogleDrivePaths();
                await this.saveConfig();
            }
        } catch (error) {
            console.error('[AutoConfig] Errore caricamento config:', error);
            await this.detectGoogleDrivePaths();
            await this.saveConfig();
        }
    }

    async detectGoogleDrivePaths() {
        console.log('[AutoConfig] Rilevamento automatico percorsi Google Drive...');
        const paths = new Set();

        // 1. Cerca in tutti i drive
        const drives = 'CDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
        for (const drive of drives) {
            const patterns = [
                `${drive}:\\Il mio Drive`,
                `${drive}:\\My Drive`,
                `${drive}:\\Mon Drive`,
                `${drive}:\\Drive condivisi`,
                `${drive}:\\Shared drives`,
                `${drive}:\\.shortcut-targets-by-id`
            ];

            for (const pattern of patterns) {
                if (fs.existsSync(pattern)) {
                    paths.add(pattern);
                    console.log(`[AutoConfig] ✓ Trovato: ${pattern}`);

                    // Se è shortcut-targets, aggiungi sottocartelle
                    if (pattern.includes('shortcut-targets')) {
                        try {
                            const shortcuts = fs.readdirSync(pattern);
                            shortcuts.forEach(shortcut => {
                                const fullPath = path.join(pattern, shortcut);
                                if (fs.statSync(fullPath).isDirectory()) {
                                    paths.add(fullPath);
                                    console.log(`[AutoConfig] ✓ Trovato shortcut: ${fullPath}`);
                                }
                            });
                        } catch (e) {
                            // Ignora errori di accesso
                        }
                    }
                }
            }
        }

        // 2. Cerca nella home directory
        const homePaths = [
            path.join(process.env.USERPROFILE || process.env.HOME, 'Google Drive'),
            path.join(process.env.USERPROFILE || process.env.HOME, 'GoogleDrive'),
            path.join(process.env.USERPROFILE || process.env.HOME, 'Drive')
        ];

        homePaths.forEach(p => {
            if (fs.existsSync(p)) {
                paths.add(p);
                console.log(`[AutoConfig] ✓ Trovato: ${p}`);
            }
        });

        // 3. Cerca nel registro Windows
        if (process.platform === 'win32') {
            await this.checkWindowsRegistry(paths);
        }

        this.detectedPaths = Array.from(paths);
        console.log(`[AutoConfig] Totale percorsi rilevati: ${this.detectedPaths.length}`);
        
        return this.detectedPaths;
    }

    async checkWindowsRegistry(paths) {
        return new Promise((resolve) => {
            exec('reg query "HKCU\\Software\\Google\\DriveFS" /v Path', (error, stdout) => {
                if (!error && stdout) {
                    const match = stdout.match(/Path\s+REG_SZ\s+(.+)/);
                    if (match && match[1]) {
                        const regPath = match[1].trim();
                        if (fs.existsSync(regPath)) {
                            paths.add(regPath);
                            console.log(`[AutoConfig] ✓ Trovato dal registro: ${regPath}`);
                        }
                    }
                }
                resolve();
            });
        });
    }

    async saveConfig() {
        const config = {
            version: '2.0.0',
            paths: this.detectedPaths,
            lastUpdate: new Date().toISOString(),
            autoDetected: true
        };

        const dir = path.dirname(this.configPath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }

        fs.writeFileSync(this.configPath, JSON.stringify(config, null, 2));
        console.log(`[AutoConfig] Configurazione salvata in: ${this.configPath}`);
    }

    startPeriodicCheck() {
        // Check periodico per nuovi percorsi
        setInterval(async () => {
            const previousCount = this.detectedPaths.length;
            await this.detectGoogleDrivePaths();
            
            if (this.detectedPaths.length !== previousCount) {
                console.log(`[AutoConfig] Nuovi percorsi rilevati, aggiornamento configurazione...`);
                await this.saveConfig();
            }
        }, this.configCheckInterval);
    }

    getPaths() {
        return this.detectedPaths;
    }
}

// INTEGRAZIONE NEL TUO index.js ESISTENTE
// Aggiungi questo all'inizio del tuo file index.js:

const autoConfig = new GoogleDriveAutoConfig();
let authorizedPaths = [];

// Inizializza auto-config all'avvio
(async () => {
    authorizedPaths = await autoConfig.initialize();
    console.log(`[local-opener] Percorsi autorizzati: ${authorizedPaths.join(', ')}`);
})();

// Modifica la tua funzione di verifica percorsi per usare authorizedPaths
function isPathAuthorized(filePath) {
    // Verifica se il file è in uno dei percorsi autorizzati
    return authorizedPaths.some(authPath => 
        filePath.toLowerCase().startsWith(authPath.toLowerCase())
    );
}

// Esporta per uso nel resto dell'app
module.exports = { autoConfig, isPathAuthorized };

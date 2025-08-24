#!/usr/bin/env node

/**
 * Script per aggiornare il file ZIP di Local Opener
 * Include tutti i nuovi file per la soluzione del servizio Windows nativo
 */

const fs = require('fs');
const path = require('path');
const archiver = require('archiver');

// Percorsi
const SOURCE_DIR = path.join(__dirname, 'optimized_local_opener');
const OUTPUT_ZIP = path.join(__dirname, 'optimized_local_opener.zip');

// Lista dei file da includere nel ZIP
const FILES_TO_INCLUDE = [
    // File principali del servizio
    'local-opener.exe',
    'nssm.exe',
    'index.js',
    'index.js.backup',
    'package.json',
    'README.txt',
    
    // Script di installazione del servizio Windows
    'INSTALLA-SERVIZIO-FINALE.bat',
    'INSTALLA-SERVIZIO-AMMINISTRATORE.bat',
    'DISINSTALLA-SERVIZIO.bat',
    'GESTISCI-SERVIZIO.bat',
    
    // Script di diagnostica e gestione
    'diagnostica-servizio.bat',
    'diagnostica-servizio.ps1',
    'disinstalla-servizio-admin.ps1',
    'DISINSTALLA-LOCAL-OPENER.bat',
    
    // Documentazione
    'README-SERVIZIO-WINDOWS.md',
    
    // Cartella assets
    'assets/'
];

// File da escludere (file temporanei o di sviluppo)
const FILES_TO_EXCLUDE = [
    'node_modules/',
    '.git/',
    '.vscode/',
    '*.log',
    '*.tmp',
    '*.temp'
];

async function createUpdatedZip() {
    console.log('🚀 Aggiornamento ZIP Local Opener con soluzione servizio Windows...');
    
    // Verifica che la directory sorgente esista
    if (!fs.existsSync(SOURCE_DIR)) {
        console.error('❌ Directory sorgente non trovata:', SOURCE_DIR);
        process.exit(1);
    }
    
    // Crea un nuovo file ZIP
    const output = fs.createWriteStream(OUTPUT_ZIP);
    const archive = archiver('zip', {
        zlib: { level: 9 } // Compressione massima
    });
    
    output.on('close', () => {
        const sizeInMB = (archive.pointer() / 1024 / 1024).toFixed(2);
        console.log(`✅ ZIP creato con successo!`);
        console.log(`📦 Dimensione: ${sizeInMB} MB`);
        console.log(`📁 Percorso: ${OUTPUT_ZIP}`);
        console.log(`🎯 File inclusi: ${FILES_TO_INCLUDE.length}`);
    });
    
    archive.on('error', (err) => {
        console.error('❌ Errore durante la creazione del ZIP:', err);
        process.exit(1);
    });
    
    archive.pipe(output);
    
    // Aggiungi i file specificati
    for (const file of FILES_TO_INCLUDE) {
        const filePath = path.join(SOURCE_DIR, file);
        
        if (fs.existsSync(filePath)) {
            const stats = fs.statSync(filePath);
            
            if (stats.isDirectory()) {
                // Aggiungi cartella
                console.log(`📁 Aggiungo cartella: ${file}`);
                archive.directory(filePath, file);
            } else {
                // Aggiungi file
                console.log(`📄 Aggiungo file: ${file}`);
                archive.file(filePath, { name: file });
            }
        } else {
            console.warn(`⚠️  File non trovato: ${file}`);
        }
    }
    
    // Aggiungi anche tutti i file .bat e .ps1 che potrebbero essere stati aggiunti
    const allFiles = fs.readdirSync(SOURCE_DIR, { recursive: true });
    for (const file of allFiles) {
        if (typeof file === 'string') {
            const filePath = path.join(SOURCE_DIR, file);
            const stats = fs.statSync(filePath);
            
            if (stats.isFile()) {
                const ext = path.extname(file).toLowerCase();
                const isScript = ['.bat', '.ps1', '.md', '.txt'].includes(ext);
                const isExecutable = ['.exe', '.js'].includes(ext);
                const isConfig = file === 'package.json';
                
                // Aggiungi script, eseguibili e file di configurazione se non sono già inclusi
                if ((isScript || isExecutable || isConfig) && !FILES_TO_INCLUDE.includes(file)) {
                    console.log(`➕ Aggiungo file aggiuntivo: ${file}`);
                    archive.file(filePath, { name: file });
                }
            }
        }
    }
    
    // Finalizza l'archivio
    await archive.finalize();
}

// Funzione per verificare i file presenti
function listFilesInDirectory(dir, prefix = '') {
    const items = fs.readdirSync(dir);
    
    for (const item of items) {
        const fullPath = path.join(dir, item);
        const stats = fs.statSync(fullPath);
        
        if (stats.isDirectory()) {
            console.log(`${prefix}📁 ${item}/`);
            listFilesInDirectory(fullPath, prefix + '  ');
        } else {
            const size = (stats.size / 1024).toFixed(1);
            console.log(`${prefix}📄 ${item} (${size} KB)`);
        }
    }
}

// Funzione principale
async function main() {
    try {
        console.log('🔍 Contenuto directory sorgente:');
        console.log('=' .repeat(50));
        listFilesInDirectory(SOURCE_DIR);
        console.log('=' .repeat(50));
        
        await createUpdatedZip();
        
        console.log('\n🎉 Aggiornamento completato!');
        console.log('\n📋 File inclusi nel nuovo ZIP:');
        console.log('✅ Tutti gli script per il servizio Windows nativo');
        console.log('✅ Documentazione completa');
        console.log('✅ File eseguibili e di configurazione');
        console.log('✅ Script di diagnostica e gestione');
        
    } catch (error) {
        console.error('❌ Errore durante l\'aggiornamento:', error);
        process.exit(1);
    }
}

// Esegui se chiamato direttamente
if (require.main === module) {
    main();
}

module.exports = { createUpdatedZip, listFilesInDirectory };

// Simple local companion to open files on Windows based on logical metadata.
// SECURITY: This server is intended to run only on localhost and trust the user.
// It will only attempt to open files that are within a configured ROOT_DIR to
// avoid arbitrary path traversal.

const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const os = require("os");
const { exec } = require("child_process");

const PORT = 17654;

// Persistent config (multi-root support)
const CONFIG_DIR = process.env.LOCAL_OPENER_CONFIG_DIR || path.join(os.homedir(), ".local-opener");
const CONFIG_FILE = path.join(CONFIG_DIR, "config.json");

function readConfig() {
  try {
    if (!fs.existsSync(CONFIG_DIR)) fs.mkdirSync(CONFIG_DIR, { recursive: true });
    if (!fs.existsSync(CONFIG_FILE)) {
      const initial = {
        roots: process.env.LOCAL_OPENER_ROOT ? [process.env.LOCAL_OPENER_ROOT] : [],
      };
      fs.writeFileSync(CONFIG_FILE, JSON.stringify(initial, null, 2));
      return initial;
    }
    const raw = fs.readFileSync(CONFIG_FILE, "utf-8");
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed.roots)) parsed.roots = [];
    return parsed;
  } catch (e) {
    return { roots: [] };
  }
}

function writeConfig(cfg) {
  if (!fs.existsSync(CONFIG_DIR)) fs.mkdirSync(CONFIG_DIR, { recursive: true });
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(cfg, null, 2));
}

let CONFIG = readConfig();

function discoverDefaultRoots() {
  const roots = new Set(CONFIG.roots || []);
  const addIfDir = (p) => {
    try {
      if (p && fs.existsSync(p) && fs.statSync(p).isDirectory()) {
        // Verifica che la cartella sia realmente accessibile
        try {
          fs.readdirSync(p, { withFileTypes: true });
          roots.add(path.resolve(p));
          console.log(`[local-opener] ✅ Cartella Google Drive trovata e accessibile: ${p}`);
        } catch (accessError) {
          console.log(`[local-opener] ⚠️ Cartella trovata ma non accessibile: ${p}`);
        }
      }
    } catch {}
  };

  const platform = process.platform;
  const home = os.homedir();

  if (platform === 'win32') {
    console.log(`[local-opener] 🔍 Ricerca cartelle Google Drive su Windows...`);
    console.log(`[local-opener] 🔧 Utente servizio: ${os.userInfo().username} | Home: ${home}`);
    
    // Windows – Mirror (cartelle fisiche) - Ricerca in TUTTE le directory utente
    const mirrorPaths = [
      // Directory utente corrente (potrebbe essere SYSTEM se servizio)
      path.join(home, 'Google Drive'),
      path.join(home, 'GoogleDrive'),
      path.join(home, 'Documents', 'Google Drive'),
      path.join(home, 'Desktop', 'Google Drive'),
      // Directory utente nominale
      path.join('C:', 'Users', os.userInfo().username, 'Google Drive'),
      path.join('C:', 'Users', 'Public', 'Google Drive')
    ];
    
    // SCANSIONE INTELLIGENTE: Scansione di TUTTI gli utenti in C:\Users\
    try {
      console.log(`[local-opener] 👥 Scansione cartelle di tutti gli utenti...`);
      const usersDir = 'C:\\Users';
      if (fs.existsSync(usersDir)) {
        const userFolders = fs.readdirSync(usersDir, { withFileTypes: true });
        
        for (const userFolder of userFolders) {
          if (userFolder.isDirectory() && 
              !['Public', 'Default', 'All Users', 'defaultuser0', 'WDAGUtilityAccount'].includes(userFolder.name) &&
              !userFolder.name.startsWith('.') &&
              !userFolder.name.startsWith('$')) {
            
            const userPath = path.join(usersDir, userFolder.name);
            console.log(`[local-opener] 👤 Controllo utente: ${userFolder.name}`);
            
            // Aggiungi tutti i possibili percorsi Google Drive per questo utente
            const userMirrorPaths = [
              path.join(userPath, 'Google Drive'),
              path.join(userPath, 'GoogleDrive'), 
              path.join(userPath, 'Documents', 'Google Drive'),
              path.join(userPath, 'Desktop', 'Google Drive'),
              path.join(userPath, 'OneDrive', 'Google Drive'), // Casi particolari
              path.join(userPath, 'Dropbox', 'Google Drive')  // Casi particolari
            ];
            
            userMirrorPaths.forEach(addIfDir);
          }
        }
      }
    } catch (scanError) {
      console.log(`[local-opener] ⚠️ Errore scansione utenti: ${scanError.message}`);
    }
    
    mirrorPaths.forEach(addIfDir);

    // Windows – Stream (Drive montato con lettere variabili). Scansione completa C-Z
    const letters = 'CDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
    for (const L of letters) {
      const root = `${L}:\\`;
      try {
        if (!fs.existsSync(root)) continue;
        
        // Pattern di ricerca più completi per tutte le versioni di Google Drive
        const googleDrivePatterns = [
          'Il mio Drive',      // Italiano Google Drive Stream
          'My Drive',          // Inglese Google Drive Stream  
          'Drive condivisi',   // Italiano Shared Drives
          'Shared drives',     // Inglese Shared Drives
          'Team Drives',       // Legacy Team Drives
          'Google Drive',      // Cartelle fisiche
          'GoogleDrive'        // Nuove installazioni Google Drive Desktop
        ];
        
        let hasGoogleDriveContent = false;
        
        // Controlla ogni pattern
        for (const pattern of googleDrivePatterns) {
          const fullPath = path.join(root, pattern);
          if (fs.existsSync(fullPath) && fs.statSync(fullPath).isDirectory()) {
            hasGoogleDriveContent = true;
            addIfDir(fullPath);
          }
        }
        
        // Se la lettera contiene cartelle Google Drive, aggiungi anche la root
        if (hasGoogleDriveContent) {
          addIfDir(root);
        }
        
        // Ricerca ricorsiva di primo livello per pattern nascosti
        try {
          const entries = fs.readdirSync(root, { withFileTypes: true });
          for (const entry of entries) {
            if (entry.isDirectory()) {
              const entryName = entry.name.toLowerCase();
              if (entryName.includes('google') && entryName.includes('drive')) {
                const fullPath = path.join(root, entry.name);
                addIfDir(fullPath);
              }
            }
          }
        } catch {}
        
      } catch {}
    }
    
    // Controllo variabili ambiente per percorsi personalizzati
    console.log(`[local-opener] 🌐 Controllo variabili ambiente...`);
    const possibleEnvVars = [
      'GOOGLE_DRIVE_PATH',
      'GOOGLEDRIVE_PATH', 
      'GDRIVE_PATH',
      'USERPROFILE', // Controlla anche USERPROFILE per fallback
      'HOMEPATH'
    ];
    
    possibleEnvVars.forEach(envVar => {
      const envValue = process.env[envVar];
      if (envValue) {
        if (envVar === 'USERPROFILE' || envVar === 'HOMEPATH') {
          // Per USERPROFILE, aggiungi i path standard Google Drive
          const userProfilePaths = [
            path.join(envValue, 'Google Drive'),
            path.join(envValue, 'GoogleDrive'),
            path.join(envValue, 'Documents', 'Google Drive')
          ];
          userProfilePaths.forEach(p => {
            console.log(`[local-opener] 🔍 Controllo da ${envVar}: ${p}`);
            addIfDir(p);
          });
        } else {
          console.log(`[local-opener] 📂 ${envVar} trovata: ${envValue}`);
          addIfDir(envValue);
        }
      }
    });
    
  } else if (platform === 'darwin') {
    // macOS – Supporto completo
    addIfDir('/Volumes/GoogleDrive');
    addIfDir('/Volumes/GoogleDrive-1');
    addIfDir('/Volumes/Google Drive');
    addIfDir(path.join(home, 'Google Drive'));
    addIfDir(path.join(home, 'GoogleDrive'));
  }

  const rootsArray = Array.from(roots);
  console.log(`[local-opener] 📂 Cartelle Google Drive configurate: ${rootsArray.length}`);
  rootsArray.forEach(root => console.log(`[local-opener]   - ${root}`));
  
  return rootsArray;
}

// Merge auto-discovered roots on startup
CONFIG.roots = discoverDefaultRoots();
writeConfig(CONFIG);

const app = express();
app.use(cors());
app.use(express.json());

// Root endpoint per verificare che il servizio sia attivo
app.get("/", (_req, res) => {
  res.send(`
    <html>
      <head><title>Local Opener Service</title></head>
      <body style="font-family: Arial, sans-serif; padding: 20px;">
        <h1>Local Opener Service ✅</h1>
        <p>Il servizio è attivo e funzionante!</p>
        <p>Endpoint disponibili:</p>
        <ul>
          <li><a href="/health">/health</a> - Stato del servizio</li>
          <li><a href="/config">/config</a> - Configurazione cartelle</li>
          <li><strong>POST /auto-detect-paths</strong> - Rilevazione automatica Google Drive</li>
          <li><strong>POST /reconfigure-paths</strong> - Riconfigurazione forzata percorsi</li>
          <li><strong>POST /open</strong> - Apertura documenti locali</li>
        </ul>
        <p>Versione: 1.0.0</p>
      </body>
    </html>
  `);
});

function isPathInside(child, parent) {
  const rel = path.relative(parent, child);
  return !rel.startsWith("..") && !path.isAbsolute(rel);
}

function findCandidateInRoot(rootDir, logicalPath, candidates, fileType) {
  const normalizedLogical = logicalPath ? logicalPath.replace(/\\/g, "/") : "";
  let dir = rootDir;
  if (normalizedLogical) {
    let segments = normalizedLogical.split("/").filter(Boolean);
    // Drop filename segment if present
    if (segments.length > 0 && /\.[A-Za-z]{2,5}$/.test(segments[segments.length - 1])) {
      segments = segments.slice(0, -1);
    }
    // Avoid duplicate root segment
    const rootBase = path.basename(rootDir).toLowerCase();
    const first = (segments[0] || "").toLowerCase();
    const aliases = new Set(["il mio drive", "my drive", "drive condivisi", "shared drives", "google drive"]);
    if (first === rootBase || aliases.has(first)) {
      segments = segments.slice(1);
    }
    dir = segments.length > 0 ? path.join(rootDir, ...segments) : rootDir;
  }

  const absDir = path.resolve(dir);
  if (!isPathInside(absDir, path.resolve(rootDir))) {
    return null;
  }

  let targetDir = absDir;
  try {
    const stat = fs.statSync(targetDir);
    if (!stat.isDirectory()) throw new Error("not a dir");
  } catch {
    const parent = path.dirname(targetDir);
    try {
      const st = fs.statSync(parent);
      if (st.isDirectory()) {
        targetDir = parent;
      } else {
        return null;
      }
    } catch {
      return null;
    }
  }

  for (const name of candidates || []) {
    const candidatePath = path.resolve(targetDir, name);
    if (isPathInside(candidatePath, path.resolve(rootDir))) {
      if (fs.existsSync(candidatePath)) {
        return candidatePath;
      }
    }
  }

  try {
    const entries = fs.readdirSync(targetDir);
    for (const entry of entries) {
      for (const name of candidates || []) {
        if (entry.toLowerCase() === name.toLowerCase()) {
          const candidatePath = path.resolve(targetDir, entry);
          if (isPathInside(candidatePath, path.resolve(rootDir))) {
            return candidatePath;
          }
        }
      }
    }
    // Fallback fuzzy match by title/revision/ext
    const extLower = (String(fileType || "").replace(/^\./, "")).toLowerCase();
    if (extLower) {
      const titleLowerSet = new Set((candidates || []).map((n) => n.toLowerCase().replace(/\.[a-z0-9]+$/, "")));
      let best = null;
      for (const entry of entries) {
        const entryLower = entry.toLowerCase();
        const dot = entryLower.lastIndexOf(".");
        const entryExt = dot >= 0 ? entryLower.slice(dot + 1) : "";
        const entryBase = dot >= 0 ? entryLower.slice(0, dot) : entryLower;
        if (entryExt !== extLower) continue;
        // Prefer entries that contain one of the candidate bases
        for (const candBase of titleLowerSet) {
          const normalizedCand = candBase.replace(/[\s_-]+/g, "");
          const normalizedEntry = entryBase.replace(/[\s_-]+/g, "");
          if (normalizedEntry.includes(normalizedCand)) {
            best = entry;
            break;
          }
        }
        if (best) break;
      }
      if (best) {
        const candidatePath = path.resolve(targetDir, best);
        if (isPathInside(candidatePath, path.resolve(rootDir))) {
          return candidatePath;
        }
      }
    }
  } catch {}

  return null;
}

// Deep search abilitata di default
const deepEnv = String(process.env.LOCAL_OPENER_DEEP_SEARCH || "true");
const DEEP_SEARCH_ENABLED = /^(true|1|yes)$/i.test(deepEnv);
const DEEP_MAX_DEPTH = Math.max(1, Math.min(20, Number(process.env.LOCAL_OPENER_DEEP_MAX_DEPTH || 12)));
const DEEP_MAX_VISITED = Math.max(500, Math.min(100000, Number(process.env.LOCAL_OPENER_DEEP_MAX_VISITED || 40000)));

function findCandidateBySuffixScan(rootDir, logicalPath, candidates, fileType) {
  if (!DEEP_SEARCH_ENABLED) return null;
  const normalizedLogical = logicalPath ? logicalPath.replace(/\\/g, "/") : "";
  const segments = normalizedLogical.split("/").filter(Boolean);
  if (segments.length === 0) return null;

  let suffixSegments = segments;
  if (/\.[A-Za-z]{2,5}$/.test(suffixSegments[suffixSegments.length - 1])) {
    suffixSegments = suffixSegments.slice(0, -1);
  }
  const suffixLower = path.join(...suffixSegments).toLowerCase();

  let visited = 0;
  function walk(current, depth) {
    if (visited > DEEP_MAX_VISITED) return null;
    if (depth > DEEP_MAX_DEPTH) return null;
    visited++;
    let stat;
    try { stat = fs.statSync(current); } catch { return null; }
    if (!stat.isDirectory()) return null;

    const lower = current.toLowerCase().replace(/\\/g, "/");
    if (lower.endsWith(suffixLower.replace(/\\/g, "/"))) {
      try {
        const entries = fs.readdirSync(current);
        for (const entry of entries) {
          for (const name of candidates || []) {
            if (entry.toLowerCase() === name.toLowerCase()) {
              const candidatePath = path.resolve(current, entry);
              if (isPathInside(candidatePath, path.resolve(rootDir))) {
                return candidatePath;
              }
            }
          }
        }
        // Fuzzy fallback in deep dirs too
        const extLower = (String(fileType || "").replace(/^\./, "")).toLowerCase();
        if (extLower) {
          const titleLowerSet = new Set((candidates || []).map((n) => n.toLowerCase().replace(/\.[a-z0-9]+$/, "")));
          for (const entry of entries) {
            const entryLower = entry.toLowerCase();
            const dot = entryLower.lastIndexOf(".");
            const entryExt = dot >= 0 ? entryLower.slice(dot + 1) : "";
            const entryBase = dot >= 0 ? entryLower.slice(0, dot) : entryLower;
            if (entryExt !== extLower) continue;
            for (const candBase of titleLowerSet) {
              const normalizedCand = candBase.replace(/[\s_-]+/g, "");
              const normalizedEntry = entryBase.replace(/[\s_-]+/g, "");
              if (normalizedEntry.includes(normalizedCand)) {
                const candidatePath = path.resolve(current, entry);
                if (isPathInside(candidatePath, path.resolve(rootDir))) {
                  return candidatePath;
                }
              }
            }
          }
        }
      } catch {}
    }

    let dirEntries = [];
    try { dirEntries = fs.readdirSync(current, { withFileTypes: true }); } catch { return null; }
    for (const de of dirEntries) {
      if (!de.isDirectory()) continue;
      const child = path.join(current, de.name);
      const found = walk(child, depth + 1);
      if (found) return found;
      if (visited > DEEP_MAX_VISITED) return null;
    }
    return null;
  }

  return walk(rootDir, 0);
}

// Fallback: scan by filename anywhere under the root
function findByFilenameScan(rootDir, candidates, fileType) {
  const extLower = (String(fileType || "").replace(/^\./, "")).toLowerCase();
  if (!Array.isArray(candidates) || candidates.length === 0) return null;
  const candSetExact = new Set(candidates.map((n) => n.toLowerCase()));
  const candBases = candidates.map((n) => n.toLowerCase().replace(/\.[a-z0-9]+$/, ""));

  let visited = 0;
  function walk(current, depth) {
    if (visited > DEEP_MAX_VISITED) return null;
    if (depth > DEEP_MAX_DEPTH) return null;
    visited++;
    let stat;
    try { stat = fs.statSync(current); } catch { return null; }
    if (!stat.isDirectory()) return null;

    let entries = [];
    try { entries = fs.readdirSync(current, { withFileTypes: true }); } catch { return null; }

    for (const de of entries) {
      if (de.isFile()) {
        const entry = de.name;
        const lower = entry.toLowerCase();
        if (candSetExact.has(lower)) {
          const fp = path.resolve(current, entry);
          if (isPathInside(fp, path.resolve(rootDir))) return fp;
        }
        const dot = lower.lastIndexOf(".");
        const entryExt = dot >= 0 ? lower.slice(dot + 1) : "";
        const entryBase = dot >= 0 ? lower.slice(0, dot) : lower;
        if (!extLower || entryExt === extLower) {
          for (const cb of candBases) {
            const normCb = cb.replace(/[\s_-]+/g, "");
            const normEntry = entryBase.replace(/[\s_-]+/g, "");
            if (normEntry.includes(normCb)) {
              const fp = path.resolve(current, entry);
              if (isPathInside(fp, path.resolve(rootDir))) return fp;
            }
          }
        }
      }
    }

    for (const de of entries) {
      if (de.isDirectory()) {
        const child = path.join(current, de.name);
        const found = walk(child, depth + 1);
        if (found) return found;
        if (visited > DEEP_MAX_VISITED) return null;
      }
    }
    return null;
  }

  return walk(rootDir, 0);
}

function findCandidateFile({ logicalPath, candidates }) {
  for (const root of CONFIG.roots) {
    let found = findCandidateInRoot(root, logicalPath, candidates, undefined);
    if (!found) {
      found = findCandidateBySuffixScan(root, logicalPath, candidates, undefined);
    }
    if (found) return found;
  }
  return null;
}

app.get("/health", (_req, res) => {
  const isHealthy = true;
  const googleDriveDetected = CONFIG.roots.some(root => 
    root.toLowerCase().includes('google drive') || 
    root.toLowerCase().includes('my drive') || 
    root.toLowerCase().includes('il mio drive')
  );
  
  res.json({ 
    ok: true, 
    roots: CONFIG.roots || [],
    version: "1.0.0",
    googleDriveDetected: googleDriveDetected,
    platform: process.platform,
    arch: process.arch
  });
});

// Config endpoints to manage roots
app.get("/config", (_req, res) => {
  res.json({ roots: CONFIG.roots });
});

app.post("/config", (req, res) => {
  const { addRoot } = req.body || {};
  if (!addRoot || typeof addRoot !== "string") {
    return res.status(400).json({ message: "Parametro addRoot mancante" });
  }
  const root = path.resolve(addRoot);
  try {
    const st = fs.statSync(root);
    if (!st.isDirectory()) return res.status(400).json({ message: "Il percorso non è una cartella" });
  } catch {
    return res.status(400).json({ message: "Cartella non trovata" });
  }
  if (!CONFIG.roots.includes(root)) {
    CONFIG.roots.push(root);
    writeConfig(CONFIG);
  }
  res.json({ roots: CONFIG.roots });
});

app.delete("/config", (req, res) => {
  const { root } = req.body || {};
  if (!root || typeof root !== "string") {
    return res.status(400).json({ message: "Parametro root mancante" });
  }
  CONFIG.roots = CONFIG.roots.filter((r) => r !== path.resolve(root));
  writeConfig(CONFIG);
  res.json({ roots: CONFIG.roots });
});

// Endpoint per rilevazione automatica percorsi Google Drive
app.post("/auto-detect-paths", (_req, res) => {
  try {
    console.log(`[local-opener] 🔍 Richiesta rilevazione automatica percorsi...`);
    
    // Riesegui auto-discovery
    const detectedPaths = discoverDefaultRoots();
    
    // Aggiorna configurazione
    CONFIG.roots = detectedPaths;
    writeConfig(CONFIG);
    
    console.log(`[local-opener] ✅ Rilevazione completata: ${detectedPaths.length} percorsi trovati`);
    detectedPaths.forEach(path => console.log(`[local-opener]   - ${path}`));
    
    res.json({
      success: true,
      detectedPaths: detectedPaths,
      configuredPaths: detectedPaths,
      message: `Rilevati automaticamente ${detectedPaths.length} percorsi Google Drive`
    });
    
  } catch (error) {
    console.error(`[local-opener] ❌ Errore rilevazione automatica:`, error);
    
    res.status(500).json({
      success: false,
      detectedPaths: [],
      configuredPaths: CONFIG.roots || [],
      message: `Errore durante rilevazione automatica: ${error.message}`
    });
  }
});

// Endpoint per riconfigurazione forzata percorsi
app.post("/reconfigure-paths", (req, res) => {
  try {
    const { forcedPaths } = req.body || {};
    console.log(`[local-opener] 🔧 Richiesta riconfigurazione percorsi forzata...`);
    
    let configuredPaths = [];
    
    if (Array.isArray(forcedPaths) && forcedPaths.length > 0) {
      for (const forcedPath of forcedPaths) {
        try {
          if (fs.existsSync(forcedPath) && fs.statSync(forcedPath).isDirectory()) {
            configuredPaths.push(path.resolve(forcedPath));
            console.log(`[local-opener] ✅ Percorso forzato valido: ${forcedPath}`);
          } else {
            console.log(`[local-opener] ⚠️ Percorso forzato non valido: ${forcedPath}`);
          }
        } catch (err) {
          console.log(`[local-opener] ❌ Errore verifica percorso: ${forcedPath}`);
        }
      }
    }
    
    // Se nessun percorso forzato valido, esegui auto-discovery
    if (configuredPaths.length === 0) {
      console.log(`[local-opener] 🔍 Nessun percorso forzato valido, eseguo auto-discovery...`);
      configuredPaths = discoverDefaultRoots();
    }
    
    // Aggiorna configurazione
    CONFIG.roots = configuredPaths;
    writeConfig(CONFIG);
    
    console.log(`[local-opener] ✅ Riconfigurazione completata: ${configuredPaths.length} percorsi configurati`);
    configuredPaths.forEach(path => console.log(`[local-opener]   - ${path}`));
    
    res.json({
      success: true,
      configuredPaths: configuredPaths,
      message: `Configurati ${configuredPaths.length} percorsi Google Drive`
    });
    
  } catch (error) {
    console.error(`[local-opener] ❌ Errore riconfigurazione:`, error);
    
    res.status(500).json({
      success: false,
      configuredPaths: CONFIG.roots || [],
      message: `Errore durante riconfigurazione: ${error.message}`
    });
  }
});

app.post("/open", (req, res) => {
  const { title, revision, fileType, logicalPath, candidates } = req.body || {};

  if (!Array.isArray(candidates) || candidates.length === 0) {
    return res.status(400).json({ success: false, message: "Nessun candidato fornito" });
  }

  const filePath = (() => {
    for (const root of CONFIG.roots) {
      let f = findCandidateInRoot(root, logicalPath, candidates, fileType);
      if (!f) f = findCandidateBySuffixScan(root, logicalPath, candidates, fileType);
      if (!f) f = findByFilenameScan(root, candidates, fileType);
      if (f) return f;
    }
    return null;
  })();
  
  if (!filePath) {
    return res.status(404).json({ success: false, message: "File non trovato nel percorso locale" });
  }

  // Windows: use 'start' via cmd to open with default app
  const quoted = `"${filePath.replace(/"/g, '\\"')}"`;
  exec(`cmd /c start "" ${quoted}`, (err) => {
    if (err) {
      return res.status(500).json({ success: false, message: `Errore apertura: ${err.message}` });
    }
    
    res.json({ success: true, filePath: filePath });
  });
});

// Configurazione avanzata del server per stabilità
const server = app.listen(PORT, '127.0.0.1', () => {
  console.log(`[local-opener] ✅ Servizio avviato con successo!`);
  console.log(`[local-opener] 🌐 Listening on http://127.0.0.1:${PORT}`);
  console.log(`[local-opener] 📂 Cartelle configurate: ${CONFIG.roots.length}`);
  CONFIG.roots.forEach(root => console.log(`[local-opener]   - ${root}`));
  console.log(`[local-opener] 💻 Sistema: ${process.platform} ${process.arch}`);
  console.log(`[local-opener] 🔄 PID: ${process.pid}`);
});

// Gestione migliorata degli errori del server
server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`[local-opener] ❌ ERRORE: Porta ${PORT} già in uso. Altro Local Opener attivo?`);
    console.error(`[local-opener] 💡 Soluzione: Termina altri processi Local Opener o riavvia il PC`);
    process.exit(1);
  } else if (err.code === 'EACCES') {
    console.error(`[local-opener] ❌ ERRORE: Accesso negato alla porta ${PORT}`);
    console.error(`[local-opener] 💡 Soluzione: Esegui come amministratore o usa una porta diversa`);
    process.exit(1);
  } else {
    console.error('[local-opener] ❌ Errore server:', err?.message || err);
  }
});

// Gestione migliorata eccezioni non catturate
process.on('uncaughtException', (err) => {
  console.error('[local-opener] ❌ ECCEZIONE NON CATTURATA:', err?.stack || err);
  console.error('[local-opener] 🔄 Il servizio tenterà di continuare...');
  
  // In modalità servizio, non terminare immediatamente
  if (!process.env.NSSM_SERVICE_NAME) {
    setTimeout(() => {
      console.error('[local-opener] 🛑 Terminazione dopo eccezione critica');
      process.exit(1);
    }, 1000);
  }
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('[local-opener] ❌ PROMISE REJECTION NON GESTITA:', reason);
  console.error('[local-opener] 🔍 Promise:', promise);
});

// Gestione chiusura graceful
process.on('SIGTERM', () => {
  console.log('[local-opener] 🛑 Ricevuto SIGTERM, chiusura graceful...');
  server.close(() => {
    console.log('[local-opener] ✅ Servizio terminato correttamente');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('[local-opener] 🛑 Ricevuto SIGINT, chiusura graceful...');
  server.close(() => {
    console.log('[local-opener] ✅ Servizio terminato correttamente');
    process.exit(0);
  });
});

// Log informazioni di sistema per debug
setTimeout(() => {
  console.log(`[local-opener] 📊 Statistiche sistema:`);
  console.log(`[local-opener]   - Memoria: ${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`);
  console.log(`[local-opener]   - Uptime: ${Math.round(process.uptime())}s`);
  console.log(`[local-opener]   - Node.js: ${process.version}`);
}, 5000);

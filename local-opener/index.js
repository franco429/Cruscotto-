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

// Importa moduli di telemetria e auto-updater
const LocalOpenerTelemetry = require("./telemetry");
const LocalOpenerUpdater = require("./auto-updater");

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

// Inizializza telemetria e auto-updater
const telemetry = new LocalOpenerTelemetry();
const updater = new LocalOpenerUpdater();

// Avvia servizi ausiliari
telemetry.initialize();
updater.initialize();

function discoverDefaultRoots() {
  const roots = new Set(CONFIG.roots || []);
  const addIfDir = (p) => {
    try {
      if (p && fs.existsSync(p) && fs.statSync(p).isDirectory()) {
        roots.add(path.resolve(p));
      }
    } catch {}
  };

  const platform = process.platform; // 'win32' | 'darwin' | 'linux'
  const home = os.homedir();

  if (platform === 'win32') {
    // Windows – Mirror (cartella fisica)
    addIfDir(path.join(home, 'Google Drive'));

    // Windows – Stream (Drive montato con lettera variabile). Scansiona C:..Z: (inclusa C: per completezza)
    const letters = 'CDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
    for (const L of letters) {
      const root = `${L}:\\`;
      try {
        if (!fs.existsSync(root)) continue;
        // Verifica pattern comuni per tutti i tipi di Google Drive
        const myDriveIT = path.join(root, 'Il mio Drive');
        const myDriveEN = path.join(root, 'My Drive');
        const sharedIT = path.join(root, 'Drive condivisi');
        const sharedEN = path.join(root, 'Shared drives');
        const teamDrives = path.join(root, 'Team Drives');
        
        // Aggiungi anche la root stessa se contiene sottocartelle Google Drive-like
        let hasGoogleDriveContent = false;
        
        if (
          (fs.existsSync(myDriveIT) && fs.statSync(myDriveIT).isDirectory()) ||
          (fs.existsSync(myDriveEN) && fs.statSync(myDriveEN).isDirectory()) ||
          (fs.existsSync(sharedIT) && fs.statSync(sharedIT).isDirectory()) ||
          (fs.existsSync(sharedEN) && fs.statSync(sharedEN).isDirectory()) ||
          (fs.existsSync(teamDrives) && fs.statSync(teamDrives).isDirectory())
        ) {
          hasGoogleDriveContent = true;
          addIfDir(myDriveIT);
          addIfDir(myDriveEN);
          addIfDir(sharedIT);
          addIfDir(sharedEN);
          addIfDir(teamDrives);
        }
        
        // Se la lettera ha contenuto Google Drive, aggiungi anche la root della lettera
        if (hasGoogleDriveContent) {
          addIfDir(root);
        }
      } catch {}
    }
  } else if (platform === 'darwin') {
    // macOS – Stream (volume montato)
    addIfDir('/Volumes/GoogleDrive');
    addIfDir('/Volumes/GoogleDrive-1');
    // macOS – Mirror (cartella fisica)
    addIfDir(path.join(home, 'Google Drive'));
  }

  return Array.from(roots);
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
    // Avoid duplicate root segment (e.g., root = G:\Il mio Drive, logical starts with "Il mio Drive")
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
    // Fallback: try parent directory (handles logical trailing ISO_NUMBER that isn't a real folder)
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
        // Prefer entries that contain one of the candidate bases (ignoring separators)
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

// Optional deep suffix search (disabled by default). Useful when the root is a drive letter like C:\
// and the logical path (e.g., ISO/Manuali) sits under a deeper subfolder (e.g., C:\Users\User\Desktop\ISO\Manuali).
// Deep search abilitata di default (puoi disabilitarla con LOCAL_OPENER_DEEP_SEARCH=false)
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
  // If last segment looks like filename, drop it to get the directory suffix
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

    // Quick suffix check
    const lower = current.toLowerCase().replace(/\\/g, "/");
    if (lower.endsWith(suffixLower.replace(/\\/g, "/"))) {
      // Check candidates in this directory
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

    // Recurse
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

// Fallback: scan by filename anywhere under the root (depth/visited limited)
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
  // Registra controllo di salute per telemetria
  const isHealthy = true;
  const googleDriveDetected = CONFIG.roots.some(root => 
    root.toLowerCase().includes('google drive') || 
    root.toLowerCase().includes('my drive') || 
    root.toLowerCase().includes('il mio drive')
  );
  
  telemetry.recordServiceHealth(isHealthy, CONFIG.roots.length, googleDriveDetected);
  
  // Assicurati che i percorsi siano serializzati correttamente
  res.json({ 
    ok: true, 
    roots: CONFIG.roots || [],
    version: "1.0.0",
    telemetry: telemetry.getMetricsSummary(),
    lastUpdateCheck: updater.getLastCheckTime ? updater.getLastCheckTime() : null
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
    
    // Registra cambio configurazione per telemetria
    telemetry.recordConfigurationChange('add_root', { rootPath: root });
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

app.post("/open", (req, res) => {
  const startTime = Date.now();
  const { title, revision, fileType, logicalPath, candidates } = req.body || {};

  if (!Array.isArray(candidates) || candidates.length === 0) {
    telemetry.recordFileOpenAttempt(null, false, Date.now() - startTime, new Error("Nessun candidato fornito"));
    return res.status(400).json({ success: false, message: "Nessun candidato fornito" });
  }

  const document = { title, revision, fileType, logicalPath, candidates };

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
    const responseTime = Date.now() - startTime;
    telemetry.recordFileOpenAttempt(document, false, responseTime, new Error("File non trovato nel percorso locale"));
    return res.status(404).json({ success: false, message: "File non trovato nel percorso locale" });
  }

  // Windows: use 'start' via cmd to open with default app.
  // Note: 'start' is a shell built-in; we invoke through cmd.exe /c
  const quoted = `"${filePath.replace(/"/g, '\\"')}"`;
  exec(`cmd /c start "" ${quoted}`, (err) => {
    const responseTime = Date.now() - startTime;
    
    if (err) {
      telemetry.recordFileOpenAttempt(document, false, responseTime, err);
      return res.status(500).json({ success: false, message: `Errore apertura: ${err.message}` });
    }
    
    telemetry.recordFileOpenAttempt(document, true, responseTime);
    res.json({ success: true, filePath: filePath });
  });
});

const server = app.listen(PORT, '127.0.0.1', () => {
  console.log(`[local-opener] Listening on http://127.0.0.1:${PORT} with roots=${CONFIG.roots.join(", ")}`);
});

server.on('error', (err) => {
  console.error('[local-opener] Server error:', err?.message || err);
});

process.on('uncaughtException', (err) => {
  console.error('[local-opener] Uncaught exception:', err?.stack || err);
});

process.on('unhandledRejection', (reason) => {
  console.error('[local-opener] Unhandled rejection:', reason);
});



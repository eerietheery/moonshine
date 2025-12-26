const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const { scanMusic, scanFiles, getAlbumArtForFile } = require('../music');
const { loadConfig, getConfig, updateConfig } = require('./config'); // Corrected path
const { startHPScan } = require('./hpScanner');

// High-performance Node-only directory scanner using worker threads
const { Worker } = require('worker_threads');
const { startHPScan } = require('./hpScanner');

const AUDIO_EXTS = new Set(['.mp3', '.m4a', '.flac', '.wav', '.ogg', '.aac']);

function listAudioFiles(dirPath) {
  const results = [];
  const root = String(dirPath || '');
  if (!root) return results;

  const walk = (dir) => {
    let entries;
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        // Skip hidden/system folders
        if (!entry.name.startsWith('.') && entry.name.toLowerCase() !== 'system volume information') {
          walk(full);
        }
      } else {
        const ext = path.extname(entry.name).toLowerCase();
        if (AUDIO_EXTS.has(ext)) results.push(full);
      }
    }
  };

  walk(root);
  return results;
}

// Native-accelerated directory walk (Windows) using N-API addon when available
function listAudioFilesHP(dirPath) {
  return new Promise((resolve) => {
    const root = String(dirPath || '');
    if (!root) return resolve([]);
    const workerPath = path.join(__dirname, 'dirScannerWorker.js');
    let total = 0;
    const files = [];
    try {
      const worker = new Worker(workerPath);
      worker.on('message', (msg) => {
        if (msg?.type === 'batch' && Array.isArray(msg.files)) {
          files.push(...msg.files);
        } else if (msg?.type === 'done') {
          resolve(files);
        } else if (msg?.type === 'error') {
          resolve([]);
        }
      });
      worker.on('error', () => resolve([]));
      worker.postMessage({ root });
    } catch (_) {
      resolve(listAudioFiles(dirPath));
    }
  });
}

async function mapWithConcurrency(items, limit, mapper) {
  const results = new Array(items.length);
  let nextIndex = 0;
  const workers = new Array(Math.min(limit, items.length)).fill(0).map(async () => {
    while (true) {
      const i = nextIndex++;
      if (i >= items.length) break;
      results[i] = await mapper(items[i], i);
    }
  });
  await Promise.all(workers);
  return results;
}
function ensureDirWritable(dirPath) {
  try {
    fs.mkdirSync(dirPath, { recursive: true });
    const probeFile = path.join(dirPath, `.write-probe-${process.pid}-${Date.now()}`);
    fs.writeFileSync(probeFile, 'ok', 'utf8');
    fs.unlinkSync(probeFile);
    return true;
  } catch {
    return false;
  }
}

function pickWritableStorageDir() {
  const candidates = [];

  try {
    // Electron default per-user profile directory (usually writable).
    candidates.push(app.getPath('userData'));
  } catch {
    // ignore
  }

  try {
    candidates.push(path.join(app.getPath('temp'), 'Moonshine'));
  } catch {
    // ignore
  }

  // Documents can be blocked by Windows Defender Controlled Folder Access for Chromium subprocesses.
  // Keep it as a last resort rather than the default.
  try {
    candidates.push(path.join(app.getPath('documents'), 'Moonshine'));
  } catch {
    // ignore
  }

  for (const candidate of candidates) {
    if (candidate && ensureDirWritable(candidate)) return candidate;
  }

  return null;
}

// Configure persistent storage paths as early as possible.
// On Windows, if the chosen directory is not writable (e.g., Documents permissions/OneDrive policies),
// Chromium can fail to create disk cache and quota DB (0x5 access denied).
const storageDir = pickWritableStorageDir();
if (storageDir) {
  const cacheDir = path.join(storageDir, 'Cache');
  ensureDirWritable(cacheDir);

  try {
    app.setPath('userData', storageDir);
    app.setPath('sessionData', storageDir);
    app.setPath('cache', cacheDir);
  } catch {
    // ignore; we'll still try Chromium switches below
  }

  // Keep Chromium cache/quota storage inside the same writable directory.
  // Must be set before the app is ready.
  try {
    app.commandLine.appendSwitch('disk-cache-dir', cacheDir);
  } catch {
    // ignore
  }

  console.log('[Main] Storage dir:', storageDir);
  console.log('[Main] Cache dir:', cacheDir);
} else {
  console.warn('[Main] Failed to find a writable storage directory; using Electron defaults.');
}

let initialScanCache = null;
let initialScanPromise = null;
let mainWindow = null;
let DEFAULT_DIR = null; // Will be set after app is ready

function createWindow() {
  const cfg = getConfig();
  
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    icon: path.join(__dirname, '../../assets/images/etico.png'),
    backgroundColor: '#121212',
    autoHideMenuBar: true,
    show: false, // Don't show until content is rendered
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      // Use persistent partition to store IndexedDB in Documents/Moonshine
      partition: `persist:moonshine`,
      additionalArguments: [
        `--user-config=${JSON.stringify(cfg)}` // Pass config to renderer
      ]
    },
  });
  
  // Show window only after DOM content is fully loaded
  win.webContents.once('did-finish-load', () => {
    win.show();
  });
  
  // Corrected path for index.html
  win.loadFile(path.join(__dirname, '../../index.html'));
  mainWindow = win;
}

app.whenReady().then(async () => {
  DEFAULT_DIR = app.getPath('music');
  console.log('[Main] Default music dir:', DEFAULT_DIR);
  
  // Load config
  let cfg = loadConfig();

  // If this is a first run (no library directories), prompt the user to select a music folder
  try {
    if (!Array.isArray(cfg.libraryDirs) || cfg.libraryDirs.length === 0) {
      const result = await dialog.showOpenDialog({
        properties: ['openDirectory'],
        title: 'Select Music Folder',
      });
      if (!result.canceled && result.filePaths && result.filePaths.length) {
        const selected = result.filePaths[0];
        // Persist selection to config and use the returned config object
        cfg = updateConfig({ libraryDirs: [selected] });
      }
    }
  } catch (err) {
    // ignore errors and continue with defaults
  }

  // Kick off an initial scan in background using either the user-selected dir or defaults
  try {
    const dirs = (cfg.libraryDirs && cfg.libraryDirs.length) ? cfg.libraryDirs : [DEFAULT_DIR];
    // Important: do not block window creation on this scan.
    // The renderer can request initialScanCache via IPC while the scan runs.
    initialScanCache = null;
    initialScanPromise = scanMusic(dirs[0])
      .then((res) => {
        initialScanCache = res;
        return res;
      })
      .catch(() => {
        initialScanCache = null;
        return null;
      });
  } catch {
    initialScanCache = null;
    initialScanPromise = null;
  }

  createWindow();
});

// Expose default music directory for renderer to consume
ipcMain.handle('get-default-music-path', () => {
  return DEFAULT_DIR;
});

ipcMain.handle('select-folder', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openDirectory'],
    title: 'Select Music Folder',
  });
  if (result.canceled || !result.filePaths.length) return null;
  return result.filePaths[0];
});

ipcMain.handle('scan-music', async (event, dirPath) => {
  // If renderer requests the initial scan, prefer cached results.
  if (!dirPath) {
    if (initialScanCache) return initialScanCache;
    if (initialScanPromise) {
      const res = await initialScanPromise;
      if (res) initialScanCache = res;
      return res;
    }
  }
  return scanMusic(dirPath || DEFAULT_DIR);
});

// Lightweight scan: omit embedded album art to reduce IPC payload
ipcMain.handle('scan-music-lite', async (event, dirPath) => {
  // Reuse same scan but strip albumArtDataUrl for most tracks
  const tracks = await (dirPath ? scanMusic(dirPath) : (initialScanCache || (initialScanPromise ? await initialScanPromise : await scanMusic(DEFAULT_DIR))));
  if (!tracks || !Array.isArray(tracks)) return tracks;
  return tracks.map(t => {
    // keep metadata and album key, but remove bulky data URL
    const { albumArtDataUrl, ...rest } = t;
    return { ...rest, albumArtDataUrl: null };
  });
});

// Incremental scan helpers
ipcMain.handle('list-music-files', async (event, dirPath) => {
  try {
    return listAudioFiles(dirPath || DEFAULT_DIR);
  } catch {
    return [];
  }
});

// Native files listing (uses addon when available, falls back otherwise)
ipcMain.handle('list-music-files-hp', async (event, dirPath) => {
  try {
    return await listAudioFilesHP(dirPath || DEFAULT_DIR);
  } catch {
    return [];
  }
});

ipcMain.handle('get-file-stats', async (event, filePaths) => {
  try {
    if (!Array.isArray(filePaths) || filePaths.length === 0) return [];
    const res = await mapWithConcurrency(filePaths, 32, async (fp) => {
      try {
        const st = await fs.promises.stat(fp);
        return { filePath: fp, mtime: st.mtimeMs || 0, size: st.size || 0 };
      } catch {
        return { filePath: fp, mtime: 0, size: 0, missing: true };
      }
    });
    return res;
  } catch {
    return [];
  }
});

ipcMain.handle('scan-files', async (event, filePaths) => {
  try {
    if (!Array.isArray(filePaths) || filePaths.length === 0) return [];
    return await scanFiles(filePaths);
  } catch {
    return [];
  }
});
<<<<<<< HEAD

// High-performance scanning path: enumerate via native walker and scan metadata in batches
ipcMain.handle('scan-music-hp', async (event, dirPath) => {
  const root = dirPath || DEFAULT_DIR;
  try {
    const wc = event.sender;
    const summary = await startHPScan({
      roots: [root],
      batchSize: 1000,
      onProgress: (p) => {
        try { wc.send('scan-progress', { ...p, total: undefined }); } catch (_) {}
      },
      onBatch: async (batch) => {
        try {
          // Convert batch file paths to metadata in main and stream to renderer
          const paths = batch.map(b => b.filePath);
          const metas = await scanFiles(paths);
          if (Array.isArray(metas) && metas.length) wc.send('scan-batch', metas);
        } catch (_) {}
      }
    });
    // Signal completion
    try { event.sender.send('scan-progress', { phase: 'scanning', completed: summary?.completed || 0, total: summary?.completed || 0 }); } catch (_) {}
    return true;
  } catch (e) {
    // fallback to standard scan
    try { event.sender.send('scan-progress', { phase: 'scanning', completed: 0, total: 0, error: true, message: 'HP scan failed, falling back' }); } catch (_) {}
    const res = await scanMusic(root);
    return res;
  }
});
=======
>>>>>>> ceb0bad25f4a231a3502711044dfa27ef778c802
// Get album art for a specific file on-demand
ipcMain.handle('get-album-art', async (event, filePath) => {
  if (!filePath) return null;
  try {
    const art = await getAlbumArtForFile(filePath);
    return art || null;
  } catch (e) {
    return null;
  }
});

// Reveal file in OS file manager
ipcMain.handle('reveal-file', (event, filePath) => {
  try {
    const { shell } = require('electron');
    if (filePath) shell.showItemInFolder(filePath);
    return true;
  } catch (err) {
    return false;
  }
});

// Config IPC
ipcMain.handle('get-config', async () => {
  return getConfig();
});

ipcMain.handle('update-config', async (event, partial) => {
  const next = updateConfig(partial || {});
  // If color changed, update window background
  const color = partial?.theme?.primaryColor || partial?.primaryColor;
  if (mainWindow && color) {
    mainWindow.setBackgroundColor(color);
  }
  return next;
});

// App version for renderer
ipcMain.handle('get-app-version', async () => {
  try {
    return app.getVersion();
  } catch {
    return null;
  }
});

// Open external URLs (e.g., GitHub release page)
ipcMain.handle('open-external', async (event, url) => {
  try {
    if (!url || typeof url !== 'string') return false;
    const { shell } = require('electron');
    await shell.openExternal(url);
    return true;
  } catch (e) {
    return false;
  }
});

// Automatic backup functionality
ipcMain.handle('save-auto-backup', async (event, userData) => {
  try {
    const documentsPath = app.getPath('documents');
    const backupDir = path.join(documentsPath, 'Moonshine');
    
    // Ensure backup directory exists
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }
    
    const backupFile = path.join(backupDir, 'moonshine-auto-backup.json');
    fs.writeFileSync(backupFile, JSON.stringify(userData, null, 2), 'utf8');
    
    return { success: true, path: backupFile };
  } catch (error) {
    console.error('Failed to save auto backup:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('check-auto-backup', async () => {
  try {
    const documentsPath = app.getPath('documents');
    const backupFile = path.join(documentsPath, 'Moonshine', 'moonshine-auto-backup.json');
    
    if (fs.existsSync(backupFile)) {
      const stats = fs.statSync(backupFile);
      const content = fs.readFileSync(backupFile, 'utf8');
      const userData = JSON.parse(content);
      
      return {
        exists: true,
        path: backupFile,
        lastModified: stats.mtime.toISOString(),
        data: userData
      };
    }
    
    return { exists: false };
  } catch (error) {
    console.error('Failed to check auto backup:', error);
    return { exists: false, error: error.message };
  }
});

ipcMain.handle('get-documents-path', () => {
  return app.getPath('documents');
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
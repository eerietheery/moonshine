const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { scanMusic } = require('./src/music');
const { loadConfig, getConfig, updateConfig } = require('./src/config');

const { dialog } = require('electron');

let initialScanCache = null;
const DEFAULT_DIR = app.getPath('music');

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    icon: path.join(__dirname, 'etico.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
    },
  });
  win.loadFile('index.html');
}

app.whenReady().then(async () => {
  // Load config
  const cfg = loadConfig();
  // Kick off an initial scan in background
  try {
    const dirs = (cfg.libraryDirs && cfg.libraryDirs.length) ? cfg.libraryDirs : [DEFAULT_DIR];
    // Scan first dir for initial list
    initialScanCache = await scanMusic(dirs[0]);
  } catch {
    initialScanCache = null;
  }
  createWindow();
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
  if (!dirPath && initialScanCache) return initialScanCache;
  return scanMusic(dirPath || DEFAULT_DIR);
});

// Config IPC
ipcMain.handle('get-config', async () => {
  return getConfig();
});

ipcMain.handle('update-config', async (event, partial) => {
  const next = updateConfig(partial || {});
  return next;
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

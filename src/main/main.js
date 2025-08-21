const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const { scanMusic } = require('../music');
const { loadConfig, getConfig, updateConfig } = require('./config'); // Corrected path

let initialScanCache = null;
let mainWindow = null;
const DEFAULT_DIR = app.getPath('music');

function createWindow() {
  const cfg = getConfig();
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    icon: path.join(__dirname, '../../assets/images/etico.png'), // Corrected path
    backgroundColor: '#121212',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'), // This path is correct
      contextIsolation: true,
    },
  });
  // Corrected path for index.html
  win.loadFile(path.join(__dirname, '../../index.html'));
  mainWindow = win;
}

app.whenReady().then(async () => {
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
    // Scan first dir for initial list
    initialScanCache = await scanMusic(dirs[0]);
  } catch {
    initialScanCache = null;
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
  if (!dirPath && initialScanCache) return initialScanCache;
  return scanMusic(dirPath || DEFAULT_DIR);
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
  if (mainWindow && partial && partial.primaryColor) {
    mainWindow.setBackgroundColor(partial.primaryColor);
  }
  return next;
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
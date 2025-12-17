const { contextBridge, ipcRenderer } = require('electron');

// Extract config from process args if passed
let preloadedConfig = null;
try {
  const configArg = process.argv.find(arg => arg.startsWith('--user-config='));
  if (configArg) {
    const configJson = configArg.substring('--user-config='.length);
    preloadedConfig = JSON.parse(configJson);
  }
} catch (err) {
  console.error('[Preload] Failed to parse preloaded config:', err);
}

contextBridge.exposeInMainWorld('etune', {
  scanMusic: (dirPath) => ipcRenderer.invoke('scan-music', dirPath),
  scanMusicLite: (dirPath) => ipcRenderer.invoke('scan-music-lite', dirPath),
  initialScan: () => ipcRenderer.invoke('scan-music', null),
  selectFolder: () => ipcRenderer.invoke('select-folder'),
  getConfig: () => preloadedConfig ? Promise.resolve(preloadedConfig) : ipcRenderer.invoke('get-config'),
  updateConfig: (partial) => ipcRenderer.invoke('update-config', partial),
  getDefaultMusicPath: () => ipcRenderer.invoke('get-default-music-path'),
  getAlbumArt: (filePath) => ipcRenderer.invoke('get-album-art', filePath),
  revealFile: (filePath) => ipcRenderer.invoke('reveal-file', filePath),
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  openExternal: (url) => ipcRenderer.invoke('open-external', url),
  saveAutoBackup: (userData) => ipcRenderer.invoke('save-auto-backup', userData),
  checkAutoBackup: () => ipcRenderer.invoke('check-auto-backup'),
  getDocumentsPath: () => ipcRenderer.invoke('get-documents-path'),
});

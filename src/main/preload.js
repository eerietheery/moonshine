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
<<<<<<< HEAD
  getConfig: () => ipcRenderer.invoke('config:get'),
  updateConfig: (cfg) => ipcRenderer.invoke('config:update', cfg),
  scanMusicHP: (roots) => ipcRenderer.invoke('scan-music-hp', roots),
  onScanProgress: (cb) => ipcRenderer.on('scan-progress', (_, payload) => cb(payload)),
  onScanBatch: (cb) => ipcRenderer.on('scan-batch', (_, batch) => cb(batch)),
  onScanComplete: (cb) => ipcRenderer.on('scan-complete', (_, summary) => cb(summary)),
  onScanFallback: (cb) => ipcRenderer.on('scan-fallback', (_, info) => cb(info)),
=======
  scanMusic: (dirPath) => ipcRenderer.invoke('scan-music', dirPath),
  scanMusicLite: (dirPath) => ipcRenderer.invoke('scan-music-lite', dirPath),
  scanFiles: (filePaths) => ipcRenderer.invoke('scan-files', filePaths),
  initialScan: () => ipcRenderer.invoke('scan-music', null),
  selectFolder: () => ipcRenderer.invoke('select-folder'),
  getConfig: () => preloadedConfig ? Promise.resolve(preloadedConfig) : ipcRenderer.invoke('get-config'),
  updateConfig: (partial) => ipcRenderer.invoke('update-config', partial),
  getDefaultMusicPath: () => ipcRenderer.invoke('get-default-music-path'),
  getAlbumArt: (filePath) => ipcRenderer.invoke('get-album-art', filePath),
  listMusicFiles: (dirPath) => ipcRenderer.invoke('list-music-files', dirPath),
  getFileStats: (filePaths) => ipcRenderer.invoke('get-file-stats', filePaths),
  revealFile: (filePath) => ipcRenderer.invoke('reveal-file', filePath),
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  openExternal: (url) => ipcRenderer.invoke('open-external', url),
  saveAutoBackup: (userData) => ipcRenderer.invoke('save-auto-backup', userData),
  checkAutoBackup: () => ipcRenderer.invoke('check-auto-backup'),
  getDocumentsPath: () => ipcRenderer.invoke('get-documents-path'),
>>>>>>> ceb0bad25f4a231a3502711044dfa27ef778c802
});

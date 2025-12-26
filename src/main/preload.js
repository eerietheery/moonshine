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

contextBridge.exposeInMainWorld('moonshine', {
  // Scanning APIs
  scanMusic: (dirPath) => ipcRenderer.invoke('scan-music', dirPath),
  scanMusicLite: (dirPath) => ipcRenderer.invoke('scan-music-lite', dirPath),
  scanMusicHP: (dirPath) => ipcRenderer.invoke('scan-music-hp', dirPath),
  scanFiles: (filePaths) => ipcRenderer.invoke('scan-files', filePaths),
  initialScan: () => ipcRenderer.invoke('scan-music', null),
  // Folder selection (Settings: Add Music Folder)
  selectFolder: () => ipcRenderer.invoke('select-folder'),

  // Directory listing / stats
  listMusicFiles: (dirPath) => ipcRenderer.invoke('list-music-files', dirPath),
  listMusicFilesHP: (dirPath) => ipcRenderer.invoke('list-music-files-hp', dirPath),
  getFileStats: (filePaths) => ipcRenderer.invoke('get-file-stats', filePaths),

  // Config
  getConfig: () => preloadedConfig ? Promise.resolve(preloadedConfig) : ipcRenderer.invoke('get-config'),
  updateConfig: (partial) => ipcRenderer.invoke('update-config', partial),

  // Misc
  getDefaultMusicPath: () => ipcRenderer.invoke('get-default-music-path'),
  getAlbumArt: (filePath) => ipcRenderer.invoke('get-album-art', filePath),
  revealFile: (filePath) => ipcRenderer.invoke('reveal-file', filePath),
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  openExternal: (url) => ipcRenderer.invoke('open-external', url),
  saveAutoBackup: (userData) => ipcRenderer.invoke('save-auto-backup', userData),
  checkAutoBackup: () => ipcRenderer.invoke('check-auto-backup'),
  getDocumentsPath: () => ipcRenderer.invoke('get-documents-path'),

  // Simple event subscription helper
  on: (channel, listener) => {
    try { ipcRenderer.on(channel, (_, data) => listener(data)); } catch (_) {}
  }
});

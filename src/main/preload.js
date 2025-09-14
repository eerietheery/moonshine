const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('etune', {
  scanMusic: (dirPath) => ipcRenderer.invoke('scan-music', dirPath),
  initialScan: () => ipcRenderer.invoke('scan-music', null),
  selectFolder: () => ipcRenderer.invoke('select-folder'),
  getConfig: () => ipcRenderer.invoke('get-config'),
  updateConfig: (partial) => ipcRenderer.invoke('update-config', partial),
  getDefaultMusicPath: () => ipcRenderer.invoke('get-default-music-path'),
  revealFile: (filePath) => ipcRenderer.invoke('reveal-file', filePath),
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  openExternal: (url) => ipcRenderer.invoke('open-external', url),
  saveAutoBackup: (userData) => ipcRenderer.invoke('save-auto-backup', userData),
  checkAutoBackup: () => ipcRenderer.invoke('check-auto-backup'),
  getDocumentsPath: () => ipcRenderer.invoke('get-documents-path'),
});

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('etune', {
  scanMusic: (dirPath) => ipcRenderer.invoke('scan-music', dirPath),
  initialScan: () => ipcRenderer.invoke('scan-music', null),
  selectFolder: () => ipcRenderer.invoke('select-folder'),
  getConfig: () => ipcRenderer.invoke('get-config'),
  updateConfig: (partial) => ipcRenderer.invoke('update-config', partial),
  getDefaultMusicPath: () => ipcRenderer.invoke('get-default-music-path'),
});

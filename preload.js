const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('etune', {
  scanMusic: (dirPath) => ipcRenderer.invoke('scan-music', dirPath),
  initialScan: () => ipcRenderer.invoke('scan-music', null),
  selectFolder: () => ipcRenderer.invoke('select-folder'),
});

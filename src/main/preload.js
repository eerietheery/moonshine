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
  getConfig: () => ipcRenderer.invoke('config:get'),
  updateConfig: (cfg) => ipcRenderer.invoke('config:update', cfg),
  scanMusicHP: (roots) => ipcRenderer.invoke('scan-music-hp', roots),
  onScanProgress: (cb) => ipcRenderer.on('scan-progress', (_, payload) => cb(payload)),
  onScanBatch: (cb) => ipcRenderer.on('scan-batch', (_, batch) => cb(batch)),
  onScanComplete: (cb) => ipcRenderer.on('scan-complete', (_, summary) => cb(summary)),
  onScanFallback: (cb) => ipcRenderer.on('scan-fallback', (_, info) => cb(info)),
});

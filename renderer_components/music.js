const { ipcRenderer } = require('electron');
const { setTracks } = require('./state');

function scanMusic() {
  const dirPath = prompt('Enter the path to your music folder:');
  if (!dirPath) return;
  ipcRenderer.invoke('scan-music', dirPath).then(results => {
    setTracks(results);
  });
}

module.exports = { scanMusic };

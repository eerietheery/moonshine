const { playTrack } = require('./player');

function updateTrackList(tracks) {
  const list = document.getElementById('music-list');
  list.innerHTML = '';
  tracks.forEach(track => {
    const div = document.createElement('div');
    div.className = 'track';
    div.textContent = `${track.tags.artist || 'Unknown'} - ${track.tags.title || track.file}`;
    div.onclick = () => playTrack(track);
    list.appendChild(div);
  });
}

module.exports = { updateTrackList };

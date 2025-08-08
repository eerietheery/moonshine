function playTrack(track) {
  const audio = document.getElementById('audio');
  audio.src = track.filePath;
  document.getElementById('now-playing').textContent = `Now Playing: ${track.tags.artist || 'Unknown'} - ${track.tags.title || track.file}`;
}

module.exports = { playTrack };

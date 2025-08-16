// utils/exportM3U.js
export function exportM3U(playlist, tracks) {
  // Only export valid file paths
  const lines = ['#EXTM3U'];
  for (const filePath of playlist.trackPaths) {
    const track = tracks.find(t => t.filePath === filePath);
    if (track) {
      // Optionally add #EXTINF line for extended M3U
      if (track.tags && track.tags.title && track.tags.artist) {
        lines.push(`#EXTINF:-1,${track.tags.artist} - ${track.tags.title}`);
      }
      lines.push(filePath);
    }
  }
  return lines.join('\n');
}

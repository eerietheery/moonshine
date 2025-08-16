// utils/importM3U.js
import { parseM3U } from './m3uParser.js';

export async function importM3U(file, state, renderPlaylistsSidebar) {
  const content = await file.text();
  const paths = parseM3U(content);

  // Match paths to tracks in your library
  const tracks = state.tracks.filter(track =>
    paths.some(path => track.filePath.endsWith(path))
  );

  // Create and append playlist
  const playlist = {
    id: 'pl_' + Math.random().toString(36).slice(2, 10),
    name: file.name.replace(/\.m3u$/i, ''),
    trackPaths: tracks.map(t => t.filePath),
    createdAt: Date.now(),
    updatedAt: Date.now()
  };
  if (!state.playlists) state.playlists = { user: [] };
  state.playlists.user.push(playlist);
  if (typeof renderPlaylistsSidebar === 'function') renderPlaylistsSidebar();
}

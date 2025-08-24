// Correct relative path: shared -> playlist is one level up, not two
import { addToPlaylist } from '../playlist/playlists.js';

export function showPlaylistPopup(eOrRect, tracks = [], opts = {}) {
  // eOrRect can be MouseEvent (preferred) or an object with left/top
  const { playlists } = opts; // caller may pass playlists to avoid double import

  const panel = document.createElement('div');
  panel.className = 'playlist-popup';
  Object.assign(panel.style, { position: 'fixed', zIndex: 10000, background: 'var(--sidebar-bg, #1f1f1f)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', boxShadow: '0 12px 28px rgba(0,0,0,0.45)', width: '260px', padding: '10px' });

  const newBtn = document.createElement('button');
  newBtn.textContent = 'New playlist…';
  Object.assign(newBtn.style, {
    width: '100%', background: 'var(--primary-color)', color: '#000', border: 'none',
    borderRadius: '8px', padding: '10px 12px', cursor: 'pointer', fontWeight: 700, marginBottom: '10px'
  });
  newBtn.onclick = async () => {
    try {
      // Open naming modal; once created, add all selected tracks to the new playlist
      const { showNewPlaylistModal } = await import(new URL('../../ui/playlistModal.js', import.meta.url).href);
      const firstTrack = Array.isArray(tracks) && tracks.length ? tracks[0] : null;
      panel.remove();
      showNewPlaylistModal({
        // Hint with first track name if available
        defaultName: '',
        track: firstTrack, // keep hint text; we will add all tracks below via onCreate
        onCreate: async (pl) => {
          try { 
            (Array.isArray(tracks) ? tracks : []).forEach(t => addToPlaylist(pl.id, t)); 
            
            // Show toast notification for new playlist creation
            const { showToast } = await import(new URL('../ui/ui.js', import.meta.url).href);
            const trackCount = tracks.length;
            const message = trackCount === 1 
              ? `Created "${pl.name}" and added "${tracks[0]?.tags?.title || tracks[0]?.file || 'track'}"`
              : trackCount > 1 
                ? `Created "${pl.name}" and added ${trackCount} tracks`
                : `Created "${pl.name}"`;
            showToast(message);
          } catch (_) {}
          document.dispatchEvent(new CustomEvent('playlists:changed'));
        }
      });
    } catch (err) {
      console.error('Failed to open New Playlist modal', err);
    }
  };
  panel.appendChild(newBtn);

  const listWrap = document.createElement('div'); Object.assign(listWrap.style, { maxHeight: '220px', overflowY: 'auto', paddingRight: '2px' });

  const finalize = async (plId) => {
    const playlist = playlists.user.find(p => p.id === plId);
    const playlistName = playlist?.name || 'playlist';
    tracks.forEach(t => addToPlaylist(plId, t));
    document.dispatchEvent(new CustomEvent('playlists:changed'));
    panel.remove();
    
    // Show toast notification
    try {
      const { showToast } = await import(new URL('../ui/ui.js', import.meta.url).href);
      const trackCount = tracks.length;
      const message = trackCount === 1 
        ? `Added "${tracks[0]?.tags?.title || tracks[0]?.file || 'track'}" to ${playlistName}`
        : `Added ${trackCount} tracks to ${playlistName}`;
      showToast(message);
    } catch (_) {}
  };

  if (playlists && playlists.user && playlists.user.length) {
    playlists.user.forEach(pl => {
      const item = document.createElement('div');
      item.textContent = pl.name;
      item.tabIndex = 0;
      item.setAttribute('role', 'button');
      Object.assign(item.style, {
        padding: '8px 10px', cursor: 'pointer', borderRadius: '6px', outline: 'none'
      });
      const highlightOn = () => item.style.background = 'rgba(255,255,255,0.08)';
      const highlightOff = () => item.style.background = 'transparent';
      item.onmouseenter = highlightOn;
      item.onmouseleave = highlightOff;
      item.onfocus = highlightOn;
      item.onblur = highlightOff;
      item.onclick = () => finalize(pl.id);
      item.onkeydown = (ev) => {
        if (ev.key === 'Enter' || ev.key === ' ') {
          ev.preventDefault();
          finalize(pl.id);
        }
      };
      listWrap.appendChild(item);
    });
  } else {
    const empty = document.createElement('div');
    empty.textContent = 'No playlists yet'; Object.assign(empty.style, { color: '#9a9a9a', fontSize: '0.85rem', padding: '8px 10px' });
    listWrap.appendChild(empty);
  }
  panel.appendChild(listWrap);

  const left = eOrRect?.clientX || eOrRect?.left || 0;
  const top = eOrRect?.clientY || eOrRect?.top || 0;
  panel.style.left = `${Math.min(left, window.innerWidth - 280)}px`;
  panel.style.top = `${Math.min(top, window.innerHeight - 280)}px`;
  document.body.appendChild(panel);

  setTimeout(() => { const closeDoc = (ev) => { if (!panel.contains(ev.target)) panel.remove(); }; document.addEventListener('click', closeDoc, { capture: true, once: true }); }, 0);

  return { close: () => panel.remove() };
}

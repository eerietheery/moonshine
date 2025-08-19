import { addToPlaylist } from '../../playlist/playlists.js';

export function showPlaylistPopup(eOrRect, tracks = [], opts = {}) {
  // eOrRect can be MouseEvent (preferred) or an object with left/top
  const { playlists } = opts; // caller may pass playlists to avoid double import

  const panel = document.createElement('div');
  panel.className = 'playlist-popup';
  Object.assign(panel.style, { position: 'fixed', zIndex: 10000, background: 'var(--sidebar-bg, #1f1f1f)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', boxShadow: '0 12px 28px rgba(0,0,0,0.45)', width: '260px', padding: '10px' });

  const newBtn = document.createElement('button'); newBtn.textContent = 'New playlist…'; Object.assign(newBtn.style, { width: '100%', background: 'var(--primary-color)', color: '#000', border: 'none', borderRadius: '8px', padding: '10px 12px', cursor: 'pointer', fontWeight: 700, marginBottom: '10px' });
  newBtn.onclick = () => { document.dispatchEvent(new CustomEvent('playlists:changed')); panel.remove(); };
  panel.appendChild(newBtn);

  const listWrap = document.createElement('div'); Object.assign(listWrap.style, { maxHeight: '220px', overflowY: 'auto', paddingRight: '2px' });

  const finalize = (plId) => {
    tracks.forEach(t => addToPlaylist(plId, t));
    document.dispatchEvent(new CustomEvent('playlists:changed'));
    panel.remove();
  };

  if (playlists && playlists.user && playlists.user.length) {
    playlists.user.forEach(pl => {
      const item = document.createElement('div');
      item.textContent = pl.name; item.tabIndex = 0; Object.assign(item.style, { padding: '8px 10px', cursor: 'pointer' });
      item.onclick = () => finalize(pl.id);
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

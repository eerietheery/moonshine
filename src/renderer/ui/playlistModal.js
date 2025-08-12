import { createPlaylist, addToPlaylist } from '../components/playlists.js';

export function showNewPlaylistModal(options = {}) {
  const { defaultName = '', track = null, onCreate } = options;
  const overlay = document.createElement('div');
  Object.assign(overlay.style, {
    position: 'fixed', top: '0', left: '0', width: '100%', height: '100%',
    background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: '1002'
  });

  const box = document.createElement('div');
  Object.assign(box.style, {
    background: '#282828', padding: '20px', borderRadius: '10px', width: '360px', boxSizing: 'border-box', color: '#fff', boxShadow: '0 12px 32px rgba(0,0,0,0.4)'
  });

  const title = document.createElement('h3');
  title.textContent = 'New Playlist';
  Object.assign(title.style, { margin: '0 0 12px 0', fontSize: '1.1rem', fontWeight: '700' });
  box.appendChild(title);

  const label = document.createElement('label');
  label.textContent = 'Name';
  Object.assign(label.style, { display: 'block', marginBottom: '6px', color: '#bfbfbf', fontSize: '0.9rem' });
  box.appendChild(label);

  const input = document.createElement('input');
  input.type = 'text';
  input.placeholder = 'My Playlist';
  input.value = defaultName;
  Object.assign(input.style, {
    width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #444', background: '#1f1f1f', color: '#fff', boxSizing: 'border-box'
  });
  box.appendChild(input);

  const hint = document.createElement('div');
  hint.textContent = track ? 'The selected track will be added to the new playlist.' : '';
  Object.assign(hint.style, { marginTop: '8px', fontSize: '0.85rem', color: '#b3b3b3' });
  if (track) box.appendChild(hint);

  const actions = document.createElement('div');
  Object.assign(actions.style, { marginTop: '14px', display: 'flex', gap: '8px', justifyContent: 'flex-end' });

  const cancel = document.createElement('button');
  cancel.textContent = 'Cancel';
  Object.assign(cancel.style, { background: '#555', color: '#fff', border: 'none', borderRadius: '8px', padding: '10px 14px', textTransform: 'none' });
  cancel.onclick = () => overlay.remove();
  actions.appendChild(cancel);

  const create = document.createElement('button');
  create.textContent = 'Create';
  Object.assign(create.style, { background: 'var(--primary-color)', color: '#000', border: 'none', borderRadius: '8px', padding: '10px 14px', textTransform: 'none' });
  create.onclick = () => {
    const name = input.value.trim() || 'New Playlist';
    const pl = createPlaylist(name);
    if (track) addToPlaylist(pl.id, track);
    overlay.remove();
    if (typeof onCreate === 'function') onCreate(pl);
  };
  actions.appendChild(create);

  box.appendChild(actions);
  overlay.appendChild(box);
  document.body.appendChild(overlay);

  input.focus();
  input.select();
  overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter') create.click(); if (e.key === 'Escape') overlay.remove(); });
}

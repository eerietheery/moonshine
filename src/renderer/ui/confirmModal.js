export function showConfirmModal(options = {}) {
  const { title = 'Confirm', message = '', okText = 'OK', cancelText = 'Cancel' } = options;
  return new Promise((resolve) => {
    const overlay = document.createElement('div');
    Object.assign(overlay.style, {
      position: 'fixed', inset: '0', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(0,0,0,0.6)', zIndex: 10010
    });

    const box = document.createElement('div');
    Object.assign(box.style, {
      background: '#181818', color: '#fff', padding: '18px', borderRadius: '10px', width: '360px', boxSizing: 'border-box', boxShadow: '0 12px 32px rgba(0,0,0,0.5)'
    });

    const h = document.createElement('h3'); h.textContent = title; Object.assign(h.style, { margin: '0 0 10px 0', fontSize: '1.05rem' });
    const p = document.createElement('div'); p.textContent = message; Object.assign(p.style, { color: '#bfbfbf', marginBottom: '14px' });

    const actions = document.createElement('div'); Object.assign(actions.style, { display: 'flex', justifyContent: 'flex-end', gap: '8px' });
    const cancel = document.createElement('button'); cancel.textContent = cancelText; Object.assign(cancel.style, { background: '#333', color: '#fff', border: 'none', padding: '8px 12px', borderRadius: '8px' });
    const ok = document.createElement('button'); ok.textContent = okText; Object.assign(ok.style, { background: 'var(--primary-color)', color: '#000', border: 'none', padding: '8px 12px', borderRadius: '8px' });
    actions.appendChild(cancel); actions.appendChild(ok);

    cancel.onclick = () => { overlay.remove(); resolve(false); };
    ok.onclick = () => { overlay.remove(); resolve(true); };

    box.appendChild(h); box.appendChild(p); box.appendChild(actions);
    overlay.appendChild(box); document.body.appendChild(overlay);

    overlay.addEventListener('click', (ev) => { if (ev.target === overlay) { overlay.remove(); resolve(false); } });
    // keyboard shortcuts
    const keyHandler = (e) => { if (e.key === 'Escape') { overlay.remove(); resolve(false); } if (e.key === 'Enter') { overlay.remove(); resolve(true); } };
    document.addEventListener('keydown', keyHandler, { once: true });
  });
}

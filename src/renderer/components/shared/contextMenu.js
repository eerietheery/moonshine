// Lightweight shared context menu helper
export function showContextMenu(e, items = [], opts = {}) {
  // items: [{ label: 'Text', onClick: () => {} }, ...]
  if (!e) return () => {};
  // Close existing
  if (opts.closeOthers !== false) {
    document.querySelectorAll('.context-menu').forEach(m => m.remove());
    document.querySelectorAll('.playlist-popup').forEach(p => p.remove());
  }

  const menu = document.createElement('div');
  menu.className = 'context-menu';
  Object.assign(menu.style, {
    position: 'fixed', zIndex: 10000, background: 'var(--sidebar-bg, #1f1f1f)',
    border: '1px solid rgba(255,255,255,0.08)', borderRadius: '6px', boxShadow: '0 8px 24px rgba(0,0,0,0.35)', minWidth: (opts.minWidth || '200px'), padding: '6px 0'
  });

  const addItem = (label, handler) => {
    const item = document.createElement('div');
    item.textContent = label; item.tabIndex = 0; item.style.padding = '8px 12px'; item.style.cursor = 'pointer';
    item.onmouseenter = () => item.style.background = 'rgba(255,255,255,0.06)';
    item.onmouseleave = () => item.style.background = 'transparent';
    item.onclick = () => { try { handler(); } catch (err) {} finally { close(); } };
    item.onkeydown = (ev) => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); item.click(); } };
    menu.appendChild(item);
  };

  for (const it of items) {
    if (!it) continue;
    if (typeof it === 'string') {
      // divider or plain label
      const d = document.createElement('div'); d.textContent = it; d.style.padding = '8px 12px'; d.style.color = '#9a9a9a'; menu.appendChild(d); continue;
    }
    addItem(it.label, it.onClick || (() => {}));
  }

  const left = Math.min(e.clientX || 0, window.innerWidth - 240);
  const top = Math.min(e.clientY || 0, window.innerHeight - 260);
  menu.style.left = `${left}px`;
  menu.style.top = `${top}px`;
  document.body.appendChild(menu);

  const close = () => { menu.remove(); };
  setTimeout(() => {
    const onDoc = (ev) => { if (!menu.contains(ev.target)) close(); };
    const onKey = (ev) => { if (ev.key === 'Escape') close(); };
    document.addEventListener('click', onDoc, true);
    document.addEventListener('keydown', onKey, true);
  }, 0);

  return { close };
}

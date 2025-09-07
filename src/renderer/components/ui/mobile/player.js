// Minimal mobile player skeleton
export function initMobilePlayer() {
  if (document.querySelector('.mobile-player')) return;
  const container = document.createElement('div');
  container.className = 'mobile-player';
  container.innerHTML = `
    <div class="mp-mini" role="region" aria-label="Mini player">
      <div class="mp-art" aria-hidden="true"></div>
      <div class="mp-meta">
        <div class="mp-title"></div>
        <div class="mp-artist"></div>
      </div>
      <div class="mp-controls">
        <button class="mp-prev" aria-label="Previous">◀</button>
        <button class="mp-play" aria-label="Play/Pause"><img src="assets/images/play-centered.svg" alt="Play"/></button>
        <button class="mp-next" aria-label="Next">▶</button>
      </div>
    </div>
    <div class="mp-expanded" aria-hidden="true"></div>
  `;
  document.body.appendChild(container);
  // wire controls lazily
  const mp = document.querySelector('.mobile-player');
  const audio = document.getElementById('audio');
  mp.querySelector('.mp-prev')?.addEventListener('click', () => {
    import('../../../player/playerCore.js').then(m => { try { m.playPrevious(audio, null); } catch(_){} }).catch(()=>{});
  });
  mp.querySelector('.mp-play')?.addEventListener('click', () => {
    import('../../../player/playerCore.js').then(m => { try { m.togglePlay(audio, document.getElementById('play-btn')); } catch(_){} }).catch(()=>{});
  });
  mp.querySelector('.mp-next')?.addEventListener('click', () => {
    import('../../../player/playerCore.js').then(m => { try { m.playNext(audio, null); } catch(_){} }).catch(()=>{});
  });
  // expand/collapse behavior
  const mini = mp.querySelector('.mp-mini');
  const expanded = mp.querySelector('.mp-expanded');
  function showExpanded() { mp.classList.add('expanded'); expanded.setAttribute('aria-hidden','false'); }
  function hideExpanded() { mp.classList.remove('expanded'); expanded.setAttribute('aria-hidden','true'); }
  mini?.addEventListener('click', (e) => { e.stopPropagation(); if (mp.classList.contains('expanded')) hideExpanded(); else showExpanded(); });
  // Close on Esc
  window.addEventListener('keydown', (ev) => { if (ev.key === 'Escape') hideExpanded(); });
  // Basic swipe down detection on expanded panel
  let touchStartY = null;
  expanded?.addEventListener('touchstart', (ev) => { touchStartY = ev.touches[0]?.clientY || null; });
  expanded?.addEventListener('touchmove', (ev) => {
    if (touchStartY === null) return;
    const cur = ev.touches[0]?.clientY || 0;
    const dy = cur - touchStartY;
    if (dy > 80) { hideExpanded(); touchStartY = null; }
  });
}

export function updateMobilePlayer({ title, artist, artUrl, isPlaying } = {}) {
  const mp = document.querySelector('.mobile-player');
  if (!mp) return;
  if (title !== undefined) mp.querySelector('.mp-title').textContent = title || '';
  if (artist !== undefined) mp.querySelector('.mp-artist').textContent = artist || '';
  if (artUrl !== undefined) mp.querySelector('.mp-art').style.backgroundImage = `url('${artUrl}')`;
  const playImg = mp.querySelector('.mp-play img');
  const audio = document.getElementById('audio');
  if (playImg && audio) {
    if (audio.paused) playImg.src = 'assets/images/play-centered.svg'; else playImg.src = 'assets/images/pause.svg';
  }
}

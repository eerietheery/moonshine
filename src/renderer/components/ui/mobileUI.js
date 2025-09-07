// Small mobile UI helper: injects bottom nav and a compact mobile player.
// Non-invasive: only runs when viewport width is small.
import { togglePlay, playPrevious, playNext } from '../player/playerCore.js';

export function initMobileUI() {
  if (window.innerWidth > 720) return; // nothing to do on larger screens

  // Insert mobile player container if missing
  if (!document.querySelector('.mobile-player')) {
    const mp = document.createElement('div');
    mp.className = 'mobile-player';
    mp.innerHTML = `
      <img class="mp-art" src="assets/images/default-art.png" alt="art" />
      <div class="mp-meta"><div class="mp-title">No track selected</div><div class="mp-artist">—</div></div>
      <div class="mp-controls"><button class="mp-prev">⏮</button><button class="mp-play">▶</button><button class="mp-next">⏭</button></div>
    `;
    document.body.appendChild(mp);
  }

  if (!document.querySelector('.mobile-bottom-nav')) {
    const nav = document.createElement('nav');
    nav.className = 'mobile-bottom-nav';
    nav.innerHTML = `
      <button data-page="home" class="active"><img class="nav-icon" src="assets/images/moonshinebottlelogo.png" alt="home"/><span>Home</span></button>
      <button data-page="playlists"><img class="nav-icon" src="assets/images/playlist-mobi-ico.svg" alt="playlists"/><span>Playlists</span></button>
      <button data-page="albums"><img class="nav-icon" src="assets/images/album-ico.svg" alt="albums"/><span>Albums</span></button>
      <button data-page="songs"><img class="nav-icon" src="assets/images/song-ico.svg" alt="songs"/><span>Songs</span></button>
      <button data-page="artists"><img class="nav-icon" src="assets/images/artist-ico.svg" alt="artists"/><span>Artists</span></button>
    `;
    document.body.appendChild(nav);

    nav.addEventListener('click', (e) => {
      const btn = e.target.closest('button');
      if (!btn) return;
      document.querySelectorAll('.mobile-bottom-nav button').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const page = btn.dataset.page;
      // simple page switching: toggle visible sections in main content
      switch (page) {
        case 'home':
          document.getElementById('music-list')?.scrollIntoView();
          break;
        case 'playlists':
          // show playlists by focusing playlist user section
          document.getElementById('playlist-user')?.scrollIntoView();
          break;
        case 'albums':
          document.getElementById('album-list')?.scrollIntoView();
          break;
        case 'songs':
          document.getElementById('music-list')?.scrollIntoView();
          break;
        case 'artists':
          document.getElementById('artist-list')?.scrollIntoView();
          break;
      }
    });
  }
  // Wire mobile player controls to core player functions
  const mp = document.querySelector('.mobile-player');
  if (mp) {
    const audio = document.getElementById('audio');
    const playBtn = document.getElementById('play-btn');
    mp.querySelector('.mp-prev')?.addEventListener('click', () => { try { playPrevious(audio, null); } catch(_){} });
    mp.querySelector('.mp-play')?.addEventListener('click', () => { try { togglePlay(audio, playBtn); } catch(_){} });
    mp.querySelector('.mp-next')?.addEventListener('click', () => { try { playNext(audio, null); } catch(_){} });
  }
}

export function updateMobilePlayer({ title, artist, artUrl } = {}) {
  const mp = document.querySelector('.mobile-player');
  if (!mp) return;
  if (title !== undefined) mp.querySelector('.mp-title').textContent = title || '';
  if (artist !== undefined) mp.querySelector('.mp-artist').textContent = artist || '';
  if (artUrl !== undefined) mp.querySelector('.mp-art').style.backgroundImage = `url('${artUrl}')`;
  // Update play/pause state from audio element
  const audio = document.getElementById('audio');
  const playIcon = mp.querySelector('.mp-play img');
  if (audio && playIcon) {
    if (audio.paused) {
      playIcon.src = 'assets/images/play-centered.svg';
      playIcon.style.width = '20px'; playIcon.style.height = '20px';
    } else {
      playIcon.src = 'assets/images/pause.svg';
      playIcon.style.width = '18px'; playIcon.style.height = '18px';
    }
  }
}

// Keep mobile play button icon in sync with audio events
window.addEventListener('DOMContentLoaded', () => {
  const audio = document.getElementById('audio');
  if (!audio) return;
  audio.addEventListener('play', () => updateMobilePlayer());
  audio.addEventListener('pause', () => updateMobilePlayer());
  audio.addEventListener('loadedmetadata', () => updateMobilePlayer());
});

// Expose a small helper that updates the mobile player's metadata
export function updateMobilePlayer({ title, artist, artUrl }) {
  const mp = document.querySelector('.mobile-player');
  if (!mp) return;
  mp.querySelector('.mp-title').textContent = title || 'No track selected';
  mp.querySelector('.mp-artist').textContent = artist || '—';
  const img = mp.querySelector('.mp-art');
  if (artUrl) img.src = artUrl;
}

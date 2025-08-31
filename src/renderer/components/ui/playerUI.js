import { showToast } from './toast.js';

export function renderPlayerFavoriteIcon() {
  const info = document.querySelector('.track-info');
  if (!info) return;
  let favBtn = document.getElementById('player-favorite-btn');
  if (!favBtn) {
    favBtn = document.createElement('button');
    favBtn.id = 'player-favorite-btn';
    favBtn.title = 'Toggle Favorite';
    favBtn.style.background = 'none';
    favBtn.style.border = 'none';
    favBtn.style.cursor = 'pointer';
    favBtn.style.padding = '0 0 0 8px';
    favBtn.innerHTML = `<img src="assets/images/heart.svg" alt="Favorite" style="width:22px;height:22px;filter:grayscale(1) opacity(.5);transition:filter .2s;" />`;
    info.appendChild(favBtn);
  }
  const favImg = favBtn.querySelector('img');
  import('../shared/state.js').then(({ state, toggleFavorite }) => {
    const track = state.currentTrack;
    const color = getComputedStyle(document.documentElement).getPropertyValue('--primary-color').trim() || '#8C40B8';
    favImg.style.filter = track && track.favorite ? `drop-shadow(0 0 4px ${color}) saturate(2)` : 'grayscale(1) opacity(.5)';
    favBtn.onclick = (e) => {
      e.stopPropagation();
      if (!track) return;
      toggleFavorite(track);
      favImg.style.filter = track.favorite ? `drop-shadow(0 0 4px ${color}) saturate(2)` : 'grayscale(1) opacity(.5)';
    };
  });
}

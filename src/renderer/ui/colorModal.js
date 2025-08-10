import { getComplementaryColor } from './colorUtils.js';

function showColorModal() {
  const modal = document.createElement('div');
  modal.classList.add('color-modal');
  modal.style.position = 'fixed';
  modal.style.top = '0';
  modal.style.left = '0';
  modal.style.width = '100%';
  modal.style.height = '100%';
  modal.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
  modal.style.display = 'flex';
  modal.style.justifyContent = 'center';
  modal.style.alignItems = 'center';
  modal.style.zIndex = '1001';

  const modalContent = document.createElement('div');
  modalContent.style.backgroundColor = '#282828';
  modalContent.style.padding = '20px';
  modalContent.style.borderRadius = '8px';
  modalContent.style.textAlign = 'center';

  const title = document.createElement('h3');
  title.textContent = 'Choose a Color';
  title.style.color = '#fff';
  title.style.marginBottom = '20px';
  modalContent.appendChild(title);

  const colors = [
    '#8C40B8', '#ff0000', '#ffa500', '#ffff00', '#008000', '#0000ff', '#4b0082', '#ee82ee'
  ];
  const colorContainer = document.createElement('div');
  colorContainer.style.display = 'flex';
  colorContainer.style.gap = '10px';

  colors.forEach((color, idx) => {
    const colorDot = document.createElement('div');
    colorDot.style.width = '30px';
    colorDot.style.height = '30px';
    colorDot.style.borderRadius = '50%';
    colorDot.style.backgroundColor = color;
    colorDot.style.cursor = 'pointer';
    colorDot.style.border = color === '#8C40B8' ? '2px solid #fff' : 'none';
    if (idx === 0) {
      document.documentElement.style.setProperty('--primary-color', color);
      document.documentElement.style.setProperty('--complementary-color', getComplementaryColor(color));
    }
    colorDot.addEventListener('click', () => {
      document.documentElement.style.setProperty('--primary-color', color);
      document.documentElement.style.setProperty('--complementary-color', getComplementaryColor(color));
      window.etune.updateConfig({ theme: { primaryColor: color } });
      refreshDynamicColors();
      modal.remove();
    });
    colorContainer.appendChild(colorDot);
  });

  modalContent.appendChild(colorContainer);

  const pickerLabel = document.createElement('div');
  pickerLabel.textContent = 'Or pick any color:';
  pickerLabel.style.color = '#fff';
  pickerLabel.style.margin = '18px 0 8px 0';
  pickerLabel.style.fontSize = '1em';
  modalContent.appendChild(pickerLabel);

  const colorPicker = document.createElement('input');
  colorPicker.type = 'color';
  colorPicker.value = '#8C40B8';
  colorPicker.style.width = '48px';
  colorPicker.style.height = '48px';
  colorPicker.style.border = 'none';
  colorPicker.style.background = 'none';
  colorPicker.style.cursor = 'pointer';
  colorPicker.style.marginBottom = '8px';
  colorPicker.oninput = (e) => {
    document.documentElement.style.setProperty('--primary-color', e.target.value);
    document.documentElement.style.setProperty('--complementary-color', getComplementaryColor(e.target.value));
    window.etune.updateConfig({ theme: { primaryColor: e.target.value } });
    refreshDynamicColors();
  };
  colorPicker.onchange = (e) => {
    document.documentElement.style.setProperty('--primary-color', e.target.value);
    document.documentElement.style.setProperty('--complementary-color', getComplementaryColor(e.target.value));
    window.etune.updateConfig({ theme: { primaryColor: e.target.value } });
    refreshDynamicColors();
    modal.remove();
  };
// Refresh volume bar and favorite icon colors after theme change
function refreshDynamicColors() {
  // Volume bar
  const volume = document.getElementById('volume');
  if (volume) {
    const pct = Math.max(0, Math.min(100, Number(volume.value)));
    const primary = getComputedStyle(document.documentElement).getPropertyValue('--primary-color').trim() || '#8C40B8';
    volume.style.background = `linear-gradient(${primary} 0 0) 0/ ${pct}% 100% no-repeat, #333`;
  }
  // Player favorite icon
  const playerFavImg = document.querySelector('#player-favorite-btn img');
  if (playerFavImg) {
    const trackFavorite = playerFavImg.closest('button')?.classList.contains('active');
    const color = getComputedStyle(document.documentElement).getPropertyValue('--primary-color').trim() || '#8C40B8';
    playerFavImg.style.filter = trackFavorite ? `drop-shadow(0 0 4px ${color}) saturate(2)` : 'grayscale(1) opacity(.5)';
  }
  // List favorite icons
  document.querySelectorAll('.favorite-btn img').forEach(favImg => {
    const btn = favImg.closest('button');
    const isFav = btn?.classList.contains('active') || favImg.style.filter.includes('drop-shadow');
    const color = getComputedStyle(document.documentElement).getPropertyValue('--primary-color').trim() || '#8C40B8';
    favImg.style.filter = isFav ? `drop-shadow(0 0 4px ${color}) saturate(2)` : 'grayscale(1) opacity(.5)';
  });
}
  modalContent.appendChild(colorPicker);
  modal.appendChild(modalContent);
  document.body.appendChild(modal);

  modal.addEventListener('click', (event) => {
    if (event.target === modal) {
      modal.remove();
    }
  });
}

export { showColorModal };

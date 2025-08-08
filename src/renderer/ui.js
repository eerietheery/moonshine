function getComplementaryColor(hex) {
  // Remove # if present
  hex = hex.replace('#', '');
  // Parse r,g,b
  let r = parseInt(hex.substring(0,2), 16);
  let g = parseInt(hex.substring(2,4), 16);
  let b = parseInt(hex.substring(4,6), 16);
  // Get complementary
  r = 255 - r;
  g = 255 - g;
  b = 255 - b;
  // Return as hex
  return '#' + [r,g,b].map(x => x.toString(16).padStart(2,'0')).join('');
}

function showScanModal() {
  const modal = document.createElement('div');
  modal.style.position = 'fixed';
  modal.style.top = '0';
  modal.style.left = '0';
  modal.style.width = '100%';
  modal.style.height = '100%';
  modal.style.backgroundColor = 'rgba(0,0,0,0.7)';
  modal.style.display = 'flex';
  modal.style.justifyContent = 'center';
  modal.style.alignItems = 'center';
  modal.style.zIndex = '1002';

  const box = document.createElement('div');
  box.style.background = '#282828';
  box.style.padding = '24px';
  box.style.borderRadius = '10px';
  box.style.textAlign = 'center';
  box.style.minWidth = '320px';

  const msg = document.createElement('div');
  msg.textContent = 'Scan default music folder? (C:/Users/Eerie/Music)';
  msg.style.color = '#fff';
  msg.style.marginBottom = '18px';
  box.appendChild(msg);

  const scanBtn = document.createElement('button');
  scanBtn.textContent = 'Scan Default';
  scanBtn.style.margin = '0 8px 0 0';
  scanBtn.style.padding = '8px 16px';
  scanBtn.style.background = 'var(--primary-color)';
  scanBtn.style.color = '#fff';
  scanBtn.style.border = 'none';
  scanBtn.style.borderRadius = '4px';
  scanBtn.style.cursor = 'pointer';
  scanBtn.onclick = async () => {
    modal.remove();
    // This will be handled by an event listener in the main file
    document.dispatchEvent(new CustomEvent('scan-default'));
  };
  box.appendChild(scanBtn);

  const addBtn = document.createElement('button');
  addBtn.textContent = 'Add Folder';
  addBtn.style.margin = '0 8px';
  addBtn.style.padding = '8px 16px';
  addBtn.style.background = '#444';
  addBtn.style.color = '#fff';
  addBtn.style.border = 'none';
  addBtn.style.borderRadius = '4px';
  addBtn.style.cursor = 'pointer';
  addBtn.onclick = async () => {
    modal.remove();
    // This will be handled by an event listener in the main file
    document.dispatchEvent(new CustomEvent('add-folder'));
  };
  box.appendChild(addBtn);

  const cancelBtn = document.createElement('button');
  cancelBtn.textContent = 'Cancel';
  cancelBtn.style.margin = '0 0 0 8px';
  cancelBtn.style.padding = '8px 16px';
  cancelBtn.style.background = '#888';
  cancelBtn.style.color = '#fff';
  cancelBtn.style.border = 'none';
  cancelBtn.style.borderRadius = '4px';
  cancelBtn.style.cursor = 'pointer';
  cancelBtn.onclick = () => {
    modal.remove();
  };
  box.appendChild(cancelBtn);

  modal.appendChild(box);
  document.body.appendChild(modal);
  // Remove modal on outside click
  modal.addEventListener('click', (e) => {
    if (e.target === modal) modal.remove();
  });
}

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

  // Vibrant color palette, purple default
  const colors = [
    '#8C40B8', // default purple
    '#ff0000', // red
    '#ffa500', // orange
    '#ffff00', // yellow
    '#008000', // green
    '#0000ff', // blue
    '#4b0082', // indigo
    '#ee82ee'  // violet
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
      // Set default color on modal open
      document.documentElement.style.setProperty('--primary-color', color);
      document.documentElement.style.setProperty('--complementary-color', getComplementaryColor(color));
    }
    colorDot.addEventListener('click', () => {
      document.documentElement.style.setProperty('--primary-color', color);
      document.documentElement.style.setProperty('--complementary-color', getComplementaryColor(color));
      modal.remove();
    });
    colorContainer.appendChild(colorDot);
  });

  modalContent.appendChild(colorContainer);

  // Full color picker
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
  };
  colorPicker.onchange = (e) => {
    document.documentElement.style.setProperty('--primary-color', e.target.value);
    document.documentElement.style.setProperty('--complementary-color', getComplementaryColor(e.target.value));
    modal.remove();
  };
  modalContent.appendChild(colorPicker);
  modal.appendChild(modalContent);
  document.body.appendChild(modal);

  modal.addEventListener('click', (event) => {
    if (event.target === modal) {
      modal.remove();
    }
  });
}

function showSettingsMenu(event) {
  const menu = document.createElement('div');
  menu.classList.add('settings-dropdown');
  menu.style.position = 'absolute';
  // Position menu below the hamburger button
  const btnRect = event.target.getBoundingClientRect();
  menu.style.top = `${btnRect.bottom + window.scrollY}px`;
  menu.style.left = `${btnRect.left + window.scrollX}px`;
  menu.style.backgroundColor = '#282828';
  menu.style.border = '1px solid #444';
  menu.style.borderRadius = '4px';
  menu.style.padding = '8px';
  menu.style.zIndex = '1000';

  // Change Color button
  const changeColorBtn = document.createElement('button');
  changeColorBtn.textContent = 'Change Color';
  changeColorBtn.style.backgroundColor = 'transparent';
  changeColorBtn.style.border = 'none';
  changeColorBtn.style.color = '#fff';
  changeColorBtn.style.cursor = 'pointer';
  changeColorBtn.style.padding = '8px';
  changeColorBtn.style.textAlign = 'left';
  changeColorBtn.style.width = '100%';
  changeColorBtn.addEventListener('click', () => {
    menu.remove();
    showColorModal();
  });
  menu.appendChild(changeColorBtn);

  // Add Library button
  const addLibraryBtn = document.createElement('button');
  addLibraryBtn.textContent = 'Add Library';
  addLibraryBtn.style.backgroundColor = 'transparent';
  addLibraryBtn.style.border = 'none';
  addLibraryBtn.style.color = '#fff';
  addLibraryBtn.style.cursor = 'pointer';
  addLibraryBtn.style.padding = '8px';
  addLibraryBtn.style.textAlign = 'left';
  addLibraryBtn.style.width = '100%';
  addLibraryBtn.addEventListener('click', async () => {
    menu.remove();
    // This will be handled by an event listener in the main file
    document.dispatchEvent(new CustomEvent('add-folder'));
  });
  menu.appendChild(addLibraryBtn);

  document.body.appendChild(menu);

  const closeMenu = (e) => {
    // Only close if clicking outside the menu
    if (!menu.contains(e.target)) {
      menu.remove();
      document.removeEventListener('click', closeMenu);
    }
  };
  setTimeout(() => {
    document.addEventListener('click', closeMenu);
  }, 0);
}

export { getComplementaryColor, showScanModal, showColorModal, showSettingsMenu };

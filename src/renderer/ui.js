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

import { state } from '../state.js';

function showSettingsModal() {
  // Backdrop
  const modal = document.createElement('div');
  modal.style.position = 'fixed';
  modal.style.inset = '0';
  modal.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
  modal.style.display = 'flex';
  modal.style.alignItems = 'center';
  modal.style.justifyContent = 'center';
  modal.style.zIndex = '1002';

  // Dialog
  const dialog = document.createElement('div');
  dialog.style.background = '#1f1f1f';
  dialog.style.border = '1px solid #444';
  dialog.style.borderRadius = '10px';
  dialog.style.width = 'min(520px, 92vw)';
  dialog.style.maxHeight = '85vh';
  dialog.style.overflow = 'auto';
  dialog.style.boxShadow = '0 10px 30px rgba(0,0,0,0.6)';

  const header = document.createElement('div');
  header.style.display = 'flex';
  header.style.alignItems = 'center';
  header.style.justifyContent = 'space-between';
  header.style.padding = '14px 16px';
  header.style.borderBottom = '1px solid #333';

  const title = document.createElement('div');
  title.textContent = 'Settings';
  title.style.color = '#fff';
  title.style.fontSize = '16px';
  title.style.fontWeight = '600';

  const closeBtn = document.createElement('button');
  closeBtn.textContent = '✖';
  closeBtn.title = 'Close';
  closeBtn.style.background = 'transparent';
  closeBtn.style.border = 'none';
  closeBtn.style.color = '#aaa';
  closeBtn.style.cursor = 'pointer';
  closeBtn.style.fontSize = '16px';
  closeBtn.addEventListener('click', () => modal.remove());

  header.appendChild(title);
  header.appendChild(closeBtn);

  const body = document.createElement('div');
  body.style.padding = '16px';
  body.style.color = '#ddd';
  body.style.display = 'grid';
  body.style.gap = '18px';

  // Library section
  const libSection = document.createElement('div');
  const libTitle = document.createElement('div');
  libTitle.textContent = 'Library';
  libTitle.style.fontWeight = '600';
  libTitle.style.marginBottom = '8px';
  libTitle.style.color = '#fff';

  const addFolder = document.createElement('button');
  addFolder.textContent = 'Add Music Folder…';
  addFolder.style.background = 'var(--primary-color, #8C40B8)';
  addFolder.style.border = 'none';
  addFolder.style.color = '#fff';
  addFolder.style.padding = '10px 14px';
  addFolder.style.borderRadius = '6px';
  addFolder.style.cursor = 'pointer';
  addFolder.addEventListener('click', async () => {
    // delegate to existing handler
    document.dispatchEvent(new CustomEvent('add-folder'));
  });

  // Existing directories list
  const dirList = document.createElement('div');
  dirList.style.marginTop = '12px';
  dirList.style.display = 'grid';
  dirList.style.gap = '8px';

  const renderDirs = (dirs) => {
    dirList.innerHTML = '';
    if (!dirs || !dirs.length) {
      const empty = document.createElement('div');
      empty.textContent = 'No folders added yet.';
      empty.style.color = '#aaa';
      dirList.appendChild(empty);
      return;
    }
    dirs.forEach((p) => {
      const row = document.createElement('div');
      row.style.display = 'flex';
      row.style.alignItems = 'center';
      row.style.justifyContent = 'space-between';
      row.style.background = '#2a2a2a';
      row.style.border = '1px solid #333';
      row.style.borderRadius = '6px';
      row.style.padding = '8px 10px';

      const label = document.createElement('div');
      label.textContent = p;
      label.style.color = '#ddd';
      label.style.overflow = 'hidden';
      label.style.textOverflow = 'ellipsis';
      label.style.whiteSpace = 'nowrap';
      label.style.maxWidth = '75%';

      // Remove button (UI only for now; does not delete tracks)
      const remove = document.createElement('button');
      remove.textContent = 'Remove';
      remove.style.background = '#444';
      remove.style.border = 'none';
      remove.style.color = '#fff';
      remove.style.padding = '6px 10px';
      remove.style.borderRadius = '4px';
      remove.style.cursor = 'pointer';
      remove.addEventListener('click', () => {
        const idx = state.libraryDirs.indexOf(p);
        if (idx !== -1) {
          state.libraryDirs.splice(idx, 1);
          document.dispatchEvent(new CustomEvent('library-dirs-updated', { detail: state.libraryDirs.slice() }));
        }
      });

      row.appendChild(label);
      row.appendChild(remove);
      dirList.appendChild(row);
    });
  };

  renderDirs(state.libraryDirs);
  const onDirs = (e) => renderDirs(e.detail);
  document.addEventListener('library-dirs-updated', onDirs);

  // Clean up listener when modal closes
  const teardown = () => {
    document.removeEventListener('library-dirs-updated', onDirs);
  };

  libSection.appendChild(libTitle);
  libSection.appendChild(addFolder);
  libSection.appendChild(dirList);

  // Theme section
  const themeSection = document.createElement('div');
  const themeTitle = document.createElement('div');
  themeTitle.textContent = 'Theme';
  themeTitle.style.fontWeight = '600';
  themeTitle.style.margin = '8px 0';
  themeTitle.style.color = '#fff';

  const changeColor = document.createElement('button');
  changeColor.textContent = 'Change Color…';
  changeColor.style.background = '#444';
  changeColor.style.border = 'none';
  changeColor.style.color = '#fff';
  changeColor.style.padding = '10px 14px';
  changeColor.style.borderRadius = '6px';
  changeColor.style.cursor = 'pointer';
  changeColor.addEventListener('click', () => {
    // Close settings first, then open color picker under it
    modal.remove();
    teardown();
    showColorModal();
  });

  themeSection.appendChild(themeTitle);
  themeSection.appendChild(changeColor);

  body.appendChild(libSection);
  body.appendChild(themeSection);

  dialog.appendChild(header);
  dialog.appendChild(body);

  modal.appendChild(dialog);
  document.body.appendChild(modal);

  // Close on outside click
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.remove();
      teardown();
    }
  });
}

export { getComplementaryColor, showScanModal, showColorModal, showSettingsModal };

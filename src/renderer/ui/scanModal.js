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
  modal.addEventListener('click', (e) => {
    if (e.target === modal) modal.remove();
  });
}

export { showScanModal };

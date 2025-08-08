import { showScanModal } from '../ui/scanModal.js';
import { addMusic, loadMusic } from '../library.js';
import * as dom from '../dom.js';

export function setupLibraryEventListeners() {
  dom.addFolderBtn?.addEventListener('click', async () => {
    const userPath = await window.etune.selectFolder();
    if (userPath) {
      addMusic(userPath);
    }
  });

  dom.scanBtn.addEventListener('click', showScanModal);

  document.addEventListener('scan-default', () => {
    loadMusic('C:/Users/Eerie/Music');
  });

  document.addEventListener('add-folder', async () => {
    const userPath = await window.etune.selectFolder();
    if (userPath) {
      addMusic(userPath);
    }
  });
}

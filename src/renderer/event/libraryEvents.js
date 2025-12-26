import { showScanModal } from '../ui/scanModal.js';
import { addMusic, loadMusic } from '../library.js';
import * as dom from '../dom.js';

export function setupLibraryEventListeners() {
  dom.addFolderBtn?.addEventListener('click', async () => {
    const userPath = await window.moonshine.selectFolder();
    if (userPath) {
      addMusic(userPath);
    }
  });

  dom.scanBtn.addEventListener('click', showScanModal);

  document.addEventListener('scan-default', async () => {
    const defaultDir = await window.moonshine.getDefaultMusicPath();
    loadMusic(defaultDir);
  });

  document.addEventListener('add-folder', async () => {
    const userPath = await window.moonshine.selectFolder();
    if (userPath) {
      addMusic(userPath);
    }
  });
}

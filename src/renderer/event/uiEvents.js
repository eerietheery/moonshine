import { renderList } from '../../view.js';
import { showSettingsModal } from '../ui.js';
import { displayGridView } from '../grid.js';
import * as dom from '../dom.js';
import { state } from '../../state.js';

export function setupUiEventListeners() {
  dom.settingsBtn.addEventListener('click', showSettingsModal);

  dom.sidebarToggles.forEach(toggle => {
    const targetId = toggle.getAttribute('data-target');
    const targetList = document.getElementById(targetId);
    const icon = toggle.querySelector('.toggle-icon');
    
    targetList.classList.remove('collapsed');
    icon.classList.remove('collapsed');
    
    toggle.addEventListener('click', (e) => {
      if (e.target === toggle || e.target.classList.contains('toggle-icon') || e.target.closest('.sidebar-toggle') === toggle) {
        if (targetList.classList.contains('collapsed')) {
          targetList.classList.remove('collapsed');
          icon.classList.remove('collapsed');
        } else {
          targetList.classList.add('collapsed');
          icon.classList.add('collapsed');
        }
        e.preventDefault();
        e.stopPropagation();
      }
    });
  });

  dom.gridViewBtn.addEventListener('click', () => {
    displayGridView();
  });

  dom.listViewBtn.addEventListener('click', () => {
    renderList(dom.list);
    dom.gridViewBtn.classList.remove('active');
    dom.listViewBtn.classList.add('active');
  });

  dom.tableHeaders.forEach((header, idx) => {
    header.onclick = () => {
      const keys = ['title', 'artist', 'album', 'year', 'genre'];
      state.sortBy = keys[idx];
      renderList(dom.list);
    };
  });
}

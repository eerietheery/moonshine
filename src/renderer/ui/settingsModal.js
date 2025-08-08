import { state } from '../../state.js';
import { updateSidebarFilters } from '../../sidebar.js';
import { renderList } from '../../view.js';
import { showColorModal } from './colorModal.js';

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
    modal.remove();
    teardown();
    showColorModal();
  });

  themeSection.appendChild(themeTitle);
  themeSection.appendChild(changeColor);

  body.appendChild(libSection);

  // Filtering section
  const filterSection = document.createElement('div');
  const filterTitle = document.createElement('div');
  filterTitle.textContent = 'Filtering';
  filterTitle.style.fontWeight = '600';
  filterTitle.style.margin = '8px 0';
  filterTitle.style.color = '#fff';

  const filterToggle = document.createElement('label');
  filterToggle.style.display = 'flex';
  filterToggle.style.gap = '8px';
  filterToggle.style.alignItems = 'center';
  filterToggle.style.color = '#ddd';
  filterToggle.innerHTML = `<input type="checkbox" ${state.sidebarFilteringEnabled ? 'checked' : ''}/> Enable sidebar filtering`;
  const filterCheckbox = filterToggle.querySelector('input');
  filterCheckbox.addEventListener('change', () => {
    state.sidebarFilteringEnabled = filterCheckbox.checked;
    if (!state.sidebarFilteringEnabled) {
      state.activeArtist = null;
      state.activeAlbum = null;
    }
    window.etune.updateConfig({ sidebarFilteringEnabled: state.sidebarFilteringEnabled });
    const filterInput = document.getElementById('filter');
    const list = document.getElementById('music-list');
    const artistList = document.getElementById('artist-list');
    const albumList = document.getElementById('album-list');
    const doRenderList = () => renderList(list);
     import('../../../state.js').then(({ updateFilters }) => {
      updateFilters(filterInput, state.sidebarFilteringEnabled);
      updateSidebarFilters(filterInput, artistList, albumList, doRenderList, state.sidebarFilteringEnabled);
      doRenderList();
    });
  });

  filterSection.appendChild(filterTitle);
  filterSection.appendChild(filterToggle);
  body.appendChild(filterSection);
  body.appendChild(themeSection);

  dialog.appendChild(header);
  dialog.appendChild(body);

  modal.appendChild(dialog);
  document.body.appendChild(modal);

  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.remove();
      teardown();
    }
  });
}

export { showSettingsModal };

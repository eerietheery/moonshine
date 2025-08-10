import { state } from '../components/state.js';
import { updateSidebarFilters } from '../components/sidebar.js';
import { renderList } from '../components/view.js';
import { showColorModal } from './colorModal.js';

function showSettingsModal() {
  // --- Modal Backdrop ---
  const modal = document.createElement('div');
  modal.style.position = 'fixed';
  modal.style.inset = '0';
  modal.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
  modal.style.display = 'flex';
  modal.style.alignItems = 'center';
  modal.style.justifyContent = 'center';
  modal.style.zIndex = '1002';

  // --- Dialog ---
  const dialog = document.createElement('div');
  dialog.style.background = '#1f1f1f';
  dialog.style.border = '1px solid #444';
  dialog.style.borderRadius = '10px';
  dialog.style.width = 'min(520px, 92vw)';
  dialog.style.maxHeight = '85vh';
  dialog.style.overflow = 'auto';
  dialog.style.boxShadow = '0 10px 30px rgba(0,0,0,0.6)';

  // --- Header ---
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
  closeBtn.addEventListener('click', () => {
    modal.remove();
    teardown();
  });

  header.appendChild(title);
  header.appendChild(closeBtn);

  // --- Body ---
  const body = document.createElement('div');
  body.style.padding = '16px';
  body.style.color = '#ddd';
  body.style.display = 'grid';
  body.style.gap = '18px';

  // --- Library Section ---
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
  addFolder.addEventListener('click', () => {
    document.dispatchEvent(new CustomEvent('add-folder'));
  });

  // Existing directories list
  const dirList = document.createElement('div');
  dirList.style.marginTop = '12px';
  dirList.style.display = 'grid';
  dirList.style.gap = '8px';

  // Render library directories
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
      remove.addEventListener('click', async () => {
        const defaultDir = await window.etune.getDefaultMusicPath();
        const isDefault = p === defaultDir;
        if (isDefault && dirs.length === 1) {
          alert('Cannot remove the default library.');
          return;
        }
        const idx = state.libraryDirs.indexOf(p);
        if (idx !== -1) {
          state.libraryDirs.splice(idx, 1);
          document.dispatchEvent(new CustomEvent('library-dirs-updated', { detail: state.libraryDirs.slice() }));
          window.etune.updateConfig({ libraryDirs: state.libraryDirs.slice() });
          state.tracks = state.tracks.filter(t => !t.filePath.startsWith(p));
          if (state.libraryDirs.length === 0) {
            const def = await window.etune.getDefaultMusicPath();
            document.dispatchEvent(new CustomEvent('toast', { detail: { message: 'Reloading default library...', type: 'info' } }));
            window.etune.scanMusic(def).then(tracks => {
              state.tracks = tracks.filter(t => t && t.filePath);
              state.libraryDirs = [def];
              document.dispatchEvent(new CustomEvent('library-dirs-updated', { detail: state.libraryDirs.slice() }));
              window.etune.updateConfig({ libraryDirs: state.libraryDirs.slice() });
              updateSidebarFilters(window.dom.filterInput, window.dom.artistList, window.dom.albumList, () => renderList(window.dom.list), state.sidebarFilteringEnabled);
              renderList(window.dom.list);
            });
          } else {
            updateSidebarFilters(window.dom.filterInput, window.dom.artistList, window.dom.albumList, () => renderList(window.dom.list), state.sidebarFilteringEnabled);
            renderList(window.dom.list);
          }
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

  // --- Artist Section ---
  const artistSection = document.createElement('div');
  artistSection.style.marginTop = '18px';
  artistSection.style.display = 'flex';
  artistSection.style.alignItems = 'center';

  const artistToggle = document.createElement('input');
  artistToggle.type = 'checkbox';
  artistToggle.checked = !!state.explicitArtistNames;
  artistToggle.style.transform = 'scale(1.2)';
  artistToggle.style.marginRight = '10px';
  artistToggle.addEventListener('change', () => {
    state.explicitArtistNames = artistToggle.checked;
    window.etune.updateConfig({ explicitArtistNames: state.explicitArtistNames });
    document.dispatchEvent(new CustomEvent('artist-lumping-updated', { detail: state.explicitArtistNames }));
    updateSidebarFilters(window.dom.filterInput, window.dom.artistList, window.dom.albumList, () => renderList(window.dom.list), state.sidebarFilteringEnabled);
    renderList(window.dom.list);
  });

  const artistLabel = document.createElement('label');
  artistLabel.textContent = 'Explicit Artist Names';
  artistLabel.style.fontWeight = '600';
  artistLabel.style.fontFamily = 'inherit';
  artistLabel.style.fontSize = '15px';
  artistLabel.style.color = '#fff';
  artistLabel.style.letterSpacing = '0.01em';

  artistSection.appendChild(artistToggle);
  artistSection.appendChild(artistLabel);

  // --- Filtering Section ---
  const filterSection = document.createElement('div');
  const filterTitle = document.createElement('div');
  filterTitle.textContent = 'Filtering';
  filterTitle.style.fontWeight = '600';
  filterTitle.style.margin = '8px 0';
  filterTitle.style.color = '#fff';

  const filterToggle = document.createElement('label');
  filterToggle.style.display = 'flex';
  filterToggle.style.alignItems = 'center';
  filterToggle.style.gap = '10px';
  filterToggle.style.color = '#fff';

  const filterCheckbox = document.createElement('input');
  filterCheckbox.type = 'checkbox';
  filterCheckbox.checked = !!state.sidebarFilteringEnabled;
  filterCheckbox.style.transform = 'scale(1.2)';
  filterCheckbox.style.marginRight = '0px';
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
    import('../components/state.js').then(({ updateFilters }) => {
      updateFilters(filterInput, state.sidebarFilteringEnabled);
      updateSidebarFilters(filterInput, artistList, albumList, doRenderList, state.sidebarFilteringEnabled);
      doRenderList();
    });
  });

  const filterLabel = document.createElement('span');
  filterLabel.textContent = 'Enable sidebar filtering';
  filterLabel.style.fontWeight = '600';
  filterLabel.style.fontFamily = 'inherit';
  filterLabel.style.fontSize = '15px';
  filterLabel.style.color = '#fff';
  filterLabel.style.letterSpacing = '0.01em';

  filterToggle.appendChild(filterCheckbox);
  filterToggle.appendChild(filterLabel);

  filterSection.appendChild(filterTitle);
  filterSection.appendChild(filterToggle);

  // --- Theme Section ---
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

  // --- Assemble Modal Body ---
  body.appendChild(libSection);
  body.appendChild(filterSection);
  body.appendChild(artistSection);
  body.appendChild(themeSection);

  dialog.appendChild(header);
  dialog.appendChild(body);
  modal.appendChild(dialog);
  document.body.appendChild(modal);

  // --- Modal Dismiss ---
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.remove();
      teardown();
    }
  });
}

export { showSettingsModal };

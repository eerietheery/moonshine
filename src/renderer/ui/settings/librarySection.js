import { updateSidebarFilters } from '../../components/sidebar/sidebar.js';
import { renderList } from '../../components/shared/view.js';
import { rebuildTrackIndex } from '../../components/shared/state.js';

function createLibrarySection(state) {
  const libSection = document.createElement('div');

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
        const defaultDir = await window.moonshine.getDefaultMusicPath();
        const isDefault = p === defaultDir;
        if (isDefault && dirs.length === 1) {
          alert('Cannot remove the default library.');
          return;
        }
        const idx = state.libraryDirs.indexOf(p);
        if (idx !== -1) {
          state.libraryDirs.splice(idx, 1);
          document.dispatchEvent(new CustomEvent('library-dirs-updated', { detail: state.libraryDirs.slice() }));
          window.moonshine.updateConfig({ libraryDirs: state.libraryDirs.slice() });
          state.tracks = state.tracks.filter(t => !t.filePath.startsWith(p));
          rebuildTrackIndex();
          if (state.libraryDirs.length === 0) {
            const def = await window.moonshine.getDefaultMusicPath();
            document.dispatchEvent(new CustomEvent('toast', { detail: { message: 'Reloading default library...', type: 'info' } }));
            (window.moonshine.scanMusicLite ? window.moonshine.scanMusicLite(def) : window.moonshine.scanMusic(def)).then(tracks => {
              state.tracks = tracks.filter(t => t && t.filePath);
              rebuildTrackIndex();
              state.libraryDirs = [def];
              document.dispatchEvent(new CustomEvent('library-dirs-updated', { detail: state.libraryDirs.slice() }));
              window.moonshine.updateConfig({ libraryDirs: state.libraryDirs.slice() });
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

  libSection.appendChild(addFolder);
  libSection.appendChild(dirList);

  return { element: libSection, teardown };
}

export { createLibrarySection };

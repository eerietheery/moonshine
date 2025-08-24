import { state } from '../components/shared/state.js';
import { updateSidebarFilters } from '../components/sidebar/sidebar.js';
import { renderList } from '../components/shared/view.js';
import { showColorModal } from './colorModal.js';

function showSettingsModal() {
  // --- Import Playlist Section ---
  const importSection = document.createElement('div');
  importSection.style.marginTop = '18px';
  importSection.style.display = 'flex';
  importSection.style.alignItems = 'center';
  importSection.style.gap = '10px';

  const importBtn = document.createElement('button');
  importBtn.textContent = 'Import Playlist(s)…';
  importBtn.style.background = 'var(--primary-color, #8C40B8)';
  importBtn.style.border = 'none';
  importBtn.style.color = '#fff';
  importBtn.style.padding = '10px 14px';
  importBtn.style.borderRadius = '6px';
  importBtn.style.cursor = 'pointer';

  // Hidden file input for M3U files
  const fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.accept = '.m3u,.m3u8';
  fileInput.multiple = true;
  fileInput.style.display = 'none';

  importBtn.addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    const { importM3U } = await import('../utils/importM3U.js');
    for (const file of files) {
      await importM3U(file, state, window.renderPlaylistsSidebar || (() => {}));
    }
    fileInput.value = '';
    modal.remove();
    teardown();
  });

  importSection.appendChild(importBtn);
  importSection.appendChild(fileInput);
  // --- List View Headers Section ---
  const headersSection = document.createElement('div');
  headersSection.style.marginTop = '18px';
  headersSection.style.display = 'flex';
  headersSection.style.flexDirection = 'column';
  headersSection.style.gap = '10px';

  const headersTitle = document.createElement('div');
  headersTitle.textContent = 'List View Headers';
  headersTitle.style.fontWeight = '600';
  headersTitle.style.color = '#fff';
  headersTitle.style.marginBottom = '8px';

  // Default headers for now
  const possibleHeaders = [
    { key: 'title', label: 'Title' },
    { key: 'artist', label: 'Artist' },
    { key: 'album', label: 'Album' },
    { key: 'year', label: 'Year' },
    { key: 'genre', label: 'Genre' },
    { key: 'bitrate', label: 'Bit Rate' }
  ];
  if (!state.listHeaders) state.listHeaders = possibleHeaders.map(h => h.key);

  const headerCheckboxes = document.createElement('div');
  headerCheckboxes.style.display = 'grid';
  headerCheckboxes.style.gridTemplateColumns = 'repeat(auto-fit, minmax(120px, 1fr))';
  headerCheckboxes.style.gap = '8px';

  possibleHeaders.forEach(h => {
    const label = document.createElement('label');
    label.style.display = 'flex';
    label.style.alignItems = 'center';
    label.style.gap = '6px';
    label.style.color = '#ddd';
    label.style.fontWeight = '500';
    label.style.fontSize = '14px';
    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.checked = state.listHeaders.includes(h.key);
    cb.addEventListener('change', () => {
      if (cb.checked) {
        if (!state.listHeaders.includes(h.key)) state.listHeaders.push(h.key);
      } else {
        state.listHeaders = state.listHeaders.filter(k => k !== h.key);
      }
      if (window.etune && typeof window.etune.updateConfig === 'function') {
        window.etune.updateConfig({ listHeaders: state.listHeaders });
      }
      // Re-render list view immediately
      import('../components/shared/view.js').then(({ renderList }) => {
        const musicList = document.getElementById('music-list');
        if (musicList) renderList(musicList);
      });
    });
    label.appendChild(cb);
    label.appendChild(document.createTextNode(h.label));
    headerCheckboxes.appendChild(label);
  });

  headersSection.appendChild(headersTitle);
  headersSection.appendChild(headerCheckboxes);
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
  import('../components/shared/state.js').then(({ updateFilters }) => {
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

  // --- Updates Section (minimal) ---
  const updatesSection = document.createElement('div');
  updatesSection.style.marginTop = '18px';
  const updatesTitle = document.createElement('div');
  updatesTitle.textContent = 'Updates';
  updatesTitle.style.fontWeight = '600';
  updatesTitle.style.margin = '8px 0';
  updatesTitle.style.color = '#fff';

  const updateRow = document.createElement('div');
  updateRow.style.display = 'flex';
  updateRow.style.alignItems = 'center';
  updateRow.style.gap = '10px';

  const currentSpan = document.createElement('span');
  currentSpan.style.color = '#ccc';
  currentSpan.style.fontSize = '14px';
  currentSpan.textContent = 'Current version: …';

  const updateBtn = document.createElement('button');
  updateBtn.textContent = 'Update available — Open release page';
  updateBtn.style.background = 'var(--primary-color, #8C40B8)';
  updateBtn.style.border = 'none';
  updateBtn.style.color = '#fff';
  updateBtn.style.padding = '8px 12px';
  updateBtn.style.borderRadius = '6px';
  updateBtn.style.cursor = 'pointer';
  updateBtn.style.display = 'none'; // only shown when update exists

  let releaseUrl = null;
  updateBtn.addEventListener('click', () => {
    if (releaseUrl) window.etune.openExternal(releaseUrl);
  });

  updateRow.appendChild(currentSpan);
  updateRow.appendChild(updateBtn);
  updatesSection.appendChild(updatesTitle);
  updatesSection.appendChild(updateRow);

  // Kick off version check (best-effort; no hard failure if network blocked)
  (async () => {
    try {
      const appVerRaw = await window.etune.getAppVersion();
      if (appVerRaw) currentSpan.textContent = `Current version: ${appVerRaw}`;
      const owner = 'eerietheery';
      const repo = 'moonshine';
      // Use GitHub API; unauthenticated, so rate-limited — fine for on-demand checks
      const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/releases/latest`, { headers: { 'Accept': 'application/vnd.github+json' } });
      if (!res.ok) return; // silent fail
      const json = await res.json();
      const htmlUrl = json.html_url;
      // Extract semantic version (major.minor.patch) from tag_name or name
      const extractSemver = (s) => {
        const m = String(s || '').match(/\b(\d+)\.(\d+)\.(\d+)\b/);
        return m ? `${m[1]}.${m[2]}.${m[3]}` : null;
      };
      const latestVer = extractSemver(json.tag_name) || extractSemver(json.name);
      const currentVer = extractSemver(appVerRaw);
      if (!latestVer || !currentVer) return; // cannot compare reliably
      const toNums = (v) => v.split('.').map(n => Number(n));
      const [a0, a1, a2] = toNums(currentVer);
      const [b0, b1, b2] = toNums(latestVer);
      const newer = (b0 > a0) || (b0 === a0 && b1 > a1) || (b0 === a0 && b1 === a1 && b2 > a2);
      if (newer) {
        releaseUrl = htmlUrl || `https://github.com/${owner}/${repo}/releases/latest`;
        updateBtn.style.display = 'inline-flex';
      }
    } catch {}
  })();

  // --- Assemble Modal Body ---
  body.appendChild(libSection);
  body.appendChild(importSection);
  body.appendChild(headersSection);
  body.appendChild(filterSection);
  body.appendChild(artistSection);
  body.appendChild(themeSection);
  body.appendChild(updatesSection);

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

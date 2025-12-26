import { state } from '../components/shared/state.js';
import { updateSidebarFilters } from '../components/sidebar/sidebar.js';
import { renderList } from '../components/shared/view.js';
import { showColorModal } from './colorModal.js';
import { createLibrarySection } from './settings/librarySection.js';
import { createHeadersSection } from './settings/headersSection.js';
import { createUpdaterSection } from './settings/updaterSection.js';
import { createFilterSection } from './settings/filterSection.js';
import { createArtistSection } from './settings/artistSection.js';
import { createThemeSection } from './settings/themeSection.js';
import { createDataBackupSection } from './settings/dataBackupSection.js';

function showSettingsModal() {
  console.log('[settingsModal] showSettingsModal invoked');
  try {
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

  // --- Teardown aggregation (define early so it's safe to pass into sections) ---
  const teardownHandlers = [];
  function teardown() {
    teardownHandlers.forEach(fn => {
      try { fn && fn(); } catch (e) { /* ignore */ }
    });
  }

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
  body.style.gap = '8px';

  // Helper function to create section dividers
  const createSectionDivider = (title) => {
    const divider = document.createElement('div');
    divider.style.marginTop = '20px';
    divider.style.marginBottom = '12px';
    divider.style.paddingBottom = '8px';
    divider.style.borderBottom = '2px solid rgba(255,255,255,0.1)';
    
    const titleEl = document.createElement('div');
    titleEl.textContent = title;
    titleEl.style.fontSize = '15px';
    titleEl.style.fontWeight = '700';
    titleEl.style.color = 'var(--primary-color, #8C40B8)';
    titleEl.style.textTransform = 'uppercase';
    titleEl.style.letterSpacing = '0.5px';
    
    divider.appendChild(titleEl);
    return divider;
  };

  // --- LIBRARY & DATA SECTION ---
  body.appendChild(createSectionDivider('Library & Data'));
  
  const { element: libSection, teardown: libTeardown } = createLibrarySection(state);
  libSection.style.marginTop = '0';
  body.appendChild(libSection);

  const { element: dataBackupSection, teardown: dataBackupTeardown } = createDataBackupSection(state);
  dataBackupSection.style.marginTop = '16px';
  body.appendChild(dataBackupSection);

  body.appendChild(importSection);

  // --- APPEARANCE SECTION ---
  body.appendChild(createSectionDivider('Appearance'));

  const { element: themeSection, teardown: themeTeardown } = createThemeSection(showColorModal, modal, teardown);
  themeSection.style.marginTop = '0';
  body.appendChild(themeSection);

  // Full Art Display Card Toggle
  const fullArtSection = document.createElement('div');
  fullArtSection.style.marginTop = '12px';
  fullArtSection.style.display = 'flex';
  fullArtSection.style.alignItems = 'center';
  fullArtSection.style.gap = '12px';
  const fullArtToggle = document.createElement('input');
  fullArtToggle.type = 'checkbox';
  fullArtToggle.checked = !!state.fullArtCardDisplay;
  fullArtToggle.style.transform = 'scale(1.3)';
  fullArtToggle.style.marginRight = '8px';
  fullArtToggle.addEventListener('change', (e) => {
    state.fullArtCardDisplay = fullArtToggle.checked;
    if (window.moonshine?.updateConfig) window.moonshine.updateConfig({ fullArtCardDisplay: state.fullArtCardDisplay });
    if (typeof window.renderGrid === 'function') window.renderGrid(document.getElementById('music-list'));
  });
  const fullArtLabel = document.createElement('label');
  fullArtLabel.textContent = 'Full Art Display Card';
  fullArtLabel.style.fontWeight = '600';
  fullArtLabel.style.color = '#fff';
  fullArtLabel.style.cursor = 'pointer';
  fullArtLabel.addEventListener('click', () => fullArtToggle.click());
  fullArtSection.appendChild(fullArtToggle);
  fullArtSection.appendChild(fullArtLabel);
  body.appendChild(fullArtSection);

  // --- VIEW OPTIONS SECTION ---
  body.appendChild(createSectionDivider('View Options'));

  const { element: headersSection, teardown: headersTeardown } = createHeadersSection(state);
  headersSection.style.marginTop = '0';
  body.appendChild(headersSection);

  // --- FILTERING & BEHAVIOR SECTION ---
  body.appendChild(createSectionDivider('Filtering & Behavior'));

  const { element: filterSection, teardown: filterTeardown } = createFilterSection(state);
  filterSection.style.marginTop = '0';
  body.appendChild(filterSection);

  const { element: artistSection, teardown: artistTeardown } = createArtistSection(state);
  artistSection.style.marginTop = '12px';
  body.appendChild(artistSection);

  // --- UPDATES SECTION ---
  body.appendChild(createSectionDivider('Updates'));
  
  const { element: updatesSection, teardown: updatesTeardown } = createUpdaterSection();
  updatesSection.style.marginTop = '0';
  body.appendChild(updatesSection);

  // Aggregate teardown handlers
  if (typeof libTeardown === 'function') teardownHandlers.push(libTeardown);
  if (typeof headersTeardown === 'function') teardownHandlers.push(headersTeardown);
  if (typeof updatesTeardown === 'function') teardownHandlers.push(updatesTeardown);
  if (typeof filterTeardown === 'function') teardownHandlers.push(filterTeardown);
  if (typeof artistTeardown === 'function') teardownHandlers.push(artistTeardown);
  if (typeof themeTeardown === 'function') teardownHandlers.push(themeTeardown);
  if (typeof dataBackupTeardown === 'function') teardownHandlers.push(dataBackupTeardown);

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
  } catch (err) {
    console.error('[settingsModal] error showing modal', err);
  }
}

export { showSettingsModal };

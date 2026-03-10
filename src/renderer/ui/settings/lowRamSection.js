import { albumArtCache } from '../../utils/albumArtCache.js';
import { buildAtlas } from '../../utils/albumArtAtlas.js';

function createLowRamSection(state) {
  const section = document.createElement('div');

  // --- Toggle Row ---
  const toggleRow = document.createElement('label');
  toggleRow.style.display = 'flex';
  toggleRow.style.alignItems = 'center';
  toggleRow.style.gap = '10px';
  toggleRow.style.color = '#fff';

  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.checked = !!state.lowRamMode;
  checkbox.style.transform = 'scale(1.2)';

  const label = document.createElement('span');
  label.textContent = 'Low RAM Mode (experimental)';
  label.style.fontWeight = '600';
  label.style.fontSize = '15px';
  label.style.color = '#fff';

  toggleRow.appendChild(checkbox);
  toggleRow.appendChild(label);
  section.appendChild(toggleRow);

  // --- Description ---
  const desc = document.createElement('div');
  desc.textContent = 'Converts album art to small WebP thumbnails stored in a single file on disk. Dramatically reduces memory usage for large libraries.';
  desc.style.color = '#aaa';
  desc.style.fontSize = '12px';
  desc.style.marginTop = '6px';
  desc.style.lineHeight = '1.4';
  section.appendChild(desc);

  // --- Warning ---
  const warning = document.createElement('div');
  warning.textContent = '⚠ May take a while to build on first enable. Creates files on disk.';
  warning.style.color = '#e8a838';
  warning.style.fontSize = '12px';
  warning.style.marginTop = '4px';
  section.appendChild(warning);

  // --- Progress area (hidden by default) ---
  const progressArea = document.createElement('div');
  progressArea.style.marginTop = '10px';
  progressArea.style.display = 'none';

  const progressText = document.createElement('div');
  progressText.style.color = '#ccc';
  progressText.style.fontSize = '13px';
  progressText.style.marginBottom = '6px';

  const progressBar = document.createElement('div');
  progressBar.style.width = '100%';
  progressBar.style.height = '6px';
  progressBar.style.background = '#333';
  progressBar.style.borderRadius = '3px';
  progressBar.style.overflow = 'hidden';

  const progressFill = document.createElement('div');
  progressFill.style.height = '100%';
  progressFill.style.width = '0%';
  progressFill.style.background = 'var(--primary-color, #8C40B8)';
  progressFill.style.borderRadius = '3px';
  progressFill.style.transition = 'width 0.2s ease';

  progressBar.appendChild(progressFill);
  progressArea.appendChild(progressText);
  progressArea.appendChild(progressBar);
  section.appendChild(progressArea);

  // --- Stats area ---
  const statsArea = document.createElement('div');
  statsArea.style.marginTop = '8px';
  statsArea.style.color = '#888';
  statsArea.style.fontSize = '12px';
  section.appendChild(statsArea);

  // Show stats if already enabled
  if (state.lowRamMode) {
    updateStats();
  }

  async function updateStats() {
    try {
      const stats = await window.moonshine.atlasGetStats();
      if (stats && stats.entries > 0) {
        statsArea.textContent = `Atlas: ${stats.entries} albums, ${stats.dataSizeMB} MB on disk`;
      } else {
        statsArea.textContent = '';
      }
    } catch {
      statsArea.textContent = '';
    }
  }

  // --- Rebuild button ---
  const rebuildBtn = document.createElement('button');
  rebuildBtn.textContent = 'Rebuild Atlas';
  rebuildBtn.style.marginTop = '8px';
  rebuildBtn.style.background = '#444';
  rebuildBtn.style.border = 'none';
  rebuildBtn.style.color = '#fff';
  rebuildBtn.style.padding = '8px 12px';
  rebuildBtn.style.borderRadius = '6px';
  rebuildBtn.style.cursor = 'pointer';
  rebuildBtn.style.fontSize = '13px';
  rebuildBtn.style.display = state.lowRamMode ? 'inline-block' : 'none';

  rebuildBtn.addEventListener('click', async () => {
    await window.moonshine.atlasDelete();
    await runBuild();
  });
  section.appendChild(rebuildBtn);

  // --- Toggle handler ---
  let building = false;

  checkbox.addEventListener('change', async () => {
    if (building) {
      checkbox.checked = !checkbox.checked;
      return;
    }

    const enabled = checkbox.checked;

    if (enabled) {
      // Enable: build atlas, then switch mode
      await runBuild();
      state.lowRamMode = true;
      albumArtCache.setLowRamMode(true);
      rebuildBtn.style.display = 'inline-block';
    } else {
      // Disable: switch off atlas mode
      state.lowRamMode = false;
      albumArtCache.setLowRamMode(false);
      rebuildBtn.style.display = 'none';
      statsArea.textContent = '';
    }

    window.moonshine.updateConfig({ lowRamMode: state.lowRamMode });
  });

  async function runBuild() {
    if (!state.tracks || !state.tracks.length) {
      progressArea.style.display = 'block';
      progressText.textContent = 'No tracks in library — add music first.';
      return;
    }

    building = true;
    checkbox.disabled = true;
    rebuildBtn.disabled = true;
    progressArea.style.display = 'block';
    progressText.textContent = 'Preparing…';
    progressFill.style.width = '0%';

    try {
      const result = await buildAtlas(state.tracks, (completed, total) => {
        const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
        progressFill.style.width = `${pct}%`;
        progressText.textContent = `Processing album art… ${completed} / ${total}`;
      });

      progressFill.style.width = '100%';
      progressText.textContent = `Done! ${result.added} added, ${result.skipped} already cached, ${result.failed} failed.`;
      await updateStats();
    } catch (err) {
      progressText.textContent = `Error building atlas: ${err.message || err}`;
    } finally {
      building = false;
      checkbox.disabled = false;
      rebuildBtn.disabled = false;
    }
  }

  const teardown = () => { /* no global listeners */ };

  return { element: section, teardown };
}

export { createLowRamSection };

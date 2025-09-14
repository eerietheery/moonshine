// Data backup and restore functionality for preserving user data during uninstall/reinstall
import { showToast } from '../../components/ui/ui.js';

function createDataBackupSection(state) {
  const section = document.createElement('div');
  section.style.marginTop = '18px';

  const title = document.createElement('div');
  title.textContent = 'Data Backup & Restore';
  title.style.fontWeight = '600';
  title.style.marginBottom = '12px';
  title.style.color = '#fff';

  const description = document.createElement('div');
  description.textContent = 'Backup your playlists, favorites, and settings to preserve them during app uninstall/reinstall.';
  description.style.fontSize = '13px';
  description.style.color = '#aaa';
  description.style.marginBottom = '16px';
  description.style.lineHeight = '1.4';

  // Auto-backup toggle
  const autoBackupRow = document.createElement('div');
  autoBackupRow.style.display = 'flex';
  autoBackupRow.style.alignItems = 'center';
  autoBackupRow.style.gap = '12px';
  autoBackupRow.style.marginBottom = '16px';
  autoBackupRow.style.padding = '12px';
  autoBackupRow.style.background = 'rgba(255,255,255,0.03)';
  autoBackupRow.style.borderRadius = '6px';
  autoBackupRow.style.border = '1px solid rgba(255,255,255,0.1)';

  const autoBackupToggle = document.createElement('input');
  autoBackupToggle.type = 'checkbox';
  autoBackupToggle.style.transform = 'scale(1.3)';
  autoBackupToggle.style.marginRight = '8px';

  const autoBackupLabel = document.createElement('div');
  autoBackupLabel.style.flex = '1';
  
  const autoBackupTitle = document.createElement('div');
  autoBackupTitle.textContent = 'Automatic Backup';
  autoBackupTitle.style.fontWeight = '600';
  autoBackupTitle.style.color = '#fff';
  autoBackupTitle.style.marginBottom = '4px';

  const autoBackupDesc = document.createElement('div');
  autoBackupDesc.textContent = 'Automatically save your data to Documents/Moonshine folder';
  autoBackupDesc.style.fontSize = '12px';
  autoBackupDesc.style.color = '#bbb';

  autoBackupLabel.appendChild(autoBackupTitle);
  autoBackupLabel.appendChild(autoBackupDesc);

  // Initialize toggle state
  window.etune.getConfig().then(config => {
    autoBackupToggle.checked = config.autoBackupEnabled !== false;
  });

  autoBackupToggle.addEventListener('change', async () => {
    try {
      if (window.autoBackupService) {
        await window.autoBackupService.setEnabled(autoBackupToggle.checked);
        showToast(
          autoBackupToggle.checked ? 'Automatic backup enabled' : 'Automatic backup disabled',
          'info'
        );
      } else {
        // Fallback if service not available
        await window.etune.updateConfig({ autoBackupEnabled: autoBackupToggle.checked });
      }
    } catch (error) {
      console.error('Failed to toggle auto backup:', error);
      showToast('Failed to update backup settings', 'error');
    }
  });

  autoBackupRow.appendChild(autoBackupToggle);
  autoBackupRow.appendChild(autoBackupLabel);

  // Backup button and functionality
  const backupRow = document.createElement('div');
  backupRow.style.display = 'flex';
  backupRow.style.alignItems = 'center';
  backupRow.style.gap = '12px';
  backupRow.style.marginBottom = '12px';

  const backupBtn = document.createElement('button');
  backupBtn.textContent = 'Export User Data…';
  backupBtn.style.background = 'var(--primary-color, #8C40B8)';
  backupBtn.style.border = 'none';
  backupBtn.style.color = '#fff';
  backupBtn.style.padding = '10px 14px';
  backupBtn.style.borderRadius = '6px';
  backupBtn.style.cursor = 'pointer';
  backupBtn.style.fontSize = '14px';

  const backupInfo = document.createElement('span');
  backupInfo.textContent = 'Save all your data to a file';
  backupInfo.style.fontSize = '13px';
  backupInfo.style.color = '#bbb';

  backupBtn.addEventListener('click', async () => {
    try {
      const userData = await exportUserData();
      const blob = new Blob([JSON.stringify(userData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const timestamp = new Date().toISOString().slice(0, 19).replace(/[:\-T]/g, '');
      const filename = `moonshine-backup-${timestamp}.json`;
      
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 1000);
      
      showToast('User data exported successfully!', 'success');
    } catch (error) {
      console.error('Failed to export user data:', error);
      showToast('Failed to export user data', 'error');
    }
  });

  backupRow.appendChild(backupBtn);
  backupRow.appendChild(backupInfo);

  // Restore button and functionality
  const restoreRow = document.createElement('div');
  restoreRow.style.display = 'flex';
  restoreRow.style.alignItems = 'center';
  restoreRow.style.gap = '12px';

  const restoreBtn = document.createElement('button');
  restoreBtn.textContent = 'Import User Data…';
  restoreBtn.style.background = '#444';
  restoreBtn.style.border = 'none';
  restoreBtn.style.color = '#fff';
  restoreBtn.style.padding = '10px 14px';
  restoreBtn.style.borderRadius = '6px';
  restoreBtn.style.cursor = 'pointer';
  restoreBtn.style.fontSize = '14px';

  const restoreInfo = document.createElement('span');
  restoreInfo.textContent = 'Restore from a backup file';
  restoreInfo.style.fontSize = '13px';
  restoreInfo.style.color = '#bbb';

  // Hidden file input for backup files
  const fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.accept = '.json';
  fileInput.style.display = 'none';

  restoreBtn.addEventListener('click', () => fileInput.click());
  
  fileInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    try {
      const content = await file.text();
      const userData = JSON.parse(content);
      
      // Validate the backup file structure
      if (!isValidBackupFile(userData)) {
        showToast('Invalid backup file format', 'error');
        return;
      }
      
      // Show confirmation dialog
      const confirmed = await showConfirmRestore();
      if (!confirmed) return;
      
      await importUserData(userData, state);
      showToast('User data restored successfully! Please restart the app.', 'success');
      
      fileInput.value = ''; // Clear the input
    } catch (error) {
      console.error('Failed to import user data:', error);
      showToast('Failed to import user data', 'error');
    }
  });

  restoreRow.appendChild(restoreBtn);
  restoreRow.appendChild(restoreInfo);
  restoreRow.appendChild(fileInput);

  section.appendChild(title);
  section.appendChild(description);
  section.appendChild(autoBackupRow);
  section.appendChild(backupRow);
  section.appendChild(restoreRow);

  return { element: section, teardown: null };
}

// Export all user data to a structured format
async function exportUserData() {
  const config = await window.etune.getConfig();
  
  const userData = {
    version: '1.0',
    timestamp: new Date().toISOString(),
    appVersion: await window.etune.getAppVersion() || 'unknown',
    data: {
      // Core settings
      theme: config.theme || { id: 'dark', primaryColor: '#8C40B8' },
      sidebarFilteringEnabled: config.sidebarFilteringEnabled || false,
      sidebarMode: config.sidebarMode || 'artist',
      explicitArtistNames: config.explicitArtistNames || false,
      fullArtCardDisplay: config.fullArtCardDisplay || false,
      gridSortByAlbum: config.gridSortByAlbum || false,
      favoriteViewEnabled: config.favoriteViewEnabled || false,
      
      // User data
      playlists: config.playlists || [],
      favorites: config.favorites || [],
      libraryDirs: config.libraryDirs || [],
      
      // UI preferences
      listHeaders: config.listHeaders || ['title','artist','album','year','genre'],
      columnWidths: config.columnWidths || {},
      
      // Other settings
      rainbowMode: config.rainbowMode || false
    }
  };
  
  return userData;
}

// Import user data and apply to current configuration
async function importUserData(userData, state) {
  if (!userData.data) {
    throw new Error('Invalid backup file: missing data section');
  }
  
  const data = userData.data;
  
  // Build the config object to update
  const configUpdate = {
    theme: data.theme,
    sidebarFilteringEnabled: data.sidebarFilteringEnabled,
    sidebarMode: data.sidebarMode,
    explicitArtistNames: data.explicitArtistNames,
    fullArtCardDisplay: data.fullArtCardDisplay,
    gridSortByAlbum: data.gridSortByAlbum,
    favoriteViewEnabled: data.favoriteViewEnabled,
    playlists: data.playlists,
    favorites: data.favorites,
    libraryDirs: data.libraryDirs,
    listHeaders: data.listHeaders,
    columnWidths: data.columnWidths,
    rainbowMode: data.rainbowMode
  };
  
  // Update the configuration
  await window.etune.updateConfig(configUpdate);
  
  // Update the current state object
  Object.assign(state, {
    favorites: data.favorites || [],
    favoriteViewEnabled: data.favoriteViewEnabled || false,
    listHeaders: data.listHeaders || ['title','artist','album','year','genre'],
    columnWidths: data.columnWidths || {},
    gridSortByAlbum: data.gridSortByAlbum || false,
    explicitArtistNames: data.explicitArtistNames || false,
    sidebarFilteringEnabled: data.sidebarFilteringEnabled || false,
    sidebarMode: data.sidebarMode || 'artist',
    libraryDirs: data.libraryDirs || []
  });
  
  // Trigger playlist reload
  if (typeof window.loadPlaylists === 'function') {
    await window.loadPlaylists();
  } else {
    // Try to load playlists using the module import
    try {
      const { loadPlaylists } = await import('../../components/playlist/playlists.js');
      await loadPlaylists();
    } catch (error) {
      console.warn('Could not reload playlists after import:', error);
    }
  }
  
  // Trigger UI updates
  document.dispatchEvent(new CustomEvent('playlists:changed'));
  document.dispatchEvent(new CustomEvent('library-dirs-updated', { detail: state.libraryDirs.slice() }));
}

// Validate backup file structure
function isValidBackupFile(userData) {
  return userData && 
         typeof userData === 'object' &&
         userData.version &&
         userData.data &&
         typeof userData.data === 'object';
}

// Show confirmation dialog for restore operation
async function showConfirmRestore() {
  return new Promise((resolve) => {
    const modal = document.createElement('div');
    modal.style.position = 'fixed';
    modal.style.inset = '0';
    modal.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
    modal.style.display = 'flex';
    modal.style.alignItems = 'center';
    modal.style.justifyContent = 'center';
    modal.style.zIndex = '1003';

    const dialog = document.createElement('div');
    dialog.style.background = '#1f1f1f';
    dialog.style.border = '1px solid #444';
    dialog.style.borderRadius = '10px';
    dialog.style.padding = '20px';
    dialog.style.maxWidth = '400px';
    dialog.style.boxShadow = '0 10px 30px rgba(0,0,0,0.6)';

    const title = document.createElement('h3');
    title.textContent = 'Restore User Data';
    title.style.color = '#fff';
    title.style.marginTop = '0';
    title.style.marginBottom = '16px';

    const message = document.createElement('p');
    message.textContent = 'This will replace your current playlists, favorites, and settings. Are you sure you want to continue?';
    message.style.color = '#ddd';
    message.style.lineHeight = '1.4';
    message.style.marginBottom = '20px';

    const buttonRow = document.createElement('div');
    buttonRow.style.display = 'flex';
    buttonRow.style.gap = '12px';
    buttonRow.style.justifyContent = 'flex-end';

    const cancelBtn = document.createElement('button');
    cancelBtn.textContent = 'Cancel';
    cancelBtn.style.background = '#444';
    cancelBtn.style.border = 'none';
    cancelBtn.style.color = '#fff';
    cancelBtn.style.padding = '8px 16px';
    cancelBtn.style.borderRadius = '6px';
    cancelBtn.style.cursor = 'pointer';

    const confirmBtn = document.createElement('button');
    confirmBtn.textContent = 'Restore';
    confirmBtn.style.background = 'var(--primary-color, #8C40B8)';
    confirmBtn.style.border = 'none';
    confirmBtn.style.color = '#fff';
    confirmBtn.style.padding = '8px 16px';
    confirmBtn.style.borderRadius = '6px';
    confirmBtn.style.cursor = 'pointer';

    const cleanup = () => {
      modal.remove();
    };

    cancelBtn.addEventListener('click', () => {
      cleanup();
      resolve(false);
    });

    confirmBtn.addEventListener('click', () => {
      cleanup();
      resolve(true);
    });

    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        cleanup();
        resolve(false);
      }
    });

    buttonRow.appendChild(cancelBtn);
    buttonRow.appendChild(confirmBtn);
    dialog.appendChild(title);
    dialog.appendChild(message);
    dialog.appendChild(buttonRow);
    modal.appendChild(dialog);
    document.body.appendChild(modal);
  });
}

export { createDataBackupSection, importUserData as importUserDataFromBackup };
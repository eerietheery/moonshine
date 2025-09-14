// Automatic backup service for preserving user data
import { showToast } from '../components/ui/ui.js';

class AutoBackupService {
  constructor() {
    this.isEnabled = false;
    this.backupInterval = null;
    this.lastBackupTime = 0;
    this.backupCooldown = 5 * 60 * 1000; // 5 minutes minimum between backups
    this.periodicInterval = 30 * 60 * 1000; // 30 minutes for periodic backups
    
    // Initialize based on config
    this.init();
  }

  async init() {
    try {
      const config = await window.etune.getConfig();
      this.isEnabled = config.autoBackupEnabled !== false; // default to true
      
      if (this.isEnabled) {
        this.startAutoBackup();
        
        // Check for existing backup on startup
        await this.checkForExistingBackup();
      }
      
      // Set up event listeners for config changes
      this.setupEventListeners();
    } catch (error) {
      console.error('Failed to initialize auto backup service:', error);
    }
  }

  setupEventListeners() {
    // Listen for data changes that should trigger a backup
    const backupTriggerEvents = [
      'playlists:changed',
      'favorites:changed',
      'library-dirs-updated',
      'theme:changed',
      'config:updated'
    ];

    backupTriggerEvents.forEach(eventType => {
      document.addEventListener(eventType, () => {
        if (this.isEnabled) {
          this.scheduleBackup();
        }
      });
    });

    // Listen for app close/beforeunload
    window.addEventListener('beforeunload', () => {
      if (this.isEnabled) {
        this.performBackupSync();
      }
    });
  }

  async checkForExistingBackup() {
    try {
      // Check both auto backup and uninstaller backup locations
      const autoBackupResult = await window.etune.checkAutoBackup();
      
      if (autoBackupResult.exists && autoBackupResult.data) {
        const backupDate = new Date(autoBackupResult.lastModified);
        const daysSinceBackup = (Date.now() - backupDate.getTime()) / (1000 * 60 * 60 * 24);
        
        if (daysSinceBackup <= 30) {
          this.offerBackupRestore(autoBackupResult.data, backupDate, 'automatic');
          return;
        }
      }
      
      // Check for uninstaller backup in Documents/Moonshine Backup
      const documentsPath = await window.etune.getDocumentsPath();
      const uninstallerBackupPath = documentsPath + '\\Moonshine Backup\\config.json';
      
      try {
        const response = await fetch('file:///' + uninstallerBackupPath.replace(/\\/g, '/'));
        if (response.ok) {
          const configText = await response.text();
          const config = JSON.parse(configText);
          
          // Create backup data structure similar to auto backup
          const backupData = {
            version: '1.0',
            timestamp: new Date().toISOString(),
            source: 'uninstaller-backup',
            data: config
          };
          
          this.offerBackupRestore(backupData, new Date(), 'uninstaller');
        }
      } catch (error) {
        // Uninstaller backup not found or inaccessible - that's fine
        console.log('[AutoBackup] No uninstaller backup found');
      }
    } catch (error) {
      console.error('Failed to check for existing backup:', error);
    }
  }

  async offerBackupRestore(backupData, backupDate, backupType = 'automatic') {
    // Don't offer restore if we already have significant user data
    const config = await window.etune.getConfig();
    const hasData = (config.playlists && config.playlists.length > 0) || 
                   (config.favorites && config.favorites.length > 0) ||
                   (config.libraryDirs && config.libraryDirs.length > 0);
    
    if (hasData) return; // User already has data, don't offer restore

    // Show unobtrusive notification about available backup
    const notification = this.createBackupNotification(backupDate, backupType);
    document.body.appendChild(notification);
  }

  createBackupNotification(backupDate, backupType = 'automatic') {
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: var(--sidebar-bg, #1f1f1f);
      border: 1px solid var(--primary-color, #8C40B8);
      border-radius: 8px;
      padding: 16px;
      max-width: 350px;
      z-index: 1000;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      color: #fff;
    `;

    const title = document.createElement('div');
    title.textContent = backupType === 'uninstaller' ? 'Previous Installation Found' : 'Backup Found';
    title.style.fontWeight = '600';
    title.style.marginBottom = '8px';

    const message = document.createElement('div');
    if (backupType === 'uninstaller') {
      message.textContent = `Found data from previous installation. Would you like to restore your playlists, favorites, and settings?`;
    } else {
      message.textContent = `Found automatic backup from ${backupDate.toLocaleDateString()}. Would you like to restore your data?`;
    }
    message.style.fontSize = '14px';
    message.style.lineHeight = '1.4';
    message.style.marginBottom = '12px';
    message.style.color = '#ddd';

    const buttonRow = document.createElement('div');
    buttonRow.style.display = 'flex';
    buttonRow.style.gap = '8px';
    buttonRow.style.justifyContent = 'flex-end';

    const dismissBtn = document.createElement('button');
    dismissBtn.textContent = 'Later';
    dismissBtn.style.cssText = `
      background: #444;
      border: none;
      color: #fff;
      padding: 6px 12px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 13px;
    `;

    const restoreBtn = document.createElement('button');
    restoreBtn.textContent = 'Restore';
    restoreBtn.style.cssText = `
      background: var(--primary-color, #8C40B8);
      border: none;
      color: #fff;
      padding: 6px 12px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 13px;
    `;

    dismissBtn.addEventListener('click', () => {
      notification.remove();
    });

    restoreBtn.addEventListener('click', async () => {
      notification.remove();
      try {
        const result = await window.etune.checkAutoBackup();
        if (result.exists && result.data) {
          await this.restoreFromAutoBackup(result.data);
        }
      } catch (error) {
        showToast('Failed to restore backup', 'error');
      }
    });

    buttonRow.appendChild(dismissBtn);
    buttonRow.appendChild(restoreBtn);
    notification.appendChild(title);
    notification.appendChild(message);
    notification.appendChild(buttonRow);

    // Auto-dismiss after 10 seconds if no action
    setTimeout(() => {
      if (notification.parentNode) {
        notification.remove();
      }
    }, 10000);

    return notification;
  }

  async restoreFromAutoBackup(backupData) {
    try {
      // Import the backup data (reuse existing import logic)
      if (typeof window.importUserDataFromBackup === 'function') {
        await window.importUserDataFromBackup(backupData);
      } else {
        // Fallback to direct config update
        await window.etune.updateConfig(backupData.data);
      }
      
      showToast('Backup restored successfully!', 'success');
      
      // Refresh the page to apply all changes
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (error) {
      console.error('Failed to restore auto backup:', error);
      showToast('Failed to restore backup', 'error');
    }
  }

  scheduleBackup() {
    // Debounce rapid changes
    if (this.backupTimeout) {
      clearTimeout(this.backupTimeout);
    }
    
    this.backupTimeout = setTimeout(() => {
      this.performBackup();
    }, 2000); // Wait 2 seconds after last change
  }

  async performBackup() {
    if (!this.isEnabled) return;
    
    const now = Date.now();
    if (now - this.lastBackupTime < this.backupCooldown) {
      return; // Skip if too soon since last backup
    }

    try {
      const userData = await this.gatherUserData();
      const result = await window.etune.saveAutoBackup(userData);
      
      if (result.success) {
        this.lastBackupTime = now;
        console.log('[AutoBackup] User data backed up successfully to:', result.path);
      } else {
        console.error('[AutoBackup] Failed to save backup:', result.error);
      }
    } catch (error) {
      console.error('[AutoBackup] Backup failed:', error);
    }
  }

  performBackupSync() {
    // Synchronous version for app close
    if (!this.isEnabled) return;
    
    // For beforeunload, we can't use async operations
    // This is just to set a flag for the main process to handle
    // The main process should save config on app close anyway
    console.log('[AutoBackup] App closing, config should be saved by main process');
  }

  async gatherUserData() {
    const config = await window.etune.getConfig();
    
    return {
      version: '1.0',
      timestamp: new Date().toISOString(),
      appVersion: await window.etune.getAppVersion() || 'unknown',
      source: 'auto-backup',
      data: {
        theme: config.theme || { id: 'dark', primaryColor: '#8C40B8' },
        sidebarFilteringEnabled: config.sidebarFilteringEnabled || false,
        sidebarMode: config.sidebarMode || 'artist',
        explicitArtistNames: config.explicitArtistNames || false,
        fullArtCardDisplay: config.fullArtCardDisplay || false,
        gridSortByAlbum: config.gridSortByAlbum || false,
        favoriteViewEnabled: config.favoriteViewEnabled || false,
        autoBackupEnabled: config.autoBackupEnabled !== false,
        playlists: config.playlists || [],
        favorites: config.favorites || [],
        libraryDirs: config.libraryDirs || [],
        listHeaders: config.listHeaders || ['title','artist','album','year','genre'],
        columnWidths: config.columnWidths || {},
        rainbowMode: config.rainbowMode || false
      }
    };
  }

  startAutoBackup() {
    if (this.backupInterval) {
      clearInterval(this.backupInterval);
    }
    
    // Periodic backup every 30 minutes
    this.backupInterval = setInterval(() => {
      this.performBackup();
    }, this.periodicInterval);
    
    console.log('[AutoBackup] Automatic backup service started');
  }

  stopAutoBackup() {
    if (this.backupInterval) {
      clearInterval(this.backupInterval);
      this.backupInterval = null;
    }
    
    if (this.backupTimeout) {
      clearTimeout(this.backupTimeout);
      this.backupTimeout = null;
    }
    
    console.log('[AutoBackup] Automatic backup service stopped');
  }

  async setEnabled(enabled) {
    this.isEnabled = enabled;
    
    // Update config
    await window.etune.updateConfig({ autoBackupEnabled: enabled });
    
    if (enabled) {
      this.startAutoBackup();
      // Perform immediate backup when enabling
      setTimeout(() => this.performBackup(), 1000);
    } else {
      this.stopAutoBackup();
    }
  }

  getStatus() {
    return {
      enabled: this.isEnabled,
      lastBackupTime: this.lastBackupTime,
      nextBackupIn: this.backupInterval ? 
        Math.max(0, this.periodicInterval - (Date.now() - this.lastBackupTime)) : null
    };
  }
}

// Create singleton instance
const autoBackupService = new AutoBackupService();

// Export for use in other modules
export { autoBackupService };

// Make available globally for easy access
window.autoBackupService = autoBackupService;

export default autoBackupService;
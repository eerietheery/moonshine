// Dashboard Configuration Manager
// Handles saving and loading dashboard visualization settings

const CONFIG_KEY = 'moonshine-dashboard-config';

const DEFAULT_CONFIG = {
  mode: 'circular',
  colorPalette: 'theme',
  smoothingFactor: 0.7,
  showLabels: false, // Disabled by default for grid view
  gridMode: true, // Always in grid mode now
  lastUsed: Date.now()
};

export class DashboardConfig {
  constructor() {
    this.config = this.loadConfig();
  }

  loadConfig() {
    try {
      const stored = localStorage.getItem(CONFIG_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Merge with defaults to handle new properties
        return { ...DEFAULT_CONFIG, ...parsed };
      }
    } catch (error) {
      console.warn('Failed to load dashboard config:', error);
    }
    
    return { ...DEFAULT_CONFIG };
  }

  saveConfig() {
    try {
      this.config.lastUsed = Date.now();
      localStorage.setItem(CONFIG_KEY, JSON.stringify(this.config));
    } catch (error) {
      console.warn('Failed to save dashboard config:', error);
    }
  }

  get(key) {
    return this.config[key];
  }

  set(key, value) {
    if (this.config[key] !== value) {
      this.config[key] = value;
      this.saveConfig();
    }
  }

  getAll() {
    return { ...this.config };
  }

  setAll(newConfig) {
    this.config = { ...this.config, ...newConfig };
    this.saveConfig();
  }

  reset() {
    this.config = { ...DEFAULT_CONFIG };
    this.saveConfig();
  }

  // Apply configuration to UI elements (grid mode - no visualizer selector)
  applyToUI(container) {
    if (!container) return;

    // Set mode
    const modeSelect = container.querySelector('#mode-select');
    if (modeSelect) {
      modeSelect.value = this.config.mode;
    }

    // Set color palette
    const colorSelect = container.querySelector('#color-select');
    if (colorSelect) {
      colorSelect.value = this.config.colorPalette;
    }

    // Set labels toggle
    const labelsToggle = container.querySelector('#labels-toggle');
    if (labelsToggle) {
      labelsToggle.checked = this.config.showLabels;
    }

    // Set smoothing slider
    const smoothingSlider = container.querySelector('#smoothing-slider');
    if (smoothingSlider) {
      smoothingSlider.value = this.config.smoothingFactor;
      // Update label
      const label = smoothingSlider.parentElement.querySelector('label');
      if (label) {
        label.textContent = `Smoothing: ${this.config.smoothingFactor}`;
      }
    }
  }

  // Apply configuration to visualization system (grid mode - all visualizers active)
  applyToVisualizations(visualizations) {
    if (!visualizations) return;

    // Grid mode shows all visualizers simultaneously, so no setVisualizerType
    visualizations.setMode(this.config.mode);
    visualizations.setColorPalette(this.config.colorPalette);
    visualizations.setSmoothingFactor(this.config.smoothingFactor);
    visualizations.setShowLabels(this.config.showLabels);
  }

  // Create event listeners that auto-save changes (grid mode - no visualizer selector)
  setupAutoSave(container, visualizations) {
    if (!container) return;

    // Mode
    const modeSelect = container.querySelector('#mode-select');
    if (modeSelect) {
      modeSelect.addEventListener('change', (e) => {
        this.set('mode', e.target.value);
        if (visualizations) {
          visualizations.setMode(e.target.value);
        }
      });
    }

    // Color palette
    const colorSelect = container.querySelector('#color-select');
    if (colorSelect) {
      colorSelect.addEventListener('change', (e) => {
        this.set('colorPalette', e.target.value);
        if (visualizations) {
          visualizations.setColorPalette(e.target.value);
        }
      });
    }

    // Labels toggle
    const labelsToggle = container.querySelector('#labels-toggle');
    if (labelsToggle) {
      labelsToggle.addEventListener('change', (e) => {
        this.set('showLabels', e.target.checked);
        if (visualizations) {
          visualizations.setShowLabels(e.target.checked);
        }
      });
    }

    // Smoothing slider
    const smoothingSlider = container.querySelector('#smoothing-slider');
    if (smoothingSlider) {
      smoothingSlider.addEventListener('input', (e) => {
        const value = parseFloat(e.target.value);
        this.set('smoothingFactor', value);
        if (visualizations) {
          visualizations.setSmoothingFactor(value);
        }
      });
    }
  }

  // Export configuration for backup
  export() {
    return JSON.stringify(this.config, null, 2);
  }

  // Import configuration from backup
  import(configString) {
    try {
      const imported = JSON.parse(configString);
      // Validate imported config has required fields
      if (typeof imported === 'object' && imported !== null) {
        this.config = { ...DEFAULT_CONFIG, ...imported };
        this.saveConfig();
        return true;
      }
    } catch (error) {
      console.error('Failed to import dashboard config:', error);
    }
    return false;
  }

  // Get statistics about usage
  getStats() {
    return {
      lastUsed: new Date(this.config.lastUsed).toLocaleString(),
      gridMode: this.config.gridMode,
      mode: this.config.mode,
      colorPalette: this.config.colorPalette,
      configExists: localStorage.getItem(CONFIG_KEY) !== null
    };
  }
}
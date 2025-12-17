// Dashboard Core - main dashboard controller
// Manages the lifecycle of the secret audio visualization dashboard

import { createDashboardUI } from './dashboardUI.js';
import { DashboardVisualizations } from './dashboardVisualizations.js';
import { DashboardConfig } from './dashboardConfig.js';

let dashboardInstance = null;

class SecretDashboard {
  constructor() {
    this.isVisible = false;
    this.container = null;
    this.visualizations = null;
    this.audioCtx = null;
    this.analyser = null;
    this.config = new DashboardConfig();
  }

  async show() {
    if (this.isVisible) return;
    
    // Create UI if not exists
    if (!this.container) {
      this.container = createDashboardUI();
      this.setupEventListeners();
      
      // Apply saved configuration to UI
      this.config.applyToUI(this.container);
    }
    
    // Setup audio connection
    this.connectAudio();
    
    // Initialize visualizations
    if (!this.visualizations) {
      this.visualizations = new DashboardVisualizations(this.audioCtx, this.analyser);
      
      // Apply saved configuration to visualizations
      this.config.applyToVisualizations(this.visualizations);
    }
    
    // Show dashboard with animation
    this.isVisible = true;
    this.container.style.display = 'block';
    
    // Animate in
    this.container.style.opacity = '0';
    this.container.style.transform = 'scale(0.9)';
    this.container.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
    
    // Wait for layout to complete before sizing canvases and starting visualizations
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        this.container.style.opacity = '1';
        this.container.style.transform = 'scale(1)';
        
        // Start visualizations after layout is complete
        this.visualizations.start();
      });
    });
  }

  hide() {
    if (!this.isVisible) return;
    
    this.container.style.opacity = '0';
    this.container.style.transform = 'scale(0.9)';
    
    setTimeout(() => {
      this.isVisible = false;
      this.container.style.display = 'none';
      if (this.visualizations) {
        this.visualizations.stop();
      }
    }, 300);
  }

  connectAudio() {
    // Use existing audio context from oscilloscope
    if (window.audioCtx && window.analyser) {
      this.audioCtx = window.audioCtx;
      this.analyser = window.analyser;
      
      // Temporarily increase resolution for dashboard
      const originalFFTSize = this.analyser.fftSize;
      this.analyser.fftSize = 2048;
      
      // Store original size to restore later
      this._originalFFTSize = originalFFTSize;
    } else {
      console.warn('No audio context available for dashboard');
    }
  }

  setupEventListeners() {
    // Close button
    const closeBtn = this.container.querySelector('.dashboard-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => this.hide());
    }

    // Setup auto-save configuration listeners (no visualizer selector in grid mode)
    this.config.setupAutoSave(this.container, this.visualizations);

    // Escape key
    const escapeHandler = (e) => {
      if (e.key === 'Escape' && this.isVisible) {
        this.hide();
      }
    };
    document.addEventListener('keydown', escapeHandler);
    
    // Store handler for cleanup
    this._escapeHandler = escapeHandler;
  }

  // Public methods for external configuration
  getConfig() {
    return this.config.getAll();
  }

  setConfig(newConfig) {
    this.config.setAll(newConfig);
    if (this.container) {
      this.config.applyToUI(this.container);
    }
    if (this.visualizations) {
      this.config.applyToVisualizations(this.visualizations);
    }
  }

  resetConfig() {
    this.config.reset();
    if (this.container) {
      this.config.applyToUI(this.container);
    }
    if (this.visualizations) {
      this.config.applyToVisualizations(this.visualizations);
    }
  }

  getStats() {
    return this.config.getStats();
  }

  destroy() {
    if (this.visualizations) {
      this.visualizations.stop();
      this.visualizations = null;
    }
    
    if (this.container) {
      this.container.remove();
      this.container = null;
    }
    
    if (this._escapeHandler) {
      document.removeEventListener('keydown', this._escapeHandler);
    }
    
    // Restore original FFT size
    if (this.analyser && this._originalFFTSize) {
      this.analyser.fftSize = this._originalFFTSize;
    }
    
    this.isVisible = false;
  }
}

export function showDashboard() {
  if (!dashboardInstance) {
    dashboardInstance = new SecretDashboard();
  }
  dashboardInstance.show();
}

export function hideDashboard() {
  if (dashboardInstance) {
    dashboardInstance.hide();
  }
}

export function destroyDashboard() {
  if (dashboardInstance) {
    dashboardInstance.destroy();
    dashboardInstance = null;
  }
}

// Configuration management exports
export function getDashboardConfig() {
  if (!dashboardInstance) {
    dashboardInstance = new SecretDashboard();
  }
  return dashboardInstance.getConfig();
}

export function setDashboardConfig(config) {
  if (!dashboardInstance) {
    dashboardInstance = new SecretDashboard();
  }
  return dashboardInstance.setConfig(config);
}

export function resetDashboardConfig() {
  if (!dashboardInstance) {
    dashboardInstance = new SecretDashboard();
  }
  return dashboardInstance.resetConfig();
}

export function getDashboardStats() {
  if (!dashboardInstance) {
    dashboardInstance = new SecretDashboard();
  }
  return dashboardInstance.getStats();
}
const fs = require('fs');
const path = require('path');
const { app } = require('electron');

let cachedConfig = null;

function getConfigPath() {
  const dir = app.getPath('userData');
  return path.join(dir, 'config.json');
}

function readConfigFile(file) {
  try {
    if (fs.existsSync(file)) {
      const raw = fs.readFileSync(file, 'utf8');
      return JSON.parse(raw);
    }
  } catch {}
  return null;
}

function defaultConfig() {
  return {
    libraryDirs: [],
    sidebarFilteringEnabled: false,
    sidebarMode: 'artist',
  theme: { id: 'dark', primaryColor: '#8C40B8' },
  playlists: [],
  };
}

function loadConfig() {
  const file = getConfigPath();
  const read = readConfigFile(file);
  cachedConfig = { ...defaultConfig(), ...(read || {}) };
  // Ensure keys exist
  if (!Array.isArray(cachedConfig.libraryDirs)) cachedConfig.libraryDirs = [];
  if (!cachedConfig.theme) cachedConfig.theme = { id: 'dark', primaryColor: '#8C40B8' };
  if (!cachedConfig.theme.primaryColor) cachedConfig.theme.primaryColor = '#8C40B8';
  if (!cachedConfig.theme.id) cachedConfig.theme.id = 'dark';
  try {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, JSON.stringify(cachedConfig, null, 2), 'utf8');
  } catch {}
  return cachedConfig;
}

function saveConfig(cfg) {
  const file = getConfigPath();
  try {
    fs.writeFileSync(file, JSON.stringify(cfg, null, 2), 'utf8');
  } catch {}
}

function getConfig() {
  if (!cachedConfig) return loadConfig();
  return cachedConfig;
}

function updateConfig(partial) {
  const current = getConfig();
  const next = { ...current, ...(partial || {}) };
  // Deep-merge theme to avoid wiping id or primaryColor on partial updates
  if (partial && typeof partial.theme === 'object' && partial.theme !== null) {
    next.theme = { ...(current.theme || {}), ...partial.theme };
  }
  // Normalize arrays
  if (partial && 'libraryDirs' in partial && !Array.isArray(next.libraryDirs)) {
    next.libraryDirs = [];
  }
  cachedConfig = next;
  saveConfig(next);
  return next;
}

module.exports = { getConfigPath, loadConfig, saveConfig, getConfig, updateConfig };

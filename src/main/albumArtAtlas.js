/**
 * Album Art Atlas — Main Process
 *
 * Manages a disk-backed atlas consisting of:
 *   atlas-index.json  — { version, entries: { [albumKey]: { offset, size } } }
 *   atlas-data.bin    — concatenated WebP thumbnail blobs
 *
 * Provides IPC-friendly helpers to build, read slices, and query the atlas.
 */

const fs = require('fs');
const path = require('path');
const { app } = require('electron');

function getAtlasDir() {
  return path.join(app.getPath('userData'), 'album-art-atlas');
}

function getIndexPath() {
  return path.join(getAtlasDir(), 'atlas-index.json');
}

function getDataPath() {
  return path.join(getAtlasDir(), 'atlas-data.bin');
}

/** Ensure the atlas directory exists. */
function ensureDir() {
  const dir = getAtlasDir();
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

/** Load the index from disk (or return empty). */
function loadIndex() {
  try {
    const raw = fs.readFileSync(getIndexPath(), 'utf8');
    return JSON.parse(raw);
  } catch {
    return { version: 1, entries: {} };
  }
}

/** Persist the index to disk. */
function saveIndex(index) {
  ensureDir();
  fs.writeFileSync(getIndexPath(), JSON.stringify(index), 'utf8');
}

/**
 * Append a WebP buffer to the atlas data file and record it in the index.
 * @param {string} albumKey
 * @param {Buffer} webpBuffer
 * @returns {{ offset: number, size: number }}
 */
function appendEntry(albumKey, webpBuffer, index) {
  ensureDir();
  const dataPath = getDataPath();

  let offset = 0;
  try {
    const stat = fs.statSync(dataPath);
    offset = stat.size;
  } catch { /* file doesn't exist yet, offset = 0 */ }

  fs.appendFileSync(dataPath, webpBuffer);

  const entry = { offset, size: webpBuffer.length };
  index.entries[albumKey] = entry;
  return entry;
}

/**
 * Read a single WebP thumbnail from the atlas by album key.
 * Returns a base64 data URL or null.
 */
function readEntry(albumKey) {
  const index = loadIndex();
  const entry = index.entries[albumKey];
  if (!entry) return null;

  const dataPath = getDataPath();
  try {
    const fd = fs.openSync(dataPath, 'r');
    const buf = Buffer.alloc(entry.size);
    fs.readSync(fd, buf, 0, entry.size, entry.offset);
    fs.closeSync(fd);
    return `data:image/webp;base64,${buf.toString('base64')}`;
  } catch {
    return null;
  }
}

/**
 * Check whether an album key already exists in the atlas.
 */
function hasEntry(albumKey) {
  const index = loadIndex();
  return !!index.entries[albumKey];
}

/**
 * Get all album keys that are already in the atlas.
 */
function getAtlasKeys() {
  const index = loadIndex();
  return Object.keys(index.entries);
}

/**
 * Delete the atlas files entirely (for rebuild or disable).
 */
function deleteAtlas() {
  try { fs.unlinkSync(getDataPath()); } catch { /* ok */ }
  try { fs.unlinkSync(getIndexPath()); } catch { /* ok */ }
}

/**
 * Get atlas stats (file sizes, entry count).
 */
function getAtlasStats() {
  const index = loadIndex();
  let dataSize = 0;
  try { dataSize = fs.statSync(getDataPath()).size; } catch { /* 0 */ }
  return {
    entries: Object.keys(index.entries).length,
    dataSizeBytes: dataSize,
    dataSizeMB: (dataSize / (1024 * 1024)).toFixed(2),
  };
}

module.exports = {
  loadIndex,
  saveIndex,
  appendEntry,
  readEntry,
  hasEntry,
  getAtlasKeys,
  deleteAtlas,
  getAtlasStats,
};

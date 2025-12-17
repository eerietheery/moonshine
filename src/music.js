const fs = require('fs');
const path = require('path');
const mm = require('music-metadata');

// Note: IndexedDB cache is handled in renderer process, not main process
// This file runs in Node.js (main process), so caching is deferred to renderer

const AUDIO_EXTS = new Set(['.mp3', '.m4a', '.flac', '.wav', '.ogg', '.aac']);
const CONCURRENCY = 8;

function walkDir(dir, results = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      // Skip hidden/system folders
      if (!entry.name.startsWith('.') && entry.name.toLowerCase() !== 'system volume information') {
        walkDir(full, results);
      }
    } else {
      const ext = path.extname(entry.name).toLowerCase();
      if (AUDIO_EXTS.has(ext)) results.push(full);
    }
  }
  return results;
}

function bufferToDataUrl(buf, mime = 'image/jpeg') {
  try {
    const b64 = Buffer.from(buf).toString('base64');
    return `data:${mime};base64,${b64}`;
  } catch {
    return null;
  }
}

// Generate album key for deduplication
function generateAlbumKey(tags) {
  const album = (tags.album || 'Unknown').toLowerCase().trim();
  const artist = (tags.artist || tags.albumartist || 'Unknown').toLowerCase().trim();
  return `${album}::${artist}`;
}

async function readMeta(filePath) {
  try {
    // Avoid reading embedded cover art during the main scan to keep memory/IPC small.
    // Cover art is fetched on-demand via getAlbumArtForFile().
    const meta = await mm.parseFile(filePath, { duration: false, skipCovers: true });
    const { common, format } = meta;
    
    const tags = {
      artist: common.artist || common.albumartist || 'Unknown',
      album: common.album || 'Unknown',
      title: common.title || path.basename(filePath),
      track: (common.track && common.track.no) || null,
      year: common.year || null,
      genre: (common.genre && common.genre[0]) || null,
    };

    const albumKey = generateAlbumKey(tags);
    
    return {
      file: path.basename(filePath),
      filePath,
      tags,
      albumArtDataUrl: null,
      bitrate: format && format.bitrate ? format.bitrate : null,
      error: null,
      // Add album key for later optimization
      _albumKey: albumKey,
    };
  } catch (e) {
    return { file: path.basename(filePath), filePath, tags: {}, albumArtDataUrl: null, bitrate: null, error: e.message };
  }
}

async function mapWithConcurrency(items, limit, mapper) {
  const results = new Array(items.length);
  let nextIndex = 0;
  const workers = new Array(Math.min(limit, items.length)).fill(0).map(async () => {
    while (true) {
      const i = nextIndex++;
      if (i >= items.length) break;
      results[i] = await mapper(items[i], i);
    }
  });
  await Promise.all(workers);
  return results;
}

async function scanMusic(dirPath) {
  try {
    const files = walkDir(dirPath);
    console.log(`🎵 Scanning ${files.length} music files...`);
    
    const metas = await mapWithConcurrency(files, CONCURRENCY, readMeta);

    return metas;
  } catch (e) {
    return [{ file: '', filePath: dirPath, tags: {}, albumArtDataUrl: null, error: e.message }];
  }
}

// Scan metadata for a specific set of file paths (for incremental updates)
async function scanFiles(filePaths) {
  try {
    if (!Array.isArray(filePaths) || filePaths.length === 0) return [];
    const metas = await mapWithConcurrency(filePaths, CONCURRENCY, readMeta);
    return metas;
  } catch (e) {
    return [];
  }
}

// Return album art data URL for a single file (on-demand)
async function getAlbumArtForFile(filePath) {
  try {
    const meta = await mm.parseFile(filePath, { duration: false });
    const { common } = meta;
    if (common && common.picture && common.picture.length) {
      const pic = common.picture[0];
      const mime = pic.format || 'image/jpeg';
      return bufferToDataUrl(pic.data, mime);
    }
    return null;
  } catch (e) {
    return null;
  }
}

module.exports = { scanMusic, scanFiles, getAlbumArtForFile };

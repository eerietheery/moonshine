const fs = require('fs');
const path = require('path');
const mm = require('music-metadata');

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

async function readMeta(filePath) {
  try {
    const { common } = await mm.parseFile(filePath, { duration: false });
    let albumArtDataUrl = null;
    if (common.picture && common.picture.length) {
      const pic = common.picture[0];
      const mime = pic.format || 'image/jpeg';
      albumArtDataUrl = bufferToDataUrl(pic.data, mime);
    }
    return {
      file: path.basename(filePath),
      filePath,
      tags: {
        artist: common.artist || common.albumartist || 'Unknown',
        album: common.album || 'Unknown',
        title: common.title || path.basename(filePath),
        track: (common.track && common.track.no) || null,
        year: common.year || null,
        genre: (common.genre && common.genre[0]) || null,
      },
      albumArtDataUrl,
      error: null,
    };
  } catch (e) {
    return { file: path.basename(filePath), filePath, tags: {}, albumArtDataUrl: null, error: e.message };
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
    const metas = await mapWithConcurrency(files, CONCURRENCY, readMeta);
    return metas;
  } catch (e) {
    return [{ file: '', filePath: dirPath, tags: {}, albumArtDataUrl: null, error: e.message }];
  }
}

module.exports = { scanMusic };

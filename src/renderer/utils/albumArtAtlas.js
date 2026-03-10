/**
 * Album Art Atlas — Renderer Side
 *
 * Orchestrates building the WebP thumbnail atlas:
 *   1. Collects unique album keys from current library tracks.
 *   2. For each, extracts art via IPC, resizes to 128×128 with Canvas, converts to WebP.
 *   3. Sends the WebP data to main process which appends to the atlas files.
 *
 * Also provides an LRU blob-URL cache so only visible thumbnails live in RAM.
 */

import { albumArtCache } from './albumArtCache.js';

const THUMB_SIZE = 128;
const MAX_VISIBLE_BLOBS = 60;

/** Simple LRU cache of album-key → blobURL for low-RAM mode. */
class LRUBlobCache {
  constructor(maxSize) {
    this.maxSize = maxSize;
    this.map = new Map(); // insertion-order preserved
  }

  get(key) {
    const val = this.map.get(key);
    if (val === undefined) return undefined;
    // Move to end (most recently used)
    this.map.delete(key);
    this.map.set(key, val);
    return val;
  }

  set(key, val) {
    if (this.map.has(key)) {
      this.map.delete(key);
    } else if (this.map.size >= this.maxSize) {
      // Evict oldest
      const oldest = this.map.keys().next().value;
      const oldBlob = this.map.get(oldest);
      this.map.delete(oldest);
      try { URL.revokeObjectURL(oldBlob); } catch { /* ok */ }
    }
    this.map.set(key, val);
  }

  has(key) { return this.map.has(key); }

  clear() {
    for (const url of this.map.values()) {
      try { URL.revokeObjectURL(url); } catch { /* ok */ }
    }
    this.map.clear();
  }

  get size() { return this.map.size; }
}

export const atlasLRU = new LRUBlobCache(MAX_VISIBLE_BLOBS);

/** In-flight fetch dedup for atlas reads. */
const inFlightAtlasReads = new Map();

/**
 * Get a thumbnail blob URL from the atlas (via LRU cache).
 * Returns blob URL or null if not in atlas.
 */
export async function getAtlasThumbnail(albumKey) {
  if (!albumKey) return null;

  const cached = atlasLRU.get(albumKey);
  if (cached) return cached;

  // Dedup concurrent IPC reads for the same key
  const existing = inFlightAtlasReads.get(albumKey);
  if (existing) return existing;

  const promise = (async () => {
    try {
      const dataUrl = await window.moonshine.atlasReadEntry(albumKey);
      if (!dataUrl) return null;
      const blobUrl = dataUrlToBlob(dataUrl);
      if (blobUrl) atlasLRU.set(albumKey, blobUrl);
      return blobUrl;
    } catch {
      return null;
    } finally {
      inFlightAtlasReads.delete(albumKey);
    }
  })();

  inFlightAtlasReads.set(albumKey, promise);
  return promise;
}

/**
 * Build (or rebuild) the atlas for all unique albums in the given track list.
 * @param {Array} tracks — full library track list
 * @param {function} onProgress — (completed, total) callback
 * @returns {{ added: number, skipped: number, failed: number }}
 */
export async function buildAtlas(tracks, onProgress) {
  // 1. Collect unique album keys → pick a representative track for each
  const albumMap = new Map(); // albumKey → track (first encountered)
  for (const track of tracks) {
    const key = albumArtCache.generateAlbumKey(track);
    if (!albumMap.has(key)) albumMap.set(key, track);
  }

  // 2. Find which keys already exist in atlas so we can skip them
  let existingKeys = new Set();
  try {
    const keys = await window.moonshine.atlasGetKeys();
    existingKeys = new Set(keys);
  } catch { /* fresh atlas */ }

  const toProcess = [...albumMap.entries()].filter(([key]) => !existingKeys.has(key));
  const total = toProcess.length;
  let completed = 0;
  let added = 0;
  let skipped = albumMap.size - total;
  let failed = 0;

  if (onProgress) onProgress(0, total);

  // 3. Process in small batches to avoid locking the UI
  const BATCH = 4;
  for (let i = 0; i < toProcess.length; i += BATCH) {
    const batch = toProcess.slice(i, i + BATCH);
    await Promise.all(batch.map(async ([albumKey, track]) => {
      try {
        const webpBase64 = await extractAndResizeToWebP(track);
        if (webpBase64) {
          await window.moonshine.atlasAppendEntry(albumKey, webpBase64);
          added++;
        } else {
          failed++;
        }
      } catch {
        failed++;
      }
      completed++;
      if (onProgress) onProgress(completed, total);
    }));
  }

  return { added, skipped, failed };
}

/**
 * Extract album art for a track, resize to 128×128, and return as base64 WebP (no header).
 * Returns null if no art available.
 */
async function extractAndResizeToWebP(track) {
  // Get full-size art from main process
  const dataUrl = await window.moonshine.getAlbumArt(track.filePath);
  if (!dataUrl) return null;

  // Load into an Image element
  const img = await loadImage(dataUrl);

  // Draw resized into an offscreen canvas
  const canvas = document.createElement('canvas');
  canvas.width = THUMB_SIZE;
  canvas.height = THUMB_SIZE;
  const ctx = canvas.getContext('2d');

  // Cover-crop: scale to fill, center
  const scale = Math.max(THUMB_SIZE / img.naturalWidth, THUMB_SIZE / img.naturalHeight);
  const sw = THUMB_SIZE / scale;
  const sh = THUMB_SIZE / scale;
  const sx = (img.naturalWidth - sw) / 2;
  const sy = (img.naturalHeight - sh) / 2;
  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, THUMB_SIZE, THUMB_SIZE);

  // Convert to WebP
  const webpDataUrl = canvas.toDataURL('image/webp', 0.75);
  // Strip the data:image/webp;base64, prefix — send raw base64 to main
  const commaIdx = webpDataUrl.indexOf(',');
  return commaIdx >= 0 ? webpDataUrl.substring(commaIdx + 1) : null;
}

/** Load an image element from a data URL. */
function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

/** Convert a base64 data URL to a blob URL. */
function dataUrlToBlob(dataUrl) {
  try {
    const [header, data] = dataUrl.split(',');
    const mimeMatch = header.match(/data:([^;]+)/);
    const mime = mimeMatch ? mimeMatch[1] : 'image/webp';
    const bin = atob(data);
    const arr = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
    return URL.createObjectURL(new Blob([arr], { type: mime }));
  } catch {
    return null;
  }
}

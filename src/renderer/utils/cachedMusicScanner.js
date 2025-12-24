/**
 * Cached Music Scanner - Renderer Process Wrapper
 * Integrates IndexedDB caching with IPC-based music scanning
 * 
 * This module runs in the renderer process and coordinates:
 * 1. Loading cached tracks from IndexedDB
 * 2. Requesting scans from main process via IPC
 * 3. Caching newly scanned tracks
 * 4. Incremental scanning for changed files
 * 
 * @module cachedMusicScanner
 */

import { cache } from './indexedDBCache.js';

/**
 * Scan music directory with IndexedDB caching
 * 
 * Flow:
 * 1. Check if cache exists
 * 2. If yes: Load cached tracks, then do incremental scan
 * 3. If no: Do full scan and cache results
 * 
 * @param {string} dirPath - Directory to scan
 * @param {Object} options - Scan options
 * @param {boolean} options.forceFull - Force full rescan even if cache exists
 * @param {Function} options.onProgress - Progress callback (current, total, message)
 * @returns {Promise<Array>} Array of track objects
 */
export async function scanMusicCached(dirPath, options = {}) {
  const { forceFull = false, onProgress = () => {} } = options;
  
  try {
    // Initialize cache
    if (!cache.isAvailable()) {
      console.log('📦 IndexedDB not available, falling back to direct scan');
      return await scanMusicDirect(dirPath, onProgress);
    }
    
    await cache.open();

    const libraryKey = cache.getLibraryKey(dirPath);
    
    // Check if we have cached data for this directory
    let cachedCount = await cache.count(libraryKey);
    console.log(`📦 Cache check: Found ${cachedCount} cached tracks for this library`);

    // Detector: toggle high-performance ingestor when library is very large
    try {
      const threshold = 10000;
      const enableNative = cachedCount >= threshold;
      // Sync to renderer state and persist in config for main-process awareness
      if (typeof window.state !== 'undefined') {
        window.state.useHighPerformanceIngestor = enableNative;
      }
      if (window.etune && typeof window.etune.updateConfig === 'function') {
        window.etune.updateConfig({ useHighPerformanceIngestor: enableNative, lastLibraryCount: cachedCount });
      }
    } catch (_) {}

    // Legacy support: pre-v2 entries had no libraryKey. Tag entries that match this dir.
    if (cachedCount === 0 && !forceFull) {
      const totalAny = await cache.count();
      if (totalAny > 0) {
        try {
          const res = await cache.tagLibraryByDirPrefix(dirPath);
          if (res?.updated) {
            cachedCount = await cache.count(libraryKey);
            console.log(`📦 Tagged ${res.updated} legacy cached tracks for this library`);
          }
        } catch (e) {
          // Ignore migration errors; we'll fall back to a full scan.
        }
      }
    }
    
    if (cachedCount > 0 && !forceFull) {
      console.log('✅ Cache hit! Loading tracks from IndexedDB...');
      console.log('📦 Skipping filesystem scan - using cached data');
      onProgress(0, 100, 'Loading from cache...');
      
      // Load cached tracks
      const cachedTracks = await cache.getAllTracks(libraryKey);
      onProgress(50, 100, `Loaded ${cachedTracks.length} cached tracks`);
      
      // Start incremental scan in background
      setTimeout(async () => {
        await incrementalScan(dirPath, cachedTracks, onProgress);
      }, 100);
      
      onProgress(100, 100, 'Cache loaded');
      console.log(`✅ Returned ${cachedTracks.length} tracks from cache in <100ms`);
      return cachedTracks;
    } else {
      console.log('📦 No cache or force full scan, scanning library...');
      console.log(`📦 Reason: ${cachedCount === 0 ? 'Empty cache' : 'Forced full scan'}`);
      return await fullScanAndCache(dirPath, onProgress);
    }
  } catch (error) {
    console.error('❌ Cache error, falling back to direct scan:', error);
    return await scanMusicDirect(dirPath, onProgress);
  }
}

/**
 * Full scan with caching
 * @private
 */
async function fullScanAndCache(dirPath, onProgress) {
  onProgress(0, 100, 'Scanning library...');

  const libraryKey = cache.getLibraryKey(dirPath);
  
  // Request full scan from main process
  let tracks;
  try {
    const useHP = !!(window.state && window.state.useHighPerformanceIngestor);
    if (useHP && window.etune && typeof window.etune.scanMusicHP === 'function') {
      // HP path: stream batches, accumulate locally, then cache
      const acc = [];
      const off = [];
      try {
        // subscribe to progress
        const onProg = (payload) => {
          try {
            const completed = payload?.completed || 0;
            const total = payload?.total || 0;
            const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
            onProgress(percent, 100, 'Scanning (HP)…');
          } catch (_) {}
        };
        window.etune.on && window.etune.on('scan-progress', onProg);
        off.push(() => window.etune.on('scan-progress', () => {}));
      } catch (_) {}
      try {
        const onBatch = (metas) => {
          if (Array.isArray(metas) && metas.length) acc.push(...metas);
        };
        window.etune.on && window.etune.on('scan-batch', onBatch);
        off.push(() => window.etune.on('scan-batch', () => {}));
      } catch (_) {}
      try {
        await window.etune.scanMusicHP(dirPath);
      } finally {
        // cleanup listeners
        for (const f of off) { try { f(); } catch (_) {} }
      }
      tracks = acc;
    } else {
      tracks = await (window.etune.scanMusicLite ? window.etune.scanMusicLite(dirPath) : window.etune.scanMusic(dirPath));
    }
  } catch (_) {
    tracks = await (window.etune.scanMusicLite ? window.etune.scanMusicLite(dirPath) : window.etune.scanMusic(dirPath));
  }
  
  if (!tracks || tracks.length === 0) {
    onProgress(100, 100, 'No tracks found');
    return [];
  }
  
  onProgress(80, 100, `Found ${tracks.length} tracks, caching...`);
  
  // Add file stats (mtime, size) for cache invalidation
  const tracksWithStats = await addFileStats(tracks);
  
  // Cache all tracks
  try {
    await cache.setMany(tracksWithStats, libraryKey);
    console.log(`✅ Cached ${tracksWithStats.length} tracks`);
    // Update global stats with accurate count for detector
    try {
      const total = await cache.count(libraryKey);
      await cache.updateStats({ totalTracks: total, lastLibraryKey: libraryKey });
      const threshold = 10000;
      const enableNative = total >= threshold;
      if (typeof window.state !== 'undefined') {
        window.state.useHighPerformanceIngestor = enableNative;
      }
      if (window.etune && typeof window.etune.updateConfig === 'function') {
        window.etune.updateConfig({ useHighPerformanceIngestor: enableNative, lastLibraryCount: total });
      }
    } catch (e) {
      console.warn('Detector stats update failed:', e);
    }
  } catch (err) {
    console.warn('Failed to cache tracks:', err);
  }
  
  onProgress(100, 100, 'Scan complete');
  return tracks;
}

/**
 * Incremental scan - only check for new/modified/deleted files
 * @private
 */
async function incrementalScan(dirPath, cachedTracks, onProgress) {
  console.log('📦 Starting incremental scan...');
  onProgress(0, 100, 'Checking for changes...');
  
  try {
    // Get all file paths from filesystem
    const fileSystemPaths = await getFileSystemPaths(dirPath);

    // If filesystem enumeration is not available, we cannot safely detect deletions.
    // Avoid wiping the cache on startup.
    if (!Array.isArray(fileSystemPaths) || fileSystemPaths.length === 0) {
      console.warn('📦 Incremental scan skipped: filesystem paths unavailable');
      onProgress(100, 100, 'Incremental scan skipped');
      return;
    }
    
    // Build lookup maps
    const cachedMap = new Map(cachedTracks.map(t => [t.filePath, t]));
    const fileSystemSet = new Set(fileSystemPaths);
    
    // Find differences
    const newFiles = [];
    const modifiedFiles = [];
    const deletedPaths = [];
    
    // Check each filesystem file
    const candidatesForStat = [];
    for (const filePath of fileSystemPaths) {
      const cached = cachedMap.get(filePath);
      if (!cached) newFiles.push(filePath);
      else candidatesForStat.push(filePath);
    }

    // Batch stat only the files that exist in cache (fast and avoids thousands of IPC roundtrips)
    const statMap = await getFileStatsMap(candidatesForStat);
    for (const filePath of candidatesForStat) {
      const cached = cachedMap.get(filePath);
      const stats = statMap.get(filePath);
      if (stats && stats.mtime > (cached.mtime || 0)) {
        modifiedFiles.push(filePath);
      }
    }
    
    // Find deleted files
    for (const cachedPath of cachedMap.keys()) {
      if (!fileSystemSet.has(cachedPath)) {
        deletedPaths.push(cachedPath);
      }
    }
    
    console.log(`📦 Found: ${newFiles.length} new, ${modifiedFiles.length} modified, ${deletedPaths.length} deleted`);
    
    // Process changes
    let hasChanges = false;
    
    // Remove deleted files from cache
    if (deletedPaths.length > 0) {
      await cache.deleteMany(deletedPaths);
      hasChanges = true;
    }
    
    // Rescan new and modified files
    const filesToRescan = [...newFiles, ...modifiedFiles];
    if (filesToRescan.length > 0) {
      onProgress(30, 100, `Scanning ${filesToRescan.length} changed files...`);
      
      // Request scan for specific files from main process
      const newTracks = await scanSpecificFiles(filesToRescan);
      
      if (newTracks && newTracks.length > 0) {
        // Add file stats
        const tracksWithStats = await addFileStats(newTracks);
        
        // Update cache
        await cache.setMany(tracksWithStats);
        hasChanges = true;
      }
    }
    
    if (hasChanges) {
      onProgress(100, 100, 'Library updated');
      // Trigger library refresh event
      window.dispatchEvent(new CustomEvent('library:updated', {
        detail: { newFiles, modifiedFiles, deletedPaths }
      }));
    } else {
      onProgress(100, 100, 'No changes detected');
    }
    
  } catch (error) {
    console.error('❌ Incremental scan failed:', error);
  }
}

/**
 * Scan specific files (for incremental updates)
 * @private
 */
async function scanSpecificFiles(filePaths) {
  if (!filePaths || filePaths.length === 0) return [];

  // Preferred: ask main to scan exactly these files
  if (window.etune && typeof window.etune.scanFiles === 'function') {
    const tracks = await window.etune.scanFiles(filePaths);
    return Array.isArray(tracks) ? tracks : [];
  }

  // Fallback: scan entire directory and filter
  const dirPath = String(filePaths[0]).replace(/[\\/][^\\/]*$/, '');
  const allTracks = await (window.etune.scanMusicLite ? window.etune.scanMusicLite(dirPath) : window.etune.scanMusic(dirPath));
  const fileSet = new Set(filePaths);
  return allTracks.filter(t => fileSet.has(t.filePath));
}

/**
 * Direct scan without caching (fallback)
 * @private
 */
async function scanMusicDirect(dirPath, onProgress) {
  onProgress(0, 100, 'Scanning library (no cache)...');
  const tracks = await (window.etune.scanMusicLite ? window.etune.scanMusicLite(dirPath) : window.etune.scanMusic(dirPath));
  onProgress(100, 100, 'Scan complete');
  return tracks;
}

/**
 * Get all music file paths from directory
 * @private
 */
async function getFileSystemPaths(dirPath) {
  try {
    const useHP = !!(window.state && window.state.useHighPerformanceIngestor);
    if (useHP && window.etune && typeof window.etune.listMusicFilesHP === 'function') {
      const paths = await window.etune.listMusicFilesHP(dirPath);
      return Array.isArray(paths) ? paths : [];
    }
    if (window.etune && typeof window.etune.listMusicFiles === 'function') {
      const paths = await window.etune.listMusicFiles(dirPath);
      return Array.isArray(paths) ? paths : [];
    }
  } catch (e) {
    // ignore
  }
  console.warn('listMusicFiles IPC not available, incremental scan limited');
  return [];
}

/**
 * Get file statistics (mtime, size)
 * @private
 */
async function getFileStats(filePath) {
  try {
    const res = await getFileStatsMap([filePath]);
    return res.get(filePath) || null;
  } catch (err) {
    return null;
  }
}

async function getFileStatsMap(filePaths) {
  try {
    if (!Array.isArray(filePaths) || filePaths.length === 0) return new Map();
    if (window.etune && typeof window.etune.getFileStats === 'function') {
      const stats = await window.etune.getFileStats(filePaths);
      const map = new Map();
      if (Array.isArray(stats)) {
        for (const s of stats) {
          if (s && s.filePath) map.set(s.filePath, { mtime: s.mtime || 0, size: s.size || 0 });
        }
      }
      return map;
    }
  } catch (_) {
    // ignore
  }
  return new Map();
}

/**
 * Add file stats to track objects
 * @private
 */
async function addFileStats(tracks) {
  try {
    const paths = tracks.map(t => t && t.filePath).filter(Boolean);
    const statMap = await getFileStatsMap(paths);
    return tracks.map(track => {
      const st = statMap.get(track.filePath);
      return {
        ...track,
        mtime: st ? st.mtime : (track.mtime || 0),
        size: st ? st.size : (track.size || 0)
      };
    });
  } catch (e) {
    return tracks.map(track => ({
      ...track,
      mtime: track.mtime || 0,
      size: track.size || 0
    }));
  }
}

/**
 * Clear all cached data
 */
export async function clearMusicCache() {
  try {
    await cache.open();
    await cache.clear();
    console.log('✅ Music cache cleared');
    return true;
  } catch (err) {
    console.error('❌ Failed to clear cache:', err);
    return false;
  }
}

/**
 * Get cache statistics
 */
export async function getCacheStats() {
  try {
    if (!cache.isAvailable()) {
      return { available: false };
    }
    
    await cache.open();
    const count = await cache.count();
    const size = await cache.estimateSize();
    const stats = cache.getStats();
    
    return {
      available: true,
      count,
      size,
      sizeFormatted: formatBytes(size),
      ...stats
    };
  } catch (err) {
    console.error('❌ Failed to get cache stats:', err);
    return { available: false, error: err.message };
  }
}

/**
 * Format bytes to human-readable string
 * @private
 */
function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

// Export cache instance for direct access if needed
export { cache };

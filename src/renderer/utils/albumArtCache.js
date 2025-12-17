/**
 * Album Art Cache System
 * 
 * This module provides an optimized album art loading system that:
 * 1. Reduces memory usage by storing artwork as Blob URLs instead of base64
 * 2. Deduplicates album art across tracks from the same album
 * 3. Provides lazy loading capabilities
 * 4. Includes cleanup mechanisms to prevent memory leaks
 */

class AlbumArtCache {
  constructor() {
    // Map of album keys to blob URLs
    this.artBlobCache = new Map();

    // Map of album keys to base64 data URLs (kept only until first use)
    this.artDataUrlCache = new Map();
    
    // Map of album keys to reference counts (for cleanup)
    this.referenceCount = new Map();
    
    // Map of track file paths to album keys (for deduplication)
    this.trackToAlbumKey = new Map();
    
    // Set of blob URLs we've created (for cleanup)
    this.createdBlobs = new Set();

    // Map of album keys to in-flight IPC fetch promises
    this.inFlightFetches = new Map();

    // Track-level negative cache to avoid re-fetching files that have no embedded art
    this.missingArtFiles = new Set();
    
    // Default placeholder
    this.defaultArt = 'assets/images/default-art.png';
    
    // Bind methods
    this.getAlbumArt = this.getAlbumArt.bind(this);
    this.ensureAlbumArt = this.ensureAlbumArt.bind(this);
    this.cleanup = this.cleanup.bind(this);
    
    // Listen for beforeunload to cleanup blob URLs
    window.addEventListener('beforeunload', this.cleanup);
  }
  
  /**
   * Generate a cache key for an album
   */
  generateAlbumKey(track) {
    const tags = track.tags || {};
    const album = (tags.album || 'Unknown').toLowerCase().trim();
    const artist = (tags.artist || tags.albumartist || 'Unknown').toLowerCase().trim();
    
    // Use album + artist for better deduplication
    // Handle various artist scenarios
    if (album === 'unknown' && artist === 'unknown') {
      // Fall back to file path for truly unknown tracks
      return `file:${track.filePath}`;
    }
    
    return `${album}::${artist}`;
  }
  
  /**
   * Convert base64 data URL to blob URL for better performance
   */
  base64ToBlob(base64DataUrl) {
    try {
      const [header, data] = base64DataUrl.split(',');
      const mimeMatch = header.match(/data:([^;]+)/);
      const mime = mimeMatch ? mimeMatch[1] : 'image/jpeg';
      
      const byteCharacters = atob(data);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: mime });
      
      return URL.createObjectURL(blob);
    } catch (error) {
      console.warn('Failed to convert base64 to blob:', error);
      return null;
    }
  }
  
  /**
   * Process tracks to build the cache during initial scan
   */
  processTracks(tracks) {
    console.log(`🎨 Processing ${tracks.length} tracks for album art optimization...`);
    
    let cacheHits = 0;
    let storedDataUrls = 0;
    
    for (const track of tracks) {
      const albumKey = this.generateAlbumKey(track);
      this.trackToAlbumKey.set(track.filePath, albumKey);
      
      // Increment reference count
      const currentCount = this.referenceCount.get(albumKey) || 0;
      this.referenceCount.set(albumKey, currentCount + 1);
      
      // Track whether we've already seen an image for this album.
      // Store a single base64 data URL per album key (lazy conversion later).
      const alreadyHave = this.artBlobCache.has(albumKey) || this.artDataUrlCache.has(albumKey);
      if (alreadyHave) {
        cacheHits++;
      } else if (track.albumArtDataUrl) {
        this.artDataUrlCache.set(albumKey, track.albumArtDataUrl);
        storedDataUrls++;
      }

      // Clear the base64 data from the track to save memory; we keep at most one
      // representative base64 per album key in artDataUrlCache.
      if (track.albumArtDataUrl) delete track.albumArtDataUrl;
    }

    const uniqueAlbums = this.artBlobCache.size + this.artDataUrlCache.size;
    console.log(`🎨 Album art cache primed: ${uniqueAlbums} unique albums, ${cacheHits} cache hits, ${storedDataUrls} queued`);
  }
  
  /**
   * Get album art URL for a track (blob URL or default)
   */
  getAlbumArt(track) {
    if (!track) return this.defaultArt;

    const albumKey = this.trackToAlbumKey.get(track.filePath) || this.generateAlbumKey(track);

    // Fast path
    const cached = this.artBlobCache.get(albumKey);
    if (cached) return cached;

    // Legacy path: track still carries base64 (e.g., if processTracks wasn't called)
    if (track.albumArtDataUrl) {
      const blobUrl = this.base64ToBlob(track.albumArtDataUrl);
      if (blobUrl) {
        this.artBlobCache.set(albumKey, blobUrl);
        this.createdBlobs.add(blobUrl);
        delete track.albumArtDataUrl;
        return blobUrl;
      }
      delete track.albumArtDataUrl;
      return this.defaultArt;
    }

    // Lazy conversion path: convert representative data URL for this album key on first request
    const dataUrl = this.artDataUrlCache.get(albumKey);
    if (dataUrl) {
      const blobUrl = this.base64ToBlob(dataUrl);
      this.artDataUrlCache.delete(albumKey);
      if (blobUrl) {
        this.artBlobCache.set(albumKey, blobUrl);
        this.createdBlobs.add(blobUrl);
        return blobUrl;
      }
    }

    return this.defaultArt;
  }

  /**
   * Ensure album art is loaded for a track.
   * Returns a blob URL (or default placeholder if unavailable).
   */
  async ensureAlbumArt(track) {
    if (!track || !track.filePath) return this.defaultArt;

    const albumKey = this.trackToAlbumKey.get(track.filePath) || this.generateAlbumKey(track);

    const cached = this.artBlobCache.get(albumKey);
    if (cached) return cached;

    if (this.missingArtFiles.has(track.filePath)) return this.defaultArt;

    // Deduplicate concurrent requests per album key.
    const existing = this.inFlightFetches.get(albumKey);
    if (existing) return existing;

    const fetchPromise = (async () => {
      try {
        const api = window.etune;
        const getAlbumArt = api && typeof api.getAlbumArt === 'function' ? api.getAlbumArt : null;
        if (!getAlbumArt) return this.defaultArt;

        const dataUrl = await getAlbumArt(track.filePath);
        if (!dataUrl) {
          this.missingArtFiles.add(track.filePath);
          return this.defaultArt;
        }

        const blobUrl = this.base64ToBlob(dataUrl);
        if (!blobUrl) {
          this.missingArtFiles.add(track.filePath);
          return this.defaultArt;
        }

        this.artBlobCache.set(albumKey, blobUrl);
        this.createdBlobs.add(blobUrl);
        return blobUrl;
      } catch (error) {
        return this.defaultArt;
      } finally {
        // Always clear; a later call may try a different filePath for same album.
        this.inFlightFetches.delete(albumKey);
      }
    })();

    this.inFlightFetches.set(albumKey, fetchPromise);
    return fetchPromise;
  }
  
  /**
   * Preload album art for a set of tracks (for smooth scrolling)
   */
  preloadAlbumArt(tracks, maxConcurrent = 3) {
    const toLoad = tracks
      .map(track => ({ track, albumKey: this.trackToAlbumKey.get(track.filePath) || this.generateAlbumKey(track) }))
      .filter(({ track, albumKey }) => !this.artBlobCache.has(albumKey) && (this.artDataUrlCache.has(albumKey) || track.albumArtDataUrl))
      .slice(0, maxConcurrent);

    toLoad.forEach(({ track, albumKey }) => {
      const dataUrl = track.albumArtDataUrl || this.artDataUrlCache.get(albumKey);
      if (!dataUrl) return;
      const blobUrl = this.base64ToBlob(dataUrl);
      if (blobUrl) {
        this.artBlobCache.set(albumKey, blobUrl);
        this.createdBlobs.add(blobUrl);
      }
      if (track.albumArtDataUrl) delete track.albumArtDataUrl;
      this.artDataUrlCache.delete(albumKey);
    });
  }
  
  /**
   * Get cache statistics
   */
  getStats() {
    return {
      uniqueAlbums: this.artBlobCache.size,
      pendingDataUrls: this.artDataUrlCache.size,
      totalReferences: Array.from(this.referenceCount.values()).reduce((a, b) => a + b, 0),
      memoryEstimate: `~${this.artBlobCache.size * 50}KB`,
      blobsCreated: this.createdBlobs.size
    };
  }
  
  /**
   * Clean up blob URLs to prevent memory leaks
   */
  cleanup() {
    console.log(`🧹 Cleaning up ${this.createdBlobs.size} album art blob URLs...`);
    
    this.createdBlobs.forEach(blobUrl => {
      try {
        URL.revokeObjectURL(blobUrl);
      } catch (error) {
        console.warn('Failed to revoke blob URL:', blobUrl, error);
      }
    });
    
    this.artBlobCache.clear();
    this.artDataUrlCache.clear();
    this.referenceCount.clear();
    this.trackToAlbumKey.clear();
    this.createdBlobs.clear();
    this.inFlightFetches.clear();
    this.missingArtFiles.clear();
  }
  
  /**
   * Remove references for tracks (when tracks are removed from library)
   */
  removeTrackReferences(tracks) {
    for (const track of tracks) {
      const albumKey = this.trackToAlbumKey.get(track.filePath);
      if (albumKey) {
        const currentCount = this.referenceCount.get(albumKey) || 0;
        if (currentCount <= 1) {
          // Last reference, clean up
          const blobUrl = this.artBlobCache.get(albumKey);
          if (blobUrl && this.createdBlobs.has(blobUrl)) {
            URL.revokeObjectURL(blobUrl);
            this.createdBlobs.delete(blobUrl);
          }
          this.artBlobCache.delete(albumKey);
          this.referenceCount.delete(albumKey);
        } else {
          this.referenceCount.set(albumKey, currentCount - 1);
        }
        this.trackToAlbumKey.delete(track.filePath);
      }
    }
  }
}

// Create global instance
export const albumArtCache = new AlbumArtCache();

// Export helper function for easy use
export function getAlbumArtUrl(track) {
  return albumArtCache.getAlbumArt(track);
}

export async function ensureAlbumArtUrl(track) {
  return albumArtCache.ensureAlbumArt(track);
}

export function initializeAlbumArtCache(tracks) {
  albumArtCache.processTracks(tracks);
}

export function getAlbumArtStats() {
  return albumArtCache.getStats();
}

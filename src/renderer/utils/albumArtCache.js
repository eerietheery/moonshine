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
    
    // Map of album keys to reference counts (for cleanup)
    this.referenceCount = new Map();
    
    // Map of track file paths to album keys (for deduplication)
    this.trackToAlbumKey = new Map();
    
    // Set of blob URLs we've created (for cleanup)
    this.createdBlobs = new Set();
    
    // Default placeholder
    this.defaultArt = 'assets/images/default-art.png';
    
    // Bind methods
    this.getAlbumArt = this.getAlbumArt.bind(this);
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
    let processed = 0;
    
    for (const track of tracks) {
      const albumKey = this.generateAlbumKey(track);
      this.trackToAlbumKey.set(track.filePath, albumKey);
      
      // Increment reference count
      const currentCount = this.referenceCount.get(albumKey) || 0;
      this.referenceCount.set(albumKey, currentCount + 1);
      
      // Only process album art if we haven't cached this album yet
      if (!this.artBlobCache.has(albumKey) && track.albumArtDataUrl) {
        const blobUrl = this.base64ToBlob(track.albumArtDataUrl);
        if (blobUrl) {
          this.artBlobCache.set(albumKey, blobUrl);
          this.createdBlobs.add(blobUrl);
          processed++;
        }
      } else if (this.artBlobCache.has(albumKey)) {
        cacheHits++;
      }
      
      // Clear the base64 data from the track to save memory
      delete track.albumArtDataUrl;
    }
    
    console.log(`🎨 Album art cache built: ${this.artBlobCache.size} unique albums, ${cacheHits} cache hits, ${processed} processed`);
    console.log(`💾 Memory saved: ~${(cacheHits * 50)}KB (estimated)`);
  }
  
  /**
   * Get album art URL for a track (blob URL or default)
   */
  getAlbumArt(track) {
    if (!track) return this.defaultArt;
    
    // If track still has base64 data, convert it on the fly
    if (track.albumArtDataUrl) {
      const albumKey = this.generateAlbumKey(track);
      
      if (!this.artBlobCache.has(albumKey)) {
        const blobUrl = this.base64ToBlob(track.albumArtDataUrl);
        if (blobUrl) {
          this.artBlobCache.set(albumKey, blobUrl);
          this.createdBlobs.add(blobUrl);
        }
        // Clear base64 to save memory
        delete track.albumArtDataUrl;
      }
    }
    
    const albumKey = this.trackToAlbumKey.get(track.filePath) || this.generateAlbumKey(track);
    return this.artBlobCache.get(albumKey) || this.defaultArt;
  }
  
  /**
   * Preload album art for a set of tracks (for smooth scrolling)
   */
  preloadAlbumArt(tracks, maxConcurrent = 3) {
    const toLoad = tracks
      .filter(track => track.albumArtDataUrl && !this.artBlobCache.has(this.generateAlbumKey(track)))
      .slice(0, maxConcurrent);
    
    toLoad.forEach(track => {
      const albumKey = this.generateAlbumKey(track);
      const blobUrl = this.base64ToBlob(track.albumArtDataUrl);
      if (blobUrl) {
        this.artBlobCache.set(albumKey, blobUrl);
        this.createdBlobs.add(blobUrl);
        delete track.albumArtDataUrl;
      }
    });
  }
  
  /**
   * Get cache statistics
   */
  getStats() {
    return {
      uniqueAlbums: this.artBlobCache.size,
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
    this.referenceCount.clear();
    this.trackToAlbumKey.clear();
    this.createdBlobs.clear();
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

export function initializeAlbumArtCache(tracks) {
  albumArtCache.processTracks(tracks);
}

export function getAlbumArtStats() {
  return albumArtCache.getStats();
}

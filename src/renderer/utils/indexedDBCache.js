/**
 * IndexedDB Cache Manager for Moonshine
 * Caches parsed music metadata to dramatically improve startup time
 * 
 * Features:
 * - Fast metadata retrieval from IndexedDB
 * - Incremental scanning (only new/modified files)
 * - Cache invalidation based on file mtime
 * - Statistics tracking (hits, misses, size)
 * - Graceful fallback on errors
 * 
 * @module indexedDBCache
 */

const DB_NAME = 'moonshine-cache';
// v2 adds per-library scoping via `libraryKey`.
const DB_VERSION = 2;

const STORES = {
  TRACKS: 'tracks',      // Main cache: track metadata
  METADATA: 'metadata'   // Stats, version info, etc.
};

const INDEXES = {
  LIBRARY: 'libraryKey',
  ALBUM: 'album',
  ARTIST: 'artist',
  MTIME: 'mtime',
  CACHED_AT: 'cachedAt'
};

function normalizeLibraryKey(dirPath) {
  return String(dirPath || '')
    .trim()
    .replace(/\\/g, '/')
    .replace(/\/+$/g, '')
    .toLowerCase();
}

function normalizePathForCompare(filePath) {
  return String(filePath || '').replace(/\\/g, '/').toLowerCase();
}

/**
 * IndexedDB Cache Manager Class
 */
class IndexedDBCache {
  constructor() {
    this.db = null;
    this.isSupported = typeof indexedDB !== 'undefined';
    this.isInitialized = false;
    
    // Statistics
    this.stats = {
      hits: 0,
      misses: 0,
      totalTracks: 0,
      cacheSize: 0,
      lastUpdate: null
    };
    
    console.log('📦 IndexedDB Cache:', this.isSupported ? 'Supported' : 'Not supported');
  }

  /**
   * Check if IndexedDB is supported and available
   */
  isAvailable() {
    return this.isSupported;
  }

  /**
   * Open database connection and create object stores if needed
   */
  async open() {
    if (!this.isSupported) {
      throw new Error('IndexedDB is not supported in this environment');
    }

    if (this.db && this.isInitialized) {
      console.log('📦 IndexedDB already open, reusing connection');
      return this.db; // Already open
    }

    return new Promise((resolve, reject) => {
      console.log('📦 Opening IndexedDB:', DB_NAME, 'version', DB_VERSION);
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        console.error('❌ Failed to open IndexedDB:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        this.isInitialized = true;
        console.log('✅ IndexedDB opened successfully');
        console.log(`📦 Storage location: ${window.location.origin} (partition: persist:moonshine)`);
        
        // Add error handler for database
        this.db.onerror = (event) => {
          console.error('❌ Database error:', event.target.error);
        };
        
        // Handle unexpected close
        this.db.onclose = () => {
          console.warn('⚠️ Database connection closed unexpectedly');
          this.db = null;
          this.isInitialized = false;
        };
        
        // Load stats
        this.loadStats().catch(err => console.warn('Failed to load stats:', err));
        
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        console.log('📦 Upgrading IndexedDB schema...');
        const db = event.target.result;
        
        // Create tracks store
        if (!db.objectStoreNames.contains(STORES.TRACKS)) {
          const trackStore = db.createObjectStore(STORES.TRACKS, {
            keyPath: 'filePath'
          });
          
          // Create indexes for fast lookups
          trackStore.createIndex(INDEXES.LIBRARY, 'libraryKey', { unique: false });
          trackStore.createIndex(INDEXES.ALBUM, 'tags.album', { unique: false });
          trackStore.createIndex(INDEXES.ARTIST, 'tags.artist', { unique: false });
          trackStore.createIndex(INDEXES.MTIME, 'mtime', { unique: false });
          trackStore.createIndex(INDEXES.CACHED_AT, 'cachedAt', { unique: false });
          
          console.log('✅ Created tracks object store with indexes');
        } else {
          // Existing DB: ensure new indexes exist.
          const trackStore = event.target.transaction.objectStore(STORES.TRACKS);
          if (!trackStore.indexNames.contains(INDEXES.LIBRARY)) {
            trackStore.createIndex(INDEXES.LIBRARY, 'libraryKey', { unique: false });
            console.log('✅ Added libraryKey index');
          }
        }
        
        // Create metadata store
        if (!db.objectStoreNames.contains(STORES.METADATA)) {
          db.createObjectStore(STORES.METADATA, { keyPath: 'key' });
          console.log('✅ Created metadata object store');
        }
      };

      request.onblocked = () => {
        console.warn('⚠️ IndexedDB upgrade blocked by another tab');
      };
    });
  }

  /**
   * Convert a directory path into a stable, case-insensitive library key.
   */
  getLibraryKey(dirPath) {
    return normalizeLibraryKey(dirPath);
  }

  /**
   * Get a single track from cache by file path
   * @param {string} filePath - Absolute path to music file
   * @returns {Promise<Object|null>} Cached track object or null
   */
  async get(filePath) {
    if (!this.db) await this.open();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([STORES.TRACKS], 'readonly');
      const store = transaction.objectStore(STORES.TRACKS);
      const request = store.get(filePath);

      request.onsuccess = () => {
        const result = request.result;
        if (result) {
          this.stats.hits++;
          resolve(result);
        } else {
          this.stats.misses++;
          resolve(null);
        }
      };

      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Store a track in cache
   * @param {string} filePath - Absolute path to music file
   * @param {Object} trackData - Track metadata to cache
   */
  async set(filePath, trackData, libraryKey = null) {
    if (!this.db) await this.open();

    const cacheEntry = {
      ...trackData,
      filePath,
      libraryKey: trackData?.libraryKey || (libraryKey ? normalizeLibraryKey(libraryKey) : undefined),
      cachedAt: Date.now()
    };

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([STORES.TRACKS], 'readwrite');
      const store = transaction.objectStore(STORES.TRACKS);
      const request = store.put(cacheEntry);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Store multiple tracks in a single transaction (batch operation)
   * @param {Array<Object>} tracks - Array of track objects to cache
   */
  async setMany(tracks, libraryKey = null) {
    if (!this.db) await this.open();
    if (!tracks || tracks.length === 0) return;

    console.log(`📦 Caching ${tracks.length} tracks...`);

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([STORES.TRACKS], 'readwrite');
      const store = transaction.objectStore(STORES.TRACKS);
      const cachedAt = Date.now();
      const libKey = libraryKey ? normalizeLibraryKey(libraryKey) : null;

      let successCount = 0;
      let errorCount = 0;

      for (const track of tracks) {
        const cacheEntry = {
          ...track,
          libraryKey: track?.libraryKey || libKey || undefined,
          cachedAt
        };

        const request = store.put(cacheEntry);
        request.onsuccess = () => successCount++;
        request.onerror = () => errorCount++;
      }

      transaction.oncomplete = () => {
        console.log(`✅ Cached ${successCount} tracks, ${errorCount} errors`);
        this.updateStats({ totalTracks: successCount });
        resolve({ success: successCount, errors: errorCount });
      };

      transaction.onerror = () => reject(transaction.error);
    });
  }

  /**
   * Delete a track from cache
   * @param {string} filePath - Absolute path to music file
   */
  async delete(filePath) {
    if (!this.db) await this.open();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([STORES.TRACKS], 'readwrite');
      const store = transaction.objectStore(STORES.TRACKS);
      const request = store.delete(filePath);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Delete multiple tracks (batch operation)
   * @param {Array<string>} filePaths - Array of file paths to remove
   */
  async deleteMany(filePaths) {
    if (!this.db) await this.open();
    if (!filePaths || filePaths.length === 0) return;

    console.log(`📦 Removing ${filePaths.length} tracks from cache...`);

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([STORES.TRACKS], 'readwrite');
      const store = transaction.objectStore(STORES.TRACKS);

      let successCount = 0;

      for (const filePath of filePaths) {
        const request = store.delete(filePath);
        request.onsuccess = () => successCount++;
      }

      transaction.oncomplete = () => {
        console.log(`✅ Removed ${successCount} tracks from cache`);
        resolve(successCount);
      };

      transaction.onerror = () => reject(transaction.error);
    });
  }

  /**
   * Get all cached track file paths
   * @returns {Promise<Array<string>>} Array of file paths
   */
  async getAllKeys(libraryKey = null) {
    if (!this.db) await this.open();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([STORES.TRACKS], 'readonly');
      const store = transaction.objectStore(STORES.TRACKS);

      const libKey = libraryKey ? normalizeLibraryKey(libraryKey) : null;
      if (!libKey) {
        const request = store.getAllKeys();
        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => reject(request.error);
        return;
      }

      // IndexedDB doesn't provide getAllKeys on an index in older engines; use cursor.
      const keys = [];
      const idx = store.index(INDEXES.LIBRARY);
      const request = idx.openCursor(IDBKeyRange.only(libKey));
      request.onsuccess = () => {
        const cursor = request.result;
        if (!cursor) return resolve(keys);
        keys.push(cursor.primaryKey);
        cursor.continue();
      };
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get all cached tracks
   * @returns {Promise<Array<Object>>} Array of track objects
   */
  async getAllTracks(libraryKey = null) {
    if (!this.db) await this.open();

    return new Promise((resolve, reject) => {
      try {
        const transaction = this.db.transaction([STORES.TRACKS], 'readonly');
        const store = transaction.objectStore(STORES.TRACKS);
        const libKey = libraryKey ? normalizeLibraryKey(libraryKey) : null;
        if (!libKey) {
          const request = store.getAll();
          request.onsuccess = () => {
            const tracks = request.result || [];
            console.log(`📦 Retrieved ${tracks.length} tracks from cache`);
            resolve(tracks);
          };
          request.onerror = () => {
            console.error('❌ Failed to retrieve tracks:', request.error);
            reject(request.error);
          };
          return;
        }

        const idx = store.index(INDEXES.LIBRARY);
        const request = idx.getAll(IDBKeyRange.only(libKey));
        request.onsuccess = () => {
          const tracks = request.result || [];
          console.log(`📦 Retrieved ${tracks.length} tracks from cache for library ${libKey}`);
          resolve(tracks);
        };

        request.onerror = () => {
          console.error('❌ Failed to retrieve tracks:', request.error);
          reject(request.error);
        };
        
        transaction.onerror = () => {
          console.error('❌ Transaction error while retrieving tracks:', transaction.error);
          reject(transaction.error);
        };
      } catch (err) {
        console.error('❌ Exception while retrieving tracks:', err);
        resolve([]); // Return empty array on error
      }
    });
  }

  /**
   * Check if cache has any data
   * @returns {Promise<boolean>}
   */
  async hasData(libraryKey = null) {
    if (!this.db) await this.open();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([STORES.TRACKS], 'readonly');
      const store = transaction.objectStore(STORES.TRACKS);
      const libKey = libraryKey ? normalizeLibraryKey(libraryKey) : null;
      if (!libKey) {
        const request = store.count();
        request.onsuccess = () => resolve(request.result > 0);
        request.onerror = () => reject(request.error);
        return;
      }
      const idx = store.index(INDEXES.LIBRARY);
      const request = idx.count(IDBKeyRange.only(libKey));
      request.onsuccess = () => resolve(request.result > 0);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get count of cached tracks
   * @returns {Promise<number>}
   */
  async count(libraryKey = null) {
    if (!this.db) await this.open();

    return new Promise((resolve, reject) => {
      try {
        const transaction = this.db.transaction([STORES.TRACKS], 'readonly');
        const store = transaction.objectStore(STORES.TRACKS);
        const libKey = libraryKey ? normalizeLibraryKey(libraryKey) : null;
        const request = libKey
          ? store.index(INDEXES.LIBRARY).count(IDBKeyRange.only(libKey))
          : store.count();

        request.onsuccess = () => {
          console.log(`📦 Cache count result: ${request.result}`);
          resolve(request.result || 0);
        };
        request.onerror = () => {
          console.error('❌ Cache count error:', request.error);
          reject(request.error);
        };
        transaction.onerror = () => {
          console.error('❌ Cache count transaction error:', transaction.error);
          reject(transaction.error);
        };
      } catch (err) {
        console.error('❌ Cache count exception:', err);
        resolve(0); // Return 0 on error instead of rejecting
      }
    });
  }

  /**
   * One-time helper to tag legacy cache entries (no libraryKey) that belong
   * to a given directory, based on filePath prefix.
   */
  async tagLibraryByDirPrefix(dirPath) {
    if (!this.db) await this.open();

    const libKey = normalizeLibraryKey(dirPath);
    const prefix = normalizePathForCompare(dirPath);
    if (!libKey || !prefix) return { updated: 0 };

    return new Promise((resolve, reject) => {
      let updated = 0;
      const transaction = this.db.transaction([STORES.TRACKS], 'readwrite');
      const store = transaction.objectStore(STORES.TRACKS);
      const request = store.openCursor();

      request.onsuccess = () => {
        const cursor = request.result;
        if (!cursor) return;
        const value = cursor.value;
        if (value && !value.libraryKey) {
          const fp = normalizePathForCompare(value.filePath);
          if (fp.startsWith(prefix)) {
            value.libraryKey = libKey;
            cursor.update(value);
            updated++;
          }
        }
        cursor.continue();
      };

      transaction.oncomplete = () => resolve({ updated });
      transaction.onerror = () => reject(transaction.error);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Clear all cached tracks
   */
  async clear() {
    if (!this.db) await this.open();

    console.log('📦 Clearing all cache...');

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([STORES.TRACKS], 'readwrite');
      const store = transaction.objectStore(STORES.TRACKS);
      const request = store.clear();

      request.onsuccess = () => {
        console.log('✅ Cache cleared');
        this.stats = {
          hits: 0,
          misses: 0,
          totalTracks: 0,
          cacheSize: 0,
          lastUpdate: Date.now()
        };
        this.saveStats();
        resolve();
      };

      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Load statistics from metadata store
   */
  async loadStats() {
    if (!this.db) await this.open();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([STORES.METADATA], 'readonly');
      const store = transaction.objectStore(STORES.METADATA);
      const request = store.get('stats');

      request.onsuccess = () => {
        if (request.result) {
          this.stats = { ...this.stats, ...request.result.value };
        }
        resolve(this.stats);
      };

      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Save statistics to metadata store
   */
  async saveStats() {
    if (!this.db) await this.open();

    const statsEntry = {
      key: 'stats',
      value: this.stats,
      updatedAt: Date.now()
    };

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([STORES.METADATA], 'readwrite');
      const store = transaction.objectStore(STORES.METADATA);
      const request = store.put(statsEntry);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Update and save statistics
   * @param {Object} updates - Partial stats object to merge
   */
  async updateStats(updates) {
    this.stats = { ...this.stats, ...updates, lastUpdate: Date.now() };
    await this.saveStats();
  }

  /**
   * Get current cache statistics
   * @returns {Object} Stats object
   */
  getStats() {
    return {
      ...this.stats,
      hitRate: this.stats.hits + this.stats.misses > 0
        ? (this.stats.hits / (this.stats.hits + this.stats.misses) * 100).toFixed(1) + '%'
        : 'N/A'
    };
  }

  /**
   * Estimate cache size in bytes
   * @returns {Promise<number>} Estimated size in bytes
   */
  async estimateSize() {
    if (!navigator.storage || !navigator.storage.estimate) {
      return 0;
    }

    try {
      const estimate = await navigator.storage.estimate();
      return estimate.usage || 0;
    } catch (err) {
      console.warn('Failed to estimate storage:', err);
      return 0;
    }
  }

  /**
   * Close database connection
   */
  close() {
    if (this.db) {
      this.db.close();
      this.db = null;
      this.isInitialized = false;
      console.log('📦 IndexedDB closed');
    }
  }

  /**
   * Delete entire database (for debugging/testing)
   */
  static async deleteDatabase() {
    return new Promise((resolve, reject) => {
      console.log('🗑️ Deleting database:', DB_NAME);
      const request = indexedDB.deleteDatabase(DB_NAME);

      request.onsuccess = () => {
        console.log('✅ Database deleted');
        resolve();
      };

      request.onerror = () => reject(request.error);
      request.onblocked = () => {
        console.warn('⚠️ Database deletion blocked');
      };
    });
  }
}

// Singleton instance
export const cache = new IndexedDBCache();

// Export class for testing
export { IndexedDBCache };

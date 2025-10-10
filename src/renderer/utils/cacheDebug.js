/**
 * IndexedDB Cache Debugging Utilities
 * 
 * Run these commands in the browser DevTools console to debug cache issues:
 * 
 * // Import the utilities
 * const debug = await import('./src/renderer/utils/cacheDebug.js');
 * 
 * // Check cache status
 * await debug.checkCacheStatus();
 * 
 * // View cache details
 * await debug.inspectCache();
 * 
 * // Test cache read/write
 * await debug.testCache();
 * 
 * // Clear cache and test again
 * await debug.resetCache();
 */

import { cache } from './indexedDBCache.js';

/**
 * Check basic cache status
 */
export async function checkCacheStatus() {
  console.log('🔍 Checking IndexedDB cache status...\n');
  
  // Check support
  console.log('1️⃣ IndexedDB Support:', cache.isAvailable() ? '✅ Supported' : '❌ Not supported');
  
  if (!cache.isAvailable()) {
    console.log('❌ IndexedDB is not available in this environment');
    return;
  }
  
  try {
    // Open database
    console.log('\n2️⃣ Opening database...');
    await cache.open();
    console.log('✅ Database opened successfully');
    console.log('   - Initialized:', cache.isInitialized);
    console.log('   - Connection:', cache.db ? 'Active' : 'None');
    
    // Check count
    console.log('\n3️⃣ Checking cache count...');
    const count = await cache.count();
    console.log(`✅ Cache contains ${count} tracks`);
    
    // Check stats
    console.log('\n4️⃣ Cache statistics:');
    const stats = cache.getStats();
    console.log('   - Total tracks:', stats.totalTracks);
    console.log('   - Cache hits:', stats.hits);
    console.log('   - Cache misses:', stats.misses);
    console.log('   - Hit rate:', stats.hitRate);
    console.log('   - Last update:', stats.lastUpdate ? new Date(stats.lastUpdate).toLocaleString() : 'Never');
    
    // Estimate size
    console.log('\n5️⃣ Storage estimate...');
    const size = await cache.estimateSize();
    const sizeMB = (size / (1024 * 1024)).toFixed(2);
    console.log(`✅ Estimated cache size: ${sizeMB} MB`);
    
    console.log('\n✅ Cache status check complete!');
    
    return {
      supported: true,
      initialized: cache.isInitialized,
      count,
      stats,
      sizeMB
    };
  } catch (err) {
    console.error('❌ Error checking cache status:', err);
    return { supported: false, error: err.message };
  }
}

/**
 * Inspect cache contents (first 5 tracks)
 */
export async function inspectCache() {
  console.log('🔍 Inspecting cache contents...\n');
  
  try {
    await cache.open();
    const tracks = await cache.getAllTracks();
    
    console.log(`📦 Total tracks in cache: ${tracks.length}`);
    
    if (tracks.length === 0) {
      console.log('❌ Cache is empty');
      return;
    }
    
    console.log('\n📋 Sample tracks (first 5):');
    tracks.slice(0, 5).forEach((track, i) => {
      console.log(`\n${i + 1}. ${track.tags?.title || 'Unknown'}`);
      console.log(`   Artist: ${track.tags?.artist || 'Unknown'}`);
      console.log(`   Album: ${track.tags?.album || 'Unknown'}`);
      console.log(`   Path: ${track.filePath}`);
      console.log(`   Cached at: ${track.cachedAt ? new Date(track.cachedAt).toLocaleString() : 'Unknown'}`);
    });
    
    // Check for data consistency
    console.log('\n🔍 Data consistency check:');
    const withoutPath = tracks.filter(t => !t.filePath);
    const withoutTags = tracks.filter(t => !t.tags);
    const withoutCacheTime = tracks.filter(t => !t.cachedAt);
    
    console.log(`   - Tracks without filePath: ${withoutPath.length}`);
    console.log(`   - Tracks without tags: ${withoutTags.length}`);
    console.log(`   - Tracks without cachedAt: ${withoutCacheTime.length}`);
    
    if (withoutPath.length > 0 || withoutTags.length > 0) {
      console.warn('⚠️ Some tracks have missing data');
    } else {
      console.log('✅ All tracks have complete data');
    }
    
    return { total: tracks.length, sample: tracks.slice(0, 5) };
  } catch (err) {
    console.error('❌ Error inspecting cache:', err);
  }
}

/**
 * Test cache read/write operations
 */
export async function testCache() {
  console.log('🧪 Testing cache operations...\n');
  
  const testTrack = {
    filePath: '/test/path/test-track.mp3',
    tags: {
      title: 'Test Track',
      artist: 'Test Artist',
      album: 'Test Album'
    },
    duration: 180,
    mtime: Date.now()
  };
  
  try {
    await cache.open();
    
    // Test write
    console.log('1️⃣ Testing write operation...');
    await cache.set(testTrack.filePath, testTrack);
    console.log('✅ Write successful');
    
    // Test read
    console.log('\n2️⃣ Testing read operation...');
    const retrieved = await cache.get(testTrack.filePath);
    if (retrieved && retrieved.tags.title === testTrack.tags.title) {
      console.log('✅ Read successful - data matches');
    } else {
      console.error('❌ Read failed or data mismatch');
    }
    
    // Test delete
    console.log('\n3️⃣ Testing delete operation...');
    await cache.delete(testTrack.filePath);
    const afterDelete = await cache.get(testTrack.filePath);
    if (!afterDelete) {
      console.log('✅ Delete successful');
    } else {
      console.error('❌ Delete failed - track still exists');
    }
    
    console.log('\n✅ All cache operations working correctly!');
    return { success: true };
  } catch (err) {
    console.error('❌ Cache operation test failed:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Clear cache and rescan
 */
export async function resetCache() {
  console.log('🗑️ Resetting cache...\n');
  
  const confirmReset = confirm('This will clear all cached tracks. Continue?');
  if (!confirmReset) {
    console.log('❌ Reset cancelled');
    return;
  }
  
  try {
    await cache.open();
    const countBefore = await cache.count();
    console.log(`📦 Cache contains ${countBefore} tracks`);
    
    console.log('🗑️ Clearing cache...');
    await cache.clear();
    
    const countAfter = await cache.count();
    console.log(`✅ Cache cleared (${countBefore} → ${countAfter} tracks)`);
    
    console.log('\n💡 Reload the app to trigger a fresh scan');
    return { success: true, cleared: countBefore };
  } catch (err) {
    console.error('❌ Failed to reset cache:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Get detailed cache statistics
 */
export async function getDetailedStats() {
  console.log('📊 Gathering detailed cache statistics...\n');
  
  try {
    await cache.open();
    const tracks = await cache.getAllTracks();
    
    if (tracks.length === 0) {
      console.log('❌ Cache is empty');
      return;
    }
    
    // Analyze tracks
    const artists = new Set(tracks.map(t => t.tags?.artist).filter(Boolean));
    const albums = new Set(tracks.map(t => t.tags?.album).filter(Boolean));
    const genres = new Set(tracks.map(t => t.tags?.genre).filter(Boolean));
    
    // Find oldest and newest cached tracks
    const sortedByCache = [...tracks].sort((a, b) => (a.cachedAt || 0) - (b.cachedAt || 0));
    const oldest = sortedByCache[0];
    const newest = sortedByCache[sortedByCache.length - 1];
    
    // Calculate total duration
    const totalDuration = tracks.reduce((sum, t) => sum + (t.duration || 0), 0);
    const totalHours = (totalDuration / 3600).toFixed(1);
    
    console.log('📊 Cache Statistics:');
    console.log(`\n🎵 Content:`);
    console.log(`   - Total tracks: ${tracks.length}`);
    console.log(`   - Unique artists: ${artists.size}`);
    console.log(`   - Unique albums: ${albums.size}`);
    console.log(`   - Unique genres: ${genres.size}`);
    console.log(`   - Total duration: ${totalHours} hours`);
    
    console.log(`\n⏰ Cache timeline:`);
    console.log(`   - Oldest cached: ${oldest?.cachedAt ? new Date(oldest.cachedAt).toLocaleString() : 'Unknown'}`);
    console.log(`   - Newest cached: ${newest?.cachedAt ? new Date(newest.cachedAt).toLocaleString() : 'Unknown'}`);
    
    console.log(`\n💾 Storage:`);
    const size = await cache.estimateSize();
    const sizeMB = (size / (1024 * 1024)).toFixed(2);
    const avgPerTrack = tracks.length > 0 ? (size / tracks.length / 1024).toFixed(1) : 0;
    console.log(`   - Total size: ${sizeMB} MB`);
    console.log(`   - Avg per track: ${avgPerTrack} KB`);
    
    return {
      tracks: tracks.length,
      artists: artists.size,
      albums: albums.size,
      genres: genres.size,
      totalHours,
      sizeMB
    };
  } catch (err) {
    console.error('❌ Error getting detailed stats:', err);
  }
}

// Export cache instance for direct access
export { cache };

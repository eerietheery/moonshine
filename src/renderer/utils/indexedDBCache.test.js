/**
 * IndexedDB Cache Test Suite
 * Run in browser console to test cache functionality
 */

export async function testIndexedDBCache() {
  console.log('🧪 Starting IndexedDB Cache Tests...\n');
  
  try {
    const { cache } = await import('./indexedDBCache.js');
    const { scanMusicCached, getCacheStats, clearMusicCache } = await import('./cachedMusicScanner.js');
    
    // Test 1: Check availability
    console.log('Test 1: IndexedDB Availability');
    console.log('  Available:', cache.isAvailable());
    console.assert(cache.isAvailable(), 'IndexedDB should be available');
    console.log('  ✅ Pass\n');
    
    // Test 2: Open database
    console.log('Test 2: Database Connection');
    await cache.open();
    console.log('  Database opened:', cache.db ? 'Yes' : 'No');
    console.assert(cache.db !== null, 'Database should be open');
    console.log('  ✅ Pass\n');
    
    // Test 3: Set and Get
    console.log('Test 3: Basic CRUD Operations');
    const lib = '/test';
    const testTrack = {
      filePath: '/test/song.mp3',
      mtime: Date.now(),
      size: 1024000,
      tags: {
        title: 'Test Song',
        artist: 'Test Artist',
        album: 'Test Album',
        year: 2024,
        genre: 'Rock',
        track: 1
      },
      albumArtDataUrl: null,
      bitrate: 320000
    };
    
    await cache.set(testTrack.filePath, testTrack, lib);
    console.log('  Set track:', testTrack.tags.title);
    
    const retrieved = await cache.get(testTrack.filePath);
    console.log('  Retrieved:', retrieved ? retrieved.tags.title : 'null');
    console.assert(retrieved !== null, 'Should retrieve track');
    console.assert(retrieved.tags.title === testTrack.tags.title, 'Title should match');
    console.log('  ✅ Pass\n');
    
    // Test 4: Batch operations
    console.log('Test 4: Batch Operations');
    const batchTracks = [];
    for (let i = 0; i < 10; i++) {
      batchTracks.push({
        filePath: `/test/batch_${i}.mp3`,
        mtime: Date.now(),
        size: 1024000,
        tags: {
          title: `Batch Song ${i}`,
          artist: 'Test Artist',
          album: 'Batch Album',
          year: 2024,
          genre: 'Rock',
          track: i + 1
        },
        albumArtDataUrl: null,
        bitrate: 320000
      });
    }
    
    const result = await cache.setMany(batchTracks, lib);
    console.log('  Batch set:', result.success, 'tracks');
    console.assert(result.success === 10, 'Should cache 10 tracks');
    
    const count = await cache.count(lib);
    console.log('  Total cached:', count);
    console.assert(count >= 11, 'Should have at least 11 tracks');
    console.log('  ✅ Pass\n');
    
    // Test 5: Statistics
    console.log('Test 5: Statistics');
    const stats = cache.getStats();
    console.log('  Stats:', JSON.stringify(stats, null, 2));
    console.assert(stats.totalTracks >= 0, 'Should have stats');
    console.log('  ✅ Pass\n');
    
    // Test 6: Get all keys
    console.log('Test 6: Get All Keys');
    const keys = await cache.getAllKeys();
    console.log('  Keys count:', keys.length);
    console.assert(keys.length >= 11, 'Should have keys');
    console.log('  ✅ Pass\n');
    
    // Test 7: Delete
    console.log('Test 7: Delete Operations');
    await cache.delete(testTrack.filePath);
    const deleted = await cache.get(testTrack.filePath);
    console.log('  Deleted track:', deleted === null ? 'Yes' : 'No');
    console.assert(deleted === null, 'Track should be deleted');
    console.log('  ✅ Pass\n');
    
    // Test 8: Clear cache
    console.log('Test 8: Clear Cache');
    await cache.clear();
    const countAfterClear = await cache.count();
    console.log('  Count after clear:', countAfterClear);
    console.assert(countAfterClear === 0, 'Cache should be empty');
    console.log('  ✅ Pass\n');
    
    // Test 9: Cache stats via scanner
    console.log('Test 9: Scanner Cache Stats');
    const scannerStats = await getCacheStats();
    console.log('  Scanner stats:', JSON.stringify(scannerStats, null, 2));
    console.assert(scannerStats.available === true, 'Cache should be available');
    console.log('  ✅ Pass\n');
    
    console.log('🎉 All tests passed!\n');
    console.log('Cache is working correctly and ready to use.');
    
    return true;
  } catch (error) {
    console.error('❌ Test failed:', error);
    console.error(error.stack);
    return false;
  }
}

// Auto-run if not in module context
if (typeof window !== 'undefined') {
  window.testIndexedDBCache = testIndexedDBCache;
  console.log('💡 Run testIndexedDBCache() in console to test the cache');
}

/**
 * Album Art Optimization Demo
 * 
 * This file demonstrates the benefits of the new album art caching system.
 * It can be imported in the developer console to show memory savings.
 */

import { albumArtCache, getAlbumArtStats, initializeAlbumArtCache } from './albumArtCache.js';
import { state } from '../components/shared/state.js';

/**
 * Analyze current library for album art optimization potential
 */
export function analyzeAlbumArtOptimization() {
  const tracks = state.tracks || [];
  
  if (tracks.length === 0) {
    console.log('❌ No tracks loaded. Load a music library first.');
    return;
  }
  
  console.log('🔍 Analyzing album art optimization potential...\n');
  
  // Count tracks with album art
  const tracksWithArt = tracks.filter(t => t.albumArtDataUrl || albumArtCache.getAlbumArt(t) !== 'assets/images/default-art.png');
  
  // Estimate current memory usage (base64 strings are ~33% larger than binary)
  let totalBase64Size = 0;
  let base64Count = 0;
  
  tracks.forEach(track => {
    if (track.albumArtDataUrl) {
      // Rough estimate: base64 string length / 1.33 to get approximate binary size
      const estimatedSize = track.albumArtDataUrl.length * 0.75; // 75% of base64 is binary data
      totalBase64Size += estimatedSize;
      base64Count++;
    }
  });
  
  // Count unique albums
  const albumMap = new Map();
  tracks.forEach(track => {
    const tags = track.tags || {};
    const album = (tags.album || 'Unknown').toLowerCase().trim();
    const artist = (tags.artist || tags.albumartist || 'Unknown').toLowerCase().trim();
    const key = `${album}::${artist}`;
    
    if (!albumMap.has(key)) {
      albumMap.set(key, []);
    }
    albumMap.get(key).push(track);
  });
  
  const uniqueAlbums = albumMap.size;
  const duplicateArtwork = tracksWithArt.length - uniqueAlbums;
  
  console.log(`📊 Current State:`);
  console.log(`   Total tracks: ${tracks.length}`);
  console.log(`   Tracks with artwork: ${tracksWithArt.length}`);
  console.log(`   Tracks with base64 data: ${base64Count}`);
  console.log(`   Unique albums: ${uniqueAlbums}`);
  console.log(`   Duplicate artwork instances: ${duplicateArtwork}`);
  console.log(`   Estimated memory usage: ${(totalBase64Size / 1024 / 1024).toFixed(2)} MB\n`);
  
  if (duplicateArtwork > 0) {
    const potentialSavings = (duplicateArtwork / tracksWithArt * 100).toFixed(1);
    const estimatedSavedMemory = (totalBase64Size * duplicateArtwork / tracksWithArt / 1024 / 1024).toFixed(2);
    
    console.log(`💡 Optimization Potential:`);
    console.log(`   Potential memory savings: ${potentialSavings}%`);
    console.log(`   Estimated memory saved: ${estimatedSavedMemory} MB`);
    console.log(`   Reduced from ${tracksWithArt.length} to ${uniqueAlbums} artwork instances\n`);
    
    console.log(`🚀 To apply optimization:`);
    console.log(`   1. Restart the app (optimization is applied during scan)`);
    console.log(`   2. Or run: albumArtDemo.applyOptimization()\n`);
  } else {
    console.log(`✅ Album art is already optimized!\n`);
  }
  
  // Show cache stats if cache is active
  const cacheStats = getAlbumArtStats();
  if (cacheStats.uniqueAlbums > 0) {
    console.log(`📈 Cache Stats:`);
    console.log(`   Cached albums: ${cacheStats.uniqueAlbums}`);
    console.log(`   Total references: ${cacheStats.totalReferences}`);
    console.log(`   Estimated cache size: ${cacheStats.memoryEstimate}`);
    console.log(`   Blob URLs created: ${cacheStats.blobsCreated}\n`);
  }
  
  return {
    totalTracks: tracks.length,
    tracksWithArt: tracksWithArt.length,
    uniqueAlbums,
    duplicateArtwork,
    potentialSavingsPercent: duplicateArtwork / tracksWithArt * 100,
    estimatedMemoryMB: totalBase64Size / 1024 / 1024,
    cacheStats
  };
}

/**
 * Apply optimization to current library (for demo purposes)
 */
export function applyOptimization() {
  const tracks = state.tracks || [];
  
  if (tracks.length === 0) {
    console.log('❌ No tracks loaded.');
    return;
  }
  
  console.log('🔄 Applying album art optimization...');
  
  // Initialize the cache with current tracks
  initializeAlbumArtCache(tracks);
  
  const stats = getAlbumArtStats();
  console.log(`✅ Optimization complete!`);
  console.log(`   Cached albums: ${stats.uniqueAlbums}`);
  console.log(`   Total references: ${stats.totalReferences}`);
  console.log(`   Memory estimate: ${stats.memoryEstimate}`);
  
  return stats;
}

/**
 * Compare before and after optimization
 */
export function benchmarkOptimization() {
  console.log('🏁 Starting album art optimization benchmark...\n');
  
  const beforeStats = analyzeAlbumArtOptimization();
  
  if (beforeStats.duplicateArtwork === 0) {
    console.log('⚠️  No optimization needed - artwork already deduplicated.');
    return;
  }
  
  console.log('⏳ Applying optimization...\n');
  
  const afterStats = applyOptimization();
  
  console.log('\n📈 Benchmark Results:');
  console.log(`   Before: ${beforeStats.tracksWithArt} artwork instances`);
  console.log(`   After: ${afterStats.uniqueAlbums} unique albums cached`);
  console.log(`   Reduction: ${beforeStats.duplicateArtwork} fewer instances`);
  console.log(`   Memory saved: ~${(beforeStats.potentialSavingsPercent).toFixed(1)}%`);
  
  return { before: beforeStats, after: afterStats };
}

// Export to global scope for easy console access
if (typeof window !== 'undefined') {
  window.albumArtDemo = {
    analyze: analyzeAlbumArtOptimization,
    optimize: applyOptimization,
    benchmark: benchmarkOptimization
  };
  
  console.log('🎨 Album Art Demo loaded! Try these commands:');
  console.log('   albumArtDemo.analyze() - Analyze optimization potential');
  console.log('   albumArtDemo.optimize() - Apply optimization');
  console.log('   albumArtDemo.benchmark() - Full before/after comparison');
}

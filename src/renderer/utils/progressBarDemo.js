/**
 * Progress Bar Enhancement Demo
 * 
 * This utility demonstrates the improvements made to the media player progress bar
 * for smoother clicking and dragging interactions.
 */

/**
 * Test the progress bar functionality
 */
export function testProgressBar() {
  const audio = document.getElementById('audio');
  const progressBar = document.getElementById('progress-bar');
  const progressFill = document.getElementById('progress-fill');
  const progressHandle = document.getElementById('progress-handle');
  
  if (!audio || !progressBar) {
    console.log('❌ Media player elements not found. Make sure music is loaded.');
    return;
  }
  
  console.log('🎵 Testing Progress Bar Enhancements...\n');
  
  // Test if drag functionality is available
  const hasDragListeners = progressBar._listeners?.mousedown || progressBar.onmousedown;
  
  console.log(`📊 Progress Bar Status:`);
  console.log(`   Audio duration: ${audio.duration ? `${Math.round(audio.duration)}s` : 'Not loaded'}`);
  console.log(`   Current time: ${Math.round(audio.currentTime)}s`);
  console.log(`   Enhanced drag support: ${hasDragListeners ? '✅' : '❌'}`);
  console.log(`   Progress handle visible: ${progressHandle.style.opacity !== '0'}`);
  
  if (audio.duration) {
    console.log(`\n🎛️ Enhanced Features:`);
    console.log(`   • Smooth drag seeking`);
    console.log(`   • Auto-pause during drag`);
    console.log(`   • Visual feedback with handle scaling`);
    console.log(`   • Touch support for mobile`);
    console.log(`   • Hover effects`);
    console.log(`   • Click vs drag detection`);
    
    console.log(`\n💡 Try these interactions:`);
    console.log(`   1. Hover over the progress bar (handle should appear)`);
    console.log(`   2. Click anywhere on the bar (quick seek)`);
    console.log(`   3. Click and drag the handle (smooth seeking)`);
    console.log(`   4. Notice audio pauses during drag`);
  } else {
    console.log(`\n⚠️  Load and play a track to test progress bar features.`);
  }
  
  return {
    hasAudio: !!audio.duration,
    hasDragSupport: !!hasDragListeners,
    currentTime: audio.currentTime,
    duration: audio.duration
  };
}

/**
 * Simulate progress bar interactions for testing
 */
export function simulateProgressBarInteractions() {
  const audio = document.getElementById('audio');
  const progressBar = document.getElementById('progress-bar');
  
  if (!audio || !progressBar || !audio.duration) {
    console.log('❌ Cannot simulate - audio not loaded or progress bar not found.');
    return;
  }
  
  console.log('🤖 Simulating progress bar interactions...\n');
  
  // Simulate hover
  console.log('1. Simulating hover...');
  progressBar.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
  
  setTimeout(() => {
    // Simulate click at 25%
    const rect = progressBar.getBoundingClientRect();
    const clickX = rect.left + (rect.width * 0.25);
    console.log('2. Simulating click at 25%...');
    
    progressBar.dispatchEvent(new MouseEvent('click', {
      bubbles: true,
      clientX: clickX
    }));
    
    setTimeout(() => {
      console.log(`   Seeked to: ${Math.round(audio.currentTime)}s`);
      
      // Simulate drag
      console.log('3. Simulating drag to 75%...');
      const dragStartX = rect.left + (rect.width * 0.25);
      const dragEndX = rect.left + (rect.width * 0.75);
      
      progressBar.dispatchEvent(new MouseEvent('mousedown', {
        bubbles: true,
        clientX: dragStartX
      }));
      
      setTimeout(() => {
        document.dispatchEvent(new MouseEvent('mousemove', {
          bubbles: true,
          clientX: dragEndX
        }));
        
        setTimeout(() => {
          document.dispatchEvent(new MouseEvent('mouseup', {
            bubbles: true,
            clientX: dragEndX
          }));
          
          console.log(`   Dragged to: ${Math.round(audio.currentTime)}s`);
          console.log('✅ Simulation complete!');
        }, 100);
      }, 100);
    }, 500);
  }, 200);
}

/**
 * Monitor progress bar performance
 */
export function monitorProgressBarPerformance() {
  const audio = document.getElementById('audio');
  
  if (!audio) {
    console.log('❌ Audio element not found.');
    return;
  }
  
  console.log('📈 Monitoring progress bar performance...');
  console.log('Tracking timeupdate events for 10 seconds...\n');
  
  let updateCount = 0;
  let lastTime = performance.now();
  
  const monitor = () => {
    updateCount++;
    const now = performance.now();
    const interval = now - lastTime;
    lastTime = now;
    
    if (updateCount % 10 === 0) {
      console.log(`Updates: ${updateCount}, Avg interval: ${interval.toFixed(1)}ms`);
    }
  };
  
  audio.addEventListener('timeupdate', monitor);
  
  setTimeout(() => {
    audio.removeEventListener('timeupdate', monitor);
    console.log(`\n📊 Performance Summary:`);
    console.log(`   Total updates: ${updateCount}`);
    console.log(`   Average rate: ${(updateCount / 10).toFixed(1)} updates/second`);
    console.log(`✅ Monitoring complete!`);
  }, 10000);
}

// Export to global scope for easy console access
if (typeof window !== 'undefined') {
  window.progressBarDemo = {
    test: testProgressBar,
    simulate: simulateProgressBarInteractions,
    monitor: monitorProgressBarPerformance
  };
  
  console.log('🎛️ Progress Bar Demo loaded! Try these commands:');
  console.log('   progressBarDemo.test() - Test current functionality');
  console.log('   progressBarDemo.simulate() - Simulate interactions');
  console.log('   progressBarDemo.monitor() - Monitor performance');
}

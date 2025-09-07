/**
 * Mobile touch gestures utility
 * Handles long press to trigger context menu on mobile devices
 */

let longPressTimer = null;
let isLongPress = false;
const LONG_PRESS_DURATION = 500; // ms

/**
 * Initialize long press support for mobile
 */
export function initLongPressSupport() {
  console.log('📱 Initializing long press support...');
  
  // Add long press support to track elements
  document.addEventListener('touchstart', handleTouchStart, { passive: false });
  document.addEventListener('touchend', handleTouchEnd, { passive: true });
  document.addEventListener('touchmove', handleTouchMove, { passive: true });
  document.addEventListener('contextmenu', handleContextMenu, { passive: false });
}

/**
 * Handle touch start - begin long press timer
 */
function handleTouchStart(event) {
  // Only handle if we're in mobile view
  if (window.innerWidth > 768) return;
  
  const track = event.target.closest('.track');
  if (!track) return;
  
  isLongPress = false;
  
  // Start long press timer
  longPressTimer = setTimeout(() => {
    isLongPress = true;
    
    // Add visual feedback
    track.style.transform = 'scale(0.98)';
    track.style.transition = 'transform 0.1s ease';
    setTimeout(() => {
      track.style.transform = '';
      track.style.transition = '';
    }, 100);
    
    triggerContextMenu(track, event);
    
    // Add haptic feedback if available
    if (navigator.vibrate) {
      navigator.vibrate(50);
    }
  }, LONG_PRESS_DURATION);
}

/**
 * Handle touch end - cancel timer or allow normal click
 */
function handleTouchEnd(event) {
  if (longPressTimer) {
    clearTimeout(longPressTimer);
    longPressTimer = null;
  }
  
  // If it was a long press, prevent the normal click
  if (isLongPress) {
    event.preventDefault();
    event.stopPropagation();
    isLongPress = false;
  }
}

/**
 * Handle touch move - cancel long press if user moves finger
 */
function handleTouchMove(event) {
  if (longPressTimer) {
    clearTimeout(longPressTimer);
    longPressTimer = null;
  }
}

/**
 * Handle context menu - prevent default on mobile to avoid conflicts
 */
function handleContextMenu(event) {
  // On mobile, prevent the default context menu since we handle it via long press
  if (window.innerWidth <= 768 && 'ontouchstart' in window) {
    event.preventDefault();
  }
}

/**
 * Trigger context menu for a track element
 */
function triggerContextMenu(track, originalEvent) {
  console.log('📱 Long press detected, showing context menu');
  
  // Create a synthetic right-click event
  const rect = track.getBoundingClientRect();
  const contextMenuEvent = new MouseEvent('contextmenu', {
    bubbles: true,
    cancelable: true,
    clientX: rect.left + rect.width / 2,
    clientY: rect.top + rect.height / 2,
    button: 2
  });
  
  // Dispatch the event on the track element
  track.dispatchEvent(contextMenuEvent);
}

/**
 * Add long press support to a specific element
 */
export function addLongPressToElement(element) {
  if (!element || window.innerWidth > 768) return;
  
  let elementLongPressTimer = null;
  let elementIsLongPress = false;
  
  const touchStart = (event) => {
    elementIsLongPress = false;
    elementLongPressTimer = setTimeout(() => {
      elementIsLongPress = true;
      triggerContextMenu(element, event);
      if (navigator.vibrate) navigator.vibrate(50);
    }, LONG_PRESS_DURATION);
  };
  
  const touchEnd = (event) => {
    if (elementLongPressTimer) {
      clearTimeout(elementLongPressTimer);
      elementLongPressTimer = null;
    }
    if (elementIsLongPress) {
      event.preventDefault();
      event.stopPropagation();
      elementIsLongPress = false;
    }
  };
  
  const touchMove = () => {
    if (elementLongPressTimer) {
      clearTimeout(elementLongPressTimer);
      elementLongPressTimer = null;
    }
  };
  
  element.addEventListener('touchstart', touchStart, { passive: false });
  element.addEventListener('touchend', touchEnd, { passive: false });
  element.addEventListener('touchmove', touchMove, { passive: true });
  
  // Return cleanup function
  return () => {
    element.removeEventListener('touchstart', touchStart);
    element.removeEventListener('touchend', touchEnd);
    element.removeEventListener('touchmove', touchMove);
  };
}

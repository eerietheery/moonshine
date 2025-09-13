# Mobile UI Development TODO ### Album Art Masking
- [x] CSS mask or gradient overlay for 45° fade effect ✅
- [x] Position album art as background or masked element ✅
- [x] Ensure proper aspect ratio and sizing ✅
- [x] Test across different screen sizes ✅

### Typography Hierarchy
- [x] Large, bold song title (16-18px) ✅
- [x] Small artist name (12-13px, muted color) ✅
- [x] Album name with bullet separator ✅
- [x] Proper line heights and spacing ✅
- [x] Truncation for long titles ✅
## 🚨 High Priority Issues

### File Organization
- [x] **Split mobileUI.js** - Currently 522 lines, needs to be broken into smaller modules:
  - [x] `mobileNavigation.js` - Bottom nav, view switching ✅
  - [x] `mobilePlayer.js` - Mini player functionality ✅
  - [x] `mobileTrackList.js` - Track rendering and management ✅
  - [x] `mobileViews.js` - View mode handlers ✅
  - [x] `mobileUI.js` - Main coordinator and initialization ✅

### Critical Bugs
- [x] **Fix desktop restoration bug** - Going mobile → desktop ruins UI layout ✅
  - [x] Properly restore desktop toolbar state ✅
  - [x] Reset CSS classes and inline styles ✅
  - [x] Restore desktop track elements structure ✅
  - [x] Test resize edge cases ✅
  - [x] **Fix track click events after mobile-to-desktop resize** ✅
  - [x] **Fix mobile scrolling empty rows (VirtualList conflict)** ✅

### Mobile Track Table Redesign
- [x] **New visual design** - Masked album art with gradient fade ✅
  - [x] Album art aligned left with 45° fade-out mask ✅
  - [x] Large song title typography ✅
  - [x] Small artist name underneath title ✅
  - [x] Artist • Album format with separator ✅
  - [ ] Remove current mobile track structure, rebuild from scratch

## 🎨 Visual Design Implementation

### Album Art Masking
- [x] CSS mask or gradient overlay for 45° fade effect ✅
- [x] Position album art as background or masked element ✅
- [x] Ensure proper aspect ratio and sizing ✅
- [x] Test across different screen sizes ✅

### Typography Hierarchy
- [x] Large, bold song title (16-18px) ✅
- [x] Small artist name (12-13px, muted color) ✅
- [x] Album name with bullet separator ✅
- [x] Proper line heights and spacing ✅
- [x] Truncation for long titles ✅

### Layout Structure
- [x] Remove current `.track-content` approach ✅
- [x] Implement layered design (album art behind text) ✅
- [x] Proper touch targets (minimum 44px height) ✅
- [x] Smooth animations and transitions ✅

## 🔧 Technical Improvements

### Code Organization
- [ ] Extract mobile view detection logic
- [ ] Separate track creation from update logic
- [ ] Create reusable mobile components
- [ ] Add proper TypeScript types (future)

### State Management
- [x] **Fix mobile/desktop state transitions** ✅
- [x] **Preserve user context during view switches** ✅
- [ ] Handle orientation changes gracefully
- [ ] Add mobile state persistence

### Performance
- [x] **Optimize track list rendering for large libraries** ✅
- [x] **Fix mobile scrolling conflicts with VirtualList** ✅
- [x] **Improved mobile lazy loading system** ✅
- [ ] Implement virtual scrolling for mobile
- [ ] Lazy load album art images
- [ ] Reduce DOM manipulation overhead

## 🧪 Testing & Quality

### Cross-Device Testing
- [ ] Test on various mobile screen sizes
- [ ] Verify touch interactions work properly
- [ ] Test landscape/portrait orientation
- [ ] Validate accessibility compliance

### Edge Cases
- [ ] Empty library state
- [ ] Very long track/artist/album names
- [ ] Missing album art handling
- [ ] Network/loading states

### Integration Testing
- [ ] Ensure mobile UI works with all existing features
- [ ] Test playlist functionality in mobile
- [ ] Verify search works correctly
- [ ] Test queue management

## 📱 Feature Parity

### Mobile Navigation
- [ ] Artists view implementation
- [ ] Albums grid view
- [ ] Dedicated search interface
- [ ] Playlist management in mobile

### Mobile Player Features
- [ ] Expandable mini player
- [ ] Gesture controls (swipe, etc.)
- [ ] Background playback visualization
- [ ] Queue management from mobile

## 🚀 Future Enhancements

### Advanced Mobile Features
- [ ] Pull-to-refresh library
- [ ] Infinite scroll for large libraries
- [ ] Dark/light mode toggle
- [ ] Haptic feedback improvements

### Gestures & Interactions
- [ ] Swipe gestures for common actions
- [ ] Double-tap to play/favorite
- [ ] Pinch-to-zoom for album art
- [ ] Gesture customization

---

## 📋 Current Session Focus

1. **Split mobileUI.js into modules**
2. **Fix desktop restoration bug** 
3. **Redesign mobile track table with masked album art**
4. **Implement proper typography hierarchy**

---

## ✅ Completed
- [x] Basic mobile UI framework
- [x] Bottom navigation
- [x] Mini player
- [x] Long press gestures
- [x] Mobile CSS organization
- [x] Touch-friendly track menu

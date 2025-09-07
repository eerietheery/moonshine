/**
 * Mobile Views - Handle different mobile view modes (tracks, artists, albums, search)
 */

/**
 * Show all tracks view (default mobile view)
 */
export function showAllTracks() {
  console.log('📱 Showing all tracks view');
  
  // The existing track list should already be visible
  // Just ensure the correct state is set
  const musicTable = document.getElementById('music-table');
  const musicList = document.getElementById('music-list');
  
  if (musicTable) {
    musicTable.style.display = 'flex';
  }
  if (musicList) {
    musicList.style.display = 'block';
  }
}

/**
 * Show artists view (TODO: Implement artist grid)
 */
export function showArtistsView() {
  console.log('📱 Showing artists view (TODO)');
  
  // TODO: Implement artists grid view for mobile
  // This should show a grid of artist cards with album art collages
  // For now, just hide the track list and show a placeholder
  
  const musicTable = document.getElementById('music-table');
  if (musicTable) {
    // Hide the track table for now
    musicTable.style.display = 'none';
  }
  
  // TODO: Show artist grid container
  showComingSoonMessage('Artists view coming soon!');
}

/**
 * Show albums view (TODO: Implement album grid)
 */
export function showAlbumsView() {
  console.log('📱 Showing albums view (TODO)');
  
  // TODO: Implement albums grid view for mobile
  // This should show a grid of album cards with large album art
  // For now, just hide the track list and show a placeholder
  
  const musicTable = document.getElementById('music-table');
  if (musicTable) {
    // Hide the track table for now
    musicTable.style.display = 'none';
  }
  
  // TODO: Show album grid container
  showComingSoonMessage('Albums view coming soon!');
}

/**
 * Show search view (TODO: Implement mobile search interface)
 */
export function showSearchView() {
  console.log('📱 Showing search view (TODO)');
  
  // TODO: Implement dedicated mobile search interface
  // This should include a prominent search input and filtered results
  // For now, just focus the existing search input if available
  
  const searchInput = document.querySelector('input[type="search"], .search-input');
  if (searchInput) {
    searchInput.focus();
  }
  
  // TODO: Show mobile search container
  showComingSoonMessage('Enhanced mobile search coming soon!');
}

/**
 * Show a temporary "coming soon" message for unimplemented views
 */
function showComingSoonMessage(message) {
  // Remove any existing coming soon message
  const existingMessage = document.querySelector('.mobile-coming-soon');
  if (existingMessage) {
    existingMessage.remove();
  }
  
  // Create and show new message
  const messageDiv = document.createElement('div');
  messageDiv.className = 'mobile-coming-soon';
  messageDiv.style.cssText = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: var(--bg-color);
    color: var(--text-color);
    padding: 2rem;
    border-radius: 12px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
    text-align: center;
    font-size: 1.2rem;
    z-index: 1000;
    max-width: 80%;
  `;
  messageDiv.textContent = message;
  
  document.body.appendChild(messageDiv);
  
  // Auto-remove after 3 seconds
  setTimeout(() => {
    if (messageDiv.parentNode) {
      messageDiv.remove();
    }
  }, 3000);
}

/**
 * Mobile Artists View - Circular artist grid with filtering
 */

import { getAlbumArtUrl } from '../../utils/albumArtCache.js';

/**
 * Create and show artist grid with circular thumbnails
 */
export function showArtistGrid(container) {
  // Get artists data from state
  import('../shared/state.js').then(({ state }) => {
    import('../shared/filter.js').then(({ normalizeArtist }) => {
      const artists = getArtistsData(state.tracks, normalizeArtist);
      
      // Create content wrapper
      const wrapper = document.createElement('div');
      wrapper.style.cssText = `
        padding: 16px;
        overflow-y: auto;
        height: 100%;
      `;
      
      // Create grid
      const grid = document.createElement('div');
      grid.className = 'mobile-artist-grid';
      grid.style.cssText = `
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
        gap: 16px;
        padding-bottom: 80px;
      `;
      
      // Create artist cards
      artists.forEach(artist => {
        const card = createArtistCard(artist);
        grid.appendChild(card);
      });
      
      wrapper.appendChild(grid);
      container.appendChild(wrapper);
    });
  });
}

/**
 * Get unique artists from tracks with their first album art
 */
function getArtistsData(tracks, normalizeArtist) {
  const artistMap = new Map();
  
  for (const track of tracks) {
    const artistName = (track.tags?.artist) || 'Unknown Artist';
    const albumArt = getAlbumArtUrl(track);
    
    if (!artistMap.has(artistName)) {
      artistMap.set(artistName, {
        name: artistName,
        albumArt: albumArt,
        trackCount: 1,
        tracks: [track]
      });
    } else {
      const artist = artistMap.get(artistName);
      artist.trackCount++;
      artist.tracks.push(track);
      // Use the first non-default album art we find
      if (!artist.albumArt || artist.albumArt.includes('default-art.png')) {
        if (albumArt && !albumArt.includes('default-art.png')) {
          artist.albumArt = albumArt;
        }
      }
    }
  }
  
  return Array.from(artistMap.values()).sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Create a circular artist card
 */
function createArtistCard(artist) {
  const card = document.createElement('div');
  card.className = 'mobile-artist-card';
  card.style.cssText = `
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    cursor: pointer;
    transition: transform 0.2s ease;
  `;
  
  // Circular thumbnail
  const thumbnail = document.createElement('div');
  thumbnail.className = 'artist-thumbnail';
  thumbnail.style.cssText = `
    width: 80px;
    height: 80px;
    border-radius: 50%;
    background-image: url('${artist.albumArt || 'assets/images/default-art.png'}');
    background-size: cover;
    background-position: center;
    margin-bottom: 8px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
  `;
  
  // Artist name
  const name = document.createElement('div');
  name.className = 'artist-name';
  name.textContent = artist.name;
  name.style.cssText = `
    font-size: 0.9rem;
    font-weight: 500;
    color: var(--text-color);
    margin-bottom: 4px;
    word-wrap: break-word;
    line-height: 1.2;
  `;
  
  // Track count
  const count = document.createElement('div');
  count.className = 'artist-track-count';
  count.textContent = `${artist.trackCount} track${artist.trackCount !== 1 ? 's' : ''}`;
  count.style.cssText = `
    font-size: 0.75rem;
    color: var(--text-muted);
    opacity: 0.8;
  `;
  
  // Click handler
  card.addEventListener('click', () => {
    handleArtistClick(artist);
  });
  
  // Hover effect
  card.addEventListener('mouseenter', () => {
    card.style.transform = 'scale(1.05)';
  });
  card.addEventListener('mouseleave', () => {
    card.style.transform = 'scale(1)';
  });
  
  card.appendChild(thumbnail);
  card.appendChild(name);
  card.appendChild(count);
  
  return card;
}

/**
 * Handle artist card click - filter to show tracks by this artist
 */
function handleArtistClick(artist) {
  console.log(`📱 Artist clicked: ${artist.name}`);
  
  import('../shared/state.js').then(({ state, updateFilters, resetSidebarFilters }) => {
    // Reset filters first (matches desktop behavior)
    resetSidebarFilters();
    
    // Set artist filter
    state.activeArtist = artist.name;
    state.activeAlbum = null; // Clear album filter like desktop
    state.sidebarFilteringEnabled = true;
    
    // Clear text filter
    const filterInput = document.getElementById('filter');
    if (filterInput) filterInput.value = '';
    
    // Update filters
    updateFilters(filterInput, state.sidebarFilteringEnabled);
    
    // Switch to filtered tracks view with back button
    import('./mobileViews.js').then(({ showFilteredTracks }) => {
      showFilteredTracks('artist', artist.name, 'artists');
    });
  });
}
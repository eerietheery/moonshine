/**
 * Mobile Albums View - Rounded square album grid with filtering
 */

import { getAlbumArtUrl } from '../../utils/albumArtCache.js';

/**
 * Create and show album grid with rounded square thumbnails
 */
export function showAlbumGrid(container) {
  // Get albums data from state
  import('../shared/state.js').then(({ state }) => {
    const albums = getAlbumsData(state.tracks);
    
    // Create content wrapper
    const wrapper = document.createElement('div');
    wrapper.style.cssText = `
      padding: 16px;
      overflow-y: auto;
      height: 100%;
    `;
    
    // Create grid
    const grid = document.createElement('div');
    grid.className = 'mobile-album-grid';
    grid.style.cssText = `
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
      gap: 16px;
      padding-bottom: 80px;
    `;
    
    // Create album cards
    albums.forEach(album => {
      const card = createAlbumCard(album);
      grid.appendChild(card);
    });
    
    wrapper.appendChild(grid);
    container.appendChild(wrapper);
  });
}

/**
 * Get unique albums from tracks with their album art and metadata
 */
function getAlbumsData(tracks) {
  const albumMap = new Map();
  
  for (const track of tracks) {
    const albumName = (track.tags?.album) || 'Unknown Album';
    const artist = (track.tags?.artist) || 'Unknown Artist';
    const year = track.tags?.year || '';
    const albumArt = getAlbumArtUrl(track);
    
    if (!albumMap.has(albumName)) {
      albumMap.set(albumName, {
        name: albumName,
        artist: artist,
        year: year,
        albumArt: albumArt,
        trackCount: 1,
        tracks: [track]
      });
    } else {
      const album = albumMap.get(albumName);
      album.trackCount++;
      album.tracks.push(track);
      // Use the first non-default album art we find
      if (!album.albumArt || album.albumArt.includes('default-art.png')) {
        if (albumArt && !albumArt.includes('default-art.png')) {
          album.albumArt = albumArt;
        }
      }
      // Keep the first artist unless we find a different one (for Various Artists albums)
      if (artist !== album.artist && album.artist !== 'Various Artists') {
        album.artist = 'Various Artists';
      }
    }
  }
  
  return Array.from(albumMap.values()).sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Create a rounded square album card
 */
function createAlbumCard(album) {
  const card = document.createElement('div');
  card.className = 'mobile-album-card';
  card.style.cssText = `
    display: flex;
    flex-direction: column;
    cursor: pointer;
    transition: transform 0.2s ease;
    border-radius: 8px;
    padding: 8px;
  `;
  
  // Rounded square thumbnail
  const thumbnail = document.createElement('div');
  thumbnail.className = 'album-thumbnail';
  thumbnail.style.cssText = `
    width: 100%;
    aspect-ratio: 1;
    border-radius: 12px;
    background-image: url('${album.albumArt || 'assets/images/default-art.png'}');
    background-size: cover;
    background-position: center;
    margin-bottom: 8px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
  `;
  
  // Album info container
  const info = document.createElement('div');
  info.className = 'album-info';
  info.style.cssText = `
    text-align: left;
    overflow: hidden;
  `;
  
  // Album name
  const name = document.createElement('div');
  name.className = 'album-name';
  name.textContent = album.name;
  name.style.cssText = `
    font-size: 0.9rem;
    font-weight: 600;
    color: var(--text-color);
    margin-bottom: 2px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    line-height: 1.2;
  `;
  
  // Artist name
  const artist = document.createElement('div');
  artist.className = 'album-artist';
  artist.textContent = album.artist;
  artist.style.cssText = `
    font-size: 0.8rem;
    color: var(--text-muted);
    margin-bottom: 2px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  `;
  
  // Track count and year
  const meta = document.createElement('div');
  meta.className = 'album-meta';
  const yearText = album.year ? ` • ${album.year}` : '';
  meta.textContent = `${album.trackCount} track${album.trackCount !== 1 ? 's' : ''}${yearText}`;
  meta.style.cssText = `
    font-size: 0.75rem;
    color: var(--text-muted);
    opacity: 0.8;
  `;
  
  // Click handler
  card.addEventListener('click', () => {
    handleAlbumClick(album);
  });
  
  // Hover effect
  card.addEventListener('mouseenter', () => {
    card.style.transform = 'scale(1.02)';
    card.style.background = 'rgba(255, 255, 255, 0.05)';
  });
  card.addEventListener('mouseleave', () => {
    card.style.transform = 'scale(1)';
    card.style.background = 'transparent';
  });
  
  info.appendChild(name);
  info.appendChild(artist);
  info.appendChild(meta);
  
  card.appendChild(thumbnail);
  card.appendChild(info);
  
  return card;
}

/**
 * Handle album card click - filter to show tracks by this album
 */
function handleAlbumClick(album) {
  console.log(`📱 Album clicked: ${album.name} by ${album.artist}`);
  
  import('../shared/state.js').then(({ state, updateFilters, resetSidebarFilters }) => {
    // Reset filters first (matches desktop behavior)  
    resetSidebarFilters();
    
    // Set album filter
    state.activeAlbum = album.name;
    state.activeArtist = null; // Clear artist filter initially
    state.sidebarFilteringEnabled = true;
    
    // Clear text filter
    const filterInput = document.getElementById('filter');
    if (filterInput) filterInput.value = '';
    
    // Update filters
    updateFilters(filterInput, state.sidebarFilteringEnabled);
    
    // Switch to filtered tracks view with back button
    import('./mobileViews.js').then(({ showFilteredTracks }) => {
      showFilteredTracks('album', album.name, 'albums');
    });
  });
}
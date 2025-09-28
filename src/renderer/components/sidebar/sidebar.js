import { state, updateFilters } from '../shared/state.js';
import { createFilterItem } from '../ui/ui.js';
// Import from shared location after reorganization
import { normalizeArtist } from '../shared/filter.js';
import { getAlbumArtUrl } from '../../utils/albumArtCache.js';

/**
 * Get representative album art for an artist (from their first track)
 */
function getArtistAlbumArt(artistKey) {
    const track = state.tracks.find(t => {
        const rawArtist = (t.tags && t.tags.artist) || 'Unknown';
        if (state.explicitArtistNames) {
            return rawArtist === artistKey;
        } else {
            const norm = normalizeArtist(rawArtist);
            return norm === artistKey || rawArtist === artistKey;
        }
    });
    return track ? getAlbumArtUrl(track) : null;
}

/**
 * Get album art for a specific album (from any track in that album)
 */
function getAlbumArt(albumName) {
    const track = state.tracks.find(t => (t.tags && t.tags.album || 'Unknown') === albumName);
    return track ? getAlbumArtUrl(track) : null;
}

export function updateSidebarFilters(filterInput, artistList, albumList, renderList, sidebarFilteringEnabled = false) {
    const searchFilter = (filterInput && filterInput.value) ? filterInput.value.trim().toLowerCase() : '';

    // baseTracks: tracks matching the text search (if any)
    const baseTracks = searchFilter ? state.tracks.filter(t => {
        const tgs = t.tags || {};
        return (
            (tgs.artist && tgs.artist.toLowerCase().includes(searchFilter)) ||
            (tgs.album && tgs.album.toLowerCase().includes(searchFilter)) ||
            (tgs.title && tgs.title.toLowerCase().includes(searchFilter))
        );
    }) : state.tracks.slice();

    // Build artist keys/display map from full track list (preserve prior behavior)
    let artists = [];
    const artistDisplay = new Map(); // key -> display name
    if (state.explicitArtistNames) {
        const set = new Set(state.tracks.map(t => t.tags.artist || 'Unknown'));
        artists = Array.from(set).sort();
        artists.forEach(a => artistDisplay.set(a, a));
    } else {
        // normalized grouping
        const normMap = new Map();
        for (const t of state.tracks) {
            const raw = (t.tags && t.tags.artist) || 'Unknown';
            const norm = normalizeArtist(raw);
            if (!normMap.has(norm)) normMap.set(norm, raw);
        }
        artists = Array.from(normMap.keys()).sort();
        for (const k of artists) artistDisplay.set(k, normMap.get(k) || k);
    }

    // Prepare caches and maps for single-pass counting
    const normalizedCache = new Map(); // rawArtist -> normalized
    const artistCounts = new Map(); // key -> number
    const albumCounts = new Map(); // album -> number

    const activeArtist = state.activeArtist && state.activeArtist !== 'All' ? state.activeArtist : null;
    const activeAlbum = state.activeAlbum && state.activeAlbum !== 'All' ? state.activeAlbum : null;

    const artistMatchesActive = (rawArtist) => {
        if (!activeArtist) return true;
        if (state.explicitArtistNames) return rawArtist === activeArtist;
        const norm = normalizedCache.get(rawArtist) ?? normalizeArtist(rawArtist);
        if (!normalizedCache.has(rawArtist)) normalizedCache.set(rawArtist, norm);
        return norm === activeArtist || rawArtist === activeArtist;
    };

    // Initialize counts to zero for known artists/albums to keep order stable
    for (const k of artists) artistCounts.set(k, 0);
    const albumsList = Array.from(new Set(state.tracks.map(t => (t.tags && t.tags.album) || 'Unknown'))).sort();
    for (const a of albumsList) albumCounts.set(a, 0);

    // Single pass over baseTracks to populate counts (respecting active filters)
    for (const t of baseTracks) {
        const tgs = t.tags || {};
        const rawArtist = tgs.artist || 'Unknown';
        const album = tgs.album || 'Unknown';

        // Skip if activeAlbum is set and doesn't match
        if (activeAlbum && album !== activeAlbum) continue;

        // artist key depends on explicit flag
        let artistKey;
        if (state.explicitArtistNames) {
            artistKey = rawArtist;
        } else {
            let norm = normalizedCache.get(rawArtist);
            if (norm === undefined) { norm = normalizeArtist(rawArtist); normalizedCache.set(rawArtist, norm); }
            artistKey = norm;
        }

        // If activeArtist is set and doesn't match, still allow album count if album is in scope
        if (!artistMatchesActive(rawArtist)) {
            // only count albums (already checked activeAlbum), skip artist increment
        } else {
            artistCounts.set(artistKey, (artistCounts.get(artistKey) || 0) + 1);
        }

        // Album counting: consider activeArtist filter
        if (!activeArtist || (state.explicitArtistNames ? rawArtist === activeArtist : (normalizedCache.get(rawArtist) === activeArtist || rawArtist === activeArtist))) {
            albumCounts.set(album, (albumCounts.get(album) || 0) + 1);
        }
    }

    // Render artist list using DocumentFragment
    artistList.innerHTML = '';
    const aFrag = document.createDocumentFragment();
    const allArtistsCount = Array.from(artistCounts.values()).reduce((s, v) => s + v, 0);
    aFrag.appendChild(createFilterItem('All', allArtistsCount, !state.activeArtist));
    for (const key of artists) {
        const cnt = artistCounts.get(key) || 0;
        if (cnt > 0) {
            const display = artistDisplay.get(key) || key;
            const active = state.activeArtist === display || state.activeArtist === key;
            const albumArt = getArtistAlbumArt(key);
            aFrag.appendChild(createFilterItem(display, cnt, active, albumArt));
        }
    }
    artistList.appendChild(aFrag);

    // Render album list using DocumentFragment
    albumList.innerHTML = '';
    const alFrag = document.createDocumentFragment();
    const allAlbumsCount = Array.from(albumCounts.values()).reduce((s, v) => s + v, 0);
    alFrag.appendChild(createFilterItem('All', allAlbumsCount, !state.activeAlbum));
    for (const album of albumsList) {
        const cnt = albumCounts.get(album) || 0;
        if (cnt > 0) {
            const albumArt = getAlbumArt(album);
            alFrag.appendChild(createFilterItem(album, cnt, state.activeAlbum === album, albumArt));
        }
    }
    albumList.appendChild(alFrag);

    // Respect current mode for visibility; elements are toggled in UI events too
    if (state.sidebarMode === 'album') {
        artistList.style.display = 'none';
        albumList.style.display = '';
    } else {
        artistList.style.display = '';
        albumList.style.display = 'none';
    }
}

export function getGridTemplate(headers = ['title','artist','album','year','genre']) {
  // Prefer pixel-calculated template to avoid subpixel/fr rounding differences
  // Determine actions width by breakpoint
  const actionsWidthPx = window.innerWidth <= 700 ? 90 : window.innerWidth <= 768 ? 100 : 140;
  // Column weightings (same proportions as previous fr values)
  const weights = { title: 3, artist: 2, album: 2, year: 1, genre: 1, bitrate: 1 };

  // Try to compute based on available width of the music-table container
  try {
  const musicList = document.getElementById('music-list');
  const musicTable = document.getElementById('music-table');
  const containerWidth = (musicList && musicList.clientWidth) ? musicList.clientWidth : (musicTable && musicTable.clientWidth) ? musicTable.clientWidth : window.innerWidth;
    // Reserve actions column
    const available = Math.max(0, containerWidth - actionsWidthPx);
    // Sum weights for requested headers
    const headerWeights = headers.map(h => weights[h] || 1);
    const totalWeight = headerWeights.reduce((s, w) => s + w, 0);
    // Compute integer pixel sizes and distribute remainder
    const rawSizes = headerWeights.map(w => (available * w) / totalWeight);
    const minWidths = { title: 240, artist: 160, album: 160, year: 80, genre: 80, bitrate: 80 };
    const intSizes = rawSizes.map((n, idx) => {
      const h = headers[idx];
      const minW = minWidths[h] || 80;
      return Math.max(Math.floor(n), minW);
    });
    // Distribute leftover pixels to earliest columns
    let used = intSizes.reduce((s, v) => s + v, 0);
    let leftover = Math.round(available - used);
    for (let i = 0; leftover > 0 && i < intSizes.length; i++, leftover--) {
      intSizes[i] += 1;
    }
    const parts = intSizes.map(n => `${n}px`);
    parts.push(`${actionsWidthPx}px`);
    const total = intSizes.reduce((s, v) => s + v, 0) + actionsWidthPx;
    try {
      const musicTable2 = document.getElementById('music-table');
      if (musicTable2) {
        musicTable2.style.setProperty('--music-grid-min-width', `${total}px`);
        musicTable2.style.setProperty('--actions-width', `${actionsWidthPx}px`);
      }
    } catch (e) {
      /* ignore */
    }
    return parts.join(' ');
  } catch (err) {
    // Fallback to fr units if DOM unavailable
    const frMap = { title: '3fr', artist: '2fr', album: '2fr', year: '1fr', genre: '1fr', bitrate: '1fr' };
    const actionsWidth = actionsWidthPx + 'px';
    return headers.map(h => frMap[h] || '1fr').concat(actionsWidth).join(' ');
  }
}

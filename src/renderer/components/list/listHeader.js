// src/renderer/components/list/listHeader.js
import { state } from '../shared/state.js';
import { getGridTemplate, setMusicGridTemplate } from '../shared/layout.js';

function renderHeaderCells(headers) {
  const headerLabels = {
    title: 'Title',
    artist: 'Artist',
    album: 'Album',
    year: 'Year',
    genre: 'Genre',
    bitrate: 'Bit Rate'
  };
  return headers.map(h => {
    const isActive = state.sortBy === h;
    const arrow = isActive ? (state.sortOrder === 'asc' ? '↑' : '↓') : '';
    return `<div class="col-${h} sort-header${isActive ? ' active-sort' : ''}" tabindex="0" role="button" data-sort="${h}" title="Sort by ${headerLabels[h] || h}">${headerLabels[h] || h} <span class="sort-arrow">${arrow}</span><span class="col-resizer" data-resize="${h}"></span></div>`;
  }).join('') + '<div class="col-actions"></div>';
}

function setupColumnResizing(headerEl, headers) {
  try {
    const handles = headerEl.querySelectorAll('.col-resizer[data-resize]');
    let dragging = null;
    const minWidths = { title: 240, artist: 160, album: 160, year: 80, genre: 80, bitrate: 80 };
    const onMove = (e) => {
      if (!dragging) return;
      const dx = (e.touches ? e.touches[0].clientX : e.clientX) - dragging.startX;
      const next = Math.max(minWidths[dragging.key] || 80, Math.round(dragging.startW + dx));
      state.columnWidths = state.columnWidths || {};
      state.columnWidths[dragging.key] = next;
  const tpl = getGridTemplate(headers);
  setMusicGridTemplate(tpl);
  headerEl.style.gridTemplateColumns = tpl;
    };
    const onUp = () => {
      if (!dragging) return;
      dragging = null;
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      document.removeEventListener('touchmove', onMove);
      document.removeEventListener('touchend', onUp);
      try { window.etune?.updateConfig && window.etune.updateConfig({ columnWidths: state.columnWidths }); } catch (_) {}
    };
    handles.forEach(h => {
      const key = h.getAttribute('data-resize');
      h.addEventListener('mousedown', (e) => {
        e.preventDefault(); e.stopPropagation();
        const rect = h.parentElement.getBoundingClientRect();
        const startW = rect.width;
        dragging = { key, startX: e.clientX, startW };
        document.addEventListener('mousemove', onMove, { passive: false });
        document.addEventListener('mouseup', onUp, { passive: true });
      });
      h.addEventListener('touchstart', (e) => {
        const t = e.touches[0];
        const rect = h.parentElement.getBoundingClientRect();
        const startW = rect.width;
        dragging = { key, startX: t.clientX, startW };
        document.addEventListener('touchmove', onMove, { passive: false });
        document.addEventListener('touchend', onUp, { passive: true });
      }, { passive: true });
    });
  } catch (_) { /* noop */ }
}

function setupSorting(headerEl, headers, renderListCallback) {
  headers.forEach(h => {
    const cell = headerEl.querySelector(`[data-sort="${h}"]`);
    if (!cell) return;
    cell.addEventListener('click', () => {
      if (state.sortBy === h) {
        state.sortOrder = state.sortOrder === 'asc' ? 'desc' : 'asc';
      } else {
        state.sortBy = h;
        state.sortOrder = 'asc';
      }
      renderListCallback(document.getElementById('music-list'));
    });
    cell.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        cell.click();
      }
    });
  });
}

function syncHeaderScroll(headerEl) {
    queueMicrotask?.(() => {
        const listEl = document.getElementById('music-list');
        if (!listEl || !headerEl) return;
        const headerInner = headerEl.querySelector('.table-header-inner');
        
        const updateGridTemplate = () => {
          try {
            const currentHeaders = (state.listHeaders && state.listHeaders.length) ? state.listHeaders : ['title','artist','album','year','genre'];
            const newTemplate = getGridTemplate(currentHeaders);
            const musicTable = document.getElementById('music-table');
            setMusicGridTemplate(newTemplate);
          } catch (_) { /* noop */ }
        };
        
        const syncHeader = () => {
          const scrollOffset = listEl.scrollLeft || 0;
          if (headerInner) headerInner.style.setProperty('--header-offset', `${scrollOffset}px`);
        };
        
        updateGridTemplate();
        syncHeader();
        
        const resizeHandler = () => {
          updateGridTemplate();
          syncHeader();
        };
        
        listEl.addEventListener('scroll', syncHeader, { passive: true });
        window.addEventListener('resize', resizeHandler, { passive: true });
        
        if (listEl._headerSyncCleanup) listEl._headerSyncCleanup();
        listEl._headerSyncCleanup = () => {
          listEl.removeEventListener('scroll', syncHeader);
          window.removeEventListener('resize', resizeHandler);
        };
      });
}

export function renderListHeader(renderListCallback) {
  const headerEl = document.querySelector('#music-table .table-header');
  if (!headerEl || !state.tracks || !state.tracks.length) {
    if (headerEl) headerEl.classList.add('hidden');
    return;
  }

  headerEl.classList.remove('hidden');
  const headers = state.listHeaders && state.listHeaders.length ? state.listHeaders : ['title','artist','album','year','genre'];
  
  let headerInner = headerEl.querySelector('.table-header-inner');
  if (!headerInner) {
    headerInner = document.createElement('div');
    headerInner.className = 'table-header-inner';
    headerEl.appendChild(headerInner);
  }
  headerInner.innerHTML = renderHeaderCells(headers);

  const template = getGridTemplate(headers);
  setMusicGridTemplate(template);
  headerEl.style.gridTemplateColumns = template;

  syncHeaderScroll(headerEl);
  setupColumnResizing(headerEl, headers);
  setupSorting(headerEl, headers, renderListCallback);
}

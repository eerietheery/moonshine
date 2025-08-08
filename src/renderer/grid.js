import { renderGrid } from '../view.js';
import * as dom from './dom.js';

export function preloadGridView() {
  // No-op with new dynamic grid; keep function for compatibility
}

export function displayGridView() {
  renderGrid(dom.list);
  dom.listViewBtn.classList.remove('active');
  dom.gridViewBtn.classList.add('active');
}

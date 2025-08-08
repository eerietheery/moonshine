import { setupLibraryEventListeners } from './event/libraryEvents.js';
import { setupFilterEventListeners } from './event/filterEvents.js';
import { setupUiEventListeners } from './event/uiEvents.js';

export function setupEventListeners() {
  setupLibraryEventListeners();
  setupFilterEventListeners();
  setupUiEventListeners();
}
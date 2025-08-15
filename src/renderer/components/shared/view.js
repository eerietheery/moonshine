// List and grid rendering logic
// Orchestration for list and grid views
import { renderList } from '../list/listView.js';
import { renderGrid } from '../grid/gridView.js';
import { setupListEvents } from '../list/listEvents.js';
import { setupGridEvents } from '../grid/gridEvents.js';
import { state, updateFilters } from './state.js';
import { updateSidebarFilters } from '../sidebar/sidebar.js';

// Export the delegated functions
export { renderList, renderGrid, setupListEvents, setupGridEvents };

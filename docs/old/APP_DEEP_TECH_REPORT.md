# Moonshine App Deep Technical Analysis

## 1. Module-by-Module Breakdown

### Electron Shell
- **main.js**: Sets up IPC handlers for music directory scanning, config management, and platform path resolution. Launches the renderer and exposes APIs via preload.
- **preload.js**: Bridges secure IPC between renderer and main, exposing `window.etune` for music scanning, config, and platform queries.

### State Management (`src/state.js`)
- Central `state` object tracks:
  - `tracks`: All loaded music tracks (array of objects with tags, filePath, albumArtDataUrl).
  - `filteredTracks`: Subset of tracks after applying search, sidebar, and sort filters.
  - `queue`: Array of tracks queued for prioritized playback.
  - Playback state: `currentTrack`, `currentTrackIndex`, `isPlaying`, `isShuffle`, `playOrder`, `loopMode`.
  - UI state: `sortBy`, `sortOrder`, `activeArtist`, `activeAlbum`, `activeYear`, `sidebarMode`, `explicitArtistNames`, `themeStyle`.
  - Library directories: `libraryDirs` (persisted in config).
- Exports queue helpers (add, remove, move, clear), filter logic, and play order shuffling.

### UI & Rendering
- **ui.js**: Renders individual track rows, filter items, toast notifications. Handles click-to-play, click-to-filter, and queue-add actions. Responsive design adapts to window size.
- **view.js**: Orchestrates rendering of the main music table, including sorting, filtering, and batch updates. Handles album/artist card rendering and sidebar scroll-to-selection.
- **queue.js**: Renders queue panel, drag-and-drop reordering, remove buttons, and the ghost preview of upcoming tracks. Integrates with playback and state.
- **sidebar.js**: Renders artist/album filter lists, manages lumping toggle, and updates sidebar UI on filter changes.
- **renderer.js**: Entry point for renderer process, wires up event listeners, initializes state, and triggers initial scan/load.
- **dom.js**: Centralizes DOM element references for efficient access and manipulation.

### Playback Logic (`player.js`)
- Handles play/pause, next/previous, shuffle, loop, progress bar, and volume.
- Integrates queue logic: next/skip prioritizes queue, auto-removes played queue tracks, falls back to filteredTracks when queue is empty.
- Ensures currentTrackIndex is always aligned to filteredTracks for seamless transition.
- Handles loop modes (off, all, one) and shuffle via playOrder.
- Updates UI elements (album art, title, artist) and triggers re-rendering of music list and queue panel.

### Music Directory Loading (`library.js`)
- Scans directories for music files using platform APIs via IPC.
- Deduplicates tracks by filePath, updates state, and persists libraryDirs in config.
- Shows centered spinner overlay during loading, removed immediately after tracks are ready.
- Handles errors gracefully, displaying feedback in UI.

### Filtering & Sorting
- Search input filters tracks in real time using `filterTracks`.
- Sidebar filters (artist, album, year) update filteredTracks and UI.
- Sorting is managed via state and reflected in UI controls; sort logic is stable and efficient.
- Artist lumping toggle switches between explicit and grouped artist names.

### Theming & UX
- CSS variables and modules provide flat/gradient theming, responsive layout, and modern look.
- SVG icons for controls and spinner, with color and filter effects.
- Toast notifications for user feedback.
- Accessibility: keyboard navigation for filter items, buttons, and controls.

## 2. Data Flow & Event Handling
- **Initial Load**: Renderer triggers initialScan or loadMusic, which scans directories, updates state.tracks, and triggers filter/sort/render pipeline.
- **User Actions**: Adding/removing directories, filtering, sorting, queueing, and playback all update state and trigger corresponding UI updates.
- **Playback Events**: Audio events (ended, timeupdate, loadedmetadata) update UI and state, trigger queue logic, and refresh panels.
- **Queue Management**: Queue actions (add, remove, reorder) update state.queue and re-render queue panel and ghost preview.
- **Sidebar Filtering**: Clicking artist/album updates state, filteredTracks, and scrolls sidebar to selection.

## 3. Performance Considerations
- **Efficient Rendering**: Only visible tracks are rendered; batch DOM updates minimize reflows.
- **Deduplication**: Tracks are deduplicated by filePath to prevent duplicates on add/scan.
- **Queue & Table Sync**: Queue and filteredTracks are kept in sync for seamless playback transitions.
- **Spinner Overlay**: Spinner is lightweight and non-blocking, removed as soon as tracks are ready.

## 4. Edge Cases & Robustness
- **Empty Library**: App handles empty scans gracefully, shows feedback, and allows adding new directories.
- **Missing Metadata**: Tracks with missing tags fall back to file name and 'Unknown' labels.
- **Playback After Queue**: When queue is exhausted, playback continues in filteredTracks without looping or skipping.
- **Loop/Shuffle**: Loop modes and shuffle are robust to changes in filteredTracks and queue.
- **Drag-and-Drop**: Queue reordering is robust to edge cases (dragging to same position, out-of-bounds indices).

## 5. Extensibility & Future Enhancements
- **Modular Design**: New features (history, advanced filtering, playlist support) can be added with minimal impact.
- **IPC & Platform Integration**: Ready for deeper OS integration (notifications, media keys, etc).
- **UI Customization**: Theming and layout are easy to extend via CSS modules and variables.
- **Settings & Persistence**: User settings (theme, lumping, libraryDirs) are persisted and can be expanded.

## 6. Table Enumeration Deep Dive
- **Source**: `state.filteredTracks` is the canonical source for table rows.
- **Filtering**: Real-time search, sidebar filters, and sort order are applied before rendering.
- **Rendering**: Each track is rendered with album art, title, artist, album, year, genre, and queue/add controls.
- **Actions**: Row click plays track; queue-add button adds to queue; artist/album click filters and scrolls sidebar.
- **Performance**: Only visible rows are rendered; batch updates for large libraries.
- **Accessibility**: Keyboard navigation and ARIA roles for filter items and controls.

## 7. Summary
Moonshine is a robust, modular, and extensible music player app. Its architecture supports advanced queue logic, responsive UI, efficient table enumeration, and maintainable code. The app is well-positioned for future enhancements and platform integration.

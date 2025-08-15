# Moonshine App Launch & Library Search Deep Analysis

## 1. App Launch Sequence

- **Entry Point:** The app launches via Electron, loading `index.html` and bootstrapping the renderer process with `src/renderer.js`.
- **Initialization:** The renderer calls `initializeApp()` (in `app.js`), which:
  - Loads user configuration (library directories, favorites, UI state) from persistent storage via `window.etune`.
  - Sets up UI event listeners, player controls, and queue panel.
  - Determines whether to load remembered library directories or perform an initial scan.

## 2. Library Search & Loading

- **Remembered Directories:**
  - If `state.libraryDirs` contains paths, each is loaded via `loadMusic(dir)` (in `library.js`).
  - For each directory:
    - `showSpinner(true)` displays a loading spinner.
    - `window.etune.scanMusic(dir)` scans for music files and extracts metadata.
    - Tracks are filtered to exclude those with errors or all "Unknown" tags.
    - Valid tracks are added to `state.tracks`.
    - UI filters and sidebar lists are updated.
    - Spinner is hidden after loading.

- **Initial Scan:**
  - If no directories are remembered, `initialScan()` is called.
  - Attempts to scan all default music locations via `window.etune.initialScan()`.
  - If no tracks found, falls back to `window.etune.getDefaultMusicPath()` and loads that directory.

## 3. List Population & Filtering

- **Track List Rendering:**
  - `renderList(list)` is called to populate the main track list.
  - Tracks are sorted by the current sort column and order (`state.sortBy`, `state.sortOrder`).
  - Filtering is applied based on search input and sidebar selections (artist, album, year).
  - Only tracks matching all active filters are shown in `state.filteredTracks`.
  - The list is rendered using a virtualized list for performance.

- **Sidebar & Search:**
  - Sidebar lists (artists, albums) are built from the loaded tracks.
  - Clicking a sidebar filter or entering a search term updates `state.filteredTracks` and re-renders the list.

## 4. Persistence & State

- **Config Persistence:**
  - User actions (adding/removing libraries, favoriting tracks, toggling UI options) are persisted via `window.etune.updateConfig()`.
  - On launch, config is loaded and applied to restore previous state.

## 5. Error Handling & Edge Cases

- **Error States:**
  - If a scan fails or no valid tracks are found, the UI displays a message and spinner is hidden.
  - Tracks with missing or invalid metadata are excluded from the list.

## 6. Summary

The Moonshine app launch process is robust, handling both remembered and new libraries, scanning for music, filtering and sorting tracks, and updating the UI responsively. Persistent config ensures user preferences and favorites are restored across launches. The virtualized list and sidebar filtering provide efficient navigation of large libraries.

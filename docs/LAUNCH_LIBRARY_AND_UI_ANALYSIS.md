# Moonshine App Launch, Library Search, and UI Rendering Deep Analysis

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

## 3. UI Rendering & Population

- **HTML Structure:**
  - The main UI is defined in `index.html`:
    - Sidebar with filter/search, artist/album toggles, and lists.
    - Toolbar with view controls, sort controls, queue, favorites, and settings buttons.
    - Main content area with a table header and a virtualized track list (`#music-list`).
    - Player bar and queue panel.

- **Dynamic UI Drawing:**
  - **Track List:**
    - `renderList(list)` (in `view.js`) builds the track list using a virtualized list for performance.
    - Each track row is created by `createTrackElement()` (in `ui.js`), which:
      - Dynamically generates cells for selected headers (title, artist, album, year, genre, bitrate).
      - Adds interactive elements (favorite, queue buttons, clickable artist/album links).
      - Applies styling and event handlers for filtering, favoriting, and queueing.
    - The grid layout and column widths are set dynamically to match selected headers.
    - The table header row is also dynamically populated and styled, with sorting controls and active sort indicators.

  - **Sidebar:**
    - Artist and album lists are built from loaded tracks, with filter counts and active state.
    - Clicking a filter item updates the main list and sidebar state.

  - **Toolbar & Controls:**
    - View mode (list/grid), sorting, queue, favorites, and settings are all interactive and update the UI in real time.
    - Favorites toggle filters the main list to only show favorited tracks.

  - **Player & Queue:**
    - The player bar updates with the current track, album art, and controls.
    - The queue panel displays upcoming tracks and allows reordering.

- **Styling:**
  - CSS files (`global.css`, `musictable.css`, etc.) define the layout, colors, transitions, and responsive behavior.
  - Dynamic classes and inline styles are applied for active states, hover effects, and transitions.

## 4. List Population & Filtering

- **Track List Rendering:**
  - Tracks are sorted by the current sort column and order (`state.sortBy`, `state.sortOrder`).
  - Filtering is applied based on search input and sidebar selections (artist, album, year).
  - Only tracks matching all active filters are shown in `state.filteredTracks`.
  - The list is rendered using a virtualized list for performance.

- **Sidebar & Search:**
  - Sidebar lists (artists, albums) are built from the loaded tracks.
  - Clicking a sidebar filter or entering a search term updates `state.filteredTracks` and re-renders the list.

## 5. Persistence & State

- **Config Persistence:**
  - User actions (adding/removing libraries, favoriting tracks, toggling UI options) are persisted via `window.etune.updateConfig()`.
  - On launch, config is loaded and applied to restore previous state.

## 6. Error Handling & Edge Cases

- **Error States:**
  - If a scan fails or no valid tracks are found, the UI displays a message and spinner is hidden.
  - Tracks with missing or invalid metadata are excluded from the list.

## 7. Summary

The Moonshine app launch process is robust, handling both remembered and new libraries, scanning for music, filtering and sorting tracks, and updating the UI responsively. Persistent config ensures user preferences and favorites are restored across launches. The virtualized list and sidebar filtering provide efficient navigation of large libraries. The UI is dynamically drawn and updated based on state, user actions, and configuration, ensuring a responsive and interactive experience.

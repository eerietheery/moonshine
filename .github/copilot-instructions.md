# Copilot Instructions for Moonshine

## Project Overview
Moonshine is an offline, local music library player and viewer built with Electron and Node.js. It features a familiar interface for browsing, filtering, and playing tracks, albums, artists, genres, and playlists. Users can mark favorites, queue songs/albums, and import/export M3U playlists.

## Architecture & Major Components
- **Electron Main/Renderer Split:**
  - `src/main/`: Electron main process (app config, preload, entry).
  - `src/renderer/`: Renderer process (UI, event handling, state, components).
- **UI Components:**
  - Organized by feature: `components/list/`, `components/grid/`, `components/player/`, `components/playlist/`, `components/sidebar/`, etc.
  - Shared utilities in `components/shared/` and `components/ui/`.
- **State Management:**
  - Centralized in `src/renderer/components/shared/state.js`.
  - UI and data flows are driven by `state` and event listeners.
- **Playlist & Library Logic:**
  - Playlists: `components/playlist/` (browse, create, edit, export/import M3U).
  - Library: Filtering, sorting, and grouping in `list/`, `grid/`, and `shared/`.

## Developer Workflows
- **Build & Run:**
  - Install dependencies: `npm install`
  - Start app: `npm start`
- **Debugging:**
  - Use Electron/Chromium dev tools in the running app.
  - Main/renderer logs are separate; check both for issues.
- **Hot Reload:**
  - Not enabled by default; restart app after code changes.

## Project-Specific Patterns & Conventions
- **Header Rendering:**
  - Table headers are reused and repopulated, not destroyed/recreated.
  - Grid/list templates are set via CSS variables (`--music-grid-template`).
  - Playlist browse uses a 4-column template; main views use dynamic templates.
- **Component Communication:**
  - UI events are wired in `event/uiEvents.js` and `list/listEvents.js`.
  - State changes trigger re-renders; avoid direct DOM manipulation outside components.
- **Responsive Layouts:**
  - Grid and list views use CSS grid and variables for alignment.
  - Actions column width is set via `--actions-width`.
- **Playlist Handling:**
  - Playlists and genres are unified in browse logic.
  - Import/export uses M3U format via `utils/exportM3U.js` and `utils/importM3U.js`.
- **Legacy Code:**
  - Deprecated playlist header logic is hidden; only standard table header is used.

## Integration Points & External Dependencies
- **Electron:**
  - Main/renderer split; preload scripts for IPC.
- **Node.js:**
  - Used for filesystem access, playlist import/export.
- **No external API dependencies.**

## Key Files & Directories
- `src/main/` — Electron main process
- `src/renderer/` — UI and app logic
- `assets/styles/` — CSS for grid, table, player, sidebar, themes
- `README.md` — Project overview and build instructions

## Other Notes
- Keep files relatively modular and don't let them exceed ~300 lines.
- Follow existing patterns for state management and event handling.
- 

---

For questions about Moonshine's architecture, UI patterns, or debugging, see the referenced files or ask for a deep dive on any component.

# Moonshine App Technical Analysis & Architecture Report

## Overview
Moonshine is a modular Electron-based music library and player app. It features robust music directory scanning, queue management, theming, artist lumping, and a modern UI with responsive controls and feedback. The codebase is organized for maintainability and extensibility, with clear separation of concerns across modules.

## Architecture
- **Electron Shell**: `main.js`, `preload.js` handle IPC, config, and platform path logic.
- **Renderer Layer**: Modular JS in `src/renderer/` and `src/` for UI, state, playback, filtering, sidebar, and queue.
- **State Management**: Centralized in `state.js`, tracking tracks, filteredTracks, queue, playback state, filters, theme, and user settings.
- **UI Components**: Rendered via DOM manipulation in `ui.js`, `view.js`, and `queue.js`. CSS modules provide theming and responsive layout.

## Table Enumeration Logic
- **Music Table**: The main song list is rendered in `view.js` and `ui.js`.
  - Tracks are enumerated from `state.filteredTracks`, which is derived from `state.tracks` and filtered by search, sidebar, and sort settings.
  - Each track is rendered as a row with album art, title, artist, album, year, genre, and queue/add controls.
  - Click-to-play, click-to-filter (artist/album), and queue-add are handled per row.
  - Sorting is managed via `sortBy` and `sortOrder` in state, with UI controls in the toolbar.
  - Responsive design adapts columns and layout for different screen sizes.

## Queue Management
- **Queue Panel**: Rendered in `queue.js`, with drag-and-drop reordering, remove, and ghost preview of upcoming tracks after queue.
- **Playback Integration**: `player.js` prioritizes queue tracks for next/skip, auto-removes played queue tracks, and falls back to library when queue is exhausted.
- **Ghost Preview**: Shows up to 10 upcoming tracks (queue remainder + library fallback) in a dimmed style.

## Music Directory Loading
- **Initial Scan**: On launch, scans remembered directories or defaults, shows centered spinner overlay until tracks are loaded.
- **Add/Remove**: Users can add/remove directories; app reloads and updates state and config accordingly.
- **Spinner**: SVG spinner is centered in music area during loading, removed immediately after tracks are ready.

## Filtering & Sidebar
- **Sidebar**: Artist/album filter lists, with lumping toggle for explicit names. Clicking filters updates `filteredTracks` and scrolls sidebar to selection.
- **Search**: Text input filters tracks in real time.
- **Settings Modal**: Toggles for artist lumping, theme style, and library management.

## Playback Controls
- **Player Bar**: Fixed at bottom, with play/pause, next/previous, shuffle, loop, progress bar, and volume slider.
- **Loop/Shuffle**: Loop modes (off, all, one) and shuffle are managed in state and reflected in UI.
- **Current Track**: Info and album art update dynamically; click-to-filter for artist/album.

## Theming & UX
- **CSS Variables**: Theming via CSS variables, with flat/gradient toggle.
- **SVG Icons**: Used for controls and spinner.
- **Toast Notifications**: Lightweight feedback for actions (queue add, errors, etc).
- **Responsive Design**: Adapts to window size and device.

## Error Handling & Robustness
- **Graceful Fallbacks**: Handles empty library, scan errors, and missing metadata.
- **No Hardcoded Paths**: Uses platform-safe paths and config.
- **Modularization**: Each feature is encapsulated for maintainability.

## Extensibility
- **Modular JS**: Easy to add new features (e.g., history, more queue actions, advanced filtering).
- **CSS/HTML Structure**: Clean separation for UI changes.
- **IPC/Config**: Ready for more platform integration.

## Summary
Moonshine is a robust, user-friendly, and extensible music player app. Its architecture supports advanced queue logic, responsive UI, and maintainable code. Table enumeration is efficient and flexible, supporting real-time filtering, sorting, and user actions. The app is well-positioned for future enhancements.

# Moonshine Changelog

## Changes since version 0.9b

### Features Added
- **UI Refactoring:** Split monolithic `ui.js` into modular components for maintainability.
- **Default Music Directory:** App now loads the OS default music folder using `app.getPath('music')` (cross-platform).
- **Sidebar Filtering:** Added sidebar filtering toggle and logic for artist/album.
- **Loop Modes:** Introduced loop all and loop one (track) modes, with clear UI indication (superscript “1”).
- **Shuffle & Loop SVG Icons:** Replaced emoji icons with crisp SVGs for shuffle and loop controls.
- **Clickable Artist/Album:** In list view, artist and album names are now clickable to filter tracks.
- **Grid View Filter Reset:** Switching to grid view clears active artist/album filters.
- **Themed Progress/Volume Bars:** Progress and volume bars now use the current theme color.
- **Toast Notifications:** Improved toast system for queue actions and errors.
- **System Path Variables:** All music path logic now uses variables, not hardcoded user paths.
- **Artist Lumping:** Tracks with similar artist strings are grouped together for cleaner browsing.
- **“All” Filter Reset:** Selecting “All” in artists or albums resets both filters.
- **Improved Error Handling:** More robust error messages for music loading and scanning.

### Bugs Fixed
- **ReferenceError in UI:** Fixed function order in `ui.js` (e.g., `showToast`).
- **Path Format Issues:** Replaced hardcoded slashes with platform-safe path logic.
- **Initial Scan Blank List:** Ensured default music folder loads if no user directories are configured.
- **SVG Icon Rendering:** Fixed scrambled SVGs by switching to mask-based icons.
- **Filter Logic:** Fixed filter reset and sidebar toggling bugs.

### Other Improvements
- **Code Modularization:** Refactored renderer logic for easier maintenance.
- **Cross-Platform Support:** All user-facing paths and prompts are now generic and OS-safe.
- **Accessibility:** Added keyboard support for clickable artist/album elements.
- **UI Consistency:** Unified hover, glow, and highlight effects to match
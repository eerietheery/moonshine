# Analysis: Main List Separators and Alignment with Header

Date: 2025-08-28

## Context
The main list recently gained vertical separators between columns. Request is to roll back those separators and better match the music table rows with the header styling.

## Findings
- The vertical separators are not DOM elements; they are CSS borders.
- Header separators:
  - Defined in `assets/styles/musictable.css` on the rule:
    - `.col-title, .col-artist, .col-album, .col-year, .col-genre { border-right: 1px solid #282828; }`
- Row separators:
  - Also in `assets/styles/musictable.css`:
    - `.track-title, .track-artist, .track-album, .track-year, .track-genre { border-right: 1px solid #282828; }`
- Horizontal row dividers are separate and kept:
  - `.track { border-bottom: 1px solid var(--border); }`
- Grid alignment between header and rows is handled via a shared CSS variable and JS:
  - `grid-template-columns: var(--music-grid-template, ...)` set on `.table-header` and `.track`.
  - JS sets `--music-grid-template` on `#music-table` in `src/renderer/components/list/listView.js` using `getGridTemplate(headers)`. Scroll sync is also handled there.

## Changes Applied
- Removed vertical separators by setting border-right to `none` for both header cells and row cells in `assets/styles/musictable.css`:
  - `.col-title, .col-artist, .col-album, .col-year, .col-genre { border-right: none; }`
  - `.track-title, .track-artist, .track-album, .track-year, .track-genre { border-right: none; }`
- Kept `.track-genre { border-right: none; }` for clarity (no functional change).

## Rationale
- This restores a cleaner look and removes unnecessary visual noise introduced by separators.
- Header and rows remain aligned since the grid templates are unchanged and shared.
- Sticky actions column and responsive behaviors are unaffected.

## Verification Steps
1. Launch the app.
2. Ensure header and rows have no vertical borders between columns.
3. Confirm header and rows still align horizontally while scrolling horizontally.
4. Check responsive breakpoints (<920px and <768px) for correct grid behavior and no stray borders.
5. Switch to Playlist Browse mode and back to verify header visibility logic still works.

## Possible Follow-ups
- If extra delineation is desired without lines, consider subtle background striping on hover/selected rows only.
- Optionally add slight padding tweaks to header and cells for visual balance after removing dividers.


# Moonshine Startup Performance Plan (Dec 2025)

## What we observed

From your DevTools logs:

- IndexedDB is supported and opens successfully (partition `persist:moonshine`).
- Cache count is `0` on this run, so it performs a full scan, then caches `2212` tracks.
- Immediately after scan, the renderer builds the album art cache for ~2210 tracks.

Separately, code inspection shows the main process currently **awaits a full scan before creating the window**, which can delay the first paint by the entire scan duration.

## Ranked likely causes of slow startup

### 1) Main process blocks window creation on a full scan (highest impact)

- Location: `src/main/main.js`
- Behavior: `initialScanCache = await scanMusic(dirs[0]);` runs **before** `createWindow()`.
- Effect: you don’t even get a window until scan completes.

### 2) Cache persistence is undermined by incremental-scan stub (very high impact)

- Location: `src/renderer/utils/cachedMusicScanner.js`
- Behavior on cache hit: schedules `incrementalScan()` after 100ms.
- Problem: `getFileSystemPaths()` is not implemented and returns `[]`.
- Effect: incremental scan interprets *all cached tracks* as deleted and calls `cache.deleteMany(...)`, wiping the cache after it loads.

This matches the symptom “DB builds, but restart fails to load (or becomes empty again)”.

### 3) Heavy scan payload (metadata + embedded album art) passed over IPC

- Location: `src/music.js` creates `albumArtDataUrl` (base64) and returns it for most tracks.
- You measured: ~2112/2212 tracks contain embedded art.
- Effect: big structured-clone payload main → renderer + memory pressure.

### 4) Renderer does synchronous album art processing on all tracks

- Location: `src/renderer/utils/albumArtCache.js`
- Behavior: loops every track, converts base64 to Blob URLs via `atob` and Uint8Array loops, and deletes the base64.
- Effect: long tasks on UI thread right after scan/cached load.

### 5) Cache isn’t keyed per-directory

- Location: `src/renderer/utils/cachedMusicScanner.js`
- Behavior: on cache hit it calls `cache.getAllTracks()` (global), not “tracks for this dir”.
- Effect: larger-than-needed loads and potential confusion when users have multiple libraryDirs.

## Implementation plan (we will start with the 80/20 fixes)

### Phase A — Make startup feel instant

1. Create the BrowserWindow immediately on `app.whenReady()`.
	- Keep scanning in the background (renderer-triggered) instead of blocking the window.
	- Keep `initialScanCache` optional; don’t await it before showing UI.

2. Stop the cache from being wiped on restart.
	- Disable incremental scanning until `getFileSystemPaths()` is implemented via IPC.
	- Or guard: if filesystem paths are unavailable, do **no deletions**.

### Phase B — Reduce heavy work per launch

3. Reduce IPC payload size.
	- Prefer not returning base64 album art for every track during scan.
	- Load art lazily or via a secondary request.

4. Make album art processing incremental.
	- Avoid processing 2000+ tracks’ art on first render; do it in chunks (idle time) or per viewport.

### Phase C — Make cache actually “smart”

5. Key IndexedDB cache by `dirPath` (or library id) and track real `mtime/size` from main.
	- Then incremental scan can correctly identify adds/modifies/deletes.

## Next action

Start Phase A: remove main-process pre-window scan blocking + prevent cache wipe-on-restart.


# Updater plan — minimal GitHub Releases updater

Target: implement a small, robust updater that lets Moonshine check GitHub Releases, download the latest Windows build (installer/executable), and let the user install it with minimal friction.

This document contains:
- concise analysis of the current project state relevant to updates
- design and security considerations
- an explicit, minimal implementation plan (main + renderer changes)
- IPC contract and data shapes
- error cases and testing plan
- rollout steps and CI recommendations

---

## 1) Goals (explicit)
- Provide a light-weight, user-initiated (and optionally auto-check) update flow that downloads the latest GitHub Release artifact and offers to run the installer.
- Keep implementation small and dependency-free where possible (no heavy auto-update libraries if not required).
- Use GitHub Releases as the single source of truth for builds.
- Preserve security best practices: verify checksums or rely on code-signed installers.

## 2) Constraints & assumptions
- App is packaged with `electron-builder` and currently targets Windows NSIS and a portable target (see `package.json`).
- Current `productName` is `Moonshine`, and package.json `version` is `1.1.2`.
- Minimal approach: download and run the official installer from GitHub Releases rather than attempt in-place patching.
- We'll assume releases will include clearly named assets (e.g. `moonshine-1.1.3-setup-x64.exe` or `Moonshine 1.1.3.exe`) or a small JSON/manifest asset describing filenames.
- We aim to avoid adding heavy native modules; implement using Node's built-in `https`, `fs` and `child_process`.

## 3) Why not `electron-updater` (short)
- `electron-updater` (and `electron-builder`’s `autoUpdater`) are full-featured and integrate with GitHub Releases, providing delta updates and robust install flows — if you want deeper automation, use these.
- Minimal approach tradeoffs: `electron-updater` does more automatically (and handles background installs); it also requires extra configuration and is a heavier dependency. For a minimal, explicit, auditable flow we implement a small custom updater that downloads a release asset and spawns it.
- Recommendation: Start minimal (this plan). If you later want seamless auto-install, switch to `electron-updater` and GitHub release artifacts with `nsis-web` or the recommended `nsis` uploads.

## 4) High-level flow (minimal)
1. Renderer requests `check-for-updates` via IPC (user clicks "Check for updates")
2. Main process checks GitHub Releases API: `GET https://api.github.com/repos/<owner>/<repo>/releases/latest`
3. Compare `latest.tag_name` / `latest.name` to current app version (from package.json / app.getVersion()).
4. If newer, find release asset for platform/arch (e.g. `win-x64`), read `browser_download_url`.
5. Ask user to Download or Skip (renderer modal). If Download:
   - main process downloads to a safe temp path, streaming with progress.
   - report progress via `updater:download-progress` IPC events.
6. On completion, compute/verify checksum if available (recommend to publish `.sha256` or JSON manifest). If verification passes (or no verification configured), show "Install now".
7. If user chooses Install:
   - spawn installer with necessary arguments (silent or interactive) using `child_process.spawn` and detach if appropriate; optionally pass `--updated` flag to detect run after install.
   - quit the app if installer requires it.
8. Installer runs and upgrades the app as normal (NSIS installer will handle replacement). Optionally, installer can restart app.

## 5) IPC contract / API (minimal)
- Main -> Renderer Events
  - `updater:available` { latestVersion, notes, assets: [{name, size, url}], isOlder: true }
  - `updater:not-available` {}
  - `updater:error` { message }
  - `updater:download-progress` { percent: 0-100, transferred, total }
  - `updater:download-complete` { path, asset }
- Renderer -> Main Calls (ipc.invoke)
  - `updater:check` -> {status: 'ok'|'error', available: bool, latestVersion, assets}
  - `updater:download` (assetUrl) -> {status:'started'} (progress via events)
  - `updater:install` (installerPath) -> {status:'ok'|'error'}

Data shapes are JSON-serializable and intentionally simple.

## 6) Files to add / edit (implementation plan)
1. `src/main/updater.js` (new)
   - Exposes functions: `checkForUpdates({ owner, repo })`, `downloadAsset(url, dest, onProgress)`, `installAsset(path)` and registers IPC handlers (or exported functions for `main.js` to call).
   - Uses built-in `https` and `fs` streams; optionally `stream.pipeline` for safety.
   - Emits status through `ipcMain` events to the renderer (via `mainWindow.webContents.send`).
2. Edit `src/main/main.js` (small)
   - require and initialize the updater module (pass mainWindow or provide registration callback after window created).
   - Add handlers for `ipcMain.handle('updater:check', ...)` and others forwarding to `updater.js` functions.
3. Renderer UI: `src/renderer/ui/updaterUI.js` (new) and small modal components
   - Add a simple "Check for updates" button in settings or About page. When clicked, call `ipcRenderer.invoke('updater:check')` and show results.
   - When downloading, show a progress modal using existing modal patterns (e.g. `showModal` in `src/renderer/ui/`), subscribing to `updater:download-progress` and `updater:download-complete` events.
4. Optionally add `assets/updater/sha256-manifest.json` generation step in CI or publish it as a release asset.

## 7) Implementation details and code sketches (main-process)
- checkForUpdates(owner, repo):
  - Do HTTP GET on GitHub API: `/repos/{owner}/{repo}/releases/latest`.
  - Parse `tag_name` (or `name`) and `assets`.
  - For each `asset`, match by filename or by `content_type`.
  - Return object with `latestVersion`, `assets`.

- downloadAsset(url, dest):
  - Use `https.get` or `https.request` to stream the file to `fs.createWriteStream(dest)`.
  - If response includes `content-length`, compute percent.
  - Use back-off and retry (simple: 2 retries) for network errors.

- installAsset(path):
  - Use `child_process.spawn(path, args, { detached: true, stdio: 'ignore' })` on Windows.
  - On Windows NSIS installer, default interactive install is acceptable; to do silent install you can pass NSIS args (depends on your script).
  - If spawn succeeds, call `app.quit()` (or ask user permission first).

Security note: prefer delivering a small `.sha256` text file or JSON with checksums as part of each release. After download compute SHA256 and compare before running the installer. If you plan to code-sign the installer, the risk is lower.

## 8) Release naming / recommended artifact names
- To keep detection simple, publish a predictable filename pattern on Releases for Windows x64: `moonshine-<semver>-win-x64-setup.exe` or `moonshine-<semver>-portable-x64.exe`.
- Or publish a tiny `release-manifest.json` as an asset containing `files: [{ name, arch, url, sha256 }]` so the app doesn't need to parse fuzzy names.

## 9) Edge cases and errors
- No network / timeouts: surface user-friendly message and retry.
- GitHub rate-limiting (unauthenticated): document the possibility; for frequent checks consider using a small GitHub token (avoid embedding secrets) or cache results server-side.
- Partial downloads: save to `.part` and resume/retry if Range-supported (advanced). For minimal approach, delete partials on failure and restart download.
- Installer blocked by antivirus or OS permission: surface instructions to the user.
- Arch/OS mismatch: verify `process.platform` and `process.arch` before offering assets.

## 10) Testing steps (local)
1. Create a GitHub test release in a test repo with a small dummy file named according to your naming pattern.
2. Temporarily modify `src/main/updater.js` to point at the test repo.
3. Run the app; click Check for updates; observe the `updater:available` event and test download and install flows.
4. Test checksum verification by uploading both correct and incorrect `.sha256` files.

## 11) CI & release workflow recommendations (small)
- Use GitHub Actions (or your CI) to build and upload release assets (electon-builder's GitHub release publisher or `actions/upload-release-asset`).
- Publish a checksum file alongside the installer (e.g. `moonshine-1.2.0-setup-x64.exe.sha256`) or a single JSON manifest.
- Optionally, upload a small `RELEASES.json` or `release-manifest.json` as an explicit manifest for the app to consume.

## 12) Minimal timeline & task breakdown (estimate)
- Phase A: Plan + design (this doc) — Done
- Phase B: Implement main-process updater and IPC (1–3 hours)
  - `src/main/updater.js` (download, check, verify)
  - integrate with `src/main/main.js` (register IPC handlers)
- Phase C: Add renderer UI + small modal (1–2 hours)
- Phase D: CI: ensure releases include consistent filenames and checksums (1–2 hours)
- Phase E: Testing & polish (1–2 hours)
Total: ~4–9 hours depending on polish (checksums, resume, auto-checks).

## 13) Minimal example: steps to implement now (concrete)
1. Add `src/main/updater.js` (I can create this with a lightweight implementation that:
   - checks GitHub Releases
   - chooses appropriate asset
   - downloads file to `os.tmpdir()` with progress
   - exposes `ipcMain.handle('updater:check')`, `ipcMain.handle('updater:download')` and sends `mainWindow.webContents.send('updater:download-progress', ...)` events)
2. Wire `main.js` to import and initialize updater after `createWindow()` so `mainWindow` reference is available.
3. Add a small `src/renderer/ui/about-updater.js` that talks to the IPC and shows simple modals.
4. Publish a test release to GitHub and test the flow.

If you want, I can implement the initial `updater.js` and IPC wiring now (minimal, no checksum verification) so you can test downloads quickly. After that we can iterate on verification and UX.

---

Notes
- This minimal approach keeps control in your hands and is easy to audit. It avoids a big dependency. If you want automated delta updates or platform parity with macOS, consider switching to `electron-updater` later.
- On Windows, running an installer is the most robust path. Replacing the running executable in-place is fragile.

---

If you'd like me to proceed, I can:
- implement `src/main/updater.js` and wire `main.js` (quick download-only prototype), and
- add a small renderer dialog for "Check for updates".

Tell me which step to run next (implement now or just keep the plan).

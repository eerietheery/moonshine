# Moonshine Build & Web Adaptation Report

## Building Moonshine for Desktop Platforms

Moonshine is built with Electron and Node.js, making it cross-platform by default. Below are steps and considerations for packaging the app for Windows, macOS, and Linux.

### 1. Prerequisites
- Node.js (v18 or newer recommended)
- npm
- Electron (as a dev dependency)
- OS-specific build tools (see below)

### 2. Packaging Tools
- **electron-builder** (recommended)
- **electron-packager** (alternative)

Install electron-builder:
```
npm install --save-dev electron-builder
```

### 3. Windows Build
- Run:
  ```
  npx electron-builder --win
  ```
- Output: `.exe` installer and portable `.exe` in `dist/`.
- Code signing is optional but recommended for distribution.

### 4. macOS Build
- Run:
  ```
  npx electron-builder --mac
  ```
- Output: `.dmg` installer and `.app` bundle in `dist/`.
- Requires macOS for signing and packaging.
- Code signing and notarization are recommended for public releases.

### 5. Linux Build
- Run:
  ```
  npx electron-builder --linux
  ```
- Output: `.AppImage`, `.deb`, or `.rpm` packages in `dist/`.
- No code signing required for most distributions.

### 6. Cross-Platform Notes
- Ensure all dependencies are platform-compatible.
- Test on each OS for file system access, audio playback, and UI rendering.
- Update `build` section in `package.json` for icons, product name, and platform-specific options.

---

## Adapting Moonshine for the Web

Moonshine is designed for desktop use, but a web-based version is possible with some changes:

### 1. Technology Stack
- Use React, Vue, or vanilla JS for UI.
- Replace Node.js/Electron APIs with browser-compatible alternatives.
- Use Web Audio API for playback.
- Use IndexedDB or browser storage for library management.

### 2. File Access
- Use `<input type="file" webkitdirectory>` for folder selection.
- No direct access to system folders; user must select files/folders manually.

### 3. Audio Format Support
- Browser support: MP3, WAV, OGG, AAC (FLAC and M4A support varies by browser).
- Use libraries like `music-metadata-browser` for tag reading.

### 4. Limitations
- No background processes or direct file system access.
- Limited access to local files and metadata.
- No native notifications or OS integration.

### 5. Deployment
- Host on static site (GitHub Pages, Netlify, Vercel, etc.).
- Ensure privacy and security for user data.

---

## Summary
- Electron enables cross-platform desktop builds with minimal changes.
- Web adaptation requires reworking file access and some features, but core UI and playback can be ported.
- Test thoroughly on each platform for best user experience.

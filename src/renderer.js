import { initializeApp } from './renderer/app.js';

function isMobile() {
  try {
    return window.matchMedia && window.matchMedia('(max-width: 720px)').matches;
  } catch (e) { return false; }
}

window.addEventListener('DOMContentLoaded', () => {
  initializeApp();
  if (isMobile()) {
    import('./renderer/components/ui/mobile/index.js').then(m => {
      try { m.initMobileUI && m.initMobileUI(); } catch(_) {}
    }).catch(() => {});
  }
});

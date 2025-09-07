import { isMobile as checkMobile } from './helpers.js';

let _inited = false;

export function initMobileUI() {
  if (_inited) return;
  if (!checkMobile()) return;
  _inited = true;
  // Lazy-load the concrete mobile UI implementation so the skeleton stays small
  import('./player.js').then(m => { try { m.initMobilePlayer && m.initMobilePlayer(); } catch(e){} }).catch(()=>{});
  import('./nav.js').then(m => { try { m.initMobileNav && m.initMobileNav(); } catch(e){} }).catch(()=>{});
  import('./searchbar.js').then(m => { try { m.initMobileSearch && m.initMobileSearch(); } catch(e){} }).catch(()=>{});
}

export function destroyMobileUI() {
  // Optional: implement unmounting when resizing back to desktop
}

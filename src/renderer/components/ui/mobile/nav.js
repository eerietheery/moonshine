// Minimal mobile nav skeleton
export function initMobileNav() {
  if (document.querySelector('.mobile-bottom-nav')) return;
  const nav = document.createElement('nav');
  nav.className = 'mobile-bottom-nav';
  nav.innerHTML = `
    <button data-page="home" class="active" aria-label="Home"><img src="assets/images/moonshinebottlelogo.png" alt="Home"/></button>
    <button data-page="playlists" aria-label="Playlists"><img src="assets/images/playlist-mobi-ico.svg" alt="Playlists"/></button>
    <button data-page="albums" aria-label="Albums"><img src="assets/images/album-ico.svg" alt="Albums"/></button>
    <button data-page="songs" aria-label="Songs"><img src="assets/images/song-ico.svg" alt="Songs"/></button>
    <button data-page="artists" aria-label="Artists"><img src="assets/images/artist-ico.svg" alt="Artists"/></button>
  `;
  document.body.appendChild(nav);
  nav.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-page]');
    if (!btn) return;
    nav.querySelectorAll('button').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const page = btn.dataset.page;
    // Simple navigation: scroll to an element with id matching the page
    const target = document.getElementById(page);
    if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
}

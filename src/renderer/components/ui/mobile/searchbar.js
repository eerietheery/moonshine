// Minimal floating search bar skeleton
export function initMobileSearch() {
  if (document.querySelector('.mobile-search')) return;
  const bar = document.createElement('div');
  bar.className = 'mobile-search';
  bar.innerHTML = `
    <button class="search-menu" aria-label="Search options">☰</button>
    <input class="search-input" type="search" placeholder="Search music" aria-label="Search music" />
    <button class="search-clear" aria-label="Clear search">✕</button>
  `;
  document.body.appendChild(bar);
  const input = bar.querySelector('.search-input');
  bar.querySelector('.search-clear').addEventListener('click', () => { input.value = ''; input.dispatchEvent(new Event('input')); });
  input.addEventListener('input', (e) => {
    // Fire a custom event for the app to consume and filter lists
    window.dispatchEvent(new CustomEvent('mobile:search', { detail: { query: e.target.value } }));
  });
}

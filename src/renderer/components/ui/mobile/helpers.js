// Mobile helpers: device guard and utilities
export function isMobile() {
  try {
    return window.matchMedia && window.matchMedia('(max-width: 720px)').matches;
  } catch (e) { return false; }
}

export function debounce(fn, wait = 100) {
  let t = null;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), wait);
  };
}

export function uid(prefix = 'm') {
  return `${prefix}-${Math.random().toString(36).slice(2,9)}`;
}

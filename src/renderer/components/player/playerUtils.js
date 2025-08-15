// Player utility functions: formatting, helpers

export function formatTime(seconds) {
  if (isNaN(seconds) || seconds === Infinity) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function clamp(val, min, max) {
  return Math.max(min, Math.min(max, val));
}

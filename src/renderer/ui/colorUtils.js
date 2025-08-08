function getComplementaryColor(hex) {
  hex = hex.replace('#', '');
  let r = parseInt(hex.substring(0,2), 16);
  let g = parseInt(hex.substring(2,4), 16);
  let b = parseInt(hex.substring(4,6), 16);
  r = 255 - r;
  g = 255 - g;
  b = 255 - b;
  return '#' + [r,g,b].map(x => x.toString(16).padStart(2,'0')).join('');
}

export { getComplementaryColor };

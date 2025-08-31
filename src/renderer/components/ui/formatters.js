function snapCommonKbps(kbps) {
  const commons = [32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320];
  const tol = 0.03; // ±3%
  for (const c of commons) {
    if (Math.abs(kbps - c) / c <= tol) return c;
  }
  return kbps;
}

function formatBitrate(bps, opts = {}) {
  const { vbr = false, style = 'cell' } = opts;
  if (!bps || !Number.isFinite(bps) || bps <= 0) {
    return style === 'cell' ? '—' : 'Unknown';
  }
  const kbpsRaw = bps >= 10000 ? (bps / 1000) : bps;
  const kbps = snapCommonKbps(kbpsRaw);
  if (kbps >= 1000) {
    const mbps = kbps / 1000;
    const useTwoDecimals = mbps > 1;
    const val = useTwoDecimals ? mbps.toFixed(2) : String(Math.round(mbps));
    if (style === 'cell') return val;
    if (style === 'cellUnit') return `${val} Mbps`;
    if (style === 'short') return `${useTwoDecimals ? Number(val).toFixed(2) : val}M`;
    return `${vbr ? 'VBR ' : ''}${val} Mbps`;
  }
  const val = String(Math.round(kbps));
  if (style === 'cell') return val;
  if (style === 'cellUnit') return `${val} kbps`;
  if (style === 'short') return `${vbr ? '~' : ''}${val}`;
  return `${vbr ? 'VBR ' : ''}${val} kbps`;
}

export { formatBitrate };

function createUpdaterSection() {
  const updatesSection = document.createElement('div');

  const updateRow = document.createElement('div');
  updateRow.style.display = 'flex';
  updateRow.style.alignItems = 'center';
  updateRow.style.gap = '10px';

  const currentSpan = document.createElement('span');
  currentSpan.style.color = '#ccc';
  currentSpan.style.fontSize = '14px';
  currentSpan.textContent = 'Current version: …';

  const updateBtn = document.createElement('button');
  updateBtn.textContent = 'Update available — Open release page';
  updateBtn.style.background = 'var(--primary-color, #8C40B8)';
  updateBtn.style.border = 'none';
  updateBtn.style.color = '#fff';
  updateBtn.style.padding = '8px 12px';
  updateBtn.style.borderRadius = '6px';
  updateBtn.style.cursor = 'pointer';
  updateBtn.style.display = 'none'; // only shown when update exists

  let releaseUrl = null;
  updateBtn.addEventListener('click', () => {
    if (releaseUrl) window.moonshine.openExternal(releaseUrl);
  });

  updateRow.appendChild(currentSpan);
  updateRow.appendChild(updateBtn);
  updatesSection.appendChild(updateRow);

  // Kick off version check (best-effort; no hard failure if network blocked)
  (async () => {
    try {
      const appVerRaw = await window.moonshine.getAppVersion();
      if (appVerRaw) currentSpan.textContent = `Current version: ${appVerRaw}`;
      const owner = 'eerietheery';
      const repo = 'moonshine';
      const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/releases/latest`, { headers: { 'Accept': 'application/vnd.github+json' } });
      if (!res.ok) return; // silent fail
      const json = await res.json();
      const htmlUrl = json.html_url;
      const extractSemver = (s) => {
        const m = String(s || '').match(/\b(\d+)\.(\d+)\.(\d+)\b/);
        return m ? `${m[1]}.${m[2]}.${m[3]}` : null;
      };
      const latestVer = extractSemver(json.tag_name) || extractSemver(json.name);
      const currentVer = extractSemver(appVerRaw);
      if (!latestVer || !currentVer) return;
      const toNums = (v) => v.split('.').map(n => Number(n));
      const [a0, a1, a2] = toNums(currentVer);
      const [b0, b1, b2] = toNums(latestVer);
      const newer = (b0 > a0) || (b0 === a0 && b1 > a1) || (b0 === a0 && b1 === a1 && b2 > a2);
      if (newer) {
        releaseUrl = htmlUrl || `https://github.com/${owner}/${repo}/releases/latest`;
        updateBtn.style.display = 'inline-flex';
      }
    } catch {}
  })();

  const teardown = () => {
    // nothing to cleanup for now; async check is fire-and-forget
  };

  return { element: updatesSection, teardown };
}

export { createUpdaterSection };

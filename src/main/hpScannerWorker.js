const { parentPort, workerData } = require('worker_threads');
const fs = require('fs');
const fsp = fs.promises;
const path = require('path');

const AUDIO_EXTS = new Set(['.mp3', '.m4a', '.flac', '.wav', '.ogg', '.aac']);

async function* walkBreadthFirst(roots) {
  const queue = Array.isArray(roots) ? roots.slice() : [roots];
  while (queue.length) {
    const dir = queue.shift();
    let dh;
    try {
      dh = await fsp.opendir(dir);
    } catch {
      continue;
    }
    for await (const dirent of dh) {
      const full = path.join(dir, dirent.name);
      if (dirent.isDirectory()) {
        const name = dirent.name.toLowerCase();
        if (!name.startsWith('.') && name !== 'system volume information') {
          queue.push(full);
        }
      } else if (dirent.isFile()) {
        yield full;
      }
    }
  }
}

async function run() {
  const { roots, batchSize = 1000 } = workerData || {};
  const batch = [];
  let completed = 0;
  for await (const filePath of walkBreadthFirst(roots)) {
    const ext = path.extname(filePath).toLowerCase();
    if (!AUDIO_EXTS.has(ext)) continue;
    let st;
    try {
      st = await fsp.stat(filePath);
    } catch {
      continue;
    }
    batch.push({ filePath, size: st.size || 0, mtime: st.mtimeMs || 0 });
    completed++;
    if (batch.length >= batchSize) {
      parentPort.postMessage({ type: 'batch', batch: batch.slice() });
      parentPort.postMessage({ type: 'progress', progress: { phase: 'scanning', completed } });
      batch.length = 0;
    }
  }
  if (batch.length) {
    parentPort.postMessage({ type: 'batch', batch: batch.slice() });
    parentPort.postMessage({ type: 'progress', progress: { phase: 'scanning', completed } });
  }
  parentPort.postMessage({ type: 'done', summary: { completed } });
}

run().catch((err) => {
  parentPort.postMessage({ type: 'error', error: err?.message || String(err) });
});

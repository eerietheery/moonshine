const { parentPort } = require('worker_threads');
const fs = require('fs');
const path = require('path');

// Fast, concurrent directory traversal using fs.promises.readdir with dirents
// Posts batches of file paths to parent. Keeps memory flat by streaming.

const AUDIO_EXTS = new Set(['.mp3', '.m4a', '.flac', '.wav', '.ogg', '.aac']);
const MAX_BATCH = 1000;
const MAX_CONCURRENCY = 64; // tuneable; depends on disk/CPU

function isAudio(name) {
  const ext = path.extname(name).toLowerCase();
  return AUDIO_EXTS.has(ext);
}

async function readdirDirents(dir) {
  try {
    return await fs.promises.readdir(dir, { withFileTypes: true });
  } catch (_) {
    return [];
  }
}

async function walk(root) {
  const queue = [root];
  let batch = [];
  const workers = new Set();

  async function processDir(dir) {
    const entries = await readdirDirents(dir);
    for (const ent of entries) {
      const name = ent.name;
      const full = path.join(dir, name);
      if (ent.isDirectory()) {
        const lname = name.toLowerCase();
        if (!lname.startsWith('.') && lname !== 'system volume information') {
          queue.push(full);
        }
      } else if (isAudio(name)) {
        batch.push(full);
        if (batch.length >= MAX_BATCH) {
          parentPort.postMessage({ type: 'batch', files: batch });
          batch = [];
        }
      }
    }
  }

  while (queue.length > 0 || workers.size > 0) {
    while (queue.length > 0 && workers.size < MAX_CONCURRENCY) {
      const dir = queue.shift();
      const p = processDir(dir).finally(() => workers.delete(p));
      workers.add(p);
    }
    if (workers.size > 0) {
      await Promise.race(workers);
    }
  }

  if (batch.length) {
    parentPort.postMessage({ type: 'batch', files: batch });
  }
  parentPort.postMessage({ type: 'done' });
}

parentPort.on('message', async (msg) => {
  const root = msg && msg.root;
  if (!root) {
    parentPort.postMessage({ type: 'error', message: 'Missing root' });
    return;
  }
  try {
    await walk(root);
  } catch (e) {
    parentPort.postMessage({ type: 'error', message: e.message || String(e) });
  }
});

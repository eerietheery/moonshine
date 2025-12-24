const { Worker } = require('worker_threads');
const path = require('path');

function startHPScan({ roots, batchSize = 1000, onProgress, onBatch }) {
  return new Promise((resolve, reject) => {
    try {
      const worker = new Worker(path.join(__dirname, 'hpScannerWorker.js'), {
        workerData: { roots, batchSize },
      });

      worker.on('message', (msg) => {
        switch (msg?.type) {
          case 'batch':
            onBatch?.(msg.batch);
            break;
          case 'progress':
            onProgress?.(msg.progress);
            break;
          case 'done':
            resolve(msg.summary);
            worker.terminate();
            break;
          case 'error':
            reject(new Error(msg.error));
            worker.terminate();
            break;
          default:
            break;
        }
      });

      worker.on('error', (err) => {
        reject(err);
      });
    } catch (err) {
      reject(err);
    }
  });
}

module.exports = { startHPScan };

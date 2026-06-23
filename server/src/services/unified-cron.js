/**
 * Unified Cron: Catalog Sync → Image Sync → Image Index
 */
const axios = require('axios');
const { runCatalogSync } = require('./catalog-sync-service');
const { runSync } = require('./sync-service');

const PYTHON_URL = process.env.IMAGE_SEARCH_URL || 'http://localhost:3751';

let lastRun = null;
let progress = { running: false, step: '', catalog: null, images: null, index: null };

function isAlreadyRunningError(message = '') {
  return /sedang berjalan|already running/i.test(message);
}

function isSkippableSyncError(message = '') {
  return isAlreadyRunningError(message) || /tidak ada toko terdaftar/i.test(message);
}

function assertSyncResult(result, label) {
  if (!result?.error) return result;

  if (isSkippableSyncError(result.error)) {
    return {
      skipped: true,
      reason: result.error,
    };
  }

  throw new Error(`${label} gagal: ${result.error}`);
}

function shouldSkipIndex() {
  const syncSteps = [progress.catalog, progress.images];
  return syncSteps.some(step => step?.skipped && /tidak ada toko terdaftar/i.test(step.reason || ''));
}

async function runUnifiedSync() {
  if (progress.running) return { error: 'Already running' };

  progress = { running: true, step: 'catalog', catalog: null, images: null, index: null };
  lastRun = new Date().toISOString();

  try {
    // 1. Catalog Sync
    console.log('[unified-cron] Step 1/3: Catalog Sync');
    progress.catalog = assertSyncResult(await runCatalogSync(), 'Catalog sync');
    console.log('[unified-cron] Catalog done:', JSON.stringify(progress.catalog).slice(0, 200));

    // 2. Image Sync (Firebase → disk)
    progress.step = 'images';
    console.log('[unified-cron] Step 2/3: Image Sync');
    progress.images = assertSyncResult(await runSync(), 'Image sync');
    console.log('[unified-cron] Images done:', JSON.stringify(progress.images).slice(0, 200));

    if (shouldSkipIndex()) {
      progress.step = 'done';
      progress.index = { skipped: true, reason: 'Image index dilewati karena belum ada toko terdaftar.' };
      console.log('[unified-cron] Index skipped:', progress.index.reason);
      return progress;
    }

    // 3. Image Index (DINOv2 → Qdrant)
    progress.step = 'index';
    console.log('[unified-cron] Step 3/3: Image Index');
    let idxRes;
    try {
      idxRes = await axios.post(`${PYTHON_URL}/index/start`, {}, { timeout: 600000 });
    } catch (err) {
      progress.index = {
        skipped: true,
        reason: `Image search service tidak tersedia di ${PYTHON_URL}.`,
      };
      console.log('[unified-cron] Index skipped:', progress.index.reason);
      return progress;
    }
    progress.index = idxRes.data || { error: 'No response' };
    console.log('[unified-cron] Index started');

    // Poll index status until done
    while (true) {
      await new Promise(r => setTimeout(r, 5000));
      try {
        const statusRes = await axios.get(`${PYTHON_URL}/index/status`, { timeout: 5000 });
        const s = statusRes.data?.data;
        if (!s?.running) {
          progress.index = s;
          break;
        }
      } catch { break; }
    }
    console.log('[unified-cron] All done!');
  } catch (err) {
    console.error('[unified-cron] Error at step', progress.step, ':', err.message);
  }
  progress.running = false;
}

function getStatus() {
  return { running: progress.running, step: progress.step, lastRun, progress };
}

module.exports = { runUnifiedSync, getStatus };

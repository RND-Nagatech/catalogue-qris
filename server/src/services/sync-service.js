const fs = require('fs');
const path = require('path');
const { initializeApp } = require('firebase/app');
const { getStorage, ref, getDownloadURL } = require('firebase/storage');
const axios = require('axios');
const mongoManager = require('./mongo-manager');
const { getStores } = require('../config/store-config');

// Firebase init
const firebaseConfig = {
  apiKey: 'AIzaSyB1JES7FtWNBoz9obp-5Z6HifP5XCsUsOI',
  authDomain: 'gambar-78b2b.firebaseapp.com',
  projectId: 'gambar-78b2b',
  storageBucket: 'gambar-78b2b.appspot.com',
  messagingSenderId: '694976070405',
  appId: '1:694976070405:web:eef580e9823e39e64dad6c',
};

let firebaseApp;
try {
  firebaseApp = initializeApp(firebaseConfig, 'sync-worker');
} catch {
  // already initialized
}

const SYNC_IMAGES_DIR = path.join(__dirname, '..', '..', 'sync_images');
const CONCURRENCY = parseInt(process.env.SYNC_CONCURRENCY, 10) || 20;
const SYNC_COLLECTION = 'sync_state';

/**
 * Async pool — jalan N task concurrently, start baru saat satu selesai.
 */
async function asyncPool(concurrency, items, fn) {
  const executing = new Set();
  for (const item of items) {
    const p = fn(item);
    executing.add(p);
    p.finally(() => executing.delete(p));
    if (executing.size >= concurrency) {
      await Promise.race(executing);
    }
  }
  await Promise.allSettled(executing);
}

// Progress tracking
let currentProgress = {
  running: false,
  total: 0,
  synced: 0,
  skipped: 0,
  failed: 0,
  errors: [],
  currentBarcode: null,
};

async function getSyncCollection() {
  const db = await mongoManager.getConfigDb();
  return db.collection(SYNC_COLLECTION);
}

async function loadSyncState() {
  try {
    const col = await getSyncCollection();
    // Ambil semua item (kecuali dokumen lastSync)
    const items = await col.find({ barcode: { $exists: true } }).toArray();
    const lastSyncDoc = await col.findOne({ _id: 'lastSync' });
    return {
      lastSync: lastSyncDoc?.value || null,
      items,
    };
  } catch {
    return { lastSync: null, items: [] };
  }
}

async function saveSyncState(state) {
  const col = await getSyncCollection();
  // Simpan items sebagai dokumen terpisah (satu per barcode)
  if (state.items.length > 0) {
    const bulk = col.initializeUnorderedBulkOp();
    for (const item of state.items) {
      bulk.find({ barcode: item.barcode }).upsert().replaceOne(item);
    }
    await bulk.execute();
  }
  // Simpan lastSync timestamp
  await col.updateOne(
    { _id: 'lastSync' },
    { $set: { _id: 'lastSync', value: state.lastSync } },
    { upsert: true }
  );
}

/**
 * Ambil semua barcode dari tm_barang (stock_on_hand > 0) di semua toko
 */
async function getBarcodesFromStores(stores) {
  const seen = new Set();
  const results = [];

  for (const store of stores) {
    try {
      const db = await mongoManager.getDb(store.mongoUri, store.dbName);
      const collection = db.collection('tm_barang');

      const items = await collection
        .find({ stock_on_hand: { $gt: 0 } })
        .project({ kode_barcode: 1, _id: 0 })
        .toArray();

      for (const item of items) {
        const barcode = item.kode_barcode;
        if (!barcode || seen.has(barcode)) continue;
        seen.add(barcode);
        results.push({
          barcode,
          firebaseCode: store.firebaseCode || '',
          source: store.name,
        });
      }
    } catch (err) {
      console.error(`[sync] Gagal query toko "${store.name}":`, err.message);
    }
  }

  return results;
}

/**
 * Bandingkan barcode dari MongoDB dengan sync state.
 * Return items yang perlu di-sync (baru + retry gagal).
 */
function diffBarcodes(freshBarcodes, state) {
  const stateMap = new Map();
  for (const item of state.items) {
    stateMap.set(item.barcode, item);
  }

  const toSync = [];

  for (const fresh of freshBarcodes) {
    const existing = stateMap.get(fresh.barcode);

    if (!existing) {
      // Barcode baru — belum pernah ada di state
      toSync.push({ ...fresh, isNew: true });
    } else if (!existing.syncStatus) {
      // Pernah gagal — retry
      toSync.push({ ...fresh, isNew: false });
    }
    // else: sudah synced → skip
  }

  return toSync;
}

/**
 * Download 1 gambar dari Firebase ke local disk.
 * Path: sync_images/{firebaseCode}/foto_produk/{barcode}.jpg
 */
async function downloadImage(firebaseCode, barcode) {
  const storagePath = `NSIPIC/${firebaseCode}/foto_produk/${barcode}.jpg`;
  const storage = getStorage(firebaseApp);
  const imageRef = ref(storage, storagePath);

  // Dapatkan download URL
  const url = await getDownloadURL(imageRef);

  // Siapkan folder lokal
  const localDir = path.join(SYNC_IMAGES_DIR, firebaseCode, 'foto_produk');
  fs.mkdirSync(localDir, { recursive: true });

  const localPath = path.join(localDir, `${barcode}.jpg`);

  // Download
  const response = await axios.get(url, {
    responseType: 'stream',
    timeout: 30000,
  });

  const writer = fs.createWriteStream(localPath);
  response.data.pipe(writer);

  return new Promise((resolve, reject) => {
    writer.on('finish', () => resolve(localPath));
    writer.on('error', reject);
  });
}

/**
 * Main sync orchestrator
 */
async function runSync() {
  if (currentProgress.running) {
    return { error: 'Sync sedang berjalan. Tunggu selesai.' };
  }

  currentProgress = {
    running: true,
    total: 0,
    synced: 0,
    skipped: 0,
    failed: 0,
    errors: [],
    currentBarcode: null,
  };

  try {
    const stores = await getStores();
    if (stores.length === 0) {
      currentProgress.running = false;
      return { error: 'Tidak ada toko terdaftar.' };
    }

    // 1. Ambil barcode dari MongoDB
    const freshBarcodes = await getBarcodesFromStores(stores);

    // 2. Load state
    const state = await loadSyncState();

    // 3. Diff
    const toSync = diffBarcodes(freshBarcodes, state);
    const skipped = freshBarcodes.length - toSync.length;

    currentProgress.total = toSync.length;
    currentProgress.skipped = skipped;

    // Build state map untuk update
    const stateMap = new Map();
    for (const item of state.items) {
      stateMap.set(item.barcode, item);
    }

    // 4. Download concurrent — pool N item sekaligus
    let completedSinceSave = 0;

    await asyncPool(CONCURRENCY, toSync, async (item) => {
      currentProgress.currentBarcode = item.barcode;

      try {
        if (!item.firebaseCode) {
          throw new Error('firebaseCode kosong');
        }

        const localPath = await downloadImage(item.firebaseCode, item.barcode);

        const now = new Date().toISOString();
        stateMap.set(item.barcode, {
          barcode: item.barcode,
          firebaseCode: item.firebaseCode,
          source: item.source,
          syncStatus: true,
          syncedAt: now,
          localPath: path.relative(path.join(__dirname, '..', '..'), localPath),
        });
        currentProgress.synced++;
      } catch (err) {
        currentProgress.failed++;
        currentProgress.errors.push({
          barcode: item.barcode,
          source: item.source,
          error: err.message,
        });
        if (!stateMap.has(item.barcode)) {
          stateMap.set(item.barcode, {
            barcode: item.barcode,
            firebaseCode: item.firebaseCode,
            source: item.source,
            syncStatus: false,
            syncedAt: null,
            localPath: null,
          });
        }
      }

      // Incremental save setiap 50 item selesai
      completedSinceSave++;
      if (completedSinceSave % 50 === 0) {
        state.lastSync = new Date().toISOString();
        state.items = [...stateMap.values()];
        await saveSyncState(state);
      }
    });

    // 5. Simpan state final
    state.lastSync = new Date().toISOString();
    state.items = [...stateMap.values()];
    await saveSyncState(state);

    currentProgress.running = false;
    return {
      total: currentProgress.total,
      synced: currentProgress.synced,
      skipped: currentProgress.skipped,
      failed: currentProgress.failed,
      errors: currentProgress.errors,
    };
  } catch (err) {
    currentProgress.running = false;
    currentProgress.errors.push({ error: err.message });
    return { error: err.message };
  }
}

async function getStatus() {
  const state = await loadSyncState();
  const total = state.items.length;
  const synced = state.items.filter((i) => i.syncStatus).length;
  const pending = total - synced;
  return {
    running: currentProgress.running,
    lastSync: state.lastSync,
    total,
    synced,
    pending,
    current: currentProgress.running
      ? {
          total: currentProgress.total,
          synced: currentProgress.synced,
          failed: currentProgress.failed,
          currentBarcode: currentProgress.currentBarcode,
        }
      : null,
  };
}

module.exports = { runSync, getStatus };

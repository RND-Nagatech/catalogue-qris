/**
 * Master Catalog Sync Service
 * ETL: tm_barang (encrypted) → master_catalog (decrypted)
 */
const mongoManager = require('./mongo-manager');
const Encryptor = require('../utils/encryptor');
const { getStores } = require('../config/store-config');

const encryptor = new Encryptor(process.env.ENCRYPT_KEY || 'b3r4sput1h');
const MASTER_COLLECTION = 'master_catalog';
const BATCH_SIZE = 500;

let currentProgress = {
  running: false,
  storeIndex: 0,
  storeTotal: 0,
  storeName: '',
  fetched: 0,
  upserted: 0,
  totalUpserted: 0,
};

/**
 * Ambil semua data dari satu store, decrypt, siapkan untuk master
 */
async function fetchAndDecrypt(store) {
  const db = await mongoManager.getDb(store.mongoUri, store.dbName);
  const collection = db.collection('tm_barang');

  const items = await collection
    .find({ stock_on_hand: { $gt: 0 } })
    .project({
      nama_barang: 1, stock_on_hand: 1, berat: 1, berat_asli: 1,
      kadar: 1, kadar_cetak: 1, harga_beli: 1, harga_skrg: 1,
      harga_jual: 1, harga_atribut: 1, tgl_last_beli: 1,
      kode_barcode: 1, kode_barang: 1, kode_group: 1,
      kode_dept: 1, kode_gudang: 1, kode_toko: 1, _id: 0,
    })
    .toArray();

  const now = new Date().toISOString();
  const docs = [];

  for (const item of items) {
    docs.push({
      kode_barcode: item.kode_barcode,
      kode_barang: item.kode_barang,
      nama_barang: encryptor.decryptascii(item.nama_barang || ''),
      stock_on_hand: item.stock_on_hand,
      berat: item.berat,
      berat_asli: item.berat_asli,
      kadar: item.kadar,
      kadar_cetak: encryptor.decryptascii(item.kadar_cetak || ''),
      harga_beli: item.harga_beli,
      harga_skrg: item.harga_skrg,
      harga_jual: item.harga_jual,
      harga_atribut: item.harga_atribut,
      tgl_last_beli: item.tgl_last_beli,
      kode_group: item.kode_group,
      kode_dept: item.kode_dept,
      kode_gudang: item.kode_gudang,
      kode_toko: item.kode_toko,
      sumber: store.name,
      firebaseCode: store.firebaseCode || '',
      storeId: store.id,
      _syncedAt: now,
    });
  }

  return docs;
}

/**
 * Bulk upsert ke master_catalog
 */
async function bulkUpsert(docs) {
  const db = await mongoManager.getConfigDb();
  const col = db.collection(MASTER_COLLECTION);

  for (let i = 0; i < docs.length; i += BATCH_SIZE) {
    const batch = docs.slice(i, i + BATCH_SIZE);
    const bulk = col.initializeUnorderedBulkOp();
    for (const doc of batch) {
      bulk
        .find({ kode_barcode: doc.kode_barcode, storeId: doc.storeId })
        .upsert()
        .replaceOne(doc);
    }
    await bulk.execute();
  }
}

/**
 * Hapus item yang sudah tidak ada di source (optional — panggil setelah sync)
 */
async function cleanOrphaned(barcodesFromSync) {
  const db = await mongoManager.getConfigDb();
  const col = db.collection(MASTER_COLLECTION);

  if (barcodesFromSync.length === 0) return 0;

  const result = await col.deleteMany({
    kode_barcode: { $nin: barcodesFromSync },
  });
  return result.deletedCount;
}

/**
 * Main sync orchestrator
 */
async function runCatalogSync() {
  if (currentProgress.running) {
    return { error: 'Sync catalog sedang berjalan. Tunggu selesai.' };
  }

  currentProgress = {
    running: true,
    storeIndex: 0,
    storeTotal: 0,
    storeName: '',
    fetched: 0,
    upserted: 0,
    totalUpserted: 0,
  };

  try {
    const stores = await getStores();
    if (stores.length === 0) {
      currentProgress.running = false;
      return { error: 'Tidak ada toko terdaftar.' };
    }

    currentProgress.storeTotal = stores.length;
    const allBarcodes = [];

    for (let i = 0; i < stores.length; i++) {
      const store = stores[i];
      currentProgress.storeIndex = i + 1;
      currentProgress.storeName = store.name;

      console.log(`[catalog] Syncing store ${i + 1}/${stores.length}: ${store.name}`);

      // 1. Fetch & decrypt
      const docs = await fetchAndDecrypt(store);
      currentProgress.fetched = docs.length;
      console.log(`[catalog]   Fetched ${docs.length} items`);

      // 2. Bulk upsert
      if (docs.length > 0) {
        await bulkUpsert(docs);
        currentProgress.upserted = docs.length;
        currentProgress.totalUpserted += docs.length;
        console.log(`[catalog]   Upserted ${docs.length} items`);
      }

      // Track barcode untuk clean orphan
      for (const doc of docs) {
        allBarcodes.push(doc.kode_barcode);
      }
    }

    // 3. Clean orphan (produk yang sudah tidak ada di source)
    //    Skip untuk sekarang — terlalu agresif saat sync pertama
    // const deleted = await cleanOrphaned(allBarcodes);

    // 4. Ensure indexes
    const db = await mongoManager.getConfigDb();
    const col = db.collection(MASTER_COLLECTION);
    try {
      await col.createIndex({ kode_barcode: 1, storeId: 1 }, { unique: true });
      await col.createIndex({ nama_barang: 'text' });
      await col.createIndex({ kode_group: 1 });
      await col.createIndex({ kode_dept: 1 });
      await col.createIndex({ kode_toko: 1 });
      await col.createIndex({ sumber: 1 });
      console.log('[catalog] Indexes ensured');
    } catch (e) {
      console.log('[catalog] Index warning:', e.message);
    }

    currentProgress.running = false;
    return {
      stores: stores.length,
      upserted: currentProgress.totalUpserted,
    };
  } catch (err) {
    currentProgress.running = false;
    return { error: err.message };
  }
}

function getCatalogStatus() {
  return {
    running: currentProgress.running,
    ...(currentProgress.running
      ? {
          store: `${currentProgress.storeIndex}/${currentProgress.storeTotal}`,
          storeName: currentProgress.storeName,
          fetched: currentProgress.fetched,
          upserted: currentProgress.upserted,
          totalUpserted: currentProgress.totalUpserted,
        }
      : { idle: true }),
  };
}

module.exports = { runCatalogSync, getCatalogStatus };

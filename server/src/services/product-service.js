const mongoManager = require('./mongo-manager');
const Encryptor = require('../utils/encryptor');
const { getStores, getStoreById } = require('../config/store-config');

// Master catalog — query langsung dari DB yang sudah terdecrypt
async function queryMasterCatalog(filters) {
  try {
    const db = await mongoManager.getConfigDb();
    const col = db.collection('master_catalog');

    const { search, group, dept, toko, storeId, page = 1, limit = 20 } = filters;
    const query = {};

    // Filter exact
    query.stock_on_hand = { $gt: 0 };
    if (group) query.kode_group = group;
    if (dept) query.kode_dept = dept;
    if (toko) query.kode_toko = toko;
    if (storeId) query.storeId = storeId;

    // Search: text search di nama_barang + regex di field lain
    if (search) {
      query.$or = [
        { nama_barang: { $regex: search, $options: 'i' } },
        { kode_barcode: { $regex: search, $options: 'i' } },
        { kode_barang: { $regex: search, $options: 'i' } },
        { kode_group: { $regex: search, $options: 'i' } },
        { kode_dept: { $regex: search, $options: 'i' } },
        { kode_toko: { $regex: search, $options: 'i' } },
      ];
    }

    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      col.find(query).project({ _id: 0 }).sort({ _id: -1 }).skip(skip).limit(limit).toArray(),
      col.countDocuments(query),
    ]);

    const data = items.map((item) => ({
      ...item,
      product_id: item.product_id || (item.storeId && (item.kode_barcode || item.kode_barang) ? `${item.storeId}:${item.kode_barcode || item.kode_barang}` : ''),
    }));

    return { data, meta: { page, limit, total } };
  } catch {
    // Master DB belum ada atau kosong → return null agar fallback
    return null;
  }
}

// Encryptor instance — key dari environment
const encryptor = new Encryptor(process.env.ENCRYPT_KEY || 'b3r4sput1h');

// Field yang TIDAK perlu didecrypt (akan di-ignore oleh doDecrypt).
// Hanya nama_barang dan kadar_cetak yang terenkripsi di MongoDB.
const IGNORE_DECRYPT = [
  'stock_on_hand', 'berat', 'berat_asli', 'kadar',
  'harga_beli', 'harga_skrg', 'harga_jual', 'harga_atribut',
  'tgl_last_beli',
  'kode_barcode', 'kode_barang', 'kode_group', 'kode_dept',
  'kode_gudang', 'kode_toko',
  'sumber', 'storeId', 'product_id', 'firebaseCode', '_id',
];

/**
 * Decrypt item: panggil doDecrypt dengan ignore list.
 * Hanya nama_barang & kadar_cetak yang akan didecrypt.
 */
function decryptItems(items) {
  return encryptor.doDecrypt(items, IGNORE_DECRYPT);
}

// Field yang akan diambil dari tm_barang
const PRODUCT_FIELDS = {
  nama_barang: 1,
  stock_on_hand: 1,
  berat: 1,
  berat_asli: 1,
  kadar: 1,
  kadar_cetak: 1,
  harga_beli: 1,
  harga_skrg: 1,
  harga_jual: 1,
  harga_atribut: 1,
  tgl_last_beli: 1,
  kode_barcode: 1,
  kode_barang: 1,
  kode_group: 1,
  kode_dept: 1,
  kode_gudang: 1,
  kode_toko: 1,
  _id: 0,
};

/**
 * Build MongoDB query dari filter params.
 * Note: nama_barang TIDAK bisa di-search via MongoDB karena terenkripsi.
 * Search di nama_barang dilakukan secara lokal setelah decrypt.
 * Filter group/dept/toko bisa langsung via MongoDB (tidak terenkripsi).
 * @param {{ search?: string, group?: string, dept?: string, toko?: string }} filters
 * @returns {object} MongoDB query
 */
function buildQuery(filters) {
  // Wajib: hanya produk dengan stock > 0
  const query = { stock_on_hand: { $gt: 0 } };

  // Filter exact: group, dept, toko
  if (filters.group) {
    query.kode_group = filters.group;
  }
  if (filters.dept) {
    query.kode_dept = filters.dept;
  }
  if (filters.toko) {
    query.kode_toko = filters.toko;
  }

  // Search: regex pada field tidak terenkripsi
  if (filters.search) {
    const regex = { $regex: filters.search, $options: 'i' };
    query.$or = [
      { kode_barcode: regex },
      { kode_barang: regex },
      { kode_group: regex },
      { kode_dept: regex },
      { kode_toko: regex },
    ];
  }

  return query;
}

/**
 * Filter produk berdasarkan search keyword pada field yang sudah didecrypt
 * @param {Array} items
 * @param {string} keyword
 * @returns {Array}
 */
function filterByKeyword(items, keyword) {
  if (!keyword) return items;
  const kw = keyword.toLowerCase();
  return items.filter(
    (item) =>
      (item.nama_barang || '').toLowerCase().includes(kw) ||
      (item.kode_barcode || '').toLowerCase().includes(kw) ||
      (item.kode_barang || '').toLowerCase().includes(kw) ||
      (item.kode_group || '').toLowerCase().includes(kw) ||
      (item.kode_dept || '').toLowerCase().includes(kw) ||
      (item.kode_toko || '').toLowerCase().includes(kw)
  );
}

/**
 * Ambil produk mentah dari satu toko (tanpa decrypt).
 * @returns {Promise<{ items: Array, total: number }>}
 */
async function fetchRawFromStore(store, mongoQuery) {
  const db = await mongoManager.getDb(store.mongoUri, store.dbName);
  const collection = db.collection('tm_barang');

  const [items, total] = await Promise.all([
    collection.find(mongoQuery).project(PRODUCT_FIELDS).sort({ _id: -1 }).toArray(),
    collection.countDocuments(mongoQuery),
  ]);

  return { items, total };
}

/**
 * Proses items: decrypt, map sumber + firebaseCode, optional keyword filter
 */
function processItems(items, store, search) {
  const decrypted = decryptItems(items);
  const filtered = filterByKeyword(decrypted, search);
  return filtered.map((item) => ({
    ...item,
    storeId: store.id || String(store._id || ''),
    product_id: buildProductId(store, item),
    sumber: store.name,
    firebaseCode: store.firebaseCode || '',
  }));
}

function storeId(store) {
  return String(store?.id || store?._id || '');
}

function productCode(item = {}) {
  return String(item.kode_barcode || item.kode_barang || '').trim();
}

function buildProductId(store, item = {}) {
  const code = productCode(item);
  return code ? `${storeId(store)}:${code}` : '';
}

function parseProductId(productId) {
  const text = String(productId || '');
  const separatorIndex = text.indexOf(':');
  if (separatorIndex < 1) return { storeId: '', code: text };
  return {
    storeId: text.slice(0, separatorIndex),
    code: text.slice(separatorIndex + 1),
  };
}

/**
 * Ambil produk dari satu toko (single store mode — pakai pagination MongoDB).
 */
async function fetchFromStorePaginated(store, filters) {
  const db = await mongoManager.getDb(store.mongoUri, store.dbName);
  const collection = db.collection('tm_barang');

  const { page = 1, limit = 20, group, dept, toko } = filters;
  const mongoQuery = buildQuery({ group, dept, toko });
  const skip = (page - 1) * limit;

  const [items, total] = await Promise.all([
    collection.find(mongoQuery).project(PRODUCT_FIELDS).sort({ _id: -1 }).skip(skip).limit(limit).toArray(),
    collection.countDocuments(mongoQuery),
  ]);

  const data = processItems(items, store, null);
  return { data, total };
}

/**
 * Ambil produk dari semua toko (atau satu toko spesifik).
 *
 * Multi store: per-store pagination, merge, tidak double-paginate.
 *              Tiap page ambil `limit` dari tiap toko → total items bisa
 *              limit × numStores (lebih banyak per scroll, lebih baik UX).
 *              total = sum countDocuments dari semua toko (akurat).
 * Single store: pagination MongoDB langsung.
 * Search: fetch semua, decrypt semua, filter, paginate global.
 */
async function getProducts(stores, filters = {}) {
  const { storeId, page = 1, limit = 20, search, group, dept, toko } = filters;

  const targetStores = storeId
    ? stores.filter((s) => s.id === storeId)
    : stores;

  if (targetStores.length === 0) {
    return { data: [], meta: { page, limit, total: 0 } };
  }

  // === SEARCH: perlu fetch semua, decrypt, filter, paginate global ===
  if (search) {
    const mongoQuery = buildQuery({ group, dept, toko });
    const results = await Promise.allSettled(
      targetStores.map((store) => fetchRawFromStore(store, mongoQuery))
    );

    let allItems = [];
    for (let i = 0; i < results.length; i++) {
      if (results[i].status === 'fulfilled') {
        const store = targetStores[i];
        const tagged = results[i].value.items.map((item) => ({
          ...item,
          storeId: store.id || String(store._id || ''),
          product_id: buildProductId(store, item),
          sumber: store.name,
          firebaseCode: store.firebaseCode || '',
        }));
        allItems = allItems.concat(tagged);
      }
    }

    if (!allItems.length && results.every((result) => result.status === 'rejected')) {
      const masterResult = await queryMasterCatalog(filters);
      if (masterResult) return masterResult;
    }

    const decrypted = decryptItems(allItems);
    const filtered = filterByKeyword(decrypted, search);
    const skip = (page - 1) * limit;
    const data = filtered.slice(skip, skip + limit);
    return { data, meta: { page, limit, total: filtered.length } };
  }

  // === NO SEARCH: per-store pagination + merge ===
  const results = await Promise.allSettled(
    targetStores.map((store) =>
      fetchFromStorePaginated(store, { page, limit, group, dept, toko })
    )
  );

  let allItems = [];
  let grandTotal = 0;

  for (let i = 0; i < results.length; i++) {
    const result = results[i];
    if (result.status === 'fulfilled') {
      allItems = allItems.concat(result.value.data);
      grandTotal += result.value.total;
    }
    if (result.status === 'rejected') {
      console.error(
        `[product-service] Gagal query toko "${targetStores[i]?.name}":`,
        result.reason.message
      );
    }
  }

  if (!allItems.length && results.every((result) => result.status === 'rejected')) {
    const masterResult = await queryMasterCatalog(filters);
    if (masterResult) return masterResult;
  }

  // Tidak double-paginate — return semua merged items dari page ini
  return { data: allItems, meta: { page, limit, total: grandTotal } };
}

async function getFavoriteProducts(stores, favorites = [], filters = {}) {
  const { page = 1, limit = 20, search } = filters;
  const favoriteList = Array.isArray(favorites) ? favorites : [];
  if (!favoriteList.length) {
    return { data: [], meta: { page, limit, total: 0 } };
  }

  const favoriteByProductId = new Map(favoriteList.map((favorite) => [String(favorite.product_id), favorite]));
  const requestedByStore = new Map();
  for (const favorite of favoriteList) {
    const parsed = parseProductId(favorite.product_id);
    if (!parsed.storeId || !parsed.code) continue;
    if (!requestedByStore.has(parsed.storeId)) requestedByStore.set(parsed.storeId, new Set());
    requestedByStore.get(parsed.storeId).add(parsed.code);
  }

  let allItems = [];
  for (const store of stores) {
    const codes = [...(requestedByStore.get(storeId(store)) || [])];
    if (!codes.length) continue;
    try {
      const db = await mongoManager.getDb(store.mongoUri, store.dbName);
      const collection = db.collection('tm_barang');
      const items = await collection.find({
        $or: [
          { kode_barcode: { $in: codes } },
          { kode_barang: { $in: codes } },
        ],
      }).project(PRODUCT_FIELDS).toArray();
      allItems = allItems.concat(processItems(items, store, null));
    } catch (err) {
      console.error(`[product-service] Gagal query favorit toko "${store?.name}":`, err.message);
    }
  }

  const existingIds = new Set(allItems.map((item) => item.product_id).filter(Boolean));
  const missingIds = favoriteList.map((favorite) => String(favorite.product_id)).filter((id) => !existingIds.has(id));
  if (missingIds.length) {
    try {
      const configDb = await mongoManager.getConfigDb();
      const masterItems = await configDb.collection('master_catalog').find({ product_id: { $in: missingIds } }).project({ _id: 0 }).toArray();
      allItems = allItems.concat(masterItems);
    } catch {
      // master_catalog fallback optional
    }
  }

  const enriched = allItems
    .map((item) => ({
      ...item,
      favorite_created_at: favoriteByProductId.get(String(item.product_id))?.created_at || '',
    }))
    .filter((item) => favoriteByProductId.has(String(item.product_id)));

  const filtered = filterByKeyword(enriched, search);
  filtered.sort((a, b) => String(b.favorite_created_at || '').localeCompare(String(a.favorite_created_at || '')));
  const skip = (page - 1) * limit;
  const data = filtered.slice(skip, skip + limit);
  return { data, meta: { page, limit, total: filtered.length } };
}

function normalizeSaleCode(value) {
  return String(value || '').trim().toUpperCase();
}

function saleItemCodes(item = {}) {
  const raw = item.raw || {};
  return Array.from(new Set([
    item.kodeBarcode,
    item.kodeBarang,
    item.kode_barcode,
    item.kode_barang,
    raw.kode_barcode,
    raw.kode_barang,
  ].map(normalizeSaleCode).filter(Boolean)));
}

async function decrementByCodes(collection, queryBase, codes, qty) {
  if (!codes.length) return 0;
  const docs = await collection.find({
    ...queryBase,
    $or: [
      { kode_barcode: { $in: codes } },
      { kode_barang: { $in: codes } },
    ],
  }).project({ _id: 1, stock_on_hand: 1 }).toArray();

  let updated = 0;
  for (const doc of docs) {
    const currentStock = Number(doc.stock_on_hand ?? 0);
    const nextStock = Math.max(0, currentStock - qty);
    await collection.updateOne({ _id: doc._id }, { $set: { stock_on_hand: nextStock, updatedAt: new Date().toISOString() } });
    updated += 1;
  }
  return updated;
}

async function markCatalogueItemsSold(storeId, items = []) {
  const saleItems = Array.isArray(items) ? items : [];
  if (!saleItems.length) return { masterUpdated: 0, storeUpdated: 0 };

  const stores = storeId
    ? [await getStoreById(String(storeId))]
    : [((await getStores())[0] || null)];
  const store = stores[0];
  if (!store) return { masterUpdated: 0, storeUpdated: 0 };

  let masterUpdated = 0;
  let storeUpdated = 0;
  const configDb = await mongoManager.getConfigDb();
  const masterCollection = configDb.collection('master_catalog');
  const storeDb = await mongoManager.getDb(store.mongoUri, store.dbName);
  const barangCollection = storeDb.collection('tm_barang');

  for (const item of saleItems) {
    const codes = saleItemCodes(item);
    const qty = Math.max(1, Number(item.qty ?? item.raw?.qty ?? 1) || 1);
    masterUpdated += await decrementByCodes(masterCollection, { storeId: store.id }, codes, qty);
    storeUpdated += await decrementByCodes(barangCollection, {}, codes, qty);
  }

  return { masterUpdated, storeUpdated };
}

module.exports = { getProducts, getFavoriteProducts, markCatalogueItemsSold, PRODUCT_FIELDS };

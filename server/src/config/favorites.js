const mongoManager = require('../services/mongo-manager');

const COLLECTION = 'favorites';

async function getCollection() {
  const db = await mongoManager.getConfigDb();
  const col = db.collection(COLLECTION);
  await col.createIndex({ device_id: 1, product_id: 1 }, { unique: true });
  await col.createIndex({ device_id: 1, created_at: -1 });
  return col;
}

function normalizeFavorite(doc) {
  if (!doc) return doc;
  return {
    id: String(doc._id),
    device_id: doc.device_id,
    product_id: doc.product_id,
    created_at: doc.created_at,
  };
}

function normalizeDeviceId(deviceId) {
  return String(deviceId || '').trim();
}

function normalizeProductId(productId) {
  return String(productId || '').trim();
}

async function listFavoriteIds(deviceId) {
  const normalizedDeviceId = normalizeDeviceId(deviceId);
  if (!normalizedDeviceId) return [];
  const col = await getCollection();
  const docs = await col.find({ device_id: normalizedDeviceId }).sort({ created_at: -1 }).toArray();
  return docs.map(normalizeFavorite);
}

async function addFavorite({ deviceId, productId }) {
  const device_id = normalizeDeviceId(deviceId);
  const product_id = normalizeProductId(productId);
  if (!device_id) throw new Error('device_id wajib diisi.');
  if (!product_id) throw new Error('product_id wajib diisi.');

  const col = await getCollection();
  const created_at = new Date().toISOString();
  await col.updateOne(
    { device_id, product_id },
    { $setOnInsert: { device_id, product_id, created_at } },
    { upsert: true },
  );
  const doc = await col.findOne({ device_id, product_id });
  return normalizeFavorite(doc);
}

async function removeFavorite({ deviceId, productId }) {
  const device_id = normalizeDeviceId(deviceId);
  const product_id = normalizeProductId(productId);
  if (!device_id) throw new Error('device_id wajib diisi.');
  if (!product_id) throw new Error('product_id wajib diisi.');

  const col = await getCollection();
  const result = await col.deleteOne({ device_id, product_id });
  return result.deletedCount > 0;
}

module.exports = {
  listFavoriteIds,
  addFavorite,
  removeFavorite,
};

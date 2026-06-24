const { ObjectId } = require('mongodb');
const mongoManager = require('../services/mongo-manager');
const { getStores } = require('./store-config');
const { normalizeQris, validateQris, getMerchantInfo } = require('../services/qris/qris-service');

const COLLECTION = 'qris_settings';

async function getCollection() {
  const db = await mongoManager.getConfigDb();
  return db.collection(COLLECTION);
}

function settingLookupQuery(id) {
  return ObjectId.isValid(id)
    ? { $or: [{ _id: new ObjectId(id) }, { id }] }
    : { id };
}

function storeId(store) {
  return String(store?.id || store?._id || '');
}

function normalizeSetting(doc) {
  if (!doc) return doc;
  return {
    ...doc,
    id: doc.id || String(doc._id),
  };
}

async function listQrisSettings() {
  const col = await getCollection();
  const docs = await col.find({}).sort({ updated_at: -1, created_at: -1 }).toArray();
  return docs.map(normalizeSetting);
}

async function getQrisSettingById(id) {
  const col = await getCollection();
  return normalizeSetting(await col.findOne(settingLookupQuery(id)));
}

async function getActiveQrisByStore(storeIdValue) {
  const col = await getCollection();
  const doc = await col.find({ 'stores.store_id': String(storeIdValue) })
    .sort({ qris_active: -1, updated_at: -1 })
    .limit(1)
    .next();
  return normalizeSetting(doc);
}

async function buildStoreRefs(storeIds) {
  const stores = await getStores();
  const storeMap = new Map(stores.map((store) => [storeId(store), store]));
  const refs = [];
  for (const id of storeIds.map(String)) {
    const store = storeMap.get(id);
    if (!store) {
      throw new Error(`Cabang tidak ditemukan: ${id}`);
    }
    refs.push({
      store_id: id,
      kode_cabang: store.firebaseCode || '',
      nama_cabang: store.name || id,
      domain: store.nagagoldDomain || store.domain || store.baseUrl || store.apiUrl || '',
    });
  }
  return refs;
}

async function findActiveStoreConflicts(storeIds, exceptId = '') {
  const col = await getCollection();
  const query = {
    qris_active: true,
    'stores.store_id': { $in: storeIds.map(String) },
  };
  if (exceptId) {
    query.id = { $ne: exceptId };
  }
  const docs = await col.find(query).toArray();
  return docs.map(normalizeSetting);
}

async function detachStoresFromActiveSettings(storeIds, exceptId = '') {
  const col = await getCollection();
  const ids = storeIds.map(String);
  const conflicts = await findActiveStoreConflicts(ids, exceptId);
  for (const setting of conflicts) {
    const nextStores = (setting.stores || []).filter((store) => !ids.includes(String(store.store_id)));
    await col.updateOne(
      { _id: setting._id },
      {
        $set: {
          stores: nextStores,
          qris_active: nextStores.length > 0 ? setting.qris_active : false,
          updated_at: new Date().toISOString(),
        },
      },
    );
  }
}

async function saveQrisSetting(input = {}) {
  const col = await getCollection();
  const id = input.id ? String(input.id) : new ObjectId().toHexString();
  const storeIds = Array.isArray(input.storeIds) ? input.storeIds.map(String).filter(Boolean) : [];
  if (!storeIds.length) {
    throw new Error('Minimal satu cabang harus dipilih.');
  }

  const qrisString = normalizeQris(input.qrisString || input.qris_string || '');
  if (!qrisString) throw new Error('qris_string wajib diisi.');
  validateQris(qrisString);
  const merchant = getMerchantInfo(qrisString);
  const qrisActive = input.qrisActive ?? input.qris_active ?? true;
  const existing = await getQrisSettingById(id);
  const effectiveId = existing?.id || id;

  if (qrisActive) {
    const conflicts = await findActiveStoreConflicts(storeIds, effectiveId);
    if (conflicts.length && !input.force) {
      const error = new Error('Sebagian cabang sudah dipakai di QRIS aktif lain.');
      error.statusCode = 409;
      error.conflicts = conflicts.map((setting) => ({
        id: setting.id,
        nama_qris: setting.nama_qris,
        stores: (setting.stores || []).filter((store) => storeIds.includes(String(store.store_id))),
      }));
      throw error;
    }
    await detachStoresFromActiveSettings(storeIds, effectiveId);
  }

  const now = new Date().toISOString();
  const doc = {
    id: effectiveId,
    nama_qris: String(input.namaQris || input.nama_qris || merchant.merchant || 'QRIS').trim(),
    qris_string: qrisString,
    merchant_name: merchant.merchant || '',
    merchant_city: merchant.city || '',
    qris_active: Boolean(qrisActive),
    stores: await buildStoreRefs(storeIds),
    updated_at: now,
  };

  if (existing) {
    await col.updateOne({ _id: existing._id }, { $set: doc });
  } else {
    await col.insertOne({ _id: new ObjectId(effectiveId), ...doc, created_at: now });
  }

  return getQrisSettingById(effectiveId);
}

async function setQrisSettingActive(id, qrisActive) {
  const col = await getCollection();
  const current = await getQrisSettingById(id);
  if (!current) return null;
  if (qrisActive) {
    const storeIds = (current.stores || []).map((store) => String(store.store_id));
    const conflicts = await findActiveStoreConflicts(storeIds, current.id);
    if (conflicts.length) {
      const error = new Error('Sebagian cabang sudah dipakai di QRIS aktif lain.');
      error.statusCode = 409;
      error.conflicts = conflicts;
      throw error;
    }
  }
  await col.updateOne(settingLookupQuery(id), { $set: { qris_active: Boolean(qrisActive), updated_at: new Date().toISOString() } });
  return getQrisSettingById(id);
}

async function deleteQrisSetting(id) {
  const col = await getCollection();
  const result = await col.deleteOne(settingLookupQuery(id));
  return result.deletedCount > 0;
}

module.exports = {
  listQrisSettings,
  getQrisSettingById,
  getActiveQrisByStore,
  saveQrisSetting,
  setQrisSettingActive,
  deleteQrisSetting,
};

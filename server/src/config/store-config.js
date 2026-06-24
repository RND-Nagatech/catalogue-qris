const { v4: uuidv4 } = require('uuid');
const { ObjectId } = require('mongodb');
const mongoManager = require('../services/mongo-manager');

const COLLECTION = 'stores';

/**
 * Ambil koleksi stores dari config DB
 */
async function getCollection() {
  const db = await mongoManager.getConfigDb();
  return db.collection(COLLECTION);
}

function normalizeStore(doc) {
  if (!doc) return doc;
  return {
    ...doc,
    id: doc.id || String(doc._id),
  };
}

function storeLookupQuery(id) {
  return ObjectId.isValid(id)
    ? { $or: [{ id }, { _id: new ObjectId(id) }] }
    : { id };
}

/**
 * Ambil semua toko
 * @returns {Promise<Array>}
 */
async function getStores() {
  const col = await getCollection();
  const stores = await col.find({}).sort({ createdAt: 1 }).toArray();
  return stores.map(normalizeStore);
}

/**
 * Cari toko berdasarkan ID
 * @param {string} id
 * @returns {Promise<object|null>}
 */
async function getStoreById(id) {
  const col = await getCollection();
  const store = await col.findOne(storeLookupQuery(id));
  return normalizeStore(store);
}

/**
 * Tambah toko baru
 * @param {{ id?: string, name: string, mongoUri: string, dbName: string, firebaseCode?: string, nagagoldDomain?: string, domain?: string, baseUrl?: string, apiUrl?: string, nagagoldApiKey?: string, openApiKey?: string, apiKey?: string, qris_string?: string, merchant_name?: string, merchant_city?: string, qris_active?: boolean }} store
 * @returns {Promise<object>}
 */
async function addStore(store) {
  const col = await getCollection();
  const id = store.id || uuidv4();
  const existing = await col.findOne({ id });
  if (existing) {
    throw new Error(`Store id sudah digunakan: ${id}`);
  }

  const doc = {
    id,
    name: store.name,
    mongoUri: store.mongoUri,
    dbName: store.dbName,
    firebaseCode: store.firebaseCode || '',
    nagagoldDomain: store.nagagoldDomain || store.domain || store.baseUrl || store.apiUrl || '',
    nagagoldApiKey: store.nagagoldApiKey || store.openApiKey || store.apiKey || '',
    qris_string: store.qris_string || '',
    merchant_name: store.merchant_name || '',
    merchant_city: store.merchant_city || '',
    qris_active: store.qris_active ?? true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  await col.insertOne(doc);
  return doc;
}

/**
 * Update toko
 * @param {string} id
 * @param {{ id?: string, name?: string, mongoUri?: string, dbName?: string, firebaseCode?: string, nagagoldDomain?: string, domain?: string, baseUrl?: string, apiUrl?: string, nagagoldApiKey?: string, openApiKey?: string, apiKey?: string, qris_string?: string, merchant_name?: string, merchant_city?: string, qris_active?: boolean }} updates
 * @returns {Promise<object|null>}
 */
async function updateStore(id, updates) {
  const col = await getCollection();
  const current = await col.findOne(storeLookupQuery(id));
  if (!current) return null;

  if (updates.id && updates.id !== current.id) {
    const duplicate = await col.findOne({ id: updates.id });
    if (duplicate && String(duplicate._id) !== String(current._id)) {
      throw new Error(`Store id sudah digunakan: ${updates.id}`);
    }
  }

  const allowed = ['id', 'name', 'mongoUri', 'dbName', 'firebaseCode', 'nagagoldDomain', 'domain', 'baseUrl', 'apiUrl', 'nagagoldApiKey', 'openApiKey', 'apiKey', 'qris_string', 'merchant_name', 'merchant_city', 'qris_active'];
  const set = {};
  for (const key of allowed) {
    if (updates[key] !== undefined) {
      set[key] = updates[key];
    }
  }
  set.updatedAt = new Date().toISOString();

  const result = await col.findOneAndUpdate(
    { _id: current._id },
    { $set: set },
    { returnDocument: 'after' }
  );
  return normalizeStore(result);
}

async function updateStoresQris(storeIds, qris) {
  const updated = [];
  for (const id of storeIds) {
    const store = await updateStore(id, qris);
    if (store) updated.push(store);
  }
  return updated;
}

/**
 * Hapus toko
 * @param {string} id
 * @returns {Promise<boolean>}
 */
async function deleteStore(id) {
  const col = await getCollection();
  const result = await col.deleteOne(storeLookupQuery(id));
  return result.deletedCount > 0;
}

module.exports = { getStores, getStoreById, addStore, updateStore, updateStoresQris, deleteStore };

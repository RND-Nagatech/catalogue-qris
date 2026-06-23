const { v4: uuidv4 } = require('uuid');
const mongoManager = require('../services/mongo-manager');

const COLLECTION = 'stores';

/**
 * Ambil koleksi stores dari config DB
 */
async function getCollection() {
  const db = await mongoManager.getConfigDb();
  return db.collection(COLLECTION);
}

/**
 * Ambil semua toko
 * @returns {Promise<Array>}
 */
async function getStores() {
  const col = await getCollection();
  return col.find({}).sort({ createdAt: 1 }).toArray();
}

/**
 * Cari toko berdasarkan ID
 * @param {string} id
 * @returns {Promise<object|null>}
 */
async function getStoreById(id) {
  const col = await getCollection();
  return col.findOne({ id });
}

/**
 * Tambah toko baru
 * @param {{ name: string, mongoUri: string, dbName: string, firebaseCode?: string, nagagoldDomain?: string, domain?: string, baseUrl?: string, apiUrl?: string }} store
 * @returns {Promise<object>}
 */
async function addStore(store) {
  const col = await getCollection();
  const doc = {
    id: uuidv4(),
    name: store.name,
    mongoUri: store.mongoUri,
    dbName: store.dbName,
    firebaseCode: store.firebaseCode || '',
    nagagoldDomain: store.nagagoldDomain || store.domain || store.baseUrl || store.apiUrl || '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  await col.insertOne(doc);
  return doc;
}

/**
 * Update toko
 * @param {string} id
 * @param {{ name?: string, mongoUri?: string, dbName?: string, firebaseCode?: string, nagagoldDomain?: string, domain?: string, baseUrl?: string, apiUrl?: string }} updates
 * @returns {Promise<object|null>}
 */
async function updateStore(id, updates) {
  const col = await getCollection();
  const allowed = ['name', 'mongoUri', 'dbName', 'firebaseCode', 'nagagoldDomain', 'domain', 'baseUrl', 'apiUrl'];
  const set = {};
  for (const key of allowed) {
    if (updates[key] !== undefined) {
      set[key] = updates[key];
    }
  }
  set.updatedAt = new Date().toISOString();

  const result = await col.findOneAndUpdate(
    { id },
    { $set: set },
    { returnDocument: 'after' }
  );
  return result;
}

/**
 * Hapus toko
 * @param {string} id
 * @returns {Promise<boolean>}
 */
async function deleteStore(id) {
  const col = await getCollection();
  const result = await col.deleteOne({ id });
  return result.deletedCount > 0;
}

module.exports = { getStores, getStoreById, addStore, updateStore, deleteStore };

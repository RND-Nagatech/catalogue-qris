const mongoManager = require('./mongo-manager');
const Encryptor = require('../utils/encryptor');

const encryptor = new Encryptor(process.env.ENCRYPT_KEY || 'b3r4sput1h');

function isHexAscii(value) {
  return value.length > 0 && value.length % 2 === 0 && /^[0-9a-f]+$/i.test(value);
}

function cleanFilterName(value) {
  return String(value || '')
    .replace(/[^\x20-\x7E]/g, '')
    .trim();
}

function looksLikeEncryptedText(value) {
  return /^[A-F0-9]{6,}/.test(value);
}

function decryptName(value, fallback = '') {
  const raw = String(value || '').trim();
  if (!isHexAscii(raw)) return cleanFilterName(raw);

  const decrypted = cleanFilterName(encryptor.decryptascii(raw));
  return looksLikeEncryptedText(decrypted) ? cleanFilterName(fallback) : decrypted;
}

/**
 * Ambil semua data dari satu koleksi di semua toko,
 * decrypt field tertentu, deduplikasi, return sorted array.
 *
 * @param {Array} stores - daftar toko dari store-config
 * @param {string} collectionName - nama koleksi (tm_group, tm_dept, tm_baki)
 * @param {string} nameField - nama field yang akan didecrypt & dijadikan value
 * @param {string} codeField - nama field kode (untuk filter)
 * @returns {Promise<Array<{code: string, name: string}>>}
 */
async function fetchFilterData(stores, collectionName, nameField, codeField) {
  const seen = new Set();
  const results = [];

  const storeResults = await Promise.allSettled(
    stores.map(async (store) => {
      const db = await mongoManager.getDb(store.mongoUri, store.dbName);
      const collection = db.collection(collectionName);
      return collection.find({}).toArray();
    })
  );

  for (let i = 0; i < storeResults.length; i++) {
    const result = storeResults[i];
    if (result.status === 'rejected') {
      console.error(
        `[filter-service] Gagal query ${collectionName} dari "${stores[i]?.name}":`,
        result.reason.message
      );
      continue;
    }

    const items = result.value;
    for (const item of items) {
      const code = item[codeField] || '';
      const name = decryptName(item[nameField], code);

      if (!name) continue;

      const key = name.toLowerCase().trim();
      if (seen.has(key)) continue;
      seen.add(key);

      results.push({ code, name });
    }
  }

  // Sort A-Z
  results.sort((a, b) => a.name.localeCompare(b.name, 'id'));
  return results;
}

/**
 * Ambil data tm_group (kode_group, nama_group)
 */
async function getGroups(stores) {
  return fetchFilterData(stores, 'tm_group', 'nama_group', 'kode_group');
}

/**
 * Ambil data tm_dept (kode_dept, nama_dept)
 */
async function getDepartments(stores) {
  return fetchFilterData(stores, 'tm_dept', 'nama_dept', 'kode_dept');
}

/**
 * Ambil data tm_baki (kode_baki, nama_baki)
 */
async function getBaki(stores) {
  return fetchFilterData(stores, 'tm_baki', 'nama_baki', 'kode_baki');
}

module.exports = { getGroups, getDepartments, getBaki };

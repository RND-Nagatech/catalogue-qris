const crypto = require('crypto');
const mongoManager = require('../mongo-manager');
const { getStores, getStoreById } = require('../../config/store-config');
const { formatNagagoldError, normalizeDomain } = require('./helpers');

const tokenPusat = process.env.TOKEN_PUSAT;
const nagagoldApiKey = process.env.NAGAGOLD_API_KEY || process.env.OPEN_API_KEY;

function pickDomainFromRecord(record) {
  if (!record || typeof record !== 'object') return '';
  return normalizeDomain(
    record.nagagoldDomain
      || record.domain
      || record.baseUrl
      || record.baseURL
      || record.apiUrl
      || record.apiURL
      || record.url
      || record.endpoint
      || '',
  );
}

async function findDomainFromTmCabang(store) {
  if (!store?.mongoUri || !store?.dbName) return '';

  try {
    const db = await mongoManager.getDb(store.mongoUri, store.dbName);
    const cabang = await db.collection('tm_cabang').findOne({});
    return pickDomainFromRecord(cabang);
  } catch (error) {
    console.warn('[nagagold] Gagal membaca tm_cabang untuk domain:', error.message);
    return '';
  }
}

async function resolveStore(input = {}) {
  const storeId = input.storeId || input.headers?.['x-store-id'] || input.headers?.['X-Store-Id'];
  if (storeId) {
    const store = await getStoreById(String(storeId));
    if (!store) throw new Error(`Store tidak ditemukan: ${storeId}`);
    return store;
  }

  const stores = await getStores();
  if (!stores.length) {
    throw new Error('Data store/cabang catalogue belum tersedia.');
  }

  return stores[0];
}

async function resolveNagagoldTarget(input = {}) {
  const store = await resolveStore(input);
  const storeDomain = pickDomainFromRecord(store);
  const cabangDomain = storeDomain ? '' : await findDomainFromTmCabang(store);
  const envDomain = normalizeDomain(process.env.NAGAGOLD_DOMAIN || process.env.NAGAGOLD_BASE_URL || '');
  const domain = storeDomain || cabangDomain || envDomain;

  if (!domain) {
    throw new Error('Domain NAGAGOLD belum tersedia di data store/cabang catalogue.');
  }

  return { store, domain };
}

function pickApiKeyFromStore(store) {
  return store?.nagagoldApiKey
    || store?.openApiKey
    || store?.apiKey
    || store?.nagagold_api_key
    || '';
}

function nagagoldHeaders(store) {
  if (!tokenPusat) {
    throw new Error('TOKEN_PUSAT is required.');
  }

  const headers = {
    'Content-Type': 'application/json',
    'x-auth-token': tokenPusat,
    'ngrok-skip-browser-warning': '1',
    Authorization: `Bearer ${tokenPusat}`,
    token: tokenPusat,
    'x-token-pusat': tokenPusat,
  };

  const apiKey = pickApiKeyFromStore(store) || nagagoldApiKey;
  if (apiKey) {
    const timestamp = new Date().toISOString();
    headers['api-key'] = apiKey;
    headers.timestamp = timestamp;
    headers.signature = crypto.createHash('sha256').update(`${apiKey}${timestamp}`).digest('hex');
  }

  return headers;
}

async function nagagoldFetch(path, init = {}, context = {}) {
  const { store, domain } = await resolveNagagoldTarget(context);
  const url = `${domain}${path}`;
  let response;

  try {
    response = await fetch(url, {
      ...init,
      headers: {
        ...nagagoldHeaders(store),
        ...(init.headers || {}),
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'fetch failed';
    throw new Error(`Domain NAGAGOLD tidak bisa dijangkau: ${domain}. Detail: ${message}`);
  }

  const contentType = response.headers.get('content-type') || '';
  const data = response.status === 304
    ? null
    : contentType.includes('application/json')
      ? await response.json()
      : await response.text();

  if (!response.ok && response.status !== 304) {
    throw new Error(formatNagagoldError(data, response.status, domain));
  }

  return { data, status: response.status, url, store, domain };
}

async function nagagoldRequest(path, body, context = {}) {
  const response = await nagagoldFetch(path, {
    method: 'POST',
    body: JSON.stringify(body),
  }, context);
  return response.data;
}

module.exports = {
  nagagoldFetch,
  nagagoldRequest,
  resolveNagagoldTarget,
};

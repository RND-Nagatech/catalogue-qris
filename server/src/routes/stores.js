const {
  getStores,
  getStoreById,
  addStore,
  updateStore,
  updateStoresQris,
  deleteStore,
} = require('../config/store-config');
const { success, error } = require('../utils/response');
const { apiKeyMiddleware } = require('../middleware/api-key');
const { normalizeQris, validateQris, getMerchantInfo } = require('../services/qris/qris-service');

const STORE_ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function isValidStoreId(id) {
  return !id || STORE_ID_PATTERN.test(id);
}

/**
 * Register route CRUD pengaturan toko
 * @param {import('fastify').FastifyInstance} fastify
 */
async function storeRoutes(fastify) {
  // Middleware API key untuk semua route di sini
  fastify.addHook('preHandler', apiKeyMiddleware);

  // GET /api/stores — list semua toko
  fastify.get('/', async (_request, reply) => {
    const stores = await getStores();
    return success(reply, stores);
  });

  fastify.get('/:id', async (request, reply) => {
    const store = await getStoreById(String(request.params.id));
    if (!store) {
      return error(reply, 'Toko tidak ditemukan', 404);
    }
    return success(reply, store);
  });

  fastify.put('/qris', async (request, reply) => {
    const { storeIds, qrisString, qrisActive = true } = request.body || {};
    if (!Array.isArray(storeIds) || !storeIds.length) {
      return error(reply, 'Minimal satu cabang harus dipilih', 400);
    }

    const normalized = normalizeQris(qrisString || '');
    if (!normalized) {
      return error(reply, 'qrisString wajib diisi', 400);
    }

    try {
      validateQris(normalized);
      const merchant = getMerchantInfo(normalized);
      const updatedStores = await updateStoresQris(storeIds.map(String), {
        qris_string: normalized,
        merchant_name: merchant.merchant || '',
        merchant_city: merchant.city || '',
        qris_active: Boolean(qrisActive),
      });

      if (updatedStores.length !== storeIds.length) {
        return error(reply, 'Sebagian cabang tidak ditemukan', 404);
      }

      return success(reply, { stores: updatedStores });
    } catch (err) {
      return error(reply, err.message || 'QRIS cabang belum bisa disimpan', 400);
    }
  });

  // POST /api/stores — tambah toko baru
  fastify.post('/', async (request, reply) => {
    const { id, name, mongoUri, dbName, firebaseCode, nagagoldDomain, domain, baseUrl, apiUrl, nagagoldApiKey, openApiKey, apiKey } = request.body || {};

    if (!name || !mongoUri || !dbName) {
      return error(
        reply,
        'name, mongoUri, dan dbName wajib diisi',
        400
      );
    }

    if (!isValidStoreId(id)) {
      return error(reply, 'id toko hanya boleh huruf kecil, angka, dan tanda hubung. Contoh: qc-sambas', 400);
    }

    // Validasi format MongoDB URI
    if (!mongoUri.startsWith('mongodb://') && !mongoUri.startsWith('mongodb+srv://')) {
      return error(reply, 'mongoUri harus diawali mongodb:// atau mongodb+srv://', 400);
    }

    try {
      const store = await addStore({ id, name, mongoUri, dbName, firebaseCode, nagagoldDomain, domain, baseUrl, apiUrl, nagagoldApiKey, openApiKey, apiKey });
      return success(reply, store, {}, 201);
    } catch (err) {
      return error(reply, err.message || 'Toko belum bisa ditambahkan', 400);
    }
  });

  // PUT /api/stores/:id — update toko
  fastify.put('/:id', async (request, reply) => {
    const { id } = request.params;
    const updates = request.body || {};

    if (!updates.id && !updates.name && !updates.mongoUri && !updates.dbName && !updates.firebaseCode && !updates.nagagoldDomain && !updates.domain && !updates.baseUrl && !updates.apiUrl && !updates.nagagoldApiKey && !updates.openApiKey && !updates.apiKey) {
      return error(reply, 'Minimal satu field store harus diisi', 400);
    }

    if (!isValidStoreId(updates.id)) {
      return error(reply, 'id toko hanya boleh huruf kecil, angka, dan tanda hubung. Contoh: qc-sambas', 400);
    }

    if (updates.mongoUri && !updates.mongoUri.startsWith('mongodb://') && !updates.mongoUri.startsWith('mongodb+srv://')) {
      return error(reply, 'mongoUri harus diawali mongodb:// atau mongodb+srv://', 400);
    }

    let updated;
    try {
      updated = await updateStore(id, updates);
      if (!updated) {
        return error(reply, 'Toko tidak ditemukan', 404);
      }
    } catch (err) {
      return error(reply, err.message || 'Toko belum bisa diperbarui', 400);
    }

    return success(reply, updated);
  });

  // DELETE /api/stores/:id — hapus toko
  fastify.delete('/:id', async (request, reply) => {
    const { id } = request.params;
    const deleted = await deleteStore(id);
    if (!deleted) {
      return error(reply, 'Toko tidak ditemukan', 404);
    }
    return success(reply, { message: 'Toko berhasil dihapus' });
  });
}

module.exports = storeRoutes;

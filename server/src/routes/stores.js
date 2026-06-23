const {
  getStores,
  getStoreById,
  addStore,
  updateStore,
  deleteStore,
} = require('../config/store-config');
const { success, error } = require('../utils/response');
const { apiKeyMiddleware } = require('../middleware/api-key');

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

  // POST /api/stores — tambah toko baru
  fastify.post('/', async (request, reply) => {
    const { name, mongoUri, dbName, firebaseCode, nagagoldDomain, domain, baseUrl, apiUrl } = request.body || {};

    if (!name || !mongoUri || !dbName) {
      return error(
        reply,
        'name, mongoUri, dan dbName wajib diisi',
        400
      );
    }

    // Validasi format MongoDB URI
    if (!mongoUri.startsWith('mongodb://') && !mongoUri.startsWith('mongodb+srv://')) {
      return error(reply, 'mongoUri harus diawali mongodb:// atau mongodb+srv://', 400);
    }

    const store = await addStore({ name, mongoUri, dbName, firebaseCode, nagagoldDomain, domain, baseUrl, apiUrl });
    return success(reply, store, {}, 201);
  });

  // PUT /api/stores/:id — update toko
  fastify.put('/:id', async (request, reply) => {
    const { id } = request.params;
    const updates = request.body || {};

    if (!updates.name && !updates.mongoUri && !updates.dbName && !updates.firebaseCode && !updates.nagagoldDomain && !updates.domain && !updates.baseUrl && !updates.apiUrl) {
      return error(reply, 'Minimal satu field store harus diisi', 400);
    }

    if (updates.mongoUri && !updates.mongoUri.startsWith('mongodb://') && !updates.mongoUri.startsWith('mongodb+srv://')) {
      return error(reply, 'mongoUri harus diawali mongodb:// atau mongodb+srv://', 400);
    }

    const updated = await updateStore(id, updates);
    if (!updated) {
      return error(reply, 'Toko tidak ditemukan', 404);
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

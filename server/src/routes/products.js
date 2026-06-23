const { getStores } = require('../config/store-config');
const { getProducts } = require('../services/product-service');
const { success, error } = require('../utils/response');
const { apiKeyMiddleware } = require('../middleware/api-key');

/**
 * Register route untuk mengambil produk
 * @param {import('fastify').FastifyInstance} fastify
 */
async function productRoutes(fastify) {
  fastify.addHook('preHandler', apiKeyMiddleware);

  // GET /api/products — ambil produk dari semua toko (atau filter)
  fastify.get('/', async (request, reply) => {
    const stores = await getStores();

    if (stores.length === 0) {
      return success(reply, [], { page: 1, limit: 20, total: 0 });
    }

    const {
      search,
      storeId,
      group,
      dept,
      toko,
      page: pageStr,
      limit: limitStr,
    } = request.query;

    const page = Math.max(1, parseInt(pageStr, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(limitStr, 10) || 20));

    try {
      const { data, meta } = await getProducts(stores, {
        search: search || undefined,
        storeId: storeId || undefined,
        group: group || undefined,
        dept: dept || undefined,
        toko: toko || undefined,
        page,
        limit,
      });

      return success(reply, data, meta);
    } catch (err) {
      console.error('[products] Error:', err.message);
      return error(reply, `Gagal mengambil data produk: ${err.message}`, 500);
    }
  });
}

module.exports = productRoutes;

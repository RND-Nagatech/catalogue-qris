const { getStores } = require('../config/store-config');
const { listFavoriteIds, addFavorite, removeFavorite } = require('../config/favorites');
const { getFavoriteProducts } = require('../services/product-service');
const { apiKeyMiddleware } = require('../middleware/api-key');
const { success, error } = require('../utils/response');

async function favoriteRoutes(fastify) {
  fastify.addHook('preHandler', apiKeyMiddleware);

  fastify.get('/ids', async (request, reply) => {
    try {
      const favorites = await listFavoriteIds(request.query.deviceId || request.query.device_id);
      return success(reply, favorites);
    } catch (err) {
      return error(reply, err.message || 'Gagal mengambil favorit.', 500);
    }
  });

  fastify.get('/', async (request, reply) => {
    try {
      const deviceId = request.query.deviceId || request.query.device_id;
      const page = Math.max(1, parseInt(request.query.page, 10) || 1);
      const limit = Math.min(100, Math.max(1, parseInt(request.query.limit, 10) || 20));
      const favorites = await listFavoriteIds(deviceId);
      const stores = await getStores();
      const { data, meta } = await getFavoriteProducts(stores, favorites, {
        page,
        limit,
        search: request.query.search || undefined,
      });
      return success(reply, data, meta);
    } catch (err) {
      return error(reply, err.message || 'Gagal mengambil produk favorit.', 500);
    }
  });

  fastify.post('/', async (request, reply) => {
    try {
      const favorite = await addFavorite({
        deviceId: request.body?.deviceId || request.body?.device_id,
        productId: request.body?.productId || request.body?.product_id,
      });
      return success(reply, favorite, {}, 201);
    } catch (err) {
      return error(reply, err.message || 'Gagal menyimpan favorit.', 400);
    }
  });

  fastify.delete('/:productId', async (request, reply) => {
    try {
      const deleted = await removeFavorite({
        deviceId: request.query.deviceId || request.query.device_id,
        productId: decodeURIComponent(request.params.productId),
      });
      return success(reply, { deleted });
    } catch (err) {
      return error(reply, err.message || 'Gagal menghapus favorit.', 400);
    }
  });
}

module.exports = favoriteRoutes;

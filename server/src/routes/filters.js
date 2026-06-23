const { getStores } = require('../config/store-config');
const { getGroups, getDepartments, getBaki } = require('../services/filter-service');
const { success, error } = require('../utils/response');
const { apiKeyMiddleware } = require('../middleware/api-key');

/**
 * Register route untuk data filter (group, dept, baki)
 * @param {import('fastify').FastifyInstance} fastify
 */
async function filterRoutes(fastify) {
  fastify.addHook('preHandler', apiKeyMiddleware);

  // GET /api/filters/groups — semua group unik dari semua toko
  fastify.get('/groups', async (_request, reply) => {
    const stores = await getStores();
    if (stores.length === 0) {
      return success(reply, []);
    }
    try {
      const data = await getGroups(stores);
      return success(reply, data);
    } catch (err) {
      console.error('[filters] groups error:', err.message);
      return error(reply, `Gagal mengambil data group: ${err.message}`, 500);
    }
  });

  // GET /api/filters/depts — semua dept unik dari semua toko
  fastify.get('/depts', async (_request, reply) => {
    const stores = await getStores();
    if (stores.length === 0) {
      return success(reply, []);
    }
    try {
      const data = await getDepartments(stores);
      return success(reply, data);
    } catch (err) {
      console.error('[filters] depts error:', err.message);
      return error(reply, `Gagal mengambil data dept: ${err.message}`, 500);
    }
  });

  // GET /api/filters/baki — semua baki unik dari semua toko
  fastify.get('/baki', async (_request, reply) => {
    const stores = await getStores();
    if (stores.length === 0) {
      return success(reply, []);
    }
    try {
      const data = await getBaki(stores);
      return success(reply, data);
    } catch (err) {
      console.error('[filters] baki error:', err.message);
      return error(reply, `Gagal mengambil data baki: ${err.message}`, 500);
    }
  });
}

module.exports = filterRoutes;

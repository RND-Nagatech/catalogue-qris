const { runSync, getStatus } = require('../services/sync-service');
const { success, error } = require('../utils/response');
const { apiKeyMiddleware } = require('../middleware/api-key');

/**
 * Register route untuk sync gambar
 * @param {import('fastify').FastifyInstance} fastify
 */
async function syncRoutes(fastify) {
  fastify.addHook('preHandler', apiKeyMiddleware);

  // POST /api/sync/start — trigger sync
  fastify.post('/start', async (_request, reply) => {
    try {
      const result = await runSync();

      if (result.error) {
        return error(reply, result.error, 409);
      }

      return success(reply, result);
    } catch (err) {
      console.error('[sync] Error:', err.message);
      return error(reply, `Sync gagal: ${err.message}`, 500);
    }
  });

  // GET /api/sync/status — lihat status sync
  fastify.get('/status', async (_request, reply) => {
    try {
      const status = await getStatus();
      return success(reply, status);
    } catch (err) {
      return error(reply, `Gagal ambil status: ${err.message}`, 500);
    }
  });
}

module.exports = syncRoutes;

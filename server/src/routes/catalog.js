const { runCatalogSync, getCatalogStatus } = require('../services/catalog-sync-service');
const { success, error } = require('../utils/response');
const { apiKeyMiddleware } = require('../middleware/api-key');

async function catalogRoutes(fastify) {
  fastify.addHook('preHandler', apiKeyMiddleware);

  // POST /api/catalog/sync — trigger ETL
  fastify.post('/sync', async (_request, reply) => {
    try {
      const result = await runCatalogSync();
      if (result.error) {
        return error(reply, result.error, 409);
      }
      return success(reply, result);
    } catch (err) {
      return error(reply, `Catalog sync gagal: ${err.message}`, 500);
    }
  });

  // GET /api/catalog/status
  fastify.get('/status', async (_request, reply) => {
    try {
      const status = getCatalogStatus();
      return success(reply, status);
    } catch (err) {
      return error(reply, err.message, 500);
    }
  });
}

module.exports = catalogRoutes;

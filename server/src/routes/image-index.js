const axios = require('axios');
const { success, error } = require('../utils/response');
const { apiKeyMiddleware } = require('../middleware/api-key');

const PYTHON_URL = process.env.IMAGE_SEARCH_URL || 'http://localhost:3751';

async function imageIndexRoutes(fastify) {
  fastify.addHook('preHandler', apiKeyMiddleware);

  // POST /api/image-index/start
  fastify.post('/start', async (request, reply) => {
    try {
      const reset = request.query?.reset === 'true';
      const res = await axios.post(`${PYTHON_URL}/index/start?reset=${reset}`, {}, { timeout: 5000 });
      return success(reply, res.data);
    } catch (err) {
      if (err.response?.status === 409) return error(reply, 'Index build already running', 409);
      return error(reply, `Failed: ${err.message}`, 500);
    }
  });

  // GET /api/image-index/status
  fastify.get('/status', async (_request, reply) => {
    try {
      const res = await axios.get(`${PYTHON_URL}/index/status`, { timeout: 5000 });
      return success(reply, res.data?.data);
    } catch (err) {
      return error(reply, `Failed: ${err.message}`, 500);
    }
  });
}

module.exports = imageIndexRoutes;

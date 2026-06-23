const { success, error } = require('../utils/response');
const { apiKeyMiddleware } = require('../middleware/api-key');
const { getStatus, restartBot, logoutBot } = require('../services/whatsapp-bot');

async function whatsappRoutes(fastify) {
  fastify.addHook('preHandler', apiKeyMiddleware);

  // GET /api/whatsapp/status
  fastify.get('/status', async (_request, reply) => {
    return success(reply, getStatus());
  });

  // POST /api/whatsapp/restart — disconnect & reconnect
  fastify.post('/restart', async (_request, reply) => {
    try {
      await restartBot();
      return success(reply, { message: 'Bot restart initiated. Check logs for QR code.' });
    } catch (err) {
      return error(reply, err.message, 500);
    }
  });

  // POST /api/whatsapp/logout — full logout (delete auth)
  fastify.post('/logout', async (_request, reply) => {
    try {
      await logoutBot();
      return success(reply, { message: 'Logged out. Restart to pair new device.' });
    } catch (err) {
      return error(reply, err.message, 500);
    }
  });
}

module.exports = whatsappRoutes;

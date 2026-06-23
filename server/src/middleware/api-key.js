const { error } = require('../utils/response');

/**
 * Middleware validasi API Key.
 * Dicek di preHandler untuk semua route yang membutuhkan.
 * Skip: bisa dikonfigurasi via route options `{ skipApiKey: true }`.
 */
async function apiKeyMiddleware(request, reply) {
  // Beberapa route bisa skip (misal health check)
  if (request.routeOptions?.config?.skipApiKey) {
    return;
  }

  const apiKey = request.headers['x-api-key'];
  const validKey = process.env.API_KEY;

  if (!apiKey || apiKey !== validKey) {
    return error(reply, 'Unauthorized: Invalid or missing API key', 401);
  }
}

module.exports = { apiKeyMiddleware };

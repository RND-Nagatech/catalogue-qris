const {
  listQrisSettings,
  getQrisSettingById,
  getActiveQrisByStore,
  saveQrisSetting,
  setQrisSettingActive,
  deleteQrisSetting,
} = require('../config/qris-settings');
const { apiKeyMiddleware } = require('../middleware/api-key');
const { success, error } = require('../utils/response');

function statusFromError(err) {
  return err?.statusCode || (/tidak ditemukan/i.test(err?.message || '') ? 404 : 400);
}

async function sendError(reply, err) {
  const payload = err?.conflicts ? { message: err.message, conflicts: err.conflicts } : err.message;
  return error(reply, payload, statusFromError(err));
}

async function qrisSettingsRoutes(fastify) {
  fastify.addHook('preHandler', apiKeyMiddleware);

  fastify.get('/', async (_request, reply) => {
    try {
      return success(reply, await listQrisSettings());
    } catch (err) {
      return sendError(reply, err);
    }
  });

  fastify.get('/active/:storeId', async (request, reply) => {
    try {
      return success(reply, await getActiveQrisByStore(request.params.storeId));
    } catch (err) {
      return sendError(reply, err);
    }
  });

  fastify.get('/:id', async (request, reply) => {
    try {
      const setting = await getQrisSettingById(request.params.id);
      if (!setting) return error(reply, 'QRIS tidak ditemukan', 404);
      return success(reply, setting);
    } catch (err) {
      return sendError(reply, err);
    }
  });

  fastify.post('/', async (request, reply) => {
    try {
      return success(reply, await saveQrisSetting(request.body || {}), {}, 201);
    } catch (err) {
      return sendError(reply, err);
    }
  });

  fastify.put('/:id', async (request, reply) => {
    try {
      return success(reply, await saveQrisSetting({ ...(request.body || {}), id: request.params.id }));
    } catch (err) {
      return sendError(reply, err);
    }
  });

  fastify.patch('/:id/active', async (request, reply) => {
    try {
      const setting = await setQrisSettingActive(request.params.id, request.body?.qrisActive ?? request.body?.qris_active);
      if (!setting) return error(reply, 'QRIS tidak ditemukan', 404);
      return success(reply, setting);
    } catch (err) {
      return sendError(reply, err);
    }
  });

  fastify.delete('/:id', async (request, reply) => {
    try {
      const deleted = await deleteQrisSetting(request.params.id);
      if (!deleted) return error(reply, 'QRIS tidak ditemukan', 404);
      return success(reply, { ok: true });
    } catch (err) {
      return sendError(reply, err);
    }
  });
}

module.exports = qrisSettingsRoutes;

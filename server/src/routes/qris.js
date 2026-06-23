const { success, error } = require('../utils/response');
const { apiKeyMiddleware } = require('../middleware/api-key');
const qrisService = require('../services/qris/qris-service');

function errorStatus(message) {
  if (/tidak ditemukan|not found/i.test(message)) return 404;
  if (/required|wajib|invalid|tidak valid|belum disimpan|kosong/i.test(message)) return 400;
  return 500;
}

async function qrisRoutes(fastify) {
  fastify.addHook('preHandler', apiKeyMiddleware);

  fastify.get('/settings', async (_request, reply) => {
    try {
      return success(reply, await qrisService.getQrisSetting());
    } catch (err) {
      return error(reply, err.message, errorStatus(err.message));
    }
  });

  fastify.put('/settings', async (request, reply) => {
    try {
      const setting = await qrisService.saveQrisSetting(request.body?.qrisString);
      return success(reply, setting);
    } catch (err) {
      return error(reply, err.message, errorStatus(err.message));
    }
  });

  fastify.delete('/settings', async (_request, reply) => {
    try {
      return success(reply, await qrisService.clearQrisSetting());
    } catch (err) {
      return error(reply, err.message, errorStatus(err.message));
    }
  });

  fastify.post('/generate', async (request, reply) => {
    try {
      return success(reply, await qrisService.generateQris(request.body || {}));
    } catch (err) {
      return error(reply, err.message, errorStatus(err.message));
    }
  });

  fastify.get('/payments', async (_request, reply) => {
    try {
      return success(reply, { payments: await qrisService.listPendingPayments() });
    } catch (err) {
      return error(reply, err.message, errorStatus(err.message));
    }
  });

  fastify.get('/payments/history/today', async (_request, reply) => {
    try {
      return success(reply, { payments: await qrisService.listTodayPaymentHistory() });
    } catch (err) {
      return error(reply, err.message, errorStatus(err.message));
    }
  });

  fastify.post('/payments', async (request, reply) => {
    try {
      const payment = await qrisService.createPayment(request.body || {});
      return success(reply, { payment }, {}, 201);
    } catch (err) {
      return error(reply, err.message, errorStatus(err.message));
    }
  });

  fastify.get('/payments/:id/status', async (request, reply) => {
    try {
      const payment = await qrisService.getPayment(request.params.id);
      if (!payment) return error(reply, 'Payment not found.', 404);
      return success(reply, {
        id: payment.id,
        status: payment.status,
        paidAt: payment.paidAt || null,
        payment,
      });
    } catch (err) {
      return error(reply, err.message, errorStatus(err.message));
    }
  });

  fastify.patch('/payments/:id/paid', async (request, reply) => {
    try {
      const payment = await qrisService.markPaymentPaid(request.params.id);
      if (!payment) return error(reply, 'Payment not found.', 404);
      return success(reply, { ok: true, payment });
    } catch (err) {
      return error(reply, err.message, errorStatus(err.message));
    }
  });

  fastify.delete('/payments/:id', async (request, reply) => {
    try {
      const deleted = await qrisService.deletePayment(request.params.id);
      if (!deleted) return error(reply, 'Payment not found.', 404);
      return success(reply, { ok: true });
    } catch (err) {
      return error(reply, err.message, errorStatus(err.message));
    }
  });
}

module.exports = qrisRoutes;

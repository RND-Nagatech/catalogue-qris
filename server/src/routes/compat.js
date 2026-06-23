const qrisService = require('../services/qris/qris-service');
const { getStores, updateStore } = require('../config/store-config');

function pickDomain(store) {
  return String(
    store?.nagagoldDomain
      || store?.domain
      || store?.baseUrl
      || store?.apiUrl
      || store?.url
      || '',
  ).replace(/\/+$/, '');
}

function sendError(reply, err) {
  const message = err instanceof Error ? err.message : String(err || 'API request failed.');
  const status = /tidak ditemukan|not found/i.test(message)
    ? 404
    : /required|wajib|invalid|tidak valid|belum disimpan|kosong/i.test(message)
      ? 400
      : 500;
  return reply.status(status).send({ message });
}

async function compatRoutes(fastify) {
  // Compatibility NAGAGOLD setting routes for the existing APK settings screen.
  // Final source of truth is the catalogue store/cabang record, not the old QRIS settings collection.
  fastify.get('/api/settings/nagagold', async (_request, reply) => {
    try {
      const stores = await getStores();
      const store = stores[0] || null;
      const domain = pickDomain(store);
      return reply.send({
        domain: domain || null,
        connection: domain
          ? { ok: true, endpoint: 'catalogue-store', status: 200, checkedAt: store?.updatedAt || store?.createdAt || new Date().toISOString() }
          : null,
      });
    } catch (err) {
      return sendError(reply, err);
    }
  });

  fastify.put('/api/settings/nagagold', async (request, reply) => {
    try {
      const domain = String(request.body?.domain || '').trim().replace(/\/+$/, '');
      if (!domain || !/^https?:\/\//.test(domain)) {
        return reply.status(400).send({ message: 'Domain NAGAGOLD harus diawali http:// atau https://.' });
      }

      const stores = await getStores();
      const store = stores[0];
      if (!store) return reply.status(400).send({ message: 'Data store/cabang catalogue belum tersedia.' });

      await updateStore(store.id, { nagagoldDomain: domain });
      return reply.send({ ok: true, domain, connection: null });
    } catch (err) {
      return sendError(reply, err);
    }
  });

  // Compatibility QRIS settings routes for the existing APK frontend.
  fastify.get('/api/settings/qris', async (_request, reply) => {
    try {
      const setting = await qrisService.getQrisSetting();
      return reply.send({ qrisString: setting.qrisString || null });
    } catch (err) {
      return sendError(reply, err);
    }
  });

  fastify.put('/api/settings/qris', async (request, reply) => {
    try {
      await qrisService.saveQrisSetting(request.body?.qrisString);
      return reply.send({ ok: true });
    } catch (err) {
      return sendError(reply, err);
    }
  });

  fastify.delete('/api/settings/qris', async (_request, reply) => {
    try {
      await qrisService.clearQrisSetting();
      return reply.send({ ok: true });
    } catch (err) {
      return sendError(reply, err);
    }
  });

  fastify.get('/api/payments', async (_request, reply) => {
    try {
      const payments = await qrisService.listPendingPayments();
      return reply.send({ payments });
    } catch (err) {
      return sendError(reply, err);
    }
  });

  fastify.get('/api/payments/history/today', async (_request, reply) => {
    try {
      const payments = await qrisService.listTodayPaymentHistory();
      return reply.send({ payments });
    } catch (err) {
      return sendError(reply, err);
    }
  });

  fastify.post('/api/payments', async (request, reply) => {
    try {
      const payment = await qrisService.createPayment(request.body || {});
      return reply.status(201).send({ payment });
    } catch (err) {
      return sendError(reply, err);
    }
  });

  fastify.patch('/api/payments/:id/paid', async (request, reply) => {
    try {
      const payment = await qrisService.markPaymentPaid(request.params.id);
      if (!payment) return reply.status(404).send({ message: 'Payment not found.' });
      return reply.send({ ok: true });
    } catch (err) {
      return sendError(reply, err);
    }
  });

  fastify.delete('/api/payments/:id', async (request, reply) => {
    try {
      await qrisService.deletePayment(request.params.id);
      return reply.send({ ok: true });
    } catch (err) {
      return sendError(reply, err);
    }
  });
}

module.exports = compatRoutes;

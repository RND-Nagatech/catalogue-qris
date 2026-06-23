const { apiKeyMiddleware } = require('../middleware/api-key');
const { success, error } = require('../utils/response');
const { nagagoldFetch } = require('../services/nagagold/client-service');
const {
  loadDashboard,
  loadHistoryToday,
  loadRuntimeConfig,
  loadConfigVersion,
} = require('../services/nagagold/config-service');
const {
  authorize,
  lookupSaleItem,
  submitSale,
} = require('../services/nagagold/sales-service');
const {
  loadPurchaseRounding,
  lookupPurchaseItem,
  submitPurchase,
} = require('../services/nagagold/purchase-service');

function routeContext(request) {
  return {
    storeId: request.query?.storeId || request.body?.storeId,
    headers: request.headers || {},
  };
}

function statusFromError(err) {
  if (err?.statusCode) return err.statusCode;
  if (/wajib|required|belum tersedia|belum diatur|invalid|tidak valid/i.test(err.message || '')) return 400;
  if (/tidak ditemukan|not found/i.test(err.message || '')) return 404;
  return 500;
}

async function sendRouteError(reply, err) {
  return error(reply, err instanceof Error ? err.message : String(err || 'Internal server error'), statusFromError(err));
}

async function nagagoldRoutes(fastify) {
  fastify.addHook('preHandler', apiKeyMiddleware);

  fastify.get('/bootstrap', async (request, reply) => {
    try {
      return reply.send(await loadRuntimeConfig(routeContext(request)));
    } catch (err) {
      return sendRouteError(reply, err);
    }
  });

  fastify.get('/config', async (request, reply) => {
    try {
      return reply.send(await loadRuntimeConfig(routeContext(request)));
    } catch (err) {
      return sendRouteError(reply, err);
    }
  });

  fastify.get('/config/version', async (request, reply) => {
    try {
      return reply.send(await loadConfigVersion(routeContext(request)));
    } catch (err) {
      return sendRouteError(reply, err);
    }
  });

  fastify.get('/dashboard', async (request, reply) => {
    try {
      return reply.send(await loadDashboard(routeContext(request)));
    } catch (err) {
      return sendRouteError(reply, err);
    }
  });

  fastify.get('/history/today', async (request, reply) => {
    try {
      const type = request.query?.type === 'purchase' ? 'purchase' : 'sale';
      return reply.send({ history: await loadHistoryToday(type, routeContext(request)) });
    } catch (err) {
      return sendRouteError(reply, err);
    }
  });

  fastify.get('/sales', async (request, reply) => {
    try {
      const response = await nagagoldFetch('/api/v1/sales/get/all', { method: 'GET' }, routeContext(request));
      return reply.send({ sales: Array.isArray(response.data) ? response.data : [] });
    } catch (err) {
      return sendRouteError(reply, err);
    }
  });

  fastify.get('/banks', async (request, reply) => {
    try {
      const response = await nagagoldFetch('/api/v1/banks', { method: 'GET' }, routeContext(request));
      return reply.send({ banks: Array.isArray(response.data) ? response.data : [] });
    } catch (err) {
      return sendRouteError(reply, err);
    }
  });

  fastify.get('/rekenings', async (request, reply) => {
    try {
      const response = await nagagoldFetch('/api/v1/rekenings', { method: 'GET' }, routeContext(request));
      return reply.send({ rekenings: Array.isArray(response.data) ? response.data : [] });
    } catch (err) {
      return sendRouteError(reply, err);
    }
  });

  fastify.get('/member/:kode', async (request, reply) => {
    try {
      const kode = encodeURIComponent(String(request.params.kode || '').trim());
      if (!kode) return error(reply, 'Kode member wajib diisi.', 400);
      const response = await nagagoldFetch(`/api/v1/member/get/by-kode-member/${kode}`, { method: 'GET' }, routeContext(request));
      return reply.send({ members: Array.isArray(response.data) ? response.data : [] });
    } catch (err) {
      return sendRouteError(reply, err);
    }
  });

  fastify.post('/members/search', async (request, reply) => {
    try {
      const type = ['nama', 'hp', 'alamat'].includes(request.body?.type) ? request.body.type : 'nama';
      const query = String(request.body?.query || '').trim();
      if (!query) return error(reply, 'Kata kunci customer wajib diisi.', 400);

      const endpoint = type === 'nama'
        ? '/api/v1/member/get/by-nama/'
        : type === 'hp'
          ? '/api/v1/member/get/by-hp'
          : '/api/v1/member/get/by-alamat';
      const key = type === 'hp' ? 'hp' : type;
      const response = await nagagoldFetch(endpoint, {
        method: 'POST',
        body: JSON.stringify({ [key]: query }),
      }, routeContext(request));
      return reply.send({ members: Array.isArray(response.data) ? response.data : [] });
    } catch (err) {
      return sendRouteError(reply, err);
    }
  });

  fastify.get('/barang/:barcode', async (request, reply) => {
    try {
      return reply.send({ item: await lookupSaleItem(request.params.barcode, routeContext(request)) });
    } catch (err) {
      return sendRouteError(reply, err);
    }
  });

  fastify.get('/pembelian/tokos', async (request, reply) => {
    try {
      const response = await nagagoldFetch('/api/v1/tokos', { method: 'GET' }, routeContext(request));
      return reply.send({ tokos: Array.isArray(response.data) ? response.data : [] });
    } catch (err) {
      return sendRouteError(reply, err);
    }
  });

  fastify.get('/pembelian/jenis', async (request, reply) => {
    try {
      const response = await nagagoldFetch('/api/v1/jenis/get/all', { method: 'GET' }, routeContext(request));
      return reply.send({ jenis: Array.isArray(response.data) ? response.data : [] });
    } catch (err) {
      return sendRouteError(reply, err);
    }
  });

  fastify.get('/pembelian/kondisi', async (request, reply) => {
    try {
      const response = await nagagoldFetch('/api/v1/parabeli/get/all', { method: 'GET' }, routeContext(request));
      return reply.send({ kondisi: Array.isArray(response.data) ? response.data : [] });
    } catch (err) {
      return sendRouteError(reply, err);
    }
  });

  fastify.get('/pembelian/rounding', async (request, reply) => {
    try {
      return reply.send(await loadPurchaseRounding(routeContext(request)));
    } catch (err) {
      return sendRouteError(reply, err);
    }
  });

  fastify.get('/pembelian/groups', async (request, reply) => {
    try {
      const response = await nagagoldFetch('/api/v1/group/get/all', { method: 'GET' }, routeContext(request));
      return reply.send({ groups: Array.isArray(response.data) ? response.data : [] });
    } catch (err) {
      return sendRouteError(reply, err);
    }
  });

  fastify.get('/pembelian/barang/:barcode', async (request, reply) => {
    try {
      return reply.send({
        item: await lookupPurchaseItem(request.params.barcode, String(request.query?.kodeToko || '').trim(), routeContext(request)),
      });
    } catch (err) {
      return sendRouteError(reply, err);
    }
  });

  fastify.post('/penjualan', async (request, reply) => {
    try {
      return reply.send(await submitSale(request.body || {}, routeContext(request)));
    } catch (err) {
      return sendRouteError(reply, err);
    }
  });

  fastify.post('/pembelian', async (request, reply) => {
    try {
      return reply.send(await submitPurchase(request.body || {}, routeContext(request)));
    } catch (err) {
      return sendRouteError(reply, err);
    }
  });

  fastify.post('/authorization', async (request, reply) => {
    try {
      return reply.send(await authorize(request.body || {}, routeContext(request)));
    } catch (err) {
      return sendRouteError(reply, err);
    }
  });

  // Legacy endpoint kept as a compatibility shim only; final UX should not expose manual test connection.
  fastify.get('/test-connection', async (request, reply) => {
    try {
      const response = await nagagoldFetch('/api/v1/hutang/dashboard', { method: 'GET' }, routeContext(request));
      return reply.send({
        ok: true,
        endpoint: '/api/v1/hutang/dashboard',
        status: response.status,
        checkedAt: new Date().toISOString(),
        response: response.data,
      });
    } catch (err) {
      return sendRouteError(reply, err);
    }
  });
}

module.exports = nagagoldRoutes;

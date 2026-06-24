require('dotenv').config();

const fastify = require('fastify')({
  logger: true,
  pluginTimeout: 600000,
  requestTimeout: 600000,
});

const cors = require('@fastify/cors');
const mongoManager = require('./services/mongo-manager');
const storeRoutes = require('./routes/stores');
const productRoutes = require('./routes/products');
const filterRoutes = require('./routes/filters');
const syncRoutes = require('./routes/sync');
const imageSearchRoutes = require('./routes/image-search');
const imageRoutes = require('./routes/images');
const catalogRoutes = require('./routes/catalog');
const { settingsRoutes, getSettings } = require('./routes/settings');
const whatsappRoutes = require('./routes/whatsapp');
const imageIndexRoutes = require('./routes/image-index');
const qrisRoutes = require('./routes/qris');
const qrisSettingsRoutes = require('./routes/qris-settings');
const compatRoutes = require('./routes/compat');
const nagagoldRoutes = require('./routes/nagagold');
const { runUnifiedSync, getStatus: getUnifiedStatus } = require('./services/unified-cron');
const { getStatus: getWaStatus } = require('./services/whatsapp-bot');

const PORT = parseInt(process.env.PORT, 10) || 3750;
const HOST = '0.0.0.0';
const IMAGE_UPLOAD_MAX_MB = Number(process.env.IMAGE_UPLOAD_MAX_MB || 15);

async function start() {
  await fastify.register(cors, { origin: true, methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] });

  await fastify.register(storeRoutes, { prefix: '/api/stores' });
  await fastify.register(productRoutes, { prefix: '/api/products' });
  await fastify.register(filterRoutes, { prefix: '/api/filters' });
  await fastify.register(syncRoutes, { prefix: '/api/sync' });
  await fastify.register(require('@fastify/multipart'), {
    limits: {
      fileSize: IMAGE_UPLOAD_MAX_MB * 1024 * 1024,
    },
  });
  await fastify.register(imageSearchRoutes, { prefix: '/api/search' });
  await fastify.register(imageRoutes, { prefix: '/api/images' });
  await fastify.register(catalogRoutes, { prefix: '/api/catalog' });
  await fastify.register(settingsRoutes, { prefix: '/api/settings' });
  await fastify.register(whatsappRoutes, { prefix: '/api/whatsapp' });
  await fastify.register(imageIndexRoutes, { prefix: '/api/image-index' });
  await fastify.register(qrisRoutes, { prefix: '/api/qris' });
  await fastify.register(qrisSettingsRoutes, { prefix: '/api/qris-settings' });
  await fastify.register(nagagoldRoutes, { prefix: '/api/nagagold' });
  await fastify.register(compatRoutes);

  // Unified cron — hanya start jika WA bot tidak auto-start
  let cronTimer = null;
  let cronInfo = { intervalMin: 0, intervalMs: 0, lastRun: null };

  const scheduleCron = async () => {
    if (cronTimer) clearInterval(cronTimer);
    const settings = await getSettings();
    if (!settings.catalogSyncEnabled) {
      fastify.log.info('[cron] Auto-sync disabled');
      return { ...cronInfo, intervalMin: 0 };
    }
    const intervalMin = Math.max(1, settings.catalogSyncIntervalMin || 30);
    const intervalMs = intervalMin * 60 * 1000;
    cronTimer = setInterval(async () => {
      fastify.log.info('[cron] Starting unified sync pipeline...');
      await runUnifiedSync();
      cronInfo.lastRun = new Date().toISOString();
    }, intervalMs);
    cronInfo = { intervalMin, intervalMs, lastRun: null };
    fastify.log.info(`[cron] Unified sync scheduled every ${intervalMin} min`);
    return cronInfo;
  };

  cronInfo = await scheduleCron();
  // Jalankan sync pertama setelah 5 detik
  setTimeout(() => {
    fastify.log.info('[cron] Running initial sync on startup...');
    runUnifiedSync().catch(e => fastify.log.error(`[cron] Initial sync error: ${e.message}`));
  }, 5000);

  fastify.decorate('rescheduleCron', async () => {
    const info = await scheduleCron();
    Object.assign(cronInfo, info);
  });

  // Manual trigger endpoint for unified sync
  fastify.post('/api/unified-sync', { config: { skipApiKey: false } }, async (request, reply) => {
    if (request.headers['x-api-key'] !== process.env.API_KEY) {
      return reply.status(401).send({ error: 'Unauthorized' });
    }
    const result = await runUnifiedSync();
    return { success: !result?.error, data: result };
  });

  // Health check
  fastify.get('/api/health', { config: { skipApiKey: true } }, async () => ({
    status: 'ok',
    timestamp: new Date().toISOString(),
    cron: { ...cronInfo, lastRun: cronInfo.lastRun },
    unified: getUnifiedStatus(),
    whatsapp: getWaStatus(),
  }));

  const shutdown = async (signal) => {
    fastify.log.info(`Received ${signal}, shutting down...`);
    if (cronTimer) clearInterval(cronTimer);
    await mongoManager.closeAll();
    await fastify.close();
    process.exit(0);
  };
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));

  await fastify.listen({ port: PORT, host: HOST });
  fastify.log.info(`Server berjalan di http://${HOST}:${PORT}`);
}

start().catch((err) => {
  console.error('Gagal start server:', err);
  process.exit(1);
});

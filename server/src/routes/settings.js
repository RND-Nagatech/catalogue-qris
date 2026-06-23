const mongoManager = require('../services/mongo-manager');
const { success, error } = require('../utils/response');
const { apiKeyMiddleware } = require('../middleware/api-key');

const COLLECTION = 'settings';
const DEFAULTS = {
  catalogSyncIntervalMin: 5,   // menit
  catalogSyncEnabled: true,
};

/**
 * Ambil semua settings dari config DB
 */
async function getSettings() {
  try {
    const db = await mongoManager.getConfigDb();
    const col = db.collection(COLLECTION);
    const docs = await col.find({}).toArray();
    const settings = { ...DEFAULTS };
    for (const doc of docs) {
      settings[doc._id] = doc.value;
    }
    return settings;
  } catch {
    return { ...DEFAULTS };
  }
}

/**
 * Update satu setting
 */
async function setSetting(key, value) {
  const db = await mongoManager.getConfigDb();
  const col = db.collection(COLLECTION);
  await col.updateOne(
    { _id: key },
    { $set: { _id: key, value } },
    { upsert: true }
  );
}

async function settingsRoutes(fastify) {
  fastify.addHook('preHandler', apiKeyMiddleware);

  // GET /api/settings
  fastify.get('/', async (_request, reply) => {
    try {
      const settings = await getSettings();
      return success(reply, settings);
    } catch (err) {
      return error(reply, err.message, 500);
    }
  });

  // PUT /api/settings — update satu atau banyak key
  fastify.put('/', async (request, reply) => {
    try {
      const updates = request.body || {};
      for (const [key, value] of Object.entries(updates)) {
        await setSetting(key, value);
      }
      // Reschedule cron jika interval berubah
      if ('catalogSyncIntervalMin' in updates || 'catalogSyncEnabled' in updates) {
        if (fastify.rescheduleCron) {
          await fastify.rescheduleCron();
        }
      }
      const settings = await getSettings();
      return success(reply, settings);
    } catch (err) {
      return error(reply, err.message, 500);
    }
  });
}

module.exports = { settingsRoutes, getSettings };

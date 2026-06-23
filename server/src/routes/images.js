const fs = require('fs');
const path = require('path');
const { getStores } = require('../config/store-config');

const SYNC_IMAGES_DIR = path.join(__dirname, '..', '..', 'sync_images');

// Firebase REST URL pattern (public bucket via alt=media)
const FIREBASE_STORAGE_BASE = 'https://firebasestorage.googleapis.com/v0/b/gambar-78b2b.appspot.com/o';

/**
 * Cari file gambar di sync_images/ berdasarkan barcode.
 * Mencari di semua sub-folder (firebaseCode).
 */
function findLocalImage(barcode) {
  if (!fs.existsSync(SYNC_IMAGES_DIR)) return null;

  const dirs = fs.readdirSync(SYNC_IMAGES_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name);

  for (const dir of dirs) {
    const filePath = path.join(SYNC_IMAGES_DIR, dir, 'foto_produk', `${barcode}.jpg`);
    if (fs.existsSync(filePath)) {
      return { filePath, firebaseCode: dir };
    }
  }
  return null;
}

/**
 * Register route untuk serve gambar
 * @param {import('fastify').FastifyInstance} fastify
 */
async function imageRoutes(fastify) {
  // Public — no API key needed (gambar bisa diakses langsung)
  fastify.get('/:barcode', {
    config: { skipApiKey: true },
  }, async (request, reply) => {
    const { barcode } = request.params;

    if (!barcode) {
      return reply.status(400).send({ error: 'barcode required' });
    }

    // 1. Cek di local sync_images
    const local = findLocalImage(barcode);
    if (local) {
      const stream = fs.createReadStream(local.filePath);
      return reply
        .header('Content-Type', 'image/jpeg')
        .header('Cache-Control', 'public, max-age=31536000, immutable')
        .send(stream);
    }

    // 2. Fallback: redirect ke Firebase Storage
    //    Cari firebaseCode dari stores
    const stores = await getStores();
    const firebaseCode = stores[0]?.firebaseCode || 'INT';

    const storagePath = `NSIPIC/${firebaseCode}/foto_produk/${barcode}.jpg`;
    const encodedPath = encodeURIComponent(storagePath);
    const firebaseUrl = `${FIREBASE_STORAGE_BASE}/${encodedPath}?alt=media`;

    return reply.redirect(firebaseUrl);
  });
}

module.exports = imageRoutes;

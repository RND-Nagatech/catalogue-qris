const { success, error } = require('../utils/response');
const { apiKeyMiddleware } = require('../middleware/api-key');

const PYTHON_SERVICE_URL = process.env.IMAGE_SEARCH_URL || 'http://localhost:3751';

/**
 * Register route untuk image search
 * @param {import('fastify').FastifyInstance} fastify
 */
async function imageSearchRoutes(fastify) {
  fastify.addHook('preHandler', apiKeyMiddleware);

  // POST /api/search/image — proxy ke Python + enrich dari MongoDB
  fastify.post('/image', async (request, reply) => {
    try {
      // Terima multipart file upload
      const data = await request.file();
      if (!data) {
        return error(reply, 'Gambar wajib diupload (multipart, field: file)', 400);
      }

      const buffer = await data.toBuffer();

      // Forward ke Python service
      const FormData = require('form-data');
      const axios = require('axios');

      const form = new FormData();
      form.append('file', buffer, {
        filename: data.filename || 'search.jpg',
        contentType: data.mimetype,
      });

      const searchParams = new URLSearchParams(request.query || {});
      let pythonUrl = `${PYTHON_SERVICE_URL}/search`;
      if (searchParams.toString()) {
        pythonUrl += `?${searchParams.toString()}`;
      }

      const response = await axios.post(pythonUrl, form, {
        headers: { ...form.getHeaders() },
        timeout: 30000,
      });

      const results = response.data?.data || [];

      if (results.length === 0) {
        return success(reply, [], { top_k: response.data?.meta?.top_k || 0 });
      }

      // Enrich: query Master Catalog langsung (terdecrypt, cepat)
      const mongoManager = require('../services/mongo-manager');
      const db = await mongoManager.getConfigDb();
      const catalogCol = db.collection('master_catalog');

      const barcodes = results.map((r) => r.barcode);
      const products = await catalogCol
        .find({ kode_barcode: { $in: barcodes } })
        .project({ _id: 0 })
        .toArray();

      // Build map by barcode
      const productMap = new Map();
      for (const p of products) {
        // Keep first match only (in case duplicate barcode across stores)
        if (!productMap.has(p.kode_barcode)) {
          productMap.set(p.kode_barcode, p);
        }
      }

      // Susun hasil sesuai urutan similarity score + attach score
      const enriched = [];
      for (const r of results) {
        const product = productMap.get(r.barcode);
        if (product) {
          enriched.push({ ...product, _searchScore: r.score });
        }
      }

      return success(reply, enriched, {
        top_k: results.length,
        enriched: enriched.length,
      });
    } catch (err) {
      console.error('[image-search] Error:', err.message);
      if (err.code === 'FST_REQ_FILE_TOO_LARGE' || /file too large/i.test(err.message || '')) {
        return error(reply, 'Ukuran gambar terlalu besar. Gunakan gambar maksimal sesuai IMAGE_UPLOAD_MAX_MB atau kecilkan kualitas foto.', 413);
      }
      if (err.response?.data) {
        return error(reply, `Python service error: ${JSON.stringify(err.response.data)}`, 502);
      }
      return error(reply, `Image search gagal: ${err.message}`, 500);
    }
  });
}

module.exports = imageSearchRoutes;

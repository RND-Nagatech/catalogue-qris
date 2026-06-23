/**
 * WhatsApp Bot — Baileys + Gemma 4 + Master Catalog
 */
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const FormData = require('form-data');
const qrcode = require('qrcode-terminal');
const mongoManager = require('./mongo-manager');
const { guardrailCheck, extractIntent, formatReply } = require('./llm-client');

const AUTH_DIR = path.join(__dirname, '..', '..', 'data', 'baileys_auth');
let sock = null;
let isReady = false;
let currentQr = null; // simpan QR string terbaru
let baileysPromise = null;

// Session store: chat JID → hasil pencarian terakhir
const sessions = new Map(); // key: jid, value: { items, total, timestamp }

async function loadBaileys() {
  if (!baileysPromise) {
    baileysPromise = import('@whiskeysockets/baileys');
  }
  return baileysPromise;
}

/**
 * Query Master Catalog
 */
async function searchProducts(query) {
  try {
    const db = await mongoManager.getConfigDb();
    const col = db.collection('master_catalog');

    const { search, group, dept, limit = 5 } = query;
    const filter = {};

    if (search) {
      filter.$or = [
        { nama_barang: { $regex: search, $options: 'i' } },
        { kode_group: { $regex: search, $options: 'i' } },
        { kode_dept: { $regex: search, $options: 'i' } },
        { kode_toko: { $regex: search, $options: 'i' } },
      ];
    }
    if (group) filter.kode_group = group;
    if (dept) filter.kode_dept = dept;

    const [items, total] = await Promise.all([
      col.find(filter).project({ _id: 0 }).limit(limit).toArray(),
      col.countDocuments(filter),
    ]);

    return { items, total };
  } catch (err) {
    console.error('[wa-bot] search error:', err.message);
    return { items: [], total: 0 };
  }
}

/**
 * Handle image search
 */
async function handleImageSearch(msg, caption) {
  const jid = msg.key.remoteJid;
  const imageMsg = msg.message?.imageMessage;
  try {
    await sock.sendMessage(jid, { text: 'Sedang mencari produk yang mirip...' });

    // Download gambar dari WhatsApp URL
    let buffer;
    try {
      // Coba download via Baileys internal
      const { downloadMediaMessage } = await loadBaileys();
      buffer = await downloadMediaMessage(msg, 'buffer', {});
    } catch {
      // Fallback: download langsung dari URL
      const res = await axios.get(imageMsg.url, {
        responseType: 'arraybuffer',
        headers: { 'User-Agent': 'WhatsApp/2.24.8.78' },
        timeout: 15000,
      });
      buffer = Buffer.from(res.data);
    }

    // Forward ke Python image search
    const form = new FormData();
    form.append('file', buffer, { filename: 'search.jpg', contentType: imageMsg?.mimetype || 'image/jpeg' });

    const pythonUrl = process.env.IMAGE_SEARCH_URL || 'http://localhost:3751';
    const response = await axios.post(`${pythonUrl}/search?top_k=5`, form, {
      headers: form.getHeaders(),
      timeout: 30000,
    });

    const results = response.data?.data || [];
    if (results.length === 0) {
      await sock.sendMessage(jid, { text: 'Tidak ditemukan produk yang mirip dengan gambar ini.' });
      return;
    }

    // Enrich dari Master Catalog
    const db = await mongoManager.getConfigDb();
    const col = db.collection('master_catalog');
    const barcodes = results.map((r) => r.barcode);
    const products = await col.find({ kode_barcode: { $in: barcodes } }).project({ _id: 0 }).toArray();

    // Build map & maintain order by score
    const productMap = new Map();
    for (const p of products) {
      if (!productMap.has(p.kode_barcode)) productMap.set(p.kode_barcode, p);
    }

    const enriched = [];
    for (const r of results) {
      const p = productMap.get(r.barcode);
      if (p) enriched.push({ ...p, _searchScore: r.score });
    }

    // Simpan session & format reply
    sessions.set(jid, { items: enriched, total: enriched.length, timestamp: Date.now() });

    const reply = await formatReply(caption || 'gambar', enriched, enriched.length);
    await sock.sendMessage(jid, { text: reply });
  } catch (err) {
    console.error('[wa-bot] image search error:', err?.message || err, err?.stack?.split('\n')[0]);
    await sock.sendMessage(jid, { text: 'Maaf, gagal mencari produk. Silakan coba lagi.' });
  }
}

/**
 * Handle incoming message
 */
async function handleMessage(msg) {
  const jid = msg.key.remoteJid;
  if (!jid || jid === 'status@broadcast') return;
  // Hanya balas direct message, skip group
  if (jid.endsWith('@g.us')) return;

  const text =
    msg.message?.conversation ||
    msg.message?.extendedTextMessage?.text ||
    msg.message?.imageMessage?.caption ||
    '';

  // Cek image message — image search
  const imageMsg = msg.message?.imageMessage;
  if (imageMsg) {
    console.log(`[wa-bot] ${jid}: [IMAGE] ${text || '(no caption)'}`);
    await handleImageSearch(msg, text);
    return;
  }

  if (!text) return;

  console.log(`[wa-bot] ${jid}: ${text}`);

  // 0. Cek apakah user minta detail dari hasil sebelumnya (nomor)
  const detailMatch = text.match(/(?:detail|lihat|nomor|no|pilih|produk)\s*[:#]?\s*(\d+)/i);
  if (detailMatch) {
    const index = parseInt(detailMatch[1], 10) - 1; // 1-based → 0-based
    const session = sessions.get(jid);
    if (session && session.items[index]) {
      const item = session.items[index];
      const detailText = `*${item.nama_barang}*\n` +
        `Kode: ${item.kode_barang}\n` +
        `Group: ${item.kode_group} | Dept: ${item.kode_dept}\n` +
        `Toko: ${item.kode_toko} | Gudang: ${item.kode_gudang}\n` +
        `Berat: ${item.berat?.toFixed(1)}g | Kadar: ${item.kadar_cetak}\n` +
        `Stok: ${item.stock_on_hand} pcs\n` +
        `Harga: Rp ${(item.harga_skrg || 0).toLocaleString('id-ID')}\n` +
        `Sumber: ${item.sumber}\n\n` +
        `_Ketik "kembali" untuk kembali ke daftar_`;
      await sock.sendMessage(jid, { text: detailText });
      return;
    } else {
      await sock.sendMessage(jid, { text: `Maaf, nomor ${index + 1} tidak ditemukan di hasil pencarian terakhir. Coba cari ulang ya.` });
      return;
    }
  }

  // 0b. "kembali" → tampilkan list terakhir
  if (/^(kembali|balik|list|daftar)$/i.test(text.trim())) {
    const session = sessions.get(jid);
    if (session && session.items.length > 0) {
      const reply = await formatReply('kembali', session.items, session.total);
      await sock.sendMessage(jid, { text: reply });
      return;
    }
  }

  // 1. Guardrail
  const guard = await guardrailCheck(text);
  if (!guard.allowed) {
    await sock.sendMessage(jid, {
      text: 'Maaf, saya hanya dapat membantu mengecek stok perhiasan.',
    });
    return;
  }

  // 2. Extract intent
  const intent = await extractIntent(text);
  console.log('[wa-bot] intent:', JSON.stringify(intent));

  // 3. Query DB
  const { items, total } = await searchProducts(intent);

  // Simpan session
  sessions.set(jid, { items, total, timestamp: Date.now() });

  // 4. Format & send reply
  const reply = await formatReply(text, items, total);
  await sock.sendMessage(jid, { text: reply });
}

/**
 * Start the bot
 */
async function startBot() {
  if (sock) return sock;
  const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = await loadBaileys();

  // Ensure auth dir exists
  if (!fs.existsSync(AUTH_DIR)) {
    fs.mkdirSync(AUTH_DIR, { recursive: true });
  }

  const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);

  sock = makeWASocket({
    auth: state,
    printQRInTerminal: true,
    defaultQueryTimeoutMs: 60000,
  });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      currentQr = qr;
      console.log('[wa-bot] Scan QR code to login:');
      qrcode.generate(qr, { small: true });
    }

    if (connection === 'open') {
      currentQr = null; // QR sudah dipakai, hapus
    }

    if (connection === 'open') {
      isReady = true;
      console.log('[wa-bot] Connected!');
    }

    if (connection === 'close') {
      isReady = false;
      const reason = lastDisconnect?.error?.output?.statusCode;
      const shouldReconnect = reason !== DisconnectReason.loggedOut;

      console.log('[wa-bot] Disconnected. Reconnect:', shouldReconnect);

      if (shouldReconnect) {
        sock = null;
        setTimeout(startBot, 5000);
      } else {
        console.log('[wa-bot] Logged out. Delete auth folder to re-pair.');
      }
    }
  });

  sock.ev.on('messages.upsert', async ({ messages }) => {
    for (const msg of messages) {
      if (!msg.key.fromMe && msg.message) {
        await handleMessage(msg);
      }
    }
  });

  return sock;
}

function getStatus() {
  return { online: isReady, qr: currentQr };
}

/** Restart bot — disconnect & reconnect (re-pair) */
async function restartBot() {
  if (sock) {
    try { sock.logout(); } catch {}
    sock = null;
    isReady = false;
  }
  await startBot();
  return { online: isReady };
}

/** Full logout — delete auth state */
async function logoutBot() {
  if (sock) {
    try { sock.logout(); } catch {}
    sock = null;
    isReady = false;
  }
  // Delete auth files
  const fs = require('fs');
  const path = require('path');
  const AUTH_DIR = path.join(__dirname, '..', '..', 'data', 'baileys_auth');
  if (fs.existsSync(AUTH_DIR)) {
    fs.rmSync(AUTH_DIR, { recursive: true, force: true });
  }
  return { online: false };
}

module.exports = { startBot, getStatus, restartBot, logoutBot };

/**
 * LLM Client — OpenAI-compatible API (Gemma 4 via LM Studio)
 */
const OpenAI = require('openai');

const BASE_URL = process.env.LLM_BASE_URL || 'http://192.168.22.193:1234/v1';
const MODEL = process.env.LLM_MODEL || 'gemma-4-e4b-it';

const client = new OpenAI({ baseURL: BASE_URL, apiKey: 'not-needed' });

const SYSTEM_PROMPT = `Kamu adalah asisten stok barang untuk Nagagold Catalogue, toko perhiasan.
Kamu HANYA menjawab pertanyaan tentang stok dan informasi produk perhiasan.

Aturan:
- Jawab singkat, profesional, dan langsung ke inti.
- Jangan bertele-tele, jangan gunakan emoji.
- Jika pertanyaan tidak terkait stok perhiasan, jawab: "Maaf, saya hanya dapat membantu mengecek stok perhiasan."

Gunakan Bahasa Indonesia yang sopan dan natural.`;

/**
 * Cek apakah pertanyaan terkait stok perhiasan (guardrail).
 * Return { allowed: boolean, reason?: string }
 */
async function guardrailCheck(userMessage) {
  try {
    const response = await client.chat.completions.create({
      model: MODEL,
      messages: [
        { role: 'system', content: `${SYSTEM_PROMPT}\n\nTugas: Tentukan apakah pertanyaan user terkait stok perhiasan. Jawab HANYA "YES" atau "NO".` },
        { role: 'user', content: userMessage },
      ],
      max_tokens: 5,
      temperature: 0,
    });
    const answer = response.choices[0]?.message?.content?.trim().toUpperCase() || 'NO';
    return { allowed: answer === 'YES' };
  } catch {
    // If LLM fails, allow passthrough
    return { allowed: true };
  }
}

/**
 * Ekstrak search intent dari pesan user.
 * Return { search, group?, dept?, limit }
 */
async function extractIntent(userMessage) {
  try {
    const response = await client.chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: 'system',
          content: `Kamu adalah intent extractor untuk pencarian produk perhiasan.
Dari pesan user, ekstrak keyword pencarian. Output JSON valid saja, tanpa markdown.
Format: {"search":"keyword utama","group":"","dept":"","limit":5}

Group yang valid: GOLD (emas), DM (berlian), ACC (accessories), LM 0,5 (antam)
Contoh:
- "ada kalung emas 18k tidak?" → {"search":"kalung emas 18k","group":"GOLD","dept":"","limit":5}
- "cincin berlian" → {"search":"cincin","group":"DM","dept":"","limit":5}
- "gelang rosegold" → {"search":"gelang rosegold","group":"GOLD","dept":"","limit":5}`,
        },
        { role: 'user', content: userMessage },
      ],
      max_tokens: 150,
      temperature: 0,
    });

    const raw = response.choices[0]?.message?.content?.trim() || '{}';
    // Clean markdown jika LLM bandel
    const json = raw.replace(/```json|```/g, '').trim();
    return JSON.parse(json);
  } catch {
    return { search: userMessage, group: '', dept: '', limit: 5 };
  }
}

/**
 * Format hasil query jadi pesan WhatsApp natural via LLM.
 */
async function formatReply(userMessage, products, totalCount) {
  if (products.length === 0) {
    return `Maaf, tidak ditemukan produk untuk *"${userMessage}"*. Coba kata kunci lain ya.`;
  }

  try {
    const productList = products
      .map(
        (p, i) =>
          `${i + 1}. ${p.nama_barang}\n   ${p.kode_group} | ${p.kode_dept} | ${p.berat}g | ${p.kadar_cetak} | Stok: ${p.stock_on_hand} | Rp ${(p.harga_skrg || 0).toLocaleString('id-ID')} | ${p.sumber}`
      )
      .join('\n\n');

    const response = await client.chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: 'system',
          content: `Kamu adalah asisten toko perhiasan profesional. Buat pesan WhatsApp yang rapi, singkat, dan langsung ke inti. Tanpa emoji. Batasi maksimal 5 produk. Sebutkan total jika >5.`,
        },
        {
          role: 'user',
          content: `User mencari: "${userMessage}"\nTotal ditemukan: ${totalCount}\nBerikut 5 produk teratas:\n\n${productList}\n\nBuat pesan WhatsApp profesional dan informatif.`,
        },
      ],
      max_tokens: 500,
      temperature: 0.3,
    });

    let reply = response.choices[0]?.message?.content?.trim() || '';
    // Cleanup markdown: WhatsApp hanya support *bold*, _italic_, ~strikethrough~
    // Hapus double asterisk, heading #, backtick code blocks
    reply = reply.replace(/\*\*/g, '*').replace(/`{3}[\s\S]*?`{3}/g, '').replace(/^#+\s/gm, '');
    return reply || formatFallback(products, totalCount);
  } catch {
    return formatFallback(products, totalCount);
  }
}

/** Fallback format tanpa LLM */
function formatFallback(products, total) {
  const lines = [`*Hasil Pencarian* (${total} ditemukan)\n`];
  products.slice(0, 5).forEach((p, i) => {
    lines.push(
      `*${i + 1}. ${p.nama_barang}*\n` +
        `   ${p.kode_group} | ${p.kode_dept} | ${p.berat}g | ${p.kadar_cetak}\n` +
        `   Stok: ${p.stock_on_hand} | Rp ${(p.harga_skrg || 0).toLocaleString('id-ID')} | ${p.sumber}\n`
    );
  });
  if (total > 5) lines.push(`_...dan ${total - 5} produk lainnya_`);
  return lines.join('\n');
}

module.exports = { guardrailCheck, extractIntent, formatReply };

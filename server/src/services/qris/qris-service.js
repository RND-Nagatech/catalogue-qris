const mongoManager = require('../mongo-manager');

const SETTINGS_COLLECTION = 'settings';
const PAYMENTS_COLLECTION = 'payments';
const QRIS_SETTING_KEY = 'qris';

function normalizeQris(raw) {
  return String(raw || '').replace(/[\r\n\t]/g, '').trim();
}

function crc16(str) {
  let crc = 0xffff;

  for (let i = 0; i < str.length; i += 1) {
    crc ^= str.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j += 1) {
      crc = (crc & 0x8000) ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
    }
  }

  return crc.toString(16).toUpperCase().padStart(4, '0');
}

function parseTLV(payload) {
  const out = [];
  let i = 0;

  while (i < payload.length) {
    if (i + 4 > payload.length) {
      throw new Error('Invalid TLV: incomplete tag or length.');
    }

    const id = payload.substring(i, i + 2);
    const len = Number.parseInt(payload.substring(i + 2, i + 4), 10);
    if (Number.isNaN(len) || len < 0) {
      throw new Error('Invalid TLV: invalid length.');
    }

    const start = i + 4;
    const end = start + len;
    if (end > payload.length) {
      throw new Error('Invalid TLV: value length exceeds payload.');
    }

    out.push({ id, len, value: payload.substring(start, end) });
    i += 4 + len;
  }

  return out;
}

function buildTLV(id, value) {
  const text = String(value ?? '');
  return `${id}${text.length.toString().padStart(2, '0')}${text}`;
}

function validateQris(qris) {
  const normalized = normalizeQris(qris);
  if (normalized.length < 30 || !/^[\x20-\x7E]+$/.test(normalized)) {
    throw new Error('QRIS string terlalu pendek atau mengandung karakter tidak valid.');
  }

  const crcIndex = normalized.lastIndexOf('6304');
  if (crcIndex === -1 || crcIndex + 8 !== normalized.length) {
    throw new Error('Tag CRC QRIS tidak ditemukan.');
  }

  parseTLV(normalized);
  const withoutCrcValue = normalized.slice(0, -4);
  const expectedCrc = crc16(withoutCrcValue);
  const actualCrc = normalized.slice(-4).toUpperCase();
  if (expectedCrc !== actualCrc) {
    throw new Error('CRC QRIS tidak valid.');
  }
}

function getIssuer(fields) {
  const merchantAccount = fields.find((field) => {
    const id = Number.parseInt(field.id, 10);
    return id >= 26 && id <= 51;
  });

  if (!merchantAccount) return '';

  try {
    const nested = parseTLV(merchantAccount.value);
    return nested.find((field) => field.id === '00')?.value || '';
  } catch {
    return '';
  }
}

function getMerchantInfo(qris) {
  const normalized = normalizeQris(qris);
  if (!normalized) {
    return {
      merchant: '',
      city: '',
      postalCode: '',
      issuer: '',
      category: '',
      currency: '',
      method: 'Static',
    };
  }

  const fields = parseTLV(normalized);
  const get = (id) => fields.find((field) => field.id === id)?.value || '';
  const pointOfInit = get('01');

  return {
    merchant: get('59'),
    city: get('60'),
    postalCode: get('61'),
    issuer: getIssuer(fields),
    category: get('52'),
    currency: get('53') === '360' ? 'IDR (Rupiah)' : get('53'),
    method: pointOfInit === '12' ? 'Dynamic' : 'Static',
  };
}

function convertToDynamic(qris, amount, fee = { type: 'none' }) {
  const normalized = normalizeQris(qris);
  validateQris(normalized);

  if (!Number.isFinite(amount) || amount <= 0 || amount > 100000000) {
    throw new Error('Nominal pembayaran tidak valid.');
  }

  const idx63 = normalized.lastIndexOf('6304');
  let body = normalized.substring(0, idx63);

  body = body.replace('010211', '010212');
  if (!body.includes('010212')) {
    throw new Error('QRIS tidak memiliki tag metode pembayaran yang valid.');
  }

  const amountTLV = buildTLV('54', String(Math.floor(amount)));

  let feeTLV = '';
  if (fee.type === 'fixed') {
    if (!Number.isFinite(fee.amount) || fee.amount < 0) {
      throw new Error('Biaya layanan tidak valid.');
    }
    feeTLV = buildTLV('55', '02') + buildTLV('56', String(Math.floor(fee.amount)));
  } else if (fee.type === 'percent') {
    if (!Number.isFinite(fee.percent) || fee.percent < 0 || fee.percent > 100) {
      throw new Error('Persentase biaya layanan tidak valid.');
    }
    feeTLV = buildTLV('55', '03') + buildTLV('57', String(fee.percent));
  }

  const insertAt = body.indexOf('5802');
  if (insertAt === -1) throw new Error('QRIS tidak memiliki tag negara.');

  const withAmount = body.slice(0, insertAt) + amountTLV + feeTLV + body.slice(insertAt);
  const toCRC = withAmount + '6304';
  return toCRC + crc16(toCRC);
}

function calculateFeeAmount(amount, feeType, feeValue) {
  if (feeType === 'fixed') {
    return Math.max(0, Math.floor(Number(String(feeValue || '').replace(/\D/g, '')) || 0));
  }

  if (feeType === 'percent') {
    const percent = Number(String(feeValue || '').replace(',', '.'));
    if (!Number.isFinite(percent) || percent <= 0) return 0;
    return Math.floor((amount * percent) / 100);
  }

  return 0;
}

function normalizeFee(input) {
  if (!input || input.type === 'none' || input.feeType === 'none') return { type: 'none' };
  const type = input.type || input.feeType;
  const value = input.amount ?? input.percent ?? input.feeValue ?? input.value;

  if (type === 'fixed') {
    return { type: 'fixed', amount: Number(value) || 0 };
  }
  if (type === 'percent') {
    return { type: 'percent', percent: Number(value) || 0 };
  }

  return { type: 'none' };
}

function jakartaDateKey(isoDate) {
  if (!isoDate) return '';
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(isoDate));
}

function isTodayJakarta(payment) {
  const today = jakartaDateKey(new Date().toISOString());
  const relevantDate = payment.status === 'paid' ? payment.paidAt : payment.createdAt;
  return jakartaDateKey(relevantDate) === today;
}

function publicPayment(payment) {
  if (!payment) return null;
  return {
    id: payment.id,
    note: payment.note,
    amount: payment.amount,
    feeType: payment.feeType,
    feeValue: payment.feeValue,
    feeAmount: payment.feeAmount,
    totalAmount: payment.totalAmount,
    status: payment.status,
    createdAt: payment.createdAt,
    paidAt: payment.paidAt,
  };
}

async function getConfigDb() {
  return mongoManager.getConfigDb();
}

async function getQrisSetting() {
  const db = await getConfigDb();
  const setting = await db.collection(SETTINGS_COLLECTION).findOne({ _id: QRIS_SETTING_KEY });
  const qrisString = typeof setting?.qrisString === 'string'
    ? setting.qrisString
    : typeof setting?.value?.qrisString === 'string'
      ? setting.value.qrisString
      : '';

  return {
    qrisString,
    merchantInfo: qrisString ? getMerchantInfo(qrisString) : null,
    updatedAt: setting?.updatedAt || setting?.value?.updatedAt || null,
  };
}

async function saveQrisSetting(qrisString) {
  const normalized = normalizeQris(qrisString);
  if (!normalized) throw new Error('qrisString is required.');
  validateQris(normalized);

  const merchantInfo = getMerchantInfo(normalized);
  const updatedAt = new Date().toISOString();
  const db = await getConfigDb();
  await db.collection(SETTINGS_COLLECTION).updateOne(
    { _id: QRIS_SETTING_KEY },
    {
      $set: {
        _id: QRIS_SETTING_KEY,
        qrisString: normalized,
        value: { qrisString: normalized, merchantInfo, updatedAt },
        updatedAt,
      },
    },
    { upsert: true },
  );

  return { qrisString: normalized, merchantInfo, updatedAt };
}

async function clearQrisSetting() {
  const db = await getConfigDb();
  await db.collection(SETTINGS_COLLECTION).deleteOne({ _id: QRIS_SETTING_KEY });
  return { ok: true };
}

async function generateQris(input) {
  const amount = Number(input?.amount);
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error('Nominal pembayaran tidak valid.');
  }

  const setting = await getQrisSetting();
  const sourceQris = normalizeQris(input?.qrisString || setting.qrisString);
  if (!sourceQris) {
    throw new Error('QRIS string belum disimpan.');
  }

  const fee = normalizeFee(input?.fee || input || {});
  const qrisString = convertToDynamic(sourceQris, amount, fee);
  const feeAmount = fee.type === 'fixed'
    ? Math.floor(fee.amount)
    : fee.type === 'percent'
      ? Math.floor((amount * fee.percent) / 100)
      : 0;

  return {
    qrisString,
    merchantInfo: getMerchantInfo(sourceQris),
    amount: Math.floor(amount),
    fee,
    feeAmount,
    totalAmount: Math.floor(amount) + feeAmount,
  };
}

async function listPendingPayments() {
  const db = await getConfigDb();
  const payments = await db.collection(PAYMENTS_COLLECTION)
    .find({ status: 'pending' })
    .sort({ createdAt: -1 })
    .project({ _id: 0 })
    .toArray();
  return payments.map(publicPayment);
}

async function listTodayPaymentHistory() {
  const db = await getConfigDb();
  const payments = await db.collection(PAYMENTS_COLLECTION)
    .find({})
    .project({ _id: 0 })
    .toArray();

  return payments
    .filter(isTodayJakarta)
    .sort((a, b) => new Date(b.paidAt || b.createdAt).getTime() - new Date(a.paidAt || a.createdAt).getTime())
    .map(publicPayment);
}

async function createPayment(input) {
  const amount = Number(input?.amount);
  const note = String(input?.note || '').trim() || 'Pembayaran';
  const feeType = ['none', 'fixed', 'percent'].includes(input?.feeType) ? input.feeType : 'none';
  const feeValue = feeType === 'none' ? '' : String(input?.feeValue || '').trim();

  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error('Valid amount is required.');
  }

  const feeAmount = calculateFeeAmount(amount, feeType, feeValue);
  const payment = {
    id: `PAY-${Date.now()}`,
    note,
    amount,
    feeType,
    feeValue,
    feeAmount,
    totalAmount: amount + feeAmount,
    status: 'pending',
    createdAt: new Date().toISOString(),
  };

  const db = await getConfigDb();
  await db.collection(PAYMENTS_COLLECTION).insertOne(payment);
  return publicPayment(payment);
}

async function getPayment(id) {
  const db = await getConfigDb();
  const payment = await db.collection(PAYMENTS_COLLECTION).findOne({ id }, { projection: { _id: 0 } });
  return publicPayment(payment);
}

async function markPaymentPaid(id) {
  const db = await getConfigDb();
  const paidAt = new Date().toISOString();
  const result = await db.collection(PAYMENTS_COLLECTION).updateOne(
    { id, status: 'pending' },
    { $set: { status: 'paid', paidAt } },
  );

  if (!result.matchedCount) {
    return null;
  }

  return getPayment(id);
}

async function deletePayment(id) {
  const db = await getConfigDb();
  const result = await db.collection(PAYMENTS_COLLECTION).deleteOne({ id });
  return result.deletedCount > 0;
}

module.exports = {
  SETTINGS_COLLECTION,
  PAYMENTS_COLLECTION,
  QRIS_SETTING_KEY,
  getQrisSetting,
  saveQrisSetting,
  clearQrisSetting,
  generateQris,
  listPendingPayments,
  listTodayPaymentHistory,
  createPayment,
  getPayment,
  markPaymentPaid,
  deletePayment,
};

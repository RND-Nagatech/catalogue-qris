const crypto = require('crypto');

function normalizeDomain(domain) {
  const trimmed = String(domain || '').trim();
  if (!trimmed) return '';
  return trimmed.replace(/\/+$/, '');
}

function asNumber(value) {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : 0;
}

function asText(value, fallback = '8F') {
  const text = String(value ?? '').trim();
  return text || fallback;
}

function firstArrayItem(data) {
  if (Array.isArray(data)) {
    return typeof data[0] === 'object' && data[0] ? data[0] : null;
  }
  return typeof data === 'object' && data ? data : null;
}

function getRawNumber(raw, key, fallback = 0) {
  if (!raw || raw[key] === undefined || raw[key] === null) return fallback;
  return asNumber(raw[key]);
}

function getRawText(raw, key, fallback = '8F') {
  if (!raw) return fallback;
  return asText(raw[key], fallback);
}

function normalizeKodeDept(value, raw) {
  const rawKodeDept = asText(raw?.kode_dept, '');
  if (rawKodeDept) return rawKodeDept;

  const text = asText(value, '');
  return text.split('-')[0]?.trim() || text;
}

function collectAuthorizationIds(...groups) {
  const ids = groups
    .flatMap((group) => group || [])
    .map((id) => String(id || '').trim())
    .filter(Boolean);
  return Array.from(new Set(ids)).map((_id) => ({ _id }));
}

function findAuthorizationId(response) {
  if (!response || typeof response !== 'object') return '';
  if (response._id) return String(response._id);
  if (response.data && typeof response.data === 'object' && '_id' in response.data) {
    return String(response.data._id || '');
  }
  return '';
}

function unwrapNagagoldData(data) {
  let current = data;
  for (let index = 0; index < 4; index += 1) {
    if (!current || typeof current !== 'object' || Array.isArray(current)) return current;
    if ('data' in current) {
      current = current.data;
      continue;
    }
    if ('value' in current && typeof current.value === 'object') {
      current = current.value;
      continue;
    }
    return current;
  }
  return current;
}

function normalizeNagagoldModules(data) {
  const unwrapped = unwrapNagagoldData(data);
  if (!Array.isArray(unwrapped)) return [];

  return unwrapped.flatMap((item) => {
    if (!item || typeof item !== 'object') return [];
    const key = asText(item.key, '');
    if (!key) return [];
    const rawValue = item.value;
    if (rawValue === false || String(rawValue).toLowerCase() === 'false') return [];

    return [{
      key,
      value: rawValue,
      label: asText(item.label ?? item.name ?? item.nama, ''),
      type: asText(item.type, ''),
      raw: item,
    }];
  });
}

function normalizeNagagoldSystemParameters(data) {
  const unwrapped = unwrapNagagoldData(data);
  if (!Array.isArray(unwrapped)) return [];

  return unwrapped.flatMap((item) => {
    if (!item || typeof item !== 'object') return [];
    const key = asText(item.key, '');
    if (!key) return [];

    return [{
      key,
      value: item.value,
      type: asText(item.type, ''),
      parent: asText(item.parent, ''),
      raw: item,
    }];
  });
}

function stabilizeConfigValue(input) {
  if (Array.isArray(input)) {
    return input
      .map(stabilizeConfigValue)
      .sort((left, right) => JSON.stringify(left).localeCompare(JSON.stringify(right)));
  }
  if (!input || typeof input !== 'object') return input;

  const volatileKeys = new Set([
    'createdAt',
    'created_at',
    'updatedAt',
    'updated_at',
    'loadedAt',
    'timestamp',
    'time',
    'jam',
    '__v',
  ]);
  return Object.keys(input)
    .filter((key) => !volatileKeys.has(key))
    .sort()
    .reduce((acc, key) => {
      acc[key] = stabilizeConfigValue(input[key]);
      return acc;
    }, {});
}

function createConfigVersion(input) {
  return crypto
    .createHash('sha256')
    .update(JSON.stringify(stabilizeConfigValue(input)))
    .digest('hex');
}

function classifyFeatureGroup(key) {
  const upper = String(key || '').toUpperCase();
  if (upper.includes('TUKAR')) return 'exchange';
  if (upper.includes('MARKETPLACE')) return 'marketplace';
  if (upper.includes('GUDANG') || upper.includes('TOKO') || upper.includes('CABANG')) return 'warehouse';
  if (upper.includes('CUSTOMER') || upper.includes('MEMBER')) return 'customer';
  if (upper.includes('PPN') || upper.includes('PAJAK')) return 'tax';
  if (upper.includes('SALES')) return 'sales';
  if (upper.includes('VOUCHER')) return 'voucher';
  if (upper.includes('FOTO') || upper.includes('PHOTO')) return 'photo';
  if (upper.includes('OTORISASI') || upper.includes('AUTHORIZATION')) return 'authorization';
  if (upper.includes('PEMBULATAN')) return 'rounding';
  if (upper.includes('PEMBAYARAN') || upper.includes('PAYMENT') || upper.includes('REKENING')) return 'payment';
  if (upper.includes('PEMBELIAN') || upper.includes('BUYING')) return 'purchase';
  if (upper.includes('PENJUALAN') || upper.includes('TRANSACTION')) return 'salesTransaction';
  return 'general';
}

function labelFromKey(key) {
  return String(key || '')
    .toLowerCase()
    .split('_')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function buildDynamicFeatures(modules, parameters) {
  const moduleFeatures = modules.map((module) => ({
    key: module.key,
    sourceKey: module.key,
    label: module.label || labelFromKey(module.key),
    group: classifyFeatureGroup(module.key),
    enabled: true,
    value: module.value,
  }));

  const parameterFeatures = parameters
    .filter((parameter) => classifyFeatureGroup(parameter.key) !== 'general')
    .map((parameter) => ({
      key: parameter.key,
      sourceKey: parameter.key,
      label: labelFromKey(parameter.key),
      group: classifyFeatureGroup(parameter.key),
      enabled: String(parameter.value ?? '').toLowerCase() !== 'false',
      value: parameter.value,
    }));

  const byKey = new Map();
  [...moduleFeatures, ...parameterFeatures].forEach((feature) => {
    byKey.set(feature.key, feature);
  });
  return Array.from(byKey.values()).sort((a, b) => a.group.localeCompare(b.group) || a.label.localeCompare(b.label));
}

function createModuleReader(modules) {
  const byKey = new Map(modules.map((module) => [module.key, module]));
  return {
    has: (key) => byKey.has(key),
    value: (key) => byKey.get(key)?.value,
  };
}

const defaultSalesCapabilities = {
  requireSales: true,
  allowNonMember: true,
  showMemberPhone: false,
  allowEditMemberCustomer: false,
  allowDiscount: false,
  allowEditItemName: false,
  allowEditTotal: false,
  allowEditPricePerGram: false,
  showFinishing: false,
  showSize: false,
  showTax24k: false,
  showMarketplacePayment: false,
  showPpnTransaction: false,
  showVoucher: false,
  requireAuthorizationOnPriceChange: false,
  requireAuthorizationOnDiamondPriceChange: false,
  requireAuthorizationOnLowerOngkos: false,
  allowQrisOnTransfer: true,
};

const defaultPurchaseCapabilities = {
  requireSales: true,
  allowTransferPayment: true,
  requireTransferAuthorization: false,
  allowPurchaseWithoutBarcode: false,
  showStoreSelector: true,
  showManualDiscount: false,
  showBiayaAdmin: false,
  showPhoto: false,
  lockHargaBeli: false,
  readOnlyHargaBeli: false,
  disableBeratBeli: false,
  useHargaNotaWithOngkos: false,
  useHargaBeliWithoutAtributOngkos: false,
  useParameterHargaBeli: false,
  useParameterHargaEmas: false,
  enableHargaRataEdit: false,
  requireWeightToleranceAuthorization: false,
  requireAbsoluteAuthorization: false,
  disableAuthorizationAboveNota: false,
  disableAuthorizationBelowNota: false,
  unsupportedModules: [],
};

function buildSalesCapabilities(modules) {
  const module = createModuleReader(modules);
  return {
    ...defaultSalesCapabilities,
    requireSales: !module.has('DISABLE_KODE_SALES_TRANSACTION'),
    allowNonMember: !module.has('NONMEMBER_DISABLED_TRANSACTION'),
    showMemberPhone: module.has('MODULE_MEMBER_NO_HP'),
    allowEditMemberCustomer: module.has('ENABLE_EDIT_CUSTOMER_ON_MEMBER'),
    allowDiscount: module.has('PENJUALAN_DISCOUNT_MODULE'),
    allowEditItemName: module.has('EDIT_NAMA_BARANG_PENJUALAN_MODULE'),
    allowEditTotal: module.has('MODIFY_TOTAL_HARGA_MODULE'),
    allowEditPricePerGram: module.has('EDIT_HARGA_PER_GRAM_MODULE'),
    showFinishing: module.has('FINISHING_BARANG_MODULE'),
    showSize: module.has('SIZE_PERHIASAN_MODULE'),
    showTax24k: module.has('PAJAK_24K_MODULE'),
    showMarketplacePayment: module.has('MARKETPLACE_PEMBAYARAN_MODULE'),
    showPpnTransaction: module.has('PPN_TRANSAKSI_MODULE'),
    showVoucher: module.has('MODULE_VOUCHER'),
    requireAuthorizationOnPriceChange: module.has('TRANSACTION_ABSOLUTE_AUTHORIZATION_MODULE') || module.has('MODULE_TOLERANSI_HARGA_JUAL'),
    requireAuthorizationOnDiamondPriceChange: module.has('BERLIAN_TRANSACTION_AUTHORIZATION_MODULE'),
    requireAuthorizationOnLowerOngkos: module.has('OTORISASI_ONGKOS_TURUN_PENJUALAN'),
    allowQrisOnTransfer: true,
  };
}

function buildPurchaseCapabilities(modules) {
  const module = createModuleReader(modules);
  return {
    ...defaultPurchaseCapabilities,
    requireSales: !module.has('DISABLE_KODE_SALES_TRANSACTION'),
    allowTransferPayment: true,
    requireTransferAuthorization: module.has('OTORISASI_PEMBAYARAN_TRANSFER'),
    allowPurchaseWithoutBarcode: module.has('OTORISASI_PEMBELIAN_TANPA_BARCODE'),
    showStoreSelector: true,
    showManualDiscount: module.has('POTONGAN_MANUAL_PEMBELIAN_MODULE'),
    showBiayaAdmin: module.has('MODULE_BIAYA_ADMIN_PEMBELIAN'),
    showPhoto: module.has('PEMBELIAN_DENGAN_FOTO'),
    lockHargaBeli: module.has('LOCK_HARGA_BELI_MODULE'),
    readOnlyHargaBeli: module.has('HARGA_BELI_READ_ONLY'),
    disableBeratBeli: module.has('BUYING_DISABLE_ACCESS_BERAT_BELI'),
    useHargaNotaWithOngkos: module.has('HARGA_NOTA_DENGAN_ONGKOS_MODULE'),
    useHargaBeliWithoutAtributOngkos: module.has('HARGA_BELI_TANPA_ATRIBUT_ONGKOS'),
    useParameterHargaBeli: module.has('PARAMETER_HARGA_BELI'),
    useParameterHargaEmas: module.has('PARAMETER_HARGA_EMAS_PEMBELIAN'),
    enableHargaRataEdit: module.has('ENABLE_HARGA_RATA_PEMBELIAN_MODULE'),
    requireWeightToleranceAuthorization: module.has('OTORISASI_TOLERANSI_BERAT_PEMBELIAN_MODULE'),
    requireAbsoluteAuthorization: module.has('TRANSACTION_ABSOLUTE_AUTHORIZATION_MODULE'),
    disableAuthorizationAboveNota: module.has('NON_AKTIF_OTORISASI_HARGA_BELI_DIATAS_HARGA_NOTA'),
    disableAuthorizationBelowNota: module.has('NON_AKTIF_OTORISASI_HARGA_BELI_DIBAWAH_HARGA_NOTA'),
    unsupportedModules: [],
  };
}

function localDateKey() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

function flattenReportRows(data) {
  const unwrapped = unwrapNagagoldData(data);
  const rows = Array.isArray(unwrapped) ? unwrapped : [];
  return rows.flatMap((row) => {
    if (!row || typeof row !== 'object') return [];
    if (Array.isArray(row.detail)) {
      return row.detail
        .filter((detail) => Boolean(detail && typeof detail === 'object'))
        .map((detail) => ({ ...detail, _group: row }));
    }
    return [row];
  });
}

function pickTime(record) {
  return asText(record.jam ?? record.time_stamp ?? record.createdAt ?? record.tgl_stamp, '').slice(0, 5) || '-';
}

function mapSaleRecent(record) {
  const amount = asNumber(record.harga_total ?? record.total ?? record.harga_jual);
  return {
    id: asText(record.no_faktur_jual ?? record.no_faktur_group_user ?? record.kode_barcode, `SALE-${Date.now()}`),
    type: 'sale',
    title: asText(record.nama_barang, 'Penjualan'),
    subtitle: `Penjualan • ${pickTime(record)}`,
    amount,
    gram: asNumber(record.berat),
    time: pickTime(record),
    status: asText(record.status_valid ?? 'SELESAI', 'SELESAI'),
    createdAt: asText(record.tgl_system ?? record.tanggal ?? '', ''),
    raw: record,
  };
}

function mapPurchaseRecent(record) {
  const amount = asNumber(record.harga ?? record.harga_beli ?? record.total ?? record.harga_nota);
  return {
    id: asText(record.no_faktur_beli ?? record.no_faktur_group_user ?? record.kode_barcode, `PURCHASE-${Date.now()}`),
    type: 'purchase',
    title: asText(record.nama_barang, 'Pembelian'),
    subtitle: `Pembelian • ${pickTime(record)}`,
    amount,
    gram: asNumber(record.berat),
    time: pickTime(record),
    status: asText(record.status_valid ?? 'SELESAI', 'SELESAI'),
    createdAt: asText(record.tgl_system ?? record.tanggal ?? '', ''),
    raw: record,
  };
}

function sortRecentTransactions(items) {
  return [...items].sort((a, b) => {
    const dateA = `${a.createdAt || ''} ${a.time}`;
    const dateB = `${b.createdAt || ''} ${b.time}`;
    return dateB.localeCompare(dateA);
  });
}

function normalizeDashboardChart(data) {
  const unwrapped = unwrapNagagoldData(data);
  const record = typeof unwrapped === 'object' && unwrapped ? unwrapped : {};
  return {
    count: asNumber(record.value ?? record.count ?? record.qty ?? record.total),
    gram: asNumber(record.gram ?? record.berat ?? record.total_gram),
    rupiah: asNumber(record.rupiah ?? record.nominal ?? record.total_rupiah ?? record.total),
    raw: data,
  };
}

function formatNagagoldError(data, status, domain) {
  if (typeof data === 'object' && data && 'message' in data) return String(data.message);
  if (typeof data !== 'string') return `NAGAGOLD request failed (${status}).`;

  const text = data.trim();
  if (!text) return `NAGAGOLD request failed (${status}).`;
  if (/cloudflare tunnel error/i.test(text) || /error\s*1033/i.test(text)) {
    return `Domain NAGAGOLD sedang tidak bisa diakses oleh Cloudflare Tunnel (${domain}).`;
  }
  if (/api key required/i.test(text)) {
    return 'NAGAGOLD domain ini membutuhkan API key. Isi NAGAGOLD_API_KEY atau OPEN_API_KEY di .env, lalu restart backend.';
  }
  if (/invalid signature/i.test(text)) {
    return 'Signature NAGAGOLD tidak valid. Periksa NAGAGOLD_API_KEY / OPEN_API_KEY untuk domain ini, lalu restart backend.';
  }
  if (/^\s*<!doctype html/i.test(text) || /^\s*<html/i.test(text)) {
    const title = text.match(/<title>(.*?)<\/title>/i)?.[1]?.replace(/\s+/g, ' ').trim();
    return title ? `NAGAGOLD mengembalikan halaman error: ${title}` : `NAGAGOLD mengembalikan halaman HTML error (${status}).`;
  }
  return text;
}

module.exports = {
  asNumber,
  asText,
  buildDynamicFeatures,
  buildPurchaseCapabilities,
  buildSalesCapabilities,
  collectAuthorizationIds,
  createConfigVersion,
  findAuthorizationId,
  firstArrayItem,
  flattenReportRows,
  formatNagagoldError,
  getRawNumber,
  getRawText,
  localDateKey,
  mapPurchaseRecent,
  mapSaleRecent,
  normalizeDashboardChart,
  normalizeDomain,
  normalizeKodeDept,
  normalizeNagagoldModules,
  normalizeNagagoldSystemParameters,
  pickTime,
  sortRecentTransactions,
  unwrapNagagoldData,
};

const { nagagoldFetch, nagagoldRequest } = require('./client-service');
const {
  asNumber,
  asText,
  collectAuthorizationIds,
  firstArrayItem,
  getRawNumber,
  getRawText,
  normalizeKodeDept,
  normalizeNagagoldModules,
  unwrapNagagoldData,
} = require('./helpers');

function buildPurchasePayload(input) {
  const items = input.items?.length
    ? input.items
    : [{
        kodeBarcode: input.kodeBarcode,
        noFakturJual: input.noFakturJual,
        namaBarang: input.namaBarang,
        berat: input.berat,
        beratNota: input.berat,
        harga: input.harga,
        hargaNota: input.harga,
        kondisi: input.kondisi,
      }];

  const detailBarang = items.map((item) => {
    const raw = item.raw;
    const berat = asNumber(item.berat);
    const harga = asNumber(item.harga);
    const beratNota = asNumber(item.beratNota) || getRawNumber(raw, 'berat_nota', berat);
    const hargaNota = asNumber(item.hargaNota) || getRawNumber(raw, 'harga_nota', getRawNumber(raw, 'harga_jual', harga));
    return {
      kode_sales_jual: getRawText(raw, 'kode_sales', asText(input.kodeSales, '-')),
      kode_barcode: asText(item.kodeBarcode),
      no_faktur_jual: asText(item.noFakturJual),
      kode_dept: normalizeKodeDept(item.kodeJenis, raw),
      status_barang: asText(item.statusBarang ?? raw?.status_barang, 'BARU'),
      nama_barang: asText(item.namaBarang),
      berat_nota: beratNota,
      harga,
      biaya_admin: getRawNumber(raw, 'biaya_admin', 0),
      berat,
      kadar: asNumber(item.kadar) || getRawNumber(raw, 'kadar', 0),
      kadar_modal: asNumber(item.kadarModal) || getRawNumber(raw, 'kadar_modal', 100),
      kadar_cetak: asText(item.kadarCetak ?? raw?.kadar_cetak, '-'),
      harga_nota: hargaNota,
      kondisi: asText(item.kondisi),
      type_kondisi: asText(item.typeKondisi, 'PERSENTASE'),
      potongan_manual: asNumber(item.potonganManual) || 0,
      tipe_potongan_kondisi_beli: asText(item.typeKondisi, 'PERSENTASE'),
      potongan_kondisi_beli: asNumber(item.potonganKondisiBeli) || getRawNumber(raw, 'potongan_kondisi_beli', 0),
      berat_atribut: asNumber(item.beratAtribut) || getRawNumber(raw, 'berat_atribut', 0),
      harga_atribut: asNumber(item.hargaAtribut) || getRawNumber(raw, 'harga_atribut', 0),
      kode_harga_beli: asText(item.kodeHargaBeli, '-'),
      harga_rata: asNumber(item.hargaRata) || (berat > 0 ? Math.floor(harga / berat) : 0),
    };
  });

  const totalHarga = detailBarang.reduce((sum, item) => sum + item.harga, 0);
  const detailAuthorization = collectAuthorizationIds(input.authorizationIds, items.flatMap((item) => item.authorizationIds || []));
  const jumlahBayar = asNumber(input.jumlahBayar) || totalHarga;
  const typePembayaran = asText(input.typePembayaran ?? input.keterangan, 'CASH');
  const rekeningParts = asText(input.rekening, '-').split('-');

  return {
    kode_sales: asText(input.kodeSales),
    nama_sales: asText(input.namaSales ?? input.kodeSales),
    kode_toko: asText(input.kodeToko, '-'),
    kode_gudang: asText(input.kodeToko, '-'),
    nama_customer: asText(input.namaCustomer),
    kode_member: asText(input.kodeMember),
    alamat_customer: asText(input.alamatCustomer),
    no_hp: asText(input.noHp),
    nik_sim_passport: asText(input.nikSimPassport),
    detail_barang: detailBarang,
    pembayaran: [{
      jenis: typePembayaran,
      jumlah_rp: jumlahBayar,
      keterangan: typePembayaran === 'CASH' ? '-' : asText(input.rekening, '-'),
      nama_rekening_pelanggan: '-',
      bank_pelanggan: '-',
      bank: typePembayaran === 'CASH' ? '-' : asText(rekeningParts[1], '-').trim(),
    }],
    detail_authorization: detailAuthorization,
    id_trx: `QRIS-${Date.now()}`,
  };
}

async function lookupPurchaseItem(barcode, kodeToko = '', context = {}) {
  const code = encodeURIComponent(String(barcode || '').trim().toUpperCase().slice(0, 8));
  if (!code) throw new Error('Kode barcode wajib diisi.');
  const query = kodeToko ? `?kode_toko=${encodeURIComponent(kodeToko)}&kodeToko=${encodeURIComponent(kodeToko)}` : '';
  const response = await nagagoldFetch(`/api/v1/pembelian/get/jual/${code}${query}`, { method: 'GET' }, context);
  const item = firstArrayItem(response.data);
  if (!item) {
    const message = typeof response.data === 'string' ? response.data : 'Data pembelian barang tidak ditemukan.';
    const error = new Error(message);
    error.statusCode = 404;
    throw error;
  }
  return item;
}

async function loadPurchaseRounding(context = {}) {
  const [pembulatanResponse, moduleResponse] = await Promise.all([
    nagagoldFetch('/api/v1/para-system/key/PEMBULATAN', { method: 'GET' }, context).catch(() => ({ data: { value: 500 } })),
    nagagoldFetch('/api/v1/para-system/type/module', { method: 'GET' }, context).catch(() => ({ data: [] })),
  ]);
  const pembulatanData = firstArrayItem(unwrapNagagoldData(pembulatanResponse.data));
  const modules = normalizeNagagoldModules(moduleResponse.data);
  const has = (key) => modules.some((module) => module.key === key);
  return {
    value: asNumber(pembulatanData?.value) || 500,
    roundDown: has('PEMBULATAN_PEMBELIAN_KEBAWAH_MODULE'),
    disableAuthorizationAboveNota: has('NON_AKTIF_OTORISASI_HARGA_BELI_DIATAS_HARGA_NOTA'),
    disableAuthorizationBelowNota: has('NON_AKTIF_OTORISASI_HARGA_BELI_DIBAWAH_HARGA_NOTA'),
  };
}

async function submitPurchase(input, context = {}) {
  if (!input.namaCustomer) {
    const error = new Error('Customer wajib diisi.');
    error.statusCode = 400;
    throw error;
  }
  const payload = buildPurchasePayload(input);
  const response = await nagagoldRequest('/api/v1/pembelian/simpan', payload, context);
  return { ok: true, endpoint: '/api/v1/pembelian/simpan', response, payload };
}

module.exports = {
  buildPurchasePayload,
  lookupPurchaseItem,
  loadPurchaseRounding,
  submitPurchase,
};

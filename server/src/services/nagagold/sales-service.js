const { nagagoldFetch, nagagoldRequest } = require('./client-service');
const { markCatalogueItemsSold } = require('../product-service');
const {
  asNumber,
  asText,
  collectAuthorizationIds,
  findAuthorizationId,
  firstArrayItem,
  getRawNumber,
  getRawText,
} = require('./helpers');

function buildSalePayload(input) {
  const items = input.items?.length
    ? input.items
    : [{
        kodeBarcode: input.kodeBarcode,
        namaBarang: input.namaBarang,
        berat: input.berat,
        hargaGram: input.hargaGram,
        hargaJual: input.hargaGram && input.berat ? asNumber(input.hargaGram) * asNumber(input.berat) : undefined,
        ongkos: input.ongkos,
        keterangan: input.keterangan,
      }];

  const detailBarang = items.map((item) => {
    const raw = item.raw;
    const berat = asNumber(item.berat);
    const beratAwal = getRawNumber(raw, 'berat_awal', getRawNumber(raw, 'berat', berat));
    const beratAtribut = getRawNumber(raw, 'berat_atribut', 0);
    const hargaGram = asNumber(item.hargaGram);
    const ongkos = asNumber(item.ongkos);
    const hargaJual = asNumber(item.hargaJual) || getRawNumber(raw, 'harga_jual', berat * hargaGram);
    const hargaAtribut = getRawNumber(raw, 'harga_atribut', 0);
    const feeSales = getRawNumber(raw, 'fee_sales', 0);
    const total = asNumber(item.total) || getRawNumber(raw, 'total', hargaJual + ongkos + hargaAtribut + feeSales);

    return {
      ppn_transaksi_rp: getRawNumber(raw, 'ppn_transaksi_rp', 0),
      ppn_transaksi_value: getRawNumber(raw, 'ppn_transaksi_value', 0),
      is_markis: Boolean(raw?.is_markis ?? false),
      keterangan_jual: asText(item.keterangan ?? input.keterangan),
      no_po: getRawText(raw, 'no_po', '-'),
      no_titip_group: getRawText(raw, 'no_titip_group', '-'),
      no_pesanan: getRawText(raw, 'no_pesanan', '-'),
      kode_barcode: asText(item.kodeBarcode),
      fee_sales: feeSales,
      berat,
      berat_awal: beratAwal,
      berat_atribut: beratAtribut,
      harga_gram: hargaGram,
      nama_barang: asText(item.namaBarang),
      nama_atribut: getRawText(raw, 'nama_atribut', '-'),
      marketplace: getRawText(raw, 'marketplace', '-'),
      diskon_penjualan: asNumber(item.diskonPenjualan) || getRawNumber(raw, 'diskon_penjualan', getRawNumber(raw, 'diskon_rp', 0)),
      ongkos,
      qty: getRawNumber(raw, 'qty', 1) || 1,
      ppn_diamond: getRawNumber(raw, 'ppn_diamond', 0),
      berat_24k: getRawNumber(raw, 'berat_24k', 0),
      total_24k: getRawNumber(raw, 'total_24k', 0),
      finishing: getRawText(raw, 'finishing', '-'),
      size: String(raw?.size ?? '-'),
      nama_kredit: getRawText(raw, 'nama_kredit', '-'),
      harga_jual: hargaJual,
      harga_atribut: hargaAtribut,
      total_usd: getRawNumber(raw, 'total_usd', 0),
      ongkos_berlian: getRawNumber(raw, 'ongkos_berlian', 0),
      profit: getRawNumber(raw, 'profit', 0),
      curr: getRawNumber(raw, 'currency_skrg', getRawNumber(raw, 'curr_rp', 0)),
      total,
      keterangan: asText(item.keterangan ?? input.keterangan),
      total_berlian_rp: getRawNumber(raw, 'total_berlian_rp', 0),
      trs_barang_tukar: Boolean(raw?.trs_barang_tukar ?? false),
      potongan_berlian: getRawNumber(raw, 'potongan_berlian', 0),
    };
  });

  const total = detailBarang.reduce((sum, item) => sum + item.total, 0);
  const detailAuthorization = collectAuthorizationIds(input.authorizationIds, items.flatMap((item) => item.authorizationIds || []));
  const jumlahBayar = asNumber(input.jumlahBayar) || total;
  const inputPayments = Array.isArray(input.payments) ? input.payments : [];
  const pembayaran = inputPayments.length
    ? inputPayments.map((payment) => {
        const method = asText(payment.method, 'CASH').toUpperCase();
        const validMethod = ['CASH', 'TRANSFER', 'DEBET', 'CREDIT', 'TUKAR'].includes(method) ? method : 'TRANSFER';
        const isCard = validMethod === 'DEBET' || validMethod === 'CREDIT';
        const nonCashInfo = asText(payment.rekening || payment.bank, '-').toUpperCase();
        const noCard = asText(payment.noCard, '-').toUpperCase();
        const marketplace = asText(payment.marketplace, '');
        const keterangan = validMethod === 'CASH'
          ? 'CASH'
          : validMethod === 'TUKAR'
            ? '-'
            : isCard && noCard !== '-'
              ? `${nonCashInfo} ~ ${noCard}`
              : nonCashInfo;
        const bank = validMethod === 'CASH'
          ? 'CASH'
          : asText(payment.bank, nonCashInfo);

        return {
          bank,
          jenis: validMethod,
          bayar_lebih: 'TIDAK',
          keterangan,
          marketplace: marketplace || '-',
          detail_barang: Array.isArray(payment.detailBarang) ? payment.detailBarang : undefined,
          param_fee: isCard ? asText(payment.feeDropdown ?? payment.feePercent, '-') : '-',
          fee: isCard ? asNumber(payment.feePercent) : 0,
          ...(validMethod === 'TUKAR' ? { nominal: asNumber(payment.amount ?? payment.nominalWithFee) } : {}),
          jumlah_rp: asNumber(payment.amount ?? payment.nominalWithFee),
        };
      })
    : [{
        bank: 'CASH',
        jenis: 'CASH',
        bayar_lebih: 'TIDAK',
        keterangan: asText(input.keterangan),
        param_fee: '-',
        fee: 0,
        jumlah_rp: jumlahBayar,
      }];

  return {
    status: 'B278C07EC8B1C1B57F',
    keterangan_jual: asText(input.keterangan),
    bayar_dp: 0,
    kelebihan_dp: 0,
    kelebihan_po: 0,
    kode_sales: asText(input.kodeSales),
    kode_member: asText(input.kodeMember),
    nama_customer: asText(input.namaCustomer),
    alamat_customer: asText(input.alamatCustomer),
    no_hp: asText(input.noHp),
    detail_barang: detailBarang,
    pembayaran,
    ppn: 0,
    ppn_rp: 0,
    detail_authorization: detailAuthorization,
    biaya_admin: 0,
    biaya_packing: 0,
    biaya_kirim: 0,
    lebih_bayar: 0,
    total_usd: 0,
    total_profit: null,
    total_ongkos_berlian: null,
    voucher: '8F',
  };
}

async function lookupSaleItem(barcode, context = {}) {
  const code = encodeURIComponent(String(barcode || '').trim().toUpperCase());
  if (!code) throw new Error('Kode barcode wajib diisi.');
  const response = await nagagoldFetch(`/api/v1/barang/ready/kode-barcode/${code}`, { method: 'GET' }, context);
  const item = firstArrayItem(response.data);
  if (!item) {
    const message = typeof response.data === 'string' ? response.data : 'Barang tidak ditemukan.';
    const error = new Error(message);
    error.statusCode = 404;
    throw error;
  }
  return item;
}

async function submitSale(input, context = {}) {
  if (!input.kodeBarcode || !input.namaCustomer) {
    const error = new Error('Customer dan barcode wajib diisi.');
    error.statusCode = 400;
    throw error;
  }
  const payload = buildSalePayload(input);
  const response = await nagagoldRequest('/api/v1/penjualan/simpan', payload, context);
  const saleItems = input.items?.length
    ? input.items
    : [{ kodeBarcode: input.kodeBarcode, kodeBarang: input.kodeBarang, raw: input.raw }];
  let catalogueSync = null;
  try {
    catalogueSync = await markCatalogueItemsSold(context.storeId || input.storeId, saleItems);
  } catch (error) {
    console.warn('[sales] Gagal sync stock catalogue setelah penjualan:', error.message);
    catalogueSync = { error: error.message };
  }
  return { ok: true, endpoint: '/api/v1/penjualan/simpan', response, payload, catalogueSync };
}

async function authorize(input, context = {}) {
  if (!input.username || !input.password) {
    const error = new Error('Username dan password otorisasi wajib diisi.');
    error.statusCode = 400;
    throw error;
  }
  const payload = {
    user_id: asText(input.username),
    password: asText(input.password, ''),
    kategori: asText(input.kategori, 'OTORISASI'),
    description: asText(input.description ?? input.kategori, 'OTORISASI'),
    keterangan: asText(input.keterangan, '-').toUpperCase(),
    kode_barcode: asText(input.kodeBarcode, '-'),
    berat: asText(input.berat, '0'),
    berat_awal: asText(input.beratAwal, '0'),
    kode_intern: asText(input.kodeIntern, '-'),
  };
  const response = await nagagoldRequest('/api/v1/authorization', payload, context);
  return { ok: true, authorizationId: findAuthorizationId(response), response };
}

module.exports = {
  buildSalePayload,
  lookupSaleItem,
  submitSale,
  authorize,
};

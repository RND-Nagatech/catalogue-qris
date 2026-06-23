const { nagagoldFetch } = require('./client-service');
const {
  asNumber,
  buildDynamicFeatures,
  buildPurchaseCapabilities,
  buildSalesCapabilities,
  createConfigVersion,
  firstArrayItem,
  flattenReportRows,
  localDateKey,
  mapPurchaseRecent,
  mapSaleRecent,
  normalizeDashboardChart,
  normalizeNagagoldModules,
  normalizeNagagoldSystemParameters,
  sortRecentTransactions,
  unwrapNagagoldData,
} = require('./helpers');

async function safeNagagoldFetch(path, init, context) {
  try {
    const response = await nagagoldFetch(path, init, context);
    return response.data;
  } catch (error) {
    console.warn('[nagagold] optional fetch failed:', path, error instanceof Error ? error.message : error);
    return null;
  }
}

async function loadRuntimeConfig(context = {}) {
  const [
    moduleResponse,
    parameterResponse,
    transactionConfigResponse,
    marketplaceSettingsResponse,
    rekeningResponse,
    tokoResponse,
    salesResponse,
    marketplaceResponse,
    jenisResponse,
    kondisiResponse,
    groupResponse,
    pembulatanResponse,
  ] = await Promise.all([
    nagagoldFetch('/api/v1/para-system/type/module', { method: 'GET' }, context),
    nagagoldFetch('/api/v1/para-system', { method: 'GET' }, context).catch(() => ({ data: [] })),
    nagagoldFetch('/api/v1/paratransaksi/get/all', { method: 'GET' }, context).catch(() => ({ data: [] })),
    nagagoldFetch('/api/v1/marketplace-settings', { method: 'GET' }, context).catch(() => ({ data: [] })),
    nagagoldFetch('/api/v1/rekenings', { method: 'GET' }, context).catch(() => ({ data: [] })),
    nagagoldFetch('/api/v1/tokos', { method: 'GET' }, context).catch(() => ({ data: [] })),
    nagagoldFetch('/api/v1/sales/get/all', { method: 'GET' }, context).catch(() => ({ data: [] })),
    nagagoldFetch('/api/v1/marketplace', { method: 'GET' }, context).catch(() => ({ data: [] })),
    nagagoldFetch('/api/v1/jenis/get/all', { method: 'GET' }, context).catch(() => ({ data: [] })),
    nagagoldFetch('/api/v1/parabeli/get/all', { method: 'GET' }, context).catch(() => ({ data: [] })),
    nagagoldFetch('/api/v1/group/get/all', { method: 'GET' }, context).catch(() => ({ data: [] })),
    nagagoldFetch('/api/v1/para-system/key/PEMBULATAN', { method: 'GET' }, context).catch(() => ({ data: { value: 500 } })),
  ]);

  const modules = normalizeNagagoldModules(moduleResponse.data);
  const parameters = normalizeNagagoldSystemParameters(parameterResponse.data);
  const purchaseCapabilities = buildPurchaseCapabilities(modules);
  const pembulatanData = firstArrayItem(unwrapNagagoldData(pembulatanResponse.data));
  const transactionConfig = unwrapNagagoldData(transactionConfigResponse.data);
  const marketplaceSettings = unwrapNagagoldData(marketplaceSettingsResponse.data);
  const dynamicFeatures = buildDynamicFeatures(modules, parameters);
  const payloadForVersion = {
    modules,
    parameters,
    transactionConfig,
    marketplaceSettings,
    masters: {
      rekenings: rekeningResponse.data,
      tokos: tokoResponse.data,
      sales: salesResponse.data,
      marketplaces: marketplaceResponse.data,
      jenis: jenisResponse.data,
      kondisi: kondisiResponse.data,
      groups: groupResponse.data,
    },
  };

  return {
    domain: moduleResponse.domain,
    store: moduleResponse.store,
    version: createConfigVersion(payloadForVersion),
    loadedAt: new Date().toISOString(),
    modules,
    parameters,
    transactionConfig,
    marketplaceSettings,
    dynamicFeatures,
    capabilities: {
      sales: buildSalesCapabilities(modules),
      purchases: purchaseCapabilities,
    },
    masters: {
      sales: Array.isArray(salesResponse.data) ? salesResponse.data : [],
      marketplaces: Array.isArray(marketplaceResponse.data) ? marketplaceResponse.data : [],
      rekenings: Array.isArray(rekeningResponse.data) ? rekeningResponse.data : [],
      tokos: Array.isArray(tokoResponse.data) ? tokoResponse.data : [],
      jenis: Array.isArray(jenisResponse.data) ? jenisResponse.data : [],
      kondisi: Array.isArray(kondisiResponse.data) ? kondisiResponse.data : [],
      groups: Array.isArray(groupResponse.data) ? groupResponse.data : [],
      purchaseRounding: {
        value: asNumber(pembulatanData?.value) || 500,
        roundDown: modules.some((item) => item.key === 'PEMBULATAN_PEMBELIAN_KEBAWAH_MODULE'),
        disableAuthorizationAboveNota: purchaseCapabilities.disableAuthorizationAboveNota,
        disableAuthorizationBelowNota: purchaseCapabilities.disableAuthorizationBelowNota,
      },
    },
  };
}

async function loadSaleHistoryToday(limit = 50, context = {}) {
  const today = localDateKey();
  const data = await safeNagagoldFetch('/api/v1/penjualan/get/lihatjual', {
    method: 'POST',
    body: JSON.stringify({
      tgl_awal: today,
      tgl_akhir: today,
      skip: 0,
      limit,
    }),
  }, context);
  return flattenReportRows(data).map(mapSaleRecent);
}

async function loadPurchaseHistoryToday(context = {}) {
  const today = localDateKey();
  const data = await safeNagagoldFetch('/api/v1/pembelian/get/by-tanggal', {
    method: 'POST',
    body: JSON.stringify({
      tgl_awal: today,
      tgl_akhir: today,
      skip: 0,
      is_pagination: false,
    }),
  }, context);
  return flattenReportRows(data).map(mapPurchaseRecent);
}

async function loadDashboard(context = {}) {
  const [salesChartData, purchaseChartData, saleRows, purchaseRows] = await Promise.all([
    nagagoldFetch('/api/v1/penjualan/chart?type=today', { method: 'GET' }, context).then((response) => response.data),
    nagagoldFetch('/api/v1/pembelian/chart?type=today', { method: 'GET' }, context).then((response) => response.data),
    loadSaleHistoryToday(10, context),
    loadPurchaseHistoryToday(context),
  ]);

  return {
    sales: normalizeDashboardChart(salesChartData),
    purchases: normalizeDashboardChart(purchaseChartData),
    recent: sortRecentTransactions([...saleRows, ...purchaseRows]).slice(0, 10),
  };
}

async function loadHistoryToday(type = 'sale', context = {}) {
  const history = type === 'purchase'
    ? await loadPurchaseHistoryToday(context)
    : await loadSaleHistoryToday(100, context);
  return sortRecentTransactions(history);
}

async function loadConfigVersion(context = {}) {
  try {
    const config = await loadRuntimeConfig(context);
    return {
      domain: config.domain,
      status: 'OK',
      version: config.version,
      loadedAt: config.loadedAt,
      moduleCount: config.modules.length,
      parameterCount: config.parameters.length,
      dynamicFeatureCount: config.dynamicFeatures.length,
    };
  } catch (error) {
    return {
      domain: '',
      status: 'CONNECTION_ERROR',
      message: error instanceof Error ? error.message : 'Konfigurasi NAGAGOLD belum bisa dimuat.',
      checkedAt: new Date().toISOString(),
    };
  }
}

module.exports = {
  loadDashboard,
  loadHistoryToday,
  loadRuntimeConfig,
  loadConfigVersion,
};

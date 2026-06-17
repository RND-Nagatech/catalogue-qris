import cors from "cors";
import crypto from "node:crypto";
import "dotenv/config";
import express from "express";
import { MongoClient } from "mongodb";

type PaymentDocument = {
  id: string;
  note: string;
  amount: number;
  feeType: "none" | "fixed" | "percent";
  feeValue: string;
  feeAmount: number;
  totalAmount: number;
  status: "pending" | "paid";
  createdAt: string;
  paidAt?: string;
};

type SettingDocument = {
  _id: string;
  qrisString?: string;
  domain?: string;
  connection?: {
    ok: boolean;
    endpoint: string;
    status: number;
    checkedAt: string;
  };
  updatedAt?: string;
};

type NagagoldSaleRequest = {
  kodeSales?: string;
  kodeMember?: string;
  namaCustomer?: string;
  alamatCustomer?: string;
  noHp?: string;
  kodeBarcode?: string;
  namaBarang?: string;
  berat?: number;
  hargaGram?: number;
  ongkos?: number;
  items?: {
    kodeBarcode?: string;
    namaBarang?: string;
    berat?: number;
    hargaGram?: number;
    hargaJual?: number;
    ongkos?: number;
    total?: number;
    keterangan?: string;
    authorizationIds?: string[];
    raw?: Record<string, unknown>;
  }[];
  authorizationIds?: string[];
  jumlahBayar?: number;
  keterangan?: string;
  typePembayaran?: string;
  rekening?: string;
  payments?: {
    method?: string;
    amount?: number;
    bank?: string;
    rekening?: string;
    noCard?: string;
    marketplace?: string;
    feePercent?: number;
    feeAmount?: number;
    feeDropdown?: string;
    nominalWithFee?: number;
    qrisString?: string;
  }[];
};

type NagagoldPurchaseRequest = {
  kodeSales?: string;
  namaSales?: string;
  kodeToko?: string;
  kodeMember?: string;
  namaCustomer?: string;
  alamatCustomer?: string;
  noHp?: string;
  nikSimPassport?: string;
  kodeBarcode?: string;
  noFakturJual?: string;
  namaBarang?: string;
  berat?: number;
  harga?: number;
  kondisi?: string;
  items?: {
    kodeBarcode?: string;
    noFakturJual?: string;
    kodeJenis?: string;
    statusBarang?: string;
    namaBarang?: string;
    beratNota?: number;
    berat?: number;
    hargaNota?: number;
    harga?: number;
    kondisi?: string;
    typeKondisi?: string;
    kadar?: number;
    kadarModal?: number;
    kadarCetak?: string;
    potonganManual?: number;
    potonganKondisiBeli?: number;
    beratAtribut?: number;
    hargaAtribut?: number;
    kodeHargaBeli?: string;
    hargaRata?: number;
    authorizationIds?: string[];
    raw?: Record<string, unknown>;
  }[];
  authorizationIds?: string[];
  jumlahBayar?: number;
  keterangan?: string;
  typePembayaran?: string;
  rekening?: string;
};

type NagagoldAuthorizationRequest = {
  username?: string;
  password?: string;
  kategori?: string;
  description?: string;
  keterangan?: string;
  kodeBarcode?: string;
  berat?: number | string;
  beratAwal?: number | string;
  kodeIntern?: string;
};

type NagagoldModule = {
  key: string;
  value?: string | number | boolean;
  label?: string;
  type?: string;
  raw?: Record<string, unknown>;
};

type NagagoldSystemParameter = {
  key: string;
  value?: string | number | boolean | Record<string, unknown> | unknown[];
  type?: string;
  parent?: string;
  raw?: Record<string, unknown>;
};

type NagagoldDynamicFeature = {
  key: string;
  sourceKey: string;
  label: string;
  group: string;
  enabled: boolean;
  value?: NagagoldModule["value"];
};

type NagagoldSalesCapabilities = {
  requireSales: boolean;
  allowNonMember: boolean;
  showMemberPhone: boolean;
  allowEditMemberCustomer: boolean;
  allowDiscount: boolean;
  allowEditItemName: boolean;
  allowEditTotal: boolean;
  allowEditPricePerGram: boolean;
  showFinishing: boolean;
  showSize: boolean;
  showTax24k: boolean;
  showMarketplacePayment: boolean;
  showPpnTransaction: boolean;
  showVoucher: boolean;
  requireAuthorizationOnPriceChange: boolean;
  requireAuthorizationOnDiamondPriceChange: boolean;
  requireAuthorizationOnLowerOngkos: boolean;
  allowQrisOnTransfer: boolean;
};

type NagagoldPurchaseCapabilities = {
  requireSales: boolean;
  allowTransferPayment: boolean;
  requireTransferAuthorization: boolean;
  allowPurchaseWithoutBarcode: boolean;
  showStoreSelector: boolean;
  showManualDiscount: boolean;
  showBiayaAdmin: boolean;
  showPhoto: boolean;
  lockHargaBeli: boolean;
  readOnlyHargaBeli: boolean;
  disableBeratBeli: boolean;
  useHargaNotaWithOngkos: boolean;
  useHargaBeliWithoutAtributOngkos: boolean;
  useParameterHargaBeli: boolean;
  useParameterHargaEmas: boolean;
  enableHargaRataEdit: boolean;
  requireWeightToleranceAuthorization: boolean;
  requireAbsoluteAuthorization: boolean;
  disableAuthorizationAboveNota: boolean;
  disableAuthorizationBelowNota: boolean;
  unsupportedModules: string[];
};

type DashboardChart = {
  count: number;
  gram: number;
  rupiah: number;
  raw?: unknown;
};

const defaultSalesCapabilities: NagagoldSalesCapabilities = {
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

const defaultPurchaseCapabilities: NagagoldPurchaseCapabilities = {
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

type DashboardRecentTransaction = {
  id: string;
  type: "sale" | "purchase";
  title: string;
  subtitle: string;
  amount: number;
  gram: number;
  time: string;
  status: string;
  createdAt?: string;
  raw?: unknown;
};

const uri = process.env.MONGODB_URI;
const port = Number(process.env.PORT ?? 4000);
const tokenPusat = process.env.TOKEN_PUSAT;
const nagagoldApiKey = process.env.NAGAGOLD_API_KEY || process.env.OPEN_API_KEY;

if (!uri) {
  throw new Error("MONGODB_URI is required.");
}

const client = new MongoClient(uri);
const app = express();

app.use(cors());
app.use(express.json({ limit: "1mb" }));

async function getDb() {
  await client.connect();
  return client.db();
}

function calculateFeeAmount(amount: number, feeType: PaymentDocument["feeType"], feeValue: string): number {
  if (feeType === "fixed") {
    return Math.max(0, Math.floor(Number(feeValue.replace(/\D/g, "")) || 0));
  }

  if (feeType === "percent") {
    const percent = Number(feeValue.replace(",", "."));
    if (!Number.isFinite(percent) || percent <= 0) return 0;
    return Math.floor((amount * percent) / 100);
  }

  return 0;
}

function jakartaDateKey(isoDate?: string): string {
  if (!isoDate) return "";
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(isoDate));
}

function isTodayJakarta(payment: PaymentDocument): boolean {
  const today = jakartaDateKey(new Date().toISOString());
  const relevantDate = payment.status === "paid" ? payment.paidAt : payment.createdAt;
  return jakartaDateKey(relevantDate) === today;
}

function normalizeDomain(domain: string): string {
  const trimmed = domain.trim();
  if (!trimmed) return "";
  return trimmed.replace(/\/+$/, "");
}

function asNumber(value: unknown): number {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : 0;
}

function asText(value: unknown, fallback = "8F"): string {
  const text = String(value ?? "").trim();
  return text || fallback;
}

function firstArrayItem(data: unknown): Record<string, unknown> | null {
  if (Array.isArray(data)) {
    return typeof data[0] === "object" && data[0] ? data[0] as Record<string, unknown> : null;
  }

  return typeof data === "object" && data ? data as Record<string, unknown> : null;
}

function getRawNumber(raw: Record<string, unknown> | undefined, key: string, fallback = 0): number {
  if (!raw || raw[key] === undefined || raw[key] === null) return fallback;
  return asNumber(raw[key]);
}

function getRawText(raw: Record<string, unknown> | undefined, key: string, fallback = "8F"): string {
  if (!raw) return fallback;
  return asText(raw[key], fallback);
}

function normalizeKodeDept(value: unknown, raw?: Record<string, unknown>): string {
  const rawKodeDept = asText(raw?.kode_dept, "");
  if (rawKodeDept) return rawKodeDept;

  const text = asText(value, "");
  return text.split("-")[0]?.trim() || text;
}

function collectAuthorizationIds(...groups: (string[] | undefined)[]): { _id: string }[] {
  const ids = groups
    .flatMap((group) => group ?? [])
    .map((id) => String(id ?? "").trim())
    .filter(Boolean);
  return Array.from(new Set(ids)).map((_id) => ({ _id }));
}

function findAuthorizationId(response: unknown): string {
  if (!response || typeof response !== "object") return "";
  const record = response as Record<string, unknown>;
  if (record._id) return String(record._id);
  if (record.data && typeof record.data === "object" && "_id" in record.data) {
    return String((record.data as Record<string, unknown>)._id ?? "");
  }
  return "";
}

function unwrapNagagoldData(data: unknown): unknown {
  let current = data;
  for (let index = 0; index < 4; index += 1) {
    if (!current || typeof current !== "object" || Array.isArray(current)) return current;
    const record = current as Record<string, unknown>;
    if ("data" in record) {
      current = record.data;
      continue;
    }
    if ("value" in record && typeof record.value === "object") {
      current = record.value;
      continue;
    }
    return current;
  }
  return current;
}

function normalizeNagagoldModules(data: unknown): NagagoldModule[] {
  const unwrapped = unwrapNagagoldData(data);
  if (!Array.isArray(unwrapped)) return [];

  return unwrapped.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const raw = item as Record<string, unknown>;
    const key = asText(raw.key, "");
    if (!key) return [];
    const rawValue = raw.value;
    if (rawValue === false || String(rawValue).toLowerCase() === "false") return [];

    return [{
      key,
      value: rawValue as NagagoldModule["value"],
      label: asText(raw.label ?? raw.name ?? raw.nama, ""),
      type: asText(raw.type, ""),
      raw,
    }];
  });
}

function normalizeNagagoldSystemParameters(data: unknown): NagagoldSystemParameter[] {
  const unwrapped = unwrapNagagoldData(data);
  if (!Array.isArray(unwrapped)) return [];

  return unwrapped.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const raw = item as Record<string, unknown>;
    const key = asText(raw.key, "");
    if (!key) return [];

    return [{
      key,
      value: raw.value as NagagoldSystemParameter["value"],
      type: asText(raw.type, ""),
      parent: asText(raw.parent, ""),
      raw,
    }];
  });
}

function createConfigVersion(input: unknown): string {
  return crypto
    .createHash("sha256")
    .update(JSON.stringify(input))
    .digest("hex");
}

function classifyFeatureGroup(key: string): string {
  const upper = key.toUpperCase();
  if (upper.includes("TUKAR")) return "exchange";
  if (upper.includes("MARKETPLACE")) return "marketplace";
  if (upper.includes("GUDANG") || upper.includes("TOKO") || upper.includes("CABANG")) return "warehouse";
  if (upper.includes("CUSTOMER") || upper.includes("MEMBER")) return "customer";
  if (upper.includes("PPN") || upper.includes("PAJAK")) return "tax";
  if (upper.includes("SALES")) return "sales";
  if (upper.includes("VOUCHER")) return "voucher";
  if (upper.includes("FOTO") || upper.includes("PHOTO")) return "photo";
  if (upper.includes("OTORISASI") || upper.includes("AUTHORIZATION")) return "authorization";
  if (upper.includes("PEMBULATAN")) return "rounding";
  if (upper.includes("PEMBAYARAN") || upper.includes("PAYMENT") || upper.includes("REKENING")) return "payment";
  if (upper.includes("PEMBELIAN") || upper.includes("BUYING")) return "purchase";
  if (upper.includes("PENJUALAN") || upper.includes("TRANSACTION")) return "salesTransaction";
  return "general";
}

function labelFromKey(key: string): string {
  return key
    .toLowerCase()
    .split("_")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function buildDynamicFeatures(modules: NagagoldModule[], parameters: NagagoldSystemParameter[]): NagagoldDynamicFeature[] {
  const moduleFeatures = modules.map((module) => ({
    key: module.key,
    sourceKey: module.key,
    label: module.label || labelFromKey(module.key),
    group: classifyFeatureGroup(module.key),
    enabled: true,
    value: module.value,
  }));

  const parameterFeatures = parameters
    .filter((parameter) => classifyFeatureGroup(parameter.key) !== "general")
    .map((parameter) => ({
      key: parameter.key,
      sourceKey: parameter.key,
      label: labelFromKey(parameter.key),
      group: classifyFeatureGroup(parameter.key),
      enabled: String(parameter.value ?? "").toLowerCase() !== "false",
      value: parameter.value as NagagoldModule["value"],
    }));

  const byKey = new Map<string, NagagoldDynamicFeature>();
  [...moduleFeatures, ...parameterFeatures].forEach((feature) => {
    byKey.set(feature.key, feature);
  });
  return Array.from(byKey.values()).sort((a, b) => a.group.localeCompare(b.group) || a.label.localeCompare(b.label));
}

function createModuleReader(modules: NagagoldModule[]) {
  const byKey = new Map(modules.map((module) => [module.key, module]));
  return {
    has: (key: string) => byKey.has(key),
    value: (key: string) => byKey.get(key)?.value,
  };
}

function buildSalesCapabilities(modules: NagagoldModule[]): NagagoldSalesCapabilities {
  const module = createModuleReader(modules);

  return {
    ...defaultSalesCapabilities,
    requireSales: !module.has("DISABLE_KODE_SALES_TRANSACTION"),
    allowNonMember: !module.has("NONMEMBER_DISABLED_TRANSACTION"),
    showMemberPhone: module.has("MODULE_MEMBER_NO_HP"),
    allowEditMemberCustomer: module.has("ENABLE_EDIT_CUSTOMER_ON_MEMBER"),
    allowDiscount: module.has("PENJUALAN_DISCOUNT_MODULE"),
    allowEditItemName: module.has("EDIT_NAMA_BARANG_PENJUALAN_MODULE"),
    allowEditTotal: module.has("MODIFY_TOTAL_HARGA_MODULE"),
    allowEditPricePerGram: module.has("EDIT_HARGA_PER_GRAM_MODULE"),
    showFinishing: module.has("FINISHING_BARANG_MODULE"),
    showSize: module.has("SIZE_PERHIASAN_MODULE"),
    showTax24k: module.has("PAJAK_24K_MODULE"),
    showMarketplacePayment: module.has("MARKETPLACE_PEMBAYARAN_MODULE"),
    showPpnTransaction: module.has("PPN_TRANSAKSI_MODULE"),
    showVoucher: module.has("MODULE_VOUCHER"),
    requireAuthorizationOnPriceChange: module.has("TRANSACTION_ABSOLUTE_AUTHORIZATION_MODULE") || module.has("MODULE_TOLERANSI_HARGA_JUAL"),
    requireAuthorizationOnDiamondPriceChange: module.has("BERLIAN_TRANSACTION_AUTHORIZATION_MODULE"),
    requireAuthorizationOnLowerOngkos: module.has("OTORISASI_ONGKOS_TURUN_PENJUALAN"),
    allowQrisOnTransfer: true,
  };
}

function buildPurchaseCapabilities(modules: NagagoldModule[]): NagagoldPurchaseCapabilities {
  const module = createModuleReader(modules);
  const unsupportedModules: string[] = [];

  return {
    ...defaultPurchaseCapabilities,
    requireSales: !module.has("DISABLE_KODE_SALES_TRANSACTION"),
    allowTransferPayment: true,
    requireTransferAuthorization: module.has("OTORISASI_PEMBAYARAN_TRANSFER"),
    allowPurchaseWithoutBarcode: module.has("OTORISASI_PEMBELIAN_TANPA_BARCODE"),
    showStoreSelector: true,
    showManualDiscount: module.has("POTONGAN_MANUAL_PEMBELIAN_MODULE"),
    showBiayaAdmin: module.has("MODULE_BIAYA_ADMIN_PEMBELIAN"),
    showPhoto: module.has("PEMBELIAN_DENGAN_FOTO"),
    lockHargaBeli: module.has("LOCK_HARGA_BELI_MODULE"),
    readOnlyHargaBeli: module.has("HARGA_BELI_READ_ONLY"),
    disableBeratBeli: module.has("BUYING_DISABLE_ACCESS_BERAT_BELI"),
    useHargaNotaWithOngkos: module.has("HARGA_NOTA_DENGAN_ONGKOS_MODULE"),
    useHargaBeliWithoutAtributOngkos: module.has("HARGA_BELI_TANPA_ATRIBUT_ONGKOS"),
    useParameterHargaBeli: module.has("PARAMETER_HARGA_BELI"),
    useParameterHargaEmas: module.has("PARAMETER_HARGA_EMAS_PEMBELIAN"),
    enableHargaRataEdit: module.has("ENABLE_HARGA_RATA_PEMBELIAN_MODULE"),
    requireWeightToleranceAuthorization: module.has("OTORISASI_TOLERANSI_BERAT_PEMBELIAN_MODULE"),
    requireAbsoluteAuthorization: module.has("TRANSACTION_ABSOLUTE_AUTHORIZATION_MODULE"),
    disableAuthorizationAboveNota: module.has("NON_AKTIF_OTORISASI_HARGA_BELI_DIATAS_HARGA_NOTA"),
    disableAuthorizationBelowNota: module.has("NON_AKTIF_OTORISASI_HARGA_BELI_DIBAWAH_HARGA_NOTA"),
    unsupportedModules,
  };
}

async function loadNagagoldRuntimeConfig() {
  const domain = await loadNagagoldDomain();
  if (!domain) {
    throw new Error("Domain NAGAGOLD belum diatur.");
  }

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
    nagagoldFetch("/api/v1/para-system/type/module", { method: "GET" }),
    nagagoldFetch("/api/v1/para-system", { method: "GET" }).catch(() => ({ data: [] })),
    nagagoldFetch("/api/v1/paratransaksi/get/all", { method: "GET" }).catch(() => ({ data: [] })),
    nagagoldFetch("/api/v1/marketplace-settings", { method: "GET" }).catch(() => ({ data: [] })),
    nagagoldFetch("/api/v1/rekenings", { method: "GET" }).catch(() => ({ data: [] })),
    nagagoldFetch("/api/v1/tokos", { method: "GET" }).catch(() => ({ data: [] })),
    nagagoldFetch("/api/v1/sales/get/all", { method: "GET" }).catch(() => ({ data: [] })),
    nagagoldFetch("/api/v1/marketplace", { method: "GET" }).catch(() => ({ data: [] })),
    nagagoldFetch("/api/v1/jenis/get/all", { method: "GET" }).catch(() => ({ data: [] })),
    nagagoldFetch("/api/v1/parabeli/get/all", { method: "GET" }).catch(() => ({ data: [] })),
    nagagoldFetch("/api/v1/group/get/all", { method: "GET" }).catch(() => ({ data: [] })),
    nagagoldFetch("/api/v1/para-system/key/PEMBULATAN", { method: "GET" }).catch(() => ({ data: { value: 500 } })),
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
    domain,
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
        roundDown: modules.some((item) => item.key === "PEMBULATAN_PEMBELIAN_KEBAWAH_MODULE"),
        disableAuthorizationAboveNota: purchaseCapabilities.disableAuthorizationAboveNota,
        disableAuthorizationBelowNota: purchaseCapabilities.disableAuthorizationBelowNota,
      },
    },
  };
}

function normalizeDashboardChart(data: unknown): DashboardChart {
  const unwrapped = unwrapNagagoldData(data);
  const record = typeof unwrapped === "object" && unwrapped ? unwrapped as Record<string, unknown> : {};
  return {
    count: asNumber(record.value ?? record.count ?? record.qty ?? record.total),
    gram: asNumber(record.gram ?? record.berat ?? record.total_gram),
    rupiah: asNumber(record.rupiah ?? record.nominal ?? record.total_rupiah ?? record.total),
    raw: data,
  };
}

function localDateKey(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function flattenReportRows(data: unknown): Record<string, unknown>[] {
  const unwrapped = unwrapNagagoldData(data);
  const rows = Array.isArray(unwrapped) ? unwrapped : [];
  return rows.flatMap((row) => {
    if (!row || typeof row !== "object") return [];
    const record = row as Record<string, unknown>;
    if (Array.isArray(record.detail)) {
      return record.detail
        .filter((detail): detail is Record<string, unknown> => Boolean(detail && typeof detail === "object"))
        .map((detail) => ({ ...detail, _group: record }));
    }
    return [record];
  });
}

function pickTime(record: Record<string, unknown>): string {
  return asText(record.jam ?? record.time_stamp ?? record.createdAt ?? record.tgl_stamp, "").slice(0, 5) || "-";
}

function mapSaleRecent(record: Record<string, unknown>): DashboardRecentTransaction {
  const amount = asNumber(record.harga_total ?? record.total ?? record.harga_jual);
  return {
    id: asText(record.no_faktur_jual ?? record.no_faktur_group_user ?? record.kode_barcode, `SALE-${Date.now()}`),
    type: "sale",
    title: asText(record.nama_barang, "Penjualan"),
    subtitle: `Penjualan • ${pickTime(record)}`,
    amount,
    gram: asNumber(record.berat),
    time: pickTime(record),
    status: asText(record.status_valid ?? "SELESAI", "SELESAI"),
    createdAt: asText(record.tgl_system ?? record.tanggal ?? "", ""),
    raw: record,
  };
}

function mapPurchaseRecent(record: Record<string, unknown>): DashboardRecentTransaction {
  const amount = asNumber(record.harga ?? record.harga_beli ?? record.total ?? record.harga_nota);
  return {
    id: asText(record.no_faktur_beli ?? record.no_faktur_group_user ?? record.kode_barcode, `PURCHASE-${Date.now()}`),
    type: "purchase",
    title: asText(record.nama_barang, "Pembelian"),
    subtitle: `Pembelian • ${pickTime(record)}`,
    amount,
    gram: asNumber(record.berat),
    time: pickTime(record),
    status: asText(record.status_valid ?? "SELESAI", "SELESAI"),
    createdAt: asText(record.tgl_system ?? record.tanggal ?? "", ""),
    raw: record,
  };
}

async function safeNagagoldFetch(path: string, init?: RequestInit): Promise<unknown> {
  try {
    const response = await nagagoldFetch(path, init);
    return response.data;
  } catch (error) {
    console.warn("NAGAGOLD dashboard optional fetch failed:", path, error instanceof Error ? error.message : error);
    return null;
  }
}

async function loadSaleHistoryToday(limit = 50): Promise<DashboardRecentTransaction[]> {
  const today = localDateKey();
  const data = await safeNagagoldFetch("/api/v1/penjualan/get/lihatjual", {
    method: "POST",
    body: JSON.stringify({
      tgl_awal: today,
      tgl_akhir: today,
      skip: 0,
      limit,
    }),
  });
  return flattenReportRows(data).map(mapSaleRecent);
}

async function loadPurchaseHistoryToday(): Promise<DashboardRecentTransaction[]> {
  const today = localDateKey();
  const data = await safeNagagoldFetch("/api/v1/pembelian/get/by-tanggal", {
    method: "POST",
    body: JSON.stringify({
      tgl_awal: today,
      tgl_akhir: today,
      skip: 0,
      is_pagination: false,
    }),
  });
  return flattenReportRows(data).map(mapPurchaseRecent);
}

function sortRecentTransactions(items: DashboardRecentTransaction[]): DashboardRecentTransaction[] {
  return [...items].sort((a, b) => {
    const dateA = `${a.createdAt ?? ""} ${a.time}`;
    const dateB = `${b.createdAt ?? ""} ${b.time}`;
    return dateB.localeCompare(dateA);
  });
}

function formatNagagoldError(data: unknown, status: number, domain: string): string {
  if (typeof data === "object" && data && "message" in data) {
    return String(data.message);
  }

  if (typeof data !== "string") {
    return `NAGAGOLD request failed (${status}).`;
  }

  const text = data.trim();
  if (!text) return `NAGAGOLD request failed (${status}).`;

  if (/cloudflare tunnel error/i.test(text) || /error\s*1033/i.test(text)) {
    return `Domain NAGAGOLD sedang tidak bisa diakses oleh Cloudflare Tunnel (${domain}). Coba Test Koneksi di Pengaturan atau ulangi beberapa saat lagi.`;
  }

  if (/api key required/i.test(text)) {
    return "NAGAGOLD domain ini membutuhkan API key. Isi NAGAGOLD_API_KEY atau OPEN_API_KEY di .env, lalu restart backend.";
  }

  if (/invalid signature/i.test(text)) {
    return "Signature NAGAGOLD tidak valid. Periksa NAGAGOLD_API_KEY / OPEN_API_KEY untuk domain ini, lalu restart backend.";
  }

  if (/^\s*<!doctype html/i.test(text) || /^\s*<html/i.test(text)) {
    const title = text.match(/<title>(.*?)<\/title>/i)?.[1]?.replace(/\s+/g, " ").trim();
    return title ? `NAGAGOLD mengembalikan halaman error: ${title}` : `NAGAGOLD mengembalikan halaman HTML error (${status}).`;
  }

  return text;
}

async function loadNagagoldDomain(): Promise<string> {
  const db = await getDb();
  const setting = await db.collection<SettingDocument>("settings").findOne({ _id: "nagagold" });
  return normalizeDomain(setting?.domain ?? "");
}

function nagagoldHeaders(): Record<string, string> {
  if (!tokenPusat) {
    throw new Error("TOKEN_PUSAT is required.");
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "x-auth-token": tokenPusat,
    "ngrok-skip-browser-warning": "1",
    Authorization: `Bearer ${tokenPusat}`,
    token: tokenPusat,
    "x-token-pusat": tokenPusat,
  };

  if (nagagoldApiKey) {
    const timestamp = new Date().toISOString();
    headers["api-key"] = nagagoldApiKey;
    headers.timestamp = timestamp;
    headers.signature = crypto.createHash("sha256").update(`${nagagoldApiKey}${timestamp}`).digest("hex");
  }

  return headers;
}

async function nagagoldFetch(path: string, init?: RequestInit): Promise<{ data: unknown; status: number; url: string }> {
  const domain = await loadNagagoldDomain();
  if (!domain) {
    throw new Error("Domain NAGAGOLD belum diatur.");
  }

  const url = `${domain}${path}`;
  let response: Response;
  try {
    response = await fetch(url, {
      ...init,
      headers: {
        ...nagagoldHeaders(),
        ...(init?.headers ?? {}),
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "fetch failed";
    throw new Error(`Domain NAGAGOLD tidak bisa dijangkau: ${domain}. Detail: ${message}`);
  }

  const contentType = response.headers.get("content-type") ?? "";
  const data = response.status === 304
    ? null
    : contentType.includes("application/json")
      ? await response.json()
      : await response.text();
  if (!response.ok && response.status !== 304) {
    throw new Error(formatNagagoldError(data, response.status, domain));
  }

  return { data, status: response.status, url };
}

async function nagagoldRequest(path: string, body: unknown): Promise<unknown> {
  const response = await nagagoldFetch(path, {
    method: "POST",
    body: JSON.stringify(body),
  });

  return response.data;
}

function buildSalePayload(input: NagagoldSaleRequest) {
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
    const beratAwal = getRawNumber(raw, "berat_awal", getRawNumber(raw, "berat", berat));
    const beratAtribut = getRawNumber(raw, "berat_atribut", 0);
    const hargaGram = asNumber(item.hargaGram);
    const ongkos = asNumber(item.ongkos);
    const hargaJual = asNumber(item.hargaJual) || getRawNumber(raw, "harga_jual", berat * hargaGram);
    const hargaAtribut = getRawNumber(raw, "harga_atribut", 0);
    const feeSales = getRawNumber(raw, "fee_sales", 0);
    const total = asNumber(item.total) || getRawNumber(raw, "total", hargaJual + ongkos + hargaAtribut + feeSales);

    return {
      ppn_transaksi_rp: getRawNumber(raw, "ppn_transaksi_rp", 0),
      ppn_transaksi_value: getRawNumber(raw, "ppn_transaksi_value", 0),
      is_markis: Boolean(raw?.is_markis ?? false),
      keterangan_jual: asText(item.keterangan ?? input.keterangan),
      no_po: getRawText(raw, "no_po", "-"),
      no_titip_group: getRawText(raw, "no_titip_group", "-"),
      no_pesanan: getRawText(raw, "no_pesanan", "-"),
      kode_barcode: asText(item.kodeBarcode),
      fee_sales: feeSales,
      berat,
      berat_awal: beratAwal,
      berat_atribut: beratAtribut,
      harga_gram: hargaGram,
      nama_barang: asText(item.namaBarang),
      nama_atribut: getRawText(raw, "nama_atribut", "-"),
      marketplace: getRawText(raw, "marketplace", "-"),
      diskon_penjualan: getRawNumber(raw, "diskon_penjualan", getRawNumber(raw, "diskon_rp", 0)),
      ongkos,
      qty: getRawNumber(raw, "qty", 1) || 1,
      ppn_diamond: getRawNumber(raw, "ppn_diamond", 0),
      berat_24k: getRawNumber(raw, "berat_24k", 0),
      total_24k: getRawNumber(raw, "total_24k", 0),
      finishing: getRawText(raw, "finishing", "-"),
      size: String(raw?.size ?? "-"),
      nama_kredit: getRawText(raw, "nama_kredit", "-"),
      harga_jual: hargaJual,
      harga_atribut: hargaAtribut,
      total_usd: getRawNumber(raw, "total_usd", 0),
      ongkos_berlian: getRawNumber(raw, "ongkos_berlian", 0),
      profit: getRawNumber(raw, "profit", 0),
      curr: getRawNumber(raw, "currency_skrg", getRawNumber(raw, "curr_rp", 0)),
      total,
      keterangan: asText(item.keterangan ?? input.keterangan),
      total_berlian_rp: getRawNumber(raw, "total_berlian_rp", 0),
      trs_barang_tukar: Boolean(raw?.trs_barang_tukar ?? false),
      potongan_berlian: getRawNumber(raw, "potongan_berlian", 0),
    };
  });
  const total = detailBarang.reduce((sum, item) => sum + item.total, 0);
  const detailAuthorization = collectAuthorizationIds(input.authorizationIds, items.flatMap((item) => item.authorizationIds ?? []));
  const jumlahBayar = asNumber(input.jumlahBayar) || total;
  const inputPayments = Array.isArray(input.payments) ? input.payments : [];
  const pembayaran = inputPayments.length
    ? inputPayments.map((payment) => {
        const method = asText(payment.method, "CASH").toUpperCase();
        const validMethod = ["CASH", "TRANSFER", "DEBET", "CREDIT", "TUKAR"].includes(method) ? method : "TRANSFER";
        const isCard = validMethod === "DEBET" || validMethod === "CREDIT";
        const nonCashInfo = asText(payment.rekening || payment.bank, "-").toUpperCase();
        const noCard = asText(payment.noCard, "-").toUpperCase();
        const marketplace = asText(payment.marketplace, "-");
        const keterangan = validMethod === "CASH"
          ? "CASH"
          : validMethod === "TUKAR"
            ? "TUKAR"
          : isCard && noCard !== "-"
            ? `${nonCashInfo} ~ ${noCard}`
            : nonCashInfo;
        const bank = validMethod === "CASH"
          ? "CASH"
          : asText(payment.bank, nonCashInfo);

        return {
          bank,
          jenis: validMethod,
          bayar_lebih: "TIDAK",
          keterangan,
          marketplace,
          param_fee: isCard ? asText(payment.feeDropdown ?? payment.feePercent, "-") : "-",
          fee: isCard ? asNumber(payment.feePercent) : 0,
          jumlah_rp: asNumber(payment.amount ?? payment.nominalWithFee),
        };
      })
    : [
        {
          bank: "CASH",
          jenis: "CASH",
          bayar_lebih: "TIDAK",
          keterangan: asText(input.keterangan),
          param_fee: "-",
          fee: 0,
          jumlah_rp: jumlahBayar,
        },
      ];

  return {
    status: "B278C07EC8B1C1B57F",
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
    voucher: "8F",
  };
}

function buildPurchasePayload(input: NagagoldPurchaseRequest) {
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
    const beratNota = asNumber(item.beratNota) || getRawNumber(raw, "berat_nota", berat);
    const hargaNota = asNumber(item.hargaNota) || getRawNumber(raw, "harga_nota", getRawNumber(raw, "harga_jual", harga));
    return {
      kode_sales_jual: getRawText(raw, "kode_sales", asText(input.kodeSales, "-")),
      kode_barcode: asText(item.kodeBarcode),
      no_faktur_jual: asText(item.noFakturJual),
      kode_dept: normalizeKodeDept(item.kodeJenis, raw),
      status_barang: asText(item.statusBarang ?? raw?.status_barang, "BARU"),
      nama_barang: asText(item.namaBarang),
      berat_nota: beratNota,
      harga,
      biaya_admin: getRawNumber(raw, "biaya_admin", 0),
      berat,
      kadar: asNumber(item.kadar) || getRawNumber(raw, "kadar", 0),
      kadar_modal: asNumber(item.kadarModal) || getRawNumber(raw, "kadar_modal", 100),
      kadar_cetak: asText(item.kadarCetak ?? raw?.kadar_cetak, "-"),
      harga_nota: hargaNota,
      kondisi: asText(item.kondisi),
      type_kondisi: asText(item.typeKondisi, "PERSENTASE"),
      potongan_manual: asNumber(item.potonganManual) || 0,
      tipe_potongan_kondisi_beli: asText(item.typeKondisi, "PERSENTASE"),
      potongan_kondisi_beli: asNumber(item.potonganKondisiBeli) || getRawNumber(raw, "potongan_kondisi_beli", 0),
      berat_atribut: asNumber(item.beratAtribut) || getRawNumber(raw, "berat_atribut", 0),
      harga_atribut: asNumber(item.hargaAtribut) || getRawNumber(raw, "harga_atribut", 0),
      kode_harga_beli: asText(item.kodeHargaBeli, "-"),
      harga_rata: asNumber(item.hargaRata) || (berat > 0 ? Math.floor(harga / berat) : 0),
    };
  });
  const totalHarga = detailBarang.reduce((sum, item) => sum + item.harga, 0);
  const detailAuthorization = collectAuthorizationIds(input.authorizationIds, items.flatMap((item) => item.authorizationIds ?? []));
  const jumlahBayar = asNumber(input.jumlahBayar) || totalHarga;
  const typePembayaran = asText(input.typePembayaran ?? input.keterangan, "CASH");
  const rekeningParts = asText(input.rekening, "-").split("-");

  return {
    kode_sales: asText(input.kodeSales),
    nama_sales: asText(input.namaSales ?? input.kodeSales),
    kode_toko: asText(input.kodeToko, "-"),
    kode_gudang: asText(input.kodeToko, "-"),
    nama_customer: asText(input.namaCustomer),
    kode_member: asText(input.kodeMember),
    alamat_customer: asText(input.alamatCustomer),
    no_hp: asText(input.noHp),
    nik_sim_passport: asText(input.nikSimPassport),
    detail_barang: detailBarang,
    pembayaran: [
      {
        jenis: typePembayaran,
        jumlah_rp: jumlahBayar,
        keterangan: typePembayaran === "CASH" ? "-" : asText(input.rekening, "-"),
        nama_rekening_pelanggan: "-",
        bank_pelanggan: "-",
        bank: typePembayaran === "CASH" ? "-" : asText(rekeningParts[1], "-").trim(),
      },
    ],
    detail_authorization: detailAuthorization,
    id_trx: `QRIS-${Date.now()}`,
  };
}

app.get("/health", async (_req, res, next) => {
  try {
    const db = await getDb();
    await db.command({ ping: 1 });
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

app.get("/api/settings/qris", async (_req, res, next) => {
  try {
    const db = await getDb();
    const setting = await db.collection<SettingDocument>("settings").findOne({ _id: "qris" });
    res.json({ qrisString: setting?.qrisString ?? null });
  } catch (error) {
    next(error);
  }
});

app.put("/api/settings/qris", async (req, res, next) => {
  try {
    const qrisString = String(req.body?.qrisString ?? "").trim();
    if (!qrisString) {
      res.status(400).json({ message: "qrisString is required." });
      return;
    }

    const db = await getDb();
    await db.collection<SettingDocument>("settings").updateOne(
      { _id: "qris" },
      { $set: { qrisString, updatedAt: new Date().toISOString() } },
      { upsert: true },
    );
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

app.delete("/api/settings/qris", async (_req, res, next) => {
  try {
    const db = await getDb();
    await db.collection<SettingDocument>("settings").deleteOne({ _id: "qris" });
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

app.get("/api/settings/nagagold", async (_req, res, next) => {
  try {
    const db = await getDb();
    const setting = await db.collection<SettingDocument>("settings").findOne({ _id: "nagagold" });
    res.json({ domain: setting?.domain ?? null, connection: setting?.connection ?? null });
  } catch (error) {
    next(error);
  }
});

app.put("/api/settings/nagagold", async (req, res, next) => {
  try {
    const domain = normalizeDomain(String(req.body?.domain ?? ""));
    if (!domain || !/^https?:\/\//.test(domain)) {
      res.status(400).json({ message: "Domain NAGAGOLD harus diawali http:// atau https://." });
      return;
    }

    const db = await getDb();
    await db.collection<SettingDocument>("settings").updateOne(
      { _id: "nagagold" },
      { $set: { domain, updatedAt: new Date().toISOString() }, $unset: { connection: "" } },
      { upsert: true },
    );
    res.json({ ok: true, domain, connection: null });
  } catch (error) {
    next(error);
  }
});

app.get("/api/nagagold/test-connection", async (_req, res, next) => {
  try {
    const endpoint = "/api/v1/hutang/dashboard";
    const response = await nagagoldFetch(endpoint, { method: "GET" });
    const connection = {
      ok: true,
      endpoint,
      status: response.status,
      checkedAt: new Date().toISOString(),
    };
    const db = await getDb();
    await db.collection<SettingDocument>("settings").updateOne(
      { _id: "nagagold" },
      { $set: { connection, updatedAt: connection.checkedAt } },
    );
    res.json({
      ok: true,
      endpoint,
      status: response.status,
      checkedAt: connection.checkedAt,
      response: response.data,
    });
  } catch (error) {
    next(error);
  }
});

app.get("/api/nagagold/bootstrap", async (_req, res, next) => {
  try {
    res.json(await loadNagagoldRuntimeConfig());
  } catch (error) {
    next(error);
  }
});

app.get("/api/nagagold/config", async (_req, res, next) => {
  try {
    res.json(await loadNagagoldRuntimeConfig());
  } catch (error) {
    next(error);
  }
});

app.get("/api/nagagold/config/version", async (_req, res, next) => {
  try {
    const config = await loadNagagoldRuntimeConfig();
    res.json({
      domain: config.domain,
      version: config.version,
      loadedAt: config.loadedAt,
      moduleCount: config.modules.length,
      parameterCount: config.parameters.length,
      dynamicFeatureCount: config.dynamicFeatures.length,
    });
  } catch (error) {
    next(error);
  }
});

app.get("/api/nagagold/dashboard", async (_req, res, next) => {
  try {
    const [salesChartData, purchaseChartData, saleRows, purchaseRows] = await Promise.all([
      nagagoldFetch("/api/v1/penjualan/chart?type=today", { method: "GET" }).then((response) => response.data),
      nagagoldFetch("/api/v1/pembelian/chart?type=today", { method: "GET" }).then((response) => response.data),
      loadSaleHistoryToday(10),
      loadPurchaseHistoryToday(),
    ]);

    const recent = sortRecentTransactions([...saleRows, ...purchaseRows]).slice(0, 10);

    res.json({
      sales: normalizeDashboardChart(salesChartData),
      purchases: normalizeDashboardChart(purchaseChartData),
      recent,
    });
  } catch (error) {
    next(error);
  }
});

app.get("/api/nagagold/history/today", async (req, res, next) => {
  try {
    const type = req.query.type === "purchase" ? "purchase" : "sale";
    const history = type === "purchase"
      ? await loadPurchaseHistoryToday()
      : await loadSaleHistoryToday(100);

    res.json({ history: sortRecentTransactions(history) });
  } catch (error) {
    next(error);
  }
});

app.get("/api/nagagold/sales", async (_req, res, next) => {
  try {
    const response = await nagagoldFetch("/api/v1/sales/get/all", { method: "GET" });
    res.json({ sales: Array.isArray(response.data) ? response.data : [] });
  } catch (error) {
    next(error);
  }
});

app.get("/api/nagagold/banks", async (_req, res, next) => {
  try {
    const response = await nagagoldFetch("/api/v1/banks", { method: "GET" });
    res.json({ banks: Array.isArray(response.data) ? response.data : [] });
  } catch (error) {
    next(error);
  }
});

app.get("/api/nagagold/rekenings", async (_req, res, next) => {
  try {
    const response = await nagagoldFetch("/api/v1/rekenings", { method: "GET" });
    res.json({ rekenings: Array.isArray(response.data) ? response.data : [] });
  } catch (error) {
    next(error);
  }
});

app.get("/api/nagagold/member/:kode", async (req, res, next) => {
  try {
    const kode = encodeURIComponent(req.params.kode.trim());
    if (!kode) {
      res.status(400).json({ message: "Kode member wajib diisi." });
      return;
    }
    const response = await nagagoldFetch(`/api/v1/member/get/by-kode-member/${kode}`, { method: "GET" });
    res.json({ members: Array.isArray(response.data) ? response.data : [] });
  } catch (error) {
    next(error);
  }
});

app.post("/api/nagagold/members/search", async (req, res, next) => {
  try {
    const type = ["nama", "hp", "alamat"].includes(req.body?.type) ? req.body.type : "nama";
    const query = String(req.body?.query ?? "").trim();
    if (!query) {
      res.status(400).json({ message: "Kata kunci customer wajib diisi." });
      return;
    }

    const endpoint = type === "nama"
      ? "/api/v1/member/get/by-nama/"
      : type === "hp"
        ? "/api/v1/member/get/by-hp"
        : "/api/v1/member/get/by-alamat";
    const key = type === "hp" ? "hp" : type;
    const response = await nagagoldFetch(endpoint, {
      method: "POST",
      body: JSON.stringify({ [key]: query }),
    });
    res.json({ members: Array.isArray(response.data) ? response.data : [] });
  } catch (error) {
    next(error);
  }
});

app.get("/api/nagagold/barang/:barcode", async (req, res, next) => {
  try {
    const barcode = encodeURIComponent(req.params.barcode.trim().toUpperCase());
    if (!barcode) {
      res.status(400).json({ message: "Kode barcode wajib diisi." });
      return;
    }
    const response = await nagagoldFetch(`/api/v1/barang/ready/kode-barcode/${barcode}`, { method: "GET" });
    const item = firstArrayItem(response.data);
    if (!item) {
      res.status(404).json({ message: typeof response.data === "string" ? response.data : "Barang tidak ditemukan." });
      return;
    }
    res.json({ item });
  } catch (error) {
    next(error);
  }
});

app.get("/api/nagagold/pembelian/tokos", async (_req, res, next) => {
  try {
    const response = await nagagoldFetch("/api/v1/tokos", { method: "GET" });
    res.json({ tokos: Array.isArray(response.data) ? response.data : [] });
  } catch (error) {
    next(error);
  }
});

app.get("/api/nagagold/pembelian/jenis", async (_req, res, next) => {
  try {
    const response = await nagagoldFetch("/api/v1/jenis/get/all", { method: "GET" });
    res.json({ jenis: Array.isArray(response.data) ? response.data : [] });
  } catch (error) {
    next(error);
  }
});

app.get("/api/nagagold/pembelian/kondisi", async (_req, res, next) => {
  try {
    const response = await nagagoldFetch("/api/v1/parabeli/get/all", { method: "GET" });
    res.json({ kondisi: Array.isArray(response.data) ? response.data : [] });
  } catch (error) {
    next(error);
  }
});

app.get("/api/nagagold/pembelian/rounding", async (_req, res, next) => {
  try {
    const [pembulatanResponse, moduleResponse] = await Promise.all([
      nagagoldFetch("/api/v1/para-system/key/PEMBULATAN", { method: "GET" }).catch(() => ({ data: { value: 500 } })),
      nagagoldFetch("/api/v1/para-system/type/module", { method: "GET" }).catch(() => ({ data: [] })),
    ]);

    const pembulatanData = firstArrayItem(unwrapNagagoldData(pembulatanResponse.data));
    const moduleData = unwrapNagagoldData(moduleResponse.data);
    const modules = Array.isArray(moduleData) ? moduleData : [];
    const findModule = (key: string) => modules.find((item) => (
      typeof item === "object"
        && item
        && String((item as Record<string, unknown>).key ?? "") === key
    )) as Record<string, unknown> | undefined;
    const isEnabledModule = (key: string) => {
      const module = findModule(key);
      return Boolean(module) && String(module?.value ?? "true") !== "false";
    };

    res.json({
      value: asNumber(pembulatanData?.value) || 500,
      roundDown: isEnabledModule("PEMBULATAN_PEMBELIAN_KEBAWAH_MODULE"),
      disableAuthorizationAboveNota: isEnabledModule("NON_AKTIF_OTORISASI_HARGA_BELI_DIATAS_HARGA_NOTA"),
      disableAuthorizationBelowNota: isEnabledModule("NON_AKTIF_OTORISASI_HARGA_BELI_DIBAWAH_HARGA_NOTA"),
    });
  } catch (error) {
    next(error);
  }
});

app.get("/api/nagagold/pembelian/groups", async (_req, res, next) => {
  try {
    const response = await nagagoldFetch("/api/v1/group/get/all", { method: "GET" });
    res.json({ groups: Array.isArray(response.data) ? response.data : [] });
  } catch (error) {
    next(error);
  }
});

app.get("/api/nagagold/pembelian/barang/:barcode", async (req, res, next) => {
  try {
    const barcode = encodeURIComponent(req.params.barcode.trim().toUpperCase().slice(0, 8));
    const kodeToko = String(req.query.kodeToko ?? "").trim();
    if (!barcode) {
      res.status(400).json({ message: "Kode barcode wajib diisi." });
      return;
    }
    const query = kodeToko ? `?kode_toko=${encodeURIComponent(kodeToko)}&kodeToko=${encodeURIComponent(kodeToko)}` : "";
    const response = await nagagoldFetch(`/api/v1/pembelian/get/jual/${barcode}${query}`, { method: "GET" });
    const item = firstArrayItem(response.data);
    if (!item) {
      res.status(404).json({ message: typeof response.data === "string" ? response.data : "Data pembelian barang tidak ditemukan." });
      return;
    }
    res.json({ item });
  } catch (error) {
    next(error);
  }
});

app.get("/api/payments", async (_req, res, next) => {
  try {
    const db = await getDb();
    const payments = await db
      .collection<PaymentDocument>("payments")
      .find({ status: "pending" })
      .sort({ createdAt: -1 })
      .project({ _id: 0, id: 1, note: 1, amount: 1, feeType: 1, feeValue: 1, feeAmount: 1, totalAmount: 1, status: 1, createdAt: 1, paidAt: 1 })
      .toArray();

    res.json({ payments });
  } catch (error) {
    next(error);
  }
});

app.get("/api/payments/history/today", async (_req, res, next) => {
  try {
    const db = await getDb();
    const payments = await db
      .collection<PaymentDocument>("payments")
      .find({})
      .project({ _id: 0, id: 1, note: 1, amount: 1, feeType: 1, feeValue: 1, feeAmount: 1, totalAmount: 1, status: 1, createdAt: 1, paidAt: 1 })
      .toArray() as PaymentDocument[];

    res.json({
      payments: payments
        .filter((payment) => isTodayJakarta(payment))
        .sort((a, b) => new Date(b.paidAt ?? b.createdAt).getTime() - new Date(a.paidAt ?? a.createdAt).getTime()),
    });
  } catch (error) {
    next(error);
  }
});

app.post("/api/payments", async (req, res, next) => {
  try {
    const amount = Number(req.body?.amount);
    const note = String(req.body?.note ?? "").trim() || "Pembayaran";
    const feeType = ["none", "fixed", "percent"].includes(req.body?.feeType) ? req.body.feeType : "none";
    const feeValue = feeType === "none" ? "" : String(req.body?.feeValue ?? "").trim();
    if (!Number.isFinite(amount) || amount <= 0) {
      res.status(400).json({ message: "Valid amount is required." });
      return;
    }

    const feeAmount = calculateFeeAmount(amount, feeType, feeValue);
    const payment: PaymentDocument = {
      id: `PAY-${Date.now()}`,
      note,
      amount,
      feeType,
      feeValue,
      feeAmount,
      totalAmount: amount + feeAmount,
      status: "pending",
      createdAt: new Date().toISOString(),
    };

    const db = await getDb();
    await db.collection<PaymentDocument>("payments").insertOne(payment);
    res.status(201).json({
      payment: {
        id: payment.id,
        note: payment.note,
        amount: payment.amount,
        feeType: payment.feeType,
        feeValue: payment.feeValue,
        feeAmount: payment.feeAmount,
        totalAmount: payment.totalAmount,
        status: payment.status,
        createdAt: payment.createdAt,
      },
    });
  } catch (error) {
    next(error);
  }
});

app.patch("/api/payments/:id/paid", async (req, res, next) => {
  try {
    const db = await getDb();
    const result = await db.collection<PaymentDocument>("payments").updateOne(
      { id: req.params.id, status: "pending" },
      { $set: { status: "paid", paidAt: new Date().toISOString() } },
    );

    if (!result.matchedCount) {
      res.status(404).json({ message: "Payment not found." });
      return;
    }

    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

app.delete("/api/payments/:id", async (req, res, next) => {
  try {
    const db = await getDb();
    await db.collection<PaymentDocument>("payments").deleteOne({ id: req.params.id });
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

app.post("/api/nagagold/penjualan", async (req, res, next) => {
  try {
    const body = req.body as NagagoldSaleRequest;
    if (!body.kodeBarcode || !body.namaCustomer) {
      res.status(400).json({ message: "Customer dan barcode wajib diisi." });
      return;
    }

    const payload = buildSalePayload(body);
    const response = await nagagoldRequest("/api/v1/penjualan/simpan", payload);
    res.json({ ok: true, endpoint: "/api/v1/penjualan/simpan", response });
  } catch (error) {
    next(error);
  }
});

app.post("/api/nagagold/pembelian", async (req, res, next) => {
  try {
    const body = req.body as NagagoldPurchaseRequest;
    if (!body.kodeBarcode || !body.namaCustomer) {
      res.status(400).json({ message: "Customer dan barcode wajib diisi." });
      return;
    }

    const payload = buildPurchasePayload(body);
    const response = await nagagoldRequest("/api/v1/pembelian/simpan", payload);
    res.json({ ok: true, endpoint: "/api/v1/pembelian/simpan", response });
  } catch (error) {
    next(error);
  }
});

app.post("/api/nagagold/authorization", async (req, res, next) => {
  try {
    const body = req.body as NagagoldAuthorizationRequest;
    if (!body.username || !body.password) {
      res.status(400).json({ message: "Username dan password otorisasi wajib diisi." });
      return;
    }

    const payload = {
      user_id: asText(body.username),
      password: asText(body.password, ""),
      kategori: asText(body.kategori, "OTORISASI"),
      description: asText(body.description ?? body.kategori, "OTORISASI"),
      keterangan: asText(body.keterangan, "-").toUpperCase(),
      kode_barcode: asText(body.kodeBarcode, "-"),
      berat: asText(body.berat, "0"),
      berat_awal: asText(body.beratAwal, "0"),
      kode_intern: asText(body.kodeIntern, "-"),
    };
    const response = await nagagoldRequest("/api/v1/authorization", payload);
    const responseId = findAuthorizationId(response);
    res.json({ ok: true, authorizationId: responseId, response });
  } catch (error) {
    next(error);
  }
});

app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(error);
  res.status(500).json({ message: error instanceof Error ? error.message : "Internal server error." });
});

app.listen(port, () => {
  console.log(`QRIS API listening on http://localhost:${port}`);
});

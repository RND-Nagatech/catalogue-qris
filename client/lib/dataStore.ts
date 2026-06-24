import AsyncStorage from "@react-native-async-storage/async-storage";

const QRIS_STORAGE_KEY = "@qris_string";
const PAYMENTS_STORAGE_KEY = "@payment_items";
const NAGAGOLD_DOMAIN_STORAGE_KEY = "@nagagold_domain";
const API_URL = process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, "");
const API_KEY = process.env.EXPO_PUBLIC_API_KEY || process.env.EXPO_PUBLIC_CATALOGUE_API_KEY || "";

export type PaymentItem = {
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

type StoredPaymentItem = Partial<PaymentItem> & {
  id: string;
  amount: number;
  createdAt: string;
  title?: string;
  customer?: string;
};

type PaymentPayload = {
  note: string;
  amount: number;
  feeType: "none" | "fixed" | "percent";
  feeValue: string;
};

export type NagagoldSalePayload = {
  storeId?: string;
  kodeSales: string;
  kodeMember: string;
  namaCustomer: string;
  alamatCustomer: string;
  noHp: string;
  kodeBarcode: string;
  namaBarang: string;
  berat: number;
  hargaGram: number;
  ongkos: number;
  items?: {
    kodeBarcode: string;
    namaBarang: string;
    berat: number;
    hargaGram: number;
    hargaJual: number;
    ongkos: number;
    total: number;
    diskonPenjualan?: number;
    typeDiskon?: "DISKON_RP" | "DISKON_PERSEN" | "";
    diskonRp?: number;
    diskonPersen?: number;
    keterangan: string;
    authorizationIds?: string[];
    raw?: Record<string, unknown>;
  }[];
  authorizationIds?: string[];
  jumlahBayar: number;
  keterangan: string;
  typePembayaran?: string;
  rekening?: string;
  payments?: {
    method: "CASH" | "TRANSFER" | "DEBET" | "CREDIT" | "TUKAR";
    amount: number;
    bank?: string;
    rekening?: string;
    noCard?: string;
    marketplace?: string;
    detailBarang?: Record<string, unknown>[];
    feePercent?: number;
    feeAmount?: number;
    feeDropdown?: string;
    nominalWithFee?: number;
  }[];
};

export type NagagoldPurchasePayload = {
  storeId?: string;
  kodeSales: string;
  namaSales: string;
  kodeToko?: string;
  kodeMember: string;
  namaCustomer: string;
  alamatCustomer: string;
  noHp: string;
  nikSimPassport: string;
  kodeBarcode: string;
  noFakturJual: string;
  namaBarang: string;
  berat: number;
  harga: number;
  kondisi: string;
  items?: {
    kodeBarcode: string;
    noFakturJual: string;
    kodeJenis: string;
    statusBarang?: string;
    namaBarang: string;
    beratNota: number;
    berat: number;
    hargaNota: number;
    harga: number;
    kondisi: string;
    typeKondisi: string;
    kadar: number;
    kadarModal: number;
    kadarCetak: string;
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
  jumlahBayar: number;
  keterangan: string;
  typePembayaran?: string;
  rekening?: string;
};

export type NagagoldSubmitResult = {
  ok: boolean;
  endpoint: string;
  response: unknown;
};

export type NagagoldAuthorizationPayload = {
  storeId?: string;
  username: string;
  password: string;
  kategori: string;
  description: string;
  keterangan: string;
  kodeBarcode?: string;
  berat?: number | string;
  beratAwal?: number | string;
  kodeIntern?: string;
};

export type NagagoldAuthorizationResult = {
  ok: boolean;
  authorizationId: string;
  response: unknown;
};

export type NagagoldConnectionResult = {
  ok: boolean;
  endpoint: string;
  status: number;
  checkedAt?: string;
  response: unknown;
};

export type NagagoldConnectionStatus = {
  ok: boolean;
  endpoint: string;
  status: number;
  checkedAt: string;
};

export type NagagoldDashboardChart = {
  count: number;
  gram: number;
  rupiah: number;
  raw?: unknown;
};

export type NagagoldRecentTransaction = {
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

export type NagagoldDashboard = {
  sales: NagagoldDashboardChart;
  purchases: NagagoldDashboardChart;
  recent: NagagoldRecentTransaction[];
};

export type NagagoldSettings = {
  domain: string;
  connection: NagagoldConnectionStatus | null;
};

export type NagagoldStore = {
  _id?: string;
  id?: string;
  name: string;
  firebaseCode?: string;
  nagagoldDomain?: string;
  domain?: string;
  baseUrl?: string;
  apiUrl?: string;
  qris_string?: string;
  merchant_name?: string;
  merchant_city?: string;
  qris_active?: boolean;
};

export type QrisSettingStoreRef = {
  store_id: string;
  kode_cabang?: string;
  nama_cabang: string;
  domain?: string;
};

export type QrisSetting = {
  _id?: string;
  id: string;
  nama_qris: string;
  qris_string: string;
  merchant_name?: string;
  merchant_city?: string;
  qris_active: boolean;
  stores: QrisSettingStoreRef[];
  created_at?: string;
  updated_at?: string;
};

export type NagagoldSalesPerson = {
  kode_sales: string;
  nama_sales: string;
  fee?: number;
  status_aktif?: boolean;
};

export type NagagoldModule = {
  key: string;
  value?: string | number | boolean;
  label?: string;
  type?: string;
  raw?: Record<string, unknown>;
};

export type NagagoldSystemParameter = {
  key: string;
  value?: string | number | boolean | Record<string, unknown> | unknown[];
  type?: string;
  parent?: string;
  raw?: Record<string, unknown>;
};

export type NagagoldDynamicFeature = {
  key: string;
  sourceKey: string;
  label: string;
  group: string;
  enabled: boolean;
  value?: string | number | boolean;
};

export type NagagoldSalesCapabilities = {
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

export type NagagoldPurchaseCapabilities = {
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

export type NagagoldBootstrap = {
  domain: string;
  version?: string;
  loadedAt?: string;
  modules: NagagoldModule[];
  parameters?: NagagoldSystemParameter[];
  transactionConfig?: unknown;
  marketplaceSettings?: unknown;
  dynamicFeatures?: NagagoldDynamicFeature[];
  capabilities: {
    sales: NagagoldSalesCapabilities;
    purchases: NagagoldPurchaseCapabilities;
  };
  masters: {
    sales: NagagoldSalesPerson[];
    marketplaces: NagagoldMarketplace[];
    rekenings: NagagoldRekening[];
    tokos: NagagoldToko[];
    jenis: NagagoldJenis[];
    kondisi: NagagoldKondisiBeli[];
    groups: NagagoldGroup[];
    purchaseRounding: NagagoldPurchaseRounding;
  };
};

export type NagagoldRuntimeConfig = Required<Pick<NagagoldBootstrap, "domain" | "modules" | "capabilities" | "masters">> & {
  version: string;
  module_config_hash?: string;
  loadedAt: string;
  parameters: NagagoldSystemParameter[];
  transactionConfig: unknown;
  marketplaceSettings: unknown;
  dynamicFeatures: NagagoldDynamicFeature[];
};

export type NagagoldConfigVersion = {
  domain: string;
  status?: "OK" | "CONNECTION_ERROR" | "FETCH_FAILED" | "NO_CHANGE";
  version?: string;
  module_config_hash?: string;
  loadedAt?: string;
  moduleCount?: number;
  parameterCount?: number;
  dynamicFeatureCount?: number;
  message?: string;
};

export type NagagoldMember = {
  kode_member?: string;
  kode_customer?: string;
  nama_customer?: string;
  no_hp?: string;
  alamat_customer?: string;
  jenis_member?: string;
};

export type NagagoldSaleLookupItem = Record<string, unknown> & {
  kode_barcode?: string;
  nama_barang?: string;
  berat?: number;
  harga_skrg?: number;
  harga_jual?: number;
  harga_atribut?: number;
  ongkos?: number | { nominal?: number; tipe_ongkos?: string };
  no_pesanan?: string;
  no_po?: string;
};

export type NagagoldBank = {
  kode_bank: string;
  nama_bank: string;
};

export type NagagoldMarketplace = {
  kode_marketplace?: string;
  nama_marketplace?: string;
  kode?: string;
  nama?: string;
  marketplace?: string;
  status_aktif?: boolean;
};

export type NagagoldRekening = {
  kode_bank: string;
  no_rekening: string;
  nama_rekening?: string;
};

export type NagagoldToko = {
  kode_toko: string;
  nama_toko?: string;
  portal?: string;
};

export type NagagoldJenis = {
  kode_dept: string;
  nama_dept: string;
  kode_group?: string;
  status_aktif?: boolean;
};

export type NagagoldKondisiBeli = {
  kondisi_barang: string;
  persentase?: number;
  potongan?: number;
  status_aktif?: boolean;
};

export type NagagoldPurchaseRounding = {
  value: number;
  roundDown: boolean;
  disableAuthorizationAboveNota: boolean;
  disableAuthorizationBelowNota: boolean;
};

export type NagagoldGroup = {
  kode_group: string;
  nama_group?: string;
  jenis_group?: string;
  harga?: number;
  kadar?: number;
  status_aktif?: boolean;
};

export type NagagoldPurchaseLookupItem = Record<string, unknown> & {
  kode_barcode?: string;
  no_faktur_jual?: string;
  kode_dept?: string;
  kode_group?: string;
  nama_barang?: string;
  berat?: number;
  berat_nota?: number;
  harga_jual?: number;
  harga_atribut?: number;
  ongkos?: number;
  diskon_penjualan?: number;
  harga_total?: number;
  kadar?: number;
  kadar_modal?: number;
  kadar_cetak?: string;
  kode_member?: string;
  nama_customer?: string;
  alamat_customer?: string;
  no_hp?: string;
  no_rekening?: string;
  kode_sales?: string;
  status_barang?: string;
};

export function calculateFeeAmount(amount: number, feeType: PaymentItem["feeType"], feeValue: string): number {
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

function normalizeStoredPayment(item: StoredPaymentItem): PaymentItem {
  const feeType = item.feeType ?? "none";
  const feeValue = item.feeValue ?? "";
  const feeAmount = item.feeAmount ?? calculateFeeAmount(item.amount, feeType, feeValue);

  return {
    id: item.id,
    note: item.note || item.title || item.customer || "Pembayaran",
    amount: item.amount,
    feeType,
    feeValue,
    feeAmount,
    totalAmount: item.totalAmount ?? item.amount + feeAmount,
    status: item.status ?? "pending",
    createdAt: item.createdAt,
    paidAt: item.paidAt,
  };
}

async function loadAllLocalPayments(): Promise<PaymentItem[]> {
  const savedPayments = await AsyncStorage.getItem(PAYMENTS_STORAGE_KEY);
  const parsed = savedPayments ? (JSON.parse(savedPayments) as StoredPaymentItem[]) : [];
  return parsed.map(normalizeStoredPayment);
}

function isTodayLocal(isoDate?: string): boolean {
  if (!isoDate) return false;
  return new Date(isoDate).toDateString() === new Date().toDateString();
}

async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  if (!API_URL) {
    throw new Error("API URL is not configured.");
  }

  const headers = new Headers(init?.headers);
  if (init?.body !== undefined && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  if (API_KEY && !headers.has("x-api-key")) {
    headers.set("x-api-key", API_KEY);
  }

  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      ...init,
      headers,
    });
  } catch {
    throw new Error("Backend API tidak bisa dijangkau. Pastikan server berjalan dan EXPO_PUBLIC_API_URL memakai IP yang benar.");
  }

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    const errorPayload = body?.error;
    const message = body?.message
      ?? (typeof errorPayload === "object" ? errorPayload?.message : errorPayload)
      ?? "API request failed.";
    const error = new Error(message);
    if (typeof errorPayload === "object" && errorPayload?.conflicts) {
      (error as Error & { conflicts?: unknown }).conflicts = errorPayload.conflicts;
    }
    throw error;
  }

  const data = await response.json();
  if (data && typeof data === "object" && "success" in data && "data" in data) {
    return data.data as T;
  }
  return data as T;
}

type NagagoldRequestOptions = {
  storeId?: string;
};

function nagagoldPath(path: string, options?: NagagoldRequestOptions): string {
  if (!options?.storeId) return path;
  const separator = path.includes("?") ? "&" : "?";
  return `${path}${separator}storeId=${encodeURIComponent(options.storeId)}`;
}

export async function loadNagagoldStores(): Promise<NagagoldStore[]> {
  return apiRequest<NagagoldStore[]>("/api/stores");
}

export async function loadNagagoldStore(storeId: string): Promise<NagagoldStore> {
  return apiRequest<NagagoldStore>(`/api/stores/${encodeURIComponent(storeId)}`);
}

export async function loadQrisSettings(): Promise<QrisSetting[]> {
  return apiRequest<QrisSetting[]>("/api/qris-settings");
}

export async function loadActiveQrisSetting(storeId: string): Promise<QrisSetting | null> {
  return apiRequest<QrisSetting | null>(`/api/qris-settings/active/${encodeURIComponent(storeId)}`);
}

export async function saveQrisSetting(payload: {
  id?: string;
  namaQris: string;
  qrisString: string;
  qrisActive: boolean;
  storeIds: string[];
  force?: boolean;
}): Promise<QrisSetting> {
  const path = payload.id ? `/api/qris-settings/${encodeURIComponent(payload.id)}` : "/api/qris-settings";
  return apiRequest<QrisSetting>(path, {
    method: payload.id ? "PUT" : "POST",
    body: JSON.stringify(payload),
  });
}

export async function setQrisSettingActive(id: string, qrisActive: boolean): Promise<QrisSetting> {
  return apiRequest<QrisSetting>(`/api/qris-settings/${encodeURIComponent(id)}/active`, {
    method: "PATCH",
    body: JSON.stringify({ qrisActive }),
  });
}

export async function deleteQrisSetting(id: string): Promise<void> {
  await apiRequest(`/api/qris-settings/${encodeURIComponent(id)}`, { method: "DELETE" });
}

export async function loadQrisString(storeId?: string): Promise<string> {
  if (storeId) {
    const store = await loadNagagoldStore(storeId);
    return store.qris_active === false ? "" : store.qris_string ?? "";
  }

  if (API_URL) {
    const data = await apiRequest<{ qrisString: string | null }>("/api/settings/qris");
    return data.qrisString ?? "";
  }

  return (await AsyncStorage.getItem(QRIS_STORAGE_KEY)) ?? "";
}

export async function saveQrisString(qrisString: string): Promise<void> {
  if (API_URL) {
    await apiRequest("/api/settings/qris", {
      method: "PUT",
      body: JSON.stringify({ qrisString }),
    });
    return;
  }

  await AsyncStorage.setItem(QRIS_STORAGE_KEY, qrisString);
}

export async function saveStoresQris(storeIds: string[], qrisString: string, qrisActive = true): Promise<NagagoldStore[]> {
  const data = await apiRequest<{ stores: NagagoldStore[] }>("/api/stores/qris", {
    method: "PUT",
    body: JSON.stringify({ storeIds, qrisString, qrisActive }),
  });
  return data.stores;
}

export async function clearQrisString(): Promise<void> {
  if (API_URL) {
    await apiRequest("/api/settings/qris", { method: "DELETE" });
    return;
  }

  await AsyncStorage.removeItem(QRIS_STORAGE_KEY);
}

export async function loadNagagoldDomain(): Promise<string> {
  return (await loadNagagoldSettings()).domain;
}

export async function loadNagagoldSettings(): Promise<NagagoldSettings> {
  if (API_URL) {
    const data = await apiRequest<{ domain: string | null; connection: NagagoldConnectionStatus | null }>("/api/settings/nagagold");
    return { domain: data.domain ?? "", connection: data.connection ?? null };
  }

  return { domain: (await AsyncStorage.getItem(NAGAGOLD_DOMAIN_STORAGE_KEY)) ?? "", connection: null };
}

export async function saveNagagoldDomain(domain: string): Promise<void> {
  if (API_URL) {
    await apiRequest("/api/settings/nagagold", {
      method: "PUT",
      body: JSON.stringify({ domain }),
    });
    return;
  }

  await AsyncStorage.setItem(NAGAGOLD_DOMAIN_STORAGE_KEY, domain);
}

export async function loadPayments(): Promise<PaymentItem[]> {
  if (API_URL) {
    const data = await apiRequest<{ payments: PaymentItem[] }>("/api/payments");
    return data.payments.map(normalizeStoredPayment);
  }

  return (await loadAllLocalPayments()).filter((item) => item.status === "pending");
}

export async function loadTodayHistory(): Promise<PaymentItem[]> {
  if (API_URL) {
    const data = await apiRequest<{ payments: PaymentItem[] }>("/api/payments/history/today");
    return data.payments.map(normalizeStoredPayment);
  }

  return (await loadAllLocalPayments())
    .filter((item) => isTodayLocal(item.status === "paid" ? item.paidAt : item.createdAt))
    .sort((a, b) => new Date(b.paidAt ?? b.createdAt).getTime() - new Date(a.paidAt ?? a.createdAt).getTime());
}

export async function createPayment(payload: PaymentPayload): Promise<PaymentItem> {
  if (API_URL) {
    const data = await apiRequest<{ payment: PaymentItem }>("/api/payments", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    return normalizeStoredPayment(data.payment);
  }

  const payments = await loadAllLocalPayments();
  const feeAmount = calculateFeeAmount(payload.amount, payload.feeType, payload.feeValue);
  const payment: PaymentItem = {
    id: `PAY-${Date.now()}`,
    note: payload.note.trim() || "Pembayaran",
    amount: payload.amount,
    feeType: payload.feeType,
    feeValue: payload.feeType === "none" ? "" : payload.feeValue,
    feeAmount,
    totalAmount: payload.amount + feeAmount,
    status: "pending",
    createdAt: new Date().toISOString(),
  };
  await AsyncStorage.setItem(PAYMENTS_STORAGE_KEY, JSON.stringify([payment, ...payments]));
  return payment;
}

export async function deletePayment(id: string): Promise<void> {
  if (API_URL) {
    await apiRequest(`/api/payments/${encodeURIComponent(id)}`, { method: "DELETE" });
    return;
  }

  const payments = await loadAllLocalPayments();
  await AsyncStorage.setItem(PAYMENTS_STORAGE_KEY, JSON.stringify(payments.filter((item) => item.id !== id)));
}

export async function markPaymentPaid(id: string): Promise<void> {
  if (API_URL) {
    await apiRequest(`/api/payments/${encodeURIComponent(id)}/paid`, { method: "PATCH" });
    return;
  }

  const payments = await loadAllLocalPayments();
  const nextPayments = payments.map((item) => (
    item.id === id ? { ...item, status: "paid" as const, paidAt: new Date().toISOString() } : item
  ));
  await AsyncStorage.setItem(PAYMENTS_STORAGE_KEY, JSON.stringify(nextPayments));
}

export async function submitNagagoldSale(payload: NagagoldSalePayload): Promise<NagagoldSubmitResult> {
  return apiRequest<NagagoldSubmitResult>("/api/nagagold/penjualan", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function submitNagagoldPurchase(payload: NagagoldPurchasePayload): Promise<NagagoldSubmitResult> {
  return apiRequest<NagagoldSubmitResult>("/api/nagagold/pembelian", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function authorizeNagagoldTransaction(payload: NagagoldAuthorizationPayload): Promise<NagagoldAuthorizationResult> {
  return apiRequest<NagagoldAuthorizationResult>("/api/nagagold/authorization", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function testNagagoldConnection(options?: NagagoldRequestOptions): Promise<NagagoldConnectionResult> {
  return apiRequest<NagagoldConnectionResult>(nagagoldPath("/api/nagagold/test-connection", options));
}

export async function loadNagagoldDashboard(options?: NagagoldRequestOptions): Promise<NagagoldDashboard> {
  return apiRequest<NagagoldDashboard>(nagagoldPath("/api/nagagold/dashboard", options));
}

export async function loadNagagoldTodayHistory(type: "sale" | "purchase", options?: NagagoldRequestOptions): Promise<NagagoldRecentTransaction[]> {
  const data = await apiRequest<{ history: NagagoldRecentTransaction[] }>(nagagoldPath(`/api/nagagold/history/today?type=${type}`, options));
  return data.history;
}

export async function loadNagagoldBootstrap(options?: NagagoldRequestOptions): Promise<NagagoldBootstrap> {
  return apiRequest<NagagoldBootstrap>(nagagoldPath("/api/nagagold/bootstrap", options));
}

export async function loadNagagoldRuntimeConfig(options?: NagagoldRequestOptions): Promise<NagagoldRuntimeConfig> {
  return apiRequest<NagagoldRuntimeConfig>(nagagoldPath("/api/nagagold/config", options));
}

export async function loadNagagoldConfigVersion(options?: NagagoldRequestOptions): Promise<NagagoldConfigVersion> {
  return apiRequest<NagagoldConfigVersion>(nagagoldPath("/api/nagagold/config/version", options));
}

export async function loadNagagoldSalesPeople(options?: NagagoldRequestOptions): Promise<NagagoldSalesPerson[]> {
  const data = await apiRequest<{ sales: NagagoldSalesPerson[] }>(nagagoldPath("/api/nagagold/sales", options));
  return data.sales.filter((item) => item.status_aktif !== false);
}

export async function loadNagagoldBanks(options?: NagagoldRequestOptions): Promise<NagagoldBank[]> {
  const data = await apiRequest<{ banks: NagagoldBank[] }>(nagagoldPath("/api/nagagold/banks", options));
  return data.banks;
}

export async function loadNagagoldRekenings(options?: NagagoldRequestOptions): Promise<NagagoldRekening[]> {
  const data = await apiRequest<{ rekenings: NagagoldRekening[] }>(nagagoldPath("/api/nagagold/rekenings", options));
  return data.rekenings;
}

export async function lookupNagagoldMemberByCode(kode: string, options?: NagagoldRequestOptions): Promise<NagagoldMember | null> {
  const data = await apiRequest<{ members: NagagoldMember[] }>(nagagoldPath(`/api/nagagold/member/${encodeURIComponent(kode)}`, options));
  return data.members[0] ?? null;
}

export async function searchNagagoldMembers(type: "nama" | "hp" | "alamat", query: string, options?: NagagoldRequestOptions): Promise<NagagoldMember[]> {
  const data = await apiRequest<{ members: NagagoldMember[] }>(nagagoldPath("/api/nagagold/members/search", options), {
    method: "POST",
    body: JSON.stringify({ type, query, storeId: options?.storeId }),
  });
  return data.members;
}

export async function lookupNagagoldSaleItem(barcode: string, options?: NagagoldRequestOptions): Promise<NagagoldSaleLookupItem> {
  const data = await apiRequest<{ item: NagagoldSaleLookupItem }>(nagagoldPath(`/api/nagagold/barang/${encodeURIComponent(barcode)}`, options));
  return data.item;
}

export async function loadNagagoldTokos(options?: NagagoldRequestOptions): Promise<NagagoldToko[]> {
  const data = await apiRequest<{ tokos: NagagoldToko[] }>(nagagoldPath("/api/nagagold/pembelian/tokos", options));
  return data.tokos;
}

export async function loadNagagoldJenis(options?: NagagoldRequestOptions): Promise<NagagoldJenis[]> {
  const data = await apiRequest<{ jenis: NagagoldJenis[] }>(nagagoldPath("/api/nagagold/pembelian/jenis", options));
  return data.jenis.filter((item) => item.status_aktif !== false);
}

export async function loadNagagoldKondisiBeli(options?: NagagoldRequestOptions): Promise<NagagoldKondisiBeli[]> {
  const data = await apiRequest<{ kondisi: NagagoldKondisiBeli[] }>(nagagoldPath("/api/nagagold/pembelian/kondisi", options));
  return data.kondisi.filter((item) => item.status_aktif !== false);
}

export async function loadNagagoldPurchaseRounding(options?: NagagoldRequestOptions): Promise<NagagoldPurchaseRounding> {
  return apiRequest<NagagoldPurchaseRounding>(nagagoldPath("/api/nagagold/pembelian/rounding", options));
}

export async function loadNagagoldGroups(options?: NagagoldRequestOptions): Promise<NagagoldGroup[]> {
  const data = await apiRequest<{ groups: NagagoldGroup[] }>(nagagoldPath("/api/nagagold/pembelian/groups", options));
  return data.groups.filter((item) => item.status_aktif !== false);
}

export async function lookupNagagoldPurchaseItem(barcode: string, kodeToko?: string, options?: NagagoldRequestOptions): Promise<NagagoldPurchaseLookupItem> {
  const params = new URLSearchParams();
  if (kodeToko) params.set("kodeToko", kodeToko);
  if (options?.storeId) params.set("storeId", options.storeId);
  const suffix = params.toString() ? `?${params.toString()}` : "";
  const data = await apiRequest<{ item: NagagoldPurchaseLookupItem }>(`/api/nagagold/pembelian/barang/${encodeURIComponent(barcode)}${suffix}`);
  return data.item;
}

import AsyncStorage from "@react-native-async-storage/async-storage";

const QRIS_STORAGE_KEY = "@qris_string";
const PAYMENTS_STORAGE_KEY = "@payment_items";
const NAGAGOLD_DOMAIN_STORAGE_KEY = "@nagagold_domain";
const API_URL = process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, "");

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
    keterangan: string;
    raw?: Record<string, unknown>;
  }[];
  jumlahBayar: number;
  keterangan: string;
  typePembayaran?: string;
  rekening?: string;
  payments?: {
    method: "CASH" | "TRANSFER" | "DEBET" | "CREDIT" | "QRIS";
    amount: number;
    bank?: string;
    rekening?: string;
    noCard?: string;
    feePercent?: number;
    feeAmount?: number;
    feeDropdown?: string;
    nominalWithFee?: number;
    qrisString?: string;
  }[];
};

export type NagagoldPurchasePayload = {
  kodeSales: string;
  namaSales: string;
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
    raw?: Record<string, unknown>;
  }[];
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

export type NagagoldSettings = {
  domain: string;
  connection: NagagoldConnectionStatus | null;
};

export type NagagoldSalesPerson = {
  kode_sales: string;
  nama_sales: string;
  fee?: number;
  status_aktif?: boolean;
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

  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...(init?.headers ?? {}),
      },
    });
  } catch {
    throw new Error("Backend API tidak bisa dijangkau. Pastikan server berjalan dan EXPO_PUBLIC_API_URL memakai IP yang benar.");
  }

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.message ?? "API request failed.");
  }

  return response.json() as Promise<T>;
}

export async function loadQrisString(): Promise<string> {
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

export async function testNagagoldConnection(): Promise<NagagoldConnectionResult> {
  return apiRequest<NagagoldConnectionResult>("/api/nagagold/test-connection");
}

export async function loadNagagoldSalesPeople(): Promise<NagagoldSalesPerson[]> {
  const data = await apiRequest<{ sales: NagagoldSalesPerson[] }>("/api/nagagold/sales");
  return data.sales.filter((item) => item.status_aktif !== false);
}

export async function loadNagagoldBanks(): Promise<NagagoldBank[]> {
  const data = await apiRequest<{ banks: NagagoldBank[] }>("/api/nagagold/banks");
  return data.banks;
}

export async function loadNagagoldRekenings(): Promise<NagagoldRekening[]> {
  const data = await apiRequest<{ rekenings: NagagoldRekening[] }>("/api/nagagold/rekenings");
  return data.rekenings;
}

export async function lookupNagagoldMemberByCode(kode: string): Promise<NagagoldMember | null> {
  const data = await apiRequest<{ members: NagagoldMember[] }>(`/api/nagagold/member/${encodeURIComponent(kode)}`);
  return data.members[0] ?? null;
}

export async function searchNagagoldMembers(type: "nama" | "hp" | "alamat", query: string): Promise<NagagoldMember[]> {
  const data = await apiRequest<{ members: NagagoldMember[] }>("/api/nagagold/members/search", {
    method: "POST",
    body: JSON.stringify({ type, query }),
  });
  return data.members;
}

export async function lookupNagagoldSaleItem(barcode: string): Promise<NagagoldSaleLookupItem> {
  const data = await apiRequest<{ item: NagagoldSaleLookupItem }>(`/api/nagagold/barang/${encodeURIComponent(barcode)}`);
  return data.item;
}

export async function loadNagagoldTokos(): Promise<NagagoldToko[]> {
  const data = await apiRequest<{ tokos: NagagoldToko[] }>("/api/nagagold/pembelian/tokos");
  return data.tokos;
}

export async function loadNagagoldJenis(): Promise<NagagoldJenis[]> {
  const data = await apiRequest<{ jenis: NagagoldJenis[] }>("/api/nagagold/pembelian/jenis");
  return data.jenis.filter((item) => item.status_aktif !== false);
}

export async function loadNagagoldKondisiBeli(): Promise<NagagoldKondisiBeli[]> {
  const data = await apiRequest<{ kondisi: NagagoldKondisiBeli[] }>("/api/nagagold/pembelian/kondisi");
  return data.kondisi.filter((item) => item.status_aktif !== false);
}

export async function loadNagagoldGroups(): Promise<NagagoldGroup[]> {
  const data = await apiRequest<{ groups: NagagoldGroup[] }>("/api/nagagold/pembelian/groups");
  return data.groups.filter((item) => item.status_aktif !== false);
}

export async function lookupNagagoldPurchaseItem(barcode: string, kodeToko?: string): Promise<NagagoldPurchaseLookupItem> {
  const suffix = kodeToko ? `?kodeToko=${encodeURIComponent(kodeToko)}` : "";
  const data = await apiRequest<{ item: NagagoldPurchaseLookupItem }>(`/api/nagagold/pembelian/barang/${encodeURIComponent(barcode)}${suffix}`);
  return data.item;
}

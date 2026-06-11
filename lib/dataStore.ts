import AsyncStorage from "@react-native-async-storage/async-storage";

const QRIS_STORAGE_KEY = "@qris_string";
const PAYMENTS_STORAGE_KEY = "@payment_items";
const API_URL = process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, "");

export type PaymentItem = {
  id: string;
  note: string;
  amount: number;
  createdAt: string;
};

type StoredPaymentItem = PaymentItem & {
  title?: string;
  customer?: string;
};

type PaymentPayload = {
  note: string;
  amount: number;
};

function normalizeStoredPayment(item: StoredPaymentItem): PaymentItem {
  return {
    id: item.id,
    note: item.note || item.title || item.customer || "Pembayaran",
    amount: item.amount,
    createdAt: item.createdAt,
  };
}

async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  if (!API_URL) {
    throw new Error("API URL is not configured.");
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

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

export async function loadPayments(): Promise<PaymentItem[]> {
  if (API_URL) {
    const data = await apiRequest<{ payments: PaymentItem[] }>("/api/payments");
    return data.payments;
  }

  const savedPayments = await AsyncStorage.getItem(PAYMENTS_STORAGE_KEY);
  const parsed = savedPayments ? (JSON.parse(savedPayments) as StoredPaymentItem[]) : [];
  return parsed.map(normalizeStoredPayment);
}

export async function createPayment(payload: PaymentPayload): Promise<PaymentItem> {
  if (API_URL) {
    const data = await apiRequest<{ payment: PaymentItem }>("/api/payments", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    return data.payment;
  }

  const payments = await loadPayments();
  const payment: PaymentItem = {
    id: `PAY-${Date.now()}`,
    note: payload.note.trim() || "Pembayaran",
    amount: payload.amount,
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

  const payments = await loadPayments();
  await AsyncStorage.setItem(PAYMENTS_STORAGE_KEY, JSON.stringify(payments.filter((item) => item.id !== id)));
}

export async function markPaymentPaid(id: string): Promise<void> {
  if (API_URL) {
    await apiRequest(`/api/payments/${encodeURIComponent(id)}/paid`, { method: "PATCH" });
    return;
  }

  await deletePayment(id);
}

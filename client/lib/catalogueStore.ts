const API_URL = process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, "");
const API_KEY = process.env.EXPO_PUBLIC_API_KEY || process.env.EXPO_PUBLIC_CATALOGUE_API_KEY || "";

export type CatalogueProduct = {
  nama_barang?: string;
  stock_on_hand?: number;
  berat?: number;
  berat_asli?: number;
  kadar?: number;
  kadar_cetak?: string;
  harga_beli?: number;
  harga_skrg?: number;
  harga_jual?: number;
  harga_atribut?: number;
  tgl_last_beli?: string;
  kode_barcode?: string;
  kode_barang?: string;
  kode_group?: string;
  kode_dept?: string;
  kode_gudang?: string;
  kode_toko?: string;
  sumber?: string;
  firebaseCode?: string;
  _searchScore?: number;
};

export type CatalogueFilterOption = {
  code: string;
  name: string;
};

export type CatalogueStoreOption = {
  id: string;
  name: string;
  firebaseCode?: string;
};

export type CatalogueProductQuery = {
  page?: number;
  limit?: number;
  search?: string;
  storeId?: string;
  group?: string;
  dept?: string;
  toko?: string;
};

export type CatalogueProductsResult = {
  products: CatalogueProduct[];
  page: number;
  limit: number;
  total: number;
};

function requireApiUrl(): string {
  if (!API_URL) {
    throw new Error("EXPO_PUBLIC_API_URL belum diatur.");
  }
  return API_URL;
}

function buildHeaders(extra?: HeadersInit): HeadersInit {
  return {
    ...(API_KEY ? { "x-api-key": API_KEY } : {}),
    ...(extra ?? {}),
  };
}

async function parseJsonResponse<T>(response: Response): Promise<T> {
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(data?.message ?? data?.error ?? "Catalogue request failed.");
  }
  if (data && typeof data === "object" && "success" in data && "data" in data) {
    return data as T;
  }
  return data as T;
}

function queryString(params: Record<string, string | number | undefined>): string {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== "") searchParams.set(key, String(value));
  });
  const text = searchParams.toString();
  return text ? `?${text}` : "";
}

export function getCatalogueImageUrl(productOrBarcode?: CatalogueProduct | string): string {
  const barcode = typeof productOrBarcode === "string"
    ? productOrBarcode
    : productOrBarcode?.kode_barcode || productOrBarcode?.kode_barang || "";
  return `${requireApiUrl()}/api/images/${encodeURIComponent(barcode)}`;
}

export async function loadCatalogueProducts(query: CatalogueProductQuery = {}): Promise<CatalogueProductsResult> {
  const params = queryString({
    page: query.page ?? 1,
    limit: query.limit ?? 20,
    search: query.search,
    storeId: query.storeId,
    group: query.group,
    dept: query.dept,
    toko: query.toko,
  });
  const response = await fetch(`${requireApiUrl()}/api/products${params}`, {
    headers: buildHeaders(),
  });
  const data = await parseJsonResponse<{ data: CatalogueProduct[]; meta?: { page: number; limit: number; total: number } }>(response);
  return {
    products: data.data ?? [],
    page: data.meta?.page ?? query.page ?? 1,
    limit: data.meta?.limit ?? query.limit ?? 20,
    total: data.meta?.total ?? data.data?.length ?? 0,
  };
}

export async function loadCatalogueFilters(): Promise<{
  groups: CatalogueFilterOption[];
  depts: CatalogueFilterOption[];
  baki: CatalogueFilterOption[];
  stores: CatalogueStoreOption[];
}> {
  const [groups, depts, baki, stores] = await Promise.all([
    fetch(`${requireApiUrl()}/api/filters/groups`, { headers: buildHeaders() }).then((res) => parseJsonResponse<{ data: CatalogueFilterOption[] }>(res)),
    fetch(`${requireApiUrl()}/api/filters/depts`, { headers: buildHeaders() }).then((res) => parseJsonResponse<{ data: CatalogueFilterOption[] }>(res)),
    fetch(`${requireApiUrl()}/api/filters/baki`, { headers: buildHeaders() }).then((res) => parseJsonResponse<{ data: CatalogueFilterOption[] }>(res)),
    fetch(`${requireApiUrl()}/api/stores`, { headers: buildHeaders() }).then((res) => parseJsonResponse<{ data: CatalogueStoreOption[] }>(res)),
  ]);

  return {
    groups: groups.data ?? [],
    depts: depts.data ?? [],
    baki: baki.data ?? [],
    stores: stores.data ?? [],
  };
}

export async function searchCatalogueByImage(uri: string, topK = 20): Promise<CatalogueProduct[]> {
  const form = new FormData();
  form.append("file", { uri, type: "image/jpeg", name: "search.jpg" } as unknown as Blob);

  const response = await fetch(`${requireApiUrl()}/api/search/image?top_k=${topK}`, {
    method: "POST",
    headers: buildHeaders(),
    body: form,
  });
  const data = await parseJsonResponse<{ data: CatalogueProduct[] }>(response);
  return data.data ?? [];
}

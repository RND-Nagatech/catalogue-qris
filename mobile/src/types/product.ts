/** Data produk dari backend */
export interface Product {
  nama_barang: string;
  stock_on_hand: number;
  berat: number;
  berat_asli: number;
  kadar: number;
  kadar_cetak: string;
  harga_beli: number;
  harga_skrg: number;
  harga_jual: number;
  harga_atribut: number;
  tgl_last_beli: string;
  kode_barcode: string;
  kode_barang: string;
  kode_group: string;
  kode_dept: string;
  kode_gudang: string;
  kode_toko: string;
  sumber: string;
  firebaseCode?: string;
}

/** Data toko (dari /api/stores) */
export interface Store {
  id: string;
  name: string;
  mongoUri: string;
  dbName: string;
  firebaseCode?: string;
  createdAt: string;
  updatedAt: string;
}

/** Response standar dari backend */
export interface ApiResponse<T> {
  success: boolean;
  data: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
  };
}

/** Filter parameter untuk GET /api/products */
export interface ProductFilter {
  search?: string;
  storeId?: string;
  group?: string;
  dept?: string;
  toko?: string;
  page?: number;
  limit?: number;
}

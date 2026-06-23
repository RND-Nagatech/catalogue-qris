# Catalogue Multi-Store — API Documentation

Base URL: `http://localhost:3750`
Auth: Header `x-api-key: <your-api-key>`

---

## Health

### `GET /api/health`
No auth required.

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2026-06-17T10:25:54.578Z",
  "cron": {
    "intervalMin": 5,
    "intervalMs": 300000,
    "lastCronRun": "2026-06-17T10:30:00Z"
  }
}
```

---

## Stores

### `GET /api/stores`
List semua toko.

### `POST /api/stores`
Tambah toko.

**Body:**
```json
{
  "name": "FANCY GOLD & JEWELLERY",
  "mongoUri": "mongodb://user:pass@host:27017/db?authSource=admin",
  "dbName": "db_fcyjewellery",
  "firebaseCode": "INT",
  "nagagoldDomain": "https://qc-example.ngtc-si.com"
}
```

### `PUT /api/stores/:id`
Update toko. Body bisa sebagian (hanya field yang ingin diupdate).

### `DELETE /api/stores/:id`
Hapus toko.

---

## Products

### `GET /api/products`
Ambil produk dari Master Catalog (jika ada). Fallback ke multi-store query.

**Query Params:**

| Param | Type | Default | Deskripsi |
|---|---|---|---|
| `page` | int | 1 | Nomor halaman |
| `limit` | int | 20 | Item per halaman (max 100) |
| `search` | string | — | Cari di nama_barang, kode_barcode, kode_barang |
| `storeId` | string | — | Filter per toko |
| `group` | string | — | Filter kode_group |
| `dept` | string | — | Filter kode_dept |
| `toko` | string | — | Filter kode_toko |

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "nama_barang": "KALUNG KAP CHENNEL DESIGN ROSEGOLD",
      "kode_barcode": "00018421",
      "kode_barang": "00018421",
      "kode_group": "GOLD",
      "kode_dept": "NECKLACE",
      "kode_toko": "NAMPAN KLGI",
      "berat": 2.5,
      "kadar_cetak": "18/750",
      "harga_skrg": 870000,
      "sumber": "FANCY GOLD & JEWELLERY",
      "firebaseCode": "INT",
      "stock_on_hand": 1,
      "...": "..."
    }
  ],
  "meta": { "page": 1, "limit": 20, "total": 8422 }
}
```

---

## Filters

### `GET /api/filters/groups`
List unique kode_group dari semua toko (nama_group sudah didecrypt).

### `GET /api/filters/depts`
List unique kode_dept dari semua toko (nama_dept sudah didecrypt).

### `GET /api/filters/baki`
List unique kode_baki dari semua toko (nama_baki sudah didecrypt).

**Response format:**
```json
{
  "success": true,
  "data": [
    { "code": "GOLD", "name": "EMAS" },
    { "code": "DM", "name": "BERLIAN" }
  ]
}
```

---

## Images

### `GET /api/images/:barcode`
Serve gambar produk. No auth required.

- File ada di `sync_images/` → return langsung (200, image/jpeg, cache 1 year)
- Belum ada → redirect ke Firebase Storage (302)

**Usage di mobile:**
```tsx
<Image source={{ uri: `${BASE_URL}/api/images/${product.kode_barcode}` }} />
```

---

## Sync (Firebase → Disk)

### `POST /api/sync/start`
Download gambar dari Firebase Storage ke `sync_images/`. Concurrent (default 20, config `SYNC_CONCURRENCY` di .env).

**Response:**
```json
{
  "success": true,
  "data": {
    "total": 8295,
    "synced": 8295,
    "skipped": 0,
    "failed": 0,
    "errors": []
  }
}
```

### `GET /api/sync/status`
Progress real-time.

```json
{
  "success": true,
  "data": {
    "running": true,
    "lastSync": "2026-06-17T10:00:00Z",
    "total": 8295,
    "synced": 7000,
    "pending": 1295,
    "current": {
      "total": 8295,
      "synced": 7000,
      "failed": 0,
      "currentBarcode": "00012345"
    }
  }
}
```

---

## Master Catalog

### `POST /api/catalog/sync`
**Manual sync** — ETL dari semua toko ke Master Catalog DB.

- Fetch semua `tm_barang` (stock > 0) dari tiap store
- Decrypt `nama_barang` & `kadar_cetak`
- Tambah `sumber`, `firebaseCode`, `storeId`
- Bulk upsert ke `master_catalog`
- Build indexes

**Response:**
```json
{
  "success": true,
  "data": { "stores": 2, "upserted": 8422 }
}
```

### `GET /api/catalog/status`
Progress sync terakhir.

> **Note:** Catalog sync juga berjalan otomatis via cron (default: setiap 5 menit). Manual sync tetap bisa di-trigger kapan saja.

---

## Settings (Cron Config)

### `GET /api/settings`
Lihat semua settings.

```json
{
  "success": true,
  "data": {
    "catalogSyncIntervalMin": 5,
    "catalogSyncEnabled": true
  }
}
```

### `PUT /api/settings`
Update settings. Auto-reschedule cron jika interval/enabled berubah.

**Body:**
```json
{
  "catalogSyncIntervalMin": 30,
  "catalogSyncEnabled": true
}
```

| Key | Type | Default | Deskripsi |
|---|---|---|---|
| `catalogSyncIntervalMin` | int | 5 | Interval cron (menit), min 1 |
| `catalogSyncEnabled` | bool | true | Enable/disable auto sync |

---

## QRIS

Endpoint baru memakai response standar catalogue dan membutuhkan header `x-api-key`.

### `GET /api/qris/settings`
Ambil QRIS string tersimpan dan info merchant hasil parsing.

### `PUT /api/qris/settings`
Simpan QRIS string.

**Body:**
```json
{
  "qrisString": "000201010211..."
}
```

### `DELETE /api/qris/settings`
Kosongkan QRIS string.

### `POST /api/qris/generate`
Generate dynamic QRIS dari QRIS string tersimpan, atau dari `qrisString` yang dikirim di body.

**Body:**
```json
{
  "amount": 500000,
  "feeType": "percent",
  "feeValue": "5"
}
```

Alternatif format fee:
```json
{
  "amount": 500000,
  "fee": { "type": "fixed", "amount": 2500 }
}
```

### `GET /api/qris/payments`
List pembayaran QRIS lokal dengan status `pending`.

### `GET /api/qris/payments/history/today`
Riwayat pembayaran QRIS lokal hari ini.

### `POST /api/qris/payments`
Buat payment tracking QRIS lokal.

**Body:**
```json
{
  "note": "Penjualan Harian",
  "amount": 500000,
  "feeType": "none",
  "feeValue": ""
}
```

### `GET /api/qris/payments/:id/status`
Cek status payment QRIS lokal.

### `PATCH /api/qris/payments/:id/paid`
Tandai payment sebagai `paid`.

### `DELETE /api/qris/payments/:id`
Hapus payment.

### Compatibility Routes
Route lama tetap tersedia untuk APK lama dan tidak memakai wrapper `{ success, data, meta }`:

- `GET /api/settings/qris`
- `PUT /api/settings/qris`
- `DELETE /api/settings/qris`
- `GET /api/settings/nagagold`
- `PUT /api/settings/nagagold`
- `GET /api/payments`
- `GET /api/payments/history/today`
- `POST /api/payments`
- `PATCH /api/payments/:id/paid`
- `DELETE /api/payments/:id`

---

## NAGAGOLD Transactions

Endpoint transaksi memakai NAGAGOLD sebagai source of truth. Backend catalogue hanya menjadi adapter/proxy. Target cabang/domain diambil dari data store/cabang catalogue (`nagagoldDomain`, `domain`, `baseUrl`, `apiUrl`, atau dokumen `tm_cabang` jika tersedia).

Semua endpoint membutuhkan `x-api-key`.

### Config dan Dashboard
- `GET /api/nagagold/bootstrap`
- `GET /api/nagagold/config`
- `GET /api/nagagold/config/version`
- `GET /api/nagagold/dashboard`
- `GET /api/nagagold/history/today?type=sale|purchase`

### Master / Lookup Penjualan
- `GET /api/nagagold/sales`
- `GET /api/nagagold/banks`
- `GET /api/nagagold/rekenings`
- `GET /api/nagagold/member/:kode`
- `POST /api/nagagold/members/search`
- `GET /api/nagagold/barang/:barcode`

### Master / Lookup Pembelian
- `GET /api/nagagold/pembelian/tokos`
- `GET /api/nagagold/pembelian/jenis`
- `GET /api/nagagold/pembelian/kondisi`
- `GET /api/nagagold/pembelian/rounding`
- `GET /api/nagagold/pembelian/groups`
- `GET /api/nagagold/pembelian/barang/:barcode`

### Mutasi Transaksi
- `POST /api/nagagold/penjualan`
- `POST /api/nagagold/pembelian`
- `POST /api/nagagold/authorization`

### Compatibility
- `GET /api/nagagold/test-connection` tetap ada sementara agar APK lama tidak rusak, tetapi bukan UX target akhir.

---

## Image Search

### `POST /api/search/image`
Search produk by visual similarity. Upload gambar → DINOv2 embedding → Qdrant cosine search → enrich dari MongoDB.

**Request:** multipart form, field `file`.

**Query Params:**
- `top_k` (default 20) — jumlah hasil
- `firebase_code` — filter per source

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "nama_barang": "Cincin Emas 18K",
      "kode_barcode": "00012345",
      "sumber": "FANCY GOLD & JEWELLERY",
      "_searchScore": 0.954,
      "...": "..."
    }
  ],
  "meta": { "top_k": 20, "enriched": 20 }
}
```

---

## Error Responses

Semua error return format:
```json
{
  "success": false,
  "error": "Deskripsi error"
}
```

HTTP status codes:
- `200` Success
- `201` Created
- `400` Bad Request
- `401` Unauthorized (missing/invalid API key)
- `404` Not Found
- `409` Conflict (sync already running)
- `500` Internal Server Error
- `502` Bad Gateway (Python service error)

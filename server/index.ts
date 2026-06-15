import cors from "cors";
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
    raw?: Record<string, unknown>;
  }[];
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
    raw?: Record<string, unknown>;
  }[];
  jumlahBayar?: number;
  keterangan?: string;
  typePembayaran?: string;
  rekening?: string;
};

const uri = process.env.MONGODB_URI;
const port = Number(process.env.PORT ?? 4000);
const tokenPusat = process.env.TOKEN_PUSAT;

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

async function loadNagagoldDomain(): Promise<string> {
  const db = await getDb();
  const setting = await db.collection<SettingDocument>("settings").findOne({ _id: "nagagold" });
  return normalizeDomain(setting?.domain ?? "");
}

function nagagoldHeaders(): Record<string, string> {
  if (!tokenPusat) {
    throw new Error("TOKEN_PUSAT is required.");
  }

  return {
    "Content-Type": "application/json",
    "x-auth-token": tokenPusat,
    "ngrok-skip-browser-warning": "1",
    Authorization: `Bearer ${tokenPusat}`,
    token: tokenPusat,
    "x-token-pusat": tokenPusat,
  };
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
    const detail = typeof data === "object" && data && "message" in data
      ? String(data.message)
      : typeof data === "string" && data.trim()
        ? data.trim()
        : `NAGAGOLD request failed (${response.status}).`;
    throw new Error(detail);
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
  const jumlahBayar = asNumber(input.jumlahBayar) || total;
  const inputPayments = Array.isArray(input.payments) ? input.payments : [];
  const pembayaran = inputPayments.length
    ? inputPayments.map((payment) => {
        const method = asText(payment.method, "CASH").toUpperCase();
        const validMethod = ["CASH", "TRANSFER", "DEBET", "CREDIT"].includes(method) ? method : "TRANSFER";
        const isCard = validMethod === "DEBET" || validMethod === "CREDIT";
        const nonCashInfo = asText(payment.rekening || payment.bank, "-").toUpperCase();
        const noCard = asText(payment.noCard, "-").toUpperCase();
        const keterangan = validMethod === "CASH"
          ? "CASH"
          : `${nonCashInfo}${isCard && noCard !== "-" ? noCard : ""}`;
        const bank = validMethod === "CASH"
          ? "CASH"
          : nonCashInfo;

        return {
          bank,
          jenis: validMethod,
          bayar_lebih: "TIDAK",
          keterangan,
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
    detail_authorization: [],
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
      kode_dept: asText(item.kodeJenis ?? raw?.kode_dept),
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
  const jumlahBayar = asNumber(input.jumlahBayar) || totalHarga;
  const typePembayaran = asText(input.typePembayaran ?? input.keterangan, "CASH");
  const rekeningParts = asText(input.rekening, "-").split("-");

  return {
    kode_sales: asText(input.kodeSales),
    nama_sales: asText(input.namaSales ?? input.kodeSales),
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
    detail_authorization: [],
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
    if (!barcode) {
      res.status(400).json({ message: "Kode barcode wajib diisi." });
      return;
    }
    const response = await nagagoldFetch(`/api/v1/pembelian/get/jual/${barcode}`, { method: "GET" });
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
    if (!body.kodeSales || !body.kodeBarcode || !body.namaCustomer) {
      res.status(400).json({ message: "Kode sales, customer, dan barcode wajib diisi." });
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
    if (!body.kodeSales || !body.kodeBarcode || !body.namaCustomer) {
      res.status(400).json({ message: "Kode sales, customer, dan barcode wajib diisi." });
      return;
    }

    const payload = buildPurchasePayload(body);
    const response = await nagagoldRequest("/api/v1/pembelian/simpan", payload);
    res.json({ ok: true, endpoint: "/api/v1/pembelian/simpan", response });
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

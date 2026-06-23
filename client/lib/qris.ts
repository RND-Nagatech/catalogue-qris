export type QrisField = { id: string; len: number; value: string };

export function parseTLV(payload: string): QrisField[] {
  const out: QrisField[] = [];
  let i = 0;

  while (i < payload.length) {
    if (i + 4 > payload.length) {
      throw new Error("Invalid TLV: incomplete tag or length.");
    }

    const id = payload.substring(i, i + 2);
    const len = Number.parseInt(payload.substring(i + 2, i + 4), 10);
    if (Number.isNaN(len) || len < 0) {
      throw new Error("Invalid TLV: invalid length.");
    }

    const start = i + 4;
    const end = start + len;
    if (end > payload.length) {
      throw new Error("Invalid TLV: value length exceeds payload.");
    }

    const value = payload.substring(start, end);
    out.push({ id, len, value });
    i += 4 + len;
  }

  return out;
}

export function buildTLV(id: string, value: string): string {
  const len = value.length.toString().padStart(2, "0");
  return `${id}${len}${value}`;
}

export function crc16(str: string): string {
  let crc = 0xffff;

  for (let i = 0; i < str.length; i++) {
    crc ^= str.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      crc = (crc & 0x8000) ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

export type MerchantInfo = {
  merchant: string;
  city: string;
  postalCode: string;
  issuer: string;
  category: string;
  currency: string;
  method: "Static" | "Dynamic";
};

export function normalizeQris(raw: string): string {
  return raw.replace(/[\r\n\t]/g, "").trim();
}

export function validateQris(qris: string): void {
  const normalized = normalizeQris(qris);
  if (normalized.length < 30 || !/^[\x20-\x7E]+$/.test(normalized)) {
    throw new Error("QRIS string is too short or contains invalid characters.");
  }

  const crcIndex = normalized.lastIndexOf("6304");
  if (crcIndex === -1 || crcIndex + 8 !== normalized.length) {
    throw new Error("QRIS CRC tag is missing.");
  }

  parseTLV(normalized);
  const withoutCrcValue = normalized.slice(0, -4);
  const expectedCrc = crc16(withoutCrcValue);
  const actualCrc = normalized.slice(-4).toUpperCase();
  if (expectedCrc !== actualCrc) {
    throw new Error("QRIS CRC is invalid.");
  }
}

function getIssuer(fields: QrisField[]): string {
  const merchantAccount = fields.find((field) => {
    const id = Number.parseInt(field.id, 10);
    return id >= 26 && id <= 51;
  });

  if (!merchantAccount) return "";

  try {
    const nested = parseTLV(merchantAccount.value);
    return nested.find((field) => field.id === "00")?.value ?? "";
  } catch {
    return "";
  }
}

export function getMerchantInfo(qris: string): MerchantInfo {
  const normalized = normalizeQris(qris);
  const fields = parseTLV(normalized);
  const get = (id: string) => fields.find(f => f.id === id)?.value ?? "";
  const pointOfInit = get("01");

  return {
    merchant: get("59"),
    city: get("60"),
    postalCode: get("61"),
    issuer: getIssuer(fields),
    category: get("52"),
    currency: get("53") === "360" ? "IDR (Rupiah)" : get("53"),
    method: pointOfInit === "12" ? "Dynamic" : "Static",
  };
}

export type ServiceFee =
  | { type: "none" }
  | { type: "fixed"; amount: number }
  | { type: "percent"; percent: number };

/**
 * Convert static QRIS to dynamic with amount (and optional service fee).
 * Steps:
 *  1. Replace tag 01 "11" → "12" (point of initiation = dynamic)
 *  2. Insert tag 54 (transaction amount) before tag 58 (country code)
 *  3. Insert tag 55/56/57 for service fee if any
 *  4. Strip old CRC (tag 63) then append fresh CRC16
 */
export function convertToDynamic(
  qris: string,
  amount: number,
  fee: ServiceFee = { type: "none" }
): string {
  const normalized = normalizeQris(qris);
  validateQris(normalized);

  if (!Number.isFinite(amount) || amount <= 0 || amount > 100000000) {
    throw new Error("Nominal pembayaran tidak valid.");
  }

  const idx63 = normalized.lastIndexOf("6304");
  let body = normalized.substring(0, idx63);

  body = body.replace("010211", "010212");
  if (!body.includes("010212")) {
    throw new Error("QRIS tidak memiliki tag metode pembayaran yang valid.");
  }

  const amountStr = String(Math.floor(amount));
  const amountTLV = buildTLV("54", amountStr);

  let feeTLV = "";
  if (fee.type === "fixed") {
    if (!Number.isFinite(fee.amount) || fee.amount < 0) {
      throw new Error("Biaya layanan tidak valid.");
    }
    feeTLV = buildTLV("55", "02") + buildTLV("56", String(Math.floor(fee.amount)));
  } else if (fee.type === "percent") {
    if (!Number.isFinite(fee.percent) || fee.percent < 0 || fee.percent > 100) {
      throw new Error("Persentase biaya layanan tidak valid.");
    }
    feeTLV = buildTLV("55", "03") + buildTLV("57", String(fee.percent));
  }

  const insertAt = body.indexOf("5802");
  if (insertAt === -1) throw new Error("Invalid QRIS: tag 58 (country) not found");
  const withAmount =
    body.slice(0, insertAt) + amountTLV + feeTLV + body.slice(insertAt);

  const toCRC = withAmount + "6304";
  return toCRC + crc16(toCRC);
}

export function formatRupiah(n: number): string {
  return "Rp " + n.toLocaleString("id-ID");
}

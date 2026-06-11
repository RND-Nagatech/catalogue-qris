const crc16 = (str: string): string => {
  let crc = 0xffff;
  const strlen = str.length;

  for (let c = 0; c < strlen; c += 1) {
    crc ^= str.charCodeAt(c) << 8;
    for (let i = 0; i < 8; i += 1) {
      if (crc & 0x8000) {
        crc = (crc << 1) ^ 0x1021;
      } else {
        crc <<= 1;
      }
    }
  }

  const hex = (crc & 0xffff).toString(16).toUpperCase();
  return hex.padStart(4, '0');
};

type TLVTag = {
  tag: string;
  value: string;
};

export const DEMO_STATIC_QRIS =
  '00020101021126350014ID.CO.QRIS.WWW0113DEMO1234567895204931153033605802ID5913DEMO QRIS APP6007JAKARTA610512345630427EA';

function parseTLV(data: string): TLVTag[] {
  const tags: TLVTag[] = [];
  let i = 0;

  while (i < data.length) {
    if (i + 4 > data.length) {
      break;
    }

    const tag = data.substring(i, i + 2);
    const length = parseInt(data.substring(i + 2, i + 4), 10);
    if (Number.isNaN(length) || i + 4 + length > data.length) {
      break;
    }

    const value = data.substring(i + 4, i + 4 + length);
    tags.push({ tag, value });
    i += 4 + length;
  }

  return tags;
}

export const parseMerchantName = (qrisData: string): string => {
  if (!qrisData || typeof qrisData !== 'string' || qrisData.length < 10) {
    return 'Merchant';
  }

  const tags = parseTLV(qrisData);
  const merchant = tags.find((tag) => tag.tag === '59')?.value ?? '';

  return merchant.trim().replace(/[<>"']/g, '') || 'Merchant';
};

export const generateDynamicQris = (
  staticQris: string,
  amount: string,
  feeType: 'Persentase' | 'Rupiah',
  feeValue: string,
): string => {
  if (!staticQris || typeof staticQris !== 'string' || staticQris.length < 20) {
    throw new Error('Invalid static QRIS data.');
  }

  const amountNum = parseFloat(amount);
  if (Number.isNaN(amountNum) || amountNum <= 0 || amountNum > 100000000) {
    throw new Error('Invalid payment amount.');
  }

  if (feeValue) {
    const feeNum = parseFloat(feeValue);
    if (Number.isNaN(feeNum) || feeNum < 0 || feeNum > 10000000) {
      throw new Error('Invalid fee value.');
    }
  }

  const qrisWithoutCrc = staticQris.substring(0, staticQris.length - 4);
  const step1 = qrisWithoutCrc.replace('010211', '010212');
  const parts = step1.split('5802ID');
  if (parts.length !== 2) {
    throw new Error("QRIS data is not in the expected format (missing '5802ID').");
  }

  const amountStr = String(Math.floor(amountNum));
  const amountTag = `54${String(amountStr.length).padStart(2, '0')}${amountStr}`;

  let feeTag = '';
  if (feeValue && parseFloat(feeValue) > 0) {
    if (feeType === 'Rupiah') {
      const feeValueStr = String(Math.floor(parseFloat(feeValue)));
      feeTag = `55020256${String(feeValueStr.length).padStart(2, '0')}${feeValueStr}`;
    } else {
      const feeValueStr = feeValue.replace(/[^0-9.]/g, '');
      feeTag = `55020357${String(feeValueStr.length).padStart(2, '0')}${feeValueStr}`;
    }
  }

  const payload = [parts[0], amountTag, feeTag, '5802ID', parts[1]].join('');
  const finalCrc = crc16(payload);

  return payload + finalCrc;
};

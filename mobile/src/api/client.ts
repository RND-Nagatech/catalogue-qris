import axios from 'axios';

// Base URL: localhost untuk dev (adb reverse), IP untuk production
export const BASE_URL = __DEV__
  ? 'http://192.168.16.175:3750'
  : 'https://catalogue-international-group.goldstore.id';

const API_BASE = `${BASE_URL}/api`;

const api = axios.create({
  baseURL: API_BASE,
  headers: {
    'x-api-key': 'klxnJAkdEExjPoGVNQ5zEPHUk30phfpEEDOkxJqcvmT75K9VwCKVePSdIdgEK6b3',
    'Content-Type': 'application/json',
  },
  timeout: 30000,
});

/** URL gambar produk dari backend (serve dari sync_images atau redirect Firebase) */
export function getImageUrl(barcode: string): string {
  return `${BASE_URL}/api/images/${barcode}`;
}

export default api;

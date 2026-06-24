import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || 'https://catalogue-international-group.goldstore.id';

const api = axios.create({
  baseURL: `${API_BASE}/api`,
  headers: {
    'x-api-key': import.meta.env.VITE_API_KEY || 'catalogue-multi-store-secret-key-2024',
    'Content-Type': 'application/json',
  },
  timeout: 120000,
});

export default api;

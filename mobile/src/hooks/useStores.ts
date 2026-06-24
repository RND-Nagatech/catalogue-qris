import { useState, useEffect } from 'react';
import api from '../api/client';
import { Store } from '../types/product';

export function useStores() {
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    api
      .get<{ success: boolean; data: Store[] }>('/stores')
      .then((res) => {
        if (res.data?.data) setStores(res.data.data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return { stores, loading };
}

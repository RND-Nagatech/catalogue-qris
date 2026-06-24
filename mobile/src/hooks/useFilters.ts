import { useState, useEffect, useCallback } from 'react';
import api from '../api/client';

export interface FilterOption {
  code: string;
  name: string;
}

interface FilterData {
  groups: FilterOption[];
  depts: FilterOption[];
  baki: FilterOption[];
}

export function useFilters() {
  const [data, setData] = useState<FilterData>({ groups: [], depts: [], baki: [] });
  const [loading, setLoading] = useState(false);

  const fetchFilters = useCallback(async () => {
    setLoading(true);
    try {
      const [groupsRes, deptsRes, bakiRes] = await Promise.all([
        api.get<{ success: boolean; data: FilterOption[] }>('/filters/groups'),
        api.get<{ success: boolean; data: FilterOption[] }>('/filters/depts'),
        api.get<{ success: boolean; data: FilterOption[] }>('/filters/baki'),
      ]);
      setData({
        groups: groupsRes.data.data || [],
        depts: deptsRes.data.data || [],
        baki: bakiRes.data.data || [],
      });
    } catch (err) {
      console.error('[useFilters] Gagal fetch:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFilters();
  }, [fetchFilters]);

  return { ...data, loading, refetch: fetchFilters };
}

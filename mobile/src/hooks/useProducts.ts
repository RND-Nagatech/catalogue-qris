import { useState, useCallback, useRef } from 'react';
import api from '../api/client';
import { Product, ProductFilter, ApiResponse } from '../types/product';

export function useProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [total, setTotal] = useState(0);
  const limit = 20;
  const totalPages = Math.max(1, Math.ceil(total / limit));

  // Filter state
  const [search, setSearch] = useState('');
  const [storeId, setStoreId] = useState<string | null>(null);
  const [group, setGroup] = useState<string | null>(null);
  const [dept, setDept] = useState<string | null>(null);
  const [toko, setToko] = useState<string | null>(null);

  // Simpan filter terakhir untuk refetch
  const lastFilter = useRef<ProductFilter>({ page: 1, limit: 20 });

  const fetchProducts = useCallback(
    async (filter: ProductFilter, reset = false) => {
      try {
        if (reset) {
          setLoading(true);
          setError(null);
        } else {
          setRefreshing(true);
        }

        lastFilter.current = filter;

        const response = await api.get<ApiResponse<Product>>('/products', {
          params: filter,
        });

        const { data, meta } = response.data;

        if (reset) {
          setProducts(data);
          setPage(1);
        } else {
          setProducts((prev) => [...prev, ...data]);
        }

        setTotal(meta.total);
        setHasMore(meta.page * meta.limit < meta.total);
        setPage(meta.page);
      } catch (err: any) {
        const msg = err?.response?.data?.error || err.message || 'Gagal memuat data';
        setError(msg);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    []
  );

  /** Build filter object dari current state */
  const buildFilter = useCallback(
    (overrides: ProductFilter = {}) => ({
      page: 1,
      limit: 20,
      search: search || undefined,
      storeId: storeId || undefined,
      group: group || undefined,
      dept: dept || undefined,
      toko: toko || undefined,
      ...overrides,
    }),
    [search, storeId, group, dept, toko]
  );

  /** Load halaman pertama (reset) */
  const loadInitial = useCallback(() => {
    setSearch('');
    setStoreId(null);
    setGroup(null);
    setDept(null);
    setToko(null);
    fetchProducts({ page: 1, limit: 20 }, true);
  }, [fetchProducts]);

  /** Load halaman berikutnya (infinite scroll) */
  const loadMore = useCallback(() => {
    if (!hasMore || loading || refreshing) return;
    const nextPage = page + 1;
    fetchProducts(
      { ...lastFilter.current, page: nextPage },
      false
    );
  }, [hasMore, loading, refreshing, page, fetchProducts]);

  /** Search produk — reset list */
  const searchProducts = useCallback(
    (keyword: string) => {
      setSearch(keyword);
      fetchProducts(
        buildFilter({ page: 1, search: keyword || undefined }),
        true
      );
    },
    [fetchProducts, buildFilter]
  );

  /** Filter by store — reset list */
  const filterByStore = useCallback(
    (id: string | null) => {
      setStoreId(id);
      fetchProducts(
        buildFilter({ page: 1, storeId: id || undefined }),
        true
      );
    },
    [fetchProducts, buildFilter]
  );

  /** Apply group/dept/baki/store filters dari FilterSheet */
  const applyFilters = useCallback(
    (g: string | null, d: string | null, t: string | null, s: string | null) => {
      setGroup(g);
      setDept(d);
      setToko(t);
      setStoreId(s);
      fetchProducts(
        {
          page: 1,
          limit: 20,
          search: search || undefined,
          storeId: s || undefined,
          group: g || undefined,
          dept: d || undefined,
          toko: t || undefined,
        },
        true
      );
    },
    [fetchProducts, search]
  );

  /** Go to specific page */
  const goToPage = useCallback(
    (pageNum: number) => {
      const p = Math.max(1, Math.min(pageNum, totalPages));
      fetchProducts(buildFilter({ page: p, limit }), true);
    },
    [fetchProducts, buildFilter, totalPages, limit]
  );

  /** Next page */
  const nextPage = useCallback(() => {
    if (page < totalPages) {
      fetchProducts(buildFilter({ page: page + 1, limit }), true);
    }
  }, [fetchProducts, buildFilter, page, totalPages, limit]);

  /** Prev page */
  const prevPage = useCallback(() => {
    if (page > 1) {
      fetchProducts(buildFilter({ page: page - 1, limit }), true);
    }
  }, [fetchProducts, buildFilter, page, limit]);

  /** Pull-to-refresh */
  const onRefresh = useCallback(() => {
    fetchProducts(buildFilter({ page: 1 }), true);
  }, [fetchProducts, buildFilter]);

  return {
    products,
    loading,
    refreshing,
    error,
    hasMore,
    total,
    page,
    limit,
    totalPages,
    search,
    storeId,
    group,
    dept,
    toko,
    loadInitial,
    loadMore,
    searchProducts,
    filterByStore,
    applyFilters,
    goToPage,
    nextPage,
    prevPage,
    onRefresh,
  };
}

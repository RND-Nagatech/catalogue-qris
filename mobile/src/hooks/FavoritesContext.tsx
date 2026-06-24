import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Product } from '../types/product';

const FAVORITES_KEY = '@favorites';

interface FavoritesContextType {
  favorites: Product[];
  loading: boolean;
  isFavorite: (kodeBarang: string) => boolean;
  toggleFavorite: (product: Product) => void;
  removeFavorite: (kodeBarang: string) => void;
}

const FavoritesContext = createContext<FavoritesContextType>({
  favorites: [],
  loading: true,
  isFavorite: () => false,
  toggleFavorite: () => {},
  removeFavorite: () => {},
});

export function FavoritesProvider({ children }: { children: React.ReactNode }) {
  const [favorites, setFavorites] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  // Load dari AsyncStorage saat mount
  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(FAVORITES_KEY);
        if (raw) {
          setFavorites(JSON.parse(raw));
        }
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Simpan ke AsyncStorage setiap kali favorites berubah
  const persist = async (items: Product[]) => {
    try {
      await AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify(items));
    } catch {
      // ignore
    }
  };

  const isFavorite = useCallback(
    (kodeBarang: string) => favorites.some((f) => f.kode_barang === kodeBarang),
    [favorites]
  );

  const toggleFavorite = useCallback(
    (product: Product) => {
      setFavorites((prev) => {
        const exists = prev.find((f) => f.kode_barang === product.kode_barang);
        const next = exists
          ? prev.filter((f) => f.kode_barang !== product.kode_barang)
          : [product, ...prev];
        persist(next);
        return next;
      });
    },
    []
  );

  const removeFavorite = useCallback((kodeBarang: string) => {
    setFavorites((prev) => {
      const next = prev.filter((f) => f.kode_barang !== kodeBarang);
      persist(next);
      return next;
    });
  }, []);

  return (
    <FavoritesContext.Provider
      value={{ favorites, loading, isFavorite, toggleFavorite, removeFavorite }}
    >
      {children}
    </FavoritesContext.Provider>
  );
}

export function useFavoritesContext() {
  return useContext(FavoritesContext);
}

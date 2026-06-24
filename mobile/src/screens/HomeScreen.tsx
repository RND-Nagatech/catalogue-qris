import React, { useEffect, useCallback, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import ProductCard from '../components/ProductCard';
import SearchBar from '../components/SearchBar';
import FilterSheet from '../components/FilterSheet';
import EmptyState from '../components/EmptyState';
import { useProducts } from '../hooks/useProducts';
import { useFavoritesContext } from '../hooks/FavoritesContext';
import { useFilters } from '../hooks/useFilters';
import { useStores } from '../hooks/useStores';
import { Product } from '../types/product';
import { colors, typography, spacing, borderRadius } from '../theme';

interface HomeScreenProps {
  navigation: any;
}

export default function HomeScreen({ navigation }: HomeScreenProps) {
  const insets = useSafeAreaInsets();
  const {
    products,
    loading,
    refreshing,
    error,
    hasMore,
    total,
    searchProducts,
    loadMore,
    loadInitial,
    applyFilters,
    onRefresh,
    group,
    dept,
    toko,
    storeId,
  } = useProducts();

  const { isFavorite, toggleFavorite } = useFavoritesContext();
  const { groups, depts, baki } = useFilters();
  const { stores } = useStores();
  const [filterVisible, setFilterVisible] = useState(false);

  useEffect(() => {
    loadInitial();
  }, [loadInitial]);

  const activeFilterCount = [group, dept, toko, storeId].filter(Boolean).length;

  const handleProductPress = useCallback(
    (product: Product) => {
      navigation.navigate('ProductDetail', { product });
    },
    [navigation]
  );

  const renderItem = useCallback(
    ({ item }: { item: Product }) => (
      <ProductCard
        product={item}
        onPress={() => handleProductPress(item)}
        isFavorite={isFavorite(item.kode_barang)}
        onToggleFavorite={() => toggleFavorite(item)}
      />
    ),
    [handleProductPress, isFavorite, toggleFavorite]
  );

  const renderFooter = () => {
    if (!hasMore || products.length === 0) return null;
    return (
      <View style={styles.footer}>
        <ActivityIndicator size="small" color={colors.primary} />
      </View>
    );
  };

  const keyExtractor = (item: Product, index: number) =>
    `${item.kode_barang}-${item.sumber}-${index}`;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Produk</Text>
        <Text style={styles.productCount}>{total} item</Text>
      </View>

      {/* Search + Filter */}
      <View style={styles.searchContainer}>
        <View style={styles.searchRow}>
          <View style={styles.searchFlex}>
            <SearchBar
              placeholder="Cari produk..."
              onSearch={searchProducts}
            />
          </View>
          <TouchableOpacity
            style={[styles.filterBtn, activeFilterCount > 0 && styles.filterBtnActive]}
            onPress={() => setFilterVisible(true)}
            activeOpacity={0.7}
          >
            <Ionicons
              name="options-outline"
              size={22}
              color={activeFilterCount > 0 ? colors.onPrimary : colors.primary}
            />
            {activeFilterCount > 0 && (
              <View style={styles.filterBadge}>
                <Text style={styles.filterBadgeText}>{activeFilterCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Filter Sheet */}
      <FilterSheet
        visible={filterVisible}
        onClose={() => setFilterVisible(false)}
        groups={groups}
        depts={depts}
        baki={baki}
        stores={stores}
        selectedGroup={group}
        selectedDept={dept}
        selectedTokoBaki={toko}
        selectedStoreId={storeId}
        onApply={applyFilters}
      />

      {/* Content */}
      {error && !loading ? (
        <EmptyState
          icon="cloud-offline-outline"
          title="Gagal Memuat"
          description={error}
          actionLabel="Coba Lagi"
          onAction={loadInitial}
        />
      ) : (
        <FlatList
          data={products}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          numColumns={2}
          contentContainerStyle={styles.listContent}
          columnWrapperStyle={styles.columnWrapper}
          onEndReached={loadMore}
          onEndReachedThreshold={0.3}
          ListFooterComponent={renderFooter}
          ListEmptyComponent={
            loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.primary} />
              </View>
            ) : (
              <EmptyState
                icon="diamond-outline"
                title="Belum Ada Produk"
                description="Produk akan muncul setelah toko dikonfigurasi di backend."
                actionLabel="Muat Ulang"
                onAction={loadInitial}
              />
            )
          }
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[colors.primary]}
              tintColor={colors.primary}
            />
          }
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.containerMargin,
    paddingTop: spacing.xs,
    paddingBottom: spacing.sm,
  },
  headerTitle: {
    ...typography.headlineLgMobile,
    color: colors.primary,
  },
  productCount: {
    ...typography.labelSm,
    color: colors.onSurfaceVariant,
  },
  searchContainer: {
    paddingHorizontal: spacing.containerMargin,
    paddingBottom: spacing.md,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  searchFlex: {
    flex: 1,
  },
  filterBtn: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceContainerHighest,
  },
  filterBtnActive: {
    backgroundColor: colors.primaryContainer,
    borderColor: colors.primaryContainer,
  },
  filterBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.error,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  filterBadgeText: {
    ...typography.labelSm,
    color: colors.onError,
    fontSize: 10,
    lineHeight: 14,
  },
  listContent: {
    paddingHorizontal: spacing.containerMargin,
    paddingBottom: 100,
  },
  columnWrapper: {
    justifyContent: 'space-between',
  },
  footer: {
    paddingVertical: spacing.lg,
    alignItems: 'center',
    paddingBottom: 80,
  },
  loadingContainer: {
    paddingVertical: 120,
    alignItems: 'center',
  },
});

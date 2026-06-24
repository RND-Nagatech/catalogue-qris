import React, { useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import ProductCard from '../components/ProductCard';
import EmptyState from '../components/EmptyState';
import { useFavoritesContext } from '../hooks/FavoritesContext';
import { Product } from '../types/product';
import { colors, typography, spacing } from '../theme';

interface FavoriteScreenProps {
  navigation: any;
}

export default function FavoriteScreen({ navigation }: FavoriteScreenProps) {
  const insets = useSafeAreaInsets();
  const { favorites, loading, toggleFavorite } = useFavoritesContext();

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
        isFavorite={true}
        onToggleFavorite={() => toggleFavorite(item)}
      />
    ),
    [handleProductPress, toggleFavorite]
  );

  const keyExtractor = (item: Product, index: number) =>
    `${item.kode_barang}-${item.sumber}-${index}`;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Favorit Saya</Text>
      </View>

      {/* Intro */}
      <View style={styles.intro}>
        <Text style={styles.introLabel}>Koleksi Tersimpan</Text>
        <View style={styles.introLine} />
      </View>

      {/* Content */}
      {favorites.length === 0 && !loading ? (
        <EmptyState
          icon="heart-dislike-outline"
          title="Belum Ada Favorit"
          description="Jelajahi koleksi perhiasan kami dan klik ikon hati untuk menyimpan item favorit Anda di sini."
          actionLabel="Mulai Cari"
          onAction={() => navigation.navigate('HomeTab')}
        />
      ) : (
        <FlatList
          data={favorites}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          numColumns={2}
          contentContainerStyle={styles.listContent}
          columnWrapperStyle={styles.columnWrapper}
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
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.containerMargin,
    paddingVertical: spacing.xs,
  },
  headerTitle: {
    ...typography.headlineMd,
    color: colors.primary,
  },
  intro: {
    paddingHorizontal: spacing.containerMargin,
    paddingBottom: spacing.md,
  },
  introLabel: {
    ...typography.labelMd,
    color: colors.onSurfaceVariant,
    textTransform: 'uppercase',
    letterSpacing: 0.08 * 14,
    marginBottom: spacing.sm,
  },
  introLine: {
    width: 32,
    height: 2,
    backgroundColor: colors.primary,
  },
  listContent: {
    paddingHorizontal: spacing.containerMargin,
    paddingBottom: 100,
  },
  columnWrapper: {
    justifyContent: 'space-between',
  },
});

import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Product } from '../types/product';
import { useFavoritesContext } from '../hooks/FavoritesContext';
import { getImageUrl } from '../api/client';
import { colors, typography, spacing, borderRadius, shadows } from '../theme';

interface ProductDetailScreenProps {
  route: { params: { product: Product } };
  navigation: any;
}

function InfoRow({ label, value }: { label: string; value: string | number }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

export default function ProductDetailScreen({
  route,
  navigation,
}: ProductDetailScreenProps) {
  const { product } = route.params;
  const insets = useSafeAreaInsets();
  const { isFavorite, toggleFavorite } = useFavoritesContext();
  const fav = isFavorite(product.kode_barang);
  const imageUri = getImageUrl(product.kode_barcode);

  const formatRupiah = (val: number) =>
    val > 0 ? `Rp ${val.toLocaleString('id-ID')}` : '—';

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={24} color={colors.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          Detail Produk
        </Text>
        <TouchableOpacity
          style={styles.favBtn}
          onPress={() => toggleFavorite(product)}
          activeOpacity={0.7}
        >
          <Ionicons
            name={fav ? 'heart' : 'heart-outline'}
            size={24}
            color={fav ? colors.error : colors.primary}
          />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Product Image */}
        <View style={styles.imageContainer}>
          {product.kode_barcode ? (
            <Image
              source={{ uri: imageUri }}
              style={styles.productImage}
              resizeMode="cover"
              onError={(e) => console.log('Image load error:', e.nativeEvent)}
            />
          ) : (
            <View style={styles.imagePlaceholder}>
              <Ionicons name="diamond-outline" size={64} color={colors.outlineVariant} />
            </View>
          )}
        </View>

        {/* Nama & Toko */}
        <Text style={styles.productName}>{product.nama_barang}</Text>
        <Text style={styles.storeName}>{product.sumber}</Text>

        {/* Card: Informasi Umum */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Informasi Produk</Text>
          <InfoRow label="Kode Barang" value={product.kode_barang} />
          <InfoRow label="Kode Barcode" value={product.kode_barcode} />
          <InfoRow label="Group" value={product.kode_group} />
          <InfoRow label="Departemen" value={product.kode_dept} />
          <InfoRow label="Gudang" value={product.kode_gudang} />
          <InfoRow label="Toko" value={product.kode_toko} />
        </View>

        {/* Card: Harga & Berat */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Harga &amp; Berat</Text>
          <InfoRow label="Berat" value={`${product.berat?.toFixed(2) || '0'} gr`} />
          <InfoRow label="Berat Asli" value={`${product.berat_asli?.toFixed(2) || '0'} gr`} />
          <InfoRow label="Kadar Cetak" value={product.kadar_cetak} />
          <InfoRow label="Kadar" value={product.kadar} />
          <InfoRow label="Stock" value={`${product.stock_on_hand} pcs`} />
          <InfoRow label="Harga Beli" value={formatRupiah(product.harga_beli)} />
          <InfoRow label="Harga Sekarang" value={formatRupiah(product.harga_skrg)} />
          <InfoRow label="Harga Jual" value={formatRupiah(product.harga_jual)} />
          <InfoRow label="Harga Atribut" value={formatRupiah(product.harga_atribut)} />
          <InfoRow label="Terakhir Beli" value={product.tgl_last_beli || '—'} />
        </View>
      </ScrollView>
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
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.containerMargin,
    paddingVertical: spacing.md,
  },
  backBtn: {
    padding: spacing.xs,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    fontFamily: typography.headlineMd.fontFamily,
    color: colors.primary,
    flex: 1,
    textAlign: 'center',
  },
  favBtn: {
    padding: spacing.xs,
  },
  scrollContent: {
    paddingHorizontal: spacing.containerMargin,
    paddingBottom: 80,
  },
  imageContainer: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: colors.surfaceContainer,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    marginBottom: spacing.lg,
  },
  imagePlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceContainer,
  },
  imageLoading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceContainer,
  },
  productImage: {
    width: '100%',
    height: '100%',
  },
  productName: {
    fontSize: 20,
    fontWeight: '700',
    fontFamily: typography.headlineMd.fontFamily,
    color: colors.onSurface,
    marginBottom: spacing.xs,
    lineHeight: 26,
  },
  storeName: {
    fontSize: 13,
    fontWeight: '400',
    color: colors.onSurfaceVariant,
    marginBottom: spacing.lg,
  },
  card: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    ...shadows.card,
  },
  cardTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.outline,
    textTransform: 'uppercase',
    letterSpacing: 0.08 * 12,
    marginBottom: spacing.sm,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs + 2,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.outlineVariant,
  },
  infoLabel: {
    fontSize: 13,
    fontWeight: '400',
    color: colors.onSurfaceVariant,
  },
  infoValue: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.onSurface,
    maxWidth: '55%',
    textAlign: 'right',
  },
  divider: {
    height: 1,
    backgroundColor: colors.outlineVariant,
    marginVertical: spacing.sm,
  },
});

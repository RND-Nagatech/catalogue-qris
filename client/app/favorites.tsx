import { Ionicons } from "@expo/vector-icons";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppHeader, CardContainer, EmptyState, PrimaryButton } from "../components/ui";
import {
  type CatalogueProduct,
  addCatalogueFavorite,
  getCatalogueImageUrl,
  getCatalogueProductId,
  loadCatalogueFavoriteIds,
  loadCatalogueFavoriteProducts,
  removeCatalogueFavorite,
} from "../lib/catalogueStore";
import { useAppTheme } from "../lib/theme";

const PAGE_LIMIT = 20;

function rupiah(value?: number) {
  return `Rp ${Math.max(0, Number(value || 0)).toLocaleString("id-ID")}`;
}

function productKey(product: CatalogueProduct, index: number) {
  return `${getCatalogueProductId(product) || product.kode_barcode || product.kode_barang || "favorite"}-${index}`;
}

export default function FavoritesScreen() {
  const theme = useAppTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [products, setProducts] = useState<CatalogueProduct[]>([]);
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [searchDraft, setSearchDraft] = useState("");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<CatalogueProduct | null>(null);
  const isCompact = width < 380;

  const refreshFavoriteIds = useCallback(async () => {
    const ids = await loadCatalogueFavoriteIds();
    setFavoriteIds(new Set(ids));
  }, []);

  const fetchProducts = useCallback(async (nextPage = 1, mode: "reset" | "append" | "refresh" = "reset") => {
    try {
      setError("");
      if (mode === "append") setLoadingMore(true);
      else if (mode === "refresh") setRefreshing(true);
      else setLoading(true);

      const result = await loadCatalogueFavoriteProducts({
        page: nextPage,
        limit: PAGE_LIMIT,
        search: search || undefined,
      });

      setProducts((current) => (mode === "append" ? [...current, ...result.products] : result.products));
      setTotal(result.total);
      setPage(result.page);
      setHasMore(result.page * result.limit < result.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal memuat favorit.");
    } finally {
      setLoading(false);
      setLoadingMore(false);
      setRefreshing(false);
    }
  }, [search]);

  useFocusEffect(
    useCallback(() => {
      refreshFavoriteIds().catch(() => undefined);
      fetchProducts(1, "refresh");
    }, [fetchProducts, refreshFavoriteIds]),
  );

  const submitSearch = () => {
    setSearch(searchDraft.trim());
  };

  const toggleFavorite = async (product: CatalogueProduct) => {
    const productId = getCatalogueProductId(product);
    if (!productId) return;
    const wasFavorite = favoriteIds.has(productId);
    setFavoriteIds((current) => {
      const next = new Set(current);
      if (wasFavorite) next.delete(productId);
      else next.add(productId);
      return next;
    });
    if (wasFavorite) {
      setProducts((current) => current.filter((item) => getCatalogueProductId(item) !== productId));
      setTotal((current) => Math.max(0, current - 1));
    } else {
      setProducts((current) => [product, ...current]);
      setTotal((current) => current + 1);
    }
    try {
      if (wasFavorite) await removeCatalogueFavorite(productId);
      else await addCatalogueFavorite(productId);
      await refreshFavoriteIds();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal memperbarui favorit.");
      await refreshFavoriteIds().catch(() => undefined);
      fetchProducts(1, "refresh");
    }
  };

  return (
    <View style={[styles.screen, { backgroundColor: theme.colors.background }]}>
      <AppHeader
        title="Favorit"
        leftIcon="arrow-back-outline"
        onLeftPress={() => router.back()}
        showThemeToggle={false}
        topInset={insets.top}
        titleStyle={theme.typography.titleSmall}
      />

      <View style={styles.searchWrap}>
        <View style={[styles.searchBox, { backgroundColor: theme.colors.inputBackground, borderColor: theme.colors.inputBorder }]}>
          <Ionicons name="search-outline" size={20} color={theme.colors.subtleText} />
          <TextInput
            value={searchDraft}
            onChangeText={setSearchDraft}
            onSubmitEditing={submitSearch}
            placeholder="Cari favorit..."
            placeholderTextColor={theme.colors.subtleText}
            returnKeyType="search"
            style={[theme.typography.body, styles.searchInput, { color: theme.colors.text }]}
          />
          {searchDraft ? (
            <Pressable onPress={() => { setSearchDraft(""); setSearch(""); }}>
              <Ionicons name="close-circle" size={20} color={theme.colors.subtleText} />
            </Pressable>
          ) : null}
        </View>
      </View>

      <View style={styles.summaryRow}>
        <Text style={[theme.typography.bodySmall, { color: theme.colors.subtleText }]}>Produk favorit</Text>
        <Text style={[theme.typography.labelSmall, { color: theme.colors.primary }]}>{total.toLocaleString("id-ID")} item</Text>
      </View>

      {error && !loading ? (
        <EmptyState
          icon="cloud-offline-outline"
          title="Favorit belum bisa dimuat"
          description={error}
          action={<PrimaryButton title="Coba Lagi" onPress={() => fetchProducts(1, "reset")} />}
        />
      ) : (
        <FlatList
          data={products}
          renderItem={({ item }) => (
            <ProductCard
              product={item}
              compact={isCompact}
              favorite={favoriteIds.has(getCatalogueProductId(item))}
              onPress={() => setSelected(item)}
              onToggleFavorite={() => toggleFavorite(item)}
            />
          )}
          keyExtractor={productKey}
          numColumns={2}
          contentContainerStyle={[styles.listContent, { paddingBottom: 110 + insets.bottom }]}
          columnWrapperStyle={styles.column}
          showsVerticalScrollIndicator={false}
          onEndReached={() => {
            if (hasMore && !loadingMore && !loading) fetchProducts(page + 1, "append");
          }}
          onEndReachedThreshold={0.25}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchProducts(1, "refresh")} tintColor={theme.colors.primary} colors={[theme.colors.primary]} />}
          ListEmptyComponent={loading ? (
            <View style={styles.loading}>
              <ActivityIndicator color={theme.colors.primary} />
              <Text style={[theme.typography.bodySmall, { color: theme.colors.subtleText }]}>Memuat favorit...</Text>
            </View>
          ) : (
            <EmptyState icon="heart-outline" title="Belum ada favorit" description="Produk yang ditandai favorit akan muncul di sini." />
          )}
          ListFooterComponent={loadingMore ? <ActivityIndicator color={theme.colors.primary} style={styles.footerLoader} /> : null}
        />
      )}

      <ProductDetailModal
        product={selected}
        favorite={selected ? favoriteIds.has(getCatalogueProductId(selected)) : false}
        onToggleFavorite={() => {
          if (selected) toggleFavorite(selected);
        }}
        onClose={() => setSelected(null)}
      />
    </View>
  );
}

function ProductCard({
  product,
  compact,
  favorite,
  onPress,
  onToggleFavorite,
}: {
  product: CatalogueProduct;
  compact: boolean;
  favorite: boolean;
  onPress: () => void;
  onToggleFavorite: () => void;
}) {
  const theme = useAppTheme();
  const [imageError, setImageError] = useState(false);
  const name = product.nama_barang || "-";
  const barcode = product.kode_barcode || product.kode_barang || "-";
  const outOfStock = Number(product.stock_on_hand ?? 0) <= 0;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.productCard,
        {
          backgroundColor: theme.colors.cardBackground,
          borderColor: theme.colors.cardBorder,
          opacity: pressed ? 0.82 : 1,
        },
        theme.elevation.level1,
      ]}
    >
      <View style={[styles.productImageBox, { backgroundColor: theme.colors.surfaceContainerLow }]}>
        {!imageError && barcode !== "-" ? (
          <Image source={{ uri: getCatalogueImageUrl(barcode) }} style={styles.productImage} resizeMode="cover" onError={() => setImageError(true)} />
        ) : (
          <Ionicons name="diamond-outline" size={34} color={theme.colors.subtleText} />
        )}
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={favorite ? "Hapus dari favorit" : "Tambah ke favorit"}
        onPress={(event) => {
          event.stopPropagation();
          onToggleFavorite();
        }}
        style={({ pressed }) => [
          styles.favoriteButton,
          {
            backgroundColor: theme.colors.cardBackground,
            borderColor: favorite ? theme.colors.warning : theme.colors.cardBorder,
            opacity: pressed ? 0.72 : 1,
          },
        ]}
      >
        <Ionicons name={favorite ? "heart" : "heart-outline"} size={18} color={favorite ? theme.colors.warning : theme.colors.subtleText} />
      </Pressable>
      {outOfStock ? (
        <View style={[styles.stockBadge, { backgroundColor: theme.colors.warningContainer }]}>
          <Text style={[theme.typography.labelSmall, { color: theme.colors.warning }]}>Stok Habis</Text>
        </View>
      ) : null}
      <View style={styles.productInfo}>
        <Text style={[theme.typography.labelSmall, { color: theme.colors.subtleText }]} numberOfLines={1}>{barcode}</Text>
        <Text style={[compact ? theme.typography.bodySmall : theme.typography.label, { color: theme.colors.text }]} numberOfLines={2}>{name}</Text>
        <Text style={[theme.typography.bodySmall, { color: theme.colors.primary }]} numberOfLines={1}>
          {(product.berat || 0).toLocaleString("id-ID")} Gr • {product.kadar_cetak || product.kode_group || "-"}
        </Text>
        <Text style={[theme.typography.labelSmall, { color: theme.colors.warning }]} numberOfLines={1}>
          {rupiah(product.harga_skrg || product.harga_jual)}
        </Text>
      </View>
    </Pressable>
  );
}

function ProductDetailModal({
  product,
  favorite,
  onToggleFavorite,
  onClose,
}: {
  product: CatalogueProduct | null;
  favorite: boolean;
  onToggleFavorite: () => void;
  onClose: () => void;
}) {
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();
  if (!product) return null;
  const barcode = product.kode_barcode || product.kode_barang || "";
  const rows = [
    ["Barcode", barcode || "-"],
    ["Group", product.kode_group || "-"],
    ["Dept", product.kode_dept || "-"],
    ["Toko", product.kode_toko || "-"],
    ["Gudang", product.kode_gudang || "-"],
    ["Berat", `${(product.berat || 0).toLocaleString("id-ID")} Gr`],
    ["Kadar", product.kadar_cetak || "-"],
    ["Stok", `${product.stock_on_hand ?? 0}`],
    ["Sumber", product.sumber || "-"],
  ];

  return (
    <Modal visible animationType="slide" onRequestClose={onClose}>
      <View style={[styles.detailScreen, { backgroundColor: theme.colors.background, paddingTop: insets.top }]}>
        <View style={[styles.detailHeader, { borderBottomColor: theme.colors.divider }]}>
          <Pressable accessibilityRole="button" style={styles.detailHeaderButton} onPress={onClose}>
            <Ionicons name="arrow-back-outline" size={24} color={theme.colors.primary} />
          </Pressable>
          <Text style={[theme.typography.titleSmall, { color: theme.colors.primary }]}>Detail Produk</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={favorite ? "Hapus dari favorit" : "Tambah ke favorit"}
            style={styles.detailHeaderButton}
            onPress={onToggleFavorite}
          >
            <Ionicons name={favorite ? "heart" : "heart-outline"} size={23} color={favorite ? theme.colors.warning : theme.colors.primary} />
          </Pressable>
        </View>
        <ScrollView contentContainerStyle={[styles.detailContent, { paddingBottom: insets.bottom + 24 }]}>
          <View style={[styles.detailImageBox, { backgroundColor: theme.colors.surfaceContainerLow }]}>
            {barcode ? <Image source={{ uri: getCatalogueImageUrl(barcode) }} style={styles.detailImage} resizeMode="cover" /> : <Ionicons name="diamond-outline" size={64} color={theme.colors.subtleText} />}
          </View>
          <Text style={[theme.typography.title, { color: theme.colors.text }]}>{product.nama_barang || "-"}</Text>
          <Text style={[theme.typography.titleSmall, { color: theme.colors.warning }]}>{rupiah(product.harga_skrg || product.harga_jual)}</Text>
          <CardContainer>
            {rows.map(([label, value]) => (
              <View key={label} style={[styles.detailRow, { borderBottomColor: theme.colors.divider }]}>
                <Text style={[theme.typography.bodySmall, { color: theme.colors.subtleText }]}>{label}</Text>
                <Text style={[theme.typography.label, styles.detailValue, { color: theme.colors.text }]}>{value}</Text>
              </View>
            ))}
          </CardContainer>
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  searchWrap: { flexDirection: "row", gap: 10, paddingHorizontal: 16, paddingTop: 14 },
  searchBox: { flex: 1, minHeight: 50, borderWidth: 1, borderRadius: 16, paddingHorizontal: 14, flexDirection: "row", alignItems: "center", gap: 8 },
  searchInput: { flex: 1, paddingVertical: 0 },
  summaryRow: { paddingHorizontal: 18, paddingTop: 10, paddingBottom: 8, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  listContent: { paddingHorizontal: 14, paddingTop: 4 },
  column: { gap: 12 },
  loading: { paddingTop: 80, alignItems: "center", gap: 12 },
  footerLoader: { paddingVertical: 18 },
  productCard: { width: "48%", borderWidth: 1, borderRadius: 18, overflow: "hidden", marginBottom: 12 },
  productImageBox: { aspectRatio: 1, alignItems: "center", justifyContent: "center" },
  productImage: { width: "100%", height: "100%" },
  favoriteButton: { position: "absolute", top: 10, right: 10, width: 32, height: 32, borderRadius: 16, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  stockBadge: { position: "absolute", left: 10, top: 12, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 },
  productInfo: { padding: 12, gap: 5 },
  detailScreen: { flex: 1 },
  detailHeader: { minHeight: 58, borderBottomWidth: 1, paddingHorizontal: 16, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  detailHeaderButton: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  detailContent: { padding: 16, gap: 16 },
  detailImageBox: { width: "100%", aspectRatio: 1.2, borderRadius: 20, overflow: "hidden", alignItems: "center", justifyContent: "center" },
  detailImage: { width: "100%", height: "100%" },
  detailRow: { flexDirection: "row", justifyContent: "space-between", gap: 12, borderBottomWidth: StyleSheet.hairlineWidth, paddingVertical: 10 },
  detailValue: { flex: 1, textAlign: "right" },
});

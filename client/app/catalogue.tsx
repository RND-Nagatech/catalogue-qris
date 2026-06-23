import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useMemo, useState } from "react";
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
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppHeader, CardContainer, EmptyState, PrimaryButton, SecondaryButton } from "../components/ui";
import {
  type CatalogueFilterOption,
  type CatalogueProduct,
  type CatalogueStoreOption,
  getCatalogueImageUrl,
  loadCatalogueFilters,
  loadCatalogueProducts,
} from "../lib/catalogueStore";
import { useAppTheme } from "../lib/theme";

type FilterState = {
  group?: string;
  dept?: string;
  toko?: string;
  storeId?: string;
};

const PAGE_LIMIT = 20;

function rupiah(value?: number) {
  return `Rp ${Math.max(0, Number(value || 0)).toLocaleString("id-ID")}`;
}

function productKey(product: CatalogueProduct, index: number) {
  return `${product.kode_barcode || product.kode_barang || "product"}-${product.sumber || "store"}-${index}`;
}

export default function CatalogueScreen() {
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [products, setProducts] = useState<CatalogueProduct[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [searchDraft, setSearchDraft] = useState("");
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<FilterState>({});
  const [filterOpen, setFilterOpen] = useState(false);
  const [selected, setSelected] = useState<CatalogueProduct | null>(null);
  const [groups, setGroups] = useState<CatalogueFilterOption[]>([]);
  const [depts, setDepts] = useState<CatalogueFilterOption[]>([]);
  const [baki, setBaki] = useState<CatalogueFilterOption[]>([]);
  const [stores, setStores] = useState<CatalogueStoreOption[]>([]);

  const isCompact = width < 380;
  const activeFilterCount = Object.values(filters).filter(Boolean).length;

  const fetchProducts = useCallback(async (nextPage = 1, mode: "reset" | "append" | "refresh" = "reset") => {
    try {
      setError("");
      if (mode === "append") setLoadingMore(true);
      else if (mode === "refresh") setRefreshing(true);
      else setLoading(true);

      const result = await loadCatalogueProducts({
        page: nextPage,
        limit: PAGE_LIMIT,
        search: search || undefined,
        ...filters,
      });

      setProducts((current) => (mode === "append" ? [...current, ...result.products] : result.products));
      setTotal(result.total);
      setPage(result.page);
      setHasMore(result.page * result.limit < result.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal memuat catalogue.");
    } finally {
      setLoading(false);
      setLoadingMore(false);
      setRefreshing(false);
    }
  }, [filters, search]);

  useEffect(() => {
    loadCatalogueFilters()
      .then((data) => {
        setGroups(data.groups);
        setDepts(data.depts);
        setBaki(data.baki);
        setStores(data.stores);
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    fetchProducts(1, "reset");
  }, [fetchProducts]);

  const submitSearch = () => {
    setSearch(searchDraft.trim());
  };

  const filterSummary = useMemo(() => {
    if (!activeFilterCount) return "Semua produk";
    return `${activeFilterCount} filter aktif`;
  }, [activeFilterCount]);

  const renderItem = ({ item, index }: { item: CatalogueProduct; index: number }) => (
    <ProductCard
      product={item}
      compact={isCompact}
      onPress={() => setSelected(item)}
    />
  );

  return (
    <View style={[styles.screen, { backgroundColor: theme.colors.background }]}>
      <AppHeader title="Catalogue" topInset={insets.top} />

      <View style={styles.searchWrap}>
        <View style={[styles.searchBox, { backgroundColor: theme.colors.inputBackground, borderColor: theme.colors.inputBorder }]}>
          <Ionicons name="search-outline" size={20} color={theme.colors.subtleText} />
          <TextInput
            value={searchDraft}
            onChangeText={setSearchDraft}
            onSubmitEditing={submitSearch}
            placeholder="Cari produk..."
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
        <Pressable
          style={[
            styles.filterButton,
            {
              backgroundColor: activeFilterCount ? theme.colors.primary : theme.colors.cardBackground,
              borderColor: activeFilterCount ? theme.colors.primary : theme.colors.cardBorder,
            },
          ]}
          onPress={() => setFilterOpen(true)}
        >
          <Ionicons name="options-outline" size={22} color={activeFilterCount ? theme.colors.onPrimary : theme.colors.primary} />
        </Pressable>
      </View>

      <View style={styles.summaryRow}>
        <Text style={[theme.typography.bodySmall, { color: theme.colors.subtleText }]}>{filterSummary}</Text>
        <Text style={[theme.typography.labelSmall, { color: theme.colors.primary }]}>{total.toLocaleString("id-ID")} item</Text>
      </View>

      {error && !loading ? (
        <EmptyState
          icon="cloud-offline-outline"
          title="Catalogue belum bisa dimuat"
          description={error}
          action={<PrimaryButton title="Coba Lagi" onPress={() => fetchProducts(1, "reset")} />}
        />
      ) : (
        <FlatList
          data={products}
          renderItem={renderItem}
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
              <Text style={[theme.typography.bodySmall, { color: theme.colors.subtleText }]}>Memuat catalogue...</Text>
            </View>
          ) : (
            <EmptyState icon="diamond-outline" title="Produk tidak ditemukan" description="Coba kata kunci atau filter lain." />
          )}
          ListFooterComponent={loadingMore ? <ActivityIndicator color={theme.colors.primary} style={styles.footerLoader} /> : null}
        />
      )}

      <FilterModal
        visible={filterOpen}
        filters={filters}
        groups={groups}
        depts={depts}
        baki={baki}
        stores={stores}
        onClose={() => setFilterOpen(false)}
        onApply={(next) => {
          setFilters(next);
          setFilterOpen(false);
        }}
      />

      <ProductDetailModal product={selected} onClose={() => setSelected(null)} />
    </View>
  );
}

function ProductCard({ product, compact, onPress }: { product: CatalogueProduct; compact: boolean; onPress: () => void }) {
  const theme = useAppTheme();
  const [imageError, setImageError] = useState(false);
  const name = product.nama_barang || "-";
  const barcode = product.kode_barcode || product.kode_barang || "-";

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

function FilterModal({
  visible,
  filters,
  groups,
  depts,
  baki,
  stores,
  onClose,
  onApply,
}: {
  visible: boolean;
  filters: FilterState;
  groups: CatalogueFilterOption[];
  depts: CatalogueFilterOption[];
  baki: CatalogueFilterOption[];
  stores: CatalogueStoreOption[];
  onClose: () => void;
  onApply: (filters: FilterState) => void;
}) {
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();
  const [draft, setDraft] = useState<FilterState>(filters);

  useEffect(() => {
    if (visible) setDraft(filters);
  }, [filters, visible]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={[styles.modalBackdrop, { backgroundColor: theme.colors.scrim }]}>
        <View style={[styles.sheet, { backgroundColor: theme.colors.cardBackground, paddingBottom: insets.bottom + 16 }]}>
          <View style={styles.sheetHeader}>
            <Text style={[theme.typography.titleSmall, { color: theme.colors.text }]}>Filter Catalogue</Text>
            <Pressable onPress={onClose}><Ionicons name="close" size={24} color={theme.colors.text} /></Pressable>
          </View>
          <ScrollView showsVerticalScrollIndicator={false}>
            <OptionGroup title="Toko" value={draft.storeId} options={stores.map((store) => ({ code: store.id, name: store.name }))} onChange={(value) => setDraft((current) => ({ ...current, storeId: value }))} />
            <OptionGroup title="Group" value={draft.group} options={groups} onChange={(value) => setDraft((current) => ({ ...current, group: value }))} />
            <OptionGroup title="Jenis" value={draft.dept} options={depts} onChange={(value) => setDraft((current) => ({ ...current, dept: value }))} />
            <OptionGroup title="Baki" value={draft.toko} options={baki} onChange={(value) => setDraft((current) => ({ ...current, toko: value }))} />
          </ScrollView>
          <View style={styles.sheetActions}>
            <SecondaryButton title="Reset" onPress={() => setDraft({})} style={{ flex: 1 }} />
            <PrimaryButton title="Terapkan" onPress={() => onApply(draft)} style={{ flex: 1 }} />
          </View>
        </View>
      </View>
    </Modal>
  );
}

function OptionGroup({ title, value, options, onChange }: { title: string; value?: string; options: CatalogueFilterOption[]; onChange: (value?: string) => void }) {
  const theme = useAppTheme();
  return (
    <View style={styles.optionGroup}>
      <Text style={[theme.typography.labelCaps, { color: theme.colors.subtleText }]}>{title}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.optionRow}>
        <Pressable
          onPress={() => onChange(undefined)}
          style={[styles.chip, { borderColor: !value ? theme.colors.primary : theme.colors.cardBorder, backgroundColor: !value ? theme.colors.successContainer : theme.colors.surfaceContainerLow }]}
        >
          <Text style={[theme.typography.labelSmall, { color: !value ? theme.colors.primary : theme.colors.muted }]}>Semua</Text>
        </Pressable>
        {options.map((option) => {
          const active = value === option.code;
          return (
            <Pressable
              key={`${title}-${option.code}`}
              onPress={() => onChange(option.code)}
              style={[styles.chip, { borderColor: active ? theme.colors.primary : theme.colors.cardBorder, backgroundColor: active ? theme.colors.successContainer : theme.colors.surfaceContainerLow }]}
            >
              <Text style={[theme.typography.labelSmall, { color: active ? theme.colors.primary : theme.colors.muted }]} numberOfLines={1}>
                {option.name || option.code}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

function ProductDetailModal({ product, onClose }: { product: CatalogueProduct | null; onClose: () => void }) {
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
          <Pressable onPress={onClose}><Ionicons name="close" size={26} color={theme.colors.primary} /></Pressable>
          <Text style={[theme.typography.titleSmall, { color: theme.colors.primary }]}>Detail Produk</Text>
          <View style={{ width: 26 }} />
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
  filterButton: { width: 50, height: 50, borderRadius: 16, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  summaryRow: { paddingHorizontal: 18, paddingTop: 10, paddingBottom: 8, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  listContent: { paddingHorizontal: 14, paddingTop: 4 },
  column: { gap: 12 },
  loading: { paddingTop: 80, alignItems: "center", gap: 12 },
  footerLoader: { paddingVertical: 18 },
  productCard: { flex: 1, borderWidth: 1, borderRadius: 18, overflow: "hidden", marginHorizontal: 4, marginBottom: 12 },
  productImageBox: { aspectRatio: 1, alignItems: "center", justifyContent: "center" },
  productImage: { width: "100%", height: "100%" },
  productInfo: { padding: 12, gap: 5 },
  modalBackdrop: { flex: 1, justifyContent: "flex-end" },
  sheet: { maxHeight: "82%", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 16 },
  sheetHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingBottom: 14 },
  optionGroup: { marginBottom: 18, gap: 8 },
  optionRow: { gap: 8, paddingRight: 16 },
  chip: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 9, maxWidth: 180 },
  sheetActions: { flexDirection: "row", gap: 12, paddingTop: 10 },
  detailScreen: { flex: 1 },
  detailHeader: { minHeight: 58, borderBottomWidth: 1, paddingHorizontal: 16, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  detailContent: { padding: 16, gap: 16 },
  detailImageBox: { width: "100%", aspectRatio: 1.2, borderRadius: 20, overflow: "hidden", alignItems: "center", justifyContent: "center" },
  detailImage: { width: "100%", height: "100%" },
  detailRow: { flexDirection: "row", justifyContent: "space-between", gap: 12, borderBottomWidth: StyleSheet.hairlineWidth, paddingVertical: 10 },
  detailValue: { flex: 1, textAlign: "right" },
});

import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
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
import { useFocusEffect, useRouter } from "expo-router";
import { AppHeader, CardContainer, EmptyState, PrimaryButton, SecondaryButton } from "../components/ui";
import {
  type CatalogueFilterOption,
  type CatalogueProduct,
  type CatalogueStoreOption,
  addCatalogueFavorite,
  getCatalogueImageUrl,
  getCatalogueProductId,
  loadCatalogueFavoriteIds,
  loadCatalogueFilters,
  loadCatalogueProducts,
  removeCatalogueFavorite,
} from "../lib/catalogueStore";
import { useAppTheme } from "../lib/theme";

type FilterState = {
  group?: string;
  dept?: string;
  toko?: string;
  storeId?: string;
};

type FilterTab = "group" | "dept" | "baki" | "store";

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
  const router = useRouter();
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
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());

  const isCompact = width < 380;
  const activeFilterCount = Object.values(filters).filter(Boolean).length;
  const listTitle = search.trim() || activeFilterCount ? "Hasil Pencarian" : "Semua Produk";

  const refreshFavoriteIds = useCallback(async () => {
    try {
      const ids = await loadCatalogueFavoriteIds();
      setFavoriteIds(new Set(ids));
    } catch {
      // Favorit tidak boleh mengganggu catalogue utama.
    }
  }, []);

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

  useFocusEffect(
    useCallback(() => {
      refreshFavoriteIds();
      fetchProducts(1, "refresh");
    }, [fetchProducts, refreshFavoriteIds]),
  );

  const submitSearch = () => {
    setSearch(searchDraft.trim());
  };

  const filterSummary = useMemo(() => {
    if (!activeFilterCount) return "Semua produk";
    return `${activeFilterCount} filter aktif`;
  }, [activeFilterCount]);

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
    try {
      if (wasFavorite) await removeCatalogueFavorite(productId);
      else await addCatalogueFavorite(productId);
      await refreshFavoriteIds();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal memperbarui favorit.");
      await refreshFavoriteIds();
    }
  };

  const renderItem = ({ item, index }: { item: CatalogueProduct; index: number }) => (
    <ProductCard
      product={item}
      compact={isCompact}
      favorite={favoriteIds.has(getCatalogueProductId(item))}
      onPress={() => setSelected(item)}
      onToggleFavorite={() => toggleFavorite(item)}
    />
  );

  return (
    <View style={[styles.screen, { backgroundColor: theme.colors.background }]}>
      <AppHeader
        title="Katalog Produk"
        topInset={insets.top}
        rightIcon="heart-outline"
        rightBadge={favoriteIds.size ? favoriteIds.size : undefined}
        onRightPress={() => router.push("/favorites")}
      />

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

      {activeFilterCount ? (
        <View style={styles.summaryRow}>
          <Text style={[theme.typography.bodySmall, { color: theme.colors.subtleText }]}>{filterSummary}</Text>
        </View>
      ) : null}

      {error && !loading ? (
        <EmptyState
          icon="cloud-offline-outline"
          title="Katalog belum bisa dimuat"
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
          ListHeaderComponent={(
            <View style={styles.listHeader}>
              <Text style={[theme.typography.label, { color: theme.colors.primary }]}>{listTitle}</Text>
              <Text style={[theme.typography.bodySmall, { color: theme.colors.subtleText }]}>{total.toLocaleString("id-ID")} item</Text>
            </View>
          )}
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
            <EmptyState
              icon="diamond-outline"
              title="Produk tidak ditemukan"
              description="Coba kata kunci atau filter lain."
            />
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
        <Ionicons name={favorite ? "heart" : "heart-outline"} size={20} color={favorite ? theme.colors.warning : theme.colors.subtleText} />
      </Pressable>
      <View style={styles.productInfo}>
        <Text style={[theme.typography.labelSmall, styles.productCategory, { color: theme.colors.outline }]} numberOfLines={1}>
          {product.kode_group || "-"} • {product.sumber || "-"}
        </Text>
        <Text style={[compact ? theme.typography.bodySmall : theme.typography.bodyStrong, styles.productName, { color: theme.colors.text }]} numberOfLines={2}>{name}</Text>
        <View style={styles.productAttrs}>
          <View style={[styles.attrBadge, { backgroundColor: theme.colors.surfaceContainer }]}>
            <Ionicons name="scale-outline" size={12} color={theme.colors.primary} />
            <Text style={[theme.typography.labelSmall, { color: theme.colors.primary }]}>{(product.berat || 0).toLocaleString("id-ID")}g</Text>
          </View>
          <View style={[styles.attrBadge, { backgroundColor: theme.colors.surfaceContainer }]}>
            <Ionicons name="shield-checkmark-outline" size={12} color={theme.colors.primary} />
            <Text style={[theme.typography.labelSmall, { color: theme.colors.primary }]}>{product.kadar_cetak || product.kode_group || "-"}</Text>
          </View>
        </View>
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
  const [activeTab, setActiveTab] = useState<FilterTab>("group");
  const [filterSearch, setFilterSearch] = useState("");

  useEffect(() => {
    if (visible) {
      setDraft(filters);
      setFilterSearch("");
    }
  }, [filters, visible]);

  const tabs = useMemo(() => [
    { key: "group" as const, label: "Group", value: draft.group, options: groups },
    { key: "dept" as const, label: "Dept", value: draft.dept, options: depts },
    { key: "baki" as const, label: "Baki", value: draft.toko, options: baki },
    { key: "store" as const, label: "Toko", value: draft.storeId, options: stores.map((store) => ({ code: store.id, name: store.name })) },
  ], [baki, depts, draft.dept, draft.group, draft.storeId, draft.toko, groups, stores]);
  const currentTab = tabs.find((tab) => tab.key === activeTab) ?? tabs[0];
  const filteredOptions = useMemo(() => {
    const keyword = filterSearch.trim().toLowerCase();
    if (!keyword) return currentTab.options;
    return currentTab.options.filter((option) =>
      `${option.name} ${option.code}`.toLowerCase().includes(keyword)
    );
  }, [currentTab.options, filterSearch]);

  const selectFilter = (value?: string) => {
    if (activeTab === "group") setDraft((current) => ({ ...current, group: value }));
    if (activeTab === "dept") setDraft((current) => ({ ...current, dept: value }));
    if (activeTab === "baki") setDraft((current) => ({ ...current, toko: value }));
    if (activeTab === "store") setDraft((current) => ({ ...current, storeId: value }));
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={[styles.modalKeyboard, { backgroundColor: theme.colors.scrim }]}
      >
      <View style={styles.modalBackdrop}>
        <View style={[styles.sheet, { backgroundColor: theme.colors.cardBackground, paddingBottom: insets.bottom + 16 }]}>
          <View style={styles.sheetHeader}>
            <Text style={[styles.sheetTitle, { color: theme.colors.primary }]}>Filter Produk</Text>
            <Pressable onPress={onClose}><Ionicons name="close" size={24} color={theme.colors.text} /></Pressable>
          </View>
          <View style={styles.filterTabs}>
            {tabs.map((tab) => {
              const active = activeTab === tab.key;
              return (
                <Pressable
                  key={tab.key}
                  style={[styles.filterTab, { borderColor: active ? theme.colors.primaryContainer : theme.colors.outlineVariant, backgroundColor: active ? theme.colors.primaryContainer : theme.colors.cardBackground }]}
                  onPress={() => {
                    setActiveTab(tab.key);
                    setFilterSearch("");
                  }}
                >
                  <Text style={[styles.filterTabText, { color: active ? theme.colors.onPrimary : theme.colors.text }]}>{tab.label}</Text>
                </Pressable>
              );
            })}
          </View>
          <View style={[styles.filterSearchBox, { backgroundColor: theme.colors.surfaceContainer, borderColor: theme.colors.outlineVariant }]}>
            <Ionicons name="search-outline" size={18} color={theme.colors.outline} />
            <TextInput
              value={filterSearch}
              onChangeText={setFilterSearch}
              placeholder={`Cari ${currentTab.label.toLowerCase()}...`}
              placeholderTextColor={theme.colors.outline}
              style={[theme.typography.body, styles.filterSearchInput, { color: theme.colors.text }]}
            />
            {filterSearch ? (
              <Pressable onPress={() => setFilterSearch("")}>
                <Ionicons name="close-circle" size={18} color={theme.colors.outline} />
              </Pressable>
            ) : null}
          </View>
          <ScrollView showsVerticalScrollIndicator={false} style={styles.filterOptionList} keyboardShouldPersistTaps="handled">
            <Pressable
              onPress={() => selectFilter(undefined)}
              style={[styles.filterOption, { backgroundColor: !currentTab.value ? theme.colors.surfaceContainerLow : theme.colors.cardBackground }]}
            >
              <Ionicons name={!currentTab.value ? "radio-button-on" : "radio-button-off"} size={20} color={!currentTab.value ? theme.colors.primary : theme.colors.outlineVariant} />
              <Text style={[styles.filterOptionText, { color: !currentTab.value ? theme.colors.primary : theme.colors.text }]}>Semua</Text>
            </Pressable>
            {filteredOptions.map((option, index) => {
              const active = currentTab.value === option.code;
              return (
                <Pressable
                  key={`${activeTab}-${option.code || option.name || "option"}-${index}`}
                  onPress={() => selectFilter(option.code)}
                  style={[styles.filterOption, { backgroundColor: active ? theme.colors.surfaceContainerLow : theme.colors.cardBackground }]}
                >
                  <Ionicons name={active ? "radio-button-on" : "radio-button-off"} size={20} color={active ? theme.colors.primary : theme.colors.outlineVariant} />
                  <Text style={[styles.filterOptionText, { color: active ? theme.colors.primary : theme.colors.text }]} numberOfLines={1}>{option.name || option.code}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
          <View style={styles.sheetActions}>
            <SecondaryButton title="Reset" onPress={() => setDraft({})} style={{ flex: 1 }} />
            <PrimaryButton title="Terapkan" onPress={() => onApply(draft)} style={{ flex: 1 }} />
          </View>
        </View>
      </View>
      </KeyboardAvoidingView>
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
        {options.map((option, index) => {
          const active = value === option.code;
          return (
            <Pressable
              key={`${title}-${option.code || option.name || "option"}-${index}`}
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
  searchWrap: { flexDirection: "row", gap: 8, paddingHorizontal: 20, paddingTop: 14, paddingBottom: 16 },
  searchBox: { flex: 1, minHeight: 48, borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, flexDirection: "row", alignItems: "center", gap: 8 },
  searchInput: { flex: 1, paddingVertical: 0 },
  filterButton: { width: 48, height: 48, borderRadius: 12, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  summaryRow: { paddingHorizontal: 20, paddingBottom: 8, flexDirection: "row", alignItems: "center" },
  listContent: { paddingHorizontal: 20, paddingTop: 4 },
  listHeader: { width: "100%", paddingBottom: 12, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  column: { justifyContent: "space-between" },
  loading: { paddingTop: 80, alignItems: "center", gap: 12 },
  footerLoader: { paddingVertical: 18 },
  productCard: { width: "48%", borderRadius: 12, overflow: "hidden", marginBottom: 16 },
  productImageBox: { aspectRatio: 720 / 645, alignItems: "center", justifyContent: "center" },
  productImage: { width: "100%", height: "100%" },
  favoriteButton: { position: "absolute", top: 8, right: 8, width: 34, height: 34, borderRadius: 17, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  stockBadge: { position: "absolute", left: 10, top: 12, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 },
  productInfo: { padding: 14, gap: 8, alignItems: "center" },
  productCategory: { textAlign: "center", textTransform: "uppercase" },
  productName: { textAlign: "center", lineHeight: 20 },
  productAttrs: { flexDirection: "row", alignItems: "center", gap: 8, justifyContent: "center" },
  attrBadge: { flexDirection: "row", alignItems: "center", gap: 3, borderRadius: 4, paddingHorizontal: 8, paddingVertical: 3 },
  modalKeyboard: { flex: 1 },
  modalBackdrop: { flex: 1, justifyContent: "flex-end", paddingTop: 48 },
  sheet: { maxHeight: "90%", borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 20, paddingTop: 20 },
  sheetHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingBottom: 14 },
  sheetTitle: { fontSize: 24, lineHeight: 32, fontWeight: "800" },
  filterTabs: { flexDirection: "row", gap: 8, paddingBottom: 16 },
  filterTab: { minHeight: 40, borderRadius: 999, borderWidth: 1, paddingHorizontal: 16, alignItems: "center", justifyContent: "center" },
  filterTabText: { fontSize: 14, lineHeight: 20, fontWeight: "800" },
  filterSearchBox: { minHeight: 42, borderRadius: 8, borderWidth: 1, flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 14 },
  filterSearchInput: { flex: 1, paddingVertical: 0 },
  filterOptionList: { marginTop: 16, maxHeight: 360 },
  filterOption: { minHeight: 52, borderRadius: 8, flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 10, marginBottom: 8 },
  filterOptionText: { flex: 1, fontSize: 14, lineHeight: 20, fontWeight: "800" },
  optionGroup: { marginBottom: 18, gap: 8 },
  optionRow: { gap: 8, paddingRight: 16 },
  chip: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 9, maxWidth: 180 },
  sheetActions: { flexDirection: "row", gap: 16, paddingTop: 16, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: "#E4E2DE" },
  detailScreen: { flex: 1 },
  detailHeader: { minHeight: 58, borderBottomWidth: 1, paddingHorizontal: 16, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  detailHeaderButton: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  detailContent: { padding: 16, gap: 16 },
  detailImageBox: { width: "100%", aspectRatio: 1.2, borderRadius: 20, overflow: "hidden", alignItems: "center", justifyContent: "center" },
  detailImage: { width: "100%", height: "100%" },
  detailRow: { flexDirection: "row", justifyContent: "space-between", gap: 12, borderBottomWidth: StyleSheet.hairlineWidth, paddingVertical: 10 },
  detailValue: { flex: 1, textAlign: "right" },
});

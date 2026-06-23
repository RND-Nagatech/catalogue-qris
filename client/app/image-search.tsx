import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppHeader, EmptyState, PrimaryButton, SecondaryButton } from "../components/ui";
import { type CatalogueProduct, getCatalogueImageUrl, searchCatalogueByImage } from "../lib/catalogueStore";
import { useAppTheme } from "../lib/theme";

function rupiah(value?: number) {
  return `Rp ${Math.max(0, Number(value || 0)).toLocaleString("id-ID")}`;
}

export default function ImageSearchScreen() {
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();
  const [imageUri, setImageUri] = useState("");
  const [results, setResults] = useState<CatalogueProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [searched, setSearched] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const pickAndSearch = async (source: "camera" | "gallery") => {
    try {
      setError("");
      const permission = source === "camera"
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        setError(source === "camera" ? "Izin kamera diperlukan." : "Izin galeri diperlukan.");
        return;
      }

      const result = source === "camera"
        ? await ImagePicker.launchCameraAsync({ mediaTypes: ["images"], quality: 0.82 })
        : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.82 });

      if (result.canceled || !result.assets?.[0]?.uri) return;
      await runSearch(result.assets[0].uri);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal memilih gambar.");
      setLoading(false);
    }
  };

  const runSearch = async (uri = imageUri, mode: "normal" | "refresh" = "normal") => {
    if (!uri) return;
    try {
      if (mode === "refresh") setRefreshing(true);
      else setLoading(true);
      setError("");
      setImageUri(uri);
      setSearched(true);
      const data = await searchCatalogueByImage(uri, 20);
      setResults(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal mencari produk dari gambar.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  return (
    <View style={[styles.screen, { backgroundColor: theme.colors.background }]}>
      <AppHeader title="Search Image" topInset={insets.top} />

      {!searched ? (
        <View style={styles.hero}>
          <View style={[styles.heroIcon, { backgroundColor: theme.colors.successContainer }]}>
            <Ionicons name="camera-outline" size={56} color={theme.colors.primary} />
          </View>
          <Text style={[theme.typography.title, styles.heroTitle, { color: theme.colors.text }]}>Cari Produk dari Gambar</Text>
          <Text style={[theme.typography.body, styles.heroText, { color: theme.colors.subtleText }]}>
            Ambil foto atau pilih gambar perhiasan untuk mencari produk yang mirip di catalogue.
          </Text>
          <View style={styles.actions}>
            <PrimaryButton title="Ambil Foto" icon="camera-outline" onPress={() => pickAndSearch("camera")} fullWidth />
            <SecondaryButton title="Pilih dari Galeri" icon="images-outline" onPress={() => pickAndSearch("gallery")} fullWidth />
          </View>
          {error ? <Text style={[theme.typography.bodySmall, styles.errorText, { color: theme.colors.error }]}>{error}</Text> : null}
        </View>
      ) : loading ? (
        <View style={styles.loading}>
          {imageUri ? <Image source={{ uri: imageUri }} style={[styles.preview, { backgroundColor: theme.colors.surfaceContainerLow }]} resizeMode="cover" /> : null}
          <ActivityIndicator color={theme.colors.primary} size="large" />
          <Text style={[theme.typography.bodySmall, { color: theme.colors.subtleText }]}>Menganalisis gambar...</Text>
        </View>
      ) : (
        <FlatList
          data={results}
          keyExtractor={(item, index) => `${item.kode_barcode || item.kode_barang || "result"}-${index}`}
          contentContainerStyle={[styles.resultList, { paddingBottom: 110 + insets.bottom }]}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => runSearch(imageUri, "refresh")} tintColor={theme.colors.primary} colors={[theme.colors.primary]} />}
          ListHeaderComponent={(
            <View style={styles.resultHeader}>
              <Image source={{ uri: imageUri }} style={[styles.resultImage, { backgroundColor: theme.colors.surfaceContainerLow, borderColor: theme.colors.cardBorder }]} resizeMode="cover" />
              <Text style={[theme.typography.titleSmall, { color: theme.colors.text }]}>
                {results.length ? `${results.length} Produk Mirip` : "Tidak ada hasil"}
              </Text>
              <View style={styles.resultActions}>
                <SecondaryButton title="Galeri" icon="images-outline" onPress={() => pickAndSearch("gallery")} style={{ flex: 1 }} />
                <PrimaryButton title="Kamera" icon="camera-outline" onPress={() => pickAndSearch("camera")} style={{ flex: 1 }} />
              </View>
              {error ? <Text style={[theme.typography.bodySmall, styles.errorText, { color: theme.colors.error }]}>{error}</Text> : null}
            </View>
          )}
          ListEmptyComponent={<EmptyState icon="search-outline" title="Tidak Ditemukan" description="Coba gambar lain dengan produk yang lebih jelas." />}
          renderItem={({ item }) => <SearchResultCard product={item} />}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

function SearchResultCard({ product }: { product: CatalogueProduct }) {
  const theme = useAppTheme();
  const [imageError, setImageError] = useState(false);
  const barcode = product.kode_barcode || product.kode_barang || "";
  return (
    <View style={[styles.resultCard, { backgroundColor: theme.colors.cardBackground, borderColor: theme.colors.cardBorder }, theme.elevation.level1]}>
      <View style={[styles.resultThumb, { backgroundColor: theme.colors.surfaceContainerLow }]}>
        {!imageError && barcode ? (
          <Image source={{ uri: getCatalogueImageUrl(barcode) }} style={styles.resultThumbImage} resizeMode="cover" onError={() => setImageError(true)} />
        ) : (
          <Ionicons name="diamond-outline" size={28} color={theme.colors.subtleText} />
        )}
      </View>
      <View style={styles.resultInfo}>
        <Text style={[theme.typography.labelSmall, { color: theme.colors.subtleText }]} numberOfLines={1}>{barcode || "-"}</Text>
        <Text style={[theme.typography.label, { color: theme.colors.text }]} numberOfLines={2}>{product.nama_barang || "-"}</Text>
        <Text style={[theme.typography.bodySmall, { color: theme.colors.primary }]} numberOfLines={1}>
          {(product.berat || 0).toLocaleString("id-ID")} Gr • {product.kode_group || product.kadar_cetak || "-"}
        </Text>
      </View>
      <View style={styles.resultPrice}>
        <Text style={[theme.typography.label, { color: theme.colors.warning }]} numberOfLines={1}>{rupiah(product.harga_skrg || product.harga_jual)}</Text>
        {product._searchScore !== undefined ? (
          <Text style={[theme.typography.labelSmall, { color: theme.colors.subtleText }]}>{Math.round(product._searchScore * 100)}%</Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  hero: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 24, paddingBottom: 90 },
  heroIcon: { width: 118, height: 118, borderRadius: 40, alignItems: "center", justifyContent: "center", marginBottom: 22 },
  heroTitle: { textAlign: "center", marginBottom: 8 },
  heroText: { textAlign: "center", marginBottom: 28 },
  actions: { alignSelf: "stretch", gap: 12 },
  errorText: { marginTop: 14, textAlign: "center" },
  loading: { flex: 1, alignItems: "center", justifyContent: "center", gap: 18, paddingHorizontal: 24, paddingBottom: 90 },
  preview: { width: "82%", aspectRatio: 1, borderRadius: 24 },
  resultList: { padding: 16, gap: 12 },
  resultHeader: { alignItems: "center", gap: 12, paddingBottom: 14 },
  resultImage: { width: 116, height: 116, borderRadius: 24, borderWidth: 1 },
  resultActions: { flexDirection: "row", gap: 12, alignSelf: "stretch" },
  resultCard: { borderWidth: 1, borderRadius: 18, padding: 12, marginBottom: 12, flexDirection: "row", gap: 12, alignItems: "center" },
  resultThumb: { width: 72, height: 72, borderRadius: 16, overflow: "hidden", alignItems: "center", justifyContent: "center" },
  resultThumbImage: { width: "100%", height: "100%" },
  resultInfo: { flex: 1, gap: 4 },
  resultPrice: { alignItems: "flex-end", gap: 4, maxWidth: 105 },
});

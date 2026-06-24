import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { EmptyState, PrimaryButton, SecondaryButton } from "../components/ui";
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
  const [webCameraOpen, setWebCameraOpen] = useState(false);
  const searchRunRef = useRef(0);

  const resetSearchState = () => {
    searchRunRef.current += 1;
    setImageUri("");
    setResults([]);
    setLoading(false);
    setError("");
    setSearched(false);
    setRefreshing(false);
    setWebCameraOpen(false);
  };

  const confirmResetSearch = () => {
    Alert.alert(
      "Reset pencarian?",
      "Gambar dan hasil pencarian saat ini akan dihapus.",
      [
        { text: "Batal", style: "cancel" },
        { text: "Reset", style: "destructive", onPress: resetSearchState },
      ]
    );
  };

  const pickAndSearch = async (source: "camera" | "gallery") => {
    try {
      setError("");
      if (source === "camera" && Platform.OS === "web") {
        setWebCameraOpen(true);
        return;
      }

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
    const searchRun = ++searchRunRef.current;
    try {
      if (mode === "refresh") setRefreshing(true);
      else setLoading(true);
      setError("");
      setImageUri(uri);
      setSearched(true);
      const data = await searchCatalogueByImage(uri, 20);
      if (searchRun !== searchRunRef.current) return;
      setResults(data);
    } catch (err) {
      if (searchRun !== searchRunRef.current) return;
      setError(err instanceof Error ? err.message : "Gagal mencari produk dari gambar.");
    } finally {
      if (searchRun !== searchRunRef.current) return;
      setLoading(false);
      setRefreshing(false);
    }
  };

  return (
    <View style={[styles.screen, { backgroundColor: theme.colors.background }]}>
      <ImageSearchHeader topInset={insets.top} />

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
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Reset pencarian"
                  onPress={confirmResetSearch}
                  style={({ pressed }) => [
                    styles.resetIconButton,
                    {
                      borderColor: theme.colors.error,
                      backgroundColor: pressed ? theme.colors.errorContainer : theme.colors.surfaceContainerLowest,
                    },
                  ]}
                >
                  <Ionicons name="refresh-outline" size={22} color={theme.colors.error} />
                </Pressable>
              </View>
              {error ? <Text style={[theme.typography.bodySmall, styles.errorText, { color: theme.colors.error }]}>{error}</Text> : null}
            </View>
          )}
          ListEmptyComponent={<EmptyState icon="search-outline" title="Tidak Ditemukan" description="Coba gambar lain dengan produk yang lebih jelas." />}
          renderItem={({ item }) => <SearchResultCard product={item} />}
          showsVerticalScrollIndicator={false}
        />
      )}
      <WebCameraModal
        visible={webCameraOpen}
        onClose={() => setWebCameraOpen(false)}
        onCapture={(uri) => {
          setWebCameraOpen(false);
          runSearch(uri);
        }}
        onError={setError}
      />
    </View>
  );
}

function ImageSearchHeader({ topInset }: { topInset: number }) {
  const theme = useAppTheme();

  return (
    <View
      style={[
        styles.searchHeader,
        {
          backgroundColor: theme.colors.surface,
          borderBottomColor: theme.colors.divider,
          paddingTop: topInset,
        },
      ]}
    >
      <Pressable accessibilityRole="button" style={styles.searchHeaderIconButton}>
        <Ionicons name="menu-outline" size={24} color={theme.colors.primary} />
      </Pressable>
      <Text style={[theme.typography.title, styles.searchHeaderTitle, { color: theme.colors.primary }]}>Image Search</Text>
      <Pressable accessibilityRole="button" style={styles.searchHeaderIconButton} onPress={theme.toggleTheme}>
        <Ionicons name={theme.isDark ? "sunny-outline" : "moon-outline"} size={23} color={theme.colors.primary} />
      </Pressable>
    </View>
  );
}

function WebCameraModal({
  visible,
  onClose,
  onCapture,
  onError,
}: {
  visible: boolean;
  onClose: () => void;
  onCapture: (uri: string) => void;
  onError: (message: string) => void;
}) {
  const theme = useAppTheme();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    if (!visible || Platform.OS !== "web") return;

    let mounted = true;

    async function startCamera() {
      try {
        if (!navigator.mediaDevices?.getUserMedia) {
          onError("Kamera browser tidak tersedia. Gunakan browser yang mendukung kamera atau buka aplikasi di perangkat mobile.");
          onClose();
          return;
        }

        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" } },
          audio: false,
        });
        if (!mounted) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
      } catch (err) {
        onError(err instanceof Error ? err.message : "Kamera tidak bisa dibuka.");
        onClose();
      }
    }

    startCamera();

    return () => {
      mounted = false;
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    };
  }, [onClose, onError, visible]);

  const capture = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    const width = video.videoWidth || 1280;
    const height = video.videoHeight || 720;
    canvas.width = width;
    canvas.height = height;
    canvas.getContext("2d")?.drawImage(video, 0, 0, width, height);
    canvas.toBlob((blob) => {
      if (!blob) {
        onError("Gagal mengambil gambar dari kamera.");
        return;
      }
      onCapture(URL.createObjectURL(blob));
    }, "image/jpeg", 0.82);
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={[styles.cameraBackdrop, { backgroundColor: theme.colors.scrim }]}>
        <View style={[styles.cameraPanel, { backgroundColor: theme.colors.cardBackground }]}>
          <View style={styles.cameraHeader}>
            <Text style={[theme.typography.titleSmall, { color: theme.colors.text }]}>Ambil Foto</Text>
            <Pressable onPress={onClose}><Ionicons name="close" size={24} color={theme.colors.text} /></Pressable>
          </View>
          <View style={[styles.webCameraPreview, { backgroundColor: theme.colors.surfaceContainerLow }]}>
            {React.createElement("video", {
              ref: videoRef,
              playsInline: true,
              muted: true,
              style: { width: "100%", height: "100%", objectFit: "cover" },
            })}
            {React.createElement("canvas", { ref: canvasRef, style: { display: "none" } })}
          </View>
          <View style={styles.cameraActions}>
            <SecondaryButton title="Batal" onPress={onClose} style={{ flex: 1 }} />
            <PrimaryButton title="Gunakan Foto" icon="camera-outline" onPress={capture} style={{ flex: 1 }} />
          </View>
        </View>
      </View>
    </Modal>
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
  searchHeader: { minHeight: 64, borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: "row", alignItems: "center", paddingHorizontal: 16 },
  searchHeaderTitle: { flex: 1, fontSize: 22, lineHeight: 30 },
  searchHeaderIconButton: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
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
  resetIconButton: { width: 52, minHeight: 52, borderWidth: 1, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  resultCard: { borderWidth: 1, borderRadius: 18, padding: 12, marginBottom: 12, flexDirection: "row", gap: 12, alignItems: "center" },
  resultThumb: { width: 72, height: 72, borderRadius: 16, overflow: "hidden", alignItems: "center", justifyContent: "center" },
  resultThumbImage: { width: "100%", height: "100%" },
  resultInfo: { flex: 1, gap: 4 },
  resultPrice: { alignItems: "flex-end", gap: 4, maxWidth: 105 },
  cameraBackdrop: { flex: 1, alignItems: "center", justifyContent: "center", padding: 18 },
  cameraPanel: { width: "100%", maxWidth: 560, borderRadius: 20, padding: 14, gap: 12 },
  cameraHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  webCameraPreview: { width: "100%", aspectRatio: 3 / 4, borderRadius: 16, overflow: "hidden" },
  cameraActions: { flexDirection: "row", gap: 12 },
});

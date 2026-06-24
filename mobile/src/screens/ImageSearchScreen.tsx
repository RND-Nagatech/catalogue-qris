import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  Image,
  ActivityIndicator,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import ProductCard from '../components/ProductCard';
import EmptyState from '../components/EmptyState';
import { useFavoritesContext } from '../hooks/FavoritesContext';
import { Product } from '../types/product';
import api from '../api/client';
import { colors, typography, spacing, borderRadius } from '../theme';

interface ImageSearchScreenProps {
  navigation: any;
}

export default function ImageSearchScreen({ navigation }: ImageSearchScreenProps) {
  const insets = useSafeAreaInsets();
  const { isFavorite, toggleFavorite } = useFavoritesContext();
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [results, setResults] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);

  const pickAndSearch = useCallback(async (useCamera: boolean) => {
    try {
      setError(null);

      const ImagePicker = require('expo-image-picker');

      const perm = useCamera
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!perm.granted) {
        setError('Izin kamera/gallery diperlukan');
        return;
      }

      const result = useCamera
        ? await ImagePicker.launchCameraAsync({
            mediaTypes: ['images'],
            quality: 0.8,
          })
        : await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            quality: 0.8,
          });

      if (result.canceled || !result.assets?.[0]) return;

      const uri = result.assets[0].uri;
      setImageUri(uri);
      setLoading(true);
      setResults([]);
      setSearched(false);

      const form = new FormData();
      form.append('file', { uri, type: 'image/jpeg', name: 'search.jpg' } as any);

      const response = await api.post<{ success: boolean; data: Product[] }>(
        '/search/image?top_k=20',
        form,
        { headers: { 'Content-Type': 'multipart/form-data' }, timeout: 60000 }
      );

      setResults(response.data?.data || []);
      setSearched(true);
    } catch (err: any) {
      setError(err?.response?.data?.error || err.message || 'Gagal mencari gambar');
    } finally {
      setLoading(false);
    }
  }, []);

  const renderItem = useCallback(
    ({ item }: { item: Product }) => (
      <ProductCard
        product={item}
        onPress={() => navigation.navigate('ProductDetail', { product: item })}
        isFavorite={isFavorite(item.kode_barang)}
        onToggleFavorite={() => toggleFavorite(item)}
      />
    ),
    [navigation, isFavorite, toggleFavorite]
  );

  const keyExtractor = (item: Product, index: number) => `${item.kode_barang}-${index}`;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Cari via Gambar</Text>
      </View>

      {!searched && !loading ? (
        <View style={styles.pickContainer}>
          <View style={styles.iconCircle}>
            <Ionicons name="camera-outline" size={64} color={colors.primary} />
          </View>
          <Text style={styles.pickTitle}>Cari Produk via Gambar</Text>
          <Text style={styles.pickDesc}>
            Ambil foto perhiasan atau pilih dari gallery untuk mencari produk mirip di katalog
          </Text>
          <TouchableOpacity style={styles.cameraBtn} onPress={() => pickAndSearch(true)} activeOpacity={0.8}>
            <Ionicons name="camera" size={20} color={colors.onPrimary} />
            <Text style={styles.cameraBtnText}>Ambil Foto</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.galleryBtn} onPress={() => pickAndSearch(false)} activeOpacity={0.8}>
            <Ionicons name="images-outline" size={20} color={colors.primary} />
            <Text style={styles.galleryBtnText}>Pilih dari Gallery</Text>
          </TouchableOpacity>
        </View>
      ) : loading ? (
        <View style={styles.loadingContainer}>
          {imageUri && <Image source={{ uri: imageUri }} style={styles.previewImage} resizeMode="contain" />}
          <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 24 }} />
          <Text style={styles.loadingText}>Menganalisis gambar...</Text>
        </View>
      ) : (
        <FlatList
          data={results}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          numColumns={2}
          contentContainerStyle={styles.listContent}
          columnWrapperStyle={styles.columnWrapper}
          ListHeaderComponent={
            <View style={styles.resultHeader}>
              {imageUri && <Image source={{ uri: imageUri }} style={styles.resultImage} resizeMode="cover" />}
              <Text style={styles.resultTitle}>
                {results.length > 0 ? `${results.length} produk mirip ditemukan` : 'Tidak ada produk mirip'}
              </Text>
              <TouchableOpacity
                style={styles.retryBtn}
                onPress={() => { setSearched(false); setResults([]); setImageUri(null); }}
              >
                <Text style={styles.retryText}>Cari Lagi</Text>
              </TouchableOpacity>
            </View>
          }
          ListEmptyComponent={
            <EmptyState icon="search-outline" title="Tidak Ditemukan" description="Coba gambar lain." />
          }
          showsVerticalScrollIndicator={false}
        />
      )}

      {error && (
        <View style={styles.errorBar}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={() => setError(null)}>
            <Ionicons name="close" size={18} color={colors.onError} />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { alignItems: 'center', paddingHorizontal: spacing.containerMargin, paddingTop: spacing.md, paddingBottom: spacing.sm },
  headerTitle: { fontSize: 20, fontWeight: '700', color: colors.primary },
  pickContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.xl, paddingBottom: 80 },
  iconCircle: { width: 128, height: 128, borderRadius: 64, backgroundColor: colors.surfaceContainerHigh, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.lg },
  pickTitle: { ...typography.headlineMd, color: colors.onSurface, marginBottom: spacing.sm, textAlign: 'center' },
  pickDesc: { ...typography.bodyMd, color: colors.onSurfaceVariant, textAlign: 'center', marginBottom: spacing.xl },
  cameraBtn: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.primaryContainer, paddingHorizontal: spacing.xl, paddingVertical: spacing.md, borderRadius: borderRadius.full, marginBottom: spacing.md, width: '80%', justifyContent: 'center' },
  cameraBtnText: { ...typography.labelMd, color: colors.onPrimary },
  galleryBtn: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderWidth: 1, borderColor: colors.primary, paddingHorizontal: spacing.xl, paddingVertical: spacing.md, borderRadius: borderRadius.full, width: '80%', justifyContent: 'center' },
  galleryBtnText: { ...typography.labelMd, color: colors.primary },
  loadingContainer: { flex: 1, alignItems: 'center', paddingTop: 40, paddingHorizontal: spacing.xl },
  previewImage: { width: '80%', height: 200, borderRadius: borderRadius.md, backgroundColor: colors.surfaceContainer },
  loadingText: { ...typography.bodyMd, color: colors.onSurfaceVariant, marginTop: spacing.md },
  resultHeader: { alignItems: 'center', paddingVertical: spacing.md },
  resultImage: { width: 80, height: 80, borderRadius: borderRadius.md, marginBottom: spacing.sm, borderWidth: 2, borderColor: colors.primaryContainer },
  resultTitle: { ...typography.labelMd, color: colors.onSurface, marginBottom: spacing.sm },
  retryBtn: { backgroundColor: colors.surfaceContainerHigh, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderRadius: borderRadius.full },
  retryText: { ...typography.labelSm, color: colors.primary },
  listContent: { paddingHorizontal: spacing.containerMargin, paddingBottom: 100 },
  columnWrapper: { justifyContent: 'space-between' },
  errorBar: { position: 'absolute', bottom: 100, left: spacing.containerMargin, right: spacing.containerMargin, backgroundColor: colors.error, borderRadius: borderRadius.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: spacing.md },
  errorText: { ...typography.bodyMd, color: colors.onError, flex: 1 },
});

import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Product } from '../types/product';
import { getImageUrl } from '../api/client';
import { colors, typography, borderRadius, spacing, shadows } from '../theme';

const CARD_WIDTH = (Dimensions.get('window').width - spacing.containerMargin * 2 - spacing.gutter) / 2;

interface ProductCardProps {
  product: Product;
  onPress: () => void;
  isFavorite?: boolean;
  onToggleFavorite?: () => void;
}

export default function ProductCard({
  product,
  onPress,
  isFavorite = false,
  onToggleFavorite,
}: ProductCardProps) {
  const [imgError, setImgError] = useState(false);
  const imageUri = getImageUrl(product.kode_barcode);

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      activeOpacity={0.8}
    >
      {/* Image */}
      <View style={styles.imageContainer}>
        {!imgError && product.kode_barcode ? (
          <Image
            source={{ uri: imageUri }}
            style={styles.productImage}
            resizeMode="cover"
            onError={() => setImgError(true)}
          />
        ) : (
          <View style={styles.imagePlaceholder}>
            <Ionicons name="diamond-outline" size={40} color={colors.outlineVariant} />
          </View>
        )}
        {/* Favorite button */}
        {onToggleFavorite && (
          <TouchableOpacity
            style={styles.favButton}
            onPress={(e) => {
              e.stopPropagation();
              onToggleFavorite();
            }}
            activeOpacity={0.7}
          >
            <Ionicons
              name={isFavorite ? 'heart' : 'heart-outline'}
              size={18}
              color={isFavorite ? colors.error : colors.primary}
            />
          </TouchableOpacity>
        )}
      </View>

      {/* Info */}
      <View style={styles.info}>
        <Text style={styles.category} numberOfLines={1}>
          {product.kode_group} • {product.sumber}
        </Text>
        <Text style={styles.name} numberOfLines={2}>
          {product.nama_barang}
        </Text>
        <View style={styles.attrsRow}>
          <View style={styles.attrBadge}>
            <Ionicons name="scale-outline" size={12} color={colors.primary} />
            <Text style={styles.attrText}>{product.berat?.toFixed(1)}g</Text>
          </View>
          <View style={styles.attrBadge}>
            <Ionicons name="shield-checkmark-outline" size={12} color={colors.primary} />
            <Text style={styles.attrText}>{product.kadar_cetak || '—'}</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    width: CARD_WIDTH,
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    marginBottom: spacing.md,
    ...shadows.card,
  },
  imageContainer: {
    position: 'relative',
    aspectRatio: 720 / 645,   // match Firebase image native size
    backgroundColor: colors.surfaceContainer,
    overflow: 'hidden',
  },
  imagePlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceContainer,
  },
  productImage: {
    width: '100%',
    height: '100%',
  },
  favButton: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    backgroundColor: 'rgba(255,255,255,0.8)',
    borderRadius: borderRadius.full,
    padding: spacing.sm,
    ...shadows.card,
  },
  info: {
    padding: spacing.md,
    alignItems: 'center',
  },
  category: {
    ...typography.labelSm,
    color: colors.outline,
    marginBottom: spacing.xs,
    textTransform: 'uppercase',
    textAlign: 'center',
  },
  name: {
    ...typography.bodyMd,
    fontFamily: typography.labelMd.fontFamily,
    color: colors.onSurface,
    lineHeight: 20,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  attrsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  attrBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: colors.surfaceContainer,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  attrText: {
    ...typography.labelSm,
    color: colors.primary,
  },
});

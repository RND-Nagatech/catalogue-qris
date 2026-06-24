import React, { useState, useCallback } from 'react';
import { View, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography, borderRadius, spacing } from '../theme';

interface SearchBarProps {
  placeholder?: string;
  onSearch: (keyword: string) => void;
  debounceMs?: number;
}

export default function SearchBar({
  placeholder = 'Cari produk...',
  onSearch,
  debounceMs = 500,
}: SearchBarProps) {
  const [value, setValue] = useState('');
  const timerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleChange = useCallback(
    (text: string) => {
      setValue(text);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        onSearch(text.trim());
      }, debounceMs);
    },
    [onSearch, debounceMs]
  );

  const handleClear = useCallback(() => {
    setValue('');
    if (timerRef.current) clearTimeout(timerRef.current);
    onSearch('');
  }, [onSearch]);

  return (
    <View style={styles.container}>
      <Ionicons name="search-outline" size={20} color={colors.outline} style={styles.icon} />
      <TextInput
        style={styles.input}
        placeholder={placeholder}
        placeholderTextColor={colors.outline}
        value={value}
        onChangeText={handleChange}
        returnKeyType="search"
        autoCorrect={false}
      />
      {value.length > 0 && (
        <TouchableOpacity onPress={handleClear} style={styles.clearBtn} activeOpacity={0.7}>
          <Ionicons name="close-circle" size={20} color={colors.outline} />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceContainerHighest,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    paddingHorizontal: spacing.md,
    height: 48,
  },
  icon: {
    marginRight: spacing.sm,
  },
  input: {
    flex: 1,
    ...typography.bodyMd,
    color: colors.onSurface,
    paddingVertical: 0,
  },
  clearBtn: {
    padding: spacing.xs,
    marginLeft: spacing.xs,
  },
});

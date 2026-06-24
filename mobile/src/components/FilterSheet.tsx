import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  TextInput,
  StyleSheet,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { FilterOption } from '../hooks/useFilters';
import { colors, typography, borderRadius, spacing } from '../theme';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface StoreOption {
  id: string;
  name: string;
}

interface FilterSheetProps {
  visible: boolean;
  onClose: () => void;
  groups: FilterOption[];
  depts: FilterOption[];
  baki: FilterOption[];
  stores: StoreOption[];
  selectedGroup: string | null;
  selectedDept: string | null;
  selectedTokoBaki: string | null;
  selectedStoreId: string | null;
  onApply: (group: string | null, dept: string | null, baki: string | null, storeId: string | null) => void;
}

type TabKey = 'group' | 'dept' | 'baki' | 'store';

interface TabConfig {
  key: TabKey;
  label: string;
  options: { code: string; name: string }[];
  selected: string | null;
}

export default function FilterSheet({
  visible,
  onClose,
  groups,
  depts,
  baki,
  stores,
  selectedGroup,
  selectedDept,
  selectedTokoBaki,
  selectedStoreId,
  onApply,
}: FilterSheetProps) {
  const [activeTab, setActiveTab] = useState<TabKey>('group');
  const [tempGroup, setTempGroup] = useState<string | null>(selectedGroup);
  const [tempDept, setTempDept] = useState<string | null>(selectedDept);
  const [tempBaki, setTempBaki] = useState<string | null>(selectedTokoBaki);
  const [tempStore, setTempStore] = useState<string | null>(selectedStoreId);
  const [searchQuery, setSearchQuery] = useState('');
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  const insets = useSafeAreaInsets();

  // Track keyboard height
  useEffect(() => {
    const showSub = Keyboard.addListener('keyboardDidShow', (e) => {
      setKeyboardHeight(e.endCoordinates.height);
    });
    const hideSub = Keyboard.addListener('keyboardDidHide', () => {
      setKeyboardHeight(0);
    });
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  // Reset keyboard height saat sheet dibuka/tutup
  useEffect(() => {
    if (!visible) {
      setKeyboardHeight(0);
      setSearchQuery('');
    }
  }, [visible]);

  const storeOptions = stores.map((s) => ({ code: s.id, name: s.name }));

  const tabs: TabConfig[] = [
    { key: 'group', label: 'Group', options: groups, selected: tempGroup },
    { key: 'dept', label: 'Dept', options: depts, selected: tempDept },
    { key: 'baki', label: 'Baki', options: baki, selected: tempBaki },
    { key: 'store', label: 'Toko', options: storeOptions, selected: tempStore },
  ];

  const currentTab = tabs.find((t) => t.key === activeTab)!;

  // Filter options berdasarkan search query
  const filteredOptions = useMemo(() => {
    if (!searchQuery.trim()) return currentTab.options;
    const q = searchQuery.toLowerCase();
    return currentTab.options.filter(
      (opt) =>
        opt.name.toLowerCase().includes(q) ||
        opt.code.toLowerCase().includes(q)
    );
  }, [currentTab.options, searchQuery]);

  const handleSelect = (code: string | null) => {
    switch (activeTab) {
      case 'group': setTempGroup(code); break;
      case 'dept': setTempDept(code); break;
      case 'baki': setTempBaki(code); break;
      case 'store': setTempStore(code); break;
    }
  };

  const handleApply = () => {
    onApply(tempGroup, tempDept, tempBaki, tempStore);
    onClose();
  };

  const handleReset = () => {
    setTempGroup(null);
    setTempDept(null);
    setTempBaki(null);
    setTempStore(null);
    setSearchQuery('');
  };

  const handleTabChange = (tab: TabKey) => {
    setActiveTab(tab);
    setSearchQuery('');
  };

  const activeCount = [tempGroup, tempDept, tempBaki, tempStore].filter(Boolean).length;

  // Dynamic maxHeight: layar dikurangi keyboard, status bar, dan space footer
  const availableHeight = SCREEN_HEIGHT - keyboardHeight - insets.top;
  const maxSheetHeight = Math.min(availableHeight, SCREEN_HEIGHT * 0.85);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <TouchableOpacity style={styles.backdrop} onPress={onClose} activeOpacity={1} />
        <View style={[styles.sheet, { maxHeight: maxSheetHeight, paddingTop: 16 }]}>
          {/* Fixed header */}
          <View style={styles.header}>
            <Text style={styles.title}>Filter Produk</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={24} color={colors.onSurface} />
            </TouchableOpacity>
          </View>

          {/* Fixed tabs */}
          <View style={styles.tabRow}>
            {tabs.map((tab) => (
              <TouchableOpacity
                key={tab.key}
                style={[styles.tab, activeTab === tab.key && styles.tabActive]}
                onPress={() => handleTabChange(tab.key)}
                activeOpacity={0.7}
              >
                <Text
                  style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}
                >
                  {tab.label}
                </Text>
                {tab.selected && <View style={styles.tabDot} />}
              </TouchableOpacity>
            ))}
          </View>

          {/* Fixed search */}
          <View style={styles.searchContainer}>
            <Ionicons name="search-outline" size={18} color={colors.outline} style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder={`Cari ${currentTab.label.toLowerCase()}...`}
              placeholderTextColor={colors.outline}
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCorrect={false}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={18} color={colors.outline} />
              </TouchableOpacity>
            )}
          </View>

          {/* Scrollable options — maxHeight dinamis sesuai ruang tersedia */}
          <ScrollView
            style={[styles.optionList, { maxHeight: maxSheetHeight - 240 }]}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Semua / Clear */}
            <TouchableOpacity
              style={[styles.option, !currentTab.selected && styles.optionSelected]}
              onPress={() => handleSelect(null)}
              activeOpacity={0.7}
            >
              <Ionicons
                name={!currentTab.selected ? 'radio-button-on' : 'radio-button-off'}
                size={20}
                color={!currentTab.selected ? colors.primary : colors.outlineVariant}
              />
              <Text
                style={[
                  styles.optionText,
                  !currentTab.selected && styles.optionTextSelected,
                ]}
              >
                Semua
              </Text>
            </TouchableOpacity>

            {filteredOptions.map((opt, index) => (
              <TouchableOpacity
                key={`${activeTab}-${opt.code}-${index}`}
                style={[
                  styles.option,
                  currentTab.selected === opt.code && styles.optionSelected,
                ]}
                onPress={() => handleSelect(opt.code)}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={
                    currentTab.selected === opt.code
                      ? 'radio-button-on'
                      : 'radio-button-off'
                  }
                  size={20}
                  color={
                    currentTab.selected === opt.code
                      ? colors.primary
                      : colors.outlineVariant
                  }
                />
                <Text
                  style={[
                    styles.optionText,
                    currentTab.selected === opt.code && styles.optionTextSelected,
                  ]}
                  numberOfLines={1}
                >
                  {opt.name}
                </Text>
              </TouchableOpacity>
            ))}

            {filteredOptions.length === 0 && searchQuery.length > 0 && (
              <Text style={styles.emptyText}>
                Tidak ditemukan "{searchQuery}"
              </Text>
            )}
          </ScrollView>

          {/* Fixed footer */}
          <View style={styles.footer}>
            <TouchableOpacity style={styles.resetBtn} onPress={handleReset} activeOpacity={0.7}>
              <Text style={styles.resetText}>Reset</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.applyBtn} onPress={handleApply} activeOpacity={0.8}>
              <Text style={styles.applyText}>
                Terapkan{activeCount > 0 ? ` (${activeCount})` : ''}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    paddingBottom: spacing.xl,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.containerMargin,
    paddingBottom: spacing.md,
  },
  title: {
    ...typography.headlineMd,
    color: colors.primary,
  },
  closeBtn: {
    padding: spacing.xs,
  },
  tabRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.containerMargin,
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
  },
  tabActive: {
    backgroundColor: colors.primaryContainer,
    borderColor: colors.primaryContainer,
  },
  tabText: {
    ...typography.labelMd,
    color: colors.onSurfaceVariant,
  },
  tabTextActive: {
    color: colors.onPrimary,
  },
  tabDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.onPrimary,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: spacing.containerMargin,
    marginBottom: spacing.md,
    backgroundColor: colors.surfaceContainerHighest,
    borderRadius: borderRadius.DEFAULT,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    paddingHorizontal: spacing.md,
    height: 42,
  },
  searchIcon: {
    marginRight: spacing.sm,
  },
  searchInput: {
    flex: 1,
    ...typography.bodyMd,
    color: colors.onSurface,
    paddingVertical: 0,
  },
  optionList: {
    paddingHorizontal: spacing.containerMargin,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md - 2,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.DEFAULT,
  },
  optionSelected: {
    backgroundColor: colors.surfaceContainerLow,
  },
  optionText: {
    ...typography.bodyMd,
    color: colors.onSurface,
    flex: 1,
  },
  optionTextSelected: {
    fontFamily: typography.labelMd.fontFamily,
    color: colors.primary,
  },
  emptyText: {
    ...typography.bodyMd,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
    paddingVertical: spacing.lg,
  },
  footer: {
    flexDirection: 'row',
    paddingHorizontal: spacing.containerMargin,
    paddingTop: spacing.md,
    gap: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.outlineVariant,
    marginTop: spacing.sm,
  },
  resetBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.outline,
  },
  resetText: {
    ...typography.labelMd,
    color: colors.outline,
  },
  applyBtn: {
    flex: 2,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primaryContainer,
  },
  applyText: {
    ...typography.labelMd,
    color: colors.onPrimary,
  },
});

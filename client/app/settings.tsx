import { useEffect, useMemo, useState } from "react";
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppHeader, EmptyState, PrimaryButton } from "../components/ui";
import {
  deleteQrisSetting,
  loadNagagoldStores,
  loadQrisSettings,
  saveQrisSetting,
  setQrisSettingActive,
  type NagagoldStore,
  type QrisSetting,
} from "../lib/dataStore";
import { getMerchantInfo, normalizeQris, validateQris } from "../lib/qris";
import { useAppTheme } from "../lib/theme";

function storeId(store: NagagoldStore): string {
  return String(store.id || store._id || "");
}

function storeLabel(store: NagagoldStore): string {
  return store.name || storeId(store) || "-";
}

function settingStoreIds(setting: QrisSetting | null): string[] {
  return setting?.stores?.map((store) => String(store.store_id)).filter(Boolean) ?? [];
}

export default function Settings() {
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();
  const [stores, setStores] = useState<NagagoldStore[]>([]);
  const [settings, setSettings] = useState<QrisSetting[]>([]);
  const [editing, setEditing] = useState<QrisSetting | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [namaQris, setNamaQris] = useState("");
  const [qrisString, setQrisString] = useState("");
  const [qrisActive, setQrisActive] = useState(true);
  const [selectedStoreIds, setSelectedStoreIds] = useState<string[]>([]);
  const [storePickerOpen, setStorePickerOpen] = useState(false);
  const [detailSetting, setDetailSetting] = useState<QrisSetting | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const allSelected = stores.length > 0 && selectedStoreIds.length === stores.length;
  const selectedCount = selectedStoreIds.length;
  const selectedSummary = allSelected
    ? "Semua cabang dipilih"
    : selectedCount === 1
      ? "1 cabang dipilih"
      : `${selectedCount} cabang dipilih`;
  const preview = useMemo(() => {
    try {
      return qrisString ? getMerchantInfo(normalizeQris(qrisString)) : null;
    } catch {
      return null;
    }
  }, [qrisString]);

  const refresh = async () => {
    setIsLoading(true);
    setErrorMessage("");
    try {
      const [nextStores, nextSettings] = await Promise.all([
        loadNagagoldStores(),
        loadQrisSettings(),
      ]);
      setStores(nextStores);
      setSettings(nextSettings);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Setting QRIS belum bisa dimuat.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  const openCreate = () => {
    setEditing(null);
    setNamaQris("");
    setQrisString("");
    setQrisActive(true);
    setSelectedStoreIds([]);
    setFormOpen(true);
  };

  const openEdit = (setting: QrisSetting) => {
    setEditing(setting);
    setNamaQris(setting.nama_qris || "");
    setQrisString(setting.qris_string || "");
    setQrisActive(setting.qris_active !== false);
    setSelectedStoreIds(settingStoreIds(setting));
    setFormOpen(true);
  };

  const toggleStore = (id: string) => {
    setSelectedStoreIds((current) => (
      current.includes(id) ? current.filter((next) => next !== id) : [...current, id]
    ));
  };

  const toggleAll = () => {
    setSelectedStoreIds(allSelected ? [] : stores.map(storeId).filter(Boolean));
  };

  const persist = async (force = false) => {
    if (!selectedStoreIds.length) {
      Alert.alert("Cabang belum dipilih", "Pilih minimal satu cabang untuk QRIS ini.");
      return;
    }

    const nextQris = normalizeQris(qrisString);
    if (!nextQris) {
      Alert.alert("QRIS kosong", "Tempelkan QRIS string statis terlebih dahulu.");
      return;
    }

    try {
      validateQris(nextQris);
      const info = getMerchantInfo(nextQris);
      if (info.method !== "Static") {
        Alert.alert("Bukan QRIS statis", "Simpan QRIS statis agar nominal bisa dibuat dinamis.");
        return;
      }

      await saveQrisSetting({
        id: editing?.id,
        namaQris: namaQris.trim() || info.merchant || "QRIS",
        qrisString: nextQris,
        qrisActive,
        storeIds: selectedStoreIds,
        force,
      });
      await refresh();
      setFormOpen(false);
      Alert.alert("Tersimpan", "Setting QRIS berhasil disimpan.");
    } catch (error) {
      const conflictError = error as Error & { conflicts?: unknown[] };
      if (conflictError.conflicts?.length && !force) {
        Alert.alert(
          "Cabang sudah punya QRIS aktif",
          "Sebagian cabang sudah dipakai di QRIS aktif lain. Pindahkan cabang tersebut ke QRIS ini?",
          [
            { text: "Batal", style: "cancel" },
            { text: "Pindahkan", style: "destructive", onPress: () => persist(true) },
          ],
        );
        return;
      }
      Alert.alert("QRIS belum tersimpan", error instanceof Error ? error.message : "Backend API tidak bisa dijangkau.");
    }
  };

  const toggleActive = (setting: QrisSetting) => {
    const nextActive = !setting.qris_active;
    Alert.alert(
      nextActive ? "Aktifkan QRIS?" : "Nonaktifkan QRIS?",
      nextActive ? "QRIS ini akan aktif untuk cabang yang terhubung." : "Cabang yang memakai QRIS ini tidak bisa generate QRIS sampai diaktifkan lagi.",
      [
        { text: "Batal", style: "cancel" },
        {
          text: nextActive ? "Aktifkan" : "Nonaktifkan",
          onPress: async () => {
            try {
              await setQrisSettingActive(setting.id, nextActive);
              await refresh();
            } catch (error) {
              Alert.alert("Gagal update QRIS", error instanceof Error ? error.message : "Setting QRIS belum bisa diupdate.");
            }
          },
        },
      ],
    );
  };

  const removeSetting = (setting: QrisSetting) => {
    Alert.alert("Hapus QRIS?", `QRIS ${setting.nama_qris} akan dihapus dari setting.`, [
      { text: "Batal", style: "cancel" },
      {
        text: "Hapus",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteQrisSetting(setting.id);
            await refresh();
          } catch (error) {
            Alert.alert("Gagal hapus QRIS", error instanceof Error ? error.message : "Setting QRIS belum bisa dihapus.");
          }
        },
      },
    ]);
  };

  return (
    <View style={[styles.screen, { backgroundColor: theme.colors.background }]}>
      <AppHeader title="Pengaturan" topInset={insets.top} />
      <ScrollView
        automaticallyAdjustKeyboardInsets
        contentContainerStyle={[
          styles.container,
          {
            backgroundColor: theme.colors.background,
            paddingBottom: 64 + Math.max(insets.bottom, 18) + 32,
          },
        ]}
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
      >
        <View style={[styles.summaryHeader, { backgroundColor: theme.colors.surfaceContainerLowest, borderColor: theme.colors.outlineVariant }, theme.elevation.level1]}>
          <View style={styles.summaryText}>
            <Text style={[styles.summaryTitle, { color: theme.colors.primary }]}>QRIS Cabang</Text>
            <Text style={[styles.summarySubtitle, { color: theme.colors.muted }]}>Kelola banyak QRIS dan cabang yang menggunakannya.</Text>
          </View>
          <Pressable style={[styles.addButton, { backgroundColor: theme.colors.buttonPrimary }]} onPress={openCreate}>
            <Ionicons name="add" size={22} color={theme.colors.onPrimary} />
          </Pressable>
        </View>

        {errorMessage ? (
          <EmptyState icon="cloud-offline-outline" title="Setting QRIS belum bisa dimuat" description={errorMessage} action={<PrimaryButton title="Coba Lagi" onPress={refresh} />} />
        ) : null}

        {!formOpen ? (
          <View style={styles.list}>
            {isLoading ? (
              <Text style={[styles.helperText, { color: theme.colors.muted }]}>Memuat setting QRIS...</Text>
            ) : null}
            {!isLoading && !settings.length ? (
              <EmptyState icon="qr-code-outline" title="Belum ada QRIS" description="Tambahkan data QRIS lalu pilih cabang yang memakai QRIS tersebut." />
            ) : null}
            {settings.map((setting) => (
              <View key={setting.id} style={[styles.panel, { backgroundColor: theme.colors.cardBackground, borderColor: theme.colors.cardBorder }, theme.elevation.level1]}>
                <View style={[styles.titleRow, { borderBottomColor: theme.colors.divider }]}>
                  <Ionicons name="qr-code-outline" size={18} color={setting.qris_active ? theme.colors.primary : theme.colors.muted} />
                  <View style={styles.titleStack}>
                    <Text style={[styles.title, { color: theme.colors.text }]}>{setting.nama_qris || "QRIS"}</Text>
                    <Text style={[styles.cardMeta, { color: theme.colors.muted }]}>{setting.merchant_name || "-"}{setting.merchant_city ? ` - ${setting.merchant_city}` : ""}</Text>
                  </View>
                  <Pressable style={[styles.iconButton, { backgroundColor: theme.colors.surfaceContainerLow }]} onPress={() => openEdit(setting)}>
                    <Ionicons name="create-outline" size={17} color={theme.colors.primary} />
                  </Pressable>
                </View>
                <View style={styles.settingBody}>
                  <View style={styles.badgeRow}>
                    <Text style={[styles.badge, { backgroundColor: setting.qris_active ? theme.colors.successContainer : theme.colors.surfaceContainer, color: setting.qris_active ? theme.colors.primary : theme.colors.muted }]}>
                      {setting.qris_active ? "Aktif" : "Nonaktif"}
                    </Text>
                    <Text style={[styles.badge, { backgroundColor: theme.colors.surfaceContainer, color: theme.colors.primary }]}>
                      {(setting.stores || []).length} cabang
                    </Text>
                    <Pressable
                      accessibilityLabel="Lihat cabang QRIS"
                      style={[styles.eyeButton, { backgroundColor: theme.colors.surfaceContainerLow, borderColor: theme.colors.outlineVariant }]}
                      onPress={() => setDetailSetting(setting)}
                    >
                      <Ionicons name="eye-outline" size={16} color={theme.colors.primary} />
                    </Pressable>
                  </View>
                  <View style={styles.actionRow}>
                    <Pressable style={[styles.secondaryButton, { borderColor: theme.colors.outlineVariant, backgroundColor: theme.colors.surfaceContainerLowest }]} onPress={() => toggleActive(setting)}>
                      <Ionicons name={setting.qris_active ? "pause-circle-outline" : "play-circle-outline"} size={17} color={theme.colors.primary} />
                      <Text style={[styles.secondaryButtonText, { color: theme.colors.primary }]}>{setting.qris_active ? "Nonaktifkan" : "Aktifkan"}</Text>
                    </Pressable>
                    <Pressable style={[styles.dangerButton, { borderColor: theme.colors.error, backgroundColor: theme.colors.errorContainer }]} onPress={() => removeSetting(setting)}>
                      <Ionicons name="trash-outline" size={17} color={theme.colors.error} />
                    </Pressable>
                  </View>
                </View>
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.list}>
            <View style={[styles.panel, { backgroundColor: theme.colors.cardBackground, borderColor: theme.colors.cardBorder }, theme.elevation.level1]}>
              <View style={[styles.titleRow, { borderBottomColor: theme.colors.divider }]}>
                <Ionicons name="qr-code-outline" size={18} color={theme.colors.primary} />
                <Text style={[styles.title, { color: theme.colors.text }]}>{editing ? "Edit QRIS" : "Tambah QRIS"}</Text>
                <Pressable style={[styles.iconButton, { backgroundColor: theme.colors.surfaceContainerLow }]} onPress={() => setFormOpen(false)}>
                  <Ionicons name="close-outline" size={18} color={theme.colors.text} />
                </Pressable>
              </View>
              <View style={styles.settingBody}>
                <Input label="Nama QRIS" value={namaQris} onChangeText={setNamaQris} placeholder="QRIS Cabang Utama" />
                <Pressable style={[styles.checkRow, { borderColor: theme.colors.outlineVariant }]} onPress={() => setQrisActive(!qrisActive)}>
                  <Ionicons name={qrisActive ? "toggle" : "toggle-outline"} size={24} color={qrisActive ? theme.colors.primary : theme.colors.muted} />
                  <Text style={[styles.checkTitle, { color: theme.colors.text }]}>QRIS aktif</Text>
                </Pressable>
                <Text style={[styles.label, { color: theme.colors.subtleText }]}>QRIS String</Text>
                <TextInput
                  value={qrisString}
                  onChangeText={setQrisString}
                  multiline
                  placeholder="00020101021126..."
                  placeholderTextColor={theme.colors.subtleText}
                  style={[styles.textarea, { backgroundColor: theme.colors.inputBackground, color: theme.colors.text }]}
                  autoCapitalize="characters"
                  autoCorrect={false}
                />
                {preview ? (
                  <View style={[styles.previewBox, { borderColor: theme.colors.outlineVariant, backgroundColor: theme.colors.surfaceContainerLow }]}>
                    <Text style={[styles.previewText, { color: theme.colors.text }]}>{preview.merchant || "-"}</Text>
                    <Text style={[styles.previewSub, { color: theme.colors.muted }]}>{preview.city || "-"}</Text>
                  </View>
                ) : null}
              </View>
            </View>

            <View style={[styles.panel, { backgroundColor: theme.colors.cardBackground, borderColor: theme.colors.cardBorder }, theme.elevation.level1]}>
              <View style={[styles.titleRow, { borderBottomColor: theme.colors.divider }]}>
                <Ionicons name="business-outline" size={18} color={theme.colors.primary} />
                <Text style={[styles.title, { color: theme.colors.text }]}>Cabang</Text>
                <Text style={[styles.badge, { backgroundColor: theme.colors.surfaceContainer, color: theme.colors.primary }]}>{selectedSummary}</Text>
              </View>
              <View style={styles.settingBody}>
                <Pressable
                  style={[styles.selectBox, { backgroundColor: theme.colors.inputBackground, borderColor: theme.colors.inputBorder }]}
                  onPress={() => setStorePickerOpen(true)}
                >
                  <View style={styles.selectText}>
                    <Text style={[styles.selectTitle, { color: theme.colors.text }]}>{selectedSummary}</Text>
                    <Text style={[styles.selectSubtitle, { color: theme.colors.muted }]}>Ketuk untuk pilih cabang</Text>
                  </View>
                  <Ionicons name="chevron-down" size={18} color={theme.colors.primary} />
                </Pressable>
              </View>
            </View>

            <Pressable style={[styles.primaryButton, { backgroundColor: theme.colors.buttonPrimary }]} onPress={() => persist(false)}>
              <Ionicons name="save-outline" size={16} color={theme.colors.onPrimary} />
              <Text style={[styles.primaryButtonText, { color: theme.colors.onPrimary }]}>Simpan QRIS</Text>
            </Pressable>
          </View>
        )}
      </ScrollView>
      <StoreMultiSelectSheet
        visible={storePickerOpen}
        stores={stores}
        selectedStoreIds={selectedStoreIds}
        onToggle={toggleStore}
        onToggleAll={toggleAll}
        allSelected={allSelected}
        onClose={() => setStorePickerOpen(false)}
      />
      <StoreDetailSheet
        visible={Boolean(detailSetting)}
        setting={detailSetting}
        onClose={() => setDetailSetting(null)}
      />
    </View>
  );
}

function Input({ label, value, onChangeText, placeholder }: { label: string; value: string; onChangeText: (value: string) => void; placeholder: string }) {
  const theme = useAppTheme();
  return (
    <View style={styles.field}>
      <Text style={[styles.label, { color: theme.colors.subtleText }]}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={theme.colors.subtleText}
        style={[styles.input, { backgroundColor: theme.colors.inputBackground, borderColor: theme.colors.inputBorder, color: theme.colors.text }]}
      />
    </View>
  );
}

function StoreMultiSelectSheet({
  visible,
  stores,
  selectedStoreIds,
  allSelected,
  onToggle,
  onToggleAll,
  onClose,
}: {
  visible: boolean;
  stores: NagagoldStore[];
  selectedStoreIds: string[];
  allSelected: boolean;
  onToggle: (id: string) => void;
  onToggleAll: () => void;
  onClose: () => void;
}) {
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState("");
  const filteredStores = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    if (!keyword) return stores;
    return stores.filter((store) => (
      storeLabel(store).toLowerCase().includes(keyword)
      || String(store.firebaseCode || "").toLowerCase().includes(keyword)
      || String(store.nagagoldDomain || store.domain || "").toLowerCase().includes(keyword)
    ));
  }, [query, stores]);

  return (
    <Modal animationType="slide" transparent visible={visible} onRequestClose={onClose}>
      <View style={styles.sheetBackdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={[styles.sheet, { backgroundColor: theme.colors.surfaceContainerLowest, paddingBottom: Math.max(insets.bottom, 16) }]}>
          <View style={[styles.sheetHeader, { borderBottomColor: theme.colors.divider }]}>
            <View>
              <Text style={[styles.sheetTitle, { color: theme.colors.text }]}>Pilih Cabang</Text>
              <Text style={[styles.sheetSubtitle, { color: theme.colors.muted }]}>{selectedStoreIds.length} dari {stores.length} cabang dipilih</Text>
            </View>
            <Pressable style={[styles.iconButton, { backgroundColor: theme.colors.surfaceContainerLow }]} onPress={onClose}>
              <Ionicons name="close-outline" size={20} color={theme.colors.text} />
            </Pressable>
          </View>
          <View style={styles.sheetBody}>
            <View style={[styles.searchField, { backgroundColor: theme.colors.inputBackground, borderColor: theme.colors.inputBorder }]}>
              <Ionicons name="search-outline" size={18} color={theme.colors.muted} />
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder="Cari cabang"
                placeholderTextColor={theme.colors.subtleText}
                style={[styles.searchInput, { color: theme.colors.text }]}
              />
            </View>
            <Pressable style={[styles.checkRow, { borderColor: theme.colors.outlineVariant }]} onPress={onToggleAll}>
              <Ionicons name={allSelected ? "checkbox" : "square-outline"} size={22} color={theme.colors.primary} />
              <Text style={[styles.checkTitle, { color: theme.colors.text }]}>Pilih Semua Cabang</Text>
            </Pressable>
            <ScrollView contentContainerStyle={styles.sheetList} showsVerticalScrollIndicator>
              {filteredStores.map((store, index) => {
                const id = storeId(store);
                const checked = selectedStoreIds.includes(id);
                return (
                  <Pressable key={`${id || storeLabel(store)}-${index}`} style={[styles.storeRow, { borderColor: theme.colors.outlineVariant }]} onPress={() => onToggle(id)}>
                    <Ionicons name={checked ? "checkbox" : "square-outline"} size={21} color={checked ? theme.colors.primary : theme.colors.muted} />
                    <View style={styles.storeText}>
                      <Text style={[styles.storeName, { color: theme.colors.text }]}>{storeLabel(store)}</Text>
                      <Text style={[styles.storeMeta, { color: theme.colors.muted }]}>{store.nagagoldDomain || store.domain || "-"}</Text>
                    </View>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function StoreDetailSheet({ visible, setting, onClose }: { visible: boolean; setting: QrisSetting | null; onClose: () => void }) {
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState("");
  const storeRefs = setting?.stores ?? [];
  const filteredStores = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    if (!keyword) return storeRefs;
    return storeRefs.filter((store) => (
      String(store.nama_cabang || "").toLowerCase().includes(keyword)
      || String(store.kode_cabang || "").toLowerCase().includes(keyword)
      || String(store.domain || "").toLowerCase().includes(keyword)
    ));
  }, [query, storeRefs]);

  return (
    <Modal animationType="slide" transparent visible={visible} onRequestClose={onClose}>
      <View style={styles.sheetBackdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={[styles.sheet, { backgroundColor: theme.colors.surfaceContainerLowest, paddingBottom: Math.max(insets.bottom, 16) }]}>
          <View style={[styles.sheetHeader, { borderBottomColor: theme.colors.divider }]}>
            <View>
              <Text style={[styles.sheetTitle, { color: theme.colors.text }]}>{setting?.nama_qris || "Detail Cabang"}</Text>
              <Text style={[styles.sheetSubtitle, { color: theme.colors.muted }]}>{storeRefs.length} cabang memakai QRIS ini</Text>
            </View>
            <Pressable style={[styles.iconButton, { backgroundColor: theme.colors.surfaceContainerLow }]} onPress={onClose}>
              <Ionicons name="close-outline" size={20} color={theme.colors.text} />
            </Pressable>
          </View>
          <View style={styles.sheetBody}>
            {storeRefs.length > 8 ? (
              <View style={[styles.searchField, { backgroundColor: theme.colors.inputBackground, borderColor: theme.colors.inputBorder }]}>
                <Ionicons name="search-outline" size={18} color={theme.colors.muted} />
                <TextInput
                  value={query}
                  onChangeText={setQuery}
                  placeholder="Cari cabang"
                  placeholderTextColor={theme.colors.subtleText}
                  style={[styles.searchInput, { color: theme.colors.text }]}
                />
              </View>
            ) : null}
            <ScrollView contentContainerStyle={styles.sheetList} showsVerticalScrollIndicator>
              {filteredStores.map((store, index) => (
                <View key={`${store.store_id || store.nama_cabang}-${index}`} style={[styles.storeRow, { borderColor: theme.colors.outlineVariant }]}>
                  <Ionicons name="business-outline" size={19} color={theme.colors.primary} />
                  <View style={styles.storeText}>
                    <Text style={[styles.storeName, { color: theme.colors.text }]}>{store.nama_cabang || "-"}</Text>
                    <Text style={[styles.storeMeta, { color: theme.colors.muted }]}>{store.domain || store.kode_cabang || "-"}</Text>
                  </View>
                </View>
              ))}
            </ScrollView>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  container: { gap: 16, paddingHorizontal: 20, paddingTop: 24 },
  summaryHeader: { alignItems: "center", borderRadius: 16, borderWidth: 1, flexDirection: "row", gap: 12, padding: 16 },
  summaryText: { flex: 1, gap: 4 },
  summaryTitle: { fontSize: 20, fontWeight: "800" },
  summarySubtitle: { fontSize: 13, fontWeight: "600", lineHeight: 19 },
  addButton: { alignItems: "center", borderRadius: 999, height: 42, justifyContent: "center", width: 42 },
  list: { gap: 14 },
  panel: { borderRadius: 16, borderWidth: 1, overflow: "hidden" },
  titleRow: { alignItems: "center", borderBottomWidth: 1, flexDirection: "row", gap: 10, paddingHorizontal: 14, paddingVertical: 13 },
  titleStack: { flex: 1 },
  title: { flex: 1, fontSize: 15, fontWeight: "800" },
  cardMeta: { fontSize: 11, fontWeight: "600", marginTop: 2 },
  iconButton: { alignItems: "center", borderRadius: 999, height: 34, justifyContent: "center", width: 34 },
  settingBody: { gap: 12, padding: 14 },
  helperText: { fontSize: 13, fontWeight: "700" },
  badgeRow: { alignItems: "center", flexDirection: "row", flexWrap: "wrap", gap: 8 },
  badge: { borderRadius: 999, fontSize: 12, fontWeight: "800", overflow: "hidden", paddingHorizontal: 10, paddingVertical: 4 },
  eyeButton: { alignItems: "center", borderRadius: 999, borderWidth: 1, height: 30, justifyContent: "center", width: 30 },
  actionRow: { flexDirection: "row", gap: 10 },
  secondaryButton: { alignItems: "center", borderRadius: 12, borderWidth: 1, flex: 1, flexDirection: "row", gap: 7, justifyContent: "center", minHeight: 44 },
  secondaryButtonText: { fontSize: 13, fontWeight: "800" },
  dangerButton: { alignItems: "center", borderRadius: 12, borderWidth: 1, justifyContent: "center", minHeight: 44, width: 52 },
  field: { gap: 6 },
  label: { fontSize: 11, fontWeight: "800", letterSpacing: 0.4, textTransform: "uppercase" },
  input: { borderRadius: 12, borderWidth: 1, fontSize: 13, fontWeight: "700", minHeight: 48, paddingHorizontal: 12 },
  textarea: { borderRadius: 12, fontFamily: "Courier", fontSize: 12, lineHeight: 18, minHeight: 160, padding: 12, textAlignVertical: "top" },
  checkRow: { alignItems: "center", borderRadius: 12, borderWidth: 1, flexDirection: "row", gap: 10, minHeight: 46, paddingHorizontal: 12 },
  checkTitle: { flex: 1, fontSize: 13, fontWeight: "800" },
  previewBox: { borderRadius: 12, borderWidth: 1, gap: 3, padding: 12 },
  previewText: { fontSize: 13, fontWeight: "800" },
  previewSub: { fontSize: 12, fontWeight: "600" },
  selectBox: { alignItems: "center", borderRadius: 12, borderWidth: 1, flexDirection: "row", gap: 12, minHeight: 58, paddingHorizontal: 12 },
  selectText: { flex: 1, gap: 3 },
  selectTitle: { fontSize: 14, fontWeight: "800" },
  selectSubtitle: { fontSize: 12, fontWeight: "600" },
  storeList: { gap: 8 },
  storeRow: { alignItems: "center", borderRadius: 12, borderWidth: 1, flexDirection: "row", gap: 10, minHeight: 56, paddingHorizontal: 12, paddingVertical: 8 },
  storeText: { flex: 1, gap: 2 },
  storeName: { fontSize: 13, fontWeight: "800" },
  storeMeta: { fontSize: 11, fontWeight: "600" },
  primaryButton: { alignItems: "center", borderRadius: 14, flexDirection: "row", gap: 8, justifyContent: "center", minHeight: 50 },
  primaryButtonText: { fontSize: 14, fontWeight: "800" },
  sheetBackdrop: { backgroundColor: "rgba(15, 23, 42, 0.38)", flex: 1, justifyContent: "flex-end" },
  sheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: "82%", overflow: "hidden" },
  sheetHeader: { alignItems: "center", borderBottomWidth: 1, flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 18, paddingVertical: 14 },
  sheetTitle: { fontSize: 16, fontWeight: "800" },
  sheetSubtitle: { fontSize: 12, fontWeight: "600", marginTop: 2 },
  sheetBody: { gap: 12, padding: 14 },
  searchField: { alignItems: "center", borderRadius: 14, borderWidth: 1, flexDirection: "row", gap: 8, minHeight: 46, paddingHorizontal: 12 },
  searchInput: { flex: 1, fontSize: 13, fontWeight: "700", paddingVertical: 0 },
  sheetList: { gap: 8, paddingBottom: 12 },
});

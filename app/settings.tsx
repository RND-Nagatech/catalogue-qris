import { useEffect, useMemo, useState } from "react";
import { Alert, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  clearQrisString,
  loadNagagoldSettings,
  loadQrisString,
  type NagagoldConnectionStatus,
  saveNagagoldDomain,
  saveQrisString,
  testNagagoldConnection,
} from "../lib/dataStore";
import { getMerchantInfo, normalizeQris, validateQris } from "../lib/qris";
import { useAppTheme } from "../lib/theme";

const colors = {
  background: "#F7F9FB",
  surface: "#FFFFFF",
  text: "#191C1E",
  muted: "#3F4944",
  outline: "#BEC9C2",
  primary: "#004532",
  primaryContainer: "#065F46",
};

export default function Settings() {
  const theme = useAppTheme();
  const [value, setValue] = useState("");
  const [savedValue, setSavedValue] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [nagagoldDomain, setNagagoldDomain] = useState("");
  const [savedNagagoldDomain, setSavedNagagoldDomain] = useState("");
  const [nagagoldConnection, setNagagoldConnection] = useState<NagagoldConnectionStatus | null>(null);
  const [isTestingConnection, setIsTestingConnection] = useState(false);

  useEffect(() => {
    Promise.all([loadQrisString(), loadNagagoldSettings()])
      .then(([saved, nagagoldSettings]) => {
        if (saved) {
          setValue(saved);
          setSavedValue(saved);
          setIsEditing(false);
        } else {
          setIsEditing(true);
        }
        setNagagoldDomain(nagagoldSettings.domain);
        setSavedNagagoldDomain(nagagoldSettings.domain);
        setNagagoldConnection(nagagoldSettings.connection);
      })
      .catch(() => {
        setIsEditing(true);
        Alert.alert("Backend tidak terhubung", "QRIS belum bisa dimuat dari API. Pastikan server berjalan dan URL API benar.");
      });
  }, []);

  const hasSavedQris = Boolean(savedValue);
  const displayValue = isEditing ? value : savedValue;

  const preview = useMemo(() => {
    try {
      return displayValue ? getMerchantInfo(normalizeQris(displayValue)) : null;
    } catch {
      return null;
    }
  }, [displayValue]);

  const save = async () => {
    const nextValue = normalizeQris(value);
    if (!nextValue) {
      Alert.alert("QRIS kosong", "Tempelkan QRIS string statis terlebih dahulu.");
      return;
    }

    try {
      validateQris(nextValue);
      const info = getMerchantInfo(nextValue);
      if (info.method !== "Static") {
        Alert.alert("Bukan QRIS statis", "Simpan QRIS statis agar nominal bisa dibuat dinamis.");
        return;
      }

      await saveQrisString(nextValue);
      setSavedValue(nextValue);
      setValue(nextValue);
      setIsEditing(false);
      Alert.alert("Tersimpan", "QRIS string berhasil disimpan.");
    } catch (error) {
      Alert.alert("QRIS belum tersimpan", error instanceof Error ? error.message : "Backend API tidak bisa dijangkau.");
    }
  };

  const clearSavedQris = async () => {
    try {
      await clearQrisString();
      setValue("");
      setSavedValue("");
      setIsEditing(true);
      Alert.alert("Dikosongkan", "QRIS tersimpan sudah dihapus. Halaman utama akan memakai mode demo.");
    } catch {
      Alert.alert("Gagal menghapus", "Backend API tidak bisa dijangkau. Coba lagi setelah server aktif.");
    }
  };

  const saveDomain = async () => {
    const domain = nagagoldDomain.trim().replace(/\/+$/, "");
    if (!/^https?:\/\//.test(domain)) {
      Alert.alert("Domain belum valid", "Domain harus diawali http:// atau https://.");
      return;
    }

    try {
      await saveNagagoldDomain(domain);
      setNagagoldDomain(domain);
      setSavedNagagoldDomain(domain);
      setNagagoldConnection(null);
      Alert.alert("Tersimpan", "Domain NAGAGOLD berhasil disimpan. Tekan Test Koneksi untuk memastikan domain aktif.");
    } catch (error) {
      Alert.alert("Domain belum tersimpan", error instanceof Error ? error.message : "Backend API tidak bisa dijangkau.");
    }
  };

  const testConnection = async () => {
    const domain = nagagoldDomain.trim().replace(/\/+$/, "");
    if (!/^https?:\/\//.test(domain)) {
      Alert.alert("Domain belum valid", "Domain harus diawali http:// atau https://.");
      return;
    }

    if (!savedNagagoldDomain) {
      Alert.alert("Domain belum disimpan", "Simpan domain NAGAGOLD terlebih dahulu sebelum test koneksi.");
      return;
    }

    if (domain !== savedNagagoldDomain) {
      Alert.alert("Domain berubah", "Simpan perubahan domain terlebih dahulu sebelum test koneksi.");
      return;
    }

    setIsTestingConnection(true);
    try {
      const result = await testNagagoldConnection();
      setNagagoldConnection({
        ok: true,
        endpoint: result.endpoint,
        status: result.status,
        checkedAt: result.checkedAt ?? new Date().toISOString(),
      });
      Alert.alert(
        "Koneksi Berhasil",
        `Berhasil akses ${result.endpoint} dari domain tersimpan. Status: ${result.status}.`,
      );
    } catch (error) {
      Alert.alert("Koneksi Gagal", error instanceof Error ? error.message : "Domain atau TOKEN_PUSAT belum bisa mengakses NAGAGOLD.");
    } finally {
      setIsTestingConnection(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={[styles.container, { backgroundColor: theme.colors.background }]} keyboardShouldPersistTaps="handled">
      <AppHeader title="Pengaturan" />
      <View style={[styles.summaryHeader, theme.isDark && { backgroundColor: theme.colors.surface, borderColor: theme.colors.outline }]}>
        <Text style={[styles.summaryTitle, theme.isDark && { color: theme.colors.text }]}>Koneksi dan QRIS</Text>
        <Text style={[styles.summarySubtitle, theme.isDark && { color: theme.colors.muted }]}>Atur QRIS merchant dan koneksi NAGAGOLD</Text>
      </View>

      <View style={[styles.panel, theme.isDark && { backgroundColor: theme.colors.surface, borderColor: theme.colors.outline }]}>
        <View style={styles.titleRow}>
          <Ionicons name="globe-outline" size={18} color={theme.colors.primary} />
          <Text style={[styles.title, theme.isDark && { color: theme.colors.text }]}>Koneksi NAGAGOLD</Text>
        </View>
        <View style={styles.settingBody}>
          <Text style={[styles.fieldLabelInline, theme.isDark && { color: theme.colors.muted }]}>Domain Program</Text>
          <TextInput
            value={nagagoldDomain}
            onChangeText={setNagagoldDomain}
            placeholder="https://toko.com"
            placeholderTextColor="#94A3B8"
            style={[styles.inputInline, theme.isDark && { borderColor: theme.colors.outline, color: theme.colors.text }]}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {nagagoldConnection?.ok && savedNagagoldDomain && nagagoldDomain === savedNagagoldDomain ? (
            <View style={styles.connectionBadge}>
              <Ionicons name="checkmark-circle-outline" size={16} color="#047857" />
              <Text style={styles.connectionText}>
                Terhubung ke {savedNagagoldDomain} lewat {nagagoldConnection.endpoint}
              </Text>
            </View>
          ) : savedNagagoldDomain && nagagoldDomain === savedNagagoldDomain ? (
            <Text style={[styles.helperText, theme.isDark && { color: theme.colors.muted }]}>Domain tersimpan. Tekan Test Koneksi untuk validasi ke NAGAGOLD.</Text>
          ) : savedNagagoldDomain ? (
            <Text style={[styles.helperText, theme.isDark && { color: theme.colors.muted }]}>Domain berubah. Simpan domain dulu sebelum test koneksi.</Text>
          ) : (
            <Text style={[styles.helperText, theme.isDark && { color: theme.colors.muted }]}>Simpan domain program NAGAGOLD terlebih dahulu sebelum test koneksi.</Text>
          )}
          <Pressable style={[styles.primaryButton, { backgroundColor: theme.colors.primaryContainer, shadowColor: theme.colors.primaryContainer }]} onPress={saveDomain}>
            <Ionicons name="save-outline" size={16} color="#FFFFFF" />
            <Text style={styles.primaryButtonText}>Simpan Domain</Text>
          </Pressable>
          <Pressable
            disabled={isTestingConnection}
            style={[styles.secondaryButton, { backgroundColor: theme.colors.surfaceLow, borderColor: theme.colors.outline }, isTestingConnection && styles.disabledButton]}
            onPress={testConnection}
          >
            <Ionicons name="pulse-outline" size={16} color={theme.colors.text} />
            <Text style={[styles.secondaryButtonText, { color: theme.colors.text }]}>{isTestingConnection ? "Menguji Koneksi..." : "Test Koneksi"}</Text>
          </Pressable>
        </View>
      </View>

      {hasSavedQris && !isEditing ? (
        <View style={styles.savedBanner}>
          <Ionicons name="checkmark-circle-outline" size={20} color="#047857" />
          <View style={styles.savedBannerText}>
            <Text style={styles.savedTitle}>QRIS Merchant Tersimpan</Text>
            <Text style={styles.savedSubtitle}>App akan memakai QRIS ini untuk generate nominal pembayaran.</Text>
          </View>
        </View>
      ) : null}

      {preview ? (
        <View style={[styles.panel, theme.isDark && { backgroundColor: theme.colors.surface, borderColor: theme.colors.outline }]}>
          <View style={styles.titleRow}>
            <Ionicons name="information-circle-outline" size={18} color={theme.colors.primary} />
            <Text style={[styles.title, theme.isDark && { color: theme.colors.text }]}>Preview Merchant</Text>
          </View>
          <InfoRow label="Merchant" value={preview.merchant || "-"} />
          <InfoRow label="City" value={preview.city || "-"} />
          <InfoRow label="Postal Code" value={preview.postalCode || "-"} />
          <InfoRow label="Issuer" value={preview.issuer || "-"} />
          <InfoRow label="Method" value={preview.method} />
          <InfoRow label="Category" value={preview.category || "-"} />
          <InfoRow label="Currency" value={preview.currency || "-"} last />
        </View>
      ) : null}

      {isEditing ? (
        <>
          <View style={[styles.panel, theme.isDark && { backgroundColor: theme.colors.surface, borderColor: theme.colors.outline }]}>
            <View style={styles.titleRow}>
              <Ionicons name="qr-code-outline" size={18} color={theme.colors.primary} />
              <Text style={[styles.title, theme.isDark && { color: theme.colors.text }]}>{hasSavedQris ? "Edit QRIS String" : "QRIS String Statis"}</Text>
            </View>
            <TextInput
              value={value}
              onChangeText={setValue}
              multiline
              placeholder="00020101021126..."
              placeholderTextColor="#94A3B8"
              style={[styles.textarea, theme.isDark && { color: theme.colors.text }]}
              autoCapitalize="characters"
              autoCorrect={false}
            />
          </View>

          <Pressable style={[styles.primaryButton, { backgroundColor: theme.colors.primaryContainer, shadowColor: theme.colors.primaryContainer }]} onPress={save}>
            <Ionicons name="save-outline" size={16} color="#FFFFFF" />
            <Text style={styles.primaryButtonText}>{hasSavedQris ? "Simpan Perubahan" : "Simpan QRIS"}</Text>
          </Pressable>

          {hasSavedQris ? (
            <Pressable
              style={[styles.secondaryButton, { backgroundColor: theme.colors.surfaceLow, borderColor: theme.colors.outline }]}
              onPress={() => {
                setValue(savedValue);
                setIsEditing(false);
              }}
            >
              <Ionicons name="close-outline" size={18} color={theme.colors.text} />
              <Text style={[styles.secondaryButtonText, { color: theme.colors.text }]}>Batal Edit</Text>
            </Pressable>
          ) : null}
        </>
      ) : (
        <Pressable style={[styles.primaryButton, { backgroundColor: theme.colors.primaryContainer, shadowColor: theme.colors.primaryContainer }]} onPress={() => setIsEditing(true)}>
          <Ionicons name="create-outline" size={16} color="#FFFFFF" />
          <Text style={styles.primaryButtonText}>Edit QRIS Merchant</Text>
        </Pressable>
      )}

      <Pressable style={styles.dangerButton} onPress={clearSavedQris}>
        <Ionicons name="trash-outline" size={16} color="#B91C1C" />
        <Text style={styles.dangerButtonText}>Kosongkan QRIS Tersimpan</Text>
      </Pressable>
    </ScrollView>
  );
}

function AppHeader({ title }: { title: string }) {
  const theme = useAppTheme();

  return (
    <View style={styles.topHeader}>
      <View style={styles.headerLeft}>
        <Pressable style={styles.headerIconButton}>
          <Ionicons name="menu" size={21} color={theme.colors.text} />
        </Pressable>
        <Text style={[styles.screenTitle, { color: theme.colors.primary }]}>{title}</Text>
      </View>
      <Pressable style={styles.headerIconButton} onPress={theme.toggleTheme}>
        <Ionicons name={theme.isDark ? "sunny-outline" : "moon-outline"} size={18} color={theme.colors.text} />
      </Pressable>
    </View>
  );
}

function InfoRow({ label, value, last }: { label: string; value: string; last?: boolean }) {
  const theme = useAppTheme();

  return (
    <View style={[styles.infoRow, last && styles.infoRowLast]}>
      <Text style={[styles.infoLabel, theme.isDark && { color: theme.colors.muted }]}>{label}</Text>
      <Text style={[styles.infoValue, theme.isDark && { color: theme.colors.text }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background,
    gap: 14,
    paddingHorizontal: 12,
    paddingTop: Platform.OS === "ios" ? 66 : 46,
    paddingBottom: 32,
  },
  topHeader: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  headerLeft: { alignItems: "center", flexDirection: "row", gap: 10 },
  headerIconButton: { alignItems: "center", height: 34, justifyContent: "center", width: 34 },
  screenTitle: {
    color: colors.primary,
    fontSize: 20,
    fontWeight: "700",
  },
  summaryHeader: {
    backgroundColor: colors.surface,
    borderColor: colors.outline,
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
  },
  summaryTitle: { color: colors.text, fontSize: 14, fontWeight: "700" },
  summarySubtitle: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "500",
    marginTop: 4,
  },
  panel: {
    backgroundColor: "#FFFFFF",
    borderColor: "#BFD0CC",
    borderRadius: 18,
    borderWidth: 1,
    overflow: "hidden",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.05,
    shadowRadius: 13,
    elevation: 2,
  },
  savedBanner: {
    alignItems: "flex-start",
    backgroundColor: "#ECFDF5",
    borderColor: "#A7F3D0",
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: "row",
    gap: 10,
    padding: 12,
  },
  savedBannerText: {
    flex: 1,
  },
  savedTitle: {
    color: "#047857",
    fontSize: 14,
    fontWeight: "700",
  },
  savedSubtitle: {
    color: "#047857",
    fontSize: 12,
    lineHeight: 17,
    marginTop: 2,
  },
  titleRow: {
    alignItems: "center",
    borderBottomColor: "#E2E8F0",
    borderBottomWidth: 1,
    flexDirection: "row",
    gap: 8,
    padding: 12,
  },
  title: {
    color: "#0F172A",
    fontSize: 14,
    fontWeight: "700",
  },
  settingBody: {
    gap: 10,
    padding: 12,
  },
  fieldLabelInline: {
    color: "#334155",
    fontSize: 12,
    fontWeight: "700",
  },
  inputInline: {
    borderColor: "#CBD5E1",
    borderRadius: 12,
    borderWidth: 1,
    color: "#0F172A",
    fontSize: 13,
    minHeight: 44,
    paddingHorizontal: 12,
  },
  helperText: {
    color: "#64748B",
    fontSize: 12,
    lineHeight: 17,
  },
  connectionBadge: {
    alignItems: "flex-start",
    backgroundColor: "#ECFDF5",
    borderColor: "#A7F3D0",
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: "row",
    gap: 8,
    padding: 10,
  },
  connectionText: {
    color: "#047857",
    flex: 1,
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 17,
  },
  textarea: {
    color: "#0F172A",
    fontFamily: "Courier",
    fontSize: 12,
    lineHeight: 18,
    minHeight: 180,
    padding: 12,
    textAlignVertical: "top",
  },
  infoRow: {
    alignItems: "center",
    borderBottomColor: "#E2E8F0",
    borderBottomWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    minHeight: 42,
    paddingHorizontal: 12,
  },
  infoRowLast: {
    borderBottomWidth: 0,
  },
  infoLabel: {
    color: "#64748B",
    fontSize: 12,
  },
  infoValue: {
    color: "#0F172A",
    flex: 1,
    fontSize: 12,
    fontWeight: "700",
    textAlign: "right",
  },
  primaryButton: {
    alignItems: "center",
    backgroundColor: "#059669",
    borderRadius: 16,
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
    minHeight: 52,
    shadowColor: "#059669",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 14,
    elevation: 2,
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
  secondaryButton: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderColor: "#CBD5E1",
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
    minHeight: 52,
  },
  secondaryButtonText: {
    color: "#0F172A",
    fontSize: 14,
    fontWeight: "700",
  },
  disabledButton: {
    opacity: 0.6,
  },
  dangerButton: {
    alignItems: "center",
    backgroundColor: "#FEF2F2",
    borderColor: "#FECACA",
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
    minHeight: 52,
  },
  dangerButtonText: {
    color: "#B91C1C",
    fontSize: 14,
    fontWeight: "700",
  },
});

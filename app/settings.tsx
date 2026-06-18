import { useEffect, useMemo, useRef, useState } from "react";
import { Alert, Animated, Easing, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppHeader } from "../components/ui";
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
import { useNagagoldConfig } from "../lib/nagagoldConfig";
import { useAppTheme } from "../lib/theme";

export default function Settings() {
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();
  const nagagoldConfig = useNagagoldConfig();
  const [value, setValue] = useState("");
  const [savedValue, setSavedValue] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [nagagoldDomain, setNagagoldDomain] = useState("");
  const [savedNagagoldDomain, setSavedNagagoldDomain] = useState("");
  const [nagagoldConnection, setNagagoldConnection] = useState<NagagoldConnectionStatus | null>(null);
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const pulse = useRef(new Animated.Value(1)).current;
  const isConnected = Boolean(nagagoldConnection?.ok && savedNagagoldDomain && nagagoldDomain === savedNagagoldDomain);

  useEffect(() => {
    if (!isConnected) {
      pulse.stopAnimation();
      pulse.setValue(1);
      return;
    }

    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1.32,
          duration: 760,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 1,
          duration: 760,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [isConnected, pulse]);

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
      await nagagoldConfig.reloadConfig();
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
        `Terhubung ke Server ${savedNagagoldDomain}.`,
      );
      await nagagoldConfig.reloadConfig();
    } catch (error) {
      Alert.alert("Koneksi Gagal", error instanceof Error ? error.message : "Domain atau TOKEN_PUSAT belum bisa mengakses NAGAGOLD.");
    } finally {
      setIsTestingConnection(false);
    }
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
        <Text style={[styles.summaryTitle, { color: theme.colors.primary }]}>Koneksi dan QRIS</Text>
        <Text style={[styles.summarySubtitle, { color: theme.colors.muted }]}>Atur QRIS merchant dan koneksi Program</Text>
      </View>

      <View style={[styles.panel, { backgroundColor: theme.colors.cardBackground, borderColor: theme.colors.cardBorder }, theme.elevation.level1]}>
        <View style={[styles.titleRow, { borderBottomColor: theme.colors.divider }]}>
          <Ionicons name="globe-outline" size={18} color={theme.colors.primary} />
          <Text style={[styles.title, { color: theme.colors.text }]}>Koneksi Program</Text>
        </View>
        <View style={styles.settingBody}>
          <Text style={[styles.fieldLabelInline, { color: theme.colors.subtleText }]}>Domain Program</Text>
          <TextInput
            value={nagagoldDomain}
            onChangeText={setNagagoldDomain}
            placeholder="https://toko.com"
            placeholderTextColor={theme.colors.subtleText}
            style={[styles.inputInline, { backgroundColor: theme.colors.inputBackground, borderColor: theme.colors.inputBorder, color: theme.colors.text }]}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {isConnected ? (
            <View style={[styles.connectionBadge, { backgroundColor: theme.colors.successContainer, borderColor: theme.colors.primary }]}>
              <View style={styles.connectionDotWrap}>
                <Animated.View
                  style={[
                    styles.connectionPulse,
                    {
                      backgroundColor: theme.colors.primary,
                      transform: [{ scale: pulse }],
                    },
                  ]}
                />
                <View style={[styles.connectionDot, { backgroundColor: theme.colors.primary }]} />
              </View>
              <Text style={[styles.connectionText, { color: theme.colors.primary }]}>
                Terhubung ke Server {savedNagagoldDomain}
              </Text>
            </View>
          ) : savedNagagoldDomain && nagagoldDomain === savedNagagoldDomain ? (
            <View style={[styles.connectionBadge, { backgroundColor: theme.colors.surfaceContainerLow, borderColor: theme.colors.outlineVariant }]}>
              <View style={[styles.connectionDot, { backgroundColor: theme.colors.error }]} />
              <Text style={[styles.connectionText, { color: theme.colors.muted }]}>Belum terhubung ke Server {savedNagagoldDomain}</Text>
            </View>
          ) : savedNagagoldDomain ? (
            <Text style={[styles.helperText, { color: theme.colors.muted }]}>Domain berubah. Simpan domain dulu sebelum test koneksi.</Text>
          ) : (
            <Text style={[styles.helperText, { color: theme.colors.muted }]}>Simpan domain program terlebih dahulu sebelum test koneksi.</Text>
          )}
          {nagagoldConfig.config ? (
            <View style={[styles.configBadge, { backgroundColor: theme.colors.surfaceContainerLow, borderColor: theme.colors.outlineVariant }]}>
              <Ionicons name="checkmark-done-outline" size={15} color={theme.colors.primary} />
              <Text style={[styles.helperText, { color: theme.colors.muted }]}>Konfigurasi server sudah dimuat.</Text>
            </View>
          ) : null}
          <Pressable style={[styles.primaryButton, { backgroundColor: theme.colors.buttonPrimary }]} onPress={saveDomain}>
            <Ionicons name="save-outline" size={16} color="#FFFFFF" />
            <Text style={styles.primaryButtonText}>Simpan Domain</Text>
          </Pressable>
          <Pressable
            disabled={isTestingConnection}
            style={[styles.secondaryButton, { backgroundColor: theme.colors.buttonPrimary, borderColor: theme.colors.buttonPrimary }, isTestingConnection && styles.disabledButton]}
            onPress={testConnection}
          >
            <Ionicons name="pulse-outline" size={16} color={theme.colors.onPrimary} />
            <Text style={[styles.secondaryButtonText, { color: theme.colors.onPrimary }]}>{isTestingConnection ? "Menguji Koneksi..." : "Test Koneksi"}</Text>
          </Pressable>
        </View>
      </View>

      {hasSavedQris && !isEditing ? (
        <View style={[styles.savedBanner, { backgroundColor: theme.colors.successContainer, borderColor: theme.colors.primary }]}>
          <Ionicons name="checkmark-circle-outline" size={20} color={theme.colors.primary} />
          <View style={styles.savedBannerText}>
            <Text style={[styles.savedTitle, { color: theme.colors.primary }]}>QRIS Merchant Tersimpan</Text>
            <Text style={[styles.savedSubtitle, { color: theme.colors.muted }]}>App akan memakai QRIS ini untuk generate nominal pembayaran.</Text>
          </View>
        </View>
      ) : null}

      {preview ? (
        <View style={[styles.panel, { backgroundColor: theme.colors.cardBackground, borderColor: theme.colors.cardBorder }, theme.elevation.level1]}>
          <View style={[styles.titleRow, { borderBottomColor: theme.colors.divider }]}>
            <Ionicons name="information-circle-outline" size={18} color={theme.colors.primary} />
            <Text style={[styles.title, { color: theme.colors.text }]}>Preview Merchant</Text>
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
          <View style={[styles.panel, { backgroundColor: theme.colors.cardBackground, borderColor: theme.colors.cardBorder }, theme.elevation.level1]}>
            <View style={[styles.titleRow, { borderBottomColor: theme.colors.divider }]}>
              <Ionicons name="qr-code-outline" size={18} color={theme.colors.primary} />
              <Text style={[styles.title, { color: theme.colors.text }]}>{hasSavedQris ? "Edit QRIS String" : "QRIS String Statis"}</Text>
            </View>
            <TextInput
              value={value}
              onChangeText={setValue}
              multiline
              placeholder="00020101021126..."
              placeholderTextColor={theme.colors.subtleText}
              style={[styles.textarea, { backgroundColor: theme.colors.inputBackground, color: theme.colors.text }]}
              autoCapitalize="characters"
              autoCorrect={false}
            />
          </View>

          <Pressable style={[styles.primaryButton, { backgroundColor: theme.colors.buttonPrimary }]} onPress={save}>
            <Ionicons name="save-outline" size={16} color="#FFFFFF" />
            <Text style={styles.primaryButtonText}>{hasSavedQris ? "Simpan Perubahan" : "Simpan QRIS"}</Text>
          </Pressable>

          {hasSavedQris ? (
            <Pressable
              style={[styles.secondaryButton, { backgroundColor: theme.colors.surfaceContainerLowest, borderColor: theme.colors.outlineVariant }]}
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
        <Pressable style={[styles.primaryButton, { backgroundColor: theme.colors.buttonPrimary }]} onPress={() => setIsEditing(true)}>
          <Ionicons name="create-outline" size={16} color="#FFFFFF" />
          <Text style={styles.primaryButtonText}>Edit QRIS Merchant</Text>
        </Pressable>
      )}

      <Pressable style={[styles.dangerButton, { backgroundColor: theme.colors.errorContainer, borderColor: theme.colors.error }]} onPress={clearSavedQris}>
        <Ionicons name="trash-outline" size={16} color={theme.colors.error} />
        <Text style={[styles.dangerButtonText, { color: theme.colors.error }]}>Kosongkan QRIS Tersimpan</Text>
      </Pressable>
      </ScrollView>
    </View>
  );
}

function InfoRow({ label, value, last }: { label: string; value: string; last?: boolean }) {
  const theme = useAppTheme();

  return (
    <View style={[styles.infoRow, { borderBottomColor: theme.colors.divider }, last && styles.infoRowLast]}>
      <Text style={[styles.infoLabel, { color: theme.colors.muted }]}>{label}</Text>
      <Text style={[styles.infoValue, { color: theme.colors.text }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  container: {
    gap: 16,
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  summaryHeader: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 18,
  },
  summaryTitle: { fontSize: 20, fontWeight: "700" },
  summarySubtitle: {
    fontSize: 14,
    fontWeight: "500",
    marginTop: 4,
  },
  panel: {
    backgroundColor: "#FFFFFF",
    borderColor: "#BFD0CC",
    borderRadius: 18,
    borderWidth: 1,
    overflow: "hidden",
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
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  title: {
    color: "#0F172A",
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: 0.2,
  },
  settingBody: {
    gap: 12,
    padding: 16,
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
    fontSize: 14,
    minHeight: 48,
    paddingHorizontal: 14,
  },
  helperText: {
    color: "#64748B",
    fontSize: 12,
    lineHeight: 17,
  },
  connectionBadge: {
    alignItems: "center",
    backgroundColor: "#ECFDF5",
    borderColor: "#A7F3D0",
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: "row",
    gap: 8,
    padding: 10,
  },
  connectionDotWrap: {
    alignItems: "center",
    height: 16,
    justifyContent: "center",
    width: 16,
  },
  connectionPulse: {
    borderRadius: 999,
    height: 14,
    opacity: 0.24,
    position: "absolute",
    width: 14,
  },
  connectionDot: {
    borderRadius: 999,
    height: 9,
    width: 9,
  },
  connectionText: {
    color: "#047857",
    flex: 1,
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 17,
  },
  configBadge: {
    alignItems: "center",
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: "row",
    gap: 8,
    padding: 10,
  },
  textarea: {
    color: "#0F172A",
    fontFamily: "Courier",
    fontSize: 12,
    lineHeight: 18,
    minHeight: 180,
    padding: 14,
    textAlignVertical: "top",
  },
  infoRow: {
    alignItems: "center",
    borderBottomColor: "#E2E8F0",
    borderBottomWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    minHeight: 46,
    paddingHorizontal: 16,
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
    borderRadius: 14,
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
    minHeight: 50,
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
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
    minHeight: 50,
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
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
    minHeight: 50,
  },
  dangerButtonText: {
    color: "#B91C1C",
    fontSize: 14,
    fontWeight: "700",
  },
});

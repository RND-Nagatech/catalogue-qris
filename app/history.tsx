import { useCallback, useState, type ComponentProps } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";
import { loadNagagoldTodayHistory, type NagagoldRecentTransaction } from "../lib/dataStore";
import { formatRupiah } from "../lib/qris";
import { useAppTheme } from "../lib/theme";

type HistoryMode = "sale" | "purchase";
type IconName = ComponentProps<typeof Ionicons>["name"];

export default function History() {
  const theme = useAppTheme();
  const [mode, setMode] = useState<HistoryMode>("sale");
  const [items, setItems] = useState<NagagoldRecentTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const loadHistory = useCallback(async (nextMode = mode, refreshing = false) => {
    if (refreshing) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
      setItems([]);
    }

    try {
      const history = await loadNagagoldTodayHistory(nextMode);
      setItems(history);
      setErrorMessage("");
    } catch (error) {
      setItems([]);
      setErrorMessage(error instanceof Error ? error.message : "Riwayat hari ini belum bisa diambil dari NAGAGOLD.");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [mode]);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      loadHistory(mode).finally(() => {
        if (!active) return;
      });
      return () => {
        active = false;
      };
    }, [loadHistory, mode])
  );

  const switchMode = (nextMode: HistoryMode) => {
    if (nextMode === mode) return;
    setMode(nextMode);
    loadHistory(nextMode);
  };

  return (
    <View style={[styles.screen, { backgroundColor: theme.colors.background }]}>
      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            tintColor={theme.colors.primaryContainer}
            onRefresh={() => loadHistory(mode, true)}
          />
        }
      >
        <AppHeader />

        <View style={[styles.summaryHeader, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outline }]}>
          <Text style={[styles.summaryNumber, { color: mode === "sale" ? theme.colors.primaryContainer : theme.colors.secondaryContainer }]}>
            {items.length}
          </Text>
          <Text style={[styles.summarySubtitle, { color: theme.colors.muted }]}>
            {mode === "sale" ? "penjualan" : "pembelian"} hari ini
          </Text>
        </View>

        <View>
          <Text style={[styles.segmentLabel, { color: theme.colors.text }]}>PILIH TRANSAKSI</Text>
          <View style={[styles.segmentWrap, { backgroundColor: theme.isDark ? theme.colors.surfaceLow : "#EEF0F2", borderColor: theme.colors.outline }]}>
            <SegmentButton active={mode === "sale"} label="PENJUALAN" onPress={() => switchMode("sale")} />
            <SegmentButton active={mode === "purchase"} label="PEMBELIAN" onPress={() => switchMode("purchase")} />
          </View>
        </View>

        {errorMessage ? (
          <View style={[styles.notice, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outline }]}>
            <Ionicons name="information-circle-outline" size={18} color={theme.colors.secondary} />
            <Text style={[styles.noticeText, { color: theme.colors.muted }]}>{errorMessage}</Text>
          </View>
        ) : null}

        {isLoading ? (
          <View style={[styles.emptyCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outline }]}>
            <ActivityIndicator color={theme.colors.primaryContainer} />
            <Text style={[styles.emptyText, { color: theme.colors.muted }]}>Mengambil riwayat {mode === "sale" ? "penjualan" : "pembelian"}...</Text>
          </View>
        ) : items.length ? (
          <View style={styles.list}>
            {items.map((item, index) => (
              <HistoryCard key={`${item.type}-${item.id}-${index}`} item={item} />
            ))}
          </View>
        ) : (
          <View style={[styles.emptyCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outline }]}>
            <Ionicons name={mode === "sale" ? "pricetag-outline" : "cart-outline"} size={34} color={theme.colors.muted} />
            <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>Belum ada {mode === "sale" ? "penjualan" : "pembelian"} hari ini</Text>
            <Text style={[styles.emptyText, { color: theme.colors.muted }]}>
              Transaksi {mode === "sale" ? "penjualan" : "pembelian"} yang selesai hari ini akan tampil di sini.
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function AppHeader() {
  const theme = useAppTheme();

  return (
    <View style={styles.topHeader}>
      <View style={styles.headerLeft}>
        <View style={styles.headerIconButton}>
          <Ionicons name="menu" size={21} color={theme.colors.text} />
        </View>
        <Text style={[styles.screenTitle, { color: theme.colors.primary }]}>Riwayat</Text>
      </View>
      <Pressable style={styles.headerIconButton} onPress={theme.toggleTheme}>
        <Ionicons name={theme.isDark ? "sunny-outline" : "moon-outline"} size={18} color={theme.colors.text} />
      </Pressable>
    </View>
  );
}

function SegmentButton({ active, label, onPress }: { active: boolean; label: string; onPress: () => void }) {
  const theme = useAppTheme();
  return (
    <Pressable
      style={[
        styles.segmentButton,
        active && {
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.primary,
          shadowColor: "#0F172A",
        },
      ]}
      onPress={onPress}
    >
      <Text style={[styles.segmentText, { color: active ? theme.colors.primary : theme.colors.text }]}>{label}</Text>
    </Pressable>
  );
}

function HistoryCard({ item }: { item: NagagoldRecentTransaction }) {
  const theme = useAppTheme();
  const isSale = item.type === "sale";
  const accent = isSale ? theme.colors.primaryContainer : theme.colors.secondaryContainer;
  const amountPrefix = isSale ? "+" : "-";
  const icon: IconName = isSale ? "pricetag-outline" : "cart-outline";

  return (
    <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outline }]}>
      <View style={[styles.cardIcon, { backgroundColor: isSale ? "rgba(16,185,129,0.12)" : "rgba(245,158,11,0.14)" }]}>
        <Ionicons name={icon} size={22} color={accent} />
      </View>
      <View style={styles.cardBody}>
        <Text style={[styles.code, { color: theme.colors.muted }]} numberOfLines={1}>{item.id}</Text>
        <Text style={[styles.note, { color: theme.colors.text }]} numberOfLines={1}>{item.title}</Text>
        <Text style={[styles.date, { color: theme.colors.muted }]} numberOfLines={1}>
          {item.subtitle}{item.gram ? ` • ${formatGram(item.gram)}` : ""}
        </Text>
      </View>
      <View style={styles.cardRight}>
        <Text style={[styles.amount, { color: isSale ? theme.colors.primaryContainer : theme.colors.text }]} numberOfLines={1}>
          {amountPrefix}{formatRupiah(item.amount)}
        </Text>
        <View style={[styles.badge, { backgroundColor: isSale ? "rgba(16,185,129,0.12)" : theme.isDark ? "#2A2F3A" : "#FEF3C7" }]}>
          <Text style={[styles.badgeText, { color: isSale ? theme.colors.primaryContainer : theme.colors.secondary }]}>SELESAI</Text>
        </View>
      </View>
    </View>
  );
}

function formatGram(value: number): string {
  return `${Number(value || 0).toLocaleString("id-ID", { maximumFractionDigits: 3 })} Gr`;
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  container: {
    flexGrow: 1,
    gap: 14,
    paddingBottom: 32,
    paddingHorizontal: 18,
    paddingTop: Platform.OS === "ios" ? 66 : 46,
  },
  topHeader: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  headerLeft: { alignItems: "center", flexDirection: "row", gap: 13 },
  headerIconButton: { alignItems: "center", height: 34, justifyContent: "center", width: 34 },
  screenTitle: { fontSize: 20, fontWeight: "700" },
  summaryHeader: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 1,
  },
  summaryNumber: { fontSize: 34, fontWeight: "900" },
  summarySubtitle: { fontSize: 13, fontWeight: "700", marginTop: 2, textTransform: "capitalize" },
  segmentLabel: { fontSize: 12, fontWeight: "800", letterSpacing: 2, marginBottom: 9, marginLeft: 2 },
  segmentWrap: {
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: "row",
    padding: 5,
  },
  segmentButton: {
    alignItems: "center",
    borderColor: "transparent",
    borderRadius: 14,
    borderWidth: 1,
    flex: 1,
    justifyContent: "center",
    minHeight: 48,
  },
  segmentText: { fontSize: 13, fontWeight: "800", letterSpacing: 0.4 },
  notice: {
    alignItems: "center",
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: "row",
    gap: 8,
    padding: 12,
  },
  noticeText: { flex: 1, fontSize: 12, fontWeight: "600", lineHeight: 17 },
  list: { gap: 12 },
  card: {
    alignItems: "center",
    borderRadius: 20,
    borderWidth: 1,
    flexDirection: "row",
    gap: 12,
    padding: 14,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.05,
    shadowRadius: 13,
    elevation: 2,
  },
  cardIcon: { alignItems: "center", borderRadius: 16, height: 46, justifyContent: "center", width: 46 },
  cardBody: { flex: 1, gap: 4 },
  cardRight: { alignItems: "flex-end", gap: 8, maxWidth: 136 },
  code: { fontSize: 11, fontWeight: "700" },
  note: { fontSize: 14, fontWeight: "800" },
  date: { fontSize: 12, fontWeight: "600" },
  amount: { fontSize: 13, fontWeight: "900" },
  badge: { borderRadius: 8, paddingHorizontal: 9, paddingVertical: 5 },
  badgeText: { fontSize: 10, fontWeight: "900" },
  emptyCard: {
    alignItems: "center",
    borderRadius: 18,
    borderWidth: 1,
    gap: 9,
    minHeight: 190,
    justifyContent: "center",
    padding: 24,
  },
  emptyTitle: { fontSize: 15, fontWeight: "800", textAlign: "center" },
  emptyText: { fontSize: 13, fontWeight: "600", lineHeight: 19, textAlign: "center" },
});

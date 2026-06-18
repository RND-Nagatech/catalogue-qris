import { useCallback, useState, type ComponentProps } from "react";
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppHeader, EmptyState, LoadingState } from "../components/ui";
import { loadNagagoldTodayHistory, type NagagoldRecentTransaction } from "../lib/dataStore";
import { formatRupiah } from "../lib/qris";
import { useAppTheme } from "../lib/theme";

type HistoryMode = "sale" | "purchase";
type IconName = ComponentProps<typeof Ionicons>["name"];

export default function History() {
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();
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
      <AppHeader title="Riwayat" topInset={insets.top} />
      <ScrollView
        contentContainerStyle={[
          styles.container,
          {
            paddingBottom: 64 + Math.max(insets.bottom, 18) + 32,
          },
        ]}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            tintColor={theme.colors.primaryContainer}
            onRefresh={() => loadHistory(mode, true)}
          />
        }
      >
        <View
          style={[
            styles.summaryHeader,
            {
              backgroundColor: mode === "sale" ? theme.colors.primary : theme.colors.purchaseCard,
            },
            theme.elevation.level2,
          ]}
        >
          <View style={[styles.summaryIcon, { backgroundColor: "rgba(255,255,255,0.2)" }]}>
            <Ionicons
              name={mode === "sale" ? "trending-up-outline" : "bag-check-outline"}
              size={22}
              color={theme.colors.onPrimary}
            />
          </View>
          <View>
            <Text style={[styles.summaryNumber, { color: theme.colors.onPrimary }]}>
              {items.length}
            </Text>
            <Text style={[styles.summarySubtitle, { color: theme.colors.onPrimary }]}>
              {mode === "sale" ? "Penjualan Hari Ini" : "Pembelian Hari Ini"}
            </Text>
          </View>
        </View>

        <View>
          <Text style={[styles.segmentLabel, { color: theme.colors.subtleText }]}>PILIH TRANSAKSI</Text>
          <View style={[styles.segmentWrap, { backgroundColor: theme.colors.surfaceContainer, borderColor: theme.colors.outlineVariant }]}>
            <SegmentButton active={mode === "sale"} label="PENJUALAN" onPress={() => switchMode("sale")} />
            <SegmentButton active={mode === "purchase"} label="PEMBELIAN" onPress={() => switchMode("purchase")} />
          </View>
        </View>

        {errorMessage ? (
          <View style={[styles.notice, { backgroundColor: theme.colors.surfaceContainerLowest, borderColor: theme.colors.outlineVariant }]}>
            <Ionicons name="information-circle-outline" size={18} color={theme.colors.secondary} />
            <Text style={[styles.noticeText, { color: theme.colors.muted }]}>{errorMessage}</Text>
          </View>
        ) : null}

        {isLoading ? (
          <LoadingState
            title={`Mengambil riwayat ${mode === "sale" ? "penjualan" : "pembelian"}...`}
            style={[styles.emptyCard, { backgroundColor: theme.colors.surfaceContainerLowest, borderColor: theme.colors.outlineVariant }]}
          />
        ) : items.length ? (
          <View style={styles.list}>
            {items.map((item, index) => (
              <HistoryCard key={`${item.type}-${item.id}-${index}`} item={item} />
            ))}
          </View>
        ) : (
          <EmptyState
            icon={mode === "sale" ? "pricetag-outline" : "cart-outline"}
            title={`Belum ada ${mode === "sale" ? "penjualan" : "pembelian"} hari ini`}
            description={`Transaksi ${mode === "sale" ? "penjualan" : "pembelian"} yang selesai hari ini akan tampil di sini.`}
            style={[styles.emptyCard, { backgroundColor: theme.colors.surfaceContainerLowest, borderColor: theme.colors.outlineVariant }]}
          />
        )}
      </ScrollView>
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
          backgroundColor: theme.colors.surfaceContainerLowest,
          borderColor: theme.colors.primary,
          ...theme.elevation.level1,
        },
      ]}
      onPress={onPress}
    >
      <Text style={[styles.segmentText, { color: active ? theme.colors.primary : theme.colors.muted }]}>{label}</Text>
    </Pressable>
  );
}

function HistoryCard({ item }: { item: NagagoldRecentTransaction }) {
  const theme = useAppTheme();
  const isSale = item.type === "sale";
  const accent = isSale ? theme.colors.primary : theme.colors.tertiary;
  const amountPrefix = isSale ? "+" : "-";
  const icon: IconName = isSale ? "pricetag-outline" : "cart-outline";

  return (
    <View style={[styles.card, { backgroundColor: theme.colors.cardBackground, borderColor: theme.colors.cardBorder }, theme.elevation.level1]}>
      <View style={[styles.cardIcon, { backgroundColor: isSale ? theme.colors.successContainer : theme.colors.warningContainer }]}>
        <Ionicons name={icon} size={22} color={accent} />
      </View>
      <View style={styles.cardBody}>
        <Text style={[styles.code, { color: theme.colors.subtleText }]} numberOfLines={1}>{item.id}</Text>
        <Text style={[styles.note, { color: theme.colors.text }]} numberOfLines={1}>{item.title}</Text>
        <Text style={[styles.date, { color: theme.colors.muted }]} numberOfLines={1}>
          {item.subtitle}{item.gram ? ` • ${formatGram(item.gram)}` : ""}
        </Text>
      </View>
      <View style={styles.cardRight}>
        <Text style={[styles.amount, { color: isSale ? theme.colors.primary : theme.colors.tertiary }]} numberOfLines={1}>
          {amountPrefix}{formatRupiah(item.amount)}
        </Text>
        <View style={[styles.badge, { backgroundColor: isSale ? theme.colors.successContainer : theme.colors.warningContainer }]}>
          <Text style={[styles.badgeText, { color: accent }]}>SELESAI</Text>
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
    gap: 16,
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  summaryHeader: {
    alignItems: "center",
    borderRadius: 20,
    flexDirection: "row",
    gap: 14,
    minHeight: 96,
    padding: 16,
  },
  summaryIcon: { alignItems: "center", borderRadius: 14, height: 46, justifyContent: "center", width: 46 },
  summaryNumber: { fontSize: 34, fontWeight: "800", lineHeight: 38 },
  summarySubtitle: { fontSize: 12, fontWeight: "800", letterSpacing: 1.2, marginTop: 2, textTransform: "uppercase" },
  segmentLabel: { fontSize: 12, fontWeight: "800", letterSpacing: 1.4, marginBottom: 8, marginLeft: 2 },
  segmentWrap: {
    borderRadius: 20,
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
    minHeight: 46,
  },
  segmentText: { fontSize: 13, fontWeight: "800", letterSpacing: 0.3 },
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
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: "row",
    gap: 12,
    padding: 14,
  },
  cardIcon: { alignItems: "center", borderRadius: 14, height: 48, justifyContent: "center", width: 48 },
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
});

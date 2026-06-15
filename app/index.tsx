import { useCallback, useMemo, useState, type ComponentProps } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import {
  loadNagagoldDashboard,
  loadNagagoldSettings,
  type NagagoldDashboard,
  type NagagoldRecentTransaction,
} from "../lib/dataStore";
import { formatRupiah } from "../lib/qris";
import { useAppTheme } from "../lib/theme";

type IconName = ComponentProps<typeof Ionicons>["name"];

const emptyDashboard: NagagoldDashboard = {
  sales: { count: 0, gram: 0, rupiah: 0 },
  purchases: { count: 0, gram: 0, rupiah: 0 },
  recent: [],
};

export default function Home() {
  const theme = useAppTheme();
  const [dashboard, setDashboard] = useState<NagagoldDashboard>(emptyDashboard);
  const [domain, setDomain] = useState("");
  const [connected, setConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const loadDashboard = useCallback(async (refreshing = false) => {
    if (refreshing) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }

    try {
      const settings = await loadNagagoldSettings();
      setDomain(settings.domain);
      setConnected(Boolean(settings.connection?.ok));

      if (!settings.domain) {
        setDashboard(emptyDashboard);
        setErrorMessage("Atur domain NAGAGOLD di Pengaturan agar dashboard bisa membaca data toko.");
        return;
      }

      const nextDashboard = await loadNagagoldDashboard();
      setDashboard(nextDashboard);
      setConnected(true);
      setErrorMessage("");
    } catch (error) {
      setDashboard(emptyDashboard);
      setErrorMessage(error instanceof Error ? error.message : "Dashboard belum bisa mengambil data NAGAGOLD.");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      loadDashboard(false).finally(() => {
        if (!active) return;
      });
      return () => {
        active = false;
      };
    }, [loadDashboard])
  );

  const totalTransactions = useMemo(
    () => dashboard.sales.count + dashboard.purchases.count,
    [dashboard.purchases.count, dashboard.sales.count],
  );

  return (
    <View style={[styles.screen, { backgroundColor: theme.colors.background }]}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            tintColor={theme.colors.primaryContainer}
            onRefresh={() => loadDashboard(true)}
          />
        }
      >
        <AppHeader />

        <View style={styles.titleBlock}>
          <Text style={[styles.eyebrow, { color: theme.colors.primaryContainer }]}>RINGKASAN HARI INI</Text>
          <Text style={[styles.welcomeTitle, { color: theme.colors.text }]}>Selamat datang kembali👋</Text>
          <Text style={[styles.welcomeSub, { color: theme.colors.muted }]}>
            {domain ? (connected ? "Terhubung ke NAGAGOLD" : "Domain tersimpan, koneksi belum dites") : "Domain NAGAGOLD belum diatur"}
          </Text>
        </View>

        {errorMessage ? (
          <Pressable
            style={[styles.notice, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outline }]}
            onPress={() => router.push("/settings")}
          >
            <Ionicons name="information-circle-outline" size={18} color={theme.colors.secondary} />
            <Text style={[styles.noticeText, { color: theme.colors.muted }]}>{errorMessage}</Text>
          </Pressable>
        ) : null}

        <View style={styles.summaryGrid}>
          <SummaryCard
            color="#059669"
            icon="cart-outline"
            label="TOTAL PENJUALAN"
            count={dashboard.sales.count}
            gram={dashboard.sales.gram}
            amount={dashboard.sales.rupiah}
            onPress={() => router.push("/sales")}
          />
          <SummaryCard
            color="#F59E0B"
            icon="bag-check-outline"
            label="TOTAL PEMBELIAN"
            count={dashboard.purchases.count}
            gram={dashboard.purchases.gram}
            amount={dashboard.purchases.rupiah}
            onPress={() => router.push("/purchases")}
          />
        </View>

        <View style={styles.sectionHeader}>
          <View>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Histori Transaksi</Text>
            <Text style={[styles.sectionSubtitle, { color: theme.colors.muted }]}>
              {totalTransactions} transaksi tercatat hari ini
            </Text>
          </View>
          <Pressable onPress={() => router.push("/history")}>
            <Text style={[styles.seeAll, { color: theme.colors.primaryContainer }]}>Lihat Semua</Text>
          </Pressable>
        </View>

        <View style={[styles.historyCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outline }]}>
          {isLoading ? (
            <View style={styles.loadingState}>
              <ActivityIndicator color={theme.colors.primaryContainer} />
              <Text style={[styles.emptyText, { color: theme.colors.muted }]}>Mengambil data dashboard...</Text>
            </View>
          ) : dashboard.recent.length ? (
            dashboard.recent.map((item, index) => (
              <RecentRow
                item={item}
                key={`${item.type}-${item.id}-${index}`}
                isLast={index === dashboard.recent.length - 1}
              />
            ))
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="receipt-outline" size={34} color={theme.colors.muted} />
              <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>Belum ada transaksi terbaru</Text>
              <Text style={[styles.emptyText, { color: theme.colors.muted }]}>
                Transaksi penjualan dan pembelian hari ini akan muncul di sini.
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

function AppHeader() {
  const theme = useAppTheme();

  return (
    <View style={styles.topHeader}>
      <View style={styles.headerLeft}>
        <Pressable style={styles.headerIconButton}>
          <Ionicons name="menu" size={21} color={theme.colors.text} />
        </Pressable>
        <Text style={[styles.screenTitle, { color: theme.colors.primary }]}>Dashboard</Text>
      </View>
      <View style={styles.headerActions}>
        <Pressable style={styles.headerIconButton} onPress={theme.toggleTheme}>
          <Ionicons name={theme.isDark ? "sunny-outline" : "moon-outline"} size={19} color={theme.colors.text} />
        </Pressable>
        <Pressable style={styles.headerIconButton}>
          <Ionicons name="notifications-outline" size={20} color={theme.colors.text} />
          <View style={styles.notificationDot} />
        </Pressable>
      </View>
    </View>
  );
}

function SummaryCard({
  amount,
  color,
  count,
  gram,
  icon,
  label,
  onPress,
}: {
  amount: number;
  color: string;
  count: number;
  gram: number;
  icon: IconName;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable style={[styles.summaryCard, { backgroundColor: color }]} onPress={onPress}>
      <Ionicons name={icon} size={92} color="rgba(255,255,255,0.14)" style={styles.summaryGhostIcon} />
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={styles.summaryCount}>{formatNumber(count)}</Text>
      <Text style={styles.summaryGram}>{formatGram(gram)}</Text>
      <Text style={styles.summaryAmount}>{formatRupiah(amount)}</Text>
      <View style={styles.summaryLink}>
        <Text style={styles.summaryLinkText}>Transaksi Baru</Text>
        <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
      </View>
    </Pressable>
  );
}

function RecentRow({ isLast, item }: { isLast: boolean; item: NagagoldRecentTransaction }) {
  const theme = useAppTheme();
  const isSale = item.type === "sale";
  const accent = isSale ? theme.colors.primaryContainer : theme.colors.danger;

  return (
    <View style={[styles.recentRow, !isLast && { borderBottomColor: theme.colors.outline, borderBottomWidth: StyleSheet.hairlineWidth }]}>
      <View style={[styles.recentIcon, { backgroundColor: isSale ? "rgba(16,185,129,0.12)" : "rgba(239,68,68,0.10)" }]}>
        <Ionicons name={isSale ? "pricetag-outline" : "cart-outline"} size={22} color={accent} />
      </View>
      <View style={styles.recentBody}>
        <Text style={[styles.recentTitle, { color: theme.colors.text }]} numberOfLines={1}>{item.title}</Text>
        <Text style={[styles.recentMeta, { color: theme.colors.muted }]} numberOfLines={1}>{item.subtitle}</Text>
      </View>
      <View style={styles.recentRight}>
        <Text style={[styles.recentAmount, { color: isSale ? theme.colors.primaryContainer : theme.colors.text }]} numberOfLines={1}>
          {isSale ? "+" : "-"}{formatRupiah(item.amount)}
        </Text>
        <View style={[styles.statusBadge, { backgroundColor: isSale ? "rgba(16,185,129,0.12)" : theme.isDark ? "#2A2F3A" : "#E5E7EB" }]}>
          <Text style={[styles.statusBadgeText, { color: isSale ? theme.colors.primaryContainer : theme.colors.muted }]}>SELESAI</Text>
        </View>
      </View>
    </View>
  );
}

function formatNumber(value: number): string {
  return Math.floor(value).toLocaleString("id-ID");
}

function formatGram(value: number): string {
  const formatted = Number(value || 0).toLocaleString("id-ID", {
    maximumFractionDigits: 3,
  });
  return `${formatted} Gr`;
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { gap: 16, paddingBottom: 28, paddingHorizontal: 18, paddingTop: 62 },
  topHeader: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", marginBottom: 4 },
  headerLeft: { alignItems: "center", flexDirection: "row", gap: 13 },
  headerActions: { alignItems: "center", flexDirection: "row", gap: 8 },
  headerIconButton: { alignItems: "center", height: 34, justifyContent: "center", width: 34 },
  notificationDot: {
    backgroundColor: "#EF4444",
    borderRadius: 999,
    height: 7,
    position: "absolute",
    right: 8,
    top: 7,
    width: 7,
  },
  screenTitle: { fontSize: 20, fontWeight: "700" },
  titleBlock: { gap: 5, marginTop: 4 },
  eyebrow: { fontSize: 12, fontWeight: "800", letterSpacing: 4 },
  welcomeTitle: { fontSize: 22, fontWeight: "800", lineHeight: 29 },
  welcomeSub: { fontSize: 13, fontWeight: "600" },
  notice: {
    alignItems: "center",
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: "row",
    gap: 8,
    padding: 12,
  },
  noticeText: { flex: 1, fontSize: 12, fontWeight: "600", lineHeight: 17 },
  summaryGrid: { flexDirection: "row", gap: 14 },
  summaryCard: {
    borderRadius: 24,
    elevation: 4,
    flex: 1,
    minHeight: 206,
    overflow: "hidden",
    padding: 18,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.14,
    shadowRadius: 18,
  },
  summaryGhostIcon: { position: "absolute", right: -10, top: 5 },
  summaryLabel: { color: "rgba(255,255,255,0.86)", fontSize: 11, fontWeight: "800", letterSpacing: 1.2 },
  summaryCount: { color: "#FFFFFF", fontSize: 38, fontWeight: "900", marginTop: 14 },
  summaryGram: { color: "#FFFFFF", fontSize: 18, fontWeight: "800", marginTop: 1 },
  summaryAmount: { color: "rgba(255,255,255,0.92)", fontSize: 14, fontWeight: "700", marginTop: 8 },
  summaryLink: {
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: "rgba(255,255,255,0.18)",
    borderRadius: 14,
    flexDirection: "row",
    gap: 8,
    marginTop: "auto",
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  summaryLinkText: { color: "#FFFFFF", fontSize: 12, fontWeight: "900" },
  sectionHeader: { alignItems: "flex-end", flexDirection: "row", justifyContent: "space-between", marginTop: 10 },
  sectionTitle: { fontSize: 19, fontWeight: "800" },
  sectionSubtitle: { fontSize: 13, fontWeight: "600", marginTop: 3 },
  seeAll: { fontSize: 14, fontWeight: "800" },
  historyCard: {
    borderRadius: 22,
    borderWidth: 1,
    overflow: "hidden",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.05,
    shadowRadius: 16,
    elevation: 2,
  },
  recentRow: { alignItems: "center", flexDirection: "row", gap: 12, minHeight: 82, padding: 14 },
  recentIcon: { alignItems: "center", borderRadius: 18, height: 48, justifyContent: "center", width: 48 },
  recentBody: { flex: 1, gap: 4 },
  recentTitle: { fontSize: 15, fontWeight: "800" },
  recentMeta: { fontSize: 12, fontWeight: "600" },
  recentRight: { alignItems: "flex-end", gap: 7, maxWidth: 142 },
  recentAmount: { fontSize: 14, fontWeight: "900" },
  statusBadge: { borderRadius: 8, paddingHorizontal: 9, paddingVertical: 6 },
  statusBadgeText: { fontSize: 10, fontWeight: "900" },
  loadingState: { alignItems: "center", gap: 10, minHeight: 180, justifyContent: "center", padding: 22 },
  emptyState: { alignItems: "center", gap: 9, minHeight: 190, justifyContent: "center", padding: 22 },
  emptyTitle: { fontSize: 16, fontWeight: "800" },
  emptyText: { fontSize: 13, fontWeight: "600", lineHeight: 18, textAlign: "center" },
});

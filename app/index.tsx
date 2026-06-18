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
import { router, useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { EmptyState, LoadingState } from "../components/ui";
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

function HomeHeader({ topInset }: { topInset: number }) {
  const theme = useAppTheme();

  return (
    <View
      style={[
        styles.homeHeader,
        {
          backgroundColor: theme.colors.surface,
          borderBottomColor: theme.colors.divider,
          paddingTop: topInset,
        },
      ]}
    >
      <Pressable accessibilityRole="button" style={styles.headerIconButton}>
        <Ionicons name="menu-outline" size={24} color={theme.colors.primary} />
      </Pressable>
      <Text style={[theme.typography.title, styles.homeHeaderTitle, { color: theme.colors.primary }]}>Beranda</Text>
      <Pressable accessibilityRole="button" style={styles.headerIconButton} onPress={theme.toggleTheme}>
        <Ionicons name={theme.isDark ? "sunny-outline" : "moon-outline"} size={23} color={theme.colors.primary} />
      </Pressable>
    </View>
  );
}

export default function Home() {
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();
  const [dashboard, setDashboard] = useState<NagagoldDashboard>(emptyDashboard);
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

      if (!settings.domain) {
        setDashboard(emptyDashboard);
        setErrorMessage("Atur domain NAGAGOLD di Pengaturan agar dashboard bisa membaca data toko.");
        return;
      }

      const nextDashboard = await loadNagagoldDashboard();
      setDashboard(nextDashboard);
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

  return (
    <View style={[styles.screen, { backgroundColor: theme.colors.background }]}>
      <HomeHeader topInset={insets.top} />
      <ScrollView
        contentContainerStyle={[
          styles.content,
          {
            paddingBottom: 64 + Math.max(insets.bottom, 18) + 32,
          },
        ]}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            tintColor={theme.colors.primaryContainer}
            onRefresh={() => loadDashboard(true)}
          />
        }
      >
        {errorMessage ? (
          <Pressable
            style={[
              styles.notice,
              {
                backgroundColor: theme.colors.surfaceContainerLowest,
                borderColor: theme.colors.outlineVariant,
                borderRadius: theme.radius.lg,
              },
            ]}
            onPress={() => router.push("/settings")}
          >
            <Ionicons name="information-circle-outline" size={18} color={theme.colors.secondary} />
            <Text style={[theme.typography.bodySmall, styles.noticeText, { color: theme.colors.muted }]}>{errorMessage}</Text>
          </Pressable>
        ) : null}

        <View style={styles.summaryGrid}>
          <SummaryCard
            icon="trending-up-outline"
            label="TOTAL PENJUALAN"
            count={dashboard.sales.count}
            gram={dashboard.sales.gram}
            amount={dashboard.sales.rupiah}
            onPress={() => router.push("/sales")}
            variant="sales"
          />
          <SummaryCard
            icon="bag-check-outline"
            label="TOTAL PEMBELIAN"
            count={dashboard.purchases.count}
            gram={dashboard.purchases.gram}
            amount={dashboard.purchases.rupiah}
            onPress={() => router.push("/purchases")}
            variant="purchase"
          />
        </View>

        <View style={styles.sectionHeader}>
          <View>
            <Text style={[theme.typography.title, { color: theme.colors.text }]}>Transaksi Terbaru</Text>
            {/* <Text style={[theme.typography.bodySmall, { color: theme.colors.subtleText }]}>Aktivitas keuangan terakhir Anda</Text> */}
          </View>
          <Pressable onPress={() => router.push("/history")}>
            <Text style={[theme.typography.label, { color: theme.colors.primary }]}>Lihat Semua</Text>
          </Pressable>
        </View>

        {isLoading ? (
          <LoadingState title="Mengambil data dashboard..." />
        ) : dashboard.recent.length ? (
          <View style={styles.recentList}>
            {dashboard.recent.map((item, index) => (
              <RecentRow
                item={item}
                key={`${item.type}-${item.id}-${index}`}
              />
            ))}
          </View>
        ) : (
          <EmptyState
            icon="receipt-outline"
            title="Belum ada transaksi terbaru"
            description="Transaksi penjualan dan pembelian hari ini akan muncul di sini."
          />
        )}
      </ScrollView>
    </View>
  );
}

function SummaryCard({
  amount,
  count,
  gram,
  icon,
  label,
  onPress,
  variant,
}: {
  amount: number;
  count: number;
  gram: number;
  icon: IconName;
  label: string;
  onPress: () => void;
  variant: "sales" | "purchase";
}) {
  const theme = useAppTheme();
  const isSales = variant === "sales";
  const backgroundColor = isSales ? theme.colors.salesCard : theme.colors.purchaseCard;
  const secondaryBackgroundColor = isSales ? theme.colors.salesCardAlt : theme.colors.purchaseCardAlt;
  const buttonBackground = isSales ? theme.colors.primaryFixedDim : theme.colors.tertiaryFixedDim;
  const buttonTextColor = isSales
    ? theme.isDark ? theme.colors.primaryText : theme.colors.primary
    : theme.isDark ? theme.colors.onTertiary : theme.colors.tertiary;
  const foregroundColor = theme.colors.onPrimary;

  return (
    <Pressable
      style={[
        styles.summaryCard,
        {
          backgroundColor,
          borderBottomLeftRadius: theme.radius.xl,
          borderBottomRightRadius: theme.radius.xl,
          borderTopLeftRadius: theme.radius.xl,
          borderTopRightRadius: theme.radius.sm,
          shadowColor: backgroundColor,
        },
      ]}
      onPress={onPress}
    >
      <View style={[styles.summaryCardShade, { backgroundColor: secondaryBackgroundColor }]} />
      <View style={styles.summaryGlowTop} />
      <View style={styles.summaryGlowBottom} />
      <View style={styles.summaryIconBubble}>
        <Ionicons name={icon} size={22} color="rgba(255,255,255,0.6)" />
      </View>
      <View>
        <Text style={[theme.typography.labelCaps, styles.summaryLabel, { color: foregroundColor }]}>{label}</Text>
        <Text style={[styles.summaryAmount, { color: foregroundColor }]} numberOfLines={1} ellipsizeMode="tail">
          {formatRupiah(amount)}
        </Text>
        <View style={[styles.summaryAccentLine, { backgroundColor: buttonBackground }]} />
      </View>
      <View style={styles.summaryFooter}>
        <View style={styles.summaryMetrics}>
          <View style={styles.metricBox}>
            <Text style={[styles.metricLabel, { color: foregroundColor }]}>Gramasi</Text>
            <Text style={[styles.metricValue, { color: foregroundColor }]}>{formatGram(gram)}</Text>
          </View>
          <View style={styles.metricBox}>
            <Text style={[styles.metricLabel, { color: foregroundColor }]}>History</Text>
            <Text style={[styles.metricValue, { color: foregroundColor }]}>{formatNumber(count)} Trx</Text>
          </View>
        </View>
        <Pressable
          accessibilityRole="button"
          style={({ pressed }) => [
            styles.summaryButton,
            {
              backgroundColor: buttonBackground,
              opacity: pressed ? 0.82 : 1,
            },
          ]}
          onPress={onPress}
        >
          <View style={styles.summaryButtonIcon}>
            <Ionicons name="add-circle-outline" size={22} color={buttonTextColor} />
          </View>
          <Text style={[styles.summaryButtonText, { color: buttonTextColor }]}>Transaksi Baru</Text>
        </Pressable>
      </View>
    </Pressable>
  );
}

function RecentRow({ item }: { item: NagagoldRecentTransaction }) {
  const theme = useAppTheme();
  const isSale = item.type === "sale";
  const accent = isSale ? theme.colors.primary : theme.colors.tertiary;
  const amountColor = isSale ? theme.colors.primary : theme.colors.error;
  const statusLabel = item.status || (isSale ? "SELESAI" : "PROSES");

  return (
    <View
      style={[
        styles.recentRow,
        {
          backgroundColor: theme.colors.glassSurface,
          borderColor: theme.colors.cardBorder,
        },
        theme.elevation.level1,
      ]}
    >
      <View style={[styles.recentIcon, { backgroundColor: isSale ? theme.colors.successContainer : theme.colors.warningContainer }]}>
        <Ionicons name={isSale ? "cash-outline" : "bag-handle-outline"} size={24} color={accent} />
      </View>
      <View style={styles.recentBody}>
        <Text style={[styles.recentTitle, { color: theme.colors.text }]} numberOfLines={2}>{item.title}</Text>
        <Text style={[theme.typography.bodySmall, { color: theme.colors.muted }]} numberOfLines={1}>
          {item.type === "sale" ? "Penjualan" : "Pembelian"}  •  {item.time || item.subtitle}
        </Text>
      </View>
      <View style={styles.recentRight}>
        <Text style={[styles.recentAmount, { color: amountColor }]} numberOfLines={1}>
          {isSale ? "+" : "-"}{formatRupiah(item.amount)}
        </Text>
        <View style={[styles.statusChip, { backgroundColor: isSale ? theme.colors.successContainer : theme.colors.warningContainer }]}>
          <Text style={[styles.statusChipText, { color: accent }]} numberOfLines={1}>{statusLabel.toUpperCase()}</Text>
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
  homeHeader: {
    alignItems: "center",
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    gap: 16,
    minHeight: 64,
    paddingBottom: 12,
    paddingHorizontal: 20,
  },
  headerIconButton: {
    alignItems: "center",
    height: 40,
    justifyContent: "center",
    width: 40,
  },
  homeHeaderTitle: { flex: 1, fontSize: 22, lineHeight: 30 },
  content: { paddingHorizontal: 20, paddingTop: 24 },
  notice: {
    alignItems: "center",
    borderWidth: 1,
    flexDirection: "row",
    gap: 8,
    padding: 12,
  },
  noticeText: { flex: 1 },
  summaryGrid: { gap: 16, marginBottom: 28 },
  summaryCard: {
    elevation: 8,
    minHeight: 204,
    overflow: "hidden",
    padding: 20,
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.18,
    shadowRadius: 32,
  },
  summaryCardShade: {
    bottom: 0,
    opacity: 0.5,
    position: "absolute",
    right: 0,
    top: 0,
    width: "58%",
  },
  summaryGlowTop: {
    backgroundColor: "rgba(255,255,255,0.11)",
    borderRadius: 100,
    height: 160,
    position: "absolute",
    right: -60,
    top: -70,
    width: 160,
  },
  summaryGlowBottom: {
    backgroundColor: "rgba(0,0,0,0.08)",
    borderRadius: 120,
    bottom: -80,
    height: 180,
    left: -50,
    position: "absolute",
    width: 180,
  },
  summaryIconBubble: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.12)",
    borderRadius: 999,
    height: 38,
    justifyContent: "center",
    position: "absolute",
    right: 18,
    top: 18,
    width: 38,
  },
  summaryButton: {
    alignItems: "center",
    borderRadius: 16,
    flexDirection: "row",
    gap: 10,
    justifyContent: "center",
    minHeight: 48,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.16,
    shadowRadius: 14,
  },
  summaryButtonIcon: { alignItems: "center", justifyContent: "center" },
  summaryButtonText: { fontSize: 17, fontWeight: "800", lineHeight: 22 },
  summaryFooter: { gap: 14, marginTop: "auto" },
  summaryLabel: { opacity: 0.68, textTransform: "uppercase" },
  summaryAmount: { fontSize: 31, fontWeight: "800", lineHeight: 38, marginTop: 10 },
  summaryAccentLine: { borderRadius: 999, height: 4, marginTop: 6, width: 52 },
  summaryMetrics: { flexDirection: "row", gap: 12 },
  metricBox: {
    borderColor: "rgba(255,255,255,0.12)",
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    flex: 1,
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  metricLabel: { fontSize: 11, fontWeight: "800", opacity: 0.62, textTransform: "uppercase" },
  metricValue: { fontSize: 18, fontWeight: "800", lineHeight: 23 },
  sectionHeader: {
    alignItems: "flex-end",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  recentList: { gap: 16 },
  recentRow: {
    alignItems: "center",
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    gap: 16,
    minHeight: 106,
    padding: 16,
  },
  recentIcon: { alignItems: "center", borderRadius: 14, height: 56, justifyContent: "center", width: 56 },
  recentBody: { flex: 1, gap: 4, minWidth: 0 },
  recentTitle: { fontSize: 17, fontWeight: "800", lineHeight: 22 },
  recentRight: { alignItems: "flex-end", gap: 8, maxWidth: 128 },
  recentAmount: { fontSize: 16, fontWeight: "800", lineHeight: 22, textAlign: "right" },
  statusChip: { borderRadius: 6, paddingHorizontal: 9, paddingVertical: 5 },
  statusChipText: { fontSize: 10, fontWeight: "800", lineHeight: 12 },
});

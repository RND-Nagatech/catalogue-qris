import { useCallback, useMemo, useState, type ComponentProps } from "react";
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
import { AppHeader, CardContainer, EmptyState, LoadingState, PrimaryButton, StatusBadge } from "../components/ui";
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
  const connectionText = domain
    ? connected
      ? "Terhubung ke Server"
      : "Domain tersimpan, koneksi belum dites"
    : "Domain Program belum diatur";

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
        <AppHeader title="Beranda" />

        <View style={styles.titleBlock}>
          <Text style={[theme.typography.body, { color: theme.colors.muted }]}>Selamat datang kembali👋</Text>
          <View style={styles.connectionRow}>
            <Text style={[theme.typography.title, { color: theme.colors.text }]}>
              {connectionText.includes("Terhubung") ? "Terhubung ke " : connectionText}
            </Text>
            {connectionText.includes("Terhubung") ? (
              <>
                <Text style={[theme.typography.title, { color: theme.colors.primary }]}>Server</Text>
                <View style={[styles.pulseDot, { backgroundColor: theme.colors.primary }]} />
              </>
            ) : null}
          </View>
        </View>

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
            backgroundColor={theme.colors.primary}
            buttonBackground={theme.colors.surfaceContainerLowest}
            buttonTextColor={theme.colors.primary}
            foregroundColor={theme.colors.onPrimary}
            icon="cart-outline"
            label="TOTAL PENJUALAN"
            count={dashboard.sales.count}
            gram={dashboard.sales.gram}
            amount={dashboard.sales.rupiah}
            onPress={() => router.push("/sales")}
          />
          <SummaryCard
            backgroundColor={theme.colors.secondaryContainer}
            buttonBackground={theme.colors.onSecondaryContainer}
            buttonTextColor={theme.isDark ? theme.colors.secondaryFixed : theme.colors.onSecondary}
            foregroundColor={theme.colors.onSecondaryContainer}
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
            <Text style={[theme.typography.title, { color: theme.colors.text }]}>Transaksi Terbaru</Text>
            {/* <Text style={[theme.typography.bodySmall, { color: theme.colors.muted }]}>
              {totalTransactions} transaksi tercatat hari ini
            </Text> */}
          </View>
          <Pressable onPress={() => router.push("/history")}>
            <Text style={[theme.typography.label, { color: theme.colors.primary }]}>Lihat Semua</Text>
          </Pressable>
        </View>

        {isLoading ? (
          <LoadingState title="Mengambil data dashboard..." />
        ) : dashboard.recent.length ? (
          <CardContainer padded={false} style={styles.historyCard}>
            {dashboard.recent.map((item, index) => (
              <RecentRow
                item={item}
                key={`${item.type}-${item.id}-${index}`}
                isLast={index === dashboard.recent.length - 1}
              />
            ))}
          </CardContainer>
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
  backgroundColor,
  buttonBackground,
  buttonTextColor,
  count,
  foregroundColor,
  gram,
  icon,
  label,
  onPress,
}: {
  amount: number;
  backgroundColor: string;
  buttonBackground: string;
  buttonTextColor: string;
  count: number;
  foregroundColor: string;
  gram: number;
  icon: IconName;
  label: string;
  onPress: () => void;
}) {
  const theme = useAppTheme();

  return (
    <Pressable
      style={[
        styles.summaryCard,
        {
          backgroundColor,
          borderRadius: theme.radius.xl,
          shadowColor: backgroundColor,
        },
      ]}
      onPress={onPress}
    >
      <Ionicons name={icon} size={84} color="rgba(255,255,255,0.16)" style={styles.summaryGhostIcon} />
      <View>
        <Text style={[theme.typography.labelCaps, styles.summaryLabel, { color: foregroundColor }]}>{label}</Text>
        <Text style={[theme.typography.displayMobile, styles.summaryAmount, { color: foregroundColor }]} numberOfLines={1} adjustsFontSizeToFit>
          {formatRupiah(amount)}
        </Text>
      </View>
      <View style={styles.summaryFooter}>
        <View style={styles.summaryMetrics}>
          <View>
            <Text style={[styles.metricLabel, { color: foregroundColor }]}>Gramasi</Text>
            <Text style={[theme.typography.label, { color: foregroundColor }]}>{formatGram(gram)}</Text>
          </View>
          <View style={[styles.metricDivider, { backgroundColor: foregroundColor }]} />
          <View>
            <Text style={[styles.metricLabel, { color: foregroundColor }]}>History</Text>
            <Text style={[theme.typography.label, { color: foregroundColor }]}>{formatNumber(count)} Transaksi</Text>
          </View>
        </View>
        <PrimaryButton
          title="Transaksi Baru"
          icon="add"
          iconColor={buttonTextColor}
          style={[styles.summaryButton, { backgroundColor: buttonBackground, borderColor: buttonBackground }]}
          textStyle={{ color: buttonTextColor, fontSize: 12 }}
          onPress={onPress}
        />
      </View>
    </Pressable>
  );
}

function RecentRow({ isLast, item }: { isLast: boolean; item: NagagoldRecentTransaction }) {
  const theme = useAppTheme();
  const isSale = item.type === "sale";
  const accent = isSale ? theme.colors.primary : theme.colors.secondary;

  return (
    <View style={[styles.recentRow, !isLast && { borderBottomColor: theme.colors.divider, borderBottomWidth: StyleSheet.hairlineWidth }]}>
      <View style={[styles.recentIcon, { backgroundColor: isSale ? theme.colors.successContainer : theme.colors.warningContainer }]}>
        <Ionicons name={isSale ? "pricetag-outline" : "cart-outline"} size={22} color={accent} />
      </View>
      <View style={styles.recentBody}>
        <Text style={[theme.typography.label, { color: theme.colors.text }]} numberOfLines={1}>{item.title}</Text>
        <Text style={[theme.typography.bodySmall, { color: theme.colors.muted }]} numberOfLines={1}>{item.subtitle}</Text>
      </View>
      <View style={styles.recentRight}>
        <Text style={[theme.typography.label, styles.recentAmount, { color: isSale ? theme.colors.primary : theme.colors.text }]} numberOfLines={1}>
          {isSale ? "+" : "-"}{formatRupiah(item.amount)}
        </Text>
        <StatusBadge label="SELESAI" variant={isSale ? "success" : "neutral"} />
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
  content: { gap: 16, paddingBottom: 28, paddingHorizontal: 16, paddingTop: 54 },
  connectionRow: { alignItems: "center", flexDirection: "row", flexWrap: "wrap", gap: 5 },
  pulseDot: { borderRadius: 999, height: 8, marginLeft: 2, width: 8 },
  titleBlock: { gap: 2, marginBottom: 2 },
  notice: {
    alignItems: "center",
    borderWidth: 1,
    flexDirection: "row",
    gap: 8,
    padding: 12,
  },
  noticeText: { flex: 1 },
  summaryGrid: { gap: 16 },
  summaryCard: {
    elevation: 4,
    minHeight: 180,
    overflow: "hidden",
    padding: 16,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
  },
  summaryButton: { minHeight: 40, paddingHorizontal: 12 },
  summaryFooter: { gap: 14, marginTop: "auto" },
  summaryGhostIcon: { position: "absolute", right: -8, top: 6 },
  summaryLabel: { opacity: 0.78, textTransform: "uppercase" },
  summaryAmount: { marginTop: 4 },
  summaryMetrics: { alignItems: "center", flexDirection: "row", gap: 12 },
  metricDivider: { height: 28, opacity: 0.22, width: 1 },
  metricLabel: { fontSize: 10, fontWeight: "800", opacity: 0.68, textTransform: "uppercase" },
  sectionHeader: { alignItems: "flex-end", flexDirection: "row", justifyContent: "space-between", marginTop: 8 },
  historyCard: { overflow: "hidden" },
  recentRow: { alignItems: "center", flexDirection: "row", gap: 12, minHeight: 82, padding: 14 },
  recentIcon: { alignItems: "center", borderRadius: 14, height: 48, justifyContent: "center", width: 48 },
  recentBody: { flex: 1, gap: 4, minWidth: 0 },
  recentRight: { alignItems: "flex-end", gap: 7, maxWidth: 148 },
  recentAmount: { textAlign: "right" },
});

import { useCallback, useMemo, useState } from "react";
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import QRCode from "react-native-qrcode-svg";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useFocusEffect } from "expo-router";
import {
  authorizeNagagoldTransaction,
  loadNagagoldDomain,
  loadNagagoldRekenings,
  loadNagagoldSalesPeople,
  loadQrisString,
  lookupNagagoldMemberByCode,
  lookupNagagoldSaleItem,
  searchNagagoldMembers,
  submitNagagoldSale,
  type NagagoldMember,
  type NagagoldRekening,
  type NagagoldSaleLookupItem,
  type NagagoldSalesPerson,
} from "../lib/dataStore";
import { generateDynamicQris } from "../contohqris";
import { formatRupiah, normalizeQris } from "../lib/qris";
import { useAppTheme } from "../lib/theme";

type SaleItem = {
  id: string;
  kodeBarcode: string;
  namaBarang: string;
  berat: number;
  hargaGram: number;
  hargaJual: number;
  ongkos: number;
  total: number;
  keterangan: string;
  imageUrl?: string;
  authorizationIds?: string[];
  raw?: Record<string, unknown>;
};

type PendingSaleAuthorization = {
  reasons: string[];
  payload: {
    berat: number;
    hargaJual: number;
    hargaGram: number;
    ongkos: number;
    total: number;
  };
};

type PaymentLine = {
  id: string;
  method: "CASH" | "TRANSFER" | "DEBET" | "CREDIT";
  amount: number;
  nominalWithFee: number;
  bank?: string;
  rekening?: string;
  noCard?: string;
  feePercent?: number;
  feeAmount?: number;
  rekeningLabel?: string;
};

const paymentMethods: PaymentLine["method"][] = ["CASH", "TRANSFER", "DEBET", "CREDIT"];
const colors = {
  background: "#F7F9FB",
  surface: "#FFFFFF",
  surfaceLow: "#F2F4F6",
  surfaceContainer: "#ECEEF0",
  text: "#191C1E",
  muted: "#3F4944",
  outline: "#BEC9C2",
  outlineStrong: "#6F7973",
  primary: "#004532",
  primaryContainer: "#065F46",
  primarySoft: "#A6F2D1",
  secondary: "#904D00",
  secondaryContainer: "#FE932C",
  tertiary: "#2D3D52",
  danger: "#BA1A1A",
};

export default function Sales() {
  const theme = useAppTheme();
  const [domain, setDomain] = useState("");
  const [savedQris, setSavedQris] = useState("");
  const [salesPeople, setSalesPeople] = useState<NagagoldSalesPerson[]>([]);
  const [rekenings, setRekenings] = useState<NagagoldRekening[]>([]);
  const [isLoadingMaster, setIsLoadingMaster] = useState(false);
  const [customerOpen, setCustomerOpen] = useState(false);
  const [itemOpen, setItemOpen] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [kodeSales, setKodeSales] = useState("");
  const [kodeMember, setKodeMember] = useState("");
  const [jenisCustomer, setJenisCustomer] = useState("NON MEMBER");
  const [namaCustomer, setNamaCustomer] = useState("");
  const [alamatCustomer, setAlamatCustomer] = useState("");
  const [noHp, setNoHp] = useState("");
  const [memberResults, setMemberResults] = useState<NagagoldMember[]>([]);
  const [kodeBarcode, setKodeBarcode] = useState("");
  const [namaBarang, setNamaBarang] = useState("");
  const [berat, setBerat] = useState("");
  const [hargaJual, setHargaJual] = useState("");
  const [hargaGram, setHargaGram] = useState("");
  const [ongkos, setOngkos] = useState("");
  const [itemNote, setItemNote] = useState("");
  const [itemImageUrl, setItemImageUrl] = useState("");
  const [saleItemRaw, setSaleItemRaw] = useState<NagagoldSaleLookupItem | null>(null);
  const [payments, setPayments] = useState<PaymentLine[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<PaymentLine["method"]>("CASH");
  const [paymentRekening, setPaymentRekening] = useState("");
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentNoCard, setPaymentNoCard] = useState("");
  const [paymentFeePercent, setPaymentFeePercent] = useState("");
  const [isLookingUpMember, setIsLookingUpMember] = useState(false);
  const [isLookingUpItem, setIsLookingUpItem] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAuthorizing, setIsAuthorizing] = useState(false);
  const [pendingAuthorization, setPendingAuthorization] = useState<PendingSaleAuthorization | null>(null);
  const [items, setItems] = useState<SaleItem[]>([]);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      setIsLoadingMaster(true);
      Promise.all([
        loadNagagoldDomain(),
        loadQrisString().catch(() => ""),
        loadNagagoldSalesPeople().catch(() => []),
        loadNagagoldRekenings().catch(() => []),
      ])
        .then(([savedDomain, nextQris, nextSalesPeople, nextRekenings]) => {
          if (!active) return;
          setDomain(savedDomain);
          setSavedQris(nextQris);
          setSalesPeople(nextSalesPeople);
          setRekenings(nextRekenings);
        })
        .catch(() => {
          if (active) setDomain("");
        })
        .finally(() => {
          if (active) setIsLoadingMaster(false);
        });
      return () => {
        active = false;
      };
    }, [])
  );

  const total = useMemo(() => items.reduce((sum, item) => sum + item.total, 0), [items]);
  const paidTotal = payments.reduce((sum, item) => sum + item.amount, 0);
  const remaining = Math.max(total - paidTotal, 0);
  const firstItem = items[0];
  const canOpenPayment = Boolean(kodeSales.trim() && items.length);

  const saveCustomer = async () => {
    if (!kodeSales.trim()) {
      Alert.alert("Data belum lengkap", "Kode sales wajib dipilih.");
      return;
    }
    if (!namaCustomer.trim()) {
      setNamaCustomer("REGULER");
    }
    setCustomerOpen(false);
    await Haptics.selectionAsync();
  };

  const lookupMember = async () => {
    const code = kodeMember.trim();
    if (!code) {
      Alert.alert("Kode member kosong", "Masukkan kode customer/member terlebih dahulu.");
      return;
    }

    setIsLookingUpMember(true);
    try {
      const member = await lookupNagagoldMemberByCode(code);
      if (!member) {
        Alert.alert("Member tidak ditemukan", "Kode member tidak ada di database NAGAGOLD.");
        return;
      }

      applyMember(member);
      await Haptics.selectionAsync();
    } catch (error) {
      Alert.alert("Gagal lookup member", error instanceof Error ? error.message : "Customer belum bisa diambil dari NAGAGOLD.");
    } finally {
      setIsLookingUpMember(false);
    }
  };

  const searchMembers = async () => {
    const phoneQuery = noHp.trim();
    const nameQuery = namaCustomer.trim();
    const query = phoneQuery || nameQuery;
    if (!query) {
      Alert.alert("Kata kunci kosong", "Isi nama customer atau no HP untuk filter data customer.");
      return;
    }

    setIsLookingUpMember(true);
    try {
      const results = await searchNagagoldMembers(phoneQuery ? "hp" : "nama", query);
      setMemberResults(results);
      if (!results.length) {
        Alert.alert("Customer tidak ditemukan", "Tidak ada member yang cocok dengan kata kunci tersebut.");
      }
    } catch (error) {
      Alert.alert("Gagal filter customer", error instanceof Error ? error.message : "Data customer belum bisa diambil.");
    } finally {
      setIsLookingUpMember(false);
    }
  };

  const applyMember = (member: NagagoldMember) => {
    setJenisCustomer("MEMBER");
    setKodeMember(member.kode_member || member.kode_customer || kodeMember);
    setNamaCustomer(member.nama_customer || "");
    setNoHp(member.no_hp || "");
    setAlamatCustomer(member.alamat_customer || "");
    setMemberResults([]);
  };

  const lookupBarcode = async () => {
    const barcode = kodeBarcode.trim().toUpperCase().slice(0, 8);
    if (!barcode) {
      Alert.alert("Barcode kosong", "Masukkan atau scan kode barcode terlebih dahulu.");
      return;
    }

    setIsLookingUpItem(true);
    try {
      const item = await lookupNagagoldSaleItem(barcode);
      if (String(item.no_pesanan ?? "-") !== "-") {
        Alert.alert("Barang pesanan", "Barang ini terdaftar sebagai barang pesanan dan tidak bisa dipakai di transaksi biasa.");
        return;
      }

      const nextBerat = Number(item.berat ?? 0);
      const nextHargaJual = Number(item.harga_jual ?? 0);
      const nextHargaGram = Number(item.harga_skrg ?? 0) || (nextBerat > 0 ? Math.floor(nextHargaJual / nextBerat) : 0);
      const nextOngkos = calculateItemOngkos(item, nextBerat);
      const nextBarcode = String(item.kode_barcode ?? barcode).trim().toUpperCase().slice(0, 8);
      setKodeBarcode(nextBarcode);
      setNamaBarang(String(item.nama_barang ?? ""));
      setBerat(String(nextBerat || ""));
      setHargaJual(String(nextHargaJual || ""));
      setHargaGram(String(nextHargaGram || ""));
      setOngkos(String(nextOngkos || ""));
      setItemImageUrl(buildProductImageUrl(nextBarcode, domain));
      setSaleItemRaw(item);
      await Haptics.selectionAsync();
    } catch (error) {
      setSaleItemRaw(null);
      setItemImageUrl("");
      Alert.alert("Barang tidak ditemukan", error instanceof Error ? error.message : "Barcode belum ditemukan di database NAGAGOLD.");
    } finally {
      setIsLookingUpItem(false);
    }
  };

  const addItem = async (authorizationId?: string) => {
    const nextBerat = parseDecimal(berat);
    const nextHargaJual = parseCurrency(hargaJual);
    const nextHargaGram = parseCurrency(hargaGram);
    const nextOngkos = parseCurrency(ongkos);
    const nextTotal = nextHargaJual + nextOngkos + Number(saleItemRaw?.harga_atribut ?? 0);
    if (!kodeBarcode.trim() || !namaBarang.trim() || nextBerat <= 0 || nextHargaJual <= 0) {
      Alert.alert("Data barang belum lengkap", "Barcode, nama barang, berat, dan harga jual wajib diisi.");
      return;
    }
    const authReasons = getSaleAuthorizationReasons(saleItemRaw, nextBerat, nextHargaJual);
    if (authReasons.length && !authorizationId) {
      setPendingAuthorization({
        reasons: authReasons,
        payload: {
          berat: nextBerat,
          hargaJual: nextHargaJual,
          hargaGram: nextHargaGram,
          ongkos: nextOngkos,
          total: nextTotal,
        },
      });
      return;
    }

    setItems([
      ...items,
      {
        id: `ITEM-${Date.now()}`,
        kodeBarcode: kodeBarcode.trim(),
        namaBarang: namaBarang.trim(),
        berat: nextBerat,
        hargaGram: nextHargaGram,
        hargaJual: nextHargaJual,
        ongkos: nextOngkos,
        total: nextTotal,
        keterangan: itemNote.trim(),
        imageUrl: itemImageUrl,
        authorizationIds: authorizationId ? [authorizationId] : undefined,
        raw: saleItemRaw ?? undefined,
      },
    ]);
    setKodeBarcode("");
    setNamaBarang("");
    setBerat("");
    setHargaJual("");
    setHargaGram("");
    setOngkos("");
    setItemNote("");
    setItemImageUrl("");
    setSaleItemRaw(null);
    setItemOpen(false);
    await Haptics.selectionAsync();
  };

  const submitItemAuthorization = async (data: { username: string; password: string; keterangan: string }) => {
    if (!pendingAuthorization) return;
    setIsAuthorizing(true);
    try {
      const result = await authorizeNagagoldTransaction({
        username: data.username,
        password: data.password,
        kategori: "EDIT HARGA / BERAT DI TRANSAKSI PENJUALAN",
        description: "EDIT HARGA / BERAT DI TRANSAKSI PENJUALAN",
        keterangan: data.keterangan,
        kodeBarcode: kodeBarcode.trim(),
        berat: pendingAuthorization.payload.berat,
        beratAwal: getRawNumber(saleItemRaw, "berat_awal", getRawNumber(saleItemRaw, "berat", pendingAuthorization.payload.berat)),
        kodeIntern: getRawText(saleItemRaw, "kode_intern", "-"),
      });
      setPendingAuthorization(null);
      await addItem(result.authorizationId);
    } catch (error) {
      Alert.alert("Otorisasi gagal", error instanceof Error ? error.message : "Username/password otorisasi belum valid.");
    } finally {
      setIsAuthorizing(false);
    }
  };

  const addPayment = async () => {
    const amount = parseCurrency(paymentAmount);
    const feePercent = parseDecimal(paymentFeePercent);
    const feeAmount = ["DEBET", "CREDIT"].includes(paymentMethod) ? Math.floor((amount * feePercent) / 100) : 0;
    const nominalWithFee = ["DEBET", "CREDIT"].includes(paymentMethod) ? amount + feeAmount : amount;
    const selectedRekening = rekenings.find((rekening) => rekeningKey(rekening) === paymentRekening);
    if (amount <= 0) {
      Alert.alert("Nominal belum valid", "Masukkan nominal pembayaran terlebih dahulu.");
      return;
    }
    if (nominalWithFee <= 0) {
      Alert.alert("Fee belum valid", "Nominal setelah fee harus lebih dari nol.");
      return;
    }
    if (["TRANSFER", "DEBET", "CREDIT"].includes(paymentMethod) && !selectedRekening) {
      Alert.alert("Rekening belum dipilih", "Pilih rekening dari master rekening NAGAGOLD.");
      return;
    }
    setPayments([
      ...payments,
      {
        id: `PAYLINE-${Date.now()}`,
        method: paymentMethod,
        amount,
        nominalWithFee,
        bank: paymentMethod === "CASH" ? "CASH" : selectedRekening?.kode_bank,
        rekening: paymentMethod === "CASH" ? "CASH" : rekeningPayload(selectedRekening),
        rekeningLabel: paymentMethod === "CASH" ? "CASH" : rekeningLabel(selectedRekening),
        noCard: paymentNoCard.trim(),
        feePercent,
        feeAmount,
      },
    ]);
    setPaymentAmount("");
    setPaymentNoCard("");
    setPaymentFeePercent("");
    await Haptics.selectionAsync();
  };

  const submit = () => {
    if (!domain) {
      Alert.alert("Domain belum diatur", "Isi domain NAGAGOLD di menu Pengaturan terlebih dahulu.");
      return;
    }
    if (!kodeSales.trim()) {
      Alert.alert("Customer belum lengkap", "Lengkapi Data Customer terlebih dahulu.");
      return;
    }
    if (!items.length || !firstItem) {
      Alert.alert("Barang belum ada", "Tambahkan minimal satu barang sebelum pembayaran.");
      return;
    }
    if (paidTotal <= 0) {
      Alert.alert("Pembayaran belum ada", "Tambahkan pembayaran terlebih dahulu.");
      return;
    }

    Alert.alert("Simpan penjualan?", `Transaksi ${namaCustomer.trim() || "REGULER"} senilai ${formatRupiah(paidTotal)} akan disimpan.`, [
      { text: "Batal", style: "cancel" },
      { text: "Simpan", onPress: submitConfirmed },
    ]);
  };

  const openPayment = () => {
    if (!kodeSales.trim()) {
      Alert.alert("Sales belum dipilih", "Pilih Kode Sales di Data Customer terlebih dahulu.");
      return;
    }
    if (!items.length) {
      Alert.alert("Barang belum ada", "Tambahkan minimal satu Data Barang terlebih dahulu.");
      return;
    }
    setPaymentOpen(true);
  };

  const submitConfirmed = async () => {
    if (!firstItem) return;
    setIsSubmitting(true);
    try {
      await submitNagagoldSale({
        kodeSales: kodeSales.trim(),
        kodeMember: normalizeCustomerType(jenisCustomer) === "NONMEMBER" ? "NONMEMBER" : kodeMember.trim(),
        namaCustomer: namaCustomer.trim() || "REGULER",
        alamatCustomer: alamatCustomer.trim(),
        noHp: noHp.trim(),
        kodeBarcode: firstItem.kodeBarcode,
        namaBarang: firstItem.namaBarang,
        berat: firstItem.berat,
        hargaGram: firstItem.hargaGram,
        ongkos: firstItem.ongkos,
        items: items.map((item) => ({
          kodeBarcode: item.kodeBarcode,
          namaBarang: item.namaBarang,
          berat: item.berat,
          hargaGram: item.hargaGram,
          hargaJual: item.hargaJual,
          ongkos: item.ongkos,
          total: item.total,
          keterangan: item.keterangan,
          authorizationIds: item.authorizationIds,
          raw: item.raw,
        })),
        jumlahBayar: paidTotal,
        keterangan: payments.map((item) => item.method).join(", "),
        payments: payments.map((payment) => ({
          method: payment.method,
          amount: payment.amount,
          bank: payment.bank,
          rekening: payment.rekening,
          noCard: payment.noCard,
          feePercent: payment.feePercent,
          feeAmount: payment.feeAmount,
          feeDropdown: payment.feePercent ? String(payment.feePercent) : "-",
          nominalWithFee: payment.amount,
        })),
      });
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert("Penjualan tersimpan", "Transaksi berhasil disimpan.");
      resetTransaction();
    } catch (error) {
      Alert.alert("Gagal menyimpan", error instanceof Error ? error.message : "Transaksi belum berhasil disimpan.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetTransaction = () => {
    setKodeSales("");
    setKodeMember("");
    setJenisCustomer("NON MEMBER");
    setNamaCustomer("");
    setAlamatCustomer("");
    setNoHp("");
    setMemberResults([]);
    setKodeBarcode("");
    setNamaBarang("");
    setBerat("");
    setHargaJual("");
    setHargaGram("");
    setOngkos("");
    setItemNote("");
    setSaleItemRaw(null);
    setItemImageUrl("");
    setItems([]);
    setPayments([]);
    setPaymentMethod("CASH");
    setPaymentRekening("");
    setPaymentAmount("");
    setPaymentNoCard("");
    setPaymentFeePercent("");
    setPaymentOpen(false);
  };

  return (
    <>
      <ScrollView contentContainerStyle={[styles.container, { backgroundColor: theme.colors.background }]} keyboardShouldPersistTaps="handled">
        <View style={styles.topHeader}>
          <View style={styles.headerLeft}>
            <Pressable style={styles.headerIconButton}>
              <Ionicons name="menu" size={21} color={theme.colors.text} />
            </Pressable>
            <Text style={[styles.screenTitle, theme.isDark && { color: theme.colors.primary }]}>Transaksi Penjualan</Text>
          </View>
          <View style={styles.headerActions}>
            <Pressable style={styles.headerIconButton} onPress={theme.toggleTheme}>
              <Ionicons name={theme.isDark ? "sunny-outline" : "moon-outline"} size={18} color={theme.colors.text} />
            </Pressable>
            <Pressable style={styles.headerIconButton}>
              <Ionicons name="cart-outline" size={22} color={theme.colors.primary} />
              <View style={styles.cartBadge}>
                <Text style={styles.cartBadgeText}>{items.length}</Text>
              </View>
            </Pressable>
          </View>
        </View>

        <View style={[styles.domainNotice, theme.isDark && { backgroundColor: theme.colors.surface, borderColor: theme.colors.outline }]}>
          <Text style={[styles.domainNoticeText, theme.isDark && { color: theme.colors.muted }]}>
            {domain ? (isLoadingMaster ? "Memuat master " : "Terhubung ke ") : "Atur domain "}
            <Text style={[styles.domainNoticeStrong, theme.isDark && { color: theme.colors.primary }]}>NAGAGOLD</Text>
            {domain ? "" : " di Pengaturan"}
          </Text>
        </View>

        <View style={[styles.customerCard, theme.isDark && { backgroundColor: theme.colors.surface, borderColor: theme.colors.outline, borderLeftColor: theme.colors.primary }]}>
          <InfoLine icon="person" label="Nama Customer" value={namaCustomer || "-"} tone="primary" />
          <InfoLine icon="pricetag" label="Jenis" value={jenisCustomer} tone="secondary" />
          <InfoLine icon="id-card" label="Kode Sales" value={kodeSales || "-"} tone="neutral" />
          <Pressable style={[styles.editMiniButton, theme.isDark && { backgroundColor: "#243049" }]} onPress={() => setCustomerOpen(true)}>
            <Ionicons name="pencil" size={17} color={theme.colors.primary} />
          </Pressable>
        </View>

        <View style={styles.actionRow}>
          <Pressable style={[styles.actionButton, styles.customerButton, theme.isDark && { backgroundColor: theme.colors.surface, borderColor: theme.colors.secondary, borderWidth: 1 }]} onPress={() => setCustomerOpen(true)}>
            <Ionicons name="person-add-outline" size={17} color={theme.isDark ? theme.colors.secondary : colors.text} />
            <View>
              <Text style={[styles.actionButtonText, styles.customerButtonText, theme.isDark && { color: theme.colors.secondary }]}>Data Customer</Text>
            </View>
          </Pressable>
          <Pressable style={[styles.actionButton, styles.itemButton, theme.isDark && { backgroundColor: theme.colors.primary }]} onPress={() => setItemOpen(true)}>
            <Ionicons name="add-outline" size={17} color={theme.colors.primaryText} />
            <View>
              <Text style={[styles.actionButtonText, theme.isDark && { color: theme.colors.primaryText }]}>Data Barang</Text>
            </View>
          </Pressable>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, theme.isDark && { color: theme.colors.text }]}>Daftar Barang</Text>
          <Text style={[styles.sectionCount, theme.isDark && { backgroundColor: "#243049", color: theme.colors.muted }]}>{items.length} item</Text>
        </View>

        {items.length ? (
          <View style={styles.itemList}>
            {items.map((item) => (
              <View key={item.id} style={[styles.itemCard, theme.isDark && { backgroundColor: theme.colors.surface, borderColor: theme.colors.outline }]}>
                <View style={[styles.itemImage, theme.isDark && { backgroundColor: theme.colors.surfaceLow }]}>
                  {item.imageUrl ? (
                    <Image source={{ uri: item.imageUrl }} style={styles.itemImagePhoto} />
                  ) : (
                    <Ionicons name="diamond-outline" size={38} color={theme.colors.secondary} />
                  )}
                </View>
                <View style={styles.itemInfo}>
                  <Row label="Kode Barcode" value={item.kodeBarcode} />
                  <Row label="Nama Barang" value={item.namaBarang} />
                  <Row label="Harga Jual" value={formatRupiah(item.hargaJual)} />
                  <Row label="Ongkos" value={formatRupiah(item.ongkos)} />
                </View>
                <Pressable
                  style={styles.deleteIcon}
                  onPress={() => setItems(items.filter((nextItem) => nextItem.id !== item.id))}
                >
                  <Ionicons name="trash-outline" size={19} color="#DC2626" />
                </Pressable>
              </View>
            ))}
          </View>
        ) : (
          <View style={[styles.emptyCard, theme.isDark && { backgroundColor: "rgba(26,36,56,0.35)", borderColor: theme.colors.outline }]}>
            <Ionicons name="cube-outline" size={34} color={theme.colors.muted} />
            <Text style={[styles.emptyTitle, theme.isDark && { color: theme.colors.text }]}>Belum ada barang</Text>
            <Text style={[styles.emptyText, theme.isDark && { color: theme.colors.muted }]}>Tambahkan Data Barang untuk mulai transaksi penjualan.</Text>
          </View>
        )}

        <View style={[styles.bottomSummary, theme.isDark && { backgroundColor: "#243049", borderColor: theme.colors.outline }]}>
          <View>
            <Text style={[styles.totalCaption, theme.isDark && { color: theme.colors.muted }]}>Total</Text>
            <Text style={styles.totalBig}>{formatRupiah(total)}</Text>
          </View>
          <Pressable
            style={[
              styles.paymentButton,
              theme.isDark && { backgroundColor: theme.colors.primary },
              !canOpenPayment && styles.paymentButtonDisabled,
              theme.isDark && !canOpenPayment && { backgroundColor: theme.colors.surfaceLow },
            ]}
            onPress={openPayment}
          >
            <Ionicons name="card-outline" size={21} color={canOpenPayment ? theme.colors.primaryText : theme.colors.muted} />
            <Text style={[styles.paymentButtonText, theme.isDark && !canOpenPayment && { color: theme.colors.muted }]}>Lanjut ke Pembayaran</Text>
          </Pressable>
        </View>
      </ScrollView>

      <CustomerModal
        visible={customerOpen}
        kodeSales={kodeSales}
        setKodeSales={setKodeSales}
        jenisCustomer={jenisCustomer}
        setJenisCustomer={setJenisCustomer}
        kodeMember={kodeMember}
        setKodeMember={setKodeMember}
        namaCustomer={namaCustomer}
        setNamaCustomer={setNamaCustomer}
        noHp={noHp}
        setNoHp={setNoHp}
        alamatCustomer={alamatCustomer}
        setAlamatCustomer={setAlamatCustomer}
        onClose={() => setCustomerOpen(false)}
        onSave={saveCustomer}
        salesPeople={salesPeople}
        memberResults={memberResults}
        isLookingUpMember={isLookingUpMember}
        onLookupMember={lookupMember}
        onSearchMembers={searchMembers}
        onSelectMember={applyMember}
      />
      <ItemModal
        visible={itemOpen}
        kodeBarcode={kodeBarcode}
        setKodeBarcode={(value) => {
          setKodeBarcode(value);
          setSaleItemRaw(null);
          setItemImageUrl("");
          setHargaJual("");
          setHargaGram("");
        }}
        namaBarang={namaBarang}
        setNamaBarang={setNamaBarang}
        berat={berat}
        setBerat={setBerat}
        hargaJual={hargaJual}
        setHargaJual={setHargaJual}
        hargaGram={hargaGram}
        setHargaGram={setHargaGram}
        ongkos={ongkos}
        setOngkos={setOngkos}
        itemNote={itemNote}
        setItemNote={setItemNote}
        imageUrl={itemImageUrl}
        isLookingUpItem={isLookingUpItem}
        onLookupBarcode={lookupBarcode}
        onClose={() => setItemOpen(false)}
        onSave={addItem}
      />
      <PaymentModal
        visible={paymentOpen}
        total={total}
        paidTotal={paidTotal}
        remaining={remaining}
        method={paymentMethod}
        setMethod={setPaymentMethod}
        rekening={paymentRekening}
        setRekening={setPaymentRekening}
        rekenings={rekenings}
        amount={paymentAmount}
        setAmount={setPaymentAmount}
        noCard={paymentNoCard}
        setNoCard={setPaymentNoCard}
        feePercent={paymentFeePercent}
        setFeePercent={setPaymentFeePercent}
        qrisString={savedQris}
        payments={payments}
        setPayments={setPayments}
        isSubmitting={isSubmitting}
        onAddPayment={addPayment}
        onClose={() => setPaymentOpen(false)}
        onSubmit={submit}
      />
      <AuthorizationModal
        visible={Boolean(pendingAuthorization)}
        title="Otorisasi Penjualan"
        reasons={pendingAuthorization?.reasons ?? []}
        isSubmitting={isAuthorizing}
        onClose={() => setPendingAuthorization(null)}
        onSubmit={submitItemAuthorization}
      />
    </>
  );
}

function InfoLine({
  icon,
  label,
  value,
  tone = "primary",
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  tone?: "primary" | "secondary" | "neutral";
}) {
  const theme = useAppTheme();
  const iconStyle = tone === "secondary" ? styles.infoIconSecondary : tone === "neutral" ? styles.infoIconNeutral : styles.infoIconPrimary;
  const iconColor = tone === "secondary" ? theme.colors.secondary : tone === "neutral" ? "#38BDF8" : theme.colors.primary;
  const iconBg = tone === "secondary"
    ? "rgba(245, 158, 11, 0.12)"
    : tone === "neutral"
      ? "rgba(56, 189, 248, 0.12)"
      : "rgba(16, 185, 129, 0.12)";
  return (
    <View style={styles.infoLine}>
      <View style={[styles.infoIcon, iconStyle, theme.isDark && { backgroundColor: iconBg }]}>
        <Ionicons name={icon} size={16} color={iconColor} />
      </View>
      <View style={styles.infoTextStack}>
        <Text style={[styles.infoLabel, theme.isDark && { color: theme.colors.muted }]}>{label}</Text>
        <Text style={[styles.infoValue, theme.isDark && { color: theme.colors.text }]}>{value}</Text>
      </View>
    </View>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  const theme = useAppTheme();

  return (
    <View style={styles.row}>
      <Text style={[styles.rowLabel, theme.isDark && { color: theme.colors.muted }]}>{label}</Text>
      <Text style={[styles.rowValue, theme.isDark && { color: theme.colors.text }]}>{value}</Text>
    </View>
  );
}

function CustomerModal(props: {
  visible: boolean;
  kodeSales: string;
  setKodeSales: (value: string) => void;
  jenisCustomer: string;
  setJenisCustomer: (value: string) => void;
  kodeMember: string;
  setKodeMember: (value: string) => void;
  namaCustomer: string;
  setNamaCustomer: (value: string) => void;
  noHp: string;
  setNoHp: (value: string) => void;
  alamatCustomer: string;
  setAlamatCustomer: (value: string) => void;
  salesPeople: NagagoldSalesPerson[];
  memberResults: NagagoldMember[];
  isLookingUpMember: boolean;
  onLookupMember: () => void;
  onSearchMembers: () => void;
  onSelectMember: (member: NagagoldMember) => void;
  onClose: () => void;
  onSave: () => void;
}) {
  const theme = useAppTheme();
  const [salesPickerOpen, setSalesPickerOpen] = useState(false);
  const selectedSales = props.salesPeople.find((sales) => sales.kode_sales === props.kodeSales);

  return (
    <Sheet visible={props.visible} title="Form Data Customer" onClose={props.onClose}>
      <Text style={[styles.label, theme.isDark && { color: theme.colors.muted }]}>Pilih Kode Sales</Text>
      <SelectField
        value={selectedSales ? `${selectedSales.kode_sales} - ${selectedSales.nama_sales}` : ""}
        placeholder="Pilih kode sales"
        onPress={() => setSalesPickerOpen(true)}
      />
      <Text style={[styles.label, theme.isDark && { color: theme.colors.muted }]}>Pilih Pelanggan</Text>
      <View style={styles.optionWrap}>
        {["NONMEMBER", "MEMBER"].map((type) => (
          <Pressable
            key={type}
            style={[
              styles.optionButton,
              theme.isDark && { backgroundColor: theme.colors.surfaceLow, borderColor: theme.colors.outline },
              normalizeCustomerType(props.jenisCustomer) === type && styles.optionButtonActive,
              theme.isDark && normalizeCustomerType(props.jenisCustomer) === type && { backgroundColor: "rgba(16,185,129,0.12)", borderColor: theme.colors.primary },
            ]}
            onPress={() => props.setJenisCustomer(type === "NONMEMBER" ? "NON MEMBER" : "MEMBER")}
          >
            <Text style={[
              styles.optionText,
              theme.isDark && { color: theme.colors.muted },
              normalizeCustomerType(props.jenisCustomer) === type && styles.optionTextActive,
              theme.isDark && normalizeCustomerType(props.jenisCustomer) === type && { color: theme.colors.primary },
            ]}>
              {type === "NONMEMBER" ? "NON MEMBER" : "MEMBER"}
            </Text>
          </Pressable>
        ))}
      </View>
      <Input label="Kode Customer" value={props.kodeMember} onChangeText={props.setKodeMember} placeholder="AUTO / kode member" />
      <Pressable style={[styles.outlineButton, theme.isDark && { backgroundColor: theme.colors.surfaceLow, borderColor: theme.colors.primary }]} onPress={props.onLookupMember}>
        <Ionicons name="search-outline" size={17} color={theme.colors.primary} />
        <Text style={[styles.outlineButtonText, theme.isDark && { color: theme.colors.primary }]}>{props.isLookingUpMember ? "Mencari Member..." : "Ambil Data Member"}</Text>
      </Pressable>
      <Input label="Nama Customer" value={props.namaCustomer} onChangeText={props.setNamaCustomer} placeholder="Nama customer" />
      <Input label="No HP" value={props.noHp} onChangeText={props.setNoHp} placeholder="Nomor HP" keyboardType="phone-pad" />
      <Input label="Alamat Customer" value={props.alamatCustomer} onChangeText={props.setAlamatCustomer} placeholder="Alamat customer" multiline />
      <Pressable style={[styles.outlineButton, theme.isDark && { backgroundColor: theme.colors.surfaceLow, borderColor: theme.colors.primary }]} onPress={props.onSearchMembers}>
        <Ionicons name="filter-outline" size={17} color={theme.colors.primary} />
        <Text style={[styles.outlineButtonText, theme.isDark && { color: theme.colors.primary }]}>{props.isLookingUpMember ? "Memfilter Customer..." : "Filter Data Customer"}</Text>
      </Pressable>
      {props.memberResults.length ? (
        <View style={[styles.resultList, theme.isDark && { borderColor: theme.colors.outline }]}>
          {props.memberResults.slice(0, 5).map((member, index) => (
            <Pressable
              key={`${member.kode_member ?? member.kode_customer ?? index}`}
              style={[styles.resultRow, theme.isDark && { borderBottomColor: theme.colors.outline }]}
              onPress={() => props.onSelectMember(member)}
            >
              <View style={{ flex: 1 }}>
                <Text style={[styles.resultTitle, theme.isDark && { color: theme.colors.text }]}>{member.nama_customer || "-"}</Text>
                <Text style={[styles.resultSubtitle, theme.isDark && { color: theme.colors.muted }]}>{member.kode_member || member.kode_customer || "-"} • {member.no_hp || "-"}</Text>
              </View>
              <Ionicons name="chevron-forward" size={17} color={theme.colors.muted} />
            </Pressable>
          ))}
        </View>
      ) : null}
      <Pressable style={[styles.sheetPrimaryButton, theme.isDark && { backgroundColor: theme.colors.primary }]} onPress={props.onSave}>
        <Text style={styles.sheetPrimaryText}>Simpan Data</Text>
      </Pressable>
      <OptionSheet
        visible={salesPickerOpen}
        title="Pilih Kode Sales"
        onClose={() => setSalesPickerOpen(false)}
        options={props.salesPeople.map((sales) => ({
          key: sales.kode_sales,
          label: `${sales.kode_sales} - ${sales.nama_sales}`,
        }))}
        emptyText="Master sales kosong."
        selectedKey={props.kodeSales}
        onSelect={(key) => {
          props.setKodeSales(key);
          setSalesPickerOpen(false);
        }}
      />
    </Sheet>
  );
}

function ItemModal(props: {
  visible: boolean;
  kodeBarcode: string;
  setKodeBarcode: (value: string) => void;
  namaBarang: string;
  setNamaBarang: (value: string) => void;
  berat: string;
  setBerat: (value: string) => void;
  hargaJual: string;
  setHargaJual: (value: string) => void;
  hargaGram: string;
  setHargaGram: (value: string) => void;
  ongkos: string;
  setOngkos: (value: string) => void;
  itemNote: string;
  setItemNote: (value: string) => void;
  imageUrl: string;
  isLookingUpItem: boolean;
  onLookupBarcode: () => void;
  onClose: () => void;
  onSave: () => void;
}) {
  const theme = useAppTheme();
  const hargaGramValue = parseCurrency(props.hargaGram);
  const total = parseCurrency(props.hargaJual) + parseCurrency(props.ongkos);
  const handleBeratChange = (value: string) => {
    props.setBerat(value);
    const nextBerat = parseDecimal(value);
    if (hargaGramValue > 0 && nextBerat > 0) {
      props.setHargaJual(String(Math.floor(hargaGramValue * nextBerat)));
    } else if (!value.trim()) {
      props.setHargaJual("");
    }
  };

  return (
    <Sheet visible={props.visible} title="Form Data Barang" onClose={props.onClose}>
      <View style={[styles.photoPanel, theme.isDark && { backgroundColor: theme.colors.surfaceLow, borderColor: theme.colors.outline }]}>
        <View style={[styles.photoBox, theme.isDark && { backgroundColor: theme.colors.background, borderColor: theme.colors.outline }]}>
          {props.imageUrl ? (
            <Image source={{ uri: props.imageUrl }} style={styles.photoImage} />
          ) : (
            <>
              <Ionicons name="camera" size={32} color={theme.colors.muted} />
              <Text style={[styles.photoText, theme.isDark && { color: theme.colors.muted }]}>120 x 120</Text>
            </>
          )}
        </View>
        <View style={styles.photoActions}>
          <Pressable style={[styles.photoButton, theme.isDark && { borderColor: theme.colors.outline }]}>
            <Ionicons name="image-outline" size={17} color={theme.colors.primary} />
            <Text style={[styles.photoButtonText, theme.isDark && { color: theme.colors.text }]}>Pilih Gambar</Text>
          </Pressable>
          <Pressable style={[styles.photoButton, theme.isDark && { borderColor: theme.colors.outline }]}>
            <Ionicons name="camera-outline" size={17} color={theme.colors.primary} />
            <Text style={[styles.photoButtonText, theme.isDark && { color: theme.colors.text }]}>WebCam</Text>
          </Pressable>
        </View>
      </View>
      <Input label="Kode Barcode" value={props.kodeBarcode} onChangeText={props.setKodeBarcode} placeholder="Scan atau input kode barcode" />
      <Pressable style={[styles.outlineButton, theme.isDark && { backgroundColor: theme.colors.surfaceLow, borderColor: theme.colors.primary }]} onPress={props.onLookupBarcode}>
        <Ionicons name="barcode-outline" size={17} color={theme.colors.primary} />
        <Text style={[styles.outlineButtonText, theme.isDark && { color: theme.colors.primary }]}>{props.isLookingUpItem ? "Mengambil Barang..." : "Ambil Data Barang dari Barcode"}</Text>
      </Pressable>
      <Input label="Nama Barang" value={props.namaBarang} onChangeText={props.setNamaBarang} placeholder="Nama barang" />
      <View style={styles.twoColumn}>
        <Input label="Berat Jual (gr)" value={props.berat} onChangeText={handleBeratChange} placeholder="0" keyboardType="decimal-pad" />
        <CurrencyInput label="Harga Jual" value={props.hargaJual} onChangeText={props.setHargaJual} />
      </View>
      <View style={styles.twoColumn}>
        <ReadOnly label="Harga/Gram" value={formatRupiah(hargaGramValue)} />
        <CurrencyInput label="Ongkos" value={props.ongkos} onChangeText={props.setOngkos} />
      </View>
      <View style={styles.twoColumn}>
        <ReadOnly label="Total" value={formatRupiah(total)} />
      </View>
      <Input label="Keterangan" value={props.itemNote} onChangeText={props.setItemNote} placeholder="Keterangan barang opsional" multiline />
      {/* <Text style={styles.noteText}>Notes: Search Barang (F8)</Text> */}
      <View style={styles.sheetFooter}>
        <Pressable style={[styles.sheetSecondaryButton, theme.isDark && { borderColor: theme.colors.outline, backgroundColor: theme.colors.surfaceLow }]} onPress={props.onClose}>
          <Text style={[styles.sheetSecondaryText, theme.isDark && { color: theme.colors.text }]}>Tutup</Text>
        </Pressable>
        <Pressable style={[styles.sheetPrimaryButtonSmall, theme.isDark && { backgroundColor: theme.colors.primary }]} onPress={props.onSave}>
          <Text style={styles.sheetPrimaryText}>Simpan Data</Text>
        </Pressable>
      </View>
    </Sheet>
  );
}

function PaymentModal(props: {
  visible: boolean;
  total: number;
  paidTotal: number;
  remaining: number;
  method: PaymentLine["method"];
  setMethod: (value: PaymentLine["method"]) => void;
  rekening: string;
  setRekening: (value: string) => void;
  rekenings: NagagoldRekening[];
  amount: string;
  setAmount: (value: string) => void;
  noCard: string;
  setNoCard: (value: string) => void;
  feePercent: string;
  setFeePercent: (value: string) => void;
  qrisString: string;
  payments: PaymentLine[];
  setPayments: (value: PaymentLine[]) => void;
  isSubmitting: boolean;
  onAddPayment: () => void;
  onClose: () => void;
  onSubmit: () => void;
}) {
  const theme = useAppTheme();
  const [methodPickerOpen, setMethodPickerOpen] = useState(false);
  const [rekeningPickerOpen, setRekeningPickerOpen] = useState(false);
  const [showTransferQris, setShowTransferQris] = useState(false);
  const amount = parseCurrency(props.amount);
  const feePercent = parseDecimal(props.feePercent);
  const feeAmount = ["DEBET", "CREDIT"].includes(props.method) ? Math.floor((amount * feePercent) / 100) : 0;
  const nominalWithFee = ["DEBET", "CREDIT"].includes(props.method) ? amount + feeAmount : amount;
  const generatedQris = props.method === "TRANSFER" && showTransferQris ? buildPaymentQris(props.qrisString, amount) : "";
  const selectedRekening = props.rekenings.find((rekening) => rekeningKey(rekening) === props.rekening);
  const generateTransferQris = () => {
    if (props.method !== "TRANSFER") return;
    if (amount <= 0) {
      Alert.alert("Nominal belum valid", "Isi nominal transfer terlebih dahulu sebelum generate QRIS.");
      return;
    }
    if (!buildPaymentQris(props.qrisString, amount)) {
      Alert.alert("QRIS belum siap", "Simpan QRIS merchant di Pengaturan terlebih dahulu.");
      return;
    }
    setShowTransferQris(true);
  };

  return (
    <Sheet visible={props.visible} title="Form Pembayaran" onClose={props.onClose}>
      <View style={styles.paymentStats}>
        <StatCard label="Total Harga Jual" value={formatRupiah(props.total)} icon="pricetag-outline" />
        <StatCard label="Total DP" value={formatRupiah(0)} icon="wallet-outline" />
        <StatCard label="Harus Bayar" value={formatRupiah(props.remaining)} icon="cash-outline" active />
      </View>
      <Text style={[styles.sectionTitle, theme.isDark && { color: theme.colors.text }]}>Tambah Pembayaran</Text>
      <Text style={[styles.label, theme.isDark && { color: theme.colors.muted }]}>Metode Pembayaran</Text>
      <SelectField value={props.method} placeholder="Pilih metode pembayaran" onPress={() => setMethodPickerOpen(true)} />
      {["TRANSFER", "DEBET", "CREDIT"].includes(props.method) ? (
        <>
          <Text style={[styles.label, theme.isDark && { color: theme.colors.muted }]}>Pilih Bank/Rekening</Text>
          <SelectField
            value={selectedRekening ? rekeningLabel(selectedRekening) : ""}
            placeholder="Pilih rekening dari master"
            onPress={() => setRekeningPickerOpen(true)}
          />
        </>
      ) : null}
      <View style={styles.paymentInputRow}>
        <View style={{ flex: 1 }}>
          <CurrencyInput label="Nominal" value={props.amount} onChangeText={props.setAmount} />
        </View>
        <Pressable style={styles.addPaymentButton} onPress={props.onAddPayment}>
          <Ionicons name="add" size={32} color="#FFFFFF" />
        </Pressable>
      </View>
      {props.method === "TRANSFER" ? (
        <>
          <Pressable
            style={[styles.qrisGenerateButton, theme.isDark && { backgroundColor: theme.colors.surfaceLow, borderColor: theme.colors.primary }]}
            onPress={generateTransferQris}
          >
            <Ionicons name="qr-code-outline" size={18} color={theme.colors.primary} />
            <Text style={[styles.qrisGenerateText, theme.isDark && { color: theme.colors.primary }]}>
              {showTransferQris ? "Update QRIS Transfer" : "Generate QRIS Transfer"}
            </Text>
          </Pressable>
          {showTransferQris ? (
            <View style={[styles.qrisPreview, theme.isDark && { backgroundColor: theme.colors.surfaceLow, borderColor: theme.colors.outline }]}>
              {generatedQris ? (
                <>
                  <QRCode value={generatedQris} size={168} backgroundColor="#FFFFFF" color="#0F172A" />
                  <Text style={[styles.qrisCaption, theme.isDark && { color: theme.colors.muted }]}>
                    QRIS untuk pembayaran transfer {formatRupiah(amount)}
                  </Text>
                </>
              ) : (
                <Text style={[styles.qrisCaption, theme.isDark && { color: theme.colors.muted }]}>Isi nominal dan pastikan QRIS merchant sudah tersimpan di Pengaturan.</Text>
              )}
            </View>
          ) : null}
        </>
      ) : null}
      {["DEBET", "CREDIT"].includes(props.method) ? (
        <>
          {props.method === "CREDIT" ? (
            <Input label="No Kartu" value={props.noCard} onChangeText={props.setNoCard} placeholder="Opsional" keyboardType="number-pad" />
          ) : null}
          <View style={styles.twoColumn}>
            <Input
              label="Fee (%)"
              value={props.feePercent}
              onChangeText={(value) => props.setFeePercent(value.replace(/[^0-9.,]/g, ""))}
              placeholder="0"
              keyboardType="decimal-pad"
            />
            <ReadOnly label="Fee (Rp)" value={formatRupiah(feeAmount)} />
          </View>
          <ReadOnly label="Nominal + Fee" value={formatRupiah(Math.max(nominalWithFee, 0))} />
        </>
      ) : null}
      <ReadOnly label="Sisa" value={formatRupiah(props.remaining)} onPress={() => props.setAmount(String(props.remaining))} />
      <Text style={[styles.sectionTitle, theme.isDark && { color: theme.colors.text }]}>Rincian Pembayaran</Text>
      <View style={[styles.paymentList, theme.isDark && { borderColor: theme.colors.outline }]}>
        {props.payments.map((payment, index) => (
          <View key={payment.id} style={[styles.paymentLine, theme.isDark && { borderBottomColor: theme.colors.outline }]}>
            <Text style={[styles.paymentIndex, theme.isDark && { color: theme.colors.text }]}>{index + 1}</Text>
            <View style={{ flex: 1 }}>
              <Text style={[styles.paymentMethod, theme.isDark && { color: theme.colors.text }]}>{payment.method}</Text>
              {payment.rekeningLabel && payment.rekeningLabel !== payment.method ? (
                <Text style={[styles.paymentSub, theme.isDark && { color: theme.colors.muted }]}>{payment.rekeningLabel}</Text>
              ) : null}
            </View>
            <Text style={[styles.paymentValue, theme.isDark && { color: theme.colors.text }]}>{formatRupiah(payment.amount)}</Text>
            <Pressable onPress={() => props.setPayments(props.payments.filter((item) => item.id !== payment.id))}>
              <Ionicons name="trash-outline" size={18} color="#DC2626" />
            </Pressable>
          </View>
        ))}
        <View style={[styles.paymentGrandLine, theme.isDark && { backgroundColor: theme.colors.surfaceLow }]}>
          <Text style={[styles.paymentGrandLabel, theme.isDark && { color: theme.colors.text }]}>Grand Total</Text>
          <Text style={[styles.paymentGrandValue, theme.isDark && { color: theme.colors.primary }]}>{formatRupiah(props.paidTotal)}</Text>
        </View>
      </View>
      <View style={styles.sheetFooter}>
        <Pressable style={[styles.sheetPrimaryButtonSmall, theme.isDark && { backgroundColor: theme.colors.primary }]} disabled={props.isSubmitting} onPress={props.onSubmit}>
          <Text style={styles.sheetPrimaryText}>{props.isSubmitting ? "Mengirim..." : "Bayar Sekarang"}</Text>
        </Pressable>
        <Pressable style={[styles.sheetSecondaryButton, theme.isDark && { borderColor: theme.colors.outline, backgroundColor: theme.colors.surfaceLow }]}>
          <Text style={[styles.sheetSecondaryText, theme.isDark && { color: theme.colors.text }]}>Bayar DP</Text>
        </Pressable>
      </View>
      <OptionSheet
        visible={methodPickerOpen}
        title="Metode Pembayaran"
        onClose={() => setMethodPickerOpen(false)}
        options={paymentMethods.map((method) => ({ key: method, label: method }))}
        selectedKey={props.method}
        onSelect={(key) => {
          props.setMethod(key as PaymentLine["method"]);
          props.setRekening("");
          props.setNoCard("");
          props.setFeePercent("");
          setShowTransferQris(false);
          setMethodPickerOpen(false);
        }}
      />
      <OptionSheet
        visible={rekeningPickerOpen}
        title="Pilih Bank/Rekening"
        onClose={() => setRekeningPickerOpen(false)}
        options={props.rekenings.map((rekening) => ({ key: rekeningKey(rekening), label: rekeningLabel(rekening) }))}
        emptyText="Master rekening kosong."
        selectedKey={props.rekening}
        onSelect={(key) => {
          props.setRekening(key);
          setRekeningPickerOpen(false);
        }}
      />
    </Sheet>
  );
}

function AuthorizationModal(props: {
  visible: boolean;
  title: string;
  reasons: string[];
  isSubmitting: boolean;
  onClose: () => void;
  onSubmit: (data: { username: string; password: string; keterangan: string }) => void;
}) {
  const theme = useAppTheme();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [keterangan, setKeterangan] = useState("");

  const submit = () => {
    if (!username.trim() || !password.trim()) {
      Alert.alert("Data otorisasi belum lengkap", "Username dan password otorisasi wajib diisi.");
      return;
    }
    props.onSubmit({ username: username.trim(), password: password.trim(), keterangan: keterangan.trim() || "-" });
  };

  return (
    <Sheet visible={props.visible} title={props.title} onClose={props.onClose}>
      <View style={[styles.authNotice, theme.isDark && { backgroundColor: theme.colors.surfaceLow, borderColor: theme.colors.secondary }]}>
        <Ionicons name="shield-checkmark-outline" size={20} color={theme.colors.secondary} />
        <View style={{ flex: 1 }}>
          <Text style={[styles.authNoticeTitle, theme.isDark && { color: theme.colors.text }]}>Perlu otorisasi SPV/Owner</Text>
          {props.reasons.map((reason) => (
            <Text key={reason} style={[styles.authReason, theme.isDark && { color: theme.colors.muted }]}>- {reason}</Text>
          ))}
        </View>
      </View>
      <Input label="Username Otorisasi" value={username} onChangeText={setUsername} placeholder="User SPV / Owner" />
      <Input label="Password" value={password} onChangeText={setPassword} placeholder="Password" />
      <Input label="Keterangan" value={keterangan} onChangeText={setKeterangan} placeholder="Alasan otorisasi" multiline />
      <View style={styles.sheetFooter}>
        <Pressable style={[styles.sheetSecondaryButton, theme.isDark && { borderColor: theme.colors.outline, backgroundColor: theme.colors.surfaceLow }]} onPress={props.onClose}>
          <Text style={[styles.sheetSecondaryText, theme.isDark && { color: theme.colors.text }]}>Batal</Text>
        </Pressable>
        <Pressable style={[styles.sheetPrimaryButtonSmall, theme.isDark && { backgroundColor: theme.colors.primary }, props.isSubmitting && styles.disabledButton]} disabled={props.isSubmitting} onPress={submit}>
          <Text style={styles.sheetPrimaryText}>{props.isSubmitting ? "Memproses..." : "Otorisasi"}</Text>
        </Pressable>
      </View>
    </Sheet>
  );
}

function SelectField({ value, placeholder, onPress }: { value: string; placeholder: string; onPress: () => void }) {
  const theme = useAppTheme();

  return (
    <Pressable style={[styles.selectField, theme.isDark && { backgroundColor: theme.colors.surfaceLow, borderColor: theme.colors.outline }]} onPress={onPress}>
      <Text style={[styles.selectValue, theme.isDark && { color: theme.colors.text }, !value && styles.selectPlaceholder, theme.isDark && !value && { color: theme.colors.muted }]}>{value || placeholder}</Text>
      <Ionicons name="chevron-down" size={18} color={theme.colors.muted} />
    </Pressable>
  );
}

function OptionSheet(props: {
  visible: boolean;
  title: string;
  options: { key: string; label: string; description?: string }[];
  selectedKey?: string;
  emptyText?: string;
  onSelect: (key: string) => void;
  onClose: () => void;
}) {
  const theme = useAppTheme();

  return (
    <Modal animationType="slide" transparent visible={props.visible} onRequestClose={props.onClose}>
      <View style={styles.optionBackdrop}>
        <View style={[styles.optionSheet, theme.isDark && { backgroundColor: theme.colors.surface }]}>
          <View style={styles.sheetHandle} />
          <View style={[styles.sheetHeader, theme.isDark && { borderBottomColor: theme.colors.outline }]}>
            <Text style={[styles.sheetTitle, theme.isDark && { color: theme.colors.text }]}>{props.title}</Text>
            <Pressable onPress={props.onClose}>
              <Ionicons name="close" size={25} color={theme.colors.text} />
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={styles.optionContent}>
            {props.options.length ? props.options.map((option) => {
              const selected = props.selectedKey === option.key;
              return (
                <Pressable
                  key={option.key}
                  style={[styles.optionRow, theme.isDark && { borderColor: theme.colors.outline }, selected && styles.optionRowActive, theme.isDark && selected && { backgroundColor: "rgba(16,185,129,0.12)", borderColor: theme.colors.primary }]}
                  onPress={() => props.onSelect(option.key)}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.optionRowTitle, theme.isDark && { color: theme.colors.text }, selected && styles.optionRowTitleActive]}>{option.label}</Text>
                    {option.description ? <Text style={[styles.optionRowDescription, theme.isDark && { color: theme.colors.muted }]}>{option.description}</Text> : null}
                  </View>
                  {selected ? <Ionicons name="checkmark-circle" size={20} color={theme.colors.primary} /> : null}
                </Pressable>
              );
            }) : (
              <Text style={styles.emptyText}>{props.emptyText ?? "Data tidak tersedia."}</Text>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function Sheet({ visible, title, onClose, children }: {
  visible: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const theme = useAppTheme();

  return (
    <Modal animationType="slide" transparent visible={visible} onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.modalBackdrop}>
        <View style={[styles.sheet, theme.isDark && { backgroundColor: theme.colors.surface }]}>
          <View style={styles.sheetHandle} />
          <View style={[styles.sheetHeader, theme.isDark && { borderBottomColor: theme.colors.outline }]}>
            <Text style={[styles.sheetTitle, theme.isDark && { color: theme.colors.text }]}>{title}</Text>
            <Pressable onPress={onClose}>
              <Ionicons name="close" size={25} color={theme.colors.text} />
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={styles.sheetContent} keyboardShouldPersistTaps="handled">
            {children}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function Input({ label, value, onChangeText, placeholder, keyboardType = "default", multiline = false }: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  keyboardType?: "default" | "number-pad" | "decimal-pad" | "phone-pad";
  multiline?: boolean;
}) {
  const theme = useAppTheme();

  return (
    <View style={styles.field}>
      <Text style={[styles.label, theme.isDark && { color: theme.colors.muted }]}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#94A3B8"
        keyboardType={keyboardType}
        multiline={multiline}
        style={[styles.input, theme.isDark && { backgroundColor: theme.colors.surfaceLow, borderColor: theme.colors.outline, color: theme.colors.text }, multiline && styles.textarea]}
      />
    </View>
  );
}

function CurrencyInput({ label, value, onChangeText }: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
}) {
  const theme = useAppTheme();

  return (
    <View style={styles.field}>
      <Text style={[styles.label, theme.isDark && { color: theme.colors.muted }]}>{label}</Text>
      <View style={[styles.currencyWrap, theme.isDark && { backgroundColor: theme.colors.surfaceLow, borderColor: theme.colors.outline }]}>
        <Text style={styles.rp}>Rp</Text>
        <TextInput
          value={value ? Number(value.replace(/\D/g, "")).toLocaleString("id-ID") : ""}
          onChangeText={(text) => onChangeText(text.replace(/\D/g, ""))}
          placeholder="0"
          placeholderTextColor="#94A3B8"
          keyboardType="number-pad"
          style={[styles.currencyInput, theme.isDark && { color: theme.colors.text }]}
        />
      </View>
    </View>
  );
}

function ReadOnly({ label, value, onPress }: { label: string; value: string; onPress?: () => void }) {
  const theme = useAppTheme();
  const content = (
    <>
      <Text style={[styles.label, theme.isDark && { color: theme.colors.muted }]}>{label}</Text>
      <View style={[styles.readOnly, theme.isDark && { backgroundColor: theme.colors.surfaceLow, borderColor: theme.colors.outline }, onPress && styles.readOnlyPressable]}>
        <Text style={[styles.readOnlyText, theme.isDark && { color: theme.colors.text }]}>{value}</Text>
      </View>
    </>
  );

  if (onPress) {
    return (
      <Pressable style={styles.field} onPress={onPress}>
        {content}
      </Pressable>
    );
  }

  return (
    <View style={styles.field}>
      {content}
    </View>
  );
}

function StatCard({ label, value, icon, active }: { label: string; value: string; icon: keyof typeof Ionicons.glyphMap; active?: boolean }) {
  const theme = useAppTheme();

  return (
    <View style={[
      styles.statCard,
      theme.isDark && { backgroundColor: theme.colors.surfaceLow, borderColor: theme.colors.outline },
      active && styles.statCardActive,
      theme.isDark && active && { backgroundColor: "rgba(16,185,129,0.12)", borderColor: theme.colors.primary },
    ]}>
      <Text style={[styles.statLabel, theme.isDark && { color: theme.colors.muted }]}>{label}</Text>
      <Text style={[styles.statValue, theme.isDark && { color: theme.colors.text }, active && styles.statValueActive, theme.isDark && active && { color: theme.colors.primary }]}>{value}</Text>
      <Ionicons name={icon} size={24} color={active ? theme.colors.primary : theme.colors.secondary} />
    </View>
  );
}

function methodIcon(method: PaymentLine["method"]): keyof typeof Ionicons.glyphMap {
  if (method === "TRANSFER") return "business-outline";
  if (method === "DEBET" || method === "CREDIT") return "card-outline";
  return "cash-outline";
}

function buildPaymentQris(qrisString: string, amount: number): string {
  if (!qrisString || !Number.isFinite(amount) || amount <= 0) return "";

  try {
    return generateDynamicQris(normalizeQris(qrisString), String(amount), "Rupiah", "");
  } catch {
    return "";
  }
}

function buildProductImageUrl(barcode: string, domain: string): string {
  const firebaseFolder = getFirebaseFolder(domain);
  const objectPath = encodeURIComponent(`NSIPIC/${firebaseFolder}/foto_produk/${barcode}.jpg`);
  return `https://firebasestorage.googleapis.com/v0/b/gambar-78b2b.appspot.com/o/${objectPath}?alt=media`;
}

function getFirebaseFolder(domain: string): string {
  const host = domain.toUpperCase();
  if (host.includes("SAMBAS") || host.includes("QC-")) return "NQC";
  return "NQC";
}

function rekeningKey(rekening: NagagoldRekening): string {
  return [rekening.kode_bank, rekening.no_rekening, rekening.nama_rekening ?? ""].join("|");
}

function rekeningLabel(rekening?: NagagoldRekening): string {
  if (!rekening) return "";
  return [rekening.kode_bank, rekening.no_rekening, rekening.nama_rekening].filter(Boolean).join(" - ");
}

function rekeningPayload(rekening?: NagagoldRekening): string {
  if (!rekening) return "-";
  return [rekening.no_rekening || "-", rekening.kode_bank || "-", rekening.nama_rekening || "-"].join(" ~ ");
}

function getRawNumber(raw: Record<string, unknown> | null | undefined, key: string, fallback = 0): number {
  if (!raw || raw[key] === undefined || raw[key] === null) return fallback;
  const value = Number(raw[key]);
  return Number.isFinite(value) ? value : fallback;
}

function getRawText(raw: Record<string, unknown> | null | undefined, key: string, fallback = "-"): string {
  if (!raw || raw[key] === undefined || raw[key] === null) return fallback;
  const value = String(raw[key]).trim();
  return value || fallback;
}

function getSaleAuthorizationReasons(raw: Record<string, unknown> | null | undefined, nextBerat: number, nextHargaJual: number): string[] {
  if (!raw) return [];
  const reasons: string[] = [];
  const originalBerat = getRawNumber(raw, "berat", getRawNumber(raw, "berat_awal", nextBerat));
  const originalHargaJual = getRawNumber(raw, "harga_jual", nextHargaJual);
  if (Math.abs(nextBerat - originalBerat) > 0.0001) {
    reasons.push(`Berat berubah dari ${originalBerat} gr menjadi ${nextBerat} gr`);
  }
  if (Math.round(nextHargaJual) !== Math.round(originalHargaJual)) {
    reasons.push(`Harga jual berubah dari ${formatRupiah(originalHargaJual)} menjadi ${formatRupiah(nextHargaJual)}`);
  }
  return reasons;
}

function normalizeCustomerType(value: string): "MEMBER" | "NONMEMBER" {
  return value.replace(/\s/g, "").toUpperCase() === "MEMBER" ? "MEMBER" : "NONMEMBER";
}

function calculateItemOngkos(item: NagagoldSaleLookupItem, berat: number): number {
  const rawOngkos = item.ongkos;
  if (typeof rawOngkos === "object" && rawOngkos) {
    const nominal = Number(rawOngkos.nominal ?? 0);
    return rawOngkos.tipe_ongkos === "TOTAL" ? nominal : nominal * Math.max(berat, 0);
  }

  return Number(rawOngkos ?? 0) || 0;
}

function parseCurrency(value: string): number {
  return Number(value.replace(/\D/g, "")) || 0;
}

function parseDecimal(value: string): number {
  return Number(value.replace(",", ".")) || 0;
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background,
    gap: 14,
    paddingHorizontal: 12,
    paddingTop: Platform.OS === "ios" ? 66 : 46,
    paddingBottom: 112,
  },
  topHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    minHeight: 36,
  },
  headerLeft: { alignItems: "center", flexDirection: "row", gap: 13 },
  headerActions: { alignItems: "center", flexDirection: "row", gap: 8 },
  headerIconButton: {
    alignItems: "center",
    height: 32,
    justifyContent: "center",
    position: "relative",
    width: 32,
  },
  screenTitle: { color: colors.primary, fontSize: 20, fontWeight: "700" },
  screenSubtitle: { color: colors.muted, fontSize: 12, fontWeight: "500", marginTop: 4 },
  domainNotice: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.outline,
    borderRadius: 7,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 35,
    paddingHorizontal: 10,
  },
  domainNoticeText: { color: colors.muted, fontSize: 12, fontWeight: "500", textAlign: "center" },
  domainNoticeStrong: { color: colors.primary, fontWeight: "800" },
  cartButton: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.outline,
    borderRadius: 999,
    borderWidth: 1,
    height: 46,
    justifyContent: "center",
    width: 46,
  },
  cartBadge: {
    alignItems: "center",
    backgroundColor: colors.secondaryContainer,
    borderRadius: 999,
    height: 14,
    justifyContent: "center",
    position: "absolute",
    right: 0,
    top: 0,
    width: 14,
  },
  cartBadgeText: { color: colors.secondary, fontSize: 9, fontWeight: "800" },
  customerCard: {
    backgroundColor: colors.surface,
    borderColor: colors.outline,
    borderLeftColor: colors.primaryContainer,
    borderLeftWidth: 3,
    borderRadius: 9,
    borderWidth: 1,
    gap: 11,
    paddingHorizontal: 19,
    paddingVertical: 16,
    position: "relative",
    shadowColor: colors.text,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 13,
    elevation: 2,
  },
  infoLine: { alignItems: "center", flexDirection: "row", gap: 13 },
  infoIcon: {
    alignItems: "center",
    borderRadius: 8,
    height: 36,
    justifyContent: "center",
    width: 36,
  },
  infoIconPrimary: { backgroundColor: "#E7F8F0" },
  infoIconSecondary: { backgroundColor: "#FFF4E8" },
  infoIconNeutral: { backgroundColor: colors.surfaceContainer },
  infoTextStack: { flex: 1 },
  infoLabel: { color: colors.outlineStrong, fontSize: 10, fontWeight: "700", letterSpacing: 0.5, textTransform: "uppercase" },
  infoValue: { color: colors.text, fontSize: 18, fontWeight: "800", marginTop: 2 },
  editMiniButton: {
    alignItems: "center",
    backgroundColor: colors.surfaceLow,
    borderRadius: 8,
    bottom: 16,
    height: 36,
    justifyContent: "center",
    position: "absolute",
    right: 16,
    width: 36,
  },
  actionRow: { flexDirection: "row", gap: 14 },
  actionButton: {
    alignItems: "center",
    borderRadius: 9,
    flex: 1,
    flexDirection: "row",
    gap: 7,
    justifyContent: "center",
    minHeight: 50,
    paddingHorizontal: 10,
  },
  customerButton: { backgroundColor: colors.secondaryContainer },
  itemButton: { backgroundColor: colors.primaryContainer },
  actionButtonText: { color: "#FFFFFF", fontSize: 14, fontWeight: "600" },
  customerButtonText: { color: colors.text },
  actionButtonSub: { color: colors.primarySoft, fontSize: 12, fontWeight: "600", marginTop: 2 },
  sectionHeader: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  sectionTitle: { color: colors.text, fontSize: 16, fontWeight: "700" },
  sectionCount: { backgroundColor: colors.surfaceContainer, borderRadius: 999, color: colors.outlineStrong, fontSize: 11, fontWeight: "700", overflow: "hidden", paddingHorizontal: 9, paddingVertical: 3 },
  itemList: { gap: 12 },
  itemCard: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.outline,
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: "row",
    gap: 12,
    padding: 12,
  },
  itemImage: {
    alignItems: "center",
    backgroundColor: "#FFF4E8",
    borderRadius: 12,
    height: 94,
    justifyContent: "center",
    overflow: "hidden",
    width: 94,
  },
  itemImagePhoto: { height: "100%", width: "100%" },
  itemInfo: { flex: 1, gap: 7 },
  deleteIcon: { padding: 4 },
  row: { flexDirection: "row", gap: 8, justifyContent: "space-between" },
  rowLabel: { color: colors.outlineStrong, flex: 1, fontSize: 11, fontWeight: "600" },
  rowValue: { color: colors.text, flex: 1.2, fontSize: 12, fontWeight: "700" },
  emptyCard: {
    alignItems: "center",
    backgroundColor: "rgba(242, 244, 246, 0.45)",
    borderColor: colors.outline,
    borderRadius: 16,
    borderStyle: "dashed",
    borderWidth: 2,
    gap: 8,
    padding: 22,
  },
  emptyTitle: { color: colors.muted, fontSize: 15, fontWeight: "700" },
  emptyText: { color: colors.outlineStrong, fontSize: 12, lineHeight: 18, textAlign: "center" },
  bottomSummary: {
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.94)",
    borderColor: colors.outline,
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
    padding: 14,
  },
  totalCaption: { color: colors.outlineStrong, fontSize: 10, fontWeight: "700", letterSpacing: 0.5, textTransform: "uppercase" },
  totalBig: { color: colors.secondary, fontSize: 22, fontWeight: "800", marginTop: 2 },
  paymentButton: {
    alignItems: "center",
    backgroundColor: colors.primaryContainer,
    borderRadius: 14,
    flex: 1,
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
    minHeight: 56,
    paddingHorizontal: 10,
  },
  paymentButtonDisabled: { backgroundColor: colors.surfaceContainer },
  paymentButtonText: { color: "#FFFFFF", flexShrink: 1, fontSize: 13, fontWeight: "700" },
  modalBackdrop: {
    backgroundColor: "rgba(15, 23, 42, 0.45)",
    flex: 1,
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: "92%",
    paddingTop: 10,
  },
  sheetHandle: {
    alignSelf: "center",
    backgroundColor: colors.outline,
    borderRadius: 999,
    height: 5,
    marginBottom: 12,
    width: 54,
  },
  sheetHeader: {
    alignItems: "center",
    borderBottomColor: colors.outline,
    borderBottomWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingBottom: 14,
  },
  sheetTitle: { color: colors.text, fontSize: 22, fontWeight: "700" },
  sheetContent: { gap: 14, padding: 20, paddingBottom: 30 },
  field: { flex: 1, gap: 6 },
  label: { color: colors.muted, fontSize: 11, fontWeight: "700", letterSpacing: 0.5, textTransform: "uppercase" },
  input: {
    backgroundColor: colors.surface,
    borderColor: colors.outline,
    borderRadius: 12,
    borderWidth: 1,
    color: colors.text,
    fontSize: 13,
    fontWeight: "600",
    minHeight: 48,
    paddingHorizontal: 14,
  },
  textarea: { minHeight: 84, paddingTop: 12, textAlignVertical: "top" },
  currencyWrap: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.outline,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: "row",
    minHeight: 48,
    paddingHorizontal: 14,
  },
  rp: { color: colors.outlineStrong, fontSize: 12, fontWeight: "700", marginRight: 8 },
  currencyInput: { color: colors.text, flex: 1, fontSize: 13, fontWeight: "700" },
  readOnly: {
    backgroundColor: colors.surfaceLow,
    borderColor: colors.outline,
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 48,
    paddingHorizontal: 14,
  },
  readOnlyPressable: { backgroundColor: "#E7F8F0", borderColor: colors.primaryContainer },
  readOnlyText: { color: colors.muted, fontSize: 13, fontWeight: "700" },
  outlineButton: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.primary,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
    minHeight: 48,
  },
  outlineButtonText: { color: colors.primary, fontSize: 13, fontWeight: "700" },
  optionWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  optionButton: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.outline,
    borderRadius: 999,
    borderWidth: 1,
    minHeight: 38,
    paddingHorizontal: 12,
    justifyContent: "center",
  },
  optionButtonActive: {
    backgroundColor: "#E7F8F0",
    borderColor: colors.primaryContainer,
  },
  optionText: { color: colors.muted, fontSize: 12, fontWeight: "700" },
  optionTextActive: { color: colors.primary },
  selectField: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.outline,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    minHeight: 48,
    paddingHorizontal: 14,
  },
  selectValue: { color: colors.text, flex: 1, fontSize: 13, fontWeight: "700" },
  selectPlaceholder: { color: colors.outlineStrong, fontWeight: "600" },
  optionBackdrop: {
    backgroundColor: "rgba(15, 23, 42, 0.35)",
    flex: 1,
    justifyContent: "flex-end",
  },
  optionSheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "72%",
    paddingTop: 10,
  },
  optionContent: { gap: 8, padding: 16, paddingBottom: 26 },
  optionRow: {
    alignItems: "center",
    borderColor: colors.outline,
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: "row",
    gap: 12,
    minHeight: 52,
    paddingHorizontal: 12,
  },
  optionRowActive: { backgroundColor: "#E7F8F0", borderColor: colors.primaryContainer },
  optionRowTitle: { color: colors.text, fontSize: 13, fontWeight: "700" },
  optionRowTitleActive: { color: colors.primary },
  optionRowDescription: { color: colors.muted, fontSize: 11, fontWeight: "600", marginTop: 3 },
  resultList: {
    borderColor: colors.outline,
    borderRadius: 14,
    borderWidth: 1,
    overflow: "hidden",
  },
  resultRow: {
    alignItems: "center",
    borderBottomColor: colors.outline,
    borderBottomWidth: 1,
    flexDirection: "row",
    gap: 10,
    minHeight: 58,
    paddingHorizontal: 12,
  },
  resultTitle: { color: colors.text, fontSize: 13, fontWeight: "700" },
  resultSubtitle: { color: colors.muted, fontSize: 11, fontWeight: "600", marginTop: 3 },
  sheetPrimaryButton: {
    alignItems: "center",
    backgroundColor: colors.primaryContainer,
    borderRadius: 12,
    justifyContent: "center",
    minHeight: 50,
  },
  sheetPrimaryButtonSmall: {
    alignItems: "center",
    backgroundColor: colors.primaryContainer,
    borderRadius: 12,
    flex: 1,
    justifyContent: "center",
    minHeight: 50,
  },
  sheetPrimaryText: { color: "#FFFFFF", fontSize: 14, fontWeight: "700" },
  sheetSecondaryButton: {
    alignItems: "center",
    borderColor: colors.primary,
    borderRadius: 12,
    borderWidth: 1,
    flex: 1,
    justifyContent: "center",
    minHeight: 50,
  },
  sheetSecondaryText: { color: colors.primary, fontSize: 14, fontWeight: "700" },
  sheetFooter: { flexDirection: "row", gap: 12 },
  photoPanel: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.outline,
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: "row",
    gap: 14,
    padding: 12,
  },
  photoBox: {
    alignItems: "center",
    backgroundColor: colors.surfaceLow,
    borderColor: colors.outline,
    borderRadius: 16,
    borderStyle: "dashed",
    borderWidth: 1,
    height: 110,
    justifyContent: "center",
    overflow: "hidden",
    width: 130,
  },
  photoImage: { height: "100%", width: "100%" },
  photoText: { color: colors.outlineStrong, fontSize: 12, fontWeight: "700", marginTop: 6 },
  photoActions: { flex: 1, gap: 10 },
  photoButton: {
    alignItems: "center",
    borderColor: colors.outline,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
    minHeight: 46,
  },
  photoButtonText: { color: colors.text, fontSize: 13, fontWeight: "700" },
  twoColumn: { flexDirection: "row", gap: 12 },
  noteText: { color: "#DC2626", fontSize: 12, fontStyle: "italic", fontWeight: "700" },
  paymentStats: { flexDirection: "row", gap: 8 },
  statCard: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.outline,
    borderRadius: 16,
    borderWidth: 1,
    flex: 1,
    gap: 8,
    padding: 10,
  },
  statCardActive: { borderColor: colors.primaryContainer, backgroundColor: "#E7F8F0" },
  statLabel: { color: colors.outlineStrong, fontSize: 11, fontWeight: "700", textAlign: "center" },
  statValue: { color: colors.text, fontSize: 13, fontWeight: "800", textAlign: "center" },
  statValueActive: { color: colors.primary },
  methodGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  methodButton: {
    alignItems: "center",
    borderColor: colors.outline,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: "row",
    gap: 7,
    minHeight: 44,
    paddingHorizontal: 12,
  },
  methodButtonActive: { borderColor: colors.primaryContainer, backgroundColor: "#E7F8F0" },
  methodText: { color: colors.muted, fontSize: 12, fontWeight: "800" },
  methodTextActive: { color: colors.primary },
  paymentInputRow: { alignItems: "flex-end", flexDirection: "row", gap: 12 },
  qrisPreview: {
    alignItems: "center",
    borderColor: colors.outline,
    borderRadius: 16,
    borderWidth: 1,
    gap: 10,
    padding: 14,
  },
  qrisGenerateButton: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.primary,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
    minHeight: 48,
  },
  qrisGenerateText: { color: colors.primary, fontSize: 13, fontWeight: "700" },
  qrisCaption: { color: colors.muted, fontSize: 12, fontWeight: "700", textAlign: "center" },
  authNotice: {
    alignItems: "flex-start",
    backgroundColor: "#FFF4E8",
    borderColor: colors.secondaryContainer,
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: "row",
    gap: 10,
    padding: 12,
  },
  authNoticeTitle: { color: colors.text, fontSize: 13, fontWeight: "800", marginBottom: 4 },
  authReason: { color: colors.muted, fontSize: 12, fontWeight: "600", lineHeight: 18 },
  addPaymentButton: {
    alignItems: "center",
    backgroundColor: colors.secondaryContainer,
    borderRadius: 999,
    height: 56,
    justifyContent: "center",
    width: 56,
  },
  paymentList: { borderColor: colors.outline, borderRadius: 14, borderWidth: 1, overflow: "hidden" },
  paymentLine: {
    alignItems: "center",
    borderBottomColor: colors.outline,
    borderBottomWidth: 1,
    flexDirection: "row",
    gap: 12,
    minHeight: 48,
    paddingHorizontal: 12,
  },
  paymentIndex: { color: colors.text, fontSize: 13, fontWeight: "700", width: 18 },
  paymentMethod: { color: colors.text, flex: 1, fontSize: 13, fontWeight: "700" },
  paymentSub: { color: colors.muted, fontSize: 10, fontWeight: "600", marginTop: 2 },
  paymentValue: { color: colors.text, fontSize: 13, fontWeight: "700" },
  paymentGrandLine: {
    alignItems: "center",
    backgroundColor: colors.surfaceLow,
    flexDirection: "row",
    justifyContent: "space-between",
    minHeight: 52,
    paddingHorizontal: 12,
  },
  paymentGrandLabel: { color: colors.text, fontSize: 14, fontWeight: "800" },
  paymentGrandValue: { color: colors.primaryContainer, fontSize: 17, fontWeight: "800" },
  disabledButton: { opacity: 0.55 },
});

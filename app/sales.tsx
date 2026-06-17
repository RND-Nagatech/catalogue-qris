import { useCallback, useEffect, useMemo, useState } from "react";
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
import { AppHeader, EmptyState } from "../components/ui";
import {
  authorizeNagagoldTransaction,
  loadQrisString,
  lookupNagagoldMemberByCode,
  lookupNagagoldPurchaseItem,
  lookupNagagoldSaleItem,
  searchNagagoldMembers,
  submitNagagoldSale,
  type NagagoldMember,
  type NagagoldKondisiBeli,
  type NagagoldMarketplace,
  type NagagoldPurchaseLookupItem,
  type NagagoldRekening,
  type NagagoldSaleLookupItem,
  type NagagoldSalesCapabilities,
  type NagagoldSalesPerson,
} from "../lib/dataStore";
import { generateDynamicQris } from "../contohqris";
import { formatRupiah, normalizeQris } from "../lib/qris";
import { useNagagoldConfig } from "../lib/nagagoldConfig";
import { useAppTheme } from "../lib/theme";

type SaleItem = {
  id: string;
  kodeBarcode: string;
  namaBarang: string;
  berat: number;
  hargaGram: number;
  hargaJual: number;
  ongkos: number;
  diskonPenjualan: number;
  typeDiskon: "DISKON_RP" | "DISKON_PERSEN" | "";
  diskonRp: number;
  diskonPersen: number;
  total: number;
  keterangan: string;
  imageUrl?: string;
  authorizationIds?: string[];
  raw?: Record<string, unknown>;
};

type ExchangeItem = {
  id: string;
  noFaktur: string;
  kodeBarcode: string;
  namaBarang: string;
  berat: number;
  beratNota: number;
  hargaNota: number;
  hargaBeli: number;
  hargaGram: number;
  kadar: number;
  kondisiBarang: string;
  kodeDept: string;
  kodeGroup: string;
  potonganLainLain: number;
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
  marketplace?: string;
  feePercent?: number;
  feeAmount?: number;
  rekeningLabel?: string;
};

const paymentMethods: PaymentLine["method"][] = ["CASH", "TRANSFER", "DEBET", "CREDIT"];
const defaultSalesCapabilities: NagagoldSalesCapabilities = {
  requireSales: true,
  allowNonMember: true,
  showMemberPhone: false,
  allowEditMemberCustomer: false,
  allowDiscount: false,
  allowEditItemName: false,
  allowEditTotal: false,
  allowEditPricePerGram: false,
  showFinishing: false,
  showSize: false,
  showTax24k: false,
  showMarketplacePayment: false,
  showPpnTransaction: false,
  showVoucher: false,
  requireAuthorizationOnPriceChange: false,
  requireAuthorizationOnDiamondPriceChange: false,
  requireAuthorizationOnLowerOngkos: false,
  allowQrisOnTransfer: true,
};
const colors = {
  background: "#F8F9FA",
  surface: "#FFFFFF",
  surfaceLow: "#F3F4F5",
  surfaceContainer: "#EDEEEF",
  text: "#191C1D",
  muted: "#3D4A3F",
  outline: "#BCCABC",
  outlineStrong: "#6D7A6E",
  primary: "#006A37",
  primaryContainer: "#008648",
  primarySoft: "#79FCA5",
  secondary: "#865300",
  secondaryContainer: "#FEA520",
  tertiary: "#4C5E71",
  danger: "#BA1A1A",
};

export default function Sales() {
  const theme = useAppTheme();
  const nagagoldConfig = useNagagoldConfig();
  const [domain, setDomain] = useState("");
  const [savedQris, setSavedQris] = useState("");
  const [salesCapabilities, setSalesCapabilities] = useState<NagagoldSalesCapabilities>(defaultSalesCapabilities);
  const [salesPeople, setSalesPeople] = useState<NagagoldSalesPerson[]>([]);
  const [marketplaces, setMarketplaces] = useState<NagagoldMarketplace[]>([]);
  const [kondisiList, setKondisiList] = useState<NagagoldKondisiBeli[]>([]);
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
  const [discountType, setDiscountType] = useState<"DISKON_RP" | "DISKON_PERSEN" | "">("");
  const [discountValue, setDiscountValue] = useState("");
  const [itemNote, setItemNote] = useState("");
  const [itemImageUrl, setItemImageUrl] = useState("");
  const [saleItemRaw, setSaleItemRaw] = useState<NagagoldSaleLookupItem | null>(null);
  const [payments, setPayments] = useState<PaymentLine[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<PaymentLine["method"]>("CASH");
  const [paymentRekening, setPaymentRekening] = useState("");
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentNoCard, setPaymentNoCard] = useState("");
  const [paymentMarketplace, setPaymentMarketplace] = useState("");
  const [paymentFeePercent, setPaymentFeePercent] = useState("");
  const [isLookingUpMember, setIsLookingUpMember] = useState(false);
  const [isLookingUpItem, setIsLookingUpItem] = useState(false);
  const [exchangeOpen, setExchangeOpen] = useState(false);
  const [exchangeBarcode, setExchangeBarcode] = useState("");
  const [exchangeLookup, setExchangeLookup] = useState<NagagoldPurchaseLookupItem | null>(null);
  const [exchangeHargaBeli, setExchangeHargaBeli] = useState("");
  const [exchangePotongan, setExchangePotongan] = useState("");
  const [exchangeKondisi, setExchangeKondisi] = useState("");
  const [isLookingUpExchange, setIsLookingUpExchange] = useState(false);
  const [exchangeItems, setExchangeItems] = useState<ExchangeItem[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAuthorizing, setIsAuthorizing] = useState(false);
  const [pendingAuthorization, setPendingAuthorization] = useState<PendingSaleAuthorization | null>(null);
  const [items, setItems] = useState<SaleItem[]>([]);

  const applyRuntimeConfig = useCallback((config: typeof nagagoldConfig.config) => {
    if (!config) return;
    setDomain(config.domain);
    setSalesCapabilities(config.capabilities.sales);
    setSalesPeople(config.masters.sales.filter((item) => item.status_aktif !== false));
    setMarketplaces((config.masters.marketplaces ?? []).filter((item) => item.status_aktif !== false));
    setKondisiList((config.masters.kondisi ?? []).filter((item) => item.status_aktif !== false));
    setRekenings(config.masters.rekenings);
    if (!config.capabilities.sales.allowNonMember) {
      setJenisCustomer("MEMBER");
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      setIsLoadingMaster(true);
      Promise.all([
        loadQrisString().catch(() => ""),
        nagagoldConfig.config ? Promise.resolve(nagagoldConfig.config) : nagagoldConfig.reloadConfig(),
      ])
        .then(([nextQris, config]) => {
          if (!active) return;
          setSavedQris(nextQris);
          applyRuntimeConfig(config);
        })
        .catch(() => {
          if (active) setDomain("");
        })
        .finally(() => {
          if (active) setIsLoadingMaster(false);
        });
      nagagoldConfig.checkForChanges();
      return () => {
        active = false;
      };
    }, [applyRuntimeConfig, nagagoldConfig])
  );

  useEffect(() => {
    applyRuntimeConfig(nagagoldConfig.config);
  }, [applyRuntimeConfig, nagagoldConfig.config?.version]);

  const total = useMemo(() => items.reduce((sum, item) => sum + item.total, 0), [items]);
  const exchangeTotal = useMemo(() => exchangeItems.reduce((sum, item) => sum + item.hargaBeli, 0), [exchangeItems]);
  const cashPaidTotal = payments.reduce((sum, item) => sum + item.amount, 0);
  const paidTotal = cashPaidTotal + exchangeTotal;
  const remaining = Math.max(total - paidTotal, 0);
  const firstItem = items[0];
  const hasRequiredSales = !salesCapabilities.requireSales || Boolean(kodeSales.trim());
  const canOpenPayment = Boolean(hasRequiredSales && items.length);
  const saveCustomer = async () => {
    if (salesCapabilities.requireSales && !kodeSales.trim()) {
      Alert.alert("Data belum lengkap", "Kode sales wajib dipilih.");
      return;
    }
    if (!salesCapabilities.allowNonMember && normalizeCustomerType(jenisCustomer) === "NONMEMBER") {
      Alert.alert("Customer belum valid", "Domain NAGAGOLD ini tidak mengizinkan transaksi NON MEMBER.");
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
      const nextHargaGram = Number(item.harga_gram ?? item.harga_skrg ?? 0) || (nextBerat > 0 ? Math.floor(nextHargaJual / nextBerat) : 0);
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
    const baseTotal = nextHargaJual + nextOngkos + Number(saleItemRaw?.harga_atribut ?? 0);
    const nextDiscount = calculateSaleDiscount(baseTotal, discountType, discountValue);
    const nextTotal = Math.max(0, baseTotal - nextDiscount);
    if (!kodeBarcode.trim() || !namaBarang.trim() || nextBerat <= 0 || nextHargaJual <= 0) {
      Alert.alert("Data barang belum lengkap", "Barcode, nama barang, berat, dan harga jual wajib diisi.");
      return;
    }
    const authReasons = getSaleAuthorizationReasons(saleItemRaw, nextBerat, nextHargaJual, salesCapabilities);
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
        diskonPenjualan: nextDiscount,
        typeDiskon: discountType,
        diskonRp: discountType === "DISKON_RP" ? nextDiscount : 0,
        diskonPersen: discountType === "DISKON_PERSEN" ? parseDecimal(discountValue) : 0,
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
    setDiscountType("");
    setDiscountValue("");
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
    const needsRekening = ["TRANSFER", "DEBET", "CREDIT"].includes(paymentMethod);
    if (amount <= 0) {
      Alert.alert("Nominal belum valid", "Masukkan nominal pembayaran terlebih dahulu.");
      return;
    }
    if (nominalWithFee <= 0) {
      Alert.alert("Fee belum valid", "Nominal setelah fee harus lebih dari nol.");
      return;
    }
    if (needsRekening && !selectedRekening) {
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
        bank: paymentMethod === "CASH" ? paymentMethod : selectedRekening?.kode_bank,
        rekening: paymentMethod === "CASH" ? paymentMethod : rekeningPayload(selectedRekening),
        rekeningLabel: paymentMethod === "CASH" ? paymentMethod : rekeningLabel(selectedRekening),
        noCard: paymentNoCard.trim(),
        marketplace: paymentMarketplace.trim(),
        feePercent,
        feeAmount,
      },
    ]);
    setPaymentAmount("");
    setPaymentNoCard("");
    setPaymentMarketplace("");
    setPaymentFeePercent("");
    await Haptics.selectionAsync();
  };

  const submit = () => {
    if (!domain) {
      Alert.alert("Domain belum diatur", "Isi domain NAGAGOLD di menu Pengaturan terlebih dahulu.");
      return;
    }
    if (salesCapabilities.requireSales && !kodeSales.trim()) {
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
    if (salesCapabilities.requireSales && !kodeSales.trim()) {
      Alert.alert("Sales belum dipilih", "Pilih Kode Sales di Data Customer terlebih dahulu.");
      return;
    }
    if (!items.length) {
      Alert.alert("Barang belum ada", "Tambahkan minimal satu Data Barang terlebih dahulu.");
      return;
    }
    setPaymentOpen(true);
  };

  const lookupExchangeItem = async () => {
    const barcode = exchangeBarcode.trim().toUpperCase();
    if (!barcode) {
      Alert.alert("Kode kosong", "Masukkan kode barcode atau no faktur barang tukar terlebih dahulu.");
      return;
    }
    if (exchangeItems.some((item) => item.kodeBarcode === barcode || item.noFaktur === barcode)) {
      Alert.alert("Barang sudah ada", "Kode Barcode Sudah Ada Dalam Table.");
      return;
    }

    setIsLookingUpExchange(true);
    try {
      const item = await lookupNagagoldPurchaseItem(barcode);
      const hargaNota = Number(item.harga_jual ?? 0) + Number(item.harga_atribut ?? 0);
      const hargaBeli = Number(item.harga_beli ?? item.harga_modal ?? hargaNota) || hargaNota;
      setExchangeLookup(item);
      setExchangeBarcode(String(item.kode_barcode ?? barcode).trim().toUpperCase());
      setExchangeHargaBeli(String(hargaBeli || ""));
      setExchangePotongan("");
      const rawKondisi = getRawText(item, "kondisi_barang", getRawText(item, "kondisi", ""));
      const matchedKondisi = kondisiList.find((kondisi) => kondisiKey(kondisi) === rawKondisi.toUpperCase());
      setExchangeKondisi(matchedKondisi ? kondisiKey(matchedKondisi) : "");
      await Haptics.selectionAsync();
    } catch (error) {
      setExchangeLookup(null);
      Alert.alert("Barang tukar tidak ditemukan", error instanceof Error ? error.message : "Data barang tukar belum bisa diambil dari NAGAGOLD.");
    } finally {
      setIsLookingUpExchange(false);
    }
  };

  const addExchangeItem = async () => {
    if (!exchangeLookup) {
      Alert.alert("Barang tukar kosong", "Ambil data barang tukar terlebih dahulu.");
      return;
    }
    const kode = getRawText(exchangeLookup, "kode_barcode", exchangeBarcode).toUpperCase();
    const noFaktur = getRawText(exchangeLookup, "no_faktur_jual", getRawText(exchangeLookup, "no_faktur", exchangeBarcode)).toUpperCase();
    if (exchangeItems.some((item) => item.kodeBarcode === kode || item.noFaktur === noFaktur)) {
      Alert.alert("Barang sudah ada", "Kode Barcode Sudah Ada Dalam Table.");
      return;
    }
    const hargaNota = Number(exchangeLookup.harga_jual ?? 0) + Number(exchangeLookup.harga_atribut ?? 0);
    const hargaBeli = parseCurrency(exchangeHargaBeli) || Math.max(0, hargaNota - parseCurrency(exchangePotongan));
    if (hargaBeli <= 0) {
      Alert.alert("Harga beli belum valid", "Harga beli barang tukar harus lebih dari nol.");
      return;
    }
    if (!exchangeKondisi.trim()) {
      Alert.alert("Kondisi belum dipilih", "Pilih kondisi barang tukar dari master kondisi pembelian.");
      return;
    }

    setExchangeItems([
      ...exchangeItems,
      {
        id: `EXCHANGE-${Date.now()}`,
        noFaktur,
        kodeBarcode: kode,
        namaBarang: getRawText(exchangeLookup, "nama_barang", "-").toUpperCase(),
        berat: getRawNumber(exchangeLookup, "berat", getRawNumber(exchangeLookup, "berat_awal", 0)),
        beratNota: getRawNumber(exchangeLookup, "berat_nota", getRawNumber(exchangeLookup, "berat_awal", 0)),
        hargaNota,
        hargaBeli,
        hargaGram: getRawNumber(exchangeLookup, "harga_gram", hargaBeli),
        kadar: getRawNumber(exchangeLookup, "kadar", 0),
        kondisiBarang: exchangeKondisi.trim().toUpperCase(),
        kodeDept: getRawText(exchangeLookup, "kode_dept", "-"),
        kodeGroup: getRawText(exchangeLookup, "kode_group", "-"),
        potonganLainLain: parseCurrency(exchangePotongan),
        raw: exchangeLookup,
      },
    ]);
    setExchangeBarcode("");
    setExchangeLookup(null);
    setExchangeHargaBeli("");
    setExchangePotongan("");
    setExchangeKondisi("");
    await Haptics.selectionAsync();
  };

  const submitConfirmed = async () => {
    if (!firstItem) return;
    setIsSubmitting(true);
    try {
      await submitNagagoldSale({
        kodeSales: kodeSales.trim(),
        kodeMember: normalizeCustomerType(jenisCustomer) === "NONMEMBER" ? "NONMEMBER" : kodeMember.trim(),
        namaCustomer: namaCustomer.trim() || "REGULER",
        alamatCustomer: alamatCustomer.trim() || "-",
        noHp: noHp.trim() || "-",
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
          diskonPenjualan: item.diskonPenjualan,
          typeDiskon: item.typeDiskon,
          diskonRp: item.diskonRp,
          diskonPersen: item.diskonPersen,
          total: item.total,
          keterangan: item.keterangan,
          authorizationIds: item.authorizationIds,
          raw: item.raw,
        })),
        jumlahBayar: paidTotal,
        keterangan: [...payments.map((item) => item.method), ...(exchangeItems.length ? ["TUKAR"] : [])].join(", "),
        payments: [
          ...payments.map((payment) => ({
            method: payment.method,
            amount: payment.amount,
            bank: payment.bank,
            rekening: payment.rekening,
            noCard: payment.noCard,
            marketplace: payment.marketplace,
            feePercent: payment.feePercent,
            feeAmount: payment.feeAmount,
            feeDropdown: payment.feePercent ? String(payment.feePercent) : "-",
            nominalWithFee: payment.amount,
          })),
          ...(exchangeItems.length ? [{
            method: "TUKAR" as const,
            amount: exchangeTotal,
            bank: "TUKAR",
            rekening: "TUKAR",
            detailBarang: exchangeItems.map((item) => ({
              no_faktur: item.noFaktur,
              nama_barang: item.namaBarang,
              kode_barcode: item.kodeBarcode,
              jenis_group: getRawText(item.raw, "jenis_group", "-"),
              qty: 1,
              kadar: item.kadar,
              berat: item.berat,
              harga_nota: item.hargaNota,
              harga_beli: item.hargaBeli,
              harga_gram: item.hargaGram,
              kode_dept: item.kodeDept,
              kode_group: item.kodeGroup,
              potongan_lain_lain: item.potonganLainLain,
              berat_nota: item.beratNota,
              kondisi_barang: item.kondisiBarang,
              kode_cabang: getRawText(item.raw, "kode_toko", ""),
              kode_harga_beli: "-",
            })),
          }] : []),
        ],
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
    setDiscountType("");
    setDiscountValue("");
    setItemNote("");
    setSaleItemRaw(null);
    setItemImageUrl("");
    setItems([]);
    setPayments([]);
    setExchangeItems([]);
    setExchangeLookup(null);
    setExchangeBarcode("");
    setExchangeHargaBeli("");
    setExchangePotongan("");
    setExchangeKondisi("");
    setPaymentMethod("CASH");
    setPaymentRekening("");
    setPaymentAmount("");
    setPaymentNoCard("");
    setPaymentMarketplace("");
    setPaymentFeePercent("");
    setPaymentOpen(false);
  };

  return (
    <>
      <ScrollView contentContainerStyle={[styles.container, { backgroundColor: theme.colors.background }]} keyboardShouldPersistTaps="handled">
        <AppHeader title="Transaksi Penjualan" rightIcon="cart-outline" rightBadge={items.length} />

        <View style={[styles.domainNotice, { backgroundColor: theme.colors.surfaceContainerLowest, borderColor: theme.colors.outlineVariant }]}>
          <Text style={[styles.domainNoticeText, { color: theme.colors.muted }]}>
            {domain ? (isLoadingMaster ? "Memuat master " : "Terhubung ke ") : "Atur domain "}
            <Text style={[styles.domainNoticeStrong, { color: theme.colors.primary }]}>Server</Text>
            {domain ? "" : " di Pengaturan"}
          </Text>
        </View>

        <View style={[styles.customerCard, theme.elevation.level1, { backgroundColor: theme.colors.cardBackground, borderColor: theme.colors.cardBorder, borderLeftColor: theme.colors.secondaryContainer }]}>
          <InfoLine icon="person" label="Nama Customer" value={namaCustomer || "-"} tone="primary" />
          <InfoLine icon="pricetag" label="Jenis" value={jenisCustomer} tone="secondary" />
          <InfoLine icon="id-card" label="Kode Sales" value={kodeSales || "-"} tone="neutral" />
          <Pressable style={[styles.editMiniButton, { backgroundColor: theme.colors.surfaceContainer }]} onPress={() => setCustomerOpen(true)}>
            <Ionicons name="pencil" size={17} color={theme.colors.primary} />
          </Pressable>
        </View>

        <View style={styles.actionRow}>
          <Pressable style={[styles.actionButton, { backgroundColor: theme.colors.secondaryContainer }]} onPress={() => setCustomerOpen(true)}>
            <Ionicons name="person-add-outline" size={17} color={theme.colors.onSecondaryContainer} />
            <View>
              <Text style={[styles.actionButtonText, { color: theme.colors.onSecondaryContainer }]}>Data Customer</Text>
            </View>
          </Pressable>
          <Pressable style={[styles.actionButton, { backgroundColor: theme.colors.buttonPrimary }]} onPress={() => setItemOpen(true)}>
            <Ionicons name="add-circle-outline" size={17} color={theme.colors.onPrimary} />
            <View>
              <Text style={[styles.actionButtonText, { color: theme.colors.onPrimary }]}>Data Barang</Text>
            </View>
          </Pressable>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Daftar Barang</Text>
          <Text style={[styles.sectionCount, { backgroundColor: theme.colors.surfaceContainer, color: theme.colors.subtleText }]}>{items.length} item</Text>
        </View>

        {items.length ? (
          <View style={styles.itemList}>
            {items.map((item) => (
              <View key={item.id} style={[styles.itemCard, { backgroundColor: theme.colors.cardBackground, borderColor: theme.colors.cardBorder }]}>
                <View style={[styles.itemImage, { backgroundColor: theme.colors.warningContainer }]}>
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
                  {item.diskonPenjualan > 0 ? <Row label="Diskon" value={formatRupiah(item.diskonPenjualan)} /> : null}
                  <Row label="Total" value={formatRupiah(item.total)} />
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
          <EmptyState
            icon="cube-outline"
            title="Belum ada barang"
            description="Tambahkan Data Barang untuk mulai transaksi penjualan."
            style={[styles.emptyCard, { backgroundColor: theme.colors.surfaceContainerLow, borderColor: theme.colors.outlineVariant }]}
          />
        )}

        <View style={[styles.bottomSummary, { backgroundColor: theme.colors.surfaceContainerLowest, borderColor: theme.colors.outlineVariant }]}>
          <View>
            <Text style={[styles.totalCaption, { color: theme.colors.subtleText }]}>Total</Text>
            <Text style={[styles.totalBig, { color: theme.colors.primary }]}>{formatRupiah(total)}</Text>
          </View>
          <Pressable
            style={[
              styles.paymentButton,
              { backgroundColor: theme.colors.buttonPrimary },
              !canOpenPayment && styles.paymentButtonDisabled,
              !canOpenPayment && { backgroundColor: theme.colors.surfaceContainer },
            ]}
            onPress={openPayment}
          >
            <Ionicons name="card-outline" size={21} color={canOpenPayment ? theme.colors.onPrimary : theme.colors.subtleText} />
            <Text style={[styles.paymentButtonText, { color: canOpenPayment ? theme.colors.onPrimary : theme.colors.subtleText }]}>Lanjut ke Pembayaran</Text>
          </Pressable>
        </View>
        <View style={styles.exchangeActionRow}>
          <Pressable
            style={[
              styles.exchangeMainButton,
              { backgroundColor: theme.colors.surfaceContainerLowest, borderColor: theme.colors.secondary },
              !canOpenPayment && { opacity: 0.55 },
            ]}
            disabled={!canOpenPayment}
            onPress={() => setExchangeOpen(true)}
          >
            <Ionicons name="swap-horizontal-outline" size={18} color={theme.colors.secondary} />
            <Text style={[styles.exchangeMainText, { color: theme.colors.secondary }]}>Bayar Dengan Tukar</Text>
          </Pressable>
          {exchangeTotal > 0 ? (
            <View style={[styles.exchangeTotalPill, { backgroundColor: theme.colors.warningContainer }]}>
              <Text style={[styles.exchangeTotalText, { color: theme.colors.secondary }]}>{formatRupiah(exchangeTotal)}</Text>
            </View>
          ) : null}
        </View>
        {exchangeItems.length ? (
          <View style={styles.itemList}>
            {exchangeItems.map((item) => (
              <View key={item.id} style={[styles.exchangeCard, { backgroundColor: theme.colors.cardBackground, borderColor: theme.colors.cardBorder }]}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.exchangeTitle, { color: theme.colors.text }]}>{item.namaBarang}</Text>
                  <Text style={[styles.exchangeSub, { color: theme.colors.muted }]}>{item.kodeBarcode} • {item.berat} gr • {item.kondisiBarang}</Text>
                </View>
                <Text style={[styles.exchangeValue, { color: theme.colors.secondary }]}>{formatRupiah(item.hargaBeli)}</Text>
                <Pressable onPress={() => setExchangeItems(exchangeItems.filter((nextItem) => nextItem.id !== item.id))}>
                  <Ionicons name="trash-outline" size={18} color="#DC2626" />
                </Pressable>
              </View>
            ))}
          </View>
        ) : null}
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
        capabilities={salesCapabilities}
        memberResults={memberResults}
        isLookingUpMember={isLookingUpMember}
        onLookupMember={lookupMember}
        onSearchMembers={searchMembers}
        onSelectMember={applyMember}
      />
      <ItemModal
        visible={itemOpen}
        capabilities={salesCapabilities}
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
        discountType={discountType}
        setDiscountType={setDiscountType}
        discountValue={discountValue}
        setDiscountValue={setDiscountValue}
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
        marketplaces={marketplaces}
        showMarketplacePayment={salesCapabilities.showMarketplacePayment}
        amount={paymentAmount}
        setAmount={setPaymentAmount}
        noCard={paymentNoCard}
        setNoCard={setPaymentNoCard}
        marketplace={paymentMarketplace}
        setMarketplace={setPaymentMarketplace}
        feePercent={paymentFeePercent}
        setFeePercent={setPaymentFeePercent}
        qrisString={savedQris}
        allowQrisOnTransfer={salesCapabilities.allowQrisOnTransfer}
        payments={payments}
        exchangeItems={exchangeItems}
        setPayments={setPayments}
        onRemoveExchange={(id) => setExchangeItems(exchangeItems.filter((item) => item.id !== id))}
        isSubmitting={isSubmitting}
        onAddPayment={addPayment}
        onClose={() => setPaymentOpen(false)}
        onSubmit={submit}
      />
      <ExchangeModal
        visible={exchangeOpen}
        barcode={exchangeBarcode}
        setBarcode={(value) => setExchangeBarcode(value.toUpperCase())}
        lookup={exchangeLookup}
        hargaBeli={exchangeHargaBeli}
        setHargaBeli={setExchangeHargaBeli}
        potongan={exchangePotongan}
        setPotongan={(value) => {
          const cleanValue = value.replace(/\D/g, "");
          setExchangePotongan(cleanValue);
          if (exchangeLookup) {
            const hargaNota = Number(exchangeLookup.harga_jual ?? 0) + Number(exchangeLookup.harga_atribut ?? 0);
            setExchangeHargaBeli(String(Math.max(0, hargaNota - parseCurrency(cleanValue))));
          }
        }}
        kondisi={exchangeKondisi}
        setKondisi={(value) => setExchangeKondisi(value.toUpperCase())}
        kondisiList={kondisiList}
        items={exchangeItems}
        isLookingUp={isLookingUpExchange}
        onLookup={lookupExchangeItem}
        onAdd={addExchangeItem}
        onRemove={(id) => setExchangeItems(exchangeItems.filter((item) => item.id !== id))}
        onClose={() => setExchangeOpen(false)}
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
  const iconColor = tone === "secondary" ? theme.colors.secondary : tone === "neutral" ? theme.colors.info : theme.colors.primary;
  const iconBg = tone === "secondary" ? theme.colors.warningContainer : tone === "neutral" ? theme.colors.infoContainer : theme.colors.successContainer;
  return (
    <View style={styles.infoLine}>
      <View style={[styles.infoIcon, { backgroundColor: iconBg }]}>
        <Ionicons name={icon} size={16} color={iconColor} />
      </View>
      <View style={styles.infoTextStack}>
        <Text style={[styles.infoLabel, { color: theme.colors.subtleText }]}>{label}</Text>
        <Text style={[styles.infoValue, { color: theme.colors.text }]}>{value}</Text>
      </View>
    </View>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  const theme = useAppTheme();

  return (
    <View style={styles.row}>
      <Text style={[styles.rowLabel, { color: theme.colors.subtleText }]}>{label}</Text>
      <Text style={[styles.rowValue, { color: theme.colors.text }]}>{value}</Text>
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
  capabilities: NagagoldSalesCapabilities;
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
  const customerOptions = props.capabilities.allowNonMember ? ["NONMEMBER", "MEMBER"] : ["MEMBER"];

  return (
    <Sheet visible={props.visible} title="Form Data Customer" onClose={props.onClose}>
      {props.capabilities.requireSales ? (
        <>
          <Text style={[styles.label, { color: theme.colors.subtleText }]}>Pilih Kode Sales</Text>
          <SelectField
            value={selectedSales ? `${selectedSales.kode_sales} - ${selectedSales.nama_sales}` : ""}
            placeholder="Pilih kode sales"
            onPress={() => setSalesPickerOpen(true)}
          />
        </>
      ) : null}
      <Text style={[styles.label, { color: theme.colors.subtleText }]}>Pilih Pelanggan</Text>
      <View style={styles.optionWrap}>
        {customerOptions.map((type) => (
          <Pressable
            key={type}
            style={[
              styles.optionButton,
              { backgroundColor: theme.colors.surfaceContainerLowest, borderColor: theme.colors.outlineVariant },
              normalizeCustomerType(props.jenisCustomer) === type && styles.optionButtonActive,
              normalizeCustomerType(props.jenisCustomer) === type && { backgroundColor: theme.colors.successContainer, borderColor: theme.colors.primary },
            ]}
            onPress={() => props.setJenisCustomer(type === "NONMEMBER" ? "NON MEMBER" : "MEMBER")}
          >
            <Text style={[
              styles.optionText,
              { color: theme.colors.muted },
              normalizeCustomerType(props.jenisCustomer) === type && styles.optionTextActive,
              normalizeCustomerType(props.jenisCustomer) === type && { color: theme.colors.primary },
            ]}>
              {type === "NONMEMBER" ? "NON MEMBER" : "MEMBER"}
            </Text>
          </Pressable>
        ))}
      </View>
      <Input label="Kode Customer" value={props.kodeMember} onChangeText={props.setKodeMember} placeholder="AUTO / kode member" uppercase />
      <Pressable style={[styles.outlineButton, { backgroundColor: theme.colors.surfaceContainerLowest, borderColor: theme.colors.primary }]} onPress={props.onLookupMember}>
        <Ionicons name="search-outline" size={17} color={theme.colors.primary} />
        <Text style={[styles.outlineButtonText, { color: theme.colors.primary }]}>{props.isLookingUpMember ? "Mencari Member..." : "Ambil Data Member"}</Text>
      </Pressable>
      <Input label="Nama Customer" value={props.namaCustomer} onChangeText={props.setNamaCustomer} placeholder="Nama customer" uppercase />
      <Input label="No HP" value={props.noHp} onChangeText={props.setNoHp} placeholder="Nomor HP" keyboardType="phone-pad" />
      <Input label="Alamat Customer" value={props.alamatCustomer} onChangeText={props.setAlamatCustomer} placeholder="Alamat customer" multiline uppercase />
      <Pressable style={[styles.outlineButton, { backgroundColor: theme.colors.surfaceContainerLowest, borderColor: theme.colors.outlineVariant }]} onPress={props.onSearchMembers}>
        <Ionicons name="filter-outline" size={17} color={theme.colors.primary} />
        <Text style={[styles.outlineButtonText, { color: theme.colors.primary }]}>{props.isLookingUpMember ? "Memfilter Customer..." : "Filter Data Customer"}</Text>
      </Pressable>
      {props.memberResults.length ? (
        <View style={[styles.resultList, { borderColor: theme.colors.outlineVariant }]}>
          {props.memberResults.slice(0, 5).map((member, index) => (
            <Pressable
              key={`${member.kode_member ?? member.kode_customer ?? index}`}
              style={[styles.resultRow, { borderBottomColor: theme.colors.divider }]}
              onPress={() => props.onSelectMember(member)}
            >
              <View style={{ flex: 1 }}>
                <Text style={[styles.resultTitle, { color: theme.colors.text }]}>{member.nama_customer || "-"}</Text>
                <Text style={[styles.resultSubtitle, { color: theme.colors.muted }]}>{member.kode_member || member.kode_customer || "-"} • {member.no_hp || "-"}</Text>
              </View>
              <Ionicons name="chevron-forward" size={17} color={theme.colors.muted} />
            </Pressable>
          ))}
        </View>
      ) : null}
      <Pressable style={[styles.sheetPrimaryButton, { backgroundColor: theme.colors.buttonPrimary }]} onPress={props.onSave}>
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
  capabilities: NagagoldSalesCapabilities;
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
  discountType: "DISKON_RP" | "DISKON_PERSEN" | "";
  setDiscountType: (value: "DISKON_RP" | "DISKON_PERSEN" | "") => void;
  discountValue: string;
  setDiscountValue: (value: string) => void;
  itemNote: string;
  setItemNote: (value: string) => void;
  imageUrl: string;
  isLookingUpItem: boolean;
  onLookupBarcode: () => void;
  onClose: () => void;
  onSave: () => void;
}) {
  const theme = useAppTheme();
  const [discountPickerOpen, setDiscountPickerOpen] = useState(false);
  const hargaGramValue = parseCurrency(props.hargaGram);
  const baseTotal = parseCurrency(props.hargaJual) + parseCurrency(props.ongkos);
  const discountAmount = calculateSaleDiscount(baseTotal, props.discountType, props.discountValue);
  const total = Math.max(0, baseTotal - discountAmount);
  const handleBeratChange = (value: string) => {
    props.setBerat(value);
    const nextBerat = parseDecimal(value);
    if (props.capabilities.allowEditPricePerGram && hargaGramValue > 0 && nextBerat > 0) {
      props.setHargaJual(String(Math.floor(hargaGramValue * nextBerat)));
    } else if (!value.trim()) {
      props.setHargaJual("");
    }
  };

  return (
    <Sheet visible={props.visible} title="Form Data Barang" onClose={props.onClose}>
      <View style={[styles.photoPanel, { backgroundColor: theme.colors.cardBackground, borderColor: theme.colors.cardBorder }]}>
        <View style={[styles.photoBox, { backgroundColor: theme.colors.surfaceContainerLow, borderColor: theme.colors.outlineVariant }]}>
          {props.imageUrl ? (
            <Image source={{ uri: props.imageUrl }} style={styles.photoImage} />
          ) : (
            <>
              <Ionicons name="camera" size={32} color={theme.colors.muted} />
              <Text style={[styles.photoText, { color: theme.colors.muted }]}>120 x 120</Text>
            </>
          )}
        </View>
        <View style={styles.photoActions}>
          <Pressable style={[styles.photoButton, { borderColor: theme.colors.outlineVariant }]}>
            <Ionicons name="image-outline" size={17} color={theme.colors.primary} />
            <Text style={[styles.photoButtonText, { color: theme.colors.text }]}>Pilih Gambar</Text>
          </Pressable>
          <Pressable style={[styles.photoButton, { borderColor: theme.colors.outlineVariant }]}>
            <Ionicons name="camera-outline" size={17} color={theme.colors.primary} />
            <Text style={[styles.photoButtonText, { color: theme.colors.text }]}>WebCam</Text>
          </Pressable>
        </View>
      </View>
      <Input label="Kode Barcode" value={props.kodeBarcode} onChangeText={props.setKodeBarcode} placeholder="Scan atau input kode barcode" uppercase />
      <Pressable style={[styles.outlineButton, { backgroundColor: theme.colors.surfaceContainerLowest, borderColor: theme.colors.primary }]} onPress={props.onLookupBarcode}>
        <Ionicons name="barcode-outline" size={17} color={theme.colors.primary} />
        <Text style={[styles.outlineButtonText, { color: theme.colors.primary }]}>{props.isLookingUpItem ? "Mengambil Barang..." : "Ambil Data Barang dari Barcode"}</Text>
      </Pressable>
      <Input
        label="Nama Barang"
        value={props.namaBarang}
        onChangeText={props.setNamaBarang}
        placeholder="Nama barang"
        editable={props.capabilities.allowEditItemName}
        uppercase
      />
      <View style={styles.twoColumn}>
        <Input label="Berat Jual (gr)" value={props.berat} onChangeText={handleBeratChange} placeholder="0" keyboardType="decimal-pad" />
        <CurrencyInput label="Harga Jual" value={props.hargaJual} onChangeText={props.setHargaJual} />
      </View>
      <View style={styles.twoColumn}>
        {props.capabilities.allowEditPricePerGram ? (
          <CurrencyInput label="Harga/Gram" value={props.hargaGram} onChangeText={props.setHargaGram} />
        ) : (
          <ReadOnly label="Harga/Gram" value={formatRupiah(hargaGramValue)} />
        )}
        <CurrencyInput label="Ongkos" value={props.ongkos} onChangeText={props.setOngkos} />
      </View>
      {props.capabilities.allowDiscount ? (
        <>
          <Text style={[styles.label, { color: theme.colors.subtleText }]}>Tipe Diskon</Text>
          <SelectField
            value={props.discountType === "DISKON_PERSEN" ? "Diskon Persen" : props.discountType === "DISKON_RP" ? "Diskon Rp" : ""}
            placeholder="Pilih tipe diskon"
            onPress={() => setDiscountPickerOpen(true)}
          />
          {props.discountType === "DISKON_PERSEN" ? (
            <View style={styles.twoColumn}>
              <Input
                label="Diskon Persen"
                value={props.discountValue}
                onChangeText={(value) => props.setDiscountValue(value.replace(/[^0-9.,]/g, ""))}
                placeholder="0"
                keyboardType="decimal-pad"
              />
              <ReadOnly label="Total Diskon" value={formatRupiah(discountAmount)} />
            </View>
          ) : props.discountType === "DISKON_RP" ? (
            <CurrencyInput label="Discount Rp" value={props.discountValue} onChangeText={props.setDiscountValue} />
          ) : null}
        </>
      ) : null}
      <View style={styles.twoColumn}>
        <ReadOnly label="Total" value={formatRupiah(total)} />
      </View>
      <Input label="Keterangan" value={props.itemNote} onChangeText={props.setItemNote} placeholder="Keterangan barang opsional" multiline uppercase />
      <View style={styles.sheetFooter}>
        <Pressable style={[styles.sheetSecondaryButton, { borderColor: theme.colors.outlineVariant, backgroundColor: theme.colors.surfaceContainerLowest }]} onPress={props.onClose}>
          <Text style={[styles.sheetSecondaryText, { color: theme.colors.text }]}>Tutup</Text>
        </Pressable>
        <Pressable style={[styles.sheetPrimaryButtonSmall, { backgroundColor: theme.colors.buttonPrimary }]} onPress={props.onSave}>
          <Text style={styles.sheetPrimaryText}>Simpan Data</Text>
        </Pressable>
      </View>
      <OptionSheet
        visible={discountPickerOpen}
        title="Pilih Tipe Diskon"
        onClose={() => setDiscountPickerOpen(false)}
        options={[
          { key: "", label: "Tanpa Diskon" },
          { key: "DISKON_RP", label: "Diskon Rp" },
          { key: "DISKON_PERSEN", label: "Diskon Persen" },
        ]}
        selectedKey={props.discountType}
        onSelect={(key) => {
          props.setDiscountType(key as "DISKON_RP" | "DISKON_PERSEN" | "");
          props.setDiscountValue("");
          setDiscountPickerOpen(false);
        }}
      />
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
  marketplaces: NagagoldMarketplace[];
  showMarketplacePayment: boolean;
  amount: string;
  setAmount: (value: string) => void;
  noCard: string;
  setNoCard: (value: string) => void;
  marketplace: string;
  setMarketplace: (value: string) => void;
  feePercent: string;
  setFeePercent: (value: string) => void;
  qrisString: string;
  allowQrisOnTransfer: boolean;
  payments: PaymentLine[];
  exchangeItems: ExchangeItem[];
  setPayments: (value: PaymentLine[]) => void;
  onRemoveExchange: (id: string) => void;
  isSubmitting: boolean;
  onAddPayment: () => void;
  onClose: () => void;
  onSubmit: () => void;
}) {
  const theme = useAppTheme();
  const [methodPickerOpen, setMethodPickerOpen] = useState(false);
  const [rekeningPickerOpen, setRekeningPickerOpen] = useState(false);
  const [marketplacePickerOpen, setMarketplacePickerOpen] = useState(false);
  const [showTransferQris, setShowTransferQris] = useState(false);
  const amount = parseCurrency(props.amount);
  const qrisAmount = amount > 0 ? amount : props.remaining;
  const feePercent = parseDecimal(props.feePercent);
  const feeAmount = ["DEBET", "CREDIT"].includes(props.method) ? Math.floor((amount * feePercent) / 100) : 0;
  const nominalWithFee = ["DEBET", "CREDIT"].includes(props.method) ? amount + feeAmount : amount;
  const generatedQris = props.method === "TRANSFER" && showTransferQris ? buildPaymentQris(props.qrisString, qrisAmount) : "";
  const selectedRekening = props.rekenings.find((rekening) => rekeningKey(rekening) === props.rekening);
  const selectedMarketplace = props.marketplaces.find((marketplace) => marketplaceKey(marketplace) === props.marketplace);
  const exchangeTotal = props.exchangeItems.reduce((sum, item) => sum + item.hargaBeli, 0);
  const generateTransferQris = () => {
    if (props.method !== "TRANSFER") return;
    if (qrisAmount <= 0) {
      Alert.alert("Nominal belum valid", "Isi nominal transfer atau pastikan masih ada sisa pembayaran.");
      return;
    }
    if (!buildPaymentQris(props.qrisString, qrisAmount)) {
      Alert.alert("QRIS belum siap", "Simpan QRIS merchant di Pengaturan terlebih dahulu.");
      return;
    }
    if (amount <= 0) {
      props.setAmount(String(qrisAmount));
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
      <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Tambah Pembayaran</Text>
      <Text style={[styles.label, { color: theme.colors.subtleText }]}>Metode Pembayaran</Text>
      <SelectField value={props.method} placeholder="Pilih metode pembayaran" onPress={() => setMethodPickerOpen(true)} />
      {["TRANSFER", "DEBET", "CREDIT"].includes(props.method) ? (
        <>
          <Text style={[styles.label, { color: theme.colors.subtleText }]}>Pilih Bank/Rekening</Text>
          <SelectField
            value={selectedRekening ? rekeningLabel(selectedRekening) : ""}
            placeholder="Pilih rekening dari master"
            onPress={() => setRekeningPickerOpen(true)}
          />
        </>
      ) : null}
      {props.showMarketplacePayment ? (
        <>
          <Text style={[styles.label, { color: theme.colors.subtleText }]}>Marketplace</Text>
          {props.marketplaces.length ? (
            <SelectField
              value={selectedMarketplace ? marketplaceLabel(selectedMarketplace) : ""}
              placeholder="Pilih marketplace"
              onPress={() => setMarketplacePickerOpen(true)}
            />
          ) : (
            <Input label="" value={props.marketplace} onChangeText={props.setMarketplace} placeholder="Marketplace" uppercase />
          )}
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
      {props.method === "TRANSFER" && props.allowQrisOnTransfer ? (
        <>
          <Pressable
            style={[styles.qrisGenerateButton, { backgroundColor: theme.colors.surfaceContainerLowest, borderColor: theme.colors.primary }]}
            onPress={generateTransferQris}
          >
            <Ionicons name="qr-code-outline" size={18} color={theme.colors.primary} />
            <Text style={[styles.qrisGenerateText, { color: theme.colors.primary }]}>
              {showTransferQris ? "Update QRIS Transfer" : "Generate QRIS Transfer"}
            </Text>
          </Pressable>
          {showTransferQris ? (
            <View style={[styles.qrisPreview, { backgroundColor: theme.colors.surfaceContainerLowest, borderColor: theme.colors.outlineVariant }]}>
              {generatedQris ? (
                <>
                  <QRCode value={generatedQris} size={168} backgroundColor="#FFFFFF" color="#0F172A" />
                  <Text style={[styles.qrisCaption, { color: theme.colors.muted }]}>
                    QRIS untuk pembayaran transfer {formatRupiah(qrisAmount)}
                  </Text>
                </>
              ) : (
                <Text style={[styles.qrisCaption, { color: theme.colors.muted }]}>Isi nominal dan pastikan QRIS merchant sudah tersimpan di Pengaturan.</Text>
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
      <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Rincian Pembayaran</Text>
      <View style={[styles.paymentList, { borderColor: theme.colors.outlineVariant }]}>
        {props.payments.map((payment, index) => (
          <View key={payment.id} style={[styles.paymentLine, { borderBottomColor: theme.colors.divider }]}>
            <Text style={[styles.paymentIndex, { color: theme.colors.text }]}>{index + 1}</Text>
            <View style={{ flex: 1 }}>
              <Text style={[styles.paymentMethod, { color: theme.colors.text }]}>{payment.method}</Text>
              {payment.rekeningLabel && payment.rekeningLabel !== payment.method ? (
                <Text style={[styles.paymentSub, { color: theme.colors.muted }]}>{payment.rekeningLabel}</Text>
              ) : null}
              {payment.marketplace ? (
                <Text style={[styles.paymentSub, { color: theme.colors.muted }]}>Marketplace: {payment.marketplace}</Text>
              ) : null}
            </View>
            <Text style={[styles.paymentValue, { color: theme.colors.text }]}>{formatRupiah(payment.amount)}</Text>
            <Pressable onPress={() => props.setPayments(props.payments.filter((item) => item.id !== payment.id))}>
              <Ionicons name="trash-outline" size={18} color="#DC2626" />
            </Pressable>
          </View>
        ))}
        {props.exchangeItems.length ? (
          <View style={[styles.paymentLine, { borderBottomColor: theme.colors.divider }]}>
            <Text style={[styles.paymentIndex, { color: theme.colors.text }]}>{props.payments.length + 1}</Text>
            <View style={{ flex: 1 }}>
              <Text style={[styles.paymentMethod, { color: theme.colors.text }]}>TUKAR</Text>
              <Text style={[styles.paymentSub, { color: theme.colors.muted }]}>
                {props.exchangeItems.length} barang tukar
              </Text>
            </View>
            <Text style={[styles.paymentValue, { color: theme.colors.text }]}>{formatRupiah(exchangeTotal)}</Text>
            <Pressable onPress={() => props.exchangeItems.forEach((item) => props.onRemoveExchange(item.id))}>
              <Ionicons name="trash-outline" size={18} color="#DC2626" />
            </Pressable>
          </View>
        ) : null}
        <View style={[styles.paymentGrandLine, { backgroundColor: theme.colors.surfaceContainerLow }]}>
          <Text style={[styles.paymentGrandLabel, { color: theme.colors.text }]}>Grand Total</Text>
          <Text style={[styles.paymentGrandValue, { color: theme.colors.primary }]}>{formatRupiah(props.paidTotal)}</Text>
        </View>
      </View>
      <View style={styles.sheetFooter}>
        <Pressable style={[styles.sheetPrimaryButtonSmall, { backgroundColor: theme.colors.buttonPrimary }]} disabled={props.isSubmitting} onPress={props.onSubmit}>
          <Text style={styles.sheetPrimaryText}>{props.isSubmitting ? "Mengirim..." : "Bayar Sekarang"}</Text>
        </Pressable>
        <Pressable style={[styles.sheetSecondaryButton, { borderColor: theme.colors.primary, backgroundColor: theme.colors.surfaceContainerLowest }]}>
          <Text style={[styles.sheetSecondaryText, { color: theme.colors.primary }]}>Bayar DP</Text>
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
          props.setMarketplace("");
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
      <OptionSheet
        visible={marketplacePickerOpen}
        title="Pilih Marketplace"
        onClose={() => setMarketplacePickerOpen(false)}
        options={props.marketplaces.map((marketplace) => ({ key: marketplaceKey(marketplace), label: marketplaceLabel(marketplace) }))}
        emptyText="Master marketplace kosong."
        selectedKey={props.marketplace}
        onSelect={(key) => {
          props.setMarketplace(key);
          setMarketplacePickerOpen(false);
        }}
      />
    </Sheet>
  );
}

function ExchangeModal(props: {
  visible: boolean;
  barcode: string;
  setBarcode: (value: string) => void;
  lookup: NagagoldPurchaseLookupItem | null;
  hargaBeli: string;
  setHargaBeli: (value: string) => void;
  potongan: string;
  setPotongan: (value: string) => void;
  kondisi: string;
  setKondisi: (value: string) => void;
  kondisiList: NagagoldKondisiBeli[];
  items: ExchangeItem[];
  isLookingUp: boolean;
  onLookup: () => void;
  onAdd: () => void;
  onRemove: (id: string) => void;
  onClose: () => void;
}) {
  const theme = useAppTheme();
  const [kondisiPickerOpen, setKondisiPickerOpen] = useState(false);
  const hargaNota = props.lookup ? Number(props.lookup.harga_jual ?? 0) + Number(props.lookup.harga_atribut ?? 0) : 0;
  const selectedKondisi = props.kondisiList.find((kondisi) => kondisiKey(kondisi) === props.kondisi);

  return (
    <Sheet visible={props.visible} title="Bayar Dengan Tukar" onClose={props.onClose}>
      <Input
        label="Kode Barcode / No Faktur"
        value={props.barcode}
        onChangeText={props.setBarcode}
        placeholder="Scan atau input kode"
        uppercase
      />
      <Pressable style={[styles.outlineButton, { backgroundColor: theme.colors.surfaceContainerLowest, borderColor: theme.colors.primary }]} onPress={props.onLookup}>
        <Ionicons name="barcode-outline" size={17} color={theme.colors.primary} />
        <Text style={[styles.outlineButtonText, { color: theme.colors.primary }]}>
          {props.isLookingUp ? "Mengambil Barang..." : "Ambil Data Barang Tukar"}
        </Text>
      </Pressable>

      {props.lookup ? (
        <>
          <View style={[styles.exchangeLookupBox, { backgroundColor: theme.colors.surfaceContainerLow, borderColor: theme.colors.outlineVariant }]}>
            <Text style={[styles.exchangeTitle, { color: theme.colors.text }]}>{getRawText(props.lookup, "nama_barang", "-")}</Text>
            <Text style={[styles.exchangeSub, { color: theme.colors.muted }]}>
              {getRawText(props.lookup, "kode_barcode", props.barcode)} • Faktur {getRawText(props.lookup, "no_faktur_jual", "-")}
            </Text>
          </View>
          <View style={styles.twoColumn}>
            <ReadOnly label="Berat Nota" value={`${getRawNumber(props.lookup, "berat_nota", getRawNumber(props.lookup, "berat_awal", 0))} gr`} />
            <ReadOnly label="Berat" value={`${getRawNumber(props.lookup, "berat", getRawNumber(props.lookup, "berat_awal", 0))} gr`} />
          </View>
          <View style={styles.twoColumn}>
            <ReadOnly label="Harga Nota" value={formatRupiah(hargaNota)} />
            <ReadOnly label="Harga/Gram" value={formatRupiah(getRawNumber(props.lookup, "harga_gram", 0))} />
          </View>
          <View style={styles.twoColumn}>
            <CurrencyInput label="Potongan Lain Lain" value={props.potongan} onChangeText={props.setPotongan} />
            <CurrencyInput label="Harga Beli" value={props.hargaBeli} onChangeText={props.setHargaBeli} />
          </View>
          <Text style={[styles.label, { color: theme.colors.subtleText }]}>Kondisi Barang</Text>
          <SelectField
            value={selectedKondisi ? kondisiLabel(selectedKondisi) : ""}
            placeholder="Pilih kondisi"
            onPress={() => setKondisiPickerOpen(true)}
          />
          <Pressable style={[styles.sheetPrimaryButton, { backgroundColor: theme.colors.buttonPrimary }]} onPress={props.onAdd}>
            <Text style={styles.sheetPrimaryText}>Simpan Barang Tukar</Text>
          </Pressable>
        </>
      ) : null}

      {props.items.length ? (
        <>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Daftar Barang Tukar</Text>
          <View style={[styles.paymentList, { borderColor: theme.colors.outlineVariant }]}>
            {props.items.map((item) => (
              <View key={item.id} style={[styles.paymentLine, { borderBottomColor: theme.colors.divider }]}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.paymentMethod, { color: theme.colors.text }]}>{item.namaBarang}</Text>
                  <Text style={[styles.paymentSub, { color: theme.colors.muted }]}>{item.kodeBarcode} • {item.berat} gr</Text>
                </View>
                <Text style={[styles.paymentValue, { color: theme.colors.secondary }]}>{formatRupiah(item.hargaBeli)}</Text>
                <Pressable onPress={() => props.onRemove(item.id)}>
                  <Ionicons name="trash-outline" size={18} color="#DC2626" />
                </Pressable>
              </View>
            ))}
          </View>
        </>
      ) : null}

      <View style={styles.sheetFooter}>
        <Pressable style={[styles.sheetSecondaryButton, { borderColor: theme.colors.outlineVariant, backgroundColor: theme.colors.surfaceContainerLowest }]} onPress={props.onClose}>
          <Text style={[styles.sheetSecondaryText, { color: theme.colors.text }]}>Tutup</Text>
        </Pressable>
      </View>
      <OptionSheet
        visible={kondisiPickerOpen}
        title="Pilih Kondisi Barang"
        onClose={() => setKondisiPickerOpen(false)}
        options={props.kondisiList.map((kondisi) => ({
          key: kondisiKey(kondisi),
          label: kondisiLabel(kondisi),
        }))}
        emptyText="Master kondisi pembelian kosong."
        selectedKey={props.kondisi}
        onSelect={(key) => {
          props.setKondisi(key);
          setKondisiPickerOpen(false);
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
      <View style={[styles.authNotice, { backgroundColor: theme.colors.warningContainer, borderColor: theme.colors.secondary }]}>
        <Ionicons name="shield-checkmark-outline" size={20} color={theme.colors.secondary} />
        <View style={{ flex: 1 }}>
          <Text style={[styles.authNoticeTitle, { color: theme.colors.text }]}>Perlu otorisasi SPV/Owner</Text>
          {props.reasons.map((reason) => (
            <Text key={reason} style={[styles.authReason, { color: theme.colors.muted }]}>- {reason}</Text>
          ))}
        </View>
      </View>
      <Input label="Username Otorisasi" value={username} onChangeText={setUsername} placeholder="User SPV / Owner" />
      <Input label="Password" value={password} onChangeText={setPassword} placeholder="Password" />
      <Input label="Keterangan" value={keterangan} onChangeText={setKeterangan} placeholder="Alasan otorisasi" multiline />
      <View style={styles.sheetFooter}>
        <Pressable style={[styles.sheetSecondaryButton, { borderColor: theme.colors.outlineVariant, backgroundColor: theme.colors.surfaceContainerLowest }]} onPress={props.onClose}>
          <Text style={[styles.sheetSecondaryText, { color: theme.colors.text }]}>Batal</Text>
        </Pressable>
        <Pressable style={[styles.sheetPrimaryButtonSmall, { backgroundColor: theme.colors.buttonPrimary }, props.isSubmitting && styles.disabledButton]} disabled={props.isSubmitting} onPress={submit}>
          <Text style={styles.sheetPrimaryText}>{props.isSubmitting ? "Memproses..." : "Otorisasi"}</Text>
        </Pressable>
      </View>
    </Sheet>
  );
}

function SelectField({ value, placeholder, onPress }: { value: string; placeholder: string; onPress: () => void }) {
  const theme = useAppTheme();

  return (
    <Pressable style={[styles.selectField, { backgroundColor: theme.colors.inputBackground, borderColor: theme.colors.inputBorder }]} onPress={onPress}>
      <Text style={[styles.selectValue, { color: value ? theme.colors.text : theme.colors.subtleText }, !value && styles.selectPlaceholder]}>{value || placeholder}</Text>
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
      <View style={[styles.optionBackdrop, { backgroundColor: theme.colors.scrim }]}>
        <View style={[styles.optionSheet, { backgroundColor: theme.colors.surfaceContainerLowest }]}>
          <View style={[styles.sheetHandle, { backgroundColor: theme.colors.outlineVariant }]} />
          <View style={[styles.sheetHeader, { borderBottomColor: theme.colors.divider }]}>
            <Text style={[styles.sheetTitle, { color: theme.colors.text }]}>{props.title}</Text>
            <Pressable onPress={props.onClose}>
              <Ionicons name="close" size={25} color={theme.colors.text} />
            </Pressable>
          </View>
          <ScrollView
            automaticallyAdjustKeyboardInsets
            contentContainerStyle={styles.optionContent}
            keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
            keyboardShouldPersistTaps="handled"
          >
            {props.options.length ? props.options.map((option) => {
              const selected = props.selectedKey === option.key;
              return (
                <Pressable
                  key={option.key}
                  style={[styles.optionRow, { borderColor: selected ? theme.colors.primary : theme.colors.outlineVariant, backgroundColor: selected ? theme.colors.successContainer : theme.colors.surfaceContainerLowest }, selected && styles.optionRowActive]}
                  onPress={() => props.onSelect(option.key)}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.optionRowTitle, { color: selected ? theme.colors.primary : theme.colors.text }, selected && styles.optionRowTitleActive]}>{option.label}</Text>
                    {option.description ? <Text style={[styles.optionRowDescription, { color: theme.colors.muted }]}>{option.description}</Text> : null}
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
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={[styles.modalBackdrop, { backgroundColor: theme.colors.scrim }]}>
        <View style={[styles.sheet, { backgroundColor: theme.colors.surfaceContainerLowest }]}>
          <View style={[styles.sheetHandle, { backgroundColor: theme.colors.outlineVariant }]} />
          <View style={[styles.sheetHeader, { borderBottomColor: theme.colors.divider }]}>
            <Text style={[styles.sheetTitle, { color: theme.colors.text }]}>{title}</Text>
            <Pressable onPress={onClose}>
              <Ionicons name="close" size={25} color={theme.colors.text} />
            </Pressable>
          </View>
          <ScrollView
            automaticallyAdjustKeyboardInsets
            contentContainerStyle={styles.sheetContent}
            keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
            keyboardShouldPersistTaps="handled"
          >
            {children}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function Input({ label, value, onChangeText, placeholder, keyboardType = "default", multiline = false, editable = true, uppercase = false }: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  keyboardType?: "default" | "number-pad" | "decimal-pad" | "phone-pad";
  multiline?: boolean;
  editable?: boolean;
  uppercase?: boolean;
}) {
  const theme = useAppTheme();
  const handleChangeText = (text: string) => onChangeText(uppercase ? text.toUpperCase() : text);

  return (
    <View style={styles.field}>
      <Text style={[styles.label, { color: theme.colors.subtleText }]}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={handleChangeText}
        placeholder={placeholder}
        placeholderTextColor={theme.colors.subtleText}
        keyboardType={keyboardType}
        autoCapitalize={uppercase ? "characters" : "sentences"}
        multiline={multiline}
        editable={editable}
        style={[
          styles.input,
          { backgroundColor: editable ? theme.colors.inputBackground : theme.colors.surfaceContainerLow, borderColor: theme.colors.inputBorder, color: theme.colors.text },
          multiline && styles.textarea,
        ]}
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
      <Text style={[styles.label, { color: theme.colors.subtleText }]}>{label}</Text>
      <View style={[styles.currencyWrap, { backgroundColor: theme.colors.inputBackground, borderColor: theme.colors.inputBorder }]}>
        <Text style={[styles.rp, { color: theme.colors.subtleText }]}>Rp</Text>
        <TextInput
          value={value ? Number(value.replace(/\D/g, "")).toLocaleString("id-ID") : ""}
          onChangeText={(text) => onChangeText(text.replace(/\D/g, ""))}
          placeholder="0"
          placeholderTextColor={theme.colors.subtleText}
          keyboardType="number-pad"
          style={[styles.currencyInput, { color: theme.colors.text }]}
        />
      </View>
    </View>
  );
}

function ReadOnly({ label, value, onPress }: { label: string; value: string; onPress?: () => void }) {
  const theme = useAppTheme();
  const content = (
    <>
      <Text style={[styles.label, { color: theme.colors.subtleText }]}>{label}</Text>
      <View style={[styles.readOnly, { backgroundColor: theme.colors.surfaceContainerLow, borderColor: theme.colors.outlineVariant }, onPress && styles.readOnlyPressable, onPress && { backgroundColor: theme.colors.successContainer, borderColor: theme.colors.primary }]}>
        <Text style={[styles.readOnlyText, { color: theme.colors.text }]}>{value}</Text>
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
      { backgroundColor: theme.colors.surfaceContainerLowest, borderColor: theme.colors.outlineVariant },
      active && styles.statCardActive,
      active && { backgroundColor: theme.colors.successContainer, borderColor: theme.colors.primary },
    ]}>
      <Text style={[styles.statLabel, { color: theme.colors.subtleText }]}>{label}</Text>
      <Text style={[styles.statValue, { color: active ? theme.colors.primary : theme.colors.text }, active && styles.statValueActive]}>{value}</Text>
      <Ionicons name={icon} size={24} color={active ? theme.colors.primary : theme.colors.secondary} />
    </View>
  );
}

function methodIcon(method: PaymentLine["method"]): keyof typeof Ionicons.glyphMap {
  if (method === "TRANSFER") return "business-outline";
  if (method === "DEBET" || method === "CREDIT") return "card-outline";
  return "cash-outline";
}

function marketplaceKey(marketplace: NagagoldMarketplace): string {
  return String(marketplace.kode_marketplace ?? marketplace.kode ?? marketplace.marketplace ?? marketplace.nama_marketplace ?? marketplace.nama ?? "").trim();
}

function marketplaceLabel(marketplace: NagagoldMarketplace): string {
  const key = marketplaceKey(marketplace);
  const name = String(marketplace.nama_marketplace ?? marketplace.nama ?? marketplace.marketplace ?? "").trim();
  return [key, name].filter(Boolean).join(" - ") || "-";
}

function kondisiKey(kondisi: NagagoldKondisiBeli): string {
  return String(kondisi.kondisi_barang ?? "").trim().toUpperCase();
}

function kondisiLabel(kondisi: NagagoldKondisiBeli): string {
  const key = kondisiKey(kondisi);
  const percent = Number(kondisi.persentase ?? 0);
  const fixed = Number(kondisi.potongan ?? 0);
  const suffix = fixed > 0 ? ` - ${formatRupiah(fixed)}` : percent > 0 ? ` - ${percent}%` : "";
  return `${key}${suffix}` || "-";
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

function getSaleAuthorizationReasons(
  raw: Record<string, unknown> | null | undefined,
  nextBerat: number,
  nextHargaJual: number,
  capabilities: NagagoldSalesCapabilities,
): string[] {
  if (!raw) return [];
  if (!capabilities.requireAuthorizationOnPriceChange && !capabilities.requireAuthorizationOnDiamondPriceChange) return [];
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

function calculateSaleDiscount(baseTotal: number, type: SaleItem["typeDiskon"], value: string): number {
  if (!type || baseTotal <= 0) return 0;
  if (type === "DISKON_RP") return Math.min(baseTotal, parseCurrency(value));
  const percent = parseDecimal(value);
  if (!Number.isFinite(percent) || percent <= 0) return 0;
  return Math.min(baseTotal, Math.floor((baseTotal * percent) / 100));
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
  exchangeActionRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
  },
  exchangeMainButton: {
    alignItems: "center",
    borderRadius: 14,
    borderWidth: 1,
    flex: 1,
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
    minHeight: 50,
    paddingHorizontal: 12,
  },
  exchangeMainText: { fontSize: 13, fontWeight: "800" },
  exchangeTotalPill: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  exchangeTotalText: { fontSize: 12, fontWeight: "800" },
  exchangeCard: {
    alignItems: "center",
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: "row",
    gap: 10,
    padding: 12,
  },
  exchangeTitle: { fontSize: 14, fontWeight: "800" },
  exchangeSub: { fontSize: 11, fontWeight: "600", marginTop: 3 },
  exchangeValue: { fontSize: 13, fontWeight: "800" },
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
  sheetContent: { gap: 14, padding: 20, paddingBottom: 150 },
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
  optionContent: { gap: 8, padding: 16, paddingBottom: 120 },
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
  moduleNotice: {
    alignItems: "flex-start",
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: "row",
    gap: 8,
    padding: 10,
  },
  moduleNoticeText: { flex: 1, fontSize: 11, fontWeight: "600", lineHeight: 17 },
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
  exchangeLookupBox: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
  },
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

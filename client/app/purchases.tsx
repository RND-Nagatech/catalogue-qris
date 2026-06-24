import { type ReactNode, useCallback, useEffect, useMemo, useState } from "react";
import { Alert, FlatList, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  authorizeNagagoldTransaction,
  loadNagagoldStores,
  lookupNagagoldMemberByCode,
  lookupNagagoldPurchaseItem,
  searchNagagoldMembers,
  submitNagagoldPurchase,
  type NagagoldGroup,
  type NagagoldJenis,
  type NagagoldKondisiBeli,
  type NagagoldMember,
  type NagagoldPurchaseCapabilities,
  type NagagoldPurchaseRounding,
  type NagagoldPurchaseLookupItem,
  type NagagoldRekening,
  type NagagoldSalesPerson,
  type NagagoldStore,
  type NagagoldToko,
} from "../lib/dataStore";
import { AppHeader as SharedAppHeader, EmptyState } from "../components/ui";
import { formatRupiah } from "../lib/qris";
import { useNagagoldConfig } from "../lib/nagagoldConfig";
import { useAppTheme } from "../lib/theme";

type PurchaseItem = {
  id: string;
  kodeBarcode: string;
  noFakturJual: string;
  kodeJenis: string;
  namaBarang: string;
  beratNota: number;
  berat: number;
  hargaNota: number;
  hargaBeli: number;
  kondisi: string;
  typeKondisi: string;
  kadar: number;
  kadarModal: number;
  kadarCetak: string;
  statusBarang?: string;
  beratAtribut?: number;
  hargaAtribut?: number;
  potonganManual?: number;
  potonganKondisiBeli?: number;
  kodeHargaBeli?: string;
  authorizationIds?: string[];
  raw?: Record<string, unknown>;
};

type PendingPurchaseAuthorization = {
  reasons: string[];
  goToStep2?: boolean;
  payload: {
    beratNota: number;
    berat: number;
    hargaNota: number;
    hargaBeli: number;
  };
};

const paymentTypes = ["CASH", "TRANSFER"];
const defaultPurchaseCapabilities: NagagoldPurchaseCapabilities = {
  requireSales: true,
  allowTransferPayment: true,
  requireTransferAuthorization: false,
  allowPurchaseWithoutBarcode: false,
  showStoreSelector: true,
  showManualDiscount: false,
  showBiayaAdmin: false,
  showPhoto: false,
  lockHargaBeli: false,
  readOnlyHargaBeli: false,
  disableBeratBeli: false,
  useHargaNotaWithOngkos: false,
  useHargaBeliWithoutAtributOngkos: false,
  useParameterHargaBeli: false,
  useParameterHargaEmas: false,
  enableHargaRataEdit: false,
  requireWeightToleranceAuthorization: false,
  requireAbsoluteAuthorization: false,
  disableAuthorizationAboveNota: false,
  disableAuthorizationBelowNota: false,
  unsupportedModules: [],
};
const colors = {
  background: "#FBF9F5",
  surface: "#FFFFFF",
  surfaceLow: "#F5F3EF",
  surfaceContainer: "#EFEEEA",
  text: "#1B1C1A",
  muted: "#4B463C",
  outline: "#CDC6B8",
  outlineStrong: "#7C776A",
  primary: "#695D39",
  primaryContainer: "#83764F",
  primarySoft: "#F3E1B3",
  secondary: "#83764F",
  secondaryContainer: "#F3E1B3",
  danger: "#BA1A1A",
};

function extractKodeDept(value: string): string {
  return value.split("-")[0]?.trim() || value.trim();
}

function normalizeBarcode(value: string): string {
  return value.trim().toUpperCase().slice(0, 8);
}

function jenisValue(item: NagagoldJenis): string {
  return `${item.kode_dept}${item.nama_dept ? ` - ${item.nama_dept}` : ""}`;
}

export default function Purchases() {
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();
  const nagagoldConfig = useNagagoldConfig();
  const [stores, setStores] = useState<NagagoldStore[]>([]);
  const [selectedStore, setSelectedStore] = useState<NagagoldStore | null>(null);
  const [branchSelectorOpen, setBranchSelectorOpen] = useState(false);
  const [isLoadingStores, setIsLoadingStores] = useState(false);
  const [storeError, setStoreError] = useState("");
  const [domain, setDomain] = useState("");
  const [purchaseCapabilities, setPurchaseCapabilities] = useState<NagagoldPurchaseCapabilities>(defaultPurchaseCapabilities);
  const [tokos, setTokos] = useState<NagagoldToko[]>([]);
  const [jenisList, setJenisList] = useState<NagagoldJenis[]>([]);
  const [kondisiList, setKondisiList] = useState<NagagoldKondisiBeli[]>([]);
  const [groups, setGroups] = useState<NagagoldGroup[]>([]);
  const [roundingConfig, setRoundingConfig] = useState<NagagoldPurchaseRounding>({
    value: 500,
    roundDown: false,
    disableAuthorizationAboveNota: false,
    disableAuthorizationBelowNota: false,
  });
  const [salesPeople, setSalesPeople] = useState<NagagoldSalesPerson[]>([]);
  const [rekenings, setRekenings] = useState<NagagoldRekening[]>([]);
  const [memberResults, setMemberResults] = useState<NagagoldMember[]>([]);
  const [isLoadingMaster, setIsLoadingMaster] = useState(false);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [kodeToko, setKodeToko] = useState("");
  const [kodeBarcode, setKodeBarcode] = useState("");
  const [typeKondisi, setTypeKondisi] = useState("PERSENTASE");
  const [kondisi, setKondisi] = useState("");
  const [kodeJenis, setKodeJenis] = useState("");
  const [namaBarang, setNamaBarang] = useState("");
  const [kadar, setKadar] = useState("100");
  const [kadarModal, setKadarModal] = useState("0");
  const [kadarCetak, setKadarCetak] = useState("100");
  const [beratNota, setBeratNota] = useState("");
  const [berat, setBerat] = useState("");
  const [hargaNota, setHargaNota] = useState("");
  const [hargaBeli, setHargaBeli] = useState("");
  const [potonganManual, setPotonganManual] = useState("");
  const [purchaseRaw, setPurchaseRaw] = useState<NagagoldPurchaseLookupItem | null>(null);
  const [isLookingUpItem, setIsLookingUpItem] = useState(false);
  const [items, setItems] = useState<PurchaseItem[]>([]);
  const [kodeSales, setKodeSales] = useState("");
  const [namaSales, setNamaSales] = useState("");
  const [kodeMember, setKodeMember] = useState("NONMEMBER");
  const [jenisPelanggan, setJenisPelanggan] = useState("NON MEMBER");
  const [namaCustomer, setNamaCustomer] = useState("");
  const [alamatCustomer, setAlamatCustomer] = useState("");
  const [noHp, setNoHp] = useState("");
  const [nikSimPassport, setNikSimPassport] = useState("");
  const [paymentType, setPaymentType] = useState("CASH");
  const [rekening, setRekening] = useState("");
  const [isLookingUpMember, setIsLookingUpMember] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAuthorizing, setIsAuthorizing] = useState(false);
  const [pendingAuthorization, setPendingAuthorization] = useState<PendingPurchaseAuthorization | null>(null);
  const activeStoreId = selectedStore ? branchStoreId(selectedStore) : undefined;

  const selectBranch = (store: NagagoldStore) => {
    if (selectedStore) {
      resetAll();
      setDomain("");
    }
    setSelectedStore(store);
    setBranchSelectorOpen(false);
  };

  const applyRuntimeConfig = useCallback((config: typeof nagagoldConfig.config) => {
    if (!config) return;
    setDomain(config.domain);
    setPurchaseCapabilities(config.capabilities.purchases ?? defaultPurchaseCapabilities);
    setTokos(config.masters.tokos ?? []);
    setJenisList((config.masters.jenis ?? []).filter((item) => item.status_aktif !== false));
    setKondisiList((config.masters.kondisi ?? []).filter((item) => item.status_aktif !== false));
    setRoundingConfig(config.masters.purchaseRounding);
    setGroups((config.masters.groups ?? []).filter((item) => item.status_aktif !== false));
    setSalesPeople((config.masters.sales ?? []).filter((item) => item.status_aktif !== false));
    setRekenings(config.masters.rekenings ?? []);
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (!activeStoreId) return undefined;
      let active = true;
      setIsLoadingMaster(true);
      Promise.all([
        nagagoldConfig.reloadConfig(activeStoreId),
      ])
        .then(([config]) => {
          if (!active) return;
          applyRuntimeConfig(config);
          if (!kodeSales && config?.masters.sales?.[0]?.kode_sales && (config.capabilities.purchases ?? defaultPurchaseCapabilities).requireSales) {
            setKodeSales(config.masters.sales[0].kode_sales);
            setNamaSales(config.masters.sales[0].nama_sales);
          }
          if (!rekening && config?.masters.rekenings?.[0]) setRekening(`${config.masters.rekenings[0].no_rekening} ~ ${config.masters.rekenings[0].kode_bank}`);
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
    }, [activeStoreId, applyRuntimeConfig, kodeSales, nagagoldConfig.reloadConfig, rekening])
  );

  useEffect(() => {
    if (activeStoreId) applyRuntimeConfig(nagagoldConfig.config);
  }, [activeStoreId, applyRuntimeConfig, nagagoldConfig.config?.version]);

  useEffect(() => {
    let active = true;
    setIsLoadingStores(true);
    setStoreError("");
    loadNagagoldStores()
      .then((items) => {
        if (active) setStores(items);
      })
      .catch((error) => {
        if (active) setStoreError(error instanceof Error ? error.message : "Data cabang belum bisa dimuat.");
      })
      .finally(() => {
        if (active) setIsLoadingStores(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const totals = useMemo(() => items.reduce((acc, item) => ({
    hargaNota: acc.hargaNota + item.hargaNota,
    beratNota: acc.beratNota + item.beratNota,
    hargaBeli: acc.hargaBeli + item.hargaBeli,
    berat: acc.berat + item.berat,
  }), { hargaNota: 0, beratNota: 0, hargaBeli: 0, berat: 0 }), [items]);

  const hargaRata = parseDecimal(berat) > 0 ? Math.floor(parseCurrency(hargaBeli) / parseDecimal(berat)) : 0;
  const selectedKondisi = kondisiList.find((item) => item.kondisi_barang === kondisi);
  const unsupportedPurchaseModules = purchaseCapabilities.unsupportedModules ?? [];
  const purchasePaymentTypes = purchaseCapabilities.allowTransferPayment ? paymentTypes : ["CASH"];
  const canSavePurchaseItem = (
    !unsupportedPurchaseModules.length
    && kodeJenis.trim().length > 0
    && namaBarang.trim().length > 0
    && kondisi.trim().length > 0
    && parseDecimal(berat) > 0
    && parseCurrency(hargaBeli) > 0
  );
  const calculateHargaBeli = (overrides?: {
    berat?: string;
    hargaNota?: string;
    kondisi?: string;
    typeKondisi?: string;
    potonganManual?: string;
  }) => {
    const nextBerat = parseDecimal(overrides?.berat ?? berat) || 1;
    const nextHargaNota = parseCurrency(overrides?.hargaNota ?? hargaNota);
    const nextKondisi = overrides?.kondisi ?? kondisi;
    const nextTypeKondisi = overrides?.typeKondisi ?? typeKondisi;
    const nextPotonganManual = parseCurrency(overrides?.potonganManual ?? potonganManual);
    const condition = kondisiList.find((item) => item.kondisi_barang === nextKondisi);

    if (!nextHargaNota) return 0;
    if (!condition) return roundNagagoldPurchasePrice(Math.max(0, nextHargaNota - nextPotonganManual), roundingConfig);

    const potongan = Number(condition.potongan ?? 0);
    const persentase = Number(condition.persentase ?? 0);
    const discount = nextTypeKondisi === "RP"
      ? potongan * nextBerat
      : (persentase / 100) * nextHargaNota;

    return roundNagagoldPurchasePrice(Math.max(0, nextHargaNota - discount - nextPotonganManual), roundingConfig);
  };

  const recalculateHargaBeli = (overrides?: {
    berat?: string;
    hargaNota?: string;
    kondisi?: string;
    typeKondisi?: string;
    potonganManual?: string;
  }) => {
    const nextHargaBeli = calculateHargaBeli(overrides);
    setHargaBeli(nextHargaBeli ? String(nextHargaBeli) : "");
  };

  useEffect(() => {
    if (hargaNota && kondisi) {
      recalculateHargaBeli();
    }
  }, [roundingConfig.value, roundingConfig.roundDown]);

  const lookupItem = async () => {
    const barcode = normalizeBarcode(kodeBarcode);
    if (!barcode) {
      Alert.alert("Barcode kosong", "Masukkan atau scan kode barcode terlebih dahulu.");
      return;
    }
    if (items.some((item) => normalizeBarcode(item.kodeBarcode) === barcode)) {
      Alert.alert("Kode Barcode Sudah Ada Dalam Table", "Barang ini sudah masuk di daftar pembelian.");
      return;
    }

    setIsLookingUpItem(true);
    try {
      const item = await lookupNagagoldPurchaseItem(barcode, kodeToko, { storeId: activeStoreId });
      applyPurchaseItem(item);
      await Haptics.selectionAsync();
    } catch (error) {
      setPurchaseRaw(null);
      Alert.alert("Barang tidak ditemukan", error instanceof Error ? error.message : "Data jual barang belum ditemukan di NAGAGOLD.");
    } finally {
      setIsLookingUpItem(false);
    }
  };

  const applyPurchaseItem = (item: NagagoldPurchaseLookupItem) => {
    const nextKodeJenis = String(item.kode_dept ?? "");
    const jenis = jenisList.find((next) => next.kode_dept === nextKodeJenis);
    const group = groups.find((next) => next.kode_group === item.kode_group);
    const nextBerat = Number(item.berat ?? item.berat_nota ?? 0);
    const nextHargaNota = Number(item.harga_jual ?? 0)
      + (purchaseCapabilities.useHargaBeliWithoutAtributOngkos ? 0 : Number(item.harga_atribut ?? 0))
      + (purchaseCapabilities.useHargaNotaWithOngkos ? Number(item.ongkos ?? 0) : 0)
      - Number(item.diskon_penjualan ?? 0);

    setPurchaseRaw(item);
    setKodeBarcode(String(item.kode_barcode ?? kodeBarcode));
    setKodeJenis(jenis ? jenisValue(jenis) : nextKodeJenis);
    setNamaBarang(String(item.nama_barang ?? jenis?.nama_dept ?? ""));
    setKadar(String(item.kadar ?? group?.kadar ?? 0));
    setKadarModal(String(item.kadar_modal ?? 100));
    setKadarCetak(String(item.kadar_cetak ?? "-"));
    setBeratNota(String(nextBerat || ""));
    setBerat(String(nextBerat || ""));
    setHargaNota(String(nextHargaNota || Number(item.harga_total ?? 0) || ""));
    setHargaBeli(String(calculateHargaBeli({
      berat: String(nextBerat || ""),
      hargaNota: String(nextHargaNota || Number(item.harga_total ?? 0) || ""),
    }) || ""));

    if (item.kode_sales) {
      const sales = salesPeople.find((next) => next.kode_sales === item.kode_sales);
      setKodeSales(String(item.kode_sales));
      setNamaSales(sales?.nama_sales ?? String(item.kode_sales));
    }
    setKodeMember(String(item.kode_member ?? "NONMEMBER"));
    setJenisPelanggan(String(item.kode_member ?? "NONMEMBER") === "NONMEMBER" ? "NON MEMBER" : "MEMBER");
    setNamaCustomer(String(item.nama_customer ?? ""));
    setAlamatCustomer(String(item.alamat_customer ?? "-"));
    setNoHp(String(item.no_hp ?? "-"));
  };

  const lookupMember = async () => {
    const code = kodeMember.trim();
    if (!code || code === "NONMEMBER") {
      Alert.alert("Kode member kosong", "Masukkan kode member terlebih dahulu.");
      return;
    }

    setIsLookingUpMember(true);
    try {
      const member = await lookupNagagoldMemberByCode(code, { storeId: activeStoreId });
      if (!member) {
        Alert.alert("Member tidak ditemukan", "Kode member tidak ada di database NAGAGOLD.");
        return;
      }
      applyMember(member);
    } catch (error) {
      Alert.alert("Gagal lookup member", error instanceof Error ? error.message : "Customer belum bisa diambil dari NAGAGOLD.");
    } finally {
      setIsLookingUpMember(false);
    }
  };

  const searchMembers = async () => {
    const phoneQuery = noHp.trim();
    const nameQuery = namaCustomer.trim();
    const query = phoneQuery && phoneQuery !== "-" ? phoneQuery : nameQuery;
    if (!query) {
      Alert.alert("Kata kunci kosong", "Isi nama customer atau no HP untuk filter customer.");
      return;
    }

    setIsLookingUpMember(true);
    try {
      const results = await searchNagagoldMembers(phoneQuery && phoneQuery !== "-" ? "hp" : "nama", query, { storeId: activeStoreId });
      setMemberResults(results);
      if (!results.length) Alert.alert("Customer tidak ditemukan", "Tidak ada member yang cocok.");
    } catch (error) {
      Alert.alert("Gagal filter customer", error instanceof Error ? error.message : "Data customer belum bisa diambil.");
    } finally {
      setIsLookingUpMember(false);
    }
  };

  const applyMember = (member: NagagoldMember) => {
    setJenisPelanggan("MEMBER");
    setKodeMember(member.kode_member || member.kode_customer || kodeMember);
    setNamaCustomer(member.nama_customer || "");
    setNoHp(member.no_hp || "");
    setAlamatCustomer(member.alamat_customer || "-");
    setMemberResults([]);
  };

  const addItem = async (authorizationId?: string, options: { goToStep2?: boolean } = {}) => {
    if (unsupportedPurchaseModules.length) {
      Alert.alert(
        "Konfigurasi belum didukung",
        "Konfigurasi pembelian di toko ini belum aman diproses dari APK. Gunakan web NAGAGOLD untuk transaksi ini.",
      );
      return;
    }
    const nextBerat = parseDecimal(berat);
    const nextBeratNota = parseDecimal(beratNota) || nextBerat;
    const nextHargaBeli = parseCurrency(hargaBeli);
    const nextHargaNota = parseCurrency(hargaNota) || nextHargaBeli;
    const nextKodeBarcode = normalizeBarcode(kodeBarcode) || "-";
    if (!kodeJenis.trim() || !namaBarang.trim() || !kondisi.trim() || nextBerat <= 0 || nextHargaBeli <= 0) {
      Alert.alert("Data barang belum lengkap", "Kode jenis, kondisi, nama barang, berat, dan harga beli wajib diisi.");
      return;
    }
    if (nextKodeBarcode !== "-" && items.some((item) => normalizeBarcode(item.kodeBarcode) === nextKodeBarcode)) {
      Alert.alert("Kode Barcode Sudah Ada Dalam Table", "Barang ini sudah masuk di daftar pembelian.");
      return;
    }
    const authReasons = getPurchaseAuthorizationReasons(nextBeratNota, nextBerat, nextHargaNota, nextHargaBeli, roundingConfig, purchaseCapabilities);
    if (authReasons.length && !authorizationId) {
      setPendingAuthorization({
        reasons: authReasons,
        goToStep2: options.goToStep2,
        payload: {
          beratNota: nextBeratNota,
          berat: nextBerat,
          hargaNota: nextHargaNota,
          hargaBeli: nextHargaBeli,
        },
      });
      return;
    }
    setItems([...items, {
      id: `BUY-${Date.now()}`,
      kodeBarcode: nextKodeBarcode,
      noFakturJual: String(purchaseRaw?.no_faktur_jual ?? "-"),
      kodeJenis: String(purchaseRaw?.kode_dept ?? (extractKodeDept(kodeJenis) || "")),
      namaBarang: namaBarang.trim(),
      beratNota: nextBeratNota,
      berat: nextBerat,
      hargaNota: nextHargaNota,
      hargaBeli: nextHargaBeli,
      kondisi: kondisi.trim() || "MULUS",
      typeKondisi,
      kadar: parseDecimal(kadar),
      kadarModal: parseDecimal(kadarModal) || 100,
      kadarCetak: kadarCetak.trim() || "-",
      statusBarang: String(purchaseRaw?.status_barang ?? "BARU"),
      beratAtribut: Number(purchaseRaw?.berat_atribut ?? 0),
      hargaAtribut: Number(purchaseRaw?.harga_atribut ?? 0),
      potonganManual: parseCurrency(potonganManual),
      potonganKondisiBeli: typeKondisi === "RP"
        ? Number(selectedKondisi?.potongan ?? 0)
        : Number(selectedKondisi?.persentase ?? 0),
      kodeHargaBeli: "-",
      authorizationIds: authorizationId ? [authorizationId] : undefined,
      raw: purchaseRaw ?? undefined,
    }]);
    resetItemForm();
    if (options.goToStep2) {
      setStep(2);
    }
    await Haptics.selectionAsync();
  };

  const submitItemAuthorization = async (data: { username: string; password: string; keterangan: string }) => {
    if (!pendingAuthorization) return;
    setIsAuthorizing(true);
    try {
      const result = await authorizeNagagoldTransaction({
        username: data.username,
        password: data.password,
        kategori: "PEMBELIAN",
        description: "PEMBELIAN DI ATAS NOTA",
        keterangan: data.keterangan,
        kodeBarcode: kodeBarcode.trim(),
        berat: pendingAuthorization.payload.berat,
        beratAwal: pendingAuthorization.payload.beratNota,
        kodeIntern: getRawText(purchaseRaw, "kode_intern", getRawText(purchaseRaw, "no_generate", "-")),
        storeId: activeStoreId,
      });
      setPendingAuthorization(null);
      await addItem(result.authorizationId, { goToStep2: pendingAuthorization.goToStep2 });
    } catch (error) {
      Alert.alert("Otorisasi gagal", error instanceof Error ? error.message : "Username/password otorisasi belum valid.");
    } finally {
      setIsAuthorizing(false);
    }
  };

  const submit = () => {
    const firstItem = items[0];
    if (!domain) {
      Alert.alert("Cabang belum aktif", "Pilih cabang pembelian terlebih dahulu.");
      return;
    }
    if (!firstItem) {
      Alert.alert("Barang belum ada", "Tambahkan minimal satu barang terlebih dahulu.");
      return;
    }
    if (unsupportedPurchaseModules.length) {
      Alert.alert("Konfigurasi belum didukung", "Tidak bisa simpan dari APK karena konfigurasi pembelian toko ini belum didukung.");
      return;
    }
    if (purchaseCapabilities.requireSales && !kodeSales.trim()) {
      Alert.alert("Sales belum dipilih", "Pilih kode sales terlebih dahulu.");
      return;
    }
    if (paymentType === "TRANSFER" && purchaseCapabilities.requireTransferAuthorization) {
      Alert.alert("Perlu otorisasi transfer", "Domain ini mengaktifkan OTORISASI_PEMBAYARAN_TRANSFER. Flow otorisasi pembayaran transfer pembelian belum didukung di APK.");
      return;
    }
    Alert.alert("Selesaikan pembelian?", `Transaksi ${namaCustomer} senilai ${formatRupiah(totals.hargaBeli)} akan disimpan.`, [
      { text: "Batal", style: "cancel" },
      { text: "Selesai", onPress: submitConfirmed },
    ]);
  };

  const submitConfirmed = async () => {
    const firstItem = items[0];
    if (!firstItem) return;
    setIsSubmitting(true);
    try {
      await submitNagagoldPurchase({
        kodeSales: kodeSales.trim(),
        namaSales: namaSales.trim(),
        kodeToko: kodeToko.trim(),
        kodeMember: kodeMember.trim(),
        namaCustomer: namaCustomer.trim() || "REGULER",
        alamatCustomer: alamatCustomer.trim() || "-",
        noHp: noHp.trim() || "-",
        nikSimPassport: nikSimPassport.trim(),
        kodeBarcode: firstItem.kodeBarcode,
        noFakturJual: firstItem.noFakturJual,
        namaBarang: firstItem.namaBarang,
        berat: firstItem.berat,
        harga: firstItem.hargaBeli,
        kondisi: firstItem.kondisi,
        items: items.map((item) => ({
          kodeBarcode: item.kodeBarcode,
          noFakturJual: item.noFakturJual,
          kodeJenis: item.kodeJenis,
          statusBarang: item.statusBarang,
          namaBarang: item.namaBarang,
          beratNota: item.beratNota,
          berat: item.berat,
          hargaNota: item.hargaNota,
          harga: item.hargaBeli,
          kondisi: item.kondisi,
          typeKondisi: item.typeKondisi,
          kadar: item.kadar,
          kadarModal: item.kadarModal,
          kadarCetak: item.kadarCetak,
          potonganManual: item.potonganManual,
          potonganKondisiBeli: item.potonganKondisiBeli,
          beratAtribut: item.beratAtribut,
          hargaAtribut: item.hargaAtribut,
          kodeHargaBeli: item.kodeHargaBeli,
          hargaRata: Math.floor(item.hargaBeli / item.berat),
          authorizationIds: item.authorizationIds,
          raw: item.raw,
        })),
        jumlahBayar: totals.hargaBeli,
        keterangan: paymentType,
        typePembayaran: paymentType,
        rekening,
        storeId: activeStoreId,
      });
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert("Pembelian tersimpan", "Transaksi berhasil disimpan.");
      resetAll();
    } catch (error) {
      Alert.alert("Gagal menyimpan", error instanceof Error ? error.message : "Transaksi belum berhasil disimpan.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetItemForm = () => {
    setKodeBarcode("");
    setTypeKondisi("PERSENTASE");
    setKondisi("");
    setKodeJenis("");
    setNamaBarang("");
    setKadar("");
    setKadarModal("");
    setKadarCetak("");
    setBeratNota("");
    setBerat("");
    setHargaNota("");
    setHargaBeli("");
    setPotonganManual("");
    setPurchaseRaw(null);
  };

  const resetAll = () => {
    resetItemForm();
    setItems([]);
    setStep(1);
    setKodeMember("NONMEMBER");
    setJenisPelanggan("NON MEMBER");
    setNamaCustomer("");
    setAlamatCustomer("");
    setNoHp("");
    setNikSimPassport("");
  };

  if (!selectedStore) {
    return (
      <View style={[styles.keyboardScreen, { backgroundColor: theme.colors.background }]}>
        <SharedAppHeader title="Transaksi Pembelian" topInset={insets.top} />
        <ScrollView
          contentContainerStyle={[
            styles.branchContainer,
            {
              backgroundColor: theme.colors.background,
              paddingBottom: 64 + Math.max(insets.bottom, 18) + 32,
            },
          ]}
        >
          <Pressable
            style={[styles.branchIntro, { backgroundColor: theme.colors.surfaceContainerLowest, borderColor: theme.colors.outlineVariant }, theme.elevation.level1]}
            onPress={() => setBranchSelectorOpen(true)}
          >
            <Ionicons name="business-outline" size={24} color={theme.colors.primary} />
            <View style={styles.branchIntroText}>
              <Text style={[styles.branchTitle, { color: theme.colors.text }]}>Pilih Cabang Pembelian</Text>
              <Text style={[styles.branchSubtitle, { color: theme.colors.muted }]}>Cabang ini menjadi tempat transaksi pembelian dicatat dan stok masuk.</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={theme.colors.primary} />
          </Pressable>
          {isLoadingStores ? (
            <Text style={[styles.branchMessage, { color: theme.colors.muted }]}>Memuat cabang...</Text>
          ) : null}
          {storeError ? (
            <Text style={[styles.branchMessage, { color: theme.colors.danger }]}>{storeError}</Text>
          ) : null}
          <Text style={[styles.branchHint, { color: theme.colors.muted }]}>Ketuk card untuk mencari dan memilih cabang.</Text>
        </ScrollView>
        <BranchSelectorModal
          visible={branchSelectorOpen}
          title="Pilih Cabang Pembelian"
          stores={stores}
          selectedStore={selectedStore}
          onClose={() => setBranchSelectorOpen(false)}
          onSelect={selectBranch}
        />
      </View>
    );
  }

  return (
    <>
    <View style={[styles.keyboardScreen, { backgroundColor: theme.colors.background }]}>
    <SharedAppHeader title="Transaksi Pembelian" topInset={insets.top} />
    <ScrollView
      automaticallyAdjustKeyboardInsets
      contentContainerStyle={[
        styles.container,
        {
          backgroundColor: theme.colors.background,
          paddingBottom: 64 + Math.max(insets.bottom, 18) + 32,
        },
      ]}
      keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
      keyboardShouldPersistTaps="handled"
    >
      <View style={[styles.activeStoreBanner, { backgroundColor: theme.colors.surfaceContainerLowest, borderColor: theme.colors.primary }]}>
        <Ionicons name="business-outline" size={16} color={theme.colors.primary} />
        <View style={styles.activeStoreInfo}>
          <Text style={[styles.activeStoreLabel, { color: theme.colors.muted }]}>Cabang Aktif</Text>
          <Text style={[styles.activeStoreText, { color: theme.colors.text }]}>{selectedStore.name}</Text>
          <Text style={[styles.activeStoreDomain, { color: theme.colors.muted }]} numberOfLines={1}>{branchStoreDomain(selectedStore)}</Text>
        </View>
        <Pressable
          style={[styles.activeStoreChange, { backgroundColor: theme.colors.surfaceContainer }]}
          onPress={() => setBranchSelectorOpen(true)}
        >
          <Text style={[styles.activeStoreChangeText, { color: theme.colors.primary }]}>Ganti Cabang</Text>
        </Pressable>
      </View>
      <Stepper step={step} />
      {step === 1 ? (
        <View style={styles.formStack}>
          {purchaseCapabilities.showStoreSelector ? (
            <OptionGroup
              label="Pilih Kode Toko"
              value={kodeToko}
              options={tokos.map((item) => ({ value: item.kode_toko, label: `${item.kode_toko}${item.nama_toko ? ` - ${item.nama_toko}` : ""}` }))}
              onChange={setKodeToko}
              searchable
              searchPlaceholder="Cari kode atau nama toko"
              searchEmptyText="Data toko tidak ditemukan"
              fallback={<Input label="" value={kodeToko} onChangeText={setKodeToko} placeholder="Pilih kode toko" uppercase />}
            />
          ) : null}
          <Input label="Kode Barcode" value={kodeBarcode} onChangeText={setKodeBarcode} placeholder="Scan atau input barcode" icon="barcode-outline" uppercase />
          <Pressable style={[styles.outlineButton, { backgroundColor: theme.colors.surfaceContainer, borderColor: theme.colors.primary }]} onPress={lookupItem}>
            <Ionicons name="barcode-outline" size={17} color={theme.colors.primary} />
            <Text style={[styles.outlineButtonText, { color: theme.colors.primary }]}>{isLookingUpItem ? "Mengambil Barang..." : "Ambil Data Barang"}</Text>
          </Pressable>
          <View style={styles.twoColumn}>
            <OptionGroup
              label="Type Kondisi"
              value={typeKondisi}
              options={[{ value: "PERSENTASE", label: "PERSENTASE" }, { value: "RP", label: "RP" }]}
              onChange={(value) => {
                setTypeKondisi(value);
                recalculateHargaBeli({ typeKondisi: value });
              }}
            />
            <OptionGroup
              label="Kondisi"
              value={kondisi}
              options={kondisiList.map((item) => ({ value: item.kondisi_barang, label: item.kondisi_barang }))}
              onChange={(value) => {
                setKondisi(value);
                recalculateHargaBeli({ kondisi: value });
              }}
              searchable
              searchPlaceholder="Cari kondisi"
              searchEmptyText="Data kondisi tidak ditemukan"
              fallback={<Input label="" value={kondisi} onChangeText={(value) => {
                setKondisi(value);
                recalculateHargaBeli({ kondisi: value });
              }} placeholder="MULUS" uppercase />}
            />
          </View>
          <OptionGroup
            label="Kode Jenis"
            value={kodeJenis}
            options={jenisList.map((item) => ({ value: jenisValue(item), label: jenisValue(item) }))}
            onChange={(value) => {
              setKodeJenis(value);
              const selectedJenis = jenisList.find((item) => jenisValue(item) === value);
              const group = groups.find((item) => item.kode_group === selectedJenis?.kode_group);
              if (selectedJenis && !namaBarang.trim()) setNamaBarang(selectedJenis.nama_dept);
              if (group) {
                setKadar(String(group.kadar ?? kadar));
                setKadarModal(String((group as Record<string, unknown>).kadar_modal ?? kadarModal));
              }
            }}
            searchable
            searchPlaceholder="Cari kode jenis"
            searchEmptyText="Data kode jenis tidak ditemukan"
            fallback={<Input label="" value={kodeJenis} onChangeText={setKodeJenis} placeholder="Pilih kode jenis" uppercase />}
          />
          <Input label="Nama Barang" value={namaBarang} onChangeText={setNamaBarang} placeholder="Nama barang" uppercase />
          <View style={styles.twoColumn}>
            <Input label="Kadar" value={kadar} onChangeText={setKadar} placeholder="100" keyboardType="decimal-pad" />
            <Input label="Kadar Modal" value={kadarModal} onChangeText={setKadarModal} placeholder="0" keyboardType="decimal-pad" />
          </View>
          <View style={styles.threeColumn}>
            <Input label="Kadar Cetak" value={kadarCetak} onChangeText={setKadarCetak} placeholder="100" keyboardType="decimal-pad" />
            <Input label="Berat Nota" value={beratNota} onChangeText={setBeratNota} placeholder="0" keyboardType="decimal-pad" />
            <Input label="Berat" value={berat} editable={!purchaseCapabilities.disableBeratBeli} onChangeText={(value) => {
              setBerat(value);
              recalculateHargaBeli({ berat: value });
            }} placeholder="0" keyboardType="decimal-pad" />
          </View>
          <CurrencyInput label="Harga Nota" value={hargaNota} onChangeText={(value) => {
            setHargaNota(value);
            recalculateHargaBeli({ hargaNota: value });
          }} locked={Boolean(purchaseRaw)} />
          {purchaseCapabilities.showManualDiscount ? (
            <CurrencyInput
              label="Potongan Manual"
              value={potonganManual}
              onChangeText={(value) => {
                setPotonganManual(value);
                recalculateHargaBeli({ potonganManual: value });
              }}
            />
          ) : null}
          <CurrencyInput label="Harga Beli" value={hargaBeli} onChangeText={setHargaBeli} locked={purchaseCapabilities.lockHargaBeli || purchaseCapabilities.readOnlyHargaBeli} />
          <View style={styles.twoColumn}>
            <ReadOnly label="Harga Rata" value={formatRupiah(hargaRata)} />
            <ReadOnly label="Potongan Kondisi" value={formatPurchaseConditionDiscount(selectedKondisi, typeKondisi, parseDecimal(berat), parseCurrency(hargaNota))} />
          </View>
          <View style={styles.purchaseActionStack}>
            <Pressable
              accessibilityState={{ disabled: !canSavePurchaseItem }}
              disabled={!canSavePurchaseItem}
              style={[
                styles.saveItemButton,
                {
                  backgroundColor: canSavePurchaseItem ? theme.colors.primaryFixedDim : theme.colors.surfaceContainer,
                  borderColor: canSavePurchaseItem ? "transparent" : theme.colors.outlineVariant,
                },
                !canSavePurchaseItem && styles.saveItemButtonDisabled,
              ]}
              onPress={() => addItem(undefined, { goToStep2: true })}
            >
              <Ionicons
                name="save"
                size={18}
                color={canSavePurchaseItem ? (theme.isDark ? theme.colors.primaryText : theme.colors.primary) : theme.colors.subtleText}
              />
              <Text
                style={[
                  styles.saveItemButtonText,
                  { color: canSavePurchaseItem ? (theme.isDark ? theme.colors.primaryText : theme.colors.primary) : theme.colors.subtleText },
                ]}
              >
                Simpan Barang
              </Text>
            </Pressable>
            <View style={styles.purchaseActionRow}>
              <Pressable style={[styles.resetButton, { backgroundColor: "transparent", borderColor: theme.colors.danger }]} onPress={resetItemForm}>
                <Ionicons name="refresh" size={17} color={theme.colors.danger} />
                <Text style={[styles.resetButtonText, { color: theme.colors.danger }]}>Reset</Text>
              </Pressable>
              <Pressable style={[styles.nextButton, { backgroundColor: theme.colors.buttonPrimary }]} onPress={() => setStep(2)}>
                <Text style={[styles.nextButtonText, { color: theme.colors.onPrimary }]}>Next</Text>
                <Ionicons name="chevron-forward" size={17} color={theme.colors.onPrimary} />
              </Pressable>
            </View>
          </View>
        </View>
      ) : null}
      {step === 2 ? (
        <View style={styles.formStack}>
          <View style={[styles.searchBox, { backgroundColor: theme.colors.inputBackground, borderColor: theme.colors.inputBorder }]}>
            <TextInput placeholder="Cari data..." placeholderTextColor={theme.isDark ? theme.colors.muted : theme.colors.subtleText} style={[styles.searchInput, { color: theme.colors.text }]} />
            <Ionicons name="search-outline" size={20} color={theme.colors.muted} />
          </View>
          {items.length ? items.map((item) => (
            <View key={item.id} style={[styles.itemCard, { backgroundColor: theme.colors.cardBackground, borderColor: theme.colors.cardBorder }, theme.elevation.level1]}>
              <View style={styles.itemHead}>
                <View>
                  <Text style={[styles.itemName, { color: theme.colors.text }]}>{item.namaBarang}</Text>
                  <Text style={[styles.itemMeta, { color: theme.colors.muted }]}>Kode: {item.kodeBarcode}  ·  Jenis {item.kodeJenis}</Text>
                </View>
                <Pressable onPress={() => setItems(items.filter((next) => next.id !== item.id))}>
                  <Ionicons name="trash-outline" size={20} color={theme.colors.danger} />
                </Pressable>
              </View>
              <View style={[styles.metricGrid, { borderColor: theme.colors.outlineVariant }]}>
                <Metric label="Harga Nota" value={formatNumber(item.hargaNota)} />
                <Metric label="Berat Nota" value={String(item.beratNota)} />
                <Metric label="Harga Rata" value={formatNumber(Math.floor(item.hargaBeli / item.berat))} />
                <Metric label="Berat" value={String(item.berat)} />
                {item.potonganManual ? <Metric label="Potongan Manual" value={formatNumber(item.potonganManual)} /> : null}
                <Metric label="Harga Beli" value={formatNumber(item.hargaBeli)} />
                <Metric label="Kondisi" value={item.kondisi} badge />
              </View>
            </View>
          )) : (
            <EmptyState
              icon="cube-outline"
              title="Belum ada barang"
              description="Kembali ke Input Barang untuk menambahkan barang."
              style={[styles.emptyCard, { backgroundColor: theme.colors.surfaceContainerLow, borderColor: theme.colors.outlineVariant }]}
            />
          )}
          <View style={[styles.totalCard, { backgroundColor: theme.colors.cardBackground, borderColor: theme.colors.cardBorder }, theme.elevation.level1]}>
            <View style={[styles.totalIcon, { backgroundColor: theme.colors.primaryContainer }]}>
              <Ionicons name="receipt-outline" size={24} color={theme.colors.onPrimaryContainer} />
            </View>
            <View style={styles.totalRows}>
              <TotalLine label="Total Harga Nota" value={formatNumber(totals.hargaNota)} />
              <TotalLine label="Total Berat Nota" value={String(totals.beratNota)} />
              <TotalLine label="Total Harga Beli" value={formatNumber(totals.hargaBeli)} />
              <TotalLine label="Total Berat" value={String(totals.berat)} />
            </View>
          </View>
          <View style={styles.footerRow}>
            <Pressable style={[styles.secondaryButton, { backgroundColor: theme.colors.surfaceContainer }]} onPress={() => setStep(1)}>
              <Ionicons name="arrow-back" size={17} color={theme.colors.text} />
              <Text style={[styles.secondaryButtonText, { color: theme.colors.text }]}>Kembali</Text>
            </Pressable>
            <Pressable style={[styles.primaryButtonSmall, { backgroundColor: theme.colors.buttonPrimary }]} onPress={() => setStep(3)}>
              <Text style={[styles.primaryButtonText, { color: theme.colors.onPrimary }]}>Next</Text>
              <Ionicons name="chevron-forward" size={17} color={theme.colors.onPrimary} />
            </Pressable>
          </View>
        </View>
      ) : null}
      {step === 3 ? (
        <View style={styles.formStack}>
          {purchaseCapabilities.requireSales ? (
            <>
              <OptionGroup
                label="Pilih Kode Sales"
                value={kodeSales}
                options={salesPeople.map((item) => ({ value: item.kode_sales, label: `${item.kode_sales} - ${item.nama_sales}` }))}
                onChange={(value) => {
                  setKodeSales(value);
                  setNamaSales(salesPeople.find((item) => item.kode_sales === value)?.nama_sales ?? value);
                }}
                fallback={<Input label="" value={kodeSales} onChangeText={setKodeSales} placeholder="Kode sales" uppercase />}
              />
              <Input label="Nama Sales" value={namaSales} onChangeText={setNamaSales} placeholder="Opsional" uppercase />
            </>
          ) : null}
          <OptionGroup
            label="Pilih Pelanggan"
            value={jenisPelanggan}
            options={[{ value: "NON MEMBER", label: "NON MEMBER" }, { value: "MEMBER", label: "MEMBER" }]}
            onChange={(value) => {
              setJenisPelanggan(value);
              if (value === "NON MEMBER") setKodeMember("NONMEMBER");
            }}
          />
          <Input label="Kode Customer" value={kodeMember} onChangeText={setKodeMember} placeholder="NONMEMBER / kode member" uppercase />
          <Pressable style={[styles.outlineButton, { backgroundColor: theme.colors.surfaceContainerLowest, borderColor: theme.colors.primary }]} onPress={lookupMember}>
            <Ionicons name="search-outline" size={17} color={theme.colors.primary} />
            <Text style={[styles.outlineButtonText, { color: theme.colors.primary }]}>{isLookingUpMember ? "Mencari Member..." : "Ambil Data Member"}</Text>
          </Pressable>
          <Input label="Nama Customer" value={namaCustomer} onChangeText={setNamaCustomer} placeholder="Nama customer" uppercase />
          <Input label="No HP" value={noHp} onChangeText={setNoHp} placeholder="Nomor HP" keyboardType="phone-pad" />
          <Input label="Alamat Customer" value={alamatCustomer} onChangeText={setAlamatCustomer} placeholder="Alamat customer" multiline uppercase />
          <Input label="NIK / SIM / Passport" value={nikSimPassport} onChangeText={setNikSimPassport} placeholder="Identitas customer" uppercase />
          <OptionGroup
            label="Type Pembayaran"
            value={paymentType}
            options={purchasePaymentTypes.map((type) => ({ value: type, label: type }))}
            onChange={(value) => {
              setPaymentType(value);
              if (value === "CASH") setRekening("");
            }}
          />
          {paymentType !== "CASH" ? (
            <OptionGroup
              label="No Rekening"
              value={rekening}
              options={rekenings.map((item) => ({ value: `${item.no_rekening} ~ ${item.kode_bank}`, label: `${item.no_rekening} - ${item.kode_bank}` }))}
              onChange={setRekening}
              fallback={<Input label="" value={rekening} onChangeText={setRekening} placeholder="No rekening" />}
            />
          ) : null}
          <Pressable style={[styles.outlineButton, { backgroundColor: theme.colors.surfaceContainerLowest, borderColor: theme.colors.primary }]} onPress={searchMembers}>
            <Ionicons name="filter" size={17} color={theme.colors.primary} />
            <Text style={[styles.outlineButtonText, { color: theme.colors.primary }]}>{isLookingUpMember ? "Memfilter Customer..." : "Filter Data Customer"}</Text>
          </Pressable>
          {memberResults.length ? (
            <View style={[styles.resultList, { backgroundColor: theme.colors.cardBackground, borderColor: theme.colors.cardBorder }, theme.elevation.level1]}>
              {memberResults.slice(0, 5).map((member, index) => (
                <Pressable key={`${member.kode_member ?? member.kode_customer ?? index}`} style={[styles.resultRow, { borderBottomColor: theme.colors.divider }]} onPress={() => applyMember(member)}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.resultTitle, { color: theme.colors.text }]}>{member.nama_customer || "-"}</Text>
                    <Text style={[styles.resultSubtitle, { color: theme.colors.muted }]}>{member.kode_member || member.kode_customer || "-"} • {member.no_hp || "-"}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={17} color={theme.colors.muted} />
                </Pressable>
              ))}
            </View>
          ) : null}
          <View style={styles.footerRow}>
            <Pressable style={[styles.secondaryButton, { backgroundColor: theme.colors.surfaceContainer }]} onPress={() => setStep(2)}>
              <Ionicons name="arrow-back" size={17} color={theme.colors.text} />
              <Text style={[styles.secondaryButtonText, { color: theme.colors.text }]}>Kembali</Text>
            </Pressable>
            <Pressable style={[styles.finishButton, { backgroundColor: theme.colors.buttonPrimary }, isSubmitting && styles.disabledButton]} disabled={isSubmitting} onPress={submit}>
              <Ionicons name="bag-check-outline" size={18} color={theme.colors.onPrimary} />
              <Text style={[styles.primaryButtonText, { color: theme.colors.onPrimary }]}>{isSubmitting ? "Mengirim..." : "Selesai Pembelian"}</Text>
            </Pressable>
          </View>
        </View>
      ) : null}
    </ScrollView>
    </View>
    <BranchSelectorModal
      visible={branchSelectorOpen}
      title="Ganti Cabang Pembelian"
      stores={stores}
      selectedStore={selectedStore}
      onClose={() => setBranchSelectorOpen(false)}
      onSelect={selectBranch}
    />
    <AuthorizationModal
      visible={Boolean(pendingAuthorization)}
      title="Otorisasi Pembelian"
      reasons={pendingAuthorization?.reasons ?? []}
      isSubmitting={isAuthorizing}
      onClose={() => setPendingAuthorization(null)}
      onSubmit={submitItemAuthorization}
    />
    </>
  );
}

function branchStoreKey(store: NagagoldStore, index: number): string {
  return `${branchStoreId(store) || store.name || store.nagagoldDomain || store.domain || store.baseUrl || store.apiUrl || "store"}-${index}`;
}

function branchStoreId(store: NagagoldStore): string {
  return String(store.id || store._id || "");
}

function branchStoreDomain(store: NagagoldStore): string {
  return String(store.nagagoldDomain || store.domain || store.baseUrl || store.apiUrl || "-");
}

function branchStoreCode(store: NagagoldStore): string {
  const raw = store as NagagoldStore & { code?: string; kode_cabang?: string };
  return String(raw.firebaseCode || raw.code || raw.kode_cabang || "");
}

function branchSearchText(store: NagagoldStore): string {
  return [store.name, branchStoreDomain(store), branchStoreCode(store), branchStoreId(store)].join(" ").toLowerCase();
}

function BranchSelectorModal({
  visible,
  title,
  stores,
  selectedStore,
  onClose,
  onSelect,
}: {
  visible: boolean;
  title: string;
  stores: NagagoldStore[];
  selectedStore: NagagoldStore | null;
  onClose: () => void;
  onSelect: (store: NagagoldStore) => void;
}) {
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState("");
  const selectedId = selectedStore ? branchStoreId(selectedStore) : "";
  const filteredStores = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    if (!keyword) return stores;
    return stores.filter((store) => branchSearchText(store).includes(keyword));
  }, [query, stores]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={[styles.branchSheetKeyboard, { backgroundColor: theme.colors.scrim }]}
      >
      <View style={styles.branchSheetBackdrop}>
        <View style={[styles.branchSheet, { backgroundColor: theme.colors.cardBackground, paddingBottom: insets.bottom + 14 }]}>
          <View style={styles.branchSheetHeader}>
            <Text style={[styles.branchTitle, { color: theme.colors.text }]}>{title}</Text>
            <Pressable accessibilityRole="button" onPress={onClose}>
              <Ionicons name="close" size={24} color={theme.colors.text} />
            </Pressable>
          </View>
          <View style={[styles.branchSearchBox, { backgroundColor: theme.colors.inputBackground, borderColor: theme.colors.inputBorder }]}>
            <Ionicons name="search-outline" size={18} color={theme.colors.muted} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Cari nama, domain, atau kode cabang"
              placeholderTextColor={theme.colors.muted}
              style={[styles.branchSearchInput, { color: theme.colors.text }]}
              autoCapitalize="none"
            />
            {query ? (
              <Pressable onPress={() => setQuery("")}>
                <Ionicons name="close-circle" size={19} color={theme.colors.muted} />
              </Pressable>
            ) : null}
          </View>
          <Text style={[styles.branchSheetCount, { color: theme.colors.muted }]}>{filteredStores.length.toLocaleString("id-ID")} cabang</Text>
          <FlatList
            data={filteredStores}
            keyExtractor={branchStoreKey}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.branchSheetList}
            ListEmptyComponent={<Text style={[styles.branchMessage, { color: theme.colors.muted }]}>Cabang tidak ditemukan.</Text>}
            renderItem={({ item }) => {
              const active = selectedId && branchStoreId(item) === selectedId;
              return (
                <Pressable
                  style={[styles.branchOption, { backgroundColor: active ? theme.colors.successContainer : theme.colors.cardBackground, borderColor: active ? theme.colors.primary : theme.colors.cardBorder }]}
                  onPress={() => onSelect(item)}
                >
                  <View style={styles.branchOptionText}>
                    <Text style={[styles.branchName, { color: theme.colors.text }]}>{item.name}</Text>
                    <Text style={[styles.branchMeta, { color: theme.colors.muted }]} numberOfLines={1}>{branchStoreDomain(item)}</Text>
                    {branchStoreCode(item) ? <Text style={[styles.branchMeta, { color: theme.colors.primary }]}>{branchStoreCode(item)}</Text> : null}
                  </View>
                  <Ionicons name={active ? "checkmark-circle" : "chevron-forward"} size={20} color={theme.colors.primary} />
                </Pressable>
              );
            }}
          />
        </View>
      </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function Stepper({ step }: { step: 1 | 2 | 3 }) {
  const theme = useAppTheme();

  return (
    <View style={styles.stepper}>
      {(["Input Barang", "Lihat Data Barang", "Data Customer"] as const).map((label, index) => {
        const current = index + 1;
        const active = step >= current;
        const circleBackground = active
          ? theme.colors.primaryContainer
          : theme.isDark
            ? theme.colors.surfaceContainerHigh
            : theme.colors.surfaceContainerHigh;
        const numberColor = active ? theme.colors.onPrimaryContainer : theme.colors.text;
        const labelColor = active ? theme.colors.primary : theme.colors.outlineStrong;
        return (
          <View key={label} style={styles.stepItem}>
            <View style={[
              styles.stepCircle,
              { backgroundColor: circleBackground, borderColor: active ? theme.colors.primary : theme.colors.outlineVariant },
            ]}>
              <Text style={[styles.stepNumber, { color: numberColor }]}>{step > current ? "✓" : current}</Text>
            </View>
            <Text style={[styles.stepLabel, { color: labelColor }]}>{label}</Text>
          </View>
        );
      })}
    </View>
  );
}

function OptionGroup({ label, value, options, onChange, fallback, searchable = false, searchPlaceholder, searchEmptyText }: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
  fallback?: ReactNode;
  searchable?: boolean;
  searchPlaceholder?: string;
  searchEmptyText?: string;
}) {
  const theme = useAppTheme();
  const [open, setOpen] = useState(false);
  const selected = options.find((option) => option.value === value);

  if (!options.length && fallback) {
    return <View style={styles.field}>{label ? <Text style={[styles.label, { color: theme.colors.subtleText }]}>{label}</Text> : null}{fallback}</View>;
  }

  return (
    <View style={styles.field}>
      <Text style={[styles.label, { color: theme.colors.subtleText }]}>{label}</Text>
      <Pressable style={[styles.selectField, { backgroundColor: theme.colors.inputBackground, borderColor: theme.colors.inputBorder }]} onPress={() => setOpen(true)}>
        <Text style={[styles.selectValue, { color: theme.colors.text }, !selected && styles.selectPlaceholder, !selected && { color: theme.colors.subtleText }]} numberOfLines={1}>
          {selected?.label || "Pilih data"}
        </Text>
        <Ionicons name="chevron-down" size={18} color={theme.colors.muted} />
      </Pressable>
      <OptionSheet
        visible={open}
        title={label}
        options={options}
        selectedValue={value}
        searchable={searchable}
        searchPlaceholder={searchPlaceholder}
        searchEmptyText={searchEmptyText}
        onClose={() => setOpen(false)}
        onSelect={(nextValue) => {
          onChange(nextValue);
          setOpen(false);
        }}
      />
    </View>
  );
}

function OptionSheet({ visible, title, options, selectedValue, searchable = false, searchPlaceholder, searchEmptyText, onSelect, onClose }: {
  visible: boolean;
  title: string;
  options: { value: string; label: string }[];
  selectedValue: string;
  searchable?: boolean;
  searchPlaceholder?: string;
  searchEmptyText?: string;
  onSelect: (value: string) => void;
  onClose: () => void;
}) {
  const theme = useAppTheme();
  const [searchKeyword, setSearchKeyword] = useState("");
  const trimmedKeyword = searchKeyword.trim().toLowerCase();
  const filteredOptions = useMemo(() => {
    if (!searchable || !trimmedKeyword) return options;
    return options.filter((option) => `${option.value} ${option.label}`.toLowerCase().includes(trimmedKeyword));
  }, [options, searchable, trimmedKeyword]);
  const emptyText = trimmedKeyword ? searchEmptyText : "Data tidak tersedia.";

  useEffect(() => {
    if (!visible) setSearchKeyword("");
  }, [visible]);

  const handleClose = () => {
    setSearchKeyword("");
    onClose();
  };

  const handleSelect = (value: string) => {
    setSearchKeyword("");
    onSelect(value);
  };

  return (
    <Modal animationType="slide" transparent visible={visible} onRequestClose={handleClose}>
      <View style={[styles.optionBackdrop, { backgroundColor: theme.colors.scrim }]}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          enabled={searchable}
          keyboardVerticalOffset={Platform.OS === "ios" ? 12 : 0}
          style={styles.optionKeyboardAvoider}
        >
          <View style={[styles.optionSheet, searchable && styles.optionSheetSearchable, { backgroundColor: theme.colors.surfaceContainerLowest }]}>
            <View style={[styles.sheetHandle, { backgroundColor: theme.colors.outlineVariant }]} />
            <View style={[styles.sheetHeader, { borderBottomColor: theme.colors.divider }]}>
              <Text style={[styles.sheetTitle, { color: theme.colors.text }]}>{title}</Text>
              <Pressable onPress={handleClose}>
                <Ionicons name="close" size={24} color={theme.colors.text} />
              </Pressable>
            </View>
            {searchable ? (
              <View style={[styles.optionSearchWrap, { borderBottomColor: theme.colors.divider }]}>
                <View style={[styles.optionSearchField, { backgroundColor: theme.colors.inputBackground, borderColor: theme.colors.inputBorder }]}>
                  <Ionicons name="search-outline" size={18} color={theme.colors.muted} />
                  <TextInput
                    value={searchKeyword}
                    onChangeText={setSearchKeyword}
                    placeholder={searchPlaceholder ?? "Cari data"}
                    placeholderTextColor={theme.isDark ? theme.colors.muted : theme.colors.subtleText}
                    style={[styles.optionSearchInput, { color: theme.colors.text }]}
                    autoCapitalize="none"
                    autoCorrect={false}
                    returnKeyType="search"
                  />
                  {searchKeyword ? (
                    <Pressable onPress={() => setSearchKeyword("")} hitSlop={8}>
                      <Ionicons name="close-circle" size={18} color={theme.colors.muted} />
                    </Pressable>
                  ) : null}
                </View>
              </View>
            ) : null}
            <ScrollView
              automaticallyAdjustKeyboardInsets
              contentContainerStyle={styles.optionContent}
              keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
              keyboardShouldPersistTaps="handled"
            >
              {filteredOptions.length ? filteredOptions.map((option) => {
                const active = selectedValue === option.value;
                return (
                  <Pressable key={option.value} style={[styles.optionRow, { backgroundColor: theme.colors.surfaceContainerLowest, borderColor: theme.colors.outlineVariant }, active && styles.optionRowActive, active && { backgroundColor: theme.colors.successContainer, borderColor: theme.colors.primary }]} onPress={() => handleSelect(option.value)}>
                    <Text style={[styles.optionRowTitle, { color: theme.colors.text }, active && styles.optionRowTitleActive, active && { color: theme.colors.primary }]} numberOfLines={2}>
                      {option.label}
                    </Text>
                    {active ? <Ionicons name="checkmark-circle" size={20} color={theme.colors.primary} /> : null}
                  </Pressable>
                );
              }) : (
                <Text style={[styles.emptyText, { color: theme.colors.muted }]}>{emptyText}</Text>
              )}
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
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
    <Modal animationType="slide" transparent visible={props.visible} onRequestClose={props.onClose}>
      <View style={[styles.optionBackdrop, { backgroundColor: theme.colors.scrim }]}>
        <View style={[styles.optionSheet, { backgroundColor: theme.colors.surfaceContainerLowest }]}>
          <View style={[styles.sheetHandle, { backgroundColor: theme.colors.outlineVariant }]} />
          <View style={[styles.sheetHeader, { borderBottomColor: theme.colors.divider }]}>
            <Text style={[styles.sheetTitle, { color: theme.colors.text }]}>{props.title}</Text>
            <Pressable onPress={props.onClose}>
              <Ionicons name="close" size={24} color={theme.colors.text} />
            </Pressable>
          </View>
          <ScrollView
            automaticallyAdjustKeyboardInsets
            contentContainerStyle={styles.optionContentKeyboard}
            keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
            keyboardShouldPersistTaps="handled"
          >
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
            <Input label="Keterangan" value={keterangan} onChangeText={setKeterangan} placeholder="Alasan otorisasi" multiline uppercase />
            <View style={styles.footerRow}>
              <Pressable style={[styles.secondaryButton, { backgroundColor: theme.colors.surfaceContainer }]} onPress={props.onClose}>
                <Text style={[styles.secondaryButtonText, { color: theme.colors.text }]}>Batal</Text>
              </Pressable>
              <Pressable style={[styles.primaryButtonSmall, { backgroundColor: theme.colors.buttonPrimary }, props.isSubmitting && styles.disabledButton]} disabled={props.isSubmitting} onPress={submit}>
                <Text style={[styles.primaryButtonText, { color: theme.colors.onPrimary }]}>{props.isSubmitting ? "Memproses..." : "Otorisasi"}</Text>
              </Pressable>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function Input({ label, value, onChangeText, placeholder, keyboardType = "default", icon, multiline = false, editable = true, uppercase = false }: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  keyboardType?: "default" | "number-pad" | "decimal-pad" | "phone-pad";
  icon?: keyof typeof Ionicons.glyphMap;
  multiline?: boolean;
  editable?: boolean;
  uppercase?: boolean;
}) {
  const theme = useAppTheme();
  const handleChangeText = (text: string) => onChangeText(uppercase ? text.toUpperCase() : text);
  const placeholderColor = theme.isDark ? theme.colors.muted : theme.colors.subtleText;

  return (
    <View style={styles.field}>
      <Text style={[styles.label, { color: theme.colors.subtleText }]}>{label}</Text>
      <View style={[styles.inputWrap, { backgroundColor: editable ? theme.colors.inputBackground : theme.colors.surfaceDim, borderColor: editable ? theme.colors.inputBorder : theme.colors.outlineVariant }]}>
        <TextInput editable={editable} value={value} onChangeText={handleChangeText} placeholder={placeholder} placeholderTextColor={placeholderColor} keyboardType={keyboardType} autoCapitalize={uppercase ? "characters" : "sentences"} multiline={multiline} style={[styles.input, { color: editable ? theme.colors.text : theme.colors.muted }, multiline && styles.textarea]} />
        {icon ? <Ionicons name={icon} size={20} color={editable ? theme.colors.primary : theme.colors.muted} /> : null}
      </View>
    </View>
  );
}

function CurrencyInput({ label, value, onChangeText, locked }: { label: string; value: string; onChangeText: (value: string) => void; locked?: boolean }) {
  const theme = useAppTheme();

  return (
    <View style={styles.field}>
      <Text style={[styles.label, { color: theme.colors.subtleText }]}>{label}</Text>
      <View style={[styles.inputWrap, { backgroundColor: theme.colors.inputBackground, borderColor: theme.colors.inputBorder }, locked && styles.lockedInput, locked && { backgroundColor: theme.colors.warningContainer, borderColor: theme.colors.secondary }]}>
        <Text style={[styles.rp, { color: theme.colors.outlineStrong }]}>Rp</Text>
        <TextInput editable={!locked} value={value ? Number(value.replace(/\D/g, "")).toLocaleString("id-ID") : ""} onChangeText={(text) => onChangeText(text.replace(/\D/g, ""))} placeholder="0" placeholderTextColor={theme.isDark ? theme.colors.muted : theme.colors.subtleText} keyboardType="number-pad" style={[styles.currencyInput, { color: locked ? theme.colors.muted : theme.colors.text }]} />
        {locked ? <Ionicons name="lock-closed" size={16} color={theme.colors.secondary} /> : null}
      </View>
    </View>
  );
}

function ReadOnly({ label, value }: { label: string; value: string }) {
  const theme = useAppTheme();

  return (
    <View style={styles.field}>
      <Text style={[styles.label, { color: theme.colors.subtleText }]}>{label}</Text>
      <View style={[styles.inputWrap, styles.readOnly, { backgroundColor: theme.colors.surfaceContainerLow, borderColor: theme.colors.outlineVariant }]}>
        <Text style={[styles.readOnlyText, { color: theme.colors.muted }]}>{value}</Text>
      </View>
    </View>
  );
}

function Metric({ label, value, badge }: { label: string; value: string; badge?: boolean }) {
  const theme = useAppTheme();

  return (
    <View style={[styles.metric, { borderColor: theme.colors.outlineVariant }]}>
      <Text style={[styles.metricLabel, { color: theme.colors.subtleText }]}>{label}</Text>
      <Text style={[styles.metricValue, { color: theme.colors.text }, badge && styles.metricBadge, badge && { backgroundColor: theme.colors.successContainer, color: theme.colors.primary }]}>{value}</Text>
    </View>
  );
}

function TotalLine({ label, value }: { label: string; value: string }) {
  const theme = useAppTheme();

  return (
    <View style={styles.totalLine}>
      <Text style={[styles.totalLineLabel, { color: theme.colors.muted }]}>{label}</Text>
      <Text style={[styles.totalLineValue, { color: theme.colors.text }]}>{value}</Text>
    </View>
  );
}

function parseCurrency(value: string): number {
  return Number(value.replace(/\D/g, "")) || 0;
}

function parseDecimal(value: string): number {
  return Number(value.replace(",", ".")) || 0;
}

function formatNumber(value: number): string {
  return Math.round(value).toLocaleString("id-ID");
}

function roundNagagoldPurchasePrice(price: number, config: NagagoldPurchaseRounding): number {
  const roundedPrice = Math.round(price);
  const roundingValue = Number(config.value) || 500;
  const rest = roundedPrice % roundingValue;
  if (rest === 0) return roundedPrice;
  return config.roundDown
    ? roundedPrice - rest
    : roundedPrice - rest + roundingValue;
}

function formatPurchaseConditionDiscount(
  condition: NagagoldKondisiBeli | undefined,
  typeKondisi: string,
  berat: number,
  hargaNota: number,
): string {
  if (!condition) return "-";

  if (typeKondisi === "RP") {
    const potonganPerGram = Number(condition.potongan ?? 0);
    const totalPotongan = Math.max(0, Math.round(potonganPerGram * (berat || 1)));
    return `${formatRupiah(totalPotongan)} (${formatRupiah(potonganPerGram)}/gr)`;
  }

  const persentase = Number(condition.persentase ?? 0);
  const totalPotongan = Math.max(0, Math.round((persentase / 100) * hargaNota));
  return `${persentase.toLocaleString("id-ID")}% / ${formatRupiah(totalPotongan)}`;
}

function getRawText(raw: Record<string, unknown> | null | undefined, key: string, fallback = "-"): string {
  if (!raw || raw[key] === undefined || raw[key] === null) return fallback;
  const value = String(raw[key]).trim();
  return value || fallback;
}

function getPurchaseAuthorizationReasons(
  beratNota: number,
  berat: number,
  hargaNota: number,
  hargaBeli: number,
  config: NagagoldPurchaseRounding,
  capabilities: NagagoldPurchaseCapabilities,
): string[] {
  const reasons: string[] = [];
  if (capabilities.requireAbsoluteAuthorization && hargaBeli !== hargaNota) {
    reasons.push(`Module TRANSACTION_ABSOLUTE_AUTHORIZATION_MODULE aktif: harga beli harus diotorisasi jika berbeda dari harga nota.`);
    return reasons;
  }
  if (hargaBeli < hargaNota && !config.disableAuthorizationBelowNota) {
    reasons.push(`Harga beli kurang dari harga nota (${formatRupiah(hargaBeli)} vs ${formatRupiah(hargaNota)})`);
  }
  if (hargaBeli > hargaNota && !config.disableAuthorizationAboveNota) {
    reasons.push(`Harga beli melebihi harga nota (${formatRupiah(hargaBeli)} vs ${formatRupiah(hargaNota)})`);
  }
  if (capabilities.requireWeightToleranceAuthorization && berat > beratNota) {
    reasons.push(`Berat beli melebihi berat nota (${berat} gr vs ${beratNota} gr)`);
  }
  return reasons;
}

const styles = StyleSheet.create({
  keyboardScreen: { flex: 1 },
  container: { backgroundColor: colors.background, gap: 14, paddingHorizontal: 20, paddingTop: 24, paddingBottom: 190 },
  branchContainer: { backgroundColor: colors.background, gap: 14, paddingHorizontal: 20, paddingTop: 24 },
  branchIntro: {
    alignItems: "flex-start",
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: "row",
    gap: 12,
    padding: 16,
  },
  branchIntroText: { flex: 1, gap: 4 },
  branchTitle: { fontSize: 18, fontWeight: "800" },
  branchSubtitle: { fontSize: 13, fontWeight: "600", lineHeight: 19 },
  branchMessage: { fontSize: 13, fontWeight: "700" },
  branchHint: { fontSize: 12, fontWeight: "700", lineHeight: 18 },
  branchSheetKeyboard: { flex: 1 },
  branchSheetBackdrop: { flex: 1, justifyContent: "flex-end", paddingTop: 48 },
  branchSheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: "90%", padding: 16 },
  branchSheetHeader: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", paddingBottom: 12 },
  branchSearchBox: { alignItems: "center", borderRadius: 14, borderWidth: 1, flexDirection: "row", gap: 8, minHeight: 48, paddingHorizontal: 12 },
  branchSearchInput: { flex: 1, fontSize: 14, fontWeight: "600", paddingVertical: 0 },
  branchSheetCount: { fontSize: 12, fontWeight: "700", paddingVertical: 10 },
  branchSheetList: { gap: 10, paddingBottom: 12 },
  branchList: { gap: 10 },
  branchOption: {
    alignItems: "center",
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: "row",
    gap: 12,
    minHeight: 64,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  branchOptionText: { flex: 1, gap: 3 },
  branchName: { fontSize: 14, fontWeight: "800" },
  branchMeta: { fontSize: 11, fontWeight: "600" },
  activeStoreBanner: {
    alignItems: "center",
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: "row",
    gap: 8,
    minHeight: 62,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  activeStoreInfo: { flex: 1, gap: 2 },
  activeStoreLabel: { fontSize: 11, fontWeight: "800" },
  activeStoreText: { fontSize: 13, fontWeight: "800" },
  activeStoreDomain: { fontSize: 11, fontWeight: "600" },
  activeStoreChange: {
    alignItems: "center",
    borderRadius: 999,
    justifyContent: "center",
    minHeight: 30,
    paddingHorizontal: 12,
  },
  activeStoreChangeText: { fontSize: 12, fontWeight: "800" },
  stepper: { flexDirection: "row", justifyContent: "space-between", marginVertical: 4 },
  stepItem: { alignItems: "center", flex: 1, gap: 7 },
  stepCircle: { alignItems: "center", backgroundColor: colors.surfaceContainer, borderRadius: 999, borderWidth: 1, height: 38, justifyContent: "center", width: 38 },
  stepCircleActive: { backgroundColor: colors.primaryContainer },
  stepNumber: { color: "#FFFFFF", fontSize: 14, fontWeight: "800" },
  stepNumberActive: { color: "#FFFFFF" },
  stepLabel: { color: colors.outlineStrong, fontSize: 11, fontWeight: "700", textAlign: "center" },
  stepLabelActive: { color: colors.primary },
  formStack: { gap: 14 },
  field: { flex: 1, gap: 6 },
  label: { color: colors.muted, fontSize: 11, fontWeight: "700", letterSpacing: 0.5, textTransform: "uppercase" },
  inputWrap: { alignItems: "center", backgroundColor: colors.surface, borderColor: colors.primary, borderRadius: 12, borderWidth: 1, flexDirection: "row", minHeight: 48, paddingHorizontal: 14 },
  input: { color: colors.text, flex: 1, fontSize: 13, fontWeight: "600", minHeight: 44 },
  textarea: { minHeight: 80, paddingTop: 10, textAlignVertical: "top" },
  rp: { color: colors.outlineStrong, fontSize: 12, fontWeight: "700", marginRight: 8 },
  currencyInput: { color: colors.text, flex: 1, fontSize: 13, fontWeight: "700" },
  lockedInput: { backgroundColor: colors.secondaryContainer, borderColor: colors.secondaryContainer },
  readOnly: { backgroundColor: colors.surfaceLow },
  readOnlyText: { color: colors.muted, fontSize: 13, fontWeight: "700" },
  twoColumn: { flexDirection: "row", gap: 10 },
  threeColumn: { flexDirection: "row", gap: 8 },
  footerRow: { flexDirection: "row", gap: 10, marginTop: 4 },
  purchaseActionStack: { gap: 12, marginTop: 10 },
  purchaseActionRow: { flexDirection: "row", gap: 12 },
  saveItemButton: {
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 14,
    flexDirection: "row",
    gap: 10,
    justifyContent: "center",
    minHeight: 58,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.14,
    shadowRadius: 14,
  },
  saveItemButtonDisabled: {
    shadowOpacity: 0,
  },
  saveItemButtonText: { fontSize: 16, fontWeight: "800" },
  moduleNotice: {
    alignItems: "flex-start",
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: "row",
    gap: 8,
    padding: 10,
  },
  moduleNoticeText: { flex: 1, fontSize: 11, fontWeight: "600", lineHeight: 17 },
  resetButton: { alignItems: "center", borderColor: colors.secondary, borderRadius: 12, borderWidth: 1, flex: 1, flexDirection: "row", gap: 7, justifyContent: "center", minHeight: 50 },
  resetButtonText: { color: colors.secondary, fontSize: 13, fontWeight: "700" },
  outlineButton: { alignItems: "center", borderColor: colors.primary, borderRadius: 12, borderWidth: 1, flex: 1.25, flexDirection: "row", gap: 7, justifyContent: "center", minHeight: 50 },
  outlineButtonText: { color: colors.primary, fontSize: 13, fontWeight: "700" },
  nextButton: { alignItems: "center", borderRadius: 12, flex: 1, flexDirection: "row", gap: 8, justifyContent: "center", minHeight: 52 },
  nextButtonText: { fontSize: 14, fontWeight: "800" },
  selectField: { alignItems: "center", backgroundColor: colors.surface, borderColor: colors.outline, borderRadius: 12, borderWidth: 1, flexDirection: "row", gap: 10, minHeight: 48, paddingHorizontal: 14 },
  selectValue: { color: colors.text, flex: 1, fontSize: 13, fontWeight: "700" },
  selectPlaceholder: { color: colors.outlineStrong, fontWeight: "600" },
  optionBackdrop: { backgroundColor: "rgba(15, 23, 42, 0.36)", flex: 1, justifyContent: "flex-end" },
  optionKeyboardAvoider: { justifyContent: "flex-end", width: "100%" },
  optionSheet: { backgroundColor: colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: "78%", paddingBottom: 18 },
  optionSheetSearchable: { maxHeight: "82%" },
  sheetHandle: { alignSelf: "center", backgroundColor: colors.outline, borderRadius: 999, height: 5, marginTop: 10, width: 48 },
  sheetHeader: { alignItems: "center", borderBottomColor: colors.outline, borderBottomWidth: 1, flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 18, paddingVertical: 14 },
  sheetTitle: { color: colors.text, fontSize: 16, fontWeight: "800" },
  optionSearchWrap: { borderBottomWidth: 1, paddingHorizontal: 14, paddingVertical: 12 },
  optionSearchField: { alignItems: "center", borderRadius: 14, borderWidth: 1, flexDirection: "row", gap: 8, minHeight: 46, paddingHorizontal: 12 },
  optionSearchInput: { flex: 1, fontSize: 13, fontWeight: "700", paddingVertical: 0 },
  optionContent: { padding: 14 },
  optionContentKeyboard: { padding: 14, paddingBottom: 140 },
  optionRow: { alignItems: "center", borderColor: colors.outline, borderRadius: 14, borderWidth: 1, flexDirection: "row", gap: 10, justifyContent: "space-between", marginBottom: 10, minHeight: 52, paddingHorizontal: 14 },
  optionRowActive: { backgroundColor: colors.primarySoft, borderColor: colors.primaryContainer },
  optionRowTitle: { color: colors.text, flex: 1, fontSize: 13, fontWeight: "700" },
  optionRowTitleActive: { color: colors.primary },
  resultList: { borderColor: colors.outline, borderRadius: 14, borderWidth: 1, overflow: "hidden" },
  resultRow: { alignItems: "center", borderBottomColor: colors.outline, borderBottomWidth: 1, flexDirection: "row", gap: 10, minHeight: 58, paddingHorizontal: 12 },
  resultTitle: { color: colors.text, fontSize: 13, fontWeight: "700" },
  resultSubtitle: { color: colors.muted, fontSize: 11, fontWeight: "600", marginTop: 3 },
  primaryButtonSmall: { alignItems: "center", backgroundColor: colors.primaryContainer, borderRadius: 12, flex: 1, flexDirection: "row", gap: 7, justifyContent: "center", minHeight: 50 },
  primaryButtonText: { color: "#FFFFFF", fontSize: 13, fontWeight: "700" },
  searchBox: { alignItems: "center", backgroundColor: colors.surface, borderColor: colors.outline, borderRadius: 14, borderWidth: 1, flexDirection: "row", minHeight: 48, paddingHorizontal: 12 },
  searchInput: { color: colors.text, flex: 1, fontSize: 13 },
  itemCard: { backgroundColor: colors.surface, borderColor: colors.outline, borderRadius: 16, borderWidth: 1, gap: 10, padding: 12 },
  itemHead: { alignItems: "flex-start", flexDirection: "row", justifyContent: "space-between" },
  itemName: { color: colors.text, fontSize: 15, fontWeight: "800" },
  itemMeta: { color: colors.muted, fontSize: 12, fontWeight: "600", marginTop: 3 },
  metricGrid: { borderColor: colors.outline, borderRadius: 14, borderWidth: 1, flexDirection: "row", flexWrap: "wrap", overflow: "hidden" },
  metric: { alignItems: "center", borderColor: colors.outline, borderRightWidth: 1, borderTopWidth: 1, minHeight: 58, padding: 8, width: "33.33%" },
  metricLabel: { color: colors.outlineStrong, fontSize: 11, fontWeight: "600", textAlign: "center" },
  metricValue: { color: colors.text, fontSize: 13, fontWeight: "800", marginTop: 4, textAlign: "center" },
  metricBadge: { backgroundColor: colors.primarySoft, borderRadius: 999, color: colors.primary, overflow: "hidden", paddingHorizontal: 10, paddingVertical: 2 },
  authNotice: {
    alignItems: "flex-start",
    backgroundColor: colors.secondaryContainer,
    borderColor: colors.secondaryContainer,
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: "row",
    gap: 10,
    padding: 12,
  },
  authNoticeTitle: { color: colors.text, fontSize: 13, fontWeight: "800", marginBottom: 4 },
  authReason: { color: colors.muted, fontSize: 12, fontWeight: "600", lineHeight: 18 },
  emptyCard: { alignItems: "center", backgroundColor: colors.surfaceLow, borderColor: colors.outline, borderRadius: 16, borderStyle: "dashed", borderWidth: 2, gap: 8, padding: 20 },
  emptyTitle: { color: colors.muted, fontSize: 14, fontWeight: "700" },
  emptyText: { color: colors.outlineStrong, fontSize: 12, textAlign: "center" },
  totalCard: { alignItems: "center", backgroundColor: colors.surface, borderColor: colors.outline, borderRadius: 16, borderWidth: 1, flexDirection: "row", gap: 14, padding: 14 },
  totalIcon: { alignItems: "center", backgroundColor: colors.primaryContainer, borderRadius: 14, height: 52, justifyContent: "center", width: 52 },
  totalRows: { flex: 1, gap: 5 },
  totalLine: { flexDirection: "row", justifyContent: "space-between" },
  totalLineLabel: { color: colors.muted, fontSize: 12, fontWeight: "600" },
  totalLineValue: { color: colors.text, fontSize: 13, fontWeight: "800" },
  secondaryButton: { alignItems: "center", backgroundColor: colors.surfaceContainer, borderRadius: 12, flex: 1, flexDirection: "row", gap: 7, justifyContent: "center", minHeight: 50 },
  secondaryButtonText: { color: colors.text, fontSize: 13, fontWeight: "700" },
  sectionTitle: { color: colors.text, fontSize: 15, fontWeight: "800" },
  finishButton: { alignItems: "center", backgroundColor: colors.primaryContainer, borderRadius: 12, flex: 1.4, flexDirection: "row", gap: 7, justifyContent: "center", minHeight: 50 },
  disabledButton: { opacity: 0.6 },
});

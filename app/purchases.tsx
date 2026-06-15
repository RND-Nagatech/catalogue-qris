import { type ReactNode, useCallback, useMemo, useState } from "react";
import { Alert, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useFocusEffect } from "expo-router";
import {
  authorizeNagagoldTransaction,
  loadNagagoldDomain,
  loadNagagoldGroups,
  loadNagagoldJenis,
  loadNagagoldKondisiBeli,
  loadNagagoldRekenings,
  loadNagagoldSalesPeople,
  loadNagagoldTokos,
  lookupNagagoldMemberByCode,
  lookupNagagoldPurchaseItem,
  searchNagagoldMembers,
  submitNagagoldPurchase,
  type NagagoldGroup,
  type NagagoldJenis,
  type NagagoldKondisiBeli,
  type NagagoldMember,
  type NagagoldPurchaseLookupItem,
  type NagagoldRekening,
  type NagagoldSalesPerson,
  type NagagoldToko,
} from "../lib/dataStore";
import { formatRupiah } from "../lib/qris";
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
  potonganKondisiBeli?: number;
  kodeHargaBeli?: string;
  authorizationIds?: string[];
  raw?: Record<string, unknown>;
};

type PendingPurchaseAuthorization = {
  reasons: string[];
  payload: {
    beratNota: number;
    berat: number;
    hargaNota: number;
    hargaBeli: number;
  };
};

const paymentTypes = ["CASH", "TRANSFER", "QRIS", "DEBIT"];
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
  danger: "#BA1A1A",
};

function extractKodeDept(value: string): string {
  return value.split("-")[0]?.trim() || value.trim();
}

export default function Purchases() {
  const theme = useAppTheme();
  const [domain, setDomain] = useState("");
  const [tokos, setTokos] = useState<NagagoldToko[]>([]);
  const [jenisList, setJenisList] = useState<NagagoldJenis[]>([]);
  const [kondisiList, setKondisiList] = useState<NagagoldKondisiBeli[]>([]);
  const [groups, setGroups] = useState<NagagoldGroup[]>([]);
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

  useFocusEffect(
    useCallback(() => {
      let active = true;
      setIsLoadingMaster(true);
      Promise.all([
        loadNagagoldDomain(),
        loadNagagoldTokos().catch(() => []),
        loadNagagoldJenis().catch(() => []),
        loadNagagoldKondisiBeli().catch(() => []),
        loadNagagoldGroups().catch(() => []),
        loadNagagoldSalesPeople().catch(() => []),
        loadNagagoldRekenings().catch(() => []),
      ])
        .then(([savedDomain, nextTokos, nextJenis, nextKondisi, nextGroups, nextSales, nextRekenings]) => {
          if (!active) return;
          setDomain(savedDomain);
          setTokos(nextTokos);
          setJenisList(nextJenis);
          setKondisiList(nextKondisi);
          setGroups(nextGroups);
          setSalesPeople(nextSales);
          setRekenings(nextRekenings);
          if (!kodeSales && nextSales[0]?.kode_sales) {
            setKodeSales(nextSales[0].kode_sales);
            setNamaSales(nextSales[0].nama_sales);
          }
          if (!rekening && nextRekenings[0]) setRekening(`${nextRekenings[0].no_rekening} - ${nextRekenings[0].kode_bank}`);
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
    }, [kodeJenis, kodeSales, kodeToko, kondisi, rekening])
  );

  const totals = useMemo(() => items.reduce((acc, item) => ({
    hargaNota: acc.hargaNota + item.hargaNota,
    beratNota: acc.beratNota + item.beratNota,
    hargaBeli: acc.hargaBeli + item.hargaBeli,
    berat: acc.berat + item.berat,
  }), { hargaNota: 0, beratNota: 0, hargaBeli: 0, berat: 0 }), [items]);

  const hargaRata = parseDecimal(berat) > 0 ? Math.floor(parseCurrency(hargaBeli) / parseDecimal(berat)) : 0;
  const selectedKondisi = kondisiList.find((item) => item.kondisi_barang === kondisi);

  const calculateHargaBeli = (overrides?: {
    berat?: string;
    hargaNota?: string;
    kondisi?: string;
    typeKondisi?: string;
  }) => {
    const nextBerat = parseDecimal(overrides?.berat ?? berat) || 1;
    const nextHargaNota = parseCurrency(overrides?.hargaNota ?? hargaNota);
    const nextKondisi = overrides?.kondisi ?? kondisi;
    const nextTypeKondisi = overrides?.typeKondisi ?? typeKondisi;
    const condition = kondisiList.find((item) => item.kondisi_barang === nextKondisi);

    if (!nextHargaNota || !condition) return nextHargaNota;

    const potongan = Number(condition.potongan ?? 0);
    const persentase = Number(condition.persentase ?? 0);
    const discount = nextTypeKondisi === "RP"
      ? potongan * nextBerat
      : (persentase / 100) * nextHargaNota;

    return Math.max(0, Math.round(nextHargaNota - discount));
  };

  const recalculateHargaBeli = (overrides?: {
    berat?: string;
    hargaNota?: string;
    kondisi?: string;
    typeKondisi?: string;
  }) => {
    const nextHargaBeli = calculateHargaBeli(overrides);
    setHargaBeli(nextHargaBeli ? String(nextHargaBeli) : "");
  };

  const lookupItem = async () => {
    const barcode = kodeBarcode.trim().toUpperCase().slice(0, 8);
    if (!barcode) {
      Alert.alert("Barcode kosong", "Masukkan atau scan kode barcode terlebih dahulu.");
      return;
    }

    setIsLookingUpItem(true);
    try {
      const item = await lookupNagagoldPurchaseItem(barcode, kodeToko);
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
    const nextHargaNota = Number(item.harga_jual ?? 0) + Number(item.harga_atribut ?? 0) + Number(item.ongkos ?? 0) - Number(item.diskon_penjualan ?? 0);

    setPurchaseRaw(item);
    setKodeBarcode(String(item.kode_barcode ?? kodeBarcode));
    setKodeJenis(jenis ? `${jenis.kode_dept} - ${jenis.nama_dept}` : nextKodeJenis);
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
      const member = await lookupNagagoldMemberByCode(code);
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
      const results = await searchNagagoldMembers(phoneQuery && phoneQuery !== "-" ? "hp" : "nama", query);
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

  const addItem = async (authorizationId?: string) => {
    const nextBerat = parseDecimal(berat);
    const nextBeratNota = parseDecimal(beratNota) || nextBerat;
    const nextHargaBeli = parseCurrency(hargaBeli);
    const nextHargaNota = parseCurrency(hargaNota) || nextHargaBeli;
    if (!purchaseRaw) {
      Alert.alert("Data scan belum ada", "Ambil Data Barang dari barcode terlebih dahulu supaya kode jenis dan data jual sesuai NAGAGOLD.");
      return;
    }
    if (!kodeBarcode.trim() || !kodeJenis.trim() || !namaBarang.trim() || !kondisi.trim() || nextBerat <= 0 || nextHargaBeli <= 0) {
      Alert.alert("Data barang belum lengkap", "Barcode, kode jenis, kondisi, nama barang, berat, dan harga beli wajib diisi.");
      return;
    }
    const authReasons = getPurchaseAuthorizationReasons(nextBeratNota, nextBerat, nextHargaNota, nextHargaBeli);
    if (authReasons.length && !authorizationId) {
      setPendingAuthorization({
        reasons: authReasons,
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
      kodeBarcode: kodeBarcode.trim(),
      noFakturJual: String(purchaseRaw?.no_faktur_jual ?? `FAK-${Date.now()}`),
      kodeJenis: String(purchaseRaw?.kode_dept ?? (extractKodeDept(kodeJenis) || "ABB")),
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
      potonganKondisiBeli: typeKondisi === "RP"
        ? Number(selectedKondisi?.potongan ?? 0)
        : Number(selectedKondisi?.persentase ?? 0),
      kodeHargaBeli: "-",
      authorizationIds: authorizationId ? [authorizationId] : undefined,
      raw: purchaseRaw ?? undefined,
    }]);
    resetItemForm();
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
      });
      setPendingAuthorization(null);
      await addItem(result.authorizationId);
    } catch (error) {
      Alert.alert("Otorisasi gagal", error instanceof Error ? error.message : "Username/password otorisasi belum valid.");
    } finally {
      setIsAuthorizing(false);
    }
  };

  const submit = () => {
    const firstItem = items[0];
    if (!domain) {
      Alert.alert("Domain belum diatur", "Isi domain NAGAGOLD di menu Pengaturan terlebih dahulu.");
      return;
    }
    if (!firstItem) {
      Alert.alert("Barang belum ada", "Tambahkan minimal satu barang terlebih dahulu.");
      return;
    }
    if (!kodeSales.trim() || !namaCustomer.trim()) {
      Alert.alert("Customer belum lengkap", "Kode sales dan nama customer wajib diisi.");
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
        kodeMember: kodeMember.trim(),
        namaCustomer: namaCustomer.trim(),
        alamatCustomer: alamatCustomer.trim(),
        noHp: noHp.trim(),
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
    setKodeJenis("");
    setNamaBarang("");
    setBeratNota("");
    setBerat("");
    setHargaNota("");
    setHargaBeli("");
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

  return (
    <>
    <ScrollView contentContainerStyle={[styles.container, { backgroundColor: theme.colors.background }]} keyboardShouldPersistTaps="handled">
      <AppHeader title="Transaksi Pembelian" />
      <View style={[styles.domainNotice, theme.isDark && { backgroundColor: theme.colors.surface, borderColor: theme.colors.outline }]}>
        <Text style={[styles.domainNoticeText, theme.isDark && { color: theme.colors.muted }]}>
          {domain ? (isLoadingMaster ? "Memuat master " : "Terhubung ke ") : "Atur domain "}
          <Text style={[styles.domainNoticeStrong, theme.isDark && { color: theme.colors.primary }]}>NAGAGOLD</Text>
          {domain ? "" : " di Pengaturan"}
        </Text>
      </View>
      <Stepper step={step} />
      {step === 1 ? (
        <View style={styles.formStack}>
          <OptionGroup
            label="Pilih Kode Toko"
            value={kodeToko}
            options={tokos.map((item) => ({ value: item.kode_toko, label: `${item.kode_toko}${item.nama_toko ? ` - ${item.nama_toko}` : ""}` }))}
            onChange={setKodeToko}
            fallback={<Input label="" value={kodeToko} onChangeText={setKodeToko} placeholder="Pilih kode toko" />}
          />
          <Input label="Kode Barcode" value={kodeBarcode} onChangeText={setKodeBarcode} placeholder="Scan atau input barcode" icon="barcode-outline" />
          <Pressable style={styles.outlineButton} onPress={lookupItem}>
            <Ionicons name="barcode-outline" size={17} color="#047857" />
            <Text style={styles.outlineButtonText}>{isLookingUpItem ? "Mengambil Barang..." : "Ambil Data Barang"}</Text>
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
              fallback={<Input label="" value={kondisi} onChangeText={(value) => {
                setKondisi(value);
                recalculateHargaBeli({ kondisi: value });
              }} placeholder="MULUS" />}
            />
          </View>
          <ReadOnly label="Kode Jenis" value={kodeJenis || "-"} />
          <Input label="Nama Barang" value={namaBarang} onChangeText={setNamaBarang} placeholder="Nama barang" />
          <View style={styles.twoColumn}>
            <Input label="Kadar" value={kadar} onChangeText={setKadar} placeholder="100" keyboardType="decimal-pad" />
            <Input label="Kadar Modal" value={kadarModal} onChangeText={setKadarModal} placeholder="0" keyboardType="decimal-pad" />
          </View>
          <View style={styles.threeColumn}>
            <Input label="Kadar Cetak" value={kadarCetak} onChangeText={setKadarCetak} placeholder="100" keyboardType="decimal-pad" />
            <Input label="Berat Nota" value={beratNota} onChangeText={setBeratNota} placeholder="0" keyboardType="decimal-pad" />
            <Input label="Berat" value={berat} onChangeText={(value) => {
              setBerat(value);
              recalculateHargaBeli({ berat: value });
            }} placeholder="0" keyboardType="decimal-pad" />
          </View>
          <CurrencyInput label="Harga Nota" value={hargaNota} onChangeText={(value) => {
            setHargaNota(value);
            recalculateHargaBeli({ hargaNota: value });
          }} locked />
          <CurrencyInput label="Harga Beli" value={hargaBeli} onChangeText={setHargaBeli} />
          <View style={styles.twoColumn}>
            <ReadOnly label="Harga Rata" value={formatRupiah(hargaRata)} />
            <ReadOnly label="Potongan Kondisi" value={formatPurchaseConditionDiscount(selectedKondisi, typeKondisi, parseDecimal(berat), parseCurrency(hargaNota))} />
          </View>
          <View style={styles.footerRow}>
            <Pressable style={[styles.resetButton, theme.isDark && { backgroundColor: theme.colors.surfaceLow, borderColor: theme.colors.secondary }]} onPress={resetItemForm}>
              <Ionicons name="refresh" size={17} color={theme.colors.secondary} />
              <Text style={[styles.resetButtonText, theme.isDark && { color: theme.colors.secondary }]}>Reset</Text>
            </Pressable>
            <Pressable style={[styles.outlineButton, theme.isDark && { backgroundColor: theme.colors.surfaceLow, borderColor: theme.colors.primary }]} onPress={() => addItem()}>
              <Ionicons name="save-outline" size={17} color={theme.colors.primary} />
              <Text style={[styles.outlineButtonText, theme.isDark && { color: theme.colors.primary }]}>Simpan Barang</Text>
            </Pressable>
            <Pressable style={[styles.primaryButtonSmall, theme.isDark && { backgroundColor: theme.colors.primary }]} onPress={() => setStep(2)}>
              <Text style={styles.primaryButtonText}>Next</Text>
              <Ionicons name="chevron-forward" size={17} color="#FFFFFF" />
            </Pressable>
          </View>
        </View>
      ) : null}
      {step === 2 ? (
        <View style={styles.formStack}>
          <View style={[styles.searchBox, theme.isDark && { backgroundColor: theme.colors.surfaceLow, borderColor: theme.colors.outline }]}>
            <TextInput placeholder="Cari data..." placeholderTextColor={theme.colors.muted} style={[styles.searchInput, theme.isDark && { color: theme.colors.text }]} />
            <Ionicons name="search-outline" size={20} color={theme.colors.muted} />
          </View>
          {items.length ? items.map((item) => (
            <View key={item.id} style={[styles.itemCard, theme.isDark && { backgroundColor: theme.colors.surface, borderColor: theme.colors.outline }]}>
              <View style={styles.itemHead}>
                <View>
                  <Text style={[styles.itemName, theme.isDark && { color: theme.colors.text }]}>{item.namaBarang}</Text>
                  <Text style={[styles.itemMeta, theme.isDark && { color: theme.colors.muted }]}>Kode: {item.kodeBarcode}  ·  Jenis {item.kodeJenis}</Text>
                </View>
                <Pressable onPress={() => setItems(items.filter((next) => next.id !== item.id))}>
                  <Ionicons name="trash-outline" size={20} color="#DC2626" />
                </Pressable>
              </View>
              <View style={[styles.metricGrid, theme.isDark && { borderColor: theme.colors.outline }]}>
                <Metric label="Harga Nota" value={formatNumber(item.hargaNota)} />
                <Metric label="Berat Nota" value={String(item.beratNota)} />
                <Metric label="Harga Rata" value={formatNumber(Math.floor(item.hargaBeli / item.berat))} />
                <Metric label="Berat" value={String(item.berat)} />
                <Metric label="Harga Beli" value={formatNumber(item.hargaBeli)} />
                <Metric label="Kondisi" value={item.kondisi} badge />
              </View>
            </View>
          )) : (
            <View style={[styles.emptyCard, theme.isDark && { backgroundColor: "rgba(26,36,56,0.35)", borderColor: theme.colors.outline }]}>
              <Ionicons name="cube-outline" size={32} color={theme.colors.muted} />
              <Text style={[styles.emptyTitle, theme.isDark && { color: theme.colors.text }]}>Belum ada barang</Text>
              <Text style={[styles.emptyText, theme.isDark && { color: theme.colors.muted }]}>Kembali ke Input Barang untuk menambahkan barang.</Text>
            </View>
          )}
          <View style={[styles.totalCard, theme.isDark && { backgroundColor: theme.colors.surface, borderColor: theme.colors.outline }]}>
            <View style={styles.totalIcon}>
              <Ionicons name="receipt-outline" size={24} color="#FFFFFF" />
            </View>
            <View style={styles.totalRows}>
              <TotalLine label="Total Harga Nota" value={formatNumber(totals.hargaNota)} />
              <TotalLine label="Total Berat Nota" value={String(totals.beratNota)} />
              <TotalLine label="Total Harga Beli" value={formatNumber(totals.hargaBeli)} />
              <TotalLine label="Total Berat" value={String(totals.berat)} />
            </View>
          </View>
          <View style={styles.footerRow}>
            <Pressable style={[styles.secondaryButton, theme.isDark && { backgroundColor: theme.colors.surfaceLow }]} onPress={() => setStep(1)}>
              <Ionicons name="arrow-back" size={17} color={theme.colors.text} />
              <Text style={[styles.secondaryButtonText, theme.isDark && { color: theme.colors.text }]}>Kembali</Text>
            </Pressable>
            <Pressable style={[styles.primaryButtonSmall, theme.isDark && { backgroundColor: theme.colors.primary }]} onPress={() => setStep(3)}>
              <Text style={styles.primaryButtonText}>Next</Text>
              <Ionicons name="chevron-forward" size={17} color="#FFFFFF" />
            </Pressable>
          </View>
        </View>
      ) : null}
      {step === 3 ? (
        <View style={styles.formStack}>
          <OptionGroup
            label="Pilih Kode Sales"
            value={kodeSales}
            options={salesPeople.map((item) => ({ value: item.kode_sales, label: `${item.kode_sales} - ${item.nama_sales}` }))}
            onChange={(value) => {
              setKodeSales(value);
              setNamaSales(salesPeople.find((item) => item.kode_sales === value)?.nama_sales ?? value);
            }}
            fallback={<Input label="" value={kodeSales} onChangeText={setKodeSales} placeholder="Kode sales" />}
          />
          <Input label="Nama Sales" value={namaSales} onChangeText={setNamaSales} placeholder="Opsional" />
          <OptionGroup
            label="Pilih Pelanggan"
            value={jenisPelanggan}
            options={[{ value: "NON MEMBER", label: "NON MEMBER" }, { value: "MEMBER", label: "MEMBER" }]}
            onChange={(value) => {
              setJenisPelanggan(value);
              if (value === "NON MEMBER") setKodeMember("NONMEMBER");
            }}
          />
          <Input label="Kode Customer" value={kodeMember} onChangeText={setKodeMember} placeholder="NONMEMBER / kode member" />
          <Pressable style={[styles.outlineButton, theme.isDark && { backgroundColor: theme.colors.surfaceLow, borderColor: theme.colors.primary }]} onPress={lookupMember}>
            <Ionicons name="search-outline" size={17} color={theme.colors.primary} />
            <Text style={[styles.outlineButtonText, theme.isDark && { color: theme.colors.primary }]}>{isLookingUpMember ? "Mencari Member..." : "Ambil Data Member"}</Text>
          </Pressable>
          <Input label="Nama Customer" value={namaCustomer} onChangeText={setNamaCustomer} placeholder="Nama customer" />
          <Input label="No HP" value={noHp} onChangeText={setNoHp} placeholder="Nomor HP" keyboardType="phone-pad" />
          <Input label="Alamat Customer" value={alamatCustomer} onChangeText={setAlamatCustomer} placeholder="Alamat customer" multiline />
          <Input label="NIK / SIM / Passport" value={nikSimPassport} onChangeText={setNikSimPassport} placeholder="Identitas customer" />
          <OptionGroup
            label="Type Pembayaran"
            value={paymentType}
            options={paymentTypes.map((type) => ({ value: type, label: type }))}
            onChange={(value) => {
              setPaymentType(value);
              if (value === "CASH") setRekening("");
            }}
          />
          {paymentType !== "CASH" ? (
            <OptionGroup
              label="No Rekening"
              value={rekening}
              options={rekenings.map((item) => ({ value: `${item.no_rekening} - ${item.kode_bank}`, label: `${item.no_rekening} - ${item.kode_bank}` }))}
              onChange={setRekening}
              fallback={<Input label="" value={rekening} onChangeText={setRekening} placeholder="No rekening" />}
            />
          ) : null}
          <Pressable style={[styles.outlineButton, theme.isDark && { backgroundColor: theme.colors.surfaceLow, borderColor: theme.colors.primary }]} onPress={searchMembers}>
            <Ionicons name="filter" size={17} color={theme.colors.primary} />
            <Text style={[styles.outlineButtonText, theme.isDark && { color: theme.colors.primary }]}>{isLookingUpMember ? "Memfilter Customer..." : "Filter Data Customer"}</Text>
          </Pressable>
          {memberResults.length ? (
            <View style={[styles.resultList, theme.isDark && { borderColor: theme.colors.outline }]}>
              {memberResults.slice(0, 5).map((member, index) => (
                <Pressable key={`${member.kode_member ?? member.kode_customer ?? index}`} style={[styles.resultRow, theme.isDark && { borderBottomColor: theme.colors.outline }]} onPress={() => applyMember(member)}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.resultTitle, theme.isDark && { color: theme.colors.text }]}>{member.nama_customer || "-"}</Text>
                    <Text style={[styles.resultSubtitle, theme.isDark && { color: theme.colors.muted }]}>{member.kode_member || member.kode_customer || "-"} • {member.no_hp || "-"}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={17} color={theme.colors.muted} />
                </Pressable>
              ))}
            </View>
          ) : null}
          <View style={styles.footerRow}>
            <Pressable style={[styles.secondaryButton, theme.isDark && { backgroundColor: theme.colors.surfaceLow }]} onPress={() => setStep(2)}>
              <Ionicons name="arrow-back" size={17} color={theme.colors.text} />
              <Text style={[styles.secondaryButtonText, theme.isDark && { color: theme.colors.text }]}>Kembali</Text>
            </Pressable>
            <Pressable style={[styles.finishButton, theme.isDark && { backgroundColor: theme.colors.primary }, isSubmitting && styles.disabledButton]} disabled={isSubmitting} onPress={submit}>
              <Ionicons name="bag-check-outline" size={18} color="#FFFFFF" />
              <Text style={styles.primaryButtonText}>{isSubmitting ? "Mengirim..." : "Selesai Pembelian"}</Text>
            </Pressable>
          </View>
        </View>
      ) : null}
    </ScrollView>
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

function Stepper({ step }: { step: 1 | 2 | 3 }) {
  const theme = useAppTheme();

  return (
    <View style={styles.stepper}>
      {(["Input Barang", "Lihat Data Barang", "Data Customer"] as const).map((label, index) => {
        const current = index + 1;
        const active = step >= current;
        return (
          <View key={label} style={styles.stepItem}>
            <View style={[
              styles.stepCircle,
              theme.isDark && { backgroundColor: theme.colors.surface },
              active && styles.stepCircleActive,
              theme.isDark && active && { backgroundColor: theme.colors.primary },
            ]}>
              <Text style={[styles.stepNumber, active && styles.stepNumberActive]}>{step > current ? "✓" : current}</Text>
            </View>
            <Text style={[styles.stepLabel, theme.isDark && { color: theme.colors.muted }, active && styles.stepLabelActive, theme.isDark && active && { color: theme.colors.primary }]}>{label}</Text>
          </View>
        );
      })}
    </View>
  );
}

function OptionGroup({ label, value, options, onChange, fallback }: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
  fallback?: ReactNode;
}) {
  const theme = useAppTheme();
  const [open, setOpen] = useState(false);
  const selected = options.find((option) => option.value === value);

  if (!options.length && fallback) {
    return <View style={styles.field}>{label ? <Text style={[styles.label, theme.isDark && { color: theme.colors.muted }]}>{label}</Text> : null}{fallback}</View>;
  }

  return (
    <View style={styles.field}>
      <Text style={[styles.label, theme.isDark && { color: theme.colors.muted }]}>{label}</Text>
      <Pressable style={[styles.selectField, theme.isDark && { backgroundColor: theme.colors.surfaceLow, borderColor: theme.colors.outline }]} onPress={() => setOpen(true)}>
        <Text style={[styles.selectValue, theme.isDark && { color: theme.colors.text }, !selected && styles.selectPlaceholder, theme.isDark && !selected && { color: theme.colors.muted }]} numberOfLines={1}>
          {selected?.label || "Pilih data"}
        </Text>
        <Ionicons name="chevron-down" size={18} color={theme.colors.muted} />
      </Pressable>
      <OptionSheet
        visible={open}
        title={label}
        options={options}
        selectedValue={value}
        onClose={() => setOpen(false)}
        onSelect={(nextValue) => {
          onChange(nextValue);
          setOpen(false);
        }}
      />
    </View>
  );
}

function OptionSheet({ visible, title, options, selectedValue, onSelect, onClose }: {
  visible: boolean;
  title: string;
  options: { value: string; label: string }[];
  selectedValue: string;
  onSelect: (value: string) => void;
  onClose: () => void;
}) {
  const theme = useAppTheme();

  return (
    <Modal animationType="slide" transparent visible={visible} onRequestClose={onClose}>
      <View style={styles.optionBackdrop}>
        <View style={[styles.optionSheet, theme.isDark && { backgroundColor: theme.colors.surface }]}>
          <View style={styles.sheetHandle} />
          <View style={[styles.sheetHeader, theme.isDark && { borderBottomColor: theme.colors.outline }]}>
            <Text style={[styles.sheetTitle, theme.isDark && { color: theme.colors.text }]}>{title}</Text>
            <Pressable onPress={onClose}>
              <Ionicons name="close" size={24} color={theme.colors.text} />
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={styles.optionContent} keyboardShouldPersistTaps="handled">
            {options.length ? options.map((option) => {
              const active = selectedValue === option.value;
              return (
                <Pressable key={option.value} style={[styles.optionRow, theme.isDark && { borderColor: theme.colors.outline }, active && styles.optionRowActive, theme.isDark && active && { backgroundColor: "rgba(16,185,129,0.12)", borderColor: theme.colors.primary }]} onPress={() => onSelect(option.value)}>
                  <Text style={[styles.optionRowTitle, theme.isDark && { color: theme.colors.text }, active && styles.optionRowTitleActive]} numberOfLines={2}>
                    {option.label}
                  </Text>
                  {active ? <Ionicons name="checkmark-circle" size={20} color={theme.colors.primary} /> : null}
                </Pressable>
              );
            }) : (
              <Text style={styles.emptyText}>Data tidak tersedia.</Text>
            )}
          </ScrollView>
        </View>
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
      <View style={styles.optionBackdrop}>
        <View style={[styles.optionSheet, theme.isDark && { backgroundColor: theme.colors.surface }]}>
          <View style={styles.sheetHandle} />
          <View style={[styles.sheetHeader, theme.isDark && { borderBottomColor: theme.colors.outline }]}>
            <Text style={[styles.sheetTitle, theme.isDark && { color: theme.colors.text }]}>{props.title}</Text>
            <Pressable onPress={props.onClose}>
              <Ionicons name="close" size={24} color={theme.colors.text} />
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={styles.optionContent} keyboardShouldPersistTaps="handled">
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
            <View style={styles.footerRow}>
              <Pressable style={[styles.secondaryButton, theme.isDark && { backgroundColor: theme.colors.surfaceLow }]} onPress={props.onClose}>
                <Text style={[styles.secondaryButtonText, theme.isDark && { color: theme.colors.text }]}>Batal</Text>
              </Pressable>
              <Pressable style={[styles.primaryButtonSmall, theme.isDark && { backgroundColor: theme.colors.primary }, props.isSubmitting && styles.disabledButton]} disabled={props.isSubmitting} onPress={submit}>
                <Text style={styles.primaryButtonText}>{props.isSubmitting ? "Memproses..." : "Otorisasi"}</Text>
              </Pressable>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function Input({ label, value, onChangeText, placeholder, keyboardType = "default", icon, multiline = false }: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  keyboardType?: "default" | "number-pad" | "decimal-pad" | "phone-pad";
  icon?: keyof typeof Ionicons.glyphMap;
  multiline?: boolean;
}) {
  const theme = useAppTheme();

  return (
    <View style={styles.field}>
      <Text style={[styles.label, theme.isDark && { color: theme.colors.muted }]}>{label}</Text>
      <View style={[styles.inputWrap, theme.isDark && { backgroundColor: theme.colors.surfaceLow, borderColor: theme.colors.outline }]}>
        <TextInput value={value} onChangeText={onChangeText} placeholder={placeholder} placeholderTextColor={theme.colors.muted} keyboardType={keyboardType} multiline={multiline} style={[styles.input, theme.isDark && { color: theme.colors.text }, multiline && styles.textarea]} />
        {icon ? <Ionicons name={icon} size={20} color={theme.colors.primary} /> : null}
      </View>
    </View>
  );
}

function CurrencyInput({ label, value, onChangeText, locked }: { label: string; value: string; onChangeText: (value: string) => void; locked?: boolean }) {
  const theme = useAppTheme();

  return (
    <View style={styles.field}>
      <Text style={[styles.label, theme.isDark && { color: theme.colors.muted }]}>{label}</Text>
      <View style={[styles.inputWrap, theme.isDark && { backgroundColor: theme.colors.surfaceLow, borderColor: theme.colors.outline }, locked && styles.lockedInput, theme.isDark && locked && { backgroundColor: "#1E293B", borderColor: theme.colors.secondary }]}>
        <Text style={styles.rp}>Rp</Text>
        <TextInput value={value ? Number(value.replace(/\D/g, "")).toLocaleString("id-ID") : ""} onChangeText={(text) => onChangeText(text.replace(/\D/g, ""))} placeholder="0" placeholderTextColor={theme.colors.muted} keyboardType="number-pad" style={[styles.currencyInput, theme.isDark && { color: theme.colors.text }]} />
        {locked ? <Ionicons name="lock-closed" size={16} color="#D97706" /> : null}
      </View>
    </View>
  );
}

function ReadOnly({ label, value }: { label: string; value: string }) {
  const theme = useAppTheme();

  return (
    <View style={styles.field}>
      <Text style={[styles.label, theme.isDark && { color: theme.colors.muted }]}>{label}</Text>
      <View style={[styles.inputWrap, styles.readOnly, theme.isDark && { backgroundColor: theme.colors.surfaceLow, borderColor: theme.colors.outline }]}>
        <Text style={[styles.readOnlyText, theme.isDark && { color: theme.colors.text }]}>{value}</Text>
      </View>
    </View>
  );
}

function Metric({ label, value, badge }: { label: string; value: string; badge?: boolean }) {
  const theme = useAppTheme();

  return (
    <View style={[styles.metric, theme.isDark && { borderColor: theme.colors.outline }]}>
      <Text style={[styles.metricLabel, theme.isDark && { color: theme.colors.muted }]}>{label}</Text>
      <Text style={[styles.metricValue, theme.isDark && { color: theme.colors.text }, badge && styles.metricBadge]}>{value}</Text>
    </View>
  );
}

function TotalLine({ label, value }: { label: string; value: string }) {
  const theme = useAppTheme();

  return (
    <View style={styles.totalLine}>
      <Text style={[styles.totalLineLabel, theme.isDark && { color: theme.colors.muted }]}>{label}</Text>
      <Text style={[styles.totalLineValue, theme.isDark && { color: theme.colors.text }]}>{value}</Text>
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

function getPurchaseAuthorizationReasons(beratNota: number, berat: number, hargaNota: number, hargaBeli: number): string[] {
  const reasons: string[] = [];
  if (Math.abs(hargaBeli - hargaNota) > 0) {
    const direction = hargaBeli > hargaNota ? "melebihi" : "kurang dari";
    reasons.push(`Harga beli ${direction} harga nota (${formatRupiah(hargaBeli)} vs ${formatRupiah(hargaNota)})`);
  }
  if (berat > beratNota) {
    reasons.push(`Berat beli melebihi berat nota (${berat} gr vs ${beratNota} gr)`);
  }
  return reasons;
}

const styles = StyleSheet.create({
  container: { backgroundColor: colors.background, gap: 14, paddingHorizontal: 12, paddingTop: Platform.OS === "ios" ? 66 : 46, paddingBottom: 32 },
  topHeader: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  headerLeft: { alignItems: "center", flexDirection: "row", gap: 10, flex: 1 },
  headerIconButton: { alignItems: "center", height: 34, justifyContent: "center", width: 34 },
  screenTitle: { color: colors.primary, flex: 1, fontSize: 20, fontWeight: "700" },
  domainNotice: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.outline,
    borderRadius: 8,
    borderWidth: 1,
    minHeight: 32,
    justifyContent: "center",
    paddingHorizontal: 12,
  },
  domainNoticeText: { color: colors.muted, fontSize: 12, fontWeight: "500", textAlign: "center" },
  domainNoticeStrong: { color: colors.primary, fontWeight: "800" },
  stepper: { flexDirection: "row", justifyContent: "space-between", marginVertical: 4 },
  stepItem: { alignItems: "center", flex: 1, gap: 7 },
  stepCircle: { alignItems: "center", backgroundColor: colors.surfaceContainer, borderRadius: 999, height: 38, justifyContent: "center", width: 38 },
  stepCircleActive: { backgroundColor: colors.primaryContainer },
  stepNumber: { color: "#FFFFFF", fontSize: 14, fontWeight: "800" },
  stepNumberActive: { color: "#FFFFFF" },
  stepLabel: { color: colors.outlineStrong, fontSize: 11, fontWeight: "700", textAlign: "center" },
  stepLabelActive: { color: colors.primary },
  formStack: { gap: 14 },
  field: { flex: 1, gap: 6 },
  label: { color: colors.muted, fontSize: 11, fontWeight: "700", letterSpacing: 0.5, textTransform: "uppercase" },
  inputWrap: { alignItems: "center", backgroundColor: colors.surface, borderColor: colors.outline, borderRadius: 12, borderWidth: 1, flexDirection: "row", minHeight: 48, paddingHorizontal: 14 },
  input: { color: colors.text, flex: 1, fontSize: 13, fontWeight: "600", minHeight: 44 },
  textarea: { minHeight: 80, paddingTop: 10, textAlignVertical: "top" },
  rp: { color: colors.outlineStrong, fontSize: 12, fontWeight: "700", marginRight: 8 },
  currencyInput: { color: colors.text, flex: 1, fontSize: 13, fontWeight: "700" },
  lockedInput: { backgroundColor: "#FFF4E8", borderColor: colors.secondaryContainer },
  readOnly: { backgroundColor: colors.surfaceLow },
  readOnlyText: { color: colors.muted, fontSize: 13, fontWeight: "700" },
  twoColumn: { flexDirection: "row", gap: 10 },
  threeColumn: { flexDirection: "row", gap: 8 },
  footerRow: { flexDirection: "row", gap: 10, marginTop: 4 },
  resetButton: { alignItems: "center", borderColor: colors.secondary, borderRadius: 12, borderWidth: 1, flex: 1, flexDirection: "row", gap: 7, justifyContent: "center", minHeight: 50 },
  resetButtonText: { color: colors.secondary, fontSize: 13, fontWeight: "700" },
  outlineButton: { alignItems: "center", borderColor: colors.primary, borderRadius: 12, borderWidth: 1, flex: 1.25, flexDirection: "row", gap: 7, justifyContent: "center", minHeight: 50 },
  outlineButtonText: { color: colors.primary, fontSize: 13, fontWeight: "700" },
  selectField: { alignItems: "center", backgroundColor: colors.surface, borderColor: colors.outline, borderRadius: 12, borderWidth: 1, flexDirection: "row", gap: 10, minHeight: 48, paddingHorizontal: 14 },
  selectValue: { color: colors.text, flex: 1, fontSize: 13, fontWeight: "700" },
  selectPlaceholder: { color: colors.outlineStrong, fontWeight: "600" },
  optionBackdrop: { backgroundColor: "rgba(15, 23, 42, 0.36)", flex: 1, justifyContent: "flex-end" },
  optionSheet: { backgroundColor: colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: "78%", paddingBottom: 18 },
  sheetHandle: { alignSelf: "center", backgroundColor: colors.outline, borderRadius: 999, height: 5, marginTop: 10, width: 48 },
  sheetHeader: { alignItems: "center", borderBottomColor: colors.outline, borderBottomWidth: 1, flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 18, paddingVertical: 14 },
  sheetTitle: { color: colors.text, fontSize: 16, fontWeight: "800" },
  optionContent: { padding: 14 },
  optionRow: { alignItems: "center", borderColor: colors.outline, borderRadius: 14, borderWidth: 1, flexDirection: "row", gap: 10, justifyContent: "space-between", marginBottom: 10, minHeight: 52, paddingHorizontal: 14 },
  optionRowActive: { backgroundColor: "#E7F8F0", borderColor: colors.primaryContainer },
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
  metricBadge: { backgroundColor: "#E7F8F0", borderRadius: 999, color: colors.primary, overflow: "hidden", paddingHorizontal: 10, paddingVertical: 2 },
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
  emptyCard: { alignItems: "center", backgroundColor: "rgba(242, 244, 246, 0.45)", borderColor: colors.outline, borderRadius: 16, borderStyle: "dashed", borderWidth: 2, gap: 8, padding: 20 },
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

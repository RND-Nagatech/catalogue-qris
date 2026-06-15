import { type ReactNode, useCallback, useMemo, useState } from "react";
import { Alert, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useFocusEffect } from "expo-router";
import {
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
  raw?: Record<string, unknown>;
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

export default function Purchases() {
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
  const [kondisi, setKondisi] = useState("MULUS");
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
          if (!kodeToko && nextTokos[0]?.kode_toko) setKodeToko(nextTokos[0].kode_toko);
          if (!kodeJenis && nextJenis[0]?.kode_dept) {
            setKodeJenis(`${nextJenis[0].kode_dept} - ${nextJenis[0].nama_dept}`);
            setNamaBarang(nextJenis[0].nama_dept ?? "");
          }
          if (!kondisi && nextKondisi[0]?.kondisi_barang) setKondisi(nextKondisi[0].kondisi_barang);
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
    setHargaBeli(String(nextHargaNota || Number(item.harga_total ?? 0) || ""));

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

  const addItem = async () => {
    const nextBerat = parseDecimal(berat);
    const nextBeratNota = parseDecimal(beratNota) || nextBerat;
    const nextHargaBeli = parseCurrency(hargaBeli);
    const nextHargaNota = parseCurrency(hargaNota) || nextHargaBeli;
    if (!kodeBarcode.trim() || !namaBarang.trim() || nextBerat <= 0 || nextHargaBeli <= 0) {
      Alert.alert("Data barang belum lengkap", "Barcode, nama barang, berat, dan harga beli wajib diisi.");
      return;
    }
    setItems([...items, {
      id: `BUY-${Date.now()}`,
      kodeBarcode: kodeBarcode.trim(),
      noFakturJual: `FAK-${Date.now()}`,
      kodeJenis: kodeJenis.trim() || "ABB",
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
      potonganKondisiBeli: kondisiList.find((item) => item.kondisi_barang === kondisi)?.persentase ?? 0,
      kodeHargaBeli: "-",
      raw: purchaseRaw ?? undefined,
    }]);
    resetItemForm();
    await Haptics.selectionAsync();
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
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <View style={styles.header}>
        <Text style={styles.screenTitle}>Transaksi Pembelian</Text>
        <Text style={styles.screenSubtitle}>{domain ? (isLoadingMaster ? "Memuat master NAGAGOLD..." : domain) : "Atur domain NAGAGOLD di Pengaturan"}</Text>
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
              onChange={setTypeKondisi}
            />
            <OptionGroup
              label="Kondisi"
              value={kondisi}
              options={kondisiList.map((item) => ({ value: item.kondisi_barang, label: item.kondisi_barang }))}
              onChange={setKondisi}
              fallback={<Input label="" value={kondisi} onChangeText={setKondisi} placeholder="MULUS" />}
            />
          </View>
          <OptionGroup
            label="Kode Jenis"
            value={kodeJenis}
            options={jenisList.slice(0, 8).map((item) => ({ value: `${item.kode_dept} - ${item.nama_dept}`, label: `${item.kode_dept} - ${item.nama_dept}` }))}
            onChange={(value) => {
              setKodeJenis(value);
              const selected = jenisList.find((item) => value.startsWith(item.kode_dept));
              if (selected?.nama_dept && !namaBarang) setNamaBarang(selected.nama_dept);
            }}
            fallback={<Input label="" value={kodeJenis} onChangeText={setKodeJenis} placeholder="ABB - KL BORSA" />}
          />
          <Input label="Nama Barang" value={namaBarang} onChangeText={setNamaBarang} placeholder="Nama barang" />
          <View style={styles.twoColumn}>
            <Input label="Kadar" value={kadar} onChangeText={setKadar} placeholder="100" keyboardType="decimal-pad" />
            <Input label="Kadar Modal" value={kadarModal} onChangeText={setKadarModal} placeholder="0" keyboardType="decimal-pad" />
          </View>
          <View style={styles.threeColumn}>
            <Input label="Kadar Cetak" value={kadarCetak} onChangeText={setKadarCetak} placeholder="100" keyboardType="decimal-pad" />
            <Input label="Berat Nota" value={beratNota} onChangeText={setBeratNota} placeholder="0" keyboardType="decimal-pad" />
            <Input label="Berat" value={berat} onChangeText={setBerat} placeholder="0" keyboardType="decimal-pad" />
          </View>
          <CurrencyInput label="Harga Nota" value={hargaNota} onChangeText={setHargaNota} locked />
          <CurrencyInput label="Harga Beli" value={hargaBeli} onChangeText={setHargaBeli} />
          <View style={styles.twoColumn}>
            <ReadOnly label="Harga Rata" value={formatRupiah(hargaRata)} />
            <ReadOnly label="Harga Atribut" value={formatRupiah(hargaRata)} />
          </View>
          <View style={styles.footerRow}>
            <Pressable style={styles.resetButton} onPress={resetItemForm}>
              <Ionicons name="refresh" size={17} color="#D97706" />
              <Text style={styles.resetButtonText}>Reset</Text>
            </Pressable>
            <Pressable style={styles.outlineButton} onPress={addItem}>
              <Ionicons name="save-outline" size={17} color="#047857" />
              <Text style={styles.outlineButtonText}>Simpan Barang</Text>
            </Pressable>
            <Pressable style={styles.primaryButtonSmall} onPress={() => setStep(2)}>
              <Text style={styles.primaryButtonText}>Next</Text>
              <Ionicons name="chevron-forward" size={17} color="#FFFFFF" />
            </Pressable>
          </View>
        </View>
      ) : null}
      {step === 2 ? (
        <View style={styles.formStack}>
          <View style={styles.searchBox}>
            <TextInput placeholder="Cari data..." placeholderTextColor="#94A3B8" style={styles.searchInput} />
            <Ionicons name="search-outline" size={20} color="#64748B" />
          </View>
          {items.length ? items.map((item) => (
            <View key={item.id} style={styles.itemCard}>
              <View style={styles.itemHead}>
                <View>
                  <Text style={styles.itemName}>{item.namaBarang}</Text>
                  <Text style={styles.itemMeta}>Kode: {item.kodeBarcode}  ·  Jenis {item.kodeJenis}</Text>
                </View>
                <Pressable onPress={() => setItems(items.filter((next) => next.id !== item.id))}>
                  <Ionicons name="trash-outline" size={20} color="#DC2626" />
                </Pressable>
              </View>
              <View style={styles.metricGrid}>
                <Metric label="Harga Nota" value={formatNumber(item.hargaNota)} />
                <Metric label="Berat Nota" value={String(item.beratNota)} />
                <Metric label="Harga Rata" value={formatNumber(Math.floor(item.hargaBeli / item.berat))} />
                <Metric label="Berat" value={String(item.berat)} />
                <Metric label="Harga Beli" value={formatNumber(item.hargaBeli)} />
                <Metric label="Kondisi" value={item.kondisi} badge />
              </View>
            </View>
          )) : (
            <View style={styles.emptyCard}>
              <Ionicons name="cube-outline" size={32} color="#94A3B8" />
              <Text style={styles.emptyTitle}>Belum ada barang</Text>
              <Text style={styles.emptyText}>Kembali ke Input Barang untuk menambahkan barang.</Text>
            </View>
          )}
          <View style={styles.totalCard}>
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
            <Pressable style={styles.secondaryButton} onPress={() => setStep(1)}>
              <Ionicons name="arrow-back" size={17} color="#0F172A" />
              <Text style={styles.secondaryButtonText}>Kembali</Text>
            </Pressable>
            <Pressable style={styles.primaryButtonSmall} onPress={() => setStep(3)}>
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
          <Pressable style={styles.outlineButton} onPress={lookupMember}>
            <Ionicons name="search-outline" size={17} color="#047857" />
            <Text style={styles.outlineButtonText}>{isLookingUpMember ? "Mencari Member..." : "Ambil Data Member"}</Text>
          </Pressable>
          <Input label="Nama Customer" value={namaCustomer} onChangeText={setNamaCustomer} placeholder="Nama customer" />
          <Input label="No HP" value={noHp} onChangeText={setNoHp} placeholder="Nomor HP" keyboardType="phone-pad" />
          <Input label="Alamat Customer" value={alamatCustomer} onChangeText={setAlamatCustomer} placeholder="Alamat customer" multiline />
          <Input label="NIK / SIM / Passport" value={nikSimPassport} onChangeText={setNikSimPassport} placeholder="Identitas customer" />
          <Text style={styles.sectionTitle}>Type Pembayaran</Text>
          <View style={styles.paymentGrid}>
            {paymentTypes.map((type) => (
              <Pressable key={type} style={[styles.paymentOption, paymentType === type && styles.paymentOptionActive]} onPress={() => setPaymentType(type)}>
                <Ionicons name={paymentIcon(type)} size={22} color={paymentType === type ? "#047857" : "#64748B"} />
                <Text style={[styles.paymentText, paymentType === type && styles.paymentTextActive]}>{type}</Text>
              </Pressable>
            ))}
          </View>
          {paymentType !== "CASH" ? (
            <OptionGroup
              label="No Rekening"
              value={rekening}
              options={rekenings.map((item) => ({ value: `${item.no_rekening} - ${item.kode_bank}`, label: `${item.no_rekening} - ${item.kode_bank}` }))}
              onChange={setRekening}
              fallback={<Input label="" value={rekening} onChangeText={setRekening} placeholder="No rekening" />}
            />
          ) : null}
          <Pressable style={styles.outlineButton} onPress={searchMembers}>
            <Ionicons name="filter" size={17} color="#047857" />
            <Text style={styles.outlineButtonText}>{isLookingUpMember ? "Memfilter Customer..." : "Filter Data Customer"}</Text>
          </Pressable>
          {memberResults.length ? (
            <View style={styles.resultList}>
              {memberResults.slice(0, 5).map((member, index) => (
                <Pressable key={`${member.kode_member ?? member.kode_customer ?? index}`} style={styles.resultRow} onPress={() => applyMember(member)}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.resultTitle}>{member.nama_customer || "-"}</Text>
                    <Text style={styles.resultSubtitle}>{member.kode_member || member.kode_customer || "-"} • {member.no_hp || "-"}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={17} color="#64748B" />
                </Pressable>
              ))}
            </View>
          ) : null}
          <View style={styles.footerRow}>
            <Pressable style={styles.secondaryButton} onPress={() => setStep(2)}>
              <Ionicons name="arrow-back" size={17} color="#0F172A" />
              <Text style={styles.secondaryButtonText}>Kembali</Text>
            </Pressable>
            <Pressable style={[styles.finishButton, isSubmitting && styles.disabledButton]} disabled={isSubmitting} onPress={submit}>
              <Ionicons name="bag-check-outline" size={18} color="#FFFFFF" />
              <Text style={styles.primaryButtonText}>{isSubmitting ? "Mengirim..." : "Selesai Pembelian"}</Text>
            </Pressable>
          </View>
        </View>
      ) : null}
    </ScrollView>
  );
}

function Stepper({ step }: { step: 1 | 2 | 3 }) {
  return (
    <View style={styles.stepper}>
      {(["Input Barang", "Lihat Data Barang", "Data Customer"] as const).map((label, index) => {
        const current = index + 1;
        const active = step >= current;
        return (
          <View key={label} style={styles.stepItem}>
            <View style={[styles.stepCircle, active && styles.stepCircleActive]}>
              <Text style={[styles.stepNumber, active && styles.stepNumberActive]}>{step > current ? "✓" : current}</Text>
            </View>
            <Text style={[styles.stepLabel, active && styles.stepLabelActive]}>{label}</Text>
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
  if (!options.length && fallback) {
    return <View style={styles.field}>{label ? <Text style={styles.label}>{label}</Text> : null}{fallback}</View>;
  }

  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.optionWrap}>
        {options.map((option) => (
          <Pressable
            key={option.value}
            style={[styles.optionButton, value === option.value && styles.optionButtonActive]}
            onPress={() => onChange(option.value)}
          >
            <Text style={[styles.optionText, value === option.value && styles.optionTextActive]} numberOfLines={1}>
              {option.label}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
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
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.inputWrap}>
        <TextInput value={value} onChangeText={onChangeText} placeholder={placeholder} placeholderTextColor="#94A3B8" keyboardType={keyboardType} multiline={multiline} style={[styles.input, multiline && styles.textarea]} />
        {icon ? <Ionicons name={icon} size={20} color="#059669" /> : null}
      </View>
    </View>
  );
}

function CurrencyInput({ label, value, onChangeText, locked }: { label: string; value: string; onChangeText: (value: string) => void; locked?: boolean }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.inputWrap, locked && styles.lockedInput]}>
        <Text style={styles.rp}>Rp</Text>
        <TextInput value={value ? Number(value.replace(/\D/g, "")).toLocaleString("id-ID") : ""} onChangeText={(text) => onChangeText(text.replace(/\D/g, ""))} placeholder="0" placeholderTextColor="#94A3B8" keyboardType="number-pad" style={styles.currencyInput} />
        {locked ? <Ionicons name="lock-closed" size={16} color="#D97706" /> : null}
      </View>
    </View>
  );
}

function ReadOnly({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.inputWrap, styles.readOnly]}>
        <Text style={styles.readOnlyText}>{value}</Text>
      </View>
    </View>
  );
}

function Metric({ label, value, badge }: { label: string; value: string; badge?: boolean }) {
  return (
    <View style={styles.metric}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={[styles.metricValue, badge && styles.metricBadge]}>{value}</Text>
    </View>
  );
}

function TotalLine({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.totalLine}>
      <Text style={styles.totalLineLabel}>{label}</Text>
      <Text style={styles.totalLineValue}>{value}</Text>
    </View>
  );
}

function paymentIcon(type: string): keyof typeof Ionicons.glyphMap {
  if (type === "TRANSFER") return "business-outline";
  if (type === "QRIS") return "qr-code-outline";
  if (type === "DEBIT") return "card-outline";
  return "wallet-outline";
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

const styles = StyleSheet.create({
  container: { backgroundColor: colors.background, gap: 16, paddingHorizontal: 16, paddingTop: Platform.OS === "ios" ? 74 : 54, paddingBottom: 32 },
  header: { gap: 3 },
  screenTitle: { color: colors.primary, fontSize: 22, fontWeight: "700" },
  screenSubtitle: { color: colors.muted, fontSize: 12, fontWeight: "500" },
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
  optionWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  optionButton: { alignItems: "center", backgroundColor: colors.surface, borderColor: colors.outline, borderRadius: 999, borderWidth: 1, justifyContent: "center", minHeight: 38, maxWidth: "100%", paddingHorizontal: 12 },
  optionButtonActive: { backgroundColor: "#E7F8F0", borderColor: colors.primaryContainer },
  optionText: { color: colors.muted, fontSize: 12, fontWeight: "700", maxWidth: 220 },
  optionTextActive: { color: colors.primary },
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
  paymentGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  paymentOption: { alignItems: "center", backgroundColor: colors.surface, borderColor: colors.outline, borderRadius: 14, borderWidth: 1, flex: 1, gap: 6, minHeight: 82, justifyContent: "center", minWidth: "22%" },
  paymentOptionActive: { backgroundColor: "#E7F8F0", borderColor: colors.primaryContainer },
  paymentText: { color: colors.muted, fontSize: 12, fontWeight: "800" },
  paymentTextActive: { color: colors.primary },
  finishButton: { alignItems: "center", backgroundColor: colors.primaryContainer, borderRadius: 12, flex: 1.4, flexDirection: "row", gap: 7, justifyContent: "center", minHeight: 50 },
  disabledButton: { opacity: 0.6 },
});

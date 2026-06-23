# qris-payment

## NAGAGOLD connection

- Simpan domain program NAGAGOLD dari menu Pengaturan, contoh `https://qc-sambaspwj.ngtc-si.com`.
- Simpan `TOKEN_PUSAT` di `.env` backend, bukan sebagai `EXPO_PUBLIC`, supaya token tidak ikut masuk bundle Expo.
- Menu Penjualan dan Pembelian mengirim transaksi ke backend QRIS, lalu backend meneruskan ke endpoint NAGAGOLD memakai token pusat.

# Android Keystore — Catalogue Multi Store

## Informasi Keystore

| Key | Value |
|---|---|
| **File** | `android/app/catalogue.keystore` |
| **Alias** | `catalogue` |
| **Password** | `catalogue123` |
| **Key Password** | `catalogue123` |
| **Algorithm** | RSA 2048-bit |
| **Validity** | 10,000 hari (~27 tahun) |
| **CN** | Catalogue Multi Store |
| **OU** | Dev |
| **O** | Nagatech |
| **L** | Bandung |
| **ST** | Jawa Barat |
| **C** | ID |

## File Konfigurasi

### `android/keystore.properties`
```
storeFile=catalogue.keystore
storePassword=catalogue123
keyAlias=catalogue
keyPassword=catalogue123
```

> ⚠️ **PENTING**: File `android/keystore.properties` SUDAH di-gitignore (via `android/.gitignore`). Jangan commit file ini atau `catalogue.keystore` ke git.

## Cara Build Release

```bash
cd mobile
export JAVA_HOME=/Library/Java/JavaVirtualMachines/zulu-17.jdk/Contents/Home

# Build release APK
cd android && ./gradlew assembleRelease

# APK output:
# android/app/build/outputs/apk/release/app-release.apk
```

## Cara Build via Expo

```bash
cd mobile
npx expo run:android --variant release
```

## Google Play Signing (Future)

Saat upload ke Google Play pertama kali:
1. Google Play akan menawarkan **Play App Signing** (rekomendasi: **terima**)
2. Google akan generate signing key baru dan menyimpannya
3. Keystore lokal (`catalogue.keystore`) hanya digunakan sebagai **upload key**
4. Key upload bisa di-reset jika hilang (hubungi Google Play support)

## Backup Keystore

Simpan `catalogue.keystore` & `keystore.properties` di tempat aman:
- ✅ External drive / USB
- ✅ Password manager (1Password, Bitwarden)
- ✅ Private cloud storage (bukan public repo)
- ❌ JANGAN commit ke Git

## Verifikasi APK

```bash
# Cek signature APK
keytool -printcert -jarfile android/app/build/outputs/apk/release/app-release.apk

# Cek fingerprint SHA-256
keytool -list -v -keystore android/app/catalogue.keystore -alias catalogue -storepass catalogue123 | grep SHA256
```

## Install ke android lewat adb
```bash
adb install -r /Volumes/nagatechExternal/WORK/Mobile/Nagatech/catalogue_multi_store/mobile/android/app/build/outputs/apk/release/app-release.apk
```

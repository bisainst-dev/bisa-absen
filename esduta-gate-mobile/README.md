# Esduta Gate - Mobile Android App (Expo & EAS Build)

Proyek ini adalah *Native Android WebView Wrapper* untuk aplikasi **Esduta Gate** yang mengarah ke:
`https://bisa-absen.vercel.app/`

---

## Fitur Mobile
- **Full Screen & Responsive**: Disesuaikan dengan layar smartphone Android.
- **Android Hardware Back Button**: Navigasi mundur halaman web saat menekan tombol back, dan konfirmasi tekan 2x untuk keluar aplikasi.
- **Status Bar Integration**: Warna status bar selaras dengan tema aplikasi.
- **Persistent Storage**: IndexedDB, LocalStorage, dan Cookie sesi tersimpan permanen di HP.
- **Izin Lengkap**: Kamera (scan QR/foto), Penyimpanan berkas, dan Akses Jaringan.
- **Offline / Error Fallback**: Layar ramah pengguna jika koneksi internet terputus dengan tombol coba lagi.

---

## Panduan Build ke APK Android via Expo.dev (EAS Build)

### 1. Masuk ke Folder Proyek Mobile
Buka terminal Anda dan masuk ke direktori:
```bash
cd "d:\Vibe Coding\Absensi Guru\esduta-gate-mobile"
```

### 2. Login ke Akun Expo Anda
Jika Anda belum memasang EAS CLI secara global, pasang terlebih dahulu:
```bash
npm install -g eas-cli
```
Lalu login ke akun Anda yang terdaftar di [https://expo.dev/](https://expo.dev/):
```bash
eas login
```

### 3. Konfigurasi Proyek EAS (Hanya pertama kali)
Jalankan perintah ini untuk mengaitkan proyek ke akun Expo Anda:
```bash
eas init
```
*(Pilih 'Yes' atau buat proyek baru saat ditanya).*

### 4. Mulai Build Berkas .APK
Jalankan perintah berikut untuk mem-build berkas **APK mandiri** (langsung bisa diinstal di HP tanpa lewat Play Store):
```bash
eas build -p android --profile preview
```

### 5. Unduh Berkas .APK
1. Tunggu proses build selesai di cloud Expo (biasanya 5–10 menit).
2. Terminal akan menampilkan tautan unduhan langsung berkas `.apk` (atau buka dashboard di [https://expo.dev/](https://expo.dev/) pada tab **Builds**).
3. Pindahkan file `.apk` ke ponsel Android Anda dan pasang (install).

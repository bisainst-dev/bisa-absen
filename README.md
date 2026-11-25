# 📱 BISA Absen - Asisten Administrasi Harian Guru

**BISA Absen** adalah aplikasi web *production-ready*, *mobile-first*, dan *offline-first* yang dirancang khusus sebagai asisten administrasi harian guru di Indonesia. Aplikasi ini mengotomatisasi pencatatan absensi, jurnal mengajar, input nilai siswa, jadwal pelajaran, kegiatan ekstrakurikuler/les, pengingat mengajar berbasis suara (TTS), serta rekap dan unduh dokumen resmi (PDF A4, Excel .xlsx, dan Word .docx) lengkap dengan kop sekolah dan lembar tanda tangan.

---

## 🌟 Keunggulan Utama & Privasi

1. **100% Offline-First (Tanpa Backend & Bebas Kuota)**
   - Semua data disimpan secara lokal di perangkat Anda melalui **IndexedDB (Dexie.js)**.
   - Tidak ada pengiriman data pribadi siswa atau guru ke server luar. Data guru sepenuhnya menjadi milik guru.
2. **Progressive Web App (PWA)**
   - Dapat dipasang (*Install to Home Screen*) di ponsel Android, iPhone, tablet, maupun laptop/desktop.
   - Tetap bekerja lancar di dalam kelas meski tidak ada jaringan internet.
3. **Format Dokumen Resmi Siap Cetak (Kop & TTD)**
   - Rekap absensi dan nilai dapat diekspor langsung ke **PDF A4**, **Excel (.xlsx)**, dan **Word (.docx)**.
   - Memiliki Kop Sekolah resmi, Tahun Pelajaran, Semester, serta blok tanda tangan Kepala Sekolah dan Guru Pengampu.
4. **Pencadangan Berintegritas Tinggi**
   - Ekspor seluruh basis data ke file `.backup.json` berpenanda versi dan checksum deterministik (FNV-1a / DJB2).
   - Validasi ketat saat pemulihan (*restore*) untuk mencegah kerusakan data atau manipulasi berkas.
5. **Pengingat Mengajar Jujur & Ramah**
   - Pengingat berbasis peramban dengan nada *chime* Web Audio, Web Notification API, serta **Web Speech API (Bahasa Indonesia)** yang menyapa nama guru secara personal.
   - Dilengkapi detektor **Pengingat Terlewat** saat aplikasi baru dibuka kembali.

---

## 📋 Fitur & Modul Aplikasi

| Modul | Deskripsi Fitur |
|---|---|
| **Onboarding 3 Langkah** | Pendaftaran praktis profil guru, sekolah, NIP, serta pemilihan kelas yang diampu. |
| **Beranda Dinamis** | Sapaan ramah sesuai waktu (Pagi/Siang/Sore/Malam), jadwal mengajar hari ini, agenda les/ekskul, aksi cepat, dan status cadangan data. |
| **Kelola Siswa & Kelas** | Manajemen data siswa (L/P), filter kelas, serta **Impor Excel Cepat (< 2 detik untuk 100 siswa)** disertai template unduhan dan validasi baris otomatis. |
| **Jadwal Mengajar** | Manajemen jadwal per hari (Senin–Minggu), durasi jam pelajaran, pengaturan pengingat, dan fitur **Salin Jadwal ke Hari Lain** secara non-destruktif. |
| **Absensi Kelas** | Siklus kehadiran cepat dengan ketukan tunggal `Hadir (H) -> Sakit (S) -> Izin (I) -> Alfa (A)`, tombol `Semua Hadir`, dan ringkasan persentase kehadiran *real-time*. |
| **Jurnal Mengajar** | Pencatatan materi yang diajarkan, catatan untuk pertemuan berikutnya, filter tanggal, dan riwayat jurnal kelas. |
| **Daftar Nilai Siswa** | Tabel input nilai dinamis yang ramah keyboard dengan kolom Tugas (`T1..Tn`) dan Penilaian Harian (`PH1..PHn`) serta rata-rata otomatis per siswa. |
| **Ekstrakurikuler & Les** | Pengelolaan kegiatan tambahan dengan anggota lintas kelas, absensi kegiatan terpisah, dan jurnal kegiatan mandiri. |
| **Catatan & Pengingat** | Agenda pengingat guru dengan pengulangan sekali, harian, atau mingguan. |
| **Rekap & Unduh Dokumen** | Pratinjau (*preview*) dokumen langsung di layar sebelum mengunduh ke format PDF A4 rapi, lembar kerja Excel, atau naskah Word. |
| **Cadangan & Pulihkan** | Ekspor ke file `.backup.json` ber-checksum, validasi format, pulihkan data, serta peringatan berkala jika data belum dicadangkan > 7 hari. |
| **Pengaturan & Personalisasi** | Biodata guru & kepala sekolah, saklar kredit dokumen, mode tampilan (Terang / Gelap / Otomatis), dan uji coba pengingat suara. |

---

## 🛠️ Tech Stack

- **Framework**: React 19 + TypeScript + Vite
- **Styling**: Tailwind CSS (Font Nunito, palet emerald-teal tenang, dark mode class-based, target sentuh $\ge 44\text{px}$)
- **Routing & State**: React Router v7, Zustand
- **Penyimpanan Lokal**: Dexie.js (IndexedDB) dengan arsitektur tabel generik `records`
- **PWA Engine**: `vite-plugin-pwa` (Service Worker caching, auto-update, webmanifest)
- **Ekspor Dokumen**:
  - `xlsx` (SheetJS) untuk lembar kerja Excel
  - `jspdf` & `jspdf-autotable` untuk dokumen PDF A4
  - `docx` untuk dokumen Microsoft Word
- **Tanggal & Validasi**: `date-fns` (locale `id`), `zod`
- **Audio & Suara**: Web Audio API (sintesis nada chime internal), Web Speech API (`id-ID`)
- **Unit Testing**: Vitest (44 tests passing)

---

## 📁 Struktur Basis Data (Generic Records)

Aplikasi menggunakan skema satu tabel generik terindeks untuk memudahkan sinkronisasi dan pencadangan:

```typescript
interface GenericRecord<T = unknown> {
  id: string;          // UUID v4
  kind: string;        // 'profil' | 'siswa' | 'kelas' | 'jadwal' | 'absensi' | 'jurnal' | 'nilai' | 'kegiatan' | 'catatan' | 'pengaturan'
  data: T;             // Objek tervalidasi Zod schema
  updatedAt: number;   // Timestamp milidetik
  deleted: 0 | 1;      // Soft delete flag
  dirty: 0 | 1;        // Sync flag untuk masa mendatang
}
```

---

## 🚀 Panduan Memulai & Menjalankan

### 1. Prasyarat
- Node.js versi 18 ke atas
- npm (atau pnpm / yarn)

### 2. Instalasi Dependensi
```bash
npm install
```

### 3. Menjalankan Server Pengembangan (Dev)
```bash
npm run dev
```
Aplikasi akan aktif di `http://localhost:5173/`.

### 4. Menjalankan Pengujian Otomatis (Unit Tests)
```bash
npm test
```
*Catatan: Konfigurasi pengujian menggunakan `--pool=forks` untuk kompatibilitas penuh di Windows dan Linux.*

### 5. Membangun Berkas Produksi (Build)
```bash
npm run build
```
Hasil build produksi yang telah dioptimalkan dengan pemisahan chunk vendor (`vendor-react`, `vendor-db`, `vendor-xlsx`, `vendor-pdf`, `vendor-docx`) dan PWA Service Worker akan berada di folder `dist/`.

---

## 📱 Panduan Pemasangan PWA (Install App)

1. **Di Google Chrome / Microsoft Edge (Desktop & Android)**:
   - Buka aplikasi di peramban.
   - Klik ikon **Pasang / Install** di bilah alamat peramban (atau menu titik tiga $\rightarrow$ "Tambahkan ke Layar Utama" / "Install BISA Absen").
2. **Di Safari (iPhone / iPad)**:
   - Buka aplikasi di Safari.
   - Ketuk tombol **Bagikan (Share)** di bagian bawah layar.
   - Gulir ke bawah dan pilih **Tambah ke Layar Utama (Add to Home Screen)**.

---

## 📄 Lisensi
Hak Cipta © 2026 BISA Absen. Dibuat dengan dedikasi untuk mendukung kemudahan administrasi tenaga pendidik di seluruh Indonesia.

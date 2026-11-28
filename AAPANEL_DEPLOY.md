# 🚀 Panduan Submit & Deploy di aaPanel (Full Stack: Node.js / Express & MySQL)

Proyek ini telah dikonfigurasi secara penuh untuk berjalan di **aaPanel** menggunakan **Node.js Project Manager (PM2)** dan database **MySQL / MariaDB**.

---

## 📋 Ringkasan Arsitektur
- **Backend & Web Server**: `server.js` (Express.js)
  - Melayani REST API di `/api/*`
  - Melayani website frontend (SPA) dari folder `dist/`
  - Terhubung langsung ke MySQL di localhost VPS
- **Database**: MySQL / MariaDB (aaPanel Database Manager)
- **Port Default**: `3000` (atau port pilihan Anda di `.env`)
- **Proses Manager**: PM2 otomatis via aaPanel Node Project Manager

---

## 🛠️ Langkah-Langkah Deploy di aaPanel

### 1. Buat Database MySQL di aaPanel
1. Buka dashboard **aaPanel**.
2. Masuk ke menu **Database** di bilah kiri.
3. Klik tombol **Add Database**:
   - **DB Name**: `bisa_absen`
   - **DB User**: `bisa_absen` (atau biarkan default)
   - **Password**: *(Buat password aman dan catat)*
   - **Character Set**: `utf8mb4`
4. Klik **Submit**.
5. *(Opsional)*: Klik tombol **Import** pada database `bisa_absen`, lalu unggah file `database/schema_mysql.sql`.
   *(Catatan: `server.js` juga dapat membuat tabel `records` secara otomatis jika database kosong).*

---

### 2. Upload / Clone Proyek ke aaPanel
1. Di aaPanel, masuk ke menu **Files**.
2. Masuk ke direktori web Anda, misalnya `/www/wwwroot/`.
3. Buat folder `bisa-absen` dan upload file proyek (atau clone via Git).
4. Buat file `.env` di dalam folder proyek tersebut:
   ```env
   PORT=3000
   DB_HOST=127.0.0.1
   DB_PORT=3306
   DB_USER=bisa_absen
   DB_PASSWORD=password_database_anda
   DB_NAME=bisa_absen
   ```

---

### 3. Install Dependensi & Build
Buka **Terminal** di aaPanel (atau via SSH) dan jalankan:
```bash
cd /www/wwwroot/bisa-absen
npm install
npm run build
```

---

### 4. Tambahkan Node Project di aaPanel
1. Masuk ke menu **Node Project** di bilah kiri aaPanel.
   *(Jika belum ada, install plugin **Node.js Version Manager** dari App Store aaPanel, pilih Node v18 atau v20).*
2. Klik tombol **Add Node Project**:
   - **Project Name**: `bisa-absen`
   - **Path**: `/www/wwwroot/bisa-absen`
   - **Run opt**: `server.js` (atau jalankan script `npm start`)
   - **Port**: `3000`
   - **Run User**: `www`
   - **Domain name**: Masukkan domain / subdomain Anda (contoh: `absen.sekolah.sch.id`)
3. Klik **Submit**.
4. aaPanel akan otomatis mengatur **Reverse Proxy Nginx** sehingga domain Anda langsung mengarah ke server Node.js di port 3000.

---

### 5. Pasang SSL (HTTPS)
1. Di menu **Node Project**, klik nama project Anda.
2. Masuk ke tab **SSL**, pilih **Let's Encrypt**, centang domain Anda, lalu klik **Apply**.
3. Aktifkan toggle **Force HTTPS**.

---

## 🔍 Pengujian & Verifikasi
- Buka browser dan akses: `https://domain-anda.com/api/health`
- Respons JSON yang benar:
  ```json
  {
    "status": "ok",
    "server": "aaPanel / Node.js Express",
    "database": "mysql",
    "mysqlConnected": true,
    "timestamp": 1732000000000
  }
  ```
- Sekarang setiap guru atau admin yang login dari perangkat atau browser apa pun akan langsung menyimpan dan membaca data yang sama di database MySQL aaPanel Anda!

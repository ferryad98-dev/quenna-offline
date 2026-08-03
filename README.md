# 🍌 PISANG MADU QUEENA — Aplikasi Kasir Mobile

Aplikasi kasir berbasis **mobile web (PWA)** untuk usaha jualan online **PISANG MADU QUEENA**:

- 🛒 **Kasir** — pilih menu (dengan foto asli), hitung otomatis, bayar **tunai**, hitung kembalian
- 🖨 **Cetak struk Bluetooth** — printer thermal 58mm (ESC/POS via Web Bluetooth)
- 🧾 **Riwayat transaksi** — omset & jumlah transaksi hari ini, cetak ulang struk
- 🍌 **Kelola menu** — tambah / edit / hapus / aktif-nonaktifkan menu & harga, lengkap dengan **foto menu asli**
- 🏷 **Kelola kategori** — tambah / edit / hapus kategori (mis. Pisang Goreng, Pisang Bakar, Pisang Katsu). Rename kategori otomatis mengikuti semua menunya
- 📷 **Foto menu asli** — upload foto dari galeri HP → otomatis dikecilkan → tersimpan di Google Drive → tampil di aplikasi (bukan emoji)
- ⚙️ **Pengaturan** — data toko di struk, koneksi server, tes printer
- 📴 **Offline-ready** — transaksi tetap jalan saat internet mati, otomatis tersinkron saat online
- 📲 **Bisa di-install** ke layar utama HP (seperti aplikasi native)


> ⚙️ **Catatan teknis**: semua komunikasi aplikasi ↔ GAS memakai **GET (query string)**, bukan POST.
> Google Apps Script sering me-redirect permintaan POST sehingga data bisa hilang (error 405); GET terbukti selalu aman. Pastikan `Code.gs` di Apps Script sudah versi terbaru yang mendukung parameter `payload`.


> 🔧 **Fix penting (v1.6.1)**: `saveSale_` di `Code.gs` sebelumnya error *"Cannot access 'tanggal' before initialization"* karena urutan deklarasi — akibatnya transaksi tidak bisa masuk spreadsheet. Sudah diperbaiki: `tanggal`/`jam` dideklarasikan sebelum dipakai. **WAJIB redeploy Code.gs** (Deploy → Manage deployments → New version) setelah mengganti file.


> 🔧 **Fix penting (v1.6.2)**: `saveSettings_` di `Code.gs` menyimpan nama toko dengan kunci `NAMATOKO` (tanpa underscore) padahal pembacaan memakai `NAMA_TOKO` — akibatnya **edit nama toko tidak pernah tersimpan** dan selalu kembali ke default. Sudah diperbaiki (kunci konsisten `NAMA_TOKO`). Fungsi `saveSettings_` sebelumnya juga tidak sengaja terkomentar — sudah diaktifkan. **WAJIB redeploy Code.gs** setelah mengganti file.

> 🔄 **Sinkron 2 arah**: edit langsung di spreadsheet (menu/kategori/transaksi/data toko) akan tampil di aplikasi dalam ±30 detik (auto-sync), atau langsung dengan tombol **📥 Muat Ulang Data** di Pengaturan → Data.

## Arsitektur

```
[HP / Browser (Chrome Android)]
        │  PWA (HTML+CSS+JS) — dihosting di Vercel (via GitHub)
        │  cetak struk → Web Bluetooth → printer thermal
        │  foto menu   → Google Drive (via backend)
        ▼
[Google Apps Script Web App]  ← backend API (doGet/doPost JSON)
        ▼
[Google Spreadsheet]          ← database (sheet: MENU, KATEGORI, TRANSAKSI, SETTINGS)
```

---

## Langkah 1 — Siapkan Database & Backend (Google Apps Script)

1. Buka [sheets.new](https://sheets.new) → buat spreadsheet baru (nama bebas, misal `DB PISANG MADU QUEENA`).
2. Buka menu **Ekstensi → Apps Script**.
3. Hapus isi editor, lalu **tempel seluruh isi file [`gas/Code.gs`](gas/Code.gs)**.
4. Simpan (Ctrl+S), lalu klik **Deploy → New deployment**:
   - **Description**: `kasir`
   - **Execute as**: `Me`
   - **Who has access**: `Anyone`
   - Klik **Deploy** → saat diminta izin, **berikan akses ke Google Drive juga** (dipakai untuk menyimpan foto menu) → lalu **salin URL** yang berakhiran `/exec`.
5. Sheet `MENU`, `KATEGORI`, `TRANSAKSI`, `SETTINGS` **dibuat otomatis** oleh script.

> 💡 Untuk mengisi **contoh menu (39 varian, 3 kategori)** pertama kali: buka aplikasi → **Pengaturan → Data → "🍌 Muat Contoh Menu"** (ada konfirmasi karena menu lama akan diganti).

## Langkah 2 — Hubungkan Aplikasi ke Backend

Di aplikasi: **Pengaturan → Koneksi Spreadsheet** → tempel URL `/exec` → **Simpan & Muat Ulang** → tekan **Uji**.

> Alternatif: edit langsung [`js/config.js`](js/config.js) lalu ubah `GAS_URL: 'https://script.google.com/macros/s/…/exec'`.
>
> **Mode demo**: selama URL masih kosong, aplikasi berjalan mode demo (data & foto hanya di perangkat) — berguna untuk mencoba.

### Keamanan (opsional tapi disarankan)
1. Buka spreadsheet Anda → sheet `SETTINGS` → tambah baris `TOKEN` dengan nilai rahasia.
2. Di aplikasi: **Pengaturan → Koneksi Spreadsheet → Token** → isi sama → Simpan.
3. Tanpa token yang sama, aplikasi lain tidak bisa membaca/menulis spreadsheet Anda.

## Langkah 3 — Deploy ke GitHub + Vercel

1. Buat repo baru di GitHub, misal `pisang-madu-queena` (boleh **private**).
2. Upload semua file di folder ini. Cara cepat via terminal:

```bash
cd pisang-madu-queena
git init
git add .
git commit -m "Aplikasi kasir PISANG MADU QUEENA"
git branch -M main
git remote add origin https://github.com/NAMA-ANDA/pisang-madu-queena.git
git push -u origin main
```

3. Buka [vercel.com](https://vercel.com) → **Add New → Project** → pilih repo `pisang-madu-queena`.
4. **Framework Preset**: `Other` → **Deploy**. Selesai, aplikasi live di `https://pisang-madu-queena.vercel.app`.
5. Setiap update & push ke GitHub → Vercel otomatis redeploy.

## Langkah 4 — Pasang di HP (seperti aplikasi native)

1. Buka URL aplikasi di **Chrome Android**.
2. Ketuk menu ⋮ → **Tambahkan ke layar utama** (Add to Home Screen).
3. Aplikasi muncul dengan ikon 🍌, tampil fullscreen tanpa address bar, dan bisa dibuka saat offline.

---

## 🏷 Kelola Kategori (tambah / edit / hapus)

Buka menu bawah **🍌 Menu** → tab **🏷 Kategori**:

- **＋ Tambah Kategori** → isi nama + emoji (misal: `Pisang Goreng` 🍌, `Pisang Bakar` 🔥, `Pisang Katsu` 🍢)
- **✏️ Edit** → ganti nama/emoji. Menu yang memakai kategori itu **ikut berganti otomatis**
- **🗑 Hapus** → menu di kategori tersebut **dipindah ke "Umum"** (tidak ikut terhapus)

Urutan kategori di halaman kasir mengikuti urutan pembuatan.

## 📷 Foto Menu Asli

Saat **Tambah/Edit menu** (tab 🍌 Menu → ✏️):

1. Tekan **📷 Pilih Foto** → ambil dari galeri/kamera (foto otomatis dikecilkan ke ±400px supaya hemat kuota & cepat).
2. Atau tempel **URL gambar** (misal foto produk dari Instagram/Facebook) → **Pakai URL**.
3. **Hapus Foto** untuk mengembalikan ke emoji.

Cara penyimpanan:

- **Mode server**: foto dikirim sebagai base64 → backend menyimpannya ke folder **`MENU FOTO - <nama spreadsheet>`** di Google Drive → aplikasi menampilkan thumbnail-nya. Foto yang diganti/dihapus otomatis masuk Trash Drive.
- **Mode demo**: foto disimpan di penyimpanan perangkat (browser).

> 💡 Tips: foto segi empat / rasio 1:1 paling bagus tampilannya. File foto lama di Drive yang tidak terpakai bisa dibersihkan manual dari Trash.

---

## 🖨 Struk Printer

Struk dicetak lengkap: **logo toko di tengah atas** (di-embed di aplikasi, hitam-putih siap cetak thermal) → teks **Data Toko** (nama, alamat, telepon — rata tengah) → isi transaksi → **footer multi-baris** → **logo ShopeeFood / GoFood / GrabFood / ACI Bisnis** di bagian paling bawah:

```
        [ LOGO TOKO ]
     PISANG MADU QUEENA      ← dari Data Toko
   Candirenggo, Singosari - Malang
      Telp. 0819-4534-8703
--------------------------------
No                          #001
Tgl            2026-08-02  21:53
--------------------------------
1  Pisang Goreng Tiramisu
    1 x Rp 12.000      Rp 12.000
--------------------------------
Subtotal               Rp 12.000
TOTAL                  Rp 12.000
Tunai                  Rp 20.000
Kembali                 Rp 8.000
--------------------------------
Terima kasih sudah belanja!
Jangan lupa rating 5 bintang ya :)
Tersedia juga di:
 [ShopeeFood] [GoFood]
 [GrabFood] [ACI Bisnis]
```

- **Nama Kasir dihapus** (tidak ada di Data Toko & struk).
- Semua identitas di struk bersumber dari **Pengaturan → Data Toko** → ubah di setting, struk ikut berubah.
- **Footer multi-baris**: tekan Enter di kolom Footer Struk untuk baris baru (maks 6 baris).
- **Logo aplikasi pesan-antar** (ShopeeFood, GoFood, GrabFood, ACI Bisnis) bisa dimatikan lewat *Pengaturan → Printer Bluetooth → "Logo ShopeeFood / GoFood / GrabFood di struk"*. Jika tidak muat 1 baris, otomatis disusun 2 baris agar tetap terbaca.

### Nomor struk (mudah)
- **#001, #002, dst** = urutan transaksi **hari itu** (reset tiap hari). Contoh: transaksi pertama hari ini = **#001**.
- **#L001** = transaksi **Lokal** (belum tersinkron ke server karena internet mati). Begitu tersinkron, nomornya menjadi urutan resmi hari itu.
- Hanya **No & Tgl** yang tercetak di struk (tanpa nama kasir).

### Lebar kertas printer (full & rapi)
Buka **Pengaturan → 🖨 Printer Bluetooth → Lebar Kertas Printer**:
- **58 mm (kecil)** — default, 32 kolom, raster 384 titik
- **80 mm (lebar)** — 48 kolom, raster 576 titik

Pilih sesuai kertas printer kamu agar teks dan logo tampil **penuh selebar kertas** (tidak ada ruang kosong di tepi). Pilihan tersimpan di perangkat.

Susunan struk dirancang **rapat tanpa gap kosong**: logo toko, `No`/`Tgl`, item, total, tunai/kembalian, footer, logo aplikasi, potong kertas dengan sisa 2 baris.

## 🖨 Printer Bluetooth (Struk)

### Syarat
- **Android + Chrome** (Web Bluetooth tidak didukung iOS Safari / iPhone).
- Printer thermal **58mm ber-BLE** yang mendukung **ESC/POS** (misal: Xprinter XP-58IIH BLE, Zjiang, PST, MPT-II, dll — biasanya ada logo Bluetooth di bodinya).
- Printer dalam keadaan **nyala** dan **terisi kertas**.

### Cara cetak
1. Tekan tombol **🖨 Cetak Bluetooth** (setelah pembayaran) atau **Tes Cetak** di Pengaturan.
2. Muncul daftar perangkat Bluetooth → **pilih printer Anda** → Connect.
3. Struk tercetak; printer teringat dan otomatis terhubung lagi untuk cetakan berikutnya (sampai aplikasi ditutup).

### Troubleshooting
| Masalah | Solusi |
|---|---|
| Tombol cetak abu-abu / "Web Bluetooth tidak didukung" | Gunakan Chrome di Android (bukan browser lain / iOS). |
| Printer tidak muncul di daftar | Pastikan printer nyala & ber-BLE (bukan hanya Bluetooth Classic/SPP). Buka Bluetooth HP, cek printer muncul. |
| "Karakteristik tulis tidak ditemukan" | Printer tidak mendukung ESC/POS via BLE (mis. NIIMBOT/Peripage dengan protokol khusus). Gunakan printer ESC/POS BLE. |
| Struk terpotong / huruf tidak rapi | Atur `PRINTER_CHARS` di `js/config.js` (58mm = 32, 80mm = 48, printer 24 kolom = 24). |
| Nama menu ber-emoji jadi aneh di struk | Struk otomatis dibersihkan ke huruf latin saat dicetak (aman untuk printer murah). |

---

## Struktur File

```
pisang-madu-queena/
├── index.html            # halaman utama (PWA)
├── manifest.webmanifest  # manifest PWA (nama, ikon, tema)
├── sw.js                 # service worker (offline)
├── vercel.json           # konfigurasi header Vercel
├── css/style.css         # gaya aplikasi
├── js/
│   ├── config.js         # ⚙️ KONFIGURASI (GAS_URL, TOKEN, lebar struk, logo toko)
│   ├── api.js            # komunikasi ke Google Apps Script
│   ├── logos.js          # logo ShopeeFood / GoFood / GrabFood (untuk struk)
│   ├── print.js          # cetak Bluetooth (Web Bluetooth + ESC/POS)
│   └── app.js            # logika utama (kasir, menu, kategori, foto, riwayat)
├── gas/
│   └── Code.gs           # BACKEND: Google Apps Script (spreadsheet + Drive = database)
└── icons/                # ikon aplikasi
```

## Catatan & Tips

- **Data transaksi** tersimpan di spreadsheet: sheet `TRANSAKSI` (nomor, tanggal, jam, detail item JSON, subtotal, total, metode, bayar, kembali, kasir). Bisa diolah lebih lanjut (laporan, pivot, dll).
- **Satu spreadsheet = satu kasir/pusat data**. Beberapa HP bisa pakai URL GAS yang sama, semua transaksi masuk ke spreadsheet yang sama.
- **Antrian offline**: jika internet mati saat pembayaran, transaksi ditandai `ANTRE` di Riwayat dan otomatis dikirim begitu online.
- **Cepat & ada indikator loading**: data pertama kali dimuat dalam **1 panggilan** (`getAll`) dengan tampilan instan dari cache lokal (stale-while-revalidate). Saat sinkron berjalan muncul **spinner 'Menyinkronkan data dari spreadsheet…'** dan titik status di header berkedip.
- **Rekap riwayat per periode**: di tab Riwayat ada filter **Hari Ini / Kemarin / 7 Hari / Bulan Ini / Semua** — jumlah transaksi & omset otomatis dihitung ulang per periode terpilih.
- **Transaksi anti-hilang**: API menangani redirect khas Google Apps Script (POST dikirim ulang ke URL final) + **auto-retry 3x** saat jaringan tidak stabil — transaksi tidak lagi gagal tersimpan di tengah jalan.
- **Tahan banting saat server lambat**: Apps Script sering *cold start* 20-40 detik. Aplikasi kini **tidak pernah memblokir layar**: data cache tampil instan, overlay auto-hilang setelah 8 detik, dan bila gagal muncul banner + **retry otomatis di background** (4s/12s/30s) — begitu server 'panas', data langsung termuat tanpa perlu buka ulang.
- **Auto-sync realtime**: selama aplikasi terbuka (tab aktif), data otomatis ditarik dari spreadsheet setiap ±30 detik — menu/kategori/setting/riwayat yang diubah dari HP lain atau langsung di spreadsheet langsung terlihat tanpa perlu buka-tutup aplikasi. Transaksi antrian juga otomatis terkirim. Tombol **🔄 Sinkronkan Antrian** tetap tersedia untuk sinkron manual instan.
- **Ganti harga / tambah menu** langsung dari aplikasi: menu **🍌 Menu** — perubahan langsung masuk spreadsheet (bukan cuma di HP).
- **Upgrade dari versi lama**: contoh menu sekarang berisi 39 varian pisang (Goreng/Bakar/Katsu) tanpa kategori Minuman. Jika spreadsheet Anda masih berisi menu contoh lama, buka **Pengaturan → "🍌 Muat Contoh Menu"** untuk mengganti dengan daftar baru, atau hapus manual via tab Menu.
- **Token**: jangan gunakan token yang sama dengan password penting; token ini cukup untuk mencegah orang asing menulis ke spreadsheet Anda.

Selamat berjualan! 🍯🍌

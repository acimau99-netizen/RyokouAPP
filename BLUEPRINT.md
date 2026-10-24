# BLUEPRINT: RyokoRent Android APK (v3.2.2)

> **Metodologi:** Zero-Loss Context Engineering (ZLCE) v3.2.2  
> **Status Dokumen:** DISETUJUI & DIREVISI DENGAN FEEDBACK PENGGUNA  
> **Mode:** LITE (Profil Domain: `booking`)  

---

## 1. PARAMETER & LINGKUNGAN PROYEK

- **Nama Proyek:** RyokoRent Android APK
- **Deskripsi:** Aplikasi Android APK (Progressive Web App Standalone) untuk administrasi rental sepeda motor (Ryoko Rent Malang & Batu) dengan database penyimpanan offline LocalStorage, state machine dengan status diservis, pelacakan armada unit fisik (termasuk penugasan kurir), panel catatan servis rutin 7 kategori, penyesuaian tarif bulanan, dan integrasi WhatsApp.
- **Tech Stack:**
  - Frontend: React 19, TypeScript, Vite 8, Tailwind CSS v4, Motion
  - Platform/Mobile: VitePWA, Web App Manifest Standalone, Service Worker, Android Icons
  - Database & Storage: LocalStorage (`ryokourent_db_v1`) dengan auto-persistence, quota monitoring, JSON export/import
  - Integrasi: WhatsApp Web/App via `api.whatsapp.com` (UTF-8 URL encoded)

### Tabel Dependensi Kunci

| Pustaka / Modul | Versi | Peran dalam Proyek |
| :--- | :--- | :--- |
| `react` / `react-dom` | `^19.0.1` | UI Library & Hooks |
| `vite` | `^8.3.0` | Build tool & bundler |
| `@tailwindcss/vite` | `^4.3.3` | Utility styling engine |
| `vite-plugin-pwa` | `^2.0.0` | PWA service worker, web manifest, offline assets |
| `lucide-react` | `^0.546.0` | Clean iconography |
| `motion` | `^12.23.24` | Micro-interactions |
| `typescript` | `^7.0.2` | Type-safety & compile verification |

---

## 2. BATASAN DOMAIN & ATURAN BISNIS (REVISI)

- **BR-01 (Katalog Multi-Tier dengan Paket 1 Bulan):** Tarif mencakup tarif harian (1 Hari, 1 Minggu, **1 Bulan** — menggantikan 2 Minggu) dan ShortRent jam (3, 6, 9, 12 Jam).
- **BR-02 (State Machine & Status Unit Termasuk Diservis):**
  - `ryokou_booking`: Pemesanan baru, menunggu approval & penguncian unit fisik garasi.
  - `ryokou_approved`: Unit fisik telah dikunci, menunggu serah terima motor.
  - `ryokou_disewa`: Motor sedang dibawa penyewa (dilindungi proteksi anti-hapus D-20).
  - `ryokou_diservis`: Unit sedang dalam perbaikan rutin atau penanganan insiden bengkel.
  - `ryokou_selesai`: Motor kembali ke Pool Malang/Batu, denda dihitung otomatis.
- **BR-03 (Pelacakan Unit Termasuk Opsi Kurir D-26 & Opsi 3A):** Setiap unit fisik armada memiliki status posisi:
  1. `parkir`: Pool Malang (Dinoyo) atau Pool Batu (Diponegoro).
  2. `kurir`: **Sedang Dipakai Kurir** disertai nama kurir penanggung jawab operasional.
  3. `disewa`: Sedang dibawa penyewa (nama penyewa, no booking, tenggat kembali).
  4. `servis`: Sedang di bengkel untuk servis rutin atau kecelakaan.
- **BR-04 (Turnaround Buffer 60 Menit):** Pengecekan bentrok jadwal unit menggunakan jeda waktu **60 menit** (diperbarui dari 90 menit) sebelum dan sesudah waktu sewa.
- **BR-05 (Kalkulasi Denda Keterlambatan D-27):**
  - ShortRent 3, 6, 9 Jam: Keterlambatan $\ge 60$ menit otomatis naik ke paket jam di atasnya (*step-up tier*); jika melampaui 12 jam $+ 60$ menit, kelebihan jam dikenakan denda harian per jam.
  - ShortRent 12 Jam: Keterlambatan $\ge 60$ menit dikenakan denda harian per jam.
  - Sewa Harian/Bulanan/Paket: Toleransi keterlambatan 60 menit; $> 60$ menit dikenakan denda harian per jam (pembulatan ke atas).
- **BR-06 (Kebutuhan NIK):** Sistem berjalan offline mandiri dan tidak meminta informasi NIK penyewa (aturan filter NIK dinonaktifkan untuk simplifikasi alur kerja).
- **BR-07 (Penyesuaian Tarif Massal D-22 & D-23):** Operator dapat melakukan penyesuaian tarif serentak $-50\%$ s/d $+200\%$ dengan pembulatan ribuan.
- **BR-08 (Panel Catatan Servis Rutin 7 Kategori):**
  1. Ganti Oli Mesin
  2. Ganti Gear Oli / Gardan
  3. Ganti Kampas Rem (Depan/Belakang)
  4. Ganti Ban (Depan/Belakang)
  5. Servis CVT Part (Roller, V-Belt, Slider)
  6. Baterai Kering / Aki
  7. Servis Kecelakaan / Insiden

---

## 3. MATRIKS MODUL APLIKASI (RESTRUKTURISASI)

| Modul | Deskripsi | Komponen Terkait |
| :--- | :--- | :--- |
| **M-01: Shell & Mobile APK Navigation** | Status bar Android, Top Bar, Bottom Nav, responsive device view | `AndroidStatusBar`, `AndroidTopBar`, `AndroidBottomNav` |
| **M-02: Dashboard & Rekap Laporan** | KPI armada, unit parkir pool, dipakai kurir, servis, filter rentang tanggal laporan | `DashboardView.tsx` |
| **M-03: State Machine Penyewaan** | 5 status (Booking, Approved, Disewa, Diservis, Selesai), tukar unit, selesai | `BookingsView.tsx`, `ActionModals.tsx` |
| **M-04: Pelacakan Unit Real-Time** | Monitoring posisi (Pool Malang/Batu, Kurir dengan nama kurir, Bengkel, Disewa) | `TrackingView.tsx` |
| **M-05: Armada & Tarif Bulanan** | Master model dengan tarif 1 Bulan, garasi unit dinamis (terus bertambah), bulk pricing | `FleetView.tsx` |
| **M-06: Panel Catatan Servis Rutin** | Catatan 7 kategori servis berkala, riwayat KM, tanggal, biaya, mekanik | `ServiceLogsView.tsx` |
| **M-07: ZLCE Studio & Recovery Wizard** | Integrasi tab Recovery ZLCE untuk pembuatan snapshot pemulihan langsung dari UI | `RecoveryTab.tsx` / `ZlceTab.tsx` |
| **M-08: Database & Pengaturan** | LocalStorage persistence, export/import JSON, reset pabrik | `SettingsView.tsx`, `storageService.ts` |

*(Catatan: Modul WhatsApp dan Integrasi dipindahkan ke Bagian 10 sesuai instruksi).*

---

## 4. (DIALIHKAN KE BAGIAN 10: INTEGRASI & WHATSAPP)

Seluruh spesifikasi integrasi WhatsApp dialihkan ke Bagian 10.

---

## 5. NON-FUNCTIONAL REQUIREMENTS (NFR)

- **NFR-01 (Offline-First):** 100% operasional tanpa memerlukan internet untuk melihat, menginput, atau menyelesaikan transaksi rental.
- **NFR-02 (Performa & Kecepatan):** Render UI $< 100$ms, ukuran build teroptimasi $< 1$MB.
- **NFR-03 (Zero-Loss State):** Data tersinkron otomatis ke LocalStorage setiap ada aksi mutasi database.
- **NFR-04 (Skalabilitas Armada):** Mampu menampung penambahan unit fisik garasi secara dinamis tanpa batas kaku (Q-02 YA).

---

## 6. ASUMSI & PERTANYAAN (STATUS TERBARU)

- `ASM-01`: **DISETUJUI (YA)** — LocalStorage perangkat Android mencukupi untuk operasional offline.
- `ASM-02`: **DISETUJUI (YA)** — Normalisasi nomor WhatsApp otomatis ke format `62`.
- `ASM-03`: **DISETUJUI DENGAN TAMBAHAN (YA)** — Selain Pool Malang & Batu, unit dapat berada dalam posisi **Dipakai Kurir** dengan nama kurir penanggung jawab yang tercatat jelas.
- `Q-01`: **DISETUJUI (YA)** — Fitur filter rekapitulasi laporan omset per rentang tanggal disediakan untuk rekap bulanan.
- `Q-02`: **DISETUJUI (YA)** — Jumlah unit armada motor akan terus bertambah secara dinamis seiring ekspansi rental.

---

## 7. MODEL DATA & SNAPSHOT ZLCE RECOVERY

### A. Struktur Model Data Ringkas
- **`MotorModel`:** `id`, `namaModel`, `kategori`, tarif harian (`harga1Hari`, `harga1Minggu`, `harga1Bulan`), tarif jam (`harga3Jam`, `harga6Jam`, `harga9Jam`, `harga12Jam`), `dendaHarianPerJam`, fasilitas, spesifikasi.
- **`PhysicalUnit`:** `id`, `kodeUnit`, `motorId`, `nomorPlat`, `tahun`, `warna`, `poolLokasi`, `statusServis`.
- **`UnitTracking`:** `unitId`, `kodeUnit`, `motorId`, `statusPosisi` (`parkir` | `kurir` | `disewa` | `servis`), `poolParkir`, `namaKurir`, `namaBengkel`, `kontakBengkel`, `estimasiSelesai`, `bookingId`, `noBooking`, `namaPenyewa`, `tenggatKembali`.
- **`ServiceRecord` (7 Kategori):** `id`, `unitId`, `kodeUnit`, `tanggal`, `kategoriServis` (Oli Mesin, Oli Gardan, Kampas Rem, Ganti Ban, CVT Part, Aki, Kecelakaan), `kmMotor`, `biaya`, `bengkelMekanik`, `keterangan`.
- **`BookingRecord`:** `id`, `noBooking`, `status` (`ryokou_booking` | `ryokou_approved` | `ryokou_disewa` | `ryokou_diservis` | `ryokou_selesai`), `nama`, `nomorWa`, `motorId`, `unitId`, `kategoriTarif`, `pilihanDurasi` (termasuk `1_bulan`), `jamTanggalMulai`, `jamTanggalSelesai`, `totalHargaEstimasi`, `dendaNominal`.

### B. Prosedur Pembuatan Snapshot via Wizard Tab Recovery ZLCE Studio
- Snapshot ZLCE dibuat melalui wizard tab Recovery di ZLCE Studio yang mengagregasikan:
  1. Timestamp Waktu Snapshot ISO (WIB).
  2. Status branch Git & status direktori kerja.
  3. Status task aktif dan WAL dari `SESSION_STATE.md` bagian 3.
  4. Ringkasan diagnosis `zlce-check` (jumlah error, warning, dan task).
  5. Perintah pemulihan satu-klik untuk serah terima sesi AI berikutnya tanpa kehilangan konteks.

---

## 8. STRATEGI UJI RINGKAS (MODE LITE)

- **Uji Unit & Logika Bisnis:**
  - `calculateOvertimePenalty`: Validasi toleransi 60 menit dan step-up denda.
  - `isUnitAvailableForRange`: Validasi jeda waktu buffer 60 menit sebelum dan sesudah.
  - `calculateMonthlyTariff`: Perhitungan tarif sewa 1 bulan.
- **Uji State Machine & Kurir:**
  - Validasi penugasan kurir pada unit tracking.
  - Validasi pencatatan servis 7 kategori ke riwayat armada.
- **Uji Verifikasi Kompilasi & Build:**
  - `npm run lint` (`tsc --noEmit`) $\rightarrow$ Exit code 0.
  - `npm run build` (`vite build`) $\rightarrow$ Bundle PWA berhasil.

---

## 9. MODIFIKASI TEMPLATE FORM ORDER (PEMESANAN)

Formulir pemesanan / order dimodifikasi untuk alur kerja yang lebih praktis dan cepat:
- **Pilihan Durasi Diperbarui:** Pilihan Harian mencakup:
  - `1_hari`: 1 Hari (24 Jam)
  - `1_minggu`: 1 Minggu (7 Hari)
  - `1_bulan`: 1 Bulan (30 Hari) [Baru]
- **Opsi Pengantaran Kurir:** Opsi pilihan penyerahan oleh Kurir Toko dengan field Nama Kurir Pengantar.
- **Penyederhanaan Identitas:** Cukup Nama Penyewa dan Nomor WhatsApp tanpa meminta atau memblokir NIK KTP.
- **Kalkulasi Otomatis Jadwal Selesai:** Saat opsi 1 Bulan dipilih, tanggal selesai otomatis dihitung $+30$ hari dari tanggal mulai.

---

## 10. PENYESUAIAN PEMAKAIAN WHATSAPP & FITUR TAMBAHAN WHATSAPP

Integrasi WhatsApp diperluas dengan generator template pesan UTF-8:
1. **Konfirmasi Booking Baru:** Format rincian sewa harian/bulanan dengan detail pengambilan.
2. **Surat Tugas / Notifikasi Kurir:** Pesan otomatis ke kurir pengantar berisi alamat antar/jemput, nama penyewa, dan no HP penyewa.
3. **Pemberitahuan Tagihan Sewa Bulanan (1 Bulan):** Format invoice sewa bulanan dan tanggal jatuh tempo perpanjangan sewa.
4. **Pengingat Jatuh Tempo (H-2 Jam):** Pesan pengingat ramah ke penyewa sebelum waktu pengembalian berakhir agar tidak terkena denda keterlambatan.
5. **Kwitansi Pengembalian & Denda:** Rincian perhitungan denda (bila ada) dan konfirmasi unit telah diterima kembali.
6. **Notifikasi Unit Selesai Servis:** Pesan konfirmasi ke operator saat unit selesai diservis dari bengkel rekanan.

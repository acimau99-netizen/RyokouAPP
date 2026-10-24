# BLUEPRINT: RyokoRent Android APK (v3.2.2)

> **Metodologi:** Zero-Loss Context Engineering (ZLCE) v3.2.2  
> **Status Dokumen:** DRAF GERBANG 1 (Menunggu Persetujuan Pengguna)  
> **Mode:** LITE (Profil Domain: `booking`)  

---

## 1. PARAMETER & LINGKUNGAN PROYEK

- **Nama Proyek:** RyokoRent Android APK
- **Deskripsi:** Aplikasi Android APK (Progressive Web App Standalone) untuk administrasi rental sepeda motor (Ryoko Rent Malang & Batu) dengan database penyimpanan offline LocalStorage, state machine 4 status, pelacakan armada unit fisik, dan integrasi WhatsApp.
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

## 2. BATASAN DOMAIN & ATURAN BISNIS (BUSINESS RULES)

- **BR-01 (Katalog Multi-Tier D-18):** Katalog memiliki 6 model motor bawaan (Scoopy, NMAX, CRF 150L, Fazzio, R15, BeAT) dengan tarif harian (1 hari, 1 minggu, 2 minggu) dan ShortRent jam (3, 6, 9, 12 jam).
- **BR-02 (State Machine 4 Status D-04):**
  - `ryokou_booking`: Pemesanan baru, menunggu approval & penguncian unit fisik garasi.
  - `ryokou_approved`: Unit fisik telah dikunci, menunggu serah terima motor.
  - `ryokou_disewa`: Motor sedang dibawa penyewa (dilindungi proteksi anti-hapus D-20).
  - `ryokou_selesai`: Motor kembali ke Pool Malang/Batu, denda dihitung otomatis.
- **BR-03 (Pelacakan 1-Baris-1-Unit D-26 & Opsi 3A):** Setiap unit fisik armada (`ryokou_unit`) tepat memiliki 1 baris status posisi di Lacak Unit: `parkir` (Pool Malang/Batu), `servis` (bengkel rekanan, kontak, estimasi selesai), atau `disewa` (nama penyewa, no booking, tenggat kembali).
- **BR-04 (Turnaround Buffer 90 Menit D-17):** Pengecekan bentrok jadwal unit menambahkan jeda 90 menit sebelum dan sesudah waktu sewa.
- **BR-05 (Kalkulasi Denda Keterlambatan D-27):**
  - ShortRent 3, 6, 9 Jam: Keterlambatan $\ge 60$ menit otomatis naik ke paket jam di atasnya (*step-up tier*); jika melampaui 12 jam $+ 60$ menit, kelebihan jam dikenakan denda harian per jam.
  - ShortRent 12 Jam: Keterlambatan $\ge 60$ menit dikenakan denda harian per jam.
  - Sewa Harian/Paket: Toleransi keterlambatan 90 menit; $> 90$ menit dikenakan denda harian per jam (pembulatan ke atas).
- **BR-06 (Kepatuhan Anti-NIK UU PDP No. 27/2022 D-21):** Dilarang menyimpan nomor NIK KTP 16 digit. Seluruh input teks disaring dan disensor menjadi `[SENSOR-ANTI-NIK-UU-PDP]`. Verifikasi menggunakan ID Pendukung tanpa NIK (SIM C, KTM, NPWP, Paspor, BPJS).
- **BR-07 (Penyesuaian Tarif Massal D-22 & D-23):** Operator dapat melakukan *bulk price adjustment* $-50\%$ s/d $+200\%$ dengan pembulatan otomatis ke ribuan terdekat.
- **BR-08 (Out-of-Scope):** Pembayaran online payment gateway eksternal (menggunakan sistem transfer/tunai yang dikonfirmasi via WhatsApp operator).

---

## 3. MATRIKS MODUL APLIKASI

| Modul | Deskripsi | Komponen Terkait |
| :--- | :--- | :--- |
| **M-01: Shell & Mobile APK Navigation** | Status bar Android, Top Bar dengan indikator alert, Bottom Nav, responsive device view | `AndroidStatusBar`, `AndroidTopBar`, `AndroidBottomNav` |
| **M-02: Dashboard Operasional** | KPI armada, unit parkir pool, sedang disewa, alert keterlambatan D-27, status biner D-05 | `DashboardView.tsx` |
| **M-03: State Machine Penyewaan** | 4 status booking, alur approve kunci unit, serah terima, tukar unit D-19, selesai sewa | `BookingsView.tsx`, `ActionModals.tsx` |
| **M-04: Pelacakan Unit Real-Time** | Monitoring posisi 1-baris-1-unit (Pool Malang/Batu, Bengkel Servis, Disewa) | `TrackingView.tsx` |
| **M-05: Armada & Tarif** | Master model, garasi unit fisik, bulk pricing, paket wisata dinamis | `FleetView.tsx` |
| **M-06: Database & Pengaturan** | LocalStorage persistence, export/import JSON, reset pabrik, anti-NIK test | `SettingsView.tsx`, `storageService.ts` |
| **M-07: WhatsApp Communication** | URL generator UTF-8 untuk konfirmasi, serah terima, kwitansi, dan tukar unit | `whatsappService.ts` |

---

## 4. INTEGRASI

- **WhatsApp Web / App:** URL schema `https://api.whatsapp.com/send?phone=...&text=...` dengan `encodeURIComponent` untuk pesan berformat UTF-8.
- **Service Worker & Manifest:** PWA standalone terintegrasi via `vite-plugin-pwa` untuk instalasi Android APK instan.

---

## 5. NON-FUNCTIONAL REQUIREMENTS (NFR)

- **NFR-01 (Offline-First):** 100% operasional tanpa memerlukan internet untuk melihat, menginput, atau menyelesaikan transaksi rental.
- **NFR-02 (Performa & Kecepatan):** Render UI $< 100$ms, ukuran build teroptimasi $< 1$MB.
- **NFR-03 (Zero-Loss State):** Data tersinkron otomatis ke LocalStorage setiap ada aksi mutasi database.
- **NFR-04 (Integritas Data):** Unit yang sedang disewa tidak dapat dihapus sebelum statusnya diselesaikan.

---

## 6. ASUMSI & PERTANYAAN (ASM & Q)

- `ASM-01`: Penyimpanan LocalStorage pada perangkat Android operator menyediakan kuota minimal 5MB yang mencukupi untuk ribuan transaksi sewa teks JSON.
- `ASM-02`: Format nomor telepon WhatsApp selalu dinormalisasi ke format internasional diawali kode negara 62.
- `ASM-03`: Dua pool fisik utama berada di Malang (Dinoyo) dan Batu (Diponegoro).
- `Q-01`: Apakah diperlukan fitur filter laporan transaksi berdasarkan rentang tanggal tertentu (ekspor rekap bulanan)? *(Dapat ditambahkan pada fase berikutnya)*.
- `Q-02`: Apakah ada kebutuhan penambahan kategori motor listrik (EV) di masa mendatang? *(Struktur skema sudah modular untuk mendukungnya)*.

---

## 7. MODEL DATA RINGKAS (MODE LITE)

```
[MotorModel] 1 --- * [PhysicalUnit] 1 --- 1 [UnitTracking]
      |                       |
      *                       *
[RentalPackage]         [BookingRecord]
                              |
                              *
                       [UnitExchangeLog]
```

- **`MotorModel`:** `id`, `namaModel`, `kategori`, tarif harian (1h, 1m, 2m), tarif jam (3j, 6j, 9j, 12j), `dendaHarianPerJam`, fasilitas, spesifikasi.
- **`PhysicalUnit`:** `id`, `kodeUnit` (unik), `motorId`, `nomorPlat`, `tahun`, `warna`, `poolLokasi`, `statusServis`.
- **`UnitTracking`:** `unitId`, `kodeUnit`, `motorId`, `statusPosisi` (parkir | servis | disewa), `poolParkir`, `namaBengkel`, `kontakBengkel`, `estimasiSelesai`, `bookingId`, `noBooking`, `namaPenyewa`, `tenggatKembali`.
- **`BookingRecord`:** `id`, `noBooking` (RYK-YYYYMMDD-XXX), `status` (4 status), `nama`, `nomorWa`, `jenisIdPendukung`, `tandaPelanggan`, `motorId`, `unitId`, `kategoriTarif`, `pilihanDurasi`, `jamTanggalMulai`, `jamTanggalSelesai`, `totalHargaEstimasi`, `dendaNominal`.

---

## 8. STRATEGI UJI RINGKAS (MODE LITE)

- **Uji Unit & Logika Bisnis:**
  - `calculateOvertimePenalty`: Validasi step-up ShortRent (3j $\rightarrow$ 6j $\rightarrow$ 9j $\rightarrow$ 12j) dan denda harian.
  - `isUnitAvailableForRange`: Validasi jeda waktu buffer 90 menit sebelum dan sesudah.
  - `sanitizeTextNoNik`: Sensor otomatis string 16 digit angka berurutan.
- **Uji Alur Operasional (State Machine):**
  - Alur lengkap: Input Booking $\rightarrow$ Approve Kunci Unit $\rightarrow$ Serah Terima $\rightarrow$ Selesai & Denda.
  - Alur Tukar Unit (D-19): Verifikasi pergantian unit fisik dan riwayat log.
- **Uji Verifikasi Kompilasi & Build:**
  - `npm run lint` (`tsc --noEmit`) $\rightarrow$ Exit code 0 (zero error).
  - `npm run build` (`vite build`) $\rightarrow$ PWA bundle & manifest generated.

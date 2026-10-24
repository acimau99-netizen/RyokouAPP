# BACKLOG TASK PENGEMBANGAN: RyokoRent Android APK

Definisi task. **Status task tidak ditulis di sini**; status ada di `SESSION_STATE.md`. Enum: `PENDING | READY | IN_PROGRESS | BLOCKED | DONE`.

---

## 1. PETA FASE

* **FASE 0: Pondasi & Spesifikasi ZLCE** (`TASK-001`)
* **FASE 1: Arsitektur Model Data & Servis** (`TASK-002`)
* **FASE 2: Panel Catatan Servis Rutin & Penugasan Kurir** (`TASK-003`)
* **FASE 3: Form Pemesanan Baru, Laporan Omset & WhatsApp Ekstra** (`TASK-004`)
* **FASE 4: Integrasi Wizard Recovery ZLCE Studio & Verifikasi Akhir** (`TASK-005`)
* **FASE 5: Panel Manajemen User & Role-Based Access Control 4 Tingkat** (`TASK-006`)

---

## 2. FORMAT TASK

### TASK-001: Inisialisasi Repositori & Dokumen Kontrol ZLCE
* **Fase:** FASE 0
* **Deskripsi:** Setup lingkungan, integrasi VitePWA, manifest Android, dan berkas kontrol ZLCE (`BLUEPRINT.md`, `TASKS.md`, `SESSION_STATE.md`, `HANDOVER.md`).
* **Dependensi:** -
* **File:** `BLUEPRINT.md`, `TASKS.md`, `SESSION_STATE.md`, `HANDOVER.md`, `vite.config.ts`
* **Docs Terkait (Tier 1):** `BLUEPRINT.md`
* **Docs Impact:** `BLUEPRINT.md`, `SESSION_STATE.md`
* **Acceptance Criteria:**
  1. Berkas kontrol ZLCE terisi lengkap dan lolos verifikasi `zlce-check.py`.
  2. Kompilasi TypeScript `npm run lint` berjalan 0 error.
* **Test Case:** Build & Lint verification
* **Metode Verifikasi:** Jalankan `npm run lint` dan `python3 scripts/zlce/zlce-check.py .`; tempel output.

---

### TASK-002: Penyesuaian Skema & Model Data (Tarif 1 Bulan, Kurir, 7 Kategori Servis, Buffer 60 Mnt)
* **Fase:** FASE 1
* **Deskripsi:** Memperbarui antarmuka TypeScript `src/types/ryoko.ts` dan logika perhitungan di `src/services/bookingEngine.ts` untuk mendukung tarif 1 Bulan (menggantikan 2 Minggu), status posisi unit `kurir` beserta nama kurir, status booking `ryokou_diservis`, jeda turnaround buffer 60 menit, dan entitas `ServiceRecord` (7 kategori).
* **Dependensi:** `TASK-001`
* **File:** `src/types/ryoko.ts`, `src/services/bookingEngine.ts`, `src/data/seedData.ts`
* **Docs Terkait:** `BLUEPRINT.md`
* **Docs Impact:** `BLUEPRINT.md`, `SESSION_STATE.md`
* **Acceptance Criteria:**
  1. `harga1Bulan` dan durasi `1_bulan` terdefinisi dan terkalkulasi akurat.
  2. `ServiceRecord` mencakup 7 kategori servis spesifik.
  3. Turnaround buffer dikalibrasi menjadi 60 menit (3600 detik).
  4. Unit tracking mendukung status `kurir` dengan field `namaKurir`.
* **Test Case:** Monthly tariff & 60-min buffer test
* **Metode Verifikasi:** Jalankan `npm run lint` dan verifikasi kalkulasi tarif.

---

### TASK-003: Implementasi Panel Catatan Servis Rutin 7 Kategori & Posisi Kurir di UI
* **Fase:** FASE 2
* **Deskripsi:** Membuat komponen `src/components/ServiceLogsView.tsx` untuk input dan riwayat servis rutin 7 kategori armada garasi, serta menambahkan opsi status posisi "Dipakai Kurir" (dengan nama kurir) pada tab Lacak Unit dan modal update tracking.
* **Dependensi:** `TASK-002`
* **File:** `src/components/ServiceLogsView.tsx`, `src/components/TrackingView.tsx`, `src/components/ActionModals.tsx`, `src/components/AndroidBottomNav.tsx`
* **Docs Terkait:** `BLUEPRINT.md`
* **Docs Impact:** `SESSION_STATE.md`
* **Acceptance Criteria:**
  1. Pengguna dapat mencatat dan melihat riwayat servis armada dengan 7 kategori spesifik (Ganti Oli Mesin, Oli Gardan, Kampas Rem, Ban, CVT Part, Aki, Kecelakaan).
  2. Unit armada dapat dipindahkan ke status "Dipakai Kurir" dengan mengisi nama kurir.
* **Test Case:** Service logs create & filter test
* **Metode Verifikasi:** Uji input catatan servis dan perpindahan status unit.

---

### TASK-004: Form Pemesanan Baru, Laporan Omset & Fitur WhatsApp Lanjutan
* **Fase:** FASE 3
* **Deskripsi:** Memperbarui `NewBookingModal.tsx` dengan pilihan durasi 1 Bulan, opsi kurir pengantar, dan penyederhanaan tanpa sensor NIK. Menambahkan fitur filter rekapitulasi omset per rentang tanggal di Dashboard/Laporan, serta menambahkan generator WhatsApp untuk tagihan bulanan, surat tugas kurir, dan pengingat jatuh tempo H-2 jam.
* **Dependensi:** `TASK-003`
* **File:** `src/components/NewBookingModal.tsx`, `src/services/whatsappService.ts`, `src/components/DashboardView.tsx`, `src/components/BookingsView.tsx`
* **Docs Terkait:** `BLUEPRINT.md`
* **Docs Impact:** `SESSION_STATE.md`
* **Acceptance Criteria:**
  1. Form order mendukung sewa 1 bulan (+30 hari otomatis) dan opsi penugasan kurir.
  2. Filter tanggal omset di Dashboard menghitung total pendapatan sesuai rentang waktu yang dipilih.
  3. Fitur WhatsApp mencakup notifikasi kurir, tagihan sewa bulanan, dan pengingat jatuh tempo H-2 jam.
* **Test Case:** Order creation & WhatsApp link generation
* **Metode Verifikasi:** Uji input pemesanan sewa 1 bulan dan verifikasi format pesan WA.

---

### TASK-005: Integrasi Wizard Recovery ZLCE Studio & Verifikasi Akhir
* **Fase:** FASE 4
* **Deskripsi:** Mengintegrasikan tab Recovery ZLCE Studio ke dalam antarmuka aplikasi RyokoRent APK, memungkinkan operator/pengembang membuat dan menyalin snapshot pemulihan langsung dari UI, serta memastikan build produksi PWA siap pakai.
* **Dependensi:** `TASK-004`
* **File:** `src/App.tsx`, `src/components/RecoveryTab.tsx`, `scripts/zlce/zlce-snapshot.sh`
* **Docs Terkait:** `BLUEPRINT.md`, `SESSION_STATE.md`
* **Acceptance Criteria:**
  1. Tombol/tab ZLCE Recovery dapat diakses di aplikasi untuk membuat snapshot seketika.
  2. Skrip `scripts/zlce/zlce-check.py` lolos dengan status OK (0 error, 0 warn).
  3. Build produksi `npm run build` sukses 100%.
* **Test Case:** Full app verification & ZLCE check
* **Metode Verifikasi:** Jalankan `python3 scripts/zlce/zlce-check.py .` dan `npm run build`.

---

### TASK-006: Panel Manajemen User & Role-Based Access Control (4 Tingkat)
* **Fase:** FASE 5
* **Deskripsi:** Mengimplementasikan Panel Manajemen Pengguna dengan 4 tingkatan hak akses: (1) Administrator (all access), (2) Admin Custom Access (izin granular yang dapat dikustomisasi per-user), (3) Operator (akses terbatas: operasional booking, lacak unit, servis, tanpa akses ekspor omset/reset sistem/manajemen user), dan (4) Kurir (akses sangat terbatas: hanya tugas serah terima, penjemputan unit, chat WhatsApp tamu, dan status kurir motor, tanpa finansial/pengaturan). Dilengkapi dengan Pengalih Akun Cepat (Quick Switcher) di Top Bar dan Panel Pengaturan User.
* **Dependensi:** `TASK-005`
* **File:** `src/types/ryoko.ts`, `src/data/seedData.ts`, `src/services/storageService.ts`, `src/components/UserManagementView.tsx`, `src/components/CourierDashboardView.tsx`, `src/components/AndroidTopBar.tsx`, `src/components/AndroidBottomNav.tsx`, `src/App.tsx`
* **Docs Terkait:** `BLUEPRINT.md`
* **Docs Impact:** `SESSION_STATE.md`
* **Acceptance Criteria:**
  1. Tersedia 4 tingkatan peran: Administrator, Admin Custom, Operator, dan Kurir.
  2. Admin Custom dapat diatur izin granularnya (lihat omset, kelola booking, lacak unit, servis, armada, pengaturan, kelola user, recovery).
  3. Operator dibatasi dari akses omset finansial agregat, reset sistem, dan manajemen user.
  4. Kurir memiliki tampilan ringkas khusus pengantaran & penjemputan unit dengan aksi satu-klik dan kontak WhatsApp penyewa.
  5. Pengguna dapat berganti akun secara langsung melalui Switcher Profil di Top Bar atau tab Pengguna.
* **Test Case:** Role switching, permission enforcement & courier workflow
* **Metode Verifikasi:** Jalankan `python3 scripts/zlce/zlce-check.py . --no-git` dan `npm run lint`.

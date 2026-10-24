# Changelog

Semua perubahan penting pada proyek ini dicatat dalam berkas ini.
Format berbasis [Keep a Changelog](https://keepachangelog.com/id/1.1.0/),
dan proyek ini menganut [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [3.2.2] - 2026-10-24

### Ditambahkan
- Inisialisasi arsitektur RyokoRent Android APK berbasis LocalStorage.
- Model data `MotorModel`, `PhysicalUnit`, `UnitTracking`, `BookingRecord`, dan `ServiceRecord`.
- Panel Catatan Servis Rutin 7 kategori (Oli Mesin, Oli Gardan, Kampas Rem, Ganti Ban, CVT Part, Aki/Baterai, Servis Kecelakaan).
- Dukungan tarif sewa 1 Bulan menggantikan paket 2 Minggu.
- Status `diservis` pada alur state machine dan posisi armada `kurir` disertai nama kurir penanggung jawab.
- Jeda ketersediaan turnaround buffer disesuaikan menjadi 60 menit.
- Filter rekapitulasi omset & laporan finansial berdasarkan rentang tanggal kustom.
- Integrasi tab Recovery ZLCE Studio untuk pembuatan snapshot pemulihan langsung dari antarmuka aplikasi.
- Fitur WhatsApp lanjutan (tagihan sewa bulanan, surat tugas kurir, pengingat jatuh tempo H-2 jam).

### Diubah
- Sinkronisasi `BLUEPRINT.md` dengan penyesuaian aturan bisnis BR-01, BR-02, BR-04, BR-06, dan penempatan WhatsApp pada Bagian 10.
- Penyederhanaan alur pemesanan tanpa meminta/memblokir NIK KTP.

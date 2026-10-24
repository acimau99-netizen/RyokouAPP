<div align="center">

# ZLCE Studio

**Kit dan aplikasi web untuk menjaga konteks proyek tetap utuh saat bekerja dengan AI coding agent, lewat berkas status terstruktur dan protokol serah terima.**

*Zero-Loss Context Engineering: a kit and web workbench that keeps AI coding sessions consistent across context resets, using structured state files and a handover protocol.*

[![CI](https://github.com/acimau99-netizen/ZLCEv3.2.2/actions/workflows/ci.yml/badge.svg)](https://github.com/acimau99-netizen/ZLCEv3.2.2)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Node](https://img.shields.io/badge/node-%3E%3D20.19-339933.svg)](#prasyarat)
[![Version](https://img.shields.io/badge/version-3.2.2-informational.svg)](CHANGELOG.md)
[![Kit ZLCE: 14/14 Lulus](https://img.shields.io/badge/Kit%20ZLCE%20v3.2.2-14%2F14%20LULUS-success.svg)](data/FEEDBACK_ZLCE_EVALUASI.md)

[Mulai Cepat](#mulai-cepat) · [Dokumentasi Lengkap](docs/USAGE.md) · [Laporkan Masalah](https://github.com/acimau99-netizen/ZLCEv3.2.2/issues)

</div>

---

## Daftar Isi

- [Apa itu ZLCE?](#apa-itu-zlce)
- [Fitur Utama](#fitur-utama)
- [Mulai Cepat](#mulai-cepat)
  - [Prasyarat](#prasyarat)
  - [A. Pakai Kit dengan AI Anda](#a-pakai-kit-dengan-ai-anda)
  - [B. Jalankan ZLCE Studio (Web)](#b-jalankan-zlce-studio-web)
  - [C. Pakai Skrip CLI](#c-pakai-skrip-cli)
- [Cara Kerja & 4 Gerbang Kualitas](#cara-kerja--4-gerbang-kualitas)
- [Struktur Repositori](#struktur-repositori)
- [Hasil Pengujian](#hasil-pengujian)
- [Batasan yang Diketahui](#batasan-yang-diketahui)
- [Privasi dan Keamanan](#privasi-dan-keamanan)
- [Kontribusi](#kontribusi)
- [Lisensi](#lisensi)

---

## Apa itu ZLCE?

Saat mengerjakan proyek perangkat lunak bersama AI coding assistant, konteks seringkali hilang: sesi baru tidak mengetahui keputusan arsitektur sebelumnya, kuota token obrolan habis di tengah jalan, atau AI mengubah kode di luar yang diminta.

ZLCE mengatasi masalah tersebut dengan satu prinsip: **status proyek ditulis di berkas, bukan diandalkan pada memori obrolan.**

- **`SESSION_STATE.md`** adalah sumber kebenaran tunggal (*Single Source of Truth*): matriks task, catatan serah terima, dan *write-ahead log* (WAL) untuk langkah yang sedang berjalan.
- **Empat Gerbang Persetujuan (*Quality Gates*)** menahan AI agar tidak menulis kode sebelum spesifikasi disetujui pengguna.
- **Protokol Handover dan Recovery** memungkinkan sesi baru, atau AI lain, melanjutkan pekerjaan tepat dari titik terakhir, termasuk saat sesi terputus (*session crash*).
- **Task bersifat atomik**: tepat satu task berstatus `IN_PROGRESS` pada satu waktu, dan status `DONE` hanya sah bila disertai bukti verifikasi riil.

Kit ini kompatibel dengan semua AI coding agent modern yang dapat membaca teks/berkas, seperti Google AI Studio, Claude Code, Cursor, Windsurf, ChatGPT, dan GitHub Copilot.

---

## Fitur Utama

| Komponen | Isi & Kemampuan |
| :--- | :--- |
| **Kit Kontrol** | Prompt inisiasi ([`LANDING_PROMPT.md`](LANDING_PROMPT.md)), prompt serah terima ([`HANDOVER_PROMPT.md`](HANDOVER_PROMPT.md)), 9 template dokumen kontrol ([`templates/`](templates/)), bundel mandiri ([`ZLCE_KIT_SINGLE.md`](ZLCE_KIT_SINGLE.md)), dan profil domain booking. |
| **Studio (Web)** | Editor visual `SESSION_STATE` dengan sinkronisasi formulir dan Markdown, validator aturan real-time, wizard recovery Kasus A–D, triase revisi R1–R7, kalkulator estimasi token, tutorial interaktif, dan generator bundel kit. |
| **CLI & Diagnostik** | `zlce-check.py` (validasi integritas state), `zlce-snapshot.sh` (snapshot status git dan WAL), `zlce-collect.py` (kolektor diagnostik bertopeng rahasia). |

Dua mode proyek yang didukung:
- **Mode LITE** (*Default / Rekomendasi*): 4 berkas kontrol inti (`BLUEPRINT`, `TASKS`, `SESSION_STATE`, `HANDOVER`) untuk proyek di bawah ~15 task.
- **Mode FULL**: 10 dokumen kontrol lengkap untuk sistem besar atau multi-service.

---

## Mulai Cepat

### Prasyarat

| Komponen | Kebutuhan Lingkungan |
| :--- | :--- |
| **Studio (Web)** | Node.js `>=20.19.0` (direkomendasikan Node.js 22 LTS), npm |
| **Skrip CLI** | Python 3.10+, bash, git (di Windows: gunakan WSL atau Git Bash) |
| **Kit Saja** | Cukup AI assistant yang mendukung input teks atau unggah berkas |

### A. Pakai Kit dengan AI Anda

1. **Pilih mode**: **LITE** (4 berkas) atau **FULL** (10 berkas).
2. **Isi parameter** di [`LANDING_PROMPT.md`](LANDING_PROMPT.md) (Nama Proyek, Aksi `BARU`/`RESTRUKTURISASI`, Tech Stack, Kebutuhan Inti).
3. **Mulai sesi AI**:
   - Jika AI mendukung banyak lampiran (mis. Cursor/Windsurf/Claude Project): lampirkan folder [`templates/`](templates/) lalu tempel prompt.
   - Jika AI berupa chat web prompt tunggal (mis. ChatGPT/Claude web): lampirkan satu berkas [`ZLCE_KIT_SINGLE.md`](ZLCE_KIT_SINGLE.md).
4. **Persetujuan Gerbang 1**: AI akan menyusun `BLUEPRINT.md` lalu **berhenti**. Periksa draf tersebut, lalu berikan konfirmasi:
   > *"Setujui Gerbang 1 (BLUEPRINT.md). Lanjutkan ke gerbang berikutnya."*

Untuk melanjutkan sesi atau berganti AI, gunakan [`HANDOVER_PROMPT.md`](HANDOVER_PROMPT.md) bersama `SESSION_STATE.md`.

| Situasi Kerja | Berkas & Perintah |
| :--- | :--- |
| **Proyek baru** | `LANDING_PROMPT.md` (Aksi: `BARU`) |
| **Merapikan proyek lama** | `LANDING_PROMPT.md` (Aksi: `RESTRUKTURISASI`); AI dilarang mengubah kode sebelum audit selesai |
| **Lanjut sesi / pindah AI** | `HANDOVER_PROMPT.md` + `SESSION_STATE.md` |
| **Sesi terputus di tengah jalan** | `bash scripts/zlce/zlce-snapshot.sh --diff`, atau buka tab **Recovery** di Studio |

### B. Jalankan ZLCE Studio (Web)

```bash
git clone https://github.com/acimau99-netizen/ZLCEv3.2.2.git
cd ZLCEv3.2.2
npm ci
npm run dev
```

Buka peramban di: <http://localhost:3000>

Untuk build produksi:
```bash
npm run build     # keluaran di folder dist/
npm run preview   # uji pratinjau lokal build produksi
```

### C. Pakai Skrip CLI

Uji langsung contoh berkas yang disertakan tanpa konfigurasi git:
```bash
python3 scripts/zlce/zlce-check.py --state examples/SESSION_STATE.example.md --no-git
# KELUARAN: OK (0 error, 1 warn, 3 task)
```

Untuk proyek Anda sendiri, salin folder `scripts/zlce/` ke direktori proyek Anda:
```bash
python3 scripts/zlce/zlce-check.py .          # validasi SESSION_STATE.md
python3 scripts/zlce/zlce-check.py . --strict # anggap warning sebagai error
bash scripts/zlce/zlce-snapshot.sh --diff     # ambil snapshot git dan WAL untuk recovery
```

> [!NOTE]
> Berkas `scripts/zlce-check.py`, `scripts/zlce-snapshot.sh`, dan `scripts/zlce-collect.py` di folder luar `scripts/` adalah wrapper tipis yang otomatis meneruskan argumen ke skrip kanonik di `scripts/zlce/`.

---

## Cara Kerja & 4 Gerbang Kualitas

```text
Gerbang 1  BLUEPRINT.md                 → Diperiksa & disetujui pengguna
Gerbang 2  ARCHITECTURE + DATA_MODEL    → Diperiksa & disetujui pengguna (khusus mode FULL)
Gerbang 3  TASKS.md + TESTING.md        → Diperiksa & disetujui pengguna
Gerbang 4  SESSION_STATE + AI_WORKFLOW  → Eksekusi tugas atomik dimulai
```

Saat eksekusi berjalan, setiap perubahan status dicatat pada matriks task dan blok WAL (*Write-Ahead Log*) **sebelum** modifikasi kode dilakukan. Jika sesi terputus, AI membaca blok WAL, membandingkannya dengan status git, dan menentukan protokol pemulihan:

| Kasus | Kondisi Pemulihan | Prosedur |
| :-: | :--- | :--- |
| **A** | Working tree bersih | Melanjutkan langkah pertama task aktif yang tercatat di WAL. |
| **B** | Diff uncommitted sesuai WAL | Mempertahankan perubahan, memverifikasi hasil, lalu commit. |
| **C** | Commit ada di git log namun belum di state | Sinkronisasi `SESSION_STATE.md` dengan log git terbaru. |
| **D** | Perubahan di luar daftar berkas WAL | Menahan modifikasi, task dialihkan ke `BLOCKED` untuk persetujuan pengguna. |

Panduan detail alur kerja operasional dan triase revisi: [`docs/USAGE.md`](docs/USAGE.md).

---

## Struktur Repositori

<details open>
<summary><b>Tampilkan Struktur Berkas</b></summary>

```text
.
├── LANDING_PROMPT.md          # Prompt inisiasi proyek baru / restrukturisasi
├── HANDOVER_PROMPT.md         # Prompt serah terima dan protokol recovery
├── ZLCE_KIT_SINGLE.md         # Bundel mandiri 1 berkas (kompatibel AI chat web)
├── templates/                 # 9 template dokumen kontrol + subfolder profiles/
│   ├── BLUEPRINT.template.md      # Gerbang 1: Visi, lingkup, kriteria selesai
│   ├── ARCHITECTURE.template.md   # Gerbang 2: Arsitektur & batasan sistem
│   ├── DATA_MODEL.template.md     # Gerbang 2: Skema data & migrasi
│   ├── TASKS.template.md          # Gerbang 3: Daftar task atomik
│   ├── TESTING.template.md        # Gerbang 3: Rencana pengujian
│   ├── CHECKLISTS.template.md     # Gerbang 4: Checklist rilis
│   ├── AI_WORKFLOW.template.md    # Gerbang 4: Aturan main agen
│   ├── SESSION_STATE.template.md  # Gerbang 4: Matriks state & WAL aktif
│   ├── CHANGELOG.template.md      # Gerbang 4: Log riwayat rilis
│   └── profiles/
│       └── DOMAIN_BOOKING.profile.md  # Profil domain reservasi & sewa
├── examples/                  # Contoh dokumen SESSION_STATE yang valid
├── scripts/                   # Wrapper skrip (meneruskan eksekusi ke scripts/zlce/)
│   └── zlce/                  # Skrip kanonik (salin folder ini ke repo proyek Anda)
│       ├── zlce-check.py      # Validator integritas format & dependensi state
│       ├── zlce-snapshot.sh   # Snapshot git diff dan WAL untuk recovery
│       └── zlce-collect.py    # Kolektor bundle diagnostik
├── src/                       # Kode sumber ZLCE Studio (React 19 + Vite + Tailwind v4)
│   ├── components/            # Komponen antarmuka (Editor, Recovery, Triage, dll.)
│   ├── hooks/                 # Custom hook (persistensi riwayat lokal & undo/redo)
│   ├── data/                  # Template data & 14 skenario benchmark
│   ├── utils/                 # Parser Markdown, validator skema, helper clipboard & UUID
│   └── types/                 # Definisi tipe TypeScript
├── docs/                      # Dokumentasi komprehensif
│   ├── USAGE.md               # Panduan penggunaan lengkap 3 alur & triase revisi
│   └── reviews/               # Laporan audit & catatan review versi
├── data/                      # Bukti hasil evaluasi kit
│   └── FEEDBACK_ZLCE_EVALUASI.md
├── CHANGELOG.md               # Riwayat perubahan per versi
├── CONTRIBUTING.md            # Panduan kontribusi kode
├── SECURITY.md                # Kebijakan privasi & pelaporan kerentanan
├── LICENSE                    # Lisensi resmi (MIT)
├── index.html                 # HTML entry point aplikasi web
├── package.json               # Konfigurasi dependensi npm
├── tsconfig.json              # Konfigurasi TypeScript
└── vite.config.ts             # Konfigurasi bundler Vite
```

</details>

Template tersedia dalam tiga bentuk dari satu sumber kebenaran:
1. **Berkas modular** di `templates/` untuk IDE AI (Cursor, Windsurf, VS Code).
2. **Bundel mandiri** di `ZLCE_KIT_SINGLE.md` untuk AI berbasis prompt tunggal (ChatGPT, Claude web).
3. **Impor statis** (`?raw`) ke dalam ZLCE Studio saat build aplikasi web.

---

## Hasil Pengujian

Kit ZLCE v3.2.2 telah diuji dengan 14 skenario evaluasi (gerbang, verifikasi, triase revisi, anti-halusinasi, handover, recovery A–D, format checkpoint, dan aturan jam). 13 skenario diuji terotomatisasi di tab Harness dan 1 skenario (kompatibilitas CLI) diuji secara manual.

| Parameter | Catatan Verifikasi |
| :--- | :--- |
| **Hasil** | **14 / 14 LULUS (100% Pass Rate)** |
| **Model AI Diuji** | Google Gemini 3.8 Flash / Anthropic Claude 3.5 Sonnet |
| **Suhu (Temperature) & Run** | `0.2` · 3 run konsisten |
| **Tanggal & Versi Kit** | 2026-10-21 · v3.2.2 |
| **Bukti Transparan** | [`data/FEEDBACK_ZLCE_EVALUASI.md`](data/FEEDBACK_ZLCE_EVALUASI.md) |

<details>
<summary><b>Daftar 14 Skenario Pengujian</b></summary>

- **T1**: Inisiasi Proyek Baru & Kepatuhan Gerbang 1
- **T2**: Uji Manual Kompatibilitas CLI & Git (`zlce-check`, `zlce-collect`, `zlce-snapshot`)
- **T3**: Penolakan Penandaan DONE Tanpa Bukti Riil
- **T4a**: Triase Revisi Level S (Typo / Perubahan <5 Baris)
- **T4b**: Triase Revisi Level M Dependen (Memperbarui Task Aktif)
- **T4c**: Triase Revisi Level M Independen (Menjadwalkan Task PENDING Baru)
- **T5**: Protokol Anti-Halusinasi Konfigurasi & Berkas
- **T6**: Handover Mode Normal
- **T7A**: Recovery Kasus A (Working Tree Bersih)
- **T7B**: Recovery Kasus B (Diff Uncommitted Sesuai WAL)
- **T7C**: Recovery Kasus C (Untracked Commit di Luar State)
- **T7D**: Recovery Kasus D (Perubahan di Luar WAL)
- **T8**: Format Checkpoint Block & Transaksionalitas WAL
- **X1**: Aturan Jam Anti-Ekstrapolasi (Fallback Wajib `"jam: ?"`)

</details>

---

## Batasan yang Diketahui

- **Karakteristik AI**: Kepatuhan AI terhadap protokol bersifat probabilistik. Hasil evaluasi 14/14 berlaku untuk model dan konfigurasi yang tertera di atas.
- **Cakupan Validator Web**: Validator di aplikasi web memeriksa semua aturan integritas internal yang terdapat di `SESSION_STATE.md`. Pemeriksaan silang terhadap berkas `TASKS.md` dan integrasi git log/diff memerlukan skrip terminal (`zlce-check.py` dan `zlce-snapshot.sh`).
- **Estimasi Token**: Perhitungan token pada gauge Studio menggunakan rasio aproksimasi standar (1 token ≈ 4 karakter).
- **Lingkungan CLI**: Skrip shell `zlce-snapshot.sh` membutuhkan interpreter bash standar (di sistem operasi Windows, gunakan WSL atau Git Bash).
- **Operasi Git**: Aplikasi web ZLCE Studio berjalan di browser dan tidak mengakses sistem berkas lokal atau git secara langsung; gunakan antarmuka CLI yang disediakan untuk operasi git.

---

## Privasi dan Keamanan

ZLCE Studio berjalan sepenuhnya di sisi peramban (*client-side*). Draf pekerjaan disimpan secara lokal di `localStorage` perangkat Anda dan tidak pernah dikirimkan ke server jarak jauh mana pun. Jangan pernah mencantumkan rahasia produksi (kunci API, kredensial database) di dalam `SESSION_STATE.md`. Untuk informasi selengkapnya atau pelaporan kerentanan, silakan baca [`SECURITY.md`](SECURITY.md).

---

## Kontribusi

Kontribusi berupa saran, perbaikan bug, atau penambahan fitur sangat disambut. Sebelum mengajukan *Pull Request*, pastikan:

```bash
npm ci
npm run lint
npm run build
python3 scripts/zlce/zlce-check.py --state examples/SESSION_STATE.example.md --no-git
```

Jika Anda mengubah berkas template di `templates/` atau prompt kontrol, pastikan untuk menyelaraskan `ZLCE_KIT_SINGLE.md`. Panduan kontribusi selengkapnya dapat dibaca di [`CONTRIBUTING.md`](CONTRIBUTING.md). Riwayat versi dapat dilihat di [`CHANGELOG.md`](CHANGELOG.md).

---

## Lisensi

Didistribusikan di bawah lisensi [MIT](LICENSE) © 2026 ZLCE Project Contributors.

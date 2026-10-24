<div align="center">

# ZLCE Studio

**Kit dan aplikasi web untuk menjaga konteks proyek tetap utuh saat bekerja dengan AI coding agent, lewat berkas status terstruktur dan protokol serah terima.**

*Zero-Loss Context Engineering: a kit and web workbench that keeps AI coding sessions consistent across context resets, using structured state files and a handover protocol.*

[![CI](https://github.com/<OWNER>/<REPO>/actions/workflows/ci.yml/badge.svg)](https://github.com/<OWNER>/<REPO>/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Node](https://img.shields.io/badge/node-%3E%3D20-339933.svg)](#prasyarat)
[![Version](https://img.shields.io/badge/version-3.2.2-informational.svg)](CHANGELOG.md)

[Demo langsung](https://<DEMO-URL>) · [Mulai cepat](#mulai-cepat) · [Dokumentasi](docs/USAGE.md) · [Laporkan masalah](https://github.com/<OWNER>/<REPO>/issues)

<!-- TODO: ganti dengan screenshot/GIF nyata -->
<img src="docs/images/studio-overview.png" alt="Tampilan ZLCE Studio: editor SESSION_STATE, validator, dan panel recovery" width="860">

</div>

---

## Daftar isi

- [Apa itu ZLCE?](#apa-itu-zlce)
- [Fitur](#fitur)
- [Mulai cepat](#mulai-cepat)
  - [A. Pakai kit dengan AI Anda](#a-pakai-kit-dengan-ai-anda)
  - [B. Jalankan ZLCE Studio (web)](#b-jalankan-zlce-studio-web)
  - [C. Pakai skrip CLI](#c-pakai-skrip-cli)
- [Cara kerja](#cara-kerja)
- [Struktur repositori](#struktur-repositori)
- [Hasil pengujian](#hasil-pengujian)
- [Batasan yang diketahui](#batasan-yang-diketahui)
- [Privasi dan keamanan](#privasi-dan-keamanan)
- [Kontribusi](#kontribusi)
- [Lisensi](#lisensi)

## Apa itu ZLCE?

Saat mengerjakan proyek dengan AI coding assistant, konteks sering hilang: sesi baru tidak tahu keputusan arsitektur sebelumnya, token habis di tengah pekerjaan, atau AI mengubah hal yang tidak diminta.

ZLCE mengurangi masalah itu dengan satu prinsip: **status proyek ditulis di berkas, bukan diandalkan pada memori obrolan.**

- **`SESSION_STATE.md`** adalah sumber kebenaran tunggal: matriks task, catatan serah terima, dan *write-ahead log* (WAL) untuk langkah yang sedang berjalan.
- **Empat gerbang persetujuan** menahan AI agar tidak menulis kode sebelum rancangan disetujui.
- **Protokol handover dan recovery** memungkinkan sesi baru, atau AI lain, melanjutkan dari titik terakhir, termasuk setelah sesi terputus.
- Task bersifat atomik: satu `IN_PROGRESS` pada satu waktu, dan `DONE` hanya dengan bukti verifikasi dan persetujuan pengguna.

Kit ini bekerja dengan agen yang dapat membaca teks/berkas, mis. Google AI Studio, Claude Code, Cursor, Windsurf, ChatGPT. Lihat [Hasil pengujian](#hasil-pengujian) untuk apa yang benar-benar sudah diuji.

## Fitur

| Komponen | Isi |
| :--- | :--- |
| **Kit** | Prompt inisiasi (`LANDING_PROMPT.md`), prompt serah terima (`HANDOVER_PROMPT.md`), 9 template dokumen kontrol, profil domain booking |
| **Studio (web)** | Editor `SESSION_STATE` dengan sinkronisasi form dan Markdown, validator, wizard recovery kasus A-D, triase revisi, estimator ukuran state, tutorial interaktif, generator bundel kit |
| **CLI** | `zlce-check.py` (validasi state), `zlce-snapshot.sh` (snapshot git dan WAL), `zlce-collect.py` (kumpulan diagnostik) |

Mode proyek: **LITE** (bawaan, untuk proyek di bawah sekitar 15 task) dan **FULL** (sistem besar, 10 dokumen kontrol).

## Mulai cepat

### Prasyarat

| Untuk | Kebutuhan |
| :--- | :--- |
| Studio (web) | Node.js `<!-- TODO: versi minimum sesuai Vite terpasang, mis. 20.19+ -->`, npm |
| Skrip CLI | Python 3.10+, bash, git (di Windows: WSL atau Git Bash) |
| Kit saja | Tidak ada, cukup AI yang bisa menerima teks/berkas |

### A. Pakai kit dengan AI Anda

1. Pilih mode proyek: **LITE** (4 berkas: `BLUEPRINT`, `TASKS`, `SESSION_STATE`, `HANDOVER`) atau **FULL** (10 berkas).
2. Isi parameter di [`LANDING_PROMPT.md`](LANDING_PROMPT.md) (nama proyek, aksi `BARU`/`RESTRUKTURISASI`, mode, stack, kebutuhan inti).
3. Di sesi AI baru, lampirkan folder [`templates/`](templates/) (atau satu berkas [`ZLCE_KIT_SINGLE.md`](ZLCE_KIT_SINGLE.md) bila AI tidak mendukung banyak lampiran), lalu tempel prompt.
4. AI akan menghasilkan `BLUEPRINT.md` lalu **berhenti**. Periksa, lalu setujui:

   > Setujui Gerbang 1 (BLUEPRINT.md). Lanjutkan ke gerbang berikutnya.

Untuk melanjutkan di sesi lain atau AI lain, tempel [`HANDOVER_PROMPT.md`](HANDOVER_PROMPT.md) dan lampirkan `SESSION_STATE.md`.

| Situasi | Berkas yang dipakai |
| :--- | :--- |
| Proyek baru | `LANDING_PROMPT.md` (Aksi: `BARU`) |
| Merapikan proyek lama | `LANDING_PROMPT.md` (Aksi: `RESTRUKTURISASI`); AI tidak boleh mengubah kode sebelum audit selesai |
| Lanjut sesi / pindah AI | `HANDOVER_PROMPT.md` + `SESSION_STATE.md` |
| Sesi terputus | `bash scripts/zlce/zlce-snapshot.sh --diff`, atau tab **Recovery** di Studio |

### B. Jalankan ZLCE Studio (web)

```bash
git clone https://github.com/<OWNER>/<REPO>.git
cd <REPO>
npm ci
npm run dev
```

Buka <http://localhost:3000>.

```bash
npm run build     # hasil di dist/
npm run preview   # pratinjau build produksi
```

### C. Pakai skrip CLI

Coba langsung dengan contoh yang disertakan:

```bash
python3 scripts/zlce/zlce-check.py --state examples/SESSION_STATE.example.md --no-git
# RESULT: OK (0 error, ...)
```

Di proyek Anda sendiri, salin `scripts/zlce/` ke repositori proyek lalu jalankan dari root:

```bash
python3 scripts/zlce/zlce-check.py .          # validasi SESSION_STATE.md
python3 scripts/zlce/zlce-check.py . --strict # peringatan dianggap error
bash scripts/zlce/zlce-snapshot.sh --diff     # snapshot untuk recovery
```

Kode keluar: `0` = tidak ada error, `1` = ada error (atau warn pada `--strict`), `2` = berkas tidak ditemukan.

> [!NOTE]
> `scripts/zlce-check.py` dan sejenisnya di folder `scripts/` hanya wrapper tipis yang meneruskan ke `scripts/zlce/`.

## Cara kerja

```text
Gerbang 1  BLUEPRINT.md                 → disetujui pengguna
Gerbang 2  ARCHITECTURE + DATA_MODEL    → disetujui pengguna   (hanya mode FULL)
Gerbang 3  TASKS.md + TESTING.md        → disetujui pengguna
Gerbang 4  SESSION_STATE + AI_WORKFLOW  → eksekusi task atomik dimulai
```

Saat eksekusi, setiap perubahan status dicatat di matriks task dan WAL **sebelum** tindakan diambil. Saat sesi terputus, AI baru membaca WAL, membandingkannya dengan `git diff`, dan menentukan salah satu kasus recovery:

| Kasus | Kondisi |
| :-: | :--- |
| A | Working tree bersih |
| B | Diff yang belum di-commit sesuai WAL |
| C | Commit ada di git log tetapi belum tercatat di state |
| D | Ada perubahan di luar daftar WAL |

Penjelasan lengkap, termasuk triase revisi: [`docs/USAGE.md`](docs/USAGE.md) <!-- TODO: pindahkan bagian 3-4 README lama ke sini -->.

## Struktur repositori

<details>
<summary>Tampilkan pohon repositori</summary>

```text
.
├── LANDING_PROMPT.md        # Prompt inisiasi (proyek baru / restrukturisasi)
├── HANDOVER_PROMPT.md       # Prompt serah terima dan recovery
├── ZLCE_KIT_SINGLE.md       # Bundel satu berkas (dibangun dari berkas di atas dan templates/)
├── templates/               # 9 template dokumen kontrol + profiles/
├── examples/                # Contoh SESSION_STATE terisi
├── scripts/                 # CLI: zlce/ (kanonik) + wrapper tipis
├── src/                     # ZLCE Studio (React 19, Vite, Tailwind CSS v4)
│   ├── components/  hooks/  data/  utils/  types/
├── docs/                    # Dokumentasi tambahan dan catatan review
├── data/                    # Hasil evaluasi kit
├── index.html  package.json  vite.config.ts  tsconfig.json
└── LICENSE
```

</details>

Template tersedia dalam tiga wujud dari satu sumber (`templates/`): berkas terpisah untuk IDE AI, bundel satu berkas untuk AI berbasis chat, dan impor `?raw` ke dalam Studio saat build.

## Hasil pengujian

Kit diuji dengan 14 skenario (gerbang, verifikasi, triase, anti-halusinasi, handover, recovery A-D, format checkpoint, aturan jam). 13 diuji otomatis di tab Harness dan 1 (kompatibilitas CLI) diuji manual.

| Item | Nilai |
| :--- | :--- |
| Hasil | 14 / 14 lulus |
| Model | <!-- TODO: isi persis, mis. Gemini ... / Claude ... --> |
| Temperature · jumlah run | 0.2 · 3 |
| Tanggal · versi kit | 2026-10-21 · v3.2.2 |
| Bukti rinci | [`data/FEEDBACK_ZLCE_EVALUASI.md`](data/FEEDBACK_ZLCE_EVALUASI.md) |

<details>
<summary>Daftar skenario</summary>

T1 Inisiasi & Gerbang 1 · T2 Kompatibilitas CLI & Git (manual) · T3 Penolakan DONE tanpa bukti · T4a/b/c Triase revisi (S, M dependen, M independen) · T5 Anti-halusinasi konfigurasi · T6 Handover normal · T7A/B/C/D Recovery · T8 Format checkpoint & WAL · X1 Aturan jam ("jam: ?")

</details>

## Batasan yang diketahui

- Kepatuhan AI terhadap protokol bersifat probabilistik; hasil uji berlaku untuk model dan konfigurasi di atas, bukan jaminan untuk semua model.
- Validator web memeriksa aturan yang hanya membutuhkan `SESSION_STATE.md`. Pemeriksaan silang `TASKS.md` dan git hanya ada di CLI.
- Estimasi token memakai pendekatan 1 token ≈ 4 karakter.
- <!-- TODO: tambahkan batasan lain yang Anda ketahui -->

## Privasi dan keamanan

Studio berjalan sepenuhnya di peramban. Draf disimpan di `localStorage` perangkat Anda dan tidak dikirim ke server mana pun. Jangan menaruh rahasia (kunci API, kredensial) di `SESSION_STATE.md`. Untuk melaporkan kerentanan, lihat [`SECURITY.md`](SECURITY.md) <!-- TODO: buat berkas ini -->.

## Kontribusi

Issue dan pull request disambut. Sebelum mengirim PR:

```bash
npm ci
npm run lint
npm run build
python3 scripts/zlce/zlce-check.py --state examples/SESSION_STATE.example.md --no-git
```

Bila mengubah `LANDING_PROMPT.md`, `HANDOVER_PROMPT.md`, atau `templates/`, bangun ulang bundel: `python3 scripts/build-kit.py`. Panduan lengkap: [`CONTRIBUTING.md`](CONTRIBUTING.md) <!-- TODO -->. Riwayat perubahan: [`CHANGELOG.md`](CHANGELOG.md) <!-- TODO -->.

## Lisensi

[MIT](LICENSE) © <!-- TODO: tahun dan nama pemegang hak cipta -->

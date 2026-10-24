# Panduan Penggunaan Lengkap ZLCE (Usage Guide)

Dokumen ini memuat panduan operasional detail untuk metodologi dan perangkat **ZLCE (Zero-Loss Context Engineering) v3.2.2**.

---

## Daftar Isi
- [1. Matriks Situasi Kerja](#1-matriks-situasi-kerja)
- [2. Tiga Jalur Alur Kerja Operasional](#2-tiga-jalur-alur-kerja-operasional)
  - [Jalur 1: Proyek Baru (Mulai dari Nol)](#jalur-1-proyek-baru-mulai-dari-nol)
  - [Jalur 2: Lanjut Sesi / Pindah AI / Sesi Terputus](#jalur-2-lanjut-sesi--pindah-ai--sesi-terputus)
  - [Jalur 3: Proyek Existing yang Direstrukturisasi](#jalur-3-proyek-existing-yang-direstrukturisasi)
- [3. Protokol Pemulihan Darurat (Recovery Kasus A–D)](#3-protokol-pemulihan-darurat-recovery-kasus-ad)
- [4. Aturan Triase Revisi (R1–R7)](#4-aturan-triase-revisi-r1r7)
- [5. Format Blok Checkpoint & WAL](#5-format-blok-checkpoint--wal)

---

## 1. Matriks Situasi Kerja

| Situasi Kerja | Tindakan & Berkas yang Digunakan |
| :--- | :--- |
| **Memulai Proyek Baru** | Gunakan `LANDING_PROMPT.md` (Aksi: `BARU`). Lampirkan template kontrol atau `ZLCE_KIT_SINGLE.md`. |
| **Melanjutkan Sesi / Pindah AI / Sesi Normal Selesai** | Gunakan `HANDOVER_PROMPT.md` + lampirkan `SESSION_STATE.md`. |
| **Merapikan Proyek Lama (Existing Codebase)** | Gunakan `LANDING_PROMPT.md` (Aksi: `RESTRUKTURISASI`). AI dilarang mengubah kode sebelum audit dan matriks selesai. |
| **Validasi Integritas Format State** | Jalankan `python3 scripts/zlce/zlce-check.py .` di terminal, atau gunakan tab **Session State** di ZLCE Studio. |
| **Sesi Terputus Tiba-Tiba (Crash / Token Limit)** | Jalankan `bash scripts/zlce/zlce-snapshot.sh --diff` atau buka tab **Recovery** di ZLCE Studio untuk pemulihan Kasus A–D. |

---

## 2. Tiga Jalur Alur Kerja Operasional

### Jalur 1: Proyek Baru (Mulai dari Nol)
1. **Inisiasi via Landing Prompt**:
   - Tentukan mode: **LITE** (4 berkas kontrol: `BLUEPRINT`, `TASKS`, `SESSION_STATE`, `HANDOVER`) atau **FULL** (10 dokumen lengkap).
   - Isi parameter di `LANDING_PROMPT.md` (Nama Proyek, Aksi `BARU`, Tech Stack, Kebutuhan Inti).
   - Lampirkan `templates/` (atau `ZLCE_KIT_SINGLE.md`), lalu kirim prompt.
2. **Gerbang Kualitas Bertahap (Quality Gates)**:
   - **Gerbang 1**: AI menyusun `BLUEPRINT.md` (Visi, Lingkup, Batasan, Acceptance Criteria) lalu **BERHENTI**. Anda memeriksa dan memberikan persetujuan eksplisit.
   - **Gerbang 2** *(Hanya Mode FULL)*: AI menyusun `ARCHITECTURE.md` & `DATA_MODEL.md` lalu berhenti untuk persetujuan.
   - **Gerbang 3**: AI menyusun `TASKS.md` (antrean tugas atomik berbobot) dan `TESTING.md`. Anda memeriksa dan menyetujui.
   - **Gerbang 4**: AI menginisialisasi `SESSION_STATE.md` dan `AI_WORKFLOW.md`. Eksekusi task atomik dimulai.
3. **Eksekusi Atomik & Transaksional**:
   - Tepat **1 task** berstatus `IN_PROGRESS` pada satu waktu.
   - Status dicatat di tabel matriks task dan blok WAL (*Write-Ahead Log*) **sebelum** modifikasi kode dilakukan.
   - Status `DONE` hanya sah bila disertai bukti verifikasi riil (output tes, tangkapan build, atau perintah verifikasi).

---

### Jalur 2: Lanjut Sesi / Pindah AI / Sesi Terputus
1. **Persiapkan Dokumen Serah Terima**:
   - Ambil `SESSION_STATE.md` dari sesi sebelumnya.
   - Jika sesi terputus di tengah jalan, jalankan:
     ```bash
     bash scripts/zlce/zlce-snapshot.sh --diff
     ```
     *(Atau buat snapshot melalui wizard tab **Recovery** di ZLCE Studio).*
2. **Panggil AI Baru dengan Handover**:
   - Buka sesi AI baru (di platform yang sama atau berbeda).
   - Tempelkan isi `HANDOVER_PROMPT.md` dan sertakan `SESSION_STATE.md` beserta cuplikan git diff.
   - AI akan otomatis mengenali kondisi recovery (Kasus A, B, C, atau D) dan melanjutkan pekerjaan tanpa kehilangan konteks.

---

### Jalur 3: Proyek Existing yang Direstrukturisasi
1. **Gunakan Mode Restrukturisasi**:
   - Set parameter di `LANDING_PROMPT.md`: `Aksi: RESTRUKTURISASI`.
   - Lampirkan direktori berkas kunci (mis. `package.json`, skema database, rute endpoint).
2. **Audit Baca-Saja (Read-Only Audit)**:
   - AI dilarang keras memodifikasi kode sebelum peta audit selesai disusun dalam `BLUEPRINT.md` dan `TASKS.md`.
   - Setelah tugas atomik disetujui, refactoring dilakukan per task terisolasi dengan verifikasi berbukti.

---

## 3. Protokol Pemulihan Darurat (Recovery Kasus A–D)

Ketika sesi AI terputus tiba-tiba atau token habis di tengah pekerjaan, bandingkan isi `git status / git diff` dengan blok WAL di `SESSION_STATE.md`:

| Kasus | Deskripsi Kondisi | Prosedur Pemulihan |
| :-: | :--- | :--- |
| **Kasus A** | *Working Tree Bersih*: Tidak ada diff uncommitted. Commit terakhir sudah tercatat di state. | Lanjutkan langkah pertama task aktif yang tercatat di WAL atau task berikutnya. |
| **Kasus B** | *In-Flight Diff Cocok dengan WAL*: Ada berkas termodifikasi dan semuanya tercantum di `plannedFiles` WAL. | Pertahankan diff, verifikasi apakah langkah telah tuntas. Jika tuntas, commit dan perbarui state. |
| **Kasus C** | *Commit Desync di Git Log*: Ada commit di `git log` yang belum tercatat statusnya di `SESSION_STATE.md`. | Selaraskan `SESSION_STATE.md` agar mencatat commit tersebut, update task matriks ke status yang sesuai. |
| **Kasus D** | *Wildcard Diff / Modifikasi di Luar WAL*: Ada perubahan file yang tidak tercantum dalam blok WAL. | Tahan perubahan. AI menandai task sebagai `BLOCKED` sementara dan meminta konfirmasi manusia sebelum melanjutkan atau revert. |

---

## 4. Aturan Triase Revisi (R1–R7)

Jika di tengah eksekusi pengguna meminta perubahan atau revisi:

- **Level S (Revisi Ringan / Typo / Perubahan < 5 baris)**:
  - Dikerjakan langsung di dalam task aktif yang sedang berjalan tanpa membuat task baru.
  - Dicatat di slot revisi atau baris log WAL.
- **Level M Dependen (Revisi Menengah Terkait Task Berjalan)**:
  - Perbarui kriteria verifikasi dan daftar berkas terdampak pada task aktif.
  - Tidak merusak urutan matriks task lain.
- **Level M Independen / Fitur Baru**:
  - Dilarang menyisipkan perubahan secara liar pada task aktif.
  - Dijadwalkan sebagai task baru (`TASK-XXX` berstatus `PENDING`) di antrean berikutnya setelah task aktif selesai.

---

## 5. Format Blok Checkpoint & WAL

Setiap interaksi kritis atau pembaruan status wajib mencantumkan blok checkpoint terstruktur:

```markdown
<!-- ZLCE:CHECKPOINT:START -->
Task: TASK-002
Status: IN_PROGRESS
Langkah Terakhir: Menambahkan skema migrasi database
Langkah Berikutnya: Mengimplementasikan repository pattern
Berkas Terdampak: src/db/schema.ts, src/db/index.ts
Bukti Verifikasi: npm run lint lolos tanpa error
Timestamp: 2026-10-22T06:00:00Z (atau "jam: ?")
<!-- ZLCE:CHECKPOINT:END -->
```

Aturan jam (`X1`): Jika lingkungan AI tidak memiliki akses jam sistem tepercaya, AI wajib menulis `"jam: ?"` dan dilarang mengarang/mengekstrapolasi waktu secara halusinasi.

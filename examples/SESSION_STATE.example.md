# STATUS SESI (SESSION_STATE.md): Todo API (contoh)

Contoh terisi. Sumber kebenaran tunggal status task dan titik pemulihan sesi.

---

## 0. KONTEKS PROYEK (statis)

* **Proyek:** Todo API
* **Stack:** FastAPI / SQLite / pytest
* **MODE:** LITE
* **Kemampuan Tulis Berkas AI:** TIDAK, gunakan Checkpoint Block
* **Kemampuan Eksekusi AI:** TIDAK, pengguna menjalankan perintah

---

## 1. STATUS AKTIF

* **Timestamp Audit:** 2026-10-14 10:20:00 WIB
* **Cabang Git:** `feature/task-002-schema`
* **Task Terakhir DONE:** `TASK-001`
* **Task Aktif:** `TASK-002`
* **Status Task Aktif:** IN_PROGRESS
* **Task Berikutnya:** `TASK-003`

---

## 2. MATRIKS TASK

| ID Task | Nama | Dependensi | Status | Bukti Verifikasi | Disetujui |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `TASK-001` | Inisialisasi repo | - | DONE | ruff 0 error, pytest 1/1 pass (evidence/TASK-001.txt) | ya |
| `TASK-002` | Skema database | TASK-001 | IN_PROGRESS | - | - |
| `TASK-003` | Endpoint CRUD | TASK-002 | PENDING | - | - |

---

## 3. WORK IN PROGRESS (WAL)

* **Task:** TASK-002
* **Langkah Sedang Dikerjakan:** menulis migrasi up/down untuk tabel `todos`
* **Berkas Direncanakan/Disentuh:** src/models/todo.py, migrations/001_todos.sql
* **Sudah Dilakukan:** model `Todo` selesai dan di-commit (wip)
* **Langkah Berikutnya (persis):** buat migrations/001_todos.sql (up + down), jalankan `pytest tests/test_migrations.py`
* **Perintah Verifikasi:** pytest tests/test_migrations.py
* **Diperbarui:** 2026-10-14 10:20 WIB

---

## 4. ASSUMPTIONS & OPEN QUESTIONS

| ID | Jenis | Isi | Dampak jika salah | Status |
| :--- | :--- | :--- | :--- | :--- |
| `ASM-01` | Asumsi | SQLite cukup untuk produksi awal | Perlu migrasi ke PostgreSQL | OPEN |

---

## 5. SLOT REVISI AKTIF

| ID | Level (S/M/L) | Deskripsi | Tindakan |
| :--- | :--- | :--- | :--- |
| (kosong) | | | |

---

## 6. CATATAN SERAH TERIMA (ditimpa; maks. ~10 baris)

* [2026-10-14] Pengguna menolak ORM berat; pakai SQL mentah terparameter.

---

## 7. LOG AUDIT

* **[2026-10-14 10:20 WIB]:** WAL TASK-002 diisi; commit wip(models) a1b2c3

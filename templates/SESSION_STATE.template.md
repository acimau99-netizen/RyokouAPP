# STATUS SESI (SESSION_STATE.md): [NAMA_PROYEK]

**Sumber kebenaran tunggal status task dan titik pemulihan sesi.** Perbarui pada setiap perubahan status task, setiap commit, dan setiap langkah WAL. Enum: `PENDING | READY | IN_PROGRESS | BLOCKED | DONE`.
Format dibaca skrip `scripts/zlce/zlce-check.py`; jangan ubah nama field, kolom, atau nomor bagian.

---

## 0. KONTEKS PROYEK (statis)

* **Proyek:** [NAMA_PROYEK]
* **Stack:** [TECH_STACK]
* **MODE:** [FULL | LITE]
* **Kemampuan Tulis Berkas AI:** [YA | TIDAK, gunakan Checkpoint Block]
* **Kemampuan Eksekusi AI:** [YA | TIDAK, pengguna menjalankan perintah]

---

## 1. STATUS AKTIF

* **Timestamp Audit:** [YYYY-MM-DD HH:MM:SS TZ | YYYY-MM-DD jam: ?]
* **Cabang Git:** `[branch]`
* **Task Terakhir DONE:** `[TASK-ID]`
* **Task Aktif:** `[TASK-ID]`
* **Status Task Aktif:** [IN_PROGRESS | READY | BLOCKED]
* **Task Berikutnya:** `[TASK-ID]`

---

## 2. MATRIKS TASK

| ID Task | Nama | Dependensi | Status | Bukti Verifikasi | Disetujui |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `TASK-001` | [..] | - | READY | - | - |
| `TASK-002` | [..] | TASK-001 | PENDING | - | - |

Bukti Verifikasi: ringkasan + lokasi bukti (mis. "lint 0 error, 12/12 test pass; docs/evidence/TASK-002.txt"). `DONE` tanpa bukti dan `Disetujui: ya` tidak valid.

---

## 3. WORK IN PROGRESS (WAL)

Catatan tulis-dahulu: isi SEBELUM memulai langkah multi-berkas, perbarui SESUDAH langkah selesai. Kosongkan (semua `-`) saat task `DONE`.

* **Task:** -
* **Langkah Sedang Dikerjakan:** -
* **Berkas Direncanakan/Disentuh:** -
* **Sudah Dilakukan:** -
* **Langkah Berikutnya (persis):** -
* **Perintah Verifikasi:** -
* **Diperbarui:** -

---

## 4. ASSUMPTIONS & OPEN QUESTIONS

| ID | Jenis | Isi | Dampak jika salah | Status |
| :--- | :--- | :--- | :--- | :--- |
| `ASM-01` | Asumsi | [..] | [..] | OPEN |

Status: `OPEN | CONFIRMED | REJECTED | ANSWERED`. Jika ragu, catat di sini dan tanyakan; jangan mengarang.

---

## 5. SLOT REVISI AKTIF

| ID | Level (S/M/L) | Deskripsi | Tindakan |
| :--- | :--- | :--- | :--- |
| (kosong) | | | |

---

## 6. CATATAN SERAH TERIMA (ditimpa; maks. ~10 baris)

Konteks yang belum tertulis di berkas lain: keputusan penting, jebakan yang ditemukan, preferensi pengguna yang relevan, langkah pertama yang disarankan.

* [YYYY-MM-DD] [catatan]

---

## 7. LOG AUDIT (terbaru di atas; arsipkan entri lama ke `docs/archive/`)

* **[YYYY-MM-DD (HH:MM TZ | jam: ?)]:** [peristiwa singkat + referensi task/commit]

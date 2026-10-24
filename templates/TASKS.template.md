# BACKLOG TASK PENGEMBANGAN: [NAMA_PROYEK]

Definisi task. **Status task tidak ditulis di sini**; status ada di `SESSION_STATE.md`. Enum dan aturan: `AI_WORKFLOW.md`.

---

## 1. PETA FASE (indikatif; sesuaikan jumlah dan rentang)

* **FASE 0: Pondasi & Spesifikasi** (`TASK-001` s/d `TASK-00N`)
* **FASE 1: Arsitektur Inti & Model Data**
* **FASE 2: Engine Bisnis & Layanan**
* **FASE 3: Antarmuka & Portal Admin**
* **FASE 4: Integrasi, QA & Hardening**

---

## 2. FORMAT TASK

### TASK-001: Inisialisasi Repositori & Dokumen Kontrol
* **Fase:** FASE 0
* **Deskripsi:** Setup runtime, gitignore, linter, `.env.example`, seluruh berkas kontrol terisi.
* **Dependensi:** -
* **File:** `.gitignore`, `.env.example`, berkas kontrol `*.md`
* **Docs Terkait (Tier 1):** `BLUEPRINT.md`, `ARCHITECTURE.md`
* **Docs Impact:** -
* **Acceptance Criteria:**
  1. Berkas kontrol sesuai MODE (FULL/LITE) terisi dan disetujui.
  2. Linter/build berjalan 0 error.
* **Test Case:** -
* **Metode Verifikasi:** jalankan linter dan build; tempel output.

---

### TASK-002: Skema Database & Migrasi
* **Fase:** FASE 1
* **Deskripsi:** Implementasi entitas sesuai `DATA_MODEL.md`.
* **Dependensi:** `TASK-001`
* **File:** `src/models/*` / file migrasi
* **Docs Terkait:** `DATA_MODEL.md`
* **Docs Impact:** `DATA_MODEL`
* **Acceptance Criteria:**
  1. Kolom, tipe, FK, indeks sesuai `DATA_MODEL.md`.
  2. Migrasi sukses; rollback teruji.
* **Test Case:** `TC-xx`
* **Metode Verifikasi:** jalankan migration up/down; tempel output.

---

## 3. TEMPLATE TASK REVISI

### TASK-REV-NN: [Judul]
* **Asal:** [sumber revisi / tanggal]
* **Level:** M | L
* **Mem-preempt:** [TASK-ID yang dijeda]
* **Deskripsi / Dependensi / File / Docs Terkait / Docs Impact / AC / Test Case / Metode Verifikasi:** (sama seperti di atas)

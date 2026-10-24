# SPESIFIKASI TEKNIS & BLUEPRINT SISTEM: [NAMA_PROYEK]

Spesifikasi sistem, batasan domain, matriks modul, dan NFR. Diperbarui bila task dengan `Docs Impact: BLUEPRINT` selesai.

---

## 1. PARAMETER SISTEM & LINGKUNGAN

* **Nama Sistem:** [NAMA]
* **Profil Domain:** [none | booking | ...] (lihat `templates/profiles/`)
* **Lingkungan Produksi:**
  - Runtime: [CONTOH: Node.js 20+ / PHP 8.2 / Python 3.12 / Go 1.22]
  - Web Server: [CONTOH: Nginx / Apache / LiteSpeed / Cloud Run]
  - Database: [CONTOH: PostgreSQL 16 / MariaDB 10.11]
  - Framework / CMS: [CONTOH: Next.js 15 / WordPress 6.x / FastAPI]
* **Versi Dependensi Terverifikasi:**

| Dependensi | Versi | Sumber Verifikasi | Tanggal |
| :--- | :--- | :--- | :--- |
| [nama] | [x.y.z] | [dokumentasi resmi / lockfile] | [YYYY-MM-DD] |

* **Standar Keamanan:**
  - Transit: HTTPS / TLS 1.2+ (prefer 1.3)
  - Masukan: validasi tipe ketat + proteksi anti-forgery sesuai framework (CSRF token / nonce)
  - Injeksi: prepared statement / ORM terparameter
  - Rahasia: `.env` / secret manager; tidak ada di repositori

---

## 2. BATASAN DOMAIN BISNIS

1. **Aturan Bisnis (BR-xx):**
   - `BR-01`: [aturan terukur]
   - `BR-02`: [aturan terukur]
2. **Lingkup & Batas Operasional:**
   - Wilayah layanan: [..]
   - Jam operasional: [..]
3. **Out of Scope:**
   - [hal yang secara eksplisit TIDAK dikerjakan]

---

## 3. MATRIKS MODUL

| ID Modul | Nama Modul | Fungsi Utama | Dependensi |
| :--- | :--- | :--- | :--- |
| `MOD-01` | Core | Inisialisasi, konfigurasi | Runtime |
| `MOD-02` | Auth & RBAC | Hak akses | MOD-01 |
| `MOD-03` | Skema Data | Entitas & relasi | MOD-01 |
| `MOD-04` | Logika Bisnis | Kalkulasi, validasi, state transition | MOD-03 |
| `MOD-05` | UI | Form, portal pengguna | MOD-04 |
| `MOD-06` | Dashboard Admin | Operasional, laporan | MOD-02, MOD-04 |
| `MOD-07` | Integrasi | Pembayaran, notifikasi, webhook | MOD-04 |

---

## 4. INTEGRASI EKSTERNAL

* Pembayaran: [..]
* Notifikasi: [..]
* Peta/Geo: [..]

---

## 5. NFR

1. Performa: [target terukur, mis. API p95 < 300ms; LCP < 2.5s]
2. Ketersediaan: [mis. 99.9%]
3. Auditability: mutasi data mencatat timestamp ISO 8601, ID pelaksana, status perubahan.

---

## 6. ASUMSI & PERTANYAAN TERBUKA AWAL
Salin ke `SESSION_STATE.md` bagian 3 sebagai `ASM-xx` / `Q-xx`. Tidak boleh ada pertanyaan terbuka berstatus kritis saat Gerbang 1 disetujui.

---

## 7. MODEL DATA RINGKAS (MODE LITE saja; FULL memakai `DATA_MODEL.md`)
* Entitas, kolom, tipe, constraint, indeks, state machine (Dari/Ke/Pemicu/Guard), formula.

---

## 8. STRATEGI UJI (MODE LITE saja; FULL memakai `TESTING.md`)
* Tipe uji, perintah menjalankan, kasus batas wajib, kriteria lulus.

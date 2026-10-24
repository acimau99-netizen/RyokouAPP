# Review & Saran Pengembangan: ZLCE Studio v3.2.2

Tanggal review: 2026-10-21
Objek: `ZLCEv3_2_2-main.zip` (44 berkas). Dibandingkan dengan review sebelumnya atas `ZLCEv3_2-main.zip` (v3.2).

## Cara membaca dokumen ini

- Catatan **hanya** dimuat bila ada solusi konkret.
- **[Terbukti]** = saya menjalankan kode/script dan melihat hasilnya. **[Pengamatan]** = dari pembacaan kode, belum direproduksi.
- Batasan: sandbox tanpa internet, jadi `npm install`, `tsc`, dan `vite build` tidak dijalankan, dan UI tidak diuji visual. Parser dan validator saya jalankan dengan Node 22 (type-stripping) dan checker dengan Python. Karena `src/types/zlce.ts` hilang dari zip (lihat 2.1), untuk pengujian saya memakai berkas tipe itu dari zip v3.2 sebelumnya.

## Ringkasan

Versi ini sudah menindaklanjuti sebagian besar saran review sebelumnya, dan hasilnya terverifikasi bekerja (bagian 1). Masalah terbesar sekarang bukan di logika, melainkan **zip tidak lengkap: aplikasi tidak bisa di-build dari isi zip ini** (bagian 2.1). Sisanya perbaikan kecil.

---

## 1. Perbaikan dari review sebelumnya yang terverifikasi berhasil

| Butir lama | Status di v3.2.2 | Bukti |
| :--- | :--- | :--- |
| Validator web tak setara `zlce-check.py` | **Teratasi** | Pada state yang sengaja salah: Python 4 error, validator TS kini juga 4 error (sebelumnya 0). Fixture kedua (DONE tanpa bukti, WAL salah): Python 7 error, TS memberi kode yang sama. Fixture ketiga (warning murni): keduanya melaporkan `PENDING→READY` dan `WAL kosong saat IN_PROGRESS`. |
| Parser membuang baris berisi "ID" | **Teratasi** | Baris "Pakai UUID v4 untuk PK" kini terbaca: `asumsi: ['ASM-01', 'ASM-02']` (sebelumnya hanya `ASM-02`). |
| Parser memakai data hantu "Todo API" | **Teratasi** | State tanpa field Stack kini menghasilkan `stack: -`, `activeTask: -`, `wal.task: -`; nama proyek diambil dari judul dokumen. |
| Clipboard tanpa fallback (22 titik) | **Teratasi** | 0 pemanggilan `navigator.clipboard` langsung di luar helper; 33 pemakaian `copyText()`, dan hasilnya (sukses/gagal) dipakai di UI. |
| Riwayat undo menyimpan `stateData` berulang | **Teratasi sebagian** | Riwayat kini disimpan ringan (`saveLightweightHistory`: tanpa `stateData`), dan dibangun ulang lewat parser saat dimuat. |
| Tiga salinan template berbeda | **Teratasi di rancangan** | `templates.ts` kini memakai impor `?raw` dari `templates/` dan contoh state dari `examples/`. (Namun lihat 2.1: folder `templates/` tidak ada di zip.) |
| `scripts/` vs `scripts/zlce/` duplikat | **Teratasi** | `scripts/zlce/` kini kanonik; `scripts/*.py|sh` berupa wrapper tipis. Wrapper berjalan benar dari direktori lain; seluruh dokumen kini konsisten memakai `scripts/zlce/…`. |
| `zlce-check.py` tak bisa menguji contoh | **Teratasi** | `python3 scripts/zlce-check.py --state examples/SESSION_STATE.example.md --no-git` → `OK (0 error, 1 warn, 3 task)`. |
| `lang="en"`, capability Gemini di `metadata.json` | **Teratasi** | `lang="id"`; `metadata.json` tidak lagi mendeklarasikan capability server-side. |
| Enum status asumsi tak cocok template | **Teratasi** | Parser kini menerima `CONFIRMED/REJECTED/ANSWERED` selain `RESOLVED/ACCEPTED`. |
| Bonus | | `vite-env.d.ts` untuk `*?raw`, alias `@`, `DISABLE_HMR`, dan `START_HERE.md` dilebur ke README. |

---

## 2. Prioritas TINGGI

### 2.1 Zip tidak lengkap: 4 kelompok berkas yang di-import tidak ada [Terbukti]

Saya memindai semua `import` relatif di `src/` dan mencocokkannya dengan isi zip:

| Berkas yang dicari | Diimpor oleh |
| :--- | :--- |
| `src/types/zlce.ts` | `App.tsx` + 14 komponen/util/hook, `templates.ts` |
| `src/data/scenarios.ts` | `TestHarnessTab.tsx` |
| `src/utils/uuid.ts` (`generateUUIDv4`) | `PersistentSidebar.tsx`, `FullscreenEditorModal.tsx` |
| `templates/*.template.md` (10 berkas, termasuk `profiles/DOMAIN_BOOKING.profile.md`) | `templates.ts` (impor `?raw`) |

Dampak: `npm run build` dan `npm run dev` akan gagal sejak resolusi modul. Folder `templates/` juga dirujuk README dan `LANDING_PROMPT.md` ("Lampirkan seluruh `templates/`"), sehingga kit untuk pengguna non-web pun kehilangan intinya. Dua dari berkas itu (`types/zlce.ts`, `scenarios.ts`) ada di zip v3.2 sebelumnya, jadi kemungkinan besar hanya terlewat saat paket dibuat atau belum ter-commit; `uuid.ts` tampaknya berkas baru hasil refaktor yang belum ikut.

**Solusi:**
1. Pulihkan `src/types/zlce.ts`, `src/data/scenarios.ts`, dan seluruh `templates/` dari v3.2 (isi template sudah tersimpan juga di `ZLCE_KIT_SINGLE.md`, yang tidak berubah dan sinkron dengan template v3.2).
2. Tambahkan `src/utils/uuid.ts`:
   ```ts
   export function generateUUIDv4(): string {
     if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
       return crypto.randomUUID();
     }
     if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
       const b = crypto.getRandomValues(new Uint8Array(16));
       b[6] = (b[6] & 0x0f) | 0x40; b[8] = (b[8] & 0x3f) | 0x80;
       const h = [...b].map(x => x.toString(16).padStart(2, '0'));
       return `${h.slice(0,4).join('')}-${h.slice(4,6).join('')}-${h.slice(6,8).join('')}-${h.slice(8,10).join('')}-${h.slice(10).join('')}`;
     }
     return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
       const r = (Math.random() * 16) | 0; return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
     });
   }
   ```
   (Fallback `getRandomValues` lebih baik daripada `Math.random` karena tetap acak secara kriptografis di konteks HTTP LAN, tempat `randomUUID` tidak tersedia.)
3. Cegah terulang: sebelum membuat zip, jalankan `git status --short` dan `git ls-files | wc -l` (bandingkan dengan isi zip), atau buat zip dengan `git archive --format=zip -o zlce.zip HEAD` supaya hanya berkas ter-commit yang masuk. Tambahkan CI minimal: `npm ci && npm run build`.

---

## 3. Prioritas SEDANG

### 3.1 Berkas kunci dependensi tidak konsisten dengan `package.json` [Terbukti]

`bun.lock` mencatat `lucide-react` dengan rentang `^0.546.0` (terkunci `0.546.0`), sedangkan `package.json` meminta `^1.16.0`. Rentang `^1.16.0` tidak mencakup `0.546.0`, jadi lockfile sudah usang. `bun install --frozen-lockfile` akan gagal, sementara `npm install` mengabaikan lockfile ini sehingga versi yang terpasang bisa berbeda antar mesin. README juga memakai `npm`, bukan `bun`.

**Solusi:** pilih satu pengelola paket. Bila npm: hapus `bun.lock`, jalankan `npm install` untuk menghasilkan `package-lock.json`, commit, dan pakai `npm ci` di CI. Bila bun: jalankan `bun install` ulang, ganti perintah di README. Sekaligus pastikan versi `lucide-react` yang dimaksud memang ada (`npm view lucide-react versions --json`); catatan kunci menunjukkan seri 0.5xx, jadi rentang `^1.16.0` perlu dikonfirmasi atau diselaraskan dengan yang benar-benar dipakai.

### 3.2 Provenansi dokumen evaluasi "13/13" masih sama [Terbukti]

`data/FEEDBACK_ZLCE_EVALUASI.md` tidak berubah, dan `TestHarnessTab.tsx` (baris 53–55) masih menulis `Tanggal: 2026-10-14`, `Model AI: Gemini 3.8 Flash / Claude 3.5 Sonnet`, `Suhu: 0.2` sebagai teks tetap. Semua "Catatan Evaluator" `-`, satu run per skenario, T2 tidak muncul. Hasilnya bisa saja valid, tetapi pembaca luar tidak dapat memeriksanya.

**Solusi:** jadikan tanggal, model, temperature, jumlah run, dan versi kit sebagai kolom isian di tab Harness; simpan transkrip per skenario di `data/transcripts/`; tambahkan baris T2 ("uji manual"); ganti badge menjadi redaksi terukur (mis. `13/13 · 3 run · model X`).

### 3.3 `.env.example` menyebut `GEMINI_API_KEY`, padahal aplikasi tidak memakainya [Terbukti]

Tidak ada pemakaian `process.env`/`import.meta.env`/SDK Gemini di `src/` (satu-satunya `process.env` ada di `vite.config.ts` untuk `DISABLE_HMR`). Contoh env ini menyesatkan, dan bila suatu hari seseorang memetakan kunci itu lewat `define` di Vite, kunci akan masuk ke bundel klien dan terlihat publik.

**Solusi:** hapus berkas atau ganti isinya menjadi komentar bahwa aplikasi 100% sisi klien dan tidak memerlukan variabel. Bila fitur AI ditambahkan kelak, panggil API lewat proxy sisi server, jangan menaruh kunci di `VITE_*`.

### 3.4 Berkas review ikut terkirim di `public/` [Terbukti]

`public/assets/aistudio/REVIEW_ZLCE_v3.2-1_ffd6a9d8.md` (±19 KB) berada di folder `public/`, yang disalin apa adanya ke hasil build dan dilayani publik pada URL statis. Berkas ini tampaknya sisa impor lampiran AI Studio.

**Solusi:** pindahkan ke `docs/` (di luar `public/`) bila ingin disimpan, atau hapus. Tambahkan `public/assets/aistudio/` ke `.gitignore` bila folder itu dibuat otomatis.

### 3.5 `__pycache__` ikut ter-commit [Terbukti]

`scripts/zlce/__pycache__/` ada di zip, sedangkan `.gitignore` belum mengabaikannya.

**Solusi:** tambahkan ke `.gitignore`:
```
__pycache__/
*.pyc
```
lalu `git rm -r --cached scripts/zlce/__pycache__`.

---

## 4. Prioritas RENDAH

### 4.1 Klaim "100% parity" di komentar validator sedikit berlebihan [Terbukti]

Komentar `zlceValidator.ts` kini berbunyi "100% parity with zlce-check.py". Pada 3 fixture saya, error dan warning setara, tetapi pemeriksaan silang `TASKS.md` (ada di Python) memang tidak mungkin dilakukan validator yang hanya menerima teks `SESSION_STATE.md`, begitu pula pemeriksaan git.

**Solusi:** ubah komentar menjadi "paritas untuk semua aturan yang hanya membutuhkan SESSION_STATE.md; silang TASKS.md dan git hanya di CLI". Agar klaim tetap benar seiring waktu, simpan fixture saya sebagai uji tetap: `tests/fixtures/*.md` + `*.expected.json`, dijalankan ke Python dan TS (Vitest) di CI. Tiga kasus yang sudah bisa dipakai: ID duplikat + dependensi hilang; DONE tanpa bukti + WAL tidak dikosongkan; PENDING→READY + WAL kosong saat `IN_PROGRESS`.

### 4.2 README: pemakaian wrapper belum didokumentasikan

Struktur repo di README hanya menunjukkan `scripts/zlce/`, padahal ada wrapper di `scripts/`. Pengguna yang melihat `scripts/zlce-check.py` tidak tahu itu hanya penerus.

**Solusi:** tambahkan satu baris di pohon README (`scripts/*.py|sh  # wrapper tipis ke scripts/zlce/`) atau hapus wrapper bila tidak diperlukan, supaya hanya ada satu jalur.

### 4.3 Server dev terbuka ke jaringan

`dev` memakai `--host 0.0.0.0` dan `vite.config.ts` memakai `allowedHosts: true`. Bila ini wajib untuk AI Studio/sandbox, beri komentar alasannya; untuk pemakaian lokal, jadikan `localhost` bawaan dan sediakan `dev:lan` terpisah (`vite --host 0.0.0.0`).

### 4.4 Hook riwayat: dua pola yang masih rapuh [Pengamatan]

`setHistoryIndex` masih dipanggil di dalam updater `setHistory(...)` (updater semestinya murni) dan flag `isInternalChangeRef` hanya dibersihkan saat efek berjalan. Keduanya bekerja pada alur normal; risikonya muncul bila logika ditambah. Bentuk `useReducer` `{ past, present, future }` dari review sebelumnya (hanya menyimpan `rawMarkdown`, `stateData` diturunkan lewat parser) menghilangkan keduanya, dan sekarang lebih mudah karena riwayat sudah ringan.

### 4.5 Skrip uji dan ESLint

`lint` masih sama dengan `tsc --noEmit`, dan belum ada skrip `test`. Tambahkan Vitest untuk `markdownParser` dan `zlceValidator` (lihat 4.1) dan beri nama `typecheck` pada skrip tipe.

---

## 5. Urutan pengerjaan yang disarankan

| Urutan | Pekerjaan | Perkiraan usaha |
| :--- | :--- | :--- |
| 1 | 2.1 Lengkapi zip (types, scenarios, uuid, templates) + `npm run build` | ±0,5 jam |
| 2 | 3.1 Satukan pengelola paket + lockfile | ±15 menit |
| 3 | 3.3, 3.4, 3.5 Bersihkan `.env.example`, `public/`, `__pycache__` | ±15 menit |
| 4 | 4.1 Fixture + Vitest di CI | ±2–3 jam |
| 5 | 3.2 Metadata evaluasi, transkrip, T2, run berulang | tergantung jumlah run |
| 6 | 4.2–4.5 | bertahap |

---

## 6. Ringkasan satu paragraf

Perbaikan dari review sebelumnya hampir semuanya masuk dan terbukti bekerja: validator web kini setara Python pada semua fixture yang saya coba, parser tidak lagi membuang baris atau mengarang data, clipboard aman, riwayat lebih ringan, dan jalur script rapi. Yang menghalangi pemakaian saat ini adalah paket yang tidak lengkap (`types/zlce.ts`, `data/scenarios.ts`, `utils/uuid.ts`, dan folder `templates/` tidak ada di zip) sehingga build gagal; setelah itu dipulihkan dan lockfile diselaraskan, sisa catatan adalah kebersihan repositori dan penguatan bukti evaluasi.

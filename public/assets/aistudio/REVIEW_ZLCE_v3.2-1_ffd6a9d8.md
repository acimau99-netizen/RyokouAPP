# Review & Saran Pengembangan: ZLCE Studio v3.2

Tanggal review: 2026-10-21
Objek: `ZLCEv3_2-main.zip` (65 berkas: kit prompt/template, 3 script bantu, aplikasi web React + Vite)

## Cara membaca dokumen ini

- Setiap catatan **hanya** dimuat bila ada solusi konkret. Tidak ada kritik tanpa jalan keluar.
- Label **[Terbukti]** berarti saya menjalankan kode/script dan melihat hasilnya sendiri. Label **[Pengamatan]** berarti dari pembacaan kode, belum direproduksi.
- Batasan review: sandbox tidak punya akses internet, jadi `npm install`, `tsc`, dan `vite build` **tidak** saya jalankan, dan UI tidak diuji secara visual. Saya menguji `markdownParser.ts` dan `zlceValidator.ts` dengan Node 22 (type-stripping), serta `zlce-check.py` dengan Python.

---

## 1. Yang sudah kuat (pertahankan)

- **Konsep inti jelas dan konsisten**: satu sumber kebenaran (`SESSION_STATE.md`), WAL, 4 gerbang, aturan R1–R13 yang spesifik dan bisa diuji. Kalimat "target, bukan jaminan" di `LANDING_PROMPT.md` jujur dan tepat.
- **Aturan Anti-Ekstrapolasi Jam (R3b/X1)**: detail kecil tetapi menyentuh kegagalan LLM yang nyata.
- **`zlce-check.py` tanpa dependensi** dan memeriksa lebih dari sekadar format (dependensi, header vs matriks, WAL vs IN_PROGRESS, silang dengan `TASKS.md`, status git).
- **`zlce-collect.py` menyamarkan rahasia** dan tidak pernah menyertakan `.env`/kunci privat. Ini praktik yang baik.
- **`ZLCE_KIT_SINGLE.md` sinkron dengan `templates/*.md`**: semua baris khas dari 9 template ditemukan di bundel tunggal.
- **Contoh `SESSION_STATE.example.md` lolos checker** (0 error), jadi dokumentasi dan alat saling cocok.
- Kit dwibahasa-konsisten (Indonesia), ringkas, dan punya jalur Skeleton Fallback bila template tidak terlampir.

---

## 2. Prioritas TINGGI

### 2.1 Validator di web app tidak setara dengan `zlce-check.py` [Terbukti]

`zlceValidator.ts` mengaku "port of zlce-check.py", tetapi hanya mengimplementasikan sebagian aturan. Saya mengisi satu `SESSION_STATE.md` yang sengaja salah (ID task duplikat, dependensi ke task yang tidak ada, task `IN_PROGRESS` padahal dependensinya belum `DONE`, header "READY" vs matriks "PENDING"):

| Pemeriksa | Hasil |
| :--- | :--- |
| `zlce-check.py` | **FAIL**: 4 error, 3 warn |
| `validateSessionState()` (web app) | **OK**: 0 error, 0 warn |

Dampak: pengguna yang bergantung pada indikator hijau di Header akan mengira state-nya sehat, padahal prompt HANDOVER meminta "pemeriksaan logis setara zlce-check".

**Solusi (dua lapis, kerjakan keduanya):**

1. **Lengkapi aturan yang belum ada** di `zlceValidator.ts`:
   - ID task duplikat
   - dependensi tidak ada di matriks
   - `IN_PROGRESS`/`DONE`/`READY` tetapi dependensi belum semua `DONE`
   - `PENDING` padahal semua dependensi `DONE` (warn)
   - `Status Task Aktif` di header ≠ status di matriks; `Task Terakhir DONE` bukan `DONE`
   - WAL: task WAL ≠ task `IN_PROGRESS`, WAL belum dikosongkan padahal `DONE`, `IN_PROGRESS` tetapi WAL kosong (warn)

   Kerangka yang mudah ditambahkan karena `parseSessionStateMarkdown` sudah menghasilkan `tasks`, `status`, dan `wal`:

   ```ts
   const byId = new Map(parsed.tasks.map(t => [t.id, t]));
   const depsOf = (t: ZLCETask) => t.dependencies.match(/TASK-(?:REV-)?\d+/g) ?? [];
   for (const t of parsed.tasks) {
     for (const d of depsOf(t)) {
       if (!byId.has(d)) push('error', 'DEP_MISSING', `${t.id}: dependensi ${d} tidak ada di matriks`);
     }
     const depsDone = depsOf(t).every(d => byId.get(d)?.status === 'DONE');
     if (['IN_PROGRESS', 'DONE', 'READY'].includes(t.status) && !depsDone)
       push('error', 'DEP_NOT_DONE', `${t.id} berstatus ${t.status} tetapi dependensi belum semua DONE`);
   }
   ```

2. **Cegah drift selamanya dengan fixture bersama.** Buat `tests/fixtures/*.md` (mis. `ok.md`, `dup-id.md`, `dep-missing.md`, `header-mismatch.md`) dengan berkas `*.expected.json` berisi kode error yang diharapkan. Jalankan fixture yang sama ke `zlce-check.py` dan ke validator TS (Vitest) di CI. Bila salah satu berbeda, build gagal.

### 2.2 Parser membuang baris tabel yang mengandung teks "ID" [Terbukti]

Di `markdownParser.ts` (baris 106 dan 123), baris tabel Asumsi dan Revisi dilewati bila mengandung substring `ID` di mana pun, bukan hanya di baris header. Uji saya:

```
| `ASM-01` | Asumsi | Pakai UUID v4 untuk PK | ...   -> ikut terbuang
| `ASM-02` | Asumsi | Pakai SQLite           | ...   -> terbaca
asumsi terbaca: [ 'ASM-02' ]
```

Kata seperti `UUID`, `PID`, `ID pengguna`, `VALID` (huruf besar) sangat wajar muncul di asumsi teknis, sehingga data pengguna hilang dari tab visual tanpa peringatan. Karena README menjual "sinkronisasi dua arah", ini berisiko menimpa data saat form diserialisasi kembali.

**Solusi:** kenali baris header dari sel pertamanya, dan baris data dari pola ID:

```ts
const isSep = (s: string) => /^\|\s*:?-{3,}/.test(s);
const cells = (l: string) => l.split('|').slice(1, -1).map(c => c.trim());

// bagian 4
if (trimmed.startsWith('|') && !isSep(trimmed)) {
  const c = cells(line);
  const id = c[0]?.replace(/[`*]/g, '');
  if (/^(ASM|Q)-\d+$/.test(id) && c.length >= 5) { /* push assumption */ }
}
// bagian 5 (Revisi): pola /^(REV|R)-?\d+$/ atau cukup: c[0] !== 'ID' && c[0] !== '(kosong)'
```

Hal yang sama berlaku untuk bagian 2: pakai `/^TASK-(?:REV-)?\d+$/` pada sel pertama agar baris lain (mis. catatan di bawah tabel) tidak ikut terbaca sebagai task.

### 2.3 Parser mengisi nilai bawaan dari contoh "Todo API" ketika field tidak ada [Terbukti]

`parseSessionStateMarkdown` memulai dengan nilai tetap (`projectName: 'Todo API'`, `stack: 'FastAPI / SQLite / pytest'`, `activeTask: 'TASK-002'`, WAL berisi `migrations/001_todos.sql`, dst.). Bila field tidak ditemukan di markdown, nilai contoh itu **diam-diam tetap dipakai**. Uji saya dengan state "Toko Kopi" yang tidak punya baris Stack: hasilnya `stack: FastAPI / SQLite / pytest` dan `activeTask: TASK-002`, data hantu yang tidak ada di dokumen.

Ini berbahaya karena tab Recovery/Triage membaca `stateData`. Bisa muncul WAL palsu yang terlihat sah, padahal ini persis jenis "informasi karangan" yang ingin dicegah ZLCE.

**Solusi:** ganti semua default dengan nilai netral, dan biarkan validator melaporkan field yang hilang.

```ts
const context = { projectName: '', stack: '', mode: 'LITE' as const,
                  fileWriteCapability: '', execCapability: '' };
const status  = { timestampAudit: '', gitBranch: '', lastDoneTask: '-',
                  activeTask: '-', activeTaskStatus: 'READY' as TaskStatus, nextTask: '-' };
const wal     = { task: '-', currentStep: '-', plannedFiles: '-', completedSoFar: '-',
                  nextStepExact: '-', verificationCommand: '-', updatedTimestamp: '-' };
```

Nilai contoh "Todo API" cukup tetap hidup di `INITIAL_SESSION_STATE_MD` (templates.ts), bukan di parser.

---

## 3. Prioritas SEDANG

### 3.1 Tiga salinan template berisiko bergeser [Terbukti]

README sudah menjelaskan alasan memiliki 3 representasi (`templates/*.md`, `ZLCE_KIT_SINGLE.md`, `src/data/templates.ts`). Idenya masuk akal, tetapi ukurannya sudah berbeda: `templates.ts` memuat versi yang lebih ringkas dan bernada berbeda dari `SESSION_STATE.template.md` (mis. placeholder `[NAMA]` vs `[NAMA_PROYEK]`, `[CONTOH: ...]` vs `[TECH_STACK]`, dan kalimat "Format dibaca skrip `zlce-check.py`; jangan ubah nama field" tidak ada di versi TS). Aplikasi web dan kit file sekarang menampilkan template yang tidak identik.

**Solusi:** jadikan `templates/*.md` satu-satunya sumber, dan turunkan sisanya.

- **Web app:** Vite sudah mendukung impor mentah, jadi `templates.ts` tidak perlu menyalin isi:
  ```ts
  import sessionState from '../../templates/SESSION_STATE.template.md?raw';
  import aiWorkflow   from '../../templates/AI_WORKFLOW.template.md?raw';
  export const ZLCE_TEMPLATES: TemplateItem[] = [
    { id: 'session-state', filename: 'SESSION_STATE.md', content: sessionState, /* ... */ },
  ];
  ```
  Tambahkan `declare module '*.md?raw' { const s: string; export default s; }` di `src/vite-env.d.ts`.
- **Bundel tunggal:** buat `scripts/build-kit.py` yang merakit `ZLCE_KIT_SINGLE.md` dari `templates/` + prompt. Tambahkan mode `--check` di CI yang gagal bila hasil rakitan berbeda dari berkas yang ada.

Catatan: `INITIAL_SESSION_STATE_MD` boleh tetap terpisah karena memang contoh terisi, tetapi sebaiknya diimpor dari `examples/SESSION_STATE.example.md?raw` agar hanya ada satu contoh.

### 3.2 Folder `scripts/` dan `scripts/zlce/` berisi berkas identik, dan dokumen menunjuk dua jalur [Terbukti]

`diff` menunjukkan ketiga script identik di kedua lokasi. Sementara itu `START_HERE.md` memakai `python3 scripts/zlce-check.py .` tetapi `bash scripts/zlce/zlce-snapshot.sh --diff`; `LANDING_PROMPT.md` menyuruh menyalin `scripts/` ke `scripts/zlce/` di repositori target. Pembaca baru akan bingung jalur mana yang benar.

**Solusi:**
1. Hapus salinan `scripts/zlce/` dari kit (sumber tunggal: `scripts/`).
2. Bedakan dua konteks di dokumentasi: *jalur di kit ini* = `scripts/…`, *jalur di repositori proyek Anda* = `scripts/zlce/…`.
3. Tambahkan satu baris di `START_HERE.md`: "Salin folder `scripts/` ke `scripts/zlce/` di repositori Anda; semua perintah di panduan memakai jalur tujuan itu." Lalu seragamkan semua contoh perintah ke jalur tujuan.

(Sebagai alternatif, tambahkan `scripts/install-zlce.sh <target>` yang melakukan penyalinan itu satu kali.)

### 3.3 Provenansi dokumen evaluasi "13/13 LULUS" belum dapat diverifikasi pembaca [Terbukti]

`data/FEEDBACK_ZLCE_EVALUASI.md` dibuat dengan format yang persis sama dengan `generateFeedbackReport()` di `TestHarnessTab.tsx`. Di generator itu, `Tanggal: 2026-10-14`, `Model AI: Gemini 3.8 Flash / Claude 3.5 Sonnet`, dan `Suhu: 0.2` adalah **string tetap**, bukan input. Selain itu semua "Catatan Evaluator" bernilai `-`, ada satu run per skenario, dan butir T2 tidak muncul (di `zlce-collect.py` T2 ternyata uji manual, tetapi README dan berkas evaluasi tidak menjelaskannya).

Ini bukan berarti hasilnya salah. Masalahnya, pembaca luar tidak bisa membedakan hasil run nyata dari keluaran templat, dan badge "100% Pass" bisa dibaca sebagai klaim yang lebih kuat dari bukti yang tersedia.

**Solusi:**
1. Jadikan metadata input di tab Harness: tanggal (default hari ini), model, temperature, jumlah run, versi kit. Hapus string tetap dari generator.
2. Simpan transkrip mentah per skenario di `data/transcripts/T1.md` dst. dan tautkan dari berkas evaluasi. `zlce-collect.py` sudah punya folder `zlce-feedback/transcripts/` untuk ini.
3. Tambahkan baris **T2** dengan status eksplisit ("uji manual, belum dijalankan" atau hasilnya).
4. Ganti badge menjadi redaksi yang terukur, mis. `13/13 (T2 manual) · 1 run · model X`. Jalankan ≥3 run per model dan laporkan konsistensinya. Sifat LLM yang stokastik membuat "lulus sekali" kurang bermakna dibanding "lulus 3 dari 3".
5. Seragamkan daftar kompatibilitas di README (Gemini 2.5, Claude 3.5/3.7, GPT-4o/o1/o3) dengan model yang benar-benar diuji, atau pisahkan kolom "teruji" dan "diperkirakan kompatibel".

### 3.4 Pemanggilan clipboard tidak aman di konteks non-HTTPS (22 titik) [Terbukti hitungan; dampak berdasarkan pengamatan]

Ada 22 pemanggilan `navigator.clipboard.writeText(...)` langsung, tanpa `await`/`catch`. `npm run dev` dibuka dengan `--host 0.0.0.0` dan README menyarankan akses lewat jaringan; bila dibuka lewat `http://IP-LAN:3000`, peramban menganggapnya konteks tidak aman sehingga `navigator.clipboard` bernilai `undefined` dan setiap tombol "Salin" melempar `TypeError`. Selain itu, indikator "Tersalin ✓" tetap muncul walau penyalinan gagal.

**Solusi:** satu helper dengan fallback, lalu ganti seluruh pemanggilan:

```ts
// src/utils/clipboard.ts
export async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch { /* lanjut ke fallback */ }
  try {
    const ta = document.createElement('textarea');
    ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return ok;
  } catch { return false; }
}
// pemakaian: if (await copyText(x)) { setCopied(true); } else { setCopyError(true); }
```

### 3.5 Riwayat Undo/Redo: boros penyimpanan dan beberapa pola rapuh [Pengamatan]

Di `useSessionPersistence.ts`:
- Setiap snapshot (hingga 35) menyimpan `rawMarkdown` **dan** `stateData` utuh, dan `stateData.raw` berisi markdown lagi. Isi yang sama tersimpan hingga ±70 kali di `localStorage` (kuota ±5 MB), sehingga dokumen besar cepat mencapai batas. Kegagalan hanya ditangkap diam-diam (`catch { // Storage quota warning fallback }`), jadi pengguna tidak tahu riwayat berhenti tersimpan.
- `setHistoryIndex` dipanggil di dalam updater `setHistory(...)`. Updater React semestinya murni; ini berjalan karena idempoten, tetapi akan rapuh bila logika ditambah.
- `isInternalChangeRef` hanya dibersihkan ketika efek berjalan karena `rawMarkdown`/`stateData` berubah. Bila undo menuju snapshot dengan isi identik dengan kondisi saat ini, flag bisa tertinggal `true` dan satu edit berikutnya tidak tercatat. (Belum saya reproduksi; saya tandai sebagai kemungkinan.)

**Solusi:** pindahkan ke `useReducer` dengan bentuk `{ past, present, future }`, simpan **hanya `rawMarkdown`** di riwayat (turunkan `stateData` lewat `parseSessionStateMarkdown`), dan tampilkan peringatan ketika `setItem` gagal.

```ts
type H = { past: string[]; present: string; future: string[] };
function reducer(s: H, a: { type: 'edit'; md: string } | { type: 'undo' } | { type: 'redo' }): H {
  switch (a.type) {
    case 'edit': return s.present === a.md ? s
      : { past: [...s.past, s.present].slice(-35), present: a.md, future: [] };
    case 'undo': return s.past.length === 0 ? s
      : { past: s.past.slice(0, -1), present: s.past.at(-1)!, future: [s.present, ...s.future] };
    case 'redo': return s.future.length === 0 ? s
      : { past: [...s.past, s.present], present: s.future[0], future: s.future.slice(1) };
  }
}
```

Tanpa flag ref dan tanpa efek ganda, undo/redo menjadi deterministik, dan penyimpanan turun drastis.

---

## 4. Prioritas RENDAH (perbaikan cepat)

### 4.1 Konfigurasi proyek

- **Tidak ada lockfile** di zip (`package-lock.json` tidak ada). Commit lockfile agar `npm install` menghasilkan versi yang sama di semua mesin; pakai `npm ci` di CI.
- **`allowedHosts: true` + `host: '0.0.0.0'`** membuat dev server terbuka ke seluruh jaringan dan menerima Host header apa pun. Untuk pemakaian lokal, jadikan default `localhost`, lalu sediakan skrip terpisah untuk kebutuhan sandbox/LAN: `"dev": "vite"`, `"dev:lan": "vite --host 0.0.0.0"`. Bila AI Studio memang memerlukan `allowedHosts: true`, beri komentar alasannya di `vite.config.ts`.
- **`metadata.json` mendeklarasikan `MAJOR_CAPABILITY_SERVER_SIDE_GEMINI_API`**, padahal tidak ada pemanggilan API Gemini di `src/` (kata "Gemini" hanya muncul sebagai nama preset kuota), dan `.env.example` menyatakan tidak ada variabel yang diperlukan. Bila aplikasi tetap 100% sisi klien, hapus capability itu agar izin yang diminta sesuai kenyataan.
- **`index.html` memakai `lang="en"`** padahal UI berbahasa Indonesia. Ganti ke `lang="id"` (membantu pembaca layar dan terjemahan otomatis).
- **Script `lint` identik dengan `tsc --noEmit`**. Tambahkan ESLint atau ubah namanya menjadi `typecheck`, lalu sediakan `test` (Vitest) untuk fixture pada butir 2.1.

### 4.2 `zlce-check.py`

- Tidak bisa dijalankan langsung pada contoh karena mencari nama tepat `SESSION_STATE.md`, sementara contoh bernama `SESSION_STATE.example.md` (saya harus menyalin dulu ke folder lain). Tambahkan opsi `--state PATH`:
  ```python
  ap_state = next((argv[i+1] for i,a in enumerate(argv) if a == "--state" and i+1 < len(argv)), None)
  sp = ap_state or os.path.join(root, "SESSION_STATE.md")
  ```
  Dengan begitu README bisa menyarankan `python3 scripts/zlce-check.py --state examples/SESSION_STATE.example.md --no-git` sebagai uji cepat.
- Pembacaan `git status --porcelain` memakai `l[3:]`, yang untuk baris rename (`R  lama -> baru`) menghasilkan teks "lama -> baru", dan nama berkas dengan spasi diberi tanda kutip. Dampaknya hanya pada peringatan kasus D yang bisa keliru. Gunakan `git status --porcelain -z` lalu pisahkan dengan `\0` (entri rename memiliki dua segmen).
- `zlce-snapshot.sh`: bila repositori belum punya commit pertama, `git diff HEAD` gagal dan bagian diff kosong tanpa penjelasan. Tambahkan `git rev-parse --verify HEAD >/dev/null 2>&1 || echo "(belum ada commit)"` sebelum bagian diff.

### 4.3 Kesesuaian tipe vs template

`AssumptionOrQuestion.status` bertipe `'OPEN' | 'RESOLVED' | 'ACCEPTED'`, sedangkan template mendefinisikan `OPEN | CONFIRMED | REJECTED | ANSWERED`. Parser hanya melakukan cast, jadi nilai sah dari template tidak dikenali tipe. Samakan tipe dengan template, dan tambahkan pemeriksaan enum ini ke validator (script Python juga belum memeriksanya).

### 4.4 Ukuran komponen

`PersistentSidebar.tsx` (963 baris), `SessionStateTab.tsx` (835), `RuntimeEngineTab.tsx` (828), dan `TutorialTab.tsx` (806) cukup besar. Duplikasi kecil sudah terlihat, misalnya pembuatan UUID dengan fallback `Math.random` ada di `PersistentSidebar.tsx` dan `FullscreenEditorModal.tsx`. Ekstrak ke `utils/uuid.ts`, dan konten statis tutorial ke `src/data/` supaya komponen hanya berisi tampilan. Ini bisa dikerjakan bertahap setelah butir 2 dan 3.

---

## 5. Urutan pengerjaan yang disarankan

| Urutan | Pekerjaan | Perkiraan usaha |
| :--- | :--- | :--- |
| 1 | 2.2 filter `ID` + 2.3 default hantu di parser | ±1–2 jam |
| 2 | 3.4 helper clipboard | ±1 jam |
| 3 | 2.1 lengkapi validator + fixture bersama + Vitest | ±0,5–1 hari |
| 4 | 3.2 rapikan `scripts/` + dokumentasi jalur | ±1 jam |
| 5 | 3.1 impor `?raw` + `build-kit.py --check` | ±0,5 hari |
| 6 | 3.3 metadata evaluasi, transkrip, T2, run berulang | tergantung jumlah run |
| 7 | 3.5 reducer riwayat | ±0,5 hari |
| 8 | Butir 4.x | bertahap |

Butir 1–3 memberi dampak terbesar karena menyangkut kebenaran data dan kepercayaan pada alat validasi, yang merupakan inti nilai jual ZLCE Studio.

---

## 6. Ringkasan satu paragraf

ZLCE v3.2 punya fondasi metodologi yang matang dan alat Python yang rapi. Celah utamanya ada di lapisan web app: validator dan parser belum seandal `zlce-check.py` (state yang gagal di Python lolos di web), parser dapat menghilangkan baris asumsi yang memuat kata "ID" dan mengisi data contoh yang tidak ada di dokumen, serta tiga salinan template mulai bergeser. Semuanya dapat diperbaiki dengan perubahan kecil dan terarah di atas, dan dengan fixture bersama Python/TS di CI, kesenjangan serupa tidak akan terulang.

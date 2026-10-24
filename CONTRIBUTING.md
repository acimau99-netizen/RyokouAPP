# Panduan Kontribusi (Contributing Guide)

Terima kasih atas minat Anda untuk berkontribusi pada pengembangan **ZLCE (Zero-Loss Context Engineering)**!

---

## Standar Kode & Kualitas

Sebelum mengajukan *Pull Request* (PR), pastikan seluruh tahapan verifikasi berikut lolos di lingkungan lokal Anda:

```bash
# 1. Pastikan dependensi terpasang bersih
npm ci

# 2. Periksa type checking & linting TypeScript
npm run lint

# 3. Jalankan build produksi
npm run build

# 4. Validasi contoh berkas SESSION_STATE dengan checker kanonik
python3 scripts/zlce/zlce-check.py --state examples/SESSION_STATE.example.md --no-git
```

---

## Aturan Perubahan Berkas Kontrol & Template

- Jika Anda mengubah berkas template di `templates/` atau prompt di `LANDING_PROMPT.md` / `HANDOVER_PROMPT.md`:
  - Pastikan bundel tunggal `ZLCE_KIT_SINGLE.md` juga disinkronkan.
  - Periksa konsistensi impor raw di `src/data/templates.ts`.
- Skrip kanonik berada di `scripts/zlce/`. Berkas di root `scripts/` (mis. `scripts/zlce-check.py`) hanyalah wrapper tipis dan harus tetap meneruskan argumen ke direktori kanonik.

---

## Alur Pull Request

1. Fork repositori: `https://github.com/acimau99-netizen/ZLCEv3.2.2`.
2. Buat branch baru dari `main` (contoh: `git checkout -b feat/nama-perbaikan`).
3. Commit perubahan dengan pesan yang deskriptif dan jelas.
4. Pastikan semua pemeriksaan lokal (`lint`, `build`, `zlce-check.py`) lulus.
5. Buka Pull Request ke branch `main`.

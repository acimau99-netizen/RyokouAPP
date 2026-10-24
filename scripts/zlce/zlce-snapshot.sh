#!/usr/bin/env bash
# ZLCE recovery snapshot. Jalankan di root proyek, tempel outputnya ke sesi AI baru.
# Usage: scripts/zlce/zlce-snapshot.sh [project_root] [--diff]
set -u
here="$(cd "$(dirname "$0")" && pwd)"
root="."; want_diff=0
for a in "$@"; do
  case "$a" in --diff) want_diff=1 ;; *) root="$a" ;; esac
done
cd "$root" || { echo "root tidak valid: $root"; exit 2; }
echo "=== ZLCE RECOVERY SNAPSHOT ==="
echo "waktu: $(date -Iseconds)"
if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo "--- branch ---";                     git branch --show-current
  echo "--- git status --short ---";         git status --short
  echo "--- git log -5 ---";                 git log -5 --format='%h %ad %s' --date=iso 2>/dev/null
  echo "--- git diff --stat (unstaged) ---"; git diff --stat
  echo "--- git diff --stat (staged) ---";   git diff --stat --cached
  if [ "$want_diff" = 1 ]; then
    echo "--- git diff berkas terlacak (maks. 400 baris) ---"; git diff HEAD 2>/dev/null | head -400
    echo "--- berkas baru belum terlacak (maks. 10 berkas, 80 baris/berkas) ---"
    git ls-files --others --exclude-standard 2>/dev/null | head -10 | while IFS= read -r f; do
      if [ -f "$f" ] && grep -Iq . "$f" 2>/dev/null; then
        echo "### $f"; head -80 "$f"
      else
        echo "### $f (biner/kosong, isi dilewati)"
      fi
    done
  fi
else
  echo "(bukan repositori git)"
fi
echo "--- zlce-check ---"
if command -v python3 >/dev/null 2>&1 && [ -f "$here/zlce-check.py" ]; then
  python3 "$here/zlce-check.py" . 2>&1 || true
else
  echo "(python3 / zlce-check.py tidak tersedia)"
fi
echo "--- WAL (SESSION_STATE.md bagian 3) ---"
if [ -f SESSION_STATE.md ]; then
  awk '/^## 3\./{f=1;next} /^## [0-9]+\./{f=0} f' SESSION_STATE.md
else
  echo "(SESSION_STATE.md tidak ditemukan)"
fi
echo "=== END SNAPSHOT ==="

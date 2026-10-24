#!/usr/bin/env python3
"""ZLCE collector: kumpulkan data diagnostik ke satu zip untuk dikirim/diunggah.

Usage:
  python3 zlce-collect.py [project_root] [--out FILE.zip] [--feedback-dir DIR] [--diff] [--init]

Yang dikumpulkan (semua disamarkan dari rahasia, lihat manifest.json):
  - berkas kontrol di root proyek (SESSION_STATE.md, TASKS.md, dst.) + docs/evidence/*
  - ringkasan git (branch, log, status, diff --stat), hasil zlce-check (biasa dan --strict)
  - isi folder umpan balik (default: <root>/zlce-feedback/): FEEDBACK.md, transkrip uji, hasil tabel
Kode sumber TIDAK dikumpulkan kecuali --diff (potongan diff + berkas baru, tetap disamarkan).
Berkas .env, kunci privat, dan berkas bernama secret/credential tidak pernah disertakan.
"""
import argparse, datetime, hashlib, json, os, platform, re, subprocess, sys, zipfile

VERSION = "1"
CONTROL = ["BLUEPRINT.md", "ARCHITECTURE.md", "DATA_MODEL.md", "AI_WORKFLOW.md", "TASKS.md",
           "SESSION_STATE.md", "TESTING.md", "CHECKLISTS.md", "HANDOVER.md", "CHANGELOG.md"]
MAX_FILE = 200 * 1024
MAX_TOTAL = 5 * 1024 * 1024
FEEDBACK_EXT = (".md", ".txt", ".log", ".json", ".csv")
BUNDLE_SECTIONS = ["META", "KIT_FILES", "STEP1_TRANSCRIPT", "STEP2_AUDIT", "SELF_REPORT", "T2_MANUAL"]
BUNDLE_IDS = ["T1", "T3", "T4a", "T4b", "T5", "T6", "T7A", "T7B", "T7C", "T7D", "T8"]

FEEDBACK_TEMPLATE = """# UMPAN BALIK ZLCE

Isi seperlunya, singkat. Jangan menulis rahasia (kata sandi, token); skrip menyamarkan pola umum tetapi tidak sempurna.
Simpan transkrip dan hasil uji di `transcripts/` (format .txt atau .md).

## 1. Konteks
- Model/AI yang dipakai:
- MODE (FULL/LITE):
- Alur yang dijalankan (Landing / Handover / Recovery / Uji mandiri AI Studio):
- Proyek (satu kalimat, tanpa data rahasia):

## 2. Hasil uji
- Tempel tabel hasil Prompt 2 ke `transcripts/hasil-prompt2.md` dan transkrip Langkah 1 ke `transcripts/langkah1.md`.
- Vonis yang Anda terima:
- Jumlah run dan konsistensinya:

## 3. Titik canggung (maks. 5)
Format: langkah ke berapa | apa yang terjadi | apa yang Anda harapkan
1.

## 4. AI melanggar aturan
Aturan (mis. R5, R12, HANDOVER langkah 2) | kutipan respons AI
1.

## 5. Skrip bermasalah
Perintah | pesan error | OS dan versi Python
1.

## 6. Usulan
- Ingin ditambah:
- Ingin dibuang:
"""

RULES = [
    ("private-key", re.compile(r"-----BEGIN [A-Z ]*PRIVATE KEY-----.*?-----END [A-Z ]*PRIVATE KEY-----", re.S), "[REDACTED:private-key]"),
    ("aws-key", re.compile(r"\bAKIA[0-9A-Z]{16}\b"), "[REDACTED:aws-key]"),
    ("sk-key", re.compile(r"\bsk-[A-Za-z0-9_\-]{20,}"), "[REDACTED:sk-key]"),
    ("google-key", re.compile(r"\bAIza[0-9A-Za-z_\-]{35}\b"), "[REDACTED:google-key]"),
    ("github-token", re.compile(r"\bgh[pousr]_[A-Za-z0-9]{30,}\b"), "[REDACTED:github-token]"),
    ("jwt", re.compile(r"\beyJ[A-Za-z0-9_\-]{10,}\.[A-Za-z0-9_\-]{10,}\.[A-Za-z0-9_\-]{10,}"), "[REDACTED:jwt]"),
    ("bearer", re.compile(r"(?i)\bBearer\s+[A-Za-z0-9._~+/\-]{16,}=*"), "Bearer [REDACTED:bearer]"),
    ("url-credentials", re.compile(r"\b([a-z][a-z0-9+.\-]*://)([^/\s:@]+):([^/\s@]+)@"), r"\1[REDACTED]:[REDACTED]@"),
    ("key-value", re.compile(r"(?i)\b([A-Za-z0-9_]*(?:password|passwd|pwd|secret|token|api[_-]?key|apikey|private[_-]?key)[A-Za-z0-9_]*)(\s*[:=]\s*)(['\"]?)([^\s'\",;]{4,})\3"), r"\1\2[REDACTED:value]"),
    ("email", re.compile(r"\b[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}\b"), "[REDACTED:email]"),
]


def redact(text):
    n = 0
    for _, rx, rep in RULES:
        text, c = rx.subn(rep, text)
        n += c
    return text, n


def secret_name(path):
    b = os.path.basename(path).lower()
    return (b == ".env" or b.startswith(".env") or b.endswith((".pem", ".key", ".p12", ".pfx", ".keystore"))
            or b.startswith(("id_rsa", "id_ed25519")) or "secret" in b or "credential" in b)


def check_bundle(text):
    """Periksa kelengkapan paket dari Prompt 3 (SELF_TEST_AISTUDIO.md)."""
    issues = []
    if "<<<ZLCE-BUNDLE v1>>>" not in text:
        issues.append("penanda pembuka tidak ada")
    for sec in BUNDLE_SECTIONS:
        if "<<<%s>>>" % sec not in text:
            issues.append("bagian %s tidak ada" % sec)
    if "<<<END-BUNDLE>>>" not in text:
        issues.append("penutup tidak ada (paket terpotong?)")
    miss = [i for i in BUNDLE_IDS if "=== %s | RESPONS AGEN ===" % i not in text or "=== AKHIR %s ===" % i not in text]
    if miss:
        issues.append("transkrip tidak lengkap untuk: %s" % ", ".join(miss))
    for mark in ("[LANJUT DARI", "[TIDAK UTUH"):
        if mark in text:
            issues.append("masih memuat penanda %s" % mark)
    return issues


def sha(data):
    return hashlib.sha256(data).hexdigest()


class Bundle(object):
    def __init__(self):
        self.items = []   # (arcname, bytes, redactions)
        self.skipped = []
        self.total = 0

    def add_text(self, arc, text, redact_it=True):
        n = 0
        if redact_it:
            text, n = redact(text)
        data = text.encode("utf-8")
        if len(data) > MAX_FILE:
            head, tail = data[:150 * 1024], data[-40 * 1024:]
            data = head + b"\n[... DIPOTONG oleh zlce-collect (batas 200KB) ...]\n" + tail
        if self.total + len(data) > MAX_TOTAL:
            self.skipped.append({"name": arc, "reason": "melebihi batas total 5MB"})
            return
        self.total += len(data)
        self.items.append((arc, data, n))

    def add_file(self, arc, path):
        if secret_name(path):
            self.skipped.append({"name": arc, "reason": "nama berkas sensitif"})
            return
        try:
            with open(path, "rb") as f:
                raw = f.read()
        except OSError as e:
            self.skipped.append({"name": arc, "reason": "gagal dibaca: %s" % e})
            return
        if b"\0" in raw:
            self.skipped.append({"name": arc, "reason": "biner"})
            return
        self.add_text(arc, raw.decode("utf-8", "replace"))


def git(args, cwd):
    try:
        r = subprocess.run(["git"] + args, cwd=cwd, capture_output=True, text=True, timeout=20)
        return r.stdout if r.returncode == 0 else None
    except Exception:
        return None


def git_section(root, with_diff):
    if git(["rev-parse", "--is-inside-work-tree"], root) is None:
        return "(bukan repositori git)\n"
    out = []

    def sec(title, args):
        out.append("--- %s ---\n%s" % (title, git(args, root) or ""))
    sec("branch", ["branch", "--show-current"])
    sec("git status --short", ["status", "--short", "-uall"])
    sec("git log -30", ["log", "-30", "--format=%h %ad %s", "--date=iso"])
    sec("git diff --stat", ["diff", "--stat"])
    sec("git diff --stat --cached", ["diff", "--stat", "--cached"])
    if with_diff:
        d = (git(["diff", "HEAD"], root) or "").splitlines()[:400]
        out.append("--- git diff HEAD (maks. 400 baris; --diff aktif) ---\n" + "\n".join(d) + "\n")
        untracked = (git(["ls-files", "--others", "--exclude-standard"], root) or "").splitlines()[:10]
        out.append("--- berkas baru belum terlacak (maks. 10 berkas, 80 baris/berkas; --diff aktif) ---\n")
        for u in untracked:
            p = os.path.join(root, u)
            if secret_name(u) or not os.path.isfile(p):
                out.append("### %s (dilewati)\n" % u)
                continue
            try:
                with open(p, "rb") as f:
                    raw = f.read(60000)
            except OSError:
                continue
            if b"\0" in raw:
                out.append("### %s (biner, dilewati)\n" % u)
            else:
                out.append("### %s\n%s\n" % (u, "\n".join(raw.decode("utf-8", "replace").splitlines()[:80])))
    return "\n".join(out)


def run_check(here, root):
    chk = os.path.join(here, "zlce-check.py")
    if not os.path.exists(chk):
        return "(zlce-check.py tidak ditemukan di folder skrip ini)\n"
    out = []
    for flags in ([], ["--strict"]):
        try:
            r = subprocess.run([sys.executable, chk, root] + flags, capture_output=True, text=True, timeout=30)
            out.append("--- zlce-check %s (exit %d) ---\n%s%s" % (" ".join(flags), r.returncode, r.stdout, r.stderr))
        except Exception as e:
            out.append("--- zlce-check %s gagal: %s ---\n" % (" ".join(flags), e))
    return "\n".join(out)


def main(argv):
    ap = argparse.ArgumentParser(description="Kumpulkan data diagnostik ZLCE ke satu zip.")
    ap.add_argument("root", nargs="?", default=".")
    ap.add_argument("--out", default=None)
    ap.add_argument("--feedback-dir", default=None)
    ap.add_argument("--diff", action="store_true", help="sertakan potongan diff dan isi berkas baru (disamarkan)")
    ap.add_argument("--init", action="store_true", help="hanya buat folder umpan balik + template, lalu keluar")
    a = ap.parse_args(argv)

    root = os.path.abspath(a.root)
    here = os.path.dirname(os.path.abspath(__file__))
    fb = os.path.abspath(a.feedback_dir) if a.feedback_dir else os.path.join(root, "zlce-feedback")
    tpl = os.path.join(fb, "FEEDBACK.md")
    created = False
    if not os.path.exists(tpl):
        os.makedirs(os.path.join(fb, "transcripts"), exist_ok=True)
        with open(tpl, "w", encoding="utf-8") as f:
            f.write(FEEDBACK_TEMPLATE)
        created = True
    if a.init:
        print("Folder umpan balik siap: %s" % fb)
        print("Isi FEEDBACK.md dan simpan transkrip di transcripts/, lalu jalankan ulang tanpa --init.")
        return 0

    b = Bundle()
    for n in CONTROL:
        p = os.path.join(root, n)
        if os.path.isfile(p):
            b.add_file("report/project/" + n, p)
    ev = os.path.join(root, "docs", "evidence")
    if os.path.isdir(ev):
        for n in sorted(os.listdir(ev))[:20]:
            p = os.path.join(ev, n)
            if os.path.isfile(p) and n.lower().endswith(FEEDBACK_EXT):
                b.add_file("report/project/docs/evidence/" + n, p)
    b.add_text("report/git.txt", git_section(root, a.diff))
    b.add_text("report/zlce-check.txt", run_check(here, root))

    filled = False
    bundle_checks = []
    if os.path.isdir(fb):
        for r, ds, fs in os.walk(fb):
            ds.sort()
            for n in sorted(fs):
                p = os.path.join(r, n)
                rel = os.path.relpath(p, fb).replace(os.sep, "/")
                if not n.lower().endswith(FEEDBACK_EXT):
                    b.skipped.append({"name": "feedback/" + rel, "reason": "ekstensi tidak didukung"})
                    continue
                b.add_file("report/feedback/" + rel, p)
                if "bundle" in n.lower() and not secret_name(p):
                    with open(p, "rb") as f:
                        iss = check_bundle(f.read().decode("utf-8", "replace"))
                    bundle_checks.append({"file": rel, "ok": not iss, "issues": iss})
        try:
            with open(tpl, "rb") as f:
                filled = sha(f.read()) != sha(FEEDBACK_TEMPLATE.encode("utf-8"))
        except OSError:
            pass

    kit = {}
    for n in ("zlce-check.py", "zlce-snapshot.sh", "zlce-collect.py"):
        p = os.path.join(here, n)
        if os.path.exists(p):
            with open(p, "rb") as f:
                kit[n] = sha(f.read())[:16]

    manifest = {
        "tool": "zlce-collect", "tool_version": VERSION,
        "generated": datetime.datetime.now().astimezone().isoformat(timespec="seconds"),
        "project_dir_name": os.path.basename(root),
        "os": platform.platform(), "python": platform.python_version(),
        "git": (subprocess.run(["git", "--version"], capture_output=True, text=True).stdout.strip()
                if git(["--version"], root) is not None else "tidak ada"),
        "diff_included": bool(a.diff), "feedback_filled": filled, "kit_script_hashes": kit,
        "files": [{"name": n, "bytes": len(d), "sha256": sha(d)[:16], "redactions": c} for n, d, c in b.items],
        "bundle_check": bundle_checks,
        "skipped": b.skipped,
        "total_redactions": sum(c for _, _, c in b.items),
    }
    mdata = json.dumps(manifest, indent=2, ensure_ascii=False).encode("utf-8")

    out = a.out or os.path.join(os.getcwd(), "zlce-report-%s.zip" % datetime.datetime.now().strftime("%Y%m%d-%H%M%S"))
    with zipfile.ZipFile(out, "w", zipfile.ZIP_DEFLATED) as z:
        z.writestr("report/manifest.json", mdata)
        for n, d, _ in b.items:
            z.writestr(n, d)

    print("Laporan: %s (%d berkas, %d penyamaran, %d dilewati)" % (out, len(b.items) + 1, manifest["total_redactions"], len(b.skipped)))
    for n, d, c in b.items:
        print("  %-48s %7d B%s" % (n, len(d), ("  [%d disamarkan]" % c) if c else ""))
    for s in b.skipped:
        print("  DILEWATI %s: %s" % (s["name"], s["reason"]))
    for bc in bundle_checks:
        print("PAKET %s: %s" % (bc["file"], "LENGKAP" if bc["ok"] else "TIDAK LENGKAP: " + "; ".join(bc["issues"])))
    if not a.diff:
        print("Kode sumber tidak disertakan (tanpa --diff).")
    if created or not filled:
        print("CATATAN: FEEDBACK.md belum diisi (%s). Isi dahulu lalu jalankan ulang agar laporan lebih berguna." % tpl)
    print("Periksa isi zip sebelum diunggah. Penyamaran memakai pola umum dan tidak menjamin semua rahasia terhapus.")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))

#!/usr/bin/env python3
"""ZLCE state checker.
Usage: python3 zlce-check.py [project_root] [--strict] [--no-git]
Exit 0 = tidak ada ERROR. Exit 1 = ada ERROR (atau WARN bila --strict). Exit 2 = berkas tidak ditemukan.
"""
import os, re, subprocess, sys

ENUM = {"PENDING", "READY", "IN_PROGRESS", "BLOCKED", "DONE"}
TID = r"TASK-(?:REV-)?\d+"
CONTROL = {"BLUEPRINT.md", "ARCHITECTURE.md", "DATA_MODEL.md", "AI_WORKFLOW.md", "TASKS.md",
           "SESSION_STATE.md", "TESTING.md", "CHECKLISTS.md", "HANDOVER.md", "CHANGELOG.md"}


def read(path):
    with open(path, encoding="utf-8") as f:
        return f.read()


def section(text, num):
    m = re.search(r"^## %d\..*?(?=^## \d+\.|\Z)" % num, text, re.M | re.S)
    return m.group(0) if m else ""


def field(text, name):
    m = re.search(r"\*\*%s:\*\*[ \t]*(.*)" % re.escape(name), text)
    return m.group(1).strip() if m else None


def first_tid(value):
    m = re.search(TID, value or "")
    return m.group(0) if m else None


def git(args, cwd):
    try:
        r = subprocess.run(["git"] + args, cwd=cwd, capture_output=True, text=True, timeout=15)
        return r.stdout if r.returncode == 0 else None
    except Exception:
        return None


def main(argv):
    strict = "--strict" in argv
    use_git = "--no-git" not in argv
    ap_state = next((argv[i+1] for i, a in enumerate(argv) if a == "--state" and i+1 < len(argv)), None)
    filtered_args = []
    skip_next = False
    for a in argv:
        if skip_next:
            skip_next = False
            continue
        if a == "--state":
            skip_next = True
            continue
        if not a.startswith("--"):
            filtered_args.append(a)
    root = filtered_args[0] if filtered_args else "."
    sp = ap_state or os.path.join(root, "SESSION_STATE.md")
    if not os.path.exists(sp):
        print("[ERROR] %s tidak ditemukan" % sp)
        return 2
    text = read(sp)
    errors, warns, infos = [], [], []

    # --- matriks task
    rows = []
    for line in section(text, 2).splitlines():
        if not line.startswith("|"):
            continue
        cells = [c.strip() for c in line.strip().strip("|").split("|")]
        if len(cells) < 6:
            continue
        tid = cells[0].strip("`")
        if not re.fullmatch(TID, tid):
            continue
        rows.append({"id": tid, "deps": re.findall(TID, cells[2]), "status": cells[3],
                     "evidence": cells[4], "approved": cells[5].lower()})
    if not rows:
        errors.append("Matriks task kosong / tidak terbaca (bagian 2).")
    ids = [r["id"] for r in rows]
    by = {r["id"]: r for r in rows}
    for d in {i for i in ids if ids.count(i) > 1}:
        errors.append("ID task duplikat di matriks: %s" % d)

    for r in rows:
        if r["status"] not in ENUM:
            errors.append("%s: status '%s' bukan enum sah %s" % (r["id"], r["status"], sorted(ENUM)))
    in_prog = [r["id"] for r in rows if r["status"] == "IN_PROGRESS"]
    if len(in_prog) > 1:
        errors.append("Lebih dari satu IN_PROGRESS: %s" % ", ".join(in_prog))

    for r in rows:
        for d in r["deps"]:
            if d not in by:
                errors.append("%s: dependensi %s tidak ada di matriks" % (r["id"], d))
        deps_done = all(by[d]["status"] == "DONE" for d in r["deps"] if d in by)
        if r["status"] in ("IN_PROGRESS", "DONE") and not deps_done:
            errors.append("%s berstatus %s tetapi dependensi belum semua DONE" % (r["id"], r["status"]))
        if r["status"] == "READY" and not deps_done:
            errors.append("%s READY tetapi dependensi belum semua DONE" % r["id"])
        if r["status"] == "PENDING" and r["deps"] and deps_done:
            warns.append("%s PENDING padahal semua dependensi DONE (seharusnya READY)" % r["id"])
        if r["status"] == "DONE":
            if r["evidence"] in ("", "-"):
                errors.append("%s DONE tanpa Bukti Verifikasi" % r["id"])
            if r["approved"] not in ("ya", "yes"):
                errors.append("%s DONE tanpa persetujuan pengguna (Disetujui != ya)" % r["id"])
        if r["status"] in ("PENDING", "READY") and r["evidence"] not in ("", "-"):
            warns.append("%s %s tetapi kolom bukti terisi" % (r["id"], r["status"]))

    # --- header vs matriks
    s1 = section(text, 1)
    active = first_tid(field(s1, "Task Aktif"))
    act_status = (field(s1, "Status Task Aktif") or "").strip("` ")
    last_done = first_tid(field(s1, "Task Terakhir DONE"))
    if active:
        if active not in by:
            errors.append("Task Aktif %s tidak ada di matriks" % active)
        elif act_status and by[active]["status"] != act_status:
            errors.append("Status Task Aktif header (%s) != matriks (%s) untuk %s"
                          % (act_status, by[active]["status"], active))
    if last_done and last_done in by and by[last_done]["status"] != "DONE":
        errors.append("Task Terakhir DONE %s berstatus %s di matriks" % (last_done, by[last_done]["status"]))
    if in_prog and active and active not in in_prog:
        errors.append("Task IN_PROGRESS di matriks (%s) != Task Aktif header (%s)" % (in_prog[0], active))

    # --- WAL
    s3 = section(text, 3)
    wal_task_raw = field(s3, "Task")
    wal_task = first_tid(wal_task_raw)
    wal_empty = wal_task is None
    if not s3:
        errors.append("Bagian 3 (WORK IN PROGRESS) tidak ada.")
    if in_prog and wal_empty:
        warns.append("%s IN_PROGRESS tetapi WAL kosong (risiko kehilangan konteks bila sesi putus)" % in_prog[0])
    if not in_prog and not wal_empty:
        warns.append("WAL berisi %s padahal tidak ada task IN_PROGRESS (kosongkan setelah DONE)" % wal_task)
    if in_prog and not wal_empty and wal_task != in_prog[0]:
        errors.append("WAL menunjuk %s tetapi IN_PROGRESS adalah %s" % (wal_task, in_prog[0]))
    if wal_task and wal_task in by and by[wal_task]["status"] == "DONE":
        errors.append("WAL belum dikosongkan padahal %s sudah DONE" % wal_task)
    if not wal_empty:
        for k in ("Langkah Berikutnya (persis)", "Berkas Direncanakan/Disentuh"):
            v = field(s3, k)
            if v is None or v in ("", "-"):
                warns.append("WAL terisi tetapi '%s' kosong" % k)

    # --- TASKS.md silang
    tp = os.path.join(root, "TASKS.md")
    if os.path.exists(tp):
        tids = set(re.findall(r"^###\s+(%s)\b" % TID, read(tp), re.M))
        for t in sorted(tids - set(ids)):
            errors.append("%s ada di TASKS.md tetapi tidak di matriks SESSION_STATE" % t)
        for t in sorted(set(ids) - tids):
            errors.append("%s ada di matriks tetapi tidak di TASKS.md" % t)
    else:
        warns.append("TASKS.md tidak ditemukan (pemeriksaan silang dilewati)")

    # --- git
    if use_git and git(["rev-parse", "--is-inside-work-tree"], root):
        ct = git(["log", "-1", "--format=%ct"], root)
        if ct and ct.strip().isdigit() and os.path.getmtime(sp) + 60 < int(ct.strip()):
            warns.append("Commit terakhir lebih baru dari SESSION_STATE.md (state mungkin tertinggal)")
        por = git(["status", "--porcelain", "-uall"], root) or ""
        dirty = [l[3:] for l in por.splitlines() if os.path.basename(l[3:].strip()) not in CONTROL]
        if dirty and in_prog and wal_empty:
            warns.append("Ada %d berkas berubah tanpa commit dan WAL kosong" % len(dirty))
        if dirty and not wal_empty:
            listed = [x.strip().strip("`") for x in re.split(r"[,;]", field(s3, "Berkas Direncanakan/Disentuh") or "") if x.strip()]
            outside = [d for d in dirty if not any(d.strip() == x or d.strip().startswith(x.rstrip("/") + "/") for x in listed)]
            if outside:
                warns.append("Perubahan di luar daftar WAL (kasus D): %s" % ", ".join(outside[:5]))
        if dirty and not in_prog:
            warns.append("Ada %d berkas berubah tanpa commit padahal tidak ada task IN_PROGRESS" % len(dirty))

    # --- placeholder & info
    ph = re.findall(r"\[[A-Z][A-Z0-9_ /|:\-]{2,}\]", text)
    if ph:
        warns.append("Placeholder tersisa di SESSION_STATE.md: %d (mis. %s)" % (len(ph), ph[0]))
    openq = len(re.findall(r"\|\s*OPEN\s*\|", section(text, 4)))
    if openq:
        infos.append("%d asumsi/pertanyaan berstatus OPEN" % openq)

    for m in infos:
        print("[INFO] " + m)
    for m in warns:
        print("[WARN] " + m)
    for m in errors:
        print("[ERROR] " + m)
    bad = len(errors) + (len(warns) if strict else 0)
    print("RESULT: %s (%d error, %d warn, %d task)" % ("FAIL" if bad else "OK", len(errors), len(warns), len(rows)))
    return 1 if bad else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))

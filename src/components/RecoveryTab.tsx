import React, { useState, useEffect } from 'react';
import { 
  RotateCcw, 
  Copy, 
  Check, 
  Terminal, 
  AlertOctagon, 
  ShieldCheck, 
  FileCode, 
  Zap, 
  GitCommit,
  CheckCircle2,
  Info,
  Wand2,
  Sparkles,
  GitBranch,
  Clock,
  FileText,
  Sliders,
  RefreshCw,
  Layers,
  ArrowRight
} from 'lucide-react';
import { ParsedSessionState } from '../types/zlce';
import { copyText } from '../utils/clipboard';
import { validateSessionState } from '../utils/zlceValidator';

interface RecoveryTabProps {
  stateData: ParsedSessionState;
  rawMarkdown?: string;
}

export const RecoveryTab: React.FC<RecoveryTabProps> = ({ stateData, rawMarkdown }) => {
  const [activeMode, setActiveMode] = useState<'wizard' | 'presets'>('wizard');
  const [selectedCase, setSelectedCase] = useState<'A' | 'B' | 'C' | 'D'>('B');
  const [copiedHandover, setCopiedHandover] = useState(false);
  const [copiedBundle, setCopiedBundle] = useState(false);
  const [copiedSnapshot, setCopiedSnapshot] = useState(false);
  const [copiedSnapshotCmd, setCopiedSnapshotCmd] = useState(false);

  // Helper to extract Section 3 WAL from SESSION_STATE.md
  const extractWalSection = (md?: string): string => {
    if (!md) return `Task Aktif: ${stateData.status.activeTask || 'TASK-002'}\nLangkah Saat Ini: ${stateData.wal.currentStep || 'Inisiasi'}\nLangkah Berikutnya: ${stateData.wal.nextStepExact || 'Implementasi schema'}\nBerkas Direncanakan: ${stateData.wal.plannedFiles || 'src/models/todo.py'}`;
    const match = md.match(/##\s+3\.\s+WORK IN PROGRESS \(WAL\)[\s\S]*?(?=##\s+\d+\.|$)/i);
    if (match) {
      return match[0].replace(/##\s+3\.\s+WORK IN PROGRESS \(WAL\)\s*\n*/i, '').trim();
    }
    return `Task Aktif: ${stateData.status.activeTask || 'TASK-002'}\nLangkah Saat Ini: ${stateData.wal.currentStep || 'Inisiasi'}\nLangkah Berikutnya: ${stateData.wal.nextStepExact || 'Implementasi schema'}\nBerkas Direncanakan: ${stateData.wal.plannedFiles || 'src/models/todo.py'}`;
  };

  // Helper to compute zlce-check summary from markdown
  const computeZlceCheckSummary = (md?: string): string => {
    if (!md) return 'RESULT: OK (0 error, 0 warn, 3 task)';
    const res = validateSessionState(md);
    const statusStr = res.valid ? 'OK' : 'FAIL';
    return `RESULT: ${statusStr} (${res.errorsCount} error, ${res.warningsCount} warn, ${res.tasksCount} task)`;
  };

  // Helper for current ISO timestamp
  const getIsoTimestamp = () => {
    const now = new Date();
    return now.toISOString();
  };

  // Wizard input states
  const [wizardBranch, setWizardBranch] = useState<string>(() => {
    const task = stateData.status.activeTask || 'task-002';
    return `feature/${task.toLowerCase().replace(/_/g, '-')}-work`;
  });
  const [wizardTime, setWizardTime] = useState<string>(getIsoTimestamp());
  const [wizardStatusShort, setWizardStatusShort] = useState<string>(
    ` M ${stateData.wal.plannedFiles?.split(',')[0]?.trim() || 'src/models/todo.py'}\n?? migrations/001_initial.sql`
  );
  const [wizardGitLog, setWizardGitLog] = useState<string>(
    `b1c2d3e 2026-10-24 10:15:00 +0700 feat: implementasi modul awal [TASK-001]\na0f1e2d 2026-10-24 09:30:00 +0700 chore: init repo dan struktur ZLCE`
  );
  const [wizardUnstagedStat, setWizardUnstagedStat] = useState<string>(
    ` ${stateData.wal.plannedFiles?.split(',')[0]?.trim() || 'src/models/todo.py'} | 16 ++++++++++++++++\n 1 file changed, 16 insertions(+)`
  );
  const [wizardStagedStat, setWizardStagedStat] = useState<string>('(empty)');
  const [wizardDiffContent, setWizardDiffContent] = useState<string>(
    `diff --git a/${stateData.wal.plannedFiles?.split(',')[0]?.trim() || 'src/models/todo.py'} b/${stateData.wal.plannedFiles?.split(',')[0]?.trim() || 'src/models/todo.py'}\n+export interface TodoModel {\n+  id: string;\n+  title: string;\n+  completed: boolean;\n+}`
  );
  const [wizardZlceCheck, setWizardZlceCheck] = useState<string>(computeZlceCheckSummary(rawMarkdown));
  const [wizardWalText, setWizardWalText] = useState<string>(extractWalSection(rawMarkdown));

  // Static Preset Fixtures
  const caseFixtures = {
    A: `=== ZLCE RECOVERY SNAPSHOT ===
waktu: 2026-10-24T10:30:00+07:00
--- branch ---
feature/task-002-schema
--- git status --short ---
(clean working tree)
--- git log -5 ---
b1c2d3e 2026-10-24 10:15:00 +0700 feat: implementasi model Todo [TASK-001]
a0f1e2d 2026-10-24 09:30:00 +0700 chore: init repo dan struktur proyek
--- git diff --stat (unstaged) ---
(empty)
--- git diff --stat (staged) ---
(empty)
--- zlce-check ---
RESULT: OK (0 error, 0 warn, 3 task)
--- WAL (SESSION_STATE.md bagian 3) ---
Task Aktif: TASK-002
Langkah Terakhir: Selesai mendefinisikan interface
Langkah Berikutnya: Membuat tabel database SQLite
Berkas Direncanakan: src/db/schema.ts
=== END SNAPSHOT ===`,

    B: `=== ZLCE RECOVERY SNAPSHOT ===
waktu: 2026-10-24T10:35:00+07:00
--- branch ---
feature/task-002-schema
--- git status --short ---
 M src/models/todo.py
?? migrations/001_todos.sql
--- git log -5 ---
b1c2d3e 2026-10-24 10:15:00 +0700 feat: init task 002
--- git diff --stat (unstaged) ---
 src/models/todo.py | 14 ++++++++++++++
 1 file changed, 14 insertions(+)
--- git diff --stat (staged) ---
(empty)
--- git diff berkas terlacak (maks. 400 baris) ---
diff --git a/src/models/todo.py b/src/models/todo.py
+class TodoItem(BaseModel):
+    id: int
+    title: str
--- zlce-check ---
RESULT: OK (0 error, 0 warn, 3 task)
--- WAL (SESSION_STATE.md bagian 3) ---
Task Aktif: TASK-002
Langkah Terakhir: Inisiasi skema todo
Langkah Berikutnya: Verifikasi model dengan pydantic
Berkas Direncanakan: src/models/todo.py, migrations/001_todos.sql
=== END SNAPSHOT ===`,

    C: `=== ZLCE RECOVERY SNAPSHOT ===
waktu: 2026-10-24T10:40:00+07:00
--- branch ---
feature/task-002-schema
--- git status --short ---
(clean working tree)
--- git log -5 ---
9f8e7d6 2026-10-24 10:38:00 +0700 wip: coba tambah endpoint auth [UNTRACKED]
b1c2d3e 2026-10-24 10:15:00 +0700 feat: implementasi model Todo [TASK-001]
--- git diff --stat (unstaged) ---
(empty)
--- git diff --stat (staged) ---
(empty)
--- zlce-check ---
RESULT: OK (0 error, 0 warn, 3 task)
--- WAL (SESSION_STATE.md bagian 3) ---
Task Aktif: TASK-002
Langkah Terakhir: Selesai model dasar
Langkah Berikutnya: Endpoint CRUD
Berkas Direncanakan: src/routes/todo.py
=== END SNAPSHOT ===`,

    D: `=== ZLCE RECOVERY SNAPSHOT ===
waktu: 2026-10-24T10:45:00+07:00
--- branch ---
feature/task-002-schema
--- git status --short ---
 M src/models/todo.py
 M src/billing/stripe_service.py
--- git log -5 ---
b1c2d3e 2026-10-24 10:15:00 +0700 feat: implementasi model Todo
--- git diff --stat (unstaged) ---
 src/billing/stripe_service.py | 45 +++++++++++++++++++++++++++++++++++++++
 1 file changed, 45 insertions(+)
--- git diff --stat (staged) ---
(empty)
--- zlce-check ---
RESULT: OK (0 error, 0 warn, 3 task)
--- WAL (SESSION_STATE.md bagian 3) ---
Task Aktif: TASK-002
Langkah Terakhir: Inisiasi model todo
Langkah Berikutnya: Database query
Berkas Direncanakan: src/models/todo.py
=== END SNAPSHOT ===`
  };

  // Build snapshot text from wizard inputs
  const compileWizardSnapshot = (): string => {
    let out = `=== ZLCE RECOVERY SNAPSHOT ===\n`;
    out += `waktu: ${wizardTime || 'jam: ?'}\n`;
    out += `--- branch ---\n${wizardBranch || 'main'}\n`;
    out += `--- git status --short ---\n${wizardStatusShort.trim() || '(clean working tree)'}\n`;
    out += `--- git log -5 ---\n${wizardGitLog.trim() || '(empty)'}\n`;
    out += `--- git diff --stat (unstaged) ---\n${wizardUnstagedStat.trim() || '(empty)'}\n`;
    out += `--- git diff --stat (staged) ---\n${wizardStagedStat.trim() || '(empty)'}\n`;
    if (wizardDiffContent.trim() && wizardDiffContent.trim() !== '(empty)') {
      out += `--- git diff berkas terlacak (maks. 400 baris) ---\n${wizardDiffContent.trim()}\n`;
    }
    out += `--- zlce-check ---\n${wizardZlceCheck.trim()}\n`;
    out += `--- WAL (SESSION_STATE.md bagian 3) ---\n${wizardWalText.trim()}\n`;
    out += `=== END SNAPSHOT ===`;
    return out;
  };

  const [snapshotText, setSnapshotText] = useState<string>(() => compileWizardSnapshot());

  // Detect case based on snapshot content
  useEffect(() => {
    const lower = snapshotText.toLowerCase();
    if (lower.includes('(clean working tree)') && lower.includes('[untracked]')) {
      setSelectedCase('C');
    } else if (lower.includes('(clean working tree)')) {
      setSelectedCase('A');
    } else if (lower.includes('stripe_service') || (stateData.wal.plannedFiles && !lower.includes(stateData.wal.plannedFiles.split(',')[0].trim().toLowerCase()))) {
      setSelectedCase('D');
    } else {
      setSelectedCase('B');
    }
  }, [snapshotText, stateData.wal.plannedFiles]);

  // Synchronize wizard inputs with live active session
  const handleSyncWithLiveSession = () => {
    const task = stateData.status.activeTask || 'TASK-002';
    setWizardBranch(`feature/${task.toLowerCase().replace(/_/g, '-')}-recovery`);
    setWizardTime(getIsoTimestamp());
    const plannedFile = stateData.wal.plannedFiles?.split(',')[0]?.trim() || 'src/app.ts';
    setWizardStatusShort(` M ${plannedFile}\n?? tests/${task.toLowerCase()}_test.ts`);
    setWizardUnstagedStat(` ${plannedFile} | 18 ++++++++++++++++++\n 1 file changed, 18 insertions(+)`);
    setWizardDiffContent(`diff --git a/${plannedFile} b/${plannedFile}\n--- a/${plannedFile}\n+++ b/${plannedFile}\n@@ -1,4 +1,7 @@\n+// In-flight progress for ${task}\n+// Current step: ${stateData.wal.currentStep || 'Init'}`);
    const checkSummary = computeZlceCheckSummary(rawMarkdown);
    setWizardZlceCheck(checkSummary);
    const walBlock = extractWalSection(rawMarkdown);
    setWizardWalText(walBlock);

    // Immediately update snapshot text
    let out = `=== ZLCE RECOVERY SNAPSHOT ===\n`;
    out += `waktu: ${getIsoTimestamp()}\n`;
    out += `--- branch ---\nfeature/${task.toLowerCase().replace(/_/g, '-')}-recovery\n`;
    out += `--- git status --short ---\n M ${plannedFile}\n?? tests/${task.toLowerCase()}_test.ts\n`;
    out += `--- git log -5 ---\n${wizardGitLog.trim()}\n`;
    out += `--- git diff --stat (unstaged) ---\n ${plannedFile} | 18 ++++++++++++++++++\n 1 file changed, 18 insertions(+)\n`;
    out += `--- git diff --stat (staged) ---\n(empty)\n`;
    out += `--- git diff berkas terlacak (maks. 400 baris) ---\ndiff --git a/${plannedFile} b/${plannedFile}\n--- a/${plannedFile}\n+++ b/${plannedFile}\n@@ -1,4 +1,7 @@\n+// In-flight progress for ${task}\n+// Current step: ${stateData.wal.currentStep || 'Init'}\n`;
    out += `--- zlce-check ---\n${checkSummary}\n`;
    out += `--- WAL (SESSION_STATE.md bagian 3) ---\n${walBlock}\n`;
    out += `=== END SNAPSHOT ===`;
    setSnapshotText(out);
    setSelectedCase('B');
  };

  // Apply quick wizard scenarios
  const handleApplyWizardPreset = (scenario: 'clean' | 'inflight' | 'untracked' | 'wildcard') => {
    const plannedFile = stateData.wal.plannedFiles?.split(',')[0]?.trim() || 'src/index.ts';
    if (scenario === 'clean') {
      setWizardStatusShort('(clean working tree)');
      setWizardUnstagedStat('(empty)');
      setWizardStagedStat('(empty)');
      setWizardDiffContent('(empty)');
      setSelectedCase('A');
    } else if (scenario === 'inflight') {
      setWizardStatusShort(` M ${plannedFile}`);
      setWizardUnstagedStat(` ${plannedFile} | 12 ++++++++++++\n 1 file changed, 12 insertions(+)`);
      setWizardStagedStat('(empty)');
      setWizardDiffContent(`diff --git a/${plannedFile} b/${plannedFile}\n+ // Sesuai plannedFiles WAL: ${plannedFile}`);
      setSelectedCase('B');
    } else if (scenario === 'untracked') {
      setWizardStatusShort('(clean working tree)');
      setWizardGitLog(`e8d7c6b ${new Date().toISOString().slice(0, 10)} 10:38:00 +0700 feat: coba experimental route [UNTRACKED]\nb1c2d3e ${new Date().toISOString().slice(0, 10)} 10:15:00 +0700 feat: implementasi sebelumnya`);
      setWizardUnstagedStat('(empty)');
      setWizardStagedStat('(empty)');
      setWizardDiffContent('(empty)');
      setSelectedCase('C');
    } else if (scenario === 'wildcard') {
      setWizardStatusShort(` M ${plannedFile}\n M src/external/unrelated_service.ts`);
      setWizardUnstagedStat(` src/external/unrelated_service.ts | 30 ++++++++++++++++++++++++++++++\n 1 file changed, 30 insertions(+)`);
      setWizardStagedStat('(empty)');
      setWizardDiffContent(`diff --git a/src/external/unrelated_service.ts b/src/external/unrelated_service.ts\n+ // PERINGATAN KASUS D: File ini tidak terdaftar di WAL!`);
      setSelectedCase('D');
    }
  };

  const handleGenerateFromWizard = () => {
    const compiled = compileWizardSnapshot();
    setSnapshotText(compiled);
  };

  const handleSelectPresetCase = (caseId: 'A' | 'B' | 'C' | 'D') => {
    setSelectedCase(caseId);
    setSnapshotText(caseFixtures[caseId]);
  };

  // Generate Handover Prompt based on HANDOVER_PROMPT.md
  const generateHandoverPrompt = () => {
    return `# UNIVERSAL HANDOVER & RECOVERY PROMPT v3.2.2

Peran: Senior Software Engineer & Context Controller.
Metodologi: Zero-Loss Context Engineering (ZLCE).

## INSTRUKSI SERAH TERIMA & PEMULIHAN SESI

1. BACA TIER 0 SEKARANG:
   - Lampiran: SESSION_STATE.md (terlampir)
   - Task Aktif: ${stateData.status.activeTask || 'TASK-002'} (${stateData.status.activeTaskStatus || 'IN_PROGRESS'})
   - Snapshot Git:
\`\`\`text
${snapshotText}
\`\`\`

2. PROTOKOL KASUS ${selectedCase} TERDETEKSI:
${
  selectedCase === 'A'
    ? '   - KASUS A: Working tree bersih. Lanjutkan persis ke langkah berikutnya di WAL (' + (stateData.wal.nextStepExact || 'eksekusi langkah selanjutnya') + '). DILARANG melakukan git reset.'
    : selectedCase === 'B'
    ? '   - KASUS B: Ditemukan diff uncommitted yang sesuai dengan rencana WAL (' + (stateData.wal.plannedFiles || 'berkas terdaftar') + '). Selesaikan langkah ini, lakukan verifikasi, lalu commit. DILARANG mereset atau menghapus diff.'
    : selectedCase === 'C'
    ? '   - KASUS C: Ditemukan commit tidak terlacak pada git log. Rekonsiliasikan git log dengan SESSION_STATE.md, perbarui audit log, dan jalankan uji verifikasi penuh.'
    : '   - KASUS D: Ditemukan modifikasi di luar berkas yang terdaftar pada WAL. Karantina berkas terkait, dan minta konfirmasi persetujuan pengguna sebelum melakukan tindakan apa pun.'
}

3. TINDAKAN ANDA SEBAGAI AGEN:
   - Konfirmasi status sesi secara singkat (maksimal 6 baris).
   - Terapkan Aturan X1: dilarang mengarang jam baru, gunakan fallback 'jam: ?' bila tidak ada jam eksplisit.
   - Jangan menulis kode sebelum mengonfirmasi status dan meminta berkas Tier 1.
`;
  };

  const generateHandoverBundlePrompt = () => {
    return `${generateHandoverPrompt()}

---

## 4. DOKUMEN KONTROL AKTIF (SESSION_STATE.md)
\`\`\`markdown
${rawMarkdown || '<!-- Gunakan berkas SESSION_STATE.md aktual proyek -->'}
\`\`\`

---
*Petunjuk Agen AI Baru: Seluruh status sesi aktif, matriks task, status WAL, dan snapshot git telah terlampir lengkap di atas. Lakukan LANGKAH 0 & 1/2 konfirmasi status sekarang.*
`;
  };

  const handleCopySnapshotOnly = async () => {
    const success = await copyText(snapshotText);
    if (success) {
      setCopiedSnapshot(true);
      setTimeout(() => setCopiedSnapshot(false), 2000);
    }
  };

  const handleCopyHandover = async () => {
    const success = await copyText(generateHandoverPrompt());
    if (success) {
      setCopiedHandover(true);
      setTimeout(() => setCopiedHandover(false), 2000);
    }
  };

  const handleCopyBundle = async () => {
    const success = await copyText(generateHandoverBundlePrompt());
    if (success) {
      setCopiedBundle(true);
      setTimeout(() => setCopiedBundle(false), 2000);
    }
  };

  const handleCopySnapshotCmd = async () => {
    const success = await copyText('bash scripts/zlce/zlce-snapshot.sh --diff');
    if (success) {
      setCopiedSnapshotCmd(true);
      setTimeout(() => setCopiedSnapshotCmd(false), 2000);
    }
  };

  const caseDescriptions = {
    A: {
      name: 'Kasus A: Working Tree Bersih',
      badge: 'Normal Resume',
      color: 'border-emerald-500 text-emerald-300 bg-emerald-950/40',
      rule: 'Pohon kerja git bersih dan konsisten dengan commit terakhir.',
      action: 'Lanjutkan persis langkah berikutnya yang tertulis di WAL. Dilarang git reset.'
    },
    B: {
      name: 'Kasus B: Diff Uncommitted Sesuai WAL',
      badge: 'In-Flight Changes',
      color: 'border-cyan-500 text-cyan-300 bg-cyan-950/40',
      rule: 'Ada perubahan belum di-commit yang cocok dengan Berkas Direncanakan di WAL.',
      action: 'Pertahankan diff yang ada! Selesaikan langkah, verifikasi dengan perintah test, baru commit.'
    },
    C: {
      name: 'Kasus C: Untracked Commits di Git Log',
      badge: 'Git Desync',
      color: 'border-amber-500 text-amber-300 bg-amber-950/40',
      rule: 'Ditemukan commit di git log yang belum tercatat atau disetujui di SESSION_STATE.md.',
      action: 'Rekonsiliasi git log dengan matriks task, perbarui audit log, dan wajib verifikasi test ulang.'
    },
    D: {
      name: 'Kasus D: Perubahan di Luar WAL (Wildcard)',
      badge: 'Quarantine Required',
      color: 'border-rose-500 text-rose-300 bg-rose-950/40',
      rule: 'Ditemukan modifikasi pada berkas yang TIDAK pernah dideklarasikan pada WAL.',
      action: 'Karantina berkas di luar WAL! Konfirmasi kepada pengguna secara eksplisit sebelum bertindak.'
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <RotateCcw className="w-5 h-5 text-cyan-400" />
              Wizard Pemulihan Sesi & Snapshot Recovery
            </h2>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800">
              Kasus {selectedCase}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Jika sesi AI terputus, token limit, atau berganti model: buat snapshot git dan WAL untuk memulihkan sesi 100% tanpa kehilangan kode.
          </p>
        </div>

        {/* Global Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleCopySnapshotCmd}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
            title="Salin perintah terminal snapshot recovery"
          >
            <Terminal className="w-3.5 h-3.5 text-cyan-400" />
            {copiedSnapshotCmd ? 'Tersalin!' : 'bash scripts/zlce/zlce-snapshot.sh'}
          </button>

          <button
            onClick={handleCopySnapshotOnly}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
            title="Salin teks snapshot ZLCE murni"
          >
            {copiedSnapshot ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4 text-cyan-400" />}
            {copiedSnapshot ? 'Snapshot Tersalin!' : 'Salin Snapshot'}
          </button>

          <button
            onClick={handleCopyHandover}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-cyan-950 hover:bg-cyan-900 text-cyan-300 border border-cyan-700 transition"
            title="Salin prompt serah terima dengan snapshot git tersemat"
          >
            {copiedHandover ? <Check className="w-4 h-4 text-emerald-300" /> : <FileText className="w-4 h-4 text-cyan-300" />}
            {copiedHandover ? 'Prompt Tersalin!' : 'Salin Handover Prompt'}
          </button>

          <button
            onClick={handleCopyBundle}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-950/40 transition"
            title="Salin bundel utuh satu-klik: Prompt + SESSION_STATE + Snapshot Git"
          >
            {copiedBundle ? <Check className="w-4 h-4 text-white" /> : <Zap className="w-4 h-4" />}
            {copiedBundle ? 'Bundel Tersalin!' : 'Salin Bundel All-in-One'}
          </button>
        </div>
      </div>

      {/* Mode Navigation Tabs */}
      <div className="flex items-center gap-3 border-b border-slate-800 pb-2">
        <button
          onClick={() => setActiveMode('wizard')}
          className={`flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-lg transition ${
            activeMode === 'wizard'
              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Wand2 className="w-4 h-4 text-cyan-400" />
          Wizard Generator Snapshot (Kustom & Interaktif)
        </button>
        <button
          onClick={() => setActiveMode('presets')}
          className={`flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-lg transition ${
            activeMode === 'presets'
              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Layers className="w-4 h-4 text-cyan-400" />
          Preset Kasus Pemulihan (Kasus A – D)
        </button>
      </div>

      {/* 4 Cases Selector Cards (Always Visible Quick Overview) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {(['A', 'B', 'C', 'D'] as const).map((caseKey) => {
          const c = caseDescriptions[caseKey];
          const isSelected = selectedCase === caseKey;

          return (
            <div
              key={caseKey}
              onClick={() => {
                setSelectedCase(caseKey);
                if (activeMode === 'presets') {
                  setSnapshotText(caseFixtures[caseKey]);
                } else {
                  handleApplyWizardPreset(
                    caseKey === 'A' ? 'clean' : caseKey === 'B' ? 'inflight' : caseKey === 'C' ? 'untracked' : 'wildcard'
                  );
                }
              }}
              className={`p-4 rounded-xl border cursor-pointer transition-all ${
                isSelected
                  ? 'border-cyan-400 bg-cyan-950/30 shadow-lg shadow-cyan-500/10 ring-1 ring-cyan-500/50'
                  : 'border-slate-800 bg-slate-900/60 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className={`text-xs font-bold px-2 py-0.5 rounded font-mono ${c.color}`}>
                  KASUS {caseKey}
                </span>
                <span className="text-[11px] text-slate-400 font-mono">{c.badge}</span>
              </div>
              <h4 className="text-xs font-bold text-slate-200">{c.name}</h4>
              <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">{c.rule}</p>

              <div className="mt-3 pt-2 border-t border-slate-800 text-[11px] text-cyan-300 flex items-center gap-1">
                <Zap className="w-3 h-3 text-cyan-400 shrink-0" />
                <span className="truncate">{c.action}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Main Content Area based on Active Mode */}
      {activeMode === 'wizard' ? (
        /* WIZARD GENERATOR FORM */
        <div className="bg-slate-900 rounded-xl border border-slate-800 p-5 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
            <div>
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <Wand2 className="w-4 h-4 text-cyan-400" />
                Langkah Pembuatan Snapshot Pemulihan
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Konfigurasikan informasi git, status working tree, dan WAL aktif. Snapshot akan dikompilasi secara deterministik.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleSyncWithLiveSession}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-cyan-600 hover:bg-cyan-500 text-white shadow transition"
                title="Tarik branch, file WAL, dan validasi zlce-check dari sesi yang sedang terbuka"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Tarik Data dari Sesi Aktif
              </button>
              <button
                onClick={handleGenerateFromWizard}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-600 hover:bg-emerald-500 text-white shadow transition"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Kompilasi Snapshot
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Step 1: Branch & Timestamp */}
            <div className="space-y-4 bg-slate-950/60 p-4 rounded-lg border border-slate-800/80">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-200">
                <GitBranch className="w-4 h-4 text-cyan-400" />
                1. Git Branch & Waktu Checkpoint
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Nama Branch Git</label>
                <input
                  type="text"
                  value={wizardBranch}
                  onChange={(e) => setWizardBranch(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded text-xs text-slate-200 font-mono focus:outline-none focus:border-cyan-500"
                  placeholder="feature/task-002-schema"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] text-slate-400">Timestamp (ISO 8601 atau Aturan X1)</label>
                  <div className="flex gap-1">
                    <button
                      onClick={() => setWizardTime(getIsoTimestamp())}
                      className="text-[10px] text-cyan-400 hover:underline px-1 py-0.5 bg-slate-900 rounded"
                    >
                      Sekarang
                    </button>
                    <button
                      onClick={() => setWizardTime('jam: ?')}
                      className="text-[10px] text-amber-400 hover:underline px-1 py-0.5 bg-slate-900 rounded"
                      title="Aturan Jam X1 bila waktu sistem tidak tepercaya"
                    >
                      Aturan X1: "jam: ?"
                    </button>
                  </div>
                </div>
                <input
                  type="text"
                  value={wizardTime}
                  onChange={(e) => setWizardTime(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded text-xs text-slate-200 font-mono focus:outline-none focus:border-cyan-500"
                  placeholder="2026-10-24T10:35:00+07:00"
                />
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 mb-1">
                  Pilih Skenario Cepat Status Git
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => handleApplyWizardPreset('clean')}
                    className="px-2 py-1.5 rounded text-[11px] text-left border border-slate-800 bg-slate-900 hover:bg-slate-800 text-slate-300"
                  >
                    🟢 Kasus A (Clean Tree)
                  </button>
                  <button
                    onClick={() => handleApplyWizardPreset('inflight')}
                    className="px-2 py-1.5 rounded text-[11px] text-left border border-slate-800 bg-slate-900 hover:bg-slate-800 text-slate-300"
                  >
                    🔵 Kasus B (Diff Sesuai WAL)
                  </button>
                  <button
                    onClick={() => handleApplyWizardPreset('untracked')}
                    className="px-2 py-1.5 rounded text-[11px] text-left border border-slate-800 bg-slate-900 hover:bg-slate-800 text-slate-300"
                  >
                    🟡 Kasus C (Commit Desync)
                  </button>
                  <button
                    onClick={() => handleApplyWizardPreset('wildcard')}
                    className="px-2 py-1.5 rounded text-[11px] text-left border border-slate-800 bg-slate-900 hover:bg-slate-800 text-slate-300"
                  >
                    🔴 Kasus D (Diff Luar WAL)
                  </button>
                </div>
              </div>
            </div>

            {/* Step 2: Git Status & Diff Details */}
            <div className="space-y-4 bg-slate-950/60 p-4 rounded-lg border border-slate-800/80">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-200">
                <Terminal className="w-4 h-4 text-cyan-400" />
                2. Status Berkas (git status --short)
              </div>

              <div>
                <textarea
                  value={wizardStatusShort}
                  onChange={(e) => setWizardStatusShort(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded text-xs text-slate-200 font-mono focus:outline-none focus:border-cyan-500 resize-none"
                  placeholder=" M src/models/todo.py&#10;?? migrations/001_todos.sql"
                />
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 mb-1">git diff --stat (unstaged)</label>
                <input
                  type="text"
                  value={wizardUnstagedStat}
                  onChange={(e) => setWizardUnstagedStat(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded text-xs text-slate-200 font-mono focus:outline-none focus:border-cyan-500"
                  placeholder="src/models/todo.py | 14 ++"
                />
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Cuplikan Diff Berkas Terlacak (Maks 400 Baris)</label>
                <textarea
                  value={wizardDiffContent}
                  onChange={(e) => setWizardDiffContent(e.target.value)}
                  rows={4}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded text-xs text-slate-200 font-mono focus:outline-none focus:border-cyan-500 resize-none leading-relaxed"
                  placeholder="diff --git a/... b/..."
                />
              </div>
            </div>

            {/* Step 3: Git Log */}
            <div className="space-y-2 bg-slate-950/60 p-4 rounded-lg border border-slate-800/80">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-200 mb-1">
                <GitCommit className="w-4 h-4 text-cyan-400" />
                3. Git Log Terbaru (git log -5)
              </div>
              <textarea
                value={wizardGitLog}
                onChange={(e) => setWizardGitLog(e.target.value)}
                rows={4}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded text-xs text-slate-200 font-mono focus:outline-none focus:border-cyan-500 resize-none"
                placeholder="b1c2d3e 2026-10-24 10:15:00 feat: implementasi model Todo"
              />
            </div>

            {/* Step 4: WAL & zlce-check Verification */}
            <div className="space-y-2 bg-slate-950/60 p-4 rounded-lg border border-slate-800/80">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-200">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  4. Verifikasi Linter zlce-check & WAL (Bagian 3)
                </div>
                <button
                  onClick={() => {
                    setWizardZlceCheck(computeZlceCheckSummary(rawMarkdown));
                    setWizardWalText(extractWalSection(rawMarkdown));
                  }}
                  className="text-[10px] text-cyan-400 hover:underline"
                >
                  Hitung Ulang
                </button>
              </div>

              <div>
                <input
                  type="text"
                  value={wizardZlceCheck}
                  onChange={(e) => setWizardZlceCheck(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded text-xs text-emerald-300 font-mono focus:outline-none focus:border-cyan-500"
                  placeholder="RESULT: OK (0 error, 0 warn, 3 task)"
                />
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Isi Bagian 3: WORK IN PROGRESS (WAL)</label>
                <textarea
                  value={wizardWalText}
                  onChange={(e) => setWizardWalText(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded text-xs text-slate-200 font-mono focus:outline-none focus:border-cyan-500 resize-none"
                />
              </div>
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              onClick={handleGenerateFromWizard}
              className="flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-semibold shadow-lg shadow-cyan-950/50 transition"
            >
              <RefreshCw className="w-4 h-4" />
              Perbarui Snapshot di Panel Hasil Bawah
            </button>
          </div>
        </div>
      ) : (
        /* PRESETS MODE CARDS */
        <div className="bg-slate-900 p-4 rounded-xl border border-slate-800">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-semibold text-slate-300 flex items-center gap-2">
              <Layers className="w-4 h-4 text-cyan-400" />
              Pilih Preset Kasus Pemulihan
            </h3>
            <span className="text-[11px] text-slate-500">Klik salah satu kasus untuk mengisi otomatis</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {(['A', 'B', 'C', 'D'] as const).map(k => (
              <button
                key={k}
                onClick={() => handleSelectPresetCase(k)}
                className={`p-2.5 rounded-lg text-left border text-xs transition ${
                  selectedCase === k
                    ? 'border-cyan-400 bg-cyan-950/40 text-cyan-200 font-bold'
                    : 'border-slate-800 bg-slate-950 hover:border-slate-700 text-slate-400'
                }`}
              >
                Kasus {k}: {caseDescriptions[k].badge}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Output Inspector: 2 Columns (Left: Snapshot Result, Right: Handover Directive) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Terminal Snapshot Output */}
        <div className="lg:col-span-6 bg-slate-900 rounded-xl border border-slate-800 flex flex-col overflow-hidden">
          <div className="px-4 py-3 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
            <span className="text-xs font-mono text-slate-300 flex items-center gap-2 font-semibold">
              <Terminal className="w-4 h-4 text-cyan-400" />
              Hasil Snapshot ZLCE (Keluaran CLI atau Wizard)
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={handleCopySnapshotOnly}
                className="text-xs px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700 rounded font-medium transition"
              >
                {copiedSnapshot ? 'Tersalin' : 'Salin Snapshot'}
              </button>
            </div>
          </div>

          <textarea
            value={snapshotText}
            onChange={(e) => setSnapshotText(e.target.value)}
            rows={18}
            className="w-full flex-1 p-4 bg-slate-950 text-slate-300 font-mono text-xs focus:outline-none focus:ring-1 focus:ring-cyan-500 border-none resize-none leading-relaxed"
            spellCheck={false}
          />

          <div className="p-3 bg-slate-950/80 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
            <span className="text-[11px] text-slate-400">
              Format kompatibel 100% dengan <code className="text-cyan-400">scripts/zlce/zlce-snapshot.sh</code>
            </span>
            <span className="text-[10px] text-slate-500 font-mono">
              {snapshotText.split('\n').length} baris
            </span>
          </div>
        </div>

        {/* Right: Handover Directive Output */}
        <div className="lg:col-span-6 bg-slate-900 rounded-xl border border-slate-800 flex flex-col overflow-hidden">
          <div className="px-4 py-3 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
            <span className="text-xs font-mono text-slate-300 font-semibold flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              Blok HANDOVER_PROMPT.md Siap Kirim
            </span>
            <button
              onClick={handleCopyHandover}
              className="text-xs px-2.5 py-1 bg-cyan-600 hover:bg-cyan-500 text-white rounded font-medium transition"
            >
              {copiedHandover ? 'Tersalin' : 'Salin Handover Prompt'}
            </button>
          </div>

          <pre className="flex-1 p-4 bg-slate-950 text-slate-300 font-mono text-xs overflow-y-auto max-h-[390px] whitespace-pre-wrap leading-relaxed">
            {generateHandoverPrompt()}
          </pre>

          <div className="p-3 bg-slate-950 border-t border-slate-800 text-xs text-slate-400 flex items-start gap-2">
            <Info className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
            <span>
              <strong>Peringatan Mutlak:</strong> Agen AI dilarang keras melakukan <code className="text-rose-400 font-mono">git reset --hard</code> pada sesi pemulihan untuk mencegah hilangnya hasil kerja yang belum di-commit.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

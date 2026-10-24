import React, { useState } from 'react';
import { 
  GraduationCap, 
  FolderGit2, 
  FileCode2, 
  CheckCircle2, 
  Copy, 
  Check, 
  GitBranch, 
  ArrowRight, 
  AlertTriangle, 
  Terminal, 
  Layers, 
  RefreshCw, 
  Play, 
  Sparkles, 
  ShieldCheck, 
  FileText, 
  GitCommit,
  Workflow,
  Search,
  ExternalLink,
  ChevronRight,
  Lightbulb,
  Cpu,
  Code2
} from 'lucide-react';
import { copyText } from '../utils/clipboard';


type ScenarioType = 'new-project' | 'existing-project' | 'in-progress';

export const TutorialTab: React.FC = () => {
  const [activeScenario, setActiveScenario] = useState<ScenarioType>('new-project');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const copyToClipboard = async (text: string, id: string) => {
    const success = await copyText(text);
    if (success) {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2500);
    }
  };

  return (
    <div className="space-y-6">
      {/* Hero Header */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border border-slate-700/80 rounded-2xl p-6 shadow-xl">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-cyan-500/10 rounded-lg border border-cyan-500/20 text-cyan-400">
                <GraduationCap className="w-6 h-6" />
              </div>
              <h2 className="text-xl font-bold text-white tracking-tight">
                Panduan Praktis Zero-Loss Context Engineering (ZLCE)
              </h2>
            </div>
            <p className="text-sm text-slate-300 max-w-3xl">
              Panduan implementasi metodologi ZLCE di berbagai siklus proyek: dari awal (greenfield), audit proyek selesai (maintenance/fitur baru), hingga takeover proyek yang macet di tengah jalan.
            </p>
          </div>

          <div className="flex items-center gap-2 bg-slate-950/80 px-3 py-1.5 rounded-lg border border-slate-800 text-xs font-mono text-cyan-300">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Anti-Amnesia • 0% Context Drift</span>
          </div>
        </div>

        {/* Scenario Switcher Tabs */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-6 pt-6 border-t border-slate-700/60">
          <button
            onClick={() => setActiveScenario('new-project')}
            className={`flex items-center gap-3 p-3.5 rounded-xl border text-left transition-all ${
              activeScenario === 'new-project'
                ? 'bg-cyan-950/50 border-cyan-500/80 text-white shadow-lg shadow-cyan-900/20 ring-1 ring-cyan-500/30'
                : 'bg-slate-900/70 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <div className={`p-2 rounded-lg ${activeScenario === 'new-project' ? 'bg-cyan-500/20 text-cyan-300' : 'bg-slate-800 text-slate-400'}`}>
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-cyan-400">Kasus 1</div>
              <div className="text-sm font-bold text-slate-100">Proyek Baru (Greenfield)</div>
              <div className="text-xs text-slate-400">Mulai dari 0 dengan 4 Gerbang ZLCE</div>
            </div>
          </button>

          <button
            onClick={() => setActiveScenario('existing-project')}
            className={`flex items-center gap-3 p-3.5 rounded-xl border text-left transition-all ${
              activeScenario === 'existing-project'
                ? 'bg-amber-950/50 border-amber-500/80 text-white shadow-lg shadow-amber-900/20 ring-1 ring-amber-500/30'
                : 'bg-slate-900/70 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <div className={`p-2 rounded-lg ${activeScenario === 'existing-project' ? 'bg-amber-500/20 text-amber-300' : 'bg-slate-800 text-slate-400'}`}>
              <RefreshCw className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-amber-400">Kasus 2</div>
              <div className="text-sm font-bold text-slate-100">Proyek Selesai (Review / Update)</div>
              <div className="text-xs text-slate-400">Audit, refactoring & penambahan fitur</div>
            </div>
          </button>

          <button
            onClick={() => setActiveScenario('in-progress')}
            className={`flex items-center gap-3 p-3.5 rounded-xl border text-left transition-all ${
              activeScenario === 'in-progress'
                ? 'bg-indigo-950/50 border-indigo-500/80 text-white shadow-lg shadow-indigo-900/20 ring-1 ring-indigo-500/30'
                : 'bg-slate-900/70 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <div className={`p-2 rounded-lg ${activeScenario === 'in-progress' ? 'bg-indigo-500/20 text-indigo-300' : 'bg-slate-800 text-slate-400'}`}>
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-indigo-400">Kasus 3</div>
              <div className="text-sm font-bold text-slate-100">Proyek di Tengah Jalan (Takeover)</div>
              <div className="text-xs text-slate-400">Recovery proyek macet / pergantian agent</div>
            </div>
          </button>
        </div>
      </div>

      {/* Scenario 1: New Project */}
      {activeScenario === 'new-project' && (
        <div className="space-y-6 animate-fadeIn">
          {/* Overview Banner */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5">
            <h3 className="text-base font-bold text-cyan-400 flex items-center gap-2 mb-2">
              <Sparkles className="w-5 h-5" />
              Skenario 1: Membangun Proyek Baru dari Nol (Greenfield Project)
            </h3>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Pada proyek baru, AI Agent sering kali langsung menulis puluhan file kode sekaligus yang berantakan, membuat keputusan arsitektur sendiri, dan kehilangan konteks di putaran ke-3. Metode ZLCE memberlakukan <strong>4 Gerbang Kontrol (Gate-1 s/d Gate-4)</strong>: AI Agent <em>dilarang keras menulis kode produksi</em> sebelum menyepakati Blueprint, Arsitektur, State Awal, dan Task Queue bersama developer.
            </p>
          </div>

          {/* Step 1: Repo Setup & Folder Structure */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-cyan-500/20 text-cyan-400 font-bold text-xs flex items-center justify-center">
                  1
                </span>
                <h4 className="text-sm font-bold text-white">Struktur Repositori GitHub &amp; File Markdown ZLCE</h4>
              </div>
              <span className="text-xs font-mono text-cyan-400 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-800/40">
                Langkah Inisiasi Repo
              </span>
            </div>

            <p className="text-xs text-slate-300">
              Buat repository di GitHub, clone ke lokal, lalu siapkan struktur folder dokumentasi ZLCE. Tempatkan file-file kendali di direktori root atau dalam folder <code className="text-cyan-300 bg-slate-950 px-1 py-0.5 rounded font-mono">.zlce/</code> atau <code className="text-cyan-300 bg-slate-950 px-1 py-0.5 rounded font-mono">docs/zlce/</code>.
            </p>

            {/* Recommended File Tree */}
            <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 font-mono text-xs text-slate-300 relative">
              <div className="flex items-center justify-between text-slate-400 mb-2 pb-2 border-b border-slate-800">
                <span className="flex items-center gap-1.5"><FolderGit2 className="w-4 h-4 text-cyan-400" /> Rekomendasi Struktur File Repo GitHub:</span>
                <button
                  onClick={() => copyToClipboard(FILE_TREE_NEW_PROJECT, 'tree-new')}
                  className="flex items-center gap-1 text-[11px] text-cyan-400 hover:text-cyan-300"
                >
                  {copiedId === 'tree-new' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedId === 'tree-new' ? 'Tersalin' : 'Salin Tree'}
                </button>
              </div>
              <pre className="text-emerald-400 overflow-x-auto leading-relaxed">{FILE_TREE_NEW_PROJECT}</pre>
            </div>

            {/* Git Setup Commands */}
            <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-slate-400 text-xs">
                <span className="flex items-center gap-1.5 font-mono"><Terminal className="w-3.5 h-3.5 text-amber-400" /> Perintah Terminal Git Awal:</span>
                <button
                  onClick={() => copyToClipboard(GIT_SETUP_COMMANDS, 'git-setup')}
                  className="flex items-center gap-1 text-[11px] text-cyan-400 hover:text-cyan-300 font-mono"
                >
                  {copiedId === 'git-setup' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedId === 'git-setup' ? 'Tersalin' : 'Salin Perintah'}
                </button>
              </div>
              <pre className="text-cyan-300 font-mono text-xs overflow-x-auto bg-slate-900 p-2.5 rounded border border-slate-800">
{GIT_SETUP_COMMANDS}
              </pre>
            </div>
          </div>

          {/* Step 2: Initial Prompt to Feed to AI Agent */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-cyan-500/20 text-cyan-400 font-bold text-xs flex items-center justify-center">
                  2
                </span>
                <h4 className="text-sm font-bold text-white">Prompt Awal yang Dipasang ke AI Agent (LANDING_PROMPT)</h4>
              </div>
              <span className="text-xs font-mono text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/40">
                Zero-Loss Prompt
              </span>
            </div>

            <p className="text-xs text-slate-300">
              Kirimkan prompt ini ke AI Agent Anda (misalnya di <strong>Cursor, Windsurf, Claude Code, GitHub Copilot Chat, atau ChatGPT</strong>). Prompt ini mengunci agen ke dalam aturan deterministik dan memaksanya berhenti di Gerbang 1 tanpa membuat asumsi sepihak.
            </p>

            <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono text-slate-400 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-cyan-400" /> Prompt Inisiasi Proyek Baru (Contoh: Web Rental Motor)
                </span>
                <button
                  onClick={() => copyToClipboard(NEW_PROJECT_LANDING_PROMPT, 'prompt-new')}
                  className="flex items-center gap-1 text-xs bg-cyan-600 hover:bg-cyan-500 text-white font-medium px-3 py-1.5 rounded-lg transition-colors"
                >
                  {copiedId === 'prompt-new' ? <Check className="w-3.5 h-3.5 text-white" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedId === 'prompt-new' ? 'Prompt Tersalin!' : 'Salin Prompt Awal'}
                </button>
              </div>
              <pre className="text-slate-300 font-mono text-xs overflow-x-auto bg-slate-900 p-3.5 rounded border border-slate-800 max-h-72 leading-relaxed">
{NEW_PROJECT_LANDING_PROMPT}
              </pre>
            </div>
          </div>

          {/* Step 3: The 4-Gate Workflow */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-cyan-500/20 text-cyan-400 font-bold text-xs flex items-center justify-center">
                  3
                </span>
                <h4 className="text-sm font-bold text-white">Eksekusi 4 Gerbang ZLCE (Gate 1 hingga Gate 4)</h4>
              </div>
              <span className="text-xs font-mono text-amber-400 bg-amber-950/60 px-2 py-0.5 rounded border border-amber-800/40">
                Gate Protocol
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="bg-slate-950/70 p-3.5 rounded-lg border border-slate-800 space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-cyan-400">
                  <span className="w-5 h-5 rounded-full bg-cyan-500/20 flex items-center justify-center text-[10px]">G1</span>
                  Gerbang 1: Blueprint Approval
                </div>
                <p className="text-xs text-slate-400">
                  Agen hanya menghasilkan <code className="text-slate-200">BLUEPRINT.md</code> berisi lingkup, domain profile, dan batasan. Agen <strong>STOP</strong> meminta konfirmasi Anda:
                </p>
                <div className="bg-slate-900 p-2 rounded text-[11px] font-mono text-emerald-300">
                  Prompt Persetujuan: "Setujui BLUEPRINT. Lanjutkan ke Gerbang 2."
                </div>
              </div>

              <div className="bg-slate-950/70 p-3.5 rounded-lg border border-slate-800 space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-cyan-400">
                  <span className="w-5 h-5 rounded-full bg-cyan-500/20 flex items-center justify-center text-[10px]">G2</span>
                  Gerbang 2: Architecture &amp; Data Model
                </div>
                <p className="text-xs text-slate-400">
                  Agen membuat <code className="text-slate-200">ARCHITECTURE.md</code> dan <code className="text-slate-200">DATA_MODEL.md</code> (mengimpor profil domain). Agen <strong>STOP</strong> meminta persetujuan.
                </p>
                <div className="bg-slate-900 p-2 rounded text-[11px] font-mono text-emerald-300">
                  Prompt Persetujuan: "Setujui ARCHITECTURE dan DATA_MODEL. Lanjutkan ke Gerbang 3."
                </div>
              </div>

              <div className="bg-slate-950/70 p-3.5 rounded-lg border border-slate-800 space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-cyan-400">
                  <span className="w-5 h-5 rounded-full bg-cyan-500/20 flex items-center justify-center text-[10px]">G3</span>
                  Gerbang 3: Tasks &amp; Testing Strategy
                </div>
                <p className="text-xs text-slate-400">
                  Agen membuat <code className="text-slate-200">TASKS.md</code> (daftar tugas atomik TASK-001, TASK-002, dst) dan <code className="text-slate-200">TESTING.md</code> (rencana pengujian). Agen <strong>STOP</strong>.
                </p>
                <div className="bg-slate-900 p-2 rounded text-[11px] font-mono text-emerald-300">
                  Prompt Persetujuan: "Setujui TASKS dan TESTING. Lanjutkan ke Gerbang 4."
                </div>
              </div>

              <div className="bg-slate-950/70 p-3.5 rounded-lg border border-slate-800 space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-emerald-400">
                  <span className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center text-[10px]">G4</span>
                  Gerbang 4: Session State &amp; Eksekusi Kode
                </div>
                <p className="text-xs text-slate-400">
                  Agen menyiapkan <code className="text-slate-200">SESSION_STATE.md</code> awal, <code className="text-slate-200">AI_WORKFLOW.md</code>, dan <code className="text-slate-200">CHECKLISTS.md</code>. Agen mulai mengeksekusi HANYA 1 task dalam status <code className="text-amber-300 font-mono">IN_PROGRESS</code> dengan WAL dan bukti verifikasi.
                </p>
                <div className="bg-slate-900 p-2 rounded text-[11px] font-mono text-emerald-300">
                  Prompt Per Task: "Setujui bukti verifikasi TASK-001, lanjutkan ke TASK-002"
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Scenario 2: Existing / Completed Project */}
      {activeScenario === 'existing-project' && (
        <div className="space-y-6 animate-fadeIn">
          {/* Overview Banner */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5">
            <h3 className="text-base font-bold text-amber-400 flex items-center gap-2 mb-2">
              <RefreshCw className="w-5 h-5" />
              Skenario 2: Proyek Selesai / Existing (Review, Update, atau Penambahan Fitur)
            </h3>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Jika Anda memiliki codebase yang sudah jadi dan ingin melakukan audit menyeluruh, perbaikan bug, atau penambahan fitur baru, <strong>JANGAN langsung meminta AI mengubah file kode</strong>. Hal ini sering merusak fitur yang sudah berjalan (*regression bug*). Gunakan protokol <strong>Audit Snapshot &amp; Revision Triage ZLCE</strong> berikut.
            </p>
          </div>

          {/* Step 1: Reverse-Engineering & Codebase Snapshot */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-amber-500/20 text-amber-400 font-bold text-xs flex items-center justify-center">
                  1
                </span>
                <h4 className="text-sm font-bold text-white">Audit Codebase &amp; Pembuatan File Kendali ZLCE</h4>
              </div>
              <span className="text-xs font-mono text-amber-400 bg-amber-950/60 px-2 py-0.5 rounded border border-amber-800/40">
                Non-Destructive Audit
              </span>
            </div>

            <p className="text-xs text-slate-300">
              File yang perlu diunggah atau dibuat di root repository Anda untuk membungkus proyek existing dengan ZLCE:
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                <div className="font-mono font-bold text-cyan-400 mb-1 flex items-center gap-1.5">
                  <FileCode2 className="w-4 h-4" /> CODEBASE_SNAPSHOT.md
                </div>
                <p className="text-slate-400">
                  Daftar modul, arsitektur yang sudah berjalan, skema DB saat ini, dependency di <code className="text-slate-300">package.json</code>, dan routes yang aktif.
                </p>
              </div>

              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                <div className="font-mono font-bold text-emerald-400 mb-1 flex items-center gap-1.5">
                  <FileText className="w-4 h-4" /> SESSION_STATE.md
                </div>
                <p className="text-slate-400">
                  State session ZLCE yang mencatat status fitur yang sudah selesai (Task status DONE) dan mendaftarkan fitur baru sebagai PENDING.
                </p>
              </div>

              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                <div className="font-mono font-bold text-amber-400 mb-1 flex items-center gap-1.5">
                  <GitBranch className="w-4 h-4" /> REVISION_TRIAGE.md
                </div>
                <p className="text-slate-400">
                  Matriks klasifikasi dampak perubahan (Ukuran S, M, atau L) untuk mencegah rusaknya fitur eksisting.
                </p>
              </div>
            </div>
          </div>

          {/* Step 2: The Audit & Inspection Prompt */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-amber-500/20 text-amber-400 font-bold text-xs flex items-center justify-center">
                  2
                </span>
                <h4 className="text-sm font-bold text-white">Prompt Inisialisasi Audit Proyek Selesai</h4>
              </div>
              <span className="text-xs font-mono text-cyan-400 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-800/40">
                Prompt Audit (Read-Only)
              </span>
            </div>

            <p className="text-xs text-slate-300">
              Gunakan prompt ini ke AI Agent Anda di project yang sudah berjalan. Instruksi ini <strong>memblokir agen untuk memodifikasi kode apapun</strong> sampai pemetaan selesai dan divalidasi.
            </p>

            <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono text-slate-400 flex items-center gap-1.5">
                  <Search className="w-3.5 h-3.5 text-amber-400" /> Prompt Audit &amp; Reverse-Engineering Codebase
                </span>
                <button
                  onClick={() => copyToClipboard(EXISTING_PROJECT_AUDIT_PROMPT, 'prompt-audit')}
                  className="flex items-center gap-1 text-xs bg-amber-600 hover:bg-amber-500 text-white font-medium px-3 py-1.5 rounded-lg transition-colors"
                >
                  {copiedId === 'prompt-audit' ? <Check className="w-3.5 h-3.5 text-white" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedId === 'prompt-audit' ? 'Prompt Tersalin!' : 'Salin Prompt Audit'}
                </button>
              </div>
              <pre className="text-slate-300 font-mono text-xs overflow-x-auto bg-slate-900 p-3.5 rounded border border-slate-800 max-h-72 leading-relaxed">
{EXISTING_PROJECT_AUDIT_PROMPT}
              </pre>
            </div>
          </div>

          {/* Step 3: Prompt Requesting Changes */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-amber-500/20 text-amber-400 font-bold text-xs flex items-center justify-center">
                  3
                </span>
                <h4 className="text-sm font-bold text-white">Prompt Penambahan / Perubahan Fitur (Dengan Triase Ukuran S/M/L)</h4>
              </div>
              <span className="text-xs font-mono text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/40">
                Zero-Regression Flow
              </span>
            </div>

            <p className="text-xs text-slate-300">
              Setelah audit selesai, saat Anda ingin meminta penambahan fitur (misal: "tambahkan integrasi payment gateway Midtrans dan fitur voucher diskon di Web Rental Motor"), gunakan template prompt triase berikut:
            </p>

            <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono text-slate-400 flex items-center gap-1.5">
                  <Workflow className="w-3.5 h-3.5 text-emerald-400" /> Prompt Permintaan Perubahan / Fitur Baru
                </span>
                <button
                  onClick={() => copyToClipboard(FEATURE_REQUEST_PROMPT, 'prompt-feature')}
                  className="flex items-center gap-1 text-xs bg-emerald-600 hover:bg-emerald-500 text-white font-medium px-3 py-1.5 rounded-lg transition-colors"
                >
                  {copiedId === 'prompt-feature' ? <Check className="w-3.5 h-3.5 text-white" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedId === 'prompt-feature' ? 'Prompt Tersalin!' : 'Salin Prompt Fitur'}
                </button>
              </div>
              <pre className="text-slate-300 font-mono text-xs overflow-x-auto bg-slate-900 p-3.5 rounded border border-slate-800 max-h-72 leading-relaxed">
{FEATURE_REQUEST_PROMPT}
              </pre>
            </div>
          </div>
        </div>
      )}

      {/* Scenario 3: In-Progress / Stalled Project */}
      {activeScenario === 'in-progress' && (
        <div className="space-y-6 animate-fadeIn">
          {/* Overview Banner */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5">
            <h3 className="text-base font-bold text-indigo-400 flex items-center gap-2 mb-2">
              <Layers className="w-5 h-5" />
              Skenario 3: Melanjutkan Proyek di Tengah Jalan (Takeover / Recovery)
            </h3>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Skenario ini terjadi ketika proyek sedang dikembangkan tetapi AI Agent mengalami <strong>context limit (lupa task sebelumnya), berhalusinasi, error beruntun, atau saat Anda mengganti tools</strong> (misal dari ChatGPT ke Claude Code/Cursor). ZLCE menyediakan protokol <strong>Kasus A/B/C/D</strong> untuk memulihkan state dalam 1 putaran.
            </p>
          </div>

          {/* Forensic Steps */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-indigo-500/20 text-indigo-400 font-bold text-xs flex items-center justify-center">
                  1
                </span>
                <h4 className="text-sm font-bold text-white">Inspeksi Forensik Status Terakhir (Git &amp; Code)</h4>
              </div>
              <span className="text-xs font-mono text-indigo-400 bg-indigo-950/60 px-2 py-0.5 rounded border border-indigo-800/40">
                Forensic Check
              </span>
            </div>

            <p className="text-xs text-slate-300">
              Sebelum memanggil AI, jalankan 3 perintah ini di terminal Anda untuk mengetahui posisi persis proyek:
            </p>

            <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span className="font-mono flex items-center gap-1.5"><Terminal className="w-3.5 h-3.5 text-cyan-400" /> Perintah Forensik Terminal:</span>
                <button
                  onClick={() => copyToClipboard(FORENSIC_COMMANDS, 'forensic')}
                  className="flex items-center gap-1 text-[11px] text-cyan-400 hover:text-cyan-300 font-mono"
                >
                  {copiedId === 'forensic' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedId === 'forensic' ? 'Tersalin' : 'Salin Perintah'}
                </button>
              </div>
              <pre className="text-cyan-300 font-mono text-xs overflow-x-auto bg-slate-900 p-2.5 rounded border border-slate-800">
{FORENSIC_COMMANDS}
              </pre>
            </div>
          </div>

          {/* Transition Prompt */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-indigo-500/20 text-indigo-400 font-bold text-xs flex items-center justify-center">
                  2
                </span>
                <h4 className="text-sm font-bold text-white">Prompt Transisi / Handover ke AI Agent Baru</h4>
              </div>
              <span className="text-xs font-mono text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/40">
                Protokol Handover
              </span>
            </div>

            <p className="text-xs text-slate-300">
              Paste prompt ini ke chat sesi baru AI Agent. Prompt ini memaksa agen merekonstruksi <strong>Write-Ahead Log (WAL)</strong> dan memverifikasi commit git terakhir sebelum menyentuh file apapun.
            </p>

            <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono text-slate-400 flex items-center gap-1.5">
                  <Play className="w-3.5 h-3.5 text-indigo-400" /> Prompt Takeover &amp; Resumption ZLCE
                </span>
                <button
                  onClick={() => copyToClipboard(TAKEOVER_PROMPT, 'prompt-takeover')}
                  className="flex items-center gap-1 text-xs bg-indigo-600 hover:bg-indigo-500 text-white font-medium px-3 py-1.5 rounded-lg transition-colors"
                >
                  {copiedId === 'prompt-takeover' ? <Check className="w-3.5 h-3.5 text-white" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedId === 'prompt-takeover' ? 'Prompt Tersalin!' : 'Salin Prompt Takeover'}
                </button>
              </div>
              <pre className="text-slate-300 font-mono text-xs overflow-x-auto bg-slate-900 p-3.5 rounded border border-slate-800 max-h-72 leading-relaxed">
{TAKEOVER_PROMPT}
              </pre>
            </div>
          </div>

          {/* Recovery Case Matrix */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
            <h4 className="text-sm font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-3">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              Matriks Penanganan Kasus Recovery (A, B, C, D)
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                <div className="font-bold text-cyan-400 mb-1">Kasus A: Sesi Baru, State Utuh</div>
                <p className="text-slate-400">File <code className="text-slate-200">SESSION_STATE.md</code> ada dan valid. Cukup baca file tersebut, baca WAL, verifikasi task aktif, dan lanjutkan tugas.</p>
              </div>
              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                <div className="font-bold text-amber-400 mb-1">Kasus B: Task Terputus / Macet di Tengah</div>
                <p className="text-slate-400">Task berstatus IN_PROGRESS tapi agen sebelumnya terputus. Baca field <code className="text-slate-200">Langkah Berikutnya (Eksak)</code> pada WAL dan jalankan perintah verifikasi.</p>
              </div>
              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                <div className="font-bold text-rose-400 mb-1">Kasus C: State Korup / Tidak Sinkron</div>
                <p className="text-slate-400">Git diff tidak cocok dengan WAL. Jalankan inspeksi <code className="text-slate-200">git status</code>, reset state ke commit stabil terakhir, lalu sinkronkan ulang tabel task.</p>
              </div>
              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                <div className="font-bold text-purple-400 mb-1">Kasus D: Handover ke Pengembang Lain</div>
                <p className="text-slate-400">Tulis catatan handover di bagian <code className="text-slate-200">## Catatan Handover</code>, commit file state, dan lampirkan link branch git.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* GitHub Best Practices & Commit Rules Card */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 space-y-3">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <GitCommit className="w-4 h-4 text-cyan-400" />
          Aturan Git &amp; Commit Atomik Zero-Loss (Wajib untuk Semua Skenario)
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs text-slate-300">
          <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 space-y-1">
            <div className="font-bold text-emerald-400">1. Commit Bersama State</div>
            <p className="text-slate-400 text-[11px]">
              Setiap kali Anda men-commit kode hasil suatu Task, <strong>wajib sertakan perubahan pada <code className="text-slate-300">SESSION_STATE.md</code></strong> dalam commit yang sama.
            </p>
            <div className="font-mono text-[10px] text-cyan-300 bg-slate-900 p-1.5 rounded">
              git add src/ SESSION_STATE.md<br/>git commit -m "feat: [TASK-002] motor catalog"
            </div>
          </div>

          <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 space-y-1">
            <div className="font-bold text-cyan-400">2. Tagging Checkpoint Gerbang</div>
            <p className="text-slate-400 text-[11px]">
              Setiap kali melewati gerbang kontrol (G1 s/d G4), buat git tag agar bisa di-rollback dengan mudah jika ada regresi:
            </p>
            <div className="font-mono text-[10px] text-cyan-300 bg-slate-900 p-1.5 rounded">
              git tag -a gate-1-blueprint -m "Approved"<br/>git tag -a gate-2-arch -m "Approved"
            </div>
          </div>

          <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 space-y-1">
            <div className="font-bold text-amber-400">3. Rule X1: Anti-Jam Halusinasi</div>
            <p className="text-slate-400 text-[11px]">
              Dilarang keras menyuruh agen menghitung jam estimasi (misal 2.5 jam). Gunakan indikator deterministik: <strong>status task (PENDING/READY/IN_PROGRESS/DONE)</strong> dan bukti verifikasi (Evidence).
            </p>
          </div>
        </div>
      </div>

      {/* Saran Bijak Memilih AI Tool */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950/40 border border-slate-800 rounded-xl p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Lightbulb className="w-4 h-4 text-amber-400" />
            Saran Bijak Memilih AI: Setiap Alat Dipakai Sesuai Kebutuhan Kerja
          </h3>
          <span className="text-xs font-mono text-cyan-400 bg-cyan-950/60 px-2.5 py-0.5 rounded border border-cyan-800/40 self-start sm:self-auto">
            ZLCE Compatibility Anchor
          </span>
        </div>

        <p className="text-xs text-slate-300 leading-relaxed">
          Tidak ada satu alat AI yang dapat menyelesaikan semua hal sekaligus secara optimal. Gunakan ekosistem spesialis berikut dan jadikan ZLCE sebagai <em>context anchor</em> agar state proyek tetap rapi tanpa kehilangan data:
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <div className="bg-slate-950/90 p-3.5 rounded-lg border border-slate-800/90 space-y-1.5 hover:border-slate-700 transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                <Code2 className="w-3.5 h-3.5" /> Coding Aktif
              </span>
              <span className="text-[10px] font-mono text-slate-400 bg-slate-900 px-1.5 py-0.5 rounded">IDE Autocomplete</span>
            </div>
            <div className="text-xs font-semibold text-white">GitHub Copilot / Codeium</div>
            <p className="text-[11px] text-slate-400">
              Pelengkapan kode otomatis berkecepatan tinggi saat mengetik langsung di editor VS Code / JetBrains.
            </p>
          </div>

          <div className="bg-slate-950/90 p-3.5 rounded-lg border border-slate-800/90 space-y-1.5 hover:border-slate-700 transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-cyan-400 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5" /> Review &amp; Analisis
              </span>
              <span className="text-[10px] font-mono text-slate-400 bg-slate-900 px-1.5 py-0.5 rounded">Deep Reasoning</span>
            </div>
            <div className="text-xs font-semibold text-white">Claude (Anthropic)</div>
            <p className="text-[11px] text-slate-400">
              Penalaran arsitektur mendalam, refactoring aman, dan audit kepatuhan kode tanpa asumsi liar.
            </p>
          </div>

          <div className="bg-slate-950/90 p-3.5 rounded-lg border border-slate-800/90 space-y-1.5 hover:border-slate-700 transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                <Search className="w-3.5 h-3.5" /> Riset Cepat
              </span>
              <span className="text-[10px] font-mono text-slate-400 bg-slate-900 px-1.5 py-0.5 rounded">Web Grounded</span>
            </div>
            <div className="text-xs font-semibold text-white">Phind / Perplexity</div>
            <p className="text-[11px] text-slate-400">
              Pencarian dokumentasi API terbaru, solusi error terkini, dan referensi pustaka pihak ketiga dengan sitasi sumber.
            </p>
          </div>

          <div className="bg-slate-950/90 p-3.5 rounded-lg border border-slate-800/90 space-y-1.5 hover:border-slate-700 transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-purple-400 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" /> Prototyping UI
              </span>
              <span className="text-[10px] font-mono text-slate-400 bg-slate-900 px-1.5 py-0.5 rounded">Generative Frontend</span>
            </div>
            <div className="text-xs font-semibold text-white">v0 (Vercel)</div>
            <p className="text-[11px] text-slate-400">
              Menghasilkan komponen antarmuka React, Tailwind CSS, dan shadcn dari deskripsi visual dalam hitungan detik.
            </p>
          </div>

          <div className="bg-slate-950/90 p-3.5 rounded-lg border border-slate-800/90 space-y-1.5 hover:border-slate-700 transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-blue-400 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5" /> Manajemen Snippet
              </span>
              <span className="text-[10px] font-mono text-slate-400 bg-slate-900 px-1.5 py-0.5 rounded">Context Bank</span>
            </div>
            <div className="text-xs font-semibold text-white">Pieces</div>
            <p className="text-[11px] text-slate-400">
              Menyimpan, mengkategorikan, dan mencari potongan kode penting lintas IDE dengan metadata otomatis.
            </p>
          </div>

          <div className="bg-slate-950/90 p-3.5 rounded-lg border border-slate-800/90 space-y-1.5 hover:border-slate-700 transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-rose-400 flex items-center gap-1.5">
                <Terminal className="w-3.5 h-3.5" /> Terminal &amp; CLI
              </span>
              <span className="text-[10px] font-mono text-slate-400 bg-slate-900 px-1.5 py-0.5 rounded">Command Shell</span>
            </div>
            <div className="text-xs font-semibold text-white">Warp</div>
            <p className="text-[11px] text-slate-400">
              Terminal modern bertenaga AI untuk menjelaskan perintah bash/zsh, debugging command output, dan kolaborasi shell.
            </p>
          </div>
        </div>

        <div className="bg-slate-950/80 p-3 rounded-lg border border-slate-800 text-xs text-slate-300 flex items-start gap-2.5">
          <Sparkles className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
          <div>
            <strong className="text-white">Intinya:</strong> Setiap alat AI dipakai sesuai kebutuhan kerja yang berbeda. ZLCE bertindak sebagai jangkar pengendali arsitektur dan status, sehingga output dari alat manapun tetap terkunci dalam format yang deterministik dan zero-loss.
          </div>
        </div>
      </div>
    </div>
  );
};

// Static templates for prompt copy-pasting
const FILE_TREE_NEW_PROJECT = `.
├── .gitignore
├── README.md                   <-- Panduan utama & 3 langkah mulai cepat
├── package.json
│
├── LANDING_PROMPT.md           <-- Prompt spesifikasi proyek awal
├── HANDOVER_PROMPT.md          <-- Protokol serah terima & recovery
├── BLUEPRINT.md                <-- Hasil Gerbang 1 (Lingkup, User Story, Batasan)
├── ARCHITECTURE.md             <-- Hasil Gerbang 2 (Arsitektur modul & tech stack)
├── DATA_MODEL.md               <-- Hasil Gerbang 2 (Skema DB & relasi entitas)
├── TASKS.md                    <-- Hasil Gerbang 3 (Daftar antrean tugas atomik)
├── TESTING.md                  <-- Hasil Gerbang 3 (Rencana pengujian & acceptance)
├── SESSION_STATE.md            <-- Hasil Gerbang 4 (Single source of truth, WAL & evidence)
├── AI_WORKFLOW.md              <-- Hasil Gerbang 4 (Aturan eksekusi & checkpoint)
│
├── templates/
│   └── profiles/
│       └── DOMAIN_BOOKING.profile.md  <-- Profil domain (misal: Rental Motor)
│
└── src/                        <-- Kode aplikasi (Dibuat HANYA saat eksekusi task Gerbang 4)
    ├── components/
    ├── services/
    └── ...`;

const GIT_SETUP_COMMANDS = `# 1. Inisialisasi repo lokal & buat branch main
git init
git branch -M main

# 2. Buat file .gitignore standar
cat << 'EOF' > .gitignore
node_modules/
dist/
.env
.env.local
.DS_Store
EOF

# 3. Simpan file ZLCE awal
git add .
git commit -m "chore: setup ZLCE zero-loss context control framework"

# 4. Hubungkan ke GitHub repo Anda
# git remote add origin https://github.com/username/web-rental-motor.git
# git push -u origin main`;

const NEW_PROJECT_LANDING_PROMPT = `Halo! Kita akan memulai proyek baru menggunakan metodologi **Zero-Loss Context Engineering (ZLCE) v3.2.2**.

Aturan Utama Eksekusi:
1. Anda HARUS mengikuti protokol 4 Gerbang:
   - Gerbang 1: Buat HANYA \`BLUEPRINT.md\`. Lalu BERHENTI dan tunggu persetujuan saya.
   - Gerbang 2: Buat HANYA \`ARCHITECTURE.md\` dan \`DATA_MODEL.md\`. Lalu BERHENTI dan tunggu persetujuan saya.
   - Gerbang 3: Buat HANYA \`TASKS.md\` dan \`TESTING.md\`. Lalu BERHENTI.
   - Gerbang 4: Buat dokumen kontrol pendukung (\`SESSION_STATE.md\`, \`AI_WORKFLOW.md\`, \`CHECKLISTS.md\`), lalu eksekusi task satu per satu (Rule R4: hanya 1 task berstatus IN_PROGRESS pada satu waktu).
2. DILARANG keras menulis kode produksi di src/ sebelum Gerbang 1 s/d 3 selesai disetujui.
3. Selalu perbarui Write-Ahead Log (WAL) sebelum dan sesudah menyentuh file.

Spesifikasi Proyek:
- Nama Proyek: Web Rental Motor
- Domain: Rental Kendaraan / Sewa Motor (Gunakan profil domain 'booking')
- Stack: React 19, Vite, Tailwind CSS, TypeScript, SQLite / Cloud SQL
- Modus: LITE (Rekomendasi Default)
- Kemampuan: Tulis File & Jalankan Perintah Terminal (Full Exec)
- Sasaran:
  1. Katalog armada motor dengan ketersediaan tanggal real-time
  2. Alur reservasi anti-double booking
  3. Verifikasi identitas penyewa (Upload/Input KTP & SIM C)
  4. Dashboard pengelola untuk monitoring unit motor, status pengembalian, dan deposit

Mulai sekarang dengan menghasilkan HANYA file \`BLUEPRINT.md\` (Gerbang 1). Jangan menulis file lain sebelum saya setujui.`;

const EXISTING_PROJECT_AUDIT_PROMPT = `Halo! Kita akan melakukan review, audit, dan penambahan fitur pada proyek yang sudah ada ini menggunakan metodologi **Zero-Loss Context Engineering (ZLCE)**.

ATURAN KETAT:
1. JANGAN mengubah atau menghapus satu baris kode produksi pun saat ini! Ini adalah fase READ-ONLY AUDIT.
2. Tugas Anda saat ini adalah menginspeksi codebase dan menghasilkan 3 dokumen kendali ZLCE:
   - \`CODEBASE_SNAPSHOT.md\`: Ringkasan modul, file tree aktual, tech stack di package.json, skema database saat ini, dan API routes yang aktif.
   - \`SESSION_STATE.md\`: Dokumen state ZLCE awal yang menandai seluruh fitur yang sudah stabil sebagai status [DONE] dengan bukti verifikasinya, dan mencatat batasan sistem yang ada.
   - \`REVISION_TRIAGE.md\`: Dokumen triase untuk mengevaluasi permintaan perubahan baru (Klasifikasi S, M, L).
3. Setelah ketiga file markdown tersebut Anda tulis, BERHENTI dan berikan ringkasan temuan audit kepada saya untuk ditinjau.

Mulai inspeksi codebase sekarang dan laporkan struktur awal.`;

const FEATURE_REQUEST_PROMPT = `Kita akan menambahkan fitur baru ke dalam proyek existing ini:
Permintaan Fitur: [Tuliskan fitur yang diminta, misal: "Integrasi Payment Gateway Midtrans & Sistem Kupon Diskon Sewa Motor"]

Instruksi Eksekusi ZLCE:
1. Lakukan Triase Perubahan di \`REVISION_TRIAGE.md\`:
   - Klasifikasikan ukuran perubahan: [S] Perubahan minor / [M] Modul baru tanpa ubah skema / [L] Perubahan skema DB atau core routing.
   - Identifikasi file mana saja yang berpotensi terkena dampak regresi.
2. Daftarkan tugas baru ke \`SESSION_STATE.md\` sebagai TASK baru (misal TASK-010, TASK-011) dengan status PENDING.
3. Perbarui Write-Ahead Log (WAL) untuk task pertama yang akan dikerjakan.
4. Tunjukkan rencana perubahan kepada saya dan tunggu kata "SETUJU" sebelum mengubah file kode.`;

const FORENSIC_COMMANDS = `# 1. Periksa file apa saja yang belum di-commit atau termodifikasi
git status

# 2. Periksa riwayat 5 commit terakhir untuk melacak task terakhir yang selesai
git log -n 5 --oneline

# 3. Jalankan linter atau test untuk memastikan kondisi build saat ini
npm run build || npm test`;

const TAKEOVER_PROMPT = `Halo! Saya melanjutkan pengerjaan proyek ini dengan Anda sebagai AI Agent baru menggunakan metodologi **Zero-Loss Context Engineering (ZLCE)**.

Langkah Transisi yang Wajib Anda Lakukan:
1. Buka dan baca file \`SESSION_STATE.md\` (khususnya tabel Tasks dan bagian Write-Ahead Log / WAL).
2. Periksa \`git status\` dan 3 commit git terakhir untuk memverifikasi apakah kode di repo cocok dengan status di WAL.
3. Identifikasi:
   - Task mana yang terakhir selesai [DONE]?
   - Task mana yang saat ini [IN_PROGRESS] atau siap dikerjakan [READY]?
   - Apa isi field 'Langkah Berikutnya (Eksak)' di WAL?
4. Tuliskan ringkasan status proyek ini dalam 1 paragraf, lalu tanyakan: "Apakah saya dapat melanjutkan eksekusi [TASK-ID] langkah [X]?"
5. JANGAN mengubah kode apapun sebelum saya memberikan konfirmasi persetujuan!`;

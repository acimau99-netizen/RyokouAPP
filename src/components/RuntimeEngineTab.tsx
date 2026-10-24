import React, { useState, useMemo } from 'react';
import { 
  Cpu, 
  Clock, 
  ShieldCheck, 
  Layers, 
  RotateCcw, 
  Play, 
  CheckCircle2, 
  AlertTriangle, 
  Download, 
  Terminal, 
  Database,
  BarChart3,
  FastForward,
  ExternalLink,
  Zap,
  Info,
  Check,
  BookmarkCheck,
  HelpCircle
} from 'lucide-react';
import { TaskLedgerEvent, TokenBudgetPreset } from '../types/zlce';
import { copyText } from '../utils/clipboard';


export const FREE_TIER_PRESETS: TokenBudgetPreset[] = [
  {
    id: 'gemini',
    name: 'Google Gemini (1.5 Flash / Pro)',
    provider: 'Google AI Studio',
    category: 'Token-based',
    freeQuotaDisplay: '≈ 1 Juta token / bulan',
    perRequestLimit: 30000,
    monthlyQuotaTokens: 1000000,
    notes: 'Berlaku untuk Google AI Studio (API gratis). Jika mengaktifkan "Pay-as-you-go", batas per-menit ≈ 30K token. Input + Output dihitung.',
    docsUrl: 'https://ai.google.dev/pricing'
  },
  {
    id: 'claude',
    name: 'Claude (Anthropic) 3.5 Sonnet / Haiku',
    provider: 'Anthropic',
    category: 'Token-based',
    freeQuotaDisplay: '100 K token / bulan',
    perRequestLimit: 100000,
    monthlyQuotaTokens: 100000,
    notes: '100K token/bulan pada paket Free (input + output). Berlaku untuk Claude 3.5 Sonnet dan Claude 3 Haiku.',
    docsUrl: 'https://www.anthropic.com/pricing'
  },
  {
    id: 'warp',
    name: 'Warp (Terminal AI)',
    provider: 'Warp AI',
    category: 'Token-based',
    freeQuotaDisplay: '500 K token / bulan',
    perRequestLimit: 8000,
    monthlyQuotaTokens: 500000,
    notes: '500K token/bulan untuk Warp AI Assistant paket Free. Token dipakai untuk completion dalam terminal.',
    docsUrl: 'https://warp.dev/ai'
  },
  {
    id: 'perplexity',
    name: 'Perplexity AI (v0)',
    provider: 'Perplexity',
    category: 'Token-based',
    freeQuotaDisplay: '10 K token / bulan (credits)',
    perRequestLimit: 2000,
    monthlyQuotaTokens: 10000,
    notes: 'Berdasarkan "credits" akun gratis. Token dipakai untuk prompt query dan jawaban pencarian web.',
    docsUrl: 'https://docs.perplexity.ai/pricing'
  },
  {
    id: 'pieces',
    name: 'Pieces AI (Dev Platform)',
    provider: 'Pieces',
    category: 'Token-based',
    freeQuotaDisplay: '5 K token / bulan',
    perRequestLimit: 4000,
    monthlyQuotaTokens: 5000,
    notes: 'Platform pembantu pengembang; kuota paket gratis dapat berubah sewaktu-waktu.',
    docsUrl: 'https://pieces.ai/pricing'
  },
  {
    id: 'codeium',
    name: 'Codeium (Personal)',
    provider: 'Codeium',
    category: 'Request-based / Unlimited',
    freeQuotaDisplay: 'Unlimited (Personal) / 10 K tkn/hari (API)',
    perRequestLimit: 4000,
    monthlyQuotaTokens: 300000,
    notes: 'Unlimited completions untuk akun pribadi di IDE/editor. Batas 10K token/hari berlaku jika menggunakan API publik.',
    docsUrl: 'https://codeium.com/pricing'
  },
  {
    id: 'phind',
    name: 'Phind (Search & Code)',
    provider: 'Phind',
    category: 'Request-based / Unlimited',
    freeQuotaDisplay: '50 request / hari (≈ 5K-10K tkn/hari)',
    perRequestLimit: 4000,
    monthlyQuotaTokens: 225000,
    notes: '50 request per hari (setara ≈ 5K-10K token tergantung panjang prompt). Tidak ada kuota token terpisah.',
    docsUrl: 'https://www.phind.com/pricing'
  },
  {
    id: 'copilot',
    name: 'GitHub Copilot',
    provider: 'GitHub / OpenAI',
    category: 'Completion / Trial',
    freeQuotaDisplay: '30 hari trial (hingga 20 jam pakai)',
    perRequestLimit: 8000,
    monthlyQuotaTokens: 0,
    notes: 'Model berbasis permintaan completion. Tidak mempublikasikan kuota token karena berbasis per-menit/permintaan.',
    docsUrl: 'https://docs.github.com/copilot'
  }
];

export const RuntimeEngineTab: React.FC = () => {
  // 1. Synthetic Clock State
  const [logicalClock, setLogicalClock] = useState<number>(42);
  const [clockStepHistory, setClockStepHistory] = useState<string[]>([
    'clock: 40 - User meminta implementasi model data',
    'clock: 41 - Agent menulis skema Todo di src/models/todo.py',
    'clock: 42 - Verifikasi pytest dijalankan (1 passed)'
  ]);

  // 2. Guard Engine State (JSON-Schema)
  const [testPayloadText, setTestPayloadText] = useState(`{
  "files": [
    "src/models/todo.py",
    "migrations/001_todos.sql"
  ],
  "commands": [
    "pytest tests/test_migrations.py"
  ]
}`);

  // 3. Task-State Ledger (Event-Sourced Replay Log)
  const [ledgerEvents] = useState<TaskLedgerEvent[]>([
    { id: 'EVT-01', clockTick: 1, taskId: 'TASK-001', type: 'step_done', description: 'Inisialisasi repo & folder struktur', metadata: 'git commit a0f1e2d' },
    { id: 'EVT-02', clockTick: 15, taskId: 'TASK-001', type: 'step_done', description: 'Konfigurasi linters ruff & pytest', metadata: 'evidence pass 1/1' },
    { id: 'EVT-03', clockTick: 28, taskId: 'TASK-002', type: 'step_done', description: 'Model Todo didefinisikan', metadata: 'src/models/todo.py' },
    { id: 'EVT-04', clockTick: 35, taskId: 'TASK-002', type: 'step_progress', description: 'Menulis migrasi up/down tabel todos', metadata: 'migrations/001_todos.sql' },
    { id: 'EVT-05', clockTick: 42, taskId: 'TASK-002', type: 'step_progress', description: 'Eksekusi pytest tests/test_migrations.py', metadata: 'in-flight' }
  ]);
  const [replayIndex, setReplayIndex] = useState<number>(5);

  // 4. Token-Aware Store & Budget State (Free Tier Focused)
  const [selectedService, setSelectedService] = useState<TokenBudgetPreset>(FREE_TIER_PRESETS[0]);
  const [chatTurnCount, setChatTurnCount] = useState<number>(8);
  const [showDocsModal, setShowDocsModal] = useState<boolean>(false);
  const [copiedClockPrompt, setCopiedClockPrompt] = useState(false);

  // Handle Clock Tick
  const handleAdvanceClock = () => {
    const nextTick = logicalClock + 1;
    setLogicalClock(nextTick);
    setClockStepHistory(prev => [
      ...prev,
      `clock: ${nextTick} - Interaksi giliran agen baru tereksekusi secara deterministik`
    ]);
  };

  const handleResetClock = () => {
    setLogicalClock(0);
    setClockStepHistory(['clock: 0 - Clock reset ke tick inisial']);
  };

  // Guard Engine validation
  const guardResult = useMemo(() => {
    try {
      const parsed = JSON.parse(testPayloadText);
      const errors: string[] = [];

      if (!parsed.files || !Array.isArray(parsed.files)) {
        errors.push("Field 'files' wajib berupa array of strings.");
      } else {
        const allowedPattern = /^[\w\-_/.]+\.(py|js|ts|tsx|jsx|md|json|sql|html|css)$/i;
        for (const file of parsed.files) {
          if (!allowedPattern.test(file)) {
            errors.push(`Guard violation: Berkas '${file}' melanggar pola nama berkas yang diizinkan.`);
          }
          if (file.includes('..') || file.startsWith('/etc') || file.startsWith('/root')) {
            errors.push(`Guard violation: Akses direktori terlarang '${file}'.`);
          }
        }
      }

      if (parsed.commands && Array.isArray(parsed.commands)) {
        const dangerousCommands = ['rm -rf /', 'format', 'mkfs', 'dd'];
        for (const cmd of parsed.commands) {
          if (dangerousCommands.some(d => cmd.includes(d))) {
            errors.push(`Guard violation: Perintah berbahaya '${cmd}' diblokir oleh Guard Engine.`);
          }
        }
      }

      return {
        valid: errors.length === 0,
        errors,
        data: parsed
      };
    } catch (e: any) {
      return {
        valid: false,
        errors: [`Syntax JSON tidak valid: ${e.message}`],
        data: null
      };
    }
  }, [testPayloadText]);

  // Token computation simulation relative to Selected Free-Tier Service
  const tokenBreakdown = useMemo(() => {
    const systemDirectiveTokens = 850;
    const tier0Tokens = 1200; // SESSION_STATE + active task pinned
    const avgTokensPerTurn = 320;
    const rawHistoryTokens = chatTurnCount * avgTokensPerTurn;
    const totalRaw = systemDirectiveTokens + tier0Tokens + rawHistoryTokens;

    // Budget limit is the per-request limit of the selected free tier service
    const maxRequestLimit = selectedService.perRequestLimit;

    // Predictive pruning logic:
    // If totalRaw > maxRequestLimit, prune oldest non-essential turns
    const budgetExcess = Math.max(0, totalRaw - maxRequestLimit);
    const turnsToPrune = Math.ceil(budgetExcess / avgTokensPerTurn);
    const prunedHistoryTokens = Math.max(0, rawHistoryTokens - (turnsToPrune * avgTokensPerTurn));
    const finalActiveTokens = systemDirectiveTokens + tier0Tokens + prunedHistoryTokens;

    const percentOfRequestLimit = Math.min(100, Math.round((finalActiveTokens / maxRequestLimit) * 100));

    // Monthly quota estimation (assuming 15 runs per month)
    const estimatedMonthlyTokensUsed = finalActiveTokens * 15;
    const monthlyPercent = selectedService.monthlyQuotaTokens > 0 
      ? Math.min(100, Math.round((estimatedMonthlyTokensUsed / selectedService.monthlyQuotaTokens) * 100))
      : 0;

    return {
      systemDirectiveTokens,
      tier0Tokens,
      rawHistoryTokens,
      totalRaw,
      turnsToPrune,
      finalActiveTokens,
      isPruned: turnsToPrune > 0,
      percentOfRequestLimit,
      estimatedMonthlyTokensUsed,
      monthlyPercent
    };
  }, [chatTurnCount, selectedService]);

  const handleExportLedger = () => {
    const jsonlContent = ledgerEvents.map(e => JSON.stringify(e)).join('\n');
    const element = document.createElement('a');
    const file = new Blob([jsonlContent], { type: 'application/x-jsonlines' });
    element.href = URL.createObjectURL(file);
    element.download = 'task_events.jsonl';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const handleCopyClockDirective = async () => {
    const dir = `[clock:${logicalClock}] You are a deterministic AI assistant. Never invent files, commands, or time intervals that are not in the project schema. Current logical tick: ${logicalClock}.`;
    const success = await copyText(dir);
    if (success) {
      setCopiedClockPrompt(true);
      setTimeout(() => setCopiedClockPrompt(false), 2000);
    }
  };

  return (
    <div className="space-y-6">
      {/* Overview Top Bar */}
      <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Cpu className="w-5 h-5 text-cyan-400" />
            ZLCE Runtime Architecture &amp; Free-Tier Token Engine
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Empat pilar arsitektur ZLCE v3.2.2 dengan pengukur token berbasis kuota Free resmi untuk Gemini, Claude, Warp, Codeium, dan layanan lainnya.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800 text-xs font-mono">
            <Clock className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-slate-400">Logical Clock:</span>
            <span className="text-cyan-300 font-bold">[clock: {logicalClock}]</span>
          </div>

          <button
            onClick={handleAdvanceClock}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-cyan-600 hover:bg-cyan-500 text-white shadow transition"
          >
            <Play className="w-3.5 h-3.5" /> Advance Turn (+1)
          </button>
        </div>
      </div>

      {/* Grid: 4 Core Architectural Tactics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Tactic 1: Synthetic Clock */}
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800">
              PILAR 1
            </span>
            <Clock className="w-4 h-4 text-cyan-400" />
          </div>
          <h3 className="text-xs font-bold text-slate-200">Anti Synthetic-Time Drift</h3>
          <p className="text-[11px] text-slate-400">
            Mengganti tebakan jam real-world dengan <strong>Monotonic Logical Clock</strong>. Diinjeksi ke tiap giliran: <code className="text-cyan-400 font-mono">[clock: {logicalClock}]</code>.
          </p>
        </div>

        {/* Tactic 2: Guard Engine */}
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800">
              PILAR 2
            </span>
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
          </div>
          <h3 className="text-xs font-bold text-slate-200">No Architectural Hallucination</h3>
          <p className="text-[11px] text-slate-400">
            Memvalidasi setiap berkas dan perintah yang diajukan AI terhadap <strong>JSON-Schema proyek</strong> sebelum dieksekusi.
          </p>
        </div>

        {/* Tactic 3: Task-State Ledger */}
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-800">
              PILAR 3
            </span>
            <Database className="w-4 h-4 text-indigo-400" />
          </div>
          <h3 className="text-xs font-bold text-slate-200">Task-State Ledger (Event Sourcing)</h3>
          <p className="text-[11px] text-slate-400">
            Log append-only (<code className="text-indigo-300 font-mono">task_events.jsonl</code>) yang dapat di-replay untuk merekonstruksi status titik mana pun.
          </p>
        </div>

        {/* Tactic 4: Token-Aware Pruning */}
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-800">
              PILAR 4
            </span>
            <BarChart3 className="w-4 h-4 text-amber-400" />
          </div>
          <h3 className="text-xs font-bold text-slate-200">Free-Tier Token Pruning</h3>
          <p className="text-[11px] text-slate-400">
            Memangkas riwayat lama secara prediktif sebelum melebihi <strong>batas per-request paket Free</strong>, sambil mengunci Tier 0.
          </p>
        </div>
      </div>

      {/* SECTION 4: TOKEN BREAKDOWN GAUGE & FREE-TIER QUOTA TABLE (TOP EMPHASIS) */}
      <div className="bg-slate-900 p-5 rounded-xl border border-slate-800 space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-amber-400" />
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                Token Breakdown Gauge &amp; Kuota Paket Free Resmi
              </h3>
              <p className="text-xs text-slate-400">
                Pilih layanan LLM di bawah untuk menyesuaikan pengukur token secara presisi terhadap batas per-request &amp; kuota gratis.
              </p>
            </div>
          </div>

          <button
            onClick={() => setShowDocsModal(!showDocsModal)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
          >
            <BookmarkCheck className="w-3.5 h-3.5 text-cyan-400" />
            {showDocsModal ? 'Tutup Tabel Rangkuman' : 'Lihat Tabel 8 Layanan Lengkap'}
          </button>
        </div>

        {/* Service Selector Chips */}
        <div>
          <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider block mb-2">
            Pilih Layanan LLM (Paket Free):
          </span>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {FREE_TIER_PRESETS.map((p) => {
              const isSelected = selectedService.id === p.id;
              return (
                <button
                  key={p.id}
                  onClick={() => setSelectedService(p)}
                  className={`p-2.5 rounded-lg border text-left transition-all ${
                    isSelected
                      ? 'bg-amber-950/40 border-amber-500 shadow-md shadow-amber-500/10'
                      : 'bg-slate-950/70 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                      {p.category.split('/')[0]}
                    </span>
                    {isSelected && <Check className="w-3.5 h-3.5 text-amber-400" />}
                  </div>
                  <h4 className="text-xs font-bold text-slate-200 mt-1 truncate">{p.name}</h4>
                  <div className="text-[11px] text-amber-300/90 font-mono mt-0.5">
                    {p.freeQuotaDisplay}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Active Selected Service Highlight Card */}
        <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
          <div className="md:col-span-8 space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-bold text-white">{selectedService.name}</span>
              <span className="text-xs px-2 py-0.5 rounded-full font-mono bg-cyan-950 text-cyan-300 border border-cyan-800">
                Kategori: {selectedService.category}
              </span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              <strong className="text-amber-300">Batas Token / Penggunaan Free:</strong> {selectedService.freeQuotaDisplay}
              <br />
              <strong className="text-cyan-300">Batas per-Request (Prompt + Output):</strong> ≤ {selectedService.perRequestLimit.toLocaleString()} token
            </p>
            <div className="text-[11px] text-slate-400 italic">
              Catatan: {selectedService.notes}
            </div>
          </div>

          <div className="md:col-span-4 flex flex-col items-start md:items-end justify-center gap-2 border-t md:border-t-0 md:border-l border-slate-800 pt-3 md:pt-0 md:pl-4">
            <a
              href={selectedService.docsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-cyan-600 hover:bg-cyan-500 text-white shadow transition"
            >
              <span>Dokumentasi Resmi</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
            <span className="text-[10px] text-slate-500 font-mono truncate max-w-full">
              {selectedService.docsUrl.replace('https://', '')}
            </span>
          </div>
        </div>

        {/* Turn Slider Simulator */}
        <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-300 font-medium">
              Simulasi Jumlah Giliran Percakapan Aktif:
            </span>
            <span className="font-mono text-cyan-400 font-bold">{chatTurnCount} turns</span>
          </div>
          <input
            type="range"
            min={1}
            max={60}
            value={chatTurnCount}
            onChange={(e) => setChatTurnCount(parseInt(e.target.value))}
            className="w-full accent-cyan-500 h-2 bg-slate-800 rounded-lg cursor-pointer"
          />
          <div className="flex justify-between text-[10px] text-slate-500 font-mono">
            <span>1 Turn (Inisial)</span>
            <span>20 Turns</span>
            <span>40 Turns</span>
            <span>60 Turns (Sesi Panjang)</span>
          </div>
        </div>

        {/* Token Breakdown Gauge Display */}
        <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs">
            <span className="font-semibold text-slate-200">
              Penggunaan Token per-Request vs Batas Free {selectedService.name}:
            </span>
            <span className="font-mono text-slate-300">
              <strong className="text-cyan-400">{tokenBreakdown.finalActiveTokens.toLocaleString()}</strong> / {selectedService.perRequestLimit.toLocaleString()} token ({tokenBreakdown.percentOfRequestLimit}%)
            </span>
          </div>

          {/* Progress Bar Gauge */}
          <div className="w-full h-4 bg-slate-800 rounded-full overflow-hidden flex shadow-inner">
            <div 
              style={{ width: `${(tokenBreakdown.systemDirectiveTokens / selectedService.perRequestLimit) * 100}%` }} 
              className="bg-indigo-500 h-full transition-all"
              title="System Directive (~850 tokens)"
            />
            <div 
              style={{ width: `${(tokenBreakdown.tier0Tokens / selectedService.perRequestLimit) * 100}%` }} 
              className="bg-emerald-500 h-full transition-all"
              title="Tier 0 (SESSION_STATE PINNED ~1200 tokens)"
            />
            <div 
              style={{ width: `${((tokenBreakdown.finalActiveTokens - tokenBreakdown.systemDirectiveTokens - tokenBreakdown.tier0Tokens) / selectedService.perRequestLimit) * 100}%` }} 
              className="bg-cyan-500 h-full transition-all"
              title="Active History Turns"
            />
          </div>

          {/* Legend and Pruning Alert */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 text-[11px] font-mono pt-1">
            <div className="flex items-center gap-1.5 text-slate-400">
              <span className="w-2.5 h-2.5 rounded bg-indigo-500 shrink-0"></span>
              <span>Directive: ~{tokenBreakdown.systemDirectiveTokens} tkn</span>
            </div>
            <div className="flex items-center gap-1.5 text-slate-400">
              <span className="w-2.5 h-2.5 rounded bg-emerald-500 shrink-0"></span>
              <span>Tier 0 (Pinned): ~{tokenBreakdown.tier0Tokens} tkn</span>
            </div>
            <div className="flex items-center gap-1.5 text-slate-400">
              <span className="w-2.5 h-2.5 rounded bg-cyan-500 shrink-0"></span>
              <span>History Aktif: ~{Math.max(0, tokenBreakdown.finalActiveTokens - tokenBreakdown.systemDirectiveTokens - tokenBreakdown.tier0Tokens)} tkn</span>
            </div>
            <div className="flex items-center gap-1.5">
              {tokenBreakdown.isPruned ? (
                <span className="text-amber-400 font-bold flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" /> {tokenBreakdown.turnsToPrune} turn dipangkas
                </span>
              ) : (
                <span className="text-emerald-400 font-semibold flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Aman dalam kuota request
                </span>
              )}
            </div>
          </div>
        </div>

        {/* 3 Tips to Maximize Free Quota */}
        <div className="p-4 rounded-xl bg-gradient-to-r from-cyan-950/40 via-indigo-950/30 to-slate-900 border border-cyan-800/50 space-y-3">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-cyan-400" />
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">
              Strategi ZLCE untuk Memaksimalkan Kuota Paket Free:
            </h4>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
            <div className="p-3 bg-slate-950/80 rounded-lg border border-slate-800">
              <span className="font-bold text-cyan-300 block mb-1">1. Batch Prompting</span>
              <p className="text-slate-400 text-[11px] leading-relaxed">
                Gabungkan beberapa instruksi sub-task ke dalam satu request (selama tetap di bawah limit per-request) agar overhead token sistem direktif tidak terbuang berulang-ulang.
              </p>
            </div>

            <div className="p-3 bg-slate-950/80 rounded-lg border border-slate-800">
              <span className="font-bold text-emerald-300 block mb-1">2. Prompt / Context Caching</span>
              <p className="text-slate-400 text-[11px] leading-relaxed">
                Gunakan mekanisme caching pada berkas statis (seperti <code>BLUEPRINT.md</code> dan <code>ARCHITECTURE.md</code>) sehingga hanya delta perubahan yang memakan kuota token baru.
              </p>
            </div>

            <div className="p-3 bg-slate-950/80 rounded-lg border border-slate-800">
              <span className="font-bold text-amber-300 block mb-1">3. Tier 0 Pruning &amp; Monitoring</span>
              <p className="text-slate-400 text-[11px] leading-relaxed">
                Kunci <code>SESSION_STATE.md</code> sebagai jangkar kebenaran dan pangkas riwayat obrolan usang secara prediktif sebelum kuota per-request atau limit bulanan terlampaui.
              </p>
            </div>
          </div>
        </div>

        {/* Full 8-Services Comparison Table (Expandable Modal / Panel) */}
        {showDocsModal && (
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3 animate-fade-in">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                Tabel Rangkuman Batas Token &amp; Kuota Penggunaan Paket Free (8 Layanan)
              </h4>
              <button
                onClick={() => setShowDocsModal(false)}
                className="text-xs text-slate-400 hover:text-white font-mono"
              >
                Tutup [x]
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 font-mono text-[11px] bg-slate-900/60">
                    <th className="py-2.5 px-3">Layanan</th>
                    <th className="py-2.5 px-3">Kuota Free</th>
                    <th className="py-2.5 px-3">Batas per-Request</th>
                    <th className="py-2.5 px-3">Catatan Penting</th>
                    <th className="py-2.5 px-3 text-right">Dokumentasi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-sans">
                  {FREE_TIER_PRESETS.map((item) => (
                    <tr 
                      key={item.id} 
                      className={`hover:bg-slate-900/40 transition-colors ${
                        selectedService.id === item.id ? 'bg-cyan-950/20' : ''
                      }`}
                    >
                      <td className="py-2.5 px-3 font-semibold text-slate-200">
                        {item.name}
                        <div className="text-[10px] text-slate-500 font-mono">{item.category}</div>
                      </td>
                      <td className="py-2.5 px-3 font-mono text-amber-300 font-medium">
                        {item.freeQuotaDisplay}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-cyan-300">
                        ≤ {item.perRequestLimit.toLocaleString()} tkn
                      </td>
                      <td className="py-2.5 px-3 text-slate-300 text-[11px] max-w-xs">
                        {item.notes}
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <a
                          href={item.docsUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[11px] text-cyan-400 hover:underline"
                        >
                          <span>Link Resmi</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Interactive Section 1: Synthetic Clock & Guard Engine */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Synthetic Clock Controller */}
        <div className="lg:col-span-6 bg-slate-900 p-5 rounded-xl border border-slate-800 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-cyan-400" />
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                1. Synthetic Clock Controller (Monotonic Logical Clock)
              </h3>
            </div>
            <button
              onClick={handleResetClock}
              className="text-[11px] text-slate-400 hover:text-rose-400 flex items-center gap-1"
            >
              <RotateCcw className="w-3 h-3" /> Reset
            </button>
          </div>

          <div className="p-4 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-between">
            <div>
              <span className="text-[11px] text-slate-400 font-mono">Status Clock Virtual Saat Ini:</span>
              <div className="text-2xl font-mono font-bold text-cyan-400 mt-1">
                [clock: {logicalClock}]
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Model membaca logical time tanpa menebak waktu nyata.
              </p>
            </div>

            <div className="flex flex-col gap-2">
              <button
                onClick={handleAdvanceClock}
                className="px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-mono text-xs font-semibold shadow transition"
              >
                +1 Turn (Bump Clock)
              </button>
              <button
                onClick={handleCopyClockDirective}
                className="px-3 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono text-[11px] border border-slate-700"
              >
                {copiedClockPrompt ? 'Tersalin' : 'Salin Injeksi Prompt'}
              </button>
            </div>
          </div>

          <div>
            <span className="text-xs font-mono text-slate-400 block mb-1">Riwayat Giliran Monotonik:</span>
            <div className="p-3 bg-slate-950 rounded-lg text-xs font-mono text-slate-300 space-y-1 max-h-32 overflow-y-auto border border-slate-800">
              {clockStepHistory.map((step, idx) => (
                <div key={idx} className="flex items-center gap-1.5">
                  <span className="text-cyan-500">•</span>
                  <span>{step}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Guard Engine Tester */}
        <div className="lg:col-span-6 bg-slate-900 p-5 rounded-xl border border-slate-800 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                2. Guard Engine (JSON-Schema Action Validator)
              </h3>
            </div>
            <span className={`text-[11px] font-mono font-bold px-2 py-0.5 rounded ${
              guardResult.valid ? 'bg-emerald-950 text-emerald-300 border border-emerald-700' : 'bg-rose-950 text-rose-300 border border-rose-700'
            }`}>
              {guardResult.valid ? 'GUARD: PASS' : 'GUARD: VIOLATION'}
            </span>
          </div>

          <div className="space-y-2">
            <label className="text-xs text-slate-300 font-medium flex items-center justify-between">
              <span>Uji Respons Agen AI (Payload Usulan File &amp; Perintah):</span>
              <span className="text-[10px] text-slate-500 font-mono">Pola file ketat</span>
            </label>
            <textarea
              value={testPayloadText}
              onChange={(e) => setTestPayloadText(e.target.value)}
              rows={5}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200 font-mono text-xs focus:border-cyan-500 focus:outline-none"
            />
          </div>

          {/* Validation Feedback */}
          {guardResult.valid ? (
            <div className="p-3 rounded-lg bg-emerald-950/20 border border-emerald-800/40 text-xs text-emerald-300 flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span>
                <strong>Semua berkas &amp; perintah valid:</strong> Sesuai skema arsitektur repositori yang diizinkan (tidak ada halusinasi nama berkas liar).
              </span>
            </div>
          ) : (
            <div className="p-3 rounded-lg bg-rose-950/20 border border-rose-800/40 text-xs text-rose-300 space-y-1">
              <div className="flex items-center gap-1.5 font-bold">
                <AlertTriangle className="w-4 h-4 text-rose-400" />
                <span>Pelanggaran Skema Terdeteksi (AI dicegah berhalusinasi):</span>
              </div>
              <ul className="list-disc list-inside text-[11px] space-y-0.5 pl-2">
                {guardResult.errors.map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* Interactive Section 2: Task-State Ledger & Replay */}
      <div className="bg-slate-900 p-5 rounded-xl border border-slate-800 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-indigo-400" />
            <div>
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                3. Task-State Ledger (Event-Sourced Replay Stream)
              </h3>
              <p className="text-[11px] text-slate-400">
                Log append-only <code className="text-cyan-400 font-mono">task_events.jsonl</code>. Setiap langkah dicatat sehingga state dapat direkonstruksi ulang saat restart.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportLedger}
              className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium transition"
            >
              <Download className="w-3.5 h-3.5" /> Unduh .jsonl
            </button>
          </div>
        </div>

        {/* Replay Slider */}
        <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400 font-mono flex items-center gap-1.5">
              <FastForward className="w-3.5 h-3.5 text-cyan-400" />
              Replay State Navigator (Langkah 1 sampai {replayIndex} dari {ledgerEvents.length})
            </span>
            <span className="text-cyan-400 font-mono font-bold">
              Tick: [clock: {ledgerEvents[replayIndex - 1]?.clockTick || 0}]
            </span>
          </div>
          <input
            type="range"
            min={1}
            max={ledgerEvents.length}
            value={replayIndex}
            onChange={(e) => setReplayIndex(parseInt(e.target.value))}
            className="w-full accent-cyan-500 h-2 bg-slate-800 rounded-lg cursor-pointer"
          />
        </div>

        {/* Ledger Event List */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {ledgerEvents.slice(0, replayIndex).map((evt) => {
            const isDone = evt.type === 'step_done';
            return (
              <div
                key={evt.id}
                className={`p-3 rounded-lg border text-xs transition-all ${
                  isDone 
                    ? 'bg-slate-950/80 border-slate-800' 
                    : 'bg-cyan-950/30 border-cyan-700/60 shadow-md'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-mono font-bold text-slate-300">{evt.id}</span>
                  <span className="font-mono text-[10px] text-cyan-400">[clock: {evt.clockTick}]</span>
                </div>
                <div className="flex items-center gap-1.5 mt-1">
                  {isDone ? (
                    <span className="text-emerald-400 font-bold">step ✅</span>
                  ) : (
                    <span className="text-cyan-400 font-bold">step ⏳</span>
                  )}
                  <span className="font-mono text-slate-400 text-[11px]">{evt.taskId}</span>
                </div>
                <p className="text-slate-200 mt-1 font-medium">{evt.description}</p>
                {evt.metadata && (
                  <div className="mt-2 text-[10px] text-slate-500 font-mono truncate">
                    meta: {evt.metadata}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

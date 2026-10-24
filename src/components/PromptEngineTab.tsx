import React, { useState, useMemo } from 'react';
import { 
  Target, 
  CheckSquare, 
  Square, 
  Copy, 
  Check, 
  Download, 
  Sparkles, 
  AlertCircle, 
  CheckCircle2, 
  Code2, 
  FileText, 
  Sliders, 
  RefreshCw,
  Terminal,
  ShieldCheck,
  Zap
} from 'lucide-react';
import { ZeroLossChecklist } from '../types/zlce';
import { copyText } from '../utils/clipboard';


export const PromptEngineTab: React.FC = () => {
  // Builder state
  const [formatType, setFormatType] = useState<'json' | 'key-value' | 'csv'>('json');
  const [outputSchema, setOutputSchema] = useState(`{
  "task_id": "string (format: TASK-XXX)",
  "status": "string (enum: PENDING | READY | IN_PROGRESS | BLOCKED | DONE)",
  "confidence_score": "number (0.0 to 1.0)",
  "execution_output": "string | null",
  "error_message": "string | null"
}`);

  const [verbatimContext, setVerbatimContext] = useState(`[LOG_ENTRY_2026-10-14T10:15:00]
task_ref=TASK-002
module=migrations/001_todos.sql
status_flag=IN_PROGRESS
test_run=pytest tests/test_migrations.py (1 passed in 0.05s)
approval_sig=cassavanza@gmail.com
no_error_reported`);

  const [edgeCaseRules, setEdgeCaseRules] = useState(`1. Jika nilai tidak dapat dihitung atau tidak ada di log, WAJIB keluarkan null (bukan string kosong atau "N/A").
2. Jika ada ambiguitas status, ambil flag pertama yang tercatat.
3. Dilarang menambahkan teks pengantar, markdown wrapper (\`\`\`json), penjelasan, atau komentar.`);

  const [stopToken, setStopToken] = useState('<<<END_ZERO_LOSS_OUTPUT>>>');

  // Interactive Checklist State
  const [checklist, setChecklist] = useState<ZeroLossChecklist>({
    outputFormatFirst: true,
    schemaExplicit: true,
    verbatimContext: true,
    edgeCasesDeclared: true,
    stopTokenPresent: true,
    deterministicParsing: true
  });

  // Output test state
  const [sampleOutput, setSampleOutput] = useState(`{
  "task_id": "TASK-002",
  "status": "IN_PROGRESS",
  "confidence_score": 0.98,
  "execution_output": "pytest tests/test_migrations.py (1 passed in 0.05s)",
  "error_message": null
}
<<<END_ZERO_LOSS_OUTPUT>>>`);

  const [copiedPrompt, setCopiedPrompt] = useState(false);
  const [copiedCleanOutput, setCopiedCleanOutput] = useState(false);

  // Calculate Fidelity Score
  const checklistScore = useMemo(() => {
    let count = 0;
    if (checklist.outputFormatFirst) count++;
    if (checklist.schemaExplicit) count++;
    if (checklist.verbatimContext) count++;
    if (checklist.edgeCasesDeclared) count++;
    if (checklist.stopTokenPresent) count++;
    if (checklist.deterministicParsing) count++;
    return Math.round((count / 6) * 100);
  }, [checklist]);

  // Assembled Zero-Loss Prompt (Schema BEFORE Data)
  const assembledPrompt = useMemo(() => {
    return `# ZERO-LOSS DIRECTIVE
Role: Deterministic Execution Engine.
Constraint: Your output must map 1-to-1 to the exact schema specified below with zero post-processing required. Do not output conversational text or markdown code fences.

---

## 1. EXACT OUTPUT SCHEMA (MANDATORY FORMAT)
Output must be valid ${formatType.toUpperCase()} strictly adhering to this definition:
${outputSchema}

---

## 2. EDGE-CASE & GUARD-RAIL RULES
${edgeCaseRules}

---

## 3. VERBATIM CONTEXT (NO EXTERNAL ASSUMPTIONS)
Use ONLY the factual information contained in this block:
<<<CONTEXT_START>>>
${verbatimContext}
<<<CONTEXT_END>>>

---

## 4. DETERMINISTIC STOP CUE
Append this exact stop token immediately after completing your data:
${stopToken}
`;
  }, [formatType, outputSchema, edgeCaseRules, verbatimContext, stopToken]);

  // Deterministic Output Validation Engine
  const validationReport = useMemo(() => {
    if (!sampleOutput.trim()) {
      return { valid: false, errors: ['Output kosong'], parsedData: null };
    }

    const errors: string[] = [];
    let cleanText = sampleOutput.trim();

    // Check stop token
    if (stopToken && !cleanText.includes(stopToken)) {
      errors.push(`Stop token '${stopToken}' tidak ditemukan di akhir output.`);
    } else if (stopToken) {
      cleanText = cleanText.split(stopToken)[0].trim();
    }

    // Check markdown backtick clutter
    if (cleanText.startsWith('```')) {
      errors.push('Output memuat markdown wrapper (```). Zero-Loss menghendaki output murni tanpa markdown wrapper!');
      cleanText = cleanText.replace(/^```[a-z]*\r?\n?/i, '').replace(/```$/, '').trim();
    }

    let parsedData: any = null;

    if (formatType === 'json') {
      try {
        parsedData = JSON.parse(cleanText);
      } catch (err: any) {
        errors.push(`Gagal melakukan parsing JSON deterministik: ${err.message}`);
      }
    } else if (formatType === 'key-value') {
      const lines = cleanText.split(/\r?\n/).filter(l => l.trim().length > 0);
      const kv: Record<string, string> = {};
      let parseErr = false;
      for (const line of lines) {
        const idx = line.indexOf(':');
        if (idx === -1) {
          errors.push(`Baris "${line}" tidak mematuhi format key: value.`);
          parseErr = true;
        } else {
          const k = line.substring(0, idx).trim();
          const v = line.substring(idx + 1).trim();
          kv[k] = v;
        }
      }
      if (!parseErr) parsedData = kv;
    }

    return {
      valid: errors.length === 0,
      errors,
      parsedData
    };
  }, [sampleOutput, formatType, stopToken]);

  const loadPreset = (presetKey: 'extraction' | 'telemetry' | 'decision') => {
    if (presetKey === 'extraction') {
      setFormatType('json');
      setOutputSchema(`{
  "entity_name": "string",
  "category": "string (enum: infra | backend | frontend)",
  "metrics": {
    "latency_ms": "number",
    "is_healthy": "boolean"
  },
  "tags": "array of strings",
  "incident_notes": "string | null"
}`);
      setVerbatimContext(`Service Alpha (type: backend API) responded in 42ms with HTTP 200. Tags applied: [auth, core]. No errors or alerts detected.`);
      setEdgeCaseRules(`1. Jika incident_notes tidak ditemukan, isi null.
2. Latency wajib berupa angka murni (tanpa satuan "ms").
3. Hanya hasilkan JSON valid tanpa backticks.`);
      setStopToken('<<<END_ZERO_LOSS_OUTPUT>>>');
    } else if (presetKey === 'telemetry') {
      setFormatType('key-value');
      setOutputSchema(`task_id: [TASK-XXX]
status: [PENDING | READY | IN_PROGRESS | BLOCKED | DONE]
evidence_hash: [sha256 hex or none]
timestamp_audit: [YYYY-MM-DD jam: ?]`);
      setVerbatimContext(`Task TASK-001 passed verification on 2026-10-14. Verification SHA256 was 7a9c8b1e4.`);
      setEdgeCaseRules(`1. Tepat 1 baris per key. Format: key: value.
2. Jika timestamp jam tidak diketahui, tulis 'jam: ?'.
3. Tanpa spasi ekstra di awal.`);
      setStopToken('### STOP_STREAM');
    } else if (presetKey === 'decision') {
      setFormatType('json');
      setOutputSchema(`{
  "allow_execution": "boolean",
  "gate_level": "number (1 to 4)",
  "blocking_reason": "string | null",
  "required_actions": "array of strings"
}`);
      setVerbatimContext(`User asks to proceed with Gate 3. Gate 1 is approved. Gate 2 (ARCHITECTURE.md and DATA_MODEL.md) is still pending review.`);
      setEdgeCaseRules(`1. Jika ada gerbang sebelumnya yang belum disetujui, allow_execution WAJIB false.
2. blocking_reason harus menyebutkan gerbang yang tertunda.
3. Dilarang menebak persetujuan yang tidak tercatat.`);
      setStopToken('<<<END_DECISION>>>');
    }
  };

  const handleCopyPrompt = async () => {
    const success = await copyText(assembledPrompt);
    if (success) {
      setCopiedPrompt(true);
      setTimeout(() => setCopiedPrompt(false), 2000);
    }
  };

  const handleCopyCleanOutput = async () => {
    if (validationReport.parsedData) {
      const success = await copyText(JSON.stringify(validationReport.parsedData, null, 2));
      if (success) {
        setCopiedCleanOutput(true);
        setTimeout(() => setCopiedCleanOutput(false), 2000);
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Target className="w-5 h-5 text-cyan-400" />
            Zero-Loss Prompt Studio &amp; Deterministic Output Parser
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Implementasi prinsip Zero-Loss Context Engineering: pemetaan 1-ke-1, skema mendahului data, aturan edge-case eksplisit, stop token, dan verifikasi deterministik tanpa post-processing.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1 bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800 text-xs font-mono">
            <span className="text-slate-400">Skor Kepatuhan:</span>
            <span className={`font-bold ${checklistScore === 100 ? 'text-emerald-400' : 'text-amber-400'}`}>
              {checklistScore}%
            </span>
            <span className="text-slate-600">({checklistScore === 100 ? 'Zero-Loss Terjamin' : 'Perlu Dilengkapi'})</span>
          </div>

          <button
            onClick={handleCopyPrompt}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-cyan-600 hover:bg-cyan-500 text-white shadow transition"
          >
            {copiedPrompt ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
            {copiedPrompt ? 'Tersalin!' : 'Salin Prompt Zero-Loss'}
          </button>
        </div>
      </div>

      {/* 6-Point Zero-Loss Checklist Card */}
      <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-cyan-400" />
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">
              Daftar Periksa Cepat Zero-Loss (The 6-Point Quick Checklist)
            </h3>
          </div>
          <span className="text-xs text-slate-400 font-mono">
            Memastikan LLM tidak berhalusinasi atau melakukan guess-work
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 text-xs">
          <label 
            onClick={() => setChecklist((prev: ZeroLossChecklist) => ({ ...prev, outputFormatFirst: !prev.outputFormatFirst }))}
            className="flex items-start gap-2 p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/80 cursor-pointer hover:border-slate-700 transition"
          >
            {checklist.outputFormatFirst ? (
              <CheckSquare className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
            ) : (
              <Square className="w-4 h-4 text-slate-600 shrink-0 mt-0.5" />
            )}
            <div>
              <span className="font-semibold text-slate-200">1. Skema Dideklarasikan di Awal</span>
              <p className="text-[11px] text-slate-400 mt-0.5">Format keluaran ditaruh sebelum data agar model melihat strukturnya dahulu.</p>
            </div>
          </label>

          <label 
            onClick={() => setChecklist((prev: ZeroLossChecklist) => ({ ...prev, schemaExplicit: !prev.schemaExplicit }))}
            className="flex items-start gap-2 p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/80 cursor-pointer hover:border-slate-700 transition"
          >
            {checklist.schemaExplicit ? (
              <CheckSquare className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
            ) : (
              <Square className="w-4 h-4 text-slate-600 shrink-0 mt-0.5" />
            )}
            <div>
              <span className="font-semibold text-slate-200">2. Skema &amp; Tipe Eksplisit</span>
              <p className="text-[11px] text-slate-400 mt-0.5">Nama field, tipe data (number, string, boolean), dan opsi wajib/opsional jelas.</p>
            </div>
          </label>

          <label 
            onClick={() => setChecklist((prev: ZeroLossChecklist) => ({ ...prev, verbatimContext: !prev.verbatimContext }))}
            className="flex items-start gap-2 p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/80 cursor-pointer hover:border-slate-700 transition"
          >
            {checklist.verbatimContext ? (
              <CheckSquare className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
            ) : (
              <Square className="w-4 h-4 text-slate-600 shrink-0 mt-0.5" />
            )}
            <div>
              <span className="font-semibold text-slate-200">3. Konteks Tertutup (Verbatim)</span>
              <p className="text-[11px] text-slate-400 mt-0.5">Semua fakta bersumber langsung dari teks tanpa mengandalkan asumsi dunia luar.</p>
            </div>
          </label>

          <label 
            onClick={() => setChecklist((prev: ZeroLossChecklist) => ({ ...prev, edgeCasesDeclared: !prev.edgeCasesDeclared }))}
            className="flex items-start gap-2 p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/80 cursor-pointer hover:border-slate-700 transition"
          >
            {checklist.edgeCasesDeclared ? (
              <CheckSquare className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
            ) : (
              <Square className="w-4 h-4 text-slate-600 shrink-0 mt-0.5" />
            )}
            <div>
              <span className="font-semibold text-slate-200">4. Aturan Kasus Batas (Edge Cases)</span>
              <p className="text-[11px] text-slate-400 mt-0.5">Instruksi jika data tidak ada (output null) atau jika terjadi duplikasi/ambiguitas.</p>
            </div>
          </label>

          <label 
            onClick={() => setChecklist((prev: ZeroLossChecklist) => ({ ...prev, stopTokenPresent: !prev.stopTokenPresent }))}
            className="flex items-start gap-2 p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/80 cursor-pointer hover:border-slate-700 transition"
          >
            {checklist.stopTokenPresent ? (
              <CheckSquare className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
            ) : (
              <Square className="w-4 h-4 text-slate-600 shrink-0 mt-0.5" />
            )}
            <div>
              <span className="font-semibold text-slate-200">5. Stop Token Deterministik</span>
              <p className="text-[11px] text-slate-400 mt-0.5">Penanda akhir yang jelas agar model tidak meneruskan obrolan sintetis.</p>
            </div>
          </label>

          <label 
            onClick={() => setChecklist((prev: ZeroLossChecklist) => ({ ...prev, deterministicParsing: !prev.deterministicParsing }))}
            className="flex items-start gap-2 p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/80 cursor-pointer hover:border-slate-700 transition"
          >
            {checklist.deterministicParsing ? (
              <CheckSquare className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
            ) : (
              <Square className="w-4 h-4 text-slate-600 shrink-0 mt-0.5" />
            )}
            <div>
              <span className="font-semibold text-slate-200">6. Parser Siap Pakai Langsung</span>
              <p className="text-[11px] text-slate-400 mt-0.5">Hasil dapat dikonsumsi langsung oleh JSON.parse / serializer tanpa regex rumit.</p>
            </div>
          </label>
        </div>
      </div>

      {/* Preset Pickers */}
      <div className="flex items-center gap-2 text-xs flex-wrap">
        <span className="text-slate-400 font-mono">Muat Preset Zero-Loss:</span>
        <button
          onClick={() => loadPreset('extraction')}
          className="px-2.5 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
        >
          JSON Ekstraksi Entitas
        </button>
        <button
          onClick={() => loadPreset('telemetry')}
          className="px-2.5 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
        >
          Telemetri Key:Value
        </button>
        <button
          onClick={() => loadPreset('decision')}
          className="px-2.5 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
        >
          Keputusan Gerbang AI
        </button>
      </div>

      {/* Main Workspace: Builder (Left) vs Tester & Validator (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Side: Prompt Builder Inputs */}
        <div className="lg:col-span-6 bg-slate-900 p-5 rounded-xl border border-slate-800 space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center justify-between border-b border-slate-800 pb-2">
            <span className="flex items-center gap-2">
              <Sliders className="w-4 h-4 text-cyan-400" />
              Penyusun Prompt Zero-Loss
            </span>
            <span className="text-xs font-mono text-cyan-400">1-to-1 Mapping</span>
          </h3>

          <div className="space-y-3 text-xs">
            {/* Format Type */}
            <div className="flex items-center justify-between">
              <label className="text-slate-300 font-medium">1. Tipe Format Output Deterministik</label>
              <div className="flex gap-1">
                {(['json', 'key-value', 'csv'] as const).map(fmt => (
                  <button
                    key={fmt}
                    onClick={() => setFormatType(fmt)}
                    className={`px-2 py-0.5 rounded font-mono text-[11px] uppercase ${
                      formatType === fmt ? 'bg-cyan-600 text-white font-bold' : 'bg-slate-950 text-slate-400'
                    }`}
                  >
                    {fmt}
                  </button>
                ))}
              </div>
            </div>

            {/* Step 1: Output Schema */}
            <div>
              <label className="text-slate-300 font-medium flex items-center justify-between mb-1">
                <span>Skema Output (Dideklarasikan Sebelum Data)</span>
                <span className="text-[10px] text-slate-500 font-mono">Tipe &amp; field ketat</span>
              </label>
              <textarea
                value={outputSchema}
                onChange={(e) => setOutputSchema(e.target.value)}
                rows={5}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200 font-mono text-xs focus:border-cyan-500 focus:outline-none"
              />
            </div>

            {/* Step 2: Edge-case instructions */}
            <div>
              <label className="text-slate-300 font-medium flex items-center justify-between mb-1">
                <span>2. Aturan Kasus Batas &amp; Guardrails (Edge Cases)</span>
                <span className="text-[10px] text-slate-500 font-mono">Explicit null rules</span>
              </label>
              <textarea
                value={edgeCaseRules}
                onChange={(e) => setEdgeCaseRules(e.target.value)}
                rows={3}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200 text-xs focus:border-cyan-500 focus:outline-none"
              />
            </div>

            {/* Step 3: Verbatim Context */}
            <div>
              <label className="text-slate-300 font-medium flex items-center justify-between mb-1">
                <span>3. Konteks Verbatim (Sumber Fakta)</span>
                <span className="text-[10px] text-slate-500 font-mono">Zero implicit inference</span>
              </label>
              <textarea
                value={verbatimContext}
                onChange={(e) => setVerbatimContext(e.target.value)}
                rows={4}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200 font-mono text-xs focus:border-cyan-500 focus:outline-none"
              />
            </div>

            {/* Step 4: Stop Token */}
            <div>
              <label className="text-slate-300 font-medium flex items-center justify-between mb-1">
                <span>4. Stop Token / Penanda Akhir Deterministik</span>
                <span className="text-[10px] text-slate-500 font-mono">Mencegah ocehan berlebih</span>
              </label>
              <input
                type="text"
                value={stopToken}
                onChange={(e) => setStopToken(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-slate-200 font-mono text-xs focus:border-cyan-500 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Right Side: Generated Prompt & Live Deterministic Validator */}
        <div className="lg:col-span-6 space-y-4">
          {/* Assembled Prompt Preview */}
          <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden flex flex-col">
            <div className="px-4 py-2.5 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
              <span className="text-xs font-mono text-slate-300 font-semibold flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-cyan-400" />
                Prompt Zero-Loss Siap Dikirim ke Model
              </span>
              <button
                onClick={handleCopyPrompt}
                className="text-xs px-2.5 py-1 bg-cyan-600 hover:bg-cyan-500 text-white rounded font-medium transition"
              >
                {copiedPrompt ? 'Tersalin' : 'Salin'}
              </button>
            </div>
            <pre className="p-3 bg-slate-950 text-slate-300 font-mono text-[11px] max-h-48 overflow-y-auto whitespace-pre-wrap leading-relaxed border-none">
              {assembledPrompt}
            </pre>
          </div>

          {/* Deterministic Output Validator */}
          <div className="bg-slate-900 rounded-xl border border-slate-800 p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <div className="flex items-center gap-2">
                <Code2 className="w-4 h-4 text-emerald-400" />
                <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                  Penguji Keluaran Deterministik (Output Parser)
                </h4>
              </div>
              <span className={`text-[11px] font-mono px-2 py-0.5 rounded font-bold ${
                validationReport.valid ? 'bg-emerald-950 text-emerald-300 border border-emerald-700' : 'bg-rose-950 text-rose-300 border border-rose-700'
              }`}>
                {validationReport.valid ? 'PARSER: OK (Zero-Loss)' : 'PARSER: GAGAL'}
              </span>
            </div>

            <p className="text-[11px] text-slate-400">
              Tempelkan keluaran mentah dari model AI di bawah untuk menguji apakah output bisa langsung dikonsumsi tanpa post-processing:
            </p>

            <textarea
              value={sampleOutput}
              onChange={(e) => setSampleOutput(e.target.value)}
              rows={5}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200 font-mono text-xs focus:border-cyan-500 focus:outline-none"
              placeholder="Tempel respons mentah dari model di sini..."
            />

            {/* Validation Feedback */}
            {validationReport.errors.length > 0 ? (
              <div className="p-2.5 rounded-lg bg-rose-950/30 border border-rose-800/60 space-y-1 text-xs text-rose-300">
                <div className="font-bold flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" /> Pelanggaran Zero-Loss Terdeteksi:
                </div>
                <ul className="list-disc list-inside space-y-0.5 text-[11px]">
                  {validationReport.errors.map((err, i) => (
                    <li key={i}>{err}</li>
                  ))}
                </ul>
              </div>
            ) : (
              <div className="p-2.5 rounded-lg bg-emerald-950/20 border border-emerald-800/40 text-xs text-emerald-300 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  Keluaran 100% deterministik dan lolos validasi skema tanpa pembersihan string tambahan!
                </span>
                <button
                  onClick={handleCopyCleanOutput}
                  className="px-2 py-1 bg-emerald-800 hover:bg-emerald-700 text-white rounded font-mono text-[10px]"
                >
                  {copiedCleanOutput ? 'Tersalin' : 'Salin Data Parsed'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

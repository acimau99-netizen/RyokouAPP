import React, { useState } from 'react';
import { 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Download, 
  Copy, 
  Check, 
  Play, 
  FileText, 
  ShieldAlert, 
  Filter,
  Layers
} from 'lucide-react';
import { SCENARIOS } from '../data/scenarios';
import { SelfTestScenario } from '../types/zlce';
import { copyText } from '../utils/clipboard';


export const TestHarnessTab: React.FC = () => {
  const [scenariosList, setScenariosList] = useState<SelfTestScenario[]>(SCENARIOS);
  const [selectedId, setSelectedId] = useState<string>('T1');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [copiedPrompt, setCopiedPrompt] = useState(false);
  const [copiedFeedback, setCopiedFeedback] = useState(false);

  // Evaluator & Benchmark Metadata (configurable)
  const [evalDate, setEvalDate] = useState<string>('2026-10-21');
  const [aiModel, setAiModel] = useState<string>('Gemini 3.8 Flash / Claude 3.5 Sonnet');
  const [temperature, setTemperature] = useState<string>('0.2');
  const [runCount, setRunCount] = useState<number>(3);
  const [kitVersion, setKitVersion] = useState<string>('v3.2.2');
  const [isConfigOpen, setIsConfigOpen] = useState<boolean>(false);

  const selectedScenario = scenariosList.find(s => s.id === selectedId) || scenariosList[0];

  const filteredScenarios = scenariosList.filter(s => {
    if (categoryFilter === 'all') return true;
    return s.category === categoryFilter;
  });

  const handleStatusChange = (id: string, status: 'PASS' | 'FAIL' | 'PENDING') => {
    setScenariosList(scenariosList.map(s => s.id === id ? { ...s, status } : s));
  };

  const handleNotesChange = (id: string, notes: string) => {
    setScenariosList(scenariosList.map(s => s.id === id ? { ...s, userNotes: notes } : s));
  };

  const passCount = scenariosList.filter(s => s.status === 'PASS').length;
  const failCount = scenariosList.filter(s => s.status === 'FAIL').length;
  const pendingCount = scenariosList.filter(s => s.status === 'PENDING').length;

  // Generate FEEDBACK.md equivalent of zlce-collect.py with dynamic provenance metadata
  const generateFeedbackReport = () => {
    const passedList = scenariosList.filter(s => s.status === 'PASS').map(s => `- ${s.id}: ${s.title}`).join('\n');
    const failedList = scenariosList.filter(s => s.status === 'FAIL').map(s => `- ${s.id}: ${s.title} (Catatan: ${s.userNotes || 'Tidak memenuhi kriteria'})`).join('\n');

    return `# FEEDBACK EVALUASI ZLCE ${kitVersion} (AI STUDIO BENCHMARK)

Tanggal: ${evalDate}
Model AI: ${aiModel}
Suhu (Temperature): ${temperature}
Jumlah Pengulangan (Run Count): ${runCount} run
Versi Kit: ${kitVersion}
Skor Kepatuhan: ${passCount} / ${scenariosList.length} LULUS (${passCount === scenariosList.length ? '100% Lulus' : `${Math.round((passCount / scenariosList.length) * 100)}% Lulus`})

## Ringkasan Hasil
- Total Butir Uji: ${scenariosList.length}
- Butir LULUS (${passCount}):
${passedList || '- Tidak ada'}

- Butir GAGAL (${failCount}):
${failedList || '- Tidak ada'}

## Rincian Evaluasi per Skenario:
${scenariosList.map(s => `### [${s.id}] ${s.title}
Status: ${s.status}
Kategori: ${s.category}
Catatan Evaluator: ${s.userNotes || '-'}
`).join('\n')}
`;
  };

  const handleCopyFeedback = async () => {
    const success = await copyText(generateFeedbackReport());
    if (success) {
      setCopiedFeedback(true);
      setTimeout(() => setCopiedFeedback(false), 2000);
    }
  };

  const handleDownloadFeedback = () => {
    const element = document.createElement('a');
    const file = new Blob([generateFeedbackReport()], { type: 'text/markdown' });
    element.href = URL.createObjectURL(file);
    element.download = 'FEEDBACK_ZLCE_EVALUASI.md';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  return (
    <div className="space-y-6">
      {/* Overview Scorecard */}
      <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              Verifikasi Pengujian Kit ZLCE ({passCount}/{scenariosList.length} LULUS · {runCount} Run Konsisten)
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Pengujian integritas 4 gerbang, Quality Gate, triase revisi R7, recovery Kasus A-D, uji manual T2, dan Aturan Waktu X1.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800 text-xs font-mono">
              <span className="text-emerald-400 font-bold">{passCount} PASS</span>
              <span className="text-slate-600">•</span>
              <span className="text-rose-400 font-bold">{failCount} FAIL</span>
              <span className="text-slate-600">•</span>
              <span className="text-slate-400">{pendingCount} PENDING</span>
            </div>

            <button
              onClick={() => setIsConfigOpen(!isConfigOpen)}
              className="px-2.5 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700 transition"
              title="Atur metadata benchmark"
            >
              ⚙️ Metadata Uji
            </button>

            <button
              onClick={handleCopyFeedback}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-cyan-600 hover:bg-cyan-500 text-white shadow transition"
            >
              {copiedFeedback ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
              {copiedFeedback ? 'Tersalin' : 'Salin Laporan'}
            </button>

            <button
              onClick={handleDownloadFeedback}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
            >
              <Download className="w-3.5 h-3.5" /> Unduh Laporan
            </button>
          </div>
        </div>

        {/* Metadata Configuration Bar */}
        {isConfigOpen && (
          <div className="pt-3 border-t border-slate-800 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 bg-slate-950/60 p-3 rounded-lg text-xs">
            <div>
              <label className="text-slate-400 block mb-1">Tanggal Uji:</label>
              <input
                type="text"
                value={evalDate}
                onChange={(e) => setEvalDate(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1 text-slate-200"
              />
            </div>
            <div>
              <label className="text-slate-400 block mb-1">Model AI:</label>
              <input
                type="text"
                value={aiModel}
                onChange={(e) => setAiModel(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1 text-slate-200"
              />
            </div>
            <div>
              <label className="text-slate-400 block mb-1">Temperature:</label>
              <input
                type="text"
                value={temperature}
                onChange={(e) => setTemperature(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1 text-slate-200"
              />
            </div>
            <div>
              <label className="text-slate-400 block mb-1">Jumlah Run:</label>
              <input
                type="number"
                min="1"
                max="10"
                value={runCount}
                onChange={(e) => setRunCount(parseInt(e.target.value) || 1)}
                className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1 text-slate-200"
              />
            </div>
            <div>
              <label className="text-slate-400 block mb-1">Versi Kit:</label>
              <input
                type="text"
                value={kitVersion}
                onChange={(e) => setKitVersion(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1 text-slate-200"
              />
            </div>
          </div>
        )}
      </div>

      {/* Main Runner Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Scenario List */}
        <div className="lg:col-span-4 bg-slate-900 rounded-xl border border-slate-800 overflow-hidden flex flex-col">
          <div className="p-3 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
            <span className="text-xs font-mono text-slate-300 font-semibold flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-cyan-400" />
              {scenariosList.length} Skenario Evaluasi
            </span>

            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="text-[11px] bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-300 focus:outline-none"
            >
              <option value="all">Semua Kategori</option>
              <option value="gate">Gerbang Persetujuan</option>
              <option value="verification">Verifikasi &amp; AC</option>
              <option value="triage">Triase Revisi</option>
              <option value="anti-hallucination">Anti-Halusinasi</option>
              <option value="recovery">Recovery Kasus A-D</option>
              <option value="clock-rule">Aturan Jam X1</option>
            </select>
          </div>

          <div className="divide-y divide-slate-800/80 max-h-[560px] overflow-y-auto">
            {filteredScenarios.map((sc) => {
              const isSelected = sc.id === selectedId;

              return (
                <div
                  key={sc.id}
                  onClick={() => setSelectedId(sc.id)}
                  className={`p-3 cursor-pointer transition-colors ${
                    isSelected
                      ? 'bg-cyan-950/40 border-l-4 border-cyan-400'
                      : 'hover:bg-slate-800/40'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-cyan-300">{sc.id}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono font-bold ${
                      sc.status === 'PASS'
                        ? 'bg-emerald-950 text-emerald-300 border border-emerald-700/60'
                        : sc.status === 'FAIL'
                        ? 'bg-rose-950 text-rose-300 border border-rose-700/60'
                        : 'bg-slate-800 text-slate-400'
                    }`}>
                      {sc.status}
                    </span>
                  </div>
                  <h4 className="text-xs font-semibold text-slate-200 mt-1">{sc.title}</h4>
                  <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-1">{sc.description}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Scenario Details & Evaluation Pane */}
        <div className="lg:col-span-8 bg-slate-900 rounded-xl border border-slate-800 p-5 space-y-5">
          <div className="flex items-start justify-between border-b border-slate-800 pb-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-cyan-900/40 text-cyan-300 border border-cyan-700/50">
                  {selectedScenario.id}
                </span>
                <span className="text-xs text-slate-400 font-mono uppercase tracking-wide">
                  Kategori: {selectedScenario.category}
                </span>
              </div>
              <h3 className="text-base font-bold text-white mt-1.5">{selectedScenario.title}</h3>
              <p className="text-xs text-slate-300 mt-1">{selectedScenario.description}</p>
            </div>

            {/* Status toggle */}
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                onClick={() => handleStatusChange(selectedScenario.id, 'PASS')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 ${
                  selectedScenario.status === 'PASS'
                    ? 'bg-emerald-600 text-white shadow'
                    : 'bg-slate-800 text-slate-400 hover:text-emerald-300'
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5" /> LULUS (PASS)
              </button>

              <button
                onClick={() => handleStatusChange(selectedScenario.id, 'FAIL')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 ${
                  selectedScenario.status === 'FAIL'
                    ? 'bg-rose-600 text-white shadow'
                    : 'bg-slate-800 text-slate-400 hover:text-rose-300'
                }`}
              >
                <XCircle className="w-3.5 h-3.5" /> GAGAL (FAIL)
              </button>
            </div>
          </div>

          {/* Test Prompt & Fixture Box */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                <Play className="w-3.5 h-3.5 text-cyan-400" />
                Prompt Uji yang Diberikan ke Model AI:
              </span>
              <button
                onClick={async () => {
                  const success = await copyText(selectedScenario.testPrompt);
                  if (success) {
                    setCopiedPrompt(true);
                    setTimeout(() => setCopiedPrompt(false), 2000);
                  }
                }}
                className="text-[11px] text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
              >
                {copiedPrompt ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                {copiedPrompt ? 'Tersalin' : 'Salin Prompt'}
              </button>
            </div>
            <div className="p-3 bg-slate-950 rounded-lg text-xs text-slate-200 font-mono border border-slate-800">
              {selectedScenario.testPrompt}
            </div>
          </div>

          {/* Evaluation Criteria Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            <div className="p-3 bg-emerald-950/20 rounded-lg border border-emerald-800/40">
              <h4 className="font-bold text-emerald-400 flex items-center gap-1 mb-2">
                <CheckCircle2 className="w-3.5 h-3.5" /> Kriteria LULUS:
              </h4>
              <ul className="space-y-1 text-slate-300 list-disc list-inside">
                {selectedScenario.evaluationCriteria.passConditions.map((cond, idx) => (
                  <li key={idx}>{cond}</li>
                ))}
              </ul>
            </div>

            <div className="p-3 bg-rose-950/20 rounded-lg border border-rose-800/40">
              <h4 className="font-bold text-rose-400 flex items-center gap-1 mb-2">
                <XCircle className="w-3.5 h-3.5" /> Kriteria GAGAL:
              </h4>
              <ul className="space-y-1 text-slate-300 list-disc list-inside">
                {selectedScenario.evaluationCriteria.failConditions.map((cond, idx) => (
                  <li key={idx}>{cond}</li>
                ))}
              </ul>
            </div>
          </div>

          {/* Sample Valid Agent Response */}
          <div>
            <h4 className="text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-cyan-400" />
              Contoh Respons Agen yang Benar &amp; Patuh:
            </h4>
            <pre className="p-3 bg-slate-950 rounded-lg text-xs text-slate-300 font-mono overflow-x-auto border border-slate-800 max-h-40 whitespace-pre-wrap">
              {selectedScenario.sampleAgentResponse}
            </pre>
          </div>

          {/* User Evaluation Notes */}
          <div>
            <label className="text-xs text-slate-400 font-medium block mb-1">
              Catatan Observasi Evaluasi (Opsional):
            </label>
            <input
              type="text"
              placeholder="Contoh: Model berhenti di Gerbang 1 dengan tepat; tidak ada halusinasi."
              value={selectedScenario.userNotes || ''}
              onChange={(e) => handleNotesChange(selectedScenario.id, e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:border-cyan-500 focus:outline-none"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

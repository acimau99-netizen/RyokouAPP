import React, { useState } from 'react';
import { 
  GitFork, 
  CheckCircle2, 
  AlertTriangle, 
  Zap, 
  Layers, 
  FileEdit, 
  Check, 
  Copy,
  HelpCircle
} from 'lucide-react';
import { ParsedSessionState } from '../types/zlce';
import { copyText } from '../utils/clipboard';


interface RevisionTriageTabProps {
  stateData: ParsedSessionState;
}

export const RevisionTriageTab: React.FC<RevisionTriageTabProps> = ({ stateData }) => {
  const [revisionDesc, setRevisionDesc] = useState('Typo pada teks tombol submit di src/components/Form.tsx (baris 45)');
  const [filesCount, setFilesCount] = useState<number>(1);
  const [linesCount, setLinesCount] = useState<number>(2);
  const [affectsSchema, setAffectsSchema] = useState<boolean>(false);
  const [affectsContracts, setAffectsContracts] = useState<boolean>(false);
  const [isDependentOnActiveTask, setIsDependentOnActiveTask] = useState<boolean>(false);
  const [copied, setCopied] = useState(false);

  // Classification Logic per Rule R7
  const isLevelS = filesCount <= 1 && linesCount <= 20 && !affectsSchema && !affectsContracts;
  
  let levelType = 'S';
  let levelLabel = 'Level S (Perubahan Minor)';
  let classificationDetail = '';
  let actionRecommendation = '';
  let commitFormat = '';

  if (isLevelS) {
    levelType = 'S';
    levelLabel = 'Level S (Minor <= 1 berkas, <= 20 baris)';
    classificationDetail = 'Tidak menyentuh skema, kontrak API, dependensi baru, atau Acceptance Criteria.';
    actionRecommendation = 'Eksekusi langsung tanpa menunda task aktif. Jangan ubah status task IN_PROGRESS menjadi BLOCKED.';
    commitFormat = `fix(ui): ${revisionDesc.substring(0, 40)}... [MINOR]`;
  } else if (isDependentOnActiveTask) {
    levelType = 'M-DEP';
    levelLabel = 'Level M/L Dependen (Tergantung Task Aktif)';
    classificationDetail = `Revisi ini memengaruhi atau bergantung pada keluaran task aktif saat ini (${stateData.status.activeTask || 'TASK-002'}).`;
    actionRecommendation = `DILARANG melakukan preemption atau memotong antrean. Ubah Acceptance Criteria pada ${stateData.status.activeTask || 'TASK-002'} (scope change) dan minta persetujuan pengguna.`;
    commitFormat = `wip(scope-change): adaptasi revisi pada ${stateData.status.activeTask || 'TASK-002'}`;
  } else {
    levelType = 'M-INDEP';
    levelLabel = 'Level M/L Independen (Mendesak & Tidak Tergantung)';
    classificationDetail = `Revisi tidak bergantung pada task aktif (${stateData.status.activeTask || 'TASK-002'}), namun berskala cukup besar/kritis.`;
    actionRecommendation = `Jeda task aktif ${stateData.status.activeTask || 'TASK-002'} (ubah status ke BLOCKED), simpan state ke WAL Checkpoint, lalu daftarkan TASK-REV-01 sebagai IN_PROGRESS.`;
    commitFormat = `fix(hotfix): implementasi TASK-REV-01 [TASK-REV-01]`;
  }

  const generatedActionPlan = `=== TRIASE REVISI ZLCE (ATURAN R7) ===
Deskripsi: ${revisionDesc}
Klasifikasi: ${levelLabel}
Detail: ${classificationDetail}

TINDAKAN PROTOKOL:
${actionRecommendation}

Format Commit:
\`${commitFormat}\`
======================================`;

  const handleCopy = async () => {
    const success = await copyText(generatedActionPlan);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <GitFork className="w-5 h-5 text-cyan-400" />
            Triase Revisi & Protokol Interupsi (Aturan R7)
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Mencegah kekacauan status kerja ketika pengguna meminta perubahan di tengah task yang sedang berjalan (IN_PROGRESS).
          </p>
        </div>

        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-cyan-600 hover:bg-cyan-500 text-white shadow transition"
        >
          {copied ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
          {copied ? 'Tersalin' : 'Salin Keputusan Triase'}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Input parameter revisi */}
        <div className="lg:col-span-6 bg-slate-900 p-5 rounded-xl border border-slate-800 space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-2">
            <FileEdit className="w-4 h-4 text-cyan-400" />
            Parameter Permintaan Revisi
          </h3>

          <div className="space-y-3 text-xs">
            <div>
              <label className="text-slate-300 font-medium">Deskripsi Perubahan</label>
              <textarea
                value={revisionDesc}
                onChange={(e) => setRevisionDesc(e.target.value)}
                rows={3}
                className="w-full mt-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:border-cyan-500 focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-slate-300 font-medium">Jumlah Berkas Terdampak</label>
                <input
                  type="number"
                  min={1}
                  value={filesCount}
                  onChange={(e) => setFilesCount(parseInt(e.target.value) || 1)}
                  className="w-full mt-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-slate-200 focus:border-cyan-500 focus:outline-none font-mono"
                />
                <span className="text-[10px] text-slate-500">Maks. 1 berkas untuk Level S</span>
              </div>

              <div>
                <label className="text-slate-300 font-medium">Estimasi Baris Berubah</label>
                <input
                  type="number"
                  min={1}
                  value={linesCount}
                  onChange={(e) => setLinesCount(parseInt(e.target.value) || 1)}
                  className="w-full mt-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-slate-200 focus:border-cyan-500 focus:outline-none font-mono"
                />
                <span className="text-[10px] text-slate-500">Maks. 20 baris untuk Level S</span>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-800 space-y-2">
              <label className="text-slate-300 font-medium block">Karakteristik Perubahan:</label>
              
              <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={affectsSchema}
                  onChange={(e) => setAffectsSchema(e.target.checked)}
                  className="rounded border-slate-700 bg-slate-950 text-cyan-500 focus:ring-0"
                />
                <span>Mengubah skema database / migrasi data</span>
              </label>

              <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={affectsContracts}
                  onChange={(e) => setAffectsContracts(e.target.checked)}
                  className="rounded border-slate-700 bg-slate-950 text-cyan-500 focus:ring-0"
                />
                <span>Mengubah kontrak API, parameter publik, atau dependensi paket</span>
              </label>

              <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isDependentOnActiveTask}
                  onChange={(e) => setIsDependentOnActiveTask(e.target.checked)}
                  className="rounded border-slate-700 bg-slate-950 text-cyan-500 focus:ring-0"
                />
                <span className="text-cyan-300">
                  Bergantung / memengaruhi task aktif ({stateData.status.activeTask || 'TASK-002'})
                </span>
              </label>
            </div>
          </div>
        </div>

        {/* Right: Decision Output */}
        <div className="lg:col-span-6 space-y-4">
          <div className={`p-5 rounded-xl border ${
            levelType === 'S'
              ? 'bg-emerald-950/20 border-emerald-800/50'
              : levelType === 'M-DEP'
              ? 'bg-amber-950/20 border-amber-800/50'
              : 'bg-indigo-950/20 border-indigo-800/50'
          }`}>
            <div className="flex items-center justify-between mb-2">
              <span className={`text-xs font-bold px-2.5 py-1 rounded font-mono ${
                levelType === 'S'
                  ? 'bg-emerald-500 text-slate-950'
                  : levelType === 'M-DEP'
                  ? 'bg-amber-500 text-slate-950'
                  : 'bg-indigo-500 text-white'
              }`}>
                {levelLabel}
              </span>
              <span className="text-xs text-slate-400 font-mono">Aturan R7</span>
            </div>

            <h4 className="text-sm font-bold text-slate-200 mt-2">Keputusan Alur Kerja:</h4>
            <p className="text-xs text-slate-300 mt-1">{actionRecommendation}</p>

            <div className="mt-4 pt-3 border-t border-slate-800 space-y-2 text-xs">
              <div>
                <span className="text-slate-400 block font-mono text-[11px]">Format Commit Resmi:</span>
                <code className="text-cyan-300 bg-slate-950 px-2 py-1 rounded block mt-0.5 font-mono">
                  {commitFormat}
                </code>
              </div>
            </div>
          </div>

          {/* Detailed Decision Plan */}
          <div className="bg-slate-900 rounded-xl border border-slate-800 p-4">
            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Blok Perintah Instruksi untuk AI
            </h4>
            <pre className="bg-slate-950 p-3 rounded-lg text-slate-300 font-mono text-xs whitespace-pre-wrap leading-relaxed border border-slate-800">
              {generatedActionPlan}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import { 
  Terminal, 
  Copy, 
  Check, 
  Download, 
  CheckCircle2, 
  HelpCircle,
  Plus,
  Trash2,
  Play,
  Bike,
  Sparkles,
  RotateCcw
} from 'lucide-react';
import { copyText } from '../utils/clipboard';


export const LandingWizardTab: React.FC = () => {
  const [projectName, setProjectName] = useState('Web Rental Motor');
  const [actionType, setActionType] = useState<'BARU' | 'RESTRUKTURISASI'>('BARU');
  const [mode, setMode] = useState<'FULL' | 'LITE'>('LITE');
  const [domain, setDomain] = useState('Rental Kendaraan / Sewa Motor');
  const [domainProfile, setDomainProfile] = useState<'booking' | 'none'>('booking');
  const [goals, setGoals] = useState('Katalog Armada Motor, Reservasi & Kalender Ketersediaan Real-Time, Verifikasi Dokumen SIM C/KTP, Dashboard Admin');
  const [techStack, setTechStack] = useState('React 19 / Vite / Tailwind CSS / TypeScript / SQLite / Express');
  const [scale, setScale] = useState('Production, Multi-Cabang Rental, Real-time Availability');
  const [fileWriteCap, setFileWriteCap] = useState<'YA' | 'TIDAK'>('YA');
  const [execCap, setExecCap] = useState<'YA' | 'TIDAK'>('YA');
  const [requirements, setRequirements] = useState<string[]>([
    'Katalog armada motor (Matic, Sport, Adventure) dengan status ketersediaan unit dan durasi rental real-time',
    'Sistem pemesanan booking sewa harian/mingguan dengan proteksi anti-double booking (atomic availability lock)',
    'Form verifikasi identitas penyewa online (upload KTP, SIM C) dan konfirmasi jaminan/deposit',
    'Dashboard admin kelola stok unit motor, jadwal serah-terima/pengembalian, dan riwayat servis',
    'Kalkulator tarif otomatis berdasarkan durasi rental, paket helm & jas hujan, serta opsi asuransi'
  ]);
  const [activeGate, setActiveGate] = useState<number>(1);
  const [copied, setCopied] = useState(false);

  const handleAddRequirement = () => {
    setRequirements([...requirements, 'Kebutuhan fungsional baru']);
  };

  const handleUpdateRequirement = (index: number, val: string) => {
    const updated = [...requirements];
    updated[index] = val;
    setRequirements(updated);
  };

  const handleDeleteRequirement = (index: number) => {
    setRequirements(requirements.filter((_, idx) => idx !== index));
  };

  const handleResetToRentalMotor = () => {
    setProjectName('Web Rental Motor');
    setActionType('BARU');
    setMode('LITE');
    setDomain('Rental Kendaraan / Sewa Motor');
    setDomainProfile('booking');
    setGoals('Katalog Armada Motor, Reservasi & Kalender Ketersediaan Real-Time, Verifikasi Dokumen SIM C/KTP, Dashboard Admin');
    setTechStack('React 19 / Vite / Tailwind CSS / TypeScript / SQLite / Express');
    setScale('Production, Multi-Cabang Rental, Real-time Availability');
    setFileWriteCap('YA');
    setExecCap('YA');
    setRequirements([
      'Katalog armada motor (Matic, Sport, Adventure) dengan status ketersediaan unit dan durasi rental real-time',
      'Sistem pemesanan booking sewa harian/mingguan dengan proteksi anti-double booking (atomic availability lock)',
      'Form verifikasi identitas penyewa online (upload KTP, SIM C) dan konfirmasi jaminan/deposit',
      'Dashboard admin kelola stok unit motor, jadwal serah-terima/pengembalian, dan riwayat servis',
      'Kalkulator tarif otomatis berdasarkan durasi rental, paket helm & jas hujan, serta opsi asuransi'
    ]);
  };

  // Generate Master System Directive prompt matching LANDING_PROMPT.md
  const generateDirectivePrompt = () => {
    return `# MASTER SYSTEM DIRECTIVE: PROJECT INITIATION PROTOCOL v3.2.2

Peran: Principal Software Architect & Lead Engineer.
Metodologi: Zero-Loss Context Engineering (ZLCE): berkas kontrol, task atomik, bukti verifikasi, dan titik pemulihan sesi. Tujuan: meminimalkan kehilangan konteks (target, bukan jaminan).

## 1. PARAMETER PROYEK (INPUT PENGGUNA)
- Nama Proyek: ${projectName}
- Aksi: ${actionType}
- MODE: ${mode}
  - FULL: 10 berkas kontrol.
  - LITE: BLUEPRINT.md, TASKS.md, SESSION_STATE.md, HANDOVER.md; aturan global tetap berlaku.
- Domain / Industri: ${domain}
- Profil Domain: ${domainProfile}
- Sasaran: ${goals}
- Tech Stack: ${techStack}
- Skala & Lingkungan: ${scale}
- Kemampuan Tulis Berkas AI: ${fileWriteCap === 'YA' ? 'YA' : 'TIDAK, gunakan Checkpoint Block'}
- Kemampuan Eksekusi AI: ${execCap === 'YA' ? 'YA' : 'TIDAK, pengguna menjalankan perintah'}
- Kebutuhan Inti:
${requirements.map((r, i) => `  ${i + 1}. ${r}`).join('\n')}

---

## 2. ATURAN GLOBAL (SEPANJANG PROYEK)

R1. Sumber Kebenaran Tunggal: status task hanya di SESSION_STATE.md.
R2. Pembacaan Bertingkat: Tier 0 (tiap sesi), Tier 1 (per task), Tier 2 (sisanya).
R3. Anti-Halusinasi: informasi di luar berkas = tidak diketahui. Dilarang mengarang output perintah/hasil test/berkas.
R3a. Penomoran Bersama ASM & Q: satu urutan bersama angka tertinggi + 1, dilarang memakai ulang ID.
R3b. Aturan Jam Anti-Ekstrapolasi: HANYA boleh berasal dari pesan/snapshot. Tanpa jam baru WAJIB 'jam: ?'. DILARANG mengarang jam sintetis (+5/+10m).
R4. Single Task: tepat maksimal 1 task IN_PROGRESS pada satu waktu.
R5. Verifikasi Berbukti: status DONE wajib memiliki bukti uji konkret dan Disetujui: ya.
R6. Sinkronisasi Dokumen: perbarui Docs Impact sebelum task DONE.
R7. Triase Revisi: Level S (eksekusi langsung [MINOR]); Level M/L cek ketergantungan (preempt bila independen, ubah AC bila dependen).
R8. Keamanan: validasi tipe, sanitisasi input, rahasia hanya via .env.
R9. Gaya: teknis murni, ringkas, bullet/tabel, tanpa narasi.
R10. Template Tidak Ada: jangan menebak, gunakan Skeleton Fallback bila template tidak terlampir.
R11. Enum Status Tunggal: PENDING | READY | IN_PROGRESS | BLOCKED | DONE.
R12. Checkpoint & WAL: isi WAL sebelum langkah multi-berkas.
R13. Pemulihan: sesi baru menjalankan prosedur RECOVERY (Kasus A/B/C/D).

---

## 3. FASE 1: DOKUMEN KONTROL BERTAHAP DENGAN GERBANG PERSETUJUAN

Setelah tiap gerbang, BERHENTI dan tunggu persetujuan eksplisit. Jangan membuat berkas gerbang berikutnya sebelum itu.
- Gerbang 1: BLUEPRINT.md
- Gerbang 2: ARCHITECTURE.md, DATA_MODEL.md
- Gerbang 3: TASKS.md, TESTING.md
- Gerbang 4: AI_WORKFLOW.md, CHECKLISTS.md, SESSION_STATE.md, CHANGELOG.md, HANDOVER.md

${mode === 'LITE' ? '(MODE LITE: Gerbang 1, lalu TASKS.md + SESSION_STATE.md + HANDOVER.md).' : ''}
Mulailah sekarang dengan menghasilkan HANYA dokumen pada GERBANG 1 (BLUEPRINT.md), lalu BERHENTI dan minta persetujuan saya.
`;
  };

  const handleCopyPrompt = async () => {
    const success = await copyText(generateDirectivePrompt());
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownloadPrompt = () => {
    const element = document.createElement('a');
    const file = new Blob([generateDirectivePrompt()], { type: 'text/markdown' });
    element.href = URL.createObjectURL(file);
    element.download = `INITIATION_PROMPT_${projectName.replace(/\s+/g, '_')}.md`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const gates = [
    {
      id: 1,
      title: 'Gerbang 1: BLUEPRINT.md',
      docs: ['BLUEPRINT.md'],
      summary: 'Spesifikasi teknis, parameter sistem, batas toleransi SLA, dan batasan teknologi.',
      status: 'Wajib berhenti & konfirmasi pengguna sebelum lanjut'
    },
    {
      id: 2,
      title: 'Gerbang 2: ARCHITECTURE & DATA MODEL',
      docs: ['ARCHITECTURE.md', 'DATA_MODEL.md'],
      summary: 'Pola layer arsitektur, boundary modul, ADR, relasi entitas, dan state machine.',
      status: 'Hanya setelah Gerbang 1 disetujui'
    },
    {
      id: 3,
      title: 'Gerbang 3: TASKS & TESTING',
      docs: ['TASKS.md', 'TESTING.md'],
      summary: 'Backlog task atomik terukur dengan Acceptance Criteria dan matriks pengujian.',
      status: 'Hanya setelah Gerbang 2 disetujui'
    },
    {
      id: 4,
      title: 'Gerbang 4: WORKFLOW & SESSION_STATE',
      docs: ['AI_WORKFLOW.md', 'SESSION_STATE.md', 'CHECKLISTS.md', 'CHANGELOG.md', 'HANDOVER.md'],
      summary: 'Alur kerja AI, single source of truth awal, audit checklists, dan skrip pemulihan.',
      status: 'Gerbang final inisiasi kit ZLCE'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Overview header */}
      <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Terminal className="w-5 h-5 text-cyan-400" />
            Inisiasi Proyek Baru (LANDING_PROMPT.md & Protokol 4 Gerbang)
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Mencegah halusinasi arsitektur dengan memecah pembuatan dokumen kontrol ke dalam 4 gerbang persetujuan eksplisit.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleCopyPrompt}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-cyan-600 hover:bg-cyan-500 text-white shadow transition"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
            {copied ? 'Tersalin!' : 'Salin Master Prompt'}
          </button>
          <button
            onClick={handleDownloadPrompt}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
          >
            <Download className="w-4 h-4" /> Unduh Prompt
          </button>
        </div>
      </div>

      {/* 4-Gate Pipeline Visualizer */}
      <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 space-y-3">
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
          Alur 4 Gerbang Persetujuan (Gate Approval Protocol)
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {gates.map((g) => (
            <div
              key={g.id}
              onClick={() => setActiveGate(g.id)}
              className={`p-3 rounded-lg border cursor-pointer transition-all ${
                activeGate === g.id
                  ? 'bg-cyan-950/40 border-cyan-500 shadow-md shadow-cyan-500/10'
                  : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className={`text-xs font-bold px-2 py-0.5 rounded font-mono ${
                  activeGate === g.id ? 'bg-cyan-500 text-slate-950' : 'bg-slate-800 text-slate-300'
                }`}>
                  GERBANG {g.id}
                </span>
                <CheckCircle2 className={`w-4 h-4 ${activeGate >= g.id ? 'text-cyan-400' : 'text-slate-600'}`} />
              </div>
              <h4 className="font-semibold text-xs text-slate-200 mt-2">{g.title}</h4>
              <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">{g.summary}</p>
              <div className="mt-2 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-cyan-400 font-mono">
                <span>{g.docs.length} berkas</span>
                <span className="text-slate-500">{mode === 'LITE' && (g.id === 2 || g.id === 3) ? 'Digabung di LITE' : 'Aktif'}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Configuration Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Form: Project Parameters */}
        <div className="lg:col-span-6 bg-slate-900 p-5 rounded-xl border border-slate-800 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Play className="w-4 h-4 text-cyan-400" />
              1. Parameter Proyek (Input Anda)
            </h3>
            <button
              type="button"
              onClick={handleResetToRentalMotor}
              className="flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium rounded bg-cyan-950/60 hover:bg-cyan-900/60 text-cyan-300 border border-cyan-800/60 transition"
              title="Reset form ke contoh Web Rental Motor"
            >
              <Bike className="w-3.5 h-3.5 text-cyan-400" />
              <span>Contoh: Web Rental Motor</span>
              <RotateCcw className="w-3 h-3 text-cyan-500 ml-0.5" />
            </button>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <label className="text-slate-300 font-medium">Nama Proyek</label>
              <input
                type="text"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                className="w-full mt-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:border-cyan-500 focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-slate-300 font-medium">Aksi</label>
                <select
                  value={actionType}
                  onChange={(e) => setActionType(e.target.value as 'BARU' | 'RESTRUKTURISASI')}
                  className="w-full mt-1 bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-2 text-slate-200 focus:border-cyan-500 focus:outline-none"
                >
                  <option value="BARU">BARU (Greenfield)</option>
                  <option value="RESTRUKTURISASI">RESTRUKTURISASI (Existing)</option>
                </select>
              </div>

              <div>
                <label className="text-slate-300 font-medium">MODE</label>
                <select
                  value={mode}
                  onChange={(e) => setMode(e.target.value as 'FULL' | 'LITE')}
                  className="w-full mt-1 bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-2 text-slate-200 focus:border-cyan-500 focus:outline-none font-bold text-cyan-400"
                >
                  <option value="LITE">LITE (&lt; 15 tasks, 4 berkas)</option>
                  <option value="FULL">FULL (Enterprise, 10 berkas)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-slate-300 font-medium">Domain / Industri</label>
                <input
                  type="text"
                  value={domain}
                  onChange={(e) => setDomain(e.target.value)}
                  className="w-full mt-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:border-cyan-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-slate-300 font-medium">Profil Domain</label>
                <select
                  value={domainProfile}
                  onChange={(e) => setDomainProfile(e.target.value as 'booking' | 'none')}
                  className="w-full mt-1 bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-2 text-slate-200 focus:border-cyan-500 focus:outline-none"
                >
                  <option value="booking">booking (Reservasi & Booking)</option>
                  <option value="none">none (Standar)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-slate-300 font-medium">Tech Stack</label>
              <input
                type="text"
                value={techStack}
                onChange={(e) => setTechStack(e.target.value)}
                className="w-full mt-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:border-cyan-500 focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-slate-300 font-medium">Kemampuan Tulis AI</label>
                <select
                  value={fileWriteCap}
                  onChange={(e) => setFileWriteCap(e.target.value as 'YA' | 'TIDAK')}
                  className="w-full mt-1 bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-2 text-slate-200 focus:border-cyan-500 focus:outline-none"
                >
                  <option value="YA">YA (Bisa tulis langsung)</option>
                  <option value="TIDAK">TIDAK (Gunakan Checkpoint Block)</option>
                </select>
              </div>

              <div>
                <label className="text-slate-300 font-medium">Kemampuan Eksekusi AI</label>
                <select
                  value={execCap}
                  onChange={(e) => setExecCap(e.target.value as 'YA' | 'TIDAK')}
                  className="w-full mt-1 bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-2 text-slate-200 focus:border-cyan-500 focus:outline-none"
                >
                  <option value="YA">YA (Bisa jalankan terminal)</option>
                  <option value="TIDAK">TIDAK (Pengguna jalan perintah)</option>
                </select>
              </div>
            </div>

            {/* Core requirements builder */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-slate-300 font-medium">Kebutuhan Inti (Requirements)</label>
                <button
                  type="button"
                  onClick={handleAddRequirement}
                  className="text-[11px] text-cyan-400 hover:text-cyan-300 flex items-center gap-1 font-medium"
                >
                  <Plus className="w-3 h-3" /> Tambah Poin
                </button>
              </div>
              <div className="space-y-1.5">
                {requirements.map((req, idx) => (
                  <div key={idx} className="flex items-center gap-1.5">
                    <span className="font-mono text-slate-500 text-xs w-5">{idx + 1}.</span>
                    <input
                      type="text"
                      value={req}
                      onChange={(e) => handleUpdateRequirement(idx, e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1 text-slate-200 text-xs focus:border-cyan-500 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => handleDeleteRequirement(idx)}
                      className="p-1 text-slate-500 hover:text-rose-400 rounded"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right Preview: Generated Prompt Preview */}
        <div className="lg:col-span-6 bg-slate-900 rounded-xl border border-slate-800 flex flex-col overflow-hidden">
          <div className="px-4 py-3 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
            <span className="text-xs font-mono text-slate-300 font-semibold">
              Hasil Prompt Inisiasi Siap Tempel ke Chat AI
            </span>
            <span className="text-[11px] text-emerald-400 font-mono">Format ZLCE v3.2.2</span>
          </div>

          <pre className="flex-1 p-4 bg-slate-950 text-slate-300 font-mono text-xs overflow-y-auto max-h-[520px] whitespace-pre-wrap leading-relaxed">
            {generateDirectivePrompt()}
          </pre>

          <div className="p-3 bg-slate-950/80 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
            <span className="flex items-center gap-1">
              <HelpCircle className="w-3.5 h-3.5 text-slate-500" />
              Tempelkan ke chat baru Google AI Studio / Claude / ChatGPT
            </span>
            <button
              onClick={handleCopyPrompt}
              className="px-3 py-1 bg-cyan-600 hover:bg-cyan-500 text-white rounded font-medium text-xs transition"
            >
              {copied ? 'Tersalin' : 'Salin Semua'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import {
  RyokoDatabase,
  RentalSettings,
} from '../types/ryoko';
import {
  getStorageUsage,
  exportDatabaseJSON,
  importDatabaseJSON,
  resetDatabaseToDefault,
} from '../services/storageService';
import {
  sanitizeTextNoNik,
  containsNikPattern,
} from '../services/bookingEngine';
import {
  Settings,
  Phone,
  Database,
  Download,
  Upload,
  RotateCcw,
  ShieldCheck,
  Smartphone,
  HardDrive,
  CheckCircle,
  AlertTriangle,
  History,
} from 'lucide-react';

interface SettingsViewProps {
  db: RyokoDatabase;
  onUpdateSettings: (settings: RentalSettings) => void;
  onResetDatabase: () => void;
  onImportSuccess: (db: RyokoDatabase) => void;
  onOpenInstallGuide: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  db,
  onUpdateSettings,
  onResetDatabase,
  onImportSuccess,
  onOpenInstallGuide,
}) => {
  const [adminWa, setAdminWa] = useState(db.settings.adminWhatsapp || '6281234567890');
  const [operatorName, setOperatorName] = useState(db.settings.operatorName || 'Operator Ryoko');
  const [namaRental, setNamaRental] = useState(db.settings.namaRental || 'Ryoko Rent Motor Malang & Batu');
  const [poolMalang, setPoolMalang] = useState(db.settings.poolMalangAlamat || '');
  const [poolBatu, setPoolBatu] = useState(db.settings.poolBatuAlamat || '');
  const [saveMsg, setSaveMsg] = useState('');

  // Anti-NIK interactive tester
  const [testNikInput, setTestNikInput] = useState('Contoh NIK KTP: 3573011205980001');

  // Storage usage
  const storageInfo = getStorageUsage();

  const handleSaveOperationalSettings = (e: React.FormEvent) => {
    e.preventDefault();
    const updated: RentalSettings = {
      ...db.settings,
      adminWhatsapp: adminWa.trim(),
      operatorName: operatorName.trim(),
      namaRental: namaRental.trim(),
      poolMalangAlamat: poolMalang.trim(),
      poolBatuAlamat: poolBatu.trim(),
    };
    onUpdateSettings(updated);
    setSaveMsg('Pengaturan operasional berhasil disimpan ke LocalStorage!');
    setTimeout(() => setSaveMsg(''), 4000);
  };

  const handleDownloadBackup = () => {
    const jsonStr = exportDatabaseJSON();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ryokourent_backup_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = ev => {
      const content = ev.target?.result as string;
      const res = importDatabaseJSON(content);
      if (res.success && res.db) {
        onImportSuccess(res.db);
        alert(res.message);
      } else {
        alert(res.message);
      }
    };
    reader.readAsText(file);
  };

  const handleFactoryReset = () => {
    const ok = window.confirm(
      'Apakah Anda yakin ingin mereset seluruh database ke data awal standar Ryoko Rent (16 unit fisik garasi & 6 model)? Data perubahan akan diganti.'
    );
    if (ok) {
      onResetDatabase();
    }
  };

  return (
    <div className="space-y-6 pb-20 max-w-4xl">
      {/* Title */}
      <div>
        <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
          <Settings className="w-5 h-5 text-cyan-400" />
          <span>Pengaturan Sistem & Database Lokal</span>
        </h2>
        <p className="text-xs text-slate-400">
          Kelola kontak WhatsApp admin, alamat pool, kepatuhan UU PDP, dan penyimpanan offline LocalStorage.
        </p>
      </div>

      {saveMsg && (
        <div className="p-3 bg-emerald-950/80 border border-emerald-700/60 rounded-xl text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{saveMsg}</span>
        </div>
      )}

      {/* 1. Pengaturan Operasional & WhatsApp */}
      <form
        onSubmit={handleSaveOperationalSettings}
        className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-4 text-xs"
      >
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <Phone className="w-4 h-4 text-emerald-400" />
          <span>Nomor WhatsApp Admin & Identitas Rental (D-22 & D-23)</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block font-semibold mb-1 text-slate-300">
              Nomor WhatsApp Admin (Penerima Booking & Konfirmasi):
            </label>
            <input
              type="text"
              value={adminWa}
              onChange={e => setAdminWa(e.target.value)}
              placeholder="Contoh: 6281234567890"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono"
              required
            />
            <span className="text-[11px] text-slate-500 block mt-0.5">
              Gunakan format internasional diawali 62 (misal 6281234567890).
            </span>
          </div>

          <div>
            <label className="block font-semibold mb-1 text-slate-300">
              Nama Operator yang Bertugas:
            </label>
            <input
              type="text"
              value={operatorName}
              onChange={e => setOperatorName(e.target.value)}
              placeholder="Misal: Operator Ryoko / Rudi Hartono"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
              required
            />
          </div>
        </div>

        <div>
          <label className="block font-semibold mb-1 text-slate-300">Nama Rental Sepeda Motor:</label>
          <input
            type="text"
            value={namaRental}
            onChange={e => setNamaRental(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-bold"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block font-semibold mb-1 text-slate-300">Alamat Pool Malang (Dinoyo):</label>
            <textarea
              rows={2}
              value={poolMalang}
              onChange={e => setPoolMalang(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white text-xs"
            />
          </div>
          <div>
            <label className="block font-semibold mb-1 text-slate-300">Alamat Pool Batu (Diponegoro):</label>
            <textarea
              rows={2}
              value={poolBatu}
              onChange={e => setPoolBatu(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white text-xs"
            />
          </div>
        </div>

        <div className="flex justify-end pt-1">
          <button
            type="submit"
            className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold transition shadow-md shadow-cyan-950 active:scale-95"
          >
            Simpan Pengaturan Operasional
          </button>
        </div>
      </form>

      {/* 2. Database LocalStorage & Cadangan Data */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-4 text-xs">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <HardDrive className="w-4 h-4 text-cyan-400" />
          <span>Database Penyimpanan Offline LocalStorage</span>
        </h3>

        {/* Quota Gauge */}
        <div className="bg-slate-950 rounded-xl p-3.5 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-slate-300 font-semibold">Penggunaan Memori LocalStorage:</span>
            <span className="font-mono text-cyan-400 font-bold">
              {storageInfo.kb} KB ({storageInfo.percentEstimate}% dari ~5MB)
            </span>
          </div>
          <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-cyan-500 to-emerald-400 rounded-full transition-all"
              style={{ width: `${Math.max(2, storageInfo.percentEstimate)}%` }}
            />
          </div>
          <p className="text-[11px] text-slate-400">
            Database tersimpan 100% lokal di browser / APK Android tanpa perlu koneksi internet untuk mengelola transaksi.
          </p>
        </div>

        {/* Action Buttons: Export, Import, Reset */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <button
            onClick={handleDownloadBackup}
            className="p-3 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-200 text-left transition flex items-center gap-2.5"
          >
            <Download className="w-4 h-4 text-cyan-400 shrink-0" />
            <div>
              <strong className="block text-white">Unduh Cadangan</strong>
              <span className="text-[11px] text-slate-400">Ekspor format file JSON</span>
            </div>
          </button>

          <label className="p-3 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-200 text-left transition flex items-center gap-2.5 cursor-pointer">
            <Upload className="w-4 h-4 text-emerald-400 shrink-0" />
            <div>
              <strong className="block text-white">Pulihkan Data</strong>
              <span className="text-[11px] text-slate-400">Impor dari file JSON</span>
            </div>
            <input type="file" accept=".json" onChange={handleImportFile} className="hidden" />
          </label>

          <button
            onClick={handleFactoryReset}
            className="p-3 rounded-xl bg-red-950/40 hover:bg-red-950/60 border border-red-800/60 text-red-300 text-left transition flex items-center gap-2.5"
          >
            <RotateCcw className="w-4 h-4 text-red-400 shrink-0" />
            <div>
              <strong className="block text-red-200">Reset Pabrik</strong>
              <span className="text-[11px] text-red-300/80">Muat ulang data standar</span>
            </div>
          </button>
        </div>
      </div>

      {/* 3. Uji Kepatuhan Anti-NIK UU PDP No. 27/2022 (D-21) */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-3 text-xs">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>Pengujian Kepatuhan UU PDP No. 27/2022 (Sensor Anti-NIK D-21)</span>
        </h3>
        <p className="text-slate-400">
          Ryoko Rent mematuhi UU Perlindungan Data Pribadi dengan melarang penyimpanan 16 digit NIK. Setiap input 16 angka berurutan disensor otomatis.
        </p>

        <div className="space-y-2 bg-slate-950 p-3.5 rounded-xl border border-slate-800">
          <label className="block text-slate-300 font-semibold">Coba Ketik Teks Mengandung 16 Digit Angka:</label>
          <input
            type="text"
            value={testNikInput}
            onChange={e => setTestNikInput(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono"
          />

          <div className="pt-2 border-t border-slate-800/80">
            <span className="text-slate-400 block text-[11px]">Hasil Sanitasi Sistem Otomatis:</span>
            <p className="font-mono text-cyan-300 font-bold bg-slate-900 p-2 rounded-lg mt-1 break-all">
              {sanitizeTextNoNik(testNikInput)}
            </p>
          </div>
        </div>
      </div>

      {/* 4. Panduan Pemasangan APK Android */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-3 text-xs">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <Smartphone className="w-4 h-4 text-cyan-400" />
          <span>Panduan Pemasangan Aplikasi di HP Android (APK / PWA)</span>
        </h3>
        <p className="text-slate-300 leading-relaxed">
          Aplikasi ini dirancang sebagai <strong>Progressive Web App (PWA) Standalone APK</strong>. Anda dapat menginstalnya langsung di smartphone Android tanpa melalui Google Play Store:
        </p>

        <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-2">
          <ol className="list-decimal pl-4 space-y-1.5 text-slate-300">
            <li>
              Buka aplikasi ini di browser Chrome pada perangkat Android Anda.
            </li>
            <li>
              Klik tombol <strong>&quot;Pasang APK&quot;</strong> di pojok kanan atas, atau buka menu Chrome (titik tiga ⋮) lalu pilih <strong>&quot;Tambahkan ke Layar Utama&quot;</strong> / <strong>&quot;Install App&quot;</strong>.
            </li>
            <li>
              Ikon <strong>RyokoRent</strong> akan muncul di daftar aplikasi Android Anda dan berjalan dalam mode layar penuh (standalone) seperti aplikasi APK native.
            </li>
            <li>
              Semua data booking, armada motor, dan pelacakan tetap tersimpan di memori perangkat secara offline.
            </li>
          </ol>
        </div>

        <button
          onClick={onOpenInstallGuide}
          className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 font-bold transition flex items-center gap-1.5"
        >
          <Smartphone className="w-4 h-4" />
          <span>Buka Modal Instalasi Android</span>
        </button>
      </div>

      {/* 5. Riwayat Audit Log Sistem */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-3 text-xs">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <History className="w-4 h-4 text-cyan-400" />
          <span>Catatan Aktivitas Operasional (Audit Log)</span>
        </h3>

        <div className="bg-slate-950 rounded-xl border border-slate-800 divide-y divide-slate-800/80 max-h-56 overflow-y-auto">
          {db.settings.auditLogs?.map(log => (
            <div key={log.id} className="p-3 text-xs space-y-0.5">
              <div className="flex justify-between items-center text-slate-400">
                <span className="font-semibold text-white">{log.aktivitas}</span>
                <span className="text-[11px] font-mono">{log.waktu}</span>
              </div>
              <p className="text-slate-300 text-[11px]">{log.detail}</p>
              <span className="text-[10px] text-cyan-400">Oleh: {log.user}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

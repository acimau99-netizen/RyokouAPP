import React, { useState, useMemo } from 'react';
import {
  RyokoDatabase,
  ServiceRecord,
  ServiceCategory,
} from '../types/ryoko';
import { formatRupiah } from '../services/bookingEngine';
import {
  Wrench,
  Plus,
  Search,
  Filter,
  Calendar,
  Gauge,
  DollarSign,
  AlertTriangle,
  CheckCircle,
  FileText,
  X,
  Layers,
  Sparkles,
} from 'lucide-react';

interface ServiceLogsViewProps {
  db: RyokoDatabase;
  onAddServiceRecord: (record: Omit<ServiceRecord, 'id' | 'createdAt'>) => void;
}

export const categoryLabels: Record<ServiceCategory, { label: string; icon: string; badge: string }> = {
  oli_mesin: {
    label: 'Ganti Oli Mesin',
    icon: '🛢️',
    badge: 'bg-amber-950/80 border-amber-700/60 text-amber-300',
  },
  oli_gardan: {
    label: 'Ganti Gear Oli (Gardan)',
    icon: '⚙️',
    badge: 'bg-yellow-950/80 border-yellow-700/60 text-yellow-300',
  },
  kampas_rem: {
    label: 'Ganti Kampas Rem',
    icon: '🛑',
    badge: 'bg-red-950/80 border-red-700/60 text-red-300',
  },
  ganti_ban: {
    label: 'Ganti Ban (Depan/Belakang)',
    icon: '🛞',
    badge: 'bg-cyan-950/80 border-cyan-700/60 text-cyan-300',
  },
  cvt_part: {
    label: 'Servis CVT Part (Roller/Belt)',
    icon: '🔧',
    badge: 'bg-blue-950/80 border-blue-700/60 text-blue-300',
  },
  aki_baterai: {
    label: 'Baterai Kering / Aki',
    icon: '🔋',
    badge: 'bg-emerald-950/80 border-emerald-700/60 text-emerald-300',
  },
  kecelakaan: {
    label: 'Servis Kecelakaan / Insiden',
    icon: '⚠️',
    badge: 'bg-purple-950/80 border-purple-700/60 text-purple-300',
  },
};

export const ServiceLogsView: React.FC<ServiceLogsViewProps> = ({
  db,
  onAddServiceRecord,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedUnitId, setSelectedUnitId] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form State
  const [formUnitId, setFormUnitId] = useState<number>(db.units[0]?.id || 101);
  const [formTanggal, setFormTanggal] = useState<string>(new Date().toISOString().slice(0, 10));
  const [formKategori, setFormKategori] = useState<ServiceCategory>('oli_mesin');
  const [formKmMotor, setFormKmMotor] = useState<number>(10000);
  const [formBiaya, setFormBiaya] = useState<number>(65000);
  const [formBengkel, setFormBengkel] = useState<string>('Ahass Dinoyo Motor');
  const [formKeterangan, setFormKeterangan] = useState<string>('Ganti oli mesin berkala');

  // Filter records
  const filteredRecords = useMemo(() => {
    return (db.serviceRecords || []).filter(r => {
      if (selectedCategory !== 'all' && r.kategoriServis !== selectedCategory) {
        return false;
      }
      if (selectedUnitId !== 'all' && r.unitId !== Number(selectedUnitId)) {
        return false;
      }
      if (searchQuery.trim().length > 0) {
        const q = searchQuery.toLowerCase();
        const matchKode = r.kodeUnit.toLowerCase().includes(q);
        const matchBengkel = r.bengkelMekanik.toLowerCase().includes(q);
        const matchKet = r.keterangan.toLowerCase().includes(q);
        if (!matchKode && !matchBengkel && !matchKet) return false;
      }
      return true;
    });
  }, [db.serviceRecords, selectedCategory, selectedUnitId, searchQuery]);

  // Aggregate Metrics
  const totalBiayaServis = useMemo(() => {
    return (db.serviceRecords || []).reduce((sum, r) => sum + (r.biaya || 0), 0);
  }, [db.serviceRecords]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const unit = db.units.find(u => u.id === formUnitId);
    if (!unit) return;

    onAddServiceRecord({
      unitId: unit.id,
      kodeUnit: unit.kodeUnit,
      tanggal: formTanggal,
      kategoriServis: formKategori,
      kmMotor: Number(formKmMotor),
      biaya: Number(formBiaya),
      bengkelMekanik: formBengkel.trim(),
      keterangan: formKeterangan.trim(),
    });

    setIsModalOpen(false);
    // Reset defaults
    setFormKeterangan('Perawatan berkala armada');
  };

  return (
    <div className="space-y-4 pb-20">
      {/* Title & Action Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
            <Wrench className="w-5 h-5 text-amber-400" />
            <span>Panel Catatan Servis Rutin Armada</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono">
              {filteredRecords.length} catatan
            </span>
          </h2>
          <p className="text-xs text-slate-400">
            Pencatatan 7 kategori pemeliharaan berkala (Oli Mesin, Oli Gardan, Kampas Rem, Ban, CVT Part, Aki, Kecelakaan).
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="self-start sm:self-auto px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold text-xs shadow-md shadow-amber-950 flex items-center gap-1.5 transition active:scale-95"
        >
          <Plus className="w-4 h-4 text-slate-950" />
          <span>Tambah Catatan Servis</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3.5 space-y-1">
          <span className="text-xs text-slate-400 font-medium">Total Biaya Servis</span>
          <p className="text-lg sm:text-xl font-black text-amber-400 font-mono">
            {formatRupiah(totalBiayaServis)}
          </p>
          <span className="text-[10px] text-slate-500">Semua Unit Armada</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3.5 space-y-1">
          <span className="text-xs text-slate-400 font-medium">Total Log Pemeliharaan</span>
          <p className="text-lg sm:text-xl font-black text-white font-mono">
            {(db.serviceRecords || []).length}
          </p>
          <span className="text-[10px] text-slate-500">7 Kategori Servis</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3.5 space-y-1">
          <span className="text-xs text-slate-400 font-medium">Servis CVT Terbanyak</span>
          <p className="text-lg sm:text-xl font-black text-blue-400 font-mono">
            {(db.serviceRecords || []).filter(r => r.kategoriServis === 'cvt_part').length}x
          </p>
          <span className="text-[10px] text-slate-500">V-Belt & Roller</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3.5 space-y-1">
          <span className="text-xs text-slate-400 font-medium">Ganti Oli Mesin</span>
          <p className="text-lg sm:text-xl font-black text-emerald-400 font-mono">
            {(db.serviceRecords || []).filter(r => r.kategoriServis === 'oli_mesin').length}x
          </p>
          <span className="text-[10px] text-slate-500">Rutin Tiap 2.000 KM</span>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="space-y-2">
        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs scrollbar-none">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-3 py-1.5 rounded-xl font-medium shrink-0 transition ${
              selectedCategory === 'all'
                ? 'bg-amber-600 text-slate-950 font-bold shadow-sm'
                : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            Semua Kategori ({(db.serviceRecords || []).length})
          </button>
          {(Object.keys(categoryLabels) as ServiceCategory[]).map(catKey => {
            const meta = categoryLabels[catKey];
            const count = (db.serviceRecords || []).filter(r => r.kategoriServis === catKey).length;
            const isActive = selectedCategory === catKey;

            return (
              <button
                key={catKey}
                onClick={() => setSelectedCategory(catKey)}
                className={`px-3 py-1.5 rounded-xl font-medium shrink-0 transition flex items-center gap-1 ${
                  isActive
                    ? 'bg-amber-600 text-slate-950 font-bold shadow-sm'
                    : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                <span>{meta.icon}</span>
                <span>{meta.label}</span>
                <span className="text-[10px] opacity-75">({count})</span>
              </button>
            );
          })}
        </div>

        {/* Dropdowns & Search */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <div>
            <select
              value={selectedUnitId}
              onChange={e => setSelectedUnitId(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
            >
              <option value="all">Semua Unit Armada ({db.units.length} Unit)</option>
              {db.units.map(u => (
                <option key={u.id} value={u.id}>
                  {u.kodeUnit} ({u.nomorPlat})
                </option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-2 relative">
            <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Cari kode unit (SCP-01, NMAX-02), bengkel/mekanik, atau catatan sparepart..."
              className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:border-cyan-500 outline-none"
            />
          </div>
        </div>
      </div>

      {/* Service Record List */}
      {filteredRecords.length === 0 ? (
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-8 text-center text-xs text-slate-400 space-y-1">
          <p className="font-semibold text-slate-200">Belum ada catatan servis yang cocok</p>
          <p>Klik tombol &quot;+ Tambah Catatan Servis&quot; di atas untuk mencatat servis baru.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredRecords.map(record => {
            const catMeta = categoryLabels[record.kategoriServis] || categoryLabels.oli_mesin;
            const unit = db.units.find(u => u.id === record.unitId);
            const motor = db.motors.find(m => m.id === unit?.motorId);

            return (
              <div
                key={record.id}
                className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-sm space-y-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-black text-cyan-400 font-mono">
                      {record.kodeUnit}
                    </span>
                    <span className="text-xs text-slate-400 font-medium">
                      ({unit?.nomorPlat})
                    </span>
                    <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-lg border ${catMeta.badge}`}>
                      {catMeta.icon} {catMeta.label}
                    </span>
                  </div>

                  <span className="text-xs text-slate-400 font-mono flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-slate-500" />
                    <span>{record.tanggal}</span>
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div>
                    <span className="text-slate-500 block text-[11px]">Model & Jarak Tempuh:</span>
                    <strong className="text-white block">{motor?.namaModel || 'Armada'}</strong>
                    <span className="text-cyan-300 font-mono flex items-center gap-1 mt-0.5">
                      <Gauge className="w-3.5 h-3.5" />
                      {record.kmMotor.toLocaleString('id-ID')} KM
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-500 block text-[11px]">Bengkel / Mekanik:</span>
                    <strong className="text-slate-200 block">{record.bengkelMekanik}</strong>
                    <span className="text-slate-400 text-[11px] mt-0.5 block">
                      Dicatat: {record.createdAt}
                    </span>
                  </div>

                  <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                    <span className="text-slate-500 block text-[11px]">Biaya Servis:</span>
                    <strong className="text-amber-400 font-mono text-sm block">
                      {formatRupiah(record.biaya)}
                    </strong>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-800/70 text-xs text-slate-300 bg-slate-950/60 p-2.5 rounded-xl">
                  <span className="text-slate-500 font-semibold text-[11px] block">Rincian & Keterangan Servis:</span>
                  <p className="mt-0.5">{record.keterangan}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Tambah Catatan Servis */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-3 backdrop-blur-xs">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
            <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/70">
              <div className="flex items-center gap-2">
                <Wrench className="w-5 h-5 text-amber-400" />
                <div>
                  <h3 className="text-base font-bold text-white">Input Catatan Servis Rutin</h3>
                  <p className="text-xs text-slate-400">Pencatatan riwayat pemeliharaan armada garasi</p>
                </div>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-3.5 text-xs text-slate-200">
              <div>
                <label className="block font-semibold mb-1 text-slate-300">Pilih Unit Armada Fisik:</label>
                <select
                  value={formUnitId}
                  onChange={e => setFormUnitId(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-semibold"
                >
                  {db.units.map(u => {
                    const m = db.motors.find(item => item.id === u.motorId);
                    return (
                      <option key={u.id} value={u.id}>
                        {u.kodeUnit} ({u.nomorPlat}) — {m?.namaModel}
                      </option>
                    );
                  })}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1 text-slate-300">Tanggal Servis:</label>
                  <input
                    type="date"
                    value={formTanggal}
                    onChange={e => setFormTanggal(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1 text-slate-300">Kilometer (KM) Motor:</label>
                  <input
                    type="number"
                    value={formKmMotor}
                    onChange={e => setFormKmMotor(Number(e.target.value))}
                    placeholder="Contoh: 12500"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold mb-1 text-slate-300">Kategori Servis (7 Pilihan Resmi):</label>
                <select
                  value={formKategori}
                  onChange={e => setFormKategori(e.target.value as ServiceCategory)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-amber-300 font-bold"
                >
                  <option value="oli_mesin">🛢️ Ganti Oli Mesin</option>
                  <option value="oli_gardan">⚙️ Ganti Gear Oli (Gardan)</option>
                  <option value="kampas_rem">🛑 Ganti Kampas Rem (Depan/Belakang)</option>
                  <option value="ganti_ban">🛞 Ganti Ban (Depan/Belakang)</option>
                  <option value="cvt_part">🔧 Servis CVT Part (Roller, V-Belt, Slider)</option>
                  <option value="aki_baterai">🔋 Baterai Kering / Aki</option>
                  <option value="kecelakaan">⚠️ Servis Akibat Kecelakaan / Insiden</option>
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1 text-slate-300">Biaya Servis (Rp):</label>
                  <input
                    type="number"
                    value={formBiaya}
                    onChange={e => setFormBiaya(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-emerald-400 font-bold font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1 text-slate-300">Nama Bengkel / Mekanik:</label>
                  <input
                    type="text"
                    value={formBengkel}
                    onChange={e => setFormBengkel(e.target.value)}
                    placeholder="Misal: Ahass Dinoyo / Mas Rudi"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold mb-1 text-slate-300">Keterangan / Part yang Diganti:</label>
                <textarea
                  rows={2}
                  value={formKeterangan}
                  onChange={e => setFormKeterangan(e.target.value)}
                  placeholder="Misal: Ganti kampas rem depan original Honda, cek angin ban, setel rem belakang"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                  required
                />
              </div>

              <div className="p-4 border-t border-slate-800 bg-slate-950/70 -mx-5 -mb-5 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-400 hover:text-white"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-950 flex items-center gap-1.5 transition active:scale-95"
                >
                  <CheckCircle className="w-4 h-4 text-slate-950" />
                  <span>Simpan Catatan Servis</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

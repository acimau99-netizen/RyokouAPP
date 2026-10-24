import React, { useState, useMemo } from 'react';
import {
  RyokoDatabase,
  UnitTracking,
  UnitPositionStatus,
  PoolLocation,
} from '../types/ryoko';
import {
  Search,
  MapPin,
  Wrench,
  Clock,
  Compass,
  RefreshCw,
  Edit3,
  ExternalLink,
  Phone,
  AlertCircle,
} from 'lucide-react';

interface TrackingViewProps {
  db: RyokoDatabase;
  onOpenUpdateTrackingModal: (track: UnitTracking) => void;
  onSyncArmada: () => void;
  onNavigateToBooking?: (bookingId: number) => void;
}

export const TrackingView: React.FC<TrackingViewProps> = ({
  db,
  onOpenUpdateTrackingModal,
  onSyncArmada,
  onNavigateToBooking,
}) => {
  const [filterPosisi, setFilterPosisi] = useState<string>('all');
  const [filterPool, setFilterPool] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Filter tracking units
  const filteredTracking = useMemo(() => {
    return db.tracking.filter(t => {
      if (filterPosisi !== 'all' && t.statusPosisi !== filterPosisi) {
        return false;
      }
      if (filterPool !== 'all' && t.poolParkir !== filterPool) {
        return false;
      }
      if (searchQuery.trim().length > 0) {
        const q = searchQuery.toLowerCase();
        const matchKode = t.kodeUnit.toLowerCase().includes(q);
        const matchPenyewa = (t.namaPenyewa || '').toLowerCase().includes(q);
        const matchNoBooking = (t.noBooking || '').toLowerCase().includes(q);
        const matchBengkel = (t.namaBengkel || '').toLowerCase().includes(q);
        const matchCatatan = (t.catatan || '').toLowerCase().includes(q);

        const unit = db.units.find(u => u.id === t.unitId);
        const matchPlat = (unit?.nomorPlat || '').toLowerCase().includes(q);

        if (!matchKode && !matchPenyewa && !matchNoBooking && !matchBengkel && !matchCatatan && !matchPlat) {
          return false;
        }
      }
      return true;
    });
  }, [db.tracking, db.units, filterPosisi, filterPool, searchQuery]);

  // Position count metrics
  const countParkir = db.tracking.filter(t => t.statusPosisi === 'parkir').length;
  const countKurir = db.tracking.filter(t => t.statusPosisi === 'kurir').length;
  const countDisewa = db.tracking.filter(t => t.statusPosisi === 'disewa').length;
  const countServis = db.tracking.filter(t => t.statusPosisi === 'servis').length;

  return (
    <div className="space-y-4 pb-20">
      {/* Title & Sync Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
            <Compass className="w-5 h-5 text-cyan-400" />
            <span>Lacak Posisi Armada Real-Time</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono">
              {filteredTracking.length} unit
            </span>
          </h2>
          <p className="text-xs text-slate-400">
            Sistem 1-Baris-1-Unit (D-26 & ASM-03): Pantau posisi Parkir Pool, Dipakai Kurir, Sedang Disewa, atau Servis.
          </p>
        </div>

        <button
          onClick={onSyncArmada}
          className="self-start sm:self-auto px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition active:scale-95"
          title="Pastikan setiap unit fisik di garasi memiliki baris pelacakan aktif"
        >
          <RefreshCw className="w-3.5 h-3.5 text-cyan-400" />
          <span>Sinkronisasi Armada (1-Unit-1-Baris)</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="space-y-2.5">
        {/* Status Posisi Filters */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs scrollbar-none">
          <button
            onClick={() => setFilterPosisi('all')}
            className={`px-3 py-1.5 rounded-xl font-medium shrink-0 transition ${
              filterPosisi === 'all'
                ? 'bg-cyan-600 text-white font-bold shadow-sm'
                : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            Semua Posisi ({db.tracking.length})
          </button>
          <button
            onClick={() => setFilterPosisi('parkir')}
            className={`px-3 py-1.5 rounded-xl font-medium shrink-0 transition ${
              filterPosisi === 'parkir'
                ? 'bg-emerald-600 text-white font-bold shadow-sm'
                : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            🅿️ Parkir di Pool ({countParkir})
          </button>
          <button
            onClick={() => setFilterPosisi('kurir')}
            className={`px-3 py-1.5 rounded-xl font-medium shrink-0 transition ${
              filterPosisi === 'kurir'
                ? 'bg-purple-600 text-white font-bold shadow-sm'
                : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            🚚 Dipakai Kurir ({countKurir})
          </button>
          <button
            onClick={() => setFilterPosisi('disewa')}
            className={`px-3 py-1.5 rounded-xl font-medium shrink-0 transition ${
              filterPosisi === 'disewa'
                ? 'bg-blue-600 text-white font-bold shadow-sm'
                : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            🛵 Sedang Disewa ({countDisewa})
          </button>
          <button
            onClick={() => setFilterPosisi('servis')}
            className={`px-3 py-1.5 rounded-xl font-medium shrink-0 transition ${
              filterPosisi === 'servis'
                ? 'bg-amber-600 text-slate-950 font-bold shadow-sm'
                : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            🔧 Servis Bengkel ({countServis})
          </button>
        </div>

        {/* Pool Selector & Search */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <div>
            <select
              value={filterPool}
              onChange={e => setFilterPool(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:border-cyan-500 outline-none"
            >
              <option value="all">Semua Pool Parkir</option>
              <option value="malang">Pool Malang (Dinoyo - Lowokwaru)</option>
              <option value="batu">Pool Batu (Diponegoro - Sisir)</option>
            </select>
          </div>
          <div className="sm:col-span-2 relative">
            <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Cari kode unit (SCP-01, NMAX-02), nomor plat, penyewa, atau bengkel..."
              className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:border-cyan-500 outline-none"
            />
          </div>
        </div>
      </div>

      {/* Grid of Tracking Units */}
      {filteredTracking.length === 0 ? (
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-8 text-center text-xs text-slate-400 space-y-1">
          <p className="font-semibold text-slate-200">Tidak ada unit yang cocok dengan filter</p>
          <p>Coba pilih opsi filter posisi atau bersihkan kata kunci pencarian.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {filteredTracking.map(track => {
            const unit = db.units.find(u => u.id === track.unitId);
            const motor = db.motors.find(m => m.id === track.motorId);

            const isParkir = track.statusPosisi === 'parkir';
            const isKurir = track.statusPosisi === 'kurir';
            const isDisewa = track.statusPosisi === 'disewa';
            const isServis = track.statusPosisi === 'servis';

            return (
              <div
                key={track.unitId}
                className={`bg-slate-900/90 rounded-2xl p-4 border transition flex flex-col justify-between shadow-sm space-y-3 ${
                  isServis
                    ? 'border-amber-700/60 hover:border-amber-500'
                    : isKurir
                    ? 'border-purple-700/60 hover:border-purple-500'
                    : isDisewa
                    ? 'border-blue-700/60 hover:border-blue-500'
                    : 'border-slate-800 hover:border-emerald-600/60'
                }`}
              >
                {/* Header: Unit Code, Plat, & Position Badge */}
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-base font-black text-cyan-400 font-mono">
                          {track.kodeUnit}
                        </span>
                        <span className="text-xs text-slate-400 font-medium">
                          {unit?.nomorPlat || '-'}
                        </span>
                      </div>
                      <p className="text-xs text-white font-semibold mt-0.5">
                        {motor?.namaModel || 'Model Motor'}
                      </p>
                      <span className="text-[11px] text-slate-500">
                        {unit?.warna} ({unit?.tahun})
                      </span>
                    </div>

                    <span
                      className={`text-[11px] font-bold px-2.5 py-1 rounded-lg shrink-0 ${
                        isServis
                          ? 'bg-amber-950/80 border border-amber-700/70 text-amber-300'
                          : isKurir
                          ? 'bg-purple-950/80 border border-purple-700/70 text-purple-300'
                          : isDisewa
                          ? 'bg-blue-950/80 border border-blue-700/70 text-blue-300'
                          : 'bg-emerald-950/80 border border-emerald-700/70 text-emerald-300'
                      }`}
                    >
                      {isServis ? '🔧 Servis' : isKurir ? '🚚 Kurir' : isDisewa ? '🛵 Disewa' : '🅿️ Parkir'}
                    </span>
                  </div>

                  {/* Body: Location / Kurir / Service / Borrower Detail */}
                  <div className="mt-3 pt-3 border-t border-slate-800/80 space-y-2 text-xs">
                    {isParkir && (
                      <div className="bg-slate-950/80 p-2.5 rounded-xl border border-slate-800/70 space-y-1">
                        <div className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                          <MapPin className="w-3.5 h-3.5 shrink-0" />
                          <span>
                            {track.poolParkir === 'batu' ? 'Pool Batu (Diponegoro)' : 'Pool Malang (Dinoyo)'}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400">
                          {track.poolParkir === 'batu'
                            ? 'Jl. Diponegoro No. 45, Sisir, Kota Batu'
                            : 'Jl. MT Haryono No. 128, Dinoyo, Malang'}
                        </p>
                        {track.catatan && (
                          <p className="text-[11px] text-slate-300 italic">
                            &quot;{track.catatan}&quot;
                          </p>
                        )}
                      </div>
                    )}

                    {isKurir && (
                      <div className="bg-purple-950/30 p-2.5 rounded-xl border border-purple-800/40 space-y-1.5 text-slate-300">
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="text-[10px] text-purple-300 uppercase tracking-wider font-semibold block">
                              Unit Dipegang Kurir
                            </span>
                            <span className="font-bold text-white text-xs">
                              {track.namaKurir || 'Kurir Operasional Ryoko'}
                            </span>
                          </div>
                          {track.noBooking && (
                            <span className="text-[10px] text-purple-300 font-mono font-semibold bg-purple-900/60 px-1.5 py-0.5 rounded">
                              #{track.noBooking}
                            </span>
                          )}
                        </div>
                        {track.namaPenyewa && (
                          <p className="text-[11px] text-slate-300">
                            Tujuan Antar/Jemput: <strong className="text-white">{track.namaPenyewa}</strong>
                          </p>
                        )}
                        {track.catatan && (
                          <p className="text-[11px] text-purple-200/80 italic">
                            &quot;{track.catatan}&quot;
                          </p>
                        )}
                      </div>
                    )}

                    {isDisewa && (
                      <div className="bg-blue-950/30 p-2.5 rounded-xl border border-blue-800/40 space-y-1 text-slate-300">
                        <div className="flex justify-between items-start">
                          <span className="font-bold text-white text-xs">{track.namaPenyewa || 'Penyewa'}</span>
                          <span className="text-[10px] text-blue-300 font-mono font-semibold">
                            #{track.noBooking || '-'}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 text-[11px] text-slate-300">
                          <Clock className="w-3 h-3 text-cyan-400" />
                          <span>Tenggat: <strong className="text-amber-300">{track.tenggatKembali || '-'} WIB</strong></span>
                        </div>
                        {track.catatan && (
                          <p className="text-[11px] text-slate-400 italic">
                            &quot;{track.catatan}&quot;
                          </p>
                        )}
                      </div>
                    )}

                    {isServis && (
                      <div className="bg-amber-950/30 p-2.5 rounded-xl border border-amber-800/40 space-y-1.5 text-slate-300">
                        <div>
                          <strong className="text-white text-xs block">
                            {track.namaBengkel || 'Bengkel Rekanan'}
                          </strong>
                          {track.kontakBengkel && (
                            <span className="text-[11px] text-amber-300 flex items-center gap-1 mt-0.5">
                              <Phone className="w-3 h-3" />
                              {track.kontakBengkel}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-400">
                          Est. Selesai: <span className="text-slate-200 font-medium">{track.estimasiSelesai || 'Segera'}</span>
                        </p>
                        {track.catatan && (
                          <p className="text-[11px] text-amber-200/90 italic">
                            &quot;{track.catatan}&quot;
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Bottom Audit Footer & Quick Update Button */}
                <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500">
                  <span className="truncate">
                    Update: {track.updatedAt || 'Hari Ini'}
                  </span>
                  <button
                    onClick={() => onOpenUpdateTrackingModal(track)}
                    className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium flex items-center gap-1 text-xs transition"
                  >
                    <Edit3 className="w-3 h-3 text-cyan-400" />
                    <span>Ubah Posisi</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

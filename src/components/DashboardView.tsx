import React from 'react';
import {
  RyokoDatabase,
  BookingRecord,
  UnitTracking,
  MotorModel,
  AppUser,
} from '../types/ryoko';
import {
  formatRupiah,
  getPublicStockIndicator,
  calculateOvertimePenalty,
} from '../services/bookingEngine';
import { getUserEffectivePermissions } from '../utils/userPermissions';
import {
  Bike,
  Compass,
  CalendarCheck2,
  AlertTriangle,
  Clock,
  ArrowRight,
  TrendingUp,
  MapPin,
  CheckCircle2,
  PlusCircle,
  RefreshCw,
  Wrench,
  MessageCircle,
  Lock,
} from 'lucide-react';

interface DashboardViewProps {
  db: RyokoDatabase;
  activeUser?: AppUser;
  onNavigateTab: (tab: 'dashboard' | 'bookings' | 'tracking' | 'service' | 'fleet' | 'settings') => void;
  onOpenNewBooking: () => void;
  onSelectBooking: (booking: BookingRecord) => void;
  onSelectTracking: (track: UnitTracking) => void;
  onSyncArmada: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  db,
  activeUser,
  onNavigateTab,
  onOpenNewBooking,
  onSelectBooking,
  onSelectTracking,
  onSyncArmada,
}) => {
  const permissions = getUserEffectivePermissions(activeUser);
  const canViewRevenue = permissions.canViewRevenue;
  // Date filter state for revenue report (Q-01)
  const [revenuePeriod, setRevenuePeriod] = React.useState<'hari_ini' | '7_hari' | 'bulan_ini' | 'kustom'>('bulan_ini');
  const [customStartDate, setCustomStartDate] = React.useState<string>(() => {
    const d = new Date();
    d.setDate(1); // awal bulan ini
    return d.toISOString().split('T')[0];
  });
  const [customEndDate, setCustomEndDate] = React.useState<string>(() => {
    return new Date().toISOString().split('T')[0];
  });

  // Compute Key Operational Metrics
  const totalArmada = db.units.length;
  const unitParkirMalang = db.tracking.filter(t => t.statusPosisi === 'parkir' && t.poolParkir === 'malang').length;
  const unitParkirBatu = db.tracking.filter(t => t.statusPosisi === 'parkir' && t.poolParkir === 'batu').length;
  const unitDipakaiKurir = db.tracking.filter(t => t.statusPosisi === 'kurir').length;
  const unitSedangDisewa = db.tracking.filter(t => t.statusPosisi === 'disewa').length;
  const unitServis = db.tracking.filter(t => t.statusPosisi === 'servis').length;

  const pendingBookings = db.bookings.filter(b => b.status === 'ryokou_booking');
  const approvedBookings = db.bookings.filter(b => b.status === 'ryokou_approved');
  const activeDisewaBookings = db.bookings.filter(b => b.status === 'ryokou_disewa');

  // Filter bookings for Revenue Report (Q-01)
  const currentEpoch = Math.floor(Date.now() / 1000);
  const startOfDayEpoch = Math.floor(new Date().setHours(0, 0, 0, 0) / 1000);
  const sevenDaysAgoEpoch = startOfDayEpoch - 7 * 86400;
  const startOfMonthEpoch = Math.floor(new Date(new Date().getFullYear(), new Date().getMonth(), 1).getTime() / 1000);

  const filteredRevenueBookings = React.useMemo(() => {
    return db.bookings.filter(b => {
      // Hanya transaksi yang telah berjalan / selesai
      if (b.status !== 'ryokou_disewa' && b.status !== 'ryokou_selesai') return false;

      const bookingEpoch = b.startEpoch || startOfDayEpoch;

      if (revenuePeriod === 'hari_ini') {
        return bookingEpoch >= startOfDayEpoch;
      }
      if (revenuePeriod === '7_hari') {
        return bookingEpoch >= sevenDaysAgoEpoch;
      }
      if (revenuePeriod === 'bulan_ini') {
        return bookingEpoch >= startOfMonthEpoch;
      }
      if (revenuePeriod === 'kustom') {
        const start = customStartDate ? Math.floor(new Date(customStartDate + 'T00:00:00').getTime() / 1000) : 0;
        const end = customEndDate ? Math.floor(new Date(customEndDate + 'T23:59:59').getTime() / 1000) : Infinity;
        return bookingEpoch >= start && bookingEpoch <= end;
      }
      return true;
    });
  }, [db.bookings, revenuePeriod, customStartDate, customEndDate, startOfDayEpoch, sevenDaysAgoEpoch, startOfMonthEpoch]);

  const totalOmsetTersaring = filteredRevenueBookings.reduce(
    (sum, b) => sum + (b.totalHargaEstimasi || 0) + (b.dendaNominal || 0),
    0
  );
  const totalDendaTersaring = filteredRevenueBookings.reduce((sum, b) => sum + (b.dendaNominal || 0), 0);

  // Check for any currently rented units that are overdue
  const overdueBookings = activeDisewaBookings.filter(b => {
    const end = b.endEpoch;
    return end && currentEpoch > end;
  });

  return (
    <div className="space-y-4 sm:space-y-6 pb-20">
      {/* Hero Welcome & Quick Stats Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-cyan-950 to-slate-900 border border-cyan-800/40 p-4 sm:p-6 shadow-xl">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-400/30">
                Pusat Kontrol Rental Motor
              </span>
              <span className="text-xs text-slate-400 font-mono">Malang & Batu</span>
            </div>
            <h2 className="text-lg sm:text-2xl font-black text-white tracking-tight">
              {db.settings.namaRental || 'Ryoko Rent Motor'}
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-xl">
              Sistem operasional armada garasi fisik, state machine 4 status, pelacakan unit real-time, dan kalkulasi denda otomatis.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={onOpenNewBooking}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-sky-600 hover:from-cyan-400 hover:to-sky-500 text-slate-950 font-bold text-xs shadow-lg shadow-cyan-950 flex items-center gap-1.5 transition active:scale-95"
            >
              <PlusCircle className="w-4 h-4 text-slate-950" />
              <span>Input Booking Baru</span>
            </button>
            <button
              onClick={onSyncArmada}
              className="px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-medium flex items-center gap-1.5 transition"
              title="Sinkronisasikan seluruh 16 unit fisik garasi ke tabel lacak"
            >
              <RefreshCw className="w-3.5 h-3.5 text-cyan-400" />
              <span>Sync Armada</span>
            </button>
          </div>
        </div>

        {/* Ambient background decoration */}
        <div className="absolute right-0 bottom-0 translate-x-12 translate-y-8 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* Overtime Alerts (D-27) */}
      {overdueBookings.length > 0 && (
        <div className="bg-amber-950/60 border border-amber-600/70 rounded-2xl p-4 text-amber-200 shadow-lg animate-pulse">
          <div className="flex items-center gap-2 font-bold text-sm text-amber-300 mb-1">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
            <span>Peringatan Overtime Kembali ({overdueBookings.length} Unit Telat):</span>
          </div>
          <div className="space-y-1.5 mt-2">
            {overdueBookings.map(b => {
              const motor = db.motors.find(m => m.id === b.motorId) || db.motors[0];
              const penalty = calculateOvertimePenalty(b, motor, currentEpoch);
              return (
                <div
                  key={b.id}
                  onClick={() => onSelectBooking(b)}
                  className="bg-slate-950/80 rounded-xl p-2.5 border border-amber-800/60 flex items-center justify-between text-xs cursor-pointer hover:border-amber-500 transition"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-cyan-300">{b.snapshotKodeUnit}</span>
                    <span className="text-slate-300">· {b.nama}</span>
                    <span className="text-slate-400">({b.noBooking})</span>
                  </div>
                  <div className="text-right">
                    <span className="text-amber-400 font-bold font-mono">{penalty.dendaFormat}</span>
                    <span className="text-[11px] text-slate-400 block">{penalty.menitTelat} menit telat</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Operational KPI Grid (6 Status) */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2.5 sm:gap-3">
        {/* Total Armada */}
        <div
          onClick={() => onNavigateTab('fleet')}
          className="bg-slate-900/90 border border-slate-800 hover:border-cyan-600/60 rounded-2xl p-3 cursor-pointer transition shadow-sm group"
        >
          <div className="flex items-center justify-between text-slate-400 mb-1.5">
            <span className="text-[11px] font-semibold">Total Armada</span>
            <Bike className="w-3.5 h-3.5 text-cyan-400 group-hover:scale-110 transition-transform" />
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-xl sm:text-2xl font-black text-white">{totalArmada}</span>
            <span className="text-[10px] text-slate-400 font-medium">Unit</span>
          </div>
          <p className="text-[10px] text-cyan-400 mt-0.5 truncate">Garasi Fisik</p>
        </div>

        {/* Parkir Pool Malang */}
        <div
          onClick={() => onNavigateTab('tracking')}
          className="bg-slate-900/90 border border-slate-800 hover:border-emerald-600/60 rounded-2xl p-3 cursor-pointer transition shadow-sm group"
        >
          <div className="flex items-center justify-between text-slate-400 mb-1.5">
            <span className="text-[11px] font-semibold">Pool Malang</span>
            <MapPin className="w-3.5 h-3.5 text-emerald-400 group-hover:scale-110 transition-transform" />
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-xl sm:text-2xl font-black text-emerald-400">{unitParkirMalang}</span>
            <span className="text-[10px] text-slate-400 font-medium">Ready</span>
          </div>
          <p className="text-[10px] text-slate-400 mt-0.5 truncate">Dinoyo Lowokwaru</p>
        </div>

        {/* Parkir Pool Batu */}
        <div
          onClick={() => onNavigateTab('tracking')}
          className="bg-slate-900/90 border border-slate-800 hover:border-emerald-600/60 rounded-2xl p-3 cursor-pointer transition shadow-sm group"
        >
          <div className="flex items-center justify-between text-slate-400 mb-1.5">
            <span className="text-[11px] font-semibold">Pool Batu</span>
            <MapPin className="w-3.5 h-3.5 text-emerald-400 group-hover:scale-110 transition-transform" />
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-xl sm:text-2xl font-black text-emerald-400">{unitParkirBatu}</span>
            <span className="text-[10px] text-slate-400 font-medium">Ready</span>
          </div>
          <p className="text-[10px] text-slate-400 mt-0.5 truncate">Diponegoro Sisir</p>
        </div>

        {/* Dipakai Kurir (ASM-03) */}
        <div
          onClick={() => onNavigateTab('tracking')}
          className="bg-slate-900/90 border border-slate-800 hover:border-purple-600/60 rounded-2xl p-3 cursor-pointer transition shadow-sm group"
        >
          <div className="flex items-center justify-between text-slate-400 mb-1.5">
            <span className="text-[11px] font-semibold">Dipakai Kurir</span>
            <span className="text-xs group-hover:scale-110 transition-transform">🚚</span>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-xl sm:text-2xl font-black text-purple-400">{unitDipakaiKurir}</span>
            <span className="text-[10px] text-purple-300 font-medium">Diantar</span>
          </div>
          <p className="text-[10px] text-purple-300 mt-0.5 truncate">Antar/Jemput Tamu</p>
        </div>

        {/* Sedang Disewa */}
        <div
          onClick={() => onNavigateTab('bookings')}
          className="bg-slate-900/90 border border-slate-800 hover:border-blue-600/60 rounded-2xl p-3 cursor-pointer transition shadow-sm group"
        >
          <div className="flex items-center justify-between text-slate-400 mb-1.5">
            <span className="text-[11px] font-semibold">Sedang Disewa</span>
            <Clock className="w-3.5 h-3.5 text-blue-400 group-hover:scale-110 transition-transform" />
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-xl sm:text-2xl font-black text-blue-400">{unitSedangDisewa}</span>
            <span className="text-[10px] text-slate-400 font-medium">Di Jalan</span>
          </div>
          <p className="text-[10px] text-blue-300 mt-0.5 truncate">{activeDisewaBookings.length} Kontrak</p>
        </div>

        {/* Servis Bengkel */}
        <div
          onClick={() => onNavigateTab('service')}
          className="bg-slate-900/90 border border-slate-800 hover:border-amber-600/60 rounded-2xl p-3 cursor-pointer transition shadow-sm group"
        >
          <div className="flex items-center justify-between text-slate-400 mb-1.5">
            <span className="text-[11px] font-semibold">Servis Bengkel</span>
            <Wrench className="w-3.5 h-3.5 text-amber-400 group-hover:scale-110 transition-transform" />
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-xl sm:text-2xl font-black text-amber-400">{unitServis}</span>
            <span className="text-[10px] text-amber-300 font-medium">Perawatan</span>
          </div>
          <p className="text-[10px] text-amber-300 mt-0.5 truncate">Panel Servis (7 Kat)</p>
        </div>
      </div>

      {/* Laporan Omset & Rekapitulasi Finansial (Q-01 Filter Kustom Rentang Tanggal) */}
      {canViewRevenue ? (
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-sm space-y-3.5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2 border-b border-slate-800/80">
            <div>
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm sm:text-base font-bold text-white">
                  Rekapitulasi Omset & Finansial Rental (Q-01)
                </h3>
              </div>
              <p className="text-xs text-slate-400">
                Filter penerimaan sewa dan denda keterlambatan per periode harian, mingguan, atau rentang tanggal kustom bulanan.
              </p>
            </div>

            {/* Period selector buttons */}
            <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs shrink-0 overflow-x-auto">
              <button
                onClick={() => setRevenuePeriod('hari_ini')}
                className={`px-2.5 py-1 rounded-lg font-medium transition ${
                  revenuePeriod === 'hari_ini'
                    ? 'bg-cyan-600 text-white font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Hari Ini
              </button>
              <button
                onClick={() => setRevenuePeriod('7_hari')}
                className={`px-2.5 py-1 rounded-lg font-medium transition ${
                  revenuePeriod === '7_hari'
                    ? 'bg-cyan-600 text-white font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                7 Hari
              </button>
              <button
                onClick={() => setRevenuePeriod('bulan_ini')}
                className={`px-2.5 py-1 rounded-lg font-medium transition ${
                  revenuePeriod === 'bulan_ini'
                    ? 'bg-cyan-600 text-white font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Bulan Ini
              </button>
              <button
                onClick={() => setRevenuePeriod('kustom')}
                className={`px-2.5 py-1 rounded-lg font-medium transition ${
                  revenuePeriod === 'kustom'
                    ? 'bg-cyan-600 text-white font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Kustom Rentang
              </button>
            </div>
          </div>

          {/* Custom Date Range Picker (shown when kustom) */}
          {revenuePeriod === 'kustom' && (
            <div className="bg-slate-950/80 p-3 rounded-xl border border-cyan-800/50 flex flex-wrap items-center gap-3 text-xs">
              <span className="text-cyan-400 font-semibold">Rentang Tanggal Kustom:</span>
              <div className="flex items-center gap-2">
                <label className="text-slate-400">Dari:</label>
                <input
                  type="date"
                  value={customStartDate}
                  onChange={e => setCustomStartDate(e.target.value)}
                  className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-white text-xs outline-none focus:border-cyan-500"
                />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-slate-400">Sampai:</label>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={e => setCustomEndDate(e.target.value)}
                  className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-white text-xs outline-none focus:border-cyan-500"
                />
              </div>
              <span className="text-[11px] text-slate-400">
                Menampilkan {filteredRevenueBookings.length} transaksi di rentang ini.
              </span>
            </div>
          )}

          {/* Revenue KPI Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-3">
              <span className="text-[11px] text-slate-400 block">Total Omset Rental</span>
              <span className="text-xl sm:text-2xl font-black text-emerald-400 font-mono">
                {formatRupiah(totalOmsetTersaring)}
              </span>
              <span className="text-[10px] text-slate-500 block mt-0.5">
                Dari {filteredRevenueBookings.length} transaksi sewa
              </span>
            </div>

            <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-3">
              <span className="text-[11px] text-slate-400 block">Penerimaan Denda Overtime (D-27)</span>
              <span className="text-xl sm:text-2xl font-black text-amber-400 font-mono">
                {formatRupiah(totalDendaTersaring)}
              </span>
              <span className="text-[10px] text-slate-500 block mt-0.5">Kompensasi keterlambatan unit</span>
            </div>

            <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-3">
              <span className="text-[11px] text-slate-400 block">Biaya Servis Garasi (7 Kategori)</span>
              <span className="text-xl sm:text-2xl font-black text-cyan-400 font-mono">
                {formatRupiah(db.serviceRecords?.reduce((sum, r) => sum + (r.biaya || 0), 0) || 0)}
              </span>
              <span className="text-[10px] text-slate-500 block mt-0.5">
                {db.serviceRecords?.length || 0} catatan perawatan armada
              </span>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4 text-center space-y-2">
          <div className="w-8 h-8 rounded-full bg-slate-800 text-slate-400 mx-auto flex items-center justify-center">
            <Lock className="w-4 h-4 text-slate-400" />
          </div>
          <h4 className="text-xs font-bold text-slate-300">Laporan Omset & Finansial Dibatasi</h4>
          <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
            Akun peran <strong>{activeUser?.role || 'Operator'}</strong> dibatasi dari melihat rekapitulasi omset dan nominal finansial rental.
          </p>
        </div>
      )}

      {/* Two Column Section: Stock Status & Pending Action Strip */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left Column (2/3): Ketersediaan Model Motor (D-05) */}
        <div className="lg:col-span-2 bg-slate-900/80 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                <span>Indikator Ketersediaan Model Motor</span>
                <span className="text-[11px] font-mono text-cyan-400 font-normal">(Buffer 60 Menit BR-04)</span>
              </h3>
              <p className="text-xs text-slate-400">
                Ketersediaan dihitung global per model motor; pool hanya tempat parkir fisik (D-26).
              </p>
            </div>
            <button
              onClick={() => onNavigateTab('fleet')}
              className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1 font-semibold"
            >
              <span>Katalog</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {db.motors.map(m => {
              const indicator = getPublicStockIndicator(m.id, db);
              const totalForModel = db.units.filter(u => u.motorId === m.id).length;
              const inService = db.units.filter(u => u.motorId === m.id && u.statusServis === 'servis').length;
              const isAvailable = indicator.status === 'tersedia';

              return (
                <div
                  key={m.id}
                  className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-3 flex items-center justify-between hover:border-slate-700 transition"
                >
                  <div className="min-w-0 pr-2">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-white truncate">{m.namaModel}</span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 font-mono">
                        {m.kategori}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-400">
                      <strong className="text-cyan-300">{formatRupiah(m.harga1Hari)}</strong>
                      <span>/ 24 Jam</span>
                      <span>· {totalForModel} Unit</span>
                      {inService > 0 && <span className="text-amber-400">({inService} Servis)</span>}
                    </div>
                  </div>

                  <span
                    className={`text-[11px] font-bold px-2 py-1 rounded-lg shrink-0 ${
                      isAvailable
                        ? 'bg-emerald-950/80 border border-emerald-700/60 text-emerald-300'
                        : 'bg-red-950/80 border border-red-800/60 text-red-300'
                    }`}
                  >
                    {indicator.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column (1/3): Tindakan Cepat Operator & Pending Approval */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
              <CalendarCheck2 className="w-4 h-4 text-cyan-400" />
              <span>Perlu Tindakan Operator</span>
            </h3>
            <span className="text-xs font-bold text-amber-400 bg-amber-950/70 px-2 py-0.5 rounded-lg border border-amber-800/60">
              {pendingBookings.length} Baru
            </span>
          </div>

          {pendingBookings.length === 0 ? (
            <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-4 text-center text-xs text-slate-400">
              <CheckCircle2 className="w-6 h-6 text-emerald-400 mx-auto mb-1" />
              <p className="font-semibold text-slate-200">Semua Booking Terkendali</p>
              <p className="text-[11px] mt-0.5">Tidak ada pesanan baru yang menunggu persetujuan kunci unit.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {pendingBookings.map(b => (
                <div
                  key={b.id}
                  onClick={() => {
                    onSelectBooking(b);
                    onNavigateTab('bookings');
                  }}
                  className="bg-slate-950 rounded-xl p-2.5 border border-amber-800/60 hover:border-amber-500 cursor-pointer transition space-y-1"
                >
                  <div className="flex justify-between items-start">
                    <span className="font-bold text-white text-xs">{b.nama}</span>
                    <span className="text-[10px] text-amber-400 font-mono font-semibold">#{b.noBooking}</span>
                  </div>
                  <p className="text-[11px] text-cyan-300 font-medium">
                    {b.snapshotNamaMotor} · <span className="text-slate-300">{b.labelDurasi}</span>
                  </p>
                  <div className="flex justify-between text-[10px] text-slate-400 pt-0.5">
                    <span>Mulai: {b.jamTanggalMulai.replace('T', ' ')}</span>
                    <span className="text-emerald-400 font-semibold">{formatRupiah(b.totalHargaEstimasi)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Quick Shortcuts */}
          <div className="pt-2 border-t border-slate-800/80 space-y-1.5">
            <span className="text-[11px] font-semibold text-slate-400 block">Akses Cepat Modul:</span>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                onClick={() => onNavigateTab('tracking')}
                className="p-2 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-left text-slate-300 transition flex items-center gap-1.5"
              >
                <Compass className="w-3.5 h-3.5 text-cyan-400" />
                <span>Posisi 16 Unit</span>
              </button>
              <button
                onClick={() => onNavigateTab('fleet')}
                className="p-2 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-left text-slate-300 transition flex items-center gap-1.5"
              >
                <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                <span>Bulk Pricing</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Active Rentals Live Tracker Strip */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-400" />
              <span>Unit Sedang Disewa (Di Tangan Penyewa)</span>
            </h3>
            <p className="text-xs text-slate-400">Pantau jadwal pengembalian dan potensi denda keterlambatan D-27</p>
          </div>
          <button
            onClick={() => onNavigateTab('bookings')}
            className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1 font-semibold"
          >
            <span>Semua Transaksi</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {activeDisewaBookings.length === 0 ? (
          <p className="text-xs text-slate-500 py-3 text-center">Saat ini tidak ada unit yang sedang disewa.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {activeDisewaBookings.map(b => {
              const motor = db.motors.find(m => m.id === b.motorId) || db.motors[0];
              const penalty = calculateOvertimePenalty(b, motor, currentEpoch);
              const isOvertime = penalty.terlambat;

              return (
                <div
                  key={b.id}
                  onClick={() => onSelectBooking(b)}
                  className={`bg-slate-950/90 rounded-xl p-3 border transition cursor-pointer ${
                    isOvertime
                      ? 'border-amber-600/80 hover:border-amber-400'
                      : 'border-slate-800 hover:border-blue-600/60'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-xs font-bold text-cyan-400">{b.snapshotKodeUnit}</span>
                      <span className="text-xs text-slate-300 block font-semibold">{b.nama}</span>
                    </div>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                        isOvertime ? 'bg-amber-950 text-amber-300 border border-amber-700' : 'bg-blue-950 text-blue-300'
                      }`}
                    >
                      {isOvertime ? '⚠️ Overtime' : '🛵 Disewa'}
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-400 mt-1">{b.snapshotNamaMotor} ({b.labelDurasi})</p>

                  <div className="mt-2 pt-2 border-t border-slate-800/80 text-[11px] flex justify-between items-center">
                    <span className="text-slate-400">Jadwal Kembali:</span>
                    <span className={`font-mono font-semibold ${isOvertime ? 'text-amber-400' : 'text-slate-200'}`}>
                      {b.jamTanggalSelesai.replace('T', ' ')}
                    </span>
                  </div>

                  {isOvertime && (
                    <div className="mt-1.5 p-1.5 bg-amber-950/60 rounded border border-amber-800/60 text-[10px] text-amber-300 flex justify-between">
                      <span>Denda D-27:</span>
                      <strong className="font-mono">{penalty.dendaFormat}</strong>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

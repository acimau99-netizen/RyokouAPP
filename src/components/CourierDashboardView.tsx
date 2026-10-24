import React, { useState } from 'react';
import {
  RyokoDatabase,
  BookingRecord,
  UnitTracking,
  AppUser,
  PoolLocation,
} from '../types/ryoko';
import {
  Bike,
  Phone,
  MessageSquare,
  MapPin,
  Clock,
  CheckCircle2,
  Navigation,
  Send,
  AlertCircle,
  ArrowRight,
  ShieldAlert,
} from 'lucide-react';
import { generateWhatsAppLink } from '../services/whatsappService';

interface CourierDashboardViewProps {
  db: RyokoDatabase;
  activeUser: AppUser;
  onConfirmHandover: (bookingId: number) => void;
  onConfirmFinish: (bookingId: number, returnPool: PoolLocation, denda: { nominal: number; keterangan: string }) => void;
  onParkUnitBack: (unitId: number, pool: PoolLocation) => void;
}

export const CourierDashboardView: React.FC<CourierDashboardViewProps> = ({
  db,
  activeUser,
  onConfirmHandover,
  onConfirmFinish,
  onParkUnitBack,
}) => {
  const [selectedTaskTab, setSelectedTaskTab] = useState<'antar' | 'jemput' | 'motor_kurir'>('antar');

  // Filter pengantaran: booking approved yang menunggu serah terima ke tamu
  const deliveryTasks = db.bookings.filter(b => b.status === 'ryokou_approved');

  // Filter penjemputan: booking disewa aktif
  const returnTasks = db.bookings.filter(b => b.status === 'ryokou_disewa');

  // Filter motor yang sedang berstatus dipakai kurir
  const courierMotors = db.tracking.filter(t => t.statusPosisi === 'kurir');

  // Helper WA chat to guest for delivery
  const handleChatGuestDelivery = (booking: BookingRecord) => {
    const text = `Halo Kak ${booking.nama}, salam dari Ryoko Rent Motor Malang. Saya ${activeUser.nama} (kurir) sedang mempersiapkan pengantaran motor ${booking.snapshotNamaMotor} [${booking.snapshotKodeUnit || 'Unit Standar'}]. Estimasi waktu sewa mulai pukul ${booking.jamTanggalMulai.replace('T', ' ')}. Mohon konfirmasi share lock lokasi pengantaran ya Kak. Terima kasih!`;
    const url = generateWhatsAppLink(booking.nomorWa, text);
    window.open(url, '_blank');
  };

  // Helper WA chat to guest for return/pickup
  const handleChatGuestPickup = (booking: BookingRecord) => {
    const text = `Halo Kak ${booking.nama}, kami dari kurir Ryoko Rent Motor. Mengingatkan waktu sewa untuk motor ${booking.snapshotNamaMotor} berakhir pada ${booking.jamTanggalSelesai.replace('T', ' ')}. Apakah unit siap untuk kami jemput / dikembalikan ke Pool? Terima kasih!`;
    const url = generateWhatsAppLink(booking.nomorWa, text);
    window.open(url, '_blank');
  };

  // Chat Admin Pool
  const handleChatAdmin = () => {
    const text = `Halo Admin Ryoko, saya ${activeUser.nama} (Kurir Lapangan) ingin koordinasi jadwal antar-jemput unit motor.`;
    const url = generateWhatsAppLink(db.settings.adminWhatsapp, text);
    window.open(url, '_blank');
  };

  return (
    <div className="space-y-4 pb-20">
      {/* Courier Header Card */}
      <div className="bg-gradient-to-r from-amber-950/60 via-slate-900 to-amber-950/40 border border-amber-600/40 rounded-2xl p-4 shadow-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-2xl shrink-0 shadow-inner">
            {activeUser.avatarIcon || '🛵'}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 uppercase tracking-wider">
                Mode Kurir Lapangan
              </span>
              <span className="text-[10px] text-slate-400">Akses Sangat Terbatas</span>
            </div>
            <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
              {activeUser.nama}
            </h2>
            <p className="text-xs text-slate-400">
              Shift Operasional Antar-Jemput Unit RyokoRent
            </p>
          </div>
        </div>

        <button
          onClick={handleChatAdmin}
          className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold px-3 py-2 rounded-xl shadow-md transition active:scale-95 shrink-0"
        >
          <MessageSquare className="w-4 h-4" />
          <span>Hubungi Admin Pool</span>
        </button>
      </div>

      {/* Task Summary Badges */}
      <div className="grid grid-cols-3 gap-2">
        <button
          onClick={() => setSelectedTaskTab('antar')}
          className={`p-3 rounded-xl border text-center transition flex flex-col items-center justify-center gap-1 ${
            selectedTaskTab === 'antar'
              ? 'bg-amber-950/50 border-amber-500 text-white shadow-md shadow-amber-950/50'
              : 'bg-slate-900/70 border-slate-800 text-slate-400 hover:text-slate-200'
          }`}
        >
          <span className="text-xs font-medium">Harus Diantar</span>
          <span className="text-xl font-bold text-amber-400 font-mono">
            {deliveryTasks.length}
          </span>
          <span className="text-[10px] text-slate-400">Siap Kirim</span>
        </button>

        <button
          onClick={() => setSelectedTaskTab('jemput')}
          className={`p-3 rounded-xl border text-center transition flex flex-col items-center justify-center gap-1 ${
            selectedTaskTab === 'jemput'
              ? 'bg-cyan-950/50 border-cyan-500 text-white shadow-md shadow-cyan-950/50'
              : 'bg-slate-900/70 border-slate-800 text-slate-400 hover:text-slate-200'
          }`}
        >
          <span className="text-xs font-medium">Harus Dijemput</span>
          <span className="text-xl font-bold text-cyan-400 font-mono">
            {returnTasks.length}
          </span>
          <span className="text-[10px] text-slate-400">Dalam Sewa</span>
        </button>

        <button
          onClick={() => setSelectedTaskTab('motor_kurir')}
          className={`p-3 rounded-xl border text-center transition flex flex-col items-center justify-center gap-1 ${
            selectedTaskTab === 'motor_kurir'
              ? 'bg-indigo-950/50 border-indigo-500 text-white shadow-md shadow-indigo-950/50'
              : 'bg-slate-900/70 border-slate-800 text-slate-400 hover:text-slate-200'
          }`}
        >
          <span className="text-xs font-medium">Motor Dibawa</span>
          <span className="text-xl font-bold text-indigo-400 font-mono">
            {courierMotors.length}
          </span>
          <span className="text-[10px] text-slate-400">Unit Kurir</span>
        </button>
      </div>

      {/* Security Privacy Notice */}
      <div className="flex items-center gap-2 bg-slate-900/60 border border-slate-800/80 rounded-xl px-3 py-2 text-[11px] text-slate-400">
        <ShieldAlert className="w-3.5 h-3.5 text-amber-400 shrink-0" />
        <span>
          Akses kurir dikonfigurasi aman: data finansial omset rental, riwayat biaya servis, dan pengaturan sistem disembunyikan.
        </span>
      </div>

      {/* TAB 1: PENGANTARAN (DELIVERY) */}
      {selectedTaskTab === 'antar' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
              <Navigation className="w-4 h-4 text-amber-400" />
              <span>Daftar Pengantaran Unit ({deliveryTasks.length})</span>
            </h3>
            <span className="text-[10px] text-slate-400">Siap Diserahkan ke Penyewa</span>
          </div>

          {deliveryTasks.length === 0 ? (
            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-8 text-center text-slate-400 space-y-2">
              <Bike className="w-8 h-8 mx-auto text-slate-600" />
              <p className="text-sm font-semibold text-slate-300">Tidak ada pengantaran aktif saat ini</p>
              <p className="text-xs text-slate-500">Semua pesanan baru yang sudah disetujui akan muncul di sini.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {deliveryTasks.map(booking => {
                const physicalUnit = db.units.find(u => u.id === booking.unitId);

                return (
                  <div
                    key={booking.id}
                    className="bg-slate-900/90 border border-amber-600/30 rounded-xl p-4 space-y-3 shadow-md"
                  >
                    <div className="flex items-start justify-between gap-2 border-b border-slate-800 pb-2.5">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-xs font-bold text-amber-400">
                            {booking.noBooking}
                          </span>
                          <span className="text-[10px] bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded border border-amber-500/30">
                            Disetujui · Siap Antar
                          </span>
                        </div>
                        <h4 className="text-base font-bold text-white mt-1">{booking.nama}</h4>
                      </div>

                      <div className="text-right">
                        <span className="text-[10px] text-slate-400 block">Unit Terkunci:</span>
                        <span className="text-xs font-bold font-mono text-cyan-300 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-800/40 inline-block">
                          {booking.snapshotKodeUnit || 'Belum Kunci'}
                        </span>
                      </div>
                    </div>

                    {/* Unit & Lokasi Specs */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/60">
                      <div>
                        <span className="text-[10px] text-slate-400 block">Model & Plat:</span>
                        <span className="font-semibold text-slate-200">
                          {booking.snapshotNamaMotor} {physicalUnit && `(${physicalUnit.nomorPlat})`}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block">Waktu Mulai Sewa:</span>
                        <span className="font-semibold text-amber-300">
                          {booking.jamTanggalMulai.replace('T', ' ')} WIB
                        </span>
                      </div>
                      <div className="sm:col-span-2">
                        <span className="text-[10px] text-slate-400 block flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-cyan-400" /> Alamat Pengantaran / Pool:
                        </span>
                        <span className="font-medium text-slate-300">
                          {booking.alamatPengantaran || (booking.pool === 'batu' ? db.settings.poolBatuAlamat : db.settings.poolMalangAlamat)}
                        </span>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                      <button
                        onClick={() => handleChatGuestDelivery(booking)}
                        className="flex items-center justify-center gap-1.5 bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-semibold py-2 px-3 rounded-lg transition active:scale-95 shadow-sm"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span>Chat WhatsApp Tamu</span>
                      </button>

                      <button
                        onClick={() => {
                          if (confirm(`Konfirmasi motor ${booking.snapshotKodeUnit} telah diserahkan kepada ${booking.nama}?`)) {
                            onConfirmHandover(booking.id);
                          }
                        }}
                        className="flex items-center justify-center gap-1.5 bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold py-2 px-3 rounded-lg transition active:scale-95 shadow-md shadow-amber-950"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Konfirmasi Unit Diserahkan</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: PENJEMPUTAN (PICKUP) */}
      {selectedTaskTab === 'jemput' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-cyan-400" />
              <span>Daftar Penjemputan / Pengembalian ({returnTasks.length})</span>
            </h3>
            <span className="text-[10px] text-slate-400">Unit Sedang Dibawa Tamu</span>
          </div>

          {returnTasks.length === 0 ? (
            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-8 text-center text-slate-400 space-y-2">
              <Bike className="w-8 h-8 mx-auto text-slate-600" />
              <p className="text-sm font-semibold text-slate-300">Tidak ada unit yang sedang disewa</p>
              <p className="text-xs text-slate-500">Semua unit sudah berada di pool.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {returnTasks.map(booking => {
                const physicalUnit = db.units.find(u => u.id === booking.unitId);

                return (
                  <div
                    key={booking.id}
                    className="bg-slate-900/90 border border-cyan-800/40 rounded-xl p-4 space-y-3 shadow-md"
                  >
                    <div className="flex items-start justify-between gap-2 border-b border-slate-800 pb-2.5">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-xs font-bold text-cyan-400">
                            {booking.noBooking}
                          </span>
                          <span className="text-[10px] bg-cyan-500/20 text-cyan-300 px-2 py-0.5 rounded border border-cyan-500/30">
                            Sedang Disewa
                          </span>
                        </div>
                        <h4 className="text-base font-bold text-white mt-1">{booking.nama}</h4>
                      </div>

                      <div className="text-right">
                        <span className="text-[10px] text-slate-400 block">Unit:</span>
                        <span className="text-xs font-bold font-mono text-cyan-300 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-800/40 inline-block">
                          {booking.snapshotKodeUnit}
                        </span>
                      </div>
                    </div>

                    {/* Unit & Jam Kembali */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/60">
                      <div>
                        <span className="text-[10px] text-slate-400 block">Model & Plat:</span>
                        <span className="font-semibold text-slate-200">
                          {booking.snapshotNamaMotor} {physicalUnit && `(${physicalUnit.nomorPlat})`}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block">Tenggat Kembali:</span>
                        <span className="font-semibold text-rose-300">
                          {booking.jamTanggalSelesai.replace('T', ' ')} WIB
                        </span>
                      </div>
                      <div className="sm:col-span-2">
                        <span className="text-[10px] text-slate-400 block flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-cyan-400" /> Lokasi Penjemputan / Pengembalian:
                        </span>
                        <span className="font-medium text-slate-300">
                          {booking.alamatPenjemputan || (booking.pool === 'batu' ? db.settings.poolBatuAlamat : db.settings.poolMalangAlamat)}
                        </span>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                      <button
                        onClick={() => handleChatGuestPickup(booking)}
                        className="flex items-center justify-center gap-1.5 bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-semibold py-2 px-3 rounded-lg transition active:scale-95 shadow-sm"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span>Chat WhatsApp Tamu</span>
                      </button>

                      <button
                        onClick={() => {
                          const pool = booking.pool || 'malang';
                          if (confirm(`Konfirmasi motor ${booking.snapshotKodeUnit} telah dijemput dan masuk ke ${pool === 'batu' ? 'Pool Batu' : 'Pool Malang'}?`)) {
                            onConfirmFinish(booking.id, pool, { nominal: 0, keterangan: 'Selesai dijemput kurir' });
                          }
                        }}
                        className="flex items-center justify-center gap-1.5 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold py-2 px-3 rounded-lg transition active:scale-95 shadow-md shadow-cyan-950"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Konfirmasi Unit Masuk Pool</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: MOTOR YANG DIBAWA KURIR */}
      {selectedTaskTab === 'motor_kurir' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
              <Bike className="w-4 h-4 text-indigo-400" />
              <span>Unit Sedang Dibawa Kurir ({courierMotors.length})</span>
            </h3>
            <span className="text-[10px] text-slate-400">Status Operasional Kurir</span>
          </div>

          {courierMotors.length === 0 ? (
            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-8 text-center text-slate-400 space-y-2">
              <Bike className="w-8 h-8 mx-auto text-slate-600" />
              <p className="text-sm font-semibold text-slate-300">Tidak ada unit motor yang sedang dibawa kurir</p>
              <p className="text-xs text-slate-500">Jika kurir mengambil unit dari pool, statusnya akan tercatat di sini.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {courierMotors.map(t => {
                const motorModel = db.motors.find(m => m.id === t.motorId);
                const unit = db.units.find(u => u.id === t.unitId);

                return (
                  <div
                    key={t.unitId}
                    className="bg-slate-900/90 border border-indigo-800/40 rounded-xl p-3.5 space-y-3"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">🛵</span>
                        <div>
                          <h4 className="text-sm font-bold text-white font-mono">{t.kodeUnit}</h4>
                          <p className="text-xs text-slate-400">{motorModel?.namaModel}</p>
                        </div>
                      </div>
                      <span className="text-xs font-mono font-bold text-slate-300 bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
                        {unit?.nomorPlat}
                      </span>
                    </div>

                    <div className="bg-slate-950/60 p-2 rounded-lg border border-slate-800/60 text-xs text-slate-300 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500 text-[11px]">Kurir Bertugas:</span>
                        <span className="font-semibold text-amber-300">{t.namaKurir || activeUser.nama}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500 text-[11px]">Pool Asal:</span>
                        <span className="font-semibold capitalize text-slate-200">Pool {t.poolParkir}</span>
                      </div>
                      {t.catatan && (
                        <p className="text-[11px] text-slate-400 italic">"{t.catatan}"</p>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <button
                        onClick={() => onParkUnitBack(t.unitId, 'malang')}
                        className="bg-slate-800 hover:bg-cyan-900/60 text-cyan-300 text-xs font-semibold py-1.5 px-2 rounded-lg border border-slate-700 transition"
                      >
                        Parkir Pool Malang
                      </button>
                      <button
                        onClick={() => onParkUnitBack(t.unitId, 'batu')}
                        className="bg-slate-800 hover:bg-cyan-900/60 text-cyan-300 text-xs font-semibold py-1.5 px-2 rounded-lg border border-slate-700 transition"
                      >
                        Parkir Pool Batu
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

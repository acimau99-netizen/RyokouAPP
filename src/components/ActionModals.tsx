import React, { useState, useMemo } from 'react';
import {
  BookingRecord,
  PhysicalUnit,
  RyokoDatabase,
  PoolLocation,
  UnitTracking,
  UnitPositionStatus,
} from '../types/ryoko';
import {
  getAvailableUnitsForModel,
  calculateOvertimePenalty,
  formatRupiah,
  parseWibToEpoch,
} from '../services/bookingEngine';
import {
  generateApprovalNoticeToCustomerWhatsAppUrl,
  generateHandoverNoticeToCustomerWhatsAppUrl,
  generateReturnReceiptWhatsAppUrl,
  generateUnitExchangeNoticeWhatsAppUrl,
} from '../services/whatsappService';
import {
  X,
  CheckCircle,
  Key,
  Repeat,
  MapPin,
  Wrench,
  AlertTriangle,
  MessageCircle,
  Clock,
  ArrowRight,
} from 'lucide-react';

/* -------------------------------------------------------------------------- */
/* 1. APPROVE & KUNCI UNIT MODAL                                              */
/* -------------------------------------------------------------------------- */

interface ApproveUnitModalProps {
  booking: BookingRecord;
  db: RyokoDatabase;
  onClose: () => void;
  onConfirmApprove: (bookingId: number, unitId: number) => void;
}

export const ApproveUnitModal: React.FC<ApproveUnitModalProps> = ({
  booking,
  db,
  onClose,
  onConfirmApprove,
}) => {
  const motor = db.motors.find(m => m.id === booking.motorId);
  const startEpoch = booking.startEpoch || parseWibToEpoch(booking.jamTanggalMulai);
  const endEpoch = booking.endEpoch || parseWibToEpoch(booking.jamTanggalSelesai);

  const availableUnits = useMemo(() => {
    return getAvailableUnitsForModel(booking.motorId, startEpoch, endEpoch, db, booking.id);
  }, [booking, db, startEpoch, endEpoch]);

  const [selectedUnitId, setSelectedUnitId] = useState<number>(() => {
    return availableUnits.length > 0 ? availableUnits[0].unit.id : 0;
  });

  const [autoOpenWa, setAutoOpenWa] = useState<boolean>(true);

  const handleApprove = () => {
    if (!selectedUnitId) return;
    onConfirmApprove(booking.id, selectedUnitId);

    if (autoOpenWa && booking.nomorWa) {
      const selectedUnitObj = db.units.find(u => u.id === selectedUnitId);
      const updatedBooking: BookingRecord = {
        ...booking,
        status: 'ryokou_approved',
        unitId: selectedUnitId,
        snapshotKodeUnit: selectedUnitObj?.kodeUnit || null,
      };
      const waUrl = generateApprovalNoticeToCustomerWhatsAppUrl(updatedBooking);
      window.open(waUrl, '_blank');
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-3 backdrop-blur-xs">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-cyan-950 border border-cyan-800/60 flex items-center justify-center text-cyan-400">
              <Key className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Approve & Kunci Unit Fisik</h2>
              <p className="text-xs text-slate-400">Booking #{booking.noBooking}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto space-y-4 text-sm">
          {/* Booking Summary Box */}
          <div className="bg-slate-950/80 rounded-xl p-3.5 border border-slate-800 space-y-2">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-xs text-slate-400">Penyewa:</span>
                <p className="font-semibold text-white">{booking.nama}</p>
                <p className="text-xs text-cyan-400 font-mono">📱 {booking.nomorWa}</p>
              </div>
              <div className="text-right">
                <span className="text-xs text-slate-400">Model Motor:</span>
                <p className="font-semibold text-white">{booking.snapshotNamaMotor}</p>
                <span className="text-xs text-emerald-400 font-medium">{booking.labelDurasi}</span>
              </div>
            </div>
            <div className="border-t border-slate-800/80 pt-2 text-xs text-slate-300 grid grid-cols-2 gap-2">
              <div>
                <span className="text-slate-500">Mulai:</span> {booking.jamTanggalMulai.replace('T', ' ')} WIB
              </div>
              <div>
                <span className="text-slate-500">Selesai:</span> {booking.jamTanggalSelesai.replace('T', ' ')} WIB
              </div>
              <div className="col-span-2">
                <span className="text-slate-500">Antar:</span> {booking.alamatPengantaran || 'Pool Terdekat'}
              </div>
            </div>
          </div>

          {/* Unit Selection */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-slate-300">
              Pilih Unit Fisik Armada yang Tersedia (Buffer 90 Menit):
            </label>

            {availableUnits.length === 0 ? (
              <div className="bg-red-950/40 border border-red-800/60 rounded-xl p-3 text-red-300 text-xs flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">Stok Armada Fisik Penuh</p>
                  <p className="mt-0.5 text-red-200">
                    Tidak ada unit {booking.snapshotNamaMotor} yang bebas jadwal pada rentang waktu ini (memperhitungkan jeda sewa 90 menit). Harap pilih model motor lain atau sesuaikan jadwal.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {availableUnits.map(({ unit, label, pool }) => {
                  const isSelected = selectedUnitId === unit.id;
                  return (
                    <div
                      key={unit.id}
                      onClick={() => setSelectedUnitId(unit.id)}
                      className={`p-3 rounded-xl border cursor-pointer transition flex items-center justify-between ${
                        isSelected
                          ? 'bg-cyan-950/50 border-cyan-500 text-white shadow-sm'
                          : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                            isSelected ? 'border-cyan-400 bg-cyan-400' : 'border-slate-600'
                          }`}
                        >
                          {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-slate-950" />}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm text-cyan-300">{unit.kodeUnit}</span>
                            <span className="text-xs text-slate-400">({unit.nomorPlat})</span>
                            <span className="text-[11px] text-slate-500">· {unit.warna} ({unit.tahun})</span>
                          </div>
                          <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                            <MapPin className="w-3 h-3 text-slate-500" />
                            <span>
                              Saat ini di: <strong className="text-slate-200">{pool === 'batu' ? 'Pool Batu' : 'Pool Malang'}</strong>
                            </span>
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Auto WhatsApp Option */}
          <div className="pt-1">
            <label className="flex items-center gap-2.5 text-xs text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={autoOpenWa}
                onChange={e => setAutoOpenWa(e.target.checked)}
                className="w-4 h-4 rounded bg-slate-800 border-slate-700 text-cyan-500 focus:ring-0"
              />
              <span className="flex items-center gap-1.5">
                <MessageCircle className="w-3.5 h-3.5 text-emerald-400" />
                Kirim notifikasi otomatis ke WhatsApp penyewa setelah diapprove
              </span>
            </label>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/60 flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            Batal
          </button>
          <button
            onClick={handleApprove}
            disabled={!selectedUnitId || availableUnits.length === 0}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 disabled:cursor-not-allowed text-white shadow-md shadow-cyan-950 flex items-center gap-1.5 transition active:scale-95"
          >
            <CheckCircle className="w-3.5 h-3.5" />
            <span>Approve & Kunci Unit</span>
          </button>
        </div>
      </div>
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/* 2. SERAH TERIMA UNIT (MULAI SEWA) MODAL                                    */
/* -------------------------------------------------------------------------- */

interface SerahTerimaModalProps {
  booking: BookingRecord;
  onClose: () => void;
  onConfirmHandover: (bookingId: number) => void;
}

export const SerahTerimaModal: React.FC<SerahTerimaModalProps> = ({
  booking,
  onClose,
  onConfirmHandover,
}) => {
  const [autoOpenWa, setAutoOpenWa] = useState(true);

  const handleHandover = () => {
    onConfirmHandover(booking.id);
    if (autoOpenWa && booking.nomorWa) {
      const waUrl = generateHandoverNoticeToCustomerWhatsAppUrl(booking);
      window.open(waUrl, '_blank');
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-3 backdrop-blur-xs">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-2">
            <span className="text-xl">🛵</span>
            <h2 className="text-base font-bold text-white">Serah Terima Unit (Mulai Sewa)</h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4 text-xs text-slate-300">
          <p>
            Pastikan fisik motor telah diperiksa dan diserahkan ke penyewa bersama perlengkapan standar:
          </p>
          <div className="bg-slate-950 rounded-xl p-3 border border-slate-800 space-y-1.5">
            <div className="flex justify-between">
              <span className="text-slate-400">No. Booking:</span>
              <strong className="text-white font-mono">{booking.noBooking}</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Penyewa:</span>
              <span className="text-white font-semibold">{booking.nama}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Unit Fisik:</span>
              <span className="text-cyan-400 font-bold">{booking.snapshotKodeUnit} ({booking.snapshotNamaMotor})</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Tenggat Kembali:</span>
              <span className="text-amber-400 font-semibold">{booking.jamTanggalSelesai.replace('T', ' ')} WIB</span>
            </div>
          </div>

          <div className="space-y-1 bg-emerald-950/30 border border-emerald-800/40 rounded-xl p-3">
            <span className="font-bold text-emerald-400 text-xs">Ceklis Serah Terima:</span>
            <ul className="list-disc pl-4 space-y-0.5 text-slate-300 text-[11px]">
              <li>2 Helm SNI bersih & tali pengunci berfungsi</li>
              <li>Jas Hujan setelan lengkap di bagasi</li>
              <li>STNK Asli dalam dompet gantungan kunci</li>
              <li>Bahan bakar cukup & kondisi rem prima</li>
            </ul>
          </div>

          <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer pt-1">
            <input
              type="checkbox"
              checked={autoOpenWa}
              onChange={e => setAutoOpenWa(e.target.checked)}
              className="w-4 h-4 rounded bg-slate-800 border-slate-700 text-emerald-500"
            />
            <span className="flex items-center gap-1.5">
              <MessageCircle className="w-3.5 h-3.5 text-emerald-400" />
              Kirim bukti serah terima via WhatsApp penyewa
            </span>
          </label>
        </div>

        <div className="p-4 border-t border-slate-800 bg-slate-950/60 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white"
          >
            Batal
          </button>
          <button
            onClick={handleHandover}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-950 flex items-center gap-1.5 transition active:scale-95"
          >
            <CheckCircle className="w-3.5 h-3.5" />
            <span>Konfirmasi Serah Terima</span>
          </button>
        </div>
      </div>
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/* 3. TUKAR UNIT BERKALA (D-19) MODAL                                         */
/* -------------------------------------------------------------------------- */

interface TukarUnitModalProps {
  booking: BookingRecord;
  db: RyokoDatabase;
  onClose: () => void;
  onConfirmExchange: (bookingId: number, newUnitId: number, reason: string) => void;
}

export const TukarUnitModal: React.FC<TukarUnitModalProps> = ({
  booking,
  db,
  onClose,
  onConfirmExchange,
}) => {
  const currentUnit = db.units.find(u => u.id === booking.unitId);
  const startEpoch = booking.startEpoch || parseWibToEpoch(booking.jamTanggalMulai);
  const endEpoch = booking.endEpoch || parseWibToEpoch(booking.jamTanggalSelesai);

  // Available units of same or compatible model
  const availableUnits = useMemo(() => {
    return getAvailableUnitsForModel(booking.motorId, startEpoch, endEpoch, db, booking.id).filter(
      item => item.unit.id !== booking.unitId
    );
  }, [booking, db, startEpoch, endEpoch]);

  const [newUnitId, setNewUnitId] = useState<number>(() => {
    return availableUnits.length > 0 ? availableUnits[0].unit.id : 0;
  });

  const [reason, setReason] = useState<string>('Perawatan berkala / servis armada di jalan');
  const [autoOpenWa, setAutoOpenWa] = useState(true);

  const handleConfirm = () => {
    if (!newUnitId) return;
    onConfirmExchange(booking.id, newUnitId, reason);

    if (autoOpenWa && booking.nomorWa) {
      const newUnitObj = db.units.find(u => u.id === newUnitId);
      const exchangeData = {
        id: `exc-${Date.now()}`,
        waktu: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB',
        unitLamaId: booking.unitId || 0,
        unitLamaKode: booking.snapshotKodeUnit || '-',
        unitBaruId: newUnitId,
        unitBaruKode: newUnitObj?.kodeUnit || '-',
        alasan: reason,
        operator: db.settings.operatorName || 'Operator Ryoko',
      };
      const waUrl = generateUnitExchangeNoticeWhatsAppUrl(booking, exchangeData);
      window.open(waUrl, '_blank');
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-3 backdrop-blur-xs">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-2">
            <Repeat className="w-5 h-5 text-amber-400" />
            <div>
              <h2 className="text-base font-bold text-white">Tukar Unit Berkala (D-19)</h2>
              <p className="text-xs text-slate-400">Ganti armada aktif selama sewa berjalan</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4 text-xs text-slate-300">
          <div className="bg-slate-950 rounded-xl p-3 border border-slate-800 flex items-center justify-between">
            <div>
              <span className="text-slate-400">Unit Saat Ini:</span>
              <p className="text-sm font-bold text-amber-400">{booking.snapshotKodeUnit}</p>
              <p className="text-[11px] text-slate-400">{currentUnit?.nomorPlat || '-'}</p>
            </div>
            <ArrowRight className="w-4 h-4 text-slate-500" />
            <div className="text-right">
              <span className="text-slate-400">Penyewa:</span>
              <p className="font-semibold text-white">{booking.nama}</p>
              <p className="text-[11px] text-slate-400">#{booking.noBooking}</p>
            </div>
          </div>

          {availableUnits.length === 0 ? (
            <div className="p-3 bg-red-950/40 border border-red-800/60 rounded-xl text-red-300">
              Tidak ada unit armada pengganti yang siap di jam ini.
            </div>
          ) : (
            <div>
              <label className="block font-semibold mb-1 text-slate-200">
                Pilih Unit Armada Pengganti:
              </label>
              <select
                value={newUnitId}
                onChange={e => setNewUnitId(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white text-xs focus:border-cyan-500 outline-none"
              >
                {availableUnits.map(({ unit, label }) => (
                  <option key={unit.id} value={unit.id}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block font-semibold mb-1 text-slate-200">Alasan Pertukaran Unit:</label>
            <input
              type="text"
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder="Contoh: Ban kempes di jalan, kendala rem, servis berkala"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white text-xs focus:border-cyan-500 outline-none"
            />
          </div>

          <label className="flex items-center gap-2 cursor-pointer pt-1">
            <input
              type="checkbox"
              checked={autoOpenWa}
              onChange={e => setAutoOpenWa(e.target.checked)}
              className="w-4 h-4 rounded bg-slate-800 border-slate-700 text-amber-500"
            />
            <span className="flex items-center gap-1.5 text-slate-300">
              <MessageCircle className="w-3.5 h-3.5 text-amber-400" />
              Kirim info pergantian unit ke WhatsApp penyewa
            </span>
          </label>
        </div>

        <div className="p-4 border-t border-slate-800 bg-slate-950/60 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-white">
            Batal
          </button>
          <button
            onClick={handleConfirm}
            disabled={!newUnitId || availableUnits.length === 0}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-amber-600 hover:bg-amber-500 text-slate-950 disabled:opacity-40 flex items-center gap-1.5 shadow-md transition active:scale-95"
          >
            <Repeat className="w-3.5 h-3.5" />
            <span>Konfirmasi Tukar Unit</span>
          </button>
        </div>
      </div>
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/* 4. SELESAI SEWA & KALKULASI DENDA (D-27) MODAL                             */
/* -------------------------------------------------------------------------- */

interface SelesaiBookingModalProps {
  booking: BookingRecord;
  db: RyokoDatabase;
  onClose: () => void;
  onConfirmFinish: (
    bookingId: number,
    returnPool: PoolLocation,
    denda: { nominal: number; keterangan: string }
  ) => void;
}

export const SelesaiBookingModal: React.FC<SelesaiBookingModalProps> = ({
  booking,
  db,
  onClose,
  onConfirmFinish,
}) => {
  const motor = db.motors.find(m => m.id === booking.motorId) || db.motors[0];
  const [returnPool, setReturnPool] = useState<PoolLocation>(booking.pool || 'malang');
  const [autoOpenWa, setAutoOpenWa] = useState(true);

  // Overtime computation D-27 based on current time
  const currentEpoch = Math.floor(Date.now() / 1000);
  const penalty = useMemo(() => {
    return calculateOvertimePenalty(booking, motor, currentEpoch);
  }, [booking, motor, currentEpoch]);

  const totalAkhir = booking.totalHargaEstimasi + (penalty.terlambat ? penalty.nominalDenda : 0);

  const handleFinish = () => {
    onConfirmFinish(booking.id, returnPool, {
      nominal: penalty.nominalDenda,
      keterangan: penalty.keterangan,
    });

    if (autoOpenWa && booking.nomorWa) {
      const returnPoolLabel =
        returnPool === 'batu' ? 'Pool Batu (Diponegoro)' : 'Pool Malang (Dinoyo)';
      const waUrl = generateReturnReceiptWhatsAppUrl(booking, penalty, returnPoolLabel);
      window.open(waUrl, '_blank');
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-3 backdrop-blur-xs">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-emerald-400" />
            <div>
              <h2 className="text-base font-bold text-white">Selesai Sewa & Pengembalian</h2>
              <p className="text-xs text-slate-400">Perhitungan Denda Keterlambatan D-27</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4 text-xs text-slate-300">
          {/* Summary */}
          <div className="bg-slate-950 rounded-xl p-3 border border-slate-800 space-y-1.5">
            <div className="flex justify-between">
              <span className="text-slate-400">Penyewa:</span>
              <strong className="text-white">{booking.nama} ({booking.noBooking})</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Unit:</span>
              <span className="text-cyan-400 font-bold">{booking.snapshotKodeUnit} ({booking.snapshotNamaMotor})</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Jadwal Selesai:</span>
              <span className="text-slate-200">{booking.jamTanggalSelesai.replace('T', ' ')} WIB</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Waktu Kembali Aktual:</span>
              <span className="text-emerald-400 font-semibold font-mono">
                {new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB (Sekarang)
              </span>
            </div>
          </div>

          {/* Denda Box (D-27 Rule) */}
          <div
            className={`rounded-xl p-3 border ${
              penalty.terlambat && penalty.nominalDenda > 0
                ? 'bg-amber-950/40 border-amber-700/60'
                : 'bg-emerald-950/30 border-emerald-800/40'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-bold flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" />
                Kalkulasi Denda Keterlambatan (D-27):
              </span>
              <strong
                className={`text-sm ${
                  penalty.terlambat && penalty.nominalDenda > 0 ? 'text-amber-300' : 'text-emerald-300'
                }`}
              >
                {penalty.dendaFormat}
              </strong>
            </div>
            <p className="mt-1 text-[11px] text-slate-300">{penalty.keterangan}</p>
          </div>

          {/* Lokasi Pool Pengembalian */}
          <div>
            <label className="block font-semibold mb-1 text-slate-200">
              Unit Dikembalikan & Diparkir di Pool:
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setReturnPool('malang')}
                className={`p-2.5 rounded-xl border text-center transition ${
                  returnPool === 'malang'
                    ? 'bg-cyan-950/60 border-cyan-500 text-white font-bold'
                    : 'bg-slate-950 border-slate-800 text-slate-400'
                }`}
              >
                🅿️ Pool Malang (Dinoyo)
              </button>
              <button
                type="button"
                onClick={() => setReturnPool('batu')}
                className={`p-2.5 rounded-xl border text-center transition ${
                  returnPool === 'batu'
                    ? 'bg-cyan-950/60 border-cyan-500 text-white font-bold'
                    : 'bg-slate-950 border-slate-800 text-slate-400'
                }`}
              >
                🅿️ Pool Batu (Diponegoro)
              </button>
            </div>
          </div>

          {/* Total Pembayaran */}
          <div className="bg-slate-950 rounded-xl p-3 border border-slate-800 space-y-1">
            <div className="flex justify-between text-slate-400">
              <span>Sewa Pokok:</span>
              <span>{formatRupiah(booking.totalHargaEstimasi)}</span>
            </div>
            {penalty.terlambat && penalty.nominalDenda > 0 && (
              <div className="flex justify-between text-amber-400">
                <span>Denda Overtime:</span>
                <span>+{formatRupiah(penalty.nominalDenda)}</span>
              </div>
            )}
            <div className="border-t border-slate-800 pt-1.5 flex justify-between font-bold text-sm text-white">
              <span>TOTAL PEMBAYARAN:</span>
              <span className="text-emerald-400 font-mono">{formatRupiah(totalAkhir)}</span>
            </div>
          </div>

          <label className="flex items-center gap-2 cursor-pointer pt-1">
            <input
              type="checkbox"
              checked={autoOpenWa}
              onChange={e => setAutoOpenWa(e.target.checked)}
              className="w-4 h-4 rounded bg-slate-800 border-slate-700 text-emerald-500"
            />
            <span className="flex items-center gap-1.5 text-slate-300">
              <MessageCircle className="w-3.5 h-3.5 text-emerald-400" />
              Kirim kwitansi selesai sewa & rincian denda via WhatsApp
            </span>
          </label>
        </div>

        <div className="p-4 border-t border-slate-800 bg-slate-950/60 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-white">
            Batal
          </button>
          <button
            onClick={handleFinish}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-950 flex items-center gap-1.5 transition active:scale-95"
          >
            <CheckCircle className="w-3.5 h-3.5" />
            <span>Selesaikan & Masukkan ke Pool</span>
          </button>
        </div>
      </div>
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/* 5. UPDATE POSISI LACAK UNIT (D-26 & Opsi 3A) MODAL                         */
/* -------------------------------------------------------------------------- */

interface UpdateTrackingModalProps {
  unitTracking: UnitTracking;
  db: RyokoDatabase;
  onClose: () => void;
  onConfirmUpdate: (updated: UnitTracking) => void;
}

export const UpdateTrackingModal: React.FC<UpdateTrackingModalProps> = ({
  unitTracking,
  db,
  onClose,
  onConfirmUpdate,
}) => {
  const [posisi, setPosisi] = useState<UnitPositionStatus>(unitTracking.statusPosisi);
  const [pool, setPool] = useState<PoolLocation>(unitTracking.poolParkir);
  const [kurir, setKurir] = useState<string>(unitTracking.namaKurir || '');
  const [bengkel, setBengkel] = useState<string>(unitTracking.namaBengkel || '');
  const [kontak, setKontak] = useState<string>(unitTracking.kontakBengkel || '');
  const [estimasi, setEstimasi] = useState<string>(unitTracking.estimasiSelesai || '');
  const [catatan, setCatatan] = useState<string>(unitTracking.catatan || '');

  const handleSave = () => {
    const nowStr =
      new Date().toLocaleDateString('id-ID', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      }) +
      ' ' +
      new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) +
      ' WIB';

    const updated: UnitTracking = {
      ...unitTracking,
      statusPosisi: posisi,
      poolParkir: pool,
      namaKurir: posisi === 'kurir' ? kurir : undefined,
      namaBengkel: posisi === 'servis' ? bengkel : undefined,
      kontakBengkel: posisi === 'servis' ? kontak : undefined,
      estimasiSelesai: posisi === 'servis' ? estimasi : undefined,
      catatan,
      updatedAt: nowStr,
      updatedBy: db.settings.operatorName || 'Operator Ryoko',
    };

    onConfirmUpdate(updated);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-3 backdrop-blur-xs">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div>
            <h2 className="text-base font-bold text-white">Update Posisi Lacak Unit</h2>
            <p className="text-xs text-cyan-400 font-mono">{unitTracking.kodeUnit}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4 text-xs text-slate-300">
          <div>
            <label className="block font-semibold mb-1 text-slate-200">Status Posisi Unit:</label>
            <div className="grid grid-cols-3 gap-1.5">
              <button
                type="button"
                onClick={() => setPosisi('parkir')}
                className={`p-2 rounded-xl border text-center font-medium transition ${
                  posisi === 'parkir'
                    ? 'bg-emerald-950/60 border-emerald-500 text-emerald-300 font-bold'
                    : 'bg-slate-950 border-slate-800 text-slate-400'
                }`}
              >
                🅿️ Pool
              </button>
              <button
                type="button"
                onClick={() => setPosisi('kurir')}
                className={`p-2 rounded-xl border text-center font-medium transition ${
                  posisi === 'kurir'
                    ? 'bg-cyan-950/60 border-cyan-500 text-cyan-300 font-bold'
                    : 'bg-slate-950 border-slate-800 text-slate-400'
                }`}
              >
                🛵 Kurir
              </button>
              <button
                type="button"
                onClick={() => setPosisi('servis')}
                className={`p-2 rounded-xl border text-center font-medium transition ${
                  posisi === 'servis'
                    ? 'bg-amber-950/60 border-amber-500 text-amber-300 font-bold'
                    : 'bg-slate-950 border-slate-800 text-slate-400'
                }`}
              >
                🔧 Servis
              </button>
            </div>
            {posisi === 'disewa' && (
              <p className="mt-1 text-[11px] text-cyan-400 italic">
                Unit saat ini tercatat sedang disewa oleh penyewa (#{unitTracking.noBooking}).
              </p>
            )}
          </div>

          {posisi === 'parkir' && (
            <div>
              <label className="block font-semibold mb-1 text-slate-200">Lokasi Pool Parkir:</label>
              <select
                value={pool}
                onChange={e => setPool(e.target.value as PoolLocation)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
              >
                <option value="malang">Pool Malang (Dinoyo)</option>
                <option value="batu">Pool Batu (Diponegoro)</option>
              </select>
            </div>
          )}

          {posisi === 'kurir' && (
            <div className="space-y-1.5 bg-slate-950/80 p-3 rounded-xl border border-slate-800">
              <label className="block font-semibold text-slate-200">Nama Kurir yang Membawa Unit (ASM-03):</label>
              <input
                type="text"
                value={kurir}
                onChange={e => setKurir(e.target.value)}
                placeholder="Contoh: Budi Santoso (Kurir Operasional Malang)"
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-cyan-300 font-semibold"
                required
              />
              <span className="text-[10px] text-slate-400 block">
                Catat identitas kurir yang bertanggung jawab atas unit selama mobilitas pengantaran/penjemputan.
              </span>
            </div>
          )}

          {posisi === 'servis' && (
            <div className="space-y-2 bg-slate-950/80 p-3 rounded-xl border border-slate-800">
              <div>
                <label className="block font-semibold mb-1 text-slate-200">Nama Bengkel Rekanan:</label>
                <input
                  type="text"
                  value={bengkel}
                  onChange={e => setBengkel(e.target.value)}
                  placeholder="Misal: Ahass Dinoyo / Bengkel Rejeki Batu"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1 text-slate-200">Kontak Mekanik/Bengkel:</label>
                <input
                  type="text"
                  value={kontak}
                  onChange={e => setKontak(e.target.value)}
                  placeholder="Misal: 08123456789 (Pak Budi)"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1 text-slate-200">Estimasi Tanggal Selesai:</label>
                <input
                  type="text"
                  value={estimasi}
                  onChange={e => setEstimasi(e.target.value)}
                  placeholder="Misal: 25 Oktober 2026 / 2 Hari lagi"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block font-semibold mb-1 text-slate-200">Catatan Kondisi Unit:</label>
            <input
              type="text"
              value={catatan}
              onChange={e => setCatatan(e.target.value)}
              placeholder="Misal: Siap jalan, bensin penuh, ganti oli selesai"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
            />
          </div>
        </div>

        <div className="p-4 border-t border-slate-800 bg-slate-950/60 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-white">
            Batal
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-cyan-600 hover:bg-cyan-500 text-white shadow-md transition active:scale-95"
          >
            Simpan Posisi
          </button>
        </div>
      </div>
    </div>
  );
};

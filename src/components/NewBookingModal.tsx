import React, { useState, useMemo } from 'react';
import {
  RyokoDatabase,
  BookingRecord,
  SupportIdType,
  CustomerTag,
  TariffCategory,
  DurationOption,
  PoolLocation,
} from '../types/ryoko';
import {
  generateBookingNumber,
  formatRupiah,
  isOutsideOperationalHours,
  parseWibToEpoch,
  getAvailableUnitsForModel,
} from '../services/bookingEngine';
import {
  generateBookingConfirmationWhatsAppUrl,
  generateCourierTaskWhatsAppUrl,
} from '../services/whatsappService';
import {
  X,
  PlusCircle,
  AlertTriangle,
  Clock,
  MapPin,
  MessageCircle,
  Truck,
  Calendar,
} from 'lucide-react';

interface NewBookingModalProps {
  db: RyokoDatabase;
  onClose: () => void;
  onSubmitBooking: (booking: BookingRecord, lockUnitId?: number) => void;
}

export const NewBookingModal: React.FC<NewBookingModalProps> = ({
  db,
  onClose,
  onSubmitBooking,
}) => {
  const [motorId, setMotorId] = useState<number>(() => (db.motors.length > 0 ? db.motors[0].id : 1));
  const selectedMotor = useMemo(() => db.motors.find(m => m.id === motorId) || db.motors[0], [db.motors, motorId]);

  const [kategoriTarif, setKategoriTarif] = useState<TariffCategory>('harian');
  const [pilihanDurasi, setPilihanDurasi] = useState<DurationOption>('1_hari');

  // Dates default: today at 09:00 WIB until tomorrow 09:00 WIB
  const defaultDates = useMemo(() => {
    const start = new Date();
    start.setHours(9, 0, 0, 0);
    const startStr = start.toISOString().slice(0, 16);

    const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
    const endStr = end.toISOString().slice(0, 16);
    return { startStr, endStr };
  }, []);

  const [jamTanggalMulai, setJamTanggalMulai] = useState<string>(defaultDates.startStr);
  const [jamTanggalSelesai, setJamTanggalSelesai] = useState<string>(defaultDates.endStr);

  const [nama, setNama] = useState<string>('');
  const [nomorWa, setNomorWa] = useState<string>('');
  const [jenisIdPendukung, setJenisIdPendukung] = useState<SupportIdType>('SIM_C');
  const [tandaPelanggan, setTandaPelanggan] = useState<CustomerTag>('baru');
  const [pool, setPool] = useState<PoolLocation>('malang');
  const [alamatPengantaran, setAlamatPengantaran] = useState<string>('');
  const [alamatPenjemputan, setAlamatPenjemputan] = useState<string>('');
  const [kurirPengantar, setKurirPengantar] = useState<string>('');
  const [catatanKhusus, setCatatanKhusus] = useState<string>('');
  const [lockUnitImmediately, setLockUnitImmediately] = useState<boolean>(true);
  const [selectedUnitId, setSelectedUnitId] = useState<number>(0);
  const [autoOpenWa, setAutoOpenWa] = useState<boolean>(true);

  // Check Out-of-hours warning (D-06)
  const isOutOfHours = useMemo(() => {
    return isOutsideOperationalHours(jamTanggalMulai) || isOutsideOperationalHours(jamTanggalSelesai);
  }, [jamTanggalMulai, jamTanggalSelesai]);

  // Compute duration label & price (BR-01 Revisi: 1 Bulan menggantikan 2 Minggu)
  const { totalHarga, labelDurasi } = useMemo(() => {
    if (!selectedMotor) return { totalHarga: 85000, labelDurasi: '1 Hari (24 Jam)' };

    if (kategoriTarif === 'harian') {
      if (pilihanDurasi === '1_minggu') {
        return { totalHarga: selectedMotor.harga1Minggu, labelDurasi: '1 Minggu (7 Hari)' };
      }
      if (pilihanDurasi === '1_bulan') {
        return { totalHarga: selectedMotor.harga1Bulan || 1750000, labelDurasi: '1 Bulan (30 Hari)' };
      }
      return { totalHarga: selectedMotor.harga1Hari, labelDurasi: '1 Hari (24 Jam)' };
    }

    if (kategoriTarif === 'jam') {
      if (pilihanDurasi === '3_jam') {
        return { totalHarga: selectedMotor.harga3Jam, labelDurasi: 'ShortRent 3 Jam' };
      }
      if (pilihanDurasi === '6_jam') {
        return { totalHarga: selectedMotor.harga6Jam, labelDurasi: 'ShortRent 6 Jam' };
      }
      if (pilihanDurasi === '9_jam') {
        return { totalHarga: selectedMotor.harga9Jam, labelDurasi: 'ShortRent 9 Jam' };
      }
      return { totalHarga: selectedMotor.harga12Jam, labelDurasi: 'ShortRent 12 Jam' };
    }

    return { totalHarga: 260000, labelDurasi: 'Paket Promo Wisata' };
  }, [selectedMotor, kategoriTarif, pilihanDurasi]);

  const startEpoch = parseWibToEpoch(jamTanggalMulai);
  const endEpoch = parseWibToEpoch(jamTanggalSelesai);

  const availableUnits = useMemo(() => {
    if (!selectedMotor || endEpoch <= startEpoch) return [];
    return getAvailableUnitsForModel(selectedMotor.id, startEpoch, endEpoch, db);
  }, [selectedMotor, startEpoch, endEpoch, db]);

  // Adjust end date automatically when duration changes
  const handleDurationChange = (dur: DurationOption) => {
    setPilihanDurasi(dur);
    const startDate = new Date(jamTanggalMulai);
    if (isNaN(startDate.getTime())) return;

    let hoursToAdd = 24;
    if (dur === '3_jam') hoursToAdd = 3;
    else if (dur === '6_jam') hoursToAdd = 6;
    else if (dur === '9_jam') hoursToAdd = 9;
    else if (dur === '12_jam') hoursToAdd = 12;
    else if (dur === '1_hari') hoursToAdd = 24;
    else if (dur === '1_minggu') hoursToAdd = 24 * 7;
    else if (dur === '1_bulan') hoursToAdd = 24 * 30; // 30 hari

    const endDate = new Date(startDate.getTime() + hoursToAdd * 60 * 60 * 1000);
    setJamTanggalSelesai(endDate.toISOString().slice(0, 16));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nama.trim()) {
      alert('Mohon isi nama penyewa.');
      return;
    }

    const newBookingNumber = generateBookingNumber(db);
    const nowStr =
      new Date().toLocaleDateString('id-ID', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      }) +
      ' ' +
      new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) +
      ' WIB';

    const chosenUnit = lockUnitImmediately && selectedUnitId
      ? db.units.find(u => u.id === selectedUnitId)
      : null;

    const newBooking: BookingRecord = {
      id: Date.now(),
      noBooking: newBookingNumber,
      status: chosenUnit ? 'ryokou_approved' : 'ryokou_booking',
      nama: nama.trim(),
      nomorWa: nomorWa.trim(),
      jenisIdPendukung,
      tandaPelanggan,
      motorId: selectedMotor.id,
      snapshotNamaMotor: selectedMotor.namaModel,
      unitId: chosenUnit ? chosenUnit.id : null,
      snapshotKodeUnit: chosenUnit ? chosenUnit.kodeUnit : null,
      kategoriTarif,
      pilihanDurasi,
      labelDurasi,
      jamTanggalMulai,
      jamTanggalSelesai,
      startEpoch,
      endEpoch,
      pool,
      alamatPengantaran: alamatPengantaran.trim() || (pool === 'batu' ? 'Pool Batu (Diponegoro)' : 'Pool Malang (Dinoyo)'),
      alamatPenjemputan: alamatPenjemputan.trim() || (pool === 'batu' ? 'Pool Batu (Diponegoro)' : 'Pool Malang (Dinoyo)'),
      kurirPengantar: kurirPengantar.trim(),
      totalHargaEstimasi: totalHarga,
      luarJamOperasional: isOutOfHours,
      catatanKhusus: catatanKhusus.trim(),
      createdAt: nowStr,
      approvedAt: chosenUnit ? nowStr : undefined,
      dendaNominal: 0,
      dendaKeterangan: 'Belum ada denda',
    };

    onSubmitBooking(newBooking, chosenUnit ? chosenUnit.id : undefined);

    if (autoOpenWa) {
      const waUrl = generateBookingConfirmationWhatsAppUrl(newBooking, db.settings.adminWhatsapp);
      window.open(waUrl, '_blank');
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-2 sm:p-4 backdrop-blur-xs">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl max-h-[94vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-slate-800 flex items-center justify-between bg-slate-950/70">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-950 border border-emerald-800 flex items-center justify-center text-emerald-400">
              <PlusCircle className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-white">Input Pemesanan Motor Baru</h2>
              <p className="text-[11px] text-slate-400">Format order revisi ZLCE (Termasuk opsi sewa 1 Bulan & Kurir)</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-5 overflow-y-auto space-y-4 text-xs text-slate-200">
          {/* Out-of-hours Warning (D-06) */}
          {isOutOfHours && (
            <div className="bg-blue-950/40 border border-blue-700/60 rounded-xl p-3 text-blue-200 text-xs flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
              <div>
                <strong className="block font-bold">Catatan Jam Operasional (D-06):</strong>
                <span>Jadwal sewa berada di luar jam kerja reguler (07.00 - 23.00 WIB). Layanan antar/jemput luar jam kerja akan diinformasikan ke WhatsApp.</span>
              </div>
            </div>
          )}

          {/* Row 1: Model Motor & Kategori Durasi */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold mb-1 text-slate-300">1. Pilih Model Motor:</label>
              <select
                value={motorId}
                onChange={e => {
                  const mId = Number(e.target.value);
                  setMotorId(mId);
                  setSelectedUnitId(0);
                }}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-medium focus:border-cyan-500 outline-none"
              >
                {db.motors.map(m => (
                  <option key={m.id} value={m.id}>
                    {m.namaModel} ({m.kategori}) — {formatRupiah(m.harga1Hari)}/hari
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-slate-400 mt-1">✨ {selectedMotor.fasilitas}</p>
            </div>

            <div>
              <label className="block font-semibold mb-1 text-slate-300">2. Kategori Tarif (D-18 & BR-01):</label>
              <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-950 rounded-xl border border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setKategoriTarif('harian');
                    handleDurationChange('1_hari');
                  }}
                  className={`py-1.5 px-2 rounded-lg text-xs font-medium transition ${
                    kategoriTarif === 'harian' ? 'bg-cyan-600 text-white font-bold' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Harian / Bulan
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setKategoriTarif('jam');
                    handleDurationChange('12_jam');
                  }}
                  className={`py-1.5 px-2 rounded-lg text-xs font-medium transition ${
                    kategoriTarif === 'jam' ? 'bg-cyan-600 text-white font-bold' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  ShortRent (Jam)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setKategoriTarif('paket');
                    handleDurationChange('paket_promo');
                  }}
                  className={`py-1.5 px-2 rounded-lg text-xs font-medium transition ${
                    kategoriTarif === 'paket' ? 'bg-cyan-600 text-white font-bold' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Paket Wisata
                </button>
              </div>

              {/* Sub-duration Selector */}
              <div className="mt-2">
                {kategoriTarif === 'harian' && (
                  <select
                    value={pilihanDurasi}
                    onChange={e => handleDurationChange(e.target.value as DurationOption)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-white font-semibold"
                  >
                    <option value="1_hari">1 Hari (24 Jam) — {formatRupiah(selectedMotor.harga1Hari)}</option>
                    <option value="1_minggu">1 Minggu (7 Hari) — {formatRupiah(selectedMotor.harga1Minggu)}</option>
                    <option value="1_bulan">1 Bulan (30 Hari Penuh) — {formatRupiah(selectedMotor.harga1Bulan || 1750000)}</option>
                  </select>
                )}

                {kategoriTarif === 'jam' && (
                  <select
                    value={pilihanDurasi}
                    onChange={e => handleDurationChange(e.target.value as DurationOption)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-white"
                  >
                    <option value="12_jam">12 Jam — {formatRupiah(selectedMotor.harga12Jam)}</option>
                    <option value="9_jam">9 Jam — {formatRupiah(selectedMotor.harga9Jam)}</option>
                    <option value="6_jam">6 Jam — {formatRupiah(selectedMotor.harga6Jam)}</option>
                    <option value="3_jam">3 Jam — {formatRupiah(selectedMotor.harga3Jam)}</option>
                  </select>
                )}

                {kategoriTarif === 'paket' && (
                  <select
                    value={pilihanDurasi}
                    onChange={e => handleDurationChange(e.target.value as DurationOption)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-white"
                  >
                    {db.packages.map(p => (
                      <option key={p.id} value="paket_promo">
                        {p.namaPaket} — {formatRupiah(p.hargaPaket)}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            </div>
          </div>

          {/* Row 2: Waktu Mulai & Waktu Selesai */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold mb-1 text-slate-300">3. Jadwal Mulai (WIB):</label>
              <input
                type="datetime-local"
                value={jamTanggalMulai}
                onChange={e => setJamTanggalMulai(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono text-xs focus:border-cyan-500 outline-none"
                required
              />
            </div>
            <div>
              <label className="block font-semibold mb-1 text-slate-300">4. Jadwal Selesai (WIB):</label>
              <input
                type="datetime-local"
                value={jamTanggalSelesai}
                onChange={e => setJamTanggalSelesai(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono text-xs focus:border-cyan-500 outline-none"
                required
              />
            </div>
          </div>

          {/* Row 3: Nama Penyewa, WA & ID Pendukung */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block font-semibold mb-1 text-slate-300">Nama Penyewa:</label>
              <input
                type="text"
                value={nama}
                onChange={e => setNama(e.target.value)}
                placeholder="Misal: Dimas Pratama"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white outline-none focus:border-cyan-500"
                required
              />
            </div>

            <div>
              <label className="block font-semibold mb-1 text-slate-300">No. WhatsApp / HP:</label>
              <input
                type="tel"
                value={nomorWa}
                onChange={e => setNomorWa(e.target.value)}
                placeholder="Misal: 081234567890"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono outline-none focus:border-cyan-500"
                required
              />
            </div>

            <div>
              <label className="block font-semibold mb-1 text-slate-300">ID Pendukung:</label>
              <select
                value={jenisIdPendukung}
                onChange={e => setJenisIdPendukung(e.target.value as SupportIdType)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
              >
                <option value="SIM_C">SIM C (Asli)</option>
                <option value="KTM">KTM (Kartu Mahasiswa Malang)</option>
                <option value="NPWP">NPWP</option>
                <option value="Paspor">Paspor</option>
                <option value="BPJS">BPJS Kesehatan / Kerja</option>
                <option value="Kartu_Pegawai">Kartu Pegawai / Kerja</option>
              </select>
            </div>
          </div>

          {/* Row 4: Status Pelanggan & Area Pool */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold mb-1 text-slate-300">Status Pelanggan:</label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setTandaPelanggan('baru')}
                  className={`flex-1 py-1.5 px-3 rounded-xl border text-center transition ${
                    tandaPelanggan === 'baru'
                      ? 'bg-slate-800 border-slate-600 text-white font-semibold'
                      : 'bg-slate-950 border-slate-800 text-slate-400'
                  }`}
                >
                  Pelanggan Baru
                </button>
                <button
                  type="button"
                  onClick={() => setTandaPelanggan('langganan')}
                  className={`flex-1 py-1.5 px-3 rounded-xl border text-center transition ${
                    tandaPelanggan === 'langganan'
                      ? 'bg-cyan-950/60 border-cyan-500 text-cyan-300 font-bold'
                      : 'bg-slate-950 border-slate-800 text-slate-400'
                  }`}
                >
                  Langganan (Repeat)
                </button>
              </div>
            </div>

            <div>
              <label className="block font-semibold mb-1 text-slate-300">Area / Pool Layanan Terdekat:</label>
              <select
                value={pool}
                onChange={e => setPool(e.target.value as PoolLocation)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
              >
                <option value="malang">Pool Malang (Dinoyo - Lowokwaru)</option>
                <option value="batu">Pool Batu (Diponegoro - Dekat Alun-Alun)</option>
              </select>
            </div>
          </div>

          {/* Row 5: Alamat Antar & Kurir Penanggung Jawab (ASM-03 Revisi) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block font-semibold mb-1 text-slate-300">Lokasi Pengantaran (Ambil):</label>
              <input
                type="text"
                value={alamatPengantaran}
                onChange={e => setAlamatPengantaran(e.target.value)}
                placeholder="Misal: Stasiun Kota Baru Malang / Hotel Ibis"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
              />
            </div>
            <div>
              <label className="block font-semibold mb-1 text-slate-300">Lokasi Penjemputan (Kembali):</label>
              <input
                type="text"
                value={alamatPenjemputan}
                onChange={e => setAlamatPenjemputan(e.target.value)}
                placeholder="Misal: Stasiun Malang / Pool Dinoyo"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
              />
            </div>
            <div>
              <label className="block font-semibold mb-1 text-slate-300 flex items-center gap-1">
                <Truck className="w-3.5 h-3.5 text-cyan-400" />
                <span>Nama Kurir Pengantar (Opsional):</span>
              </label>
              <input
                type="text"
                value={kurirPengantar}
                onChange={e => setKurirPengantar(e.target.value)}
                placeholder="Misal: Budi Santoso / Kurir Antar"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-medium"
              />
            </div>
          </div>

          {/* Unit Locking Option (Buffer 60 Menit) */}
          <div className="bg-slate-950/80 p-3.5 rounded-xl border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer font-semibold text-white">
                <input
                  type="checkbox"
                  checked={lockUnitImmediately}
                  onChange={e => setLockUnitImmediately(e.target.checked)}
                  className="w-4 h-4 rounded bg-slate-800 border-slate-700 text-cyan-500"
                />
                <span>Langsung Kunci Unit Fisik Sekarang (Status: Approved)</span>
              </label>
              <span className="text-[11px] text-cyan-400 font-mono">
                {availableUnits.length} Unit Bebas Jadwal
              </span>
            </div>

            {lockUnitImmediately && (
              <div>
                {availableUnits.length === 0 ? (
                  <p className="text-amber-400 text-xs">
                    Stok unit kosong di rentang waktu ini (buffer 60 menit). Booking akan disimpan sebagai status &quot;Booking Baru&quot;.
                  </p>
                ) : (
                  <select
                    value={selectedUnitId || availableUnits[0].unit.id}
                    onChange={e => setSelectedUnitId(Number(e.target.value))}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-cyan-300 font-bold"
                  >
                    {availableUnits.map(({ unit, label }) => (
                      <option key={unit.id} value={unit.id}>
                        {label}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            )}
          </div>

          {/* Price Summary & WhatsApp check */}
          <div className="bg-slate-950 rounded-xl p-3 border border-slate-800 flex items-center justify-between">
            <div>
              <span className="text-slate-400 text-xs">Total Estimasi Sewa:</span>
              <p className="text-lg font-bold text-emerald-400 font-mono">{formatRupiah(totalHarga)}</p>
              <span className="text-[11px] text-slate-500">{labelDurasi}</span>
            </div>
            <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300">
              <input
                type="checkbox"
                checked={autoOpenWa}
                onChange={e => setAutoOpenWa(e.target.checked)}
                className="w-4 h-4 rounded bg-slate-800 border-slate-700 text-emerald-500"
              />
              <span className="flex items-center gap-1">
                <MessageCircle className="w-3.5 h-3.5 text-emerald-400" />
                Buka WhatsApp setelah simpan
              </span>
            </label>
          </div>
        </form>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/70 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-white">
            Batal
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            className="px-5 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-950 flex items-center gap-1.5 transition active:scale-95"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Simpan Transaksi Booking</span>
          </button>
        </div>
      </div>
    </div>
  );
};

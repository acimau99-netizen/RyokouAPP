import {
  BookingRecord,
  MotorModel,
  OvertimePenaltyResult,
  RyokoDatabase,
  PhysicalUnit,
} from '../types/ryoko';

export const TURNAROUND_BUFFER_SECONDS = 90 * 60; // 90 menit = 5400 detik (D-17)

/**
 * Filter sanitasi anti-16 digit NIK pada seluruh field teks (UU PDP No. 27/2022 D-21)
 */
export function sanitizeTextNoNik(text: string): string {
  if (!text) return '';
  // Pola 16 digit angka berurutan (dengan atau tanpa spasi/strip)
  const nikRegex = /(?:\d[\s\-]?){16}/g;
  return text.replace(nikRegex, '[SENSOR-ANTI-NIK-UU-PDP]');
}

/**
 * Deteksi apakah teks mengandung 16 digit angka berurutan (indikasi NIK)
 */
export function containsNikPattern(text: string): boolean {
  if (!text) return false;
  return /(?:\d[\s\-]?){16}/.test(text);
}

/**
 * Format date string to WIB Epoch seconds
 */
export function parseWibToEpoch(dateTimeStr: string): number {
  if (!dateTimeStr) return 0;
  const date = new Date(dateTimeStr);
  return Math.floor(date.getTime() / 1000);
}

/**
 * Format epoch seconds to WIB display string
 */
export function formatEpochToWib(epoch: number): string {
  if (!epoch) return '-';
  const d = new Date(epoch * 1000);
  return (
    d.toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }) +
    ' ' +
    d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) +
    ' WIB'
  );
}

/**
 * Periksa apakah jadwal berada di luar jam operasional 07:00 - 23:00 WIB (D-06)
 */
export function isOutsideOperationalHours(dateTimeStr: string): boolean {
  if (!dateTimeStr) return false;
  const d = new Date(dateTimeStr);
  const hours = d.getHours();
  // Outside 07:00 - 23:00
  return hours < 7 || hours >= 23;
}

/**
 * Generator Nomor Booking Atomik RYK-YYYYMMDD-XXX (D-03, QA-01)
 */
export function generateBookingNumber(db: RyokoDatabase): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const prefix = `RYK-${year}${month}${day}-`;

  const existingToday = db.bookings.filter(b => b.noBooking && b.noBooking.startsWith(prefix));
  const nextSeq = existingToday.length + 1;
  return `${prefix}${String(nextSeq).padStart(3, '0')}`;
}

/**
 * Format mata uang Rupiah
 */
export function formatRupiah(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Kalkulator Denda Keterlambatan Cerdas (D-27)
 * - ShortRent (3j, 6j, 9j): Step-Up ke paket jam di atasnya jika keterlambatan >= 60 menit.
 * - ShortRent 12 Jam: Keterlambatan >= 60 menit dikenakan denda harian per jam.
 * - Sewa Harian: Toleransi 90 menit; keterlambatan > 90 menit dikenakan denda harian per jam.
 */
export function calculateOvertimePenalty(
  booking: BookingRecord,
  motor: MotorModel,
  actualReturnEpoch?: number
): OvertimePenaltyResult {
  const endEpoch = booking.endEpoch || parseWibToEpoch(booking.jamTanggalSelesai);
  const returnEpoch =
    actualReturnEpoch ||
    booking.actualReturnEpoch ||
    (booking.selesaiAt ? parseWibToEpoch(booking.selesaiAt) : Math.floor(Date.now() / 1000));

  const dendaHarian = motor.dendaHarianPerJam || 20000;

  if (!endEpoch || returnEpoch <= endEpoch) {
    return {
      terlambat: false,
      menitTelat: 0,
      nominalDenda: 0,
      dendaFormat: 'Rp 0 (Tepat Waktu)',
      keterangan: 'Tepat waktu / belum melewati jadwal kembali.',
    };
  }

  const lateSeconds = returnEpoch - endEpoch;
  const lateMinutes = Math.floor(lateSeconds / 60);

  // KASUS A: Kategori ShortRent Jam (D-27)
  if (booking.kategoriTarif === 'jam' || ['3_jam', '6_jam', '9_jam', '12_jam'].includes(booking.pilihanDurasi)) {
    if (lateMinutes < 60) {
      return {
        terlambat: false,
        menitTelat: lateMinutes,
        nominalDenda: 0,
        dendaFormat: 'Rp 0 (Toleransi < 60 mnt)',
        keterangan: `Terlambat ${lateMinutes} menit (masih dalam toleransi < 60 menit ShortRent D-27).`,
      };
    }

    const p3 = motor.harga3Jam;
    const p6 = motor.harga6Jam;
    const p9 = motor.harga9Jam;
    const p12 = motor.harga12Jam;

    // ShortRent 12 Jam -> Denda sama dengan denda harian per jam
    if (booking.pilihanDurasi === '12_jam') {
      const lateHours = Math.ceil(lateMinutes / 60);
      const nominal = lateHours * dendaHarian;
      return {
        terlambat: true,
        menitTelat: lateMinutes,
        nominalDenda: nominal,
        dendaFormat: formatRupiah(nominal),
        keterangan: `ShortRent 12 Jam telat ${lateMinutes} mnt (${lateHours} jam) -> Dikenakan Denda Harian (${formatRupiah(dendaHarian)}/jam) [D-27].`,
      };
    }

    // ShortRent 3 Jam, 6 Jam, 9 Jam -> Step-Up ke paket jam di atasnya
    let baseHours = 3;
    let basePrice = p3;
    if (booking.pilihanDurasi === '6_jam') {
      baseHours = 6;
      basePrice = p6;
    } else if (booking.pilihanDurasi === '9_jam') {
      baseHours = 9;
      basePrice = p9;
    }

    const totalUsedMinutes = baseHours * 60 + lateMinutes;
    let targetTier = '';
    let nominal = 0;

    if (baseHours === 3 && totalUsedMinutes < 6 * 60 + 60) {
      targetTier = '6 Jam';
      nominal = Math.max(0, p6 - basePrice);
    } else if (baseHours <= 6 && totalUsedMinutes < 9 * 60 + 60) {
      targetTier = '9 Jam';
      nominal = Math.max(0, p9 - basePrice);
    } else if (totalUsedMinutes < 12 * 60 + 60) {
      targetTier = '12 Jam';
      nominal = Math.max(0, p12 - basePrice);
    } else {
      const extraMins = totalUsedMinutes - 12 * 60;
      const extraHours = Math.ceil(extraMins / 60);
      targetTier = `12 Jam + ${extraHours} Jam Denda Harian`;
      nominal = Math.max(0, p12 - basePrice) + extraHours * dendaHarian;
    }

    return {
      terlambat: true,
      menitTelat: lateMinutes,
      nominalDenda: nominal,
      dendaFormat: formatRupiah(nominal),
      keterangan: `ShortRent ${baseHours} Jam telat ${lateMinutes} mnt (>=60 mnt) -> Naik Kategori ke ${targetTier} [D-27].`,
    };
  }

  // KASUS B: Kategori Harian / Mingguan / Paket (Toleransi 90 Menit)
  if (lateMinutes <= 90) {
    return {
      terlambat: false,
      menitTelat: lateMinutes,
      nominalDenda: 0,
      dendaFormat: 'Rp 0 (Toleransi <= 90 mnt)',
      keterangan: `Terlambat ${lateMinutes} menit (masih dalam toleransi 90 menit sewa harian).`,
    };
  }

  const lateHours = Math.ceil(lateMinutes / 60);
  const nominal = lateHours * dendaHarian;

  return {
    terlambat: true,
    menitTelat: lateMinutes,
    nominalDenda: nominal,
    dendaFormat: formatRupiah(nominal),
    keterangan: `Sewa Harian telat ${lateMinutes} mnt (${lateHours} jam) x ${formatRupiah(dendaHarian)}/jam.`,
  };
}

/**
 * Cek Ketersediaan 1 Unit Fisik Tertentu pada Rentang Waktu (D-17, D-26)
 * - Turnaround buffer 90 menit (5400 detik) di kedua sisi rentang jadwal
 * - Unit sedang dibawa (`ryokou_disewa`) yang lewat jadwal ditahan ketersediaannya sampai selesai
 */
export function isUnitAvailableForRange(
  unitId: number,
  reqStartEpoch: number,
  reqEndEpoch: number,
  db: RyokoDatabase,
  excludeBookingId?: number
): boolean {
  if (!unitId || reqEndEpoch <= reqStartEpoch) return false;

  const unit = db.units.find(u => u.id === unitId);
  if (!unit || unit.statusServis === 'servis') return false;

  // Cek tracking status
  const track = db.tracking.find(t => t.unitId === unitId);
  if (track && track.statusPosisi === 'servis') return false;

  const nowEpoch = Math.floor(Date.now() / 1000);

  // Periksa semua transaksi aktif yang mengunci unit ini
  const activeBookings = db.bookings.filter(
    b =>
      b.unitId === unitId &&
      (b.status === 'ryokou_approved' || b.status === 'ryokou_disewa') &&
      (!excludeBookingId || b.id !== excludeBookingId)
  );

  for (const b of activeBookings) {
    const bStart = b.startEpoch || parseWibToEpoch(b.jamTanggalMulai);
    const bEnd = b.endEpoch || parseWibToEpoch(b.jamTanggalSelesai);
    const effectiveEnd = b.status === 'ryokou_disewa' ? Math.max(bEnd, nowEpoch) : bEnd;

    const bufferedStart = bStart - TURNAROUND_BUFFER_SECONDS;
    const bufferedEnd = effectiveEnd + TURNAROUND_BUFFER_SECONDS;

    // Ada tumpang tindih waktu
    if (reqStartEpoch < bufferedEnd && reqEndEpoch > bufferedStart) {
      return false;
    }
  }

  return true;
}

/**
 * Ambil Daftar Seluruh Unit Fisik yang Tersedia Bebas Bentrok untuk Model Motor Tertentu (D-26)
 */
export function getAvailableUnitsForModel(
  motorId: number,
  startEpoch: number,
  endEpoch: number,
  db: RyokoDatabase,
  excludeBookingId?: number
): Array<{ unit: PhysicalUnit; label: string; pool: string }> {
  const modelUnits = db.units.filter(u => u.motorId === motorId && u.statusServis === 'aktif');

  const available: Array<{ unit: PhysicalUnit; label: string; pool: string }> = [];

  for (const u of modelUnits) {
    if (isUnitAvailableForRange(u.id, startEpoch, endEpoch, db, excludeBookingId)) {
      const track = db.tracking.find(t => t.unitId === u.id);
      const poolLabel = track?.poolParkir === 'batu' ? 'Pool Batu (Diponegoro)' : 'Pool Malang (Dinoyo)';
      available.push({
        unit: u,
        label: `${u.kodeUnit} (${u.nomorPlat}) — Parkir di ${poolLabel}`,
        pool: track?.poolParkir || u.poolLokasi,
      });
    }
  }

  return available;
}

/**
 * Indikator Stok Biner Tegas Publik (D-05: Tersedia / Habis)
 */
export function getPublicStockIndicator(
  motorId: number,
  db: RyokoDatabase
): { status: 'tersedia' | 'habis'; label: string } {
  const nowEpoch = Math.floor(Date.now() / 1000);
  const oneHourLater = nowEpoch + 3600;

  const avail = getAvailableUnitsForModel(motorId, nowEpoch, oneHourLater, db);
  if (avail.length > 0) {
    return { status: 'tersedia', label: 'Tersedia' };
  }
  return { status: 'habis', label: 'Habis (Konfirmasi WA)' };
}

import { BookingRecord, UnitExchangeLog, OvertimePenaltyResult } from '../types/ryoko';
import { formatRupiah } from './bookingEngine';

/**
 * Normalisasi nomor HP ke format internasional WhatsApp (628xxx)
 */
export function normalizeWhatsAppNumber(phone: string): string {
  if (!phone) return '6281234567890';
  let clean = phone.replace(/[^0-9]/g, '');
  if (clean.startsWith('08')) {
    clean = '62' + clean.slice(1);
  } else if (!clean.startsWith('62') && clean.length > 5) {
    clean = '62' + clean;
  }
  return clean || '6281234567890';
}

/**
 * Tautan WhatsApp untuk Konfirmasi Booking Baru (D-03, D-09, D-21)
 */
export function generateBookingConfirmationWhatsAppUrl(
  booking: BookingRecord,
  adminPhone: string
): string {
  const targetPhone = normalizeWhatsAppNumber(adminPhone);
  const poolLabel = booking.pool === 'batu' ? 'Pool Batu (Diponegoro)' : 'Pool Malang (Dinoyo)';
  const customerTypeLabel = booking.tandaPelanggan === 'langganan' ? 'Pelanggan Langganan' : 'Pelanggan Baru';

  const lines = [
    'Halo Admin *Ryokourent Malang & Batu*, berikut rincian pemesanan sewa motor:',
    '',
    `*No. Booking:* ${booking.noBooking}`,
    `*Nama Penyewa:* ${booking.nama}`,
    `*No. WhatsApp:* ${booking.nomorWa || '-'}`,
    `*Status Pelanggan:* ${customerTypeLabel}`,
    `*ID Pendukung:* ${booking.jenisIdPendukung || 'SIM_C'} (Tanpa NIK - Kepatuhan UU PDP)`,
    `*Unit Motor:* ${booking.snapshotNamaMotor}`,
    `*Paket / Durasi:* ${booking.labelDurasi}`,
    `*Waktu Mulai:* ${booking.jamTanggalMulai.replace('T', ' ')} WIB`,
    `*Waktu Selesai:* ${booking.jamTanggalSelesai.replace('T', ' ')} WIB`,
    `*Area / Pool Terdekat:* ${poolLabel}`,
    `*Lokasi Pengantaran:* ${booking.alamatPengantaran || poolLabel}`,
    `*Lokasi Penjemputan:* ${booking.alamatPenjemputan || poolLabel}`,
    `*Estimasi Total Sewa:* ${formatRupiah(booking.totalHargaEstimasi)}`,
    '*Fasilitas Termasuk:* 2 Helm SNI + Jas Hujan',
  ];

  if (booking.snapshotKodeUnit) {
    lines.push(`*Unit Fisik Terkunci:* ${booking.snapshotKodeUnit}`);
  }

  if (booking.kategoriTarif === 'jam') {
    lines.push('');
    lines.push('_*Ketentuan ShortRent (D-27): Keterlambatan >= 60 menit otomatis masuk kategori paket jam di atasnya (3j->6j->9j->12j). Paket 12 jam telat >= 60 mnt dikenakan denda harian._');
  }

  if (booking.luarJamOperasional) {
    lines.push('');
    lines.push('_*Catatan Jam Operasional (D-06): Jadwal ambil/kembali di luar jam reguler (07.00-23.00 WIB). Layanan siap diantar sesuai konfirmasi._');
  }

  lines.push('');
  lines.push('Mohon konfirmasi kesiapan unit. Terima kasih!');

  const message = lines.join('\n');
  return `https://api.whatsapp.com/send?phone=${encodeURIComponent(targetPhone)}&text=${encodeURIComponent(message)}`;
}

/**
 * Tautan WhatsApp Kirim ke Penyewa: Pemberitahuan Unit Siap & Disetujui
 */
export function generateApprovalNoticeToCustomerWhatsAppUrl(booking: BookingRecord): string {
  const customerPhone = normalizeWhatsAppNumber(booking.nomorWa);
  const poolLabel = booking.pool === 'batu' ? 'Pool Batu (Diponegoro)' : 'Pool Malang (Dinoyo)';

  const lines = [
    `Halo Kak *${booking.nama}*,`,
    'Kabar gembira! Pemesanan sewa motor Anda di *Ryokourent Malang & Batu* telah *DISETUJUI & UNIT TERKUNCI*. 🛵✨',
    '',
    `*No. Booking:* ${booking.noBooking}`,
    `*Model Motor:* ${booking.snapshotNamaMotor}`,
    `*Kode Unit:* ${booking.snapshotKodeUnit || 'Telah Dialokasikan'}`,
    `*Durasi Sewa:* ${booking.labelDurasi}`,
    `*Jadwal Ambil:* ${booking.jamTanggalMulai.replace('T', ' ')} WIB`,
    `*Lokasi Serah Terima:* ${booking.alamatPengantaran || poolLabel}`,
    `*Total Sewa:* ${formatRupiah(booking.totalHargaEstimasi)}`,
    '',
    'Harap siapkan fisik ID Pendamping saat serah terima (KTM/SIM C/Paspor/NPWP).',
    'Tim kami akan segera menghubungi saat pengantaran unit. Sampai jumpa di Malang & Batu! 😊',
  ];

  const message = lines.join('\n');
  return `https://api.whatsapp.com/send?phone=${encodeURIComponent(customerPhone)}&text=${encodeURIComponent(message)}`;
}

/**
 * Tautan WhatsApp Kirim ke Penyewa: Berita Acara Serah Terima Unit (Mulai Sewa)
 */
export function generateHandoverNoticeToCustomerWhatsAppUrl(booking: BookingRecord): string {
  const customerPhone = normalizeWhatsAppNumber(booking.nomorWa);

  const lines = [
    `*BUKTI SERAH TERIMA UNIT — RYOKOURENT* 🛵`,
    `Halo Kak *${booking.nama}*, unit motor telah resmi diserahterimakan:`,
    '',
    `*No. Booking:* ${booking.noBooking}`,
    `*Unit Motor:* ${booking.snapshotNamaMotor} (Kode: *${booking.snapshotKodeUnit}*)`,
    `*Waktu Mulai Sewa:* ${booking.jamTanggalMulai.replace('T', ' ')} WIB`,
    `*Tenggat Waktu Kembali:* ${booking.jamTanggalSelesai.replace('T', ' ')} WIB`,
    `*Lokasi Penjemputan:* ${booking.alamatPenjemputan || 'Pool Ryokourent'}`,
    '*Kelengkapan Diterima:* 2 Helm SNI + Jas Hujan + STNK Asli',
    '',
    '⚠️ _Tips Berkendara: Selalu gunakan helm, patuhi rambu lalu lintas, dan hubungi kami jika membutuhkan bantuan darurat di jalan._',
    'Selamat menikmati perjalanan wisata di Malang & Batu!',
  ];

  const message = lines.join('\n');
  return `https://api.whatsapp.com/send?phone=${encodeURIComponent(customerPhone)}&text=${encodeURIComponent(message)}`;
}

/**
 * Tautan WhatsApp Kirim ke Penyewa: Kwitansi Selesai Sewa & Denda (D-27)
 */
export function generateReturnReceiptWhatsAppUrl(
  booking: BookingRecord,
  denda: OvertimePenaltyResult,
  returnPoolLabel: string
): string {
  const customerPhone = normalizeWhatsAppNumber(booking.nomorWa);
  const totalAkhir = booking.totalHargaEstimasi + (denda.terlambat ? denda.nominalDenda : 0);

  const lines = [
    `*BUKTI PENGEMBALIAN & SELESAI SEWA — RYOKOURENT* ✅`,
    `Terima kasih Kak *${booking.nama}* telah mempercayakan perjalanan bersama Ryokourent!`,
    '',
    `*No. Booking:* ${booking.noBooking}`,
    `*Unit Motor:* ${booking.snapshotNamaMotor} (${booking.snapshotKodeUnit})`,
    `*Durasi Sewa:* ${booking.labelDurasi}`,
    `*Tarif Sewa Pokok:* ${formatRupiah(booking.totalHargaEstimasi)}`,
    `*Lokasi Pengembalian:* ${returnPoolLabel}`,
  ];

  if (denda.terlambat && denda.nominalDenda > 0) {
    lines.push(`*Denda Keterlambatan (D-27):* ${formatRupiah(denda.nominalDenda)} (${denda.menitTelat} menit telat)`);
    lines.push(`*Rincian Denda:* ${denda.keterangan}`);
    lines.push(`*TOTAL PEMBAYARAN AKHIR:* ${formatRupiah(totalAkhir)}`);
  } else {
    lines.push('*Status Keterlambatan:* Tepat Waktu (Tidak Ada Denda)');
    lines.push(`*TOTAL SEWA:* ${formatRupiah(booking.totalHargaEstimasi)} (LUNAS)`);
  }

  lines.push('');
  lines.push('Unit dan perlengkapan telah diperiksa dan diterima dalam kondisi baik.');
  lines.push('Sampai jumpa di liburan Anda berikutnya di Malang & Kota Batu! 🙏⭐');

  const message = lines.join('\n');
  return `https://api.whatsapp.com/send?phone=${encodeURIComponent(customerPhone)}&text=${encodeURIComponent(message)}`;
}

/**
 * Tautan WhatsApp Pemberitahuan Tukar Unit (D-19)
 */
export function generateUnitExchangeNoticeWhatsAppUrl(
  booking: BookingRecord,
  exchange: UnitExchangeLog
): string {
  const customerPhone = normalizeWhatsAppNumber(booking.nomorWa);

  const lines = [
    `*PEMBERITAHUAN TUKAR UNIT MOTOR — RYOKOURENT* 🔄`,
    `Halo Kak *${booking.nama}*, proses pertukaran armada telah dicatat dalam sistem kami:`,
    '',
    `*No. Booking:* ${booking.noBooking}`,
    `*Unit Semula:* ${exchange.unitLamaKode}`,
    `*Unit Pengganti:* *${exchange.unitBaruKode}*`,
    `*Waktu Pertukaran:* ${exchange.waktu}`,
    `*Alasan:* ${exchange.alasan}`,
    `*Operator Penanggung Jawab:* ${exchange.operator}`,
    '',
    'Semua kelengkapan (STNK, helm, jas hujan) telah disesuaikan dengan unit baru. Mohon diperiksa kembali kelengkapannya.',
    'Terima kasih atas pengertian dan kerjasamanya!',
  ];

  const message = lines.join('\n');
  return `https://api.whatsapp.com/send?phone=${encodeURIComponent(customerPhone)}&text=${encodeURIComponent(message)}`;
}

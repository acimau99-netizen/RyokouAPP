import {
  BookingRecord,
  UnitExchangeLog,
  OvertimePenaltyResult,
  ServiceRecord,
} from '../types/ryoko';
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
 * Tautan WhatsApp generik dari nomor dan teks
 */
export function generateWhatsAppLink(phone: string, text: string): string {
  const target = normalizeWhatsAppNumber(phone);
  return `https://api.whatsapp.com/send?phone=${encodeURIComponent(target)}&text=${encodeURIComponent(text)}`;
}

/**
 * 1. Tautan WhatsApp untuk Konfirmasi Booking Baru (D-03, D-09, Bagian 10)
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

  if (booking.kurirPengantar) {
    lines.push(`*Kurir Pengantar:* ${booking.kurirPengantar}`);
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
 * 2. Tautan WhatsApp Kirim ke Penyewa: Pemberitahuan Unit Siap & Disetujui
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
    'Tim kami akan menghubungi saat pengantaran unit. Sampai jumpa di Malang & Batu! 😊',
  ];

  const message = lines.join('\n');
  return `https://api.whatsapp.com/send?phone=${encodeURIComponent(customerPhone)}&text=${encodeURIComponent(message)}`;
}

/**
 * 3. Tautan WhatsApp Kirim ke Penyewa: Berita Acara Serah Terima Unit (Mulai Sewa)
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
    '⚠️ _Tips: Hubungi kami jika membutuhkan bantuan darurat di jalan. Selamat menikmati perjalanan!_',
  ];

  const message = lines.join('\n');
  return `https://api.whatsapp.com/send?phone=${encodeURIComponent(customerPhone)}&text=${encodeURIComponent(message)}`;
}

/**
 * 4. Tautan WhatsApp Kirim ke Penyewa: Kwitansi Selesai Sewa & Denda (D-27)
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
 * 5. Tautan WhatsApp Pemberitahuan Tukar Unit (D-19)
 */
export function generateUnitExchangeNoticeWhatsAppUrl(
  booking: BookingRecord,
  exchange: UnitExchangeLog
): string {
  const customerPhone = normalizeWhatsAppNumber(booking.nomorWa);

  const lines = [
    `*PEMBERITAHUAN TUKAR UNIT MOTOR — RYOKOURENT* 🔄`,
    `Halo Kak *${booking.nama}*, proses pertukaran armada telah dicatat:`,
    '',
    `*No. Booking:* ${booking.noBooking}`,
    `*Unit Semula:* ${exchange.unitLamaKode}`,
    `*Unit Pengganti:* *${exchange.unitBaruKode}*`,
    `*Waktu Pertukaran:* ${exchange.waktu}`,
    `*Alasan:* ${exchange.alasan}`,
    `*Operator Penanggung Jawab:* ${exchange.operator}`,
    '',
    'Semua perlengkapan (STNK, helm, jas hujan) telah disesuaikan dengan unit baru.',
    'Terima kasih atas pengertian dan kerjasamanya!',
  ];

  const message = lines.join('\n');
  return `https://api.whatsapp.com/send?phone=${encodeURIComponent(customerPhone)}&text=${encodeURIComponent(message)}`;
}

/**
 * 6. Tautan WhatsApp: Surat Tugas / Penugasan Kurir Pengantar & Penjemput (Bagian 10 Baru)
 */
export function generateCourierTaskWhatsAppUrl(
  booking: BookingRecord,
  courierPhone: string,
  courierName: string
): string {
  const targetPhone = normalizeWhatsAppNumber(courierPhone);

  const lines = [
    `*SURAT TUGAS PENGANTARAN / PENJEMPUTAN MOTOR* 🛵📦`,
    `Kepada Rekan Kurir: *${courierName}*`,
    '',
    `*No. Booking:* ${booking.noBooking}`,
    `*Penyewa:* ${booking.nama}`,
    `*No. HP Penyewa:* ${booking.nomorWa || '-'}`,
    `*Unit Motor:* ${booking.snapshotNamaMotor} (Kode: *${booking.snapshotKodeUnit || 'Siapkan di Pool'}*)`,
    `*Jadwal:* ${booking.jamTanggalMulai.replace('T', ' ')} WIB`,
    `*Lokasi Pengantaran:* ${booking.alamatPengantaran}`,
    `*Lokasi Penjemputan:* ${booking.alamatPenjemputan}`,
    `*Durasi Sewa:* ${booking.labelDurasi}`,
    '',
    'Harap cek kelengkapan unit (2 Helm SNI + Jas Hujan + STNK Asli) sebelum diserahterimakan.',
    'Semangat dan utamakan keselamatan berkendara! 🛵💨',
  ];

  const message = lines.join('\n');
  return `https://api.whatsapp.com/send?phone=${encodeURIComponent(targetPhone)}&text=${encodeURIComponent(message)}`;
}

/**
 * 7. Tautan WhatsApp: Tagihan Sewa Bulanan (1 Bulan) (Bagian 10 Baru)
 */
export function generateMonthlyInvoiceWhatsAppUrl(booking: BookingRecord): string {
  const customerPhone = normalizeWhatsAppNumber(booking.nomorWa);

  const lines = [
    `*INVOICE SEWA BULANAN (30 HARI) — RYOKOURENT* 📄🏍️`,
    `Yth. Kak *${booking.nama}*, rincian tagihan sewa bulanan Anda:`,
    '',
    `*No. Booking:* ${booking.noBooking}`,
    `*Model Motor:* ${booking.snapshotNamaMotor} (Kode: *${booking.snapshotKodeUnit}*)`,
    `*Paket Durasi:* 1 Bulan (30 Hari Penuh)`,
    `*Periode Sewa:* ${booking.jamTanggalMulai.replace('T', ' ')} s/d ${booking.jamTanggalSelesai.replace('T', ' ')} WIB`,
    `*Total Tarif Bulanan:* ${formatRupiah(booking.totalHargaEstimasi)}`,
    '',
    '✨ *Benefit Sewa Bulanan:* Termasuk gratis ganti oli mesin 1x per bulan di bengkel rekanan resmi kami.',
    'Pembayaran dapat dilakukan melalui transfer atau kasir pool kami. Terima kasih!',
  ];

  const message = lines.join('\n');
  return `https://api.whatsapp.com/send?phone=${encodeURIComponent(customerPhone)}&text=${encodeURIComponent(message)}`;
}

/**
 * 8. Tautan WhatsApp: Pengingat Jatuh Tempo Pengembalian (H-2 Jam) (Bagian 10 Baru)
 */
export function generateDueReminderWhatsAppUrl(booking: BookingRecord): string {
  const customerPhone = normalizeWhatsAppNumber(booking.nomorWa);

  const lines = [
    `*PENGINGAT WAKTU PENGEMBALIAN MOTOR — RYOKOURENT* ⏰`,
    `Halo Kak *${booking.nama}*, mengingatkan masa sewa motor Anda akan segera berakhir:`,
    '',
    `*No. Booking:* ${booking.noBooking}`,
    `*Unit:* ${booking.snapshotKodeUnit} (${booking.snapshotNamaMotor})`,
    `*Tenggat Waktu Kembali:* *${booking.jamTanggalSelesai.replace('T', ' ')} WIB*`,
    `*Lokasi Pengembalian:* ${booking.alamatPenjemputan || 'Pool Ryokourent'}`,
    '',
    'Jika Kakak ingin memperpanjang masa sewa, mohon segera hubungi kami sebelum waktu sewa berakhir agar unit dapat diperpanjang tanpa denda keterlambatan.',
    'Terima kasih dan hati-hati di jalan! 🙏',
  ];

  const message = lines.join('\n');
  return `https://api.whatsapp.com/send?phone=${encodeURIComponent(customerPhone)}&text=${encodeURIComponent(message)}`;
}

/**
 * 9. Tautan WhatsApp: Notifikasi Unit Selesai Servis (Bagian 10 Baru)
 */
export function generateServiceDoneWhatsAppUrl(service: ServiceRecord, adminPhone: string): string {
  const targetPhone = normalizeWhatsAppNumber(adminPhone);

  const lines = [
    `*NOTIFIKASI UNIT SELESAI SERVIS — RYOKOURENT* 🔧✅`,
    `Laporan pemeliharaan armada:`,
    '',
    `*Kode Unit:* ${service.kodeUnit}`,
    `*Kategori Servis:* ${service.kategoriServis.toUpperCase().replace('_', ' ')}`,
    `*Tanggal Servis:* ${service.tanggal}`,
    `*Kilometer (KM):* ${service.kmMotor.toLocaleString('id-ID')} KM`,
    `*Biaya:* ${formatRupiah(service.biaya)}`,
    `*Bengkel / Mekanik:* ${service.bengkelMekanik}`,
    `*Keterangan:* ${service.keterangan}`,
    '',
    'Unit telah siap kembali beroperasi dan diparkir di Pool.',
  ];

  const message = lines.join('\n');
  return `https://api.whatsapp.com/send?phone=${encodeURIComponent(targetPhone)}&text=${encodeURIComponent(message)}`;
}

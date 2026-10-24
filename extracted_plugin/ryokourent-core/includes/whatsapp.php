<?php
/**
 * Generator Pesan & Tautan WhatsApp UTF-8 (`api.whatsapp.com`)
 *
 * Menerapkan:
 * - D-03 & D-09: Menggunakan `https://api.whatsapp.com/send` dengan `rawurlencode()` agar emoji & karakter UTF-8 aman.
 * - D-06: Menyertakan catatan konfirmasi otomatis jika jadwal ambil/kembali berada di luar jam operasional 07.00–23.00 WIB.
 * - D-21 & Opsi 2A: Mencantumkan Pool Area Layanan, Alamat Pengantaran, Alamat Penjemputan, & Jenis ID Pendukung (tanpa NIK).
 * - D-27: Mencantumkan ketentuan Denda ShortRent Step-Up 60 Menit (3j->6j->9j->12j; 12j = denda harian) bila kategori Jam dipilih.
 *
 * @package Ryokourent_Core
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Ambil Nomor WhatsApp Admin Aktif (Default: 6281234567890)
 */
function ryokourent_get_admin_whatsapp_number() {
	$phone = get_option( 'ryokourent_admin_whatsapp', '6281234567890' );
	$phone = preg_replace( '/[^0-9]/', '', (string) $phone );
	if ( strpos( $phone, '08' ) === 0 ) {
		$phone = '62' . substr( $phone, 1 );
	}
	return $phone ? $phone : '6281234567890';
}

/**
 * Bangun Teks Pesan & URL Redirect WhatsApp untuk Booking Baru
 */
function ryokourent_generate_whatsapp_booking_url( $booking_id ) {
	$booking_id = absint( $booking_id );
	$no_booking = get_post_meta( $booking_id, '_ryokou_no_booking', true );
	$nama       = get_post_meta( $booking_id, '_ryokou_nama', true );
	$nomor_wa   = get_post_meta( $booking_id, '_ryokou_nomor_wa', true );
	$tanda      = get_post_meta( $booking_id, '_ryokou_tanda_pelanggan', true );
	$tanda_lbl  = ( 'langganan' === $tanda ) ? 'Pelanggan Langganan (Repeat Order)' : 'Pelanggan Baru';
	$jenis_id   = get_post_meta( $booking_id, '_ryokou_jenis_id_pendukung', true );
	$pool       = get_post_meta( $booking_id, '_ryokou_pool', true );
	$pool_label = ( 'batu' === $pool ) ? 'Pool Batu (Diponegoro)' : 'Pool Malang (Dinoyo)';

	$alamat_antar  = get_post_meta( $booking_id, '_ryokou_alamat_pengantaran', true );
	$alamat_jemput = get_post_meta( $booking_id, '_ryokou_alamat_penjemputan', true );

	$motor_nama   = get_post_meta( $booking_id, '_ryokou_snapshot_nama_motor', true );
	$kat_tarif    = get_post_meta( $booking_id, '_ryokou_kategori_tarif', true );
	$label_durasi = get_post_meta( $booking_id, '_ryokou_label_durasi', true );
	$mulai        = get_post_meta( $booking_id, '_ryokou_jam_tanggal_mulai', true );
	$selesai      = get_post_meta( $booking_id, '_ryokou_jam_tanggal_selesai', true );
	$total_est    = absint( get_post_meta( $booking_id, '_ryokou_total_harga_estimasi', true ) );
	$luar_jam     = get_post_meta( $booking_id, '_ryokou_luar_jam_operasional', true );

	$lines   = array();
	$lines[] = 'Halo Admin *Ryokourent Malang & Batu*, saya ingin konfirmasi pemesanan sewa motor:';
	$lines[] = '';
	$lines[] = '*No. Booking:* ' . ( $no_booking ? $no_booking : '#' . $booking_id );
	$lines[] = '*Nama Penyewa:* ' . $nama;
	if ( $nomor_wa ) {
		$lines[] = '*No. WhatsApp / HP:* ' . $nomor_wa;
	}
	$lines[] = '*Status Pelanggan:* ' . $tanda_lbl;
	$lines[] = '*ID Pendukung (Pendamping KTP):* ' . ( $jenis_id ? $jenis_id : 'SIM_C' );
	$lines[] = '*Unit Motor:* ' . $motor_nama;
	$lines[] = '*Paket / Durasi:* ' . $label_durasi;
	$lines[] = '*Waktu Mulai:* ' . $mulai . ' WIB';
	$lines[] = '*Waktu Selesai:* ' . $selesai . ' WIB';
	$lines[] = '*Area / Pool Terdekat:* ' . $pool_label;
	$lines[] = '*Lokasi Pengantaran (Ambil):* ' . ( $alamat_antar ? $alamat_antar : $pool_label );
	$lines[] = '*Lokasi Penjemputan (Kembali):* ' . ( $alamat_jemput ? $alamat_jemput : $pool_label );
	$lines[] = '*Estimasi Total Sewa:* Rp ' . number_format( $total_est, 0, ',', '.' );
	$lines[] = '*Perlengkapan:* 2 Helm SNI & Jas Hujan';

	if ( 'jam' === $kat_tarif ) {
		$lines[] = '';
		$lines[] = '_*Ketentuan ShortRent (D-27): Keterlambatan >= 60 menit otomatis masuk kategori paket jam di atasnya (3j->6j->9j->12j). Untuk paket 12 jam, denda keterlambatan sama dengan denda harian._';
	}

	if ( '1' === (string) $luar_jam ) {
		$lines[] = '';
		$lines[] = '_*Catatan Jam Operasional (D-06): Jadwal ambil/kembali berada di luar jam reguler (07.00-23.00 WIB). Mohon konfirmasi kesepakatan layanan luar jam kerja._';
	}

	$lines[] = '';
	$lines[] = 'Mohon info ketersediaan unitnya. Terima kasih!';

	$message = implode( "\n", $lines );
	$phone   = ryokourent_get_admin_whatsapp_number();

	return 'https://api.whatsapp.com/send?phone=' . rawurlencode( $phone ) . '&text=' . rawurlencode( $message );
}

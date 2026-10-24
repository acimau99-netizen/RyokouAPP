<?php
/**
 * Kalkulasi Ketersediaan Armada Global, Kunci Atomik MySQL GET_LOCK, & AJAX Cek Stok Biner
 *
 * Menerapkan:
 * - D-04 & QA-14: Kunci atomik MySQL `GET_LOCK('ryokou_unit_lock_{id}', 5)` & `RELEASE_LOCK` di dalam blok `try...finally`.
 * - D-05: Indikator Stok Biner Tegas (`Tersedia` / `Habis`) tanpa mengekspos jumlah angka stok riil ke publik.
 * - D-17: Jeda Antar-Sewa (Turnaround Buffer) 90 menit (5400 detik) di kedua sisi rentang jadwal + penanganan unit terlambat kembali (`max(end_epoch, now)`).
 * - D-26: Pool hanya tempat parkir fisik; ketersediaan dihitung global dari seluruh unit aktif per model motor.
 * - QA-21: Endpoint AJAX `ryokourent_refresh_nonce` untuk mencegah kegagalan form pada halaman ter-cache.
 *
 * @package Ryokourent_Core
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

if ( ! defined( 'RYOKOURENT_TURNAROUND_BUFFER' ) ) {
	define( 'RYOKOURENT_TURNAROUND_BUFFER', 5400 ); // 90 menit = 5400 detik (D-17)
}

/**
 * 1. Kunci Atomik MySQL `GET_LOCK` & `RELEASE_LOCK` (D-04, QA-14)
 */
function ryokourent_acquire_unit_lock( $lock_key, $timeout = 5 ) {
	global $wpdb;
	$safe_key = 'ryokou_lock_' . preg_replace( '/[^a-zA-Z0-9_]/', '_', (string) $lock_key );
	$safe_key = substr( $safe_key, 0, 60 );
	$result   = $wpdb->get_var( $wpdb->prepare( 'SELECT GET_LOCK(%s, %d)', $safe_key, absint( $timeout ) ) );
	return ( '1' === (string) $result );
}

function ryokourent_release_unit_lock( $lock_key ) {
	global $wpdb;
	$safe_key = 'ryokou_lock_' . preg_replace( '/[^a-zA-Z0-9_]/', '_', (string) $lock_key );
	$safe_key = substr( $safe_key, 0, 60 );
	$wpdb->query( $wpdb->prepare( 'DO RELEASE_LOCK(%s)', $safe_key ) );
}

/**
 * Konversi string tanggal waktu ke Unix Epoch dengan Timezone `Asia/Jakarta` (D-24)
 */
function ryokourent_parse_wib_to_epoch( $datetime_str ) {
	if ( is_numeric( $datetime_str ) ) {
		return absint( $datetime_str );
	}
	$clean = str_replace( 'T', ' ', trim( (string) $datetime_str ) );
	if ( empty( $clean ) ) {
		return 0;
	}
	try {
		$tz = new DateTimeZone( 'Asia/Jakarta' );
		$dt = new DateTime( $clean, $tz );
		return $dt->getTimestamp();
	} catch ( Exception $e ) {
		return 0;
	}
}

/**
 * 2. Cek apakah 1 Unit Fisik Spesifik Bebas Bentrok pada Rentang Waktu `[req_start, req_end]` (D-17, D-26)
 *
 * Rumus Bentrok dengan Buffer 90 Menit (5400 detik):
 * Bentrok terjadi jika: `req_start < (existing_end_effective + 5400)` DAN `req_end > (existing_start - 5400)`
 * Di mana untuk status `ryokou_disewa`, `existing_end_effective = max(existing_end, now)` agar motor yang terlambat
 * kembali tidak dianggap bebas sebelum operator mengklik Selesai (D-17, F-06).
 */
function ryokourent_is_unit_available_for_range( $unit_id, $req_start_epoch, $req_end_epoch, $exclude_booking_id = 0 ) {
	$unit_id = absint( $unit_id );
	if ( ! $unit_id || $req_end_epoch <= $req_start_epoch ) {
		return false;
	}

	// Cek apakah unit sedang berstatus servis di `ryokou_unit` atau `ryokou_lacak`
	$status_servis = get_post_meta( $unit_id, '_ryokou_status_servis', true );
	$unit_post     = get_post( $unit_id );
	if ( ! $unit_post || 'ryokou_servis' === $unit_post->post_status || 'servis' === $status_servis ) {
		return false;
	}

	$track = ryokourent_get_unit_tracking_summary( $unit_id );
	if ( 'servis' === $track['status_posisi'] ) {
		return false;
	}

	// Cari seluruh transaksi aktif (`ryokou_approved` dan `ryokou_disewa`) yang memakai unit ini
	$active_bookings = get_posts(
		array(
			'post_type'      => 'penyewaan',
			'post_status'    => array( 'ryokou_approved', 'ryokou_disewa' ),
			'posts_per_page' => -1,
			'meta_query'     => array(
				array(
					'key'   => '_ryokou_unit_id',
					'value' => $unit_id,
				),
			),
		)
	);

	$now_epoch = time();

	foreach ( $active_bookings as $booking ) {
		if ( $exclude_booking_id && absint( $booking->ID ) === absint( $exclude_booking_id ) ) {
			continue;
		}

		$b_start = absint( get_post_meta( $booking->ID, '_ryokou_start_epoch', true ) );
		$b_end   = absint( get_post_meta( $booking->ID, '_ryokou_end_epoch', true ) );

		if ( ! $b_start ) {
			$b_start = ryokourent_parse_wib_to_epoch( get_post_meta( $booking->ID, '_ryokou_jam_tanggal_mulai', true ) );
		}
		if ( ! $b_end ) {
			$b_end = ryokourent_parse_wib_to_epoch( get_post_meta( $booking->ID, '_ryokou_jam_tanggal_selesai', true ) );
		}

		// Jika unit sedang dibawa penyewa (`ryokou_disewa`) dan melewati jadwal kembali, tahan ketersediaannya sampai Selesai (D-17)
		$effective_end = ( 'ryokou_disewa' === $booking->post_status ) ? max( $b_end, $now_epoch ) : $b_end;

		$buffered_start = $b_start - RYOKOURENT_TURNAROUND_BUFFER;
		$buffered_end   = $effective_end + RYOKOURENT_TURNAROUND_BUFFER;

		if ( $req_start_epoch < $buffered_end && $req_end_epoch > $buffered_start ) {
			return false;
		}
	}

	return true;
}

/**
 * 3. Ambil Daftar Seluruh Unit Fisik yang Tersedia Secara Global untuk Model Motor Tertentu (D-26)
 *
 * Sesuai D-26: Pool hanya tempat parkir fisik, sehingga pengecekan stok dilakukan secara global
 * pada seluruh unit aktif milik `motor_id`, lalu dilengkapi informasi posisi parkirnya dari `ryokou_lacak`.
 */
function ryokourent_get_available_units( $motor_id, $start_dt, $end_dt, $exclude_booking_id = 0 ) {
	$motor_id   = absint( $motor_id );
	$start_ep   = ryokourent_parse_wib_to_epoch( $start_dt );
	$end_ep     = ryokourent_parse_wib_to_epoch( $end_dt );

	if ( ! $motor_id || ! $start_ep || ! $end_ep || $end_ep <= $start_ep ) {
		return array();
	}

	$all_units = get_posts(
		array(
			'post_type'      => 'ryokou_unit',
			'post_status'    => 'publish',
			'posts_per_page' => -1,
			'meta_query'     => array(
				array(
					'key'   => '_ryokou_parent_motor_id',
					'value' => $motor_id,
				),
			),
		)
	);

	$available_units = array();

	foreach ( $all_units as $unit ) {
		if ( ryokourent_is_unit_available_for_range( $unit->ID, $start_ep, $end_ep, $exclude_booking_id ) ) {
			$kode_unit = get_post_meta( $unit->ID, '_ryokou_kode_unit', true );
			if ( ! $kode_unit ) {
				$kode_unit = $unit->post_title;
			}
			$plat  = get_post_meta( $unit->ID, '_ryokou_nomor_plat', true );
			$track = ryokourent_get_unit_tracking_summary( $unit->ID );

			$available_units[] = array(
				'unit_id'       => $unit->ID,
				'kode_unit'     => $kode_unit,
				'nomor_plat'    => $plat,
				'pool_parkir'   => $track['pool_parkir'],
				'status_posisi' => $track['status_posisi'],
				'label_dropdown'=> sprintf( '%s (%s) — %s', $kode_unit, $plat ? $plat : 'Tanpa Plat', $track['label_ringkas'] ),
			);
		}
	}

	return $available_units;
}

/**
 * 4. Evaluasi Indikator Stok Biner Publik (D-05: Hanya `tersedia` [Hijau] atau `habis` [Merah])
 */
function ryokourent_get_public_stock_indicator( $motor_id, $start_dt = '', $end_dt = '' ) {
	if ( empty( $start_dt ) || empty( $end_dt ) ) {
		$tz       = new DateTimeZone( 'Asia/Jakarta' );
		$tomorrow = new DateTime( '+1 day 08:00', $tz );
		$dayafter = new DateTime( '+2 days 08:00', $tz );
		$start_dt = $tomorrow->format( 'Y-m-d H:i' );
		$end_dt   = $dayafter->format( 'Y-m-d H:i' );
	}

	$avail = ryokourent_get_available_units( $motor_id, $start_dt, $end_dt );

	if ( ! empty( $avail ) ) {
		return array(
			'status' => 'tersedia',
			'warna'  => 'hijau',
			'label'  => __( 'Tersedia', 'ryokourent' ),
			'pesan'  => __( 'Unit tersedia (armada global Pool Malang & Pool Batu). Silakan lanjutkan pemesanan.', 'ryokourent' ),
		);
	}

	return array(
		'status' => 'habis',
		'warna'  => 'merah',
		'label'  => __( 'Habis', 'ryokourent' ),
		'pesan'  => __( 'Jadwal penuh pada jam tersebut. Anda tetap dapat mengirim pesanan via WhatsApp untuk konfirmasi alternatif unit/jadwal.', 'ryokourent' ),
	);
}

/**
 * 5. Endpoint AJAX Publik: Cek Stok Biner Live (`ryokourent_check_stock`)
 */
function ryokourent_ajax_check_stock() {
	$motor_id = isset( $_POST['motor_id'] ) ? absint( $_POST['motor_id'] ) : 0;
	$mulai    = isset( $_POST['tanggal_mulai'] ) ? sanitize_text_field( wp_unslash( $_POST['tanggal_mulai'] ) ) : '';
	$selesai  = isset( $_POST['tanggal_selesai'] ) ? sanitize_text_field( wp_unslash( $_POST['tanggal_selesai'] ) ) : '';

	if ( ! $motor_id ) {
		wp_send_json_error( array( 'message' => __( 'Pilih model motor terlebih dahulu.', 'ryokourent' ) ) );
	}

	$indicator = ryokourent_get_public_stock_indicator( $motor_id, $mulai, $selesai );
	wp_send_json_success( $indicator );
}
add_action( 'wp_ajax_ryokourent_check_stock', 'ryokourent_ajax_check_stock' );
add_action( 'wp_ajax_nopriv_ryokourent_check_stock', 'ryokourent_ajax_check_stock' );

/**
 * 6. Endpoint AJAX Publik: Refresh Nonce & Signed Time Token untuk Halaman Ter-Cache (QA-21)
 */
function ryokourent_ajax_refresh_nonce() {
	$issued_at  = time();
	$time_token = $issued_at . '.' . wp_hash( 'ryokou_form_time_' . $issued_at );

	wp_send_json_success(
		array(
			'nonce'      => wp_create_nonce( 'ryokourent_public_booking_nonce' ),
			'time_token' => $time_token,
		)
	);
}
add_action( 'wp_ajax_ryokourent_refresh_nonce', 'ryokourent_ajax_refresh_nonce' );
add_action( 'wp_ajax_nopriv_ryokourent_refresh_nonce', 'ryokourent_ajax_refresh_nonce' );

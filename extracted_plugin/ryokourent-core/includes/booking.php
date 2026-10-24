<?php
/**
 * Transaksi Booking, Keamanan Anti-Bot & UU PDP, State Machine 4 Status, Tukar Unit, & Kalkulator Denda D-27
 *
 * Menerapkan:
 * - D-03 & QA-01: Generator nomor booking atomik `RYK-YYYYMMDD-XXX` di dalam MySQL `GET_LOCK`.
 * - D-04: State Machine 4 Status (`ryokou_booking` -> `ryokou_approved` -> `ryokou_disewa` -> `ryokou_selesai`).
 * - D-10 & D-21: Honeypot, Signed Time Token >= 4 detik, Dual Rate Limit (5/10m per hashed IP + 50/jam global), & Blokir NIK 16 Digit.
 * - D-19: Aksi Tukar Unit Berkala (`ryokourent_tukar_unit`) untuk sewa jangka panjang dengan sinkronisasi otomatis ke `ryokou_lacak`.
 * - D-20 & F-21: Reject/Cancel = Hapus Permanen 2 Langkah (diblokir jika status sudah `ryokou_disewa`).
 * - D-26 & Opsi 3A: Setiap transisi status menyinkronkan baris tunggal unit di CPT `ryokou_lacak` (Parkir / Servis / Disewa).
 * - D-27: Kalkulator Denda ShortRent Step-Up 60 Menit (3j->6j->9j->12j) & ShortRent 12 Jam = Denda Harian (`_ryokou_denda_harian`).
 *
 * @package Ryokourent_Core
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * 1. Generator Nomor Booking Atomik `RYK-YYYYMMDD-XXX` (D-03, QA-01)
 */
function ryokourent_generate_booking_number() {
	$tz       = new DateTimeZone( 'Asia/Jakarta' );
	$now      = new DateTime( 'now', $tz );
	$date_str = $now->format( 'Ymd' );
	$lock_key = 'booking_seq_' . $date_str;

	$locked = ryokourent_acquire_unit_lock( $lock_key, 5 );
	try {
		$opt_key = 'ryokou_seq_' . $date_str;
		$seq     = absint( get_option( $opt_key, 0 ) ) + 1;
		update_option( $opt_key, $seq, false );
		return sprintf( 'RYK-%s-%03d', $date_str, $seq );
	} finally {
		if ( $locked ) {
			ryokourent_release_unit_lock( $lock_key );
		}
	}
}

/**
 * 2. Kalkulator Denda Keterlambatan (D-27: ShortRent Step-Up 60 Menit & 12 Jam = Denda Harian)
 *
 * Aturan D-27:
 * - Kategori Jam (ShortRent):
 *   a) 3 Jam, 6 Jam, 9 Jam: Keterlambatan >= 60 menit otomatis masuk ke kategori paket jam di atasnya:
 *      - 3 Jam telat >= 60 mnt -> masuk 6 Jam (denda = harga_6jam - harga_3jam; jika lewat batas 6 jam + 60 mnt naik lagi ke 9 jam -> 12 jam).
 *      - 6 Jam telat >= 60 mnt -> masuk 9 Jam (denda = harga_9jam - harga_6jam; jika lewat batas 9 jam + 60 mnt naik ke 12 jam).
 *      - 9 Jam telat >= 60 mnt -> masuk 12 Jam (denda = harga_12jam - harga_9jam).
 *      Jika keterlambatan melampaui 12 jam + 60 menit, kelebihan jam di atas 12 jam dikenakan denda harian per jam.
 *   b) 12 Jam: Denda keterlambatan (>= 60 menit) sama dengan denda harian (`_ryokou_denda_harian` per jam).
 * - Kategori Harian / Mingguan / Paket / Kustom:
 *   Toleransi 90 menit; keterlambatan > 90 menit dikenakan `_ryokou_denda_harian` per jam (pembulatan ke atas).
 */
function ryokourent_calculate_overtime_penalty( $booking_id, $actual_return_epoch = 0 ) {
	$booking_id = absint( $booking_id );
	$motor_id   = absint( get_post_meta( $booking_id, '_ryokou_motor_id', true ) );
	$end_epoch  = absint( get_post_meta( $booking_id, '_ryokou_end_epoch', true ) );

	if ( ! $end_epoch ) {
		$end_epoch = ryokourent_parse_wib_to_epoch( get_post_meta( $booking_id, '_ryokou_jam_tanggal_selesai', true ) );
	}

	if ( ! $actual_return_epoch ) {
		$selesai_at = absint( get_post_meta( $booking_id, '_ryokou_selesai_at', true ) );
		$actual_return_epoch = $selesai_at ? $selesai_at : time();
	}

	$pricing      = ryokourent_get_motor_tiered_pricing( $motor_id );
	$denda_harian = $pricing['denda_harian']; // Default Rp 20.000 / jam

	if ( ! $end_epoch || $actual_return_epoch <= $end_epoch ) {
		return array(
			'terlambat'     => false,
			'menit_telat'   => 0,
			'nominal_denda' => 0,
			'denda_format'  => 'Rp 0 (Tepat Waktu)',
			'keterangan'    => __( 'Tepat waktu / belum melewati jadwal kembali.', 'ryokourent' ),
		);
	}

	$late_seconds = $actual_return_epoch - $end_epoch;
	$late_minutes = (int) floor( $late_seconds / 60 );

	$kat_tarif      = get_post_meta( $booking_id, '_ryokou_kategori_tarif', true );
	$pilihan_durasi = get_post_meta( $booking_id, '_ryokou_pilihan_durasi', true );

	// KASUS A: Kategori ShortRent Jam (D-27)
	if ( 'jam' === $kat_tarif || in_array( $pilihan_durasi, array( '3_jam', '6_jam', '9_jam', '12_jam' ), true ) ) {
		if ( $late_minutes < 60 ) {
			return array(
				'terlambat'     => false,
				'menit_telat'   => $late_minutes,
				'nominal_denda' => 0,
				'denda_format'  => 'Rp 0 (Toleransi < 60 mnt)',
				'keterangan'    => sprintf( __( 'Terlambat %d menit (di bawah batas 60 menit ShortRent D-27).', 'ryokourent' ), $late_minutes ),
			);
		}

		$sub_jam = $pricing['kategori']['jam']['sub'];
		$p3      = $sub_jam['3_jam']['harga'];
		$p6      = $sub_jam['6_jam']['harga'];
		$p9      = $sub_jam['9_jam']['harga'];
		$p12     = $sub_jam['12_jam']['harga'];

		// ShortRent 12 Jam -> Denda sama dengan Denda Harian (D-27)
		if ( '12_jam' === $pilihan_durasi ) {
			$late_hours = (int) ceil( $late_minutes / 60 );
			$nominal    = $late_hours * $denda_harian;
			return array(
				'terlambat'     => true,
				'menit_telat'   => $late_minutes,
				'nominal_denda' => $nominal,
				'denda_format'  => 'Rp ' . number_format( $nominal, 0, ',', '.' ),
				'keterangan'    => sprintf( __( 'ShortRent 12 Jam telat %d mnt (%d jam) -> Denda Harian (%s/jam) [D-27].', 'ryokourent' ), $late_minutes, $late_hours, 'Rp ' . number_format( $denda_harian, 0, ',', '.' ) ),
			);
		}

		// ShortRent 3 Jam, 6 Jam, 9 Jam -> Step-Up Kategori Jam di Atasnya setiap lewat ambang +60 menit (D-27)
		$base_hours = 3;
		$base_price = $p3;
		if ( '6_jam' === $pilihan_durasi ) {
			$base_hours = 6;
			$base_price = $p6;
		} elseif ( '9_jam' === $pilihan_durasi ) {
			$base_hours = 9;
			$base_price = $p9;
		}

		$total_used_minutes = ( $base_hours * 60 ) + $late_minutes;

		// Tentukan naik ke tier mana berdasarkan total waktu pemakaian (tiap tier naik saat lewat +60 menit)
		if ( $base_hours === 3 && $total_used_minutes < ( 6 * 60 + 60 ) ) {
			$target_tier  = '6 Jam';
			$nominal      = max( 0, $p6 - $base_price );
		} elseif ( $base_hours <= 6 && $total_used_minutes < ( 9 * 60 + 60 ) ) {
			$target_tier  = '9 Jam';
			$nominal      = max( 0, $p9 - $base_price );
		} elseif ( $total_used_minutes < ( 12 * 60 + 60 ) ) {
			$target_tier  = '12 Jam';
			$nominal      = max( 0, $p12 - $base_price );
		} else {
			// Sudah naik sampai 12 Jam dan masih lewat >= 60 menit di atas 12 Jam -> tambah denda harian
			$extra_mins  = $total_used_minutes - ( 12 * 60 );
			$extra_hours = (int) ceil( $extra_mins / 60 );
			$target_tier = '12 Jam + ' . $extra_hours . ' Jam Denda Harian';
			$nominal     = max( 0, $p12 - $base_price ) + ( $extra_hours * $denda_harian );
		}

		return array(
			'terlambat'     => true,
			'menit_telat'   => $late_minutes,
			'nominal_denda' => $nominal,
			'denda_format'  => 'Rp ' . number_format( $nominal, 0, ',', '.' ),
			'keterangan'    => sprintf( __( 'ShortRent %d Jam telat %d mnt (>=60 mnt) -> Masuk Kategori %s [D-27].', 'ryokourent' ), $base_hours, $late_minutes, $target_tier ),
		);
	}

	// KASUS B: Kategori Harian / Mingguan / Paket (Toleransi 90 Menit)
	if ( $late_minutes <= 90 ) {
		return array(
			'terlambat'     => false,
			'menit_telat'   => $late_minutes,
			'nominal_denda' => 0,
			'denda_format'  => 'Rp 0 (Toleransi <= 90 mnt)',
			'keterangan'    => sprintf( __( 'Terlambat %d menit (masih dalam toleransi 90 menit sewa harian).', 'ryokourent' ), $late_minutes ),
		);
	}

	$late_hours = (int) ceil( $late_minutes / 60 );
	$nominal    = $late_hours * $denda_harian;

	return array(
		'terlambat'     => true,
		'menit_telat'   => $late_minutes,
		'nominal_denda' => $nominal,
		'denda_format'  => 'Rp ' . number_format( $nominal, 0, ',', '.' ),
		'keterangan'    => sprintf( __( 'Sewa Harian telat %d mnt (%d jam) x %s/jam.', 'ryokourent' ), $late_minutes, $late_hours, 'Rp ' . number_format( $denda_harian, 0, ',', '.' ) ),
	);
}

/**
 * 3. Endpoint AJAX Publik: Submit Pemesanan (`ryokourent_submit_booking`)
 *
 * Memeriksa:
 * 1) Nonce CSRF
 * 2) Honeypot `ryokou_hp_website` harus kosong (QA-03)
 * 3) Signed Time Token `ryokou_time_token` >= 4 detik (QA-04)
 * 4) Dual Rate Limit: Maks 5/10m per hashed `REMOTE_ADDR` & 50/jam global (D-10, QA-05)
 * 5) Tolak input yang mengandung 16 digit angka berurutan / NIK KTP (D-21, QA-02)
 */
function ryokourent_ajax_submit_booking() {
	// 1. Cek Nonce
	$nonce = isset( $_POST['nonce'] ) ? sanitize_text_field( wp_unslash( $_POST['nonce'] ) ) : '';
	if ( ! wp_verify_nonce( $nonce, 'ryokourent_public_booking_nonce' ) ) {
		wp_send_json_error( array( 'message' => __( 'Sesi keamanan kadaluarsa. Silakan muat ulang halaman.', 'ryokourent' ) ) );
	}

	// 2. Cek Honeypot (QA-03)
	$honeypot = isset( $_POST['ryokou_hp_website'] ) ? trim( sanitize_text_field( wp_unslash( $_POST['ryokou_hp_website'] ) ) ) : '';
	if ( ! empty( $honeypot ) ) {
		wp_send_json_error( array( 'message' => __( 'Permintaan ditolak oleh sistem proteksi otomatis.', 'ryokourent' ) ) );
	}

	// 3. Cek Signed Time Token >= 4 detik (QA-04)
	$time_token = isset( $_POST['ryokou_time_token'] ) ? sanitize_text_field( wp_unslash( $_POST['ryokou_time_token'] ) ) : '';
	$parts      = explode( '.', $time_token );
	if ( count( $parts ) !== 2 ) {
		wp_send_json_error( array( 'message' => __( 'Token waktu form tidak valid.', 'ryokourent' ) ) );
	}
	$issued_at = absint( $parts[0] );
	$expected  = wp_hash( 'ryokou_form_time_' . $issued_at );
	if ( ! hash_equals( $expected, $parts[1] ) || ( time() - $issued_at ) < 4 ) {
		wp_send_json_error( array( 'message' => __( 'Pengisian form terlalu cepat (< 4 detik). Mohon periksa kembali data Anda.', 'ryokourent' ) ) );
	}

	// 4. Dual Rate Limit menggunakan hash satu arah dari REMOTE_ADDR tanpa menyimpan IP di database (D-10, D-21, QA-05)
	$remote_ip = isset( $_SERVER['REMOTE_ADDR'] ) ? sanitize_text_field( wp_unslash( $_SERVER['REMOTE_ADDR'] ) ) : '0.0.0.0';
	$ip_hash   = substr( wp_hash( 'ryokou_rl_' . $remote_ip ), 0, 16 );
	$ip_key    = 'ryokou_rl_ip_' . $ip_hash;
	$glob_key  = 'ryokou_rl_global_hour';

	$ip_count   = absint( get_transient( $ip_key ) );
	$glob_count = absint( get_transient( $glob_key ) );

	if ( $ip_count >= 5 || $glob_count >= 50 ) {
		wp_send_json_error( array( 'message' => __( 'Batas pengiriman pesanan tercapai. Silakan tunggu beberapa menit atau hubungi WhatsApp kami langsung.', 'ryokourent' ) ) );
	}

	// 5. Ambil & Validasi Field (Opsi 2A: Pool + Alamat Pengantaran + Alamat Penjemputan + Jenis ID Pendukung + WhatsApp + Tanda Pelanggan)
	$nama            = isset( $_POST['nama'] ) ? sanitize_text_field( wp_unslash( $_POST['nama'] ) ) : '';
	$nomor_wa        = isset( $_POST['nomor_wa'] ) ? sanitize_text_field( wp_unslash( $_POST['nomor_wa'] ) ) : '';
	$tanda_pelanggan = ( isset( $_POST['tanda_pelanggan'] ) && 'langganan' === $_POST['tanda_pelanggan'] ) ? 'langganan' : 'baru';
	$jenis_id        = isset( $_POST['jenis_id_pendukung'] ) ? sanitize_text_field( wp_unslash( $_POST['jenis_id_pendukung'] ) ) : 'SIM_C';
	$pool            = isset( $_POST['pool'] ) && 'batu' === $_POST['pool'] ? 'batu' : 'malang';
	$alamat_antar    = isset( $_POST['alamat_pengantaran'] ) ? sanitize_textarea_field( wp_unslash( $_POST['alamat_pengantaran'] ) ) : '';
	$alamat_jemput   = isset( $_POST['alamat_penjemputan'] ) ? sanitize_textarea_field( wp_unslash( $_POST['alamat_penjemputan'] ) ) : '';
	$motor_id        = isset( $_POST['motor_id'] ) ? absint( $_POST['motor_id'] ) : 0;
	$kat_tarif       = isset( $_POST['kategori_tarif'] ) ? sanitize_key( $_POST['kategori_tarif'] ) : 'harian';
	$pilihan_durasi  = isset( $_POST['pilihan_durasi'] ) ? sanitize_key( $_POST['pilihan_durasi'] ) : '1_hari';
	$label_durasi    = isset( $_POST['label_durasi'] ) ? sanitize_text_field( wp_unslash( $_POST['label_durasi'] ) ) : '1 Hari (24 Jam)';
	$tgl_mulai       = isset( $_POST['tanggal_mulai'] ) ? str_replace( 'T', ' ', sanitize_text_field( wp_unslash( $_POST['tanggal_mulai'] ) ) ) : '';
	$tgl_selesai     = isset( $_POST['tanggal_selesai'] ) ? str_replace( 'T', ' ', sanitize_text_field( wp_unslash( $_POST['tanggal_selesai'] ) ) ) : '';

	// Validasi Anti-NIK 16 Digit pada semua input teks (UU PDP D-21, QA-02)
	$combined_text = $nama . ' ' . $nomor_wa . ' ' . $alamat_antar . ' ' . $alamat_jemput;
	if ( preg_match( '/(?:\d[\s\-]?){16}/', $combined_text ) ) {
		wp_send_json_error( array( 'message' => __( 'Demi pelindungan data pribadi (UU PDP No. 27/2022), DILARANG menuliskan 16 digit NIK KTP pada formulir ini.', 'ryokourent' ) ) );
	}

	if ( empty( $nama ) || empty( $nomor_wa ) || ! $motor_id || empty( $tgl_mulai ) || empty( $tgl_selesai ) ) {
		wp_send_json_error( array( 'message' => __( 'Mohon lengkapi Nama, Nomor WhatsApp, Unit Motor, dan Jadwal Sewa.', 'ryokourent' ) ) );
	}

	$allowed_ids = array( 'KTM', 'SIM_C', 'SIM_A', 'PASPOR', 'NPWP', 'ID_KARYAWAN', 'LAINNYA' );
	if ( ! in_array( $jenis_id, $allowed_ids, true ) ) {
		$jenis_id = 'SIM_C';
	}

	$start_epoch = ryokourent_parse_wib_to_epoch( $tgl_mulai );
	$end_epoch   = ryokourent_parse_wib_to_epoch( $tgl_selesai );

	if ( ! $start_epoch || ! $end_epoch || $end_epoch <= $start_epoch ) {
		wp_send_json_error( array( 'message' => __( 'Waktu selesai harus lebih besar dari waktu mulai sewa.', 'ryokourent' ) ) );
	}

	// Hitung estimasi harga server-side
	$pricing   = ryokourent_get_motor_tiered_pricing( $motor_id );
	$total_est = $pricing['harga_utama_1hari'];
	if ( isset( $pricing['kategori'][ $kat_tarif ]['sub'][ $pilihan_durasi ]['harga'] ) ) {
		$total_est = absint( $pricing['kategori'][ $kat_tarif ]['sub'][ $pilihan_durasi ]['harga'] );
	} else {
		$days      = max( 1, (int) ceil( ( $end_epoch - $start_epoch ) / DAY_IN_SECONDS ) );
		$total_est = $days * $pricing['harga_utama_1hari'];
	}

	// Deteksi apakah jadwal di luar jam operasional 07.00 - 23.00 WIB (D-06)
	$tz        = new DateTimeZone( 'Asia/Jakarta' );
	$dt_start  = new DateTime( '@' . $start_epoch );
	$dt_start->setTimezone( $tz );
	$dt_end    = new DateTime( '@' . $end_epoch );
	$dt_end->setTimezone( $tz );
	$h_start   = (int) $dt_start->format( 'G' );
	$h_end     = (int) $dt_end->format( 'G' );
	$luar_jam  = ( $h_start < 7 || $h_start >= 23 || $h_end < 7 || $h_end >= 23 ) ? '1' : '0';

	$no_booking  = ryokourent_generate_booking_number();
	$motor_title = get_the_title( $motor_id );

	$booking_id = wp_insert_post(
		array(
			'post_type'   => 'penyewaan',
			'post_title'  => sprintf( '%s — %s (%s)', $no_booking, $nama, $motor_title ),
			'post_status' => 'ryokou_booking',
		)
	);

	if ( ! $booking_id || is_wp_error( $booking_id ) ) {
		wp_send_json_error( array( 'message' => __( 'Gagal menyimpan data pemesanan.', 'ryokourent' ) ) );
	}

	if ( empty( $alamat_antar ) ) {
		$alamat_antar = ( 'batu' === $pool ) ? 'Ambil di Pool Batu (Diponegoro)' : 'Ambil di Pool Malang (Dinoyo)';
	}
	if ( empty( $alamat_jemput ) ) {
		$alamat_jemput = ( 'batu' === $pool ) ? 'Kembali di Pool Batu (Diponegoro)' : 'Kembali di Pool Malang (Dinoyo)';
	}

	update_post_meta( $booking_id, '_ryokou_no_booking', $no_booking );
	update_post_meta( $booking_id, '_ryokou_nama', $nama );
	update_post_meta( $booking_id, '_ryokou_nomor_wa', $nomor_wa );
	update_post_meta( $booking_id, '_ryokou_tanda_pelanggan', $tanda_pelanggan );
	update_post_meta( $booking_id, '_ryokou_jenis_id_pendukung', $jenis_id );
	update_post_meta( $booking_id, '_ryokou_pool', $pool );
	update_post_meta( $booking_id, '_ryokou_alamat_pengantaran', $alamat_antar );
	update_post_meta( $booking_id, '_ryokou_alamat_penjemputan', $alamat_jemput );
	update_post_meta( $booking_id, '_ryokou_motor_id', $motor_id );
	update_post_meta( $booking_id, '_ryokou_snapshot_nama_motor', $motor_title );
	update_post_meta( $booking_id, '_ryokou_kategori_tarif', $kat_tarif );
	update_post_meta( $booking_id, '_ryokou_pilihan_durasi', $pilihan_durasi );
	update_post_meta( $booking_id, '_ryokou_label_durasi', $label_durasi );
	update_post_meta( $booking_id, '_ryokou_jam_tanggal_mulai', $tgl_mulai );
	update_post_meta( $booking_id, '_ryokou_jam_tanggal_selesai', $tgl_selesai );
	update_post_meta( $booking_id, '_ryokou_start_epoch', $start_epoch );
	update_post_meta( $booking_id, '_ryokou_end_epoch', $end_epoch );
	update_post_meta( $booking_id, '_ryokou_total_harga_estimasi', $total_est );
	update_post_meta( $booking_id, '_ryokou_luar_jam_operasional', $luar_jam );
	update_post_meta( $booking_id, '_ryokou_created_at', time() );

	// Increment Rate Limit Transients
	set_transient( $ip_key, $ip_count + 1, 10 * MINUTE_IN_SECONDS );
	set_transient( $glob_key, $glob_count + 1, HOUR_IN_SECONDS );

	$wa_url = ryokourent_generate_whatsapp_booking_url( $booking_id );

	wp_send_json_success(
		array(
			'booking_id'   => $booking_id,
			'no_booking'   => $no_booking,
			'whatsapp_url' => $wa_url,
		)
	);
}
add_action( 'wp_ajax_ryokourent_submit_booking', 'ryokourent_ajax_submit_booking' );
add_action( 'wp_ajax_nopriv_ryokourent_submit_booking', 'ryokourent_ajax_submit_booking' );

/**
 * 4. Handler Transisi State Machine Admin (`admin-post.php`)
 *
 * Aksi yang didukung:
 * - `approve`: `ryokou_booking` -> `ryokou_approved` (mengunci unit fisik di dalam MySQL `GET_LOCK`)
 * - `serah_terima`: `ryokou_approved` -> `ryokou_disewa` (menyinkronkan `ryokou_lacak` menjadi `disewa`)
 * - `tukar_unit`: mengganti unit fisik di tengah masa sewa (`D-19`), melepas unit lama ke `parkir`/`servis` dan mengunci unit baru ke `disewa`
 * - `selesai`: `ryokou_disewa` -> `ryokou_selesai` (menghitung denda akhir `D-27` & mengembalikan `ryokou_lacak` menjadi `parkir` di Pool tujuan)
 * - `cancel_delete`: menghapus permanen booking yang batal/ditolak (`D-20`), ditolak jika status `ryokou_disewa`
 */
function ryokourent_handle_booking_state_action() {
	if ( ! current_user_can( 'edit_posts' ) ) {
		wp_die( esc_html__( 'Anda tidak memiliki izin operasional.', 'ryokourent' ) );
	}

	$booking_id = isset( $_REQUEST['booking_id'] ) ? absint( $_REQUEST['booking_id'] ) : 0;
	$sub_action = isset( $_REQUEST['ryokou_action'] ) ? sanitize_key( $_REQUEST['ryokou_action'] ) : '';
	$nonce      = isset( $_REQUEST['_wpnonce'] ) ? sanitize_text_field( wp_unslash( $_REQUEST['_wpnonce'] ) ) : '';

	if ( ! $booking_id || ! wp_verify_nonce( $nonce, 'ryokou_booking_action_' . $booking_id ) ) {
		wp_die( esc_html__( 'Token keamanan tidak valid.', 'ryokourent' ) );
	}

	$post = get_post( $booking_id );
	if ( ! $post || 'penyewaan' !== $post->post_type ) {
		wp_die( esc_html__( 'Data penyewaan tidak ditemukan.', 'ryokourent' ) );
	}

	$redirect_url = admin_url( 'edit.php?post_type=penyewaan' );

	// A. APPROVE BOOKING & KUNCI UNIT FISIK (D-04, QA-14)
	if ( 'approve' === $sub_action ) {
		$unit_id     = isset( $_REQUEST['unit_id'] ) ? absint( $_REQUEST['unit_id'] ) : absint( get_post_meta( $booking_id, '_ryokou_unit_id', true ) );
		$start_epoch = absint( get_post_meta( $booking_id, '_ryokou_start_epoch', true ) );
		$end_epoch   = absint( get_post_meta( $booking_id, '_ryokou_end_epoch', true ) );

		if ( ! $unit_id ) {
			wp_safe_redirect( add_query_arg( 'ryokou_msg', 'err_no_unit', $redirect_url ) );
			exit;
		}

		$locked = ryokourent_acquire_unit_lock( 'unit_' . $unit_id, 5 );
		if ( ! $locked ) {
			wp_safe_redirect( add_query_arg( 'ryokou_msg', 'err_lock_busy', $redirect_url ) );
			exit;
		}

		try {
			if ( ! ryokourent_is_unit_available_for_range( $unit_id, $start_epoch, $end_epoch, $booking_id ) ) {
				wp_safe_redirect( add_query_arg( 'ryokou_msg', 'err_unit_conflict', $redirect_url ) );
				exit;
			}

			$kode_unit = get_post_meta( $unit_id, '_ryokou_kode_unit', true );
			update_post_meta( $booking_id, '_ryokou_unit_id', $unit_id );
			update_post_meta( $booking_id, '_ryokou_snapshot_kode_unit', $kode_unit );

			wp_update_post(
				array(
					'ID'          => $booking_id,
					'post_status' => 'ryokou_approved',
				)
			);
		} finally {
			ryokourent_release_unit_lock( 'unit_' . $unit_id );
		}

		wp_safe_redirect( add_query_arg( 'ryokou_msg', 'approved_ok', $redirect_url ) );
		exit;
	}

	// B. SERAH TERIMA UNIT KE PENYEWA (`ryokou_approved` -> `ryokou_disewa` + Sync `ryokou_lacak` D-26)
	if ( 'serah_terima' === $sub_action ) {
		$unit_id = absint( get_post_meta( $booking_id, '_ryokou_unit_id', true ) );
		if ( ! $unit_id ) {
			wp_safe_redirect( add_query_arg( 'ryokou_msg', 'err_no_unit', $redirect_url ) );
			exit;
		}

		update_post_meta( $booking_id, '_ryokou_disewa_at', time() );
		wp_update_post(
			array(
				'ID'          => $booking_id,
				'post_status' => 'ryokou_disewa',
			)
		);

		ryokourent_sync_unit_tracking(
			$unit_id,
			array(
				'status_posisi'   => 'disewa',
				'booking_id'      => $booking_id,
				'no_booking'      => get_post_meta( $booking_id, '_ryokou_no_booking', true ),
				'nama_penyewa'    => get_post_meta( $booking_id, '_ryokou_nama', true ),
				'tenggat_kembali' => get_post_meta( $booking_id, '_ryokou_jam_tanggal_selesai', true ),
				'catatan'         => 'Diserahkan kepada penyewa.',
			)
		);

		wp_safe_redirect( add_query_arg( 'ryokou_msg', 'disewa_ok', $redirect_url ) );
		exit;
	}

	// C. TUKAR UNIT BERKALA SAAT DISEWA (D-19 + Sync `ryokou_lacak` D-26)
	if ( 'tukar_unit' === $sub_action ) {
		$new_unit_id = isset( $_REQUEST['new_unit_id'] ) ? absint( $_REQUEST['new_unit_id'] ) : 0;
		$old_unit_id = absint( get_post_meta( $booking_id, '_ryokou_unit_id', true ) );
		$pool_return = isset( $_REQUEST['old_unit_pool'] ) && 'batu' === $_REQUEST['old_unit_pool'] ? 'batu' : 'malang';
		$start_epoch = time();
		$end_epoch   = absint( get_post_meta( $booking_id, '_ryokou_end_epoch', true ) );

		if ( ! $new_unit_id || $new_unit_id === $old_unit_id ) {
			wp_safe_redirect( add_query_arg( 'ryokou_msg', 'err_no_unit', $redirect_url ) );
			exit;
		}

		$locked = ryokourent_acquire_unit_lock( 'unit_' . $new_unit_id, 5 );
		if ( ! $locked ) {
			wp_safe_redirect( add_query_arg( 'ryokou_msg', 'err_lock_busy', $redirect_url ) );
			exit;
		}

		try {
			if ( ! ryokourent_is_unit_available_for_range( $new_unit_id, $start_epoch, max( $start_epoch + 3600, $end_epoch ), $booking_id ) ) {
				wp_safe_redirect( add_query_arg( 'ryokou_msg', 'err_unit_conflict', $redirect_url ) );
				exit;
			}

			$old_kode = get_post_meta( $old_unit_id, '_ryokou_kode_unit', true );
			$new_kode = get_post_meta( $new_unit_id, '_ryokou_kode_unit', true );

			update_post_meta( $booking_id, '_ryokou_unit_id', $new_unit_id );
			update_post_meta( $booking_id, '_ryokou_snapshot_kode_unit', $new_kode );

			$riwayat   = get_post_meta( $booking_id, '_ryokou_riwayat_tukar_unit', true );
			$tz        = new DateTimeZone( 'Asia/Jakarta' );
			$now_wib   = ( new DateTime( 'now', $tz ) )->format( 'Y-m-d H:i' );
			$log_entry = sprintf( '[%s WIB] Tukar Unit %s -> %s', $now_wib, $old_kode ? $old_kode : '#' . $old_unit_id, $new_kode );
			update_post_meta( $booking_id, '_ryokou_riwayat_tukar_unit', trim( $riwayat . "\n" . $log_entry ) );

			// Kembalikan unit lama ke posisi Parkir di Pool
			if ( $old_unit_id ) {
				ryokourent_sync_unit_tracking(
					$old_unit_id,
					array(
						'status_posisi' => 'parkir',
						'pool_parkir'   => $pool_return,
						'catatan'       => 'Selesai dipakai (ditukar dengan ' . $new_kode . ').',
					)
				);
			}

			// Set unit baru ke posisi Disewa
			ryokourent_sync_unit_tracking(
				$new_unit_id,
				array(
					'status_posisi'   => 'disewa',
					'booking_id'      => $booking_id,
					'no_booking'      => get_post_meta( $booking_id, '_ryokou_no_booking', true ),
					'nama_penyewa'    => get_post_meta( $booking_id, '_ryokou_nama', true ),
					'tenggat_kembali' => get_post_meta( $booking_id, '_ryokou_jam_tanggal_selesai', true ),
					'catatan'         => 'Unit pengganti (Tukar Unit D-19).',
				)
			);
		} finally {
			ryokourent_release_unit_lock( 'unit_' . $new_unit_id );
		}

		wp_safe_redirect( add_query_arg( 'ryokou_msg', 'tukar_ok', $redirect_url ) );
		exit;
	}

	// D. SELESAI SEWA (`ryokou_disewa` -> `ryokou_selesai` + Hitung Denda D-27 + Kembalikan Unit ke Parkir Pool D-26)
	if ( 'selesai' === $sub_action ) {
		$unit_id     = absint( get_post_meta( $booking_id, '_ryokou_unit_id', true ) );
		$pool_kembali = isset( $_REQUEST['pool_kembali'] ) && 'batu' === $_REQUEST['pool_kembali'] ? 'batu' : get_post_meta( $booking_id, '_ryokou_pool', true );
		if ( ! in_array( $pool_kembali, array( 'malang', 'batu' ), true ) ) {
			$pool_kembali = 'malang';
		}

		$now_epoch = time();
		update_post_meta( $booking_id, '_ryokou_selesai_at', $now_epoch );

		$denda_info = ryokourent_calculate_overtime_penalty( $booking_id, $now_epoch );
		update_post_meta( $booking_id, '_ryokou_denda_akhir', $denda_info['nominal_denda'] );
		update_post_meta( $booking_id, '_ryokou_denda_keterangan', $denda_info['keterangan'] );

		wp_update_post(
			array(
				'ID'          => $booking_id,
				'post_status' => 'ryokou_selesai',
			)
		);

		if ( $unit_id ) {
			ryokourent_sync_unit_tracking(
				$unit_id,
				array(
					'status_posisi' => 'parkir',
					'pool_parkir'   => $pool_kembali,
					'catatan'       => 'Selesai disewa (' . get_post_meta( $booking_id, '_ryokou_no_booking', true ) . ').',
				)
			);
		}

		wp_safe_redirect( add_query_arg( 'ryokou_msg', 'selesai_ok', $redirect_url ) );
		exit;
	}

	// E. REJECT / CANCEL BOOKING 2 LANGKAH (D-20, F-21: Dilarang jika status sudah `ryokou_disewa`)
	if ( 'cancel_delete' === $sub_action ) {
		if ( 'ryokou_disewa' === $post->post_status ) {
			wp_safe_redirect( add_query_arg( 'ryokou_msg', 'err_cannot_delete_active', $redirect_url ) );
			exit;
		}
		wp_delete_post( $booking_id, true );
		wp_safe_redirect( add_query_arg( 'ryokou_msg', 'deleted_ok', $redirect_url ) );
		exit;
	}

	wp_safe_redirect( $redirect_url );
	exit;
}
add_action( 'admin_post_ryokourent_booking_action', 'ryokourent_handle_booking_state_action' );

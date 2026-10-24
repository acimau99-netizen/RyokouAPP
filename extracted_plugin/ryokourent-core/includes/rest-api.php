<?php
/**
 * REST API Endpoints untuk Ryokourent Core (`/wp-json/ryokourent/v1/`)
 *
 * Menyediakan interoperabilitas penuh dengan front-end modern (React 19 / Next.js)
 * dan sistem eksternal:
 * - GET  /wp-json/ryokourent/v1/motor-models
 * - GET  /wp-json/ryokourent/v1/armada-units
 * - GET  /wp-json/ryokourent/v1/lacak-units
 * - GET  /wp-json/ryokourent/v1/penyewaan/available-units
 * - POST /wp-json/ryokourent/v1/penyewaan
 *
 * Menerapkan:
 * - D-05: Indikator Stok Biner
 * - D-12: Kode Unit Readonly
 * - D-17: Turnaround Buffer 90 Menit
 * - D-21: Kepatuhan UU PDP No. 27/2022 (Tanpa NIK KTP)
 * - D-26: Armada Global Tanpa Partisi Pool
 * - D-27: Aturan Tarif Bertingkat & Denda ShortRent Step-Up
 *
 * @package Ryokourent_Core
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

add_action( 'rest_api_init', 'ryokourent_register_rest_routes' );

function ryokourent_register_rest_routes() {
	$namespace = 'ryokourent/v1';

	// 1. GET /wp-json/ryokourent/v1/motor-models
	register_rest_route(
		$namespace,
		'/motor-models',
		array(
			'methods'             => WP_REST_Server::READABLE,
			'callback'            => 'ryokourent_rest_get_motor_models',
			'permission_callback' => '__return_true',
		)
	);

	// 2. GET /wp-json/ryokourent/v1/armada-units
	register_rest_route(
		$namespace,
		'/armada-units',
		array(
			'methods'             => WP_REST_Server::READABLE,
			'callback'            => 'ryokourent_rest_get_armada_units',
			'permission_callback' => '__return_true',
		)
	);

	// 3. GET /wp-json/ryokourent/v1/lacak-units
	register_rest_route(
		$namespace,
		'/lacak-units',
		array(
			'methods'             => WP_REST_Server::READABLE,
			'callback'            => 'ryokourent_rest_get_lacak_units',
			'permission_callback' => '__return_true',
		)
	);

	// 4. GET /wp-json/ryokourent/v1/penyewaan/available-units
	register_rest_route(
		$namespace,
		'/penyewaan/available-units',
		array(
			'methods'             => WP_REST_Server::READABLE,
			'callback'            => 'ryokourent_rest_get_available_units',
			'permission_callback' => '__return_true',
			'args'                => array(
				'motorId' => array(
					'required'          => true,
					'validate_callback' => function( $param ) {
						return is_numeric( $param );
					},
				),
				'start'   => array(
					'required' => true,
				),
				'end'     => array(
					'required' => true,
				),
			),
		)
	);

	// 5. POST /wp-json/ryokourent/v1/penyewaan
	register_rest_route(
		$namespace,
		'/penyewaan',
		array(
			'methods'             => WP_REST_Server::CREATABLE,
			'callback'            => 'ryokourent_rest_create_booking',
			'permission_callback' => '__return_true',
		)
	);

	// 6. POST /wp-json/ryokourent/v1/seed-motors (Terkunci khusus administrator - K-03)
	register_rest_route(
		$namespace,
		'/seed-motors',
		array(
			'methods'             => WP_REST_Server::CREATABLE,
			'callback'            => 'ryokourent_rest_seed_motors',
			'permission_callback' => function() {
				return current_user_can( 'manage_options' );
			},
		)
	);
}

/**
 * 1. Handler GET /motor-models (Sinkron Penuh dengan Model 003 React)
 */
function ryokourent_rest_get_motor_models() {
	$motors = ryokourent_get_all_motors_with_fallback();

	$data = array();
	foreach ( $motors as $p ) {
		$pricing     = ryokourent_get_motor_tiered_pricing( $p->ID );
		$fasilitas   = ! empty( $p->fasilitas ) ? $p->fasilitas : '2 Helm SNI + Jas Hujan';
		$spesifikasi = ! empty( $p->spesifikasi ) ? $p->spesifikasi : '';
		$thumb_url   = isset( $p->is_dummy ) && ! $p->is_dummy ? get_the_post_thumbnail_url( $p->ID, 'medium' ) : '';

		// Hitung stok biner default
		$stock = ryokourent_get_public_stock_indicator( $p->ID );

		$data[] = array(
			'id'                => $p->ID,
			'nama'              => $p->post_title,
			'namaModel'         => $p->post_title,
			'kategori'          => $p->kategori,
			'slug'              => $p->post_name,
			'gambar_url'        => $thumb_url ? $thumb_url : '',
			'imageUrl'          => $thumb_url ? $thumb_url : null,
			'harga_harian'      => $pricing['kategori']['harian']['sub']['1_hari']['harga'],
			'harga1Hari'        => $pricing['kategori']['harian']['sub']['1_hari']['harga'],
			'harga_1minggu'     => $pricing['kategori']['harian']['sub']['1_minggu']['harga'],
			'harga1Minggu'      => $pricing['kategori']['harian']['sub']['1_minggu']['harga'],
			'harga_2minggu'     => $pricing['kategori']['harian']['sub']['2_minggu']['harga'],
			'harga2Minggu'      => $pricing['kategori']['harian']['sub']['2_minggu']['harga'],
			'harga_12jam'       => $pricing['kategori']['jam']['sub']['12_jam']['harga'],
			'harga12Jam'        => $pricing['kategori']['jam']['sub']['12_jam']['harga'],
			'harga_9jam'        => $pricing['kategori']['jam']['sub']['9_jam']['harga'],
			'harga9Jam'         => $pricing['kategori']['jam']['sub']['9_jam']['harga'],
			'harga_6jam'        => $pricing['kategori']['jam']['sub']['6_jam']['harga'],
			'harga6Jam'         => $pricing['kategori']['jam']['sub']['6_jam']['harga'],
			'harga_3jam'        => $pricing['kategori']['jam']['sub']['3_jam']['harga'],
			'harga3Jam'         => $pricing['kategori']['jam']['sub']['3_jam']['harga'],
			'denda_harian'      => $pricing['denda_harian'],
			'dendaHarianPerJam' => $pricing['denda_harian'],
			'fasilitas'         => $fasilitas,
			'spesifikasi'       => $spesifikasi,
			'stok_tersedia'     => ( 'tersedia' === $stock['status'] ),
			'stok_status'       => $stock['status'],
			'stok_label'        => $stock['label'],
			'stok_pesan'        => $stock['pesan'],
			'isActive'          => true,
		);
	}

	return new WP_REST_Response(
		array(
			'success' => true,
			'data'    => $data,
		),
		200
	);
}

/**
 * Handler POST /seed-motors (Seeding contoh model 003 ke database WP)
 */
function ryokourent_rest_seed_motors( $request ) {
	$params = $request->get_json_params();
	$force  = ! empty( $params['force'] );
	$res    = ryokourent_seed_sample_motors( $force );

	return new WP_REST_Response( $res, 200 );
}

/**
 * 2. Handler GET /armada-units
 */
function ryokourent_rest_get_armada_units() {
	$units = get_posts(
		array(
			'post_type'      => 'ryokou_unit',
			'post_status'    => 'publish',
			'posts_per_page' => -1,
			'orderby'        => 'title',
			'order'          => 'ASC',
		)
	);

	$data = array();
	foreach ( $units as $u ) {
		$kode_unit   = get_post_meta( $u->ID, '_ryokou_kode_unit', true );
		$parent_id   = absint( get_post_meta( $u->ID, '_ryokou_parent_motor_id', true ) );
		$motor_title = $parent_id ? get_the_title( $parent_id ) : '-';
		$plat        = get_post_meta( $u->ID, '_ryokou_nomor_plat', true );
		$warna       = get_post_meta( $u->ID, '_ryokou_warna', true );
		$pool        = get_post_meta( $u->ID, '_ryokou_pool_lokasi', true );
		$servis      = get_post_meta( $u->ID, '_ryokou_status_servis', true );
		$bengkel     = get_post_meta( $u->ID, '_ryokou_nama_bengkel', true );
		$track       = ryokourent_get_unit_tracking_summary( $u->ID );

		$data[] = array(
			'id'              => $u->ID,
			'kode_unit'       => $kode_unit ? $kode_unit : $u->post_title,
			'parent_motor_id' => $parent_id,
			'motor_nama'      => $motor_title,
			'nomor_plat'      => $plat ? $plat : '-',
			'warna'           => $warna ? $warna : '-',
			'pool_lokasi'     => $pool ? $pool : 'malang',
			'status_servis'   => $servis ? $servis : 'aktif',
			'nama_bengkel'    => $bengkel ? $bengkel : '',
			'status_posisi'   => $track['status_posisi'],
			'label_ringkas'   => $track['label_ringkas'],
		);
	}

	return new WP_REST_Response(
		array(
			'success' => true,
			'data'    => $data,
		),
		200
	);
}

/**
 * 3. Handler GET /lacak-units
 */
function ryokourent_rest_get_lacak_units() {
	$units = get_posts(
		array(
			'post_type'      => 'ryokou_unit',
			'post_status'    => 'publish',
			'posts_per_page' => -1,
			'orderby'        => 'title',
			'order'          => 'ASC',
		)
	);

	$data = array();
	foreach ( $units as $u ) {
		$kode_unit   = get_post_meta( $u->ID, '_ryokou_kode_unit', true );
		$parent_id   = absint( get_post_meta( $u->ID, '_ryokou_parent_motor_id', true ) );
		$motor_title = $parent_id ? get_the_title( $parent_id ) : '-';
		$plat        = get_post_meta( $u->ID, '_ryokou_nomor_plat', true );
		$track       = ryokourent_get_unit_tracking_summary( $u->ID );

		$data[] = array(
			'unit_id'          => $u->ID,
			'kode_unit'        => $kode_unit ? $kode_unit : $u->post_title,
			'motor_nama'       => $motor_title,
			'nomor_plat'       => $plat ? $plat : '-',
			'status_posisi'    => $track['status_posisi'],
			'pool_parkir'      => $track['pool_parkir'],
			'nama_bengkel'     => $track['nama_bengkel'],
			'no_booking_aktif' => $track['no_booking_aktif'],
			'label_ringkas'    => $track['label_ringkas'],
			'updated_at'       => $track['updated_at'],
		);
	}

	return new WP_REST_Response(
		array(
			'success' => true,
			'data'    => $data,
		),
		200
	);
}

/**
 * 4. Handler GET /penyewaan/available-units
 */
function ryokourent_rest_get_available_units( $request ) {
	$motor_id = absint( $request->get_param( 'motorId' ) );
	$start    = sanitize_text_field( $request->get_param( 'start' ) );
	$end      = sanitize_text_field( $request->get_param( 'end' ) );

	$units = ryokourent_get_available_units( $motor_id, $start, $end );

	return new WP_REST_Response(
		array(
			'success' => true,
			'data'    => $units,
		),
		200
	);
}

/**
 * 5. Handler POST /penyewaan
 */
function ryokourent_rest_create_booking( $request ) {
	$params = $request->get_json_params();
	if ( empty( $params ) ) {
		$params = $request->get_body_params();
	}

	$nama            = isset( $params['namaPenyewa'] ) ? sanitize_text_field( $params['namaPenyewa'] ) : ( isset( $params['nama'] ) ? sanitize_text_field( $params['nama'] ) : '' );
	$nomor_wa        = isset( $params['nomorWa'] ) ? sanitize_text_field( $params['nomorWa'] ) : ( isset( $params['nomor_wa'] ) ? sanitize_text_field( $params['nomor_wa'] ) : '' );
	$tanda_pelanggan = ( isset( $params['tandaPelanggan'] ) && 'langganan' === $params['tandaPelanggan'] ) || ( isset( $params['tanda_pelanggan'] ) && 'langganan' === $params['tanda_pelanggan'] ) ? 'langganan' : 'baru';
	$jenis_id        = isset( $params['jenisIdPendukung'] ) ? sanitize_text_field( $params['jenisIdPendukung'] ) : ( isset( $params['jenis_id_pendukung'] ) ? sanitize_text_field( $params['jenis_id_pendukung'] ) : 'SIM_C' );
	$motor_id        = isset( $params['motorId'] ) ? absint( $params['motorId'] ) : ( isset( $params['motor_id'] ) ? absint( $params['motor_id'] ) : 0 );
	$pool            = ( isset( $params['pool'] ) && 'batu' === $params['pool'] ) ? 'batu' : 'malang';
	$alamat_antar    = isset( $params['alamatPengantaran'] ) ? sanitize_textarea_field( $params['alamatPengantaran'] ) : ( isset( $params['alamat_pengantaran'] ) ? sanitize_textarea_field( $params['alamat_pengantaran'] ) : '' );
	$alamat_jemput   = isset( $params['alamatPenjemputan'] ) ? sanitize_textarea_field( $params['alamatPenjemputan'] ) : ( isset( $params['alamat_penjemputan'] ) ? sanitize_textarea_field( $params['alamat_penjemputan'] ) : '' );
	$kat_tarif       = isset( $params['kategoriTarif'] ) ? sanitize_key( $params['kategoriTarif'] ) : ( isset( $params['kategori_tarif'] ) ? sanitize_key( $params['kategori_tarif'] ) : 'harian' );
	$pilihan_durasi  = isset( $params['pilihanDurasi'] ) ? sanitize_key( $params['pilihanDurasi'] ) : ( isset( $params['pilihan_durasi'] ) ? sanitize_key( $params['pilihan_durasi'] ) : '1_hari' );
	$label_durasi    = isset( $params['labelDurasi'] ) ? sanitize_text_field( $params['labelDurasi'] ) : ( isset( $params['label_durasi'] ) ? sanitize_text_field( $params['label_durasi'] ) : '1 Hari (24 Jam)' );
	$tgl_mulai       = isset( $params['jamTanggalMulai'] ) ? str_replace( 'T', ' ', sanitize_text_field( $params['jamTanggalMulai'] ) ) : ( isset( $params['tanggal_mulai'] ) ? str_replace( 'T', ' ', sanitize_text_field( $params['tanggal_mulai'] ) ) : '' );
	$tgl_selesai     = isset( $params['jamTanggalSelesai'] ) ? str_replace( 'T', ' ', sanitize_text_field( $params['jamTanggalSelesai'] ) ) : ( isset( $params['tanggal_selesai'] ) ? str_replace( 'T', ' ', sanitize_text_field( $params['tanggal_selesai'] ) ) : '' );

	// Validasi Anti-NIK 16 Digit (UU PDP D-21)
	$combined = $nama . ' ' . $nomor_wa . ' ' . $alamat_antar . ' ' . $alamat_jemput;
	if ( preg_match( '/(?:\d[\s\-]?){16}/', $combined ) ) {
		return new WP_REST_Response(
			array(
				'success' => false,
				'message' => 'Demi perlindungan data pribadi (UU PDP No. 27/2022), dilarang mencantumkan 16 digit NIK KTP.',
			),
			400
		);
	}

	if ( empty( $nama ) || empty( $nomor_wa ) || ! $motor_id || empty( $tgl_mulai ) || empty( $tgl_selesai ) ) {
		return new WP_REST_Response(
			array(
				'success' => false,
				'message' => 'Lengkapi Nama, Nomor WhatsApp, Model Motor, dan Jadwal Sewa.',
			),
			400
		);
	}

	$start_epoch = ryokourent_parse_wib_to_epoch( $tgl_mulai );
	$end_epoch   = ryokourent_parse_wib_to_epoch( $tgl_selesai );

	if ( ! $start_epoch || ! $end_epoch || $end_epoch <= $start_epoch ) {
		return new WP_REST_Response(
			array(
				'success' => false,
				'message' => 'Waktu selesai harus lebih besar dari waktu mulai sewa.',
			),
			400
		);
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

	// Deteksi Luar Jam Operasional 07.00 - 23.00 WIB (D-06)
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
		return new WP_REST_Response(
			array(
				'success' => false,
				'message' => 'Gagal menyimpan pesanan.',
			),
			500
		);
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

	$wa_url = ryokourent_generate_whatsapp_booking_url( $booking_id );

	return new WP_REST_Response(
		array(
			'success' => true,
			'data'    => array(
				'booking_id'              => $booking_id,
				'no_booking'              => $no_booking,
				'nama'                    => $nama,
				'nomor_wa'                => $nomor_wa,
				'tanda_pelanggan'         => $tanda_pelanggan,
				'jenis_id_pendukung'      => $jenis_id,
				'motor_id'                => $motor_id,
				'motor_nama'              => $motor_title,
				'pool'                    => $pool,
				'alamat_pengantaran'      => $alamat_antar,
				'alamat_penjemputan'      => $alamat_jemput,
				'total_harga_estimasi'    => $total_est,
				'status'                  => 'booking',
				'whatsapp_url'            => $wa_url,
				'luar_jam_operasional'    => ( '1' === (string) $luar_jam ),
			),
		),
		201
	);
}

<?php
/**
 * Metaboxes, Penyimpanan Meta 5 CPT, Validasi Anti-NIK (UU PDP D-21), & Auto-Sync 1-Baris CPT Lacak Unit (D-26, Opsi 3A)
 *
 * Menerapkan:
 * - D-12: `_ryokou_kode_unit` bersifat unik & readonly permanen setelah unit fisik pertama kali disimpan.
 * - D-18: Tarif 2 Kategori (Harian: 1 hari, 1 minggu, 2 minggu; Jam/ShortRent: 12, 9, 6, 3 jam) + CPT `ryokou_paket`.
 * - D-21: Filter sanitasi anti-16 digit NIK pada seluruh field teks untuk kepatuhan UU PDP No. 27/2022.
 * - D-26 & Opsi 3A: Setiap `ryokou_unit` memiliki tepat 1 baris pasangan di `ryokou_lacak` yang disinkronkan otomatis.
 * - D-27: Meta `_ryokou_denda_harian` (default Rp20.000/jam) berlaku untuk Sewa Harian & ShortRent 12 Jam.
 *
 * @package Ryokourent_Core
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Helper: Sanitasi teks & blokir pola 16 digit angka berurutan (Anti-NIK UU PDP D-21)
 */
function ryokourent_sanitize_text_no_nik( $text ) {
	$clean = sanitize_text_field( $text );
	// Jika mengandung 16 digit angka berurutan (dengan atau tanpa spasi/strip), sensor otomatis
	if ( preg_match( '/(?:\d[\s\-]?){16}/', $clean ) ) {
		$clean = preg_replace( '/(?:\d[\s\-]?){16}/', '[SENSOR-ANTI-NIK-UU-PDP]', $clean );
	}
	return $clean;
}

/**
 * Helper Inti D-26 & Opsi 3A: Sinkronisasi 1-Unit-1-Baris di CPT `ryokou_lacak`
 *
 * Setiap unit fisik (`ryokou_unit`) hanya memiliki tepat 1 post di `ryokou_lacak`.
 * Saat posisi unit berubah (Parkir Pool / Servis Bengkel / Sedang Disewa), baris tersebut langsung diperbarui.
 *
 * @param int   $unit_id ID post `ryokou_unit`.
 * @param array $args    Data posisi terbaru.
 * @return int|false     ID post `ryokou_lacak`.
 */
function ryokourent_sync_unit_tracking( $unit_id, $args = array() ) {
	$unit_id = absint( $unit_id );
	if ( ! $unit_id || 'ryokou_unit' !== get_post_type( $unit_id ) ) {
		return false;
	}

	$kode_unit = get_post_meta( $unit_id, '_ryokou_kode_unit', true );
	if ( ! $kode_unit ) {
		$kode_unit = get_the_title( $unit_id );
	}
	$motor_id    = absint( get_post_meta( $unit_id, '_ryokou_parent_motor_id', true ) );
	$motor_title = $motor_id ? get_the_title( $motor_id ) : __( 'Tanpa Model', 'ryokourent' );

	// Cari baris `ryokou_lacak` yang sudah ada untuk unit ini (Opsi 3A: 1 baris per unit)
	$existing = get_posts(
		array(
			'post_type'      => 'ryokou_lacak',
			'post_status'    => array( 'publish', 'draft', 'private' ),
			'posts_per_page' => 1,
			'fields'         => 'ids',
			'meta_query'     => array(
				array(
					'key'   => '_ryokou_lacak_unit_id',
					'value' => $unit_id,
				),
			),
		)
	);

	$lacak_id = ! empty( $existing ) ? absint( $existing[0] ) : 0;

	$status_posisi = isset( $args['status_posisi'] ) ? sanitize_key( $args['status_posisi'] ) : '';
	if ( ! in_array( $status_posisi, array( 'parkir', 'servis', 'disewa' ), true ) ) {
		$status_posisi = $lacak_id ? get_post_meta( $lacak_id, '_ryokou_lacak_status_posisi', true ) : 'parkir';
		if ( ! $status_posisi ) {
			$status_posisi = 'parkir';
		}
	}

	$pool_parkir = isset( $args['pool_parkir'] ) ? sanitize_key( $args['pool_parkir'] ) : get_post_meta( $unit_id, '_ryokou_pool_lokasi', true );
	if ( ! in_array( $pool_parkir, array( 'malang', 'batu' ), true ) ) {
		$pool_parkir = 'malang';
	}

	$post_title = sprintf( '%s — %s', $kode_unit, $motor_title );

	if ( ! $lacak_id ) {
		$lacak_id = wp_insert_post(
			array(
				'post_type'   => 'ryokou_lacak',
				'post_title'  => $post_title,
				'post_status' => 'publish',
			)
		);
	} else {
		wp_update_post(
			array(
				'ID'          => $lacak_id,
				'post_title'  => $post_title,
				'post_status' => 'publish',
			)
		);
	}

	if ( ! $lacak_id || is_wp_error( $lacak_id ) ) {
		return false;
	}

	update_post_meta( $lacak_id, '_ryokou_lacak_unit_id', $unit_id );
	update_post_meta( $lacak_id, '_ryokou_lacak_kode_unit', sanitize_text_field( $kode_unit ) );
	update_post_meta( $lacak_id, '_ryokou_lacak_motor_id', $motor_id );
	update_post_meta( $lacak_id, '_ryokou_lacak_status_posisi', $status_posisi );
	update_post_meta( $lacak_id, '_ryokou_lacak_pool_parkir', $pool_parkir );

	// Sinkronkan kembali lokasi parkir di `ryokou_unit`
	update_post_meta( $unit_id, '_ryokou_pool_lokasi', $pool_parkir );

	if ( 'parkir' === $status_posisi ) {
		update_post_meta( $unit_id, '_ryokou_status_servis', 'aktif' );
		update_post_meta( $lacak_id, '_ryokou_lacak_booking_id', 0 );
		update_post_meta( $lacak_id, '_ryokou_lacak_no_booking', '' );
		update_post_meta( $lacak_id, '_ryokou_lacak_nama_penyewa', '' );
		update_post_meta( $lacak_id, '_ryokou_lacak_tenggat_kembali', '' );
	} elseif ( 'servis' === $status_posisi ) {
		update_post_meta( $unit_id, '_ryokou_status_servis', 'servis' );
		if ( isset( $args['nama_bengkel'] ) ) {
			$bengkel = ryokourent_sanitize_text_no_nik( $args['nama_bengkel'] );
			update_post_meta( $lacak_id, '_ryokou_lacak_nama_bengkel', $bengkel );
			update_post_meta( $unit_id, '_ryokou_nama_bengkel', $bengkel );
		}
		if ( isset( $args['kontak_bengkel'] ) ) {
			update_post_meta( $lacak_id, '_ryokou_lacak_kontak_bengkel', ryokourent_sanitize_text_no_nik( $args['kontak_bengkel'] ) );
		}
		if ( isset( $args['estimasi_selesai'] ) ) {
			update_post_meta( $lacak_id, '_ryokou_lacak_estimasi_selesai_servis', sanitize_text_field( $args['estimasi_selesai'] ) );
		}
	} elseif ( 'disewa' === $status_posisi ) {
		update_post_meta( $unit_id, '_ryokou_status_servis', 'aktif' );
		if ( isset( $args['booking_id'] ) ) {
			update_post_meta( $lacak_id, '_ryokou_lacak_booking_id', absint( $args['booking_id'] ) );
		}
		if ( isset( $args['no_booking'] ) ) {
			update_post_meta( $lacak_id, '_ryokou_lacak_no_booking', sanitize_text_field( $args['no_booking'] ) );
		}
		if ( isset( $args['nama_penyewa'] ) ) {
			update_post_meta( $lacak_id, '_ryokou_lacak_nama_penyewa', ryokourent_sanitize_text_no_nik( $args['nama_penyewa'] ) );
		}
		if ( isset( $args['tenggat_kembali'] ) ) {
			update_post_meta( $lacak_id, '_ryokou_lacak_tenggat_kembali', sanitize_text_field( $args['tenggat_kembali'] ) );
		}
	}

	if ( isset( $args['catatan'] ) ) {
		update_post_meta( $lacak_id, '_ryokou_lacak_catatan', ryokourent_sanitize_text_no_nik( $args['catatan'] ) );
	}

	$current_user = wp_get_current_user();
	$updater_name = ( $current_user && $current_user->exists() ) ? $current_user->display_name : 'System';

	$tz = new DateTimeZone( 'Asia/Jakarta' );
	$dt = new DateTime( 'now', $tz );

	update_post_meta( $lacak_id, '_ryokou_lacak_updated_at', $dt->format( 'Y-m-d H:i:s' ) . ' WIB' );
	update_post_meta( $lacak_id, '_ryokou_lacak_updated_by', $updater_name );

	return $lacak_id;
}

/**
 * Helper: Ambil ringkasan lokasi unit dari `ryokou_lacak`
 */
function ryokourent_get_unit_tracking_summary( $unit_id ) {
	$unit_id  = absint( $unit_id );
	$existing = get_posts(
		array(
			'post_type'      => 'ryokou_lacak',
			'post_status'    => array( 'publish', 'draft', 'private' ),
			'posts_per_page' => 1,
			'fields'         => 'ids',
			'meta_query'     => array(
				array(
					'key'   => '_ryokou_lacak_unit_id',
					'value' => $unit_id,
				),
			),
		)
	);

	if ( empty( $existing ) ) {
		$pool = get_post_meta( $unit_id, '_ryokou_pool_lokasi', true );
		$pool_label = ( 'batu' === $pool ) ? 'Pool Batu' : 'Pool Malang';
		return array(
			'status_posisi' => 'parkir',
			'pool_parkir'   => $pool ? $pool : 'malang',
			'label_ringkas' => 'Parkir: ' . $pool_label,
		);
	}

	$lacak_id = $existing[0];
	$posisi   = get_post_meta( $lacak_id, '_ryokou_lacak_status_posisi', true );
	$pool     = get_post_meta( $lacak_id, '_ryokou_lacak_pool_parkir', true );
	$pool_lbl = ( 'batu' === $pool ) ? 'Pool Batu' : 'Pool Malang';

	if ( 'servis' === $posisi ) {
		$bengkel = get_post_meta( $lacak_id, '_ryokou_lacak_nama_bengkel', true );
		$label   = 'Servis: ' . ( $bengkel ? $bengkel : 'Bengkel Rekanan' );
	} elseif ( 'disewa' === $posisi ) {
		$penyewa = get_post_meta( $lacak_id, '_ryokou_lacak_nama_penyewa', true );
		$nobook  = get_post_meta( $lacak_id, '_ryokou_lacak_no_booking', true );
		$label   = sprintf( 'Disewa: %s (%s)', $penyewa ? $penyewa : 'Penyewa', $nobook ? $nobook : '-' );
	} else {
		$posisi = 'parkir';
		$label  = 'Parkir: ' . $pool_lbl;
	}

	return array(
		'lacak_id'      => $lacak_id,
		'status_posisi' => $posisi,
		'pool_parkir'   => $pool ? $pool : 'malang',
		'label_ringkas' => $label,
	);
}

/**
 * Data Model Contoh / Dummy Standar Model (003) React
 *
 * Mencakup 6 model motor lengkap dengan spesifikasi, fasilitas, kategori, dan multi-tier tarif.
 */
function ryokourent_get_default_sample_motors() {
	return array(
		array(
			'id'                => 1,
			'title'             => 'Honda Scoopy Prestige',
			'namaModel'         => 'Honda Scoopy Prestige',
			'kategori'          => 'Matic',
			'harga1Hari'        => 85000,
			'harga1Minggu'      => 510000,
			'harga2Minggu'      => 950000,
			'harga12Jam'        => 65000,
			'harga9Jam'         => 55000,
			'harga6Jam'         => 45000,
			'harga3Jam'         => 35000,
			'dendaHarianPerJam' => 20000,
			'fasilitas'         => '2 Helm SNI + Jas Hujan + Phone Holder',
			'spesifikasi'       => '110cc, Smart Key, Bagasi 15.4L',
			'imageUrl'          => '',
			'isActive'          => true,
		),
		array(
			'id'                => 2,
			'title'             => 'Yamaha NMAX 155 Connected',
			'namaModel'         => 'Yamaha NMAX 155 Connected',
			'kategori'          => 'Matic',
			'harga1Hari'        => 135000,
			'harga1Minggu'      => 810000,
			'harga2Minggu'      => 1500000,
			'harga12Jam'        => 105000,
			'harga9Jam'         => 90000,
			'harga6Jam'         => 75000,
			'harga3Jam'         => 55000,
			'dendaHarianPerJam' => 25000,
			'fasilitas'         => '2 Helm SNI + Jas Hujan',
			'spesifikasi'       => '155cc VVA, ABS, Bagasi Luas 24L',
			'imageUrl'          => '',
			'isActive'          => true,
		),
		array(
			'id'                => 3,
			'title'             => 'Honda CRF 150L',
			'namaModel'         => 'Honda CRF 150L',
			'kategori'          => 'Trail',
			'harga1Hari'        => 220000,
			'harga1Minggu'      => 1350000,
			'harga2Minggu'      => 2500000,
			'harga12Jam'        => 175000,
			'harga9Jam'         => 150000,
			'harga6Jam'         => 125000,
			'harga3Jam'         => 95000,
			'dendaHarianPerJam' => 35000,
			'fasilitas'         => '2 Helm SNI/Cross + Jas Hujan + Goggle Bromo',
			'spesifikasi'       => '150cc, Ban Trail Khusus Laut Pasir Bromo',
			'imageUrl'          => '',
			'isActive'          => true,
		),
		array(
			'id'                => 4,
			'title'             => 'Yamaha Fazzio Hybrid',
			'namaModel'         => 'Yamaha Fazzio Hybrid',
			'kategori'          => 'Retro',
			'harga1Hari'        => 95000,
			'harga1Minggu'      => 570000,
			'harga2Minggu'      => 1050000,
			'harga12Jam'        => 75000,
			'harga9Jam'         => 65000,
			'harga6Jam'         => 50000,
			'harga3Jam'         => 40000,
			'dendaHarianPerJam' => 20000,
			'fasilitas'         => '2 Helm SNI + Jas Hujan',
			'spesifikasi'       => '125cc Blue Core Hybrid, Desain Retro Klasik',
			'imageUrl'          => '',
			'isActive'          => true,
		),
		array(
			'id'                => 5,
			'title'             => 'Yamaha R15 V4 Connected',
			'namaModel'         => 'Yamaha R15 V4 Connected',
			'kategori'          => 'Sport',
			'harga1Hari'        => 175000,
			'harga1Minggu'      => 1050000,
			'harga2Minggu'      => 1950000,
			'harga12Jam'        => 135000,
			'harga9Jam'         => 115000,
			'harga6Jam'         => 90000,
			'harga3Jam'         => 65000,
			'dendaHarianPerJam' => 30000,
			'fasilitas'         => '2 Helm SNI + Jas Hujan',
			'spesifikasi'       => '155cc VVA, Quick Shifter, Assist & Slipper Clutch',
			'imageUrl'          => '',
			'isActive'          => true,
		),
		array(
			'id'                => 7,
			'title'             => 'Honda BeAT DELUXE/CBS  2021/2022',
			'namaModel'         => 'Honda BeAT DELUXE/CBS  2021/2022',
			'kategori'          => 'Matic',
			'harga1Hari'        => 80000,
			'harga1Minggu'      => 480000,
			'harga2Minggu'      => 880000,
			'harga12Jam'        => 60000,
			'harga9Jam'         => 52000,
			'harga6Jam'         => 40000,
			'harga3Jam'         => 28000,
			'dendaHarianPerJam' => 10000,
			'fasilitas'         => '2 Helm SNI + Jas Hujan',
			'spesifikasi'       => 'Lincah, Mesin irit injeksi, USB charging',
			'imageUrl'          => '',
			'isActive'          => true,
		),
	);
}

/**
 * Helper: Ambil seluruh model motor aktif dari database WP,
 * dengan fallback otomatis ke 6 model contoh Model (003) jika database masih kosong.
 */
function ryokourent_get_all_motors_with_fallback() {
	$posts = get_posts(
		array(
			'post_type'      => 'motor',
			'post_status'    => 'publish',
			'posts_per_page' => -1,
			'orderby'        => 'menu_order title',
			'order'          => 'ASC',
		)
	);

	if ( ! empty( $posts ) ) {
		$result = array();
		foreach ( $posts as $p ) {
			$terms = get_the_terms( $p->ID, 'kategori_motor' );
			$kat   = ( ! empty( $terms ) && ! is_wp_error( $terms ) ) ? $terms[0]->name : 'Matic';
			$h1    = absint( get_post_meta( $p->ID, '_ryokou_harga_harian', true ) );
			$fas   = get_post_meta( $p->ID, '_ryokou_fasilitas', true );
			$spek  = get_post_meta( $p->ID, '_ryokou_spesifikasi', true );
			$result[] = (object) array(
				'ID'          => $p->ID,
				'post_title'  => $p->post_title,
				'post_name'   => $p->post_name,
				'kategori'    => $kat,
				'spesifikasi' => $spek ? $spek : 'Spesifikasi standar rental',
				'fasilitas'   => $fas ? $fas : '2 Helm SNI & Jas Hujan',
				'harga1Hari'  => $h1 ? $h1 : 85000,
				'is_dummy'    => false,
			);
		}
		return $result;
	}

	// Fallback ke 6 model contoh Model (003)
	$samples = ryokourent_get_default_sample_motors();
	$result  = array();
	foreach ( $samples as $s ) {
		$result[] = (object) array(
			'ID'          => $s['id'],
			'post_title'  => $s['title'],
			'post_name'   => sanitize_title( $s['title'] ),
			'kategori'    => $s['kategori'],
			'spesifikasi' => $s['spesifikasi'],
			'fasilitas'   => $s['fasilitas'],
			'harga1Hari'  => $s['harga1Hari'],
			'is_dummy'    => true,
		);
	}
	return $result;
}

/**
 * Seeder data contoh Model (003) ke dalam CPT `motor` WordPress
 */
function ryokourent_seed_sample_motors( $force = false ) {
	$existing = get_posts(
		array(
			'post_type'      => 'motor',
			'post_status'    => 'any',
			'posts_per_page' => 1,
		)
	);

	if ( ! empty( $existing ) && ! $force ) {
		return array(
			'success' => true,
			'message' => 'Data motor sudah ada di database WordPress, seeding dilewati.',
			'count'   => count( $existing ),
		);
	}

	$samples = ryokourent_get_default_sample_motors();
	$created = 0;

	foreach ( $samples as $s ) {
		$found = get_page_by_title( $s['title'], OBJECT, 'motor' );
		if ( $found && ! $force ) {
			continue;
		}

		$post_id = wp_insert_post(
			array(
				'post_type'   => 'motor',
				'post_title'  => $s['title'],
				'post_status' => 'publish',
				'post_content'=> $s['spesifikasi'],
			)
		);

		if ( $post_id && ! is_wp_error( $post_id ) ) {
			update_post_meta( $post_id, '_ryokou_harga_harian', $s['harga1Hari'] );
			update_post_meta( $post_id, '_ryokou_harga_1minggu', $s['harga1Minggu'] );
			update_post_meta( $post_id, '_ryokou_harga_2minggu', $s['harga2Minggu'] );
			update_post_meta( $post_id, '_ryokou_harga_12jam', $s['harga12Jam'] );
			update_post_meta( $post_id, '_ryokou_harga_9jam', $s['harga9Jam'] );
			update_post_meta( $post_id, '_ryokou_harga_6jam', $s['harga6Jam'] );
			update_post_meta( $post_id, '_ryokou_harga_3jam', $s['harga3Jam'] );
			update_post_meta( $post_id, '_ryokou_denda_harian', $s['dendaHarianPerJam'] );
			update_post_meta( $post_id, '_ryokou_fasilitas', $s['fasilitas'] );
			update_post_meta( $post_id, '_ryokou_spesifikasi', $s['spesifikasi'] );

			// Set kategori taksonomi
			if ( ! empty( $s['kategori'] ) ) {
				wp_set_object_terms( $post_id, $s['kategori'], 'kategori_motor', false );
			}
			$created++;
		}
	}

	return array(
		'success' => true,
		'message' => sprintf( '%d model motor contoh berhasil disinkronkan ke WordPress.', $created ),
		'count'   => $created,
	);
}

/**
 * Helper D-18: Ambil Struktur Tarif Bertingkat 2 Kategori (Harian & Jam/ShortRent) + Paket
 * Sinkron 100% dengan Kalkulator & Multi-Tier Model (003) React
 */
function ryokourent_get_motor_tiered_pricing( $motor_id ) {
	$motor_id = absint( $motor_id );

	// Cek apakah ada di daftar sample motor
	$samples      = ryokourent_get_default_sample_motors();
	$sample_match = null;
	foreach ( $samples as $s ) {
		if ( $s['id'] === $motor_id ) {
			$sample_match = $s;
			break;
		}
	}

	$harga_1hari = absint( get_post_meta( $motor_id, '_ryokou_harga_harian', true ) );
	if ( ! $harga_1hari ) {
		$harga_1hari = $sample_match ? $sample_match['harga1Hari'] : 85000;
	}

	$harga_1minggu = absint( get_post_meta( $motor_id, '_ryokou_harga_1minggu', true ) );
	if ( ! $harga_1minggu ) {
		$harga_1minggu = $sample_match ? $sample_match['harga1Minggu'] : ( $harga_1hari * 6 );
	}

	$harga_2minggu = absint( get_post_meta( $motor_id, '_ryokou_harga_2minggu', true ) );
	if ( ! $harga_2minggu ) {
		$harga_2minggu = $sample_match ? $sample_match['harga2Minggu'] : ( (int) round( ( $harga_1hari * 11 ) / 1000 ) * 1000 );
	}

	$harga_12jam = absint( get_post_meta( $motor_id, '_ryokou_harga_12jam', true ) );
	if ( ! $harga_12jam ) {
		$harga_12jam = $sample_match ? $sample_match['harga12Jam'] : ( (int) round( ( $harga_1hari * 0.75 ) / 1000 ) * 1000 );
	}

	$harga_9jam = absint( get_post_meta( $motor_id, '_ryokou_harga_9jam', true ) );
	if ( ! $harga_9jam ) {
		$harga_9jam = $sample_match ? $sample_match['harga9Jam'] : ( (int) round( ( $harga_1hari * 0.65 ) / 1000 ) * 1000 );
	}

	$harga_6jam = absint( get_post_meta( $motor_id, '_ryokou_harga_6jam', true ) );
	if ( ! $harga_6jam ) {
		$harga_6jam = $sample_match ? $sample_match['harga6Jam'] : ( (int) round( ( $harga_1hari * 0.5 ) / 1000 ) * 1000 );
	}

	$harga_3jam = absint( get_post_meta( $motor_id, '_ryokou_harga_3jam', true ) );
	if ( ! $harga_3jam ) {
		$harga_3jam = $sample_match ? $sample_match['harga3Jam'] : ( (int) round( ( $harga_1hari * 0.35 ) / 1000 ) * 1000 );
	}

	$denda_harian = absint( get_post_meta( $motor_id, '_ryokou_denda_harian', true ) );
	if ( ! $denda_harian ) {
		$denda_harian = $sample_match ? $sample_match['dendaHarianPerJam'] : 20000;
	}

	$kategori = array(
		'harian' => array(
			'label' => __( 'Sewa Harian / Mingguan', 'ryokourent' ),
			'sub'   => array(
				'1_hari'   => array(
					'key'          => '1_hari',
					'label'        => '1 Hari (24 Jam)',
					'durasi_jam'   => 24,
					'harga'        => $harga_1hari,
					'harga_format' => 'Rp ' . number_format( $harga_1hari, 0, ',', '.' ),
				),
				'1_minggu' => array(
					'key'          => '1_minggu',
					'label'        => '1 Minggu (7 Hari)',
					'durasi_jam'   => 168,
					'harga'        => $harga_1minggu,
					'harga_format' => 'Rp ' . number_format( $harga_1minggu, 0, ',', '.' ),
				),
				'2_minggu' => array(
					'key'          => '2_minggu',
					'label'        => '2 Minggu (14 Hari)',
					'durasi_jam'   => 336,
					'harga'        => $harga_2minggu,
					'harga_format' => 'Rp ' . number_format( $harga_2minggu, 0, ',', '.' ),
				),
			),
		),
		'jam'    => array(
			'label' => __( 'Sewa Jam (ShortRent)', 'ryokourent' ),
			'sub'   => array(
				'12_jam' => array(
					'key'          => '12_jam',
					'label'        => '12 Jam (ShortRent)',
					'durasi_jam'   => 12,
					'harga'        => $harga_12jam,
					'harga_format' => 'Rp ' . number_format( $harga_12jam, 0, ',', '.' ),
				),
				'9_jam'  => array(
					'key'          => '9_jam',
					'label'        => '9 Jam (ShortRent)',
					'durasi_jam'   => 9,
					'harga'        => $harga_9jam,
					'harga_format' => 'Rp ' . number_format( $harga_9jam, 0, ',', '.' ),
				),
				'6_jam'  => array(
					'key'          => '6_jam',
					'label'        => '6 Jam (ShortRent)',
					'durasi_jam'   => 6,
					'harga'        => $harga_6jam,
					'harga_format' => 'Rp ' . number_format( $harga_6jam, 0, ',', '.' ),
				),
				'3_jam'  => array(
					'key'          => '3_jam',
					'label'        => '3 Jam (ShortRent)',
					'durasi_jam'   => 3,
					'harga'        => $harga_3jam,
					'harga_format' => 'Rp ' . number_format( $harga_3jam, 0, ',', '.' ),
				),
			),
		),
	);

	// Tambahkan Paket Promo Dinamis dari CPT `ryokou_paket` jika ada
	$pakets = get_posts(
		array(
			'post_type'      => 'ryokou_paket',
			'post_status'    => 'publish',
			'posts_per_page' => 20,
		)
	);

	$paket_subs = array();
	foreach ( $pakets as $pkt ) {
		$target_motor = absint( get_post_meta( $pkt->ID, '_ryokou_paket_motor_id', true ) );
		if ( $target_motor > 0 && $target_motor !== $motor_id ) {
			continue;
		}
		$pkt_harga  = absint( get_post_meta( $pkt->ID, '_ryokou_paket_harga', true ) );
		$pkt_angka  = absint( get_post_meta( $pkt->ID, '_ryokou_paket_durasi_angka', true ) );
		$pkt_satuan = get_post_meta( $pkt->ID, '_ryokou_paket_durasi_satuan', true );
		$durasi_jam = ( 'hari' === $pkt_satuan ) ? ( max( 1, $pkt_angka ) * 24 ) : max( 1, $pkt_angka );
		$pkt_key    = 'paket_' . $pkt->ID;

		$paket_subs[ $pkt_key ] = array(
			'key'          => $pkt_key,
			'label'        => $pkt->post_title,
			'durasi_jam'   => $durasi_jam,
			'harga'        => $pkt_harga,
			'harga_format' => 'Rp ' . number_format( $pkt_harga, 0, ',', '.' ),
		);
	}

	if ( ! empty( $paket_subs ) ) {
		$kategori['paket'] = array(
			'label' => __( 'Paket Promo Khusus', 'ryokourent' ),
			'sub'   => $paket_subs,
		);
	}

	return array(
		'motor_id'            => $motor_id,
		'harga_utama_1hari'   => $harga_1hari,
		'harga_utama_format'  => 'Rp ' . number_format( $harga_1hari, 0, ',', '.' ),
		'denda_harian'        => $denda_harian,
		'denda_harian_format' => 'Rp ' . number_format( $denda_harian, 0, ',', '.' ) . '/jam',
		'kategori'            => $kategori,
	);
}

/**
 * 3. Registrasi Metaboxes untuk `motor`, `ryokou_unit`, dan `ryokou_paket`
 */
function ryokourent_add_meta_boxes() {
	add_meta_box(
		'ryokou_motor_pricing_box',
		__( 'Tarif Bertingkat (Harian & ShortRent Jam), Denda D-27, & Fasilitas', 'ryokourent' ),
		'ryokourent_render_motor_metabox',
		'motor',
		'normal',
		'high'
	);

	add_meta_box(
		'ryokou_unit_details_box',
		__( 'Identitas Unit Fisik, Kode Readonly (D-12), & Posisi Parkir/Servis (D-26)', 'ryokourent' ),
		'ryokourent_render_unit_metabox',
		'ryokou_unit',
		'normal',
		'high'
	);

	add_meta_box(
		'ryokou_paket_details_box',
		__( 'Pengaturan Paket Promo / Wisata Dinamis (D-18)', 'ryokourent' ),
		'ryokourent_render_paket_metabox',
		'ryokou_paket',
		'normal',
		'high'
	);

	add_meta_box(
		'ryokou_booking_details_box',
		__( 'Rincian Pemesanan & Data Pelanggan (UU PDP D-21 & D-27)', 'ryokourent' ),
		'ryokourent_render_booking_metabox',
		'penyewaan',
		'normal',
		'high'
	);
}
add_action( 'add_meta_boxes', 'ryokourent_add_meta_boxes' );

/**
 * Render Metabox CPT `motor`
 */
function ryokourent_render_motor_metabox( $post ) {
	wp_nonce_field( 'ryokou_save_motor_meta', 'ryokou_motor_nonce' );
	$pricing     = ryokourent_get_motor_tiered_pricing( $post->ID );
	$fasilitas   = get_post_meta( $post->ID, '_ryokou_fasilitas', true );
	if ( ! $fasilitas ) {
		$fasilitas = '2 Helm SNI, Jas Hujan (Holder HP tersedia selama stok ada)';
	}
	$spesifikasi = get_post_meta( $post->ID, '_ryokou_spesifikasi', true );
	?>
	<table class="form-table">
		<tr>
			<th><label for="ryokou_harga_harian"><?php esc_html_e( 'Tarif 1 Hari (24 Jam) [Utama] (Rp)', 'ryokourent' ); ?></label></th>
			<td><input type="number" id="ryokou_harga_harian" name="ryokou_harga_harian" value="<?php echo esc_attr( $pricing['kategori']['harian']['sub']['1_hari']['harga'] ); ?>" class="regular-text" required /></td>
		</tr>
		<tr>
			<th><label for="ryokou_harga_1minggu"><?php esc_html_e( 'Tarif 1 Minggu (7 Hari) (Rp)', 'ryokourent' ); ?></label></th>
			<td><input type="number" id="ryokou_harga_1minggu" name="ryokou_harga_1minggu" value="<?php echo esc_attr( $pricing['kategori']['harian']['sub']['1_minggu']['harga'] ); ?>" class="regular-text" /></td>
		</tr>
		<tr>
			<th><label for="ryokou_harga_2minggu"><?php esc_html_e( 'Tarif 2 Minggu (14 Hari) (Rp)', 'ryokourent' ); ?></label></th>
			<td><input type="number" id="ryokou_harga_2minggu" name="ryokou_harga_2minggu" value="<?php echo esc_attr( $pricing['kategori']['harian']['sub']['2_minggu']['harga'] ); ?>" class="regular-text" /></td>
		</tr>
		<tr>
			<th><label for="ryokou_harga_12jam"><?php esc_html_e( 'ShortRent 12 Jam (Rp)', 'ryokourent' ); ?></label></th>
			<td><input type="number" id="ryokou_harga_12jam" name="ryokou_harga_12jam" value="<?php echo esc_attr( $pricing['kategori']['jam']['sub']['12_jam']['harga'] ); ?>" class="regular-text" /></td>
		</tr>
		<tr>
			<th><label for="ryokou_harga_9jam"><?php esc_html_e( 'ShortRent 9 Jam (Rp)', 'ryokourent' ); ?></label></th>
			<td><input type="number" id="ryokou_harga_9jam" name="ryokou_harga_9jam" value="<?php echo esc_attr( $pricing['kategori']['jam']['sub']['9_jam']['harga'] ); ?>" class="regular-text" /></td>
		</tr>
		<tr>
			<th><label for="ryokou_harga_6jam"><?php esc_html_e( 'ShortRent 6 Jam (Rp)', 'ryokourent' ); ?></label></th>
			<td><input type="number" id="ryokou_harga_6jam" name="ryokou_harga_6jam" value="<?php echo esc_attr( $pricing['kategori']['jam']['sub']['6_jam']['harga'] ); ?>" class="regular-text" /></td>
		</tr>
		<tr>
			<th><label for="ryokou_harga_3jam"><?php esc_html_e( 'ShortRent 3 Jam (Rp)', 'ryokourent' ); ?></label></th>
			<td><input type="number" id="ryokou_harga_3jam" name="ryokou_harga_3jam" value="<?php echo esc_attr( $pricing['kategori']['jam']['sub']['3_jam']['harga'] ); ?>" class="regular-text" /></td>
		</tr>
		<tr>
			<th><label for="ryokou_denda_harian"><?php esc_html_e( 'Denda Harian & ShortRent 12 Jam (Rp/Jam) [D-27]', 'ryokourent' ); ?></label></th>
			<td>
				<input type="number" id="ryokou_denda_harian" name="ryokou_denda_harian" value="<?php echo esc_attr( $pricing['denda_harian'] ); ?>" class="regular-text" />
				<p class="description"><?php esc_html_e( 'Berlaku untuk keterlambatan Sewa Harian (>90 mnt) dan ShortRent 12 Jam (>=60 mnt). Untuk ShortRent 3/6/9 Jam, telat >=60 menit otomatis naik ke tarif paket jam di atasnya (3j->6j->9j->12j).', 'ryokourent' ); ?></p>
			</td>
		</tr>
		<tr>
			<th><label for="ryokou_fasilitas"><?php esc_html_e( 'Perlengkapan Standar (D-11)', 'ryokourent' ); ?></label></th>
			<td><input type="text" id="ryokou_fasilitas" name="ryokou_fasilitas" value="<?php echo esc_attr( $fasilitas ); ?>" class="large-text" /></td>
		</tr>
		<tr>
			<th><label for="ryokou_spesifikasi"><?php esc_html_e( 'Spesifikasi Ringkas', 'ryokourent' ); ?></label></th>
			<td><input type="text" id="ryokou_spesifikasi" name="ryokou_spesifikasi" value="<?php echo esc_attr( $spesifikasi ); ?>" class="large-text" /></td>
		</tr>
	</table>
	<?php
}

/**
 * Render Metabox CPT `ryokou_unit` (Kode Unit Readonly Permanen D-12 & Auto-Sync Lacak Unit D-26)
 */
function ryokourent_render_unit_metabox( $post ) {
	wp_nonce_field( 'ryokou_save_unit_meta', 'ryokou_unit_nonce' );
	$kode_unit     = get_post_meta( $post->ID, '_ryokou_kode_unit', true );
	$parent_motor  = absint( get_post_meta( $post->ID, '_ryokou_parent_motor_id', true ) );
	$pool_lokasi   = get_post_meta( $post->ID, '_ryokou_pool_lokasi', true );
	if ( ! $pool_lokasi ) {
		$pool_lokasi = 'malang';
	}
	$nomor_plat    = get_post_meta( $post->ID, '_ryokou_nomor_plat', true );
	$warna         = get_post_meta( $post->ID, '_ryokou_warna', true );
	$status_servis = get_post_meta( $post->ID, '_ryokou_status_servis', true );
	if ( ! $status_servis ) {
		$status_servis = 'aktif';
	}
	$nama_bengkel  = get_post_meta( $post->ID, '_ryokou_nama_bengkel', true );
	$km_terakhir   = get_post_meta( $post->ID, '_ryokou_km_terakhir', true );
	$tgl_servis    = get_post_meta( $post->ID, '_ryokou_tgl_servis_terakhir', true );

	$motors = get_posts(
		array(
			'post_type'      => 'motor',
			'post_status'    => 'publish',
			'posts_per_page' => -1,
		)
	);
	?>
	<table class="form-table">
		<tr>
			<th><label for="ryokou_kode_unit"><?php esc_html_e( 'Kode Unit Unik (D-12)', 'ryokourent' ); ?></label></th>
			<td>
				<input type="text" id="ryokou_kode_unit" name="ryokou_kode_unit" value="<?php echo esc_attr( $kode_unit ); ?>" class="regular-text" <?php echo ! empty( $kode_unit ) ? 'readonly style="background:#f1f5f9;font-weight:bold;"' : 'required placeholder="Contoh: B122"'; ?> />
				<p class="description"><?php esc_html_e( 'Kode unit bersifat permanen (readonly) setelah disimpan pertama kali untuk menjaga integritas riwayat sewa & Lacak Unit.', 'ryokourent' ); ?></p>
			</td>
		</tr>
		<tr>
			<th><label for="ryokou_parent_motor_id"><?php esc_html_e( 'Induk Model Motor', 'ryokourent' ); ?></label></th>
			<td>
				<select id="ryokou_parent_motor_id" name="ryokou_parent_motor_id" required>
					<option value=""><?php esc_html_e( '-- Pilih Model Motor --', 'ryokourent' ); ?></option>
					<?php foreach ( $motors as $m ) : ?>
						<option value="<?php echo esc_attr( $m->ID ); ?>" <?php selected( $parent_motor, $m->ID ); ?>><?php echo esc_html( $m->post_title ); ?></option>
					<?php endforeach; ?>
				</select>
			</td>
		</tr>
		<tr>
			<th><label for="ryokou_pool_lokasi"><?php esc_html_e( 'Posisi Parkir Pool Saat Ini (D-26)', 'ryokourent' ); ?></label></th>
			<td>
				<select id="ryokou_pool_lokasi" name="ryokou_pool_lokasi">
					<option value="malang" <?php selected( $pool_lokasi, 'malang' ); ?>><?php esc_html_e( 'Pool Malang (Dinoyo)', 'ryokourent' ); ?></option>
					<option value="batu" <?php selected( $pool_lokasi, 'batu' ); ?>><?php esc_html_e( 'Pool Batu (Diponegoro)', 'ryokourent' ); ?></option>
				</select>
				<p class="description"><?php esc_html_e( 'Pool hanya sebagai tempat parkir fisik (stok ketersediaan dihitung global). Otomatis disinkronkan ke menu Lacak Unit.', 'ryokourent' ); ?></p>
			</td>
		</tr>
		<tr>
			<th><label for="ryokou_nomor_plat"><?php esc_html_e( 'Nomor Plat Kendaraan', 'ryokourent' ); ?></label></th>
			<td><input type="text" id="ryokou_nomor_plat" name="ryokou_nomor_plat" value="<?php echo esc_attr( $nomor_plat ); ?>" class="regular-text" placeholder="N 1234 AB" /></td>
		</tr>
		<tr>
			<th><label for="ryokou_warna"><?php esc_html_e( 'Warna Kendaraan', 'ryokourent' ); ?></label></th>
			<td><input type="text" id="ryokou_warna" name="ryokou_warna" value="<?php echo esc_attr( $warna ); ?>" class="regular-text" /></td>
		</tr>
		<tr>
			<th><label for="ryokou_status_servis"><?php esc_html_e( 'Status Kesiapan / Servis', 'ryokourent' ); ?></label></th>
			<td>
				<select id="ryokou_status_servis" name="ryokou_status_servis">
					<option value="aktif" <?php selected( $status_servis, 'aktif' ); ?>><?php esc_html_e( 'Aktif (Siap Jalan / Parkir di Pool)', 'ryokourent' ); ?></option>
					<option value="servis" <?php selected( $status_servis, 'servis' ); ?>><?php esc_html_e( 'Sedang Servis di Bengkel', 'ryokourent' ); ?></option>
				</select>
			</td>
		</tr>
		<tr>
			<th><label for="ryokou_nama_bengkel"><?php esc_html_e( 'Nama Bengkel (Jika Servis)', 'ryokourent' ); ?></label></th>
			<td><input type="text" id="ryokou_nama_bengkel" name="ryokou_nama_bengkel" value="<?php echo esc_attr( $nama_bengkel ); ?>" class="regular-text" placeholder="Contoh: AHASS Dinoyo" /></td>
		</tr>
		<tr>
			<th><label for="ryokou_km_terakhir"><?php esc_html_e( 'Odometer / KM Ganti Oli Terakhir', 'ryokourent' ); ?></label></th>
			<td><input type="number" id="ryokou_km_terakhir" name="ryokou_km_terakhir" value="<?php echo esc_attr( $km_terakhir ); ?>" class="regular-text" /></td>
		</tr>
		<tr>
			<th><label for="ryokou_tgl_servis_terakhir"><?php esc_html_e( 'Tanggal Servis Terakhir', 'ryokourent' ); ?></label></th>
			<td><input type="date" id="ryokou_tgl_servis_terakhir" name="ryokou_tgl_servis_terakhir" value="<?php echo esc_attr( $tgl_servis ); ?>" /></td>
		</tr>
	</table>
	<?php
}

/**
 * Render Metabox CPT `ryokou_paket`
 */
function ryokourent_render_paket_metabox( $post ) {
	wp_nonce_field( 'ryokou_save_paket_meta', 'ryokou_paket_nonce' );
	$harga    = get_post_meta( $post->ID, '_ryokou_paket_harga', true );
	$angka    = get_post_meta( $post->ID, '_ryokou_paket_durasi_angka', true );
	$satuan   = get_post_meta( $post->ID, '_ryokou_paket_durasi_satuan', true );
	$motor_id = absint( get_post_meta( $post->ID, '_ryokou_paket_motor_id', true ) );
	$motors   = get_posts(
		array(
			'post_type'      => 'motor',
			'post_status'    => 'publish',
			'posts_per_page' => -1,
		)
	);
	?>
	<table class="form-table">
		<tr>
			<th><label for="ryokou_paket_harga"><?php esc_html_e( 'Harga Paket Promo (Rp)', 'ryokourent' ); ?></label></th>
			<td><input type="number" id="ryokou_paket_harga" name="ryokou_paket_harga" value="<?php echo esc_attr( $harga ); ?>" class="regular-text" required /></td>
		</tr>
		<tr>
			<th><label for="ryokou_paket_durasi_angka"><?php esc_html_e( 'Durasi Paket', 'ryokourent' ); ?></label></th>
			<td>
				<input type="number" id="ryokou_paket_durasi_angka" name="ryokou_paket_durasi_angka" value="<?php echo esc_attr( $angka ? $angka : 1 ); ?>" style="width:90px;" />
				<select name="ryokou_paket_durasi_satuan">
					<option value="hari" <?php selected( $satuan, 'hari' ); ?>><?php esc_html_e( 'Hari', 'ryokourent' ); ?></option>
					<option value="jam" <?php selected( $satuan, 'jam' ); ?>><?php esc_html_e( 'Jam', 'ryokourent' ); ?></option>
				</select>
			</td>
		</tr>
		<tr>
			<th><label for="ryokou_paket_motor_id"><?php esc_html_e( 'Berlaku untuk Model Motor', 'ryokourent' ); ?></label></th>
			<td>
				<select id="ryokou_paket_motor_id" name="ryokou_paket_motor_id">
					<option value="0"><?php esc_html_e( 'Semua Model Motor', 'ryokourent' ); ?></option>
					<?php foreach ( $motors as $m ) : ?>
						<option value="<?php echo esc_attr( $m->ID ); ?>" <?php selected( $motor_id, $m->ID ); ?>><?php echo esc_html( $m->post_title ); ?></option>
					<?php endforeach; ?>
				</select>
			</td>
		</tr>
	</table>
	<?php
}

/**
 * Render Metabox CPT `penyewaan` (Detail Lengkap Booking, Data Pelanggan D-21, Unit, & Denda D-27)
 */
function ryokourent_render_booking_metabox( $post ) {
	wp_nonce_field( 'ryokou_save_booking_meta', 'ryokou_booking_nonce' );
	$no_booking  = get_post_meta( $post->ID, '_ryokou_no_booking', true );
	$nama        = get_post_meta( $post->ID, '_ryokou_nama', true );
	$nomor_wa    = get_post_meta( $post->ID, '_ryokou_nomor_wa', true );
	$tanda       = get_post_meta( $post->ID, '_ryokou_tanda_pelanggan', true );
	$jenis_id    = get_post_meta( $post->ID, '_ryokou_jenis_id_pendukung', true );
	$motor_nama  = get_post_meta( $post->ID, '_ryokou_snapshot_nama_motor', true );
	$kode_unit   = get_post_meta( $post->ID, '_ryokou_snapshot_kode_unit', true );
	$durasi_lbl  = get_post_meta( $post->ID, '_ryokou_label_durasi', true );
	$mulai       = get_post_meta( $post->ID, '_ryokou_jam_tanggal_mulai', true );
	$selesai     = get_post_meta( $post->ID, '_ryokou_jam_tanggal_selesai', true );
	$pool        = get_post_meta( $post->ID, '_ryokou_pool', true );
	$alamat_antar= get_post_meta( $post->ID, '_ryokou_alamat_pengantaran', true );
	$alamat_jemput= get_post_meta( $post->ID, '_ryokou_alamat_penjemputan', true );
	$total_est   = absint( get_post_meta( $post->ID, '_ryokou_total_harga_estimasi', true ) );
	$total_denda = absint( get_post_meta( $post->ID, '_ryokou_total_denda', true ) );
	$catatan_denda= get_post_meta( $post->ID, '_ryokou_catatan_denda', true );
	$luar_jam    = get_post_meta( $post->ID, '_ryokou_luar_jam_operasional', true );
	$wa_link     = function_exists( 'ryokourent_generate_whatsapp_booking_url' ) ? ryokourent_generate_whatsapp_booking_url( $post->ID ) : '';
	?>
	<table class="form-table">
		<tr>
			<th><?php esc_html_e( 'No. Booking Resmi', 'ryokourent' ); ?></th>
			<td>
				<input type="text" id="ryokou_no_booking" name="ryokou_no_booking" value="<?php echo esc_attr( $no_booking ); ?>" class="regular-text" readonly style="background:#f1f5f9;font-weight:bold;color:#0f766e;" />
				<span style="margin-left:10px;font-weight:600;text-transform:uppercase;color:#475569;">Status: <?php echo esc_html( str_replace( 'ryokou_', '', $post->post_status ) ); ?></span>
			</td>
		</tr>
		<tr>
			<th><label for="ryokou_nama"><?php esc_html_e( 'Nama Penyewa (UU PDP D-21)', 'ryokourent' ); ?></label></th>
			<td>
				<input type="text" id="ryokou_nama" name="ryokou_nama" value="<?php echo esc_attr( $nama ); ?>" class="regular-text" required />
				<p class="description"><?php esc_html_e( 'Dilarang mencatat 16 digit NIK KTP sesuai UU Pelindungan Data Pribadi No. 27/2022.', 'ryokourent' ); ?></p>
			</td>
		</tr>
		<tr>
			<th><label for="ryokou_nomor_wa"><?php esc_html_e( 'Nomor WhatsApp / HP Aktif', 'ryokourent' ); ?></label></th>
			<td>
				<input type="text" id="ryokou_nomor_wa" name="ryokou_nomor_wa" value="<?php echo esc_attr( $nomor_wa ); ?>" class="regular-text" placeholder="08123456789" />
				<?php if ( $nomor_wa ) : 
					$wa_num = preg_replace( '/[^0-9]/', '', $nomor_wa );
					if ( strpos( $wa_num, '08' ) === 0 ) { $wa_num = '62' . substr( $wa_num, 1 ); }
				?>
					<a href="<?php echo esc_url( 'https://wa.me/' . $wa_num ); ?>" target="_blank" rel="noopener noreferrer" class="button" style="margin-left:8px;">💬 Chat Pelanggan</a>
				<?php endif; ?>
			</td>
		</tr>
		<tr>
			<th><label for="ryokou_tanda_pelanggan"><?php esc_html_e( 'Status Pelanggan', 'ryokourent' ); ?></label></th>
			<td>
				<select id="ryokou_tanda_pelanggan" name="ryokou_tanda_pelanggan">
					<option value="baru" <?php selected( $tanda, 'baru' ); ?>><?php esc_html_e( 'Pelanggan Baru', 'ryokourent' ); ?></option>
					<option value="langganan" <?php selected( $tanda, 'langganan' ); ?>><?php esc_html_e( 'Pelanggan Langganan (Repeat Order)', 'ryokourent' ); ?></option>
				</select>
			</td>
		</tr>
		<tr>
			<th><label for="ryokou_jenis_id_pendukung"><?php esc_html_e( 'Jenis ID Pendukung (Pendamping KTP)', 'ryokourent' ); ?></label></th>
			<td>
				<select id="ryokou_jenis_id_pendukung" name="ryokou_jenis_id_pendukung">
					<option value="SIM_C" <?php selected( $jenis_id, 'SIM_C' ); ?>><?php esc_html_e( 'SIM C Aktif', 'ryokourent' ); ?></option>
					<option value="KTM" <?php selected( $jenis_id, 'KTM' ); ?>><?php esc_html_e( 'KTM (Kartu Tanda Mahasiswa)', 'ryokourent' ); ?></option>
					<option value="SIM_A" <?php selected( $jenis_id, 'SIM_A' ); ?>><?php esc_html_e( 'SIM A', 'ryokourent' ); ?></option>
					<option value="ID_KARYAWAN" <?php selected( $jenis_id, 'ID_KARYAWAN' ); ?>><?php esc_html_e( 'ID Card Karyawan / Instansi', 'ryokourent' ); ?></option>
					<option value="PASPOR" <?php selected( $jenis_id, 'PASPOR' ); ?>><?php esc_html_e( 'Paspor', 'ryokourent' ); ?></option>
					<option value="NPWP" <?php selected( $jenis_id, 'NPWP' ); ?>><?php esc_html_e( 'NPWP', 'ryokourent' ); ?></option>
					<option value="LAINNYA" <?php selected( $jenis_id, 'LAINNYA' ); ?>><?php esc_html_e( 'Lainnya', 'ryokourent' ); ?></option>
				</select>
			</td>
		</tr>
		<tr>
			<th><?php esc_html_e( 'Model Motor & Unit Armada', 'ryokourent' ); ?></th>
			<td>
				<strong><?php echo esc_html( $motor_nama ? $motor_nama : '-' ); ?></strong>
				<?php if ( $kode_unit ) : ?>
					— <span style="color:#0f766e;font-weight:bold;">Unit: <?php echo esc_html( $kode_unit ); ?></span>
				<?php else : ?>
					— <span style="color:#b45309;"><?php esc_html_e( 'Belum dikunci unit fisik', 'ryokourent' ); ?></span>
				<?php endif; ?>
			</td>
		</tr>
		<tr>
			<th><?php esc_html_e( 'Paket & Durasi Sewa', 'ryokourent' ); ?></th>
			<td>
				<strong><?php echo esc_html( $durasi_lbl ? $durasi_lbl : '1 Hari' ); ?></strong>
				(<?php echo esc_html( $mulai ); ?> WIB s/d <?php echo esc_html( $selesai ); ?> WIB)
				<?php if ( '1' === (string) $luar_jam ) : ?>
					<br><span style="color:#b45309;font-weight:600;font-size:12px;">⚠️ Jadwal berada di luar jam operasional reguler (07.00–23.00 WIB)</span>
				<?php endif; ?>
			</td>
		</tr>
		<tr>
			<th><label for="ryokou_pool"><?php esc_html_e( 'Pool Wilayah Layanan (D-26)', 'ryokourent' ); ?></label></th>
			<td>
				<select id="ryokou_pool" name="ryokou_pool">
					<option value="malang" <?php selected( $pool, 'malang' ); ?>><?php esc_html_e( 'Pool Malang (Dinoyo)', 'ryokourent' ); ?></option>
					<option value="batu" <?php selected( $pool, 'batu' ); ?>><?php esc_html_e( 'Pool Batu (Diponegoro)', 'ryokourent' ); ?></option>
				</select>
			</td>
		</tr>
		<tr>
			<th><label for="ryokou_alamat_pengantaran"><?php esc_html_e( 'Lokasi Pengantaran (Ambil Unit)', 'ryokourent' ); ?></label></th>
			<td><textarea id="ryokou_alamat_pengantaran" name="ryokou_alamat_pengantaran" rows="2" class="large-text"><?php echo esc_textarea( $alamat_antar ); ?></textarea></td>
		</tr>
		<tr>
			<th><label for="ryokou_alamat_penjemputan"><?php esc_html_e( 'Lokasi Penjemputan (Kembali Unit)', 'ryokourent' ); ?></label></th>
			<td><textarea id="ryokou_alamat_penjemputan" name="ryokou_alamat_penjemputan" rows="2" class="large-text"><?php echo esc_textarea( $alamat_jemput ); ?></textarea></td>
		</tr>
		<tr>
			<th><label for="ryokou_total_harga_estimasi"><?php esc_html_e( 'Total Estimasi Sewa (Rp)', 'ryokourent' ); ?></label></th>
			<td><input type="number" id="ryokou_total_harga_estimasi" name="ryokou_total_harga_estimasi" value="<?php echo esc_attr( $total_est ); ?>" class="regular-text" /></td>
		</tr>
		<?php if ( $total_denda > 0 || ! empty( $catatan_denda ) ) : ?>
		<tr style="background:#fff1f2;">
			<th><?php esc_html_e( 'Kalkulasi Denda Terlambat (D-27)', 'ryokourent' ); ?></th>
			<td>
				<strong style="color:#b91c1c;font-size:15px;">Rp <?php echo esc_html( number_format( $total_denda, 0, ',', '.' ) ); ?></strong>
				<?php if ( $catatan_denda ) : ?>
					<p style="margin:4px 0 0 0;font-size:12px;color:#7f1d1d;"><?php echo esc_html( $catatan_denda ); ?></p>
				<?php endif; ?>
			</td>
		</tr>
		<?php endif; ?>
		<?php if ( $wa_link ) : ?>
		<tr>
			<th><?php esc_html_e( 'Tautan Pesan WhatsApp', 'ryokourent' ); ?></th>
			<td>
				<a href="<?php echo esc_url( $wa_link ); ?>" target="_blank" rel="noopener noreferrer" class="button button-primary">Buka Format WhatsApp Booking</a>
			</td>
		</tr>
		<?php endif; ?>
	</table>
	<?php
}

/**
 * 4. Simpan Meta untuk `motor`, `ryokou_unit` (Beserta Auto-Sync `ryokou_lacak`), `ryokou_paket`, & `penyewaan`
 */
function ryokourent_save_custom_meta_boxes( $post_id, $post ) {
	if ( defined( 'DOING_AUTOSAVE' ) && DOING_AUTOSAVE ) {
		return;
	}
	if ( ! current_user_can( 'edit_post', $post_id ) ) {
		return;
	}

	// 4.1 Simpan Meta `motor`
	if ( 'motor' === $post->post_type && isset( $_POST['ryokou_motor_nonce'] ) && wp_verify_nonce( sanitize_text_field( wp_unslash( $_POST['ryokou_motor_nonce'] ) ), 'ryokou_save_motor_meta' ) ) {
		$price_fields = array(
			'ryokou_harga_harian'  => '_ryokou_harga_harian',
			'ryokou_harga_1minggu' => '_ryokou_harga_1minggu',
			'ryokou_harga_2minggu' => '_ryokou_harga_2minggu',
			'ryokou_harga_12jam'   => '_ryokou_harga_12jam',
			'ryokou_harga_9jam'    => '_ryokou_harga_9jam',
			'ryokou_harga_6jam'    => '_ryokou_harga_6jam',
			'ryokou_harga_3jam'    => '_ryokou_harga_3jam',
			'ryokou_denda_harian'  => '_ryokou_denda_harian',
		);
		foreach ( $price_fields as $input_key => $meta_key ) {
			if ( isset( $_POST[ $input_key ] ) ) {
				update_post_meta( $post_id, $meta_key, absint( $_POST[ $input_key ] ) );
			}
		}
		if ( isset( $_POST['ryokou_fasilitas'] ) ) {
			update_post_meta( $post_id, '_ryokou_fasilitas', ryokourent_sanitize_text_no_nik( wp_unslash( $_POST['ryokou_fasilitas'] ) ) );
		}
		if ( isset( $_POST['ryokou_spesifikasi'] ) ) {
			update_post_meta( $post_id, '_ryokou_spesifikasi', ryokourent_sanitize_text_no_nik( wp_unslash( $_POST['ryokou_spesifikasi'] ) ) );
		}
	}

	// 4.2 Simpan Meta `ryokou_unit` + Immutability `_ryokou_kode_unit` (D-12, QA-15) + Auto-Sync 1-Baris `ryokou_lacak` (Opsi 3A)
	if ( 'ryokou_unit' === $post->post_type && isset( $_POST['ryokou_unit_nonce'] ) && wp_verify_nonce( sanitize_text_field( wp_unslash( $_POST['ryokou_unit_nonce'] ) ), 'ryokou_save_unit_meta' ) ) {
		$existing_kode = get_post_meta( $post_id, '_ryokou_kode_unit', true );
		if ( empty( $existing_kode ) && ! empty( $_POST['ryokou_kode_unit'] ) ) {
			$new_kode = strtoupper( sanitize_text_field( wp_unslash( $_POST['ryokou_kode_unit'] ) ) );
			update_post_meta( $post_id, '_ryokou_kode_unit', $new_kode );
		}

		if ( isset( $_POST['ryokou_parent_motor_id'] ) ) {
			update_post_meta( $post_id, '_ryokou_parent_motor_id', absint( $_POST['ryokou_parent_motor_id'] ) );
		}

		$pool_lokasi = isset( $_POST['ryokou_pool_lokasi'] ) && 'batu' === $_POST['ryokou_pool_lokasi'] ? 'batu' : 'malang';
		update_post_meta( $post_id, '_ryokou_pool_lokasi', $pool_lokasi );

		if ( isset( $_POST['ryokou_nomor_plat'] ) ) {
			update_post_meta( $post_id, '_ryokou_nomor_plat', ryokourent_sanitize_text_no_nik( wp_unslash( $_POST['ryokou_nomor_plat'] ) ) );
		}
		if ( isset( $_POST['ryokou_warna'] ) ) {
			update_post_meta( $post_id, '_ryokou_warna', ryokourent_sanitize_text_no_nik( wp_unslash( $_POST['ryokou_warna'] ) ) );
		}

		$status_servis = isset( $_POST['ryokou_status_servis'] ) && 'servis' === $_POST['ryokou_status_servis'] ? 'servis' : 'aktif';
		update_post_meta( $post_id, '_ryokou_status_servis', $status_servis );

		$nama_bengkel = isset( $_POST['ryokou_nama_bengkel'] ) ? ryokourent_sanitize_text_no_nik( wp_unslash( $_POST['ryokou_nama_bengkel'] ) ) : '';
		update_post_meta( $post_id, '_ryokou_nama_bengkel', $nama_bengkel );

		if ( isset( $_POST['ryokou_km_terakhir'] ) ) {
			update_post_meta( $post_id, '_ryokou_km_terakhir', absint( $_POST['ryokou_km_terakhir'] ) );
		}
		if ( isset( $_POST['ryokou_tgl_servis_terakhir'] ) ) {
			update_post_meta( $post_id, '_ryokou_tgl_servis_terakhir', sanitize_text_field( wp_unslash( $_POST['ryokou_tgl_servis_terakhir'] ) ) );
		}

		// Cek apakah unit sedang disewa; jika tidak sedang disewa, sinkronkan ke `ryokou_lacak` sesuai status_servis
		$current_track = ryokourent_get_unit_tracking_summary( $post_id );
		$target_posisi = ( 'servis' === $status_servis ) ? 'servis' : ( 'disewa' === $current_track['status_posisi'] ? 'disewa' : 'parkir' );

		ryokourent_sync_unit_tracking(
			$post_id,
			array(
				'status_posisi' => $target_posisi,
				'pool_parkir'   => $pool_lokasi,
				'nama_bengkel'  => $nama_bengkel,
			)
		);
	}

	// 4.3 Simpan Meta `ryokou_paket`
	if ( 'ryokou_paket' === $post->post_type && isset( $_POST['ryokou_paket_nonce'] ) && wp_verify_nonce( sanitize_text_field( wp_unslash( $_POST['ryokou_paket_nonce'] ) ), 'ryokou_save_paket_meta' ) ) {
		if ( isset( $_POST['ryokou_paket_harga'] ) ) {
			update_post_meta( $post_id, '_ryokou_paket_harga', absint( $_POST['ryokou_paket_harga'] ) );
		}
		if ( isset( $_POST['ryokou_paket_durasi_angka'] ) ) {
			update_post_meta( $post_id, '_ryokou_paket_durasi_angka', max( 1, absint( $_POST['ryokou_paket_durasi_angka'] ) ) );
		}
		if ( isset( $_POST['ryokou_paket_durasi_satuan'] ) ) {
			$satuan = ( 'jam' === $_POST['ryokou_paket_durasi_satuan'] ) ? 'jam' : 'hari';
			update_post_meta( $post_id, '_ryokou_paket_durasi_satuan', $satuan );
		}
		if ( isset( $_POST['ryokou_paket_motor_id'] ) ) {
			update_post_meta( $post_id, '_ryokou_paket_motor_id', absint( $_POST['ryokou_paket_motor_id'] ) );
		}
	}

	// 4.4 Simpan Meta `penyewaan` (Data Pelanggan D-21 Tanpa NIK, Lokasi & Tarif)
	if ( 'penyewaan' === $post->post_type && isset( $_POST['ryokou_booking_nonce'] ) && wp_verify_nonce( sanitize_text_field( wp_unslash( $_POST['ryokou_booking_nonce'] ) ), 'ryokou_save_booking_meta' ) ) {
		if ( isset( $_POST['ryokou_nama'] ) ) {
			update_post_meta( $post_id, '_ryokou_nama', ryokourent_sanitize_text_no_nik( wp_unslash( $_POST['ryokou_nama'] ) ) );
		}
		if ( isset( $_POST['ryokou_nomor_wa'] ) ) {
			update_post_meta( $post_id, '_ryokou_nomor_wa', ryokourent_sanitize_text_no_nik( wp_unslash( $_POST['ryokou_nomor_wa'] ) ) );
		}
		if ( isset( $_POST['ryokou_tanda_pelanggan'] ) ) {
			$tanda = ( 'langganan' === $_POST['ryokou_tanda_pelanggan'] ) ? 'langganan' : 'baru';
			update_post_meta( $post_id, '_ryokou_tanda_pelanggan', $tanda );
		}
		if ( isset( $_POST['ryokou_jenis_id_pendukung'] ) ) {
			$allowed_ids = array( 'KTM', 'SIM_C', 'SIM_A', 'PASPOR', 'NPWP', 'ID_KARYAWAN', 'LAINNYA' );
			$jid = sanitize_text_field( wp_unslash( $_POST['ryokou_jenis_id_pendukung'] ) );
			if ( in_array( $jid, $allowed_ids, true ) ) {
				update_post_meta( $post_id, '_ryokou_jenis_id_pendukung', $jid );
			}
		}
		if ( isset( $_POST['ryokou_pool'] ) ) {
			$pool = ( 'batu' === $_POST['ryokou_pool'] ) ? 'batu' : 'malang';
			update_post_meta( $post_id, '_ryokou_pool', $pool );
		}
		if ( isset( $_POST['ryokou_alamat_pengantaran'] ) ) {
			update_post_meta( $post_id, '_ryokou_alamat_pengantaran', ryokourent_sanitize_text_no_nik( wp_unslash( $_POST['ryokou_alamat_pengantaran'] ) ) );
		}
		if ( isset( $_POST['ryokou_alamat_penjemputan'] ) ) {
			update_post_meta( $post_id, '_ryokou_alamat_penjemputan', ryokourent_sanitize_text_no_nik( wp_unslash( $_POST['ryokou_alamat_penjemputan'] ) ) );
		}
		if ( isset( $_POST['ryokou_total_harga_estimasi'] ) ) {
			update_post_meta( $post_id, '_ryokou_total_harga_estimasi', absint( $_POST['ryokou_total_harga_estimasi'] ) );
		}
	}
}
add_action( 'save_post', 'ryokourent_save_custom_meta_boxes', 10, 2 );

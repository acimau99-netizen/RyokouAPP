<?php
/**
 * Registrasi 5 Custom Post Types, Taksonomi, Custom Post Status, RBAC Role Operator, & Auto-Purge 48 Jam
 *
 * Menerapkan:
 * - D-02 & D-22: Role `ryokou_operator` dengan akses penuh operasional kecuali hapus master model/unit & kelola user.
 * - D-04: 4 Custom Post Status resmi (`ryokou_booking`, `ryokou_approved`, `ryokou_disewa`, `ryokou_selesai`) + `ryokou_servis`.
 * - D-12 & D-18: CPT `motor`, `ryokou_unit`, `penyewaan`, `ryokou_paket`, dan taksonomi `kategori_motor`.
 * - D-14: WP-Cron `twicedaily` + Lazy Purge booking berstatus `ryokou_booking` yang kedaluwarsa > 48 jam.
 * - D-26: CPT `ryokou_lacak` (Lacak Unit) — 1 baris per unit fisik untuk pantau Parkir Pool / Servis Bengkel / Sedang Disewa.
 *
 * @package Ryokourent_Core
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * 1. Registrasi 5 CPT & Taksonomi `kategori_motor`
 */
function ryokourent_register_post_types() {

	// 1.1 Taksonomi: Kategori Motor (Matic, Sport, Trail, Retro)
	register_taxonomy(
		'kategori_motor',
		array( 'motor' ),
		array(
			'labels'            => array(
				'name'          => __( 'Kategori Motor', 'ryokourent' ),
				'singular_name' => __( 'Kategori Motor', 'ryokourent' ),
				'search_items'  => __( 'Cari Kategori', 'ryokourent' ),
				'all_items'     => __( 'Semua Kategori', 'ryokourent' ),
				'edit_item'     => __( 'Edit Kategori', 'ryokourent' ),
				'add_new_item'  => __( 'Tambah Kategori Motor', 'ryokourent' ),
				'menu_name'     => __( 'Kategori Motor', 'ryokourent' ),
			),
			'hierarchical'      => true,
			'public'            => true,
			'show_ui'           => true,
			'show_admin_column' => true,
			'show_in_rest'      => true,
			'rewrite'           => array( 'slug' => 'kategori-motor' ),
		)
	);

	// 1.2 CPT 1: Katalog Jenis Motor (Tingkat 1)
	register_post_type(
		'motor',
		array(
			'labels'          => array(
				'name'               => __( 'Katalog Motor', 'ryokourent' ),
				'singular_name'      => __( 'Model Motor', 'ryokourent' ),
				'add_new'            => __( 'Tambah Model Baru', 'ryokourent' ),
				'add_new_item'       => __( 'Tambah Model Motor Baru', 'ryokourent' ),
				'edit_item'          => __( 'Edit Model Motor & Tarif', 'ryokourent' ),
				'all_items'          => __( 'Katalog Motor', 'ryokourent' ),
				'search_items'       => __( 'Cari Model Motor', 'ryokourent' ),
				'not_found'          => __( 'Model motor tidak ditemukan.', 'ryokourent' ),
			),
			'public'          => true,
			'has_archive'     => true,
			'menu_icon'       => 'dashicons-Performance',
			'menu_position'   => 25,
			'supports'        => array( 'title', 'editor', 'thumbnail', 'excerpt' ),
			'taxonomies'      => array( 'kategori_motor' ),
			'capability_type' => 'post',
			'map_meta_cap'    => true,
			'rewrite'         => array( 'slug' => 'sewa-motor' ),
		)
	);

	// 1.3 CPT 2: Unit Fisik Garasi (Tingkat 2 — Admin Only)
	register_post_type(
		'ryokou_unit',
		array(
			'labels'          => array(
				'name'          => __( 'Unit Armada Fisik', 'ryokourent' ),
				'singular_name' => __( 'Unit Motor', 'ryokourent' ),
				'add_new'       => __( 'Tambah Unit Fisik', 'ryokourent' ),
				'add_new_item'  => __( 'Tambah Unit Fisik Baru', 'ryokourent' ),
				'edit_item'     => __( 'Edit Unit Fisik', 'ryokourent' ),
				'all_items'     => __( 'Unit Armada (Garasi)', 'ryokourent' ),
			),
			'public'          => false,
			'show_ui'         => true,
			'show_in_menu'    => 'edit.php?post_type=motor',
			'supports'        => array( 'title' ),
			'capability_type' => 'post',
			'map_meta_cap'    => true,
		)
	);

	// 1.4 CPT 3: Lacak Unit Real-Time (D-26 & Opsi 3A: 1 Baris per Unit Fisik)
	register_post_type(
		'ryokou_lacak',
		array(
			'labels'          => array(
				'name'               => __( 'Lacak Unit', 'ryokourent' ),
				'singular_name'      => __( 'Lacak Posisi Unit', 'ryokourent' ),
				'menu_name'          => __( 'Lacak Unit (Posisi)', 'ryokourent' ),
				'all_items'          => __( 'Semua Posisi Unit', 'ryokourent' ),
				'add_new'            => __( 'Tambah Lacak Manual', 'ryokourent' ),
				'add_new_item'       => __( 'Tambah Data Lacak Unit', 'ryokourent' ),
				'edit_item'          => __( 'Update Posisi Unit (Pool / Bengkel / Sewa)', 'ryokourent' ),
				'search_items'       => __( 'Cari Kode Unit / Bengkel / Penyewa', 'ryokourent' ),
				'not_found'          => __( 'Belum ada data pelacakan unit.', 'ryokourent' ),
			),
			'public'          => false,
			'show_ui'         => true,
			'show_in_menu'    => true,
			'menu_icon'       => 'dashicons-location-alt',
			'menu_position'   => 26,
			'supports'        => array( 'title' ),
			'capability_type' => 'post',
			'map_meta_cap'    => true,
		)
	);

	// 1.5 CPT 4: Transaksi Penyewaan / Booking (Admin Only)
	register_post_type(
		'penyewaan',
		array(
			'labels'          => array(
				'name'          => __( 'Data Penyewaan', 'ryokourent' ),
				'singular_name' => __( 'Penyewaan', 'ryokourent' ),
				'menu_name'     => __( 'Penyewaan (Booking)', 'ryokourent' ),
				'all_items'     => __( 'Semua Penyewaan', 'ryokourent' ),
				'add_new'       => __( 'Input Booking Manual', 'ryokourent' ),
				'add_new_item'  => __( 'Tambah Penyewaan Manual', 'ryokourent' ),
				'edit_item'     => __( 'Detail Penyewaan & Unit', 'ryokourent' ),
				'search_items'  => __( 'Cari No Booking / Nama Penyewa', 'ryokourent' ),
			),
			'public'          => false,
			'show_ui'         => true,
			'show_in_menu'    => true,
			'menu_icon'       => 'dashicons-calendar-alt',
			'menu_position'   => 27,
			'supports'        => array( 'title' ),
			'capability_type' => 'post',
			'map_meta_cap'    => true,
		)
	);

	// 1.6 CPT 5: Paket Promo & Wisata Dinamis (D-18)
	register_post_type(
		'ryokou_paket',
		array(
			'labels'          => array(
				'name'          => __( 'Paket Sewa & Promo', 'ryokourent' ),
				'singular_name' => __( 'Paket Sewa', 'ryokourent' ),
				'add_new'       => __( 'Tambah Paket Baru', 'ryokourent' ),
				'add_new_item'  => __( 'Tambah Paket Sewa / Promo', 'ryokourent' ),
				'edit_item'     => __( 'Edit Paket Sewa', 'ryokourent' ),
				'all_items'     => __( 'Paket Sewa & Promo', 'ryokourent' ),
			),
			'public'          => false,
			'show_ui'         => true,
			'show_in_menu'    => 'edit.php?post_type=motor',
			'supports'        => array( 'title' ),
			'capability_type' => 'post',
			'map_meta_cap'    => true,
		)
	);
}
add_action( 'init', 'ryokourent_register_post_types' );

/**
 * 2. Registrasi 4 Custom Post Status Penyewaan (D-04) + Status Servis Unit (D-12)
 */
function ryokourent_register_post_statuses() {
	$booking_statuses = array(
		'ryokou_booking'  => array(
			'label' => _x( 'Booking', 'post status', 'ryokourent' ),
			'count' => _n_noop( 'Booking <span class="count">(%s)</span>', 'Booking <span class="count">(%s)</span>', 'ryokourent' ),
		),
		'ryokou_approved' => array(
			'label' => _x( 'Approve Booking', 'post status', 'ryokourent' ),
			'count' => _n_noop( 'Approve Booking <span class="count">(%s)</span>', 'Approve Booking <span class="count">(%s)</span>', 'ryokourent' ),
		),
		'ryokou_disewa'   => array(
			'label' => _x( 'Disewa', 'post status', 'ryokourent' ),
			'count' => _n_noop( 'Disewa <span class="count">(%s)</span>', 'Disewa <span class="count">(%s)</span>', 'ryokourent' ),
		),
		'ryokou_selesai'  => array(
			'label' => _x( 'Selesai', 'post status', 'ryokourent' ),
			'count' => _n_noop( 'Selesai <span class="count">(%s)</span>', 'Selesai <span class="count">(%s)</span>', 'ryokourent' ),
		),
		'ryokou_servis'   => array(
			'label' => _x( 'Servis Bengkel', 'post status', 'ryokourent' ),
			'count' => _n_noop( 'Servis <span class="count">(%s)</span>', 'Servis <span class="count">(%s)</span>', 'ryokourent' ),
		),
	);

	foreach ( $booking_statuses as $status_key => $args ) {
		register_post_status(
			$status_key,
			array(
				'label'                     => $args['label'],
				'public'                    => true,
				'exclude_from_search'       => false,
				'show_in_admin_all_list'    => true,
				'show_in_admin_status_list' => true,
				'label_count'               => $args['count'],
			)
		);
	}
}
add_action( 'init', 'ryokourent_register_post_statuses' );

/**
 * 3. RBAC Role `ryokou_operator` & Pembatasan Hapus Master (D-02, D-20, D-22)
 *
 * Operator memiliki akses operasional penuh (edit harga, paket, bulk pricing,
 * kelola booking, update Lacak Unit, ganti nomor WA via `ryokourent_manage_settings`),
 * KECUALI kelola akun user dan hapus master `motor` / `ryokou_unit` / `ryokou_lacak`.
 */
function ryokourent_setup_operator_role() {
	$admin_role = get_role( 'administrator' );
	if ( $admin_role && ! $admin_role->has_cap( 'ryokourent_manage_settings' ) ) {
		$admin_role->add_cap( 'ryokourent_manage_settings' );
	}

	if ( ! get_role( 'ryokou_operator' ) ) {
		add_role(
			'ryokou_operator',
			__( 'Operator Rental (Ryokourent)', 'ryokourent' ),
			array(
				'read'                       => true,
				'upload_files'               => true,
				'edit_posts'                 => true,
				'edit_others_posts'          => true,
				'edit_published_posts'       => true,
				'publish_posts'              => true,
				'delete_posts'               => true,
				'delete_others_posts'        => true,
				'delete_published_posts'     => true,
				'manage_categories'          => true,
				'ryokourent_manage_settings' => true,
			)
		);
	} else {
		$op_role = get_role( 'ryokou_operator' );
		if ( $op_role && ! $op_role->has_cap( 'ryokourent_manage_settings' ) ) {
			$op_role->add_cap( 'ryokourent_manage_settings' );
		}
	}
}
add_action( 'init', 'ryokourent_setup_operator_role', 20 );

/**
 * Filter `map_meta_cap`:
 * 1. Mencegah `ryokou_operator` menghapus master `motor`, `ryokou_unit`, dan `ryokou_lacak` (D-02).
 * 2. Mencegah siapa pun (termasuk Admin) menghapus langsung `penyewaan` yang sedang berstatus `ryokou_disewa` (D-20, F-21).
 */
function ryokourent_restrict_capabilities( $caps, $cap, $user_id, $args ) {
	if ( in_array( $cap, array( 'delete_post', 'delete_page' ), true ) && ! empty( $args[0] ) ) {
		$post_id = absint( $args[0] );
		$post    = get_post( $post_id );
		if ( ! $post ) {
			return $caps;
		}

		// Proteksi D-20 & F-21: Penyewaan berstatus 'ryokou_disewa' tidak boleh di-trash/delete sebelum Selesai
		if ( 'penyewaan' === $post->post_type && 'ryokou_disewa' === $post->post_status ) {
			return array( 'do_not_allow' );
		}

		// Proteksi D-02: Role ryokou_operator dilarang menghapus master katalog motor, unit fisik, & baris lacak unit
		$user = get_userdata( $user_id );
		if ( $user && in_array( 'ryokou_operator', (array) $user->roles, true ) && ! in_array( 'administrator', (array) $user->roles, true ) ) {
			if ( in_array( $post->post_type, array( 'motor', 'ryokou_unit', 'ryokou_lacak' ), true ) ) {
				return array( 'do_not_allow' );
			}
		}
	}
	return $caps;
}
add_filter( 'map_meta_cap', 'ryokourent_restrict_capabilities', 10, 4 );

/**
 * 4. Pembersihan Otomatis Booking Gantung > 48 Jam (D-14: WP-Cron + Lazy Purge)
 *
 * Hanya menghapus post `penyewaan` yang masih berstatus `ryokou_booking` (belum di-Approve)
 * dan sudah berusia lebih dari 48 jam (172800 detik).
 */
function ryokourent_purge_expired_unapproved_bookings() {
	$cutoff_epoch = time() - ( 48 * HOUR_IN_SECONDS );

	$expired_bookings = get_posts(
		array(
			'post_type'      => 'penyewaan',
			'post_status'    => array( 'ryokou_booking' ),
			'posts_per_page' => 30,
			'fields'         => 'ids',
			'meta_query'     => array(
				array(
					'key'     => '_ryokou_created_at',
					'value'   => $cutoff_epoch,
					'compare' => '<=',
					'type'    => 'NUMERIC',
				),
			),
		)
	);

	if ( ! empty( $expired_bookings ) ) {
		foreach ( $expired_bookings as $booking_id ) {
			wp_delete_post( $booking_id, true );
		}
	}
}
add_action( 'ryokourent_cron_purge_expired_bookings', 'ryokourent_purge_expired_unapproved_bookings' );

/**
 * Jadwalkan WP-Cron `twicedaily` & jalankan Lazy Purge ringan saat admin dibuka (maks 1x per 15 menit via transient).
 */
function ryokourent_schedule_and_lazy_purge() {
	if ( ! wp_next_scheduled( 'ryokourent_cron_purge_expired_bookings' ) ) {
		wp_schedule_event( time(), 'twicedaily', 'ryokourent_cron_purge_expired_bookings' );
	}

	if ( is_admin() && false === get_transient( 'ryokourent_lazy_purge_lock' ) ) {
		set_transient( 'ryokourent_lazy_purge_lock', 1, 15 * MINUTE_IN_SECONDS );
		ryokourent_purge_expired_unapproved_bookings();
	}
}
add_action( 'admin_init', 'ryokourent_schedule_and_lazy_purge' );

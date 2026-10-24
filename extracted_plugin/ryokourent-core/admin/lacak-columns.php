<?php
/**
 * Kolom Admin, Filter Dropdown, & Metabox Update Cepat CPT `ryokou_lacak` (D-26 & Opsi 3A: 1 Baris per Unit)
 *
 * Menerapkan:
 * - D-26 & Opsi 3A: Setiap unit fisik (`ryokou_unit`) direpresentasikan oleh 1 baris di `ryokou_lacak`.
 * - Menampilkan posisi real-time:
 *   1) Parkir di Pool mana (`Pool Malang` / `Pool Batu`)
 *   2) Servis di Bengkel mana (nama bengkel, kontak mekanik, estimasi selesai)
 *   3) Posisi Sewa (nama penyewa, nomor booking, jadwal kembali)
 * - Dilengkapi tombol Sinkronisasi Armada untuk memastikan seluruh unit fisik terdaftar di Lacak Unit.
 *
 * @package Ryokourent_Core
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * 1. Definisi Kolom Tabel Admin CPT `ryokou_lacak`
 */
function ryokourent_lacak_admin_columns( $columns ) {
	return array(
		'cb'            => '<input type="checkbox" />',
		'kode_unit'     => __( 'Kode Unit & Plat', 'ryokourent' ),
		'model_motor'   => __( 'Model Motor', 'ryokourent' ),
		'status_posisi' => __( 'Status Posisi Saat Ini (D-26)', 'ryokourent' ),
		'detail_lokasi' => __( 'Detail Pool / Bengkel / Penyewa Aktif', 'ryokourent' ),
		'catatan_audit' => __( 'Update Terakhir (WIB)', 'ryokourent' ),
	);
}
add_filter( 'manage_ryokou_lacak_posts_columns', 'ryokourent_lacak_admin_columns' );

/**
 * 2. Render Isi Kolom Tabel Admin CPT `ryokou_lacak`
 */
function ryokourent_lacak_render_columns( $column, $post_id ) {
	$unit_id   = absint( get_post_meta( $post_id, '_ryokou_lacak_unit_id', true ) );
	$kode_unit = get_post_meta( $post_id, '_ryokou_lacak_kode_unit', true );
	$motor_id  = absint( get_post_meta( $post_id, '_ryokou_lacak_motor_id', true ) );
	$posisi    = get_post_meta( $post_id, '_ryokou_lacak_status_posisi', true );
	$pool      = get_post_meta( $post_id, '_ryokou_lacak_pool_parkir', true );
	$pool_lbl  = ( 'batu' === $pool ) ? 'Pool Batu (Diponegoro)' : 'Pool Malang (Dinoyo)';

	switch ( $column ) {
		case 'kode_unit':
			$plat = $unit_id ? get_post_meta( $unit_id, '_ryokou_nomor_plat', true ) : '';
			echo '<strong><a href="' . esc_url( get_edit_post_link( $post_id ) ) . '">' . esc_html( $kode_unit ? $kode_unit : get_the_title( $post_id ) ) . '</a></strong>';
			if ( $plat ) {
				echo '<br><small style="color:#64748b;">' . esc_html( $plat ) . '</small>';
			}
			break;

		case 'model_motor':
			echo esc_html( $motor_id ? get_the_title( $motor_id ) : '-' );
			break;

		case 'status_posisi':
			if ( 'servis' === $posisi ) {
				echo '<span style="display:inline-block;padding:4px 10px;border-radius:4px;background:#fef3c7;color:#92400e;font-weight:700;">🔧 Servis di Bengkel</span>';
			} elseif ( 'disewa' === $posisi ) {
				echo '<span style="display:inline-block;padding:4px 10px;border-radius:4px;background:#dbeafe;color:#1e40af;font-weight:700;">🛵 Sedang Disewa</span>';
			} else {
				echo '<span style="display:inline-block;padding:4px 10px;border-radius:4px;background:#dcfce7;color:#166534;font-weight:700;">🅿️ Parkir di Pool</span>';
			}
			break;

		case 'detail_lokasi':
			if ( 'servis' === $posisi ) {
				$bengkel  = get_post_meta( $post_id, '_ryokou_lacak_nama_bengkel', true );
				$kontak   = get_post_meta( $post_id, '_ryokou_lacak_kontak_bengkel', true );
				$estimasi = get_post_meta( $post_id, '_ryokou_lacak_estimasi_selesai_servis', true );
				echo '<strong>Bengkel:</strong> ' . esc_html( $bengkel ? $bengkel : '-' ) . '<br>';
				echo '<small>Kontak: ' . esc_html( $kontak ? $kontak : '-' ) . ' | Est. Selesai: ' . esc_html( $estimasi ? $estimasi : '-' ) . '</small>';
			} elseif ( 'disewa' === $posisi ) {
				$penyewa = get_post_meta( $post_id, '_ryokou_lacak_nama_penyewa', true );
				$nobook  = get_post_meta( $post_id, '_ryokou_lacak_no_booking', true );
				$tenggat = get_post_meta( $post_id, '_ryokou_lacak_tenggat_kembali', true );
				echo '<strong>Penyewa:</strong> ' . esc_html( $penyewa ? $penyewa : '-' ) . ' (<code>' . esc_html( $nobook ? $nobook : '-' ) . '</code>)<br>';
				echo '<small>Jadwal Kembali: ' . esc_html( $tenggat ? $tenggat : '-' ) . ' WIB</small>';
			} else {
				echo '<strong>Lokasi Parkir:</strong> ' . esc_html( $pool_lbl );
			}
			break;

		case 'catatan_audit':
			$catatan    = get_post_meta( $post_id, '_ryokou_lacak_catatan', true );
			$updated_at = get_post_meta( $post_id, '_ryokou_lacak_updated_at', true );
			$updated_by = get_post_meta( $post_id, '_ryokou_lacak_updated_by', true );
			if ( $catatan ) {
				echo '<em>"' . esc_html( $catatan ) . '"</em><br>';
			}
			echo '<small style="color:#64748b;">' . esc_html( $updated_at ? $updated_at : '-' ) . ' oleh ' . esc_html( $updated_by ? $updated_by : 'System' ) . '</small>';
			break;
	}
}
add_action( 'manage_ryokou_lacak_posts_custom_column', 'ryokourent_lacak_render_columns', 10, 2 );

/**
 * 3. Filter Dropdown di Atas Tabel `ryokou_lacak` (Filter Status Posisi & Pool Parkir)
 */
function ryokourent_lacak_filter_dropdowns( $post_type ) {
	if ( 'ryokou_lacak' !== $post_type ) {
		return;
	}
	$cur_posisi = isset( $_GET['filter_posisi'] ) ? sanitize_key( $_GET['filter_posisi'] ) : '';
	$cur_pool   = isset( $_GET['filter_pool'] ) ? sanitize_key( $_GET['filter_pool'] ) : '';
	?>
	<select name="filter_posisi">
		<option value=""><?php esc_html_e( 'Semua Status Posisi', 'ryokourent' ); ?></option>
		<option value="parkir" <?php selected( $cur_posisi, 'parkir' ); ?>><?php esc_html_e( '🅿️ Parkir di Pool', 'ryokourent' ); ?></option>
		<option value="disewa" <?php selected( $cur_posisi, 'disewa' ); ?>><?php esc_html_e( '🛵 Sedang Disewa', 'ryokourent' ); ?></option>
		<option value="servis" <?php selected( $cur_posisi, 'servis' ); ?>><?php esc_html_e( '🔧 Servis di Bengkel', 'ryokourent' ); ?></option>
	</select>
	<select name="filter_pool">
		<option value=""><?php esc_html_e( 'Semua Pool Parkir', 'ryokourent' ); ?></option>
		<option value="malang" <?php selected( $cur_pool, 'malang' ); ?>><?php esc_html_e( 'Pool Malang (Dinoyo)', 'ryokourent' ); ?></option>
		<option value="batu" <?php selected( $cur_pool, 'batu' ); ?>><?php esc_html_e( 'Pool Batu (Diponegoro)', 'ryokourent' ); ?></option>
	</select>
	<?php
}
add_action( 'restrict_manage_posts', 'ryokourent_lacak_filter_dropdowns' );

function ryokourent_lacak_apply_filters( $query ) {
	if ( ! is_admin() || ! $query->is_main_query() || 'ryokou_lacak' !== $query->get( 'post_type' ) ) {
		return;
	}
	$meta_query = array();
	if ( ! empty( $_GET['filter_posisi'] ) ) {
		$meta_query[] = array(
			'key'   => '_ryokou_lacak_status_posisi',
			'value' => sanitize_key( $_GET['filter_posisi'] ),
		);
	}
	if ( ! empty( $_GET['filter_pool'] ) ) {
		$meta_query[] = array(
			'key'   => '_ryokou_lacak_pool_parkir',
			'value' => sanitize_key( $_GET['filter_pool'] ),
		);
	}
	if ( ! empty( $meta_query ) ) {
		$query->set( 'meta_query', $meta_query );
	}
}
add_action( 'pre_get_posts', 'ryokourent_lacak_apply_filters' );

/**
 * 4. Metabox Edit Cepat Posisi Unit di CPT `ryokou_lacak` (Opsi 3A: Update 1 Baris Unit)
 */
function ryokourent_add_lacak_metabox() {
	add_meta_box(
		'ryokou_lacak_editor_box',
		__( 'Update Posisi Unit Real-Time (Parkir Pool / Servis Bengkel / Posisi Sewa) [D-26]', 'ryokourent' ),
		'ryokourent_render_lacak_metabox',
		'ryokou_lacak',
		'normal',
		'high'
	);
}
add_action( 'add_meta_boxes', 'ryokourent_add_lacak_metabox' );

function ryokourent_render_lacak_metabox( $post ) {
	wp_nonce_field( 'ryokou_save_lacak_meta', 'ryokou_lacak_nonce' );
	$unit_id   = absint( get_post_meta( $post->ID, '_ryokou_lacak_unit_id', true ) );
	$posisi    = get_post_meta( $post->ID, '_ryokou_lacak_status_posisi', true );
	if ( ! $posisi ) {
		$posisi = 'parkir';
	}
	$pool      = get_post_meta( $post->ID, '_ryokou_lacak_pool_parkir', true );
	if ( ! $pool ) {
		$pool = 'malang';
	}
	$bengkel   = get_post_meta( $post->ID, '_ryokou_lacak_nama_bengkel', true );
	$kontak    = get_post_meta( $post->ID, '_ryokou_lacak_kontak_bengkel', true );
	$estimasi  = get_post_meta( $post->ID, '_ryokou_lacak_estimasi_selesai_servis', true );
	$penyewa   = get_post_meta( $post->ID, '_ryokou_lacak_nama_penyewa', true );
	$nobook    = get_post_meta( $post->ID, '_ryokou_lacak_no_booking', true );
	$tenggat   = get_post_meta( $post->ID, '_ryokou_lacak_tenggat_kembali', true );
	$catatan   = get_post_meta( $post->ID, '_ryokou_lacak_catatan', true );

	$units = get_posts(
		array(
			'post_type'      => 'ryokou_unit',
			'post_status'    => array( 'publish', 'ryokou_servis' ),
			'posts_per_page' => -1,
		)
	);
	?>
	<table class="form-table">
		<tr>
			<th><label for="ryokou_lacak_unit_id"><?php esc_html_e( 'Unit Fisik', 'ryokourent' ); ?></label></th>
			<td>
				<select id="ryokou_lacak_unit_id" name="ryokou_lacak_unit_id" required>
					<option value=""><?php esc_html_e( '-- Pilih Unit Fisik --', 'ryokourent' ); ?></option>
					<?php foreach ( $units as $u ) : ?>
						<?php $ku = get_post_meta( $u->ID, '_ryokou_kode_unit', true ); ?>
						<option value="<?php echo esc_attr( $u->ID ); ?>" <?php selected( $unit_id, $u->ID ); ?>>
							<?php echo esc_html( ( $ku ? $ku : $u->post_title ) . ' — ' . $u->post_title ); ?>
						</option>
					<?php endforeach; ?>
				</select>
			</td>
		</tr>
		<tr>
			<th><label for="ryokou_lacak_status_posisi"><?php esc_html_e( 'Status Posisi Saat Ini', 'ryokourent' ); ?></label></th>
			<td>
				<select id="ryokou_lacak_status_posisi" name="ryokou_lacak_status_posisi">
					<option value="parkir" <?php selected( $posisi, 'parkir' ); ?>><?php esc_html_e( '🅿️ Parkir di Pool (Siap Sewa)', 'ryokourent' ); ?></option>
					<option value="servis" <?php selected( $posisi, 'servis' ); ?>><?php esc_html_e( '🔧 Servis di Bengkel', 'ryokourent' ); ?></option>
					<option value="disewa" <?php selected( $posisi, 'disewa' ); ?>><?php esc_html_e( '🛵 Sedang Disewa Penyewa', 'ryokourent' ); ?></option>
				</select>
			</td>
		</tr>
		<tr>
			<th><label for="ryokou_lacak_pool_parkir"><?php esc_html_e( 'Lokasi Pool Parkir (Jika Parkir)', 'ryokourent' ); ?></label></th>
			<td>
				<select id="ryokou_lacak_pool_parkir" name="ryokou_lacak_pool_parkir">
					<option value="malang" <?php selected( $pool, 'malang' ); ?>><?php esc_html_e( 'Pool Malang (Dinoyo)', 'ryokourent' ); ?></option>
					<option value="batu" <?php selected( $pool, 'batu' ); ?>><?php esc_html_e( 'Pool Batu (Diponegoro)', 'ryokourent' ); ?></option>
				</select>
			</td>
		</tr>
		<tr>
			<th><label for="ryokou_lacak_nama_bengkel"><?php esc_html_e( 'Nama Bengkel (Jika Servis)', 'ryokourent' ); ?></label></th>
			<td><input type="text" id="ryokou_lacak_nama_bengkel" name="ryokou_lacak_nama_bengkel" value="<?php echo esc_attr( $bengkel ); ?>" class="regular-text" placeholder="Contoh: AHASS Dinoyo Malang" /></td>
		</tr>
		<tr>
			<th><label for="ryokou_lacak_kontak_bengkel"><?php esc_html_e( 'Kontak Mekanik / Bengkel', 'ryokourent' ); ?></label></th>
			<td><input type="text" id="ryokou_lacak_kontak_bengkel" name="ryokou_lacak_kontak_bengkel" value="<?php echo esc_attr( $kontak ); ?>" class="regular-text" placeholder="0812xxxx" /></td>
		</tr>
		<tr>
			<th><label for="ryokou_lacak_estimasi_selesai"><?php esc_html_e( 'Estimasi Selesai Servis', 'ryokourent' ); ?></label></th>
			<td><input type="text" id="ryokou_lacak_estimasi_selesai" name="ryokou_lacak_estimasi_selesai" value="<?php echo esc_attr( $estimasi ); ?>" class="regular-text" placeholder="Contoh: Besok 14:00 WIB" /></td>
		</tr>
		<tr>
			<th><label><?php esc_html_e( 'Info Penyewa Aktif (Jika Disewa)', 'ryokourent' ); ?></label></th>
			<td>
				<input type="text" name="ryokou_lacak_nama_penyewa" value="<?php echo esc_attr( $penyewa ); ?>" placeholder="Nama Penyewa" class="regular-text" />
				<input type="text" name="ryokou_lacak_no_booking" value="<?php echo esc_attr( $nobook ); ?>" placeholder="No. Booking (RYK-...)" style="width:160px;" />
				<input type="text" name="ryokou_lacak_tenggat_kembali" value="<?php echo esc_attr( $tenggat ); ?>" placeholder="Jadwal Kembali" style="width:160px;" />
			</td>
		</tr>
		<tr>
			<th><label for="ryokou_lacak_catatan"><?php esc_html_e( 'Catatan Operasional Unit', 'ryokourent' ); ?></label></th>
			<td><input type="text" id="ryokou_lacak_catatan" name="ryokou_lacak_catatan" value="<?php echo esc_attr( $catatan ); ?>" class="large-text" /></td>
		</tr>
	</table>
	<?php
}

function ryokourent_save_lacak_metabox( $post_id, $post ) {
	if ( defined( 'DOING_AUTOSAVE' ) && DOING_AUTOSAVE ) {
		return;
	}
	if ( 'ryokou_lacak' !== $post->post_type || ! current_user_can( 'edit_post', $post_id ) ) {
		return;
	}
	if ( ! isset( $_POST['ryokou_lacak_nonce'] ) || ! wp_verify_nonce( sanitize_text_field( wp_unslash( $_POST['ryokou_lacak_nonce'] ) ), 'ryokou_save_lacak_meta' ) ) {
		return;
	}

	$unit_id = isset( $_POST['ryokou_lacak_unit_id'] ) ? absint( $_POST['ryokou_lacak_unit_id'] ) : 0;
	if ( ! $unit_id ) {
		return;
	}

	// Lepas hook sementara agar tidak rekursif saat memanggil helper sinkronisasi 1-baris
	remove_action( 'save_post', 'ryokourent_save_lacak_metabox', 10 );

	ryokourent_sync_unit_tracking(
		$unit_id,
		array(
			'status_posisi'    => isset( $_POST['ryokou_lacak_status_posisi'] ) ? sanitize_key( $_POST['ryokou_lacak_status_posisi'] ) : 'parkir',
			'pool_parkir'      => isset( $_POST['ryokou_lacak_pool_parkir'] ) ? sanitize_key( $_POST['ryokou_lacak_pool_parkir'] ) : 'malang',
			'nama_bengkel'     => isset( $_POST['ryokou_lacak_nama_bengkel'] ) ? sanitize_text_field( wp_unslash( $_POST['ryokou_lacak_nama_bengkel'] ) ) : '',
			'kontak_bengkel'   => isset( $_POST['ryokou_lacak_kontak_bengkel'] ) ? sanitize_text_field( wp_unslash( $_POST['ryokou_lacak_kontak_bengkel'] ) ) : '',
			'estimasi_selesai' => isset( $_POST['ryokou_lacak_estimasi_selesai'] ) ? sanitize_text_field( wp_unslash( $_POST['ryokou_lacak_estimasi_selesai'] ) ) : '',
			'nama_penyewa'     => isset( $_POST['ryokou_lacak_nama_penyewa'] ) ? sanitize_text_field( wp_unslash( $_POST['ryokou_lacak_nama_penyewa'] ) ) : '',
			'no_booking'       => isset( $_POST['ryokou_lacak_no_booking'] ) ? sanitize_text_field( wp_unslash( $_POST['ryokou_lacak_no_booking'] ) ) : '',
			'tenggat_kembali'  => isset( $_POST['ryokou_lacak_tenggat_kembali'] ) ? sanitize_text_field( wp_unslash( $_POST['ryokou_lacak_tenggat_kembali'] ) ) : '',
			'catatan'          => isset( $_POST['ryokou_lacak_catatan'] ) ? sanitize_text_field( wp_unslash( $_POST['ryokou_lacak_catatan'] ) ) : '',
		)
	);

	add_action( 'save_post', 'ryokourent_save_lacak_metabox', 10, 2 );
}
add_action( 'save_post', 'ryokourent_save_lacak_metabox', 10, 2 );

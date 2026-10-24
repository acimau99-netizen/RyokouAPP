<?php
/**
 * Plugin Name: Ryokourent Core
 * Plugin URI:  https://ryokourent.com
 * Description: Sistem Inti Rental Motor Ryokourent v2.1 (Malang Raya & Kota Wisata Batu) — Mendukung CPT Lacak Unit (D-26), Armada Global Tanpa Partisi Pool (D-26), & Aturan Denda ShortRent Step-Up 60 Menit / 12 Jam = Harian (D-27).
 * Version:     2.1.0
 * Author:      Ryokourent Dev Team
 * Text Domain: ryokourent
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

define( 'RYOKOURENT_VERSION', '2.1.0' );
define( 'RYOKOURENT_PLUGIN_DIR', plugin_dir_path( __FILE__ ) );
define( 'RYOKOURENT_PLUGIN_URL', plugin_dir_url( __FILE__ ) );

// Muat modul-modul utama
require_once RYOKOURENT_PLUGIN_DIR . 'includes/post-types.php';
require_once RYOKOURENT_PLUGIN_DIR . 'includes/meta-fields.php';
require_once RYOKOURENT_PLUGIN_DIR . 'includes/availability.php';
require_once RYOKOURENT_PLUGIN_DIR . 'includes/booking.php';
require_once RYOKOURENT_PLUGIN_DIR . 'includes/whatsapp.php';
require_once RYOKOURENT_PLUGIN_DIR . 'admin/lacak-columns.php';
require_once RYOKOURENT_PLUGIN_DIR . 'admin/booking-columns.php';
require_once RYOKOURENT_PLUGIN_DIR . 'public/forms.php';
require_once RYOKOURENT_PLUGIN_DIR . 'includes/rest-api.php';

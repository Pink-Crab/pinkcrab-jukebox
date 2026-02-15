<?php
/**
 * Plugin Name: PinkCrab Jukebox
 * Plugin URI: https://github.com/Pink-Crab/pinkcrab-jukebox
 * Description: A responsive audio jukebox block with queue, shuffle, and repeat functionality.
 * Author: PinkCrab
 * Version: 1.0.0
 * License: GPL2+
 * License URI: https://www.gnu.org/licenses/gpl-2.0.txt
 * Text Domain: pinkcrab-jukebox
 *
 * @package pinkcrab-jukebox
 */

namespace PinkCrab\Jukebox;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

define( 'PINKCRAB_JUKEBOX_VERSION', '1.0.0' );
define( 'PINKCRAB_JUKEBOX_PLUGIN_DIR', untrailingslashit( plugin_dir_path( __FILE__ ) ) );
define( 'PINKCRAB_JUKEBOX_PLUGIN_URL', untrailingslashit( plugin_dir_url( __FILE__ ) ) );

require_once PINKCRAB_JUKEBOX_PLUGIN_DIR . '/includes/class-jukebox.php';

add_action( 'plugins_loaded', array( Jukebox::class, 'init' ) );

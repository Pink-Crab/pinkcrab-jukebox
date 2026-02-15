<?php
/**
 * Jukebox block class.
 *
 * @package pinkcrab-jukebox
 */

namespace PinkCrab\Jukebox;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Main class.
 */
class Jukebox {

	/**
	 * Register hooks.
	 *
	 * @return void
	 */
	public static function init() {
		add_action( 'init', array( __CLASS__, 'register_block' ) );
		add_action( 'init', array( __CLASS__, 'register_translations' ), 20 );
	}

	/**
	 * Register the block type.
	 *
	 * @return void
	 */
	public static function register_block() {
		register_block_type(
			PINKCRAB_JUKEBOX_PLUGIN_DIR . '/build/jukebox',
			array(
				'render_callback' => array( __CLASS__, 'render' ),
			)
		);
	}

	/**
	 * Register script translations for the frontend view script.
	 *
	 * @return void
	 */
	public static function register_translations() {
		$script_handle = generate_block_asset_handle( 'pinkcrab/jukebox', 'viewScript' );
		wp_set_script_translations( $script_handle, 'pinkcrab-jukebox' );
	}

	/**
	 * Render callback for the jukebox block.
	 *
	 * @param array  $attributes Block attributes.
	 * @param string $content    Block content.
	 *
	 * @return string Rendered HTML.
	 */
	public static function render( $attributes, $content ) {
		$tracks = isset( $attributes['tracks'] ) && is_array( $attributes['tracks'] )
			? array_map( array( __CLASS__, 'sanitize_track' ), $attributes['tracks'] )
			: array();

		if ( empty( $tracks ) ) {
			return '';
		}

		$colors = array(
			'backgroundColor'    => self::get_color_attribute( $attributes, 'backgroundColor', '#1a1a2e' ),
			'primaryColor'       => self::get_color_attribute( $attributes, 'primaryColor', '#e94560' ),
			'secondaryColor'     => self::get_color_attribute( $attributes, 'secondaryColor', '#16213e' ),
			'textColor'          => self::get_color_attribute( $attributes, 'textColor', '#ffffff' ),
			'textMutedColor'     => self::get_color_attribute( $attributes, 'textMutedColor', '#a0a0a0' ),
			'progressBackground' => self::get_color_attribute( $attributes, 'progressBackground', '#2d2d44' ),
			'controlHoverColor'  => self::get_color_attribute( $attributes, 'controlHoverColor', '#ff6b6b' ),
		);

		$artwork_height = isset( $attributes['artworkMaxHeight'] ) ? absint( $attributes['artworkMaxHeight'] ) : 300;
		$show_filter    = isset( $attributes['showFilter'] ) ? (bool) $attributes['showFilter'] : true;
		$show_tracklist = isset( $attributes['showTracklist'] ) ? (bool) $attributes['showTracklist'] : true;
		$block_id       = isset( $attributes['blockId'] ) ? sanitize_html_class( $attributes['blockId'] ) : 'jukebox-' . wp_unique_id();

		$style_vars = sprintf(
			'--jukebox-bg: %s; --jukebox-primary: %s; --jukebox-secondary: %s; --jukebox-text: %s; --jukebox-text-muted: %s; --jukebox-progress-bg: %s; --jukebox-control-hover: %s; --jukebox-artwork-height: %dpx;',
			esc_attr( $colors['backgroundColor'] ),
			esc_attr( $colors['primaryColor'] ),
			esc_attr( $colors['secondaryColor'] ),
			esc_attr( $colors['textColor'] ),
			esc_attr( $colors['textMutedColor'] ),
			esc_attr( $colors['progressBackground'] ),
			esc_attr( $colors['controlHoverColor'] ),
			$artwork_height
		);

		$tracks_json = wp_json_encode( $tracks );

		ob_start();
		include PINKCRAB_JUKEBOX_PLUGIN_DIR . '/templates/jukebox.php';
		return ob_get_clean();
	}

	/**
	 * Sanitize a CSS color value.
	 *
	 * @param string $color The color value to sanitize.
	 *
	 * @return string Sanitized color or empty string if invalid.
	 */
	public static function sanitize_color( $color ) {
		$color = sanitize_text_field( $color );

		// Hex values: #fff, #abcdef, #abcdef80
		if ( preg_match( '/^#[0-9a-fA-F]{3,8}$/', $color ) ) {
			return $color;
		}

		// CSS functions including nested parens for var() fallbacks
		if ( preg_match( '/^(rgb|rgba|hsl|hsla|var)\(.*\)$/s', $color ) ) {
			return $color;
		}

		// Named CSS colors (alphabetic only)
		if ( preg_match( '/^[a-zA-Z]+$/', $color ) ) {
			return $color;
		}

		return '';
	}

	/**
	 * Get a sanitized color attribute with a fallback default.
	 *
	 * @param array  $attributes Block attributes.
	 * @param string $key        Attribute key.
	 * @param string $fallback   Default color value.
	 *
	 * @return string Sanitized color or the default.
	 */
	public static function get_color_attribute( $attributes, $key, $fallback ) {
		if ( isset( $attributes[ $key ] ) ) {
			$sanitized = self::sanitize_color( $attributes[ $key ] );
			return '' !== $sanitized ? $sanitized : $fallback;
		}
		return $fallback;
	}

	/**
	 * Sanitize a single track array.
	 *
	 * @param array $track Track data.
	 *
	 * @return array Sanitized track.
	 */
	public static function sanitize_track( $track ) {
		return array(
			'title'    => isset( $track['title'] ) ? sanitize_text_field( $track['title'] ) : '',
			'artist'   => isset( $track['artist'] ) ? sanitize_text_field( $track['artist'] ) : '',
			'album'    => isset( $track['album'] ) ? sanitize_text_field( $track['album'] ) : '',
			'cover'    => isset( $track['cover'] ) ? esc_url_raw( $track['cover'] ) : '',
			'url'      => isset( $track['url'] ) ? esc_url_raw( $track['url'] ) : '',
			'pageLink' => isset( $track['pageLink'] ) ? esc_url_raw( $track['pageLink'] ) : '',
		);
	}
}

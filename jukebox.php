<?php
/**
 * Plugin Name: PinkCrab Jukebox
 * Plugin URI: https://github.com/PinkCrab/Jukebox
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

/**
 * Plugin version.
 */
define( 'PINKCRAB_JUKEBOX_VERSION', '1.0.0' );

/**
 * Plugin directory path.
 */
define( 'PINKCRAB_JUKEBOX_PLUGIN_DIR', untrailingslashit( plugin_dir_path( __FILE__ ) ) );

/**
 * Plugin URL.
 */
define( 'PINKCRAB_JUKEBOX_PLUGIN_URL', untrailingslashit( plugin_dir_url( __FILE__ ) ) );

/**
 * Register the block.
 */
function register_block() {
	register_block_type(
		PINKCRAB_JUKEBOX_PLUGIN_DIR . '/build/jukebox',
		array(
			'render_callback' => __NAMESPACE__ . '\render_jukebox_block',
		)
	);
}
add_action( 'init', __NAMESPACE__ . '\register_block' );

/**
 * Render callback for the jukebox block.
 *
 * @param array  $attributes Block attributes.
 * @param string $content    Block content.
 * @return string Rendered HTML.
 */
function render_jukebox_block( $attributes, $content ) {
	// Sanitize attributes
	$tracks = isset( $attributes['tracks'] ) && is_array( $attributes['tracks'] )
		? array_map( __NAMESPACE__ . '\sanitize_track', $attributes['tracks'] )
		: array();

	if ( empty( $tracks ) ) {
		return '';
	}

	// Color attributes with defaults
	$colors = array(
		'backgroundColor'    => isset( $attributes['backgroundColor'] ) ? sanitize_text_field( $attributes['backgroundColor'] ) : '#1a1a2e',
		'primaryColor'       => isset( $attributes['primaryColor'] ) ? sanitize_text_field( $attributes['primaryColor'] ) : '#e94560',
		'secondaryColor'     => isset( $attributes['secondaryColor'] ) ? sanitize_text_field( $attributes['secondaryColor'] ) : '#16213e',
		'textColor'          => isset( $attributes['textColor'] ) ? sanitize_text_field( $attributes['textColor'] ) : '#ffffff',
		'textMutedColor'     => isset( $attributes['textMutedColor'] ) ? sanitize_text_field( $attributes['textMutedColor'] ) : '#a0a0a0',
		'progressBackground' => isset( $attributes['progressBackground'] ) ? sanitize_text_field( $attributes['progressBackground'] ) : '#2d2d44',
		'controlHoverColor'  => isset( $attributes['controlHoverColor'] ) ? sanitize_text_field( $attributes['controlHoverColor'] ) : '#ff6b6b',
	);

	// Other settings
	$artwork_height = isset( $attributes['artworkMaxHeight'] ) ? absint( $attributes['artworkMaxHeight'] ) : 300;
	$show_filter    = isset( $attributes['showFilter'] ) ? (bool) $attributes['showFilter'] : true;
	$show_tracklist = isset( $attributes['showTracklist'] ) ? (bool) $attributes['showTracklist'] : true;
	$block_id       = isset( $attributes['blockId'] ) ? sanitize_html_class( $attributes['blockId'] ) : 'jukebox-' . wp_unique_id();

	// Build inline styles
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

	// Encode tracks as JSON for JS
	$tracks_json = wp_json_encode( $tracks );

	ob_start();
	?>
	<div 
		id="<?php echo esc_attr( $block_id ); ?>"
		class="wp-block-pinkcrab-jukebox jukebox" 
		style="<?php echo esc_attr( $style_vars ); ?>"
		data-tracks="<?php echo esc_attr( $tracks_json ); ?>"
		data-show-filter="<?php echo $show_filter ? 'true' : 'false'; ?>"
		data-show-tracklist="<?php echo $show_tracklist ? 'true' : 'false'; ?>"
	>
		<!-- Player Section -->
		<div class="jukebox__player">
			<!-- Side Toolbar -->
			<aside class="jukebox__sidebar">
				<button 
					type="button" 
					class="jukebox__sidebar-btn jukebox__artwork-toggle jukebox__sidebar-btn--active" 
					aria-label="<?php esc_attr_e( 'Toggle artwork', 'pinkcrab-jukebox' ); ?>"
					aria-pressed="true"
					title="<?php esc_attr_e( 'Show/Hide Artwork', 'pinkcrab-jukebox' ); ?>"
				>
					<svg viewBox="0 0 24 24" fill="currentColor">
						<path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/>
					</svg>
				</button>
				<button 
					type="button" 
					class="jukebox__sidebar-btn jukebox__viz-toggle" 
					aria-label="<?php esc_attr_e( 'Cycle visualizer', 'pinkcrab-jukebox' ); ?>"
					title="<?php esc_attr_e( 'Visualizer: Off', 'pinkcrab-jukebox' ); ?>"
					data-viz-mode="off"
				>
					<svg class="jukebox__viz-icon jukebox__viz-icon--off" viewBox="0 0 24 24" fill="currentColor">
						<path d="M3 17h2v-7H3v7zm4 0h2V7H7v10zm4 0h2V4h-2v13zm4 0h2v-9h-2v9zm4 0h2V9h-2v8z" opacity="0.3"/>
						<path d="M2.5 4.5l17 17 1.4-1.4-17-17z"/>
					</svg>
					<svg class="jukebox__viz-icon jukebox__viz-icon--bars" viewBox="0 0 24 24" fill="currentColor">
						<path d="M3 17h2v-7H3v7zm4 0h2V7H7v10zm4 0h2V4h-2v13zm4 0h2v-9h-2v9zm4 0h2V9h-2v8z"/>
					</svg>
					<svg class="jukebox__viz-icon jukebox__viz-icon--oscilloscope" viewBox="0 0 24 24" fill="currentColor">
						<path d="M2 12h2l2-6 3 12 3-8 2 4 2-2h6" stroke="currentColor" stroke-width="2" fill="none"/>
					</svg>
					<svg class="jukebox__viz-icon jukebox__viz-icon--mirror" viewBox="0 0 24 24" fill="currentColor">
						<path d="M4 12h2v4H4zm4-3h2v7H8zm4-4h2v11h-2zm4 2h2v9h-2zm4 3h2v6h-2z"/>
						<path d="M4 12h2v-4H4zm4 3h2v-7H8zm4 4h2v-11h-2zm4-2h2v-9h-2zm4-3h2v-6h-2z" opacity="0.4"/>
					</svg>
					<svg class="jukebox__viz-icon jukebox__viz-icon--fire" viewBox="0 0 24 24" fill="currentColor">
						<path d="M13.5.67s.74 2.65.74 4.8c0 2.06-1.35 3.73-3.41 3.73-2.07 0-3.63-1.67-3.63-3.73l.03-.36C5.21 7.51 4 10.62 4 14c0 4.42 3.58 8 8 8s8-3.58 8-8C20 8.61 17.41 3.8 13.5.67zM11.71 19c-1.78 0-3.22-1.4-3.22-3.14 0-1.62 1.05-2.76 2.81-3.12 1.77-.36 3.6-1.21 4.62-2.58.39 1.29.59 2.65.59 4.04 0 2.65-2.15 4.8-4.8 4.8z"/>
					</svg>
				</button>
				<button 
					type="button" 
					class="jukebox__sidebar-btn jukebox__queue-toggle" 
					aria-label="<?php esc_attr_e( 'Toggle queue', 'pinkcrab-jukebox' ); ?>"
					aria-expanded="false"
					title="<?php esc_attr_e( 'Queue', 'pinkcrab-jukebox' ); ?>"
				>
					<svg viewBox="0 0 24 24" fill="currentColor">
						<path d="M15 6H3v2h12V6zm0 4H3v2h12v-2zM3 16h8v-2H3v2zM17 6v8.18c-.31-.11-.65-.18-1-.18-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3V8h3V6h-5z"/>
					</svg>
					<span class="jukebox__queue-count">0</span>
				</button>
			</aside>

			<!-- Artwork -->
			<div class="jukebox__artwork-container">
				<div class="jukebox__artwork">
					<!-- Visualizer Canvas (behind artwork) -->
					<canvas class="jukebox__visualizer jukebox__visualizer--behind" aria-hidden="true"></canvas>
					<img 
						class="jukebox__artwork-img" 
						src="<?php echo esc_url( $tracks[0]['cover'] ?? '' ); ?>" 
						alt="<?php echo esc_attr( $tracks[0]['album'] ?? __( 'Album artwork', 'pinkcrab-jukebox' ) ); ?>"
					/>
					<div class="jukebox__artwork-placeholder">
						<svg viewBox="0 0 24 24" fill="currentColor">
							<path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
						</svg>
					</div>
				</div>
			</div>

			<!-- Track Info -->
			<div class="jukebox__info">
				<div class="jukebox__title"><?php echo esc_html( $tracks[0]['title'] ?? __( 'Select a track', 'pinkcrab-jukebox' ) ); ?></div>
				<button type="button" class="jukebox__artist jukebox__filter-link" data-filter-type="artist" data-filter-value="<?php echo esc_attr( $tracks[0]['artist'] ?? '' ); ?>">
					<?php echo esc_html( $tracks[0]['artist'] ?? '' ); ?>
				</button>
				<?php if ( ! empty( $tracks[0]['album'] ) ) : ?>
				<button type="button" class="jukebox__album jukebox__filter-link" data-filter-type="album" data-filter-value="<?php echo esc_attr( $tracks[0]['album'] ?? '' ); ?>">
					<?php echo esc_html( $tracks[0]['album'] ); ?>
				</button>
				<?php else : ?>
				<div class="jukebox__album"></div>
				<?php endif; ?>
				<?php if ( ! empty( $tracks[0]['pageLink'] ) ) : ?>
					<a href="<?php echo esc_url( $tracks[0]['pageLink'] ); ?>" class="jukebox__page-link" target="_blank" rel="noopener">
						<?php esc_html_e( 'View page', 'pinkcrab-jukebox' ); ?>
					</a>
				<?php endif; ?>
			</div>

			<!-- Progress Bar -->
			<div class="jukebox__progress">
				<span class="jukebox__time jukebox__time--current">0:00</span>
				<div class="jukebox__progress-bar">
					<div class="jukebox__progress-fill"></div>
					<input 
						type="range" 
						class="jukebox__progress-input" 
						min="0" 
						max="100" 
						value="0" 
						aria-label="<?php esc_attr_e( 'Seek', 'pinkcrab-jukebox' ); ?>"
					/>
				</div>
				<span class="jukebox__time jukebox__time--duration">0:00</span>
			</div>

			<!-- Controls -->
			<div class="jukebox__controls">
				<button 
					type="button" 
					class="jukebox__btn jukebox__btn--shuffle" 
					aria-label="<?php esc_attr_e( 'Shuffle', 'pinkcrab-jukebox' ); ?>"
					aria-pressed="false"
				>
					<svg viewBox="0 0 24 24" fill="currentColor">
						<path d="M10.59 9.17L5.41 4 4 5.41l5.17 5.17 1.42-1.41zM14.5 4l2.04 2.04L4 18.59 5.41 20 17.96 7.46 20 9.5V4h-5.5zm.33 9.41l-1.41 1.41 3.13 3.13L14.5 20H20v-5.5l-2.04 2.04-3.13-3.13z"/>
					</svg>
				</button>
				<button 
					type="button" 
					class="jukebox__btn jukebox__btn--prev" 
					aria-label="<?php esc_attr_e( 'Previous', 'pinkcrab-jukebox' ); ?>"
				>
					<svg viewBox="0 0 24 24" fill="currentColor">
						<path d="M6 6h2v12H6zm3.5 6l8.5 6V6z"/>
					</svg>
				</button>
				<button 
					type="button" 
					class="jukebox__btn jukebox__btn--play" 
					aria-label="<?php esc_attr_e( 'Play', 'pinkcrab-jukebox' ); ?>"
				>
					<svg class="jukebox__icon-play" viewBox="0 0 24 24" fill="currentColor">
						<path d="M8 5v14l11-7z"/>
					</svg>
					<svg class="jukebox__icon-pause" viewBox="0 0 24 24" fill="currentColor">
						<path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
					</svg>
				</button>
				<button 
					type="button" 
					class="jukebox__btn jukebox__btn--next" 
					aria-label="<?php esc_attr_e( 'Next', 'pinkcrab-jukebox' ); ?>"
				>
					<svg viewBox="0 0 24 24" fill="currentColor">
						<path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/>
					</svg>
				</button>
				<button 
					type="button" 
					class="jukebox__btn jukebox__btn--repeat" 
					aria-label="<?php esc_attr_e( 'Repeat', 'pinkcrab-jukebox' ); ?>"
					data-repeat-mode="off"
				>
					<svg class="jukebox__icon-repeat-off jukebox__icon-repeat-all" viewBox="0 0 24 24" fill="currentColor">
						<path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z"/>
					</svg>
					<svg class="jukebox__icon-repeat-one" viewBox="0 0 24 24" fill="currentColor">
						<path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4zm-4-2V9h-1l-2 1v1h1.5v4H13z"/>
					</svg>
				</button>
			</div>

			<!-- Volume -->
			<div class="jukebox__volume">
				<button 
					type="button" 
					class="jukebox__btn jukebox__btn--volume" 
					aria-label="<?php esc_attr_e( 'Mute', 'pinkcrab-jukebox' ); ?>"
				>
					<svg class="jukebox__icon-volume-high" viewBox="0 0 24 24" fill="currentColor">
						<path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
					</svg>
					<svg class="jukebox__icon-volume-muted" viewBox="0 0 24 24" fill="currentColor">
						<path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/>
					</svg>
				</button>
				<div class="jukebox__volume-slider">
					<div class="jukebox__volume-fill"></div>
					<input 
						type="range" 
						class="jukebox__volume-input" 
						min="0" 
						max="100" 
						value="80" 
						aria-label="<?php esc_attr_e( 'Volume', 'pinkcrab-jukebox' ); ?>"
					/>
				</div>
			</div>

			<!-- HTML5 Audio Fallback -->
			<audio class="jukebox__audio" preload="metadata">
				<?php if ( ! empty( $tracks[0]['url'] ) ) : ?>
					<source src="<?php echo esc_url( $tracks[0]['url'] ); ?>" type="audio/mpeg">
				<?php endif; ?>
				<?php esc_html_e( 'Your browser does not support the audio element.', 'pinkcrab-jukebox' ); ?>
			</audio>
		</div>

		<?php if ( $show_filter ) : ?>
		<!-- Filter -->
		<div class="jukebox__filter">
			<input 
				type="text" 
				class="jukebox__filter-input" 
				placeholder="<?php esc_attr_e( 'Search tracks...', 'pinkcrab-jukebox' ); ?>"
				aria-label="<?php esc_attr_e( 'Filter tracks', 'pinkcrab-jukebox' ); ?>"
			/>
		</div>
		<?php endif; ?>

		<?php if ( $show_tracklist ) : ?>
		<!-- Tracklist -->
		<div class="jukebox__tracklist">
			<div class="jukebox__tracklist-header">
				<span class="jukebox__tracklist-title"><?php esc_html_e( 'Tracks', 'pinkcrab-jukebox' ); ?></span>
				<span class="jukebox__tracklist-count"><?php echo count( $tracks ); ?></span>
			</div>
			<!-- Filter Active Indicator -->
			<div class="jukebox__filter-active">
				<span class="jukebox__filter-active-text">
					<?php esc_html_e( 'Filtered by', 'pinkcrab-jukebox' ); ?>: <strong class="jukebox__filter-active-value"></strong>
				</span>
				<button type="button" class="jukebox__filter-clear"><?php esc_html_e( 'Clear filter', 'pinkcrab-jukebox' ); ?></button>
			</div>
			<ul class="jukebox__tracks" role="list">
				<?php foreach ( $tracks as $index => $track ) : ?>
					<li 
						class="jukebox__track<?php echo $index === 0 ? ' jukebox__track--active' : ''; ?>" 
						data-index="<?php echo absint( $index ); ?>"
						role="listitem"
					>
						<div class="jukebox__track-cover">
							<?php if ( ! empty( $track['cover'] ) ) : ?>
								<img 
									src="<?php echo esc_url( $track['cover'] ); ?>" 
									alt=""
									loading="lazy"
								/>
							<?php else : ?>
								<div class="jukebox__track-cover-placeholder">
									<svg viewBox="0 0 24 24" fill="currentColor">
										<path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
									</svg>
								</div>
							<?php endif; ?>
						</div>
						<div class="jukebox__track-info">
							<span class="jukebox__track-title"><?php echo esc_html( $track['title'] ); ?></span>
							<span class="jukebox__track-artist"><?php echo esc_html( $track['artist'] ); ?></span>
						</div>
						<div class="jukebox__track-actions">
							<button 
								type="button" 
								class="jukebox__track-btn jukebox__track-btn--queue" 
								aria-label="<?php esc_attr_e( 'Add to queue', 'pinkcrab-jukebox' ); ?>"
								title="<?php esc_attr_e( 'Add to queue', 'pinkcrab-jukebox' ); ?>"
							>
								<svg viewBox="0 0 24 24" fill="currentColor">
									<path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
								</svg>
								<span class="jukebox__track-btn-text"><?php esc_html_e( 'Queue', 'pinkcrab-jukebox' ); ?></span>
							</button>
						</div>
					</li>
				<?php endforeach; ?>
			</ul>
		</div>
		<?php endif; ?>

		<!-- Queue (always present, toggleable) -->
		<div class="jukebox__queue jukebox__queue--hidden">
			<div class="jukebox__queue-header">
				<button 
					type="button" 
					class="jukebox__queue-close" 
					aria-label="<?php esc_attr_e( 'Close queue', 'pinkcrab-jukebox' ); ?>"
				>
					<svg viewBox="0 0 24 24" fill="currentColor">
						<path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
					</svg>
				</button>
				<span class="jukebox__queue-title"><?php esc_html_e( 'Up Next', 'pinkcrab-jukebox' ); ?></span>
				<button 
					type="button" 
					class="jukebox__queue-clear" 
					aria-label="<?php esc_attr_e( 'Clear queue', 'pinkcrab-jukebox' ); ?>"
				>
					<?php esc_html_e( 'Clear', 'pinkcrab-jukebox' ); ?>
				</button>
			</div>
			<ul class="jukebox__queue-list" role="list">
				<!-- Queue items will be added by JS -->
			</ul>
		</div>

	</div>
	<?php

	return ob_get_clean();
}

/**
 * Sanitize a single track array.
 *
 * @param array $track Track data.
 * @return array Sanitized track.
 */
function sanitize_track( $track ) {
	return array(
		'title'    => isset( $track['title'] ) ? sanitize_text_field( $track['title'] ) : '',
		'artist'   => isset( $track['artist'] ) ? sanitize_text_field( $track['artist'] ) : '',
		'album'    => isset( $track['album'] ) ? sanitize_text_field( $track['album'] ) : '',
		'cover'    => isset( $track['cover'] ) ? esc_url_raw( $track['cover'] ) : '',
		'url'      => isset( $track['url'] ) ? esc_url_raw( $track['url'] ) : '',
		'pageLink' => isset( $track['pageLink'] ) ? esc_url_raw( $track['pageLink'] ) : '',
	);
}


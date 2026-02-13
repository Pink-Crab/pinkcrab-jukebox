/**
 * Visualizer class for Jukebox block.
 * Handles Web Audio API visualizer modes: bars, oscilloscope, mirror, fire.
 */
import { __, sprintf } from '@wordpress/i18n';

export default class Visualizer {
	/**
	 * @param {Object}           config
	 * @param {HTMLElement}      config.container      - The jukebox container element
	 * @param {HTMLAudioElement} config.audio           - The audio element
	 * @param {HTMLCanvasElement} config.canvasBehind   - Behind canvas element
	 * @param {HTMLCanvasElement} config.canvasOverlay  - Overlay canvas element
	 * @param {HTMLButtonElement} config.toggleButton   - The viz toggle button
	 * @param {Function}         config.getTrackUrl     - Callback returning current track URL
	 * @param {Function}         config.showToast       - Callback for toast messages
	 */
	constructor( { container, audio, canvasBehind, canvasOverlay, toggleButton, getTrackUrl, showToast } ) {
		this.container = container;
		this.audio = audio;
		this.canvasBehind = canvasBehind;
		this.canvasOverlay = canvasOverlay;
		this.toggleButton = toggleButton;
		this.getTrackUrl = getTrackUrl;
		this.showToast = showToast;

		this.vizModes = [ 'off', 'bars', 'oscilloscope', 'mirror', 'fire' ];
		this.vizModeNames = {
			off: __( 'Off', 'pinkcrab-jukebox' ),
			bars: __( 'Classic Bars', 'pinkcrab-jukebox' ),
			oscilloscope: __( 'Oscilloscope', 'pinkcrab-jukebox' ),
			mirror: __( 'Spectrum Mirror', 'pinkcrab-jukebox' ),
			fire: __( 'Fire Bars', 'pinkcrab-jukebox' ),
		};
		this.vizMode = 'off';
		this.audioContext = null;
		this.analyser = null;
		this.animationId = null;
		this.dataArray = null;
		this.vizInitialized = false;
		this.vizCorsBlocked = false;
	}

	get mode() {
		return this.vizMode;
	}

	/**
	 * Cycle through visualizer modes (for button toggle)
	 */
	cycleMode() {
		if ( this.vizCorsBlocked && this.vizMode === 'off' ) {
			this.showToast( __( 'Visualizer unavailable (cross-origin audio)', 'pinkcrab-jukebox' ) );
			return;
		}

		const currentIndex = this.vizModes.indexOf( this.vizMode );
		const nextIndex = ( currentIndex + 1 ) % this.vizModes.length;
		this.setMode( this.vizModes[ nextIndex ] );
	}

	/**
	 * Set visualizer mode directly
	 */
	setMode( mode ) {
		this.vizMode = mode;

		// Update toggle button
		if ( this.toggleButton ) {
			this.toggleButton.dataset.vizMode = this.vizMode;
			this.toggleButton.title = sprintf( __( 'Visualizer: %s', 'pinkcrab-jukebox' ), this.vizModeNames[ this.vizMode ] || mode );
			this.toggleButton.classList.toggle( 'jukebox__sidebar-btn--active', this.vizMode !== 'off' );
		}

		// Update container class for CSS
		this.container.dataset.vizMode = this.vizMode;

		if ( this.vizMode === 'off' ) {
			this.stop();
		} else {
			this.start();
		}
	}

	/**
	 * Check CORS and update visualizer button state
	 */
	checkAvailability() {
		const trackUrl = this.getTrackUrl();
		const isSameOrigin = trackUrl && this._isSameOrigin( trackUrl );

		this.vizCorsBlocked = ! isSameOrigin;

		// Update button disabled state
		if ( this.toggleButton ) {
			this.toggleButton.classList.toggle( 'jukebox__sidebar-btn--disabled', this.vizCorsBlocked );
			this.toggleButton.title = this.vizCorsBlocked
				? __( 'Visualizer unavailable (cross-origin)', 'pinkcrab-jukebox' )
				: sprintf( __( 'Visualizer: %s', 'pinkcrab-jukebox' ), this.vizModeNames[ this.vizMode ] || this.vizMode );
		}

		// If currently running a visualizer but now blocked, turn it off
		if ( this.vizCorsBlocked && this.vizMode !== 'off' ) {
			this.vizMode = 'off';
			this.stop();
			this.container.dataset.vizMode = 'off';
			if ( this.toggleButton ) {
				this.toggleButton.dataset.vizMode = 'off';
				this.toggleButton.classList.remove( 'jukebox__sidebar-btn--active' );
			}
		}
	}

	/**
	 * Start the visualizer
	 */
	start() {
		if ( ! this._initAudioContext() ) {
			// CORS blocked - show message and reset to off
			if ( this.vizCorsBlocked ) {
				this.showToast( __( 'Visualizer unavailable (cross-origin audio)', 'pinkcrab-jukebox' ) );
				this.vizMode = 'off';
				this.container.dataset.vizMode = 'off';
				if ( this.toggleButton ) {
					this.toggleButton.dataset.vizMode = 'off';
					this.toggleButton.classList.remove( 'jukebox__sidebar-btn--active' );
				}
			}
			return;
		}

		// Resume audio context if suspended
		if ( this.audioContext.state === 'suspended' ) {
			this.audioContext.resume();
		}

		// Setup canvases
		this._setupCanvas();

		// Pre-allocate data array for animation loop
		this.dataArray = new Uint8Array( this.analyser.frequencyBinCount );

		// Start animation loop
		this._animate();
	}

	/**
	 * Stop the visualizer
	 */
	stop() {
		if ( this.animationId ) {
			cancelAnimationFrame( this.animationId );
			this.animationId = null;
		}

		this._clearCanvas();
	}

	/**
	 * Clean up all resources
	 */
	destroy() {
		if ( this.animationId ) {
			cancelAnimationFrame( this.animationId );
			this.animationId = null;
		}

		if ( this.audioContext ) {
			this.audioContext.close().catch( () => {} );
			this.audioContext = null;
		}

		this._clearCanvas();

		this.analyser = null;
		this.dataArray = null;
		this.vizInitialized = false;
		this.vizMode = 'off';
	}

	/**
	 * Check if a URL is same-origin (safe for Web Audio API)
	 * @private
	 */
	_isSameOrigin( url ) {
		if ( ! url ) return false;
		try {
			const audioUrl = new URL( url, window.location.href );
			return audioUrl.origin === window.location.origin;
		} catch ( e ) {
			return false;
		}
	}

	/**
	 * Initialize Web Audio API for visualizer.
	 * Returns false if CORS would cause audio to mute.
	 * @private
	 */
	_initAudioContext() {
		if ( this.vizInitialized ) return true;

		// Check if current track is same-origin - if not, DON'T initialize
		// Web Audio API will silently mute cross-origin audio!
		const trackUrl = this.getTrackUrl();
		if ( trackUrl && ! this._isSameOrigin( trackUrl ) ) {
			console.info( 'Jukebox: Visualizer disabled for cross-origin audio (would mute)' );
			this.vizCorsBlocked = true;
			return false;
		}

		try {
			this.audioContext = new ( window.AudioContext || window.webkitAudioContext )();
			this.analyser = this.audioContext.createAnalyser();
			this.analyser.fftSize = 256;
			this.analyser.smoothingTimeConstant = 0.8;

			// Connect audio element to analyser
			const source = this.audioContext.createMediaElementSource( this.audio );
			source.connect( this.analyser );
			this.analyser.connect( this.audioContext.destination );

			this.vizInitialized = true;
			this.vizCorsBlocked = false;
			return true;
		} catch ( e ) {
			console.warn( 'Jukebox: Could not initialize audio visualizer', e );
			this.vizCorsBlocked = true;
			return false;
		}
	}

	/**
	 * Setup visualizer canvas dimensions
	 * @private
	 */
	_setupCanvas() {
		const artwork = this.container.querySelector( '.jukebox__artwork' );
		if ( ! artwork ) return;

		const rect = artwork.getBoundingClientRect();

		[ this.canvasBehind, this.canvasOverlay ].forEach( ( canvas ) => {
			if ( canvas ) {
				canvas.width = rect.width * window.devicePixelRatio;
				canvas.height = rect.height * window.devicePixelRatio;
				canvas.style.width = rect.width + 'px';
				canvas.style.height = rect.height + 'px';

				const ctx = canvas.getContext( '2d' );
				ctx.scale( window.devicePixelRatio, window.devicePixelRatio );
			}
		} );
	}

	/**
	 * Clear visualizer canvases
	 * @private
	 */
	_clearCanvas() {
		[ this.canvasBehind, this.canvasOverlay ].forEach( ( canvas ) => {
			if ( canvas ) {
				const ctx = canvas.getContext( '2d' );
				ctx.clearRect( 0, 0, canvas.width, canvas.height );
			}
		} );
	}

	/**
	 * Animation loop for visualizer
	 * @private
	 */
	_animate() {
		if ( this.vizMode === 'off' ) return;

		this.animationId = requestAnimationFrame( () => this._animate() );

		// Get frequency data (reuse pre-allocated array)
		const dataArray = this.dataArray;

		if ( this.vizMode === 'oscilloscope' ) {
			this.analyser.getByteTimeDomainData( dataArray );
		} else {
			this.analyser.getByteFrequencyData( dataArray );
		}

		// Render to the behind canvas
		const canvas = this.canvasBehind;
		if ( ! canvas ) return;

		const ctx = canvas.getContext( '2d' );
		const width = canvas.width / window.devicePixelRatio;
		const height = canvas.height / window.devicePixelRatio;

		// Clear
		ctx.clearRect( 0, 0, width, height );

		// Draw based on mode
		switch ( this.vizMode ) {
			case 'bars':
				this._drawClassicBars( ctx, dataArray, width, height );
				break;
			case 'oscilloscope':
				this._drawOscilloscope( ctx, dataArray, width, height );
				break;
			case 'mirror':
				this._drawMirrorBars( ctx, dataArray, width, height );
				break;
			case 'fire':
				this._drawFireBars( ctx, dataArray, width, height );
				break;
		}
	}

	/**
	 * Draw classic Winamp-style bars (green → yellow → red)
	 * @private
	 */
	_drawClassicBars( ctx, dataArray, width, height ) {
		const barCount = 32;
		const barWidth = width / barCount - 2;
		const barSpacing = 2;

		// Set glow effect once before the loop
		ctx.shadowColor = '#00ff00';
		ctx.shadowBlur = 10;

		for ( let i = 0; i < barCount; i++ ) {
			const dataIndex = Math.floor( i * dataArray.length / barCount );
			const value = dataArray[ dataIndex ];
			if ( value === 0 ) continue;

			const barHeight = ( value / 255 ) * height;
			const x = i * ( barWidth + barSpacing );
			const y = height - barHeight;

			// Winamp gradient: green at bottom, yellow in middle, red at top
			const gradient = ctx.createLinearGradient( x, height, x, y );
			gradient.addColorStop( 0, '#00ff00' );
			gradient.addColorStop( 0.5, '#ffff00' );
			gradient.addColorStop( 1, '#ff0000' );

			ctx.fillStyle = gradient;
			ctx.fillRect( x, y, barWidth, barHeight );
		}
		ctx.shadowBlur = 0;
	}

	/**
	 * Draw oscilloscope waveform
	 * @private
	 */
	_drawOscilloscope( ctx, dataArray, width, height ) {
		ctx.lineWidth = 2;
		ctx.strokeStyle = '#00ff00';
		ctx.shadowColor = '#00ff00';
		ctx.shadowBlur = 10;

		ctx.beginPath();

		const sliceWidth = width / dataArray.length;
		let x = 0;

		for ( let i = 0; i < dataArray.length; i++ ) {
			const v = dataArray[ i ] / 128.0;
			const y = ( v * height ) / 2;

			if ( i === 0 ) {
				ctx.moveTo( x, y );
			} else {
				ctx.lineTo( x, y );
			}

			x += sliceWidth;
		}

		ctx.lineTo( width, height / 2 );
		ctx.stroke();
		ctx.shadowBlur = 0;
	}

	/**
	 * Draw mirrored spectrum bars
	 * @private
	 */
	_drawMirrorBars( ctx, dataArray, width, height ) {
		const barCount = 32;
		const barWidth = width / barCount - 2;
		const barSpacing = 2;
		const centerY = height / 2;

		for ( let i = 0; i < barCount; i++ ) {
			const dataIndex = Math.floor( i * dataArray.length / barCount );
			const value = dataArray[ dataIndex ];
			if ( value === 0 ) continue;

			const barHeight = ( value / 255 ) * ( height / 2 );
			const x = i * ( barWidth + barSpacing );

			// Gradient for top half
			const gradient = ctx.createLinearGradient( x, centerY, x, centerY - barHeight );
			gradient.addColorStop( 0, '#e94560' );
			gradient.addColorStop( 1, '#ff6b9d' );

			ctx.fillStyle = gradient;

			// Draw top bar
			ctx.fillRect( x, centerY - barHeight, barWidth, barHeight );

			// Draw mirrored bottom bar (slightly dimmer)
			ctx.globalAlpha = 0.5;
			ctx.fillRect( x, centerY, barWidth, barHeight );
			ctx.globalAlpha = 1;
		}
	}

	/**
	 * Draw fire-colored bars
	 * @private
	 */
	_drawFireBars( ctx, dataArray, width, height ) {
		const barCount = 48;
		const barWidth = width / barCount - 1;
		const barSpacing = 1;

		for ( let i = 0; i < barCount; i++ ) {
			const dataIndex = Math.floor( i * dataArray.length / barCount );
			const value = dataArray[ dataIndex ];
			if ( value === 0 ) continue;

			const barHeight = ( value / 255 ) * height;
			const x = i * ( barWidth + barSpacing );
			const y = height - barHeight;

			// Fire gradient: dark red → orange → yellow → white
			const gradient = ctx.createLinearGradient( x, height, x, y );
			gradient.addColorStop( 0, '#330000' );
			gradient.addColorStop( 0.3, '#ff3300' );
			gradient.addColorStop( 0.6, '#ff9900' );
			gradient.addColorStop( 0.85, '#ffff00' );
			gradient.addColorStop( 1, '#ffffff' );

			ctx.fillStyle = gradient;
			ctx.fillRect( x, y, barWidth, barHeight );
		}
	}
}

/**
 * Frontend view script for Jukebox block.
 * Handles all playback, queue, shuffle, and repeat functionality.
 */
import { __, sprintf } from '@wordpress/i18n';
import Visualizer from './visualizer';

/**
 * Jukebox Class - Manages a single jukebox instance
 */
class Jukebox {
	constructor( container ) {
		this.container = container;
		this.tracks = [];
		this.queue = [];
		this.currentIndex = 0;
		this.isPlaying = false;
		this.isShuffle = false;
		this.repeatMode = 'off'; // 'off', 'all', 'one'
		this.shuffledOrder = [];
		this.shuffleIndex = 0;
		this.volume = 0.8;

		// Visualizer (initialized in init() after audio element exists)
		this.visualizer = null;

		this.init();
	}

	/**
	 * Initialize the jukebox
	 */
	init() {
		// Parse tracks from data attribute
		const tracksData = this.container.dataset.tracks;
		if ( tracksData ) {
			try {
				this.tracks = JSON.parse( tracksData );
			} catch ( e ) {
				console.error( 'Jukebox: Failed to parse tracks data', e );
				return;
			}
		}

		if ( this.tracks.length === 0 ) {
			return;
		}

		// Cache DOM elements
		this.cacheElements();

		// Bind events
		this.bindEvents();

		// Initialize audio
		this.initAudio();

		// Initialize visualizer (after audio element is guaranteed to exist)
		this.visualizer = new Visualizer( {
			container: this.container,
			audio: this.audio,
			canvasBehind: this.vizCanvasBehind,
			canvasOverlay: this.vizCanvasOverlay,
			toggleButton: this.vizToggle,
			getTrackUrl: () => {
				const track = this.tracks[ this.currentIndex ];
				return track ? track.url : null;
			},
			showToast: ( message ) => this.showToast( message ),
		} );

		// Run initial CORS check (loadTrack ran before visualizer existed)
		this.visualizer.checkAvailability();

		// Mark as initialized
		this.container.classList.add( 'jukebox--initialized' );
	}

	/**
	 * Cache DOM elements
	 */
	cacheElements() {
		// Player elements
		this.audio = this.container.querySelector( '.jukebox__audio' );
		this.artworkImg = this.container.querySelector( '.jukebox__artwork-img' );
		this.artworkPlaceholder = this.container.querySelector( '.jukebox__artwork-placeholder' );

		// Visualizer elements
		this.vizCanvasBehind = this.container.querySelector( '.jukebox__visualizer--behind' );
		this.vizCanvasOverlay = this.container.querySelector( '.jukebox__visualizer--overlay' );
		this.vizToggle = this.container.querySelector( '.jukebox__viz-toggle' );
		this.artworkToggle = this.container.querySelector( '.jukebox__artwork-toggle' );
		this.artworkContainer = this.container.querySelector( '.jukebox__artwork-container' );
		this.artwork = this.container.querySelector( '.jukebox__artwork' );
		this.titleEl = this.container.querySelector( '.jukebox__title' );
		this.artistEl = this.container.querySelector( '.jukebox__artist' );
		this.albumEl = this.container.querySelector( '.jukebox__album' );
		this.pageLinkEl = this.container.querySelector( '.jukebox__page-link' );

		// Progress elements
		this.progressBar = this.container.querySelector( '.jukebox__progress-bar' );
		this.progressFill = this.container.querySelector( '.jukebox__progress-fill' );
		this.progressInput = this.container.querySelector( '.jukebox__progress-input' );
		this.currentTimeEl = this.container.querySelector( '.jukebox__time--current' );
		this.durationEl = this.container.querySelector( '.jukebox__time--duration' );

		// Control buttons
		this.playBtn = this.container.querySelector( '.jukebox__btn--play' );
		this.prevBtn = this.container.querySelector( '.jukebox__btn--prev' );
		this.nextBtn = this.container.querySelector( '.jukebox__btn--next' );
		this.shuffleBtn = this.container.querySelector( '.jukebox__btn--shuffle' );
		this.repeatBtn = this.container.querySelector( '.jukebox__btn--repeat' );

		// Volume elements
		this.volumeBtn = this.container.querySelector( '.jukebox__btn--volume' );
		this.volumeSlider = this.container.querySelector( '.jukebox__volume-slider' );
		this.volumeFill = this.container.querySelector( '.jukebox__volume-fill' );
		this.volumeInput = this.container.querySelector( '.jukebox__volume-input' );

		// Filter
		this.filterInput = this.container.querySelector( '.jukebox__filter-input' );
		this.filterActiveBar = this.container.querySelector( '.jukebox__filter-active' );
		this.filterActiveValue = this.container.querySelector( '.jukebox__filter-active-value' );
		this.filterClearBtn = this.container.querySelector( '.jukebox__filter-clear' );
		this.activeFilter = null; // Current active filter { type: 'artist'|'album', value: string }

		// Tracklist
		this.tracklistEl = this.container.querySelector( '.jukebox__tracks' );
		this.trackItems = this.container.querySelectorAll( '.jukebox__track' );
		this.tracklistCount = this.container.querySelector( '.jukebox__tracklist-count' );

		// Queue elements
		this.queueEl = this.container.querySelector( '.jukebox__queue' );
		this.queueList = this.container.querySelector( '.jukebox__queue-list' );
		this.queueToggle = this.container.querySelector( '.jukebox__queue-toggle' );
		this.queueCount = this.container.querySelector( '.jukebox__queue-count' );
		this.queueClear = this.container.querySelector( '.jukebox__queue-clear' );
		this.queueClose = this.container.querySelector( '.jukebox__queue-close' );

		// Screen reader live region
		this.announceEl = this.container.querySelector( '.jukebox__sr-announce' );

		// Shortcuts toggle button
		this.shortcutsToggle = this.container.querySelector( '.jukebox__shortcuts-toggle' );
	}

	/**
	 * Bind event listeners
	 */
	bindEvents() {
		// Playback controls
		if ( this.playBtn ) {
			this.playBtn.addEventListener( 'click', () => this.togglePlay() );
		}
		if ( this.prevBtn ) {
			this.prevBtn.addEventListener( 'click', () => this.previous() );
		}
		if ( this.nextBtn ) {
			this.nextBtn.addEventListener( 'click', () => this.next() );
		}
		if ( this.shuffleBtn ) {
			this.shuffleBtn.addEventListener( 'click', () => this.toggleShuffle() );
		}
		if ( this.repeatBtn ) {
			this.repeatBtn.addEventListener( 'click', () => this.toggleRepeat() );
		}

		// Progress bar
		if ( this.progressInput ) {
			this.progressInput.addEventListener( 'input', ( e ) => this.seek( e.target.value ) );
		}

		// Volume
		if ( this.volumeBtn ) {
			this.volumeBtn.addEventListener( 'click', () => this.toggleMute() );
		}
		if ( this.volumeInput ) {
			this.volumeInput.addEventListener( 'input', ( e ) => this.setVolume( e.target.value / 100 ) );
		}

		// Audio events
		if ( this.audio ) {
			this.audio.addEventListener( 'timeupdate', () => this.updateProgress() );
			this.audio.addEventListener( 'loadedmetadata', () => this.updateDuration() );
			this.audio.addEventListener( 'ended', () => this.handleEnded() );
			this.audio.addEventListener( 'play', () => this.updatePlayState( true ) );
			this.audio.addEventListener( 'pause', () => this.updatePlayState( false ) );
			this.audio.addEventListener( 'error', ( e ) => this.handleError( e ) );
		}

		// Filter input
		if ( this.filterInput ) {
			this.filterInput.addEventListener( 'input', ( e ) => {
				this.clearActiveFilter( false ); // Clear active filter when typing
				this.filterTracks( e.target.value );
			} );
		}

		// Filter links (artist/album in player info)
		this.container.querySelectorAll( '.jukebox__filter-link' ).forEach( ( link ) => {
			link.addEventListener( 'click', ( e ) => {
				e.preventDefault();
				const filterType = link.dataset.filterType;
				const filterValue = link.dataset.filterValue;
				if ( filterValue ) {
					this.setActiveFilter( filterType, filterValue );
				}
			} );
		} );

		// Filter clear button
		if ( this.filterClearBtn ) {
			this.filterClearBtn.addEventListener( 'click', () => this.clearActiveFilter( true ) );
		}

		// Tracklist clicks
		if ( this.trackItems ) {
			this.trackItems.forEach( ( item, index ) => {
				item.addEventListener( 'click', ( e ) => {
					// Don't play if clicking the queue button
					if ( e.target.closest( '.jukebox__track-btn--queue' ) ) {
						return;
					}
					this.playTrack( index );
				} );

				// Queue button
				const queueBtn = item.querySelector( '.jukebox__track-btn--queue' );
				if ( queueBtn ) {
					queueBtn.addEventListener( 'click', ( e ) => {
						e.stopPropagation();
						this.addToQueue( index );
					} );
				}

				// Keyboard: Enter/Space to play, Q to queue
				item.addEventListener( 'keydown', ( e ) => {
					if ( e.key === 'Enter' || e.key === ' ' ) {
						e.preventDefault();
						this.playTrack( index );
					} else if ( e.key === 'q' || e.key === 'Q' ) {
						e.preventDefault();
						this.addToQueue( index );
					}
				} );
			} );
		}

		// Queue toggle
		if ( this.queueToggle ) {
			this.queueToggle.addEventListener( 'click', () => this.toggleQueuePanel() );
		}

		// Queue clear
		if ( this.queueClear ) {
			this.queueClear.addEventListener( 'click', () => this.clearQueue() );
		}

		// Queue close button
		if ( this.queueClose ) {
			this.queueClose.addEventListener( 'click', () => this.toggleQueuePanel() );
		}

		// Keyboard shortcuts (store reference for destroy())
		this._keydownHandler = ( e ) => this.handleKeyboard( e );
		this.container.addEventListener( 'keydown', this._keydownHandler );

		// Visualizer toggle button (cycles through modes)
		if ( this.vizToggle ) {
			this.vizToggle.addEventListener( 'click', () => this.visualizer.cycleMode() );
		}

		// Artwork show/hide toggle button
		if ( this.artworkToggle ) {
			this.artworkToggle.addEventListener( 'click', () => this.toggleArtwork() );
		}

		// Shortcuts overlay button
		if ( this.shortcutsToggle ) {
			this.shortcutsToggle.addEventListener( 'click', () => this.toggleShortcutOverlay() );
		}
	}

	/**
	 * Initialize audio element
	 */
	initAudio() {
		if ( ! this.audio ) {
			// Create audio element if not present
			this.audio = document.createElement( 'audio' );
			this.audio.className = 'jukebox__audio';
			this.audio.preload = 'metadata';
			this.container.querySelector( '.jukebox__player' ).appendChild( this.audio );

			// Re-bind audio events
			this.audio.addEventListener( 'timeupdate', () => this.updateProgress() );
			this.audio.addEventListener( 'loadedmetadata', () => this.updateDuration() );
			this.audio.addEventListener( 'ended', () => this.handleEnded() );
			this.audio.addEventListener( 'play', () => this.updatePlayState( true ) );
			this.audio.addEventListener( 'pause', () => this.updatePlayState( false ) );
			this.audio.addEventListener( 'error', ( e ) => this.handleError( e ) );
		}

		// Set initial volume
		this.audio.volume = this.volume;
		this.updateVolumeDisplay();

		// Load first track
		if ( this.tracks[ 0 ] ) {
			this.loadTrack( 0, false );
		}
	}

	/**
	 * Load a track by index
	 */
	loadTrack( index, autoplay = true ) {
		if ( index < 0 || index >= this.tracks.length ) {
			return;
		}

		const track = this.tracks[ index ];
		this.currentIndex = index;

		// Update audio source
		if ( this.audio && track.url ) {
			this.audio.src = track.url;
			this.audio.load();
		}

		// Check if visualizer is available for this track
		if ( this.visualizer ) {
			this.visualizer.checkAvailability();
		}

		// Update display
		this.updateTrackDisplay( track );

		// Update artwork button state (disabled if no cover)
		this.updateArtworkButtonState();

		// Update active state in tracklist
		this.updateActiveTrack( index );

		// Announce track change to screen readers
		this.announce( track.artist
			? sprintf( __( 'Now playing: %1$s by %2$s', 'pinkcrab-jukebox' ), track.title, track.artist )
			: sprintf( __( 'Now playing: %s', 'pinkcrab-jukebox' ), track.title )
		);

		// Auto-play if requested
		if ( autoplay && this.audio ) {
			this.audio.play().catch( ( e ) => {
				console.log( 'Jukebox: Auto-play prevented', e );
			} );
		}
	}

	/**
	 * Update track display (artwork, title, etc.)
	 */
	updateTrackDisplay( track ) {
		// Artwork
		if ( this.artworkImg && this.artworkPlaceholder ) {
			if ( track.cover ) {
				this.artworkImg.src = track.cover;
				this.artworkImg.alt = track.album || track.title || '';
				this.artworkImg.style.display = 'block';
				this.artworkPlaceholder.style.display = 'none';
			} else {
				this.artworkImg.style.display = 'none';
				this.artworkPlaceholder.style.display = 'flex';
			}
		}

		// Text info
		if ( this.titleEl ) {
			this.titleEl.textContent = track.title || __( 'Unknown Track', 'pinkcrab-jukebox' );
		}
		if ( this.artistEl ) {
			this.artistEl.textContent = track.artist || '';
			// Update filter link data
			if ( this.artistEl.classList.contains( 'jukebox__filter-link' ) ) {
				this.artistEl.dataset.filterValue = track.artist || '';
			}
		}
		if ( this.albumEl ) {
			this.albumEl.textContent = track.album || '';
			// Update filter link data and visibility
			if ( this.albumEl.classList.contains( 'jukebox__filter-link' ) ) {
				this.albumEl.dataset.filterValue = track.album || '';
				this.albumEl.style.display = track.album ? '' : 'none';
			}
		}

		// Page link
		if ( this.pageLinkEl ) {
			if ( track.pageLink ) {
				this.pageLinkEl.href = track.pageLink;
				this.pageLinkEl.style.display = 'inline-block';
			} else {
				this.pageLinkEl.style.display = 'none';
			}
		}

		// Reset progress
		if ( this.progressFill ) {
			this.progressFill.style.width = '0%';
		}
		if ( this.progressInput ) {
			this.progressInput.value = 0;
		}
		if ( this.currentTimeEl ) {
			this.currentTimeEl.textContent = '0:00';
		}
		if ( this.durationEl ) {
			this.durationEl.textContent = '0:00';
		}
	}

	/**
	 * Update active track in tracklist
	 */
	updateActiveTrack( index ) {
		if ( ! this.trackItems ) return;

		this.trackItems.forEach( ( item, i ) => {
			item.classList.toggle( 'jukebox__track--active', i === index );
		} );
	}

	/**
	 * Toggle play/pause
	 */
	togglePlay() {
		if ( ! this.audio ) return;

		if ( this.isPlaying ) {
			this.audio.pause();
		} else {
			this.audio.play().catch( ( e ) => {
				console.log( 'Jukebox: Play failed', e );
			} );
		}
	}

	/**
	 * Play a specific track
	 */
	playTrack( index ) {
		this.loadTrack( index, true );
	}

	/**
	 * Previous track
	 */
	previous() {
		if ( this.isShuffle ) {
			this.shuffleIndex = Math.max( 0, this.shuffleIndex - 1 );
			this.loadTrack( this.shuffledOrder[ this.shuffleIndex ], true );
		} else {
			const prevIndex = this.currentIndex > 0 ? this.currentIndex - 1 : this.tracks.length - 1;
			this.loadTrack( prevIndex, true );
		}
	}

	/**
	 * Next track
	 */
	next() {
		// Check queue first
		if ( this.queue.length > 0 ) {
			const nextIndex = this.queue.shift();
			this.updateQueueDisplay();
			this.loadTrack( nextIndex, true );
			return;
		}

		if ( this.isShuffle ) {
			this.shuffleIndex++;
			if ( this.shuffleIndex >= this.shuffledOrder.length ) {
				if ( this.repeatMode === 'all' ) {
					this.generateShuffleOrder();
					this.shuffleIndex = 0;
				} else {
					this.shuffleIndex = this.shuffledOrder.length - 1;
					return;
				}
			}
			this.loadTrack( this.shuffledOrder[ this.shuffleIndex ], true );
		} else {
			const nextIndex = ( this.currentIndex + 1 ) % this.tracks.length;
			if ( nextIndex === 0 && this.repeatMode === 'off' ) {
				// Don't loop when repeat is off
				this.loadTrack( nextIndex, false );
				return;
			}
			this.loadTrack( nextIndex, true );
		}
	}

	/**
	 * Handle track ended
	 */
	handleEnded() {
		if ( this.repeatMode === 'one' ) {
			this.audio.currentTime = 0;
			this.audio.play();
		} else {
			this.next();
		}
	}

	/**
	 * Toggle shuffle mode
	 */
	toggleShuffle() {
		this.isShuffle = ! this.isShuffle;

		if ( this.shuffleBtn ) {
			this.shuffleBtn.classList.toggle( 'jukebox__btn--active', this.isShuffle );
			this.shuffleBtn.setAttribute( 'aria-pressed', this.isShuffle );
		}

		if ( this.isShuffle ) {
			this.generateShuffleOrder();
		}

		this.announce( this.isShuffle ? __( 'Shuffle on', 'pinkcrab-jukebox' ) : __( 'Shuffle off', 'pinkcrab-jukebox' ) );
	}

	/**
	 * Generate shuffled order
	 */
	generateShuffleOrder() {
		this.shuffledOrder = [ ...Array( this.tracks.length ).keys() ];

		// Fisher-Yates shuffle
		for ( let i = this.shuffledOrder.length - 1; i > 0; i-- ) {
			const j = Math.floor( Math.random() * ( i + 1 ) );
			[ this.shuffledOrder[ i ], this.shuffledOrder[ j ] ] = [ this.shuffledOrder[ j ], this.shuffledOrder[ i ] ];
		}

		// Move current track to front
		const currentPos = this.shuffledOrder.indexOf( this.currentIndex );
		if ( currentPos > 0 ) {
			this.shuffledOrder.splice( currentPos, 1 );
			this.shuffledOrder.unshift( this.currentIndex );
		}

		this.shuffleIndex = 0;
	}

	/**
	 * Toggle repeat mode
	 */
	toggleRepeat() {
		const modes = [ 'off', 'all', 'one' ];
		const currentModeIndex = modes.indexOf( this.repeatMode );
		this.repeatMode = modes[ ( currentModeIndex + 1 ) % modes.length ];

		if ( this.repeatBtn ) {
			this.repeatBtn.dataset.repeatMode = this.repeatMode;
			this.repeatBtn.classList.toggle( 'jukebox__btn--active', this.repeatMode !== 'off' );

			const repeatLabels = {
				off: __( 'Repeat: off', 'pinkcrab-jukebox' ),
				all: __( 'Repeat: all tracks', 'pinkcrab-jukebox' ),
				one: __( 'Repeat: current track', 'pinkcrab-jukebox' ),
			};
			this.repeatBtn.setAttribute( 'aria-label', repeatLabels[ this.repeatMode ] );
		}

		const repeatAnnounce = {
			off: __( 'Repeat: off', 'pinkcrab-jukebox' ),
			all: __( 'Repeat: all tracks', 'pinkcrab-jukebox' ),
			one: __( 'Repeat: current track', 'pinkcrab-jukebox' ),
		};
		this.announce( repeatAnnounce[ this.repeatMode ] );
	}

	/**
	 * Seek to position
	 */
	seek( percent ) {
		if ( ! this.audio || ! this.audio.duration ) return;

		const time = ( percent / 100 ) * this.audio.duration;
		this.audio.currentTime = time;
	}

	/**
	 * Update progress display
	 */
	updateProgress() {
		if ( ! this.audio || ! this.audio.duration ) return;

		const percent = ( this.audio.currentTime / this.audio.duration ) * 100;

		if ( this.progressFill ) {
			this.progressFill.style.width = `${ percent }%`;
		}
		if ( this.progressInput ) {
			this.progressInput.value = percent;
		}
		if ( this.currentTimeEl ) {
			this.currentTimeEl.textContent = this.formatTime( this.audio.currentTime );
		}
		if ( this.progressInput ) {
			this.progressInput.setAttribute( 'aria-valuetext',
				sprintf( __( '%1$s of %2$s', 'pinkcrab-jukebox' ), this.formatTime( this.audio.currentTime ), this.formatTime( this.audio.duration ) )
			);
		}
	}

	/**
	 * Update duration display
	 */
	updateDuration() {
		if ( ! this.audio || ! this.audio.duration ) return;

		if ( this.durationEl ) {
			this.durationEl.textContent = this.formatTime( this.audio.duration );
		}
	}

	/**
	 * Update play state
	 */
	updatePlayState( playing ) {
		this.isPlaying = playing;

		if ( this.playBtn ) {
			this.playBtn.classList.toggle( 'jukebox__btn--playing', playing );
			this.playBtn.setAttribute( 'aria-label', playing ? __( 'Pause', 'pinkcrab-jukebox' ) : __( 'Play', 'pinkcrab-jukebox' ) );
		}

		this.container.classList.toggle( 'jukebox--playing', playing );
	}

	/**
	 * Set volume
	 */
	setVolume( volume ) {
		this.volume = Math.max( 0, Math.min( 1, volume ) );

		if ( this.audio ) {
			this.audio.volume = this.volume;
			this.audio.muted = false;
		}

		this.updateVolumeDisplay();
	}

	/**
	 * Toggle mute
	 */
	toggleMute() {
		if ( ! this.audio ) return;

		this.audio.muted = ! this.audio.muted;
		this.updateVolumeDisplay();
	}

	/**
	 * Update volume display
	 */
	updateVolumeDisplay() {
		const isMuted = this.audio?.muted || this.volume === 0;
		const displayVolume = isMuted ? 0 : this.volume * 100;

		if ( this.volumeFill ) {
			this.volumeFill.style.width = `${ displayVolume }%`;
		}
		if ( this.volumeInput ) {
			this.volumeInput.value = displayVolume;
		}
		if ( this.volumeBtn ) {
			this.volumeBtn.classList.toggle( 'jukebox__btn--muted', isMuted );
		}
		if ( this.volumeInput ) {
			this.volumeInput.setAttribute( 'aria-valuetext', `${ Math.round( displayVolume ) }%` );
		}
	}

	/**
	 * Filter tracks by search query
	 */
	filterTracks( query ) {
		const normalizedQuery = query.toLowerCase().trim();

		if ( ! this.trackItems ) return;

		let visibleCount = 0;
		this.trackItems.forEach( ( item, index ) => {
			const track = this.tracks[ index ];
			const searchText = `${ track.title } ${ track.artist } ${ track.album }`.toLowerCase();
			const matches = ! normalizedQuery || searchText.includes( normalizedQuery );

			item.style.display = matches ? '' : 'none';
			if ( matches ) visibleCount++;
		} );

		// Update count display
		if ( this.tracklistCount ) {
			this.tracklistCount.textContent = visibleCount;
		}
	}

	/**
	 * Set active filter (by artist or album)
	 */
	setActiveFilter( type, value ) {
		this.activeFilter = { type, value };

		// Clear text filter
		if ( this.filterInput ) {
			this.filterInput.value = '';
		}

		// Show filter active bar
		if ( this.filterActiveBar ) {
			this.filterActiveBar.classList.add( 'is-visible' );
		}
		if ( this.filterActiveValue ) {
			this.filterActiveValue.textContent = type === 'artist'
				? sprintf( __( 'Artist: %s', 'pinkcrab-jukebox' ), value )
				: sprintf( __( 'Album: %s', 'pinkcrab-jukebox' ), value );
		}

		// Filter tracks by artist or album
		if ( ! this.trackItems ) return;

		let visibleCount = 0;
		this.trackItems.forEach( ( item, index ) => {
			const track = this.tracks[ index ];
			const trackValue = type === 'artist' ? track.artist : track.album;
			const matches = trackValue && trackValue.toLowerCase() === value.toLowerCase();

			item.style.display = matches ? '' : 'none';
			if ( matches ) visibleCount++;
		} );

		// Update count display
		if ( this.tracklistCount ) {
			this.tracklistCount.textContent = visibleCount;
		}

		// Scroll tracklist into view
		if ( this.tracklistEl ) {
			this.tracklistEl.scrollIntoView( { behavior: 'smooth', block: 'nearest' } );
		}
	}

	/**
	 * Clear active filter
	 */
	clearActiveFilter( showAll = true ) {
		this.activeFilter = null;

		// Hide filter active bar
		if ( this.filterActiveBar ) {
			this.filterActiveBar.classList.remove( 'is-visible' );
		}

		// Show all tracks if requested
		if ( showAll && this.trackItems ) {
			this.trackItems.forEach( ( item ) => {
				item.style.display = '';
			} );

			// Update count display
			if ( this.tracklistCount ) {
				this.tracklistCount.textContent = this.tracks.length;
			}
		}
	}

	/**
	 * Add track to queue
	 */
	addToQueue( index ) {
		if ( index === this.currentIndex ) {
			this.showToast( __( 'Already playing this track', 'pinkcrab-jukebox' ) );
			this.announce( __( 'Already playing this track', 'pinkcrab-jukebox' ) );
			return; // Don't queue current track
		}

		// Check if already in queue
		const queueIndex = this.queue.indexOf( index );
		if ( queueIndex !== -1 ) {
			// Remove from queue if already there
			this.queue.splice( queueIndex, 1 );
			this.updateQueueDisplay();
			this.updateQueueButtonStates();
			const track = this.tracks[ index ];
			this.showToast( sprintf( __( 'Removed "%s" from queue', 'pinkcrab-jukebox' ), track.title ) );
			this.announce( sprintf( __( 'Removed "%s" from queue', 'pinkcrab-jukebox' ), track.title ) );
			return;
		}

		this.queue.push( index );
		this.updateQueueDisplay();
		this.updateQueueButtonStates();

		// Show feedback
		const track = this.tracks[ index ];
		this.showToast( sprintf( __( 'Added "%s" to queue', 'pinkcrab-jukebox' ), track.title ) );
		this.announce( sprintf( __( 'Added "%s" to queue', 'pinkcrab-jukebox' ), track.title ) );
	}

	/**
	 * Remove from queue
	 */
	removeFromQueue( queueIndex ) {
		this.queue.splice( queueIndex, 1 );
		this.updateQueueDisplay();
		this.updateQueueButtonStates();
	}

	/**
	 * Clear queue
	 */
	clearQueue() {
		this.queue = [];
		this.updateQueueDisplay();
		this.updateQueueButtonStates();
	}

	/**
	 * Update queue button states on tracklist
	 */
	updateQueueButtonStates() {
		if ( ! this.trackItems ) return;

		this.trackItems.forEach( ( item, index ) => {
			const queueBtn = item.querySelector( '.jukebox__track-btn--queue' );
			if ( queueBtn ) {
				const isQueued = this.queue.includes( index );
				queueBtn.classList.toggle( 'jukebox__track-btn--queued', isQueued );
				
				const textEl = queueBtn.querySelector( '.jukebox__track-btn-text' );
				if ( textEl ) {
					textEl.textContent = isQueued ? __( 'Queued', 'pinkcrab-jukebox' ) : __( 'Queue', 'pinkcrab-jukebox' );
				}
			}
		} );
	}

	/**
	 * Toggle queue panel visibility
	 */
	toggleQueuePanel() {
		if ( ! this.queueEl ) return;

		const isHidden = this.queueEl.classList.toggle( 'jukebox__queue--hidden' );

		if ( this.queueToggle ) {
			this.queueToggle.setAttribute( 'aria-expanded', ! isHidden );
		}

		// Add/remove click outside listener
		if ( ! isHidden ) {
			// Queue is now visible - add listeners
			setTimeout( () => {
				this.handleClickOutsideQueue = ( e ) => {
					if ( ! this.queueEl.contains( e.target ) && ! this.queueToggle.contains( e.target ) ) {
						this.closeQueuePanel();
					}
				};
				this.handleEscapeQueue = ( e ) => {
					if ( e.key === 'Escape' ) {
						this.closeQueuePanel();
					}
				};
				document.addEventListener( 'click', this.handleClickOutsideQueue );
				document.addEventListener( 'keydown', this.handleEscapeQueue );
			}, 0 );
		} else {
			this.removeClickOutsideListener();
		}
	}

	/**
	 * Close queue panel
	 */
	closeQueuePanel() {
		if ( ! this.queueEl ) return;

		this.queueEl.classList.add( 'jukebox__queue--hidden' );

		if ( this.queueToggle ) {
			this.queueToggle.setAttribute( 'aria-expanded', 'false' );
		}

		this.removeClickOutsideListener();
	}

	/**
	 * Remove click outside and escape listeners
	 */
	removeClickOutsideListener() {
		if ( this.handleClickOutsideQueue ) {
			document.removeEventListener( 'click', this.handleClickOutsideQueue );
			this.handleClickOutsideQueue = null;
		}
		if ( this.handleEscapeQueue ) {
			document.removeEventListener( 'keydown', this.handleEscapeQueue );
			this.handleEscapeQueue = null;
		}
	}

	/**
	 * Update queue display
	 */
	updateQueueDisplay() {
		// Update count
		if ( this.queueCount ) {
			this.queueCount.textContent = this.queue.length;
		}

		// Update queue list
		if ( this.queueList ) {
			this.queueList.textContent = '';

			this.queue.forEach( ( trackIndex, queueIndex ) => {
				const track = this.tracks[ trackIndex ];

				const li = document.createElement( 'li' );
				li.className = 'jukebox__queue-item';
				li.dataset.queueIndex = queueIndex;

				const info = document.createElement( 'div' );
				info.className = 'jukebox__queue-item-info';

				const title = document.createElement( 'span' );
				title.className = 'jukebox__queue-item-title';
				title.textContent = track.title;

				const artist = document.createElement( 'span' );
				artist.className = 'jukebox__queue-item-artist';
				artist.textContent = track.artist;

				info.appendChild( title );
				info.appendChild( artist );

				const removeBtn = document.createElement( 'button' );
				removeBtn.type = 'button';
				removeBtn.className = 'jukebox__queue-item-remove';
				removeBtn.setAttribute( 'aria-label', __( 'Remove from queue', 'pinkcrab-jukebox' ) );

				const svg = document.createElementNS( 'http://www.w3.org/2000/svg', 'svg' );
				svg.setAttribute( 'viewBox', '0 0 24 24' );
				svg.setAttribute( 'fill', 'currentColor' );
				const path = document.createElementNS( 'http://www.w3.org/2000/svg', 'path' );
				path.setAttribute( 'd', 'M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z' );
				svg.appendChild( path );
				removeBtn.appendChild( svg );

				removeBtn.addEventListener( 'click', ( e ) => {
					e.stopPropagation();
					this.removeFromQueue( queueIndex );
				} );

				li.appendChild( info );
				li.appendChild( removeBtn );
				this.queueList.appendChild( li );
			} );
		}

		// Toggle empty state
		if ( this.queueEl ) {
			this.queueEl.classList.toggle( 'jukebox__queue--empty', this.queue.length === 0 );
		}
	}

	/**
	 * Show toast notification
	 */
	showToast( message ) {
		// Remove existing toast
		const existingToast = this.container.querySelector( '.jukebox__toast' );
		if ( existingToast ) {
			existingToast.remove();
		}

		const toast = document.createElement( 'div' );
		toast.className = 'jukebox__toast';
		toast.textContent = message;
		this.container.appendChild( toast );

		// Trigger animation
		requestAnimationFrame( () => {
			toast.classList.add( 'jukebox__toast--visible' );
		} );

		// Remove after delay
		setTimeout( () => {
			toast.classList.remove( 'jukebox__toast--visible' );
			setTimeout( () => toast.remove(), 300 );
		}, 2000 );
	}

	/**
	 * Announce a message to screen readers via the live region.
	 */
	announce( message ) {
		if ( this.announceEl ) {
			this.announceEl.textContent = '';
			requestAnimationFrame( () => {
				this.announceEl.textContent = message;
			} );
		}
	}

	/**
	 * Handle keyboard shortcuts (Winamp-style).
	 *
	 * Z = Previous, X = Play, C = Pause, V = Stop, B = Next
	 * S = Shuffle, R = Repeat, M = Mute, Q = Queue panel
	 * Arrow Left/Right = Seek ∓5 s, Arrow Up/Down = Volume ±10%
	 * ? = Show/hide keyboard shortcut overlay
	 */
	handleKeyboard( e ) {
		// Only handle shortcuts if this jukebox is focused
		if ( ! this.container.contains( document.activeElement ) ) return;

		// Ignore when typing in an input field
		if ( e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' ) return;

		switch ( e.key ) {
			case 'z':
			case 'Z':
				e.preventDefault();
				this.previous();
				break;
			case 'x':
			case 'X':
				e.preventDefault();
				if ( ! this.isPlaying ) {
					this.togglePlay();
				}
				break;
			case 'c':
			case 'C':
				e.preventDefault();
				if ( this.isPlaying ) {
					this.togglePlay();
				}
				break;
			case 'v':
			case 'V':
				e.preventDefault();
				if ( this.audio ) {
					this.audio.pause();
					this.audio.currentTime = 0;
				}
				break;
			case 'b':
			case 'B':
				e.preventDefault();
				this.next();
				break;
			case 'ArrowLeft':
				e.preventDefault();
				if ( this.audio ) {
					this.audio.currentTime = Math.max( 0, this.audio.currentTime - 5 );
				}
				break;
			case 'ArrowRight':
				e.preventDefault();
				if ( this.audio ) {
					this.audio.currentTime = Math.min( this.audio.duration || 0, this.audio.currentTime + 5 );
				}
				break;
			case 'ArrowUp':
				e.preventDefault();
				this.setVolume( this.volume + 0.1 );
				break;
			case 'ArrowDown':
				e.preventDefault();
				this.setVolume( this.volume - 0.1 );
				break;
			case 'm':
			case 'M':
				this.toggleMute();
				break;
			case 's':
			case 'S':
				this.toggleShuffle();
				break;
			case 'r':
			case 'R':
				this.toggleRepeat();
				break;
			case 'q':
			case 'Q':
				this.toggleQueuePanel();
				break;
			case '?':
				e.preventDefault();
				this.toggleShortcutOverlay();
				break;
		}
	}

	/**
	 * Toggle the keyboard shortcut overlay.
	 */
	toggleShortcutOverlay() {
		let overlay = this.container.querySelector( '.jukebox__shortcuts-overlay' );

		if ( overlay ) {
			overlay.remove();
			return;
		}

		overlay = document.createElement( 'div' );
		overlay.className = 'jukebox__shortcuts-overlay';

		const shortcuts = [
			[ 'Z', __( 'Previous track', 'pinkcrab-jukebox' ) ],
			[ 'X', __( 'Play', 'pinkcrab-jukebox' ) ],
			[ 'C', __( 'Pause', 'pinkcrab-jukebox' ) ],
			[ 'V', __( 'Stop', 'pinkcrab-jukebox' ) ],
			[ 'B', __( 'Next track', 'pinkcrab-jukebox' ) ],
			[ 'S', __( 'Shuffle', 'pinkcrab-jukebox' ) ],
			[ 'R', __( 'Repeat', 'pinkcrab-jukebox' ) ],
			[ 'M', __( 'Mute', 'pinkcrab-jukebox' ) ],
			[ 'Q', __( 'Queue', 'pinkcrab-jukebox' ) ],
			[ '\u2190 / \u2192', __( 'Seek', 'pinkcrab-jukebox' ) ],
			[ '\u2191 / \u2193', __( 'Volume', 'pinkcrab-jukebox' ) ],
			[ '?', __( 'This help', 'pinkcrab-jukebox' ) ],
		];

		const title = document.createElement( 'h3' );
		title.className = 'jukebox__shortcuts-title';
		title.textContent = __( 'Keyboard Shortcuts', 'pinkcrab-jukebox' );
		overlay.appendChild( title );

		const list = document.createElement( 'dl' );
		list.className = 'jukebox__shortcuts-list';

		shortcuts.forEach( ( [ key, desc ] ) => {
			const dt = document.createElement( 'dt' );
			const kbd = document.createElement( 'kbd' );
			kbd.textContent = key;
			dt.appendChild( kbd );

			const dd = document.createElement( 'dd' );
			dd.textContent = desc;

			list.appendChild( dt );
			list.appendChild( dd );
		} );

		overlay.appendChild( list );

		// Close on click
		overlay.addEventListener( 'click', () => overlay.remove() );

		this.container.appendChild( overlay );
	}

	/**
	 * Handle audio error
	 */
	handleError( e ) {
		console.error( 'Jukebox: Audio error', e );
		this.showToast( __( 'Error loading audio', 'pinkcrab-jukebox' ) );
	}

	/**
	 * Format time in MM:SS
	 */
	formatTime( seconds ) {
		if ( isNaN( seconds ) || ! isFinite( seconds ) ) {
			return '0:00';
		}

		const mins = Math.floor( seconds / 60 );
		const secs = Math.floor( seconds % 60 );
		return `${ mins }:${ secs.toString().padStart( 2, '0' ) }`;
	}

	/**
	 * Toggle artwork visibility
	 */
	toggleArtwork() {
		if ( ! this.artwork ) return;

		// Toggle the hidden class
		const isNowHidden = this.artwork.classList.toggle( 'jukebox__artwork--hidden' );

		// Update button state (active when artwork is VISIBLE, not hidden)
		if ( this.artworkToggle ) {
			this.artworkToggle.classList.toggle( 'jukebox__sidebar-btn--active', ! isNowHidden );
			this.artworkToggle.setAttribute( 'aria-pressed', ! isNowHidden );
			this.artworkToggle.title = isNowHidden ? __( 'Show Artwork', 'pinkcrab-jukebox' ) : __( 'Hide Artwork', 'pinkcrab-jukebox' );
		}
	}

	/**
	 * Update artwork button state based on current track
	 */
	updateArtworkButtonState() {
		const currentTrack = this.tracks[ this.currentIndex ];
		const hasArtwork = currentTrack && currentTrack.cover;

		if ( this.artworkToggle ) {
			this.artworkToggle.disabled = ! hasArtwork;
			this.artworkToggle.classList.toggle( 'jukebox__sidebar-btn--disabled', ! hasArtwork );
			this.artworkToggle.title = hasArtwork
				? ( this.artwork?.classList.contains( 'jukebox__artwork--hidden' ) ? __( 'Show Artwork', 'pinkcrab-jukebox' ) : __( 'Hide Artwork', 'pinkcrab-jukebox' ) )
				: __( 'No artwork available', 'pinkcrab-jukebox' );
		}
	}

	/**
	 * Clean up all resources: pause audio,
	 * remove document-level listeners.
	 */
	destroy() {
		// Destroy visualizer
		if ( this.visualizer ) {
			this.visualizer.destroy();
			this.visualizer = null;
		}

		// Pause and remove audio
		if ( this.audio ) {
			this.audio.pause();
			this.audio.removeAttribute( 'src' );
			this.audio.load();
		}

		// Remove keyboard listener
		if ( this._keydownHandler ) {
			this.container.removeEventListener( 'keydown', this._keydownHandler );
		}

		// Remove queue panel document listeners
		this.removeClickOutsideListener();

		// Clear instance reference
		this.container._jukeboxInstance = null;
		this.container.classList.remove( 'jukebox--initialized' );
	}
}

/**
 * Initialize all jukeboxes on the page
 */
function initJukeboxes() {
	const jukeboxes = document.querySelectorAll( '.jukebox:not(.jukebox--initialized)' );

	jukeboxes.forEach( ( container ) => {
		const instance = new Jukebox( container );
		container._jukeboxInstance = instance;
	} );
}

// Initialize when DOM is ready
if ( document.readyState === 'loading' ) {
	document.addEventListener( 'DOMContentLoaded', initJukeboxes );
} else {
	initJukeboxes();
}


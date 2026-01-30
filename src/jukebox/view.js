/**
 * Frontend view script for Jukebox block.
 * Handles all playback, queue, shuffle, and repeat functionality.
 */

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

		// Visualizer settings
		this.vizModes = [ 'off', 'bars', 'oscilloscope', 'mirror', 'fire' ];
		this.vizModeNames = {
			off: 'Off',
			bars: 'Classic Bars',
			oscilloscope: 'Oscilloscope',
			mirror: 'Spectrum Mirror',
			fire: 'Fire Bars',
		};
		this.vizMode = 'off';
		this.audioContext = null;
		this.analyser = null;
		this.animationId = null;
		this.vizInitialized = false;
		this.vizCorsBlocked = false;

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

		// Keyboard shortcuts
		this.container.addEventListener( 'keydown', ( e ) => this.handleKeyboard( e ) );

		// Visualizer toggle button (cycles through modes)
		if ( this.vizToggle ) {
			this.vizToggle.addEventListener( 'click', () => this.cycleVisualizerMode() );
		}

		// Artwork show/hide toggle button
		if ( this.artworkToggle ) {
			this.artworkToggle.addEventListener( 'click', () => this.toggleArtwork() );
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
		this.checkVisualizerAvailability();

		// Update display
		this.updateTrackDisplay( track );

		// Update artwork button state (disabled if no cover)
		this.updateArtworkButtonState();

		// Update active state in tracklist
		this.updateActiveTrack( index );

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
			this.titleEl.textContent = track.title || 'Unknown Track';
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
		}
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
			this.playBtn.setAttribute( 'aria-label', playing ? 'Pause' : 'Play' );
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
			this.filterActiveValue.textContent = `${ type === 'artist' ? 'Artist' : 'Album' }: ${ value }`;
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
			this.showToast( 'Already playing this track' );
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
			this.showToast( `Removed "${ track.title }" from queue` );
			return;
		}

		this.queue.push( index );
		this.updateQueueDisplay();
		this.updateQueueButtonStates();

		// Show feedback
		const track = this.tracks[ index ];
		this.showToast( `Added "${ track.title }" to queue` );
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
					textEl.textContent = isQueued ? 'Queued' : 'Queue';
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
			this.queueList.innerHTML = this.queue
				.map( ( trackIndex, queueIndex ) => {
					const track = this.tracks[ trackIndex ];
					return `
						<li class="jukebox__queue-item" data-queue-index="${ queueIndex }">
							<div class="jukebox__queue-item-info">
								<span class="jukebox__queue-item-title">${ this.escapeHtml( track.title ) }</span>
								<span class="jukebox__queue-item-artist">${ this.escapeHtml( track.artist ) }</span>
							</div>
							<button 
								type="button" 
								class="jukebox__queue-item-remove" 
								aria-label="Remove from queue"
								data-queue-index="${ queueIndex }"
							>
								<svg viewBox="0 0 24 24" fill="currentColor">
									<path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
								</svg>
							</button>
						</li>
					`;
				} )
				.join( '' );

			// Bind remove buttons
			this.queueList.querySelectorAll( '.jukebox__queue-item-remove' ).forEach( ( btn ) => {
				btn.addEventListener( 'click', ( e ) => {
					e.stopPropagation();
					const queueIndex = parseInt( btn.dataset.queueIndex, 10 );
					this.removeFromQueue( queueIndex );
				} );
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
	 * Handle keyboard shortcuts
	 */
	handleKeyboard( e ) {
		// Only handle shortcuts if this jukebox is focused
		if ( ! this.container.contains( document.activeElement ) ) return;

		switch ( e.key ) {
			case ' ':
				e.preventDefault();
				this.togglePlay();
				break;
			case 'ArrowLeft':
				if ( e.shiftKey ) {
					this.previous();
				} else {
					// Seek back 5 seconds
					if ( this.audio ) {
						this.audio.currentTime = Math.max( 0, this.audio.currentTime - 5 );
					}
				}
				break;
			case 'ArrowRight':
				if ( e.shiftKey ) {
					this.next();
				} else {
					// Seek forward 5 seconds
					if ( this.audio ) {
						this.audio.currentTime = Math.min( this.audio.duration, this.audio.currentTime + 5 );
					}
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
		}
	}

	/**
	 * Handle audio error
	 */
	handleError( e ) {
		console.error( 'Jukebox: Audio error', e );
		this.showToast( 'Error loading audio' );
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
	 * Escape HTML for safe insertion
	 */
	escapeHtml( str ) {
		const div = document.createElement( 'div' );
		div.textContent = str;
		return div.innerHTML;
	}

	/**
	 * Cycle through visualizer modes (for button toggle)
	 */
	cycleVisualizerMode() {
		// Check if CORS blocked before trying to cycle
		if ( this.vizCorsBlocked && this.vizMode === 'off' ) {
			this.showToast( 'Visualizer unavailable (cross-origin audio)' );
			return;
		}

		const currentIndex = this.vizModes.indexOf( this.vizMode );
		const nextIndex = ( currentIndex + 1 ) % this.vizModes.length;
		this.setVisualizerMode( this.vizModes[ nextIndex ] );
	}

	/**
	 * Set visualizer mode directly
	 */
	setVisualizerMode( mode ) {
		this.vizMode = mode;

		// Update toggle button
		if ( this.vizToggle ) {
			this.vizToggle.dataset.vizMode = this.vizMode;
			this.vizToggle.title = `Visualizer: ${ this.vizModeNames[ this.vizMode ] || mode }`;
			this.vizToggle.classList.toggle( 'jukebox__sidebar-btn--active', this.vizMode !== 'off' );
		}

		// Update container class for CSS
		this.container.dataset.vizMode = this.vizMode;

		if ( this.vizMode === 'off' ) {
			this.stopVisualizer();
		} else {
			this.startVisualizer();
		}
	}

	/**
	 * Check CORS and update visualizer button state
	 */
	checkVisualizerAvailability() {
		const currentTrack = this.tracks[ this.currentIndex ];
		const isSameOrigin = currentTrack && this.isSameOrigin( currentTrack.url );

		this.vizCorsBlocked = ! isSameOrigin;

		// Update button disabled state
		if ( this.vizToggle ) {
			this.vizToggle.classList.toggle( 'jukebox__sidebar-btn--disabled', this.vizCorsBlocked );
			this.vizToggle.title = this.vizCorsBlocked
				? 'Visualizer unavailable (cross-origin)'
				: `Visualizer: ${ this.vizModeNames[ this.vizMode ] || this.vizMode }`;
		}

		// If currently running a visualizer but now blocked, turn it off
		if ( this.vizCorsBlocked && this.vizMode !== 'off' ) {
			this.vizMode = 'off';
			this.stopVisualizer();
			this.container.dataset.vizMode = 'off';
			if ( this.vizToggle ) {
				this.vizToggle.dataset.vizMode = 'off';
				this.vizToggle.classList.remove( 'jukebox__sidebar-btn--active' );
			}
		}
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
			this.artworkToggle.title = isNowHidden ? 'Show Artwork' : 'Hide Artwork';
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
				? ( this.artwork?.classList.contains( 'jukebox__artwork--hidden' ) ? 'Show Artwork' : 'Hide Artwork' )
				: 'No artwork available';
		}
	}

	/**
	 * Check if a URL is same-origin (safe for Web Audio API)
	 */
	isSameOrigin( url ) {
		if ( ! url ) return false;
		try {
			const audioUrl = new URL( url, window.location.href );
			return audioUrl.origin === window.location.origin;
		} catch ( e ) {
			return false;
		}
	}

	/**
	 * Initialize Web Audio API for visualizer
	 * Returns false if CORS would cause audio to mute
	 */
	initAudioContext() {
		if ( this.vizInitialized ) return true;

		// Check if current track is same-origin - if not, DON'T initialize
		// Web Audio API will silently mute cross-origin audio!
		const currentTrack = this.tracks[ this.currentIndex ];
		if ( currentTrack && ! this.isSameOrigin( currentTrack.url ) ) {
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
	 * Start the visualizer
	 */
	startVisualizer() {
		if ( ! this.initAudioContext() ) {
			// CORS blocked - show message and reset to off
			if ( this.vizCorsBlocked ) {
				this.showToast( 'Visualizer unavailable (cross-origin audio)' );
				this.vizMode = 'off';
				this.container.dataset.vizMode = 'off';
				if ( this.vizSelect ) {
					this.vizSelect.value = 'off';
				}
			}
			return;
		}

		// Resume audio context if suspended
		if ( this.audioContext.state === 'suspended' ) {
			this.audioContext.resume();
		}

		// Setup canvases
		this.setupVisualizerCanvas();

		// Start animation loop
		this.animateVisualizer();
	}

	/**
	 * Stop the visualizer
	 */
	stopVisualizer() {
		if ( this.animationId ) {
			cancelAnimationFrame( this.animationId );
			this.animationId = null;
		}

		// Clear canvases
		this.clearVisualizerCanvas();
	}

	/**
	 * Setup visualizer canvas dimensions
	 */
	setupVisualizerCanvas() {
		const artwork = this.container.querySelector( '.jukebox__artwork' );
		if ( ! artwork ) return;

		const rect = artwork.getBoundingClientRect();

		[ this.vizCanvasBehind, this.vizCanvasOverlay ].forEach( ( canvas ) => {
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
	 */
	clearVisualizerCanvas() {
		[ this.vizCanvasBehind, this.vizCanvasOverlay ].forEach( ( canvas ) => {
			if ( canvas ) {
				const ctx = canvas.getContext( '2d' );
				ctx.clearRect( 0, 0, canvas.width, canvas.height );
			}
		} );
	}

	/**
	 * Animation loop for visualizer
	 */
	animateVisualizer() {
		if ( this.vizMode === 'off' ) return;

		this.animationId = requestAnimationFrame( () => this.animateVisualizer() );

		// Get frequency data
		const bufferLength = this.analyser.frequencyBinCount;
		const dataArray = new Uint8Array( bufferLength );

		if ( this.vizMode === 'oscilloscope' ) {
			this.analyser.getByteTimeDomainData( dataArray );
		} else {
			this.analyser.getByteFrequencyData( dataArray );
		}

		// Render to the behind canvas
		const canvas = this.vizCanvasBehind;
		if ( ! canvas ) return;

		const ctx = canvas.getContext( '2d' );
		const width = canvas.width / window.devicePixelRatio;
		const height = canvas.height / window.devicePixelRatio;

		// Clear
		ctx.clearRect( 0, 0, width, height );

		// Draw based on mode
		switch ( this.vizMode ) {
			case 'bars':
				this.drawClassicBars( ctx, dataArray, width, height );
				break;
			case 'oscilloscope':
				this.drawOscilloscope( ctx, dataArray, width, height );
				break;
			case 'mirror':
				this.drawMirrorBars( ctx, dataArray, width, height );
				break;
			case 'fire':
				this.drawFireBars( ctx, dataArray, width, height );
				break;
		}
	}

	/**
	 * Draw classic Winamp-style bars (green → yellow → red)
	 */
	drawClassicBars( ctx, dataArray, width, height ) {
		const barCount = 32;
		const barWidth = width / barCount - 2;
		const barSpacing = 2;

		for ( let i = 0; i < barCount; i++ ) {
			const dataIndex = Math.floor( i * dataArray.length / barCount );
			const value = dataArray[ dataIndex ];
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

			// Add glow effect
			ctx.shadowColor = '#00ff00';
			ctx.shadowBlur = 10;
		}
		ctx.shadowBlur = 0;
	}

	/**
	 * Draw oscilloscope waveform
	 */
	drawOscilloscope( ctx, dataArray, width, height ) {
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
	 */
	drawMirrorBars( ctx, dataArray, width, height ) {
		const barCount = 32;
		const barWidth = width / barCount - 2;
		const barSpacing = 2;
		const centerY = height / 2;

		for ( let i = 0; i < barCount; i++ ) {
			const dataIndex = Math.floor( i * dataArray.length / barCount );
			const value = dataArray[ dataIndex ];
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
	 */
	drawFireBars( ctx, dataArray, width, height ) {
		const barCount = 48;
		const barWidth = width / barCount - 1;
		const barSpacing = 1;

		for ( let i = 0; i < barCount; i++ ) {
			const dataIndex = Math.floor( i * dataArray.length / barCount );
			const value = dataArray[ dataIndex ];
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

		// Add flickering glow
		ctx.shadowColor = '#ff6600';
		ctx.shadowBlur = 20 + Math.random() * 10;
		ctx.shadowBlur = 0;
	}
}

/**
 * Initialize all jukeboxes on the page
 */
function initJukeboxes() {
	const jukeboxes = document.querySelectorAll( '.jukebox:not(.jukebox--initialized)' );

	jukeboxes.forEach( ( container ) => {
		new Jukebox( container );
	} );
}

// Initialize when DOM is ready
if ( document.readyState === 'loading' ) {
	document.addEventListener( 'DOMContentLoaded', initJukeboxes );
} else {
	initJukeboxes();
}


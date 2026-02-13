/**
 * Page Object for the frontend jukebox player.
 */
class JukeboxFrontend {
	constructor( page ) {
		this.page = page;
		this.container = page.locator( '.jukebox' );

		// Controls
		this.playButton = this.container.locator( '.jukebox__btn--play' );
		this.prevButton = this.container.locator( '.jukebox__btn--prev' );
		this.nextButton = this.container.locator( '.jukebox__btn--next' );
		this.shuffleButton = this.container.locator( '.jukebox__btn--shuffle' );
		this.repeatButton = this.container.locator( '.jukebox__btn--repeat' );
		this.volumeButton = this.container.locator( '.jukebox__btn--volume' );
		this.volumeSlider = this.container.locator( '.jukebox__volume-input' );

		// Display
		this.title = this.container.locator( '.jukebox__title' );
		this.artist = this.container.locator(
			'button.jukebox__artist, div.jukebox__artist'
		);
		this.album = this.container.locator(
			'button.jukebox__album, div.jukebox__album'
		);
		this.currentTime = this.container.locator( '.jukebox__time--current' );
		this.duration = this.container.locator( '.jukebox__time--duration' );
		this.progressInput = this.container.locator(
			'.jukebox__progress-input'
		);

		// Tracklist
		this.tracks = this.container.locator( '.jukebox__track' );
		this.activeTrack = this.container.locator( '.jukebox__track--active' );
		this.filterInput = this.container.locator( '.jukebox__filter-input' );
		this.filterActiveBar = this.container.locator(
			'.jukebox__filter-active'
		);
		this.filterClearButton = this.container.locator(
			'.jukebox__filter-clear'
		);
		this.tracklistCount = this.container.locator(
			'.jukebox__tracklist-count'
		);

		// Queue
		this.queueToggle = this.container.locator( '.jukebox__queue-toggle' );
		this.queuePanel = this.container.locator( '.jukebox__queue' );
		this.queueCount = this.container.locator( '.jukebox__queue-count' );
		this.queueClearButton = this.container.locator(
			'.jukebox__queue-clear'
		);
		this.queueCloseButton = this.container.locator(
			'.jukebox__queue-close'
		);
		this.queueItems = this.container.locator( '.jukebox__queue-item' );

		// Misc
		this.srAnnounce = this.container.locator( '.jukebox__sr-announce' );
		this.shortcutsOverlay = this.container.locator(
			'.jukebox__shortcuts-overlay'
		);
		this.shortcutsToggle = this.container.locator(
			'.jukebox__shortcuts-toggle'
		);
	}

	/** Wait for the jukebox to fully initialize */
	async waitForInit() {
		await this.page.locator( '.jukebox.jukebox--initialized' ).waitFor();
	}

	/** Focus the jukebox container (required for keyboard shortcuts) */
	async focus() {
		await this.container.focus();
	}

	/** Get track at index from the tracklist */
	trackAt( index ) {
		return this.tracks.nth( index );
	}

	/** Get queue button for a specific track */
	queueButtonAt( index ) {
		return this.trackAt( index ).locator( '.jukebox__track-btn--queue' );
	}

	/** Get the current screen reader announcement text */
	async getAnnouncement() {
		return ( await this.srAnnounce.textContent() ) ?? '';
	}

	/** Press a keyboard shortcut key while focused on the jukebox */
	async pressKey( key ) {
		await this.focus();
		await this.page.keyboard.press( key );
	}
}

module.exports = { JukeboxFrontend };

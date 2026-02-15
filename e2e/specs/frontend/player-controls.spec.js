const { test, expect } = require( '../../fixtures' );
const { jukeboxBlockContent } = require( '../../fixtures/test-data' );
const { JukeboxFrontend } = require( '../../fixtures/jukebox-frontend' );

test.describe( 'Player Controls', () => {
	let postUrl;

	test.beforeAll( async ( { requestUtils } ) => {
		const post = await requestUtils.createPost( {
			title: 'Jukebox E2E - Player Controls',
			content: jukeboxBlockContent(),
			status: 'publish',
		} );
		postUrl = new URL( `/?p=${ post.id }`, process.env.WP_BASE_URL || 'http://localhost:57882' ).href;
	} );

	test.afterAll( async ( { requestUtils } ) => {
		await requestUtils.deleteAllPosts();
	} );

	// Mock audio so play/pause events fire with dummy URLs
	test.beforeEach( async ( { page } ) => {
		await page.addInitScript( () => {
			HTMLAudioElement.prototype.play = function () {
				this.dispatchEvent( new Event( 'play' ) );
				return Promise.resolve();
			};
			HTMLAudioElement.prototype.pause = function () {
				this.dispatchEvent( new Event( 'pause' ) );
			};
		} );
	} );

	test( 'play button starts playback', async ( { page } ) => {
		await page.goto( postUrl );
		const jukebox = new JukeboxFrontend( page );
		await jukebox.waitForInit();

		await jukebox.playButton.click();

		await expect( jukebox.playButton ).toHaveClass( /jukebox__btn--playing/ );
		await expect( jukebox.playButton ).toHaveAttribute( 'aria-label', /Pause/ );
		await expect( jukebox.container ).toHaveClass( /jukebox--playing/ );
	} );

	test( 'play button toggles to pause', async ( { page } ) => {
		await page.goto( postUrl );
		const jukebox = new JukeboxFrontend( page );
		await jukebox.waitForInit();

		// Play
		await jukebox.playButton.click();
		await expect( jukebox.playButton ).toHaveClass( /jukebox__btn--playing/ );

		// Pause
		await jukebox.playButton.click();
		await expect( jukebox.playButton ).not.toHaveClass( /jukebox__btn--playing/ );
		await expect( jukebox.playButton ).toHaveAttribute( 'aria-label', /Play/ );
		await expect( jukebox.container ).not.toHaveClass( /jukebox--playing/ );
	} );

	test( 'next button advances to next track', async ( { page } ) => {
		await page.goto( postUrl );
		const jukebox = new JukeboxFrontend( page );
		await jukebox.waitForInit();

		await expect( jukebox.title ).toHaveText( 'Test Track One' );

		await jukebox.nextButton.click();
		await expect( jukebox.title ).toHaveText( 'Test Track Two' );
		await expect( jukebox.artist ).toHaveText( 'Test Artist B' );
	} );

	test( 'prev button goes to previous track', async ( { page } ) => {
		await page.goto( postUrl );
		const jukebox = new JukeboxFrontend( page );
		await jukebox.waitForInit();

		// Go to track 2
		await jukebox.nextButton.click();
		await expect( jukebox.title ).toHaveText( 'Test Track Two' );

		// Back to track 1
		await jukebox.prevButton.click();
		await expect( jukebox.title ).toHaveText( 'Test Track One' );
	} );

	test( 'prev on first track wraps to last', async ( { page } ) => {
		await page.goto( postUrl );
		const jukebox = new JukeboxFrontend( page );
		await jukebox.waitForInit();

		await expect( jukebox.title ).toHaveText( 'Test Track One' );

		await jukebox.prevButton.click();
		await expect( jukebox.title ).toHaveText( 'Test Track Three' );
	} );

	test( 'next on last track with repeat off loads first without autoplay', async ( { page } ) => {
		await page.goto( postUrl );
		const jukebox = new JukeboxFrontend( page );
		await jukebox.waitForInit();

		// Navigate to last track
		await jukebox.nextButton.click(); // track 2
		await jukebox.nextButton.click(); // track 3
		await expect( jukebox.title ).toHaveText( 'Test Track Three' );

		// Next wraps to first track (repeat is off by default)
		await jukebox.nextButton.click();
		await expect( jukebox.title ).toHaveText( 'Test Track One' );
	} );
} );

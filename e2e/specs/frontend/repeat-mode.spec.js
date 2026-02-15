const { test, expect } = require( '../../fixtures' );
const { jukeboxBlockContent } = require( '../../fixtures/test-data' );
const { JukeboxFrontend } = require( '../../fixtures/jukebox-frontend' );

test.describe( 'Repeat Mode', () => {
	let postUrl;

	test.beforeAll( async ( { requestUtils } ) => {
		const post = await requestUtils.createPost( {
			title: 'Jukebox E2E - Repeat Mode',
			content: jukeboxBlockContent(),
			status: 'publish',
		} );
		postUrl = new URL( `/?p=${ post.id }`, process.env.WP_BASE_URL || 'http://localhost:57882' ).href;
	} );

	test.afterAll( async ( { requestUtils } ) => {
		await requestUtils.deleteAllPosts();
	} );

	// Mock audio for play/ended events
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

	test( 'repeat button starts in off mode', async ( { page } ) => {
		await page.goto( postUrl );
		const jukebox = new JukeboxFrontend( page );
		await jukebox.waitForInit();

		await expect( jukebox.repeatButton ).toHaveAttribute( 'data-repeat-mode', 'off' );
		await expect( jukebox.repeatButton ).not.toHaveClass( /jukebox__btn--active/ );
	} );

	test( 'clicking cycles through off → all → one → off', async ( { page } ) => {
		await page.goto( postUrl );
		const jukebox = new JukeboxFrontend( page );
		await jukebox.waitForInit();

		// off → all
		await jukebox.repeatButton.click();
		await expect( jukebox.repeatButton ).toHaveAttribute( 'data-repeat-mode', 'all' );
		await expect( jukebox.repeatButton ).toHaveClass( /jukebox__btn--active/ );

		// all → one
		await jukebox.repeatButton.click();
		await expect( jukebox.repeatButton ).toHaveAttribute( 'data-repeat-mode', 'one' );
		await expect( jukebox.repeatButton ).toHaveClass( /jukebox__btn--active/ );

		// one → off
		await jukebox.repeatButton.click();
		await expect( jukebox.repeatButton ).toHaveAttribute( 'data-repeat-mode', 'off' );
		await expect( jukebox.repeatButton ).not.toHaveClass( /jukebox__btn--active/ );
	} );

	test( 'repeat-all aria-label describes mode', async ( { page } ) => {
		await page.goto( postUrl );
		const jukebox = new JukeboxFrontend( page );
		await jukebox.waitForInit();

		// off → all
		await jukebox.repeatButton.click();
		await expect( jukebox.repeatButton ).toHaveAttribute( 'aria-label', /all tracks/ );

		// all → one
		await jukebox.repeatButton.click();
		await expect( jukebox.repeatButton ).toHaveAttribute( 'aria-label', /current track/ );

		// one → off
		await jukebox.repeatButton.click();
		await expect( jukebox.repeatButton ).toHaveAttribute( 'aria-label', /off/ );
	} );

	test( 'repeat-one replays current track on ended', async ( { page } ) => {
		await page.goto( postUrl );
		const jukebox = new JukeboxFrontend( page );
		await jukebox.waitForInit();

		// Set repeat to "one" (click twice: off → all → one)
		await jukebox.repeatButton.click();
		await jukebox.repeatButton.click();
		await expect( jukebox.repeatButton ).toHaveAttribute( 'data-repeat-mode', 'one' );

		// We're on track 1
		await expect( jukebox.title ).toHaveText( 'Test Track One' );

		// Simulate track ending
		await page.evaluate( () => {
			const audio = document.querySelector( '.jukebox__audio' );
			audio.dispatchEvent( new Event( 'ended' ) );
		} );

		// Should still be on track 1 (replayed, not advanced)
		await expect( jukebox.title ).toHaveText( 'Test Track One' );
	} );

	test( 'repeat-all advances to next then wraps', async ( { page } ) => {
		await page.goto( postUrl );
		const jukebox = new JukeboxFrontend( page );
		await jukebox.waitForInit();

		// Set repeat to "all" (click once: off → all)
		await jukebox.repeatButton.click();
		await expect( jukebox.repeatButton ).toHaveAttribute( 'data-repeat-mode', 'all' );

		// Navigate to last track
		await jukebox.nextButton.click(); // track 2
		await jukebox.nextButton.click(); // track 3
		await expect( jukebox.title ).toHaveText( 'Test Track Three' );

		// Simulate track ending — should wrap to track 1 (repeat all)
		await page.evaluate( () => {
			const audio = document.querySelector( '.jukebox__audio' );
			audio.dispatchEvent( new Event( 'ended' ) );
		} );

		await expect( jukebox.title ).toHaveText( 'Test Track One' );
	} );

	test( 'repeat-off on last track does not wrap on ended', async ( { page } ) => {
		await page.goto( postUrl );
		const jukebox = new JukeboxFrontend( page );
		await jukebox.waitForInit();

		// Repeat is off by default
		await expect( jukebox.repeatButton ).toHaveAttribute( 'data-repeat-mode', 'off' );

		// Navigate to last track
		await jukebox.nextButton.click(); // track 2
		await jukebox.nextButton.click(); // track 3
		await expect( jukebox.title ).toHaveText( 'Test Track Three' );

		// Simulate track ending — calls next(), which loads track 1 without autoplay
		await page.evaluate( () => {
			const audio = document.querySelector( '.jukebox__audio' );
			audio.dispatchEvent( new Event( 'ended' ) );
		} );

		// Display moves to track 1 but playback should not be active
		await expect( jukebox.title ).toHaveText( 'Test Track One' );
	} );

	test( 'screen reader announces repeat mode changes', async ( { page } ) => {
		await page.goto( postUrl );
		const jukebox = new JukeboxFrontend( page );
		await jukebox.waitForInit();

		// off → all
		await jukebox.repeatButton.click();
		await page.waitForTimeout( 100 ); // Wait for rAF in announce()
		const announcement = await jukebox.getAnnouncement();
		expect( announcement ).toMatch( /all tracks/i );
	} );
} );

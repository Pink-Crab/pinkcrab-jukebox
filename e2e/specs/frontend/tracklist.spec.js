const { test, expect } = require( '../../fixtures' );
const { jukeboxBlockContent } = require( '../../fixtures/test-data' );
const { JukeboxFrontend } = require( '../../fixtures/jukebox-frontend' );

test.describe( 'Tracklist', () => {
	let postUrl;

	test.beforeAll( async ( { requestUtils } ) => {
		const post = await requestUtils.createPost( {
			title: 'Jukebox E2E - Tracklist',
			content: jukeboxBlockContent(),
			status: 'publish',
		} );
		postUrl = new URL( `/?p=${ post.id }`, process.env.WP_BASE_URL || 'http://localhost:57882' ).href;
	} );

	test.afterAll( async ( { requestUtils } ) => {
		await requestUtils.deleteAllPosts();
	} );

	// Mock audio so playTrack doesn't throw on dummy URLs
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

	test( 'tracks render with correct title and artist', async ( { page } ) => {
		await page.goto( postUrl );
		const jukebox = new JukeboxFrontend( page );
		await jukebox.waitForInit();

		const track1 = jukebox.trackAt( 0 );
		await expect( track1.locator( '.jukebox__track-title' ) ).toHaveText( 'Test Track One' );
		await expect( track1.locator( '.jukebox__track-artist' ) ).toHaveText( 'Test Artist A' );

		const track2 = jukebox.trackAt( 1 );
		await expect( track2.locator( '.jukebox__track-title' ) ).toHaveText( 'Test Track Two' );
		await expect( track2.locator( '.jukebox__track-artist' ) ).toHaveText( 'Test Artist B' );
	} );

	test( 'first track has active class on init', async ( { page } ) => {
		await page.goto( postUrl );
		const jukebox = new JukeboxFrontend( page );
		await jukebox.waitForInit();

		await expect( jukebox.trackAt( 0 ) ).toHaveClass( /jukebox__track--active/ );
		await expect( jukebox.trackAt( 1 ) ).not.toHaveClass( /jukebox__track--active/ );
		await expect( jukebox.trackAt( 2 ) ).not.toHaveClass( /jukebox__track--active/ );
	} );

	test( 'clicking a track changes active class', async ( { page } ) => {
		await page.goto( postUrl );
		const jukebox = new JukeboxFrontend( page );
		await jukebox.waitForInit();

		await jukebox.trackAt( 1 ).click();

		await expect( jukebox.trackAt( 0 ) ).not.toHaveClass( /jukebox__track--active/ );
		await expect( jukebox.trackAt( 1 ) ).toHaveClass( /jukebox__track--active/ );
	} );

	test( 'clicking a track updates player display', async ( { page } ) => {
		await page.goto( postUrl );
		const jukebox = new JukeboxFrontend( page );
		await jukebox.waitForInit();

		await expect( jukebox.title ).toHaveText( 'Test Track One' );

		await jukebox.trackAt( 2 ).click();
		await expect( jukebox.title ).toHaveText( 'Test Track Three' );
		await expect( jukebox.artist ).toHaveText( 'Test Artist A' );
	} );

	test( 'clicking queue button does not play the track', async ( { page } ) => {
		await page.goto( postUrl );
		const jukebox = new JukeboxFrontend( page );
		await jukebox.waitForInit();

		// Track 1 is active initially
		await expect( jukebox.title ).toHaveText( 'Test Track One' );

		// Click queue button on track 2
		await jukebox.queueButtonAt( 1 ).click();

		// Track 1 should still be active — clicking queue button doesn't play the track
		await expect( jukebox.title ).toHaveText( 'Test Track One' );
		await expect( jukebox.trackAt( 0 ) ).toHaveClass( /jukebox__track--active/ );
	} );

	test( 'each track has a queue button', async ( { page } ) => {
		await page.goto( postUrl );
		const jukebox = new JukeboxFrontend( page );
		await jukebox.waitForInit();

		await expect( jukebox.queueButtonAt( 0 ) ).toBeVisible();
		await expect( jukebox.queueButtonAt( 1 ) ).toBeVisible();
		await expect( jukebox.queueButtonAt( 2 ) ).toBeVisible();
	} );
} );

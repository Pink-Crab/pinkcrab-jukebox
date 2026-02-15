const { test, expect } = require( '../../fixtures' );
const { SAMPLE_TRACKS, jukeboxBlockContent } = require( '../../fixtures/test-data' );
const { JukeboxFrontend } = require( '../../fixtures/jukebox-frontend' );

test.describe( 'Edge Cases', () => {
	test.afterAll( async ( { requestUtils } ) => {
		await requestUtils.deleteAllPosts();
	} );

	// Mock audio for navigation tests
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

	test( 'empty tracklist does not render', async ( { page, requestUtils } ) => {
		const post = await requestUtils.createPost( {
			title: 'Jukebox E2E - Empty Tracks',
			content: jukeboxBlockContent( [] ),
			status: 'publish',
		} );
		const postUrl = new URL( `/?p=${ post.id }`, process.env.WP_BASE_URL || 'http://localhost:57882' ).href;

		await page.goto( postUrl );

		// PHP render returns empty string when tracks is empty — no container at all
		const container = page.locator( '.jukebox' );
		await expect( container ).toHaveCount( 0 );
	} );

	test( 'track with missing title shows fallback', async ( { page, requestUtils } ) => {
		const tracks = [
			{ id: 'no-title', title: '', artist: 'Some Artist', album: '', cover: '', url: '#track-1', pageLink: '' },
		];

		const post = await requestUtils.createPost( {
			title: 'Jukebox E2E - Missing Title',
			content: jukeboxBlockContent( tracks ),
			status: 'publish',
		} );
		const postUrl = new URL( `/?p=${ post.id }`, process.env.WP_BASE_URL || 'http://localhost:57882' ).href;

		await page.goto( postUrl );
		const jukebox = new JukeboxFrontend( page );
		await jukebox.waitForInit();

		// Title should show "Unknown Track" fallback
		await expect( jukebox.title ).toHaveText( 'Unknown Track' );
	} );

	test( 'track with missing artist shows empty', async ( { page, requestUtils } ) => {
		const tracks = [
			{ id: 'no-artist', title: 'Instrumental', artist: '', album: '', cover: '', url: '#track-1', pageLink: '' },
		];

		const post = await requestUtils.createPost( {
			title: 'Jukebox E2E - Missing Artist',
			content: jukeboxBlockContent( tracks ),
			status: 'publish',
		} );
		const postUrl = new URL( `/?p=${ post.id }`, process.env.WP_BASE_URL || 'http://localhost:57882' ).href;

		await page.goto( postUrl );
		const jukebox = new JukeboxFrontend( page );
		await jukebox.waitForInit();

		await expect( jukebox.title ).toHaveText( 'Instrumental' );
		await expect( jukebox.artist ).toHaveText( '' );
	} );

	test( 'album hidden when track has no album', async ( { page, requestUtils } ) => {
		const tracks = [
			{ id: 'no-album', title: 'Single Track', artist: 'Artist', album: '', cover: '', url: '#track-1', pageLink: '' },
		];

		const post = await requestUtils.createPost( {
			title: 'Jukebox E2E - No Album',
			content: jukeboxBlockContent( tracks ),
			status: 'publish',
		} );
		const postUrl = new URL( `/?p=${ post.id }`, process.env.WP_BASE_URL || 'http://localhost:57882' ).href;

		await page.goto( postUrl );
		const jukebox = new JukeboxFrontend( page );
		await jukebox.waitForInit();

		// Album element should be hidden when empty
		const album = jukebox.container.locator( '.jukebox__album' );
		await expect( album ).toBeHidden();
	} );

	test( 'page link visible when track has pageLink', async ( { page, requestUtils } ) => {
		const post = await requestUtils.createPost( {
			title: 'Jukebox E2E - Page Link',
			content: jukeboxBlockContent(), // Track 3 has pageLink
			status: 'publish',
		} );
		const postUrl = new URL( `/?p=${ post.id }`, process.env.WP_BASE_URL || 'http://localhost:57882' ).href;

		await page.goto( postUrl );
		const jukebox = new JukeboxFrontend( page );
		await jukebox.waitForInit();

		const pageLink = jukebox.container.locator( '.jukebox__page-link' );

		// Track 1 has no pageLink — should be hidden
		await expect( pageLink ).toBeHidden();

		// Navigate to track 3 which has pageLink
		await jukebox.nextButton.click(); // track 2
		await jukebox.nextButton.click(); // track 3

		await expect( pageLink ).toBeVisible();
		await expect( pageLink ).toHaveAttribute( 'href', 'https://example.com/track3' );
	} );

	test( 'page link hidden when navigating to track without one', async ( { page, requestUtils } ) => {
		const post = await requestUtils.createPost( {
			title: 'Jukebox E2E - Page Link Toggle',
			content: jukeboxBlockContent(),
			status: 'publish',
		} );
		const postUrl = new URL( `/?p=${ post.id }`, process.env.WP_BASE_URL || 'http://localhost:57882' ).href;

		await page.goto( postUrl );
		const jukebox = new JukeboxFrontend( page );
		await jukebox.waitForInit();

		const pageLink = jukebox.container.locator( '.jukebox__page-link' );

		// Go to track 3 (has pageLink)
		await jukebox.nextButton.click();
		await jukebox.nextButton.click();
		await expect( pageLink ).toBeVisible();

		// Go to track 1 (no pageLink)
		await jukebox.nextButton.click();
		await expect( pageLink ).toBeHidden();
	} );

	test( 'single track jukebox works', async ( { page, requestUtils } ) => {
		const tracks = [
			{ id: 'solo', title: 'Only Track', artist: 'Solo Artist', album: 'Solo Album', cover: '', url: '#track-1', pageLink: '' },
		];

		const post = await requestUtils.createPost( {
			title: 'Jukebox E2E - Single Track',
			content: jukeboxBlockContent( tracks ),
			status: 'publish',
		} );
		const postUrl = new URL( `/?p=${ post.id }`, process.env.WP_BASE_URL || 'http://localhost:57882' ).href;

		await page.goto( postUrl );
		const jukebox = new JukeboxFrontend( page );
		await jukebox.waitForInit();

		await expect( jukebox.title ).toHaveText( 'Only Track' );
		await expect( jukebox.tracks ).toHaveCount( 1 );

		// Prev/next should still work (wraps to same track)
		await jukebox.nextButton.click();
		await expect( jukebox.title ).toHaveText( 'Only Track' );

		await jukebox.prevButton.click();
		await expect( jukebox.title ).toHaveText( 'Only Track' );
	} );
} );

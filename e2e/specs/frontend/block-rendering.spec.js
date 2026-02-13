const { test, expect } = require( '../../fixtures' );
const { SAMPLE_TRACKS, jukeboxBlockContent } = require( '../../fixtures/test-data' );
const { JukeboxFrontend } = require( '../../fixtures/jukebox-frontend' );

test.describe( 'Block Rendering', () => {
	let postUrl;

	test.beforeAll( async ( { requestUtils } ) => {
		const post = await requestUtils.createPost( {
			title: 'Jukebox E2E - Block Rendering',
			content: jukeboxBlockContent(),
			status: 'publish',
		} );
		postUrl = new URL( `/?p=${ post.id }`, process.env.WP_BASE_URL || 'http://localhost:57882' ).href;
	} );

	test.afterAll( async ( { requestUtils } ) => {
		await requestUtils.deleteAllPosts();
	} );

	test( 'renders the jukebox container', async ( { page } ) => {
		await page.goto( postUrl );
		const jukebox = new JukeboxFrontend( page );

		await expect( jukebox.container ).toBeVisible();
		await expect( jukebox.container ).toHaveAttribute( 'role', 'region' );
		await expect( jukebox.container ).toHaveAttribute( 'tabindex', '0' );
	} );

	test( 'applies CSS custom properties from attributes', async ( { page } ) => {
		await page.goto( postUrl );
		const style = await page.locator( '.jukebox' ).getAttribute( 'style' );

		expect( style ).toContain( '--jukebox-bg: #1a1a2e' );
		expect( style ).toContain( '--jukebox-primary: #e94560' );
		expect( style ).toContain( '--jukebox-secondary: #16213e' );
		expect( style ).toContain( '--jukebox-text: #ffffff' );
	} );

	test( 'initializes the JavaScript player', async ( { page } ) => {
		await page.goto( postUrl );
		const jukebox = new JukeboxFrontend( page );

		await jukebox.waitForInit();
		await expect( jukebox.container ).toHaveClass( /jukebox--initialized/ );
	} );

	test( 'shows first track info on load', async ( { page } ) => {
		await page.goto( postUrl );
		const jukebox = new JukeboxFrontend( page );
		await jukebox.waitForInit();

		await expect( jukebox.title ).toHaveText( SAMPLE_TRACKS[ 0 ].title );
		await expect( jukebox.artist ).toHaveText( SAMPLE_TRACKS[ 0 ].artist );
	} );

	test( 'renders the tracklist with correct number of tracks', async ( { page } ) => {
		await page.goto( postUrl );
		const jukebox = new JukeboxFrontend( page );
		await jukebox.waitForInit();

		await expect( jukebox.tracks ).toHaveCount( SAMPLE_TRACKS.length );
	} );

	test( 'renders the filter input', async ( { page } ) => {
		await page.goto( postUrl );
		const jukebox = new JukeboxFrontend( page );
		await jukebox.waitForInit();

		await expect( jukebox.filterInput ).toBeVisible();
	} );

	test( 'renders all player controls', async ( { page } ) => {
		await page.goto( postUrl );
		const jukebox = new JukeboxFrontend( page );
		await jukebox.waitForInit();

		await expect( jukebox.playButton ).toBeVisible();
		await expect( jukebox.prevButton ).toBeVisible();
		await expect( jukebox.nextButton ).toBeVisible();
		await expect( jukebox.shuffleButton ).toBeVisible();
		await expect( jukebox.repeatButton ).toBeVisible();
		await expect( jukebox.volumeButton ).toBeVisible();
	} );

	test( 'first track is active by default', async ( { page } ) => {
		await page.goto( postUrl );
		const jukebox = new JukeboxFrontend( page );
		await jukebox.waitForInit();

		await expect( jukebox.activeTrack ).toHaveCount( 1 );
		await expect( jukebox.trackAt( 0 ) ).toHaveClass( /jukebox__track--active/ );
	} );
} );

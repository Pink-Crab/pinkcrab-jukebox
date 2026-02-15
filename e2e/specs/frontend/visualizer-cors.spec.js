const path = require( 'path' );
const { test, expect } = require( '../../fixtures' );
const { SAMPLE_TRACKS, jukeboxBlockContent } = require( '../../fixtures/test-data' );
const { JukeboxFrontend } = require( '../../fixtures/jukebox-frontend' );

const REMOTE_MP3_URL = 'https://raw.githubusercontent.com/Pink-Crab/pinkcrab-jukebox/develop/e2e/fixtures/sample.mp3';
const LOCAL_MP3_PATH = path.resolve( __dirname, '../../fixtures/sample.mp3' );

test.describe( 'Visualizer CORS', () => {
	test( 'remote audio disables visualizer button', async ( { page, requestUtils } ) => {
		const remoteTracks = SAMPLE_TRACKS.map( ( track ) => ( {
			...track,
			url: REMOTE_MP3_URL,
		} ) );

		const post = await requestUtils.createPost( {
			title: 'Jukebox E2E - Remote Audio',
			content: jukeboxBlockContent( remoteTracks ),
			status: 'publish',
		} );
		const postUrl = new URL( `/?p=${ post.id }`, process.env.WP_BASE_URL || 'http://localhost:57882' ).href;

		await page.goto( postUrl );
		const jukebox = new JukeboxFrontend( page );
		await jukebox.waitForInit();

		const vizToggle = jukebox.container.locator( '.jukebox__viz-toggle' );

		// Visualizer button should be disabled for cross-origin audio
		await expect( vizToggle ).toHaveClass( /jukebox__sidebar-btn--disabled/ );
		await expect( vizToggle ).toHaveAttribute( 'title', /cross-origin/ );

		await requestUtils.deleteAllPosts();
	} );

	test( 'same-origin audio enables visualizer button', async ( { page, requestUtils } ) => {
		// Upload real MP3 to WordPress media library so it has a same-origin URL
		const media = await requestUtils.uploadMedia( LOCAL_MP3_PATH );

		const localTracks = SAMPLE_TRACKS.map( ( track ) => ( {
			...track,
			url: media.source_url,
		} ) );

		const post = await requestUtils.createPost( {
			title: 'Jukebox E2E - Local Audio',
			content: jukeboxBlockContent( localTracks ),
			status: 'publish',
		} );
		const postUrl = new URL( `/?p=${ post.id }`, process.env.WP_BASE_URL || 'http://localhost:57882' ).href;

		await page.goto( postUrl );
		const jukebox = new JukeboxFrontend( page );
		await jukebox.waitForInit();

		const vizToggle = jukebox.container.locator( '.jukebox__viz-toggle' );

		// Visualizer button should NOT be disabled for same-origin audio
		await expect( vizToggle ).not.toHaveClass( /jukebox__sidebar-btn--disabled/ );

		await requestUtils.deleteAllPosts();
		await requestUtils.deleteAllMedia();
	} );

	test( 'visualizer stays off when toggled on remote audio', async ( { page, requestUtils } ) => {
		const remoteTracks = SAMPLE_TRACKS.map( ( track ) => ( {
			...track,
			url: REMOTE_MP3_URL,
		} ) );

		const post = await requestUtils.createPost( {
			title: 'Jukebox E2E - Remote Viz Toggle',
			content: jukeboxBlockContent( remoteTracks ),
			status: 'publish',
		} );
		const postUrl = new URL( `/?p=${ post.id }`, process.env.WP_BASE_URL || 'http://localhost:57882' ).href;

		await page.goto( postUrl );
		const jukebox = new JukeboxFrontend( page );
		await jukebox.waitForInit();

		const vizToggle = jukebox.container.locator( '.jukebox__viz-toggle' );
		await vizToggle.click( { force: true } );

		// Visualizer should remain off - button should not become active
		await expect( vizToggle ).not.toHaveClass( /jukebox__sidebar-btn--active/ );
		await expect( vizToggle ).toHaveAttribute( 'data-viz-mode', 'off' );

		await requestUtils.deleteAllPosts();
	} );

	test( 'same-origin audio allows visualizer to activate', async ( { page, requestUtils } ) => {
		// Upload real MP3 to WordPress media library
		const media = await requestUtils.uploadMedia( LOCAL_MP3_PATH );

		const localTracks = SAMPLE_TRACKS.map( ( track ) => ( {
			...track,
			url: media.source_url,
		} ) );

		const post = await requestUtils.createPost( {
			title: 'Jukebox E2E - Local Viz Toggle',
			content: jukeboxBlockContent( localTracks ),
			status: 'publish',
		} );
		const postUrl = new URL( `/?p=${ post.id }`, process.env.WP_BASE_URL || 'http://localhost:57882' ).href;

		await page.goto( postUrl );
		const jukebox = new JukeboxFrontend( page );
		await jukebox.waitForInit();

		const vizToggle = jukebox.container.locator( '.jukebox__viz-toggle' );

		// Click to cycle from 'off' to 'bars'
		await vizToggle.click( { force: true } );

		// Visualizer should activate - button becomes active and mode changes
		await expect( vizToggle ).toHaveClass( /jukebox__sidebar-btn--active/ );
		await expect( vizToggle ).not.toHaveAttribute( 'data-viz-mode', 'off' );

		await requestUtils.deleteAllPosts();
		await requestUtils.deleteAllMedia();
	} );
} );

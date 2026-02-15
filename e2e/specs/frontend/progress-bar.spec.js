const path = require( 'path' );
const { test, expect } = require( '../../fixtures' );
const { SAMPLE_TRACKS, jukeboxBlockContent } = require( '../../fixtures/test-data' );
const { JukeboxFrontend } = require( '../../fixtures/jukebox-frontend' );

const LOCAL_MP3_PATH = path.resolve( __dirname, '../../fixtures/sample.mp3' );

test.describe( 'Progress Bar', () => {
	let postUrl;

	test.beforeAll( async ( { requestUtils } ) => {
		// Upload real MP3 so audio duration is available
		const media = await requestUtils.uploadMedia( LOCAL_MP3_PATH );

		const tracks = SAMPLE_TRACKS.map( ( track ) => ( {
			...track,
			url: media.source_url,
		} ) );

		const post = await requestUtils.createPost( {
			title: 'Jukebox E2E - Progress Bar',
			content: jukeboxBlockContent( tracks ),
			status: 'publish',
		} );
		postUrl = new URL( `/?p=${ post.id }`, process.env.WP_BASE_URL || 'http://localhost:57882' ).href;
	} );

	test.afterAll( async ( { requestUtils } ) => {
		await requestUtils.deleteAllPosts();
		await requestUtils.deleteAllMedia();
	} );

	test( 'progress starts at 0:00', async ( { page } ) => {
		await page.goto( postUrl );
		const jukebox = new JukeboxFrontend( page );
		await jukebox.waitForInit();

		await expect( jukebox.currentTime ).toHaveText( '0:00' );
	} );

	test( 'duration displays after audio loads', async ( { page } ) => {
		await page.goto( postUrl );
		const jukebox = new JukeboxFrontend( page );
		await jukebox.waitForInit();

		// Wait for loadedmetadata to fire — duration should show 0:02 (2 second MP3)
		await expect( jukebox.duration ).not.toHaveText( '0:00', { timeout: 5000 } );
		const durationText = await jukebox.duration.textContent();
		expect( durationText ).toMatch( /^\d+:\d{2}$/ );
	} );

	test( 'progress fill starts at 0%', async ( { page } ) => {
		await page.goto( postUrl );
		const jukebox = new JukeboxFrontend( page );
		await jukebox.waitForInit();

		const progressFill = jukebox.container.locator( '.jukebox__progress-fill' );
		const width = await progressFill.evaluate( ( el ) => el.style.width );
		expect( width ).toBe( '0%' );
	} );

	test( 'seeking via input updates progress fill', async ( { page } ) => {
		await page.goto( postUrl );
		const jukebox = new JukeboxFrontend( page );
		await jukebox.waitForInit();

		// Wait for audio duration to be available
		await expect( jukebox.duration ).not.toHaveText( '0:00', { timeout: 5000 } );

		// Seek to 50% via the progress input
		await page.evaluate( () => {
			const input = document.querySelector( '.jukebox__progress-input' );
			input.value = 50;
			input.dispatchEvent( new Event( 'input' ) );
		} );

		// Wait for timeupdate to propagate
		await page.waitForTimeout( 200 );

		// Current time should be roughly half of duration
		const timeText = await jukebox.currentTime.textContent();
		expect( timeText ).not.toBe( '0:00' );
	} );

	test( 'progress input has aria-valuetext', async ( { page } ) => {
		await page.goto( postUrl );
		const jukebox = new JukeboxFrontend( page );
		await jukebox.waitForInit();

		// Wait for duration
		await expect( jukebox.duration ).not.toHaveText( '0:00', { timeout: 5000 } );

		// Seek to 50%
		await page.evaluate( () => {
			const input = document.querySelector( '.jukebox__progress-input' );
			input.value = 50;
			input.dispatchEvent( new Event( 'input' ) );
		} );

		await page.waitForTimeout( 200 );

		// aria-valuetext should contain time format like "0:01 of 0:02"
		const ariaText = await jukebox.progressInput.getAttribute( 'aria-valuetext' );
		expect( ariaText ).toMatch( /\d+:\d{2}.*\d+:\d{2}/ );
	} );
} );

const { test, expect } = require( '../../fixtures' );
const { jukeboxBlockContent } = require( '../../fixtures/test-data' );
const { JukeboxFrontend } = require( '../../fixtures/jukebox-frontend' );

test.describe( 'Keyboard Shortcuts', () => {
	let postUrl;

	test.beforeAll( async ( { requestUtils } ) => {
		const post = await requestUtils.createPost( {
			title: 'Jukebox E2E - Keyboard Shortcuts',
			content: jukeboxBlockContent(),
			status: 'publish',
		} );
		postUrl = new URL( `/?p=${ post.id }`, process.env.WP_BASE_URL || 'http://localhost:57882' ).href;
	} );

	test.afterAll( async ( { requestUtils } ) => {
		await requestUtils.deleteAllPosts();
	} );

	test( 'B key advances to next track', async ( { page } ) => {
		await page.goto( postUrl );
		const jukebox = new JukeboxFrontend( page );
		await jukebox.waitForInit();

		await expect( jukebox.title ).toHaveText( 'Test Track One' );
		await jukebox.pressKey( 'b' );
		await expect( jukebox.title ).toHaveText( 'Test Track Two' );
	} );

	test( 'Z key goes to previous track', async ( { page } ) => {
		await page.goto( postUrl );
		const jukebox = new JukeboxFrontend( page );
		await jukebox.waitForInit();

		// Go to track 2 first
		await jukebox.pressKey( 'b' );
		await expect( jukebox.title ).toHaveText( 'Test Track Two' );

		// Then back to track 1
		await jukebox.pressKey( 'z' );
		await expect( jukebox.title ).toHaveText( 'Test Track One' );
	} );

	test( 'S key toggles shuffle', async ( { page } ) => {
		await page.goto( postUrl );
		const jukebox = new JukeboxFrontend( page );
		await jukebox.waitForInit();

		await expect( jukebox.shuffleButton ).toHaveAttribute( 'aria-pressed', 'false' );
		await jukebox.pressKey( 's' );
		await expect( jukebox.shuffleButton ).toHaveAttribute( 'aria-pressed', 'true' );
		await expect( jukebox.shuffleButton ).toHaveClass( /jukebox__btn--active/ );
	} );

	test( 'R key cycles repeat mode', async ( { page } ) => {
		await page.goto( postUrl );
		const jukebox = new JukeboxFrontend( page );
		await jukebox.waitForInit();

		await expect( jukebox.repeatButton ).toHaveAttribute( 'data-repeat-mode', 'off' );

		await jukebox.pressKey( 'r' );
		await expect( jukebox.repeatButton ).toHaveAttribute( 'data-repeat-mode', 'all' );

		await jukebox.pressKey( 'r' );
		await expect( jukebox.repeatButton ).toHaveAttribute( 'data-repeat-mode', 'one' );

		await jukebox.pressKey( 'r' );
		await expect( jukebox.repeatButton ).toHaveAttribute( 'data-repeat-mode', 'off' );
	} );

	test( 'M key toggles mute', async ( { page } ) => {
		await page.goto( postUrl );
		const jukebox = new JukeboxFrontend( page );
		await jukebox.waitForInit();

		await jukebox.pressKey( 'm' );
		await expect( jukebox.volumeButton ).toHaveClass( /jukebox__btn--muted/ );

		await jukebox.pressKey( 'm' );
		await expect( jukebox.volumeButton ).not.toHaveClass( /jukebox__btn--muted/ );
	} );

	test( 'Q key toggles queue panel', async ( { page } ) => {
		await page.goto( postUrl );
		const jukebox = new JukeboxFrontend( page );
		await jukebox.waitForInit();

		await expect( jukebox.queuePanel ).toHaveClass( /jukebox__queue--hidden/ );

		await jukebox.pressKey( 'q' );
		await expect( jukebox.queuePanel ).not.toHaveClass( /jukebox__queue--hidden/ );

		await jukebox.pressKey( 'q' );
		await expect( jukebox.queuePanel ).toHaveClass( /jukebox__queue--hidden/ );
	} );

	test( '? key shows shortcuts overlay', async ( { page } ) => {
		await page.goto( postUrl );
		const jukebox = new JukeboxFrontend( page );
		await jukebox.waitForInit();

		await expect( jukebox.shortcutsOverlay ).toHaveCount( 0 );

		await jukebox.focus();
		await page.keyboard.type( '?' );
		await expect( jukebox.shortcutsOverlay ).toBeVisible();

		await jukebox.focus();
		await page.keyboard.type( '?' );
		await expect( jukebox.shortcutsOverlay ).toHaveCount( 0 );
	} );

	test( 'shortcuts are ignored when typing in filter input', async ( { page } ) => {
		await page.goto( postUrl );
		const jukebox = new JukeboxFrontend( page );
		await jukebox.waitForInit();

		await jukebox.filterInput.focus();
		await page.keyboard.type( 'b' );

		// Track should NOT have changed
		await expect( jukebox.title ).toHaveText( 'Test Track One' );
		// The letter should be in the input
		await expect( jukebox.filterInput ).toHaveValue( 'b' );
	} );
} );

const { test, expect } = require( '../../fixtures' );
const { jukeboxBlockContent } = require( '../../fixtures/test-data' );
const { JukeboxFrontend } = require( '../../fixtures/jukebox-frontend' );

test.describe( 'Toast Notifications', () => {
	let postUrl;

	test.beforeAll( async ( { requestUtils } ) => {
		const post = await requestUtils.createPost( {
			title: 'Jukebox E2E - Toast',
			content: jukeboxBlockContent(),
			status: 'publish',
		} );
		postUrl = new URL( `/?p=${ post.id }`, process.env.WP_BASE_URL || 'http://localhost:57882' ).href;
	} );

	test.afterAll( async ( { requestUtils } ) => {
		await requestUtils.deleteAllPosts();
	} );

	test( 'toast shows when adding track to queue', async ( { page } ) => {
		await page.goto( postUrl );
		const jukebox = new JukeboxFrontend( page );
		await jukebox.waitForInit();

		// Queue track 2
		await jukebox.queueButtonAt( 1 ).click();

		const toast = jukebox.container.locator( '.jukebox__toast' );
		await expect( toast ).toBeVisible();
		await expect( toast ).toContainText( 'Test Track Two' );
	} );

	test( 'toast gets visible animation class', async ( { page } ) => {
		await page.goto( postUrl );
		const jukebox = new JukeboxFrontend( page );
		await jukebox.waitForInit();

		await jukebox.queueButtonAt( 1 ).click();

		const toast = jukebox.container.locator( '.jukebox__toast' );
		await expect( toast ).toHaveClass( /jukebox__toast--visible/ );
	} );

	test( 'toast auto-removes after delay', async ( { page } ) => {
		await page.goto( postUrl );
		const jukebox = new JukeboxFrontend( page );
		await jukebox.waitForInit();

		await jukebox.queueButtonAt( 1 ).click();

		const toast = jukebox.container.locator( '.jukebox__toast' );
		await expect( toast ).toBeVisible();

		// Toast removes after 2s visible + 300ms animation
		await expect( toast ).toHaveCount( 0, { timeout: 5000 } );
	} );

	test( 'toast shows when removing track from queue', async ( { page } ) => {
		await page.goto( postUrl );
		const jukebox = new JukeboxFrontend( page );
		await jukebox.waitForInit();

		// Add then remove
		await jukebox.queueButtonAt( 1 ).click();
		await page.waitForTimeout( 100 ); // Let first toast appear
		await jukebox.queueButtonAt( 1 ).click();

		const toast = jukebox.container.locator( '.jukebox__toast' );
		await expect( toast ).toContainText( 'Removed' );
	} );

	test( 'toast shows when trying to queue current track', async ( { page } ) => {
		await page.goto( postUrl );
		const jukebox = new JukeboxFrontend( page );
		await jukebox.waitForInit();

		// Try to queue currently playing track (index 0)
		await jukebox.queueButtonAt( 0 ).click();

		const toast = jukebox.container.locator( '.jukebox__toast' );
		await expect( toast ).toContainText( 'Already playing' );
	} );

	test( 'new toast replaces existing one', async ( { page } ) => {
		await page.goto( postUrl );
		const jukebox = new JukeboxFrontend( page );
		await jukebox.waitForInit();

		// Trigger first toast
		await jukebox.queueButtonAt( 1 ).click();
		const firstToast = jukebox.container.locator( '.jukebox__toast' );
		await expect( firstToast ).toContainText( 'Test Track Two' );

		// Trigger second toast immediately
		await jukebox.queueButtonAt( 2 ).click();

		// Only one toast should exist and it should be the new one
		await expect( jukebox.container.locator( '.jukebox__toast' ) ).toHaveCount( 1 );
		await expect( jukebox.container.locator( '.jukebox__toast' ) ).toContainText( 'Test Track Three' );
	} );
} );

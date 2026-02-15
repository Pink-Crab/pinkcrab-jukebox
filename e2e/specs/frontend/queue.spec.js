const { test, expect } = require( '../../fixtures' );
const { jukeboxBlockContent } = require( '../../fixtures/test-data' );
const { JukeboxFrontend } = require( '../../fixtures/jukebox-frontend' );

test.describe( 'Queue', () => {
	let postUrl;

	test.beforeAll( async ( { requestUtils } ) => {
		const post = await requestUtils.createPost( {
			title: 'Jukebox E2E - Queue',
			content: jukeboxBlockContent(),
			status: 'publish',
		} );
		postUrl = new URL( `/?p=${ post.id }`, process.env.WP_BASE_URL || 'http://localhost:57882' ).href;
	} );

	test.afterAll( async ( { requestUtils } ) => {
		await requestUtils.deleteAllPosts();
	} );

	// Mock audio so play/next work with dummy URLs
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

	test( 'add track to queue updates button and count', async ( { page } ) => {
		await page.goto( postUrl );
		const jukebox = new JukeboxFrontend( page );
		await jukebox.waitForInit();

		// Queue track 2 (index 1)
		await jukebox.queueButtonAt( 1 ).click();

		// Button text should change to "Queued"
		const btnText = jukebox.trackAt( 1 ).locator( '.jukebox__track-btn-text' );
		await expect( btnText ).toHaveText( 'Queued' );

		// Queue button should have queued class
		await expect( jukebox.queueButtonAt( 1 ) ).toHaveClass( /jukebox__track-btn--queued/ );

		// Queue count badge should show 1
		await expect( jukebox.queueCount ).toHaveText( '1' );
	} );

	test( 'clicking queued track button removes from queue', async ( { page } ) => {
		await page.goto( postUrl );
		const jukebox = new JukeboxFrontend( page );
		await jukebox.waitForInit();

		// Add to queue
		await jukebox.queueButtonAt( 1 ).click();
		await expect( jukebox.queueCount ).toHaveText( '1' );

		// Click again to remove
		await jukebox.queueButtonAt( 1 ).click();
		await expect( jukebox.queueCount ).toHaveText( '0' );
		await expect( jukebox.queueButtonAt( 1 ) ).not.toHaveClass( /jukebox__track-btn--queued/ );
	} );

	test( 'cannot queue currently playing track', async ( { page } ) => {
		await page.goto( postUrl );
		const jukebox = new JukeboxFrontend( page );
		await jukebox.waitForInit();

		// Track 1 (index 0) is currently playing — try to queue it
		await jukebox.queueButtonAt( 0 ).click();

		// Count should remain 0
		await expect( jukebox.queueCount ).toHaveText( '0' );

		// Toast should show "Already playing" message
		const toast = jukebox.container.locator( '.jukebox__toast' );
		await expect( toast ).toBeVisible();
	} );

	test( 'queue panel toggle opens and closes', async ( { page } ) => {
		await page.goto( postUrl );
		const jukebox = new JukeboxFrontend( page );
		await jukebox.waitForInit();

		// Panel starts hidden
		await expect( jukebox.queuePanel ).toHaveClass( /jukebox__queue--hidden/ );

		// Open
		await jukebox.queueToggle.click();
		await expect( jukebox.queuePanel ).not.toHaveClass( /jukebox__queue--hidden/ );

		// Close
		await jukebox.queueToggle.click();
		await expect( jukebox.queuePanel ).toHaveClass( /jukebox__queue--hidden/ );
	} );

	test( 'queue items appear in panel', async ( { page } ) => {
		await page.goto( postUrl );
		const jukebox = new JukeboxFrontend( page );
		await jukebox.waitForInit();

		// Queue tracks 2 and 3
		await jukebox.queueButtonAt( 1 ).click();
		await jukebox.queueButtonAt( 2 ).click();

		// Open queue panel
		await jukebox.queueToggle.click();

		// Should show 2 queue items
		await expect( jukebox.queueItems ).toHaveCount( 2 );

		// Verify item titles
		const firstTitle = jukebox.queueItems.nth( 0 ).locator( '.jukebox__queue-item-title' );
		const secondTitle = jukebox.queueItems.nth( 1 ).locator( '.jukebox__queue-item-title' );
		await expect( firstTitle ).toHaveText( 'Test Track Two' );
		await expect( secondTitle ).toHaveText( 'Test Track Three' );
	} );

	test( 'remove button removes item from queue panel', async ( { page } ) => {
		await page.goto( postUrl );
		const jukebox = new JukeboxFrontend( page );
		await jukebox.waitForInit();

		// Queue track 2
		await jukebox.queueButtonAt( 1 ).click();
		await expect( jukebox.queueCount ).toHaveText( '1' );

		// Open queue panel and remove
		await jukebox.queueToggle.click();
		const removeBtn = jukebox.queueItems.nth( 0 ).locator( '.jukebox__queue-item-remove' );
		await removeBtn.click();

		await expect( jukebox.queueItems ).toHaveCount( 0 );
		await expect( jukebox.queueCount ).toHaveText( '0' );
	} );

	test( 'clear button empties the queue', async ( { page } ) => {
		await page.goto( postUrl );
		const jukebox = new JukeboxFrontend( page );
		await jukebox.waitForInit();

		// Queue tracks 2 and 3
		await jukebox.queueButtonAt( 1 ).click();
		await jukebox.queueButtonAt( 2 ).click();
		await expect( jukebox.queueCount ).toHaveText( '2' );

		// Open panel and clear
		await jukebox.queueToggle.click();
		await jukebox.queueClearButton.click();

		await expect( jukebox.queueItems ).toHaveCount( 0 );
		await expect( jukebox.queueCount ).toHaveText( '0' );
	} );

	test( 'next plays queued track before sequential next', async ( { page } ) => {
		await page.goto( postUrl );
		const jukebox = new JukeboxFrontend( page );
		await jukebox.waitForInit();

		// Currently on track 1 — queue track 3 (index 2)
		await jukebox.queueButtonAt( 2 ).click();
		await expect( jukebox.queueCount ).toHaveText( '1' );

		// Press next — should play queued track 3, not sequential track 2
		await jukebox.nextButton.click();
		await expect( jukebox.title ).toHaveText( 'Test Track Three' );

		// Queue should now be empty
		await expect( jukebox.queueCount ).toHaveText( '0' );
	} );

	test( 'click outside closes queue panel', async ( { page } ) => {
		await page.goto( postUrl );
		const jukebox = new JukeboxFrontend( page );
		await jukebox.waitForInit();

		// Open queue panel
		await jukebox.queueToggle.click();
		await expect( jukebox.queuePanel ).not.toHaveClass( /jukebox__queue--hidden/ );

		// Click outside the queue panel (on the page body)
		await page.locator( 'body' ).click( { position: { x: 10, y: 10 } } );
		await expect( jukebox.queuePanel ).toHaveClass( /jukebox__queue--hidden/ );
	} );

	test( 'Escape key closes queue panel', async ( { page } ) => {
		await page.goto( postUrl );
		const jukebox = new JukeboxFrontend( page );
		await jukebox.waitForInit();

		// Open queue panel
		await jukebox.queueToggle.click();
		await expect( jukebox.queuePanel ).not.toHaveClass( /jukebox__queue--hidden/ );

		// Wait for escape listener registered in setTimeout(0)
		await page.waitForTimeout( 50 );
		await page.keyboard.press( 'Escape' );
		await expect( jukebox.queuePanel ).toHaveClass( /jukebox__queue--hidden/ );
	} );
} );

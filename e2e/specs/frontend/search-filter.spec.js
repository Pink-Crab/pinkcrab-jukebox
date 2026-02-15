const { test, expect } = require( '../../fixtures' );
const { jukeboxBlockContent } = require( '../../fixtures/test-data' );
const { JukeboxFrontend } = require( '../../fixtures/jukebox-frontend' );

test.describe( 'Search & Filter', () => {
	let postUrl;

	test.beforeAll( async ( { requestUtils } ) => {
		const post = await requestUtils.createPost( {
			title: 'Jukebox E2E - Search Filter',
			content: jukeboxBlockContent(),
			status: 'publish',
		} );
		postUrl = new URL( `/?p=${ post.id }`, process.env.WP_BASE_URL || 'http://localhost:57882' ).href;
	} );

	test.afterAll( async ( { requestUtils } ) => {
		await requestUtils.deleteAllPosts();
	} );

	test( 'text filter hides non-matching tracks', async ( { page } ) => {
		await page.goto( postUrl );
		const jukebox = new JukeboxFrontend( page );
		await jukebox.waitForInit();

		// All 3 tracks visible initially
		await expect( jukebox.tracks ).toHaveCount( 3 );

		// Type to filter — "Two" should match only track 2
		await jukebox.filterInput.fill( 'Two' );

		// Track 2 should be visible, others hidden
		await expect( jukebox.trackAt( 0 ) ).toBeHidden();
		await expect( jukebox.trackAt( 1 ) ).toBeVisible();
		await expect( jukebox.trackAt( 2 ) ).toBeHidden();
	} );

	test( 'text filter is case-insensitive', async ( { page } ) => {
		await page.goto( postUrl );
		const jukebox = new JukeboxFrontend( page );
		await jukebox.waitForInit();

		await jukebox.filterInput.fill( 'artist b' );

		// Only track 2 has "Test Artist B"
		await expect( jukebox.trackAt( 0 ) ).toBeHidden();
		await expect( jukebox.trackAt( 1 ) ).toBeVisible();
		await expect( jukebox.trackAt( 2 ) ).toBeHidden();
	} );

	test( 'track count updates when filtering', async ( { page } ) => {
		await page.goto( postUrl );
		const jukebox = new JukeboxFrontend( page );
		await jukebox.waitForInit();

		await expect( jukebox.tracklistCount ).toHaveText( '3' );

		await jukebox.filterInput.fill( 'Alpha' );
		// Tracks 1 and 3 have "Test Album Alpha"
		await expect( jukebox.tracklistCount ).toHaveText( '2' );

		await jukebox.filterInput.fill( 'nonexistent' );
		await expect( jukebox.tracklistCount ).toHaveText( '0' );
	} );

	test( 'clicking artist name filters by that artist', async ( { page } ) => {
		await page.goto( postUrl );
		const jukebox = new JukeboxFrontend( page );
		await jukebox.waitForInit();

		// The artist element is a filter link button
		const artistLink = jukebox.container.locator( 'button.jukebox__artist.jukebox__filter-link' );
		// Initially shows "Test Artist A" (first track's artist)
		await expect( artistLink ).toHaveText( 'Test Artist A' );

		await artistLink.click();

		// Only tracks by "Test Artist A" should be visible (tracks 1 and 3)
		await expect( jukebox.trackAt( 0 ) ).toBeVisible();
		await expect( jukebox.trackAt( 1 ) ).toBeHidden();
		await expect( jukebox.trackAt( 2 ) ).toBeVisible();
		await expect( jukebox.tracklistCount ).toHaveText( '2' );
	} );

	test( 'filter active bar shows when artist filter active', async ( { page } ) => {
		await page.goto( postUrl );
		const jukebox = new JukeboxFrontend( page );
		await jukebox.waitForInit();

		// Active bar should not be visible initially
		await expect( jukebox.filterActiveBar ).not.toHaveClass( /is-visible/ );

		// Click artist link
		const artistLink = jukebox.container.locator( 'button.jukebox__artist.jukebox__filter-link' );
		await artistLink.click();

		// Active bar should appear with artist label
		await expect( jukebox.filterActiveBar ).toHaveClass( /is-visible/ );
		const activeValue = jukebox.container.locator( '.jukebox__filter-active-value' );
		await expect( activeValue ).toContainText( 'Test Artist A' );
	} );

	test( 'clicking album name filters by that album', async ( { page } ) => {
		await page.goto( postUrl );
		const jukebox = new JukeboxFrontend( page );
		await jukebox.waitForInit();

		const albumLink = jukebox.container.locator( 'button.jukebox__album.jukebox__filter-link' );
		// Initially shows "Test Album Alpha"
		await expect( albumLink ).toHaveText( 'Test Album Alpha' );

		await albumLink.click();

		// Only tracks with "Test Album Alpha" should be visible (tracks 1 and 3)
		await expect( jukebox.trackAt( 0 ) ).toBeVisible();
		await expect( jukebox.trackAt( 1 ) ).toBeHidden();
		await expect( jukebox.trackAt( 2 ) ).toBeVisible();
	} );

	test( 'clear filter restores all tracks', async ( { page } ) => {
		await page.goto( postUrl );
		const jukebox = new JukeboxFrontend( page );
		await jukebox.waitForInit();

		// Apply artist filter
		const artistLink = jukebox.container.locator( 'button.jukebox__artist.jukebox__filter-link' );
		await artistLink.click();
		await expect( jukebox.tracklistCount ).toHaveText( '2' );

		// Clear filter
		await jukebox.filterClearButton.click();

		// All tracks visible again
		await expect( jukebox.trackAt( 0 ) ).toBeVisible();
		await expect( jukebox.trackAt( 1 ) ).toBeVisible();
		await expect( jukebox.trackAt( 2 ) ).toBeVisible();
		await expect( jukebox.tracklistCount ).toHaveText( '3' );
		await expect( jukebox.filterActiveBar ).not.toHaveClass( /is-visible/ );
	} );

	test( 'typing in filter clears active artist filter', async ( { page } ) => {
		await page.goto( postUrl );
		const jukebox = new JukeboxFrontend( page );
		await jukebox.waitForInit();

		// Set artist filter
		const artistLink = jukebox.container.locator( 'button.jukebox__artist.jukebox__filter-link' );
		await artistLink.click();
		await expect( jukebox.filterActiveBar ).toHaveClass( /is-visible/ );

		// Start typing in filter input — should clear active filter
		await jukebox.filterInput.fill( 'Two' );
		await expect( jukebox.filterActiveBar ).not.toHaveClass( /is-visible/ );
	} );

	test( 'clearing text filter shows all tracks', async ( { page } ) => {
		await page.goto( postUrl );
		const jukebox = new JukeboxFrontend( page );
		await jukebox.waitForInit();

		await jukebox.filterInput.fill( 'Two' );
		await expect( jukebox.tracklistCount ).toHaveText( '1' );

		await jukebox.filterInput.fill( '' );
		await expect( jukebox.tracklistCount ).toHaveText( '3' );
	} );
} );

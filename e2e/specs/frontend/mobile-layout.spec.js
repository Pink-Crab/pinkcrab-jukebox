const { test, expect } = require( '../../fixtures' );
const { jukeboxBlockContent } = require( '../../fixtures/test-data' );
const { JukeboxFrontend } = require( '../../fixtures/jukebox-frontend' );

test.describe( 'Mobile Layout', () => {
	let postUrl;

	test.beforeAll( async ( { requestUtils } ) => {
		const post = await requestUtils.createPost( {
			title: 'Jukebox E2E - Mobile Layout',
			content: jukeboxBlockContent(),
			status: 'publish',
		} );
		postUrl = new URL( `/?p=${ post.id }`, process.env.WP_BASE_URL || 'http://localhost:57882' ).href;
	} );

	test.afterAll( async ( { requestUtils } ) => {
		await requestUtils.deleteAllPosts();
	} );

	test( 'sidebar is vertical on desktop', async ( { page } ) => {
		await page.setViewportSize( { width: 1024, height: 768 } );
		await page.goto( postUrl );
		const jukebox = new JukeboxFrontend( page );
		await jukebox.waitForInit();

		const sidebar = jukebox.container.locator( '.jukebox__sidebar' );
		const flexDirection = await sidebar.evaluate( ( el ) => {
			return getComputedStyle( el ).flexDirection;
		} );
		expect( flexDirection ).toBe( 'column' );
	} );

	test( 'sidebar moves to horizontal on mobile', async ( { page } ) => {
		await page.setViewportSize( { width: 375, height: 667 } );
		await page.goto( postUrl );
		const jukebox = new JukeboxFrontend( page );
		await jukebox.waitForInit();

		const sidebar = jukebox.container.locator( '.jukebox__sidebar' );
		const flexDirection = await sidebar.evaluate( ( el ) => {
			return getComputedStyle( el ).flexDirection;
		} );
		expect( flexDirection ).toBe( 'row' );
	} );

	test( 'sidebar spans full width on mobile', async ( { page } ) => {
		await page.setViewportSize( { width: 375, height: 667 } );
		await page.goto( postUrl );
		const jukebox = new JukeboxFrontend( page );
		await jukebox.waitForInit();

		const sidebar = jukebox.container.locator( '.jukebox__sidebar' );
		const position = await sidebar.evaluate( ( el ) => {
			const styles = getComputedStyle( el );
			return {
				left: styles.left,
				right: styles.right,
			};
		} );
		expect( position.left ).toBe( '8px' );
		expect( position.right ).toBe( '8px' );
	} );

	test( 'controls are smaller on mobile', async ( { page } ) => {
		await page.setViewportSize( { width: 375, height: 667 } );
		await page.goto( postUrl );
		const jukebox = new JukeboxFrontend( page );
		await jukebox.waitForInit();

		const btnSize = await jukebox.playButton.evaluate( ( el ) => {
			const styles = getComputedStyle( el );
			return { width: styles.width, height: styles.height };
		} );

		// Mobile play button should be 52x52
		expect( parseInt( btnSize.width ) ).toBe( 52 );
		expect( parseInt( btnSize.height ) ).toBe( 52 );
	} );
} );

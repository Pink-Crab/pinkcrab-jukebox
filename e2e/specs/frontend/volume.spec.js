const { test, expect } = require( '../../fixtures' );
const { jukeboxBlockContent } = require( '../../fixtures/test-data' );
const { JukeboxFrontend } = require( '../../fixtures/jukebox-frontend' );

test.describe( 'Volume', () => {
	let postUrl;

	test.beforeAll( async ( { requestUtils } ) => {
		const post = await requestUtils.createPost( {
			title: 'Jukebox E2E - Volume',
			content: jukeboxBlockContent(),
			status: 'publish',
		} );
		postUrl = new URL( `/?p=${ post.id }`, process.env.WP_BASE_URL || 'http://localhost:57882' ).href;
	} );

	test.afterAll( async ( { requestUtils } ) => {
		await requestUtils.deleteAllPosts();
	} );

	test( 'default volume is 80%', async ( { page } ) => {
		await page.goto( postUrl );
		const jukebox = new JukeboxFrontend( page );
		await jukebox.waitForInit();

		const volumeFill = jukebox.container.locator( '.jukebox__volume-fill' );
		const width = await volumeFill.evaluate( ( el ) => el.style.width );
		expect( width ).toBe( '80%' );

		await expect( jukebox.volumeSlider ).toHaveValue( '80' );
	} );

	test( 'volume slider changes fill width', async ( { page } ) => {
		await page.goto( postUrl );
		const jukebox = new JukeboxFrontend( page );
		await jukebox.waitForInit();

		// Set volume to 50% via the input
		await jukebox.volumeSlider.fill( '50' );
		await jukebox.volumeSlider.dispatchEvent( 'input' );

		const volumeFill = jukebox.container.locator( '.jukebox__volume-fill' );
		const width = await volumeFill.evaluate( ( el ) => el.style.width );
		expect( width ).toBe( '50%' );
	} );

	test( 'mute button toggles muted class', async ( { page } ) => {
		await page.goto( postUrl );
		const jukebox = new JukeboxFrontend( page );
		await jukebox.waitForInit();

		// Not muted initially
		await expect( jukebox.volumeButton ).not.toHaveClass( /jukebox__btn--muted/ );

		// Mute
		await jukebox.volumeButton.click();
		await expect( jukebox.volumeButton ).toHaveClass( /jukebox__btn--muted/ );

		// Unmute
		await jukebox.volumeButton.click();
		await expect( jukebox.volumeButton ).not.toHaveClass( /jukebox__btn--muted/ );
	} );

	test( 'muted state shows 0% fill', async ( { page } ) => {
		await page.goto( postUrl );
		const jukebox = new JukeboxFrontend( page );
		await jukebox.waitForInit();

		const volumeFill = jukebox.container.locator( '.jukebox__volume-fill' );

		// Mute
		await jukebox.volumeButton.click();

		const width = await volumeFill.evaluate( ( el ) => el.style.width );
		expect( width ).toBe( '0%' );

		await expect( jukebox.volumeSlider ).toHaveValue( '0' );
	} );

	test( 'unmute restores previous volume', async ( { page } ) => {
		await page.goto( postUrl );
		const jukebox = new JukeboxFrontend( page );
		await jukebox.waitForInit();

		const volumeFill = jukebox.container.locator( '.jukebox__volume-fill' );

		// Default is 80%
		let width = await volumeFill.evaluate( ( el ) => el.style.width );
		expect( width ).toBe( '80%' );

		// Mute then unmute
		await jukebox.volumeButton.click();
		await expect( jukebox.volumeButton ).toHaveClass( /jukebox__btn--muted/ );

		await jukebox.volumeButton.click();
		await expect( jukebox.volumeButton ).not.toHaveClass( /jukebox__btn--muted/ );

		// Volume fill should be back at 80%
		width = await volumeFill.evaluate( ( el ) => el.style.width );
		expect( width ).toBe( '80%' );
	} );

	test( 'volume slider aria-valuetext shows percentage', async ( { page } ) => {
		await page.goto( postUrl );
		const jukebox = new JukeboxFrontend( page );
		await jukebox.waitForInit();

		await expect( jukebox.volumeSlider ).toHaveAttribute( 'aria-valuetext', '80%' );

		// Change volume
		await jukebox.volumeSlider.fill( '30' );
		await jukebox.volumeSlider.dispatchEvent( 'input' );

		await expect( jukebox.volumeSlider ).toHaveAttribute( 'aria-valuetext', '30%' );
	} );
} );

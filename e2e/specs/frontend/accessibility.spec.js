const { test, expect } = require( '../../fixtures' );
const { jukeboxBlockContent } = require( '../../fixtures/test-data' );
const { JukeboxFrontend } = require( '../../fixtures/jukebox-frontend' );

test.describe( 'Accessibility', () => {
	let postUrl;

	test.beforeAll( async ( { requestUtils } ) => {
		const post = await requestUtils.createPost( {
			title: 'Jukebox E2E - Accessibility',
			content: jukeboxBlockContent(),
			status: 'publish',
		} );
		postUrl = new URL( `/?p=${ post.id }`, process.env.WP_BASE_URL || 'http://localhost:57882' ).href;
	} );

	test.afterAll( async ( { requestUtils } ) => {
		await requestUtils.deleteAllPosts();
	} );

	// Mock audio for play state tests
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

	test( 'container has region role and aria-label', async ( { page } ) => {
		await page.goto( postUrl );
		const jukebox = new JukeboxFrontend( page );
		await jukebox.waitForInit();

		await expect( jukebox.container ).toHaveAttribute( 'role', 'region' );
		await expect( jukebox.container ).toHaveAttribute( 'aria-label', /jukebox/i );
	} );

	test( 'container has tabindex for keyboard focus', async ( { page } ) => {
		await page.goto( postUrl );
		const jukebox = new JukeboxFrontend( page );
		await jukebox.waitForInit();

		await expect( jukebox.container ).toHaveAttribute( 'tabindex', '0' );
	} );

	test( 'play button aria-label updates on state change', async ( { page } ) => {
		await page.goto( postUrl );
		const jukebox = new JukeboxFrontend( page );
		await jukebox.waitForInit();

		await expect( jukebox.playButton ).toHaveAttribute( 'aria-label', /Play/i );

		await jukebox.playButton.click();
		await expect( jukebox.playButton ).toHaveAttribute( 'aria-label', /Pause/i );

		await jukebox.playButton.click();
		await expect( jukebox.playButton ).toHaveAttribute( 'aria-label', /Play/i );
	} );

	test( 'shuffle button has aria-pressed attribute', async ( { page } ) => {
		await page.goto( postUrl );
		const jukebox = new JukeboxFrontend( page );
		await jukebox.waitForInit();

		await expect( jukebox.shuffleButton ).toHaveAttribute( 'aria-pressed', 'false' );

		await jukebox.shuffleButton.click();
		await expect( jukebox.shuffleButton ).toHaveAttribute( 'aria-pressed', 'true' );

		await jukebox.shuffleButton.click();
		await expect( jukebox.shuffleButton ).toHaveAttribute( 'aria-pressed', 'false' );
	} );

	test( 'queue toggle has aria-expanded attribute', async ( { page } ) => {
		await page.goto( postUrl );
		const jukebox = new JukeboxFrontend( page );
		await jukebox.waitForInit();

		await expect( jukebox.queueToggle ).toHaveAttribute( 'aria-expanded', 'false' );

		await jukebox.queueToggle.click();
		await expect( jukebox.queueToggle ).toHaveAttribute( 'aria-expanded', 'true' );

		await jukebox.queueToggle.click();
		await expect( jukebox.queueToggle ).toHaveAttribute( 'aria-expanded', 'false' );
	} );

	test( 'tracklist has list role', async ( { page } ) => {
		await page.goto( postUrl );
		const jukebox = new JukeboxFrontend( page );
		await jukebox.waitForInit();

		const trackList = jukebox.container.locator( '.jukebox__tracks' );
		await expect( trackList ).toHaveAttribute( 'role', 'list' );
	} );

	test( 'track items have listitem role and tabindex', async ( { page } ) => {
		await page.goto( postUrl );
		const jukebox = new JukeboxFrontend( page );
		await jukebox.waitForInit();

		const track = jukebox.trackAt( 0 );
		await expect( track ).toHaveAttribute( 'role', 'listitem' );
		await expect( track ).toHaveAttribute( 'tabindex', '0' );
	} );

	test( 'screen reader live region exists', async ( { page } ) => {
		await page.goto( postUrl );
		const jukebox = new JukeboxFrontend( page );
		await jukebox.waitForInit();

		await expect( jukebox.srAnnounce ).toHaveAttribute( 'aria-live', 'polite' );
		await expect( jukebox.srAnnounce ).toHaveAttribute( 'aria-atomic', 'true' );
	} );

	test( 'track change announces to screen reader', async ( { page } ) => {
		await page.goto( postUrl );
		const jukebox = new JukeboxFrontend( page );
		await jukebox.waitForInit();

		await jukebox.nextButton.click();

		// Wait for rAF in announce()
		await page.waitForTimeout( 100 );
		const announcement = await jukebox.getAnnouncement();
		expect( announcement ).toMatch( /Now playing.*Test Track Two/i );
	} );

	test( 'shuffle toggle announces to screen reader', async ( { page } ) => {
		await page.goto( postUrl );
		const jukebox = new JukeboxFrontend( page );
		await jukebox.waitForInit();

		await jukebox.shuffleButton.click();
		await page.waitForTimeout( 100 );
		const onAnnouncement = await jukebox.getAnnouncement();
		expect( onAnnouncement ).toMatch( /shuffle on/i );

		await jukebox.shuffleButton.click();
		await page.waitForTimeout( 100 );
		const offAnnouncement = await jukebox.getAnnouncement();
		expect( offAnnouncement ).toMatch( /shuffle off/i );
	} );

	test( 'all control buttons have aria-labels', async ( { page } ) => {
		await page.goto( postUrl );
		const jukebox = new JukeboxFrontend( page );
		await jukebox.waitForInit();

		await expect( jukebox.playButton ).toHaveAttribute( 'aria-label' );
		await expect( jukebox.prevButton ).toHaveAttribute( 'aria-label' );
		await expect( jukebox.nextButton ).toHaveAttribute( 'aria-label' );
		await expect( jukebox.shuffleButton ).toHaveAttribute( 'aria-label' );
		await expect( jukebox.repeatButton ).toHaveAttribute( 'aria-label' );
		await expect( jukebox.volumeButton ).toHaveAttribute( 'aria-label' );
	} );
} );

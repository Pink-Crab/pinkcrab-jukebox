const { test, expect } = require( '../../fixtures' );
const { SAMPLE_TRACKS, jukeboxBlockContent } = require( '../../fixtures/test-data' );
const { JukeboxFrontend } = require( '../../fixtures/jukebox-frontend' );

// Tracks with artwork on first, none on second
const TRACKS_WITH_COVERS = [
	{ ...SAMPLE_TRACKS[ 0 ], cover: 'https://example.com/cover1.jpg' },
	{ ...SAMPLE_TRACKS[ 1 ], cover: '' },
	{ ...SAMPLE_TRACKS[ 2 ], cover: 'https://example.com/cover3.jpg' },
];

test.describe( 'Artwork', () => {
	let postWithCovers;
	let postWithoutCovers;

	test.beforeAll( async ( { requestUtils } ) => {
		const postA = await requestUtils.createPost( {
			title: 'Jukebox E2E - Artwork With Covers',
			content: jukeboxBlockContent( TRACKS_WITH_COVERS ),
			status: 'publish',
		} );
		postWithCovers = new URL( `/?p=${ postA.id }`, process.env.WP_BASE_URL || 'http://localhost:57882' ).href;

		// All tracks without covers (default SAMPLE_TRACKS have cover: '')
		const postB = await requestUtils.createPost( {
			title: 'Jukebox E2E - Artwork No Covers',
			content: jukeboxBlockContent(),
			status: 'publish',
		} );
		postWithoutCovers = new URL( `/?p=${ postB.id }`, process.env.WP_BASE_URL || 'http://localhost:57882' ).href;
	} );

	test.afterAll( async ( { requestUtils } ) => {
		await requestUtils.deleteAllPosts();
	} );

	// Mock audio for track navigation
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

	test( 'artwork image shown when track has cover', async ( { page } ) => {
		await page.goto( postWithCovers );
		const jukebox = new JukeboxFrontend( page );
		await jukebox.waitForInit();

		const artworkImg = jukebox.container.locator( '.jukebox__artwork-img' );
		const placeholder = jukebox.container.locator( '.jukebox__artwork-placeholder' );

		// First track has a cover
		const imgDisplay = await artworkImg.evaluate( ( el ) => el.style.display );
		expect( imgDisplay ).toBe( 'block' );

		const placeholderDisplay = await placeholder.evaluate( ( el ) => el.style.display );
		expect( placeholderDisplay ).toBe( 'none' );
	} );

	test( 'placeholder shown when track has no cover', async ( { page } ) => {
		await page.goto( postWithoutCovers );
		const jukebox = new JukeboxFrontend( page );
		await jukebox.waitForInit();

		const artworkImg = jukebox.container.locator( '.jukebox__artwork-img' );
		const placeholder = jukebox.container.locator( '.jukebox__artwork-placeholder' );

		const imgDisplay = await artworkImg.evaluate( ( el ) => el.style.display );
		expect( imgDisplay ).toBe( 'none' );

		const placeholderDisplay = await placeholder.evaluate( ( el ) => el.style.display );
		expect( placeholderDisplay ).toBe( 'flex' );
	} );

	test( 'artwork toggle hides and shows artwork', async ( { page } ) => {
		await page.goto( postWithCovers );
		const jukebox = new JukeboxFrontend( page );
		await jukebox.waitForInit();

		const artworkToggle = jukebox.container.locator( '.jukebox__artwork-toggle' );
		const artwork = jukebox.container.locator( '.jukebox__artwork' );

		// Artwork visible initially
		await expect( artwork ).not.toHaveClass( /jukebox__artwork--hidden/ );
		await expect( artworkToggle ).toHaveAttribute( 'aria-pressed', 'true' );

		// Click to hide
		await artworkToggle.click();
		await expect( artwork ).toHaveClass( /jukebox__artwork--hidden/ );
		await expect( artworkToggle ).toHaveAttribute( 'aria-pressed', 'false' );
		await expect( artworkToggle ).not.toHaveClass( /jukebox__sidebar-btn--active/ );

		// Click to show again
		await artworkToggle.click();
		await expect( artwork ).not.toHaveClass( /jukebox__artwork--hidden/ );
		await expect( artworkToggle ).toHaveAttribute( 'aria-pressed', 'true' );
		await expect( artworkToggle ).toHaveClass( /jukebox__sidebar-btn--active/ );
	} );

	test( 'artwork toggle disabled when track has no cover', async ( { page } ) => {
		await page.goto( postWithoutCovers );
		const jukebox = new JukeboxFrontend( page );
		await jukebox.waitForInit();

		const artworkToggle = jukebox.container.locator( '.jukebox__artwork-toggle' );

		await expect( artworkToggle ).toBeDisabled();
		await expect( artworkToggle ).toHaveClass( /jukebox__sidebar-btn--disabled/ );
		await expect( artworkToggle ).toHaveAttribute( 'title', /No artwork available/ );
	} );

	test( 'artwork toggle enables when switching to track with cover', async ( { page } ) => {
		await page.goto( postWithCovers );
		const jukebox = new JukeboxFrontend( page );
		await jukebox.waitForInit();

		const artworkToggle = jukebox.container.locator( '.jukebox__artwork-toggle' );

		// Track 1 has cover — button should be enabled
		await expect( artworkToggle ).not.toBeDisabled();

		// Navigate to track 2 (no cover)
		await jukebox.nextButton.click();
		await expect( artworkToggle ).toBeDisabled();
		await expect( artworkToggle ).toHaveClass( /jukebox__sidebar-btn--disabled/ );

		// Navigate to track 3 (has cover)
		await jukebox.nextButton.click();
		await expect( artworkToggle ).not.toBeDisabled();
		await expect( artworkToggle ).not.toHaveClass( /jukebox__sidebar-btn--disabled/ );
	} );

	test( 'switching tracks updates artwork image', async ( { page } ) => {
		await page.goto( postWithCovers );
		const jukebox = new JukeboxFrontend( page );
		await jukebox.waitForInit();

		const artworkImg = jukebox.container.locator( '.jukebox__artwork-img' );
		const placeholder = jukebox.container.locator( '.jukebox__artwork-placeholder' );

		// Track 1 has cover
		await expect( artworkImg ).toHaveAttribute( 'src', /cover1\.jpg/ );

		// Navigate to track 2 (no cover) — placeholder should show
		await jukebox.nextButton.click();
		const placeholderDisplay = await placeholder.evaluate( ( el ) => el.style.display );
		expect( placeholderDisplay ).toBe( 'flex' );

		// Navigate to track 3 (has cover) — image should show
		await jukebox.nextButton.click();
		await expect( artworkImg ).toHaveAttribute( 'src', /cover3\.jpg/ );
		const imgDisplay = await artworkImg.evaluate( ( el ) => el.style.display );
		expect( imgDisplay ).toBe( 'block' );
	} );
} );

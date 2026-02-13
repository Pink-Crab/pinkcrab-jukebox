const { test, expect } = require( '../../fixtures' );
const { SAMPLE_TRACKS, jukeboxBlockContent } = require( '../../fixtures/test-data' );
const { JukeboxFrontend } = require( '../../fixtures/jukebox-frontend' );

test.describe( 'Color Attributes', () => {
	test( 'default colors are applied as CSS custom properties', async ( { page, requestUtils } ) => {
		const post = await requestUtils.createPost( {
			title: 'Jukebox E2E - Default Colors',
			content: jukeboxBlockContent(),
			status: 'publish',
		} );
		const postUrl = new URL( `/?p=${ post.id }`, process.env.WP_BASE_URL || 'http://localhost:57882' ).href;

		await page.goto( postUrl );
		const jukebox = new JukeboxFrontend( page );
		await jukebox.waitForInit();

		const style = await jukebox.container.getAttribute( 'style' );
		expect( style ).toContain( '--jukebox-bg: #1a1a2e' );
		expect( style ).toContain( '--jukebox-primary: #e94560' );
		expect( style ).toContain( '--jukebox-secondary: #16213e' );
		expect( style ).toContain( '--jukebox-text: #ffffff' );
		expect( style ).toContain( '--jukebox-text-muted: #a0a0a0' );
		expect( style ).toContain( '--jukebox-progress-bg: #2d2d44' );
		expect( style ).toContain( '--jukebox-control-hover: #ff6b6b' );

		await requestUtils.deleteAllPosts();
	} );

	test( 'custom colors are reflected in the block', async ( { page, requestUtils } ) => {
		const customColors = {
			backgroundColor: '#ff0000',
			primaryColor: '#00ff00',
			secondaryColor: '#0000ff',
			textColor: '#111111',
			textMutedColor: '#222222',
			progressBackground: '#333333',
			controlHoverColor: '#444444',
		};

		const post = await requestUtils.createPost( {
			title: 'Jukebox E2E - Custom Colors',
			content: jukeboxBlockContent( SAMPLE_TRACKS, customColors ),
			status: 'publish',
		} );
		const postUrl = new URL( `/?p=${ post.id }`, process.env.WP_BASE_URL || 'http://localhost:57882' ).href;

		await page.goto( postUrl );
		const jukebox = new JukeboxFrontend( page );
		await jukebox.waitForInit();

		const style = await jukebox.container.getAttribute( 'style' );
		expect( style ).toContain( '--jukebox-bg: #ff0000' );
		expect( style ).toContain( '--jukebox-primary: #00ff00' );
		expect( style ).toContain( '--jukebox-secondary: #0000ff' );
		expect( style ).toContain( '--jukebox-text: #111111' );
		expect( style ).toContain( '--jukebox-text-muted: #222222' );
		expect( style ).toContain( '--jukebox-progress-bg: #333333' );
		expect( style ).toContain( '--jukebox-control-hover: #444444' );

		await requestUtils.deleteAllPosts();
	} );

	test( 'custom colors affect computed styles', async ( { page, requestUtils } ) => {
		const post = await requestUtils.createPost( {
			title: 'Jukebox E2E - Computed Colors',
			content: jukeboxBlockContent( SAMPLE_TRACKS, {
				backgroundColor: '#ff0000',
				textColor: '#00ff00',
			} ),
			status: 'publish',
		} );
		const postUrl = new URL( `/?p=${ post.id }`, process.env.WP_BASE_URL || 'http://localhost:57882' ).href;

		await page.goto( postUrl );
		const jukebox = new JukeboxFrontend( page );
		await jukebox.waitForInit();

		// Check that the CSS variables are actually used in computed styles
		const bgColor = await jukebox.container.evaluate( ( el ) => {
			return getComputedStyle( el ).backgroundColor;
		} );
		// #ff0000 = rgb(255, 0, 0)
		expect( bgColor ).toBe( 'rgb(255, 0, 0)' );

		const titleColor = await jukebox.title.evaluate( ( el ) => {
			return getComputedStyle( el ).color;
		} );
		// #00ff00 = rgb(0, 255, 0)
		expect( titleColor ).toBe( 'rgb(0, 255, 0)' );

		await requestUtils.deleteAllPosts();
	} );
} );

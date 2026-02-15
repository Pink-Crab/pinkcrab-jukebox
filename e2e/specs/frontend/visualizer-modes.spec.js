const path = require( 'path' );
const { test, expect } = require( '../../fixtures' );
const { SAMPLE_TRACKS, jukeboxBlockContent } = require( '../../fixtures/test-data' );
const { JukeboxFrontend } = require( '../../fixtures/jukebox-frontend' );

const LOCAL_MP3_PATH = path.resolve( __dirname, '../../fixtures/sample.mp3' );

// Number of viz toggle clicks to reach each mode from 'off'
const MODE_CLICKS = { bars: 1, oscilloscope: 2, mirror: 3, fire: 4 };

test.describe( 'Visualizer Modes', () => {
	let postUrl;

	test.beforeAll( async ( { requestUtils } ) => {
		const media = await requestUtils.uploadMedia( LOCAL_MP3_PATH );

		const localTracks = SAMPLE_TRACKS.map( ( track ) => ( {
			...track,
			url: media.source_url,
		} ) );

		const post = await requestUtils.createPost( {
			title: 'Jukebox E2E - Visualizer Modes',
			content: jukeboxBlockContent( localTracks ),
			status: 'publish',
		} );
		postUrl = new URL( `/?p=${ post.id }`, process.env.WP_BASE_URL || 'http://localhost:57882' ).href;
	} );

	test.afterAll( async ( { requestUtils } ) => {
		await requestUtils.deleteAllPosts();
		await requestUtils.deleteAllMedia();
	} );

	// Mock AnalyserNode so each mode gets deterministic data for consistent screenshots
	test.beforeEach( async ( { page } ) => {
		await page.addInitScript( () => {
			AnalyserNode.prototype.getByteFrequencyData = function ( array ) {
				// Descending spectrum: louder low freqs tapering to quieter highs
				for ( let i = 0; i < array.length; i++ ) {
					const n = i / array.length;
					array[ i ] = Math.floor( 220 * Math.pow( 1 - n, 0.6 ) ) + 20;
				}
			};

			AnalyserNode.prototype.getByteTimeDomainData = function ( array ) {
				// Clean sine wave for oscilloscope
				for ( let i = 0; i < array.length; i++ ) {
					array[ i ] = 128 + Math.floor( 100 * Math.sin( ( i * Math.PI * 4 ) / array.length ) );
				}
			};
		} );
	} );

	for ( const [ mode, clicks ] of Object.entries( MODE_CLICKS ) ) {
		test( `${ mode } mode renders on canvas`, async ( { page } ) => {
			await page.goto( postUrl );
			const jukebox = new JukeboxFrontend( page );
			await jukebox.waitForInit();

			const vizToggle = jukebox.container.locator( '.jukebox__viz-toggle' );

			// Click to reach the target mode (off → bars → oscilloscope → mirror → fire)
			for ( let i = 0; i < clicks; i++ ) {
				await vizToggle.click( { force: true } );
			}

			// Verify the mode activated
			await expect( vizToggle ).toHaveAttribute( 'data-viz-mode', mode );
			await expect( vizToggle ).toHaveClass( /jukebox__sidebar-btn--active/ );

			// Wait for at least one animation frame to render
			await page.waitForTimeout( 300 );

			// Verify canvas has non-transparent pixels (visualizer actually drew something)
			const hasPixels = await page.evaluate( () => {
				const canvas = document.querySelector( '.jukebox__visualizer--behind' );
				if ( ! canvas ) return false;
				const ctx = canvas.getContext( '2d' );
				const imageData = ctx.getImageData( 0, 0, canvas.width, canvas.height );
				for ( let i = 3; i < imageData.data.length; i += 4 ) {
					if ( imageData.data[ i ] > 0 ) return true;
				}
				return false;
			} );
			expect( hasPixels ).toBe( true );

			// Visual regression screenshot of the artwork area (canvas + dimmed artwork)
			const artwork = jukebox.container.locator( '.jukebox__artwork' );
			await expect( artwork ).toHaveScreenshot( `visualizer-${ mode }.png`, {
				maxDiffPixelRatio: 0.02,
			} );
		} );
	}

	test( 'cycling through all modes returns to off', async ( { page } ) => {
		await page.goto( postUrl );
		const jukebox = new JukeboxFrontend( page );
		await jukebox.waitForInit();

		const vizToggle = jukebox.container.locator( '.jukebox__viz-toggle' );

		// Cycle through all 5 modes: off → bars → oscilloscope → mirror → fire → off
		for ( let i = 0; i < 5; i++ ) {
			await vizToggle.click( { force: true } );
		}

		// Should be back at off
		await expect( vizToggle ).toHaveAttribute( 'data-viz-mode', 'off' );
		await expect( vizToggle ).not.toHaveClass( /jukebox__sidebar-btn--active/ );

		// Canvas should be cleared
		await page.waitForTimeout( 100 );
		const hasPixels = await page.evaluate( () => {
			const canvas = document.querySelector( '.jukebox__visualizer--behind' );
			if ( ! canvas ) return false;
			const ctx = canvas.getContext( '2d' );
			const imageData = ctx.getImageData( 0, 0, canvas.width, canvas.height );
			for ( let i = 3; i < imageData.data.length; i += 4 ) {
				if ( imageData.data[ i ] > 0 ) return true;
			}
			return false;
		} );
		expect( hasPixels ).toBe( false );
	} );
} );

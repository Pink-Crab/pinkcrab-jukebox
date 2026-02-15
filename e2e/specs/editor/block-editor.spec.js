const { test, expect } = require( '../../fixtures' );
const { JukeboxEditor } = require( '../../fixtures/jukebox-editor' );

test.describe( 'Block Editor', () => {
	test.beforeEach( async ( { admin } ) => {
		await admin.createNewPost();
	} );

	test( 'inserting block shows placeholder', async ( { page, editor } ) => {
		const jbEditor = new JukeboxEditor( page, editor );
		await jbEditor.insertJukeboxBlock();

		await expect( jbEditor.placeholder ).toBeVisible();
		await expect( jbEditor.placeholder ).toContainText( 'Jukebox' );
	} );

	test( 'placeholder has add track buttons', async ( { page, editor } ) => {
		const jbEditor = new JukeboxEditor( page, editor );
		await jbEditor.insertJukeboxBlock();

		const addFromLibrary = jbEditor.block.getByRole( 'button', { name: /Add Audio from Library/i } );
		const addManually = jbEditor.block.getByRole( 'button', { name: /Add Track Manually/i } );

		await expect( addFromLibrary ).toBeVisible();
		await expect( addManually ).toBeVisible();
	} );

	test( 'add track manually shows track list', async ( { page, editor } ) => {
		const jbEditor = new JukeboxEditor( page, editor );
		await jbEditor.insertJukeboxBlock();

		// Click "Add Track Manually"
		const addManually = jbEditor.block.getByRole( 'button', { name: /Add Track Manually/i } );
		await addManually.click();

		// Placeholder should be replaced with track editor content
		await expect( jbEditor.placeholder ).toHaveCount( 0 );

		// Should show tracks header with count
		await expect( jbEditor.tracksHeader ).toContainText( 'Tracks (1)' );

		// Track row should exist
		await expect( jbEditor.trackRows ).toHaveCount( 1 );
	} );

	test( 'adding multiple tracks updates count', async ( { page, editor } ) => {
		const jbEditor = new JukeboxEditor( page, editor );
		await jbEditor.insertJukeboxBlock();

		// Add first track
		const addManually = jbEditor.block.getByRole( 'button', { name: /Add Track Manually/i } );
		await addManually.click();
		await expect( jbEditor.tracksHeader ).toContainText( 'Tracks (1)' );

		// Add second track via the "Add Manually" button in track list header
		const addMore = jbEditor.block.getByRole( 'button', { name: /Add Manually/i } );
		await addMore.click();
		await expect( jbEditor.tracksHeader ).toContainText( 'Tracks (2)' );
		await expect( jbEditor.trackRows ).toHaveCount( 2 );
	} );

	test( 'removing a track updates count', async ( { page, editor } ) => {
		const jbEditor = new JukeboxEditor( page, editor );
		await jbEditor.insertJukeboxBlock();

		// Add two tracks
		const addManually = jbEditor.block.getByRole( 'button', { name: /Add Track Manually/i } );
		await addManually.click();
		const addMore = jbEditor.block.getByRole( 'button', { name: /Add Manually/i } );
		await addMore.click();
		await expect( jbEditor.trackRows ).toHaveCount( 2 );

		// Remove first track
		const removeBtn = jbEditor.trackRows.nth( 0 ).getByRole( 'button', { name: /Remove/i } );
		await removeBtn.click();

		await expect( jbEditor.trackRows ).toHaveCount( 1 );
		await expect( jbEditor.tracksHeader ).toContainText( 'Tracks (1)' );
	} );

	test( 'inserting block with attributes shows preview', async ( { page, editor } ) => {
		const jbEditor = new JukeboxEditor( page, editor );
		await jbEditor.insertJukeboxBlock( {
			tracks: [
				{ id: 'test-1', title: 'Test Song', artist: 'Test Band', album: '', cover: '', url: '#test', pageLink: '' },
			],
		} );

		// Should not show placeholder — should show content
		await expect( jbEditor.placeholder ).toHaveCount( 0 );

		// Preview should show track info
		const previewTitle = jbEditor.block.locator( '.jukebox-editor__preview-title' );
		await expect( previewTitle ).toHaveText( 'Test Song' );

		const previewArtist = jbEditor.block.locator( '.jukebox-editor__preview-artist' );
		await expect( previewArtist ).toHaveText( 'Test Band' );
	} );

	test( 'display settings toggles exist in inspector', async ( { page, editor } ) => {
		const jbEditor = new JukeboxEditor( page, editor );
		await jbEditor.insertJukeboxBlock( {
			tracks: [
				{ id: 'test-1', title: 'Test', artist: '', album: '', cover: '', url: '#test', pageLink: '' },
			],
		} );

		// Open the inspector sidebar
		await editor.openDocumentSettingsSidebar();

		// Display Settings panel should have toggles
		const showFilter = page.getByRole( 'checkbox', { name: /Show Filter/i } );
		const showTracklist = page.getByRole( 'checkbox', { name: /Show Tracklist/i } );

		await expect( showFilter ).toBeVisible();
		await expect( showTracklist ).toBeVisible();

		// Both should be checked by default
		await expect( showFilter ).toBeChecked();
		await expect( showTracklist ).toBeChecked();
	} );

	test( 'move track up and down reorders list', async ( { page, editor } ) => {
		const jbEditor = new JukeboxEditor( page, editor );
		await jbEditor.insertJukeboxBlock( {
			tracks: [
				{ id: 't1', title: 'First', artist: '', album: '', cover: '', url: '#1', pageLink: '' },
				{ id: 't2', title: 'Second', artist: '', album: '', cover: '', url: '#2', pageLink: '' },
			],
		} );

		// First track should show "First"
		const firstRow = jbEditor.trackRows.nth( 0 );
		await expect( firstRow ).toContainText( 'First' );

		// Move first track down
		const moveDown = firstRow.getByRole( 'button', { name: /Move down/i } );
		await moveDown.click();

		// "Second" should now be first
		await expect( jbEditor.trackRows.nth( 0 ) ).toContainText( 'Second' );
		await expect( jbEditor.trackRows.nth( 1 ) ).toContainText( 'First' );
	} );
} );

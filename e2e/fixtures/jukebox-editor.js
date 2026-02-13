/**
 * Page Object for the jukebox block in the WordPress editor.
 */
class JukeboxEditor {
	constructor( page, editor, admin ) {
		this.page = page;
		this.editor = editor;
		this.admin = admin;
	}

	get canvas() {
		return this.editor.canvas;
	}

	/** The jukebox block in the editor canvas */
	get block() {
		return this.canvas.locator( '[data-type="pinkcrab/jukebox"]' );
	}

	/** Placeholder shown when no tracks exist */
	get placeholder() {
		return this.block.locator( '.components-placeholder' );
	}

	/** Track rows in the editor */
	get trackRows() {
		return this.block.locator( '.jukebox-editor__track' );
	}

	/** Tracks header showing count */
	get tracksHeader() {
		return this.block.locator( '.jukebox-editor__tracks-header' );
	}

	/** Insert a fresh jukebox block */
	async insertJukeboxBlock( attributes = {} ) {
		await this.editor.insertBlock( {
			name: 'pinkcrab/jukebox',
			attributes,
		} );
	}
}

module.exports = { JukeboxEditor };

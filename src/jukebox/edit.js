/**
 * WordPress dependencies
 */
import { __ } from '@wordpress/i18n';
import {
	useBlockProps,
	MediaUpload,
	MediaUploadCheck,
	InspectorControls,
} from '@wordpress/block-editor';
import {
	Button,
	PanelBody,
	RangeControl,
	ToggleControl,
	TextControl,
	Placeholder,
	__experimentalInputControl as InputControl,
	ColorPicker,
	Popover,
} from '@wordpress/components';
import { Fragment, useState, useEffect } from '@wordpress/element';
import { trash, arrowUp, arrowDown, plus } from '@wordpress/icons';

/**
 * Color Picker Button Component
 */
function ColorPickerButton( { label, color, onChange } ) {
	const [ isOpen, setIsOpen ] = useState( false );

	return (
		<div className="jukebox-color-picker">
			<span className="jukebox-color-picker__label">{ label }</span>
			<button
				type="button"
				className="jukebox-color-picker__button"
				onClick={ () => setIsOpen( ! isOpen ) }
				style={ { backgroundColor: color } }
				aria-label={ label }
			/>
			{ isOpen && (
				<Popover
					position="bottom center"
					onClose={ () => setIsOpen( false ) }
				>
					<div style={ { padding: '16px' } }>
						<ColorPicker
							color={ color }
							onChange={ onChange }
							enableAlpha={ false }
						/>
						<TextControl
							label={ __( 'Or enter CSS value', 'pinkcrab-jukebox' ) }
							value={ color }
							onChange={ onChange }
							placeholder="var(--wp-color) or #hex"
						/>
					</div>
				</Popover>
			) }
		</div>
	);
}

/**
 * Track Editor Row Component
 */
function TrackRow( { track, index, onUpdate, onRemove, onMoveUp, onMoveDown, isFirst, isLast, isSelected, onSelect } ) {
	const [ expanded, setExpanded ] = useState( false );

	return (
		<div className={ `jukebox-editor__track ${ expanded ? 'jukebox-editor__track--expanded' : '' } ${ isSelected ? 'jukebox-editor__track--selected' : '' }` }>
			<div className="jukebox-editor__track-header" onClick={ () => onSelect( index ) } style={ { cursor: 'pointer' } }>
				<span className="jukebox-editor__track-number">{ index + 1 }</span>
				{ track.cover && (
					<img
						src={ track.cover }
						alt=""
						className="jukebox-editor__track-thumb"
					/>
				) }
				<div className="jukebox-editor__track-summary">
					<strong>{ track.title || __( 'Untitled', 'pinkcrab-jukebox' ) }</strong>
					<span>{ track.artist || __( 'Unknown Artist', 'pinkcrab-jukebox' ) }</span>
				</div>
				<div className="jukebox-editor__track-actions" onClick={ ( e ) => e.stopPropagation() }>
					<Button
						icon={ expanded ? 'arrow-up-alt2' : 'arrow-down-alt2' }
						label={ expanded ? __( 'Collapse', 'pinkcrab-jukebox' ) : __( 'Expand', 'pinkcrab-jukebox' ) }
						onClick={ () => setExpanded( ! expanded ) }
						size="small"
					/>
					<Button
						icon={ arrowUp }
						label={ __( 'Move up', 'pinkcrab-jukebox' ) }
						onClick={ () => onMoveUp( index ) }
						disabled={ isFirst }
						size="small"
					/>
					<Button
						icon={ arrowDown }
						label={ __( 'Move down', 'pinkcrab-jukebox' ) }
						onClick={ () => onMoveDown( index ) }
						disabled={ isLast }
						size="small"
					/>
					<Button
						icon={ trash }
						label={ __( 'Remove', 'pinkcrab-jukebox' ) }
						onClick={ () => onRemove( index ) }
						isDestructive
						size="small"
					/>
				</div>
			</div>

			{ expanded && (
				<div className="jukebox-editor__track-details">
					<TextControl
						label={ __( 'Track Title', 'pinkcrab-jukebox' ) }
						value={ track.title || '' }
						onChange={ ( value ) => onUpdate( index, 'title', value ) }
					/>
					<TextControl
						label={ __( 'Artist', 'pinkcrab-jukebox' ) }
						value={ track.artist || '' }
						onChange={ ( value ) => onUpdate( index, 'artist', value ) }
					/>
					<TextControl
						label={ __( 'Album', 'pinkcrab-jukebox' ) }
						value={ track.album || '' }
						onChange={ ( value ) => onUpdate( index, 'album', value ) }
					/>
					<TextControl
						label={ __( 'Audio URL', 'pinkcrab-jukebox' ) }
						value={ track.url || '' }
						onChange={ ( value ) => onUpdate( index, 'url', value ) }
						type="url"
					/>
					<TextControl
						label={ __( 'Page Link', 'pinkcrab-jukebox' ) }
						value={ track.pageLink || '' }
						onChange={ ( value ) => onUpdate( index, 'pageLink', value ) }
						type="url"
						help={ __( 'Link to a page with more info about this track', 'pinkcrab-jukebox' ) }
					/>

					<div className="jukebox-editor__track-cover">
						<label>{ __( 'Cover Image', 'pinkcrab-jukebox' ) }</label>
						<MediaUploadCheck>
							<MediaUpload
								onSelect={ ( media ) => onUpdate( index, 'cover', media.url ) }
								allowedTypes={ [ 'image' ] }
								value={ track.coverId }
								render={ ( { open } ) => (
									<div className="jukebox-editor__cover-control">
										{ track.cover ? (
											<Fragment>
												<img
													src={ track.cover }
													alt={ __( 'Cover', 'pinkcrab-jukebox' ) }
													style={ { maxWidth: '100px', marginBottom: '8px' } }
												/>
												<Button variant="secondary" onClick={ open } size="small">
													{ __( 'Replace', 'pinkcrab-jukebox' ) }
												</Button>
												<Button
													variant="tertiary"
													isDestructive
													onClick={ () => onUpdate( index, 'cover', '' ) }
													size="small"
												>
													{ __( 'Remove', 'pinkcrab-jukebox' ) }
												</Button>
											</Fragment>
										) : (
											<Button variant="secondary" onClick={ open }>
												{ __( 'Select Cover', 'pinkcrab-jukebox' ) }
											</Button>
										) }
									</div>
								) }
							/>
						</MediaUploadCheck>
					</div>

					<div className="jukebox-editor__track-audio">
						<label>{ __( 'Audio File', 'pinkcrab-jukebox' ) }</label>
						<MediaUploadCheck>
							<MediaUpload
								onSelect={ ( media ) => onUpdate( index, 'url', media.url ) }
								allowedTypes={ [ 'audio' ] }
								render={ ( { open } ) => (
									<Button variant="secondary" onClick={ open }>
										{ track.url ? __( 'Replace Audio', 'pinkcrab-jukebox' ) : __( 'Select Audio', 'pinkcrab-jukebox' ) }
									</Button>
								) }
							/>
						</MediaUploadCheck>
						{ track.url && (
							<div className="jukebox-editor__audio-preview">
								<audio controls src={ track.url } preload="none">
									{ __( 'Audio preview', 'pinkcrab-jukebox' ) }
								</audio>
							</div>
						) }
					</div>
				</div>
			) }
		</div>
	);
}

/**
 * Editor component for Jukebox block.
 */
export default function Edit( { attributes, setAttributes, clientId } ) {
	const {
		blockId,
		tracks,
		showFilter,
		showTracklist,
		artworkMaxHeight,
		backgroundColor,
		primaryColor,
		secondaryColor,
		textColor,
		textMutedColor,
		progressBackground,
		controlHoverColor,
	} = attributes;

	const [ selectedTrackIndex, setSelectedTrackIndex ] = useState( null );

	const blockProps = useBlockProps( {
		className: 'jukebox-editor',
	} );

	// Generate block ID if not set
	useEffect( () => {
		if ( ! blockId ) {
			setAttributes( { blockId: `jukebox-${ clientId.slice( 0, 8 ) }` } );
		}
	}, [ blockId, clientId, setAttributes ] );

	// Clear selection if track is deleted
	useEffect( () => {
		if ( selectedTrackIndex !== null && selectedTrackIndex >= tracks.length ) {
			setSelectedTrackIndex( tracks.length > 0 ? tracks.length - 1 : null );
		}
	}, [ tracks.length, selectedTrackIndex ] );

	const selectedTrack = selectedTrackIndex !== null ? tracks[ selectedTrackIndex ] : null;

	/**
	 * Add a new empty track
	 */
	const addTrack = () => {
		const newTrack = {
			id: `track-${ Date.now() }`,
			title: '',
			artist: '',
			album: '',
			cover: '',
			url: '',
			pageLink: '',
		};
		setAttributes( { tracks: [ ...tracks, newTrack ] } );
	};

	/**
	 * Update a track field
	 */
	const updateTrack = ( index, field, value ) => {
		const newTracks = [ ...tracks ];
		newTracks[ index ] = { ...newTracks[ index ], [ field ]: value };
		setAttributes( { tracks: newTracks } );
	};

	/**
	 * Remove a track
	 */
	const removeTrack = ( index ) => {
		const newTracks = [ ...tracks ];
		newTracks.splice( index, 1 );
		setAttributes( { tracks: newTracks } );
	};

	/**
	 * Move track up
	 */
	const moveTrackUp = ( index ) => {
		if ( index === 0 ) return;
		const newTracks = [ ...tracks ];
		[ newTracks[ index - 1 ], newTracks[ index ] ] = [ newTracks[ index ], newTracks[ index - 1 ] ];
		setAttributes( { tracks: newTracks } );
	};

	/**
	 * Move track down
	 */
	const moveTrackDown = ( index ) => {
		if ( index === tracks.length - 1 ) return;
		const newTracks = [ ...tracks ];
		[ newTracks[ index ], newTracks[ index + 1 ] ] = [ newTracks[ index + 1 ], newTracks[ index ] ];
		setAttributes( { tracks: newTracks } );
	};

	/**
	 * Add tracks from media library (multiple audio files)
	 */
	const addTracksFromMedia = ( mediaItems ) => {
		const newTracks = mediaItems.map( ( item ) => ( {
			id: `track-${ item.id }`,
			title: item.title || item.filename || '',
			artist: item.meta?.artist || '',
			album: item.meta?.album || '',
			cover: '',
			url: item.url,
			pageLink: '',
		} ) );
		setAttributes( { tracks: [ ...tracks, ...newTracks ] } );
	};

	const hasContent = tracks.length > 0;

	// Preview styles
	const previewStyle = {
		'--jukebox-bg': backgroundColor,
		'--jukebox-primary': primaryColor,
		'--jukebox-secondary': secondaryColor,
		'--jukebox-text': textColor,
		'--jukebox-text-muted': textMutedColor,
		'--jukebox-progress-bg': progressBackground,
		'--jukebox-control-hover': controlHoverColor,
		'--jukebox-artwork-height': `${ artworkMaxHeight }px`,
	};

	return (
		<Fragment>
			<InspectorControls>
				{ selectedTrack && (
					<PanelBody title={ __( 'Edit Track', 'pinkcrab-jukebox' ) } initialOpen={ true }>
						<p className="components-base-control__help" style={ { marginBottom: '12px' } }>
							{ __( 'Editing track', 'pinkcrab-jukebox' ) } <strong>#{ selectedTrackIndex + 1 }</strong>
						</p>
						<TextControl
							label={ __( 'Title', 'pinkcrab-jukebox' ) }
							value={ selectedTrack.title || '' }
							onChange={ ( value ) => updateTrack( selectedTrackIndex, 'title', value ) }
						/>
						<TextControl
							label={ __( 'Artist', 'pinkcrab-jukebox' ) }
							value={ selectedTrack.artist || '' }
							onChange={ ( value ) => updateTrack( selectedTrackIndex, 'artist', value ) }
						/>
						<TextControl
							label={ __( 'Album', 'pinkcrab-jukebox' ) }
							value={ selectedTrack.album || '' }
							onChange={ ( value ) => updateTrack( selectedTrackIndex, 'album', value ) }
						/>
						<TextControl
							label={ __( 'Audio URL', 'pinkcrab-jukebox' ) }
							value={ selectedTrack.url || '' }
							onChange={ ( value ) => updateTrack( selectedTrackIndex, 'url', value ) }
							type="url"
						/>
						<TextControl
							label={ __( 'Page Link', 'pinkcrab-jukebox' ) }
							value={ selectedTrack.pageLink || '' }
							onChange={ ( value ) => updateTrack( selectedTrackIndex, 'pageLink', value ) }
							type="url"
							help={ __( 'Link to more info about this track', 'pinkcrab-jukebox' ) }
						/>
						<TextControl
							label={ __( 'Cover Image URL', 'pinkcrab-jukebox' ) }
							value={ selectedTrack.cover || '' }
							onChange={ ( value ) => updateTrack( selectedTrackIndex, 'cover', value ) }
							type="url"
						/>
						<MediaUploadCheck>
							<MediaUpload
								onSelect={ ( media ) => updateTrack( selectedTrackIndex, 'cover', media.url ) }
								allowedTypes={ [ 'image' ] }
								render={ ( { open } ) => (
									<Button variant="secondary" onClick={ open } style={ { marginBottom: '8px' } }>
										{ __( 'Select Cover from Library', 'pinkcrab-jukebox' ) }
									</Button>
								) }
							/>
						</MediaUploadCheck>
						<MediaUploadCheck>
							<MediaUpload
								onSelect={ ( media ) => updateTrack( selectedTrackIndex, 'url', media.url ) }
								allowedTypes={ [ 'audio' ] }
								render={ ( { open } ) => (
									<Button variant="secondary" onClick={ open } style={ { marginBottom: '12px' } }>
										{ __( 'Select Audio from Library', 'pinkcrab-jukebox' ) }
									</Button>
								) }
							/>
						</MediaUploadCheck>
						<Button
							variant="tertiary"
							isDestructive
							onClick={ () => {
								removeTrack( selectedTrackIndex );
								setSelectedTrackIndex( null );
							} }
						>
							{ __( 'Delete Track', 'pinkcrab-jukebox' ) }
						</Button>
						<Button
							variant="link"
							onClick={ () => setSelectedTrackIndex( null ) }
							style={ { marginLeft: '12px' } }
						>
							{ __( 'Close', 'pinkcrab-jukebox' ) }
						</Button>
					</PanelBody>
				) }

				<PanelBody title={ __( 'Display Settings', 'pinkcrab-jukebox' ) } initialOpen={ ! selectedTrack }>
					<ToggleControl
						label={ __( 'Show Filter', 'pinkcrab-jukebox' ) }
						checked={ showFilter }
						onChange={ ( value ) => setAttributes( { showFilter: value } ) }
					/>
					<ToggleControl
						label={ __( 'Show Tracklist', 'pinkcrab-jukebox' ) }
						checked={ showTracklist }
						onChange={ ( value ) => setAttributes( { showTracklist: value } ) }
					/>
					<RangeControl
						label={ __( 'Artwork Max Height (px)', 'pinkcrab-jukebox' ) }
						value={ artworkMaxHeight }
						onChange={ ( value ) => setAttributes( { artworkMaxHeight: value } ) }
						min={ 150 }
						max={ 600 }
					/>
				</PanelBody>

				<PanelBody title={ __( 'Colors', 'pinkcrab-jukebox' ) } initialOpen={ false }>
					<p className="components-base-control__help">
						{ __( 'You can use CSS variables like var(--wp-color) or hex values.', 'pinkcrab-jukebox' ) }
					</p>
					<ColorPickerButton
						label={ __( 'Background', 'pinkcrab-jukebox' ) }
						color={ backgroundColor }
						onChange={ ( value ) => setAttributes( { backgroundColor: value } ) }
					/>
					<ColorPickerButton
						label={ __( 'Primary (Accent)', 'pinkcrab-jukebox' ) }
						color={ primaryColor }
						onChange={ ( value ) => setAttributes( { primaryColor: value } ) }
					/>
					<ColorPickerButton
						label={ __( 'Secondary', 'pinkcrab-jukebox' ) }
						color={ secondaryColor }
						onChange={ ( value ) => setAttributes( { secondaryColor: value } ) }
					/>
					<ColorPickerButton
						label={ __( 'Text', 'pinkcrab-jukebox' ) }
						color={ textColor }
						onChange={ ( value ) => setAttributes( { textColor: value } ) }
					/>
					<ColorPickerButton
						label={ __( 'Muted Text', 'pinkcrab-jukebox' ) }
						color={ textMutedColor }
						onChange={ ( value ) => setAttributes( { textMutedColor: value } ) }
					/>
					<ColorPickerButton
						label={ __( 'Progress Bar Background', 'pinkcrab-jukebox' ) }
						color={ progressBackground }
						onChange={ ( value ) => setAttributes( { progressBackground: value } ) }
					/>
					<ColorPickerButton
						label={ __( 'Control Hover', 'pinkcrab-jukebox' ) }
						color={ controlHoverColor }
						onChange={ ( value ) => setAttributes( { controlHoverColor: value } ) }
					/>
				</PanelBody>
			</InspectorControls>

			<div { ...blockProps } style={ previewStyle }>
				{ ! hasContent ? (
					<Placeholder
						icon="playlist-audio"
						label={ __( 'Jukebox', 'pinkcrab-jukebox' ) }
						instructions={ __( 'Add tracks to create your jukebox. You can add audio files from the media library or manually enter track details.', 'pinkcrab-jukebox' ) }
					>
						<div className="jukebox-editor__placeholder-actions">
							<MediaUploadCheck>
								<MediaUpload
									onSelect={ addTracksFromMedia }
									allowedTypes={ [ 'audio' ] }
									multiple
									render={ ( { open } ) => (
										<Button variant="primary" onClick={ open }>
											{ __( 'Add Audio from Library', 'pinkcrab-jukebox' ) }
										</Button>
									) }
								/>
							</MediaUploadCheck>
							<Button variant="secondary" onClick={ addTrack }>
								{ __( 'Add Track Manually', 'pinkcrab-jukebox' ) }
							</Button>
						</div>
					</Placeholder>
				) : (
					<div className="jukebox-editor__content">
						<div className="jukebox-editor__preview" style={ previewStyle }>
							<div className="jukebox-editor__preview-player">
								{ tracks[ 0 ]?.cover ? (
									<img
										src={ tracks[ 0 ].cover }
										alt=""
										className="jukebox-editor__preview-artwork"
									/>
								) : (
									<div className="jukebox-editor__preview-artwork-placeholder">
										<svg viewBox="0 0 24 24" fill="currentColor">
											<path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
										</svg>
									</div>
								) }
								<div className="jukebox-editor__preview-info">
									<span className="jukebox-editor__preview-title">
										{ tracks[ 0 ]?.title || __( 'Track Title', 'pinkcrab-jukebox' ) }
									</span>
									<span className="jukebox-editor__preview-artist">
										{ tracks[ 0 ]?.artist || __( 'Artist', 'pinkcrab-jukebox' ) }
									</span>
								</div>
								<div className="jukebox-editor__preview-controls">
									<span>⏮</span>
									<span>▶</span>
									<span>⏭</span>
								</div>
							</div>
						</div>

						<div className="jukebox-editor__tracks-header">
							<span>{ __( 'Tracks', 'pinkcrab-jukebox' ) } ({ tracks.length })</span>
							<div className="jukebox-editor__tracks-actions">
								<MediaUploadCheck>
									<MediaUpload
										onSelect={ addTracksFromMedia }
										allowedTypes={ [ 'audio' ] }
										multiple
										render={ ( { open } ) => (
											<Button variant="secondary" size="small" onClick={ open }>
												{ __( 'Add from Library', 'pinkcrab-jukebox' ) }
											</Button>
										) }
									/>
								</MediaUploadCheck>
								<Button
									variant="secondary"
									size="small"
									icon={ plus }
									onClick={ addTrack }
								>
									{ __( 'Add Manually', 'pinkcrab-jukebox' ) }
								</Button>
							</div>
						</div>

						<div className="jukebox-editor__tracks-list">
							{ tracks.map( ( track, index ) => (
								<TrackRow
									key={ track.id || index }
									track={ track }
									index={ index }
									onUpdate={ updateTrack }
									onRemove={ removeTrack }
									onMoveUp={ moveTrackUp }
									onMoveDown={ moveTrackDown }
									isFirst={ index === 0 }
									isLast={ index === tracks.length - 1 }
									isSelected={ selectedTrackIndex === index }
									onSelect={ setSelectedTrackIndex }
								/>
							) ) }
						</div>
					</div>
				) }
			</div>
		</Fragment>
	);
}


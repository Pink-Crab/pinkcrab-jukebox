const SAMPLE_TRACKS = [
	{
		id: 'track-test-1',
		title: 'Test Track One',
		artist: 'Test Artist A',
		album: 'Test Album Alpha',
		cover: '',
		url: '#track-1',
		pageLink: '',
	},
	{
		id: 'track-test-2',
		title: 'Test Track Two',
		artist: 'Test Artist B',
		album: 'Test Album Beta',
		cover: '',
		url: '#track-2',
		pageLink: '',
	},
	{
		id: 'track-test-3',
		title: 'Test Track Three',
		artist: 'Test Artist A',
		album: 'Test Album Alpha',
		cover: '',
		url: '#track-3',
		pageLink: 'https://example.com/track3',
	},
];

/**
 * Generates serialized block comment for pinkcrab/jukebox.
 * Since save() returns null (SSR block), WordPress stores only the comment.
 */
function jukeboxBlockContent( tracks = SAMPLE_TRACKS, overrides = {} ) {
	const attrs = {
		blockId: 'jukebox-test-e2e',
		tracks,
		showFilter: true,
		showTracklist: true,
		artworkMaxHeight: 300,
		backgroundColor: '#1a1a2e',
		primaryColor: '#e94560',
		secondaryColor: '#16213e',
		textColor: '#ffffff',
		textMutedColor: '#a0a0a0',
		progressBackground: '#2d2d44',
		controlHoverColor: '#ff6b6b',
		...overrides,
	};
	return `<!-- wp:pinkcrab/jukebox ${ JSON.stringify( attrs ) } /-->`;
}

module.exports = { SAMPLE_TRACKS, jukeboxBlockContent };

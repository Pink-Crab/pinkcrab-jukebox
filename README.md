# PinkCrab Jukebox

A responsive WordPress audio jukebox block with queue, shuffle, and repeat functionality.

## Features

- **Track Management**: Add tracks with artist, title, album, cover image, and page link
- **Queue System**: Add tracks to queue, remove from queue, clear queue
- **Playback Controls**: Play/pause, previous, next, shuffle, repeat (off/all/one)
- **Filter/Search**: Filter tracks by title, artist, or album
- **Volume Control**: Adjustable volume with mute toggle
- **Responsive Design**: Works on all screen sizes
- **Customizable Colors**: All colors configurable in the block editor
- **Keyboard Shortcuts**: Full keyboard navigation support
- **HTML5 Audio Fallback**: Uses native browser audio element

## Installation

1. Upload the `jukebox` folder to `/wp-content/plugins/`
2. Run `npm install` in the plugin directory (on your dev machine)
3. Run `npm run build` to compile the assets
4. Activate the plugin through WordPress admin

## Building

```bash
# Install dependencies
npm install

# Build for production
npm run build

# Watch for changes during development
npm run start
```

## Usage

1. Add the "Jukebox" block to your post or page
2. Add tracks using either:
   - **Add from Library**: Select audio files from your WordPress media library
   - **Add Manually**: Enter track details manually
3. Configure display options in the block sidebar:
   - Show/hide filter input
   - Show/hide tracklist
   - Adjust artwork max height
4. Customize colors in the Colors panel

## Track Attributes

Each track can have:
- **Title**: The track name
- **Artist**: The artist/band name
- **Album**: The album name
- **Cover**: Album artwork image
- **Audio URL**: Link to the audio file (MP3, etc.)
- **Page Link**: Optional link to a page with more info

## Keyboard Shortcuts

When the jukebox has focus:
- **Space**: Play/Pause
- **Arrow Left**: Seek back 5 seconds
- **Arrow Right**: Seek forward 5 seconds
- **Shift + Left**: Previous track
- **Shift + Right**: Next track
- **Arrow Up**: Volume up
- **Arrow Down**: Volume down
- **M**: Toggle mute
- **S**: Toggle shuffle
- **R**: Cycle repeat mode

## CSS Variables

The jukebox uses CSS custom properties for theming:

```css
.jukebox {
  --jukebox-bg: #1a1a2e;
  --jukebox-primary: #e94560;
  --jukebox-secondary: #16213e;
  --jukebox-text: #ffffff;
  --jukebox-text-muted: #a0a0a0;
  --jukebox-progress-bg: #2d2d44;
  --jukebox-control-hover: #ff6b6b;
  --jukebox-artwork-height: 300px;
}
```

These can be overridden in your theme CSS or configured in the block editor.

## Security

All output is properly escaped:
- `esc_html()` for text content
- `esc_attr()` for attributes
- `esc_url()` for URLs
- `wp_json_encode()` for JSON data
- `sanitize_text_field()` for text inputs
- `esc_url_raw()` for URL inputs

## Requirements

- WordPress 6.0+
- PHP 7.4+
- Modern browser with HTML5 audio support

## License

GPL-2.0-or-later




# PinkCrab Jukebox

An audio jukebox block for the WordPress block editor. Requires WordPress 6.0+ and PHP 7.4+.

## Getting Started

Upload `pinkcrab-jukebox` to `/wp-content/plugins/` and activate. If installing from source, build first:

```bash
npm install
npm run build
```

Use `npm run start` for development with file watching.

In the editor, add the **Jukebox** block to any post or page. Add tracks from the media library or enter URLs manually. Each track has a title, artist, album, cover image, audio file, and optional page link.

## Keyboard Shortcuts

Active when the jukebox has focus. Press `?` to see them in an overlay.

| Key | Action |
|---|---|
| `Z` | Previous track |
| `X` | Play |
| `C` | Pause |
| `V` | Stop |
| `B` | Next track |
| `S` | Toggle shuffle |
| `R` | Cycle repeat (off / all / one) |
| `M` | Toggle mute |
| `Q` | Toggle queue panel |
| `?` | Show shortcuts overlay |
| `Left` / `Right` | Seek ±5 seconds |
| `Up` / `Down` | Volume ±10% |

## Visualizer

Four modes, cycled via the sidebar button. Uses the Web Audio API with a canvas overlay on the artwork.

| Mode | Style |
|---|---|
| Bars | Frequency bars, green/yellow/red gradient |
| Oscilloscope | Time-domain waveform |
| Mirror | Frequency bars mirrored vertically |
| Fire | Frequency bars with fire gradient |

Requires same-origin audio due to CORS. Cross-origin audio disables the visualizer automatically — playback still works.

## Theming

Colors are configured per-block in the editor sidebar and output as CSS custom properties on the `.jukebox` container:

```
--jukebox-bg               #1a1a2e
--jukebox-primary          #e94560
--jukebox-secondary        #16213e
--jukebox-text             #ffffff
--jukebox-text-muted       #a0a0a0
--jukebox-progress-bg      #2d2d44
--jukebox-control-hover    #ff6b6b
--jukebox-artwork-height   300px
```

These can be overridden in your theme CSS. Accepts hex, rgb, rgba, hsl, hsla, var(), and named colors.

## License

GPL-2.0-or-later

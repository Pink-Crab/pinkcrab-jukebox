=== PinkCrab Jukebox ===
Contributors: glynnquelch
Tags: audio player, jukebox, music player, audio block, media
Requires at least: 6.0
Tested up to: 6.9
Stable tag: 1.0.0
Requires PHP: 7.4
License: GPL-2.0-or-later
License URI: https://www.gnu.org/licenses/gpl-2.0.html

An audio jukebox block for the WordPress block editor.

== Description ==

A Gutenberg block that lets you add an audio player to any post or page. Add tracks from your media library, set cover art and metadata, pick some colors, and you're done.

= What it does =

* Play, pause, skip, shuffle, and repeat (off / all / single track)
* Queue system — add tracks to play next
* Search and filter tracks by title, artist, or album
* Audio visualizer with four modes (bars, oscilloscope, mirror, fire)
* Keyboard shortcuts (Winamp-style — Z/X/C/V/B, press ? to see them all)
* Seven color settings so it fits your theme
* Volume slider with mute
* Seekable progress bar
* Toggle artwork and tracklist visibility
* Responsive — works on mobile
* Accessible — ARIA labels, screen reader support, keyboard navigation
* No external services — everything runs in the browser

== Installation ==

1. Upload the `pinkcrab-jukebox` folder to `/wp-content/plugins/` or install through the WordPress plugin screen.
2. Activate the plugin.
3. In the block editor, add the "Jukebox" block.
4. Add your tracks and configure as needed.

== Frequently Asked Questions ==

= What audio formats work? =
Whatever the browser supports — MP3, WAV, OGG, AAC, etc.

= Why isn't the visualizer working? =
The visualizer uses the Web Audio API which needs same-origin audio files. If your audio is on a different domain, the visualizer turns itself off so your audio doesn't get muted. Playback still works fine.

= Do I need to self-host audio? =
You can use any URL, but the visualizer only works with same-origin files. Uploading to your media library is the simplest approach.

= Can I change the colors? =
Yes. Seven color settings in the block sidebar. Supports hex, RGB, HSL, and CSS variables.

= Does it connect to any external services? =
No. Everything runs locally in the browser.

= Multiple players on one page? =
Works fine. Each instance is independent.

== Changelog ==

= 1.0.0 =
* Initial release.

== Upgrade Notice ==

= 1.0.0 =
Initial release.

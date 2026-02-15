<?php
/**
 * Allow audio file uploads in the test environment.
 *
 * @package pinkcrab-jukebox-e2e
 */

add_filter( 'upload_mimes', function ( $mimes ) {
	$mimes['mp3'] = 'audio/mpeg';
	return $mimes;
} );

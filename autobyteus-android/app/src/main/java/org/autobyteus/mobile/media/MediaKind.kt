package org.autobyteus.mobile.media

/**
 * A kind of node media file the app's player plays (autobyteus-642 D-2), with the lowercase file extensions Media3
 * plays for it: its extractors read MP4/QuickTime (with 3GP and M4A), WebM/Matroska, MP3, AAC (ADTS), WAV, Ogg
 * (Vorbis, Opus) and FLAC. The page hands the app only these types (`hello.mediaPlayer`); any other plays in the page.
 * Video can turn to landscape; audio stays portrait with its title and controls.
 */
enum class MediaKind(val wire: String, val extensions: List<String>) {
    VIDEO("video", listOf("mp4", "m4v", "mov", "webm", "mkv", "3gp")),
    AUDIO("audio", listOf("mp3", "m4a", "aac", "wav", "ogg", "oga", "opus", "flac"));

    companion object {
        /** The kind the page names (`playMedia.kind`), or `null` for anything else. */
        fun ofWire(value: String?): MediaKind? = entries.firstOrNull { it.wire == value }
    }
}

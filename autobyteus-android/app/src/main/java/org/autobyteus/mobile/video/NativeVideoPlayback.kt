package org.autobyteus.mobile.video

import java.util.UUID

/**
 * The handoff of one video to the player screen (autobyteus-574 D-5): the page's credential stays in memory, never in
 * an Intent's extras, a saved state, a URL or a log. The opener puts the playback here and passes only a random token;
 * the player takes it once. One playback is pending at a time: a new one replaces it. A player recreated after Android
 * ended the process finds nothing and says it could not play.
 */
object NativeVideoPlayback {
    /** One playback: the node it belongs to, the file's URL and name, and the credential for this playback only. */
    class Request(
        val nodeId: String,
        val nodeOrigin: String,
        val url: String,
        val title: String,
        val credential: String,
    ) {
        override fun toString(): String = "NativeVideoPlayback.Request(nodeId=$nodeId, title=$title, credential=<redacted>)"
    }

    private var pending: Pair<String, Request>? = null

    /** Holds [request] for the player screen and returns the token that names it. */
    @Synchronized
    fun put(request: Request): String {
        val token = UUID.randomUUID().toString()
        pending = token to request
        return token
    }

    /** The playback [token] names, once; `null` when none (already taken, replaced, or the process restarted). */
    @Synchronized
    fun take(token: String?): Request? {
        val held = pending ?: return null
        if (token == null || held.first != token) return null
        pending = null
        return held.second
    }
}

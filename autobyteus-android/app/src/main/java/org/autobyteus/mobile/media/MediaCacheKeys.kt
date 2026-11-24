package org.autobyteus.mobile.media

import java.net.URI
import java.security.MessageDigest

/**
 * The media cache's keys (autobyteus-574 DEC-003, design N-4): an entry is one version of one node file, named by node,
 * file URL (path and query) and ETag. A changed file has a new ETag and so a new key: the old bytes are never served.
 * The key is hashed (SHA-256 hex), so the cache's index never spells out a path; its first part is the node's own hash,
 * so a node's entries can be found when the node is removed (D-7).
 */
object MediaCacheKeys {
    fun keyFor(nodeId: String, url: String, etag: String): String {
        val uri = URI(url)
        val pathAndQuery = uri.rawPath.orEmpty() + (uri.rawQuery?.let { "?$it" } ?: "")
        return "${nodePrefix(nodeId)}${sha256("$nodeId|$pathAndQuery|$etag")}"
    }

    /** What every key of [nodeId] starts with. */
    fun nodePrefix(nodeId: String): String = "${sha256(nodeId)}:"

    private fun sha256(text: String): String =
        MessageDigest.getInstance("SHA-256").digest(text.toByteArray(Charsets.UTF_8)).joinToString("") { "%02x".format(it) }
}

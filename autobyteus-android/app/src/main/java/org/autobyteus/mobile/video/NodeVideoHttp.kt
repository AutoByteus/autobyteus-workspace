package org.autobyteus.mobile.video

import java.io.Closeable
import java.io.IOException
import java.io.InputStream
import java.net.HttpURLConnection
import java.net.URI
import java.net.URL

/**
 * The video player's one way to read a node file (autobyteus-574 D-3, D-5): a byte range of a URL on the open node's
 * origin, with the phone's credential only as `Authorization: Bearer`. It never follows a redirect (node file routes
 * never redirect; a redirect could carry the header elsewhere, design N-1) and refuses any URL off the node's origin or
 * outside its `/rest/` routes, before anything is sent. Nothing here logs a URL or a header.
 */
class NodeVideoHttp(
    private val nodeOrigin: String,
    private val credential: String,
    private val connectTimeoutMs: Int = 15_000,
    private val readTimeoutMs: Int = 20_000,
) {
    /** A request this player must not send: off the node's origin, or not a node file route. */
    class RefusedUrl : IOException("Refused a video URL that is not a file route of the open node.")

    /** The node answered with a redirect; it is not followed, so the credential goes nowhere else. */
    class RedirectRefused(val status: Int) : IOException("The node answered $status (a redirect); not followed.")

    /** A `Content-Range` header: bytes [first]-[last] of [size]; [first] and [last] are `null` when it names only the size (a 416). */
    data class ContentRange(val first: Long?, val last: Long?, val size: Long?)

    /** An answer: its status, the file's version, the length of its body, and the body ([close] releases it). */
    class Response internal constructor(
        val status: Int,
        val etag: String?,
        val contentLength: Long?,
        val contentRange: ContentRange?,
        val body: InputStream?,
        private val connection: HttpURLConnection,
    ) : Closeable {
        val headers: Map<String, List<String>> get() = connection.headerFields

        override fun close() {
            runCatching { body?.close() }
            connection.disconnect()
        }
    }

    /**
     * Opens [url] from byte [position], [length] bytes or to the end when `null`. [ifRange] (the version the reader
     * already has) makes a changed file answer 200 with the whole file instead of a range of another version.
     */
    fun open(url: String, position: Long = 0, length: Long? = null, ifRange: String? = null): Response {
        if (!isNodeFileUrl(nodeOrigin, url)) throw RefusedUrl()
        val connection = URL(url).openConnection() as HttpURLConnection
        connection.instanceFollowRedirects = false
        connection.connectTimeout = connectTimeoutMs
        connection.readTimeout = readTimeoutMs
        connection.useCaches = false
        connection.setRequestProperty("Authorization", "Bearer $credential")
        connection.setRequestProperty("Accept-Encoding", "identity")
        rangeHeader(position, length)?.let { connection.setRequestProperty("Range", it) }
        ifRange?.let { connection.setRequestProperty("If-Range", it) }
        val status = try {
            connection.responseCode
        } catch (error: IOException) {
            connection.disconnect()
            throw error
        }
        if (status in 300..399) {
            connection.disconnect()
            throw RedirectRefused(status)
        }
        val body = if (status >= 400) connection.errorStream else connection.inputStream
        return Response(
            status = status,
            etag = connection.getHeaderField("ETag"),
            contentLength = connection.getHeaderField("Content-Length")?.toLongOrNull(),
            contentRange = parseContentRange(connection.getHeaderField("Content-Range")),
            body = body,
            connection = connection,
        )
    }

    companion object {
        /** `bytes=a-` or `bytes=a-b`; none for the whole file from the start. */
        fun rangeHeader(position: Long, length: Long?): String? = when {
            length != null -> "bytes=$position-${position + length - 1}"
            position > 0 -> "bytes=$position-"
            else -> null
        }

        fun parseContentRange(header: String?): ContentRange? {
            val match = CONTENT_RANGE.matchEntire(header?.trim() ?: return null) ?: return null
            val (first, last, size) = match.destructured
            return ContentRange(first.toLongOrNull(), last.toLongOrNull(), size.toLongOrNull())
        }

        /**
         * Whether [url] is a file route of the node at [nodeOrigin]: the same scheme, host and port (the scheme's default
         * when absent) and a path under `/rest/`. Anything that does not parse is not.
         */
        fun isNodeFileUrl(nodeOrigin: String, url: String): Boolean {
            val target = runCatching { URI(url) }.getOrNull() ?: return false
            val node = runCatching { URI(nodeOrigin) }.getOrNull() ?: return false
            val scheme = target.scheme?.lowercase() ?: return false
            if (scheme != "http" && scheme != "https") return false
            if (scheme != node.scheme?.lowercase()) return false
            if (target.host == null || !target.host.equals(node.host, ignoreCase = true)) return false
            if (effectivePort(target) != effectivePort(node)) return false
            if (target.rawUserInfo != null) return false
            return target.rawPath?.startsWith("/rest/") == true
        }

        private fun effectivePort(uri: URI): Int = when {
            uri.port != -1 -> uri.port
            uri.scheme.equals("https", ignoreCase = true) -> 443
            else -> 80
        }

        private val CONTENT_RANGE = Regex("""bytes (?:(\d+)-(\d+)|\*)/(\d+|\*)""")
    }
}

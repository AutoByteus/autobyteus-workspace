package org.autobyteus.mobile.media

import java.io.BufferedReader
import java.io.Closeable
import java.io.File
import java.io.InputStreamReader
import java.io.RandomAccessFile
import java.net.InetAddress
import java.net.ServerSocket
import java.net.Socket
import java.util.Collections
import kotlin.concurrent.thread

/**
 * A stand-in for a node file route on the device (autobyteus-574's contract, D-1): `/rest/files/<name>` (a video, or an
 * audio file of [contentType], autobyteus-642) answers by one byte range with a strong ETag ([version]), `If-Range` by version, 401 without the expected [credential] (any request
 * when it is `null`, as for a page's own `<video>`), 404 for any other path, at about [bytesPerSecond] (the AC's
 * throttled node). [page] is served at `/mobile/page.html`. Every request is recorded with what was sent.
 */
class RangeFileServer(
    private val file: File,
    var version: String,
    private val credential: String?,
    private val bytesPerSecond: Long = 1_500_000,
    private val page: String? = null,
    private val name: String = "videos/clip.mp4",
    private val contentType: String = "video/mp4",
) : Closeable {
    /** One request, recorded when it arrives; [sent] grows while its bytes go out. */
    class Served(val range: String?, val authorization: String?, val status: Int, val start: Long) {
        @Volatile var sent: Long = 0
    }

    private val socket = ServerSocket(0, 50, InetAddress.getByName("127.0.0.1"))
    val origin: String = "http://127.0.0.1:${socket.localPort}"
    val url: String = "$origin/rest/files/$name"
    val served: MutableList<Served> = Collections.synchronizedList(mutableListOf())

    init {
        thread(isDaemon = true) {
            while (!socket.isClosed) {
                val client = runCatching { socket.accept() }.getOrNull() ?: break
                thread(isDaemon = true) { runCatching { client.use(::serve) } }
            }
        }
    }

    private fun serve(client: Socket) {
        val reader = BufferedReader(InputStreamReader(client.getInputStream(), Charsets.ISO_8859_1))
        val target = reader.readLine()?.split(' ')?.getOrNull(1) ?: return
        val headers = mutableMapOf<String, String>()
        while (true) {
            val line = reader.readLine() ?: break
            if (line.isEmpty()) break
            headers[line.substringBefore(':').trim().lowercase()] = line.substringAfter(':').trim()
        }
        val out = client.getOutputStream()
        val authorization = headers["authorization"]
        val range = headers["range"]
        fun head(status: Int, extra: Map<String, String>, length: Long) {
            val text = buildString {
                append("HTTP/1.1 $status X\r\n")
                extra.forEach { (name, value) -> append("$name: $value\r\n") }
                append("Content-Length: $length\r\nConnection: close\r\n\r\n")
            }
            out.write(text.toByteArray(Charsets.ISO_8859_1))
        }
        if (page != null && target.substringBefore('?') == "/mobile/page.html") {
            val body = page.toByteArray(Charsets.UTF_8)
            head(200, mapOf("Content-Type" to "text/html; charset=utf-8"), body.size.toLong())
            out.write(body)
            return
        }
        if (target.substringBefore('?') != "/rest/files/$name") {
            head(404, emptyMap(), 0); served += Served(range, authorization, 404, 0); return
        }
        if (credential != null && authorization != "Bearer $credential") {
            head(401, emptyMap(), 0); served += Served(range, authorization, 401, 0); return
        }
        val size = file.length()
        val common = mapOf("Content-Type" to contentType, "Accept-Ranges" to "bytes", "ETag" to version, "Cache-Control" to "no-cache")
        val match = range?.let { Regex("""bytes=(\d+)-(\d*)""").matchEntire(it) }
        val ifRange = headers["if-range"]
        val start: Long
        val end: Long
        val ranged = match != null && (ifRange == null || ifRange == version)
        if (ranged) {
            start = match!!.groupValues[1].toLong()
            end = minOf(match.groupValues[2].toLongOrNull() ?: (size - 1), size - 1)
            head(206, common + ("Content-Range" to "bytes $start-$end/$size"), end - start + 1)
        } else {
            start = 0
            end = size - 1
            head(200, common, size)
        }
        val record = Served(range, authorization, if (ranged) 206 else 200, start).also { served += it }
        var sent = 0L
        try {
            RandomAccessFile(file, "r").use { input ->
                input.seek(start)
                val chunk = ByteArray(64 * 1024)
                val pause = chunk.size * 1000L / bytesPerSecond
                while (sent < end - start + 1) {
                    val read = input.read(chunk, 0, minOf(chunk.size.toLong(), end - start + 1 - sent).toInt())
                    if (read <= 0) break
                    out.write(chunk, 0, read)
                    sent += read
                    record.sent = sent
                    Thread.sleep(pause)
                }
            }
        } catch (_: Exception) {
            // The player closed the connection (a seek, or it has enough).
        }
    }

    override fun close() = socket.close()
}

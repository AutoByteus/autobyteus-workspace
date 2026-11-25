package org.autobyteus.mobile.media

import java.io.BufferedReader
import java.io.Closeable
import java.io.InputStreamReader
import java.net.InetAddress
import java.net.ServerSocket
import java.net.Socket
import java.util.Collections
import kotlin.concurrent.thread

/**
 * A real HTTP/1.1 server on a local socket for the JVM tests (android.jar has no `com.sun.net.httpserver`): it records
 * each request's target and headers and answers with [handle]'s status, headers and body.
 */
class TinyHttpServer(private val handle: (Request) -> Response) : Closeable {
    data class Request(val target: String, val headers: Map<String, String>) {
        val path: String get() = target.substringBefore('?')
        fun header(name: String): String? = headers[name.lowercase()]
    }

    data class Response(val status: Int, val headers: Map<String, String> = emptyMap(), val body: ByteArray = ByteArray(0))

    private val socket = ServerSocket(0, 50, InetAddress.getByName("127.0.0.1"))
    val port: Int get() = socket.localPort
    val origin: String get() = "http://127.0.0.1:$port"
    val requests: MutableList<Request> = Collections.synchronizedList(mutableListOf())

    init {
        thread(isDaemon = true) {
            while (!socket.isClosed) {
                val client = runCatching { socket.accept() }.getOrNull() ?: break
                thread(isDaemon = true) { client.use(::serve) }
            }
        }
    }

    private fun serve(client: Socket) {
        val reader = BufferedReader(InputStreamReader(client.getInputStream(), Charsets.ISO_8859_1))
        val requestLine = reader.readLine() ?: return
        val headers = mutableMapOf<String, String>()
        while (true) {
            val line = reader.readLine() ?: break
            if (line.isEmpty()) break
            headers[line.substringBefore(':').trim().lowercase()] = line.substringAfter(':').trim()
        }
        val request = Request(requestLine.split(' ')[1], headers)
        requests += request
        val response = handle(request)
        val head = buildString {
            append("HTTP/1.1 ${response.status} X\r\n")
            response.headers.forEach { (name, value) -> append("$name: $value\r\n") }
            append("Content-Length: ${response.body.size}\r\nConnection: close\r\n\r\n")
        }
        client.getOutputStream().apply {
            write(head.toByteArray(Charsets.ISO_8859_1))
            write(response.body)
            flush()
        }
    }

    override fun close() = socket.close()
}

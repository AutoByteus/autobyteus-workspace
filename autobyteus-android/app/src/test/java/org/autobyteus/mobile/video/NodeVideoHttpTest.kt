package org.autobyteus.mobile.video

import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Assert.fail
import org.junit.Before
import org.junit.Test

// autobyteus-574 D-3, D-5 (REQ-003, AC-003, design N-1): the player reads a node file by range with the credential only
// in the header, only on the node's origin, and never follows a redirect, so the credential cannot reach another host.
// Production: NodeVideoHttp over a real HttpURLConnection, against two real local HTTP servers (the node and elsewhere).
class NodeVideoHttpTest {
    private val bytes = ByteArray(1000) { (it % 256).toByte() }
    private val etag = "\"1000-1\""
    private lateinit var node: TinyHttpServer
    private lateinit var elsewhere: TinyHttpServer

    @Before
    fun start() {
        elsewhere = TinyHttpServer { TinyHttpServer.Response(200) }
        node = TinyHttpServer { request ->
            if (request.path == "/rest/redirect") TinyHttpServer.Response(302, mapOf("Location" to "${elsewhere.origin}/rest/stolen"))
            else serveRange(request)
        }
    }

    @After
    fun stop() {
        node.close()
        elsewhere.close()
    }

    @Test
    fun readsARangeWithTheCredentialInTheHeaderOnly() {
        val http = NodeVideoHttp(node.origin, "mra_phone_credential")
        http.open("${node.origin}/rest/workspaces/w/content?path=clip.mp4", position = 100, length = 50).use { answer ->
            assertEquals(206, answer.status)
            assertEquals(etag, answer.etag)
            assertEquals(50L, answer.contentLength)
            assertEquals(NodeVideoHttp.ContentRange(100, 149, 1000), answer.contentRange)
            assertTrue(answer.body!!.readBytes().contentEquals(bytes.copyOfRange(100, 150)))
        }
        val request = node.requests.single()
        assertEquals("Bearer mra_phone_credential", request.header("Authorization"))
        assertEquals("bytes=100-149", request.header("Range"))
        assertFalse(request.target.contains("mra_phone_credential"))
    }

    @Test
    fun refusesARedirectWithoutFollowingIt_theOtherHostReceivesNothing() {
        val http = NodeVideoHttp(node.origin, "mra_phone_credential")
        try {
            http.open("${node.origin}/rest/redirect")
            fail("a redirect must not be followed")
        } catch (refused: NodeVideoHttp.RedirectRefused) {
            assertEquals(302, refused.status)
        }
        assertTrue(elsewhere.requests.isEmpty())
    }

    @Test
    fun refusesAUrlOffTheNodesOriginOrOutsideItsRestRoutes_withoutSendingAnything() {
        val http = NodeVideoHttp(node.origin, "mra_phone_credential")
        for (url in listOf("${elsewhere.origin}/rest/files/a.mp4", "${node.origin}/mobile/clip.mp4", "https://127.0.0.1:${node.port}/rest/files/a.mp4")) {
            try {
                http.open(url)
                fail("refused: $url")
            } catch (_: NodeVideoHttp.RefusedUrl) {
            }
        }
        assertTrue(node.requests.isEmpty())
        assertTrue(elsewhere.requests.isEmpty())
    }

    @Test
    fun asksARangeOnlyForTheVersionItHas_aChangedFileAnswersTheWholeFile() {
        val http = NodeVideoHttp(node.origin, "mra_phone_credential")
        http.open("${node.origin}/rest/files/a.mp4", position = 10, ifRange = etag).use { assertEquals(206, it.status) }
        http.open("${node.origin}/rest/files/a.mp4", position = 10, ifRange = "\"999-0\"").use { assertEquals(200, it.status) }
        assertEquals("\"999-0\"", node.requests.last().header("If-Range"))
    }

    @Test
    fun rangeHeadersAndContentRanges() {
        assertNull(NodeVideoHttp.rangeHeader(0, null))
        assertEquals("bytes=4655936-", NodeVideoHttp.rangeHeader(4_655_936, null))
        assertEquals("bytes=0-1", NodeVideoHttp.rangeHeader(0, 2))
        assertEquals(NodeVideoHttp.ContentRange(4_655_936, 6_632_653, 6_632_654), NodeVideoHttp.parseContentRange("bytes 4655936-6632653/6632654"))
        assertEquals(NodeVideoHttp.ContentRange(null, null, 1000), NodeVideoHttp.parseContentRange("bytes */1000"))
        assertNull(NodeVideoHttp.parseContentRange("items 0-1/2"))
    }

    @Test
    fun aNodeFileUrlIsOnTheSameSchemeHostAndPortUnderRest() {
        assertTrue(NodeVideoHttp.isNodeFileUrl("http://192.168.1.20:29695", "http://192.168.1.20:29695/rest/workspaces/w/content?path=a.mp4"))
        assertTrue(NodeVideoHttp.isNodeFileUrl("https://desktop.example.ts.net", "https://DESKTOP.example.ts.net:443/rest/files/a.mp4"))
        assertFalse(NodeVideoHttp.isNodeFileUrl("https://desktop.example.ts.net", "https://desktop.example.ts.net.evil.com/rest/files/a.mp4"))
        assertFalse(NodeVideoHttp.isNodeFileUrl("http://192.168.1.20:29695", "http://192.168.1.20:29696/rest/files/a.mp4"))
        assertFalse(NodeVideoHttp.isNodeFileUrl("http://192.168.1.20:29695", "http://192.168.1.20:29695/restricted/a.mp4"))
        assertFalse(NodeVideoHttp.isNodeFileUrl("http://192.168.1.20:29695", "not a url"))
    }

    // CR-002 (API/E2E F-2): a path that resolves outside /rest/ is not a node file route, however it is spelled; dots in
    // the query (the file's own path) are fine.
    @Test
    fun aPathWithDotSegmentsIsNotANodeFileUrl_dotsInTheQueryAre() {
        val node = "http://192.168.1.20:29695"
        for (path in listOf("/rest/../graphql", "/rest/%2e%2e/graphql", "/rest/../mobile/", "/rest/a%2f..%2f..%2fgraphql",
            "/rest/./files/a.mp4", "/rest/%2E/files/a.mp4", "/rest/files%5c..%5cgraphql", "/rest/%zz/a.mp4")) {
            assertFalse(path, NodeVideoHttp.isNodeFileUrl(node, "$node$path"))
        }
        assertTrue(NodeVideoHttp.isNodeFileUrl(node, "$node/rest/workspaces/w/content?path=a%2F..%2Fb.mp4"))
        assertTrue(NodeVideoHttp.isNodeFileUrl(node, "$node/rest/files/videos/my..clip.mp4"))
    }

    @Test
    fun aDotSegmentUrlIsRefusedWithoutSendingAnything() {
        val http = NodeVideoHttp(node.origin, "mra_phone_credential")
        for (path in listOf("/rest/../graphql", "/rest/%2e%2e/graphql", "/rest/../mobile/")) {
            try {
                http.open("${node.origin}$path")
                fail("refused: $path")
            } catch (_: NodeVideoHttp.RefusedUrl) {
            }
        }
        assertTrue(node.requests.isEmpty())
    }

    /** A byte-range answer like the node's file routes: the ETag, and If-Range by version. */
    private fun serveRange(request: TinyHttpServer.Request): TinyHttpServer.Response {
        val headers = mapOf("ETag" to etag, "Accept-Ranges" to "bytes")
        val match = request.header("Range")?.let { Regex("""bytes=(\d+)-(\d*)""").matchEntire(it) }
        val ifRange = request.header("If-Range")
        if (match == null || (ifRange != null && ifRange != etag)) return TinyHttpServer.Response(200, headers, bytes)
        val first = match.groupValues[1].toInt()
        val last = match.groupValues[2].toIntOrNull() ?: (bytes.size - 1)
        return TinyHttpServer.Response(206, headers + ("Content-Range" to "bytes $first-$last/${bytes.size}"), bytes.copyOfRange(first, last + 1))
    }
}

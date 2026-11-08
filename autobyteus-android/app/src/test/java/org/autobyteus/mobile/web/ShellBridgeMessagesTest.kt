package org.autobyteus.mobile.web

import org.autobyteus.mobile.connection.NodeUrlNormalizer
import org.autobyteus.mobile.connection.SavedNodeEntry
import org.json.JSONObject
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

// AR-001: the bridge acts only on main-frame messages from the open node's origin.
class ShellBridgeMessagesTest {
    private val origin = "http://192.168.1.25:29695"

    @Test
    fun readsTheFiveMessagesFromTheMainFrameOfTheNodesOrigin() {
        assertEquals(ShellBridgeAction.Hello, read("""{"type":"hello"}"""))
        assertEquals(ShellBridgeAction.PageReady, read("""{"type":"pageReady"}"""))
        assertEquals(ShellBridgeAction.Paired("Docker node 1"), read("""{"type":"paired","nodeName":"Docker node 1"}"""))
        assertEquals(ShellBridgeAction.ShowNodeList, read("""{"type":"showNodeList"}"""))
        assertEquals(ShellBridgeAction.StartScan, read("""{"type":"startScan"}"""))
    }

    @Test
    fun ignoresSubframesOtherOriginsAndUnknownMessages() {
        assertNull(read("""{"type":"showNodeList"}""", isMainFrame = false))
        assertNull(read("""{"type":"showNodeList"}""", sourceOrigin = "http://192.168.1.25:8001"))
        assertNull(read("""{"type":"showNodeList"}""", sourceOrigin = "null"))
        // autobyteus-433 DS-006: "the page is ready" counts only from the node's own page, never a subframe or another origin
        // (WebView's error page has the origin chrome-error://chromewebdata and gets no bridge at all).
        assertNull(read("""{"type":"pageReady"}""", isMainFrame = false))
        assertNull(read("""{"type":"pageReady"}""", sourceOrigin = "http://192.168.1.25:8001"))
        assertNull(read("""{"type":"pageReady"}""", sourceOrigin = "chrome-error://chromewebdata"))
        assertNull(read("""{"type":"credential"}"""))
        assertNull(read("not json"))
        assertNull(read(null))
    }

    @Test
    fun answersHelloWithTheNodeCountTheModelNameAndTheOpenNodesName() {
        val reply = JSONObject(ShellBridgeMessages.helloReply(nodeCount = 3, deviceName = "Pixel 8", nodeName = "Test Desktop"))
        assertEquals("shell", reply.getString("type"))
        assertEquals(3, reply.getInt("nodeCount"))
        assertEquals("Pixel 8", reply.getString("deviceName"))
        assertEquals("Test Desktop", reply.getString("nodeName"))
        assertEquals(setOf("type", "nodeCount", "deviceName", "nodeName"), reply.keys().asSequence().toSet())
    }

    @Test
    fun anOpenNodeWithNoNameIsAnsweredWithAnEmptyNameNotItsAddress() {
        // autobyteus-433: the bridge sends the entry's known name, so a typed address's host never reaches the page.
        val typed = SavedNodeEntry.fromNormalized(NodeUrlNormalizer.normalize("https://test-desktop.example-tailnet.ts.net"))
        val reply = ShellBridgeMessages.helloReply(nodeCount = 1, deviceName = "Pixel 8", nodeName = typed.knownName.orEmpty())
        assertEquals("", JSONObject(reply).getString("nodeName"))
        assertEquals(false, reply.contains("example-tailnet"))
    }

    @Test
    fun theOriginRuleIsTheEntrysOriginIncludingAPlainHttpIpv4AndPort() {
        val http = SavedNodeEntry.fromNormalized(NodeUrlNormalizer.normalize("http://192.168.1.25:29695/mobile"))
        val https = SavedNodeEntry.fromNormalized(NodeUrlNormalizer.normalize("https://desktop.example-tailnet.ts.net/mobile"))
        assertEquals("http://192.168.1.25:29695", ShellBridge.allowedOriginRule(http))
        assertEquals("https://desktop.example-tailnet.ts.net", ShellBridge.allowedOriginRule(https))
    }

    private fun read(data: String?, sourceOrigin: String = origin, isMainFrame: Boolean = true) =
        ShellBridgeMessages.read(data, sourceOrigin, isMainFrame, expectedOrigin = origin)
}

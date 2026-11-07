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
    fun readsTheFourMessagesFromTheMainFrameOfTheNodesOrigin() {
        assertEquals(ShellBridgeAction.Hello, read("""{"type":"hello"}"""))
        assertEquals(ShellBridgeAction.Paired("Docker node 1"), read("""{"type":"paired","nodeName":"Docker node 1"}"""))
        assertEquals(ShellBridgeAction.ShowNodeList, read("""{"type":"showNodeList"}"""))
        assertEquals(ShellBridgeAction.StartScan, read("""{"type":"startScan"}"""))
    }

    @Test
    fun ignoresSubframesOtherOriginsAndUnknownMessages() {
        assertNull(read("""{"type":"showNodeList"}""", isMainFrame = false))
        assertNull(read("""{"type":"showNodeList"}""", sourceOrigin = "http://192.168.1.25:8001"))
        assertNull(read("""{"type":"showNodeList"}""", sourceOrigin = "null"))
        assertNull(read("""{"type":"credential"}"""))
        assertNull(read("not json"))
        assertNull(read(null))
    }

    @Test
    fun answersHelloWithTheNodeCountAndTheModelName() {
        val reply = JSONObject(ShellBridgeMessages.helloReply(nodeCount = 3, deviceName = "Pixel 8"))
        assertEquals("shell", reply.getString("type"))
        assertEquals(3, reply.getInt("nodeCount"))
        assertEquals("Pixel 8", reply.getString("deviceName"))
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

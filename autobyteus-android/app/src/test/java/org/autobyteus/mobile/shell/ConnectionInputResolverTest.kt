package org.autobyteus.mobile.shell

import org.autobyteus.mobile.connection.ConnectionFailureKind
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test
import java.nio.charset.StandardCharsets
import java.util.Base64

// Synthetic node and code; nothing real.
class ConnectionInputResolverTest {
    private val resolver = ConnectionInputResolver()

    @Test
    fun aScannedHttpPairingLinkNeedsNoSecondAcknowledgement() {
        // E-09: the desktop made the trust decision; the scan connects without the phone's checkbox (REQ-010).
        val link = "http://192.168.1.25:29695/mobile?pairing=${payload("http://192.168.1.25:29695", "Docker node 1")}"
        val resolved = resolver.resolvePairingLink(link)!!

        assertTrue(resolved.entry.isHttp)
        assertTrue(resolved.entry.httpAcknowledged)
        assertEquals("Docker node 1", resolved.entry.displayName)
        assertEquals(link, resolved.webViewUrl)
    }

    @Test
    fun aPlainAddressIsNotAPairingLink() {
        assertNull(resolver.resolvePairingLink("http://192.168.1.25:29695/mobile"))
        assertNull(resolver.resolvePairingLink("not a link"))
        assertNull(resolver.resolvePairingLink(""))
    }

    @Test
    fun aTypedPlainHttpAddressNeedsTheTick() {
        val refused = resolver.resolveTypedAddress("http://192.168.1.25:29695", httpAcknowledged = false)
        assertEquals(ConnectionFailureKind.HttpNeedsAcknowledgement, (refused as ConnectionInputResolution.Failure).diagnostic.kind)

        val accepted = resolver.resolveTypedAddress("http://192.168.1.25:29695", httpAcknowledged = true)
        assertTrue((accepted as ConnectionInputResolution.Success).entry.httpAcknowledged)

        val https = resolver.resolveTypedAddress("https://node.example.com", httpAcknowledged = false)
        assertEquals("https://node.example.com/mobile", (https as ConnectionInputResolution.Success).webViewUrl)
    }

    private fun payload(serverBaseUrl: String, serverName: String): String {
        val json = """{"version":1,"serverBaseUrl":"$serverBaseUrl","pairingCode":"sample","expiresAt":"2026-11-07T00:05:00.000Z","serverName":"$serverName"}"""
        return Base64.getUrlEncoder().withoutPadding().encodeToString(json.toByteArray(StandardCharsets.UTF_8))
    }
}

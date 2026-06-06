package org.autobyteus.mobile.connection

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test
import java.nio.charset.StandardCharsets
import java.util.Base64

class PairingLinkParserTest {
    @Test
    fun parsesPairingUrlAndSavesCleanStableMobileUrl() {
        val payload = payloadParam("https://Desktop.Tailnet.ts.net", "Desk")
        val parsed = PairingLinkParser.parse("https://desktop.tailnet.ts.net/mobile?pairing=$payload")

        assertTrue(parsed.hasPairingPayload)
        assertEquals("https://desktop.tailnet.ts.net/mobile?pairing=$payload", parsed.webViewUrl)
        assertEquals("https://desktop.tailnet.ts.net/mobile", parsed.profile.mobileUrl)
        assertEquals("Desk", parsed.profile.displayName)
    }

    @Test
    fun parsesDockerNodePairingPayloadUsingAdvertisedHttpsOrigin() {
        val payload = payloadParam("https://docker.tailnet.ts.net", "AutoByteus Docker Node")
        val parsed = PairingLinkParser.parse("https://docker.tailnet.ts.net/mobile?pairing=$payload")

        assertTrue(parsed.hasPairingPayload)
        assertEquals("https://docker.tailnet.ts.net/mobile?pairing=$payload", parsed.webViewUrl)
        assertEquals("https://docker.tailnet.ts.net/mobile", parsed.profile.mobileUrl)
        assertEquals("AutoByteus Docker Node", parsed.profile.displayName)
    }

    @Test
    fun parsesGeneratedPrivateHttpPairingUrlAndLeavesAcknowledgementPending() {
        val payload = payloadParam("http://192.168.1.25:29695", "Home Desktop")
        val parsed = PairingLinkParser.parse("http://192.168.1.25:29695/mobile?pairing=$payload")

        assertTrue(parsed.hasPairingPayload)
        assertEquals("http://192.168.1.25:29695/mobile?pairing=$payload", parsed.webViewUrl)
        assertEquals("http://192.168.1.25:29695", parsed.profile.baseUrl)
        assertEquals("http://192.168.1.25:29695/mobile", parsed.profile.mobileUrl)
        assertTrue(parsed.profile.isHttp)
        assertFalse(parsed.profile.httpAcknowledged)
        assertEquals("Home Desktop", parsed.profile.displayName)
    }

    @Test
    fun parsesRawJsonPairingPayload() {
        val json = """{"version":1,"serverBaseUrl":"http://desktop.local:29695","pairingCode":"abc","expiresAt":"2026-05-21T00:00:00.000Z","serverName":"Home Desktop"}"""
        val parsed = PairingLinkParser.parse(json)

        assertTrue(parsed.hasPairingPayload)
        assertEquals("http://desktop.local:29695/mobile", parsed.profile.mobileUrl)
        assertTrue(parsed.webViewUrl.startsWith("http://desktop.local:29695/mobile?pairing="))
        assertEquals("Home Desktop", parsed.profile.displayName)
    }

    @Test
    fun treatsPlainNodeUrlAsNonPairingInput() {
        val parsed = PairingLinkParser.parse("desktop.tailnet-name.ts.net/mobile")

        assertFalse(parsed.hasPairingPayload)
        assertEquals("https://desktop.tailnet-name.ts.net/mobile", parsed.webViewUrl)
    }

    private fun payloadParam(serverBaseUrl: String, serverName: String): String {
        val json = """{"version":1,"serverBaseUrl":"$serverBaseUrl","pairingCode":"abc","expiresAt":"2026-05-21T00:00:00.000Z","serverName":"$serverName"}"""
        return Base64.getUrlEncoder().withoutPadding().encodeToString(json.toByteArray(StandardCharsets.UTF_8))
    }
}

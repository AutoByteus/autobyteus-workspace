package org.autobyteus.mobile.connection

import org.junit.Assert.assertEquals
import org.junit.Assert.assertThrows
import org.junit.Test

class NodeUrlNormalizerTest {
    @Test
    fun normalizesTailscaleMobileUrlToCleanStableUrls() {
        val normalized = NodeUrlNormalizer.normalize("https://Desktop.Example.ts.net/mobile?pairing=one-time")

        assertEquals("https", normalized.scheme)
        assertEquals("desktop.example.ts.net", normalized.host)
        assertEquals("https://desktop.example.ts.net", normalized.baseUrl)
        assertEquals("https://desktop.example.ts.net/mobile", normalized.mobileUrl)
        assertEquals("https://desktop.example.ts.net/rest/remote-access/status", normalized.statusUrl)
    }

    @Test
    fun defaultsBareHostToHttps() {
        val normalized = NodeUrlNormalizer.normalize("desktop.tailnet-name.ts.net/mobile")

        assertEquals("https://desktop.tailnet-name.ts.net", normalized.baseUrl)
        assertEquals("https://desktop.tailnet-name.ts.net/mobile", normalized.mobileUrl)
    }

    @Test
    fun preservesPrivateHttpPort() {
        val normalized = NodeUrlNormalizer.normalize("http://192.168.1.25:29695/rest/remote-access/status")

        assertEquals("http", normalized.scheme)
        assertEquals(29695, normalized.port)
        assertEquals("http://192.168.1.25:29695/mobile", normalized.mobileUrl)
    }

    @Test
    fun rejectsUnknownSchemesAndPaths() {
        assertThrows(NodeUrlNormalizationException::class.java) {
            NodeUrlNormalizer.normalize("ftp://desktop.tailnet-name.ts.net/mobile")
        }
        assertThrows(NodeUrlNormalizationException::class.java) {
            NodeUrlNormalizer.normalize("https://desktop.tailnet-name.ts.net/workspace")
        }
    }
}

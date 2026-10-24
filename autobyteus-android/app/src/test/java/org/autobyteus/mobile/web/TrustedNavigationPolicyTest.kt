package org.autobyteus.mobile.web

import org.autobyteus.mobile.connection.NodeUrlNormalizer
import org.autobyteus.mobile.connection.SavedNodeEntry
import org.junit.Assert.assertEquals
import org.junit.Test

class TrustedNavigationPolicyTest {
    private val entry = SavedNodeEntry.fromNormalized(
        NodeUrlNormalizer.normalize("https://desktop.tailnet-name.ts.net/mobile"),
    )

    @Test
    fun allowsExpectedSameOriginAutoByteusPaths() {
        assertEquals(
            NavigationDecisionType.AllowInWebView,
            TrustedNavigationPolicy.classify("https://desktop.tailnet-name.ts.net/mobile?pairing=abc", entry).type,
        )
        assertEquals(
            NavigationDecisionType.AllowInWebView,
            TrustedNavigationPolicy.classify("https://desktop.tailnet-name.ts.net/rest/remote-access/status", entry).type,
        )
        assertEquals(
            NavigationDecisionType.AllowInWebView,
            TrustedNavigationPolicy.classify("https://desktop.tailnet-name.ts.net/graphql", entry).type,
        )
    }

    @Test
    fun externalizesDifferentOriginsWithoutSubstringMatching() {
        assertEquals(
            NavigationDecisionType.OpenExternal,
            TrustedNavigationPolicy.classify("https://desktop.tailnet-name.ts.net.evil.example/mobile", entry).type,
        )
        assertEquals(
            NavigationDecisionType.OpenExternal,
            TrustedNavigationPolicy.classify("https://example.org/mobile", entry).type,
        )
    }

    @Test
    fun blocksUnsafeSchemesAndSameOriginDesktopPaths() {
        assertEquals(
            NavigationDecisionType.Block,
            TrustedNavigationPolicy.classify("javascript:alert(1)", entry).type,
        )
        assertEquals(
            NavigationDecisionType.Block,
            TrustedNavigationPolicy.classify("https://desktop.tailnet-name.ts.net/workspace", entry).type,
        )
    }
}

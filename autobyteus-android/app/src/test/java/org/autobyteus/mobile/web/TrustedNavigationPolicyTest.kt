package org.autobyteus.mobile.web

import org.autobyteus.mobile.connection.NodeUrlNormalizer
import org.autobyteus.mobile.connection.SavedNodeProfile
import org.junit.Assert.assertEquals
import org.junit.Test

class TrustedNavigationPolicyTest {
    private val profile = SavedNodeProfile.fromNormalized(
        NodeUrlNormalizer.normalize("https://desktop.tailnet-name.ts.net/mobile"),
    )

    @Test
    fun allowsExpectedSameOriginAutoByteusPaths() {
        assertEquals(
            NavigationDecisionType.AllowInWebView,
            TrustedNavigationPolicy.classify("https://desktop.tailnet-name.ts.net/mobile?pairing=abc", profile).type,
        )
        assertEquals(
            NavigationDecisionType.AllowInWebView,
            TrustedNavigationPolicy.classify("https://desktop.tailnet-name.ts.net/rest/remote-access/status", profile).type,
        )
        assertEquals(
            NavigationDecisionType.AllowInWebView,
            TrustedNavigationPolicy.classify("https://desktop.tailnet-name.ts.net/graphql", profile).type,
        )
    }

    @Test
    fun externalizesDifferentOriginsWithoutSubstringMatching() {
        assertEquals(
            NavigationDecisionType.OpenExternal,
            TrustedNavigationPolicy.classify("https://desktop.tailnet-name.ts.net.evil.example/mobile", profile).type,
        )
        assertEquals(
            NavigationDecisionType.OpenExternal,
            TrustedNavigationPolicy.classify("https://example.org/mobile", profile).type,
        )
    }

    @Test
    fun blocksUnsafeSchemesAndSameOriginDesktopPaths() {
        assertEquals(
            NavigationDecisionType.Block,
            TrustedNavigationPolicy.classify("javascript:alert(1)", profile).type,
        )
        assertEquals(
            NavigationDecisionType.Block,
            TrustedNavigationPolicy.classify("https://desktop.tailnet-name.ts.net/workspace", profile).type,
        )
    }
}

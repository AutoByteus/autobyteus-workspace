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
            TrustedNavigationPolicy.classify("https://desktop.tailnet-name.ts.net/mobile?pairing=abc", entry, isMainFrame = true).type,
        )
        assertEquals(
            NavigationDecisionType.AllowInWebView,
            TrustedNavigationPolicy.classify("https://desktop.tailnet-name.ts.net/mobile/", entry, isMainFrame = true).type,
        )
    }

    // autobyteus-450 REQ-004 / AC-005: the page navigating itself to a node route stays on the page, with no screen.
    @Test
    fun keepsThePageForAMainFrameNodeRoute() {
        for (url in listOf(
            "https://desktop.tailnet-name.ts.net/rest/runs/run-1/context-files/ctx_1__photo.png",
            "https://desktop.tailnet-name.ts.net/rest/remote-access/status",
            "https://desktop.tailnet-name.ts.net/graphql",
            "https://desktop.tailnet-name.ts.net/graphql/ws",
        )) {
            assertEquals(url, NavigationDecisionType.KeepPage, TrustedNavigationPolicy.classify(url, entry, isMainFrame = true).type)
        }
        // A subframe keeps the allowlist (a 426 preview frame of a workspace file).
        assertEquals(
            NavigationDecisionType.AllowInWebView,
            TrustedNavigationPolicy.classify("https://desktop.tailnet-name.ts.net/rest/runs/run-1/context-files/ctx_1__photo.png", entry, isMainFrame = false).type,
        )
        // Other origins and other same-origin paths keep their decisions.
        assertEquals(NavigationDecisionType.OpenExternal, TrustedNavigationPolicy.classify("https://example.org/rest/x", entry, isMainFrame = true).type)
        assertEquals(NavigationDecisionType.Block, TrustedNavigationPolicy.classify("https://desktop.tailnet-name.ts.net/restore", entry, isMainFrame = true).type)
    }

    @Test
    fun externalizesDifferentOriginsWithoutSubstringMatching() {
        assertEquals(
            NavigationDecisionType.OpenExternal,
            TrustedNavigationPolicy.classify("https://desktop.tailnet-name.ts.net.evil.example/mobile", entry, isMainFrame = true).type,
        )
        assertEquals(
            NavigationDecisionType.OpenExternal,
            TrustedNavigationPolicy.classify("https://example.org/mobile", entry, isMainFrame = true).type,
        )
    }

    @Test
    fun blocksUnsafeSchemesAndSameOriginDesktopPaths() {
        assertEquals(
            NavigationDecisionType.Block,
            TrustedNavigationPolicy.classify("javascript:alert(1)", entry, isMainFrame = true).type,
        )
        assertEquals(
            NavigationDecisionType.Block,
            TrustedNavigationPolicy.classify("https://desktop.tailnet-name.ts.net/workspace", entry, isMainFrame = true).type,
        )
    }

    // autobyteus-426 REQ-007 / AC-007: the node page's own blob: preview frame loads; nothing else blob: does.
    @Test
    fun allowsABlobSubframeOfTheOpenNodeOnly() {
        val lan = SavedNodeEntry.fromNormalized(NodeUrlNormalizer.normalize("http://10.0.0.2:29695/mobile"))
        val preview = "blob:http://10.0.0.2:29695/6f1c2c1e-9d7b-4f43-9a52-0d1f6b5a2b11"
        assertEquals(NavigationDecisionType.AllowInWebView, TrustedNavigationPolicy.classify(preview, lan, isMainFrame = false).type)
        assertEquals(NavigationDecisionType.Block, TrustedNavigationPolicy.classify(preview, lan, isMainFrame = true).type)
        assertEquals(NavigationDecisionType.Block, TrustedNavigationPolicy.classify("blob:http://evil:80/6f1c", lan, isMainFrame = false).type)
        assertEquals(NavigationDecisionType.Block, TrustedNavigationPolicy.classify("blob:http://10.0.0.2:29696/6f1c", lan, isMainFrame = false).type)
        assertEquals(NavigationDecisionType.Block, TrustedNavigationPolicy.classify("blob:https://10.0.0.2:29695/6f1c", lan, isMainFrame = false).type)
        assertEquals(NavigationDecisionType.Block, TrustedNavigationPolicy.classify("blob:null/6f1c", lan, isMainFrame = false).type)
        assertEquals(NavigationDecisionType.Block, TrustedNavigationPolicy.classify("blob:file:///6f1c", lan, isMainFrame = false).type)
        assertEquals(
            NavigationDecisionType.AllowInWebView,
            TrustedNavigationPolicy.classify("blob:https://desktop.tailnet-name.ts.net/0a1b", entry, isMainFrame = false).type,
        )
    }

    @Test
    fun keepsOtherSchemesBlockedAndOtherOriginsExternalInSubframesToo() {
        for (url in listOf("file:///sdcard/x.html", "javascript:alert(1)", "data:text/html,hi", "content://x/y")) {
            assertEquals(url, NavigationDecisionType.Block, TrustedNavigationPolicy.classify(url, entry, isMainFrame = false).type)
        }
        assertEquals(NavigationDecisionType.OpenExternal, TrustedNavigationPolicy.classify("https://example.org/", entry, isMainFrame = false).type)
        assertEquals(
            NavigationDecisionType.AllowInWebView,
            TrustedNavigationPolicy.classify("https://desktop.tailnet-name.ts.net/rest/workspaces/w/static/a.html", entry, isMainFrame = false).type,
        )
    }
}

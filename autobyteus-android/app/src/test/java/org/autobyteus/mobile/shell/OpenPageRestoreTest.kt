package org.autobyteus.mobile.shell

import org.autobyteus.mobile.connection.NodeUrlNormalizer
import org.autobyteus.mobile.connection.SavedNodeEntry
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

// autobyteus-426 REQ-003 / AC-004: the restore decision after process death.
class OpenPageRestoreTest {
    private val office = SavedNodeEntry.fromNormalized(NodeUrlNormalizer.normalize("http://10.0.0.2:29695/mobile"))
    private val tailnet = SavedNodeEntry.fromNormalized(NodeUrlNormalizer.normalize("https://desktop.tailnet-name.ts.net/mobile"))
    private val saved = listOf(office, tailnet)
    private val filesScreen = "http://10.0.0.2:29695/mobile?screen=files&run=agent-1&file=src%2Fmain.ts"

    @Test
    fun reopensTheSavedNodeOnTheSamePage() {
        assertEquals(OpenPageRestore.Restored(office, filesScreen), OpenPageRestore.restore(office.id, filesScreen, saved))
        assertEquals(
            OpenPageRestore.Restored(tailnet, "https://desktop.tailnet-name.ts.net/mobile/"),
            OpenPageRestore.restore(tailnet.id, "https://desktop.tailnet-name.ts.net/mobile/", saved),
        )
    }

    @Test
    fun restoresNothingForARemovedNode() {
        assertNull(OpenPageRestore.restore(office.id, filesScreen, listOf(tailnet)))
    }

    @Test
    fun restoresNothingTheNavigationPolicyWouldNotLoadForThatNode() {
        assertNull(OpenPageRestore.restore(tailnet.id, filesScreen, saved))
        assertNull(OpenPageRestore.restore(office.id, "https://example.org/mobile", saved))
        assertNull(OpenPageRestore.restore(office.id, "javascript:alert(1)", saved))
        assertNull(OpenPageRestore.restore(office.id, "blob:http://10.0.0.2:29695/0a1b", saved))
        assertNull(OpenPageRestore.restore(office.id, "http://10.0.0.2:29695/workspace", saved))
    }

    @Test
    fun restoresOnlyPagesUnderMobile() {
        assertNull(OpenPageRestore.restore(office.id, "http://10.0.0.2:29695/rest/remote-access/status", saved))
        assertNull(OpenPageRestore.restore(office.id, "http://10.0.0.2:29695/graphql", saved))
        assertNull(OpenPageRestore.restore(office.id, "http://10.0.0.2:29695/mobilefoo", saved))
    }

    @Test
    fun restoresNothingWithoutASavedPage() {
        assertNull(OpenPageRestore.restore(null, null, saved))
        assertNull(OpenPageRestore.restore(office.id, null, saved))
        assertNull(OpenPageRestore.restore("", filesScreen, saved))
    }

    // CRR-003 F-API-002: a share-started task recreated after process death does not re-run its old pairing link.
    @Test
    fun actsOnASharedTextOnlyOnAFreshStart() {
        val link = "http://10.0.0.2:29695/mobile?pairing=abc"
        assertEquals(link, OpenPageRestore.sharedTextToHandle(link, recreated = false))
        assertNull(OpenPageRestore.sharedTextToHandle(link, recreated = true))
        assertNull(OpenPageRestore.sharedTextToHandle("   ", recreated = false))
        assertNull(OpenPageRestore.sharedTextToHandle(null, recreated = false))
    }
}

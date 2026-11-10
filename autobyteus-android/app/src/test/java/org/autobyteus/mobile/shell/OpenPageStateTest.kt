package org.autobyteus.mobile.shell

import org.autobyteus.mobile.connection.ConnectionDiagnosticMapper
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

// autobyteus-433 DS-004/DS-006 (SR-005): only the node's page reporting itself ready shows the page or clears its
// overlay. The sequences are those of CRR-002's log (evidence/emulator-r2/API-08-cause-onPageFinished-twice.log): WebView
// load callbacks no longer take part, so a failed load's second onPageFinished has nothing to act on.
class OpenPageStateTest {
    private val entryId = "http://test-desktop.example-tailnet.ts.net"
    private val cantReach = ConnectionDiagnosticMapper.pageLoadFailed("Test Desktop")
    private val http502 = ConnectionDiagnosticMapper.fromHttpStatus(502, "Office Mac")

    /** A page that has loaded and shows (CRR-002 §1). */
    private fun loadedPage() = OpenPageState().apply {
        open(entryId)
        assertTrue("the first ready shows the page", onPageReady(entryId, onWebScreen = false))
    }

    @Test
    fun aFailedReloadOverALoadedPageKeepsTheOverlay_crr002_s2_s8() {
        val state = loadedPage()
        state.onDiagnostic(cantReach) // reload refused (§2) or dropped (§8): two onPageFinished, no pageReady
        assertEquals(cantReach, state.overlay)
        assertTrue(state.firstPageShown)
    }

    @Test
    fun retryWhileDownOverALoadedPageKeepsTheOverlay_crr002_s3() {
        val state = loadedPage()
        state.onDiagnostic(ConnectionDiagnosticMapper.linkBlocked())
        state.onDiagnostic(cantReach) // Retry while the node is down
        assertEquals(cantReach, state.overlay)
        state.onDiagnostic(cantReach) // Retry again
        assertEquals(cantReach, state.overlay)
    }

    @Test
    fun aFreshWebViewKeepsTheOverlayThroughFailuresAndShowsThePageOnRecovery_crr002_s4_to_s7() {
        val state = OpenPageState().apply { open(entryId) }
        state.onDiagnostic(http502) // §4 first load 502
        assertEquals(http502, state.overlay)
        state.onDiagnostic(cantReach) // §5 Retry, dropped; §6 Retry, refused
        assertEquals(cantReach, state.overlay)
        assertFalse(state.firstPageShown)
        assertTrue(state.onPageReady(entryId, onWebScreen = true)) // §7 Retry after recovery
        assertNull(state.overlay)
        assertTrue(state.firstPageShown)
    }

    @Test
    fun readyOnThePageClosesTheOverlay_readyElsewhereClearsItWithoutPullingTheUserBack() {
        val onPage = loadedPage().apply { onDiagnostic(cantReach) }
        assertTrue(onPage.onPageReady(entryId, onWebScreen = true))
        assertNull(onPage.overlay)

        val onSwitchNode = loadedPage().apply { onDiagnostic(cantReach) }
        assertFalse(onSwitchNode.onPageReady(entryId, onWebScreen = false))
        assertNull("the next return to the page shows it without the overlay", onSwitchNode.overlay)
    }

    @Test
    fun aReturnFromSwitchNodeKeepsTheOverlay() {
        // Nothing but a ready clears it: leaving to Switch node and coming back (showPage) renders it again.
        val state = loadedPage().apply { onDiagnostic(cantReach) }
        assertEquals(cantReach, state.overlay)
    }

    @Test
    fun aReadyLoadWithoutAnOverlayOnALoadedPageChangesNothingVisible() {
        val state = loadedPage()
        assertTrue("on the page: shown again, which it already is", state.onPageReady(entryId, onWebScreen = true))
        assertFalse("elsewhere: not pulled back", state.onPageReady(entryId, onWebScreen = false))
    }

    @Test
    fun aReadyFromAnEntryThatIsNotOpenIsIgnored() {
        val state = OpenPageState().apply { open(entryId); onDiagnostic(cantReach) }
        assertFalse(state.onPageReady("http://192.168.1.25:29695", onWebScreen = true))
        assertEquals(cantReach, state.overlay)
        assertFalse(state.firstPageShown)

        state.close()
        assertFalse(state.onPageReady(entryId, onWebScreen = true))
    }

    @Test
    fun openingOrClosingAPageStartsClean() {
        val state = loadedPage().apply { onDiagnostic(cantReach) }
        state.open("http://192.168.1.25:29695")
        assertNull(state.overlay)
        assertFalse(state.firstPageShown)
        state.onDiagnostic(cantReach)
        state.close()
        assertNull(state.overlay)
        assertFalse(state.firstPageShown)
    }
}

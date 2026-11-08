package org.autobyteus.mobile.web

import org.junit.Assert.assertEquals
import org.junit.Test

// autobyteus-433 DS-006 (SR-004): the callback orders measured on WebView 124 (evidence/IMP-09-sr003-load-order-premise.log).
// "started" is onPageStarted, which does not take part in the decision; it is kept in the sequences to show the order.
class MainFrameLoadOutcomeTest {
    private fun loadedAfter(outcome: MainFrameLoadOutcome, vararg events: String): List<Boolean> = events.mapNotNull { event ->
        when (event) {
            "started" -> null
            "mainError" -> null.also { outcome.onError(isMainFrame = true) }
            "subError" -> null.also { outcome.onError(isMainFrame = false) }
            "finished" -> outcome.onFinished()
            else -> error(event)
        }
    }

    @Test
    fun aNetworkFailureIsNotALoad_errorAfterStarted() {
        assertEquals(listOf(false), loadedAfter(MainFrameLoadOutcome(), "started", "mainError", "finished"))
    }

    @Test
    fun anHttpErrorIsNotALoad_errorBeforeStarted() {
        assertEquals(listOf(false), loadedAfter(MainFrameLoadOutcome(), "mainError", "started", "finished"))
    }

    @Test
    fun aSuccessIsALoad() {
        assertEquals(listOf(true), loadedAfter(MainFrameLoadOutcome(), "started", "finished"))
    }

    @Test
    fun aSubResourceErrorDoesNotDecideThePage() {
        // The 502 page's favicon fails after onPageFinished; a page whose image fails during the load is still loaded.
        assertEquals(listOf(true), loadedAfter(MainFrameLoadOutcome(), "started", "subError", "finished", "subError"))
        val outcome = MainFrameLoadOutcome()
        assertEquals(listOf(false, true), loadedAfter(outcome, "mainError", "started", "finished", "subError", "started", "finished"))
    }

    @Test
    fun eachLoadIsDecidedOnItsOwn_aFailedLoadThenRetryThatSucceeds() {
        // Reload while the node is down (HTTP and network), then Retry once it is back: only the last one shows the page.
        val outcome = MainFrameLoadOutcome()
        assertEquals(
            listOf(false, false, true, true),
            loadedAfter(outcome, "mainError", "started", "finished", "started", "mainError", "finished", "started", "finished", "started", "finished"),
        )
    }
}

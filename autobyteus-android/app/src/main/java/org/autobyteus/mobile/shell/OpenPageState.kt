package org.autobyteus.mobile.shell

import org.autobyteus.mobile.connection.ConnectionDiagnostic

/**
 * The open node page's state (autobyteus-433 DS-004, DS-006), apart from the activity so it can be checked on the JVM.
 *
 * A diagnostic becomes the page's [overlay]; while it is set, every render of the page hides the WebView under it, so
 * neither the page nor WebView's own error page (which prints the URL) can show. Only the node's page reporting itself
 * mounted (the bridge's `pageReady`) clears it: WebView's error page has no bridge, so this fails closed. WebView's load
 * callbacks do not take part (a failed load can report `onPageFinished` twice).
 */
class OpenPageState {
    private var openEntryId: String? = null

    /** The open page's error overlay, or `null`. */
    var overlay: ConnectionDiagnostic? = null
        private set

    /** Whether the open entry's page has been shown once (until then the app shows "Connected to …"). */
    var firstPageShown = false
        private set

    /** A node's page opens (a new web host). */
    fun open(entryId: String) {
        openEntryId = entryId
        overlay = null
        firstPageShown = false
    }

    /** The page is closed. */
    fun close() {
        openEntryId = null
        overlay = null
        firstPageShown = false
    }

    fun onDiagnostic(diagnostic: ConnectionDiagnostic) {
        overlay = diagnostic
    }

    /**
     * The page of [entryId] reports itself mounted. Returns whether to show the page now: its first time, or while the
     * user is on it (which closes an overlay). Elsewhere (Switch node) the overlay is cleared and the next return
     * shows the page. A page of an entry that is no longer open changes nothing.
     */
    fun onPageReady(entryId: String, onWebScreen: Boolean): Boolean {
        if (entryId != openEntryId) return false
        overlay = null
        val show = !firstPageShown || onWebScreen
        firstPageShown = true
        return show
    }
}

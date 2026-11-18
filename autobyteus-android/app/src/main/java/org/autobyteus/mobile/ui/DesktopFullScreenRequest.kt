package org.autobyteus.mobile.ui

/**
 * The open document's desktop full-screen request (autobyteus-432 D-2, as merged with autobyteus-433 DEC-011): it is
 * applied only while the plain page shows. A page reopened in full screen asks during its setup, before it reports
 * itself ready, so the request is remembered rather than applied under "Connected to …" or under an overlay, and
 * applied when the plain page appears. `off` is applied at once in every state. A new main-frame document or the web
 * host's end clears the request; any other screen (including the page under an overlay) turns full screen off but
 * keeps the request, so a return to the plain page turns it back on.
 */
class DesktopFullScreenRequest(private val controller: DesktopFullScreenController) {
    private var documentWantsFullScreen = false

    /** The bridge's `desktopFullScreen(on)`; [plainPageOnScreen]: the open page shows with no overlay. */
    fun onRequest(on: Boolean, plainPageOnScreen: Boolean) {
        documentWantsFullScreen = on
        if (!on) controller.reset() else if (plainPageOnScreen) controller.setOn(true)
    }

    /** A new main-frame document starts (`onPageStarted`), or the page's web host is destroyed. */
    fun clear() {
        documentWantsFullScreen = false
        controller.reset()
    }

    /** Any screen but the plain page was shown, the page under an overlay included. */
    fun otherScreenShown() = controller.reset()

    /** The plain page's root was just shown. */
    fun plainPageShown() {
        when {
            !documentWantsFullScreen -> controller.reset()
            // Already on (the request came while the page showed): only the new root is darkened.
            controller.isOn -> controller.pageShown()
            // Turning on darkens the shown root itself; pageShown() on top would darken it twice and lose its colour.
            else -> controller.setOn(true)
        }
    }
}

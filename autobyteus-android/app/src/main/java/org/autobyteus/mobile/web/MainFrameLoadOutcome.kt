package org.autobyteus.mobile.web

/**
 * Whether the open page's main-frame load succeeded (autobyteus-433 DS-006), apart from the WebView so it can be
 * checked on the JVM. WebView calls `onPageFinished` for a failed load too (its own error page, which prints the URL,
 * finished loading), so a finished load is not a loaded page.
 *
 * A main-frame error marks the load failed; `onPageFinished` decides and resets the mark. The mark is not reset when a
 * load starts: on WebView 124 an HTTP error arrives before `onPageStarted`, a network error after it
 * (`evidence/IMP-09-sr003-load-order-premise.log`). A sub-resource error does not decide the page.
 */
class MainFrameLoadOutcome {
    private var failed = false

    /** `onReceivedError` / `onReceivedHttpError`. */
    fun onError(isMainFrame: Boolean) {
        if (isMainFrame) failed = true
    }

    /** `onPageFinished`: `true` when the load that just finished succeeded. The next load starts unmarked. */
    fun onFinished(): Boolean {
        val loaded = !failed
        failed = false
        return loaded
    }
}

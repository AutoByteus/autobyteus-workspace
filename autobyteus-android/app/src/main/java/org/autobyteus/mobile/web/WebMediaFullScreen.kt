package org.autobyteus.mobile.web

import android.app.Activity
import android.graphics.Color
import android.view.View
import android.view.ViewGroup
import android.webkit.WebChromeClient
import android.widget.FrameLayout
import org.autobyteus.mobile.ui.DesktopFullScreenController

/**
 * An in-page player in full screen (autobyteus-574 D-6, DEC-004): WebView hands over the player's own view, shown over
 * the whole window in landscape with the system bars hidden (432's [DesktopFullScreenController]); leaving it (the
 * player's button, Back, or the page going away) gives the view back and turns the phone to portrait. The player keeps
 * its position: it is the same element.
 */
class WebMediaFullScreen(
    private val activity: Activity,
    private val fullScreen: DesktopFullScreenController,
) {
    private var shown: View? = null
    private var callback: WebChromeClient.CustomViewCallback? = null

    val isShowing: Boolean get() = shown != null

    fun show(view: View, onHidden: WebChromeClient.CustomViewCallback) {
        if (shown != null) {
            onHidden.onCustomViewHidden()
            return
        }
        view.setBackgroundColor(Color.BLACK)
        decor().addView(view, FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT))
        shown = view
        callback = onHidden
        fullScreen.setOn(true)
    }

    /** Leaves full screen; nothing when it is not on. */
    fun hide() {
        val view = shown ?: return
        shown = null
        decor().removeView(view)
        fullScreen.setOn(false)
        callback?.also { callback = null }?.onCustomViewHidden()
    }

    private fun decor(): FrameLayout = activity.window.decorView as FrameLayout
}

package org.autobyteus.mobile.ui

import android.app.Activity
import android.content.pm.ActivityInfo
import android.graphics.drawable.ColorDrawable
import android.view.ViewGroup
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsCompat
import androidx.core.view.WindowInsetsControllerCompat

/**
 * Desktop full screen in the app (autobyteus-432): while the page's VNC Viewer is in full screen, the phone turns
 * to landscape on either side by its sensor, even when the user locked rotation (as games do), Android's status
 * and navigation bars are hidden (a swipe from the edge shows them for a moment), and the shown screen's root is
 * dark like the viewer's stage, so the display-cutout padding the root keeps (`SystemBarInsets`) does not show as
 * a light strip. Off hands the orientation back to the phone's own setting (MainActivity declares no orientation
 * of its own), shows the bars and gives the root its own background back. The only owner of the activity's
 * requested orientation, bar visibility and root background for desktop full screen; `setOn` is idempotent. No
 * permission is involved.
 *
 * Whether it is on is read from the window, not remembered: Android keeps an activity's requested orientation
 * when it ends the app in the background, so a recreated activity can start in landscape, and the next reset
 * (the page starting) must still hand it back.
 */
class DesktopFullScreenController(private val display: Display) {
    /** What the controller changes on the activity's window and its shown screen. */
    interface Display {
        var requestedOrientation: Int
        fun setSystemBarsHidden(hidden: Boolean)
        /** The shown screen root's background colour; `null` when it has no plain colour of its own. */
        var rootBackgroundColor: Int?
    }

    /** The shown root's own background while it is darkened. */
    private var rootBackgroundBefore: Int? = null

    val isOn: Boolean get() = display.requestedOrientation == ActivityInfo.SCREEN_ORIENTATION_SENSOR_LANDSCAPE

    fun setOn(on: Boolean) {
        if (on == isOn) return
        if (on) {
            display.requestedOrientation = ActivityInfo.SCREEN_ORIENTATION_SENSOR_LANDSCAPE
            display.setSystemBarsHidden(true)
            darkenRoot()
        } else {
            display.requestedOrientation = ActivityInfo.SCREEN_ORIENTATION_UNSPECIFIED
            display.setSystemBarsHidden(false)
            rootBackgroundBefore?.let { display.rootBackgroundColor = it }
            rootBackgroundBefore = null
        }
    }

    fun reset() = setOn(false)

    /**
     * The page's screen was shown while on (the first page of a node reopened in full screen, which asks before it
     * finishes loading): its new root gets the dark background too, and its own background is the one given back.
     */
    fun pageShown() {
        if (isOn) darkenRoot()
    }

    /** A root without a plain colour of its own is left as it is: there would be nothing to give back. */
    private fun darkenRoot() {
        val own = display.rootBackgroundColor ?: return
        rootBackgroundBefore = own
        display.rootBackgroundColor = STAGE_COLOR
    }

    companion object {
        /** The viewer's stage colour (`MobileNodeDesktop`, `#1e1e1e`). */
        const val STAGE_COLOR: Int = 0xFF1E1E1E.toInt()

        fun forActivity(activity: Activity): DesktopFullScreenController = DesktopFullScreenController(ActivityDisplay(activity))
    }

    private class ActivityDisplay(private val activity: Activity) : Display {
        override var requestedOrientation: Int
            get() = activity.requestedOrientation
            set(value) { activity.requestedOrientation = value }

        override fun setSystemBarsHidden(hidden: Boolean) {
            val window = activity.window
            val bars = WindowCompat.getInsetsController(window, window.decorView)
            if (hidden) {
                bars.systemBarsBehavior = WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
                bars.hide(WindowInsetsCompat.Type.systemBars())
            } else {
                bars.show(WindowInsetsCompat.Type.systemBars())
            }
        }

        override var rootBackgroundColor: Int?
            get() = (root()?.background as? ColorDrawable)?.color
            set(value) { if (value != null) root()?.setBackgroundColor(value) }

        private fun root() = activity.findViewById<ViewGroup>(android.R.id.content)?.getChildAt(0)
    }
}

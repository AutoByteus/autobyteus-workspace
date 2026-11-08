package org.autobyteus.mobile.ui

import android.app.Activity
import android.content.pm.ActivityInfo
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsCompat
import androidx.core.view.WindowInsetsControllerCompat

/**
 * Desktop full screen in the app (autobyteus-432): while the page's VNC Viewer is in full screen, the phone turns
 * to landscape on either side by its sensor, even when the user locked rotation (as games do), and Android's status
 * and navigation bars are hidden (a swipe from the edge shows them for a moment). Off hands the orientation back to
 * the phone's own setting (MainActivity declares no orientation of its own) and shows the bars. The only owner of
 * the activity's requested orientation and bar visibility; `setOn` is idempotent. No permission is involved.
 *
 * Whether it is on is read from the window, not remembered: Android keeps an activity's requested orientation
 * when it ends the app in the background, so a recreated activity can start in landscape, and the next reset
 * (the page starting) must still hand it back.
 */
class DesktopFullScreenController(private val display: Display) {
    /** What the controller changes on the activity's window. */
    interface Display {
        var requestedOrientation: Int
        fun setSystemBarsHidden(hidden: Boolean)
    }

    val isOn: Boolean get() = display.requestedOrientation == ActivityInfo.SCREEN_ORIENTATION_SENSOR_LANDSCAPE

    fun setOn(on: Boolean) {
        if (on == isOn) return
        display.requestedOrientation =
            if (on) ActivityInfo.SCREEN_ORIENTATION_SENSOR_LANDSCAPE else ActivityInfo.SCREEN_ORIENTATION_UNSPECIFIED
        display.setSystemBarsHidden(on)
    }

    fun reset() = setOn(false)

    companion object {
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
    }
}

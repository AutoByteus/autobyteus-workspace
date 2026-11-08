package org.autobyteus.mobile.ui

import android.app.Activity
import android.content.pm.ActivityInfo
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsCompat
import androidx.core.view.WindowInsetsControllerCompat

/**
 * Desktop full screen in the app (autobyteus-432): while the page's VNC Viewer is in full screen, the phone turns
 * to landscape on either side by its sensor, even when the user locked rotation (as games do), and Android's status
 * and navigation bars are hidden (a swipe from the edge shows them for a moment). Off gives back the orientation the
 * activity asked for before (by default none: the phone's own setting) and the bars. The only owner of the
 * activity's requested orientation and bar visibility; `setOn` is idempotent. No permission is involved.
 */
class DesktopFullScreenController(private val display: Display) {
    /** What the controller changes on the activity's window. */
    interface Display {
        var requestedOrientation: Int
        fun setSystemBarsHidden(hidden: Boolean)
    }

    /** The orientation to give back; set exactly while desktop full screen is on. */
    private var orientationBefore: Int? = null

    val isOn: Boolean get() = orientationBefore != null

    fun setOn(on: Boolean) {
        if (on == isOn) return
        if (on) {
            orientationBefore = display.requestedOrientation
            display.requestedOrientation = ActivityInfo.SCREEN_ORIENTATION_SENSOR_LANDSCAPE
            display.setSystemBarsHidden(true)
        } else {
            display.requestedOrientation = orientationBefore ?: ActivityInfo.SCREEN_ORIENTATION_UNSPECIFIED
            orientationBefore = null
            display.setSystemBarsHidden(false)
        }
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

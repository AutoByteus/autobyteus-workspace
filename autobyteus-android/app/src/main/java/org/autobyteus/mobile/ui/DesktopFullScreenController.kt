package org.autobyteus.mobile.ui

import android.app.Activity
import android.content.pm.ActivityInfo
import android.graphics.drawable.ColorDrawable
import android.os.Build
import android.view.ViewGroup
import android.view.WindowManager
import androidx.annotation.RequiresApi
import androidx.core.view.ViewCompat
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsCompat
import androidx.core.view.WindowInsetsControllerCompat

/**
 * Desktop full screen in the app (autobyteus-432): while the page's VNC Viewer is in full screen, the phone turns
 * to landscape on either side by its sensor, even when the user locked rotation (as games do), Android's status
 * and navigation bars are hidden (a swipe from the edge shows them for a moment), the window lays out into the
 * display cutout and the page's root keeps only the keyboard's inset (`SystemBarInsets`, autobyteus-435 REQ-004), so
 * the picture uses the whole screen width, and the shown screen's root is dark like the viewer's stage. Off hands the
 * orientation back to the phone's own setting (MainActivity declares no orientation of its own), shows the bars,
 * lays the window out as before and gives the root its insets and its own background back. The only owner of the
 * activity's requested orientation, bar visibility, cutout layout and root background for desktop full screen;
 * `setOn` is idempotent. No permission is involved.
 *
 * The cutout layout mode exists from API 28 ([sdkInt]); on API 35 a targetSdk 35 window lays out into the cutout
 * already (Android forces it), and before 28 there is nothing to ask for.
 *
 * Whether it is on is read from the window, not remembered: Android keeps an activity's requested orientation
 * when it ends the app in the background, so a recreated activity can start in landscape, and the next reset
 * (the page starting) must still hand it back.
 */
class DesktopFullScreenController(private val display: Display, private val sdkInt: Int) {
    /** What the controller changes on the activity's window and its shown screen. */
    interface Display {
        var requestedOrientation: Int
        fun setSystemBarsHidden(hidden: Boolean)
        /** The shown screen root's background colour; `null` when it has no plain colour of its own. */
        var rootBackgroundColor: Int?
        /** The window's `layoutInDisplayCutoutMode` (`WindowManager.LayoutParams`). */
        @RequiresApi(Build.VERSION_CODES.P)
        fun setLayoutInDisplayCutoutMode(mode: Int)
        /** Asks the shown screen's root to take its insets again (its padding follows full screen). */
        fun reapplyInsets()
    }

    /** The shown root's own background while it is darkened. */
    private var rootBackgroundBefore: Int? = null

    val isOn: Boolean get() = display.requestedOrientation == ActivityInfo.SCREEN_ORIENTATION_SENSOR_LANDSCAPE

    fun setOn(on: Boolean) {
        if (on == isOn) return
        if (on) {
            display.requestedOrientation = ActivityInfo.SCREEN_ORIENTATION_SENSOR_LANDSCAPE
            display.setSystemBarsHidden(true)
            layOutInCutout(true)
            darkenRoot()
        } else {
            display.requestedOrientation = ActivityInfo.SCREEN_ORIENTATION_UNSPECIFIED
            display.setSystemBarsHidden(false)
            layOutInCutout(false)
            rootBackgroundBefore?.let { display.rootBackgroundColor = it }
            rootBackgroundBefore = null
        }
        display.reapplyInsets()
    }

    /** API 28+: into the short-edge cutout while on, the default layout off; nothing before 28 (no cutout API). */
    private fun layOutInCutout(on: Boolean) {
        if (sdkInt < Build.VERSION_CODES.P) return
        @Suppress("NewApi") // Guarded by sdkInt, the running platform's level (forActivity).
        display.setLayoutInDisplayCutoutMode(
            if (on) WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES
            else WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_DEFAULT,
        )
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

        fun forActivity(activity: Activity): DesktopFullScreenController =
            DesktopFullScreenController(ActivityDisplay(activity), Build.VERSION.SDK_INT)
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

        @RequiresApi(Build.VERSION_CODES.P)
        override fun setLayoutInDisplayCutoutMode(mode: Int) {
            val window = activity.window
            window.attributes = window.attributes.also { it.layoutInDisplayCutoutMode = mode }
        }

        override fun reapplyInsets() {
            root()?.let { ViewCompat.requestApplyInsets(it) }
        }

        private fun root() = activity.findViewById<ViewGroup>(android.R.id.content)?.getChildAt(0)
    }
}

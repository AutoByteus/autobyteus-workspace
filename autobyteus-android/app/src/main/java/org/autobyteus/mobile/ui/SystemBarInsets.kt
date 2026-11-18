package org.autobyteus.mobile.ui

import android.view.View
import androidx.core.view.ViewCompat
import androidx.core.view.WindowInsetsCompat

/**
 * Keeps a shell screen clear of the status bar, the navigation bar, a display cutout and the keyboard
 * (autobyteus-277 REQ-011). Android 15 draws a targetSdk 35 app edge-to-edge, so the screen's root takes
 * these insets as its padding: the web page's bars and composer stay visible and tappable, and the composer
 * stays above the keyboard. Where Android still keeps the bars apart (before 15), the window has already
 * taken them and the root gets no inset, so nothing moves.
 *
 * The open page in desktop full screen (autobyteus-435 REQ-004, [fullScreen] true) keeps only the keyboard's inset:
 * its bars are hidden and the page lays out into the cutout, so the viewer's picture uses the whole screen width.
 * The full-screen controller applies the insets again whenever it turns full screen on or off.
 */
object SystemBarInsets {
    val TYPES: Int = WindowInsetsCompat.Type.systemBars() or
        WindowInsetsCompat.Type.displayCutout() or
        WindowInsetsCompat.Type.ime()

    /** The insets a root is padded by: all of [TYPES], or in desktop full screen only the keyboard. */
    fun typesFor(fullScreen: Boolean): Int = if (fullScreen) WindowInsetsCompat.Type.ime() else TYPES

    fun pad(root: View, fullScreen: () -> Boolean = { false }) {
        ViewCompat.setOnApplyWindowInsetsListener(root) { view, insets ->
            val padding = insets.getInsets(typesFor(fullScreen()))
            view.setPadding(padding.left, padding.top, padding.right, padding.bottom)
            WindowInsetsCompat.CONSUMED
        }
        ViewCompat.requestApplyInsets(root)
    }
}

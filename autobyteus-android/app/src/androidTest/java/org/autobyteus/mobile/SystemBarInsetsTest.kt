package org.autobyteus.mobile

import android.widget.FrameLayout
import androidx.core.graphics.Insets
import androidx.core.view.ViewCompat
import androidx.core.view.WindowInsetsCompat
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import org.autobyteus.mobile.ui.SystemBarInsets
import org.junit.Assert.assertEquals
import org.junit.Assume.assumeTrue
import org.junit.Test
import org.junit.runner.RunWith

/** autobyteus-277 REQ-011: a shell screen's root is padded by the system bars, the cutout and the keyboard. */
@RunWith(AndroidJUnit4::class)
class SystemBarInsetsTest {
    private val context = InstrumentationRegistry.getInstrumentation().targetContext

    /**
     * These tests dispatch hand-built insets of separate types (cutout, keyboard). Before API 30 a platform WindowInsets
     * carries only system-window insets, so a cutout or keyboard type set here does not survive the dispatch (measured on
     * API 29). The real window's keyboard and cutout are checked by WebShellWindowInsetsTest on every level.
     */
    private fun assumeSeparateInsetTypes() = assumeTrue("separate inset types need API 30+", android.os.Build.VERSION.SDK_INT >= 30)

    private fun insets(statusTop: Int, navBottom: Int, cutoutLeft: Int, imeBottom: Int): WindowInsetsCompat =
        WindowInsetsCompat.Builder()
            .setInsets(WindowInsetsCompat.Type.statusBars(), Insets.of(0, statusTop, 0, 0))
            .setInsets(WindowInsetsCompat.Type.navigationBars(), Insets.of(0, 0, 0, navBottom))
            .setInsets(WindowInsetsCompat.Type.displayCutout(), Insets.of(cutoutLeft, 0, 0, 0))
            .setInsets(WindowInsetsCompat.Type.ime(), Insets.of(0, 0, 0, imeBottom))
            .build()

    @Test
    fun padsTheRootWithTheBarsAndTheCutout() {
        assumeSeparateInsetTypes()
        InstrumentationRegistry.getInstrumentation().runOnMainSync {
            val root = FrameLayout(context)
            SystemBarInsets.pad(root)
            ViewCompat.dispatchApplyWindowInsets(root, insets(statusTop = 74, navBottom = 48, cutoutLeft = 12, imeBottom = 0))
            assertEquals(listOf(12, 74, 0, 48), listOf(root.paddingLeft, root.paddingTop, root.paddingRight, root.paddingBottom))
        }
    }

    @Test
    fun theKeyboardRaisesTheBottomAboveIt() {
        assumeSeparateInsetTypes()
        InstrumentationRegistry.getInstrumentation().runOnMainSync {
            val root = FrameLayout(context)
            SystemBarInsets.pad(root)
            ViewCompat.dispatchApplyWindowInsets(root, insets(statusTop = 74, navBottom = 48, cutoutLeft = 0, imeBottom = 900))
            assertEquals(900, root.paddingBottom)
            ViewCompat.dispatchApplyWindowInsets(root, insets(statusTop = 74, navBottom = 48, cutoutLeft = 0, imeBottom = 0))
            assertEquals(48, root.paddingBottom)
        }
    }

    @Test
    fun withoutInsetsNothingMoves() {
        InstrumentationRegistry.getInstrumentation().runOnMainSync {
            val root = FrameLayout(context)
            SystemBarInsets.pad(root)
            ViewCompat.dispatchApplyWindowInsets(root, insets(statusTop = 0, navBottom = 0, cutoutLeft = 0, imeBottom = 0))
            assertEquals(listOf(0, 0, 0, 0), listOf(root.paddingLeft, root.paddingTop, root.paddingRight, root.paddingBottom))
        }
    }

    // autobyteus-435 REQ-004: in desktop full screen the page lays out into the cutout; only the keyboard pads its root.
    @Test
    fun inDesktopFullScreenOnlyTheKeyboardPadsTheRoot() {
        assumeSeparateInsetTypes()
        InstrumentationRegistry.getInstrumentation().runOnMainSync {
            val root = FrameLayout(context)
            var fullScreen = true
            SystemBarInsets.pad(root) { fullScreen }
            ViewCompat.dispatchApplyWindowInsets(root, insets(statusTop = 74, navBottom = 48, cutoutLeft = 136, imeBottom = 0))
            assertEquals(listOf(0, 0, 0, 0), listOf(root.paddingLeft, root.paddingTop, root.paddingRight, root.paddingBottom))
            ViewCompat.dispatchApplyWindowInsets(root, insets(statusTop = 74, navBottom = 48, cutoutLeft = 136, imeBottom = 600))
            assertEquals(600, root.paddingBottom)
            fullScreen = false
            ViewCompat.dispatchApplyWindowInsets(root, insets(statusTop = 74, navBottom = 48, cutoutLeft = 136, imeBottom = 0))
            assertEquals(listOf(136, 74, 0, 48), listOf(root.paddingLeft, root.paddingTop, root.paddingRight, root.paddingBottom))
        }
    }
}

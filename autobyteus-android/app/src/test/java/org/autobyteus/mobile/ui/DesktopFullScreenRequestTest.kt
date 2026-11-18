package org.autobyteus.mobile.ui

import android.content.pm.ActivityInfo
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

// autobyteus-432 D-2 with autobyteus-433 DEC-011: the open document's full-screen request is applied only while the
// plain page shows; off at once; a new document or the host's end clears it; any other screen turns it off.
class DesktopFullScreenRequestTest {
    private val pageBackground = 0xFFF8FAFC.toInt()

    private class FakeDisplay : DesktopFullScreenController.Display {
        override var requestedOrientation: Int = ActivityInfo.SCREEN_ORIENTATION_UNSPECIFIED
        override var rootBackgroundColor: Int? = 0xFFF8FAFC.toInt()
        override fun setSystemBarsHidden(hidden: Boolean) {}
        override fun setLayoutInDisplayCutoutMode(mode: Int) {}
        override fun setDecorFitsSystemWindows(fits: Boolean) {}
        override fun reapplyInsets() {}
    }

    private val display = FakeDisplay()
    private val controller = DesktopFullScreenController(display, sdkInt = 35)
    private val request = DesktopFullScreenRequest(controller)

    /** A screen's new root replaces the shown one (setContentView): it has its own light background. */
    private fun newRoot() {
        display.rootBackgroundColor = pageBackground
    }

    private fun showPlainPage() {
        newRoot()
        request.plainPageShown()
    }

    private fun showOtherScreen() {
        newRoot()
        request.otherScreenShown()
    }

    @Test
    fun aRequestBeforeThePageIsReadyIsAppliedWhenThePlainPageShows() {
        // A page reopened at full=1 asks during setup, while "Connected to …" still shows.
        request.onRequest(on = true, plainPageOnScreen = false)
        assertFalse(controller.isOn)
        showPlainPage() // pageReady
        assertTrue(controller.isOn)
        assertEquals(ActivityInfo.SCREEN_ORIENTATION_SENSOR_LANDSCAPE, display.requestedOrientation)
        assertEquals(DesktopFullScreenController.STAGE_COLOR, display.rootBackgroundColor)
    }

    @Test
    fun aRequestUnderAnOverlayIsHeldAndAppliedAfterThePageIsReady() {
        showOtherScreen() // the page under an overlay
        request.onRequest(on = true, plainPageOnScreen = false)
        assertFalse(controller.isOn)
        showOtherScreen() // the overlay rendered again (Retry while down)
        assertFalse(controller.isOn)
        showPlainPage() // pageReady clears the overlay
        assertTrue(controller.isOn)
    }

    @Test
    fun aNewDocumentClearsTheRequest() {
        request.onRequest(on = true, plainPageOnScreen = false)
        request.clear() // onPageStarted of the next document
        showPlainPage()
        assertFalse(controller.isOn)
    }

    @Test
    fun anyOtherScreenTurnsFullScreenOffAndAReturnToThePlainPageTurnsItBackOn() {
        showPlainPage()
        request.onRequest(on = true, plainPageOnScreen = true)
        assertTrue(controller.isOn)
        showOtherScreen() // Switch node, or an overlay
        assertFalse(controller.isOn)
        assertEquals(ActivityInfo.SCREEN_ORIENTATION_UNSPECIFIED, display.requestedOrientation)
        assertEquals(pageBackground, display.rootBackgroundColor)
        showPlainPage() // back to the page whose document still asks
        assertTrue(controller.isOn)
    }

    @Test
    fun offIsAppliedAtOnceInEveryState() {
        showPlainPage()
        request.onRequest(on = true, plainPageOnScreen = true)
        request.onRequest(on = false, plainPageOnScreen = true)
        assertFalse(controller.isOn)
        showPlainPage()
        assertFalse(controller.isOn)

        request.onRequest(on = true, plainPageOnScreen = false)
        request.onRequest(on = false, plainPageOnScreen = false)
        showPlainPage()
        assertFalse(controller.isOn)
    }

    @Test
    fun theWebHostsEndTurnsItOffAndClearsTheRequest() {
        showPlainPage()
        request.onRequest(on = true, plainPageOnScreen = true)
        request.clear()
        assertFalse(controller.isOn)
        showPlainPage()
        assertFalse(controller.isOn)
    }

    @Test
    fun thePlainPageShownAgainWhileOnDarkensItsNewRootOnceAndOffGivesItsOwnColourBack() {
        showPlainPage()
        request.onRequest(on = true, plainPageOnScreen = true)
        showPlainPage() // the page re-rendered while on (a pageReady on the page): new light root
        assertEquals(DesktopFullScreenController.STAGE_COLOR, display.rootBackgroundColor)
        request.onRequest(on = false, plainPageOnScreen = true)
        assertEquals(pageBackground, display.rootBackgroundColor)
    }

    @Test
    fun turningOnWhenThePlainPageShowsDarkensTheRootOnlyOnce() {
        request.onRequest(on = true, plainPageOnScreen = false)
        showPlainPage()
        request.onRequest(on = false, plainPageOnScreen = true)
        assertEquals("the root's own colour comes back, not the stage colour", pageBackground, display.rootBackgroundColor)
    }
}

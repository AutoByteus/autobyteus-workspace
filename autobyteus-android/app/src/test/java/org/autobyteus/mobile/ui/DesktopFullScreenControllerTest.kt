package org.autobyteus.mobile.ui

import android.content.pm.ActivityInfo
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

// autobyteus-432 REQ-001, REQ-002: landscape, hidden bars and a dark root while on; the phone's own setting, the bars
// and the root's own background when off.
class DesktopFullScreenControllerTest {
    private val pageBackground = 0xFFF8FAFC.toInt()

    private class FakeDisplay(
        override var requestedOrientation: Int,
        override var rootBackgroundColor: Int? = 0xFFF8FAFC.toInt(),
    ) : DesktopFullScreenController.Display {
        val barsHidden = mutableListOf<Boolean>()
        override fun setSystemBarsHidden(hidden: Boolean) {
            barsHidden += hidden
        }
    }

    @Test
    fun onTurnsToSensorLandscapeAndHidesTheBars() {
        val display = FakeDisplay(ActivityInfo.SCREEN_ORIENTATION_UNSPECIFIED)
        val controller = DesktopFullScreenController(display)
        controller.setOn(true)
        assertEquals(ActivityInfo.SCREEN_ORIENTATION_SENSOR_LANDSCAPE, display.requestedOrientation)
        assertEquals(listOf(true), display.barsHidden)
        assertEquals(DesktopFullScreenController.STAGE_COLOR, display.rootBackgroundColor)
        assertTrue(controller.isOn)
    }

    @Test
    fun offHandsTheOrientationBackToThePhonesSettingAndShowsTheBars() {
        val display = FakeDisplay(ActivityInfo.SCREEN_ORIENTATION_UNSPECIFIED)
        val controller = DesktopFullScreenController(display)
        controller.setOn(true)
        controller.setOn(false)
        assertEquals(ActivityInfo.SCREEN_ORIENTATION_UNSPECIFIED, display.requestedOrientation)
        assertEquals(listOf(true, false), display.barsHidden)
        assertEquals(pageBackground, display.rootBackgroundColor)
        assertFalse(controller.isOn)
    }

    @Test
    fun isIdempotent() {
        val display = FakeDisplay(ActivityInfo.SCREEN_ORIENTATION_UNSPECIFIED)
        val controller = DesktopFullScreenController(display)
        controller.setOn(true)
        controller.setOn(true)
        controller.setOn(false)
        controller.setOn(false)
        assertEquals(listOf(true, false), display.barsHidden)
        assertEquals(ActivityInfo.SCREEN_ORIENTATION_UNSPECIFIED, display.requestedOrientation)
    }

    @Test
    fun resetIsOffAndDoesNothingWhenAlreadyOff() {
        val display = FakeDisplay(ActivityInfo.SCREEN_ORIENTATION_UNSPECIFIED)
        val controller = DesktopFullScreenController(display)
        controller.reset()
        assertEquals(emptyList<Boolean>(), display.barsHidden)
        controller.setOn(true)
        controller.reset()
        assertEquals(ActivityInfo.SCREEN_ORIENTATION_UNSPECIFIED, display.requestedOrientation)
        assertEquals(listOf(true, false), display.barsHidden)
    }

    // AC-004: after Android ended the app in the background, the recreated activity still asks for landscape.
    @Test
    fun aNewControllerOnAWindowLeftInLandscapeHandsItBackOnReset() {
        val display = FakeDisplay(ActivityInfo.SCREEN_ORIENTATION_SENSOR_LANDSCAPE)
        val controller = DesktopFullScreenController(display)
        assertTrue(controller.isOn)
        controller.reset()
        assertEquals(ActivityInfo.SCREEN_ORIENTATION_UNSPECIFIED, display.requestedOrientation)
        assertEquals(listOf(false), display.barsHidden)
        // The new activity's root was never darkened, so its background is left as it is.
        assertEquals(pageBackground, display.rootBackgroundColor)
    }

    // AR-432-005: the page shown while on (a node reopened in full screen) is darkened, and its own background returns.
    @Test
    fun aPageShownWhileOnIsDarkenedAndGetsItsOwnBackgroundBack() {
        val connectingBackground = 0xFFFFFFFF.toInt()
        val display = FakeDisplay(ActivityInfo.SCREEN_ORIENTATION_UNSPECIFIED, rootBackgroundColor = connectingBackground)
        val controller = DesktopFullScreenController(display)
        controller.setOn(true)
        display.rootBackgroundColor = pageBackground // the page's screen replaces the connecting screen
        controller.pageShown()
        assertEquals(DesktopFullScreenController.STAGE_COLOR, display.rootBackgroundColor)
        controller.setOn(false)
        assertEquals(pageBackground, display.rootBackgroundColor)
    }

    @Test
    fun aPageShownWhileOffKeepsItsBackground() {
        val display = FakeDisplay(ActivityInfo.SCREEN_ORIENTATION_UNSPECIFIED)
        DesktopFullScreenController(display).pageShown()
        assertEquals(pageBackground, display.rootBackgroundColor)
    }

    @Test
    fun aRootWithoutAPlainColourOfItsOwnIsLeftAsItIs() {
        val display = FakeDisplay(ActivityInfo.SCREEN_ORIENTATION_UNSPECIFIED, rootBackgroundColor = null)
        val controller = DesktopFullScreenController(display)
        controller.setOn(true)
        assertEquals(null, display.rootBackgroundColor)
        controller.setOn(false)
        assertEquals(null, display.rootBackgroundColor)
    }
}

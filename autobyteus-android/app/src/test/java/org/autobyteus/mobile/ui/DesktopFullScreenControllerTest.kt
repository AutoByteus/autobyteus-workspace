package org.autobyteus.mobile.ui

import android.content.pm.ActivityInfo
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

// autobyteus-432 REQ-001, REQ-002: landscape and hidden bars while on; the orientation from before when off.
class DesktopFullScreenControllerTest {
    private class FakeDisplay(override var requestedOrientation: Int) : DesktopFullScreenController.Display {
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
        assertTrue(controller.isOn)
    }

    @Test
    fun offGivesBackTheOrientationFromBeforeAndShowsTheBars() {
        val unspecified = FakeDisplay(ActivityInfo.SCREEN_ORIENTATION_UNSPECIFIED)
        DesktopFullScreenController(unspecified).apply { setOn(true); setOn(false) }
        assertEquals(ActivityInfo.SCREEN_ORIENTATION_UNSPECIFIED, unspecified.requestedOrientation)
        assertEquals(listOf(true, false), unspecified.barsHidden)

        val portrait = FakeDisplay(ActivityInfo.SCREEN_ORIENTATION_PORTRAIT)
        val controller = DesktopFullScreenController(portrait)
        controller.setOn(true)
        controller.setOn(false)
        assertEquals(ActivityInfo.SCREEN_ORIENTATION_PORTRAIT, portrait.requestedOrientation)
        assertFalse(controller.isOn)
    }

    @Test
    fun isIdempotentSoARepeatedOnKeepsTheFirstOrientationToGiveBack() {
        val display = FakeDisplay(ActivityInfo.SCREEN_ORIENTATION_UNSPECIFIED)
        val controller = DesktopFullScreenController(display)
        controller.setOn(true)
        controller.setOn(true)
        assertEquals(listOf(true), display.barsHidden)
        controller.setOn(false)
        controller.setOn(false)
        assertEquals(ActivityInfo.SCREEN_ORIENTATION_UNSPECIFIED, display.requestedOrientation)
        assertEquals(listOf(true, false), display.barsHidden)
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
}

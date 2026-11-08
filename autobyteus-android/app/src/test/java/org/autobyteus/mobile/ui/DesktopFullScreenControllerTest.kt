package org.autobyteus.mobile.ui

import android.content.pm.ActivityInfo
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

// autobyteus-432 REQ-001, REQ-002: landscape and hidden bars while on; the phone's own setting and the bars when off.
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
    fun offHandsTheOrientationBackToThePhonesSettingAndShowsTheBars() {
        val display = FakeDisplay(ActivityInfo.SCREEN_ORIENTATION_UNSPECIFIED)
        val controller = DesktopFullScreenController(display)
        controller.setOn(true)
        controller.setOn(false)
        assertEquals(ActivityInfo.SCREEN_ORIENTATION_UNSPECIFIED, display.requestedOrientation)
        assertEquals(listOf(true, false), display.barsHidden)
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
    }
}

package org.autobyteus.mobile.ui

import android.content.pm.ActivityInfo
import android.view.WindowManager
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

// autobyteus-432 REQ-001, REQ-002: landscape, hidden bars and a dark root while on; the phone's own setting, the bars
// and the root's own background when off.
class DesktopFullScreenControllerTest {
    private val pageBackground = 0xFFF8FAFC.toInt()

    private class FakeDisplay(
        initialOrientation: Int,
        override var rootBackgroundColor: Int? = 0xFFF8FAFC.toInt(),
    ) : DesktopFullScreenController.Display {
        val barsHidden = mutableListOf<Boolean>()
        val cutoutModes = mutableListOf<Int>()
        val decorFits = mutableListOf<Boolean>()
        var insetsApplied = 0
        /** Every window change in order, to check the sequence inside setOn. */
        val calls = mutableListOf<String>()
        override var requestedOrientation: Int = initialOrientation
            set(value) { field = value; calls += "orientation" }
        override fun setSystemBarsHidden(hidden: Boolean) {
            barsHidden += hidden
            calls += "bars"
        }
        override fun setLayoutInDisplayCutoutMode(mode: Int) {
            cutoutModes += mode
            calls += "cutout"
        }
        override fun setDecorFitsSystemWindows(fits: Boolean) {
            decorFits += fits
            calls += "decor"
        }
        override fun reapplyInsets() {
            insetsApplied += 1
            calls += "insets"
        }
    }

    @Test
    fun onTurnsToSensorLandscapeAndHidesTheBars() {
        val display = FakeDisplay(ActivityInfo.SCREEN_ORIENTATION_UNSPECIFIED)
        val controller = DesktopFullScreenController(display, sdkInt = 35)
        controller.setOn(true)
        assertEquals(ActivityInfo.SCREEN_ORIENTATION_SENSOR_LANDSCAPE, display.requestedOrientation)
        assertEquals(listOf(true), display.barsHidden)
        assertEquals(DesktopFullScreenController.STAGE_COLOR, display.rootBackgroundColor)
        assertTrue(controller.isOn)
    }

    @Test
    fun offHandsTheOrientationBackToThePhonesSettingAndShowsTheBars() {
        val display = FakeDisplay(ActivityInfo.SCREEN_ORIENTATION_UNSPECIFIED)
        val controller = DesktopFullScreenController(display, sdkInt = 35)
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
        val controller = DesktopFullScreenController(display, sdkInt = 35)
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
        val controller = DesktopFullScreenController(display, sdkInt = 35)
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
        val controller = DesktopFullScreenController(display, sdkInt = 35)
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
        val controller = DesktopFullScreenController(display, sdkInt = 35)
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
        DesktopFullScreenController(display, sdkInt = 35).pageShown()
        assertEquals(pageBackground, display.rootBackgroundColor)
    }

    @Test
    fun aRootWithoutAPlainColourOfItsOwnIsLeftAsItIs() {
        val display = FakeDisplay(ActivityInfo.SCREEN_ORIENTATION_UNSPECIFIED, rootBackgroundColor = null)
        val controller = DesktopFullScreenController(display, sdkInt = 35)
        controller.setOn(true)
        assertEquals(null, display.rootBackgroundColor)
        controller.setOn(false)
        assertEquals(null, display.rootBackgroundColor)
    }

    // autobyteus-435 REQ-004, AC-004-1: in full screen the window lays out into the cutout (API 28–34 must ask for it;
    // API 35 with targetSdk 35 forces it), and the root's insets are applied again on each change (keyboard only while on).
    @Test
    fun onApi28To34TheWindowLaysOutIntoTheShortEdgeCutoutWhileOnAndBackToDefaultOff() {
        for (api in 28..34) {
            val display = FakeDisplay(ActivityInfo.SCREEN_ORIENTATION_UNSPECIFIED)
            val controller = DesktopFullScreenController(display, sdkInt = api)
            controller.setOn(true)
            controller.setOn(true)
            controller.setOn(false)
            assertEquals("API $api", listOf(
                WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES,
                WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_DEFAULT,
            ), display.cutoutModes)
            assertEquals("API $api", 2, display.insetsApplied)
        }
    }

    @Test
    fun onApi35TheModeIsAskedForTooAndTheInsetsFollow() {
        val display = FakeDisplay(ActivityInfo.SCREEN_ORIENTATION_UNSPECIFIED)
        val controller = DesktopFullScreenController(display, sdkInt = 35)
        controller.setOn(true)
        assertEquals(listOf(WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES), display.cutoutModes)
        assertEquals(1, display.insetsApplied)
    }

    @Test
    fun beforeApi28ThereIsNoCutoutModeToAskForAndTheRestIsAsBefore() {
        for (api in 26..27) {
            val display = FakeDisplay(ActivityInfo.SCREEN_ORIENTATION_UNSPECIFIED)
            val controller = DesktopFullScreenController(display, sdkInt = api)
            controller.setOn(true)
            controller.setOn(false)
            assertEquals(emptyList<Int>(), display.cutoutModes)
            assertEquals(listOf(true, false), display.barsHidden)
            assertEquals(2, display.insetsApplied)
        }
    }

    @Test
    fun aResetWhileOffChangesNothingAndAppliesNoInsets() {
        val display = FakeDisplay(ActivityInfo.SCREEN_ORIENTATION_UNSPECIFIED)
        DesktopFullScreenController(display, sdkInt = 30).reset()
        assertEquals(emptyList<Int>(), display.cutoutModes)
        assertEquals(0, display.insetsApplied)
    }

    @Test
    fun theRootKeepsOnlyTheKeyboardsInsetInFullScreen() {
        assertEquals(androidx.core.view.WindowInsetsCompat.Type.ime(), SystemBarInsets.typesFor(fullScreen = true))
        assertEquals(SystemBarInsets.TYPES, SystemBarInsets.typesFor(fullScreen = false))
    }

    // autobyteus-435 DEC-020 (API-REV-001 F1, API-18): below API 35 the decor fits the system windows, so full screen also
    // turns that fitting off while on and back on when off; API 35 is edge to edge already and is never asked.
    @Test
    fun belowApi35FullScreenTurnsDecorFittingOffWhileOnAndBackOnOff_inOrder() {
        for (api in 26..34) {
            val display = FakeDisplay(ActivityInfo.SCREEN_ORIENTATION_UNSPECIFIED)
            val controller = DesktopFullScreenController(display, sdkInt = api)
            controller.setOn(true)
            val on = display.calls.toList()
            display.calls.clear()
            controller.setOn(false)
            assertEquals("API $api", listOf(false, true), display.decorFits)
            val cutout = if (api >= 28) listOf("cutout") else emptyList()
            assertEquals("API $api on", listOf("orientation", "bars") + cutout + listOf("decor", "insets"), on)
            assertEquals("API $api off", listOf("orientation", "bars") + cutout + listOf("decor", "insets"), display.calls)
        }
    }

    @Test
    fun onApi35TheDecorFittingIsNeverAsked() {
        val display = FakeDisplay(ActivityInfo.SCREEN_ORIENTATION_UNSPECIFIED)
        val controller = DesktopFullScreenController(display, sdkInt = 35)
        controller.setOn(true)
        controller.setOn(false)
        assertEquals(emptyList<Boolean>(), display.decorFits)
        assertEquals(listOf("orientation", "bars", "cutout", "insets", "orientation", "bars", "cutout", "insets"), display.calls)
    }

    @Test
    fun aResetWhileOffAsksNothingOfTheDecor() {
        val display = FakeDisplay(ActivityInfo.SCREEN_ORIENTATION_UNSPECIFIED)
        DesktopFullScreenController(display, sdkInt = 30).reset()
        assertEquals(emptyList<Boolean>(), display.decorFits)
    }
}

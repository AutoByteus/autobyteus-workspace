package org.autobyteus.mobile

import android.app.Activity
import android.content.pm.ActivityInfo
import android.content.res.Configuration
import android.graphics.drawable.ColorDrawable
import android.os.Build
import android.view.View
import android.view.ViewGroup
import androidx.core.view.ViewCompat
import androidx.core.view.WindowInsetsCompat
import androidx.test.core.app.ActivityScenario
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import org.autobyteus.mobile.connection.SavedNodeStore
import org.autobyteus.mobile.ui.DesktopFullScreenController
import org.junit.Assert.assertEquals
import org.junit.Assert.assertSame
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith

/**
 * autobyteus-432 REQ-001/REQ-002 on a real window: desktop full screen turns the screen to landscape, hides the
 * status and navigation bars and darkens the shown root; off gives the phone its own orientation, the bars and the
 * root's own background back. The same activity stays (415's `configChanges`). The JVM test checks the controller
 * against a fake window; this one checks what Android does with it.
 * Runs on a device or emulator held in portrait: `./gradlew :app:connectedDebugAndroidTest`.
 */
@RunWith(AndroidJUnit4::class)
class DesktopFullScreenWindowTest {
    private val instrumentation = InstrumentationRegistry.getInstrumentation()

    @Before
    fun startOnTheStartScreen() {
        // No saved node: the activity opens the native start screen and makes no network call.
        SavedNodeStore(instrumentation.targetContext).clear()
    }

    @Test
    fun fullScreenTurnsToLandscapeAndHidesTheBarsAndOffGivesBothBack() {
        ActivityScenario.launch(MainActivity::class.java).use { scenario ->
            var activity: Activity? = null
            var controller: DesktopFullScreenController? = null
            var orientationBefore = Configuration.ORIENTATION_UNDEFINED
            var rootColorBefore: Int? = null
            scenario.onActivity {
                activity = it
                controller = DesktopFullScreenController.forActivity(it)
                orientationBefore = it.resources.configuration.orientation
                rootColorBefore = rootColor(it)
            }
            awaitWindow(scenario, "the bars are shown before full screen") { barsVisible(it) == true }

            scenario.onActivity { controller!!.setOn(true) }
            awaitWindow(scenario, "full screen turns the screen to landscape") {
                it.resources.configuration.orientation == Configuration.ORIENTATION_LANDSCAPE
            }
            awaitWindow(scenario, "full screen hides the status and navigation bars") { barsVisible(it) == false }
            scenario.onActivity {
                assertSame("the activity is not recreated", activity, it)
                assertEquals(ActivityInfo.SCREEN_ORIENTATION_SENSOR_LANDSCAPE, it.requestedOrientation)
                assertTrue(controller!!.isOn)
                if (rootColorBefore != null) assertEquals(DesktopFullScreenController.STAGE_COLOR, rootColor(it))
            }

            scenario.onActivity { controller!!.setOn(false) }
            awaitWindow(scenario, "off gives the screen its orientation back") {
                it.resources.configuration.orientation == orientationBefore
            }
            awaitWindow(scenario, "off shows the bars again") { barsVisible(it) == true }
            scenario.onActivity {
                assertSame("the activity is not recreated", activity, it)
                assertEquals(ActivityInfo.SCREEN_ORIENTATION_UNSPECIFIED, it.requestedOrientation)
                assertEquals(rootColorBefore, rootColor(it))
            }
        }
    }

    private fun barsVisible(activity: Activity): Boolean? {
        if (Build.VERSION.SDK_INT < 30) {
            // Before API 30 WindowInsetsCompat cannot tell a hidden bar apart (measured on API 29: it stays "visible"
            // while the window is in immersive full screen); the decor's system UI flags say it.
            @Suppress("DEPRECATION") val hide = View.SYSTEM_UI_FLAG_FULLSCREEN or View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
            @Suppress("DEPRECATION") val flags = activity.window.decorView.systemUiVisibility and hide
            return when (flags) { hide -> false; 0 -> true; else -> null }
        }
        val insets = ViewCompat.getRootWindowInsets(activity.window.decorView) ?: return null
        val status = insets.isVisible(WindowInsetsCompat.Type.statusBars())
        val navigation = insets.isVisible(WindowInsetsCompat.Type.navigationBars())
        return if (status == navigation) status else null
    }

    private fun rootColor(activity: Activity): Int? =
        (activity.findViewById<ViewGroup>(android.R.id.content)?.getChildAt(0)?.background as? ColorDrawable)?.color

    private fun awaitWindow(scenario: ActivityScenario<MainActivity>, what: String, condition: (Activity) -> Boolean) {
        val deadline = System.currentTimeMillis() + 10_000
        while (System.currentTimeMillis() < deadline) {
            instrumentation.waitForIdleSync()
            var met = false
            scenario.onActivity { met = condition(it) }
            if (met) return
            Thread.sleep(100)
        }
        throw AssertionError("$what: not within 10 s")
    }
}

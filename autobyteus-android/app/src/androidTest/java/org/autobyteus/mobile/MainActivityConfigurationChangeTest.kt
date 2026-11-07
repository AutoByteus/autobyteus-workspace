package org.autobyteus.mobile

import android.app.Activity
import android.content.pm.ActivityInfo
import android.content.res.Configuration
import android.view.View
import android.view.ViewGroup
import android.widget.EditText
import androidx.test.core.app.ActivityScenario
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import org.autobyteus.mobile.connection.SavedNodeStore
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertSame
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith

/**
 * autobyteus-415 REQ-001: turning the phone keeps the open screen. `MainActivity` declares the
 * orientation and window-size changes in `android:configChanges`, so Android re-lays out the same
 * activity instead of recreating it, and what the user typed or opened stays.
 * Runs on a device or emulator: `./gradlew :app:connectedDebugAndroidTest`.
 */
@RunWith(AndroidJUnit4::class)
class MainActivityConfigurationChangeTest {
    private val instrumentation = InstrumentationRegistry.getInstrumentation()

    @Before
    fun startOnTheStartScreen() {
        // No saved node: the activity opens the native start screen and makes no network call.
        SavedNodeStore(instrumentation.targetContext).clear()
    }

    @Test
    fun rotatingToLandscapeAndBackKeepsTheSameActivityAndTheTypedInput() {
        ActivityScenario.launch(MainActivity::class.java).use { scenario ->
            val typed = "http://abx415-rotation-test.example:8000/mobile"
            var activity: Activity? = null
            var input: EditText? = null
            scenario.onActivity {
                activity = it
                // Other ways to connect › Type an address opens the address sheet.
                findClickable(it.window.decorView, "Other ways to connect")!!.performClick()
                findClickable(it.window.decorView, "Type an address")!!.performClick()
                input = findEditText(it.window.decorView)
                assertNotNull("the Type an address sheet shows an address field", input)
                input!!.setText(typed)
            }

            for (orientation in listOf(Configuration.ORIENTATION_LANDSCAPE, Configuration.ORIENTATION_PORTRAIT)) {
                scenario.onActivity {
                    it.requestedOrientation = if (orientation == Configuration.ORIENTATION_LANDSCAPE) {
                        ActivityInfo.SCREEN_ORIENTATION_LANDSCAPE
                    } else {
                        ActivityInfo.SCREEN_ORIENTATION_PORTRAIT
                    }
                }
                awaitOrientation(scenario, orientation)
                scenario.onActivity {
                    assertSame("the activity is not recreated", activity, it)
                    val current = findEditText(it.window.decorView)
                    assertSame("the screen and its sheet are not rebuilt", input, current)
                    assertEquals(typed, current!!.text.toString())
                }
            }

            scenario.onActivity { it.requestedOrientation = ActivityInfo.SCREEN_ORIENTATION_UNSPECIFIED }
        }
    }

    private fun awaitOrientation(scenario: ActivityScenario<MainActivity>, orientation: Int) {
        val deadline = System.currentTimeMillis() + 10_000
        while (System.currentTimeMillis() < deadline) {
            instrumentation.waitForIdleSync()
            var current = -1
            scenario.onActivity { current = it.resources.configuration.orientation }
            if (current == orientation) return
            Thread.sleep(100)
        }
        throw AssertionError("the screen did not reach orientation $orientation within 10 s")
    }

    private fun findClickable(view: View, description: String): View? {
        if (view.isClickable && view.contentDescription?.toString()?.startsWith(description) == true) return view
        if (view is ViewGroup) {
            for (index in 0 until view.childCount) {
                findClickable(view.getChildAt(index), description)?.let { return it }
            }
        }
        return null
    }

    private fun findEditText(view: View): EditText? {
        if (view is EditText) return view
        if (view is ViewGroup) {
            for (index in 0 until view.childCount) {
                findEditText(view.getChildAt(index))?.let { return it }
            }
        }
        return null
    }
}

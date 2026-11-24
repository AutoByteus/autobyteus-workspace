package org.autobyteus.mobile.web

import android.app.Activity
import android.content.pm.ActivityInfo
import android.content.res.Configuration
import android.os.SystemClock
import android.view.MotionEvent
import androidx.core.view.ViewCompat
import androidx.core.view.WindowInsetsCompat
import androidx.test.core.app.ActivityScenario
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import org.autobyteus.mobile.MainActivity
import org.autobyteus.mobile.connection.NodeUrlNormalizer
import org.autobyteus.mobile.connection.SavedNodeEntry
import org.autobyteus.mobile.connection.SavedNodeStore
import org.autobyteus.mobile.ui.DesktopFullScreenController
import org.autobyteus.mobile.media.RangeFileServer
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Assume.assumeTrue
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import java.io.File
import java.util.concurrent.CountDownLatch
import java.util.concurrent.TimeUnit

/**
 * autobyteus-574 D-6 (AC-004, DEC-004): an in-page player's full-screen button works in the app's WebView: a tap on it
 * shows the player full screen in landscape with the system bars hidden, and leaving full screen gives portrait back with
 * the video where it was. Production: AutoByteusWebView with its AutoByteusChromeClient, WebMediaFullScreen, 432's
 * DesktopFullScreenController, on MainActivity's window; the page and its video come from [RangeFileServer] on the
 * device. Needs a small baseline H.264 MP4 at `/data/local/tmp/autobyteus-574-page-video.mp4` (the evidence README says
 * how it is made; the emulator's WebView decoder stalls on a heavy 720p stream that the native player plays); skipped
 * without it.
 */
@RunWith(AndroidJUnit4::class)
class WebMediaFullScreenTest {
    private val instrumentation = InstrumentationRegistry.getInstrumentation()
    private lateinit var server: RangeFileServer

    @Before
    fun serveAPageWithAVideo() {
        val pushed = File("/data/local/tmp/autobyteus-574-page-video.mp4")
        assumeTrue("push a test MP4 to ${pushed.path}", pushed.canRead())
        SavedNodeStore(instrumentation.targetContext).clear()
        val page = """
            <!doctype html><meta name="viewport" content="width=device-width">
            <body style="margin:0">
            <video id="v" src="/rest/files/videos/clip.mp4" playsinline style="width:100%;height:30vh"></video>
            <button id="go" style="position:fixed;left:0;top:40vh;width:100vw;height:60vh"
              onclick="v=document.getElementById('v'); v.play(); v.requestFullscreen()">Full screen</button>
            </body>
        """.trimIndent()
        server = RangeFileServer(pushed, version = "\"page-video\"", credential = null, page = page)
    }

    @After
    fun stop() {
        if (this::server.isInitialized) server.close()
    }

    @Test
    fun anInPageVideosFullScreenButtonShowsItInLandscapeAndBackInPortraitAtTheSamePosition() {
        ActivityScenario.launch(MainActivity::class.java).use { scenario ->
            lateinit var host: AutoByteusWebView
            lateinit var fullScreen: WebMediaFullScreen
            val entry = SavedNodeEntry.fromNormalized(NodeUrlNormalizer.normalize("${server.origin}/mobile"), httpAcknowledged = true)
            scenario.onActivity { activity ->
                fullScreen = WebMediaFullScreen(activity, DesktopFullScreenController.forActivity(activity))
                host = AutoByteusWebView(
                    context = activity, entry = entry, fileChooserCoordinator = WebFileChooserCoordinator(activity) {},
                    mediaFullScreen = fullScreen, shellBridge = null, onPageStarted = {}, onDiagnostic = {}, onOpenedOutside = {},
                )
                host.create("${server.origin}/mobile/page.html")
                activity.setContentView(host.webView)
            }
            awaitTrue("the video is ready") { js(scenario, host, "document.getElementById('v').readyState >= 1") == "true" }
            // A position to keep (a seek needs no gesture; the tap below plays it and asks for full screen).
            js(scenario, host, "(document.getElementById('v').currentTime = 5, true)")
            awaitTrue("the video is at 5 s") { (js(scenario, host, "document.getElementById('v').currentTime")?.toDoubleOrNull() ?: 0.0) >= 5.0 }
            val orientationBefore = orientation(scenario)

            tapLowerHalf(scenario)
            awaitTrue("the player is in full screen") { fullScreen.isShowing }
            awaitWindow(scenario, "landscape") { it.resources.configuration.orientation == Configuration.ORIENTATION_LANDSCAPE }
            awaitWindow(scenario, "bars hidden") { barsVisible(it) == false }
            scenario.onActivity { assertEquals(ActivityInfo.SCREEN_ORIENTATION_SENSOR_LANDSCAPE, it.requestedOrientation) }
            awaitTrue("the video plays in full screen") { (js(scenario, host, "document.getElementById('v').currentTime")?.toDoubleOrNull() ?: 0.0) > 5.5 }
            val timeInFullScreen = js(scenario, host, "document.getElementById('v').currentTime")!!.toDouble()

            js(scenario, host, "document.exitFullscreen().then(() => true)")
            awaitTrue("full screen ends") { !fullScreen.isShowing }
            awaitWindow(scenario, "back to the phone's orientation") { it.resources.configuration.orientation == orientationBefore }
            awaitWindow(scenario, "bars shown") { barsVisible(it) == true }
            val timeAfter = js(scenario, host, "document.getElementById('v').currentTime")!!.toDouble()
            android.util.Log.i("WebMediaFullScreenTest", "in-page full screen: landscape at $timeInFullScreen s; portrait at $timeAfter s")
            assertTrue("the video keeps its position ($timeInFullScreen → $timeAfter)", timeAfter >= timeInFullScreen)
            scenario.onActivity { host.destroy() }
        }
    }

    /** A real tap (a user gesture: Chromium allows full screen only from one) on the page's full-screen button. */
    private fun tapLowerHalf(scenario: ActivityScenario<MainActivity>) {
        var x = 0f
        var y = 0f
        scenario.onActivity { activity ->
            val location = IntArray(2)
            val view = activity.window.decorView
            view.getLocationOnScreen(location)
            x = location[0] + view.width / 2f
            y = location[1] + view.height * 0.75f
        }
        val down = SystemClock.uptimeMillis()
        instrumentation.sendPointerSync(MotionEvent.obtain(down, down, MotionEvent.ACTION_DOWN, x, y, 0))
        instrumentation.sendPointerSync(MotionEvent.obtain(down, down + 50, MotionEvent.ACTION_UP, x, y, 0))
    }

    private fun js(scenario: ActivityScenario<MainActivity>, host: AutoByteusWebView, script: String): String? {
        val latch = CountDownLatch(1)
        var result: String? = null
        scenario.onActivity { host.webView.evaluateJavascript(script) { value -> result = value; latch.countDown() } }
        latch.await(5, TimeUnit.SECONDS)
        return result
    }

    private fun orientation(scenario: ActivityScenario<MainActivity>): Int {
        var value = Configuration.ORIENTATION_UNDEFINED
        scenario.onActivity { value = it.resources.configuration.orientation }
        return value
    }

    private fun barsVisible(activity: Activity): Boolean? {
        val insets = ViewCompat.getRootWindowInsets(activity.window.decorView) ?: return null
        val status = insets.isVisible(WindowInsetsCompat.Type.statusBars())
        val navigation = insets.isVisible(WindowInsetsCompat.Type.navigationBars())
        return if (status == navigation) status else null
    }

    private fun awaitTrue(what: String, condition: () -> Boolean) {
        val deadline = System.currentTimeMillis() + 15_000
        while (System.currentTimeMillis() < deadline) {
            instrumentation.waitForIdleSync()
            if (condition()) return
            Thread.sleep(150)
        }
        throw AssertionError("$what: not within 15 s")
    }

    private fun awaitWindow(scenario: ActivityScenario<MainActivity>, what: String, condition: (Activity) -> Boolean) {
        awaitTrue(what) {
            var met = false
            scenario.onActivity { met = condition(it) }
            met
        }
    }
}

package org.autobyteus.mobile

import android.os.SystemClock
import android.view.View
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.core.view.ViewCompat
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsCompat
import androidx.test.core.app.ActivityScenario
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import android.content.res.Configuration
import org.autobyteus.mobile.ui.DesktopFullScreenController
import org.autobyteus.mobile.ui.SystemBarInsets
import org.autobyteus.mobile.ui.WebShellScreen
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith
import java.util.concurrent.CountDownLatch
import java.util.concurrent.TimeUnit
import java.util.concurrent.atomic.AtomicReference

/**
 * autobyteus-277 REQ-011, ARCH-REV-004 residual 2: in the real window, the web shell's page sits inside the
 * system bars and above the keyboard, and the page's own `env(safe-area-inset-*)` reads 0 inside the padded
 * container, so the phone's CSS adds no second padding on Android.
 */
@RunWith(AndroidJUnit4::class)
class WebShellWindowInsetsTest {
    private val page = """
        <html><head><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover"></head>
        <body style="margin:0">
          <div id="probe" style="padding: env(safe-area-inset-top) 0 env(safe-area-inset-bottom) 0"></div>
          <input id="field" style="position:fixed; bottom:0; width:100%; height:48px">
        </body></html>
    """.trimIndent()

    private fun <T> onMain(block: () -> T): T {
        val result = AtomicReference<T>()
        InstrumentationRegistry.getInstrumentation().runOnMainSync { result.set(block()) }
        return result.get()
    }

    private fun evaluate(webView: WebView, script: String): String {
        val result = AtomicReference<String>()
        val done = CountDownLatch(1)
        InstrumentationRegistry.getInstrumentation().runOnMainSync {
            webView.evaluateJavascript(script) { value -> result.set(value); done.countDown() }
        }
        assertTrue("script answered", done.await(10, TimeUnit.SECONDS))
        return result.get()
    }

    private fun waitUntil(timeoutMs: Long, condition: () -> Boolean): Boolean {
        val end = SystemClock.uptimeMillis() + timeoutMs
        while (SystemClock.uptimeMillis() < end) {
            if (condition()) return true
            SystemClock.sleep(100)
        }
        return condition()
    }

    /** Android 15 (API 35) draws a targetSdk 35 app edge-to-edge. */
    private val edgeToEdge = android.os.Build.VERSION.SDK_INT >= 35

    @Test
    fun thePageSitsInsideTheBarsAndAboveTheKeyboardAndItsSafeAreaReadsZero() {
        ActivityScenario.launch(MainActivity::class.java).use { scenario ->
            val loaded = CountDownLatch(1)
            val webViewRef = AtomicReference<WebView>()
            val rootRef = AtomicReference<View>()
            val windowRef = AtomicReference<android.view.Window>()
            scenario.onActivity { activity ->
                val webView = WebView(activity).apply {
                    settings.javaScriptEnabled = true
                    webViewClient = object : WebViewClient() {
                        override fun onPageFinished(view: WebView, url: String) { loaded.countDown() }
                    }
                }
                val root = WebShellScreen(activity) { false }.render(webView, null, WebShellScreen.Callbacks({}, {}, {}))
                activity.setContentView(root)
                webView.loadDataWithBaseURL("https://inset.check/mobile", page, "text/html", "utf-8", null)
                webViewRef.set(webView)
                rootRef.set(root)
                windowRef.set(activity.window)
            }
            assertTrue("page loaded", loaded.await(20, TimeUnit.SECONDS))
            val webView = webViewRef.get()
            val root = rootRef.get()

            // Keyboard closed: the root's padding is the window's bars and cutout.
            val bars = onMain {
                ViewCompat.getRootWindowInsets(root)!!.getInsets(
                    WindowInsetsCompat.Type.systemBars() or WindowInsetsCompat.Type.displayCutout(),
                )
            }
            assertTrue("the window has a status bar inset", bars.top > 0)
            if (!edgeToEdge) {
                // Before Android 15 the window keeps the bars apart itself: the root gets no inset and nothing moves.
                val rootTop = onMain { IntArray(2).also { root.getLocationOnScreen(it) }[1] }
                println("INSETS legacy bars=$bars padding=${root.paddingTop},${root.paddingBottom} rootTop=$rootTop")
                assertEquals(listOf(0, 0, 0, 0), onMain { listOf(root.paddingLeft, root.paddingTop, root.paddingRight, root.paddingBottom) })
                assertTrue("the root already sits below the status bar", rootTop >= bars.top)
                return
            }
            assertTrue("padding follows the bars", waitUntil(5_000) { onMain { root.paddingTop == bars.top && root.paddingBottom == bars.bottom } })
            val closed = evaluate(webView, "(() => { const s = getComputedStyle(document.getElementById('probe')); return s.paddingTop + '|' + s.paddingBottom + '|' + innerHeight })()")
            println("INSETS closed bars=$bars padding=${root.paddingTop},${root.paddingBottom} page=$closed")
            assertTrue("env() reads 0 with the keyboard closed: $closed", closed.trim('"').startsWith("0px|0px|"))

            // Keyboard open: the bottom padding grows to the keyboard; env() still reads 0.
            evaluate(webView, "document.getElementById('field').focus()")
            onMain {
                webView.requestFocus()
                WindowCompat.getInsetsController(windowRef.get(), webView).show(WindowInsetsCompat.Type.ime())
            }
            val imeShown = waitUntil(8_000) { onMain { ViewCompat.getRootWindowInsets(root)?.isVisible(WindowInsetsCompat.Type.ime()) == true } }
            if (imeShown) {
                val ime = onMain { ViewCompat.getRootWindowInsets(root)!!.getInsets(SystemBarInsets.TYPES) }
                assertTrue("padding follows the keyboard", waitUntil(5_000) { onMain { root.paddingBottom == ime.bottom && ime.bottom > bars.bottom } })
                val open = evaluate(webView, "(() => { const s = getComputedStyle(document.getElementById('probe')); return s.paddingTop + '|' + s.paddingBottom + '|' + innerHeight })()")
                println("INSETS open ime=$ime padding=${root.paddingTop},${root.paddingBottom} page=$open")
                assertTrue("env() reads 0 with the keyboard open: $open", open.trim('"').startsWith("0px|0px|"))
                assertTrue("the page got shorter above the keyboard", open.trim('"').split('|')[2].toInt() < closed.trim('"').split('|')[2].toInt())
            } else {
                println("INSETS ime not shown on this device; keyboard case not exercised")
            }
            assertEquals(0, root.paddingLeft + root.paddingRight - bars.left - bars.right)
        }
    }

    /**
     * autobyteus-435 REQ-004 (DEC-020, API-REV-001 F1) and the keyboard while in full screen: the page spans the whole
     * landscape screen, cutout included (below API 35 the decor stops fitting the system windows while on), and only the
     * keyboard pads it; off, the screen is laid out as before. Exercises the cutout only on a device that has one.
     */
    @Test
    fun inDesktopFullScreenThePageSpansTheScreenAndOnlyTheKeyboardPadsIt() {
        ActivityScenario.launch(MainActivity::class.java).use { scenario ->
            val loaded = CountDownLatch(1)
            val webViewRef = AtomicReference<WebView>()
            val rootRef = AtomicReference<View>()
            val windowRef = AtomicReference<android.view.Window>()
            val controllerRef = AtomicReference<DesktopFullScreenController>()
            scenario.onActivity { activity ->
                val controller = DesktopFullScreenController.forActivity(activity)
                val webView = WebView(activity).apply {
                    settings.javaScriptEnabled = true
                    webViewClient = object : WebViewClient() {
                        override fun onPageFinished(view: WebView, url: String) { loaded.countDown() }
                    }
                }
                val root = WebShellScreen(activity) { controller.isOn }.render(webView, null, WebShellScreen.Callbacks({}, {}, {}))
                activity.setContentView(root)
                webView.loadDataWithBaseURL("https://inset.check/mobile", page, "text/html", "utf-8", null)
                webViewRef.set(webView); rootRef.set(root); windowRef.set(activity.window); controllerRef.set(controller)
            }
            assertTrue("page loaded", loaded.await(20, TimeUnit.SECONDS))
            val webView = webViewRef.get()
            val root = rootRef.get()
            val controller = controllerRef.get()

            onMain { controller.setOn(true) }
            assertTrue("landscape", waitUntil(10_000) { onMain { root.resources.configuration.orientation == Configuration.ORIENTATION_LANDSCAPE } })
            val screenWidth = onMain { root.rootView.width }
            assertTrue("the page spans the screen, cutout included", waitUntil(8_000) { onMain {
                val at = IntArray(2).also { root.getLocationOnScreen(it) }
                at[0] == 0 && root.width == screenWidth && root.paddingLeft == 0 && root.paddingRight == 0 && root.paddingTop == 0
            } })
            val cutout = onMain { ViewCompat.getRootWindowInsets(root)?.getInsets(WindowInsetsCompat.Type.displayCutout()) }
            val closed = evaluate(webView, "String(innerHeight) + '|' + String(innerWidth)")
            println("FULLSCREEN closed sdk=${android.os.Build.VERSION.SDK_INT} cutout=$cutout root=${root.width}x${root.height} screenWidth=$screenWidth page=$closed")

            evaluate(webView, "document.getElementById('field').focus()")
            onMain {
                webView.requestFocus()
                WindowCompat.getInsetsController(windowRef.get(), webView).show(WindowInsetsCompat.Type.ime())
            }
            val imeShown = waitUntil(8_000) { onMain { ViewCompat.getRootWindowInsets(root)?.isVisible(WindowInsetsCompat.Type.ime()) == true } }
            if (imeShown) {
                val ime = onMain { ViewCompat.getRootWindowInsets(root)!!.getInsets(WindowInsetsCompat.Type.ime()) }
                assertTrue("only the keyboard pads the page: $ime", waitUntil(5_000) { onMain {
                    root.paddingBottom == ime.bottom && ime.bottom > 0 && root.paddingLeft == 0 && root.paddingTop == 0
                } })
                val open = evaluate(webView, "String(innerHeight) + '|' + String(innerWidth)")
                println("FULLSCREEN open ime=$ime padding=${root.paddingLeft},${root.paddingTop},${root.paddingRight},${root.paddingBottom} page=$open")
                assertTrue("the page got shorter above the keyboard", open.trim('"').split('|')[0].toInt() < closed.trim('"').split('|')[0].toInt())
                assertEquals("the page keeps the full width", closed.trim('"').split('|')[1], open.trim('"').split('|')[1])
                onMain { WindowCompat.getInsetsController(windowRef.get(), webView).hide(WindowInsetsCompat.Type.ime()) }
                waitUntil(5_000) { onMain { ViewCompat.getRootWindowInsets(root)?.isVisible(WindowInsetsCompat.Type.ime()) != true } }
            } else {
                println("FULLSCREEN ime not shown on this device; keyboard case not exercised")
            }

            onMain { controller.setOn(false) }
            assertTrue("portrait again", waitUntil(10_000) { onMain { root.resources.configuration.orientation == Configuration.ORIENTATION_PORTRAIT } })
            if (!edgeToEdge) {
                // Before Android 15 the window keeps the bars apart itself again: the root gets no inset (autobyteus-277).
                assertTrue("off: laid out as before", waitUntil(5_000) { onMain {
                    val top = IntArray(2).also { root.getLocationOnScreen(it) }[1]
                    listOf(root.paddingLeft, root.paddingTop, root.paddingRight, root.paddingBottom) == listOf(0, 0, 0, 0) && top > 0
                } })
            } else {
                val bars = onMain { ViewCompat.getRootWindowInsets(root)!!.getInsets(WindowInsetsCompat.Type.systemBars() or WindowInsetsCompat.Type.displayCutout()) }
                assertTrue("off: the root takes the bars again", waitUntil(5_000) { onMain { root.paddingTop == bars.top && root.paddingBottom == bars.bottom } })
            }
        }
    }
}

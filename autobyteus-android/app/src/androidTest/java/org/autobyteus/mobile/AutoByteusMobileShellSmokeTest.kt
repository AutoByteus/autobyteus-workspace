package org.autobyteus.mobile

import android.app.Activity
import android.content.Context
import android.view.View
import android.view.ViewGroup
import android.webkit.WebView
import android.widget.FrameLayout
import android.widget.TextView
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.core.app.ApplicationProvider
import androidx.test.platform.app.InstrumentationRegistry
import org.autobyteus.mobile.connection.ConnectionDiagnostic
import org.autobyteus.mobile.connection.ConnectionFailureKind
import org.autobyteus.mobile.connection.NodeUrlNormalizer
import org.autobyteus.mobile.connection.SavedNodeProfile
import org.autobyteus.mobile.shell.AndroidExternalActions
import org.autobyteus.mobile.ui.WebShellScreen
import org.autobyteus.mobile.web.AutoByteusWebView
import org.autobyteus.mobile.web.WebFileChooserCoordinator
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotEquals
import org.junit.Assert.assertSame
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class AutoByteusMobileShellSmokeTest {
    @Test
    fun appPackageIsInstallable() {
        val context = InstrumentationRegistry.getInstrumentation().targetContext
        assertEquals("org.autobyteus.mobile", context.packageName)
    }

    @Test
    fun fileChooserAndQrActivityResultsHaveDistinctRequestCodes() {
        assertNotEquals(AndroidExternalActions.QR_SCAN_REQUEST, WebFileChooserCoordinator.REQUEST_CODE)
    }

    @Test
    fun webViewSettingsPermitUserSelectedContentUrisButNotFilePaths() {
        val instrumentation = InstrumentationRegistry.getInstrumentation()
        val context = ApplicationProvider.getApplicationContext<Context>()
        val profile = SavedNodeProfile.fromNormalized(
            NodeUrlNormalizer.normalize("https://desktop.tailnet-name.ts.net/mobile"),
        )
        instrumentation.runOnMainSync {
            // This settings-posture test does not exercise picker launch; it only needs the
            // coordinator's WebChromeClient so AutoByteusWebView can be constructed without
            // depending on MainActivity launch-idle state.
            val webHost = AutoByteusWebView(
                context = context,
                profile = profile,
                fileChooserCoordinator = WebFileChooserCoordinator(Activity()) {},
                onPageStarted = {},
                onPageFinished = {},
                onDiagnostic = {},
                onExternalUrl = {},
            )
            val webView = webHost.create(profile.mobileUrl)
            assertTrue(webView.settings.allowContentAccess)
            assertFalse(webView.settings.allowFileAccess)
            webHost.destroy()
        }
    }

    @Test
    fun healthyWebShellGivesWebViewFullViewportWithoutNativeToolbar() {
        val instrumentation = InstrumentationRegistry.getInstrumentation()
        val context = instrumentation.targetContext
        instrumentation.runOnMainSync {
            val webView = WebView(context)
            try {
                val root = WebShellScreen(context).render(
                    webView = webView,
                    diagnostic = null,
                    callbacks = noOpWebCallbacks(),
                )
                assertTrue(root is FrameLayout)
                val group = root as ViewGroup
                assertEquals(1, group.childCount)
                assertSame(webView, group.getChildAt(0))
                assertEquals(ViewGroup.LayoutParams.MATCH_PARENT, webView.layoutParams.width)
                assertEquals(ViewGroup.LayoutParams.MATCH_PARENT, webView.layoutParams.height)

                val visibleText = textIn(root).joinToString(separator = "\n")
                assertFalse(visibleText.contains("EDIT NODE", ignoreCase = true))
                assertFalse(visibleText.contains("RETRY", ignoreCase = true))
                assertFalse(visibleText.contains("BROWSER", ignoreCase = true))
            } finally {
                webView.destroy()
            }
        }
    }

    @Test
    fun diagnosticWebShellKeepsRecoveryActionsInOverlay() {
        val instrumentation = InstrumentationRegistry.getInstrumentation()
        val context = instrumentation.targetContext
        val diagnostic = ConnectionDiagnostic(
            kind = ConnectionFailureKind.WebViewLoadFailed,
            title = "Cannot load node",
            message = "The saved node could not be reached.",
            recoveryAction = "Retry, edit the node, or open it externally.",
        )
        instrumentation.runOnMainSync {
            val webView = WebView(context)
            try {
                val root = WebShellScreen(context).render(
                    webView = webView,
                    diagnostic = diagnostic,
                    callbacks = noOpWebCallbacks(),
                )
                val group = root as ViewGroup
                assertEquals(2, group.childCount)
                assertSame(webView, group.getChildAt(0))

                val visibleText = textIn(root).joinToString(separator = "\n")
                assertTrue(visibleText.contains("Retry"))
                assertTrue(visibleText.contains("Edit"))
                assertTrue(visibleText.contains("Browser"))
            } finally {
                webView.destroy()
            }
        }
    }

    private fun noOpWebCallbacks(): WebShellScreen.Callbacks = WebShellScreen.Callbacks(
        onEditNode = {},
        onRetry = {},
        onOpenInBrowser = {},
    )

    private fun textIn(view: View): List<String> {
        val current = if (view is TextView) listOf(view.text.toString()) else emptyList()
        if (view !is ViewGroup) return current
        return current + (0 until view.childCount).flatMap { index -> textIn(view.getChildAt(index)) }
    }
}

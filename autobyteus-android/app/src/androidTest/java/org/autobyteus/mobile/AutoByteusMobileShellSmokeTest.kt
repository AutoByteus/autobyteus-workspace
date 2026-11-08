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
import org.autobyteus.mobile.connection.SavedNodeEntry
import org.autobyteus.mobile.shell.QrScanCoordinator
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
    fun cameraPermissionAndFileChooserRequestsHaveDistinctCodes() {
        assertNotEquals(QrScanCoordinator.CAMERA_PERMISSION_REQUEST, WebFileChooserCoordinator.REQUEST_CODE)
    }

    @Test
    fun qrCoordinatorOpensTheScannerOnlyWithTheCameraPermission() {
        InstrumentationRegistry.getInstrumentation().runOnMainSync {
            var opened = 0
            var denied = 0
            val permissionController = FakePermissionController(granted = false)
            val coordinator = QrScanCoordinator(
                activity = Activity(),
                onOpenScanner = { opened += 1 },
                onPermissionDenied = { denied += 1 },
                permissionController = permissionController,
            )

            coordinator.startQrScan()
            assertEquals(QrScanCoordinator.CAMERA_PERMISSION_REQUEST, permissionController.requestedCode)
            assertEquals(0, opened)

            assertTrue(coordinator.handleRequestPermissionsResult(
                QrScanCoordinator.CAMERA_PERMISSION_REQUEST,
                arrayOf(android.Manifest.permission.CAMERA),
                intArrayOf(android.content.pm.PackageManager.PERMISSION_DENIED),
            ))
            assertEquals(1, denied)

            assertTrue(coordinator.handleRequestPermissionsResult(
                QrScanCoordinator.CAMERA_PERMISSION_REQUEST,
                arrayOf(android.Manifest.permission.CAMERA),
                intArrayOf(android.content.pm.PackageManager.PERMISSION_GRANTED),
            ))
            assertEquals(1, opened)
        }
    }

    @Test
    fun webViewSettingsPermitUserSelectedContentUrisButNotFilePaths() {
        val instrumentation = InstrumentationRegistry.getInstrumentation()
        val context = ApplicationProvider.getApplicationContext<Context>()
        val entry = SavedNodeEntry.fromNormalized(
            NodeUrlNormalizer.normalize("https://desktop.tailnet-name.ts.net/mobile"),
        )
        instrumentation.runOnMainSync {
            // This settings-posture test does not exercise picker launch; it only needs the
            // coordinator's WebChromeClient so AutoByteusWebView can be constructed without
            // depending on MainActivity launch-idle state.
            val webHost = AutoByteusWebView(
                context = context,
                entry = entry,
                fileChooserCoordinator = WebFileChooserCoordinator(Activity()) {},
                shellBridge = null,
                onDiagnostic = {},
                onOpenedOutside = {},
            )
            val webView = webHost.create(entry.mobileUrl)
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
                assertEquals(View.VISIBLE, webView.visibility)
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
                // autobyteus-433 DS-004: under the overlay the page (or WebView's error page with the URL) is neither
                // drawn nor in the accessibility tree, and the overlay is opaque.
                assertEquals(View.INVISIBLE, webView.visibility)
                val overlayBackground = group.getChildAt(1).background as android.graphics.drawable.ColorDrawable
                assertEquals(255, android.graphics.Color.alpha(overlayBackground.color))

                val visibleText = textIn(root).joinToString(separator = "\n")
                assertTrue(visibleText.contains("Retry"))
                assertTrue(visibleText.contains("Edit"))
                assertTrue(visibleText.contains("Browser"))

                // The same WebView shown again without a diagnostic (a load that succeeded) is visible again.
                WebShellScreen(context).render(webView = webView, diagnostic = null, callbacks = noOpWebCallbacks())
                assertEquals(View.VISIBLE, webView.visibility)
            } finally {
                webView.destroy()
            }
        }
    }

    private class FakePermissionController(
        private val granted: Boolean,
    ) : QrScanCoordinator.PermissionController {
        var requestedCode: Int? = null

        override fun hasCameraPermission(): Boolean = granted

        override fun requestCameraPermission(requestCode: Int) {
            requestedCode = requestCode
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

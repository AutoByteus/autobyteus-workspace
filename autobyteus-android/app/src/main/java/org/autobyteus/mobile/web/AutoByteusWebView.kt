package org.autobyteus.mobile.web

import android.annotation.SuppressLint
import android.content.ActivityNotFoundException
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.view.ViewGroup
import android.webkit.DownloadListener
import android.webkit.WebResourceError
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import org.autobyteus.mobile.connection.ConnectionDiagnostic
import org.autobyteus.mobile.connection.ConnectionDiagnosticMapper
import org.autobyteus.mobile.connection.SavedNodeEntry

class AutoByteusWebView(
    private val context: Context,
    val entry: SavedNodeEntry,
    private val fileChooserCoordinator: WebFileChooserCoordinator,
    /** The shell bridge for this entry's origin; registered before the first page loads. */
    private val shellBridge: ShellBridge?,
    private val onDiagnostic: (ConnectionDiagnostic) -> Unit,
    /** A link or download is opening in another app; the toast says so without its URL. */
    private val onOpenedOutside: () -> Unit,
) {
    lateinit var webView: WebView
        private set

    @SuppressLint("SetJavaScriptEnabled")
    fun create(initialUrl: String): WebView {
        webView = WebView(context).apply {
            layoutParams = ViewGroup.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.MATCH_PARENT,
            )
            settings.javaScriptEnabled = true
            settings.domStorageEnabled = true
            settings.cacheMode = WebSettings.LOAD_DEFAULT
            settings.loadsImagesAutomatically = true
            settings.javaScriptCanOpenWindowsAutomatically = false
            settings.setSupportMultipleWindows(false)
            settings.allowFileAccess = false
            settings.allowContentAccess = true
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                settings.safeBrowsingEnabled = true
            }
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                settings.mixedContentMode = WebSettings.MIXED_CONTENT_NEVER_ALLOW
            }
            webChromeClient = fileChooserCoordinator.chromeClient()
            webViewClient = Client()
            setDownloadListener(DownloadListener { url, _, _, _, _ -> openExternal(url) })
        }
        shellBridge?.register(webView)
        loadTrusted(initialUrl)
        return webView
    }

    fun loadTrusted(url: String) {
        when (TrustedNavigationPolicy.classify(url, entry, isMainFrame = true).type) {
            NavigationDecisionType.AllowInWebView -> webView.loadUrl(url)
            NavigationDecisionType.OpenExternal -> openExternal(url)
            NavigationDecisionType.Block -> onDiagnostic(ConnectionDiagnosticMapper.linkBlocked())
        }
    }

    fun canGoBack(): Boolean = this::webView.isInitialized && webView.canGoBack()

    fun goBack() {
        if (canGoBack()) {
            webView.goBack()
        }
    }

    fun destroy() {
        fileChooserCoordinator.cancelPending()
        if (this::webView.isInitialized) {
            webView.stopLoading()
            webView.destroy()
        }
    }

    private fun openExternal(url: String) {
        onOpenedOutside()
        val intent = Intent(Intent.ACTION_VIEW, Uri.parse(url)).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        try {
            context.startActivity(intent)
        } catch (_: ActivityNotFoundException) {
            onDiagnostic(ConnectionDiagnosticMapper.noAppForLink())
        }
    }

    private inner class Client : WebViewClient() {
        override fun shouldOverrideUrlLoading(view: WebView, request: WebResourceRequest): Boolean {
            val url = request.url.toString()
            val decision = TrustedNavigationPolicy.classify(url, entry, request.isForMainFrame)
            return when (decision.type) {
                NavigationDecisionType.AllowInWebView -> false
                NavigationDecisionType.OpenExternal -> {
                    openExternal(url)
                    true
                }
                NavigationDecisionType.Block -> {
                    onDiagnostic(ConnectionDiagnosticMapper.linkBlocked())
                    true
                }
            }
        }

        override fun onReceivedError(
            view: WebView,
            request: WebResourceRequest,
            error: WebResourceError,
        ) {
            if (request.isForMainFrame) {
                onDiagnostic(ConnectionDiagnosticMapper.pageLoadFailed(entry.shownName))
            }
        }

        override fun onReceivedHttpError(
            view: WebView,
            request: WebResourceRequest,
            errorResponse: WebResourceResponse,
        ) {
            if (request.isForMainFrame) {
                onDiagnostic(ConnectionDiagnosticMapper.fromHttpStatus(errorResponse.statusCode))
            }
        }
    }
}

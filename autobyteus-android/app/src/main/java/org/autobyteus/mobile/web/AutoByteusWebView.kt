package org.autobyteus.mobile.web

import android.annotation.SuppressLint
import android.content.ActivityNotFoundException
import android.content.Context
import android.content.Intent
import android.graphics.Bitmap
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
import org.autobyteus.mobile.connection.SavedNodeProfile

class AutoByteusWebView(
    private val context: Context,
    val profile: SavedNodeProfile,
    private val fileChooserCoordinator: WebFileChooserCoordinator,
    private val onPageStarted: (String) -> Unit,
    private val onPageFinished: (String) -> Unit,
    private val onDiagnostic: (ConnectionDiagnostic) -> Unit,
    private val onExternalUrl: (String) -> Unit,
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
        loadTrusted(initialUrl)
        return webView
    }

    fun loadTrusted(url: String) {
        when (TrustedNavigationPolicy.classify(url, profile).type) {
            NavigationDecisionType.AllowInWebView -> webView.loadUrl(url)
            NavigationDecisionType.OpenExternal -> openExternal(url)
            NavigationDecisionType.Block -> onDiagnostic(ConnectionDiagnosticMapper.unsafeNavigationBlocked(url))
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
        onExternalUrl(url)
        val intent = Intent(Intent.ACTION_VIEW, Uri.parse(url)).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        try {
            context.startActivity(intent)
        } catch (_: ActivityNotFoundException) {
            onDiagnostic(ConnectionDiagnosticMapper.webViewLoadFailed("No installed app can open $url"))
        }
    }

    private inner class Client : WebViewClient() {
        override fun shouldOverrideUrlLoading(view: WebView, request: WebResourceRequest): Boolean {
            val url = request.url.toString()
            val decision = TrustedNavigationPolicy.classify(url, profile)
            return when (decision.type) {
                NavigationDecisionType.AllowInWebView -> false
                NavigationDecisionType.OpenExternal -> {
                    openExternal(url)
                    true
                }
                NavigationDecisionType.Block -> {
                    onDiagnostic(ConnectionDiagnosticMapper.unsafeNavigationBlocked(url))
                    true
                }
            }
        }

        @Deprecated("Deprecated in Android framework")
        override fun shouldOverrideUrlLoading(view: WebView, url: String): Boolean {
            val decision = TrustedNavigationPolicy.classify(url, profile)
            return when (decision.type) {
                NavigationDecisionType.AllowInWebView -> false
                NavigationDecisionType.OpenExternal -> {
                    openExternal(url)
                    true
                }
                NavigationDecisionType.Block -> {
                    onDiagnostic(ConnectionDiagnosticMapper.unsafeNavigationBlocked(url))
                    true
                }
            }
        }

        override fun onPageStarted(view: WebView, url: String, favicon: Bitmap?) {
            onPageStarted(url)
        }

        override fun onPageFinished(view: WebView, url: String) {
            onPageFinished(url)
        }

        override fun onReceivedError(
            view: WebView,
            request: WebResourceRequest,
            error: WebResourceError,
        ) {
            if (request.isForMainFrame) {
                onDiagnostic(ConnectionDiagnosticMapper.webViewLoadFailed(error.description.toString()))
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

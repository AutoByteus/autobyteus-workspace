package org.autobyteus.mobile.web

import android.net.Uri
import android.view.View
import android.webkit.ValueCallback
import android.webkit.WebChromeClient
import android.webkit.WebView

/**
 * The open page's chrome client: its file inputs open Android's document picker ([WebFileChooserCoordinator]), and an
 * in-page player's full-screen button shows that player full screen in landscape ([WebMediaFullScreen],
 * autobyteus-574 D-6). Without `onShowCustomView` WebView draws that button disabled.
 */
class AutoByteusChromeClient(
    private val fileChooser: WebFileChooserCoordinator,
    private val mediaFullScreen: WebMediaFullScreen,
) : WebChromeClient() {
    override fun onShowFileChooser(
        webView: WebView,
        filePathCallback: ValueCallback<Array<Uri>>,
        fileChooserParams: FileChooserParams,
    ): Boolean = fileChooser.showFileChooser(filePathCallback, fileChooserParams)

    override fun onShowCustomView(view: View, callback: CustomViewCallback) = mediaFullScreen.show(view, callback)

    override fun onHideCustomView() = mediaFullScreen.hide()
}

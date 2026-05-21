package org.autobyteus.mobile.web

import android.app.Activity
import android.content.ActivityNotFoundException
import android.content.Intent
import android.net.Uri
import android.util.Log
import android.webkit.ValueCallback
import android.webkit.WebChromeClient
import android.webkit.WebView
import org.autobyteus.mobile.connection.ConnectionDiagnostic
import org.autobyteus.mobile.connection.ConnectionDiagnosticMapper

class WebFileChooserCoordinator(
    private val activity: Activity,
    private val onDiagnostic: (ConnectionDiagnostic) -> Unit,
) {
    private var pendingFileChooser: ValueCallback<Array<Uri>>? = null

    fun chromeClient(): WebChromeClient = object : WebChromeClient() {
        override fun onShowFileChooser(
            webView: WebView,
            filePathCallback: ValueCallback<Array<Uri>>,
            fileChooserParams: FileChooserParams,
        ): Boolean = openFileChooser(
            filePathCallback = filePathCallback,
            spec = FileChooserRequestPolicy.fromAcceptTypes(
                acceptTypes = fileChooserParams.acceptTypes,
                allowMultiple = fileChooserParams.mode == FileChooserParams.MODE_OPEN_MULTIPLE,
            ),
        )
    }

    fun handleActivityResult(requestCode: Int, resultCode: Int, data: Intent?): Boolean {
        if (requestCode != REQUEST_CODE) {
            return false
        }
        completePending(if (resultCode == Activity.RESULT_OK) selectedUris(data) else null)
        return true
    }

    fun cancelPending() {
        completePending(null)
    }

    private fun openFileChooser(
        filePathCallback: ValueCallback<Array<Uri>>,
        spec: FileChooserRequestSpec,
    ): Boolean {
        completePending(null)
        pendingFileChooser = filePathCallback
        return try {
            Log.i(TAG, "Opening Android file picker; allowMultiple=${spec.allowMultiple}; mime=${spec.primaryMimeType}")
            activity.startActivityForResult(buildPickerIntent(spec), REQUEST_CODE)
            true
        } catch (_: ActivityNotFoundException) {
            completePending(null)
            onDiagnostic(ConnectionDiagnosticMapper.webViewLoadFailed("No Android file picker is available."))
            true
        }
    }

    private fun buildPickerIntent(spec: FileChooserRequestSpec): Intent = Intent(Intent.ACTION_OPEN_DOCUMENT).apply {
        addCategory(Intent.CATEGORY_OPENABLE)
        type = spec.primaryMimeType
        putExtra(Intent.EXTRA_ALLOW_MULTIPLE, spec.allowMultiple)
        if (spec.extraMimeTypes.isNotEmpty()) {
            putExtra(Intent.EXTRA_MIME_TYPES, spec.extraMimeTypes)
        }
        addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
    }

    private fun selectedUris(data: Intent?): Array<Uri>? {
        if (data == null) {
            Log.i(TAG, "File picker returned no intent data.")
            return null
        }
        val clipData = data.clipData
        if (clipData != null && clipData.itemCount > 0) {
            Log.i(TAG, "File picker returned ${clipData.itemCount} selected item(s).")
            return Array(clipData.itemCount) { index -> clipData.getItemAt(index).uri }
        }
        return data.data?.let {
            Log.i(TAG, "File picker returned one selected item.")
            arrayOf(it)
        }
    }

    private fun completePending(uris: Array<Uri>?) {
        pendingFileChooser?.onReceiveValue(uris)
        pendingFileChooser = null
    }

    companion object {
        const val REQUEST_CODE = 9002
        private const val TAG = "AutoByteusFileChooser"
    }
}

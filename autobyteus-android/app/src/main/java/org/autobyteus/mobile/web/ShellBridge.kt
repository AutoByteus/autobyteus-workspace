package org.autobyteus.mobile.web

import android.net.Uri
import android.os.Handler
import android.os.Looper
import android.webkit.WebView
import androidx.webkit.JavaScriptReplyProxy
import androidx.webkit.WebMessageCompat
import androidx.webkit.WebViewCompat
import androidx.webkit.WebViewFeature
import org.autobyteus.mobile.connection.SavedNodeEntry
import org.json.JSONObject

/**
 * The shell bridge (`window.AutoByteusShell`): an androidx.webkit web-message object given only to the open node's
 * origin. The page may tell the app it paired, or ask it to show its node list or its scanner; `hello` answers with
 * the phone's node count and model name, and the open node's name as the app shows it (`""` when it has none,
 * autobyteus-433). Messages from a subframe or another origin are ignored, so a sandboxed HTML preview inside the page
 * cannot act as the app (autobyteus-417). It carries no credential and, of the entry, only the open node's name.
 */
class ShellBridge(
    private val entry: SavedNodeEntry,
    private val actions: Actions,
) {
    interface Actions {
        fun nodeCount(): Int
        fun deviceName(): String
        fun onPaired(nodeName: String)
        fun onShowNodeList()
        fun onStartScan()
    }

    private val mainThread = Handler(Looper.getMainLooper())

    /** Registers the object for this entry's origin; call before the WebView loads its first page. */
    fun register(webView: WebView) {
        WebViewCompat.addWebMessageListener(webView, JS_OBJECT_NAME, setOf(allowedOriginRule(entry))) {
                _: WebView, message: WebMessageCompat, sourceOrigin: Uri, isMainFrame: Boolean, replyProxy: JavaScriptReplyProxy ->
            val action = ShellBridgeMessages.read(
                data = message.data,
                sourceOrigin = sourceOrigin.toString(),
                isMainFrame = isMainFrame,
                expectedOrigin = entry.origin,
            ) ?: return@addWebMessageListener
            mainThread.post { handle(action, replyProxy) }
        }
    }

    private fun handle(action: ShellBridgeAction, replyProxy: JavaScriptReplyProxy) {
        when (action) {
            ShellBridgeAction.Hello -> replyProxy.postMessage(
                ShellBridgeMessages.helloReply(
                    nodeCount = actions.nodeCount(),
                    deviceName = actions.deviceName(),
                    nodeName = entry.knownName.orEmpty(),
                ),
            )
            is ShellBridgeAction.Paired -> actions.onPaired(action.nodeName)
            ShellBridgeAction.ShowNodeList -> actions.onShowNodeList()
            ShellBridgeAction.StartScan -> actions.onStartScan()
        }
    }

    companion object {
        const val JS_OBJECT_NAME = "AutoByteusShell"

        /** Whether this phone's Android System WebView can give the page the bridge (WebView from 2020 on). */
        fun isSupported(): Boolean = WebViewFeature.isFeatureSupported(WebViewFeature.WEB_MESSAGE_LISTENER)

        /** The entry's origin as an origin rule: `http://192.168.1.20:29695`, `https://desktop.example.ts.net`. */
        fun allowedOriginRule(entry: SavedNodeEntry): String = entry.origin
    }
}

sealed class ShellBridgeAction {
    data object Hello : ShellBridgeAction()
    data class Paired(val nodeName: String) : ShellBridgeAction()
    data object ShowNodeList : ShellBridgeAction()
    data object StartScan : ShellBridgeAction()
}

/** The bridge's message rules, apart from the WebView so they can be checked on the JVM. */
object ShellBridgeMessages {
    /** The action a page message asks for, or `null` when it must be ignored. */
    fun read(data: String?, sourceOrigin: String, isMainFrame: Boolean, expectedOrigin: String): ShellBridgeAction? {
        if (!isMainFrame || !sameOrigin(sourceOrigin, expectedOrigin) || data == null) return null
        val json = runCatching { JSONObject(data) }.getOrNull() ?: return null
        return when (json.optString("type")) {
            "hello" -> ShellBridgeAction.Hello
            "paired" -> ShellBridgeAction.Paired(json.optString("nodeName").trim())
            "showNodeList" -> ShellBridgeAction.ShowNodeList
            "startScan" -> ShellBridgeAction.StartScan
            else -> null
        }
    }

    /** [nodeName] is the open entry's known name, `""` when it has none: never its address. */
    fun helloReply(nodeCount: Int, deviceName: String, nodeName: String): String = JSONObject()
        .put("type", "shell")
        .put("nodeCount", nodeCount)
        .put("deviceName", deviceName)
        .put("nodeName", nodeName)
        .toString()

    private fun sameOrigin(left: String, right: String): Boolean =
        left.trimEnd('/').equals(right.trimEnd('/'), ignoreCase = true)
}

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
import java.util.concurrent.Executors

/**
 * The shell bridge (`window.AutoByteusShell`): an androidx.webkit web-message object given only to the open node's
 * origin. The page may tell the app it is ready (the node's page is mounted: the only signal that shows the page, which
 * WebView's own error page cannot send, autobyteus-433 DS-006) or paired, ask it to show its node list or its scanner,
 * turn its VNC Viewer's desktop full screen on or off (autobyteus-432), or hand it a PDF or image to save to the phone's
 * Downloads (autobyteus-472, [ShellBridgeAction.SaveFile]); `hello` answers with the phone's node count
 * and model name, and the open node's name as the app shows it (`""` when it has none, autobyteus-433). Messages from a
 * subframe or another origin are ignored, so a sandboxed HTML preview inside the page cannot act as the app
 * (autobyteus-417). It carries no credential and, of the entry, only the open node's name.
 */
class ShellBridge(
    private val entry: SavedNodeEntry,
    private val actions: Actions,
) {
    interface Actions {
        fun nodeCount(): Int
        fun deviceName(): String
        /** The page of the entry [entryId] is mounted. */
        fun onPageReady(entryId: String)
        fun onPaired(nodeName: String)
        fun onShowNodeList()
        fun onStartScan()
        fun onDesktopFullScreen(on: Boolean)
        /** Save [file] to Downloads and show the result (autobyteus-472). */
        fun onSaveFile(file: ShellBridgeAction.SaveFile)
    }

    private val mainThread = Handler(Looper.getMainLooper())

    /** Registers the object for this entry's origin; call before the WebView loads its first page. */
    fun register(webView: WebView) {
        WebViewCompat.addWebMessageListener(webView, JS_OBJECT_NAME, setOf(allowedOriginRule(entry))) {
                _: WebView, message: WebMessageCompat, sourceOrigin: Uri, isMainFrame: Boolean, replyProxy: JavaScriptReplyProxy ->
            val data = message.data
            val origin = sourceOrigin.toString()
            val read = {
                ShellBridgeMessages.read(data = data, sourceOrigin = origin, isMainFrame = isMainFrame, expectedOrigin = entry.origin)
                    ?.let { action -> mainThread.post { handle(action, replyProxy) } }
            }
            if ((data?.length ?: 0) > ShellBridgeMessages.LARGE_MESSAGE_CHARS) LARGE_MESSAGES.execute { read() } else read()
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
            ShellBridgeAction.PageReady -> actions.onPageReady(entry.id)
            is ShellBridgeAction.Paired -> actions.onPaired(action.nodeName)
            ShellBridgeAction.ShowNodeList -> actions.onShowNodeList()
            ShellBridgeAction.StartScan -> actions.onStartScan()
            is ShellBridgeAction.DesktopFullScreen -> actions.onDesktopFullScreen(action.on)
            is ShellBridgeAction.SaveFile -> actions.onSaveFile(action)
        }
    }

    companion object {
        const val JS_OBJECT_NAME = "AutoByteusShell"

        /** A large message (a file to save) is read off the main thread, by one thread for the whole app. */
        private val LARGE_MESSAGES = Executors.newSingleThreadExecutor()

        /** Whether this phone's Android System WebView can give the page the bridge (WebView from 2020 on). */
        fun isSupported(): Boolean = WebViewFeature.isFeatureSupported(WebViewFeature.WEB_MESSAGE_LISTENER)

        /** The entry's origin as an origin rule: `http://192.168.1.20:29695`, `https://desktop.example.ts.net`. */
        fun allowedOriginRule(entry: SavedNodeEntry): String = entry.origin
    }
}

sealed class ShellBridgeAction {
    data object Hello : ShellBridgeAction()
    data object PageReady : ShellBridgeAction()
    data class Paired(val nodeName: String) : ShellBridgeAction()
    data object ShowNodeList : ShellBridgeAction()
    data object StartScan : ShellBridgeAction()
    data class DesktopFullScreen(val on: Boolean) : ShellBridgeAction()

    /**
     * A file the page hands over to save to Downloads (autobyteus-472): a plain [fileName] whose extension matches
     * [mimeType] (a PDF or an image), and its bytes as [base64], decoded off the main thread when it is saved. The
     * bytes never appear in [toString].
     */
    data class SaveFile(val fileName: String, val mimeType: String, val base64: String) : ShellBridgeAction() {
        override fun toString(): String = "SaveFile(fileName=$fileName, mimeType=$mimeType, base64=${base64.length} chars)"
    }
}

/** The bridge's message rules, apart from the WebView so they can be checked on the JVM. */
object ShellBridgeMessages {
    /** The action a page message asks for, or `null` when it must be ignored. */
    fun read(data: String?, sourceOrigin: String, isMainFrame: Boolean, expectedOrigin: String): ShellBridgeAction? {
        if (!isMainFrame || !sameOrigin(sourceOrigin, expectedOrigin) || data == null) return null
        val json = runCatching { JSONObject(data) }.getOrNull() ?: return null
        return when (json.optString("type")) {
            "hello" -> ShellBridgeAction.Hello
            "pageReady" -> ShellBridgeAction.PageReady
            "paired" -> ShellBridgeAction.Paired(json.optString("nodeName").trim())
            "showNodeList" -> ShellBridgeAction.ShowNodeList
            "startScan" -> ShellBridgeAction.StartScan
            "desktopFullScreen" -> (json.opt("on") as? Boolean)?.let { ShellBridgeAction.DesktopFullScreen(it) }
            "saveFile" -> saveFileOf(json)
            else -> null
        }
    }

    /** Messages longer than this (a file to save) are read off the main thread. */
    const val LARGE_MESSAGE_CHARS = 16 * 1024
    private const val MAX_FILE_NAME_CHARS = 200

    /** The file types the app saves, by MIME type, with the extensions a name may have for it. */
    val SAVE_FILE_EXTENSIONS: Map<String, Set<String>> = mapOf(
        "application/pdf" to setOf("pdf"),
        "image/png" to setOf("png"),
        "image/jpeg" to setOf("jpg", "jpeg"),
        "image/gif" to setOf("gif"),
        "image/webp" to setOf("webp"),
        "image/bmp" to setOf("bmp"),
        "image/svg+xml" to setOf("svg"),
    )

    /**
     * A save request (autobyteus-472 REQ-005): only a PDF or an image, under a plain name (no folder, no control
     * character, at most 200 characters) whose extension matches its type, with some bytes. Anything else is ignored.
     */
    private fun saveFileOf(json: JSONObject): ShellBridgeAction.SaveFile? {
        val fileName = json.opt("fileName") as? String ?: return null
        val mimeType = json.opt("mimeType") as? String ?: return null
        val base64 = json.opt("base64") as? String ?: return null
        if (!isPlainFileName(fileName) || base64.isEmpty()) return null
        val extension = fileName.substringAfterLast('.', "").lowercase()
        if (extension !in SAVE_FILE_EXTENSIONS[mimeType].orEmpty()) return null
        return ShellBridgeAction.SaveFile(fileName, mimeType, base64)
    }

    private fun isPlainFileName(name: String): Boolean =
        name.length in 1..MAX_FILE_NAME_CHARS &&
            name == name.trim() &&
            name.substringBeforeLast('.', "").isNotBlank() &&
            name.none { it == '/' || it == '\\' || it.code < 0x20 || it.code == 0x7f }

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

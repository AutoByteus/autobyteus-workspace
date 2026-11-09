package org.autobyteus.mobile.web

import org.autobyteus.mobile.connection.SavedNodeEntry
import java.net.URI

enum class NavigationDecisionType {
    AllowInWebView,
    OpenExternal,
    Block,
    /** The page tried to navigate itself to a node route: stay on the page, show nothing (autobyteus-450). */
    KeepPage,
}

data class NavigationDecision(
    val type: NavigationDecisionType,
    val reason: String,
)

object TrustedNavigationPolicy {
    /**
     * Every navigation of the app's WebView. [isMainFrame] is false for a subframe (an iframe inside the node page):
     * only there may a `blob:` URL of the open node's own origin load, which is how the page shows an HTML preview
     * without a workspace file (autobyteus-426 REQ-007). The preview frame is sandboxed without `allow-same-origin`,
     * so it gets an opaque origin and no `AutoByteusShell`.
     */
    fun classify(targetUrl: String, entry: SavedNodeEntry, isMainFrame: Boolean): NavigationDecision {
        val uri = try {
            URI(targetUrl)
        } catch (error: Exception) {
            return NavigationDecision(NavigationDecisionType.Block, "URL could not be parsed")
        }
        val scheme = uri.scheme?.lowercase()
            ?: return NavigationDecision(NavigationDecisionType.Block, "URL has no scheme")

        if (scheme == "mailto" || scheme == "tel" || scheme == "sms") {
            return NavigationDecision(NavigationDecisionType.OpenExternal, "Non-web link opens outside AutoByteus")
        }
        if (scheme == "blob") {
            return classifyBlob(targetUrl.substring("blob:".length), entry, isMainFrame)
        }
        if (scheme != "http" && scheme != "https") {
            return NavigationDecision(NavigationDecisionType.Block, "Unsupported scheme")
        }

        uri.host ?: return NavigationDecision(NavigationDecisionType.Block, "URL has no host")
        if (!isSameOrigin(uri, entry)) {
            return NavigationDecision(NavigationDecisionType.OpenExternal, "Different origin opens outside the WebView")
        }

        val path = uri.rawPath?.ifBlank { "/" } ?: "/"
        // A node route (`/rest/…`, `/graphql`) as the page itself can only fail: since autobyteus-437 the phone's key is
        // a request header a navigation cannot carry, and the 401 would read as a rejected pairing. The page shows node
        // files in its own viewer; a subframe (a 426 preview frame) keeps the allowlist below.
        if (isMainFrame && isNodeRoute(path)) {
            return NavigationDecision(NavigationDecisionType.KeepPage, "A node route never loads as the page")
        }
        if (!isAllowedAutoByteusPath(path)) {
            return NavigationDecision(NavigationDecisionType.Block, "Same-origin path is outside the mobile shell allowlist")
        }
        return NavigationDecision(NavigationDecisionType.AllowInWebView, "Trusted AutoByteus mobile origin")
    }

    /** A `blob:` URL's origin is the URL after `blob:`; only a subframe of the open node's own origin loads. */
    private fun classifyBlob(innerUrl: String, entry: SavedNodeEntry, isMainFrame: Boolean): NavigationDecision {
        val inner = try {
            URI(innerUrl)
        } catch (error: Exception) {
            return NavigationDecision(NavigationDecisionType.Block, "Blob URL could not be parsed")
        }
        if (!isMainFrame && inner.host != null && isSameOrigin(inner, entry)) {
            return NavigationDecision(NavigationDecisionType.AllowInWebView, "The node page's own preview frame")
        }
        return NavigationDecision(NavigationDecisionType.Block, "Blob URL outside a frame of the node page")
    }

    private fun isSameOrigin(uri: URI, entry: SavedNodeEntry): Boolean {
        val scheme = uri.scheme?.lowercase() ?: return false
        val host = uri.host?.lowercase() ?: return false
        return (scheme == "http" || scheme == "https") &&
            scheme == entry.scheme.lowercase() &&
            host == entry.host.lowercase() &&
            normalizedPort(scheme, uri.port) == normalizedPort(entry.scheme, entry.port ?: -1)
    }

    private fun isNodeRoute(path: String): Boolean =
        path.startsWith("/rest/") || path == "/graphql" || path.startsWith("/graphql/")

    private fun isAllowedAutoByteusPath(path: String): Boolean {
        val cleanPath = path.ifBlank { "/" }
        return cleanPath == "/mobile" ||
            cleanPath.startsWith("/mobile/") ||
            cleanPath.startsWith("/rest/") ||
            cleanPath == "/graphql" ||
            cleanPath.startsWith("/graphql/") ||
            cleanPath.startsWith("/_nuxt/") ||
            cleanPath.startsWith("/__nuxt/") ||
            cleanPath.startsWith("/assets/") ||
            cleanPath == "/mobile.webmanifest" ||
            cleanPath == "/autobyteus-icon.svg" ||
            cleanPath == "/favicon.ico"
    }

    private fun normalizedPort(scheme: String, port: Int): Int = when {
        port >= 0 -> port
        scheme.equals("https", ignoreCase = true) -> 443
        scheme.equals("http", ignoreCase = true) -> 80
        else -> port
    }
}

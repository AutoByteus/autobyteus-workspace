package org.autobyteus.mobile.web

import org.autobyteus.mobile.connection.SavedNodeProfile
import java.net.URI

enum class NavigationDecisionType {
    AllowInWebView,
    OpenExternal,
    Block,
}

data class NavigationDecision(
    val type: NavigationDecisionType,
    val reason: String,
)

object TrustedNavigationPolicy {
    fun classify(targetUrl: String, profile: SavedNodeProfile): NavigationDecision {
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
        if (scheme != "http" && scheme != "https") {
            return NavigationDecision(NavigationDecisionType.Block, "Unsupported scheme")
        }

        val host = uri.host?.lowercase()
            ?: return NavigationDecision(NavigationDecisionType.Block, "URL has no host")
        val sameOrigin = scheme == profile.scheme.lowercase() &&
            host == profile.host.lowercase() &&
            normalizedPort(scheme, uri.port) == normalizedPort(profile.scheme, profile.port ?: -1)
        if (!sameOrigin) {
            return NavigationDecision(NavigationDecisionType.OpenExternal, "Different origin opens outside the WebView")
        }

        val path = uri.rawPath?.ifBlank { "/" } ?: "/"
        if (!isAllowedAutoByteusPath(path)) {
            return NavigationDecision(NavigationDecisionType.Block, "Same-origin path is outside the mobile shell allowlist")
        }
        return NavigationDecision(NavigationDecisionType.AllowInWebView, "Trusted AutoByteus mobile origin")
    }

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

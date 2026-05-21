package org.autobyteus.mobile.connection

import java.net.URI

class NodeUrlNormalizationException(message: String) : IllegalArgumentException(message)

data class NormalizedNodeUrl(
    val baseUrl: String,
    val mobileUrl: String,
    val statusUrl: String,
    val scheme: String,
    val host: String,
    val port: Int?,
)

object NodeUrlNormalizer {
    fun normalize(rawInput: String): NormalizedNodeUrl {
        val input = rawInput.trim()
        if (input.isEmpty()) {
            throw NodeUrlNormalizationException("Enter an AutoByteus node URL.")
        }

        val withScheme = if (SCHEME_PREFIX.containsMatchIn(input)) input else "https://$input"
        val parsed = try {
            URI(withScheme)
        } catch (error: Exception) {
            throw NodeUrlNormalizationException("The URL could not be parsed.")
        }

        val scheme = parsed.scheme?.lowercase()
            ?: throw NodeUrlNormalizationException("The URL must include http:// or https://.")
        if (scheme != "https" && scheme != "http") {
            throw NodeUrlNormalizationException("Only http:// and https:// AutoByteus node URLs are supported.")
        }

        val host = parsed.host?.lowercase()
            ?: throw NodeUrlNormalizationException("The URL must include a host name or IP address.")
        val path = parsed.rawPath?.ifBlank { "/" } ?: "/"
        if (!isRecognizedAutoByteusPath(path)) {
            throw NodeUrlNormalizationException("Use the node base URL, /mobile URL, or /rest/remote-access/status URL.")
        }

        val normalizedPort = parsed.port.takeIf { it >= 0 }
        val baseUrl = buildOrigin(scheme, host, normalizedPort)
        return NormalizedNodeUrl(
            baseUrl = baseUrl,
            mobileUrl = "$baseUrl/mobile",
            statusUrl = "$baseUrl/rest/remote-access/status",
            scheme = scheme,
            host = host,
            port = normalizedPort,
        )
    }

    fun stableMobileUrl(rawInput: String): String = normalize(rawInput).mobileUrl

    private fun isRecognizedAutoByteusPath(path: String): Boolean {
        val cleanPath = path.ifBlank { "/" }
        return cleanPath == "/" ||
            cleanPath == "/mobile" ||
            cleanPath.startsWith("/mobile/") ||
            cleanPath.startsWith("/rest/") ||
            cleanPath == "/graphql" ||
            cleanPath.startsWith("/graphql/")
    }

    private val SCHEME_PREFIX = Regex("^[a-zA-Z][a-zA-Z0-9+.-]*://")
}

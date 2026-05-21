package org.autobyteus.mobile.connection

/**
 * Android-owned identity for a desktop AutoByteus node.
 *
 * This is intentionally not a Phone Access credential. The existing /mobile web shell keeps the
 * paired credential in WebView-local web storage for the MVP.
 */
data class SavedNodeProfile(
    val id: String,
    val displayName: String,
    val baseUrl: String,
    val mobileUrl: String,
    val scheme: String,
    val host: String,
    val port: Int?,
    val httpAcknowledged: Boolean,
    val createdAtEpochMillis: Long,
    val updatedAtEpochMillis: Long,
) {
    val origin: String = buildOrigin(scheme, host, port)
    val isHttp: Boolean = scheme.equals("http", ignoreCase = true)

    companion object {
        fun fromNormalized(
            normalized: NormalizedNodeUrl,
            displayName: String? = null,
            httpAcknowledged: Boolean = normalized.scheme == "https",
            nowEpochMillis: Long = System.currentTimeMillis(),
            previous: SavedNodeProfile? = null,
        ): SavedNodeProfile {
            val origin = buildOrigin(normalized.scheme, normalized.host, normalized.port)
            return SavedNodeProfile(
                id = origin,
                displayName = displayName?.takeIf { it.isNotBlank() } ?: normalized.host,
                baseUrl = normalized.baseUrl,
                mobileUrl = normalized.mobileUrl,
                scheme = normalized.scheme,
                host = normalized.host,
                port = normalized.port,
                httpAcknowledged = httpAcknowledged,
                createdAtEpochMillis = previous?.createdAtEpochMillis ?: nowEpochMillis,
                updatedAtEpochMillis = nowEpochMillis,
            )
        }
    }
}

fun buildOrigin(scheme: String, host: String, port: Int?): String {
    val normalizedScheme = scheme.lowercase()
    val normalizedHost = host.lowercase()
    val hostForUrl = if (normalizedHost.contains(":")) "[$normalizedHost]" else normalizedHost
    val portPart = port?.let { ":$it" }.orEmpty()
    return "$normalizedScheme://$hostForUrl$portPart"
}

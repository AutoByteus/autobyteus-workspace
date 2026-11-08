package org.autobyteus.mobile.connection

/**
 * Android-owned identity for a desktop AutoByteus node.
 *
 * This is intentionally not a Phone Access credential. The existing /mobile web shell keeps the
 * paired credential in WebView-local web storage for the MVP.
 *
 * A node is shown on the phone by its name, never by its address (autobyteus-433): screens read [shownName], and the
 * page's bridge and the pairing flow read [knownName]; nothing outside this class interprets [displayName].
 */
data class SavedNodeEntry(
    val id: String,
    /** The stored name: the node's name from its QR or its page's pairing, or its [host] when it has none. */
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

    /** The node's name from its QR or its page's pairing; `null` for a typed address, or a saved name that is its host. */
    val knownName: String?
        get() = displayName.trim().takeIf { it.isNotEmpty() && !it.equals(host, ignoreCase = true) }

    /** What the phone shows for this node: its [knownName], else "AutoByteus node". Never an address. */
    val shownName: String
        get() = knownName ?: UNNAMED_NODE_NAME

    companion object {
        /** The label for a node with no name: the product's word for what the phone connects to. */
        const val UNNAMED_NODE_NAME = "AutoByteus node"

        fun fromNormalized(
            normalized: NormalizedNodeUrl,
            displayName: String? = null,
            httpAcknowledged: Boolean = normalized.scheme == "https",
            nowEpochMillis: Long = System.currentTimeMillis(),
            previous: SavedNodeEntry? = null,
        ): SavedNodeEntry {
            val origin = buildOrigin(normalized.scheme, normalized.host, normalized.port)
            return SavedNodeEntry(
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

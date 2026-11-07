package org.autobyteus.mobile.shell

import org.autobyteus.mobile.connection.ConnectionDiagnostic
import org.autobyteus.mobile.connection.ConnectionDiagnosticMapper
import org.autobyteus.mobile.connection.NodeUrlNormalizer
import org.autobyteus.mobile.connection.PairingLinkParser
import org.autobyteus.mobile.connection.ParsedPairingInput
import org.autobyteus.mobile.connection.SavedNodeEntry

/**
 * Turns what the user gave the app into an entry, per the entry-form table: a pairing link (scanned, pasted or
 * shared) carries the desktop's decision, so its `http://` address needs no second acknowledgement (REQ-010); a
 * typed plain `http://` address needs the sheet's tick.
 */
class ConnectionInputResolver {
    /** The entry and page of a pairing link, or `null` when the text is not one. */
    fun resolvePairingLink(rawText: String): ParsedPairingInput? {
        val parsed = runCatching { PairingLinkParser.parse(rawText) }.getOrNull() ?: return null
        if (!parsed.hasPairingPayload) return null
        return parsed.copy(entry = parsed.entry.copy(httpAcknowledged = true))
    }

    fun resolveTypedAddress(rawText: String, httpAcknowledged: Boolean): ConnectionInputResolution {
        val normalized = try {
            NodeUrlNormalizer.normalize(rawText)
        } catch (error: Exception) {
            return ConnectionInputResolution.Failure(
                ConnectionDiagnosticMapper.invalidUrl(error.message ?: "The address could not be read."),
            )
        }
        val entry = SavedNodeEntry.fromNormalized(normalized, httpAcknowledged = normalized.scheme == "https" || httpAcknowledged)
        if (entry.isHttp && !entry.httpAcknowledged) {
            return ConnectionInputResolution.Failure(ConnectionDiagnosticMapper.httpNeedsAcknowledgement(entry.mobileUrl))
        }
        return ConnectionInputResolution.Success(entry, normalized.mobileUrl)
    }
}

sealed class ConnectionInputResolution {
    data class Success(val entry: SavedNodeEntry, val webViewUrl: String) : ConnectionInputResolution()
    data class Failure(val diagnostic: ConnectionDiagnostic) : ConnectionInputResolution()
}

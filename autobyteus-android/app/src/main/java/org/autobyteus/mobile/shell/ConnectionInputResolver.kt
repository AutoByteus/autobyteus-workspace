package org.autobyteus.mobile.shell

import org.autobyteus.mobile.connection.ConnectionDiagnostic
import org.autobyteus.mobile.connection.ConnectionDiagnosticMapper
import org.autobyteus.mobile.connection.NodeUrlNormalizer
import org.autobyteus.mobile.connection.PairingLinkParser
import org.autobyteus.mobile.connection.ParsedPairingInput
import org.autobyteus.mobile.connection.SavedNodeEntry

class ConnectionInputResolver {
    fun resolve(rawText: String, httpAcknowledged: Boolean): ConnectionInputResolution {
        val parsed = parseInput(rawText) ?: return ConnectionInputResolution.Failure(
            ConnectionDiagnosticMapper.invalidUrl("The URL or pairing payload could not be parsed."),
        )
        val entry = parsed.entry.copy(
            httpAcknowledged = parsed.entry.scheme == "https" || httpAcknowledged,
        )
        if (entry.isHttp && !entry.httpAcknowledged) {
            return ConnectionInputResolution.Failure(
                ConnectionDiagnosticMapper.httpNeedsAcknowledgement(entry.mobileUrl),
            )
        }
        return ConnectionInputResolution.Success(entry, parsed.webViewUrl)
    }

    private fun parseInput(rawText: String): ParsedPairingInput? {
        return try {
            PairingLinkParser.parse(rawText)
        } catch (_: Exception) {
            try {
                val normalized = NodeUrlNormalizer.normalize(rawText)
                val entry = SavedNodeEntry.fromNormalized(normalized)
                ParsedPairingInput(entry, normalized.mobileUrl, false)
            } catch (_: Exception) {
                null
            }
        }
    }
}

sealed class ConnectionInputResolution {
    data class Success(val entry: SavedNodeEntry, val webViewUrl: String) : ConnectionInputResolution()
    data class Failure(val diagnostic: ConnectionDiagnostic) : ConnectionInputResolution()
}

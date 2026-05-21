package org.autobyteus.mobile.shell

import org.autobyteus.mobile.connection.ConnectionDiagnostic
import org.autobyteus.mobile.connection.ConnectionDiagnosticMapper
import org.autobyteus.mobile.connection.NodeUrlNormalizer
import org.autobyteus.mobile.connection.PairingLinkParser
import org.autobyteus.mobile.connection.ParsedPairingInput
import org.autobyteus.mobile.connection.SavedNodeProfile

class ConnectionInputResolver {
    fun resolve(rawText: String, httpAcknowledged: Boolean): ConnectionInputResolution {
        val parsed = parseInput(rawText) ?: return ConnectionInputResolution.Failure(
            ConnectionDiagnosticMapper.invalidUrl("The URL or pairing payload could not be parsed."),
        )
        val profile = parsed.profile.copy(
            httpAcknowledged = parsed.profile.scheme == "https" || httpAcknowledged,
        )
        if (profile.isHttp && !profile.httpAcknowledged) {
            return ConnectionInputResolution.Failure(
                ConnectionDiagnosticMapper.httpNeedsAcknowledgement(profile.mobileUrl),
            )
        }
        return ConnectionInputResolution.Success(profile, parsed.webViewUrl)
    }

    private fun parseInput(rawText: String): ParsedPairingInput? {
        return try {
            PairingLinkParser.parse(rawText)
        } catch (_: Exception) {
            try {
                val normalized = NodeUrlNormalizer.normalize(rawText)
                val profile = SavedNodeProfile.fromNormalized(normalized)
                ParsedPairingInput(profile, normalized.mobileUrl, false)
            } catch (_: Exception) {
                null
            }
        }
    }
}

sealed class ConnectionInputResolution {
    data class Success(val profile: SavedNodeProfile, val webViewUrl: String) : ConnectionInputResolution()
    data class Failure(val diagnostic: ConnectionDiagnostic) : ConnectionInputResolution()
}

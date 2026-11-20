import Foundation

/// Turns what the user gave the app into an entry, as Android's `ConnectionInputResolver` does (autobyteus-279 REQ-001):
/// a pairing link (scanned, pasted or shared) carries the desktop's decision, so its `http://` address needs no second
/// acknowledgement; a typed plain `http://` address needs the sheet's tick.
public final class ConnectionInputResolver {
    public init() {}

    /// The entry and page of a pairing link, or `nil` when the text is not one.
    public func resolvePairingLink(_ rawText: String) -> ParsedPairingInput? {
        guard let parsed = try? PairingLinkParser.parse(rawText), parsed.hasPairingPayload else { return nil }
        return ParsedPairingInput(
            entry: parsed.entry.updating(httpAcknowledged: true, nowEpochMilliseconds: parsed.entry.updatedAtEpochMilliseconds),
            webViewURL: parsed.webViewURL,
            hasPairingPayload: true
        )
    }

    /// "Type an address": a plain address; a plain `http://` one needs `httpAcknowledged`.
    public func resolveTypedAddress(_ rawText: String, httpAcknowledged: Bool) -> ConnectionInputResolution {
        guard let normalized = try? NodeURLNormalizer.normalize(rawText) else {
            return .failure(ConnectionDiagnosticMapper.invalidURL("Check the address and try again."))
        }
        let entry = SavedNodeEntry.fromNormalized(normalized, httpAcknowledged: normalized.scheme == "https" || httpAcknowledged)
        if entry.isHTTP && !entry.httpAcknowledged {
            return .failure(ConnectionDiagnosticMapper.httpNeedsAcknowledgement(entry.mobileURL))
        }
        return .success(entry: entry, webViewURL: normalized.mobileURL)
    }
}

public enum ConnectionInputResolution: Equatable {
    case success(entry: SavedNodeEntry, webViewURL: String)
    case failure(ConnectionDiagnostic)
}

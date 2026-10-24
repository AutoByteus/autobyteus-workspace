import Foundation

public final class ConnectionInputResolver {
    public init() {}

    public func resolve(rawText: String, httpAcknowledged: Bool) -> ConnectionInputResolution {
        do {
            let parsed = try PairingLinkParser.parse(rawText)
            let entry = parsed.entry.updating(
                httpAcknowledged: parsed.entry.scheme == "https" || httpAcknowledged
            )
            if entry.isHTTP && !entry.httpAcknowledged {
                return .failure(ConnectionDiagnosticMapper.httpNeedsAcknowledgement(entry.mobileURL))
            }
            return .success(entry: entry, webViewURL: parsed.webViewURL)
        } catch {
            return .failure(
                ConnectionDiagnosticMapper.invalidURL(
                    (error as? LocalizedError)?.errorDescription ?? "The URL or pairing payload could not be parsed."
                )
            )
        }
    }
}

public enum ConnectionInputResolution: Equatable {
    case success(entry: SavedNodeEntry, webViewURL: String)
    case failure(ConnectionDiagnostic)
}

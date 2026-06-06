import Foundation

public final class ConnectionInputResolver {
    public init() {}

    public func resolve(rawText: String, httpAcknowledged: Bool) -> ConnectionInputResolution {
        do {
            let parsed = try PairingLinkParser.parse(rawText)
            let profile = parsed.profile.updating(
                httpAcknowledged: parsed.profile.scheme == "https" || httpAcknowledged
            )
            if profile.isHTTP && !profile.httpAcknowledged {
                return .failure(ConnectionDiagnosticMapper.httpNeedsAcknowledgement(profile.mobileURL))
            }
            return .success(profile: profile, webViewURL: parsed.webViewURL)
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
    case success(profile: SavedNodeProfile, webViewURL: String)
    case failure(ConnectionDiagnostic)
}

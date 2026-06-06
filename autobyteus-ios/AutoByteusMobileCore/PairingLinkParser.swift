import Foundation

public struct PairingPayload: Codable, Equatable {
    public let serverBaseURL: String
    public let pairingCode: String
    public let serverName: String?

    public init(serverBaseURL: String, pairingCode: String, serverName: String?) {
        self.serverBaseURL = serverBaseURL
        self.pairingCode = pairingCode
        self.serverName = serverName
    }

    private enum CodingKeys: String, CodingKey {
        case serverBaseURL = "serverBaseUrl"
        case pairingCode
        case serverName
    }
}

public struct ParsedPairingInput: Equatable {
    public let profile: SavedNodeProfile
    public let webViewURL: String
    public let hasPairingPayload: Bool

    public init(profile: SavedNodeProfile, webViewURL: String, hasPairingPayload: Bool) {
        self.profile = profile
        self.webViewURL = webViewURL
        self.hasPairingPayload = hasPairingPayload
    }
}

public enum PairingLinkParser {
    public static func parse(_ rawText: String) throws -> ParsedPairingInput {
        let text = rawText.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !text.isEmpty else {
            throw NodeURLNormalizationError("Paste a Phone Access link, pairing payload, or node URL.")
        }

        if !text.hasPrefix("{"), let urlCandidate = extractURL(from: text) {
            return try parseURL(urlCandidate)
        }

        do {
            let payload = try parsePairingPayload(text)
            let encoded = try encodePairingPayload(raw: text, payload: payload)
            let normalized = try NodeURLNormalizer.normalize(payload.serverBaseURL)
            let profile = SavedNodeProfile.fromNormalized(
                normalized,
                displayName: payload.serverName,
                httpAcknowledged: normalized.scheme == "https"
            )
            return ParsedPairingInput(
                profile: profile,
                webViewURL: "\(normalized.mobileURL)?pairing=\(encoded)",
                hasPairingPayload: true
            )
        } catch let payloadError as NodeURLNormalizationError {
            do {
                let normalized = try NodeURLNormalizer.normalize(text)
                return ParsedPairingInput(
                    profile: SavedNodeProfile.fromNormalized(normalized),
                    webViewURL: normalized.mobileURL,
                    hasPairingPayload: false
                )
            } catch {
                throw payloadError
            }
        }
    }

    public static func parsePairingPayload(_ rawPayload: String) throws -> PairingPayload {
        let trimmed = rawPayload.trimmingCharacters(in: .whitespacesAndNewlines)
        let data: Data
        if trimmed.hasPrefix("{") {
            guard let jsonData = trimmed.data(using: .utf8) else {
                throw NodeURLNormalizationError("Pairing payload JSON must be valid UTF-8.")
            }
            data = jsonData
        } else {
            data = try decodeBase64URL(trimmed)
        }

        do {
            let payload = try JSONDecoder().decode(PairingPayload.self, from: data)
            guard !payload.serverBaseURL.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else {
                throw NodeURLNormalizationError("Pairing payload is missing serverBaseUrl.")
            }
            guard !payload.pairingCode.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else {
                throw NodeURLNormalizationError("Pairing payload is missing pairingCode.")
            }
            return payload
        } catch let normalizerError as NodeURLNormalizationError {
            throw normalizerError
        } catch {
            throw NodeURLNormalizationError("Pairing payload must include serverBaseUrl and pairingCode.")
        }
    }

    private static func parseURL(_ url: String) throws -> ParsedPairingInput {
        guard let components = URLComponents(string: url) else {
            throw NodeURLNormalizationError("The URL could not be parsed.")
        }
        let pairingParam = components.queryItems?.first { $0.name == "pairing" }?.value
        if let pairingParam, !pairingParam.isEmpty {
            let payload = try parsePairingPayload(pairingParam)
            let normalized = try NodeURLNormalizer.normalize(payload.serverBaseURL)
            let profile = SavedNodeProfile.fromNormalized(
                normalized,
                displayName: payload.serverName,
                httpAcknowledged: normalized.scheme == "https"
            )
            return ParsedPairingInput(
                profile: profile,
                webViewURL: "\(normalized.mobileURL)?pairing=\(pairingParam)",
                hasPairingPayload: true
            )
        }

        let normalized = try NodeURLNormalizer.normalize(url)
        return ParsedPairingInput(
            profile: SavedNodeProfile.fromNormalized(normalized),
            webViewURL: normalized.mobileURL,
            hasPairingPayload: false
        )
    }

    private static func encodePairingPayload(raw: String, payload: PairingPayload) throws -> String {
        let trimmed = raw.trimmingCharacters(in: .whitespacesAndNewlines)
        guard trimmed.hasPrefix("{") else { return trimmed }
        let data = try JSONEncoder().encode(payload)
        return data.base64EncodedString()
            .replacingOccurrences(of: "+", with: "-")
            .replacingOccurrences(of: "/", with: "_")
            .replacingOccurrences(of: "=", with: "")
    }

    private static func decodeBase64URL(_ value: String) throws -> Data {
        var base64 = value
            .replacingOccurrences(of: "-", with: "+")
            .replacingOccurrences(of: "_", with: "/")
        let remainder = base64.count % 4
        if remainder > 0 {
            base64 += String(repeating: "=", count: 4 - remainder)
        }
        guard let data = Data(base64Encoded: base64) else {
            throw NodeURLNormalizationError("Pairing payload must be a Phone Access URL, base64url payload, or JSON payload.")
        }
        return data
    }

    private static func extractURL(from text: String) -> String? {
        if text.range(of: #"^https?://"#, options: [.regularExpression, .caseInsensitive]) != nil {
            return text
        }
        guard let range = text.range(
            of: #"https?://[^\s<>"']+"#,
            options: [.regularExpression, .caseInsensitive]
        ) else {
            return nil
        }
        return String(text[range])
    }
}

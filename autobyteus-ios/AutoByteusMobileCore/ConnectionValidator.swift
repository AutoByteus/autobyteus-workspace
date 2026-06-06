import Foundation

public struct RemoteAccessStatus: Codable, Equatable {
    public let phoneAccessEnabled: Bool
    public let pairingAvailable: Bool
    public let compatibilityVersion: Int
    public let serverName: String
    public let serverInstanceID: String?

    public init(
        phoneAccessEnabled: Bool,
        pairingAvailable: Bool,
        compatibilityVersion: Int,
        serverName: String,
        serverInstanceID: String? = nil
    ) {
        self.phoneAccessEnabled = phoneAccessEnabled
        self.pairingAvailable = pairingAvailable
        self.compatibilityVersion = compatibilityVersion
        self.serverName = serverName
        self.serverInstanceID = serverInstanceID
    }

    private enum CodingKeys: String, CodingKey {
        case phoneAccessEnabled
        case pairingAvailable
        case compatibilityVersion
        case serverName
        case serverInstanceID = "serverInstanceId"
    }

    public init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        let decodedName = try container.decodeIfPresent(String.self, forKey: .serverName) ?? "AutoByteus Desktop"
        self.init(
            phoneAccessEnabled: try container.decodeIfPresent(Bool.self, forKey: .phoneAccessEnabled) ?? false,
            pairingAvailable: try container.decodeIfPresent(Bool.self, forKey: .pairingAvailable) ?? false,
            compatibilityVersion: try container.decodeIfPresent(Int.self, forKey: .compatibilityVersion) ?? 0,
            serverName: decodedName.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty ? "AutoByteus Desktop" : decodedName,
            serverInstanceID: try container.decodeIfPresent(String.self, forKey: .serverInstanceID)
        )
    }

    public func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        try container.encode(phoneAccessEnabled, forKey: .phoneAccessEnabled)
        try container.encode(pairingAvailable, forKey: .pairingAvailable)
        try container.encode(compatibilityVersion, forKey: .compatibilityVersion)
        try container.encode(serverName, forKey: .serverName)
        try container.encodeIfPresent(serverInstanceID, forKey: .serverInstanceID)
    }

    public static func fromJSONData(_ data: Data) throws -> RemoteAccessStatus {
        try JSONDecoder().decode(RemoteAccessStatus.self, from: data)
    }
}

public enum ConnectionValidationResult: Equatable {
    case reachable(profile: SavedNodeProfile, status: RemoteAccessStatus)
    case failed(ConnectionDiagnostic)
}

public final class ConnectionValidator {
    private let session: URLSession
    private let minimumCompatibilityVersion: Int

    public convenience init(
        timeoutSeconds: TimeInterval = 5,
        minimumCompatibilityVersion: Int = 1
    ) {
        let configuration = URLSessionConfiguration.ephemeral
        configuration.timeoutIntervalForRequest = timeoutSeconds
        configuration.timeoutIntervalForResource = timeoutSeconds
        configuration.waitsForConnectivity = false
        self.init(
            session: URLSession(configuration: configuration),
            minimumCompatibilityVersion: minimumCompatibilityVersion
        )
    }

    public init(session: URLSession, minimumCompatibilityVersion: Int = 1) {
        self.session = session
        self.minimumCompatibilityVersion = minimumCompatibilityVersion
    }

    public func validate(profile: SavedNodeProfile) async -> ConnectionValidationResult {
        await validate(baseURL: profile.baseURL, existingProfile: profile)
    }

    public func validate(
        baseURL: String,
        existingProfile: SavedNodeProfile? = nil
    ) async -> ConnectionValidationResult {
        let normalized: NormalizedNodeURL
        do {
            normalized = try NodeURLNormalizer.normalize(baseURL)
        } catch {
            return .failed(
                ConnectionDiagnosticMapper.invalidURL(
                    (error as? LocalizedError)?.errorDescription ?? "Invalid URL."
                )
            )
        }

        let profile = existingProfile ?? SavedNodeProfile.fromNormalized(normalized)
        guard let statusEndpoint = URL(string: normalized.statusURL) else {
            return .failed(ConnectionDiagnosticMapper.invalidURL("The status URL could not be built."))
        }

        var request = URLRequest(url: statusEndpoint)
        request.httpMethod = "GET"
        request.setValue("application/json", forHTTPHeaderField: "Accept")

        do {
            let (data, response) = try await session.data(for: request)
            guard let http = response as? HTTPURLResponse else {
                return .failed(ConnectionDiagnosticMapper.webViewLoadFailed("The node returned a non-HTTP response."))
            }
            return mapStatusResponse(statusCode: http.statusCode, data: data, profile: profile)
        } catch {
            return .failed(ConnectionDiagnosticMapper.fromError(error))
        }
    }

    public func mapStatusResponse(
        statusCode: Int,
        data: Data,
        profile: SavedNodeProfile
    ) -> ConnectionValidationResult {
        guard (200...299).contains(statusCode) else {
            return .failed(ConnectionDiagnosticMapper.fromHTTPStatus(statusCode))
        }
        do {
            let status = try RemoteAccessStatus.fromJSONData(data)
            guard status.compatibilityVersion >= minimumCompatibilityVersion else {
                return .failed(ConnectionDiagnosticMapper.incompatibleServer())
            }
            guard status.phoneAccessEnabled else {
                return .failed(ConnectionDiagnosticMapper.phoneAccessDisabled(serverName: status.serverName))
            }
            return .reachable(profile: profile, status: status)
        } catch {
            return .failed(ConnectionDiagnosticMapper.webViewLoadFailed("The Phone Access status response could not be parsed."))
        }
    }
}

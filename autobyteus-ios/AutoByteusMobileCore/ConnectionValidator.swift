import Foundation

/// The node's Phone Access status (`GET /rest/remote-access/status`), as far as the phone reads it: whether it can be
/// used. The node's name comes from its QR or its page's pairing (`SavedNodeEntry.knownName`), never from here.
public struct RemoteAccessStatus: Codable, Equatable {
    public let phoneAccessEnabled: Bool
    public let pairingAvailable: Bool
    public let nodeID: String?

    public init(phoneAccessEnabled: Bool, pairingAvailable: Bool, nodeID: String? = nil) {
        self.phoneAccessEnabled = phoneAccessEnabled
        self.pairingAvailable = pairingAvailable
        self.nodeID = nodeID
    }

    private enum CodingKeys: String, CodingKey {
        case phoneAccessEnabled
        case pairingAvailable
        case nodeID = "nodeId"
    }

    public init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        self.init(
            phoneAccessEnabled: try container.decodeIfPresent(Bool.self, forKey: .phoneAccessEnabled) ?? false,
            pairingAvailable: try container.decodeIfPresent(Bool.self, forKey: .pairingAvailable) ?? false,
            nodeID: try container.decodeIfPresent(String.self, forKey: .nodeID)
        )
    }

    public static func fromJSONData(_ data: Data) throws -> RemoteAccessStatus {
        try JSONDecoder().decode(RemoteAccessStatus.self, from: data)
    }
}

public enum ConnectionValidationResult: Equatable {
    case reachable(entry: SavedNodeEntry, status: RemoteAccessStatus)
    case failed(ConnectionDiagnostic)
}

public final class ConnectionValidator {
    private let session: URLSession

    public convenience init(timeoutSeconds: TimeInterval = 5) {
        let configuration = URLSessionConfiguration.ephemeral
        configuration.timeoutIntervalForRequest = timeoutSeconds
        configuration.timeoutIntervalForResource = timeoutSeconds
        configuration.waitsForConnectivity = false
        self.init(session: URLSession(configuration: configuration))
    }

    public init(session: URLSession) {
        self.session = session
    }

    public func validate(entry: SavedNodeEntry) async -> ConnectionValidationResult {
        await validate(baseURL: entry.baseURL, existingEntry: entry)
    }

    public func validate(
        baseURL: String,
        existingEntry: SavedNodeEntry? = nil
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

        let entry = existingEntry ?? SavedNodeEntry.fromNormalized(normalized)
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
            return mapStatusResponse(statusCode: http.statusCode, data: data, entry: entry)
        } catch {
            return .failed(ConnectionDiagnosticMapper.fromError(error))
        }
    }

    public func mapStatusResponse(
        statusCode: Int,
        data: Data,
        entry: SavedNodeEntry
    ) -> ConnectionValidationResult {
        guard (200...299).contains(statusCode) else {
            return .failed(ConnectionDiagnosticMapper.fromHTTPStatus(statusCode))
        }
        do {
            let status = try RemoteAccessStatus.fromJSONData(data)
            guard status.phoneAccessEnabled else {
                return .failed(ConnectionDiagnosticMapper.phoneAccessDisabled())
            }
            return .reachable(entry: entry, status: status)
        } catch {
            return .failed(ConnectionDiagnosticMapper.webViewLoadFailed("The Phone Access status response could not be parsed."))
        }
    }
}

import Foundation

/// iOS-owned identity for a reachable AutoByteus desktop/server node.
///
/// This model intentionally stores only node metadata. Phone Access credentials such as `mra_...`
/// remain owned by the existing server-served `/mobile` web shell in WKWebView-local storage.
public struct SavedNodeProfile: Codable, Equatable, Identifiable {
    public let id: String
    public let displayName: String
    public let baseURL: String
    public let mobileURL: String
    public let scheme: String
    public let host: String
    public let port: Int?
    public let httpAcknowledged: Bool
    public let createdAtEpochMilliseconds: Int64
    public let updatedAtEpochMilliseconds: Int64

    public var origin: String { buildOrigin(scheme: scheme, host: host, port: port) }
    public var isHTTP: Bool { scheme.caseInsensitiveCompare("http") == .orderedSame }

    public init(
        id: String,
        displayName: String,
        baseURL: String,
        mobileURL: String,
        scheme: String,
        host: String,
        port: Int?,
        httpAcknowledged: Bool,
        createdAtEpochMilliseconds: Int64,
        updatedAtEpochMilliseconds: Int64
    ) {
        self.id = id
        self.displayName = displayName
        self.baseURL = baseURL
        self.mobileURL = mobileURL
        self.scheme = scheme
        self.host = host
        self.port = port
        self.httpAcknowledged = httpAcknowledged
        self.createdAtEpochMilliseconds = createdAtEpochMilliseconds
        self.updatedAtEpochMilliseconds = updatedAtEpochMilliseconds
    }

    public static func fromNormalized(
        _ normalized: NormalizedNodeURL,
        displayName: String? = nil,
        httpAcknowledged: Bool? = nil,
        nowEpochMilliseconds: Int64 = currentEpochMilliseconds(),
        previous: SavedNodeProfile? = nil
    ) -> SavedNodeProfile {
        let origin = buildOrigin(scheme: normalized.scheme, host: normalized.host, port: normalized.port)
        return SavedNodeProfile(
            id: origin,
            displayName: displayName?.trimmedNonEmpty ?? normalized.host,
            baseURL: normalized.baseURL,
            mobileURL: normalized.mobileURL,
            scheme: normalized.scheme,
            host: normalized.host,
            port: normalized.port,
            httpAcknowledged: httpAcknowledged ?? (normalized.scheme == "https"),
            createdAtEpochMilliseconds: previous?.createdAtEpochMilliseconds ?? nowEpochMilliseconds,
            updatedAtEpochMilliseconds: nowEpochMilliseconds
        )
    }

    public func updating(
        displayName: String? = nil,
        httpAcknowledged: Bool? = nil,
        nowEpochMilliseconds: Int64 = currentEpochMilliseconds()
    ) -> SavedNodeProfile {
        SavedNodeProfile(
            id: id,
            displayName: displayName?.trimmedNonEmpty ?? self.displayName,
            baseURL: baseURL,
            mobileURL: mobileURL,
            scheme: scheme,
            host: host,
            port: port,
            httpAcknowledged: httpAcknowledged ?? self.httpAcknowledged,
            createdAtEpochMilliseconds: createdAtEpochMilliseconds,
            updatedAtEpochMilliseconds: nowEpochMilliseconds
        )
    }
}

public func currentEpochMilliseconds(date: Date = Date()) -> Int64 {
    Int64((date.timeIntervalSince1970 * 1000).rounded())
}

private extension String {
    var trimmedNonEmpty: String? {
        let value = trimmingCharacters(in: .whitespacesAndNewlines)
        return value.isEmpty ? nil : value
    }
}

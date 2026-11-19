import Foundation

/// iOS-owned identity for a reachable AutoByteus desktop/server node.
///
/// This model intentionally stores only node metadata. Phone Access credentials such as `mra_...`
/// remain owned by the existing server-served `/mobile` web shell in WKWebView-local storage.
///
/// A node is shown by its name, never by its address, as on Android (`SavedNodeEntry.kt`; autobyteus-279 SR-004): the
/// native screens read `shownName`, the pairing flow and the page's bridge read `knownName`; nothing else interprets
/// `displayName`.
public struct SavedNodeEntry: Codable, Equatable, Identifiable {
    /// The label for a node with no name: the product's word for what the phone connects to.
    public static let unnamedNodeName = "AutoByteus node"

    public let id: String
    /// The stored name: the node's name from its QR or its page's pairing, or its `host` when it has none.
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

    /// The node's name from its QR or its page's pairing; `nil` for a typed address, or a saved name that is its host.
    public var knownName: String? {
        guard let name = displayName.trimmedNonEmpty, name.caseInsensitiveCompare(host) != .orderedSame else { return nil }
        return name
    }

    /// What the phone shows for this node: its `knownName`, else "AutoByteus node". Never an address.
    public var shownName: String { knownName ?? Self.unnamedNodeName }

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
        previous: SavedNodeEntry? = nil
    ) -> SavedNodeEntry {
        let origin = buildOrigin(scheme: normalized.scheme, host: normalized.host, port: normalized.port)
        return SavedNodeEntry(
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
    ) -> SavedNodeEntry {
        SavedNodeEntry(
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

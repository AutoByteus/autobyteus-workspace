import Foundation

public struct NodeURLNormalizationError: Error, LocalizedError, Equatable {
    public let message: String

    public init(_ message: String) {
        self.message = message
    }

    public var errorDescription: String? { message }
}

public struct NormalizedNodeURL: Codable, Equatable {
    public let baseURL: String
    public let mobileURL: String
    public let statusURL: String
    public let scheme: String
    public let host: String
    public let port: Int?

    public init(
        baseURL: String,
        mobileURL: String,
        statusURL: String,
        scheme: String,
        host: String,
        port: Int?
    ) {
        self.baseURL = baseURL
        self.mobileURL = mobileURL
        self.statusURL = statusURL
        self.scheme = scheme
        self.host = host
        self.port = port
    }
}

public enum NodeURLNormalizer {
    public static func normalize(_ rawInput: String) throws -> NormalizedNodeURL {
        let input = rawInput.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !input.isEmpty else {
            throw NodeURLNormalizationError("Enter an AutoByteus node URL.")
        }

        let withScheme = hasSchemePrefix(input) ? input : "https://\(input)"
        guard let components = URLComponents(string: withScheme) else {
            throw NodeURLNormalizationError("The URL could not be parsed.")
        }

        guard let rawScheme = components.scheme?.lowercased() else {
            throw NodeURLNormalizationError("The URL must include http:// or https://.")
        }
        guard rawScheme == "https" || rawScheme == "http" else {
            throw NodeURLNormalizationError("Only http:// and https:// AutoByteus node URLs are supported.")
        }
        guard let rawHost = components.host?.lowercased(), !rawHost.isEmpty else {
            throw NodeURLNormalizationError("The URL must include a host name or IP address.")
        }

        let path = components.percentEncodedPath.isEmpty ? "/" : components.percentEncodedPath
        guard isRecognizedAutoByteusPath(path) else {
            throw NodeURLNormalizationError("Use the node base URL, /mobile URL, or /rest/remote-access/status URL.")
        }

        let normalizedPort = components.port
        let baseURL = buildOrigin(scheme: rawScheme, host: rawHost, port: normalizedPort)
        return NormalizedNodeURL(
            baseURL: baseURL,
            mobileURL: "\(baseURL)/mobile",
            statusURL: "\(baseURL)/rest/remote-access/status",
            scheme: rawScheme,
            host: rawHost,
            port: normalizedPort
        )
    }

    public static func stableMobileURL(_ rawInput: String) throws -> String {
        try normalize(rawInput).mobileURL
    }

    private static func isRecognizedAutoByteusPath(_ path: String) -> Bool {
        let cleanPath = path.isEmpty ? "/" : path
        return cleanPath == "/" ||
            cleanPath == "/mobile" ||
            cleanPath.hasPrefix("/mobile/") ||
            cleanPath.hasPrefix("/rest/") ||
            cleanPath == "/graphql" ||
            cleanPath.hasPrefix("/graphql/")
    }

    private static func hasSchemePrefix(_ value: String) -> Bool {
        value.range(of: #"^[a-zA-Z][a-zA-Z0-9+.-]*://"#, options: .regularExpression) != nil
    }
}

public func buildOrigin(scheme: String, host: String, port: Int?) -> String {
    let normalizedScheme = scheme.lowercased()
    let normalizedHost = host.lowercased()
    let hostForURL = normalizedHost.contains(":") && !normalizedHost.hasPrefix("[")
        ? "[\(normalizedHost)]"
        : normalizedHost
    let portPart = port.map { ":\($0)" } ?? ""
    return "\(normalizedScheme)://\(hostForURL)\(portPart)"
}

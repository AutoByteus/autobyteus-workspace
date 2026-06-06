import Foundation

public enum NavigationDecisionType: String, Codable, Equatable {
    case allowInWebView
    case openExternal
    case block
}

public struct NavigationDecision: Codable, Equatable {
    public let type: NavigationDecisionType
    public let reason: String

    public init(type: NavigationDecisionType, reason: String) {
        self.type = type
        self.reason = reason
    }
}

public enum TrustedNavigationPolicy {
    public static func classify(targetURL: String, profile: SavedNodeProfile) -> NavigationDecision {
        guard let components = URLComponents(string: targetURL) else {
            return NavigationDecision(type: .block, reason: "URL could not be parsed")
        }
        guard let scheme = components.scheme?.lowercased() else {
            return NavigationDecision(type: .block, reason: "URL has no scheme")
        }

        if ["mailto", "tel", "sms"].contains(scheme) {
            return NavigationDecision(type: .openExternal, reason: "Non-web link opens outside AutoByteus")
        }
        guard scheme == "http" || scheme == "https" else {
            return NavigationDecision(type: .block, reason: "Unsupported scheme")
        }
        guard let host = components.host?.lowercased() else {
            return NavigationDecision(type: .block, reason: "URL has no host")
        }

        let sameOrigin = scheme == profile.scheme.lowercased()
            && host == profile.host.lowercased()
            && normalizedPort(scheme: scheme, port: components.port) == normalizedPort(scheme: profile.scheme, port: profile.port)
        guard sameOrigin else {
            return NavigationDecision(type: .openExternal, reason: "Different origin opens outside the WebView")
        }

        let path = components.percentEncodedPath.isEmpty ? "/" : components.percentEncodedPath
        guard isAllowedAutoByteusPath(path) else {
            return NavigationDecision(type: .block, reason: "Same-origin path is outside the mobile shell allowlist")
        }
        return NavigationDecision(type: .allowInWebView, reason: "Trusted AutoByteus mobile origin")
    }

    private static func isAllowedAutoByteusPath(_ path: String) -> Bool {
        let cleanPath = path.isEmpty ? "/" : path
        return cleanPath == "/mobile" ||
            cleanPath.hasPrefix("/mobile/") ||
            cleanPath.hasPrefix("/rest/") ||
            cleanPath == "/graphql" ||
            cleanPath.hasPrefix("/graphql/") ||
            cleanPath.hasPrefix("/_nuxt/") ||
            cleanPath.hasPrefix("/__nuxt/") ||
            cleanPath.hasPrefix("/assets/") ||
            cleanPath == "/mobile.webmanifest" ||
            cleanPath == "/autobyteus-icon.svg" ||
            cleanPath == "/favicon.ico"
    }

    private static func normalizedPort(scheme: String, port: Int?) -> Int {
        if let port { return port }
        if scheme.caseInsensitiveCompare("https") == .orderedSame { return 443 }
        if scheme.caseInsensitiveCompare("http") == .orderedSame { return 80 }
        return -1
    }
}

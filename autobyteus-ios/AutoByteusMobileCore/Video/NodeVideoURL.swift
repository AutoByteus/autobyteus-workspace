import Foundation

/// A node video's URLs (autobyteus-574 D-4, D-5): which URL the player may read with the phone's credential, and the
/// asset URL AVFoundation is given so that every read goes through the app's loader (a scheme of the app's own).
public enum NodeVideoURL {
    /// The prefix of the asset's scheme: `http` becomes `abmedia-http`, `https` becomes `abmedia-https`.
    public static let assetSchemePrefix = "abmedia-"

    /// Whether `url` is a file route of the node at `nodeOrigin` (`scheme://host[:port]`): the same scheme, host and port
    /// (the scheme's default when absent), no user info, and a path under `/rest/`.
    public static func isNodeFileURL(_ url: URL, nodeOrigin: String) -> Bool {
        guard let node = URL(string: nodeOrigin),
              let scheme = url.scheme?.lowercased(), scheme == "http" || scheme == "https",
              scheme == node.scheme?.lowercased(),
              let host = url.host, let nodeHost = node.host, host.caseInsensitiveCompare(nodeHost) == .orderedSame,
              effectivePort(url) == effectivePort(node),
              url.user == nil, url.password == nil
        else { return false }
        return url.path.hasPrefix("/rest/") || (URLComponents(url: url, resolvingAgainstBaseURL: false)?.percentEncodedPath.hasPrefix("/rest/") ?? false)
    }

    /// The URL AVFoundation is given for `url`: the same URL under the app's scheme, so AVFoundation asks the loader.
    public static func assetURL(for url: URL) -> URL? {
        guard var components = URLComponents(url: url, resolvingAgainstBaseURL: false), let scheme = components.scheme?.lowercased(),
              scheme == "http" || scheme == "https" else { return nil }
        components.scheme = assetSchemePrefix + scheme
        return components.url
    }

    /// The network URL of an asset URL; `nil` for any other URL.
    public static func networkURL(for assetURL: URL) -> URL? {
        guard var components = URLComponents(url: assetURL, resolvingAgainstBaseURL: false), let scheme = components.scheme?.lowercased(),
              scheme.hasPrefix(assetSchemePrefix) else { return nil }
        let network = String(scheme.dropFirst(assetSchemePrefix.count))
        guard network == "http" || network == "https" else { return nil }
        components.scheme = network
        return components.url
    }

    private static func effectivePort(_ url: URL) -> Int {
        url.port ?? (url.scheme?.lowercased() == "https" ? 443 : 80)
    }
}

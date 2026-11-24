import Foundation

/// A page's request to play a protected node video (autobyteus-574 D-2, D-5, the bridge's `playVideo`): its URL, its file
/// name for the player's title, and the phone's credential for this one playback. Read from the page's message, it is
/// played only for a file route of the page's own node (`isFor(nodeOrigin:)`), so the credential goes nowhere else.
/// Neither the credential nor the URL is ever printed.
public struct NodeVideoPlayRequest: Equatable, CustomStringConvertible {
    public let url: URL
    public let title: String
    public let credential: String

    static let maxCredentialCharacters = 1024
    static let maxTitleCharacters = 200

    public init(url: URL, title: String, credential: String) {
        self.url = url
        self.title = title
        self.credential = credential
    }

    /// The request in a page message's fields: an absolute http(s) URL, a credential that is one token (no whitespace or
    /// control character), and a title kept only when it is a plain file name. `nil` for anything else.
    public static func read(_ object: [String: Any]) -> NodeVideoPlayRequest? {
        guard let text = object["url"] as? String, let url = URL(string: text), let scheme = url.scheme?.lowercased(),
              scheme == "http" || scheme == "https", url.host != nil,
              let credential = object["credential"] as? String, !credential.isEmpty, credential.count <= maxCredentialCharacters,
              credential.unicodeScalars.allSatisfy({ $0.value > 0x20 && $0.value != 0x7f && !CharacterSet.whitespacesAndNewlines.contains($0) })
        else { return nil }
        let title = (object["title"] as? String ?? "").trimmingCharacters(in: .whitespaces)
        let plain = title.count <= maxTitleCharacters && !title.contains("/") && !title.contains("\\")
            && !title.unicodeScalars.contains { $0.value < 0x20 || $0.value == 0x7f } && title != "." && title != ".."
        return NodeVideoPlayRequest(url: url, title: plain ? title : "", credential: credential)
    }

    /// Whether the video is a file route of the node at `nodeOrigin` (the page's own origin).
    public func isFor(nodeOrigin: String) -> Bool { NodeVideoURL.isNodeFileURL(url, nodeOrigin: nodeOrigin) }

    public var description: String { "NodeVideoPlayRequest(title: \(title), url: <redacted>, credential: <redacted>)" }
}

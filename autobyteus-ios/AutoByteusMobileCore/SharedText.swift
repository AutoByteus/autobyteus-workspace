import Foundation

/// The demo's link (autobyteus-279 REQ-002): the printed demo QR code and the Camera app's link open the demo.
public enum DemoLink {
    public static let url = "autobyteus://demo"

    public static func matches(_ text: String) -> Bool {
        let value = text.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
        return value == url || value == "\(url)/"
    }
}

/// What text shared to the app (or kept by its share extension) does (autobyteus-279 REQ-007, as Android's
/// `NodeConnectionFlow.connect`): a pairing link connects, the demo link opens the demo, other text opens Type an address
/// pre-filled; nothing usable does nothing.
public enum SharedTextAction: Equatable {
    case connect(pairingLink: String)
    case openDemo
    case typeAddress(prefill: String)
    case nothing

    public static func classify(_ rawText: String, resolver: ConnectionInputResolver = ConnectionInputResolver()) -> SharedTextAction {
        let text = rawText.trimmingCharacters(in: .whitespacesAndNewlines)
        if text.isEmpty { return .nothing }
        if DemoLink.matches(text) { return .openDemo }
        if resolver.resolvePairingLink(text) != nil { return .connect(pairingLink: text) }
        return .typeAddress(prefill: text)
    }

    /// The share sheet's message (UI spec UIS-016, exact copy).
    public var shareMessage: String {
        switch self {
        case .connect: return "Saved. Open AutoByteus to connect."
        case .openDemo: return "Saved. Open AutoByteus to see the demo."
        case .typeAddress: return "Saved. Open AutoByteus to use it as an address."
        case .nothing: return "AutoByteus couldn’t read text or a link from this share."
        }
    }
}

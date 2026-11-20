import Foundation

/// Why "Can't reach <node>" shows, as Android's `CantReachReason` (autobyteus-279 REQ-001): whether Retry and
/// "Open Tailscale" are offered, and the plain body text. No text carries an address, a URL or an error's own text.
public enum CantReachReason: String, Equatable, CaseIterable {
    /// Nothing answered at the address: not on the same network, and no Tailscale.
    case noSharedNetwork
    /// The address answered with an error: the node is asleep or not serving.
    case noAnswer
    case phoneAccessOff
    /// A typed address that could not be read.
    case addressNotUsable
    case notAnAutoByteusCode

    public var canRetry: Bool {
        switch self {
        case .noSharedNetwork, .noAnswer, .phoneAccessOff: return true
        case .addressNotUsable, .notAnAutoByteusCode: return false
        }
    }

    public var offersTailscale: Bool { self == .noSharedNetwork }

    /// The body under "Can't reach <node>".
    public func text(nodeName: String) -> String {
        switch self {
        case .noSharedNetwork: return "Connect to the same Wi-Fi or VPN as the computer, or turn on Tailscale."
        case .noAnswer: return "\(nodeName) didn’t answer. Check that the computer is on and awake."
        case .phoneAccessOff: return "\(nodeName) is reachable, but Phone access is off."
        case .addressNotUsable: return "Check the address and try again."
        case .notAnAutoByteusCode: return "That isn’t an AutoByteus QR code."
        }
    }

    public static func reason(for diagnostic: ConnectionDiagnostic) -> CantReachReason {
        switch diagnostic.kind {
        case .networkUnreachable: return .noSharedNetwork
        case .phoneAccessDisabled: return .phoneAccessOff
        case .invalidURL, .httpNeedsAcknowledgement: return .addressNotUsable
        default: return .noAnswer
        }
    }
}

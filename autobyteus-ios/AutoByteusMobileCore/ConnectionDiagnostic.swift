import Foundation

public enum ConnectionFailureKind: String, Codable, Equatable, CaseIterable {
    case invalidURL
    case httpNeedsAcknowledgement
    case networkUnreachable
    case phoneAccessDisabled
    case authRequired
    case deviceRevoked
    case webSocketBlocked
    case serverVersionIncompatible
    case unsafeNavigationBlocked
    case webViewLoadFailed
    case cameraPermissionDenied
    case qrScanCancelled
    case qrScanUnavailable
}

public struct ConnectionDiagnostic: Codable, Equatable {
    public let kind: ConnectionFailureKind
    public let title: String
    public let message: String
    public let recoveryAction: String

    public init(
        kind: ConnectionFailureKind,
        title: String,
        message: String,
        recoveryAction: String
    ) {
        self.kind = kind
        self.title = title
        self.message = message
        self.recoveryAction = recoveryAction
    }
}

public enum ConnectionDiagnosticMapper {
    public static func invalidURL(_ message: String) -> ConnectionDiagnostic {
        ConnectionDiagnostic(
            kind: .invalidURL,
            title: "Check the AutoByteus URL",
            message: message,
            recoveryAction: "Use a stable Tailscale Serve, MagicDNS, LAN, or private-network URL that reaches the desktop node."
        )
    }

    public static func cameraPermissionDenied() -> ConnectionDiagnostic {
        ConnectionDiagnostic(
            kind: .cameraPermissionDenied,
            title: "Camera permission is needed",
            message: "AutoByteus needs camera permission to scan the Phone Access QR.",
            recoveryAction: "Grant camera permission in iOS Settings and scan again, or paste/manual-enter the Phone Access link text."
        )
    }

    public static func qrScanCancelled() -> ConnectionDiagnostic {
        ConnectionDiagnostic(
            kind: .qrScanCancelled,
            title: "QR scan was not completed",
            message: "No QR text was returned from the scanner.",
            recoveryAction: "Scan the Phone Access QR again, or paste/manual-enter the Phone Access link text."
        )
    }

    public static func qrScanUnavailable() -> ConnectionDiagnostic {
        ConnectionDiagnostic(
            kind: .qrScanUnavailable,
            title: "QR scanner is unavailable",
            message: "This device or simulator does not currently provide a camera for in-app QR scanning.",
            recoveryAction: "Use a camera-capable iPhone for QR validation, or paste/manual-enter the Phone Access link text."
        )
    }

    public static func httpNeedsAcknowledgement(_ url: String) -> ConnectionDiagnostic {
        ConnectionDiagnostic(
            kind: .httpNeedsAcknowledgement,
            title: "HTTP needs explicit acknowledgement",
            message: "\(url) uses cleartext HTTP. Prefer Tailscale Serve HTTPS for travel. Continue with HTTP only for a private LAN or tailnet you trust.",
            recoveryAction: "Turn on the private-network HTTP acknowledgement or switch to an https:// Tailscale Serve URL."
        )
    }

    public static func phoneAccessDisabled(serverName: String? = nil) -> ConnectionDiagnostic {
        ConnectionDiagnostic(
            kind: .phoneAccessDisabled,
            title: "Phone Access is disabled",
            message: "\(serverName?.nonEmpty ?? "This AutoByteus node") is reachable, but Phone Access is off.",
            recoveryAction: "Open AutoByteus on the desktop, go to Settings -> Nodes, enable Phone Access, then retry."
        )
    }

    public static func fromHTTPStatus(_ statusCode: Int) -> ConnectionDiagnostic {
        switch statusCode {
        case 401:
            return ConnectionDiagnostic(
                kind: .authRequired,
                title: "Pair this phone again",
                message: "The node rejected the current mobile credential.",
                recoveryAction: "Reset the saved node in this app, create a fresh Phone Access QR/link on desktop, and pair again."
            )
        case 403:
            return ConnectionDiagnostic(
                kind: .deviceRevoked,
                title: "Phone credential was rejected",
                message: "Phone Access may be disabled or this phone may have been revoked on the desktop node.",
                recoveryAction: "Enable Phone Access or revoke/re-pair from the desktop Phone Access card."
            )
        case 426:
            return incompatibleServer()
        default:
            return ConnectionDiagnostic(
                kind: .webViewLoadFailed,
                title: "AutoByteus returned HTTP \(statusCode)",
                message: "The saved node was reached, but the mobile shell could not load successfully.",
                recoveryAction: "Verify the saved URL, Phone Access state, and that the desktop server is serving /mobile."
            )
        }
    }

    public static func fromError(_ error: Error) -> ConnectionDiagnostic {
        let nsError = error as NSError
        let detail = nsError.localizedDescription.nonEmpty ?? String(describing: type(of: error))
        let likelyTLS = nsError.domain == NSURLErrorDomain && [
            NSURLErrorSecureConnectionFailed,
            NSURLErrorServerCertificateHasBadDate,
            NSURLErrorServerCertificateUntrusted,
            NSURLErrorServerCertificateHasUnknownRoot,
            NSURLErrorServerCertificateNotYetValid,
            NSURLErrorClientCertificateRejected,
            NSURLErrorClientCertificateRequired,
            NSURLErrorCannotLoadFromNetwork
        ].contains(nsError.code)
        let timedOut = nsError.domain == NSURLErrorDomain && nsError.code == NSURLErrorTimedOut
        return ConnectionDiagnostic(
            kind: .networkUnreachable,
            title: likelyTLS ? "Secure connection failed" : "AutoByteus node is unreachable",
            message: timedOut ? "The request timed out before the desktop node responded." : "The phone could not reach the saved AutoByteus node. Details: \(detail)",
            recoveryAction: likelyTLS
                ? "Use a valid Tailscale Serve HTTPS URL, or acknowledge private HTTP if you are using a LAN/tailnet URL."
                : "Connect Tailscale, confirm the desktop is online and awake, check split tunneling, then retry."
        )
    }

    public static func incompatibleServer() -> ConnectionDiagnostic {
        ConnectionDiagnostic(
            kind: .serverVersionIncompatible,
            title: "Desktop node needs an update",
            message: "The iOS shell and desktop node reported incompatible remote-access versions.",
            recoveryAction: "Update AutoByteus on the desktop and rebuild/reinstall the iOS app if needed."
        )
    }

    public static func unsafeNavigationBlocked(_ url: String) -> ConnectionDiagnostic {
        ConnectionDiagnostic(
            kind: .unsafeNavigationBlocked,
            title: "Navigation blocked",
            message: "The app blocked an untrusted in-WebView navigation: \(url)",
            recoveryAction: "Open unrelated links in the system browser. AutoByteus mobile stays on the saved node origin."
        )
    }

    public static func webViewLoadFailed(_ description: String) -> ConnectionDiagnostic {
        ConnectionDiagnostic(
            kind: .webViewLoadFailed,
            title: "Mobile shell failed to load",
            message: description,
            recoveryAction: "Retry, connect Tailscale, verify the desktop is online, or reset and pair again."
        )
    }
}

private extension String {
    var nonEmpty: String? {
        let trimmed = trimmingCharacters(in: .whitespacesAndNewlines)
        return trimmed.isEmpty ? nil : trimmed
    }
}

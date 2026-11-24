import AutoByteusMobileCore
import UIKit
import WebKit

/// What a page asks the app through its shell bridge, Android's contract (`autobyteus-web/utils/remoteAccess/shellBridge.ts`).
enum ShellBridgeMessage: Equatable, CustomStringConvertible {
    case hello
    case pageReady
    case paired(nodeName: String)
    case showNodeList
    case startScan
    case desktopFullScreen(on: Bool)
    case saveFile(fileName: String, mimeType: String, base64: String)
    /// The iOS demo's Leave demo (autobyteus-279 DS-004).
    case leaveDemo
    /// A protected node video to play in the app's player (autobyteus-574 D-2, D-5): the handler passes it on only for a
    /// file route of the page's own node; the credential is for this playback only and never printed.
    case playVideo(NodeVideoPlayRequest)

    /// Never the credential, a video's URL or a file's bytes.
    var description: String {
        switch self {
        case .hello: return "hello"
        case .pageReady: return "pageReady"
        case .paired: return "paired"
        case .showNodeList: return "showNodeList"
        case .startScan: return "startScan"
        case .desktopFullScreen(let on): return "desktopFullScreen(\(on))"
        case .saveFile(let fileName, let mimeType, let base64): return "saveFile(\(fileName), \(mimeType), \(base64.count) chars)"
        case .leaveDemo: return "leaveDemo"
        case .playVideo(let request): return "playVideo(\(request))"
        }
    }

    /// The message the page posted (its JSON text), or `nil` for anything else.
    static func parse(_ raw: String) -> ShellBridgeMessage? {
        guard let data = raw.data(using: .utf8),
              let object = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
              let type = object["type"] as? String else { return nil }
        switch type {
        case "hello": return .hello
        case "pageReady": return .pageReady
        case "paired": return .paired(nodeName: object["nodeName"] as? String ?? "")
        case "showNodeList": return .showNodeList
        case "startScan": return .startScan
        case "desktopFullScreen": return .desktopFullScreen(on: object["on"] as? Bool ?? false)
        case "saveFile":
            guard let fileName = object["fileName"] as? String, let mimeType = object["mimeType"] as? String, let base64 = object["base64"] as? String else { return nil }
            return .saveFile(fileName: fileName, mimeType: mimeType, base64: base64)
        case "leaveDemo": return .leaveDemo
        case "playVideo": return NodeVideoPlayRequest.read(object).map(ShellBridgeMessage.playVideo)
        default: return nil
        }
    }
}

/// The app's answer to `hello`: this phone, the open node and what the app can do, never a credential.
struct ShellHello {
    let nodeCount: Int
    let deviceName: String
    let nodeName: String
    /// The app plays a protected node video in its own player (autobyteus-574 D-2); the demo has no node to play from.
    let videoPlayer: Bool
}

@MainActor
protocol ShellBridgeDelegate: AnyObject {
    func shellBridgeHello() -> ShellHello
    func shellBridge(didReceive message: ShellBridgeMessage)
}

/// The phone app's shell bridge on iOS (autobyteus-279, design `ShellBridgeHandler`): `window.AutoByteusShell` for node
/// pages and the demo, with Android's contract plus `leaveDemo`. It is given to the main frame of the open origin only (a
/// document-start script for the main frame, and each message checked against that frame and origin). Only `playVideo`
/// carries the phone's credential, for that one playback, and only for a file route of the page's own node (D-5).
final class ShellBridgeHandler: NSObject, WKScriptMessageHandler {
    static let messageName = "autobyteusShell"

    /// The page's `window.AutoByteusShell`: `postMessage(text)`, and `message` events for the app's replies.
    private static let script = """
    (() => {
      if (window.AutoByteusShell) return;
      const listeners = new Set();
      Object.defineProperty(window, '__autobyteusShellReceive', { value: (data) => {
        for (const listener of [...listeners]) { try { listener({ data }); } catch (error) { console.error(error); } }
      } });
      Object.defineProperty(window, 'AutoByteusShell', { value: Object.freeze({
        postMessage: (message) => window.webkit.messageHandlers.\(messageName).postMessage(String(message)),
        addEventListener: (type, listener) => { if (type === 'message') listeners.add(listener); },
        removeEventListener: (type, listener) => { if (type === 'message') listeners.delete(listener); },
      }) });
    })();
    """

    private let allowedOrigin: (scheme: String, host: String, port: Int)
    weak var delegate: ShellBridgeDelegate?
    weak var webView: WKWebView?

    /// `origin` is the open page's (a node's `https://host:port`, or the demo's `autobyteus-demo://app`).
    init(origin: URL) {
        self.allowedOrigin = (origin.scheme ?? "", origin.host ?? "", origin.port ?? 0)
        super.init()
    }

    /// Adds the bridge to a web view configuration (call before creating the web view).
    func install(in configuration: WKWebViewConfiguration) {
        configuration.userContentController.addUserScript(WKUserScript(source: Self.script, injectionTime: .atDocumentStart, forMainFrameOnly: true))
        configuration.userContentController.add(WeakScriptMessageHandler(self), name: Self.messageName)
    }

    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
        guard message.frameInfo.isMainFrame, isAllowed(message.frameInfo.securityOrigin),
              let raw = message.body as? String, let parsed = ShellBridgeMessage.parse(raw) else { return }
        // A video is played only from a file route of this page's own node: the credential goes nowhere else (AC-003).
        if case .playVideo(let request) = parsed, !request.isFor(nodeOrigin: originText) { return }
        Task { @MainActor in
            guard let delegate = self.delegate else { return }
            if parsed == .hello { self.reply(delegate.shellBridgeHello()) } else { delegate.shellBridge(didReceive: parsed) }
        }
    }

    /// The page's origin as text: `scheme://host[:port]` (an IPv6 host in brackets).
    private var originText: String {
        let host = allowedOrigin.host.contains(":") ? "[\(allowedOrigin.host)]" : allowedOrigin.host
        return "\(allowedOrigin.scheme)://\(host)" + (allowedOrigin.port != 0 ? ":\(allowedOrigin.port)" : "")
    }

    private func isAllowed(_ origin: WKSecurityOrigin) -> Bool {
        origin.protocol == allowedOrigin.scheme && origin.host == allowedOrigin.host && origin.port == allowedOrigin.port
    }

    @MainActor
    private func reply(_ hello: ShellHello) {
        let body: [String: Any] = [
            "type": "shell", "nodeCount": hello.nodeCount, "deviceName": hello.deviceName, "nodeName": hello.nodeName,
            "videoPlayer": hello.videoPlayer,
        ]
        guard let data = try? JSONSerialization.data(withJSONObject: body), let json = String(data: data, encoding: .utf8),
              let quoted = try? String(data: JSONSerialization.data(withJSONObject: [json]), encoding: .utf8) else { return }
        // `[json]` quotes the text as a JavaScript string literal; the page receives it as `event.data`.
        webView?.evaluateJavaScript("window.__autobyteusShellReceive && window.__autobyteusShellReceive(\(quoted)[0])")
    }
}

/// `WKUserContentController` keeps its handlers strongly; this breaks the web view → handler → web view cycle.
final class WeakScriptMessageHandler: NSObject, WKScriptMessageHandler {
    private weak var target: WKScriptMessageHandler?
    init(_ target: WKScriptMessageHandler) { self.target = target }
    func userContentController(_ controller: WKUserContentController, didReceive message: WKScriptMessage) {
        target?.userContentController(controller, didReceive: message)
    }
}

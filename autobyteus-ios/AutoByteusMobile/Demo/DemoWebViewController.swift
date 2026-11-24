import UIKit
import WebKit

/// The iOS app's built-in demo (autobyteus-279 DS-001, REQ-003, REQ-006): the bundled demo build (`DemoWeb/`, the same
/// phone screens with the demo node inside the page) in a `WKWebView` served by `DemoSchemeHandler` at
/// `autobyteus-demo://app/`. It never reaches a network: a content rule list blocks every `http(s)` and `ws(s)` load (a
/// second guard behind the page's own transport), and navigation stays in its own scheme. Each open has a new
/// non-persistent data store, so nothing survives Leave demo or a cold launch, and the demo is never a saved computer.
final class DemoWebViewController: UIViewController, WKNavigationDelegate, ShellBridgeDelegate {
    private static let ruleListIdentifier = "autobyteus-demo-no-network"
    /// Every `http(s)` and `ws(s)` load (WebKit's content rules take no alternation, so one rule each).
    private static let blockNetwork = #"[{"trigger":{"url-filter":"^https?://"},"action":{"type":"block"}},{"trigger":{"url-filter":"^wss?://"},"action":{"type":"block"}}]"#

    private let nodeCount: Int
    private let onLeave: () -> Void
    private let bridge = ShellBridgeHandler(origin: DemoSchemeHandler.origin)
    private let fullScreen = DesktopFullScreen()
    private var webView: WKWebView?

    init(nodeCount: Int, onLeave: @escaping () -> Void) {
        self.nodeCount = nodeCount
        self.onLeave = onLeave
        super.init(nibName: nil, bundle: nil)
    }

    required init?(coder: NSCoder) { nil }

    override var prefersStatusBarHidden: Bool { fullScreen.isOn }
    override var supportedInterfaceOrientations: UIInterfaceOrientationMask { fullScreen.supportedOrientations }

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = .white
        view.accessibilityIdentifier = "demo.root"
        guard let root = Bundle.main.url(forResource: "DemoWeb", withExtension: nil) else {
            // The build includes DemoWeb (project.yml fails without it); a bundle without it has no demo to show.
            onLeave()
            return
        }
        WKContentRuleListStore.default().compileContentRuleList(forIdentifier: Self.ruleListIdentifier, encodedContentRuleList: Self.blockNetwork) { [weak self] list, error in
            guard let self else { return }
            // A rule list that does not compile is a bug in the app: no demo opens without its second guard.
            guard let list else {
                assertionFailure("The demo's content rule list did not compile: \(error?.localizedDescription ?? "unknown")")
                self.onLeave()
                return
            }
            self.open(root: root, ruleList: list)
        }
    }

    private func open(root: URL, ruleList: WKContentRuleList) {
        let configuration = WKWebViewConfiguration()
        configuration.websiteDataStore = .nonPersistent()
        configuration.setURLSchemeHandler(DemoSchemeHandler(root: root), forURLScheme: DemoSchemeHandler.scheme)
        configuration.userContentController.add(ruleList)
        configuration.allowsInlineMediaPlayback = true
        configuration.preferences.javaScriptCanOpenWindowsAutomatically = false
        bridge.install(in: configuration)
        let web = WKWebView(frame: view.bounds, configuration: configuration)
        web.autoresizingMask = [.flexibleWidth, .flexibleHeight]
        web.navigationDelegate = self
        web.accessibilityIdentifier = "demo.webview"
        #if DEBUG
        web.isInspectable = true
        #endif
        bridge.webView = web
        bridge.delegate = self
        view.addSubview(web)
        webView = web
        web.load(URLRequest(url: DemoSchemeHandler.origin.appendingPathComponent("/")))
    }

    #if DEBUG
    /// UI tests (`AUTOBYTEUS_UI_TEST_NETWORK_PROBE=1`): a load the page's transport never sees (an image from a real
    /// site) shows whether the content rule list blocks it; on a simulator with network it loads unless blocked.
    func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
        guard ProcessInfo.processInfo.environment["AUTOBYTEUS_UI_TEST_NETWORK_PROBE"] == "1" else { return }
        let probe = "new Promise((resolve) => { const image = new Image(); image.onload = () => resolve('loaded'); image.onerror = () => resolve('blocked'); image.src = 'https://www.apple.com/favicon.ico?probe=' + Date.now(); })"
        webView.callAsyncJavaScript("return await \(probe)", arguments: [:], in: nil, in: .page) { [weak self] result in
            guard let self else { return }
            let label = UILabel()
            label.text = "network-probe:\((try? result.get()) as? String ?? "error")"
            label.accessibilityIdentifier = "demo.networkProbe"
            label.frame = CGRect(x: 0, y: 0, width: 1, height: 1)
            self.view.addSubview(label)
        }
    }
    #endif

    // MARK: Navigation: the demo's own pages only.

    func webView(_ webView: WKWebView, decidePolicyFor navigationAction: WKNavigationAction, decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
        let scheme = navigationAction.request.url?.scheme?.lowercased() ?? ""
        decisionHandler([DemoSchemeHandler.scheme, "about", "blob", "data"].contains(scheme) ? .allow : .cancel)
    }

    // MARK: ShellBridgeDelegate

    func shellBridgeHello() -> ShellHello {
        ShellHello(nodeCount: nodeCount, deviceName: UIDevice.current.model, nodeName: "Demo", videoPlayer: false)
    }

    func shellBridge(didReceive message: ShellBridgeMessage) {
        switch message {
        case .leaveDemo:
            onLeave()
        case .desktopFullScreen(let on):
            fullScreen.set(on, for: self)
        case .saveFile(let fileName, let mimeType, let base64):
            ShellFileSaver.present(fileName: fileName, mimeType: mimeType, base64: base64, from: self)
        case .hello, .pageReady, .paired, .showNodeList, .startScan, .playVideo:
            // The demo pairs nothing and switches to no node (Out of Scope); its page shows at once.
            break
        }
    }
}

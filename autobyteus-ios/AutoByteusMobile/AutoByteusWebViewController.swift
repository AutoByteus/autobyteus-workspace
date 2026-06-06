import AutoByteusMobileCore
import UIKit
import WebKit

final class AutoByteusWebViewController: UIViewController, WKNavigationDelegate, WKUIDelegate {
    let profile: SavedNodeProfile
    private let onPageStarted: (String) -> Void
    private let onPageFinished: (String) -> Void
    private let onDiagnostic: (ConnectionDiagnostic) -> Void
    private let onExternalURL: (URL) -> Void

    private(set) var webView: WKWebView!
    private(set) var currentURL: String

    init(
        profile: SavedNodeProfile,
        initialURL: String,
        onPageStarted: @escaping (String) -> Void,
        onPageFinished: @escaping (String) -> Void,
        onDiagnostic: @escaping (ConnectionDiagnostic) -> Void,
        onExternalURL: @escaping (URL) -> Void
    ) {
        self.profile = profile
        self.currentURL = initialURL
        self.onPageStarted = onPageStarted
        self.onPageFinished = onPageFinished
        self.onDiagnostic = onDiagnostic
        self.onExternalURL = onExternalURL
        super.init(nibName: nil, bundle: nil)
    }

    required init?(coder: NSCoder) { nil }

    override func loadView() {
        let configuration = WKWebViewConfiguration()
        configuration.websiteDataStore = .default()
        configuration.defaultWebpagePreferences.allowsContentJavaScript = true
        configuration.preferences.javaScriptCanOpenWindowsAutomatically = false
        configuration.allowsInlineMediaPlayback = true
        let view = WKWebView(frame: .zero, configuration: configuration)
        view.navigationDelegate = self
        view.uiDelegate = self
        view.allowsBackForwardNavigationGestures = true
        view.accessibilityIdentifier = "webshell.webview"
        self.webView = view
        self.view = view
    }

    override func viewDidLoad() {
        super.viewDidLoad()
        loadTrusted(currentURL)
    }

    func loadTrusted(_ urlString: String) {
        switch TrustedNavigationPolicy.classify(targetURL: urlString, profile: profile).type {
        case .allowInWebView:
            guard let url = URL(string: urlString) else {
                onDiagnostic(ConnectionDiagnosticMapper.invalidURL("The mobile URL could not be built."))
                return
            }
            currentURL = urlString
            webView.load(URLRequest(url: url))
        case .openExternal:
            if let url = URL(string: urlString) { onExternalURL(url) }
        case .block:
            onDiagnostic(ConnectionDiagnosticMapper.unsafeNavigationBlocked(urlString))
        }
    }

    func retry() {
        loadTrusted(currentURL)
    }

    func webView(_ webView: WKWebView, didStartProvisionalNavigation navigation: WKNavigation!) {
        onPageStarted(webView.url?.absoluteString ?? currentURL)
    }

    func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
        currentURL = webView.url?.absoluteString ?? currentURL
        onPageFinished(currentURL)
    }

    func webView(_ webView: WKWebView, didFail navigation: WKNavigation!, withError error: Error) {
        onDiagnostic(ConnectionDiagnosticMapper.webViewLoadFailed(error.localizedDescription))
    }

    func webView(_ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!, withError error: Error) {
        onDiagnostic(ConnectionDiagnosticMapper.webViewLoadFailed(error.localizedDescription))
    }

    func webView(
        _ webView: WKWebView,
        decidePolicyFor navigationAction: WKNavigationAction,
        decisionHandler: @escaping (WKNavigationActionPolicy) -> Void
    ) {
        guard let url = navigationAction.request.url else {
            decisionHandler(.cancel)
            return
        }
        let decision = TrustedNavigationPolicy.classify(targetURL: url.absoluteString, profile: profile)
        switch decision.type {
        case .allowInWebView:
            decisionHandler(.allow)
        case .openExternal:
            onExternalURL(url)
            decisionHandler(.cancel)
        case .block:
            onDiagnostic(ConnectionDiagnosticMapper.unsafeNavigationBlocked(url.absoluteString))
            decisionHandler(.cancel)
        }
    }

    func webView(
        _ webView: WKWebView,
        decidePolicyFor navigationResponse: WKNavigationResponse,
        decisionHandler: @escaping (WKNavigationResponsePolicy) -> Void
    ) {
        guard navigationResponse.isForMainFrame,
              let response = navigationResponse.response as? HTTPURLResponse,
              !(200...399).contains(response.statusCode) else {
            decisionHandler(.allow)
            return
        }
        onDiagnostic(ConnectionDiagnosticMapper.fromHTTPStatus(response.statusCode))
        decisionHandler(.cancel)
    }

    func webView(
        _ webView: WKWebView,
        createWebViewWith configuration: WKWebViewConfiguration,
        for navigationAction: WKNavigationAction,
        windowFeatures: WKWindowFeatures
    ) -> WKWebView? {
        if navigationAction.targetFrame == nil, let url = navigationAction.request.url {
            let decision = TrustedNavigationPolicy.classify(targetURL: url.absoluteString, profile: profile)
            if decision.type == .allowInWebView {
                webView.load(navigationAction.request)
            } else if decision.type == .openExternal {
                onExternalURL(url)
            } else {
                onDiagnostic(ConnectionDiagnosticMapper.unsafeNavigationBlocked(url.absoluteString))
            }
        }
        return nil
    }
}

// R-002 premise check harness (autobyteus-279): test-only. Hosts the check page as the demo web view will: a
// WKURLSchemeHandler for `autobyteus-demo://app/` over the bundled Web/ folder (JavaScript MIME types, a 200.html
// fallback for deep paths), a content rule list that blocks every http(s) and ws(s) load, and a new non-persistent
// WKWebsiteDataStore per open. Run 1 opens a deep path; run 2 opens the root in a second web view with a new store (is
// localStorage empty again?). Each run's report is printed as one `R002-RESULT <json>` line and written to
// Documents/r002.json.
import UIKit
import WebKit

@main
final class AppDelegate: UIResponder, UIApplicationDelegate {
    var window: UIWindow?

    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        let window = UIWindow(frame: UIScreen.main.bounds)
        window.rootViewController = HarnessViewController()
        window.makeKeyAndVisible()
        self.window = window
        return true
    }
}

/// Serves the bundled build; a path with no file is the SPA fallback (200.html), as Nuxt's generated site expects.
final class DemoSchemeHandler: NSObject, WKURLSchemeHandler {
    private let root: URL
    private(set) var served: [String] = []

    init(root: URL) { self.root = root }

    static func mimeType(for url: URL) -> String {
        switch url.pathExtension.lowercased() {
        case "html": return "text/html"
        case "js", "mjs": return "text/javascript"
        case "css": return "text/css"
        case "json": return "application/json"
        case "svg": return "image/svg+xml"
        case "png": return "image/png"
        case "jpg", "jpeg": return "image/jpeg"
        case "woff2": return "font/woff2"
        case "wasm": return "application/wasm"
        default: return "application/octet-stream"
        }
    }

    func webView(_ webView: WKWebView, start urlSchemeTask: WKURLSchemeTask) {
        guard let url = urlSchemeTask.request.url else { return }
        let relative = url.path.hasPrefix("/") ? String(url.path.dropFirst()) : url.path
        var file = root.appendingPathComponent(relative)
        var isDirectory: ObjCBool = false
        if relative.isEmpty || !FileManager.default.fileExists(atPath: file.path, isDirectory: &isDirectory) || isDirectory.boolValue {
            file = root.appendingPathComponent(relative.isEmpty ? "index.html" : "200.html")
        }
        served.append("\(url.path) -> \(file.lastPathComponent)")
        do {
            let data = try Data(contentsOf: file)
            let response = HTTPURLResponse(url: url, statusCode: 200, httpVersion: "HTTP/1.1", headerFields: [
                "Content-Type": Self.mimeType(for: file), "Content-Length": String(data.count),
            ])!
            urlSchemeTask.didReceive(response)
            urlSchemeTask.didReceive(data)
            urlSchemeTask.didFinish()
        } catch {
            urlSchemeTask.didFailWithError(error)
        }
    }

    func webView(_ webView: WKWebView, stop urlSchemeTask: WKURLSchemeTask) {}
}

final class HarnessViewController: UIViewController, WKScriptMessageHandler, WKNavigationDelegate {
    private let documents = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask)[0]
    private var webView: WKWebView?
    private var ruleList: WKContentRuleList?
    private var reports: [String] = []
    private let handler = DemoSchemeHandler(root: Bundle.main.url(forResource: "Web", withExtension: nil)!)

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = .white
        progress("started")
        let rules = #"[{"trigger":{"url-filter":"^(https?|wss?)://"},"action":{"type":"block"}}]"#
        WKContentRuleListStore.default().compileContentRuleList(forIdentifier: "r002-block-network", encodedContentRuleList: rules) { [weak self] list, error in
            if let error { print("R002-RESULT {\"fatal\":\"rule list: \(error.localizedDescription)\"}") }
            self?.ruleList = list
            self?.open(path: "/deep/path/run?run=1")
        }
    }

    private func open(path: String) {
        webView?.removeFromSuperview()
        let configuration = WKWebViewConfiguration()
        configuration.websiteDataStore = .nonPersistent()
        configuration.setURLSchemeHandler(handler, forURLScheme: "autobyteus-demo")
        if let ruleList { configuration.userContentController.add(ruleList) }
        configuration.userContentController.add(self, name: "r002")
        let next = WKWebView(frame: view.bounds, configuration: configuration)
        next.autoresizingMask = [.flexibleWidth, .flexibleHeight]
        next.navigationDelegate = self
        if #available(iOS 16.4, *) { next.isInspectable = true }
        view.addSubview(next)
        webView = next
        next.load(URLRequest(url: URL(string: "autobyteus-demo://app\(path)")!))
    }

    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
        guard let body = message.body as? String else { return }
        reports.append(body)
        print("R002-RESULT \(body)")
        progress("report \(reports.count)")
        try? "[\(reports.joined(separator: ","))]".write(to: documents.appendingPathComponent("r002.json"), atomically: true, encoding: .utf8)
        if reports.count == 1 {
            open(path: "/?run=2")
        } else {
            let served = handler.served.joined(separator: "\n")
            print("R002-SERVED\n\(served)")
            try? served.write(to: documents.appendingPathComponent("r002-served.txt"), atomically: true, encoding: .utf8)
            progress("done")
            print("R002-DONE")
        }
    }

    /// A file the run script polls (the console can stay silent on a loaded machine).
    private func progress(_ step: String) {
        let file = documents.appendingPathComponent("r002-progress.txt")
        let line = "\(Date().timeIntervalSince1970) \(step)\n"
        if let handle = try? FileHandle(forWritingTo: file) { handle.seekToEndOfFile(); handle.write(Data(line.utf8)); try? handle.close() }
        else { try? line.write(to: file, atomically: true, encoding: .utf8) }
    }

    func webView(_ webView: WKWebView, didFail navigation: WKNavigation!, withError error: Error) {
        progress("navigation failed: \(error.localizedDescription)")
        print("R002-RESULT {\"fatal\":\"navigation: \(error.localizedDescription)\"}")
    }

    func webView(_ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!, withError error: Error) {
        progress("provisional navigation failed: \(error.localizedDescription)")
        print("R002-RESULT {\"fatal\":\"provisional navigation: \(error.localizedDescription)\"}")
    }
}

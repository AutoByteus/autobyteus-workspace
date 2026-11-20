import WebKit

/// Serves the bundled demo build (`DemoWeb/`, `build:mobile-web --demo`) at `autobyteus-demo://app/` (autobyteus-279,
/// checked by the R-002 harness): each file with its MIME type (module scripts need `text/javascript`), and `200.html`
/// for a path with no file, the SPA fallback Nuxt's generated site expects. Nothing outside the folder is served.
final class DemoSchemeHandler: NSObject, WKURLSchemeHandler {
    static let scheme = "autobyteus-demo"
    static let origin = URL(string: "autobyteus-demo://app")!
    private let root: URL

    init(root: URL) {
        self.root = root.standardizedFileURL
    }

    static func mimeType(for url: URL) -> String {
        switch url.pathExtension.lowercased() {
        case "html": return "text/html"
        case "js", "mjs": return "text/javascript"
        case "css": return "text/css"
        case "json": return "application/json"
        case "svg": return "image/svg+xml"
        case "png": return "image/png"
        case "jpg", "jpeg": return "image/jpeg"
        case "webp": return "image/webp"
        case "ico": return "image/x-icon"
        case "woff2": return "font/woff2"
        case "woff": return "font/woff"
        case "ttf": return "font/ttf"
        case "wasm": return "application/wasm"
        case "txt": return "text/plain"
        default: return "application/octet-stream"
        }
    }

    /// The file a request's path names, or the SPA fallback; never a file outside `root`.
    func file(for url: URL) -> URL {
        let relative = url.path.hasPrefix("/") ? String(url.path.dropFirst()) : url.path
        let candidate = root.appendingPathComponent(relative).standardizedFileURL
        var isDirectory: ObjCBool = false
        let inside = candidate.path.hasPrefix(root.path + "/")
        if relative.isEmpty { return root.appendingPathComponent("index.html") }
        if !inside || !FileManager.default.fileExists(atPath: candidate.path, isDirectory: &isDirectory) || isDirectory.boolValue {
            return root.appendingPathComponent("200.html")
        }
        return candidate
    }

    func webView(_ webView: WKWebView, start urlSchemeTask: WKURLSchemeTask) {
        guard let url = urlSchemeTask.request.url else { return }
        let file = file(for: url)
        do {
            let data = try Data(contentsOf: file)
            let response = HTTPURLResponse(url: url, statusCode: 200, httpVersion: "HTTP/1.1", headerFields: [
                "Content-Type": Self.mimeType(for: file), "Content-Length": String(data.count), "Cache-Control": "no-store",
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

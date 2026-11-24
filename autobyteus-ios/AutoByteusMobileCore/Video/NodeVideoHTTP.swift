import Foundation

/// The video player's one way to read a node file (autobyteus-574 D-4, D-5): byte ranges of a URL on the open node's
/// origin, with the phone's credential only as `Authorization: Bearer`. No redirect is followed (node file routes never
/// redirect; a redirect could carry the header elsewhere, design N-1), and a URL off the node's origin or outside its
/// `/rest/` routes is refused before anything is sent. Nothing here logs a URL or a header.
public final class NodeVideoHTTP: NSObject, URLSessionTaskDelegate {
    public enum Failure: Error, Equatable {
        /// Off the node's origin, or not a node file route.
        case refusedURL
        /// The node answered with a redirect; it was not followed.
        case redirectRefused(status: Int)
        /// Any other answer than the file (a refused credential, a missing file).
        case status(Int)
        case missingVersion
    }

    /// What the two-byte probe learns: the file's version (its ETag), length and type.
    public struct Probe: Equatable {
        public let etag: String
        public let length: Int64
        public let contentType: String?
    }

    public let nodeOrigin: String
    private let credential: String
    private let configuration: URLSessionConfiguration

    /// `configuration` is for tests (a stub protocol); the app uses an ephemeral one (no cookie, cache or credential store).
    public init(nodeOrigin: String, credential: String, configuration: URLSessionConfiguration = .ephemeral) {
        self.nodeOrigin = nodeOrigin
        self.credential = credential
        self.configuration = configuration
        self.configuration.requestCachePolicy = .reloadIgnoringLocalCacheData
        self.configuration.urlCache = nil
    }

    /// A session whose redirects this object refuses; `delegate` receives the data (the loader), else the session's
    /// completion handlers are used.
    public func makeSession(dataDelegate: URLSessionDataDelegate? = nil, queue: OperationQueue? = nil) -> URLSession {
        URLSession(configuration: configuration, delegate: dataDelegate.map { RedirectRefusingDelegate(data: $0) } ?? RedirectRefusingDelegate(data: nil), delegateQueue: queue)
    }

    /// The request for bytes `first...last` of `url` (to the end when `last` is `nil`); `ifRange` is the version the reader
    /// has, so a changed file answers 200 with the whole file instead of a range of another version.
    public func request(_ url: URL, first: Int64, last: Int64?, ifRange: String?) throws -> URLRequest {
        guard NodeVideoURL.isNodeFileURL(url, nodeOrigin: nodeOrigin) else { throw Failure.refusedURL }
        var request = URLRequest(url: url)
        request.setValue("Bearer \(credential)", forHTTPHeaderField: "Authorization")
        request.setValue("identity", forHTTPHeaderField: "Accept-Encoding")
        request.setValue("bytes=\(first)-\(last.map(String.init) ?? "")", forHTTPHeaderField: "Range")
        if let ifRange { request.setValue(ifRange, forHTTPHeaderField: "If-Range") }
        return request
    }

    /// Reads bytes 0-1: the file's version, length and type, before anything is played or cached.
    public func probe(_ url: URL) async throws -> Probe {
        let session = makeSession()
        defer { session.finishTasksAndInvalidate() }
        let (_, response) = try await session.data(for: try request(url, first: 0, last: 1, ifRange: nil))
        guard let http = response as? HTTPURLResponse else { throw Failure.status(0) }
        if (300...399).contains(http.statusCode) { throw Failure.redirectRefused(status: http.statusCode) }
        guard http.statusCode == 206 || http.statusCode == 200 else { throw Failure.status(http.statusCode) }
        guard let etag = http.value(forHTTPHeaderField: "ETag") else { throw Failure.missingVersion }
        let length = Self.totalLength(contentRange: http.value(forHTTPHeaderField: "Content-Range"))
            ?? (http.statusCode == 200 ? http.expectedContentLength : -1)
        guard length > 0 else { throw Failure.status(http.statusCode) }
        return Probe(etag: etag, length: length, contentType: http.mimeType)
    }

    /// The size in a `Content-Range: bytes a-b/size` header.
    public static func totalLength(contentRange: String?) -> Int64? {
        guard let contentRange, let slash = contentRange.lastIndex(of: "/") else { return nil }
        return Int64(contentRange[contentRange.index(after: slash)...].trimmingCharacters(in: .whitespaces))
    }

    /// The first byte in a `Content-Range: bytes a-b/size` header.
    public static func firstByte(contentRange: String?) -> Int64? {
        guard let contentRange, let range = contentRange.range(of: #"bytes (\d+)-"#, options: .regularExpression) else { return nil }
        return Int64(contentRange[range].dropFirst("bytes ".count).dropLast())
    }
}

/// Refuses every redirect (`nil`: the 3xx answer is what the task receives) and passes the data on to `data`.
private final class RedirectRefusingDelegate: NSObject, URLSessionDataDelegate {
    private let data: URLSessionDataDelegate?
    init(data: URLSessionDataDelegate?) { self.data = data }

    func urlSession(_ session: URLSession, task: URLSessionTask, willPerformHTTPRedirection response: HTTPURLResponse,
                    newRequest request: URLRequest, completionHandler: @escaping (URLRequest?) -> Void) {
        completionHandler(nil)
    }

    func urlSession(_ session: URLSession, dataTask: URLSessionDataTask, didReceive response: URLResponse,
                    completionHandler: @escaping (URLSession.ResponseDisposition) -> Void) {
        let handled: Void? = data?.urlSession?(session, dataTask: dataTask, didReceive: response, completionHandler: completionHandler)
        if handled == nil { completionHandler(.allow) }
    }

    func urlSession(_ session: URLSession, dataTask: URLSessionDataTask, didReceive received: Data) {
        data?.urlSession?(session, dataTask: dataTask, didReceive: received)
    }

    func urlSession(_ session: URLSession, task: URLSessionTask, didCompleteWithError error: Error?) {
        data?.urlSession?(session, task: task, didCompleteWithError: error)
    }
}

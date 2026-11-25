import Foundation

/// A stand-in for a node's file routes inside the test process (autobyteus-574's contract, D-1): `/rest/files/<name>`
/// answers by one byte range with a strong ETag, `If-Range` by version, 401 without the expected credential, 404 for any
/// other path (a redirect is tested over real sockets, TinyHTTPListener). A body streams in 64 KB parts at about 1.5 MB/s (the AC's throttled node) and stops when
/// the client cancels. Every request is recorded (its host, Range, Authorization and the bytes sent so far).
final class StubNodeProtocol: URLProtocol {
    struct Served: Equatable {
        let host: String
        let path: String
        let range: String?
        let authorization: String?
        let status: Int
        let first: Int64
        var bytes: Int64
    }

    private static let part = 64 * 1024
    private let stopped = NSLock()
    private var isStopped = false

    private static let lock = NSLock()
    private static var _file = Data()
    private static var _etag = "\"0-0\""
    private static var _served: [Served] = []
    static let credential = "mra_ios_test_credential"

    static func serve(_ file: Data, etag: String) {
        lock.lock(); defer { lock.unlock() }
        _file = file
        _etag = etag
        _served = []
        _bytesPerSecond = 1_500_000
    }

    static var etag: String {
        get { lock.lock(); defer { lock.unlock() }; return _etag }
        set { lock.lock(); _etag = newValue; lock.unlock() }
    }

    static var served: [Served] { lock.lock(); defer { lock.unlock() }; return _served }

    private static var _bytesPerSecond = 1_500_000
    /// The rate a body streams at: the AC's throttled node by default; `serve` sets it back.
    static var bytesPerSecond: Int {
        get { lock.lock(); defer { lock.unlock() }; return _bytesPerSecond }
        set { lock.lock(); _bytesPerSecond = newValue; lock.unlock() }
    }
    static func clearServed() { lock.lock(); _served = []; lock.unlock() }

    static func configuration() -> URLSessionConfiguration {
        let configuration = URLSessionConfiguration.ephemeral
        configuration.protocolClasses = [StubNodeProtocol.self]
        return configuration
    }

    override class func canInit(with request: URLRequest) -> Bool { true }
    override class func canonicalRequest(for request: URLRequest) -> URLRequest { request }
    override func stopLoading() {
        stopped.lock(); isStopped = true; stopped.unlock()
    }

    private var stillLoading: Bool { stopped.lock(); defer { stopped.unlock() }; return !isStopped }

    override func startLoading() {
        guard let url = request.url, let client else { return }
        let range = request.value(forHTTPHeaderField: "Range")
        let authorization = request.value(forHTTPHeaderField: "Authorization")
        @discardableResult
        func record(_ status: Int, _ first: Int64, _ bytes: Int64) -> Int {
            Self.lock.lock(); defer { Self.lock.unlock() }
            Self._served.append(Served(host: url.host ?? "", path: url.path, range: range, authorization: authorization, status: status, first: first, bytes: bytes))
            return Self._served.count - 1
        }
        func answer(_ status: Int, _ headers: [String: String], _ body: Data, record index: Int? = nil) {
            let response = HTTPURLResponse(url: url, statusCode: status, httpVersion: "HTTP/1.1", headerFields: headers)!
            client.urlProtocol(self, didReceive: response, cacheStoragePolicy: .notAllowed)
            guard !body.isEmpty else { return client.urlProtocolDidFinishLoading(self) }
            DispatchQueue.global().async {
                var sent = 0
                while sent < body.count, self.stillLoading {
                    let part = body.subdata(in: sent..<min(body.count, sent + Self.part))
                    client.urlProtocol(self, didLoad: part)
                    sent += part.count
                    if let index {
                        Self.lock.lock()
                        if index < Self._served.count { Self._served[index].bytes = Int64(sent) }
                        Self.lock.unlock()
                    }
                    Thread.sleep(forTimeInterval: Double(part.count) / Double(Self.bytesPerSecond))
                }
                if self.stillLoading { client.urlProtocolDidFinishLoading(self) }
            }
        }
        guard url.path.hasPrefix("/rest/files/") else { record(404, 0, 0); return answer(404, [:], Data()) }
        guard authorization == "Bearer \(Self.credential)" else { record(401, 0, 0); return answer(401, [:], Data()) }
        Self.lock.lock()
        let file = Self._file
        let etag = Self._etag
        Self.lock.unlock()
        let size = Int64(file.count)
        var headers = ["ETag": etag, "Accept-Ranges": "bytes", "Content-Type": "video/mp4"]
        let ifRange = request.value(forHTTPHeaderField: "If-Range")
        if let range, ifRange == nil || ifRange == etag,
           let match = range.range(of: #"^bytes=(\d+)-(\d*)$"#, options: .regularExpression) {
            let spec = range[match].dropFirst("bytes=".count)
            let parts = spec.split(separator: "-", omittingEmptySubsequences: false)
            let first = Int64(parts[0])!
            let last = min(Int64(parts[1]) ?? (size - 1), size - 1)
            headers["Content-Range"] = "bytes \(first)-\(last)/\(size)"
            headers["Content-Length"] = String(last - first + 1)
            let body = file.subdata(in: Int(first)..<Int(last + 1))
            return answer(206, headers, body, record: record(206, first, 0))
        }
        headers["Content-Length"] = String(size)
        answer(200, headers, file, record: record(200, 0, 0))
    }
}

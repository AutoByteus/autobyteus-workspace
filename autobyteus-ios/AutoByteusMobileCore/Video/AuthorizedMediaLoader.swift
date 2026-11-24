import AVFoundation
import Foundation
import UniformTypeIdentifiers

/// One read of the video that the loader answers: an AVFoundation data request (`LoadingRequestRead`), or a test's.
/// Called on the loader's queue.
protocol MediaRead: AnyObject {
    /// The first byte asked for, and the last.
    var first: Int64 { get }
    var last: Int64 { get }
    func respond(with data: Data)
    func finish()
    func fail(_ error: Error)
}

/// AVFoundation's reader of one node video (autobyteus-574 D-4, D-5): the asset's URL is under the app's own scheme
/// (`NodeVideoURL.assetURL`), so AVFoundation asks this loader for every byte range. Each read is served from the cache
/// first; past it, from a read-ahead: one streaming fetch of the node by range, with the credential in the header
/// (`NodeVideoHTTP`: the node's origin only, no redirect), which answers every read it reaches as its bytes arrive.
/// Fetched bytes are kept in `MediaRangeCache` under this version's key, so a reopen of an unchanged file reads nothing
/// again of what it has. A range is asked with `If-Range` (the version the playback started with): a file changed
/// meanwhile fails the read instead of mixing two versions.
public final class AuthorizedMediaLoader: NSObject, AVAssetResourceLoaderDelegate, URLSessionDataDelegate {
    /// How far ahead of a running fetch a read may be and still wait for it: about 0.7 s of the throttled node (AC-001's
    /// 1.5 MB/s). A read farther away (a seek, a scrub) starts a fetch of its own.
    static let readAheadReach: Int64 = 1 << 20
    /// The most cached bytes handed over in one step: the queue is free between steps, so a cancel takes effect there.
    static let cacheStep = 1 << 20

    public let queue = DispatchQueue(label: "org.autobyteus.video-loader")
    private let http: NodeVideoHTTP
    private let url: URL
    private let probe: NodeVideoHTTP.Probe
    private let cache: MediaRangeCache
    private let cacheKey: String
    private lazy var operations: OperationQueue = {
        let operations = OperationQueue()
        operations.maxConcurrentOperationCount = 1
        operations.underlyingQueue = queue
        return operations
    }()
    private lazy var session: URLSession = http.makeSession(dataDelegate: self, queue: operations)

    /// One read being served: the next byte to answer is `offset`.
    private final class Serving {
        let read: MediaRead
        var offset: Int64
        var cancelled = false
        /// The fetch it waits for, while `offset` is past the cache.
        var fetch: Fetch?
        init(read: MediaRead) {
            self.read = read
            offset = read.first
        }
    }

    /// One streaming fetch of `first...last` (from a read's first missing byte to the next cached one, or the end); the
    /// next byte to arrive is `position`. It runs on while no read waits for it, filling the cache, until a read far
    /// away needs a fetch of its own, or the loader ends.
    private final class Fetch {
        let task: URLSessionDataTask
        let first: Int64
        let last: Int64
        var position: Int64
        init(task: URLSessionDataTask, first: Int64, last: Int64) {
            self.task = task
            self.first = first
            self.last = last
            position = first
        }
    }

    private var serving: [Serving] = []
    private var fetches: [Int: Fetch] = [:]
    /// Bytes fetched from the node by this loader (read on `queue`), for checks.
    public private(set) var networkBytes: Int64 = 0

    public init(url: URL, nodeID: String, http: NodeVideoHTTP, probe: NodeVideoHTTP.Probe, cache: MediaRangeCache = .shared) {
        self.url = url
        self.http = http
        self.probe = probe
        self.cache = cache
        self.cacheKey = MediaRangeCache.key(nodeID: nodeID, url: url, etag: probe.etag)
        super.init()
    }

    /// Ends every fetch; the loader is not used again (the player screen closed).
    public func invalidate() {
        queue.async {
            self.serving.forEach { $0.cancelled = true }
            self.serving.removeAll()
            self.fetches.removeAll()
            self.session.invalidateAndCancel()
        }
    }

    // MARK: AVAssetResourceLoaderDelegate (called on `queue`)

    public func resourceLoader(_ resourceLoader: AVAssetResourceLoader, shouldWaitForLoadingOfRequestedResource loadingRequest: AVAssetResourceLoadingRequest) -> Bool {
        guard let assetURL = loadingRequest.request.url, NodeVideoURL.networkURL(for: assetURL) == url else { return false }
        if let information = loadingRequest.contentInformationRequest {
            information.contentType = UTType(mimeType: probe.contentType ?? "video/mp4")?.identifier ?? UTType.mpeg4Movie.identifier
            information.contentLength = probe.length
            information.isByteRangeAccessSupported = true
            // Any range is served at any time, from the cache or the read-ahead; without saying so, a scrub of the player
            // stops the picture while its clock runs on (autobyteus-574 CR-003). AVFoundation then reads in small pieces,
            // one after another, which the read-ahead answers without a round trip each (CR-004).
            information.isEntireLengthAvailableOnDemand = true
        }
        guard let data = loadingRequest.dataRequest else {
            loadingRequest.finishLoading()
            return true
        }
        let last = data.requestsAllDataToEndOfResource ? probe.length - 1 : min(probe.length - 1, data.requestedOffset + Int64(data.requestedLength) - 1)
        serve(LoadingRequestRead(loadingRequest, first: data.currentOffset, last: last))
        return true
    }

    public func resourceLoader(_ resourceLoader: AVAssetResourceLoader, didCancel loadingRequest: AVAssetResourceLoadingRequest) {
        cancel { ($0 as? LoadingRequestRead)?.request === loadingRequest }
    }

    // MARK: Serving (on `queue`)

    /// Starts serving `read`.
    func serve(_ read: MediaRead) {
        let item = Serving(read: read)
        serving.append(item)
        advance(item)
    }

    /// Stops serving the reads `matching`; their fetches run on (another read may wait for them, and what arrives is
    /// cached).
    func cancel(where matching: (MediaRead) -> Bool) {
        for item in serving where matching(item.read) { item.cancelled = true }
        serving.removeAll { $0.cancelled }
    }

    /// Answers `item` from the cache, one bounded step at a time; past the cache, it waits for a fetch that reaches it
    /// soon, or starts one.
    private func advance(_ item: Serving) {
        guard !item.cancelled else { return }
        guard item.offset <= item.read.last else { return finish(item) }
        let held = cache.read(key: cacheKey, from: item.offset, maxLength: Int(min(Int64(Self.cacheStep), item.read.last - item.offset + 1)))
        if !held.isEmpty {
            respond(item, held)
            guard item.offset <= item.read.last else { return finish(item) }
            return queue.async { [weak self] in self?.advance(item) }
        }
        if let fetch = fetches.values.first(where: { $0.position <= item.offset && item.offset <= $0.last && item.offset - $0.position <= Self.readAheadReach }) {
            item.fetch = fetch
            return
        }
        startFetch(for: item)
    }

    /// A fetch from `item`'s offset to the next byte the cache holds or a running fetch starts at (or the end), so no
    /// byte is fetched twice. Fetches no read waits for stop: their reader moved elsewhere.
    private func startFetch(for item: Serving) {
        for (id, fetch) in fetches where !serving.contains(where: { $0.fetch === fetch }) {
            fetches[id] = nil
            fetch.task.cancel()
        }
        let cached = cache.gaps(for: cacheKey, in: item.offset...(probe.length - 1)).first?.upperBound ?? probe.length - 1
        let last = fetches.values.filter { $0.first > item.offset }.map { $0.first - 1 }.reduce(cached, min)
        do {
            let task = session.dataTask(with: try http.request(url, first: item.offset, last: last, ifRange: probe.etag))
            let fetch = Fetch(task: task, first: item.offset, last: last)
            fetches[task.taskIdentifier] = fetch
            item.fetch = fetch
            task.resume()
        } catch {
            fail(item, error)
        }
    }

    private func respond(_ item: Serving, _ data: Data) {
        item.read.respond(with: data)
        item.offset += Int64(data.count)
    }

    private func finish(_ item: Serving) {
        serving.removeAll { $0 === item }
        item.read.finish()
    }

    private func fail(_ item: Serving, _ error: Error) {
        serving.removeAll { $0 === item }
        item.read.fail(error)
    }

    // MARK: URLSessionDataDelegate (called on `queue`)

    public func urlSession(_ session: URLSession, dataTask: URLSessionDataTask, didReceive response: URLResponse,
                           completionHandler: @escaping (URLSession.ResponseDisposition) -> Void) {
        guard let fetch = fetches[dataTask.taskIdentifier] else { return completionHandler(.cancel) }
        let http = response as? HTTPURLResponse
        let status = http?.statusCode ?? 0
        // Only the asked range of this version: a redirect, a refusal, or a changed file (200 for If-Range) fails the reads.
        guard status == 206, NodeVideoHTTP.firstByte(contentRange: http?.value(forHTTPHeaderField: "Content-Range")) == fetch.first else {
            fetches[dataTask.taskIdentifier] = nil
            let error = (300...399).contains(status) ? NodeVideoHTTP.Failure.redirectRefused(status: status) : NodeVideoHTTP.Failure.status(status)
            serving.filter { $0.fetch === fetch }.forEach { fail($0, error) }
            return completionHandler(.cancel)
        }
        completionHandler(.allow)
    }

    /// Arriving bytes go to the cache, whether or not a read still waits for them, and to every read they reach.
    public func urlSession(_ session: URLSession, dataTask: URLSessionDataTask, didReceive data: Data) {
        guard let fetch = fetches[dataTask.taskIdentifier] else { return }
        let chunk = Data(data.prefix(Int(max(0, fetch.last - fetch.position + 1))))
        guard !chunk.isEmpty else { return }
        let start = fetch.position
        let end = start + Int64(chunk.count)
        cache.write(key: cacheKey, offset: start, data: chunk, length: probe.length)
        networkBytes += Int64(chunk.count)
        fetch.position = end
        for item in serving where !item.cancelled && start <= item.offset && item.offset < end {
            item.fetch = fetch
            respond(item, chunk.subdata(in: Int(item.offset - start)..<Int(min(end, item.read.last + 1) - start)))
            if item.offset > item.read.last { finish(item) }
        }
    }

    /// A fetch done: its reads go on from the cache (or a new fetch); a failed one fails them.
    public func urlSession(_ session: URLSession, task: URLSessionTask, didCompleteWithError error: Error?) {
        guard let fetch = fetches.removeValue(forKey: task.taskIdentifier) else { return }
        for item in serving where item.fetch === fetch {
            item.fetch = nil
            if let error { fail(item, error) } else { advance(item) }
        }
    }
}

/// An AVFoundation data request as a `MediaRead`.
private final class LoadingRequestRead: MediaRead {
    let request: AVAssetResourceLoadingRequest
    let first: Int64
    let last: Int64
    init(_ request: AVAssetResourceLoadingRequest, first: Int64, last: Int64) {
        self.request = request
        self.first = first
        self.last = last
    }
    func respond(with data: Data) { request.dataRequest?.respond(with: data) }
    func finish() { request.finishLoading() }
    func fail(_ error: Error) { request.finishLoading(with: error) }
}

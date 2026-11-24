import AVFoundation
import Foundation
import UniformTypeIdentifiers

/// AVFoundation's reader of one node video (autobyteus-574 D-4, D-5): the asset's URL is under the app's own scheme
/// (`NodeVideoURL.assetURL`), so AVFoundation asks this loader for every byte range. Each range is served from the cache
/// first, and only the gaps are fetched from the node, by range, with the credential in the header (`NodeVideoHTTP`: the
/// node's origin only, no redirect). Fetched bytes are kept in `MediaRangeCache` under this version's key, so a reopen
/// of an unchanged file reads nothing again of what it has. A range is asked with `If-Range` (the version the playback
/// started with): a file changed meanwhile fails the read instead of mixing two versions.
public final class AuthorizedMediaLoader: NSObject, AVAssetResourceLoaderDelegate, URLSessionDataDelegate {
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

    /// One loading request being served, from `offset` to `last`.
    private final class Serving {
        let request: AVAssetResourceLoadingRequest
        var offset: Int64
        let last: Int64
        var task: URLSessionDataTask?
        var cancelled = false
        init(request: AVAssetResourceLoadingRequest, offset: Int64, last: Int64) {
            self.request = request
            self.offset = offset
            self.last = last
        }
    }

    private var serving: [Serving] = []
    private var byTask: [Int: Serving] = [:]
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
            self.byTask.removeAll()
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
        }
        guard let data = loadingRequest.dataRequest else {
            loadingRequest.finishLoading()
            return true
        }
        let first = data.currentOffset
        let last = data.requestsAllDataToEndOfResource ? probe.length - 1 : min(probe.length - 1, data.requestedOffset + Int64(data.requestedLength) - 1)
        let item = Serving(request: loadingRequest, offset: first, last: last)
        serving.append(item)
        advance(item)
        return true
    }

    public func resourceLoader(_ resourceLoader: AVAssetResourceLoader, didCancel loadingRequest: AVAssetResourceLoadingRequest) {
        for item in serving where item.request === loadingRequest {
            item.cancelled = true
            item.task?.cancel()
        }
        serving.removeAll { $0.request === loadingRequest }
    }

    /// Serves `item` from the cache as far as it can, then fetches the next gap; finishes when its range is served.
    private func advance(_ item: Serving) {
        while !item.cancelled && item.offset <= item.last {
            let held = cache.read(key: cacheKey, from: item.offset, maxLength: Int(min(Int64(1 << 20), item.last - item.offset + 1)))
            if !held.isEmpty {
                item.request.dataRequest?.respond(with: held)
                item.offset += Int64(held.count)
                continue
            }
            let gapLast = cache.gaps(for: cacheKey, in: item.offset...item.last).first?.upperBound ?? item.last
            do {
                let task = session.dataTask(with: try http.request(url, first: item.offset, last: gapLast, ifRange: probe.etag))
                item.task = task
                byTask[task.taskIdentifier] = item
                task.resume()
            } catch {
                fail(item, error)
            }
            return
        }
        if !item.cancelled { finish(item) }
    }

    private func finish(_ item: Serving) {
        serving.removeAll { $0 === item }
        item.request.finishLoading()
    }

    private func fail(_ item: Serving, _ error: Error) {
        serving.removeAll { $0 === item }
        item.request.finishLoading(with: error)
    }

    // MARK: URLSessionDataDelegate (called on `queue`)

    public func urlSession(_ session: URLSession, dataTask: URLSessionDataTask, didReceive response: URLResponse,
                           completionHandler: @escaping (URLSession.ResponseDisposition) -> Void) {
        guard let item = byTask[dataTask.taskIdentifier] else { return completionHandler(.cancel) }
        let http = response as? HTTPURLResponse
        let status = http?.statusCode ?? 0
        // Only the asked range of this version: a redirect, a refusal, or a changed file (200 for If-Range) fails the read.
        guard status == 206, NodeVideoHTTP.firstByte(contentRange: http?.value(forHTTPHeaderField: "Content-Range")) == item.offset else {
            byTask[dataTask.taskIdentifier] = nil
            fail(item, (300...399).contains(status) ? NodeVideoHTTP.Failure.redirectRefused(status: status) : NodeVideoHTTP.Failure.status(status))
            return completionHandler(.cancel)
        }
        completionHandler(.allow)
    }

    public func urlSession(_ session: URLSession, dataTask: URLSessionDataTask, didReceive data: Data) {
        guard let item = byTask[dataTask.taskIdentifier], !item.cancelled else { return }
        let usable = data.prefix(Int(max(0, item.last - item.offset + 1)))
        guard !usable.isEmpty else { return }
        cache.write(key: cacheKey, offset: item.offset, data: usable, length: probe.length)
        networkBytes += Int64(usable.count)
        item.request.dataRequest?.respond(with: usable)
        item.offset += Int64(usable.count)
    }

    public func urlSession(_ session: URLSession, task: URLSessionTask, didCompleteWithError error: Error?) {
        guard let item = byTask.removeValue(forKey: task.taskIdentifier), !item.cancelled else { return }
        item.task = nil
        if let error { return fail(item, error) }
        advance(item)
    }
}

@testable import AutoByteusMobileCore
import XCTest

/// autobyteus-574 CR-004 (AC-001, AC-002 on iOS): the loader answers AVFoundation's small reads from one streaming fetch
/// (a read-ahead), not a request each. A burst of small sequential reads makes one request. A read far from the running
/// fetch (a seek) starts its own, and the idle one stops. Cancelling one read keeps a fetch another read waits for, and
/// a cancelled read's bytes are still cached. A gap between cached bytes is fetched alone; cached bytes are handed over in
/// bounded steps; a changed file fails the read.
/// Production: AuthorizedMediaLoader, NodeMediaHTTP, MediaRangeCache (real files); the node is StubNodeProtocol at about
/// 1.5 MB/s; the reads are the loader's own `MediaRead`, as AVFoundation's data requests are.
final class AuthorizedMediaLoaderReadAheadTests: XCTestCase {
    private let node = "http://192.168.1.20:29695"
    private lazy var url = URL(string: "\(node)/rest/files/videos/clip.mp4")!
    private let file = Data((0..<(4 << 20)).map { UInt8(truncatingIfNeeded: $0 &* 31 &+ $0 >> 9) })
    private var folder: URL!
    private var cache: MediaRangeCache!
    private var key = ""

    /// A read as AVFoundation makes one; its answers are kept for the test.
    private final class Read: MediaRead {
        let first: Int64
        let last: Int64
        private let lock = NSLock()
        private var _received = Data()
        private var _responses = 0
        private var _finished = false
        private var _error: Error?
        init(_ first: Int64, count: Int64) {
            self.first = first
            last = first + count - 1
        }
        func respond(with data: Data) { lock.lock(); _received.append(data); _responses += 1; lock.unlock() }
        func finish() { lock.lock(); _finished = true; lock.unlock() }
        func fail(_ error: Error) { lock.lock(); _error = error; lock.unlock() }
        var received: Data { lock.lock(); defer { lock.unlock() }; return _received }
        var responses: Int { lock.lock(); defer { lock.unlock() }; return _responses }
        var finished: Bool { lock.lock(); defer { lock.unlock() }; return _finished }
        var error: Error? { lock.lock(); defer { lock.unlock() }; return _error }
    }

    override func setUpWithError() throws {
        StubNodeProtocol.serve(file, etag: "\"\(file.count)-\(UUID().uuidString)\"")
        folder = FileManager.default.temporaryDirectory.appendingPathComponent("read-ahead-\(UUID().uuidString)")
        cache = MediaRangeCache(directory: folder)
    }

    override func tearDownWithError() throws {
        if let folder { try? FileManager.default.removeItem(at: folder) }
    }

    /// A loader after its probe; the node's record then holds its fetches only.
    private func loader() async throws -> AuthorizedMediaLoader {
        let http = NodeMediaHTTP(nodeOrigin: node, credential: StubNodeProtocol.credential, configuration: StubNodeProtocol.configuration())
        let probe = try await http.probe(url)
        key = MediaRangeCache.key(nodeID: node, url: url, etag: probe.etag)
        StubNodeProtocol.clearServed()
        return AuthorizedMediaLoader(url: url, nodeID: node, http: http, probe: probe, cache: cache)
    }

    private func start(_ read: Read, on loader: AuthorizedMediaLoader) {
        loader.queue.async { loader.serve(read) }
    }

    private func done(_ read: Read, timeout: TimeInterval = 15) async throws {
        try await wait("the read of \(read.first)…\(read.last)", timeout: timeout) { read.finished || read.error != nil }
        XCTAssertNil(read.error)
        XCTAssertEqual(read.received, file.subdata(in: Int(read.first)..<Int(read.last + 1)), "the file's bytes")
    }

    private func wait(_ what: String, timeout: TimeInterval = 15, until condition: () -> Bool) async throws {
        let deadline = Date().addingTimeInterval(timeout)
        while Date() < deadline {
            if condition() { return }
            try await Task.sleep(nanoseconds: 20_000_000)
        }
        XCTFail("\(what): not within \(timeout) s; served \(StubNodeProtocol.served.map { "\($0.range ?? "-"):\($0.bytes)" })")
        throw XCTSkip("stopped")
    }

    private var last: Int64 { Int64(file.count) - 1 }

    func testABurstOfSmallSequentialReadsMakesOneRequest() async throws {
        let loader = try await loader()
        defer { loader.invalidate() }
        for index in 0..<40 {
            let read = Read(Int64(index) * 23_000, count: 23_000)
            start(read, on: loader)
            try await done(read)
        }
        XCTAssertEqual(StubNodeProtocol.served.map(\.range), ["bytes=0-\(last)"], "one streaming fetch for all 40 reads")
        XCTAssertTrue(StubNodeProtocol.served.allSatisfy { $0.authorization == "Bearer \(StubNodeProtocol.credential)" && $0.status == 206 })
    }

    func testAFarReadStartsItsOwnFetchAndTheIdleOneStops() async throws {
        let loader = try await loader()
        defer { loader.invalidate() }
        let near = Read(0, count: 23_000)
        start(near, on: loader)
        try await done(near)
        let far = Read(3 << 20, count: 23_000)
        start(far, on: loader)
        try await done(far)
        XCTAssertEqual(StubNodeProtocol.served.map(\.range), ["bytes=0-\(last)", "bytes=\(3 << 20)-\(last)"], "a fetch of its own")
        let stopped = StubNodeProtocol.served[0].bytes
        try await Task.sleep(nanoseconds: 400_000_000)
        XCTAssertEqual(StubNodeProtocol.served[0].bytes, stopped, "the idle fetch stopped")
        XCTAssertLessThan(stopped, 3 << 20)
    }

    // autobyteus-642 CR-003: "within reach" is time at the fetch's measured rate, not 1 MB. Over a slow link (100 KB/s,
    // about 256 kbit/s audio's room) 1 MB is ten seconds of waiting; a read the fetch reaches within readAheadWait waits,
    // and one farther away starts its own fetch.
    func testOverASlowLinkAReadBeyondTheFetchsRateStartsItsOwnFetchAndTheIdleOneStops() async throws {
        let loader = try await loader()
        defer { loader.invalidate() }
        StubNodeProtocol.bytesPerSecond = 100_000
        let first = Read(0, count: 1_000)
        start(first, on: loader)
        try await done(first)
        // Enough has come for a rate (two 64 KB parts after the first).
        try await wait("the fetch's rate") { (StubNodeProtocol.served.first?.bytes ?? 0) >= 3 * 65_536 }
        let near = StubNodeProtocol.served[0].bytes
        // About 200 KB ahead: 2 s at 100 KB/s, well within 1 MB but beyond 0.7 s.
        let seek = Read(near + 200_000, count: 1_000)
        start(seek, on: loader)
        try await wait("the seek's own fetch") { StubNodeProtocol.served.count == 2 }
        XCTAssertEqual(StubNodeProtocol.served.map(\.range), ["bytes=0-\(last)", "bytes=\(near + 200_000)-\(last)"])
        try await done(seek)
        let stopped = StubNodeProtocol.served[0].bytes
        try await Task.sleep(nanoseconds: 1_500_000_000)
        XCTAssertEqual(StubNodeProtocol.served[0].bytes, stopped, "the idle fetch stopped")
    }

    // A scrub seeks again and again while it is dragged: a later point must not wait on the fetch an earlier point just
    // started, which has no rate of its own yet; it is judged by the link's.
    func testOverASlowLinkASecondSeekBeforeTheFirstSeeksFetchHasARateIsJudgedByTheLinksRate() async throws {
        let loader = try await loader()
        defer { loader.invalidate() }
        StubNodeProtocol.bytesPerSecond = 100_000
        let first = Read(0, count: 1_000)
        start(first, on: loader)
        try await done(first)
        try await wait("the link's rate") { (StubNodeProtocol.served.first?.bytes ?? 0) >= 3 * 65_536 }
        let near = StubNodeProtocol.served[0].bytes
        let firstSeek = Read(near + 200_000, count: 1_000)
        start(firstSeek, on: loader)
        try await wait("the first seek's fetch") { StubNodeProtocol.served.count == 2 }
        // At once, 300 KB further on: within 1 MB of the first seek's fetch, 3 s at the link's rate.
        let secondSeek = Read(near + 500_000, count: 1_000)
        start(secondSeek, on: loader)
        try await wait("the second seek's own fetch") { StubNodeProtocol.served.count == 3 }
        XCTAssertEqual(StubNodeProtocol.served.last?.range, "bytes=\(near + 500_000)-\(last)")
        try await done(secondSeek)
    }

    func testOverASlowLinkAReadTheFetchReachesWithinItsWaitWaitsForIt() async throws {
        let loader = try await loader()
        defer { loader.invalidate() }
        StubNodeProtocol.bytesPerSecond = 100_000
        let first = Read(0, count: 1_000)
        start(first, on: loader)
        try await done(first)
        try await wait("the fetch's rate") { (StubNodeProtocol.served.first?.bytes ?? 0) >= 3 * 65_536 }
        // 10 KB past what the fetch has delivered: 0.1 s at its rate.
        let cachedEnd = cache.ranges(for: key).first(where: { $0.contains(0) })?.upperBound ?? 0
        let next = Read(cachedEnd + 1 + 10_000, count: 1_000)
        start(next, on: loader)
        try await done(next)
        XCTAssertEqual(StubNodeProtocol.served.map(\.range), ["bytes=0-\(last)"], "it waited for the running fetch")
    }

    func testCancellingOneReadKeepsTheFetchAnotherReadWaitsFor() async throws {
        let loader = try await loader()
        defer { loader.invalidate() }
        let cancelled = Read(0, count: 400_000)
        let waiting = Read(200_000, count: 200_000)
        start(cancelled, on: loader)
        start(waiting, on: loader)
        try await wait("the first bytes") { cancelled.responses > 0 }
        loader.queue.async { loader.cancel { $0 === cancelled } }
        try await done(waiting)
        XCTAssertFalse(cancelled.finished)
        XCTAssertLessThan(cancelled.received.count, 400_000, "cancelled before its end")
        XCTAssertEqual(StubNodeProtocol.served.map(\.range), ["bytes=0-\(last)"], "both from one fetch, which went on")
    }

    func testTheBytesOfACancelledReadAreCached() async throws {
        let loader = try await loader()
        defer { loader.invalidate() }
        let read = Read(0, count: 600_000)
        start(read, on: loader)
        try await wait("the first bytes") { read.responses > 0 }
        loader.queue.async { loader.cancel { $0 === read } }
        try await wait("the read's range in the cache") { cache.ranges(for: key).contains { $0.contains(0) && $0.contains(599_999) } }
        XCTAssertLessThan(read.received.count, 600_000, "cancelled before its end")
        XCTAssertEqual(cache.read(key: key, from: 0, maxLength: 600_000), file.subdata(in: 0..<600_000))
        XCTAssertEqual(StubNodeProtocol.served.count, 1, "nothing fetched again")
    }

    func testAGapBetweenCachedBytesIsFetchedAlone() async throws {
        let loader = try await loader()
        defer { loader.invalidate() }
        cache.write(key: key, offset: 1 << 20, data: file.subdata(in: (1 << 20)..<(2 << 20)), length: Int64(file.count))
        let read = Read(0, count: 3 << 20)
        start(read, on: loader)
        try await done(read)
        XCTAssertEqual(StubNodeProtocol.served.map(\.range), ["bytes=0-\((1 << 20) - 1)", "bytes=\(2 << 20)-\(last)"],
                       "the gaps only, not the cached bytes")
    }

    func testCachedBytesAreHandedOverInBoundedSteps() async throws {
        let loader = try await loader()
        defer { loader.invalidate() }
        cache.write(key: key, offset: 0, data: file, length: Int64(file.count))
        let whole = Read(0, count: Int64(file.count))
        start(whole, on: loader)
        try await done(whole)
        XCTAssertEqual(whole.responses, file.count / AuthorizedMediaLoader.cacheStep, "one step of the cache at a time")
        let cancelled = Read(0, count: Int64(file.count))
        loader.queue.async {
            loader.serve(cancelled)
            loader.cancel { $0 === cancelled }
        }
        try await Task.sleep(nanoseconds: 200_000_000)
        XCTAssertEqual(cancelled.responses, 1, "a cancel between two steps stops the rest")
        XCTAssertFalse(cancelled.finished)
        XCTAssertTrue(StubNodeProtocol.served.isEmpty, "nothing fetched")
    }

    func testAChangedFileFailsTheReadInsteadOfMixingVersions() async throws {
        let loader = try await loader()
        defer { loader.invalidate() }
        StubNodeProtocol.etag = "\"\(file.count)-\(UUID().uuidString)\""
        let read = Read(0, count: 23_000)
        start(read, on: loader)
        try await wait("the read fails") { read.error != nil || read.finished }
        XCTAssertEqual(read.error as? NodeMediaHTTP.Failure, .status(200))
        XCTAssertTrue(read.received.isEmpty)
    }
}

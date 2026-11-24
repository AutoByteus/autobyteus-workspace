@testable import AutoByteusMobileCore
import AVFoundation
import XCTest

/// autobyteus-574 D-4 (AC-001, AC-002 on iOS, design N-3): AVPlayer plays a node video through the loader: it starts
/// without the whole file, a seek to the middle plays by a range from there, every request carries the credential in
/// the header, a reopen fetches nothing the cache holds, and a changed file (new ETag) is fetched again.
/// "Plays" means decoded frames at those times, as the app's player view shows them, not the player's clock: AVFoundation
/// reads the loader's file on demand, so with nothing to show it reads no frame, and its clock runs on regardless (CR-004).
/// Production: AVPlayer and AVURLAsset, AuthorizedMediaLoader, NodeVideoHTTP, MediaRangeCache (real files); the node is
/// StubNodeProtocol serving a real MP4. The video comes from the host: run with
/// `TEST_RUNNER_AUTOBYTEUS_574_VIDEO=<a 20+ MB MP4 over 31 s long>`; without it the test is skipped.
final class AuthorizedMediaLoaderTests: XCTestCase {
    private let node = "http://192.168.1.20:29695"
    private lazy var url = URL(string: "\(node)/rest/files/videos/clip.mp4")!
    private var folder: URL!
    private var length: Int64 = 0

    override func setUpWithError() throws {
        guard let path = ProcessInfo.processInfo.environment["AUTOBYTEUS_574_VIDEO"],
              let video = FileManager.default.contents(atPath: path), video.count > 20_000_000
        else { throw XCTSkip("set TEST_RUNNER_AUTOBYTEUS_574_VIDEO to a 20+ MB MP4") }
        length = Int64(video.count)
        StubNodeProtocol.serve(video, etag: "\"\(video.count)-\(UUID().uuidString)\"")
        folder = FileManager.default.temporaryDirectory.appendingPathComponent("loader-cache-\(UUID().uuidString)")
    }

    override func tearDownWithError() throws {
        if let folder { try? FileManager.default.removeItem(at: folder) }
    }

    /// One playback through a new loader over `cache`, as the player screen makes it, with a video output that takes its
    /// frames as the screen's player view does.
    private func play(cache: MediaRangeCache) async throws -> (AVPlayer, AuthorizedMediaLoader) {
        let http = NodeVideoHTTP(nodeOrigin: node, credential: StubNodeProtocol.credential, configuration: StubNodeProtocol.configuration())
        let probe = try await http.probe(url)
        let loader = AuthorizedMediaLoader(url: url, nodeID: node, http: http, probe: probe, cache: cache)
        let asset = AVURLAsset(url: NodeVideoURL.assetURL(for: url)!)
        asset.resourceLoader.setDelegate(loader, queue: loader.queue)
        let item = AVPlayerItem(asset: asset)
        item.add(AVPlayerItemVideoOutput(pixelBufferAttributes: nil))
        let player = AVPlayer(playerItem: item)
        player.isMuted = true
        player.play()
        return (player, loader)
    }

    private func wait(_ what: String, timeout: TimeInterval = 20, until condition: () -> Bool) async throws {
        let deadline = Date().addingTimeInterval(timeout)
        while Date() < deadline {
            if condition() { return }
            try await Task.sleep(nanoseconds: 50_000_000)
        }
        XCTFail("\(what): not within \(timeout) s")
        print("autobyteus-574 iOS diagnostics: served \(StubNodeProtocol.served.map { "\($0.range ?? "-"):\($0.status):\($0.bytes)" })")
        throw XCTSkip("stopped")
    }

    /// Whether `player` has shown a frame later than `seconds` (the item time of a frame its output took, now).
    private func showsFrame(_ player: AVPlayer, after seconds: Double) -> Bool {
        guard let output = player.currentItem?.outputs.first as? AVPlayerItemVideoOutput else { return false }
        let time = output.itemTime(forHostTime: CACurrentMediaTime())
        guard output.hasNewPixelBuffer(forItemTime: time) else { return false }
        var shown = CMTime.invalid
        return output.copyPixelBuffer(forItemTime: time, itemTimeForDisplay: &shown) != nil && shown.seconds > seconds
    }

    private func ranges(_ served: [StubNodeProtocol.Served]) -> [ClosedRange<Int64>] {
        served.filter { $0.bytes > 0 }.map { $0.first...($0.first + $0.bytes - 1) }
    }

    private func overlap(_ ranges: [ClosedRange<Int64>], _ others: [ClosedRange<Int64>]) -> Int64 {
        ranges.reduce(0) { sum, range in
            sum + others.reduce(0) { $0 + max(0, min(range.upperBound, $1.upperBound) - max(range.lowerBound, $1.lowerBound) + 1) }
        }
    }

    func testPlaysAtOnceSeeksByRangeReopensFromTheCacheAndFetchesAChangedFileAgain() async throws {
        let cache = MediaRangeCache(directory: folder)
        let opened = Date()
        let (player, loader) = try await play(cache: cache)
        try await wait("playing") {
            if let item = player.currentItem, item.status == .failed { print("autobyteus-574 iOS diagnostics: item failed \(String(describing: item.error))") }
            return showsFrame(player, after: 0.3)
        }
        let startSeconds = Date().timeIntervalSince(opened)
        XCTAssertLessThan(StubNodeProtocol.served.reduce(0) { $0 + $1.bytes }, length / 2, "not the whole file first")

        let sought = Date()
        await player.seek(to: CMTime(seconds: 30, preferredTimescale: 600))
        player.play()
        try await wait("playing at the middle") { showsFrame(player, after: 30.3) }
        let seekSeconds = Date().timeIntervalSince(sought)
        XCTAssertTrue(StubNodeProtocol.served.contains { $0.first > length / 3 }, "a range from the middle")
        // AVFoundation reads in small pieces; they are answered from a few streaming fetches, not a request each (CR-004).
        XCTAssertLessThanOrEqual(StubNodeProtocol.served.count, 6, "the probe and a few fetches, not a request per read")
        XCTAssertTrue(StubNodeProtocol.served.allSatisfy { $0.authorization == "Bearer \(StubNodeProtocol.credential)" })
        XCTAssertFalse(StubNodeProtocol.served.contains { $0.status == 200 }, "never the whole file")
        player.pause()
        player.replaceCurrentItem(with: nil)
        loader.invalidate()
        let key = MediaRangeCache.key(nodeID: node, url: url, etag: StubNodeProtocol.etag)
        let cached = cache.ranges(for: key)
        XCTAssertGreaterThanOrEqual(cached.count, 2, "both played parts are cached")
        print("autobyteus-574 iOS: playing after \(String(format: "%.2f", startSeconds)) s; at the middle \(String(format: "%.2f", seekSeconds)) s after the seek; requests \(StubNodeProtocol.served.map { $0.range ?? "-" }); cached \(cached)")

        // Reopen, the same version: what the cache holds is not fetched again (only the two-byte probe).
        StubNodeProtocol.clearServed()
        let (again, againLoader) = try await play(cache: cache)
        try await wait("playing again") { showsFrame(again, after: 0.3) }
        await again.seek(to: CMTime(seconds: 30, preferredTimescale: 600))
        again.play()
        try await wait("playing at the middle again") { showsFrame(again, after: 30.3) }
        again.pause()
        again.replaceCurrentItem(with: nil)
        againLoader.invalidate()
        let refetched = overlap(ranges(StubNodeProtocol.served.filter { $0.range != "bytes=0-1" }), cached)
        print("autobyteus-574 iOS: reopen served \(StubNodeProtocol.served.map { "\($0.range ?? "-"):\($0.bytes)" }); fetched again of the cached: \(refetched)")
        XCTAssertEqual(refetched, 0, "bytes fetched again of what was cached")

        // A changed file (new ETag): a new entry, fetched from its start.
        StubNodeProtocol.etag = "\"\(length)-\(UUID().uuidString)\""
        StubNodeProtocol.clearServed()
        let (changed, changedLoader) = try await play(cache: cache)
        try await wait("playing the changed file") { showsFrame(changed, after: 0.3) }
        changed.pause()
        changed.replaceCurrentItem(with: nil)
        changedLoader.invalidate()
        XCTAssertGreaterThan(overlap(ranges(StubNodeProtocol.served.filter { $0.range != "bytes=0-1" }), cached), 0, "the changed file is fetched again")
    }
}

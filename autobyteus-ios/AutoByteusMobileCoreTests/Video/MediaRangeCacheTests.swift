@testable import AutoByteusMobileCore
import XCTest

/// autobyteus-574 D-4, D-7, design N-3, N-4 (REQ-002, AC-002 on iOS): the range cache keeps the byte ranges fetched of one
/// version of one node file, merges them, names what is missing, drops the least recently used entries above its limit,
/// gives a changed file (new ETag) a new entry, and deletes a removed node's entries only. Keys spell out no path.
/// Production: MediaRangeCache over real files in a temporary folder.
final class MediaRangeCacheTests: XCTestCase {
    private var folder: URL!
    private let node = "http://192.168.1.20:29695"
    private let url = URL(string: "http://192.168.1.20:29695/rest/workspaces/w/content?path=demo%2Fplan.mp4")!

    override func setUpWithError() throws {
        folder = FileManager.default.temporaryDirectory.appendingPathComponent("media-range-cache-\(UUID().uuidString)")
    }

    override func tearDownWithError() throws {
        try? FileManager.default.removeItem(at: folder)
    }

    private func bytes(_ range: ClosedRange<Int64>) -> Data {
        Data(range.map { UInt8(truncatingIfNeeded: $0) })
    }

    func testPartialRangesAreKeptReadBackAndTheirGapsNamed() {
        let cache = MediaRangeCache(directory: folder)
        let key = MediaRangeCache.key(nodeID: node, url: url, etag: "\"1000-1\"")
        cache.write(key: key, offset: 0, data: bytes(0...99), length: 1000)
        cache.write(key: key, offset: 500, data: bytes(500...599), length: 1000)
        XCTAssertEqual(cache.ranges(for: key), [0...99, 500...599])
        XCTAssertEqual(cache.read(key: key, from: 10, maxLength: 1_000), bytes(10...99))
        XCTAssertEqual(cache.read(key: key, from: 100, maxLength: 10), Data())
        XCTAssertEqual(cache.gaps(for: key, in: 0...999), [100...499, 600...999])
    }

    func testOverlappingAndAdjacentRangesMergeIntoOne() {
        let cache = MediaRangeCache(directory: folder)
        let key = MediaRangeCache.key(nodeID: node, url: url, etag: "\"1000-1\"")
        cache.write(key: key, offset: 100, data: bytes(100...299), length: 1000)
        cache.write(key: key, offset: 250, data: bytes(250...399), length: 1000)
        cache.write(key: key, offset: 400, data: bytes(400...449), length: 1000)
        cache.write(key: key, offset: 0, data: bytes(0...99), length: 1000)
        XCTAssertEqual(cache.ranges(for: key), [0...449])
        XCTAssertEqual(cache.read(key: key, from: 0, maxLength: 1_000), bytes(0...449))
    }

    func testAReopenOfWhatIsHeldNeedsNothingFetched() {
        let cache = MediaRangeCache(directory: folder)
        let key = MediaRangeCache.key(nodeID: node, url: url, etag: "\"1000-1\"")
        cache.write(key: key, offset: 0, data: bytes(0...299), length: 1000)
        cache.write(key: key, offset: 600, data: bytes(600...799), length: 1000)
        XCTAssertEqual(cache.gaps(for: key, in: 0...299), [])
        XCTAssertEqual(cache.gaps(for: key, in: 650...799), [])
        XCTAssertEqual(cache.gaps(for: key, in: 200...700), [300...599])
    }

    func testAChangedFileHasANewEntrySoItsOldBytesAreNeverServed() {
        let cache = MediaRangeCache(directory: folder)
        let old = MediaRangeCache.key(nodeID: node, url: url, etag: "\"1000-1\"")
        let new = MediaRangeCache.key(nodeID: node, url: url, etag: "\"1000-2\"")
        XCTAssertNotEqual(old, new)
        cache.write(key: old, offset: 0, data: bytes(0...999), length: 1000)
        XCTAssertEqual(cache.ranges(for: new), [])
        XCTAssertEqual(cache.gaps(for: new, in: 0...999), [0...999])
    }

    func testTheLeastRecentlyUsedEntryIsDroppedAboveTheLimit() throws {
        let cache = MediaRangeCache(directory: folder, maxBytes: 2_500)
        let first = MediaRangeCache.key(nodeID: node, url: url, etag: "\"a\"")
        let second = MediaRangeCache.key(nodeID: node, url: url, etag: "\"b\"")
        let third = MediaRangeCache.key(nodeID: node, url: url, etag: "\"c\"")
        cache.write(key: first, offset: 0, data: bytes(0...999), length: 1000)
        Thread.sleep(forTimeInterval: 1.1)
        cache.write(key: second, offset: 0, data: bytes(0...999), length: 1000)
        Thread.sleep(forTimeInterval: 1.1)
        _ = cache.read(key: first, from: 0, maxLength: 10)  // the first is used again: the second is now the oldest
        Thread.sleep(forTimeInterval: 1.1)
        cache.write(key: third, offset: 0, data: bytes(0...999), length: 1000)
        XCTAssertEqual(cache.ranges(for: second), [], "the least recently used entry is dropped")
        XCTAssertEqual(cache.ranges(for: first), [0...999])
        XCTAssertEqual(cache.ranges(for: third), [0...999])
        XCTAssertLessThanOrEqual(cache.heldBytes(), 2_500)
    }

    func testRemovingANodeDeletesItsEntriesAndNoOtherNodes() {
        let cache = MediaRangeCache(directory: folder)
        let other = "http://192.168.1.21:29695"
        let removed = MediaRangeCache.key(nodeID: node, url: url, etag: "\"1\"")
        let kept = MediaRangeCache.key(nodeID: other, url: url, etag: "\"1\"")
        cache.write(key: removed, offset: 0, data: bytes(0...99), length: 100)
        cache.write(key: kept, offset: 0, data: bytes(0...99), length: 100)
        cache.deleteNode(node)
        XCTAssertEqual(cache.ranges(for: removed), [])
        XCTAssertEqual(cache.ranges(for: kept), [0...99])
    }

    func testKeysAndFileNamesAreHashesThatSpellOutNoPath() throws {
        let cache = MediaRangeCache(directory: folder)
        let key = MediaRangeCache.key(nodeID: node, url: url, etag: "\"1\"")
        XCTAssertNotNil(key.range(of: "^[0-9a-f]{64}-[0-9a-f]{64}$", options: .regularExpression))
        XCTAssertTrue(key.hasPrefix(MediaRangeCache.nodePrefix(node)))
        cache.write(key: key, offset: 0, data: bytes(0...9), length: 10)
        let names = try FileManager.default.contentsOfDirectory(atPath: folder.path)
        XCTAssertFalse(names.contains { $0.contains("plan") || $0.contains("192.168") })
    }
}

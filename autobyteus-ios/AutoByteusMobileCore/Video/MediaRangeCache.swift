import CryptoKit
import Foundation

/// The app's video cache on iOS (autobyteus-574 DEC-003, D-4, D-7, design N-3, N-4): the bytes of node videos already
/// fetched, by version. An entry is one version of one node file (node, URL path and query, ETag), so a changed file has
/// a new entry and its old bytes are never served. Each entry is a sparse data file and a map of the byte ranges it holds,
/// in the app's private cache folder, named by a hash (no path is spelled out). The least recently used entries are
/// dropped above `maxBytes`; a node's entries are deleted when the node is removed. It holds video bytes only, never a
/// credential. Safe to use from any thread.
public final class MediaRangeCache {
    public static let defaultMaxBytes: Int64 = 500 * 1024 * 1024

    /// The app's one cache, in its caches folder.
    public static let shared = MediaRangeCache(
        directory: FileManager.default.urls(for: .cachesDirectory, in: .userDomainMask)[0].appendingPathComponent("video-cache", isDirectory: true)
    )

    private struct RangeMap: Codable {
        var length: Int64
        /// Held byte ranges, sorted and merged, as `[first, last]` pairs.
        var ranges: [[Int64]]
    }

    private let directory: URL
    private let maxBytes: Int64
    private let lock = NSLock()

    public init(directory: URL, maxBytes: Int64 = MediaRangeCache.defaultMaxBytes) {
        self.directory = directory
        self.maxBytes = maxBytes
    }

    // MARK: Keys

    /// The entry of one version of one node file: `<node hash>-<hash of node, URL path and query, ETag>`.
    public static func key(nodeID: String, url: URL, etag: String) -> String {
        let components = URLComponents(url: url, resolvingAgainstBaseURL: false)
        let pathAndQuery = (components?.percentEncodedPath ?? url.path) + (components?.percentEncodedQuery.map { "?\($0)" } ?? "")
        return nodePrefix(nodeID) + sha256("\(nodeID)|\(pathAndQuery)|\(etag)")
    }

    /// What every key of `nodeID` starts with.
    public static func nodePrefix(_ nodeID: String) -> String { sha256(nodeID) + "-" }

    private static func sha256(_ text: String) -> String {
        SHA256.hash(data: Data(text.utf8)).map { String(format: "%02x", $0) }.joined()
    }

    // MARK: Reading and writing

    /// The byte ranges held for `key`.
    public func ranges(for key: String) -> [ClosedRange<Int64>] {
        lock.lock(); defer { lock.unlock() }
        return readMap(key)?.ranges.map { $0[0]...$0[1] } ?? []
    }

    /// The bytes held from `offset` on without a gap, at most `maxLength`; empty when `offset` is not held.
    public func read(key: String, from offset: Int64, maxLength: Int) -> Data {
        lock.lock(); defer { lock.unlock() }
        guard let map = readMap(key), let held = map.ranges.first(where: { $0[0] <= offset && offset <= $0[1] }) else { return Data() }
        let count = Int(min(Int64(maxLength), held[1] - offset + 1))
        guard let handle = try? FileHandle(forReadingFrom: dataURL(key)) else { return Data() }
        defer { try? handle.close() }
        do {
            try handle.seek(toOffset: UInt64(offset))
            let data = try handle.read(upToCount: count) ?? Data()
            touch(key)
            return data
        } catch {
            return Data()
        }
    }

    /// Stores `data` at `offset` of the `length`-byte file of `key`, then drops least recently used entries above the limit.
    public func write(key: String, offset: Int64, data: Data, length: Int64) {
        guard !data.isEmpty else { return }
        lock.lock(); defer { lock.unlock() }
        do {
            try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
            let file = dataURL(key)
            if !FileManager.default.fileExists(atPath: file.path) { FileManager.default.createFile(atPath: file.path, contents: nil) }
            let handle = try FileHandle(forWritingTo: file)
            defer { try? handle.close() }
            try handle.seek(toOffset: UInt64(offset))
            try handle.write(contentsOf: data)
            var map = readMap(key) ?? RangeMap(length: length, ranges: [])
            map.length = length
            map.ranges = Self.merge(map.ranges.map { $0[0]...$0[1] }, offset...(offset + Int64(data.count) - 1)).map { [$0.lowerBound, $0.upperBound] }
            try JSONEncoder().encode(map).write(to: mapURL(key), options: .atomic)
            evict(keeping: key)
        } catch {
            // A cache that cannot be written only means the bytes are fetched again next time.
        }
    }

    /// The byte ranges of `first...last` that `key` does not hold: what a reader must fetch.
    public func gaps(for key: String, in requested: ClosedRange<Int64>) -> [ClosedRange<Int64>] {
        Self.gaps(of: ranges(for: key), in: requested)
    }

    // MARK: Removal

    /// Deletes every entry of `nodeID` (a node removed from the app); other nodes' entries stay.
    public func deleteNode(_ nodeID: String) {
        lock.lock(); defer { lock.unlock() }
        let prefix = Self.nodePrefix(nodeID)
        for file in (try? FileManager.default.contentsOfDirectory(at: directory, includingPropertiesForKeys: nil)) ?? []
        where file.lastPathComponent.hasPrefix(prefix) {
            try? FileManager.default.removeItem(at: file)
        }
    }

    /// The bytes the cache holds, over all entries.
    public func heldBytes() -> Int64 {
        lock.lock(); defer { lock.unlock() }
        return entries().reduce(0) { $0 + $1.bytes }
    }

    // MARK: Range arithmetic

    static func merge(_ ranges: [ClosedRange<Int64>], _ added: ClosedRange<Int64>) -> [ClosedRange<Int64>] {
        var result: [ClosedRange<Int64>] = []
        var current = added
        for range in ranges.sorted(by: { $0.lowerBound < $1.lowerBound }) {
            if range.upperBound + 1 < current.lowerBound || current.upperBound + 1 < range.lowerBound {
                result.append(range)
            } else {
                current = min(range.lowerBound, current.lowerBound)...max(range.upperBound, current.upperBound)
            }
        }
        result.append(current)
        return result.sorted { $0.lowerBound < $1.lowerBound }
    }

    static func gaps(of held: [ClosedRange<Int64>], in requested: ClosedRange<Int64>) -> [ClosedRange<Int64>] {
        var gaps: [ClosedRange<Int64>] = []
        var next = requested.lowerBound
        for range in held.sorted(by: { $0.lowerBound < $1.lowerBound }) where range.upperBound >= next {
            if range.lowerBound > requested.upperBound { break }
            if range.lowerBound > next { gaps.append(next...(range.lowerBound - 1)) }
            next = max(next, range.upperBound + 1)
            if next > requested.upperBound { return gaps }
        }
        if next <= requested.upperBound { gaps.append(next...requested.upperBound) }
        return gaps
    }

    // MARK: Files (under the lock)

    private func dataURL(_ key: String) -> URL { directory.appendingPathComponent("\(key).data") }
    private func mapURL(_ key: String) -> URL { directory.appendingPathComponent("\(key).ranges.json") }

    private func readMap(_ key: String) -> RangeMap? {
        guard let data = try? Data(contentsOf: mapURL(key)) else { return nil }
        return try? JSONDecoder().decode(RangeMap.self, from: data)
    }

    /// Marks `key` as just used (its map's modification date is the LRU order).
    private func touch(_ key: String) {
        try? FileManager.default.setAttributes([.modificationDate: Date()], ofItemAtPath: mapURL(key).path)
    }

    private func entries() -> [(key: String, bytes: Int64, used: Date)] {
        let files = (try? FileManager.default.contentsOfDirectory(at: directory, includingPropertiesForKeys: [.contentModificationDateKey])) ?? []
        return files.filter { $0.lastPathComponent.hasSuffix(".ranges.json") }.compactMap { file in
            let key = String(file.lastPathComponent.dropLast(".ranges.json".count))
            guard let map = readMap(key) else { return nil }
            let bytes = map.ranges.reduce(Int64(0)) { $0 + $1[1] - $1[0] + 1 }
            let used = (try? file.resourceValues(forKeys: [.contentModificationDateKey]).contentModificationDate) ?? .distantPast
            return (key, bytes, used)
        }
    }

    /// Drops least recently used entries until the cache holds at most `maxBytes`; the entry being written stays.
    private func evict(keeping key: String) {
        var all = entries()
        var total = all.reduce(0) { $0 + $1.bytes }
        guard total > maxBytes else { return }
        all.sort { $0.used < $1.used }
        for entry in all where entry.key != key {
            try? FileManager.default.removeItem(at: dataURL(entry.key))
            try? FileManager.default.removeItem(at: mapURL(entry.key))
            total -= entry.bytes
            if total <= maxBytes { return }
        }
    }
}

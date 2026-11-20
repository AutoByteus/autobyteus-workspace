import XCTest

/// autobyteus-279 SR-004: a node is shown by `SavedNodeEntry.shownName` and named to its page by `knownName`; no native
/// view, and none of the flow's screen calls, reads the stored `displayName` (which may be the node's address). Reads the
/// sources next to this file (the simulator reads the Mac's files).
final class NativeNodeNameReadsTests: XCTestCase {
    private let iosRoot = URL(fileURLWithPath: #filePath).deletingLastPathComponent().deletingLastPathComponent()

    private func swiftFiles(in folder: String) throws -> [URL] {
        let root = iosRoot.appendingPathComponent(folder)
        let files = FileManager.default.enumerator(at: root, includingPropertiesForKeys: nil)?
            .compactMap { $0 as? URL }.filter { $0.pathExtension == "swift" } ?? []
        XCTAssertFalse(files.isEmpty, "no Swift sources under \(root.path)")
        return files
    }

    func testNoNativeViewReadsDisplayName() throws {
        var reads: [String] = []
        for folder in ["AutoByteusMobile", "AutoByteusMobileShareExtension"] {
            for file in try swiftFiles(in: folder) {
                let lines = try String(contentsOf: file, encoding: .utf8).components(separatedBy: .newlines)
                for (index, line) in lines.enumerated() where line.contains(".displayName") {
                    reads.append("\(file.lastPathComponent):\(index + 1): \(line.trimmingCharacters(in: .whitespaces))")
                }
            }
        }
        XCTAssertEqual([], reads, "use shownName (labels) or knownName (the page's hello)")
    }

    func testTheFlowOnlyWritesDisplayName() throws {
        let flow = iosRoot.appendingPathComponent("AutoByteusMobileCore/NodeConnectionFlow.swift")
        let lines = try String(contentsOf: flow, encoding: .utf8).components(separatedBy: .newlines)
        let reads = lines.enumerated()
            .filter { $0.element.contains("displayName") && !$0.element.contains("updating(displayName:") && !$0.element.trimmingCharacters(in: .whitespaces).hasPrefix("///") }
            .map { "NodeConnectionFlow.swift:\($0.offset + 1): \($0.element.trimmingCharacters(in: .whitespaces))" }
        XCTAssertEqual([], reads, "the flow's screens get shownName; whether a pairing renames reads knownName")
    }
}

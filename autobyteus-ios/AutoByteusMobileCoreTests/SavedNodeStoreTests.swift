import XCTest
import AutoByteusMobileCore

final class SavedNodeStoreTests: XCTestCase {
    func testPersistsOnlySavedNodeMetadataAndSelection() throws {
        let suiteName = "SavedNodeStoreTests.\(UUID().uuidString)"
        let suite = UserDefaults(suiteName: suiteName)!
        defer { suite.removePersistentDomain(forName: suiteName) }
        let store = SavedNodeStore(userDefaults: suite)
        let entry = try SavedNodeEntry.fromNormalized(
            NodeURLNormalizer.normalize("http://desktop.local:29695/mobile"),
            displayName: "Home Desktop",
            httpAcknowledged: true,
            nowEpochMilliseconds: 1000
        )
        store.saveEntry(entry)
        let loaded = try XCTUnwrap(store.loadSelectedEntry())
        XCTAssertEqual(entry.id, loaded.id)
        XCTAssertEqual("Home Desktop", loaded.displayName)
        XCTAssertTrue(loaded.httpAcknowledged)
        XCTAssertFalse(String(data: suite.data(forKey: "autobyteus.saved-node-entries")!, encoding: .utf8)!.contains("mra_"))
    }

    func testRemoveSelectsNextEntry() throws {
        let suiteName = "SavedNodeStoreTests.\(UUID().uuidString)"
        let suite = UserDefaults(suiteName: suiteName)!
        defer { suite.removePersistentDomain(forName: suiteName) }
        let store = SavedNodeStore(userDefaults: suite)
        let first = try SavedNodeEntry.fromNormalized(NodeURLNormalizer.normalize("https://one.tailnet.ts.net/mobile"), nowEpochMilliseconds: 1)
        let second = try SavedNodeEntry.fromNormalized(NodeURLNormalizer.normalize("https://two.tailnet.ts.net/mobile"), nowEpochMilliseconds: 2)
        store.saveEntry(first)
        store.saveEntry(second)
        store.removeEntry(id: second.id)
        XCTAssertEqual(first.id, store.loadSelectedEntry()?.id)
    }
}

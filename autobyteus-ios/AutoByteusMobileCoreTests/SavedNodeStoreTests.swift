import XCTest
import AutoByteusMobileCore

final class SavedNodeStoreTests: XCTestCase {
    func testPersistsOnlySavedNodeMetadataAndSelection() throws {
        let suiteName = "SavedNodeStoreTests.\(UUID().uuidString)"
        let suite = UserDefaults(suiteName: suiteName)!
        defer { suite.removePersistentDomain(forName: suiteName) }
        let store = SavedNodeStore(userDefaults: suite)
        let profile = try SavedNodeProfile.fromNormalized(
            NodeURLNormalizer.normalize("http://desktop.local:29695/mobile"),
            displayName: "Home Desktop",
            httpAcknowledged: true,
            nowEpochMilliseconds: 1000
        )
        store.saveProfile(profile)
        let loaded = try XCTUnwrap(store.loadSelectedProfile())
        XCTAssertEqual(profile.id, loaded.id)
        XCTAssertEqual("Home Desktop", loaded.displayName)
        XCTAssertTrue(loaded.httpAcknowledged)
        XCTAssertFalse(String(data: suite.data(forKey: "autobyteus.saved-node-profiles")!, encoding: .utf8)!.contains("mra_"))
    }

    func testRemoveSelectsNextProfile() throws {
        let suiteName = "SavedNodeStoreTests.\(UUID().uuidString)"
        let suite = UserDefaults(suiteName: suiteName)!
        defer { suite.removePersistentDomain(forName: suiteName) }
        let store = SavedNodeStore(userDefaults: suite)
        let first = try SavedNodeProfile.fromNormalized(NodeURLNormalizer.normalize("https://one.tailnet.ts.net/mobile"), nowEpochMilliseconds: 1)
        let second = try SavedNodeProfile.fromNormalized(NodeURLNormalizer.normalize("https://two.tailnet.ts.net/mobile"), nowEpochMilliseconds: 2)
        store.saveProfile(first)
        store.saveProfile(second)
        store.removeProfile(id: second.id)
        XCTAssertEqual(first.id, store.loadSelectedProfile()?.id)
    }
}

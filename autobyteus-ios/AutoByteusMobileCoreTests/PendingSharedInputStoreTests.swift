import XCTest
import AutoByteusMobileCore

final class PendingSharedInputStoreTests: XCTestCase {
    func testConsumesPendingSharedInputOnce() throws {
        let suiteName = "PendingSharedInputStoreTests.\(UUID().uuidString)"
        let suite = UserDefaults(suiteName: suiteName)!
        defer { suite.removePersistentDomain(forName: suiteName) }
        let store = PendingSharedInputStore(userDefaults: suite)
        let pending = PendingSharedInput(rawText: "https://desktop.tailnet.ts.net/mobile", source: "test", createdAtEpochMilliseconds: 123)
        store.store(pending)
        XCTAssertEqual(pending, store.peek())
        XCTAssertEqual(pending, store.consume())
        XCTAssertNil(store.consume())
    }
}

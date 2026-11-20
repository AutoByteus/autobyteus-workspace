import XCTest
import AutoByteusMobileCore

/// autobyteus-279 SR-003/SR-004: the shipped app's placeholder name ("AutoByteus Desktop", saved when a node's status
/// had no name) becomes the entry's host, the current "no known name"; a pairing link's name is kept. Writes: backup,
/// rewritten entries, marker; a backup without the marker is restored and the migration runs again.
final class SavedNodeDisplayNamePlaceholderMigrationTests: XCTestCase {
    private let entriesKey = "autobyteus.saved-node-entries"
    private let backupKey = "autobyteus.saved-node-entries:before-display-name-placeholder"
    private let markerKey = "autobyteus.migrations.saved-node-display-name-placeholder"

    /// The shipped writer's exact output (`JSONEncoder` of `SavedNodeEntry`): a typed address saved under the status
    /// default, and a pairing link saved under its QR name.
    private let shippedEntries = Data(#"[{"id":"http://192.168.1.20:29695","displayName":"AutoByteus Desktop","baseURL":"http://192.168.1.20:29695","mobileURL":"http://192.168.1.20:29695/mobile","scheme":"http","host":"192.168.1.20","port":29695,"httpAcknowledged":true,"createdAtEpochMilliseconds":1,"updatedAtEpochMilliseconds":3},{"id":"https://desk.tailnet.ts.net","displayName":"Test Node 279","baseURL":"https://desk.tailnet.ts.net","mobileURL":"https://desk.tailnet.ts.net/mobile","scheme":"https","host":"desk.tailnet.ts.net","httpAcknowledged":true,"createdAtEpochMilliseconds":1,"updatedAtEpochMilliseconds":2}]"#.utf8)

    private func suite() -> (UserDefaults, () -> Void) {
        let name = "SavedNodeDisplayNamePlaceholderMigrationTests.\(UUID().uuidString)"
        let suite = UserDefaults(suiteName: name)!
        return (suite, { suite.removePersistentDomain(forName: name) })
    }

    private func names(_ defaults: UserDefaults) -> [String] {
        SavedNodeStore(userDefaults: defaults).loadEntries().map(\.displayName)
    }

    func testThePlaceholderBecomesTheHostAndAPairingLinkNameIsKept() {
        let (defaults, cleanup) = suite()
        defer { cleanup() }
        defaults.set(shippedEntries, forKey: entriesKey)

        SavedNodeDisplayNamePlaceholderMigration.run(userDefaults: defaults)

        XCTAssertEqual(["192.168.1.20", "Test Node 279"], names(defaults))
        let store = SavedNodeStore(userDefaults: defaults)
        XCTAssertEqual(["AutoByteus node", "Test Node 279"], store.loadEntries().map(\.shownName))
        XCTAssertEqual([nil, "Test Node 279"], store.loadEntries().map(\.knownName))
        XCTAssertEqual(shippedEntries, defaults.data(forKey: backupKey), "the entries as they were are kept until the next start")
        XCTAssertEqual("done", defaults.string(forKey: markerKey))
    }

    func testEveryOtherFieldIsKept() throws {
        let (defaults, cleanup) = suite()
        defer { cleanup() }
        defaults.set(shippedEntries, forKey: entriesKey)
        let before = SavedNodeStore(userDefaults: defaults).loadEntries()

        SavedNodeDisplayNamePlaceholderMigration.run(userDefaults: defaults)

        let after = SavedNodeStore(userDefaults: defaults).loadEntries()
        XCTAssertEqual(before.count, after.count)
        for (old, new) in zip(before, after) {
            XCTAssertEqual(SavedNodeEntry(id: old.id, displayName: new.displayName, baseURL: old.baseURL, mobileURL: old.mobileURL, scheme: old.scheme, host: old.host, port: old.port, httpAcknowledged: old.httpAcknowledged, createdAtEpochMilliseconds: old.createdAtEpochMilliseconds, updatedAtEpochMilliseconds: old.updatedAtEpochMilliseconds), new)
        }
    }

    func testASecondStartChangesNothingAndRemovesTheBackup() {
        let (defaults, cleanup) = suite()
        defer { cleanup() }
        defaults.set(shippedEntries, forKey: entriesKey)
        SavedNodeDisplayNamePlaceholderMigration.run(userDefaults: defaults)
        let migrated = defaults.data(forKey: entriesKey)

        SavedNodeDisplayNamePlaceholderMigration.run(userDefaults: defaults)

        XCTAssertEqual(migrated, defaults.data(forKey: entriesKey))
        XCTAssertNil(defaults.object(forKey: backupKey))
        XCTAssertEqual("done", defaults.string(forKey: markerKey))
    }

    /// Interrupted after (1), the backup: the entries are as they were.
    func testAnInterruptionAfterTheBackupIsRestoredAndRunAgain() {
        let (defaults, cleanup) = suite()
        defer { cleanup() }
        defaults.set(shippedEntries, forKey: entriesKey)
        defaults.set(shippedEntries, forKey: backupKey)

        SavedNodeDisplayNamePlaceholderMigration.run(userDefaults: defaults)

        XCTAssertEqual(["192.168.1.20", "Test Node 279"], names(defaults))
        XCTAssertEqual("done", defaults.string(forKey: markerKey))
    }

    /// Interrupted after (2), the rewritten entries, before the marker: restored from the backup and run again, with the
    /// same result (even if the half-written entries were changed meanwhile, the backup is the source).
    func testAnInterruptionAfterTheRewriteIsRestoredAndRunAgain() {
        let (defaults, cleanup) = suite()
        defer { cleanup() }
        defaults.set(shippedEntries, forKey: entriesKey)
        SavedNodeDisplayNamePlaceholderMigration.run(userDefaults: defaults)
        let migrated = defaults.data(forKey: entriesKey)
        defaults.removeObject(forKey: markerKey)

        SavedNodeDisplayNamePlaceholderMigration.run(userDefaults: defaults)

        XCTAssertEqual(migrated, defaults.data(forKey: entriesKey))
        XCTAssertEqual(shippedEntries, defaults.data(forKey: backupKey))
        XCTAssertEqual("done", defaults.string(forKey: markerKey))
    }

    func testNoSavedNodesOnlyMarksItDone() {
        let (defaults, cleanup) = suite()
        defer { cleanup() }

        SavedNodeDisplayNamePlaceholderMigration.run(userDefaults: defaults)

        XCTAssertNil(defaults.object(forKey: entriesKey))
        XCTAssertNil(defaults.object(forKey: backupKey))
        XCTAssertEqual("done", defaults.string(forKey: markerKey))
    }

    /// The order at app start: the key migration first (the oldest shipped keys), then this one.
    func testRunsOnEntriesTheKeyMigrationMoved() {
        let (defaults, cleanup) = suite()
        defer { cleanup() }
        defaults.set(shippedEntries, forKey: "autobyteus.saved-node-profiles")

        SavedNodeEntryKeysMigration.run(userDefaults: defaults)
        SavedNodeDisplayNamePlaceholderMigration.run(userDefaults: defaults)

        XCTAssertEqual(["192.168.1.20", "Test Node 279"], names(defaults))
    }
}

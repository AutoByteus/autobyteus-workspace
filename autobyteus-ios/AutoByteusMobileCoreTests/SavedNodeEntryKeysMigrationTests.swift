import XCTest
import AutoByteusMobileCore

/// autobyteus-290 SM-9: the saved entries' UserDefaults keys are renamed once; the values are unchanged.
final class SavedNodeEntryKeysMigrationTests: XCTestCase {
    private let oldEntries = "autobyteus.saved-node-profiles"
    private let oldSelected = "autobyteus.selected-node-profile-id"
    private let newEntries = "autobyteus.saved-node-entries"
    private let newSelected = "autobyteus.selected-node-entry-id"

    /// The released writer's exact output (`JSONEncoder` of the released `SavedNodeProfile`, same fields).
    private let releasedEntries = Data(#"[{"id":"https://one.tailnet.ts.net","displayName":"Home Desktop","baseURL":"https://one.tailnet.ts.net","mobileURL":"https://one.tailnet.ts.net/mobile","scheme":"https","host":"one.tailnet.ts.net","httpAcknowledged":true,"createdAtEpochMilliseconds":1,"updatedAtEpochMilliseconds":2}]"#.utf8)

    private func suite() -> (UserDefaults, () -> Void) {
        let name = "SavedNodeEntryKeysMigrationTests.\(UUID().uuidString)"
        let suite = UserDefaults(suiteName: name)!
        return (suite, { suite.removePersistentDomain(forName: name) })
    }

    func testRenamesTheReleasedKeysAndTheStoreReadsTheSameEntry() throws {
        let (defaults, cleanup) = suite()
        defer { cleanup() }
        defaults.set(releasedEntries, forKey: oldEntries)
        defaults.set("https://one.tailnet.ts.net", forKey: oldSelected)

        SavedNodeEntryKeysMigration.run(userDefaults: defaults)

        XCTAssertNil(defaults.object(forKey: oldEntries))
        XCTAssertNil(defaults.object(forKey: oldSelected))
        XCTAssertEqual(releasedEntries, defaults.data(forKey: newEntries))
        XCTAssertEqual(releasedEntries, defaults.data(forKey: "\(oldEntries):backup"))
        let selected = try XCTUnwrap(SavedNodeStore(userDefaults: defaults).loadSelectedEntry())
        XCTAssertEqual("Home Desktop", selected.displayName)
        XCTAssertTrue(selected.httpAcknowledged)
    }

    func testReRunChangesNothingAndThenRemovesTheBackups() {
        let (defaults, cleanup) = suite()
        defer { cleanup() }
        defaults.set(releasedEntries, forKey: oldEntries)
        SavedNodeEntryKeysMigration.run(userDefaults: defaults)

        SavedNodeEntryKeysMigration.run(userDefaults: defaults)

        XCTAssertEqual(releasedEntries, defaults.data(forKey: newEntries))
        XCTAssertNil(defaults.object(forKey: "\(oldEntries):backup"))
    }

    func testFinishesAStepInterruptedAfterTheNewKeyWasWritten() {
        let (defaults, cleanup) = suite()
        defer { cleanup() }
        defaults.set(releasedEntries, forKey: oldEntries)
        defaults.set(releasedEntries, forKey: "\(oldEntries):backup")
        defaults.set(releasedEntries, forKey: newEntries)

        SavedNodeEntryKeysMigration.run(userDefaults: defaults)

        XCTAssertNil(defaults.object(forKey: oldEntries))
        XCTAssertEqual(releasedEntries, defaults.data(forKey: newEntries))
    }

    func testKeepsTheOldKeyWhenTheNewOneWasNotConvertedFromIt() {
        let (defaults, cleanup) = suite()
        defer { cleanup() }
        defaults.set(releasedEntries, forKey: oldEntries)
        defaults.set(Data("[]".utf8), forKey: newEntries)

        SavedNodeEntryKeysMigration.run(userDefaults: defaults)

        XCTAssertEqual(releasedEntries, defaults.data(forKey: oldEntries))
        XCTAssertEqual(Data("[]".utf8), defaults.data(forKey: newEntries))
    }

    func testAFreshInstallHasNothingToConvert() {
        let (defaults, cleanup) = suite()
        defer { cleanup() }
        SavedNodeEntryKeysMigration.run(userDefaults: defaults)
        XCTAssertNil(defaults.object(forKey: newEntries))
        XCTAssertNil(defaults.object(forKey: newSelected))
    }

    /// N-911 boundary: only the app's start-up call site references the migration, and the old key names exist only
    /// in the migration folder.
    func testOnlyTheStartUpCallSiteReferencesTheMigrationFolder() throws {
        let iosRoot = URL(fileURLWithPath: #filePath).deletingLastPathComponent().deletingLastPathComponent()
        let enumerator = try XCTUnwrap(FileManager.default.enumerator(at: iosRoot, includingPropertiesForKeys: nil))
        var references: [String] = []
        var oldKeyUses: [String] = []
        for case let url as URL in enumerator where url.pathExtension == "swift" {
            let relative = String(url.path.dropFirst(iosRoot.path.count + 1))
            if relative.hasPrefix("AutoByteusMobileCoreTests/") || relative.hasPrefix("AutoByteusMobileCore/DataMigrations/") { continue }
            let source = try String(contentsOf: url, encoding: .utf8)
            if source.contains("SavedNodeEntryKeysMigration") { references.append(relative) }
            if source.contains("saved-node-profiles") || source.contains("selected-node-profile-id") { oldKeyUses.append(relative) }
        }
        XCTAssertEqual(["AutoByteusMobile/AppShellCoordinator.swift"], references)
        XCTAssertEqual([], oldKeyUses)
    }
}

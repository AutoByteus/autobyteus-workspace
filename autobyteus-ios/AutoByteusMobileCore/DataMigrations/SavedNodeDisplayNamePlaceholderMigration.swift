import Foundation

/// autobyteus-279 (SR-003/SR-004, CRR-002 F-1): the shipped app saved a node with no name of its own under the
/// placeholder name "AutoByteus Desktop" (its status check's default). Current code says "no known name" by storing the
/// node's host (`SavedNodeEntry.knownName`), so each saved entry whose `displayName` is exactly the placeholder gets its
/// host instead. Every other field, and every other name (a pairing link's), is kept as stored. The placeholder lives
/// only in this file.
///
/// Called once at app start, after `SavedNodeEntryKeysMigration` and before `SavedNodeStore` is created
/// (`AppShellCoordinator`). Writes, in this order: (1) the entries as they were, under `backupKey`; (2) the rewritten
/// entries; (3) the completion marker. A start that finds the backup without the marker restores the entries from it
/// and runs again, so an interruption after any step is covered; a start that finds the marker removes the backup.
public enum SavedNodeDisplayNamePlaceholderMigration {
    static let placeholder = "AutoByteus Desktop"
    static let entriesKey = "autobyteus.saved-node-entries"
    static let backupKey = "autobyteus.saved-node-entries:before-display-name-placeholder"
    static let markerKey = "autobyteus.migrations.saved-node-display-name-placeholder"
    static let done = "done"

    /// Uses the same UserDefaults suite as `SavedNodeStore(appGroupIdentifier:)`.
    public static func run(appGroupIdentifier: String?) {
        if let appGroupIdentifier, let suite = UserDefaults(suiteName: appGroupIdentifier) {
            run(userDefaults: suite)
        } else {
            run(userDefaults: .standard)
        }
    }

    public static func run(userDefaults: UserDefaults) {
        if userDefaults.string(forKey: markerKey) == done {
            userDefaults.removeObject(forKey: backupKey)
            return
        }
        if let backup = userDefaults.data(forKey: backupKey) {
            // An earlier start was interrupted before its marker: start again from the entries as they were.
            userDefaults.set(backup, forKey: entriesKey)
        }
        if let entries = userDefaults.data(forKey: entriesKey) {
            userDefaults.set(entries, forKey: backupKey)
            userDefaults.set(rewritten(entries), forKey: entriesKey)
        }
        userDefaults.set(done, forKey: markerKey)
    }

    /// The stored entries array with each placeholder name replaced by the entry's host; anything that does not read as
    /// an array of entries is returned unchanged.
    static func rewritten(_ data: Data) -> Data {
        guard var entries = (try? JSONSerialization.jsonObject(with: data)) as? [[String: Any]] else { return data }
        var changed = false
        for index in entries.indices where entries[index]["displayName"] as? String == placeholder {
            guard let host = entries[index]["host"] as? String, !host.isEmpty else { continue }
            entries[index]["displayName"] = host
            changed = true
        }
        guard changed, let result = try? JSONSerialization.data(withJSONObject: entries, options: [.sortedKeys]) else { return data }
        return result
    }
}

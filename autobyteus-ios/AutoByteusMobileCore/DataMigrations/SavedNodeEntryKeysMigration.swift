import Foundation

/// autobyteus-290 SM-9: the saved node entries' UserDefaults keys say "entry", not "profile" (`DESIGN.md` rule 10).
/// The stored values are copied unchanged. Called once at app start, before `SavedNodeStore` is created
/// (`AppShellCoordinator`); current code knows only the new keys. Old key names live only in this folder.
///
/// Per key, by structure: the old key present and the new one absent is converted (old value to `<old>:backup`,
/// the new key written, the old key removed). Both keys with the backup is a finished step whose old key is
/// removed. Both keys without the backup keeps the old key for recovery. The backup is removed at the next start
/// that finds only the new key.
public enum SavedNodeEntryKeysMigration {
    static let renamedKeys: [(source: String, target: String)] = [
        ("autobyteus.saved-node-profiles", "autobyteus.saved-node-entries"),
        ("autobyteus.selected-node-profile-id", "autobyteus.selected-node-entry-id"),
    ]

    /// Uses the same UserDefaults suite as `SavedNodeStore(appGroupIdentifier:)`.
    public static func run(appGroupIdentifier: String?) {
        if let appGroupIdentifier, let suite = UserDefaults(suiteName: appGroupIdentifier) {
            run(userDefaults: suite)
        } else {
            run(userDefaults: .standard)
        }
    }

    public static func run(userDefaults: UserDefaults) {
        for key in renamedKeys {
            migrate(source: key.source, target: key.target, in: userDefaults)
        }
    }

    private static func migrate(source: String, target: String, in userDefaults: UserDefaults) {
        let backup = "\(source):backup"
        let hasTarget = userDefaults.object(forKey: target) != nil
        let hasBackup = userDefaults.object(forKey: backup) != nil
        guard let value = userDefaults.object(forKey: source) else {
            if hasTarget && hasBackup { userDefaults.removeObject(forKey: backup) }
            return
        }
        if hasTarget {
            if hasBackup { userDefaults.removeObject(forKey: source) }
            return
        }
        userDefaults.set(value, forKey: backup)
        userDefaults.set(value, forKey: target)
        userDefaults.removeObject(forKey: source)
    }
}

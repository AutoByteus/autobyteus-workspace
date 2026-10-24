import Foundation

public final class SavedNodeStore {
    public static let appGroupIdentifier = "group.org.autobyteus.mobile"

    private let userDefaults: UserDefaults
    private let encoder = JSONEncoder()
    private let decoder = JSONDecoder()

    public init(userDefaults: UserDefaults = .standard) {
        self.userDefaults = userDefaults
    }

    public convenience init(appGroupIdentifier: String?) {
        if let appGroupIdentifier,
           let suite = UserDefaults(suiteName: appGroupIdentifier) {
            self.init(userDefaults: suite)
        } else {
            self.init(userDefaults: .standard)
        }
    }

    public func loadEntries() -> [SavedNodeEntry] {
        guard let data = userDefaults.data(forKey: Keys.entries) else { return [] }
        return (try? decoder.decode([SavedNodeEntry].self, from: data))?
            .sorted { $0.updatedAtEpochMilliseconds > $1.updatedAtEpochMilliseconds } ?? []
    }

    public func loadSelectedEntry() -> SavedNodeEntry? {
        let selectedID = userDefaults.string(forKey: Keys.selectedEntryID)
        let entries = loadEntries()
        return entries.first { $0.id == selectedID } ?? entries.first
    }

    @discardableResult
    public func saveEntry(_ entry: SavedNodeEntry) -> SavedNodeEntry {
        let existing = loadEntries()
        let merged = [entry] + existing.filter { $0.id != entry.id }
        persist(merged)
        userDefaults.set(entry.id, forKey: Keys.selectedEntryID)
        return entry
    }

    public func removeEntry(id entryID: String) {
        let remaining = loadEntries().filter { $0.id != entryID }
        persist(remaining)
        userDefaults.set(remaining.first?.id, forKey: Keys.selectedEntryID)
    }

    public func selectEntry(id entryID: String) {
        guard loadEntries().contains(where: { $0.id == entryID }) else { return }
        userDefaults.set(entryID, forKey: Keys.selectedEntryID)
    }

    public func clear() {
        userDefaults.removeObject(forKey: Keys.entries)
        userDefaults.removeObject(forKey: Keys.selectedEntryID)
    }

    private func persist(_ entries: [SavedNodeEntry]) {
        guard let data = try? encoder.encode(entries) else { return }
        userDefaults.set(data, forKey: Keys.entries)
    }

    private enum Keys {
        static let entries = "autobyteus.saved-node-entries"
        static let selectedEntryID = "autobyteus.selected-node-entry-id"
    }
}

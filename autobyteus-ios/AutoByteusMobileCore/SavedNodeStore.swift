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

    public func loadProfiles() -> [SavedNodeProfile] {
        guard let data = userDefaults.data(forKey: Keys.profiles) else { return [] }
        return (try? decoder.decode([SavedNodeProfile].self, from: data))?
            .sorted { $0.updatedAtEpochMilliseconds > $1.updatedAtEpochMilliseconds } ?? []
    }

    public func loadSelectedProfile() -> SavedNodeProfile? {
        let selectedID = userDefaults.string(forKey: Keys.selectedProfileID)
        let profiles = loadProfiles()
        return profiles.first { $0.id == selectedID } ?? profiles.first
    }

    @discardableResult
    public func saveProfile(_ profile: SavedNodeProfile) -> SavedNodeProfile {
        let existing = loadProfiles()
        let merged = [profile] + existing.filter { $0.id != profile.id }
        persist(merged)
        userDefaults.set(profile.id, forKey: Keys.selectedProfileID)
        return profile
    }

    public func removeProfile(id profileID: String) {
        let remaining = loadProfiles().filter { $0.id != profileID }
        persist(remaining)
        userDefaults.set(remaining.first?.id, forKey: Keys.selectedProfileID)
    }

    public func selectProfile(id profileID: String) {
        guard loadProfiles().contains(where: { $0.id == profileID }) else { return }
        userDefaults.set(profileID, forKey: Keys.selectedProfileID)
    }

    public func clear() {
        userDefaults.removeObject(forKey: Keys.profiles)
        userDefaults.removeObject(forKey: Keys.selectedProfileID)
    }

    private func persist(_ profiles: [SavedNodeProfile]) {
        guard let data = try? encoder.encode(profiles) else { return }
        userDefaults.set(data, forKey: Keys.profiles)
    }

    private enum Keys {
        static let profiles = "autobyteus.saved-node-profiles"
        static let selectedProfileID = "autobyteus.selected-node-profile-id"
    }
}

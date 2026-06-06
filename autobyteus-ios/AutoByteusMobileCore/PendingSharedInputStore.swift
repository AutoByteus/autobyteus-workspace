import Foundation

public struct PendingSharedInput: Codable, Equatable {
    public let rawText: String
    public let source: String
    public let createdAtEpochMilliseconds: Int64

    public init(
        rawText: String,
        source: String,
        createdAtEpochMilliseconds: Int64 = currentEpochMilliseconds()
    ) {
        self.rawText = rawText
        self.source = source
        self.createdAtEpochMilliseconds = createdAtEpochMilliseconds
    }
}

public final class PendingSharedInputStore {
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

    public func store(_ input: PendingSharedInput) {
        guard let data = try? encoder.encode(input) else { return }
        userDefaults.set(data, forKey: Keys.pendingInput)
    }

    public func peek() -> PendingSharedInput? {
        guard let data = userDefaults.data(forKey: Keys.pendingInput) else { return nil }
        return try? decoder.decode(PendingSharedInput.self, from: data)
    }

    public func consume() -> PendingSharedInput? {
        let input = peek()
        userDefaults.removeObject(forKey: Keys.pendingInput)
        return input
    }

    public func clear() {
        userDefaults.removeObject(forKey: Keys.pendingInput)
    }

    private enum Keys {
        static let pendingInput = "autobyteus.pending-shared-input"
    }
}

import Foundation

/// How a connection started (Android's entry-form table).
public enum EntryForm: Equatable {
    case scan
    case paste
    case shared
}

/// The saved entries the flow writes: a node is saved only once it is known to work.
public protocol NodeEntries: AnyObject {
    @discardableResult func saveEntry(_ entry: SavedNodeEntry) -> SavedNodeEntry
    func selectEntry(id entryID: String)
}

extension SavedNodeStore: NodeEntries {}

/// The app's screens, as the flow drives them.
@MainActor
public protocol NodeConnectionScreens: AnyObject {
    func showConnecting(nodeName: String)
    func showCantReach(nodeName: String, reason: CantReachReason)
    func showTypeAddress(prefill: String)
    func openPage(entry: SavedNodeEntry, url: String, pairing: Bool)
}

/// The connect sequence, as Android's `NodeConnectionFlow` (autobyteus-279 REQ-001): parse, check the address answers,
/// open the node's page. A pairing link's entry is saved under its QR name only when the page reports a successful
/// pairing, so a failed code leaves nothing behind; a typed address is saved when it answers. Saved entries (app start, a
/// row) skip parsing and saving. If nothing answers, it says why in plain words.
@MainActor
public final class NodeConnectionFlow {
    public typealias StatusCheck = (SavedNodeEntry) async -> ConnectionValidationResult

    private enum Save { case onPaired, onReachable, alreadySaved }
    private struct Attempt { let entry: SavedNodeEntry; let url: String; let save: Save }

    private let entries: NodeEntries
    private let statusCheck: StatusCheck
    private let resolver: ConnectionInputResolver
    private let clock: () -> Int64
    public weak var screens: NodeConnectionScreens?

    private var attempt: Attempt?
    /// The pairing link whose page is open; its entry is saved when the page reports paired.
    private var pendingPairing: Attempt?
    /// The saved entry whose page is open (a saved node, or a typed address that answered); `nil` for a pairing link.
    private var openEntry: SavedNodeEntry?
    private var generation = 0

    public init(
        entries: NodeEntries,
        statusCheck: @escaping StatusCheck,
        resolver: ConnectionInputResolver = ConnectionInputResolver(),
        clock: @escaping () -> Int64 = { currentEpochMilliseconds() }
    ) {
        self.entries = entries
        self.statusCheck = statusCheck
        self.resolver = resolver
        self.clock = clock
    }

    /// A scanned, pasted or shared text: a pairing link connects at once; a scan of anything else is not an AutoByteus
    /// code; pasted or shared text opens Type an address with it.
    public func connect(_ text: String, form: EntryForm) {
        guard let resolution = resolver.resolvePairingLink(text) else {
            if form == .scan {
                screens?.showCantReach(nodeName: "", reason: .notAnAutoByteusCode)
            } else {
                screens?.showTypeAddress(prefill: text.trimmingCharacters(in: .whitespacesAndNewlines))
            }
            return
        }
        run(Attempt(entry: resolution.entry, url: resolution.webViewURL, save: .onPaired))
    }

    /// "Type an address": a plain address, saved when it answers; plain `http://` needs the sheet's tick.
    public func connectTyped(_ address: String, httpAcknowledged: Bool) {
        switch resolver.resolveTypedAddress(address, httpAcknowledged: httpAcknowledged) {
        case .success(let entry, let webViewURL):
            run(Attempt(entry: entry, url: webViewURL, save: .onReachable))
        case .failure(let diagnostic):
            screens?.showCantReach(nodeName: "", reason: CantReachReason.reason(for: diagnostic))
        }
    }

    /// A saved node: the last used one at app start, or a row tap.
    public func open(_ entry: SavedNodeEntry, pageURL: String? = nil) {
        run(Attempt(entry: entry, url: pageURL ?? entry.mobileURL, save: .alreadySaved))
    }

    public func retry() {
        if let attempt { run(attempt) }
    }

    /// What the open page's Retry loads: while `entry`'s pairing link has not reported "paired", the pairing link again;
    /// after pairing, or for a saved node, the node's page. The pairing link is held here only, never saved.
    public func retryURL(for entry: SavedNodeEntry) -> String {
        if let pendingPairing, pendingPairing.entry.id == entry.id { return pendingPairing.url }
        return entry.mobileURL
    }

    /// Cancel on the Connecting screen: a late answer is dropped.
    public func cancel() {
        generation += 1
        attempt = nil
    }

    /// The page reports the code was exchanged (bridge `paired`): a pairing link's node is saved under its QR name; an
    /// open saved node with no name takes the page's name. A named node is never renamed by its page.
    public func onPaired(pageNodeName: String) {
        let pending = pendingPairing?.entry
        pendingPairing = nil
        guard let entry = pending ?? openEntry.flatMap({ $0.knownName == nil ? $0 : nil }) else { return }
        let pageName = pageNodeName.trimmingCharacters(in: .whitespacesAndNewlines)
        let takesPageName = entry.knownName == nil && !pageName.isEmpty
        if pending == nil && !takesPageName { return }
        let saved = entries.saveEntry(entry.updating(displayName: takesPageName ? pageName : nil, nowEpochMilliseconds: clock()))
        openEntry = saved
    }

    /// The page with a pairing link was left without pairing (back to the list, Scan again).
    public func abandonPendingPairing() {
        pendingPairing = nil
    }

    private func run(_ next: Attempt) {
        attempt = next
        generation += 1
        let current = generation
        screens?.showConnecting(nodeName: next.entry.shownName)
        Task { [weak self, statusCheck] in
            let result = await statusCheck(next.entry)
            await MainActor.run {
                guard let self, current == self.generation else { return }
                switch result {
                case .reachable:
                    self.opened(next)
                case .failed(let diagnostic):
                    self.screens?.showCantReach(nodeName: next.entry.shownName, reason: CantReachReason.reason(for: diagnostic))
                }
            }
        }
    }

    private func opened(_ reached: Attempt) {
        switch reached.save {
        case .onPaired:
            pendingPairing = reached
            openEntry = nil
        case .onReachable:
            openEntry = entries.saveEntry(reached.entry.updating(nowEpochMilliseconds: clock()))
        case .alreadySaved:
            pendingPairing = nil
            entries.selectEntry(id: reached.entry.id)
            openEntry = reached.entry
        }
        screens?.openPage(entry: reached.entry, url: reached.url, pairing: reached.save == .onPaired)
    }
}

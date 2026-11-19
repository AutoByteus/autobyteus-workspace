import XCTest
import AutoByteusMobileCore

/// The connect sequence (autobyteus-279 REQ-001, as Android's `NodeConnectionFlowTest`): what is shown, and what is saved
/// when.
@MainActor
final class NodeConnectionFlowTests: XCTestCase {
    private final class Entries: NodeEntries {
        var saved: [SavedNodeEntry] = []
        var selected: [String] = []
        func saveEntry(_ entry: SavedNodeEntry) -> SavedNodeEntry { saved.append(entry); return entry }
        func selectEntry(id entryID: String) { selected.append(entryID) }
    }

    private final class Screens: NodeConnectionScreens {
        var events: [String] = []
        var opened: [(entry: SavedNodeEntry, url: String, pairing: Bool)] = []
        let done: XCTestExpectation?
        init(done: XCTestExpectation? = nil) { self.done = done }
        func showConnecting(nodeName: String) { events.append("connecting \(nodeName)") }
        func showCantReach(nodeName: String, reason: CantReachReason) { events.append("cantReach \(nodeName) \(reason.rawValue)"); done?.fulfill() }
        func showTypeAddress(prefill: String) { events.append("typeAddress \(prefill)"); done?.fulfill() }
        func openPage(entry: SavedNodeEntry, url: String, pairing: Bool) {
            events.append("open \(entry.displayName) pairing=\(pairing)")
            opened.append((entry, url, pairing))
            done?.fulfill()
        }
    }

    private let pairingJSON = #"{"version":1,"serverBaseUrl":"https://desk.tailnet.ts.net","pairingCode":"abc","expiresAt":"2026-05-21T00:00:00.000Z","serverName":"Desk"}"#
    private let status = RemoteAccessStatus(phoneAccessEnabled: true, pairingAvailable: true, nodeID: "n")

    /// The flow under test; each test keeps it (the app's coordinator keeps its flow; a dropped flow's answers are dropped).
    private func flow(_ entries: Entries, _ screens: Screens, answers: ConnectionValidationResult? = nil) -> NodeConnectionFlow {
        let flow = NodeConnectionFlow(entries: entries, statusCheck: { [status] entry in answers ?? .reachable(entry: entry, status: status) }, clock: { 42 })
        flow.screens = screens
        return flow
    }

    func testAPairingLinkConnectsAndIsSavedOnlyWhenThePagePairs() async {
        let entries = Entries()
        let screens = Screens(done: expectation(description: "opened"))
        let flow = flow(entries, screens)
        flow.connect(pairingJSON, form: .scan)
        await fulfillment(of: [screens.done!], timeout: 5)
        XCTAssertEqual(["connecting Desk", "open Desk pairing=true"], screens.events)
        XCTAssertTrue(entries.saved.isEmpty, "nothing is saved before the page pairs")
        XCTAssertTrue(screens.opened[0].url.contains("pairing="))
        XCTAssertEqual(flow.retryURL(for: screens.opened[0].entry), screens.opened[0].url, "Retry loads the pairing link until paired")
        flow.onPaired(pageNodeName: "Ignored")
        XCTAssertEqual(["Desk"], entries.saved.map(\.displayName), "saved under its QR name")
        XCTAssertEqual(screens.opened[0].entry.mobileURL, flow.retryURL(for: screens.opened[0].entry))
    }

    func testAScanOfAnythingElseIsNotAnAutoByteusCode() async {
        let screens = Screens()
        flow(Entries(), screens).connect("https://example.com", form: .scan)
        XCTAssertEqual(["cantReach  notAnAutoByteusCode"], screens.events)
    }

    func testPastedOrSharedTextOpensTypeAnAddress() {
        let screens = Screens()
        flow(Entries(), screens).connect("  my-computer.local  ", form: .shared)
        XCTAssertEqual(["typeAddress my-computer.local"], screens.events)
    }

    func testATypedAddressIsSavedWhenItAnswers() async {
        let entries = Entries()
        let screens = Screens(done: expectation(description: "opened"))
        let flow = flow(entries, screens)
        flow.connectTyped("desk.tailnet.ts.net", httpAcknowledged: false)
        await fulfillment(of: [screens.done!], timeout: 5)
        XCTAssertEqual(["desk.tailnet.ts.net"], entries.saved.map(\.host))
        XCTAssertEqual(false, screens.opened.first?.pairing)
    }

    func testAnAddressThatDoesNotAnswerSaysWhyAndSavesNothing() async {
        let entries = Entries()
        let screens = Screens(done: expectation(description: "cant reach"))
        let flow = flow(entries, screens, answers: .failed(ConnectionDiagnosticMapper.fromError(URLError(.cannotConnectToHost))))
        flow.connectTyped("desk.tailnet.ts.net", httpAcknowledged: false)
        await fulfillment(of: [screens.done!], timeout: 5)
        XCTAssertEqual(["connecting AutoByteus node", "cantReach AutoByteus node noSharedNetwork"], screens.events, "a node with no name is never shown by its address")
        XCTAssertTrue(entries.saved.isEmpty)
    }

    func testASavedNodeOpensAndIsSelected() async throws {
        let entries = Entries()
        let screens = Screens(done: expectation(description: "opened"))
        let saved = SavedNodeEntry.fromNormalized(try NodeURLNormalizer.normalize("https://office.tailnet.ts.net"), displayName: "Office")
        let flow = flow(entries, screens)
        flow.open(saved)
        await fulfillment(of: [screens.done!], timeout: 5)
        XCTAssertEqual([saved.id], entries.selected)
        XCTAssertTrue(entries.saved.isEmpty)
    }

    /// A saved node with no known name (a typed address, or an entry the placeholder migration gave its host) takes the
    /// page's name when the page pairs, as on Android; the host compares without case (SR-004).
    func testAnUnnamedSavedNodeTakesThePagesNameWhenItPairs() async throws {
        let entries = Entries()
        let screens = Screens(done: expectation(description: "opened"))
        let migrated = SavedNodeEntry.fromNormalized(try NodeURLNormalizer.normalize("https://office.tailnet.ts.net"), displayName: "Office.Tailnet.TS.net")
        let flow = flow(entries, screens)
        flow.open(migrated)
        await fulfillment(of: [screens.done!], timeout: 5)
        XCTAssertEqual(["connecting AutoByteus node", "open Office.Tailnet.TS.net pairing=false"], screens.events)
        flow.onPaired(pageNodeName: " Test Node 279 ")
        XCTAssertEqual(["Test Node 279"], entries.saved.map(\.displayName))
    }

    func testANamedSavedNodeKeepsItsNameWhenItPairs() async throws {
        let entries = Entries()
        let screens = Screens(done: expectation(description: "opened"))
        let named = SavedNodeEntry.fromNormalized(try NodeURLNormalizer.normalize("https://office.tailnet.ts.net"), displayName: "Office")
        let flow = flow(entries, screens)
        flow.open(named)
        await fulfillment(of: [screens.done!], timeout: 5)
        flow.onPaired(pageNodeName: "Something Else")
        XCTAssertTrue(entries.saved.isEmpty, "a named node is never renamed by its page")
    }

    func testCancelDropsALateAnswer() async {
        let screens = Screens()
        let flow = flow(Entries(), screens)
        flow.connectTyped("desk.tailnet.ts.net", httpAcknowledged: false)
        flow.cancel()
        try? await Task.sleep(nanoseconds: 300_000_000)
        XCTAssertEqual(["connecting AutoByteus node"], screens.events)
    }
}

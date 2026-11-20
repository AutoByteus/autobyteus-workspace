import XCTest
import AutoByteusMobileCore

/// One name rule, as on Android (autobyteus-279 SR-004): `knownName` is the node's name from its QR or its pairing, and
/// `shownName`, what the native screens show, is never an address.
final class SavedNodeEntryNamesTests: XCTestCase {
    private func entry(_ address: String, name: String? = nil) throws -> SavedNodeEntry {
        SavedNodeEntry.fromNormalized(try NodeURLNormalizer.normalize(address), displayName: name)
    }

    func testANamedNodeIsShownByItsName() throws {
        let named = try entry("https://desk.tailnet.ts.net", name: "  Test Node 279 ")
        XCTAssertEqual("Test Node 279", named.knownName)
        XCTAssertEqual("Test Node 279", named.shownName)
    }

    func testAnAddressIsNeverShown() throws {
        let addresses = [
            "https://desk.tailnet.ts.net", "http://192.168.1.20:29695", "http://my-computer.local:29695",
            "https://Desk.Tailnet.TS.net/mobile", "http://100.101.102.103:29695",
        ]
        for address in addresses {
            let typed = try entry(address)
            XCTAssertNil(typed.knownName, address)
            XCTAssertEqual("AutoByteus node", typed.shownName, address)
            XCTAssertFalse(typed.shownName.localizedCaseInsensitiveContains(typed.host), address)
        }
    }

    func testANameThatIsTheHostIsNoName() throws {
        let typed = try entry("https://desk.tailnet.ts.net")
        for stored in ["desk.tailnet.ts.net", "DESK.tailnet.ts.net", " desk.tailnet.ts.net ", "", "   "] {
            let entry = SavedNodeEntry(
                id: typed.id, displayName: stored, baseURL: typed.baseURL, mobileURL: typed.mobileURL, scheme: typed.scheme,
                host: typed.host, port: typed.port, httpAcknowledged: true, createdAtEpochMilliseconds: 1, updatedAtEpochMilliseconds: 1
            )
            XCTAssertNil(entry.knownName, "'\(stored)'")
            XCTAssertEqual(SavedNodeEntry.unnamedNodeName, entry.shownName, "'\(stored)'")
        }
    }
}

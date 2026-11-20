import XCTest
import AutoByteusMobileCore

/// Shared or kept text (autobyteus-279 REQ-002, REQ-007): the demo link opens the demo, a pairing link connects, other
/// text becomes an address to check, nothing usable does nothing; each with the share sheet's exact message.
final class SharedTextActionTests: XCTestCase {
    private let pairingJSON = #"{"version":1,"serverBaseUrl":"https://desk.tailnet.ts.net","pairingCode":"abc","expiresAt":"2026-05-21T00:00:00.000Z","serverName":"Desk"}"#

    func testTheDemoLink() {
        XCTAssertEqual(.openDemo, SharedTextAction.classify(" autobyteus://demo \n"))
        XCTAssertEqual(.openDemo, SharedTextAction.classify("AUTOBYTEUS://DEMO/"))
        XCTAssertTrue(DemoLink.matches("autobyteus://demo"))
        XCTAssertFalse(DemoLink.matches("autobyteus://demo-node"))
        XCTAssertEqual("Saved. Open AutoByteus to see the demo.", SharedTextAction.openDemo.shareMessage)
    }

    func testAPairingLink() {
        XCTAssertEqual(.connect(pairingLink: pairingJSON), SharedTextAction.classify(pairingJSON))
        XCTAssertEqual("Saved. Open AutoByteus to connect.", SharedTextAction.classify(pairingJSON).shareMessage)
    }

    func testOtherText() {
        XCTAssertEqual(.typeAddress(prefill: "my-computer.local"), SharedTextAction.classify("  my-computer.local "))
        XCTAssertEqual("Saved. Open AutoByteus to use it as an address.", SharedTextAction.typeAddress(prefill: "x").shareMessage)
    }

    func testNothingUsable() {
        XCTAssertEqual(.nothing, SharedTextAction.classify(" \n "))
        XCTAssertEqual("AutoByteus couldn’t read text or a link from this share.", SharedTextAction.nothing.shareMessage)
    }
}

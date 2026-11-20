import XCTest
import AutoByteusMobileCore

/// The two ways in (autobyteus-279 REQ-001, as Android): a pairing link carries the desktop's decision; a typed plain
/// `http://` address needs the sheet's tick.
final class ConnectionInputResolverTests: XCTestCase {
    private let resolver = ConnectionInputResolver()
    private let pairingJSON = #"{"version":1,"serverBaseUrl":"http://desktop.local:29695","pairingCode":"abc","expiresAt":"2026-05-21T00:00:00.000Z","serverName":"Home Desktop"}"#

    func testTypedHTTPNeedsTheTick() {
        guard case .failure(let diagnostic) = resolver.resolveTypedAddress("http://192.168.1.25:29695/mobile", httpAcknowledged: false) else {
            return XCTFail("Expected failure")
        }
        XCTAssertEqual(.httpNeedsAcknowledgement, diagnostic.kind)
    }

    func testTypedHTTPWithTheTickConnects() {
        guard case .success(let entry, let webViewURL) = resolver.resolveTypedAddress("http://192.168.1.25:29695/mobile", httpAcknowledged: true) else {
            return XCTFail("Expected success")
        }
        XCTAssertEqual("http://192.168.1.25:29695/mobile", webViewURL)
        XCTAssertTrue(entry.httpAcknowledged)
    }

    func testTypedHTTPSNeedsNoTick() {
        guard case .success(let entry, _) = resolver.resolveTypedAddress("desktop.tailnet.ts.net/mobile", httpAcknowledged: false) else {
            return XCTFail("Expected success")
        }
        XCTAssertFalse(entry.isHTTP)
    }

    func testAPairingLinkIsAcknowledgedByTheDesktop() throws {
        let resolved = try XCTUnwrap(resolver.resolvePairingLink(pairingJSON))
        XCTAssertTrue(resolved.entry.isHTTP)
        XCTAssertTrue(resolved.entry.httpAcknowledged)
        XCTAssertEqual("Home Desktop", resolved.entry.displayName)
    }

    func testAPlainAddressIsNotAPairingLink() {
        XCTAssertNil(resolver.resolvePairingLink("https://desktop.tailnet.ts.net/mobile"))
        XCTAssertNil(resolver.resolvePairingLink("not a link"))
    }
}

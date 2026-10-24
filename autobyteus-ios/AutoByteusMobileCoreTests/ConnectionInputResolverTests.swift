import XCTest
import AutoByteusMobileCore

final class ConnectionInputResolverTests: XCTestCase {
    private let resolver = ConnectionInputResolver()

    func testRequiresExplicitAcknowledgementForHTTP() {
        let result = resolver.resolve(rawText: "http://192.168.1.25:29695/mobile", httpAcknowledged: false)
        guard case .failure(let diagnostic) = result else { return XCTFail("Expected failure") }
        XCTAssertEqual(.httpNeedsAcknowledgement, diagnostic.kind)
    }

    func testAllowsHTTPAfterAcknowledgement() {
        let result = resolver.resolve(rawText: "http://192.168.1.25:29695/mobile", httpAcknowledged: true)
        guard case .success(let entry, let webViewURL) = result else { return XCTFail("Expected success") }
        XCTAssertEqual("http://192.168.1.25:29695/mobile", webViewURL)
        XCTAssertTrue(entry.httpAcknowledged)
    }

    func testAllowsHTTPSWithoutAcknowledgement() {
        let result = resolver.resolve(rawText: "desktop.tailnet.ts.net/mobile", httpAcknowledged: false)
        guard case .success(let entry, _) = result else { return XCTFail("Expected success") }
        XCTAssertFalse(entry.isHTTP)
        XCTAssertTrue(entry.httpAcknowledged)
    }
}

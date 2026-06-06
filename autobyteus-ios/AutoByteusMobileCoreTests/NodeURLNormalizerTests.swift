import XCTest
import AutoByteusMobileCore

final class NodeURLNormalizerTests: XCTestCase {
    func testNormalizesTailscaleMobileURLToCleanStableURLs() throws {
        let normalized = try NodeURLNormalizer.normalize("https://Desktop.Example.ts.net/mobile?pairing=one-time")
        XCTAssertEqual("https", normalized.scheme)
        XCTAssertEqual("desktop.example.ts.net", normalized.host)
        XCTAssertEqual("https://desktop.example.ts.net", normalized.baseURL)
        XCTAssertEqual("https://desktop.example.ts.net/mobile", normalized.mobileURL)
        XCTAssertEqual("https://desktop.example.ts.net/rest/remote-access/status", normalized.statusURL)
    }

    func testDefaultsBareHostToHTTPS() throws {
        let normalized = try NodeURLNormalizer.normalize("desktop.tailnet-name.ts.net/mobile")
        XCTAssertEqual("https://desktop.tailnet-name.ts.net", normalized.baseURL)
        XCTAssertEqual("https://desktop.tailnet-name.ts.net/mobile", normalized.mobileURL)
    }

    func testPreservesPrivateHTTPPort() throws {
        let normalized = try NodeURLNormalizer.normalize("http://192.168.1.25:29695/rest/remote-access/status")
        XCTAssertEqual("http", normalized.scheme)
        XCTAssertEqual(29695, normalized.port)
        XCTAssertEqual("http://192.168.1.25:29695/mobile", normalized.mobileURL)
    }

    func testRejectsUnknownSchemesAndDesktopPaths() {
        XCTAssertThrowsError(try NodeURLNormalizer.normalize("ftp://desktop.tailnet-name.ts.net/mobile"))
        XCTAssertThrowsError(try NodeURLNormalizer.normalize("https://desktop.tailnet-name.ts.net/workspace"))
    }
}

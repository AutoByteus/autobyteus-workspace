import XCTest
import AutoByteusMobileCore

final class TrustedNavigationPolicyTests: XCTestCase {
    private lazy var entry: SavedNodeEntry = {
        try! SavedNodeEntry.fromNormalized(NodeURLNormalizer.normalize("https://desktop.tailnet-name.ts.net/mobile"))
    }()

    func testAllowsExpectedSameOriginAutoByteusPaths() {
        XCTAssertEqual(.allowInWebView, TrustedNavigationPolicy.classify(targetURL: "https://desktop.tailnet-name.ts.net/mobile?pairing=abc", entry: entry).type)
        XCTAssertEqual(.allowInWebView, TrustedNavigationPolicy.classify(targetURL: "https://desktop.tailnet-name.ts.net/rest/remote-access/status", entry: entry).type)
        XCTAssertEqual(.allowInWebView, TrustedNavigationPolicy.classify(targetURL: "https://desktop.tailnet-name.ts.net/graphql", entry: entry).type)
        XCTAssertEqual(.allowInWebView, TrustedNavigationPolicy.classify(targetURL: "https://desktop.tailnet-name.ts.net/_nuxt/app.js", entry: entry).type)
        XCTAssertEqual(.allowInWebView, TrustedNavigationPolicy.classify(targetURL: "https://desktop.tailnet-name.ts.net/mobile.webmanifest", entry: entry).type)
    }

    func testExternalizesDifferentOriginsAndSafeNonWebSchemes() {
        XCTAssertEqual(.openExternal, TrustedNavigationPolicy.classify(targetURL: "https://desktop.tailnet-name.ts.net.evil.example/mobile", entry: entry).type)
        XCTAssertEqual(.openExternal, TrustedNavigationPolicy.classify(targetURL: "https://example.org/mobile", entry: entry).type)
        XCTAssertEqual(.openExternal, TrustedNavigationPolicy.classify(targetURL: "mailto:support@example.org", entry: entry).type)
        XCTAssertEqual(.openExternal, TrustedNavigationPolicy.classify(targetURL: "tel:+15551234567", entry: entry).type)
    }

    func testBlocksUnsafeSchemesAndSameOriginDesktopPaths() {
        XCTAssertEqual(.block, TrustedNavigationPolicy.classify(targetURL: "javascript:alert(1)", entry: entry).type)
        XCTAssertEqual(.block, TrustedNavigationPolicy.classify(targetURL: "https://desktop.tailnet-name.ts.net/workspace", entry: entry).type)
        XCTAssertEqual(.block, TrustedNavigationPolicy.classify(targetURL: "https://desktop.tailnet-name.ts.net/admin", entry: entry).type)
    }
}

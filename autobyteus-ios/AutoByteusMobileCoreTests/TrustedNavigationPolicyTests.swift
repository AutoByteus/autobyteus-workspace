import XCTest
import AutoByteusMobileCore

final class TrustedNavigationPolicyTests: XCTestCase {
    private lazy var profile: SavedNodeProfile = {
        try! SavedNodeProfile.fromNormalized(NodeURLNormalizer.normalize("https://desktop.tailnet-name.ts.net/mobile"))
    }()

    func testAllowsExpectedSameOriginAutoByteusPaths() {
        XCTAssertEqual(.allowInWebView, TrustedNavigationPolicy.classify(targetURL: "https://desktop.tailnet-name.ts.net/mobile?pairing=abc", profile: profile).type)
        XCTAssertEqual(.allowInWebView, TrustedNavigationPolicy.classify(targetURL: "https://desktop.tailnet-name.ts.net/rest/remote-access/status", profile: profile).type)
        XCTAssertEqual(.allowInWebView, TrustedNavigationPolicy.classify(targetURL: "https://desktop.tailnet-name.ts.net/graphql", profile: profile).type)
        XCTAssertEqual(.allowInWebView, TrustedNavigationPolicy.classify(targetURL: "https://desktop.tailnet-name.ts.net/_nuxt/app.js", profile: profile).type)
        XCTAssertEqual(.allowInWebView, TrustedNavigationPolicy.classify(targetURL: "https://desktop.tailnet-name.ts.net/mobile.webmanifest", profile: profile).type)
    }

    func testExternalizesDifferentOriginsAndSafeNonWebSchemes() {
        XCTAssertEqual(.openExternal, TrustedNavigationPolicy.classify(targetURL: "https://desktop.tailnet-name.ts.net.evil.example/mobile", profile: profile).type)
        XCTAssertEqual(.openExternal, TrustedNavigationPolicy.classify(targetURL: "https://example.org/mobile", profile: profile).type)
        XCTAssertEqual(.openExternal, TrustedNavigationPolicy.classify(targetURL: "mailto:support@example.org", profile: profile).type)
        XCTAssertEqual(.openExternal, TrustedNavigationPolicy.classify(targetURL: "tel:+15551234567", profile: profile).type)
    }

    func testBlocksUnsafeSchemesAndSameOriginDesktopPaths() {
        XCTAssertEqual(.block, TrustedNavigationPolicy.classify(targetURL: "javascript:alert(1)", profile: profile).type)
        XCTAssertEqual(.block, TrustedNavigationPolicy.classify(targetURL: "https://desktop.tailnet-name.ts.net/workspace", profile: profile).type)
        XCTAssertEqual(.block, TrustedNavigationPolicy.classify(targetURL: "https://desktop.tailnet-name.ts.net/admin", profile: profile).type)
    }
}

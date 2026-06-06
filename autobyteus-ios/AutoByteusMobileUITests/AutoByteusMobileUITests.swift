import XCTest

final class AutoByteusMobileUITests: XCTestCase {
    private let fakeMobileMarker = "AUTOBYTEUS_FAKE_MOBILE_READY"

    func testFakeNodeOpensAndRestoresWithFakeMobileMarker() throws {
        let nodeURL = try requiredFakeNodeURL()
        let app = XCUIApplication()
        app.launchEnvironment["AUTOBYTEUS_RESET_SAVED_NODES"] = "1"
        app.launch()
        connect(app: app, nodeURL: nodeURL)
        assertFakeMobileLoaded(in: app, attachmentName: "fake-mobile-opened")

        app.terminate()
        let restored = XCUIApplication()
        restored.launch()
        assertFakeMobileLoaded(in: restored, attachmentName: "fake-mobile-restored")
    }

    func testUnreachableNodeShowsNativeDiagnosticWhenSmokeEnvironmentIsPresent() throws {
        _ = try requiredFakeNodeURL()
        let app = XCUIApplication()
        app.launchEnvironment["AUTOBYTEUS_RESET_SAVED_NODES"] = "1"
        app.launch()
        connect(app: app, nodeURL: "http://127.0.0.1:9/mobile")
        let diagnostic = app.staticTexts.containing(NSPredicate(format: "label CONTAINS[c] %@", "unreachable")).firstMatch
        XCTAssertTrue(diagnostic.waitForExistence(timeout: 15), "Expected native unreachable diagnostic")
        attachScreenshot(from: app, name: "native-unreachable-diagnostic")
    }

    private func requiredFakeNodeURL() throws -> String {
        if let url = configuredValue(for: "AUTOBYTEUS_TEST_NODE_URL"), !url.isEmpty {
            return url
        }
        let message = "Set AUTOBYTEUS_TEST_NODE_URL through the UI test Info.plist build setting to run simulator smoke UI tests."
        if smokeTestsRequired {
            XCTFail(message)
            throw SmokeConfigurationError.missingFakeNodeURL
        }
        throw XCTSkip(message)
    }

    private var smokeTestsRequired: Bool {
        configuredValue(for: "AUTOBYTEUS_SMOKE_TESTS_REQUIRED") == "1"
    }

    private func configuredValue(for key: String) -> String? {
        let value = Bundle(for: Self.self).object(forInfoDictionaryKey: key) as? String
        let trimmed = value?.trimmingCharacters(in: .whitespacesAndNewlines)
        guard let trimmed, !trimmed.isEmpty, !trimmed.hasPrefix("$(") else { return nil }
        return trimmed
    }

    private func connect(app: XCUIApplication, nodeURL: String) {
        let input = app.textViews["connection.input"]
        XCTAssertTrue(input.waitForExistence(timeout: 10), "Connection input should be visible")
        input.tap()
        input.typeText(nodeURL)
        if nodeURL.lowercased().hasPrefix("http://") {
            app.switches["connection.httpAcknowledgement"].tap()
        }
        app.buttons["connection.connect"].tap()
    }

    private func assertFakeMobileLoaded(in app: XCUIApplication, attachmentName: String) {
        XCTAssertTrue(app.webViews.firstMatch.waitForExistence(timeout: 20), "Expected WebView to exist")
        let marker = app.webViews.staticTexts[fakeMobileMarker]
        XCTAssertTrue(marker.waitForExistence(timeout: 20), "Expected fake /mobile marker to be visible in WKWebView")
        attachScreenshot(from: app, name: attachmentName)
    }

    private func attachScreenshot(from app: XCUIApplication, name: String) {
        let attachment = XCTAttachment(screenshot: app.screenshot())
        attachment.name = name
        attachment.lifetime = .keepAlways
        add(attachment)
    }

    private enum SmokeConfigurationError: Error {
        case missingFakeNodeURL
    }
}

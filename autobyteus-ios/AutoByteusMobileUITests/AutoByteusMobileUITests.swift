import XCTest

/// Simulator smoke tests against the fake AutoByteus node. GitHub-hosted simulators are intermittently
/// very slow, so every step waits for readiness with a generous upper bound and continues as soon as
/// the UI is ready; there are no fixed sleeps.
final class AutoByteusMobileUITests: XCTestCase {
    private let fakeMobileMarker = "AUTOBYTEUS_FAKE_MOBILE_READY"
    /// Debug-only app override of the 5 s production connection-check timeout (AppShellCoordinator).
    private let connectionTimeoutSeconds: TimeInterval = 60
    private let uiReadyTimeout: TimeInterval = 30
    private let pageLoadTimeout: TimeInterval = 60

    func testFakeNodeOpensAndRestoresWithFakeMobileMarker() throws {
        let nodeURL = try requiredFakeNodeURL()
        let app = launchApp(resetSavedNodes: true)
        connect(app: app, nodeURL: nodeURL)
        assertFakeMobileLoaded(in: app, attachmentName: "fake-mobile-opened")

        app.terminate()
        let restored = launchApp(resetSavedNodes: false)
        assertFakeMobileLoaded(in: restored, attachmentName: "fake-mobile-restored")
    }

    func testUnreachableNodeShowsNativeDiagnosticWhenSmokeEnvironmentIsPresent() throws {
        _ = try requiredFakeNodeURL()
        let app = launchApp(resetSavedNodes: true)
        connect(app: app, nodeURL: "http://127.0.0.1:9/mobile")
        let diagnostic = app.staticTexts.containing(NSPredicate(format: "label CONTAINS[c] %@", "unreachable")).firstMatch
        // A refused port fails at once; the bound stays above the connection timeout so even a hanging
        // connection reaches the diagnostic before this wait ends.
        XCTAssertTrue(diagnostic.waitForExistence(timeout: connectionTimeoutSeconds + uiReadyTimeout),
                      "Expected native unreachable diagnostic")
        attachScreenshot(from: app, name: "native-unreachable-diagnostic")
    }

    /// Every launch, including the restore launch, gets the UI-test connection timeout.
    private func launchApp(resetSavedNodes: Bool) -> XCUIApplication {
        let app = XCUIApplication()
        app.launchEnvironment["AUTOBYTEUS_CONNECTION_TIMEOUT_SECONDS"] = String(Int(connectionTimeoutSeconds))
        if resetSavedNodes {
            app.launchEnvironment["AUTOBYTEUS_RESET_SAVED_NODES"] = "1"
        }
        app.launch()
        return app
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
        XCTAssertTrue(waitUntil(input, matches: "exists == true AND hittable == true", timeout: uiReadyTimeout),
                      "Connection input should be visible and hittable")
        input.tap()
        XCTAssertTrue(waitUntil(input, matches: "hasKeyboardFocus == true", timeout: uiReadyTimeout),
                      "Connection input should have keyboard focus before typing")
        input.typeText(nodeURL)
        if nodeURL.lowercased().hasPrefix("http://") {
            tapWhenHittable(app.switches["connection.httpAcknowledgement"], name: "HTTP acknowledgement switch")
        }
        tapWhenHittable(app.buttons["connection.connect"], name: "Connect button")
    }

    private func assertFakeMobileLoaded(in app: XCUIApplication, attachmentName: String) {
        XCTAssertTrue(app.webViews.firstMatch.waitForExistence(timeout: pageLoadTimeout), "Expected WebView to exist")
        let marker = app.webViews.staticTexts[fakeMobileMarker]
        XCTAssertTrue(marker.waitForExistence(timeout: pageLoadTimeout), "Expected fake /mobile marker to be visible in WKWebView")
        attachScreenshot(from: app, name: attachmentName)
    }

    private func tapWhenHittable(_ element: XCUIElement, name: String) {
        XCTAssertTrue(waitUntil(element, matches: "exists == true AND hittable == true", timeout: uiReadyTimeout),
                      "\(name) should be visible and hittable")
        element.tap()
    }

    /// Waits until the element satisfies the predicate; returns as soon as it does.
    private func waitUntil(_ element: XCUIElement, matches predicateFormat: String, timeout: TimeInterval) -> Bool {
        let expectation = XCTNSPredicateExpectation(predicate: NSPredicate(format: predicateFormat), object: element)
        return XCTWaiter().wait(for: [expectation], timeout: timeout) == .completed
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

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
    private let maxToggleAttempts = 3

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
        // autobyteus-279: "Can't reach <node>" with the plain reason (Android's screen). A refused port fails at once; the
        // bound stays above the connection timeout so even a hanging connection reaches it before this wait ends.
        let title = app.staticTexts["cantReach.title"]
        XCTAssertTrue(title.waitForExistence(timeout: connectionTimeoutSeconds + uiReadyTimeout), "Expected Can't reach")
        XCTAssertTrue(title.label.hasPrefix("Can’t reach"), "Expected Can't reach <node>, got \(title.label)")
        XCTAssertTrue(app.buttons["cantReach.retry"].exists, "A node that does not answer offers Retry")
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

    /// autobyteus-279: the start screen's Other ways to connect › Type an address (Android's sheet): the address, the
    /// plain-HTTP tick when it is `http://`, Connect.
    private func connect(app: XCUIApplication, nodeURL: String) {
        tapWhenHittable(app.buttons["start.otherWays"], name: "Other ways to connect")
        tapWhenHittable(app.buttons["start.typeAddress"], name: "Type an address")
        let input = app.textFields["typeAddress.field"]
        XCTAssertTrue(waitUntil(input, matches: "exists == true AND hittable == true", timeout: uiReadyTimeout),
                      "Address field should be visible and hittable")
        if !waitUntil(input, matches: "hasKeyboardFocus == true", timeout: 5) { input.tap() }
        XCTAssertTrue(waitUntil(input, matches: "hasKeyboardFocus == true", timeout: uiReadyTimeout),
                      "Address field should have keyboard focus before typing")
        input.typeText(nodeURL)
        XCTAssertTrue(waitUntil(input, matches: NSPredicate(format: "value CONTAINS %@", nodeURL), timeout: uiReadyTimeout),
                      "Address field should contain the typed node URL before Connect")
        if nodeURL.lowercased().hasPrefix("http://") {
            let acknowledgement = app.switches["typeAddress.httpAcknowledgement"]
            turnOn(acknowledgement, name: "HTTP acknowledgement switch")
            XCTAssertTrue(isOn(acknowledgement), "HTTP acknowledgement switch should be on before Connect")
        }
        tapWhenHittable(app.buttons["typeAddress.connect"], name: "Connect button")
    }

    /// On a loaded simulator a delivered tap can have no effect, so the switch state is confirmed
    /// after each tap. The state is checked before every tap so an on switch is never toggled off.
    private func turnOn(_ toggle: XCUIElement, name: String) {
        for _ in 0..<maxToggleAttempts {
            XCTAssertTrue(waitUntil(toggle, matches: "exists == true AND hittable == true", timeout: uiReadyTimeout),
                          "\(name) should be visible and hittable")
            if isOn(toggle) { return }
            toggle.tap()
            if waitUntil(toggle, matches: "value == '1'", timeout: uiReadyTimeout) { return }
        }
    }

    private func isOn(_ toggle: XCUIElement) -> Bool {
        toggle.value as? String == "1"
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
        waitUntil(element, matches: NSPredicate(format: predicateFormat), timeout: timeout)
    }

    private func waitUntil(_ element: XCUIElement, matches predicate: NSPredicate, timeout: TimeInterval) -> Bool {
        let expectation = XCTNSPredicateExpectation(predicate: predicate, object: element)
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

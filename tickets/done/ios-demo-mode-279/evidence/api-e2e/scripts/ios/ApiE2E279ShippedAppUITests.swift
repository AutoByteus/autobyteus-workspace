import XCTest

/// ios-demo-mode-279 API/E2E (temporary; added only to a copy of the base commit's UI tests, never to the repository):
/// the shipped app (8430d9ef12) connects to a real node with a pairing link and pairs, so the computer is saved as the
/// founder's is today. The link comes from the test runner's environment (`TEST_RUNNER_API279_LINK`), never printed.
final class ApiE2E279ShippedAppUITests: XCTestCase {
    func testShippedAppSavesAPairedComputer() throws {
        continueAfterFailure = false
        let link = try XCTUnwrap(ProcessInfo.processInfo.environment["API279_LINK"], "TEST_RUNNER_API279_LINK")
        let app = XCUIApplication()
        app.launchEnvironment["AUTOBYTEUS_RESET_SAVED_NODES"] = "1"
        app.launchEnvironment["AUTOBYTEUS_CONNECTION_TIMEOUT_SECONDS"] = "60"
        app.launch()
        let input = app.textViews["connection.input"]
        XCTAssertTrue(input.waitForExistence(timeout: 60))
        input.tap()
        input.typeText(link)
        let ack = app.switches["connection.httpAcknowledgement"]
        for _ in 0..<3 where (ack.value as? String) != "1" { ack.tap(); _ = ack.waitForExistence(timeout: 2) }
        XCTAssertEqual(ack.value as? String, "1")
        app.buttons["connection.connect"].tap()
        // The node's pairing page asks for one tap ("Connect to <node>"), then shows the run list.
        let confirm = app.webViews.buttons.containing(NSPredicate(format: "label BEGINSWITH %@", "Connect to")).firstMatch
        if confirm.waitForExistence(timeout: 90) { confirm.tap() }
        // Paired: the node's run list (its one run, "Fact Checker").
        let row = app.webViews.descendants(matching: .any).matching(NSPredicate(format: "label CONTAINS %@", "Fact Checker")).firstMatch
        XCTAssertTrue(row.waitForExistence(timeout: 120), "The paired run list")
        let shot = XCTAttachment(screenshot: app.screenshot()); shot.name = "shipped-app-paired"; shot.lifetime = .keepAlways; add(shot)
        app.terminate()
    }
}

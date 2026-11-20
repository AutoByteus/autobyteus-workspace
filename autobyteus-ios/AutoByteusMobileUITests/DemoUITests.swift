import XCTest

/// The iOS app's built-in demo (autobyteus-279; AC-001, AC-002, AC-005, AC-006 in the simulator): the start screen, Try
/// demo, the demo code and link, Leave demo, a cold launch, and a share kept for the app. The demo needs no node.
final class DemoUITests: XCTestCase {
    override func setUp() {
        continueAfterFailure = false
    }

    /// The first screen: Scan, Try demo under it, and Other ways to connect with its two options.
    func testFirstScreen() {
        let app = launch()
        XCTAssertTrue(app.buttons["start.scan"].waitForExistence(timeout: uiReadyTimeout))
        XCTAssertTrue(app.buttons["start.tryDemo"].exists)
        XCTAssertTrue(app.staticTexts["Scan the QR code on your computer"].exists)
        app.buttons["start.otherWays"].tap()
        XCTAssertTrue(app.buttons["start.typeAddress"].waitForExistence(timeout: uiReadyTimeout))
        XCTAssertTrue(app.buttons["start.pasteLink"].exists)
        attach(app, "first-screen")
    }

    /// Try demo opens the demo's run list with its welcome card; Leave demo returns to the first screen; the next demo
    /// starts fresh (the welcome card again); a cold launch starts on the first screen.
    func testTryDemoThenLeaveDemoThenColdLaunch() {
        let app = launch()
        tap(app.buttons["start.tryDemo"])
        waitForDemo(app, "demo-run-list")
        tap(demoNodeButton(app))
        let leave = app.webViews.buttons.containing(NSPredicate(format: "label CONTAINS %@", "Leave demo")).firstMatch
        XCTAssertTrue(leave.waitForExistence(timeout: uiReadyTimeout))
        attach(app, "demo-sheet")
        leave.tap()
        XCTAssertTrue(app.buttons["start.scan"].waitForExistence(timeout: uiReadyTimeout), "Leave demo returns to the first screen")
        tap(app.buttons["start.tryDemo"])
        waitForDemo(app, "demo-again")
        app.terminate()
        app.launchEnvironment.removeValue(forKey: "AUTOBYTEUS_RESET_SAVED_NODES")
        app.launch()
        XCTAssertTrue(app.buttons["start.scan"].waitForExistence(timeout: uiReadyTimeout), "A cold launch starts on the first screen")
        XCTAssertFalse(app.buttons["start.row.open"].exists, "The demo is never a saved computer")
    }

    /// The demo's QR code: "Demo code found", then the demo.
    func testScanningTheDemoCodeOpensTheDemo() {
        let app = launch(["AUTOBYTEUS_UI_TEST_SCANNED_CODE": "autobyteus://demo"])
        tap(app.buttons["start.scan"])
        let found = app.staticTexts["Demo code found"]
        XCTAssertTrue(found.waitForExistence(timeout: uiReadyTimeout))
        attach(app, "demo-code-found")
        waitForDemo(app, "demo-from-scan")
    }

    /// `autobyteus://demo` from outside the app (the Camera app's link) opens the demo.
    func testTheDemoLinkOpensTheDemo() {
        let app = launch()
        XCTAssertTrue(app.buttons["start.scan"].waitForExistence(timeout: uiReadyTimeout))
        app.open(URL(string: "autobyteus://demo")!)
        // The system may ask before an app opens its own link; the confirming button is the alert's last.
        let springboard = XCUIApplication(bundleIdentifier: "com.apple.springboard")
        let alert = springboard.alerts.firstMatch
        if alert.waitForExistence(timeout: 5) { alert.buttons.element(boundBy: alert.buttons.count - 1).tap() }
        waitForDemo(app, "demo-from-link")
    }

    /// A kept share (the share extension's text, REQ-007): the demo link opens the demo; other text opens Type an address
    /// with it.
    func testAKeptShareIsUsedOnce() {
        var app = launch(["AUTOBYTEUS_UI_TEST_SHARED_TEXT": "autobyteus://demo"])
        waitForDemo(app, "share-demo-link")
        app.terminate()
        app = launch(["AUTOBYTEUS_UI_TEST_SHARED_TEXT": "my-computer.local"])
        let field = app.textFields["typeAddress.field"]
        XCTAssertTrue(field.waitForExistence(timeout: uiReadyTimeout))
        XCTAssertEqual("my-computer.local", field.value as? String)
        attach(app, "share-other-text")
    }

    /// No request leaves the demo's web view: a load the page's own transport never sees (an image from a real site) is
    /// blocked by the content rule list. Meaningful on a simulator with network, where it would otherwise load.
    func testTheDemoWebViewBlocksTheNetwork() {
        let app = launch(["AUTOBYTEUS_UI_TEST_NETWORK_PROBE": "1"])
        tap(app.buttons["start.tryDemo"])
        let probe = app.staticTexts["demo.networkProbe"]
        XCTAssertTrue(probe.waitForExistence(timeout: demoLoadTimeout))
        XCTAssertEqual("network-probe:blocked", probe.label)
    }
}

/// iPad landscape (REQ-008, VIS-032…035): the first screen's centered column, Type an address as a centered card, and the
/// demo's two panes with the empty pane's "Choose a run". Run against an iPad destination
/// (`-only-testing:AutoByteusMobileUITests/DemoIPadUITests`); the iPhone smoke leaves it out (`ios-simulator-smoke.sh`).
final class DemoIPadUITests: XCTestCase {
    override func setUp() {
        continueAfterFailure = false
    }

    func testIPadLandscape() {
        XCTAssertEqual(UIDevice.current.userInterfaceIdiom, .pad, "Run this class on an iPad simulator")
        XCUIDevice.shared.orientation = .landscapeLeft
        addTeardownBlock { XCUIDevice.shared.orientation = .portrait }
        let app = launch()
        XCTAssertTrue(app.buttons["start.scan"].waitForExistence(timeout: uiReadyTimeout))
        attach(app, "ipad-landscape-first-screen")
        app.buttons["start.otherWays"].tap()
        tap(app.buttons["start.typeAddress"])
        let field = app.textFields["typeAddress.field"]
        XCTAssertTrue(field.waitForExistence(timeout: uiReadyTimeout))
        XCTAssertLessThanOrEqual(field.frame.width, 512, "Type an address is a 512 pt card on iPad")
        attach(app, "ipad-landscape-type-address")
        app.buttons["Close"].firstMatch.tap()
        tap(app.buttons["start.tryDemo"])
        waitForDemo(app, "ipad-landscape-demo")
        XCTAssertTrue(app.webViews.staticTexts["Choose a run"].exists, "The empty pane beside the list")
    }
}

/// What both demo test classes use.
private let uiReadyTimeout: TimeInterval = 30
/// The demo's first page: the bundled build, its demo node and the run list (generous for a loaded CI simulator).
private let demoLoadTimeout: TimeInterval = 90

private extension XCTestCase {
    func launch(_ environment: [String: String] = [:]) -> XCUIApplication {
        let app = XCUIApplication()
        app.launchEnvironment["AUTOBYTEUS_RESET_SAVED_NODES"] = "1"
        environment.forEach { app.launchEnvironment[$0.key] = $0.value }
        app.launch()
        return app
    }

    func waitForDemo(_ app: XCUIApplication, _ name: String) {
        let welcome = app.webViews.staticTexts["Welcome to the demo"]
        XCTAssertTrue(welcome.waitForExistence(timeout: demoLoadTimeout), "The demo's run list with its welcome card")
        XCTAssertTrue(demoNodeButton(app).exists, "The node button names the demo")
        attach(app, name)
    }

    /// The node button that names the demo (WebKit exposes its `aria-haspopup="dialog"` button as an other element).
    func demoNodeButton(_ app: XCUIApplication) -> XCUIElement {
        app.webViews.otherElements["Demo, sample data. About the demo"]
    }

    func tap(_ element: XCUIElement) {
        XCTAssertTrue(element.waitForExistence(timeout: uiReadyTimeout))
        element.tap()
    }

    func attach(_ app: XCUIApplication, _ name: String) {
        let attachment = XCTAttachment(screenshot: app.screenshot())
        attachment.name = name
        attachment.lifetime = .keepAlways
        add(attachment)
    }
}

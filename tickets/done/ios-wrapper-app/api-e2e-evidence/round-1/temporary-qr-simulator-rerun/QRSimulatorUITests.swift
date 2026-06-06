import XCTest

final class QRSimulatorUITests: XCTestCase {
    func testQRScannerReturnsGracefulSimulatorDiagnosticOrCancellation() {
        let app = XCUIApplication()
        app.launchEnvironment["AUTOBYTEUS_RESET_SAVED_NODES"] = "1"
        app.launch()

        let scan = app.buttons["Scan QR"]
        XCTAssertTrue(scan.waitForExistence(timeout: 10), "Expected Scan QR button on first-run connection screen")
        scan.tap()

        let springboard = XCUIApplication(bundleIdentifier: "com.apple.springboard")
        if springboard.alerts.firstMatch.waitForExistence(timeout: 4) {
            let alert = springboard.alerts.firstMatch
            if alert.buttons["Don’t Allow"].exists {
                alert.buttons["Don’t Allow"].tap()
            } else if alert.buttons["Don't Allow"].exists {
                alert.buttons["Don't Allow"].tap()
            } else if alert.buttons["Nicht erlauben"].exists {
                alert.buttons["Nicht erlauben"].tap()
            } else if alert.buttons.count > 0 {
                alert.buttons.element(boundBy: 0).tap()
            }
        } else if app.buttons["Cancel"].waitForExistence(timeout: 4) {
            app.buttons["Cancel"].tap()
        }

        let unavailable = app.staticTexts.containing(NSPredicate(format: "label CONTAINS[c] %@", "QR scanner is unavailable")).firstMatch
        let denied = app.staticTexts.containing(NSPredicate(format: "label CONTAINS[c] %@", "Camera permission is needed")).firstMatch
        let cancelled = app.staticTexts.containing(NSPredicate(format: "label CONTAINS[c] %@", "QR scan was not completed")).firstMatch

        let observed = unavailable.waitForExistence(timeout: 10) || denied.waitForExistence(timeout: 3) || cancelled.waitForExistence(timeout: 3)
        XCTAssertTrue(observed, "Expected QR unavailable, camera-denied, or cancelled native diagnostic")

        let attachment = XCTAttachment(screenshot: app.screenshot())
        attachment.name = "qr-simulator-graceful-diagnostic"
        attachment.lifetime = .keepAlways
        add(attachment)
    }
}

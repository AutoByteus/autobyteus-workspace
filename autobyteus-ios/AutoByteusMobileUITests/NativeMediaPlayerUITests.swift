import XCTest

/// autobyteus-574 and autobyteus-642 on the iOS simulator (574 UC-001, UC-003; AC-001, AC-004; 642 UC-002, AC-002 on
/// iOS): the node's page hands a protected video or audio file to the app over the shell bridge (`playMedia`); the app's
/// own player opens it as iOS's player screen (autobyteus-647 D-3: its close button and the file's name as its title, no
/// app bar over its controls), a wide video turns the phone to landscape, an audio file stays in portrait with its title,
/// and closing it (its close button, or a swipe down) returns to the page in portrait. A missing file says it could not
/// be played, with Back. The fake node
/// (`scripts/fake-mobile-server.py --video <a wide MP4> --audio <an MP3>`) serves the files by range and logs each request
/// (`MEDIA {…}`: path, status, range, whether the credential came, bytes). Not part of the smoke run (it needs the files):
/// `xcodebuild … -only-testing:AutoByteusMobileUITests/NativeMediaPlayerUITests AUTOBYTEUS_TEST_NODE_URL=<the fake node>/mobile test`.
final class NativeMediaPlayerUITests: XCTestCase {
    private let timeout: TimeInterval = 60

    func testANodeVideoPlaysInTheAppsPlayerInLandscapeAndItsCloseReturnsToThePageInPortrait() throws {
        let app = try launchAndOpenTheFakeNode()
        let play = app.webViews.buttons["Play video"]
        XCTAssertTrue(play.waitForExistence(timeout: timeout), "start the fake node with --video")
        play.tap()

        XCTAssertTrue(app.otherElements["media.player"].waitForExistence(timeout: timeout), "the app's player opens")
        XCTAssertTrue(wait(timeout) { self.isLandscape(app) }, "a wide video turns the phone to landscape")
        // It plays: no failure after a few seconds of playing.
        Thread.sleep(forTimeInterval: 5)
        XCTAssertFalse(app.staticTexts["media.couldNotPlay"].exists, "the video plays")
        attach(app, "player-landscape")
        showControls(app)
        XCTAssertFalse(app.buttons["media.back"].exists, "no app bar over iOS's player")
        XCTAssertTrue(app.staticTexts["clip.mp4"].exists, "iOS's player shows the file's name")
        attach(app, "player-landscape-controls")

        closeWithItsButton(app)
        XCTAssertTrue(wait(timeout) { !app.otherElements["media.player"].exists && !app.otherElements["media.host"].exists }, "its close closes the player")
        XCTAssertTrue(wait(timeout) { !self.isLandscape(app) }, "and the phone returns to portrait")
        XCTAssertTrue(app.webViews.buttons["Play video"].exists, "the page is shown again")
        attach(app, "back-to-page-portrait")
    }

    func testAMissingVideoSaysItCouldNotBePlayedWithBack() throws {
        let app = try launchAndOpenTheFakeNode()
        let play = app.webViews.buttons["Play a missing video"]
        XCTAssertTrue(play.waitForExistence(timeout: timeout), "start the fake node with --video")
        play.tap()
        XCTAssertTrue(app.staticTexts["media.couldNotPlay"].waitForExistence(timeout: timeout), "a missing file says it could not be played")
        XCTAssertEqual(app.staticTexts["media.couldNotPlay"].label, "This video could not be played.")
        attach(app, "could-not-play")
        app.buttons["media.back"].tap()
        XCTAssertTrue(wait(timeout) { app.webViews.buttons["Play a missing video"].exists }, "Back returns to the page")
    }

    func testANodeAudioFilePlaysInTheAppsPlayerInPortraitWithItsTitle() throws {
        let app = try launchAndOpenTheFakeNode()
        let play = app.webViews.buttons["Play audio"]
        XCTAssertTrue(play.waitForExistence(timeout: timeout), "start the fake node with --audio")
        play.tap()

        XCTAssertTrue(app.otherElements["media.player"].waitForExistence(timeout: timeout), "the app's player opens")
        XCTAssertTrue(app.staticTexts["memo.mp3"].exists, "the file's name is shown")
        Thread.sleep(forTimeInterval: 5)
        XCTAssertFalse(app.staticTexts["media.couldNotPlay"].exists, "the audio plays")
        XCTAssertFalse(isLandscape(app), "an audio file stays in portrait")
        // With the controls hidden while it plays, the screen still shows an audio symbol and the name (642 C-2).
        XCTAssertTrue(app.images["media.audioSymbol"].exists, "the audio symbol")
        attach(app, "audio-portrait")
        showControls(app)
        XCTAssertTrue(app.sliders.matching(NSPredicate(format: "identifier == %@", "Current position")).firstMatch.waitForExistence(timeout: 5), "a tap shows the player's audio controls")
        XCTAssertFalse(app.buttons["media.back"].exists, "no app bar over iOS's player")
        XCTAssertGreaterThanOrEqual(app.staticTexts.matching(NSPredicate(format: "label == %@", "memo.mp3")).count, 2, "the name as iOS's title and under the symbol")
        attach(app, "audio-controls")

        closeWithItsButton(app)
        XCTAssertTrue(wait(timeout) { !app.otherElements["media.player"].exists && !app.otherElements["media.host"].exists }, "its close closes the player")
        XCTAssertTrue(app.webViews.buttons["Play audio"].exists, "the page is shown again")
    }

    /// A swipe down closes iOS's player screen, and the app's screen under it closes too (autobyteus-647 REQ-003).
    func testASwipeDownClosesThePlayerAndThePageShowsAgain() throws {
        let app = try launchAndOpenTheFakeNode()
        let play = app.webViews.buttons["Play audio"]
        XCTAssertTrue(play.waitForExistence(timeout: timeout), "start the fake node with --audio")
        play.tap()
        let player = app.otherElements["media.player"]
        XCTAssertTrue(player.waitForExistence(timeout: timeout), "the app's player opens")
        Thread.sleep(forTimeInterval: 2)
        player.swipeDown(velocity: .fast)
        XCTAssertTrue(wait(timeout) { !player.exists && !app.otherElements["media.host"].exists }, "a swipe down closes the player")
        XCTAssertTrue(app.webViews.buttons["Play audio"].exists, "the page is shown again")
    }

    /// Shows iOS's player controls with a tap away from the centre (where play/pause is).
    private func showControls(_ app: XCUIApplication) {
        app.otherElements["media.player"].coordinate(withNormalizedOffset: CGVector(dx: 0.3, dy: 0.7)).tap()
    }

    /// iOS's player screen's own close button (its controls shown first).
    private func closeWithItsButton(_ app: XCUIApplication) {
        let close = app.buttons["Close Button"]
        if !close.exists { showControls(app) }
        XCTAssertTrue(close.waitForExistence(timeout: 5), "iOS's player's close button")
        close.tap()
    }

    private func isLandscape(_ app: XCUIApplication) -> Bool {
        let frame = app.windows.firstMatch.frame
        return frame.width > frame.height
    }

    private func launchAndOpenTheFakeNode() throws -> XCUIApplication {
        let value = (Bundle(for: Self.self).object(forInfoDictionaryKey: "AUTOBYTEUS_TEST_NODE_URL") as? String)?
            .trimmingCharacters(in: .whitespacesAndNewlines)
        guard let nodeURL = value, !nodeURL.isEmpty, !nodeURL.hasPrefix("$(") else {
            throw XCTSkip("Set AUTOBYTEUS_TEST_NODE_URL to the fake node started with --video and --audio.")
        }
        XCUIDevice.shared.orientation = .portrait
        let app = XCUIApplication()
        app.launchEnvironment["AUTOBYTEUS_CONNECTION_TIMEOUT_SECONDS"] = "60"
        app.launchEnvironment["AUTOBYTEUS_RESET_SAVED_NODES"] = "1"
        app.launch()
        tap(app.buttons["start.otherWays"])
        tap(app.buttons["start.typeAddress"])
        let field = app.textFields["typeAddress.field"]
        tap(field)
        field.typeText(nodeURL)
        let acknowledgement = app.switches["typeAddress.httpAcknowledgement"]
        if nodeURL.lowercased().hasPrefix("http://"), acknowledgement.waitForExistence(timeout: timeout), acknowledgement.value as? String != "1" {
            acknowledgement.tap()
        }
        tap(app.buttons["typeAddress.connect"])
        XCTAssertTrue(app.webViews.staticTexts["AUTOBYTEUS_FAKE_MOBILE_READY"].waitForExistence(timeout: timeout), "the fake node's page")
        return app
    }

    private func tap(_ element: XCUIElement) {
        XCTAssertTrue(wait(timeout) { element.exists && element.isHittable }, "\(element) is hittable")
        element.tap()
    }

    private func wait(_ timeout: TimeInterval, until condition: @escaping () -> Bool) -> Bool {
        let deadline = Date().addingTimeInterval(timeout)
        while Date() < deadline {
            if condition() { return true }
            Thread.sleep(forTimeInterval: 0.25)
        }
        return false
    }

    private func attach(_ app: XCUIApplication, _ name: String) {
        let attachment = XCTAttachment(screenshot: app.screenshot())
        attachment.name = name
        attachment.lifetime = .keepAlways
        add(attachment)
    }
}

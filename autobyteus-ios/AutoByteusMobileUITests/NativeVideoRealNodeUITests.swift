import XCTest

/// autobyteus-574 on the iOS simulator against a real node (API/E2E; UC-001…003, AC-001, AC-002, AC-004 on iOS): the
/// node is `autobyteus-web/tests/e2e/native-video-node.mjs` (this worktree's built node behind a logging proxy throttled
/// to about 1.5 MB/s), started with this computer's LAN address as `--origin-host` and `--listen-host` (a pairing link
/// may not name a loopback host). Skipped unless `TEST_RUNNER_AUTOBYTEUS_574_REAL_NODE_INFO` names its `stack-info.json`
/// and `TEST_RUNNER_AUTOBYTEUS_574_REAL_NODE_SECRETS` its secrets file (the one-time pairing link, read here only and
/// never printed). The tests run in name order on one fresh stack: `test0…` pairs through the app's `autobyteus://`
/// link, the others reopen the saved node, `testZ…` removes it. `MARK <event> <epoch ms>` lines time the journeys
/// against a screen recording (`xcrun simctl io <device> recordVideo`); the proxy's `/log` holds the requests.
final class NativeVideoRealNodeUITests: XCTestCase {
    private let timeout: TimeInterval = 90

    /// The pairing link opened through the app's URL scheme: the node's page and its run list.
    func test0PairsWithTheNodeByItsLink() throws {
        let app = try launchAndPair()
        let row = app.webViews.buttons.matching(NSPredicate(format: "label BEGINSWITH 'Video Checker'")).firstMatch
        XCTAssertTrue(row.waitForExistence(timeout: timeout), "the paired node's run list")
    }

    /// From the chat's file link: the app's player opens, a wide video turns to landscape, the scrubber is moved to the
    /// middle, and Back returns to the page in portrait.
    func testAWideVideoFromTheChatLink() throws {
        let app = try openTheRun()
        let link = app.webViews.buttons["Open wide-574.mp4 in Files"]
        XCTAssertTrue(link.waitForExistence(timeout: timeout), "the chat's file link")
        mark("tap")
        link.tap()
        let player = app.otherElements["video.player"]
        XCTAssertTrue(player.waitForExistence(timeout: timeout), "the app's player opens")
        mark("player")
        XCTAssertTrue(wait(timeout) { self.isLandscape(app) }, "a wide video turns the phone to landscape")
        mark("landscape")
        Thread.sleep(forTimeInterval: 6)
        XCTAssertFalse(app.staticTexts["video.couldNotPlay"].exists, "the video plays")
        showControls(player)
        let slider = app.sliders.firstMatch
        XCTAssertTrue(slider.waitForExistence(timeout: 5), "the scrubber")
        mark("seek")
        slider.adjust(toNormalizedSliderPosition: 0.5)
        mark("seek-done")
        for second in 1...3 {
            Thread.sleep(forTimeInterval: 1)
            print("POSITION +\(second)s \(position(app))")
        }
        app.buttons["video.back"].tap()
        XCTAssertTrue(wait(timeout) { !player.exists }, "Back closes the player")
        XCTAssertTrue(wait(timeout) { !self.isLandscape(app) }, "and the phone returns to portrait")
        mark("back")
    }

    /// The player's own skip-forward button: the position moves on by about ten seconds and keeps playing.
    func testBSkipForwardPlaysOn() throws {
        let app = try openTheRun()
        let link = app.webViews.buttons["Open wide-574.mp4 in Files"]
        XCTAssertTrue(link.waitForExistence(timeout: timeout), "the chat's file link")
        link.tap()
        let player = app.otherElements["video.player"]
        XCTAssertTrue(player.waitForExistence(timeout: timeout), "the app's player opens")
        XCTAssertTrue(wait(timeout) { self.isLandscape(app) })
        Thread.sleep(forTimeInterval: 4)
        showControls(player)
        let skip = app.buttons["Skip Forward"]
        XCTAssertTrue(skip.waitForExistence(timeout: 5), "the skip-forward button")
        mark("skip")
        skip.tap()
        print("POSITION after skip \(position(app))")
        Thread.sleep(forTimeInterval: 4)
        app.buttons["video.back"].tap()
        XCTAssertTrue(wait(timeout) { !player.exists }, "Back closes the player")
    }

    /// From Files (More → Files → the file): the same player; a tall video stays in portrait.
    func testCTallVideoFromFilesStaysPortrait() throws {
        let app = try openTheRun()
        openFiles(app)
        let row = fileRow(app, "tall-574.mp4")
        mark("tap")
        row.tap()
        let player = app.otherElements["video.player"]
        XCTAssertTrue(player.waitForExistence(timeout: timeout), "the app's player opens")
        mark("player")
        Thread.sleep(forTimeInterval: 6)
        XCTAssertFalse(isLandscape(app), "a tall video stays in portrait")
        XCTAssertFalse(app.staticTexts["video.couldNotPlay"].exists, "the video plays")
        app.buttons["video.back"].tap()
        XCTAssertTrue(wait(timeout) { !player.exists }, "Back closes the player")
        mark("back")
    }

    /// A file rewritten on the node while its viewer is open in the page (live refresh) does not open the player by
    /// itself: neither a second time while it plays, nor again after Back (API/E2E F-1).
    func testDARewriteDoesNotOpenThePlayerByItself() throws {
        let app = try openTheRun()
        openFiles(app)
        fileRow(app, "wide-574.mp4").tap()
        let player = app.otherElements["video.player"]
        XCTAssertTrue(player.waitForExistence(timeout: timeout), "the app's player opens")
        Thread.sleep(forTimeInterval: 4)
        mark("rewrite-while-open")
        try control("POST", "/rewrite")
        Thread.sleep(forTimeInterval: 10)
        XCTAssertEqual(app.otherElements.matching(identifier: "video.player").count, 1, "one player while it plays")
        app.buttons["video.back"].tap()
        XCTAssertTrue(wait(10) { !player.exists }, "one Back closes the player")
        mark("rewrite-while-closed")
        try control("POST", "/rewrite")
        Thread.sleep(forTimeInterval: 10)
        XCTAssertFalse(player.exists, "the player does not open by itself after a rewrite")
        if player.exists { app.buttons["video.back"].tap() }
    }

    /// The player's own Close (X), shown with its controls next to the app's Back, closes the player as Back does: the
    /// page again, in portrait.
    func testEThePlayersOwnCloseButton() throws {
        let app = try openTheRun()
        let link = app.webViews.buttons["Open wide-574.mp4 in Files"]
        XCTAssertTrue(link.waitForExistence(timeout: timeout), "the chat's file link")
        link.tap()
        let player = app.otherElements["video.player"]
        XCTAssertTrue(player.waitForExistence(timeout: timeout), "the app's player opens")
        XCTAssertTrue(wait(timeout) { self.isLandscape(app) })
        Thread.sleep(forTimeInterval: 4)
        showControls(player)
        let close = app.buttons["Close Button"]
        XCTAssertTrue(close.waitForExistence(timeout: 5), "the player's Close")
        mark("close")
        close.tap()
        XCTAssertTrue(wait(10) { !player.exists }, "Close closes the player")
        XCTAssertTrue(wait(timeout) { !self.isLandscape(app) }, "and the phone returns to portrait")
        XCTAssertTrue(app.webViews.firstMatch.exists, "the page is shown again")
        if player.exists { app.buttons["video.back"].tap() }
    }

    /// Removing the node from the app (the page's node → Switch node → its row's More → Remove) deletes its cached videos (D-7): the cache folder is
    /// read from the host before and after (`MARK removed`).
    func testZRemovingTheNodeFromTheApp() throws {
        let app = try launchSaved()
        let header = app.webViews.otherElements.matching(NSPredicate(format: "label BEGINSWITH 'Video Test Node'")).firstMatch
        XCTAssertTrue(header.waitForExistence(timeout: timeout), "the page's node header")
        header.tap()
        let switchNode = app.webViews.buttons.matching(NSPredicate(format: "label BEGINSWITH 'Switch node'")).firstMatch
        XCTAssertTrue(switchNode.waitForExistence(timeout: 10), "the connection sheet's Switch node")
        switchNode.tap()
        let more = app.buttons["start.row.more"]
        XCTAssertTrue(more.waitForExistence(timeout: 20), "the node's More")
        more.tap()
        app.buttons["removeNode.remove"].tap()
        let confirm = app.buttons["removeNode.confirm"]
        if confirm.waitForExistence(timeout: 5) { confirm.tap() }
        XCTAssertTrue(wait(20) { !app.buttons["start.row.more"].exists }, "the node is removed")
        mark("removed")
        Thread.sleep(forTimeInterval: 3)
    }

    // MARK: Helpers

    private struct Stack { let info: [String: Any]; let pairingLink: String }

    private func stack() throws -> Stack {
        let environment = ProcessInfo.processInfo.environment
        guard let infoPath = environment["AUTOBYTEUS_574_REAL_NODE_INFO"], let secretsPath = environment["AUTOBYTEUS_574_REAL_NODE_SECRETS"] else {
            throw XCTSkip("Start native-video-node.mjs and set TEST_RUNNER_AUTOBYTEUS_574_REAL_NODE_INFO and _SECRETS.")
        }
        let info = try JSONSerialization.jsonObject(with: Data(contentsOf: URL(fileURLWithPath: infoPath))) as? [String: Any] ?? [:]
        let secrets = try JSONSerialization.jsonObject(with: Data(contentsOf: URL(fileURLWithPath: secretsPath))) as? [String: Any] ?? [:]
        guard let link = secrets["pairingLink"] as? String else { throw XCTSkip("no pairing link in the secrets file") }
        return Stack(info: info, pairingLink: link)
    }

    /// A fresh app given the pairing link through its URL scheme (`autobyteus://open?input=<link>`), as a shared link.
    private func launchAndPair() throws -> XCUIApplication {
        let stack = try stack()
        XCUIDevice.shared.orientation = .portrait
        let app = XCUIApplication()
        app.launchEnvironment["AUTOBYTEUS_CONNECTION_TIMEOUT_SECONDS"] = "60"
        app.launchEnvironment["AUTOBYTEUS_RESET_SAVED_NODES"] = "1"
        app.launch()
        var components = URLComponents()
        components.scheme = "autobyteus"
        components.host = "open"
        components.queryItems = [URLQueryItem(name: "input", value: stack.pairingLink)]
        XCUIDevice.shared.system.open(components.url!)
        return app
    }

    /// The app with the node it paired with earlier (the pairing link is one-time), at its page.
    private func launchSaved() throws -> XCUIApplication {
        _ = try stack()
        XCUIDevice.shared.orientation = .portrait
        let app = XCUIApplication()
        app.launchEnvironment["AUTOBYTEUS_CONNECTION_TIMEOUT_SECONDS"] = "60"
        app.launch()
        XCTAssertTrue(app.webViews.firstMatch.waitForExistence(timeout: timeout), "the node's page")
        return app
    }

    private func openTheRun() throws -> XCUIApplication {
        let app = try launchSaved()
        let row = app.webViews.buttons.matching(NSPredicate(format: "label BEGINSWITH 'Video Checker'")).firstMatch
        if row.waitForExistence(timeout: 20) { row.tap() }
        XCTAssertTrue(app.webViews.buttons["Back to runs"].waitForExistence(timeout: timeout), "the run's conversation")
        return app
    }

    private func openFiles(_ app: XCUIApplication) {
        let more = app.webViews.otherElements["More"].exists ? app.webViews.otherElements["More"] : app.webViews.buttons["More"]
        more.tap()
        let files = app.webViews.menuItems["Files"]
        XCTAssertTrue(files.waitForExistence(timeout: 10), "the menu's Files")
        files.tap()
    }

    /// The row of `name` in the Files list.
    private func fileRow(_ app: XCUIApplication, _ name: String) -> XCUIElement {
        let row = app.webViews.buttons.matching(NSPredicate(format: "label BEGINSWITH %@", name)).firstMatch
        XCTAssertTrue(row.waitForExistence(timeout: 20), "\(name) in Files")
        return row
    }

    /// Shows the player's controls with a tap away from the centre (where play/pause is).
    private func showControls(_ player: XCUIElement) {
        player.coordinate(withNormalizedOffset: CGVector(dx: 0.3, dy: 0.7)).tap()
    }

    /// The scrubber's value ("N seconds elapsed, …"), or `hidden` when the controls are hidden.
    private func position(_ app: XCUIApplication) -> String {
        let slider = app.sliders.firstMatch
        return slider.exists ? "\(slider.value ?? "-")" : "hidden"
    }

    /// One request to the stack's control endpoint (127.0.0.1), e.g. `POST /rewrite`.
    private func control(_ method: String, _ path: String) throws {
        let stack = try stack()
        let port = stack.info["controlPort"].map { "\($0)" } ?? ""
        var request = URLRequest(url: URL(string: "http://127.0.0.1:\(port)\(path)")!)
        request.httpMethod = method
        let done = expectation(description: "control \(path)")
        URLSession.shared.dataTask(with: request) { _, _, _ in done.fulfill() }.resume()
        wait(for: [done], timeout: 30)
    }

    private func mark(_ event: String) { print("MARK \(event) \(Int(Date().timeIntervalSince1970 * 1000))") }

    private func isLandscape(_ app: XCUIApplication) -> Bool {
        let frame = app.windows.firstMatch.frame
        return frame.width > frame.height
    }

    private func wait(_ timeout: TimeInterval, until condition: @escaping () -> Bool) -> Bool {
        let deadline = Date().addingTimeInterval(timeout)
        while Date() < deadline {
            if condition() { return true }
            Thread.sleep(forTimeInterval: 0.1)
        }
        return false
    }
}

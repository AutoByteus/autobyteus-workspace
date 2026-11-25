import XCTest

/// autobyteus-642 on the iOS simulator against a real node (API/E2E; UC-001, UC-002; AC-001, AC-002 on iOS): node audio
/// files and a Team's message references in the app's media player. The node is `autobyteus-web/tests/e2e/native-video-node.mjs`
/// (this worktree's node behind a logging proxy, throttled to about 1.5 MB/s), started at this computer's LAN address
/// (`--origin-host`, `--listen-host`). Skipped unless `TEST_RUNNER_AUTOBYTEUS_574_REAL_NODE_INFO` names its
/// `stack-info.json` and `TEST_RUNNER_AUTOBYTEUS_574_REAL_NODE_SECRETS` its secrets file (the one-time pairing link). The
/// tests run in name order on one fresh stack: `test0…` pairs, `testZ…` removes the node. What the node was asked comes
/// from the stack's request log (`/log`); the player's clock is no measure of playback (autobyteus-574 F-3, F-4).
final class NativeMediaRealNodeUITests: XCTestCase {
    private let timeout: TimeInterval = 90

    func test0PairsWithTheNodeByItsLink() throws {
        let app = try launchAndPair()
        let row = app.webViews.buttons.matching(NSPredicate(format: "label BEGINSWITH 'Video Checker'")).firstMatch
        XCTAssertTrue(row.waitForExistence(timeout: timeout), "the paired node's run list")
    }

    /// An MP3 from the chat's file link plays in the app's player: portrait, its name, the audio symbol while AVKit's
    /// controls are hidden, the controls after a tap; one probe and one streaming read, the credential in the header only.
    func testAAnMP3FromTheChatLinkPlaysInTheAppsPlayer() throws {
        let app = try openTheRun()
        let link = app.webViews.buttons["Open memo-642.mp3 in Files"]
        XCTAssertTrue(link.waitForExistence(timeout: timeout), "the chat's link to the MP3")
        let opened = Date()
        mark("tap-mp3")
        link.tap()
        let player = app.otherElements["media.player"]
        XCTAssertTrue(player.waitForExistence(timeout: timeout), "the app's player opens")
        mark("player")
        XCTAssertTrue(app.otherElements["media.audioSymbol"].waitForExistence(timeout: 10) || app.images["media.audioSymbol"].exists, "the audio symbol")
        XCTAssertTrue(app.staticTexts["memo-642.mp3"].exists, "the file's name")
        Thread.sleep(forTimeInterval: 5)
        XCTAssertFalse(isLandscape(app), "audio stays in portrait")
        XCTAssertFalse(app.staticTexts["media.couldNotPlay"].exists, "it plays")
        attach(app, "audio-playing-controls-hidden")
        player.coordinate(withNormalizedOffset: CGVector(dx: 0.3, dy: 0.7)).tap()
        XCTAssertTrue(scrubber(app).waitForExistence(timeout: 5), "a tap shows AVKit's controls")
        print("POSITION \(scrubber(app).value ?? "-") at \(String(format: "%.1f", Date().timeIntervalSince(opened))) s")
        attach(app, "audio-controls-shown")
        let requests = try fileRequests(since: opened, named: "memo-642.mp3")
        print("REQUESTS \(requests.map { "\($0["range"] ?? "-"):\($0["status"] ?? "-"):\($0["bytes"] ?? "-")" })")
        XCTAssertTrue(requests.allSatisfy { ($0["credential"] as? String) == "phone" && ($0["urlCredential"] as? Bool) == false }, "the credential in the header only")
        XCTAssertLessThanOrEqual(requests.count, 4, "a probe and a streaming read, not one request per small read")
        app.buttons["media.back"].tap()
        XCTAssertTrue(wait(timeout) { !player.exists }, "Back closes the player")
    }

    /// The same MP3 again: only the two-byte probe goes to the node.
    func testBTheMP3ReopenedFetchesOnlyTheProbe() throws {
        let app = try openTheRun()
        let link = app.webViews.buttons["Open memo-642.mp3 in Files"]
        XCTAssertTrue(link.waitForExistence(timeout: timeout))
        let opened = Date()
        link.tap()
        let player = app.otherElements["media.player"]
        XCTAssertTrue(player.waitForExistence(timeout: timeout), "the app's player opens")
        Thread.sleep(forTimeInterval: 5)
        let data = try fileRequests(since: opened, named: "memo-642.mp3").filter { ($0["range"] as? String) != "bytes=0-1" }
        print("REOPEN \(data.map { "\($0["range"] ?? "-"):\($0["bytes"] ?? "-")" })")
        XCTAssertEqual(data.reduce(0) { $0 + (($1["bytes"] as? NSNumber)?.intValue ?? 0) }, 0, "the reopen fetches only the probe")
        app.buttons["media.back"].tap()
        XCTAssertTrue(wait(timeout) { !player.exists })
    }

    /// A fresh M4A from Files over a slower link (50 ms per answer, 60 KB/s): it plays, and a seek to the middle is a ranged
    /// read from there with the header.
    func testCAnM4AOverASlowerLinkSeeksByRange() throws {
        // Slow enough (60 KB/s, the M4A is 32 KB/s) that the stream has not reached the middle when the seek comes; a
        // fresh version (`/touch`) so nothing of it is cached.
        try control("POST", "/touch?file=m4a")
        try control("POST", "/latency?ms=50")
        try control("POST", "/throttle?bps=60000")
        defer { try? control("POST", "/latency?ms=0"); try? control("POST", "/throttle?bps=1500000") }
        let app = try openTheRun()
        openFiles(app)
        let row = fileRow(app, "note-642.m4a")
        let opened = Date()
        mark("tap-m4a")
        row.tap()
        let player = app.otherElements["media.player"]
        XCTAssertTrue(player.waitForExistence(timeout: timeout), "the app's player opens")
        mark("player")
        Thread.sleep(forTimeInterval: 3)
        player.coordinate(withNormalizedOffset: CGVector(dx: 0.3, dy: 0.7)).tap()
        let slider = scrubber(app)
        XCTAssertTrue(slider.waitForExistence(timeout: 5), "the scrubber")
        let sought = Date()
        mark("seek")
        slider.adjust(toNormalizedSliderPosition: 0.5)
        Thread.sleep(forTimeInterval: 3)
        print("POSITION after seek \(scrubber(app).exists ? "\(scrubber(app).value ?? "-")" : "hidden")")
        let size = Double(((try stack().info["sizes"] as? [String: Any])?["m4a"] as? NSNumber)?.intValue ?? 0)
        let requests = try fileRequests(since: opened, named: "note-642.m4a")
        print("REQUESTS \(requests.map { "\($0["range"] ?? "-"):\($0["status"] ?? "-"):\($0["bytes"] ?? "-")" })")
        let fromTheMiddle = try fileRequests(since: sought, named: "note-642.m4a").filter { request in
            guard let range = request["range"] as? String, let first = Double(range.dropFirst("bytes=".count).split(separator: "-").first ?? "") else { return false }
            return first >= size * 0.4 && (request["credential"] as? String) == "phone"
        }
        XCTAssertFalse(fromTheMiddle.isEmpty, "the seek reads from the middle by range, with the header")
        app.buttons["media.back"].tap()
        XCTAssertTrue(wait(timeout) { !player.exists })
    }

    /// The Team's video and audio references play in the app's player, read by range from the reference route with the
    /// header (autobyteus-642 SR-003).
    func testDATeamsMediaReferencesPlayInTheAppsPlayer() throws {
        let app = try openTheTeamsMessages()
        for name in ["ref-642.mp4", "ref-642.m4a"] {
            let opened = Date()
            referenceRow(app, name).tap()
            let player = app.otherElements["media.player"]
            XCTAssertTrue(player.waitForExistence(timeout: timeout), "\(name): the app's player opens")
            Thread.sleep(forTimeInterval: 5)
            XCTAssertFalse(app.staticTexts["media.couldNotPlay"].exists, "\(name) plays")
            attach(app, "reference-\(name)")
            let requests = try fileRequests(since: opened, named: "/references/")
            print("REFERENCE \(name) \(requests.map { "\($0["range"] ?? "-"):\($0["status"] ?? "-"):\($0["bytes"] ?? "-")" })")
            XCTAssertFalse(requests.isEmpty, "\(name): the reference route is read")
            XCTAssertTrue(requests.allSatisfy { ($0["credential"] as? String) == "phone" && ($0["urlCredential"] as? Bool) == false }, "\(name): the header only")
            XCTAssertTrue(requests.contains { ($0["status"] as? NSNumber)?.intValue == 206 }, "\(name): ranged reads")
            app.buttons["media.back"].tap()
            XCTAssertTrue(wait(timeout) { !player.exists })
            backToMessages(app)
        }
    }

    /// While a media reference is open the Team goes on sending messages: the player stays one, and after Back it does
    /// not open again by itself (autobyteus-642 CR-002).
    func testEAMediaReferenceStaysAsItIsWhileMessagesArrive() throws {
        let app = try openTheTeamsMessages()
        referenceRow(app, "ref-642.m4a").tap()
        let player = app.otherElements["media.player"]
        XCTAssertTrue(player.waitForExistence(timeout: timeout), "the app's player opens")
        try control("POST", "/team-message")
        Thread.sleep(forTimeInterval: 6)
        XCTAssertEqual(app.otherElements.matching(identifier: "media.player").count, 1, "one player while messages arrive")
        app.buttons["media.back"].tap()
        XCTAssertTrue(wait(10) { !player.exists }, "one Back closes it")
        try control("POST", "/team-message")
        Thread.sleep(forTimeInterval: 8)
        XCTAssertFalse(player.exists, "the player does not open again by itself")
        attach(app, "reference-after-back-and-a-message")
        if player.exists { app.buttons["media.back"].tap() }
    }

    /// The other references show as they did: text, PDF and image in the page; the deleted one says so; the empty video
    /// (held: its probe answers 416) shows an error, never the player.
    func testFTheOtherReferencesShowInThePage() throws {
        let app = try openTheTeamsMessages()
        for name in ["ref-642.md", "ref-642.pdf", "ref-642.png", "gone-642.mp4", "empty-642.mp4"] {
            referenceRow(app, name).tap()
            Thread.sleep(forTimeInterval: 4)
            XCTAssertFalse(app.otherElements["media.player"].exists, "\(name): no media player")
            attach(app, "reference-\(name)")
            if name == "gone-642.mp4" { XCTAssertTrue(app.webViews.staticTexts["Reference file unavailable"].exists, "the deleted reference says so") }
            if name == "ref-642.md" { XCTAssertTrue(app.webViews.staticTexts.matching(NSPredicate(format: "label CONTAINS 'REF-642 notes'")).firstMatch.exists, "the text shows") }
            backToMessages(app)
        }
    }

    /// Types iOS's player does not list keep the page path (REQ-002): an Ogg/Opus file and a WebM video.
    func testGOggAndWebMStayInThePage() throws {
        let app = try openTheRun()
        openFiles(app)
        for name in ["song-642.ogg", "clip-642.webm"] {
            fileRow(app, name).tap()
            Thread.sleep(forTimeInterval: 5)
            XCTAssertFalse(app.otherElements["media.player"].exists, "\(name): the page path, not the app's player")
            attach(app, "page-path-\(name)")
            tapPageBack(app)
            Thread.sleep(forTimeInterval: 1)
        }
    }

    /// Each way to leave the player closes it: the app's Back and AVKit's own Close (autobyteus-642 SR-005 N-7: each ends
    /// the audio session; the simulator log is read for the session's failure lines from the host). The screen is presented
    /// full screen, which iOS gives no swipe-down dismissal: a swipe down leaves it open.
    func testHEachWayToLeaveThePlayerClosesIt() throws {
        let app = try openTheRun()
        let link = app.webViews.buttons["Open memo-642.mp3 in Files"]
        let player = app.otherElements["media.player"]
        for way in ["back", "swipe-down", "avkit-close"] {
            XCTAssertTrue(link.waitForExistence(timeout: timeout), "the chat's link to the MP3")
            link.tap()
            XCTAssertTrue(player.waitForExistence(timeout: timeout), "\(way): the app's player opens")
            Thread.sleep(forTimeInterval: 3)
            mark("close-\(way)")
            switch way {
            case "back": app.buttons["media.back"].tap()
            case "swipe-down": player.swipeDown(velocity: .fast)
            default:
                player.coordinate(withNormalizedOffset: CGVector(dx: 0.3, dy: 0.7)).tap()
                let close = app.buttons["Close Button"]
                XCTAssertTrue(close.waitForExistence(timeout: 5), "AVKit's Close")
                close.tap()
            }
            let closed = wait(10) { !player.exists }
            print("CLOSE \(way) closed=\(closed)")
            if way == "swipe-down" { XCTAssertFalse(closed, "a swipe down leaves the full-screen player open") }
            else { XCTAssertTrue(closed, "\(way) closes the player") }
            if !closed { app.buttons["media.back"].tap(); _ = wait(10) { !player.exists } }
            // The page now shows the file's viewer; its Back returns to the conversation and its link.
            Thread.sleep(forTimeInterval: 1)
            tapPageBack(app)
            Thread.sleep(forTimeInterval: 1)
        }
    }

    /// Removing the node deletes its cached media (the renamed `media-cache`; read from the host before and after).
    func testZRemovingTheNodeFromTheApp() throws {
        let app = try launchSaved()
        let header = app.webViews.otherElements.matching(NSPredicate(format: "label BEGINSWITH 'Video Test Node'")).firstMatch
        XCTAssertTrue(header.waitForExistence(timeout: timeout), "the page's node header")
        header.tap()
        let switchNode = app.webViews.buttons.matching(NSPredicate(format: "label BEGINSWITH 'Switch node'")).firstMatch
        XCTAssertTrue(switchNode.waitForExistence(timeout: 10), "Switch node")
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

    /// The Team's run screen, then its Messages (More → Messages).
    private func openTheTeamsMessages() throws -> XCUIApplication {
        let app = try launchSaved()
        let row = app.webViews.buttons.matching(NSPredicate(format: "label BEGINSWITH 'Reference Team'")).firstMatch
        if !row.waitForExistence(timeout: 20) { print("NO-TEAM-ROW\n\(app.debugDescription)") }
        row.tap()
        XCTAssertTrue(app.webViews.buttons["Back to runs"].waitForExistence(timeout: timeout), "the Team's run screen")
        let more = app.webViews.otherElements["More"].exists ? app.webViews.otherElements["More"] : app.webViews.buttons["More"]
        more.tap()
        let messages = app.webViews.menuItems["Messages"]
        if !messages.waitForExistence(timeout: 10) { print("NO-MESSAGES-MENU\n\(app.debugDescription)") }
        messages.tap()
        return app
    }

    private func referenceRow(_ app: XCUIApplication, _ name: String) -> XCUIElement {
        let row = app.webViews.buttons.matching(NSPredicate(format: "label CONTAINS %@", name)).firstMatch
        if !row.waitForExistence(timeout: 30) { print("NO-REFERENCE \(name)\n\(app.debugDescription)") }
        return row
    }

    /// From a reference's viewer back to the Messages list (the viewer's own Back), when it shows.
    private func backToMessages(_ app: XCUIApplication) {
        tapPageBack(app)
        Thread.sleep(forTimeInterval: 1)
    }

    /// The page's visible Back (screens underneath keep theirs, hidden).
    private func tapPageBack(_ app: XCUIApplication) {
        let backs = app.webViews.buttons.matching(NSPredicate(format: "label == 'Back'"))
        _ = wait(5) { backs.allElementsBoundByIndex.contains { $0.isHittable } }
        backs.allElementsBoundByIndex.first { $0.isHittable }?.tap()
    }

    private func openFiles(_ app: XCUIApplication) {
        let more = app.webViews.otherElements["More"].exists ? app.webViews.otherElements["More"] : app.webViews.buttons["More"]
        more.tap()
        let files = app.webViews.menuItems["Files"]
        XCTAssertTrue(files.waitForExistence(timeout: 10), "the menu's Files")
        files.tap()
    }

    private func fileRow(_ app: XCUIApplication, _ name: String) -> XCUIElement {
        let row = app.webViews.buttons.matching(NSPredicate(format: "label BEGINSWITH %@", name)).firstMatch
        XCTAssertTrue(row.waitForExistence(timeout: 20), "\(name) in Files")
        return row
    }

    /// The node's requests since `since` whose path contains `named`, from the stack's request log.
    /// AVKit's scrubber (its position), by its identifier. On the audio screen the first slider is AVKit's volume slider
    /// (identifier "Volume Slider", though its label also reads "Current position"), so `app.sliders.firstMatch` there
    /// moves the volume, not the position.
    private func scrubber(_ app: XCUIApplication) -> XCUIElement {
        app.sliders.matching(NSPredicate(format: "identifier == %@", "Current position")).firstMatch
    }

    private func fileRequests(since: Date, named: String) throws -> [[String: Any]] {
        let log = try controlJSON("/log?since=\(Int(since.timeIntervalSince1970 * 1000))") as? [[String: Any]] ?? []
        return log.filter { ($0["path"] as? String)?.contains(named) == true }
    }

    private func control(_ method: String, _ path: String) throws {
        let stack = try stack()
        let port = stack.info["controlPort"].map { "\($0)" } ?? ""
        var request = URLRequest(url: URL(string: "http://127.0.0.1:\(port)\(path)")!)
        request.httpMethod = method
        request.timeoutInterval = 90
        let done = expectation(description: "control \(path)")
        URLSession.shared.dataTask(with: request) { _, _, _ in done.fulfill() }.resume()
        wait(for: [done], timeout: 90)
    }

    private func controlJSON(_ path: String) throws -> Any {
        let stack = try stack()
        let port = stack.info["controlPort"].map { "\($0)" } ?? ""
        var answer: Data?
        let done = expectation(description: "control \(path)")
        URLSession.shared.dataTask(with: URL(string: "http://127.0.0.1:\(port)\(path)")!) { data, _, _ in answer = data; done.fulfill() }.resume()
        wait(for: [done], timeout: 30)
        return try JSONSerialization.jsonObject(with: answer ?? Data("[]".utf8))
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

    private func attach(_ app: XCUIApplication, _ name: String) {
        let attachment = XCTAttachment(screenshot: app.screenshot())
        attachment.name = name
        attachment.lifetime = .keepAlways
        add(attachment)
    }
}

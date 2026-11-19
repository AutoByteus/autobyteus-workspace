import XCTest

/// ios-demo-mode-279 API/E2E (temporary; added only to the fresh-start clone's UI tests, never to the repository).
/// Real use on my own simulators. The node's address and fresh pairing links come from the test runner's environment
/// (`TEST_RUNNER_API279_*`), never printed. Each test attaches screenshots.
///   API-04  testUpdateOpensTheSavedComputer: run after the shipped app saved a paired computer (no reset): the update's
///           first screen lists it, and it opens on its paired run list.
///           testTypeAnAddress / testPasteALink / testScannedPairingCode: the new first screen's three ways.
///   API-02  testShareFromSafari*: Safari → Share → AutoByteus: the extension's own sheet, then the app acts once.
///   API-05  testLargePdfDownload: the run's 40 MB PDF → Download: time until the share sheet, and the app's
///           responsiveness meanwhile.
///   API-03  testRotationKeepsTheOpenRun (iPad): the demo, a run open, rotate.
final class ApiE2E279UITests: XCTestCase {
    private let env = ProcessInfo.processInfo.environment
    private let safari = XCUIApplication(bundleIdentifier: "com.apple.mobilesafari")
    private let springboard = XCUIApplication(bundleIdentifier: "com.apple.springboard")

    override func setUp() { continueAfterFailure = false }

    // MARK: API-04

    func testUpdateOpensTheSavedComputer() {
        let app = XCUIApplication()
        app.launchEnvironment["AUTOBYTEUS_CONNECTION_TIMEOUT_SECONDS"] = "60"
        app.launch()
        // A saved, selected computer opens at launch (the app's start rule), straight on its paired run list.
        XCTAssertTrue(app.webViews.descendants(matching: .any).matching(NSPredicate(format: "label CONTAINS %@", "Fact Checker")).firstMatch.waitForExistence(timeout: 120), "It opens on its paired run list")
        attach(app, "update-opened")
        // Round 2 (IR-002): the names the page and the native screens show for the shipped app's entry.
        recordNames(app, "update")
        // Opened again from the native list: the page still shows the node's own name.
        app.descendants(matching: .any).matching(identifier: "start.row.open").firstMatch.tap()
        // The current node's page comes back as it was left: its connection sheet still open (round 2, run 3). Close it.
        let sheetName = app.webViews.staticTexts["Test Node 279"]
        if sheetName.waitForExistence(timeout: 60) { attach(app, "update-reopened-as-left") }
        // The sheet's header Close (the backdrop is the other "Close").
        let closes = app.webViews.buttons.matching(NSPredicate(format: "label == %@", "Close"))
        if closes.count > 0 { closes.element(boundBy: closes.count - 1).tap() }
        XCTAssertTrue(app.webViews.descendants(matching: .any).matching(NSPredicate(format: "label CONTAINS %@", "Fact Checker")).firstMatch.waitForExistence(timeout: 120))
        recordNames(app, "update-reopened")
    }

    func testTypeAnAddress() throws {
        let base = try XCTUnwrap(env["API279_BASE"])
        let app = launch(reset: true)
        app.buttons["start.otherWays"].tap()
        tapWhenReady(app.buttons["start.typeAddress"])
        let field = app.textFields["typeAddress.field"]
        XCTAssertTrue(field.waitForExistence(timeout: 30))
        field.tap()
        field.typeText(base)
        let ack = app.switches["typeAddress.httpAcknowledgement"]
        for _ in 0..<3 where (ack.value as? String) != "1" { ack.tap(); sleep(1) }
        XCTAssertEqual(ack.value as? String, "1")
        attach(app, "type-address-filled")
        app.buttons["typeAddress.connect"].tap()
        // An address without a pairing code: the node's page. This simulator's web view may already hold a pairing with this
        // node (earlier checks), so the page shows either its pairing screen or its run list.
        XCTAssertTrue(app.webViews.firstMatch.waitForExistence(timeout: 120))
        let pairing = app.webViews.staticTexts.containing(NSPredicate(format: "label CONTAINS[c] %@", "Connect this phone")).firstMatch
        let runs = app.webViews.descendants(matching: .any).matching(NSPredicate(format: "label CONTAINS %@", "Fact Checker")).firstMatch
        let deadline = Date().addingTimeInterval(120)
        while Date() < deadline && !pairing.exists && !runs.exists { sleep(1) }
        XCTAssertTrue(pairing.exists || runs.exists, "The node's page opens")
        attach(app, "type-address-opened")
        let landed = XCTAttachment(string: runs.exists ? "landed=run list" : "landed=pairing page"); landed.name = "type-address-landed"; landed.lifetime = .keepAlways; add(landed)
        if runs.exists { recordNames(app, "type-address") } else { recordPageTexts(app, "type-address-pairing-page"); recordNativeNames(app, "type-address", from: nil) }
        app.terminate()
        app.launchEnvironment.removeValue(forKey: "AUTOBYTEUS_RESET_SAVED_NODES")
        app.launch()
        XCTAssertTrue(app.buttons["start.row.open"].waitForExistence(timeout: 60) || app.webViews.firstMatch.waitForExistence(timeout: 30),
                      "A typed address that answered is saved")
        attach(app, "type-address-relaunch")
    }

    func testPasteALink() throws {
        let link = try XCTUnwrap(env["API279_LINK_PASTE"])
        UIPasteboard.general.string = link
        let app = launch(reset: true)
        app.buttons["start.otherWays"].tap()
        tapWhenReady(app.buttons["start.pasteLink"])
        allowPasteIfAsked()
        confirmPairing(app)
        XCTAssertTrue(app.webViews.descendants(matching: .any).matching(NSPredicate(format: "label CONTAINS %@", "Fact Checker")).firstMatch.waitForExistence(timeout: 120), "A pasted pairing link pairs and opens the run list")
        attach(app, "paste-link-paired")
        recordNames(app, "paste-link")
        app.terminate()
        app.launchEnvironment.removeValue(forKey: "AUTOBYTEUS_RESET_SAVED_NODES")
        app.launch()
        XCTAssertTrue(app.webViews.descendants(matching: .any).matching(NSPredicate(format: "label CONTAINS %@", "Fact Checker")).firstMatch.waitForExistence(timeout: 120), "Relaunch opens the saved computer")
        attach(app, "paste-link-relaunch")
        recordNames(app, "paste-link-relaunch")
    }

    func testScannedPairingCode() throws {
        let link = try XCTUnwrap(env["API279_LINK_SCAN"])
        let app = launch(reset: true, ["AUTOBYTEUS_UI_TEST_SCANNED_CODE": link])
        tapWhenReady(app.buttons["start.scan"])
        confirmPairing(app)
        XCTAssertTrue(app.webViews.descendants(matching: .any).matching(NSPredicate(format: "label CONTAINS %@", "Fact Checker")).firstMatch.waitForExistence(timeout: 120), "A scanned pairing code pairs and opens the run list")
        attach(app, "scan-paired")
        recordNames(app, "scan")
    }

    // MARK: API-02 (the share extension's own sheet, from Safari)

    /// A pairing link's page in Safari → Share → AutoByteus: "Saved. Open AutoByteus to connect."; then the app connects.
    func testShareFromSafariPairingLink() throws {
        let link = try XCTUnwrap(env["API279_LINK_SHARE"])
        launch(reset: true).terminate()
        let message = shareFromSafari(url: link)
        XCTAssertEqual(message, "Saved. Open AutoByteus to connect.")
        let app = XCUIApplication(); app.launchEnvironment["AUTOBYTEUS_CONNECTION_TIMEOUT_SECONDS"] = "60"; app.launch()
        confirmPairing(app)
        XCTAssertTrue(app.webViews.descendants(matching: .any).matching(NSPredicate(format: "label CONTAINS %@", "Fact Checker")).firstMatch.waitForExistence(timeout: 120), "The kept pairing link connects")
        attach(app, "share-pairing-link-app")
        app.terminate(); app.launch()
        XCTAssertFalse(app.webViews.staticTexts["Connecting"].waitForExistence(timeout: 5), "Used once")
        attach(app, "share-pairing-link-relaunch")
    }

    /// Another page's address → "… to use it as an address."; the app opens Type an address with it.
    func testShareFromSafariOtherText() throws {
        let page = try XCTUnwrap(env["API279_PAGE_PLAIN"])
        launch(reset: true).terminate()
        XCTAssertEqual(shareFromSafari(url: page), "Saved. Open AutoByteus to use it as an address.")
        let app = XCUIApplication(); app.launch()
        let field = app.textFields["typeAddress.field"]
        XCTAssertTrue(field.waitForExistence(timeout: 60))
        XCTAssertEqual(field.value as? String, page)
        attach(app, "share-other-text-app")
    }

    /// Text selected in a page: `autobyteus://demo` → "… to see the demo."; the app opens the demo. Whitespace only →
    /// "AutoByteus couldn’t read text or a link from this share."
    func testShareFromSafariSelectedText() throws {
        let page = try XCTUnwrap(env["API279_PAGE_TEXT"])
        launch(reset: true).terminate()
        XCTAssertEqual(shareSelection(page: page, field: "demo"), "Saved. Open AutoByteus to see the demo.")
        let app = XCUIApplication(); app.launch()
        XCTAssertTrue(app.webViews.staticTexts["Welcome to the demo"].waitForExistence(timeout: 90), "The kept demo link opens the demo")
        attach(app, "share-demo-link-app")
        app.terminate()
        XCTAssertEqual(shareSelection(page: page, field: "blank"), "AutoByteus couldn’t read text or a link from this share.")
    }

    /// Exploration (temporary): Safari's first run, a loaded page, and its controls.
    func testExploreSafari() throws {
        let page = try XCTUnwrap(env["API279_PAGE_PLAIN"])
        openInSafari(page)
        attach(safari, "explore-loaded")
        let tree = XCTAttachment(string: safari.debugDescription); tree.name = "explore-safari-tree"; tree.lifetime = .keepAlways; add(tree)
        let more = safari.buttons.matching(NSPredicate(format: "label CONTAINS[c] %@ OR identifier CONTAINS[c] %@", "More", "More")).firstMatch
        if more.exists { more.tap(); sleep(2); attach(safari, "explore-more"); let t2 = XCTAttachment(string: safari.debugDescription); t2.name = "explore-safari-more-tree"; t2.lifetime = .keepAlways; add(t2) }
    }

    /// Opens `url` in Safari past its first-run screens, and loads it.
    private func openInSafari(_ url: String) {
        safari.launch()
        for _ in 0..<3 {
            let cont = safari.buttons["Continue"]
            if cont.waitForExistence(timeout: 3) { cont.tap() } else { break }
        }
        safari.open(URL(string: url)!)
        sleep(3)
        let address = safari.textFields.firstMatch
        if address.exists, (address.value as? String)?.contains("127.0.0.1") == true, safari.keyboards.count > 0 { address.typeText("\n") }
        sleep(3)
    }

    // MARK: API-05

    func testLargePdfDownload() throws {
        let link = try XCTUnwrap(env["API279_LINK_PDF"])
        let app = launch(reset: true, ["AUTOBYTEUS_UI_TEST_SCANNED_CODE": link])
        tapWhenReady(app.buttons["start.scan"])
        confirmPairing(app)
        let row = app.webViews.descendants(matching: .any).matching(NSPredicate(format: "label CONTAINS %@", "Fact Checker")).firstMatch
        XCTAssertTrue(row.waitForExistence(timeout: 120))
        row.tap()
        // The agent's answer links the PDF (a link, or the event monitor's file button).
        let asLink = app.webViews.links.matching(NSPredicate(format: "label CONTAINS %@", "big-279.pdf")).firstMatch
        let asButton = app.webViews.buttons.matching(NSPredicate(format: "label CONTAINS %@", "big-279.pdf")).firstMatch
        let deadline = Date().addingTimeInterval(60)
        while Date() < deadline && !asLink.exists && !asButton.exists { sleep(1) }
        let fileLink = asLink.exists ? asLink : asButton
        attach(app, "pdf-conversation")
        XCTAssertTrue(fileLink.exists, "The PDF's link in the conversation")
        fileLink.tap()
        let download = app.webViews.buttons.containing(NSPredicate(format: "label CONTAINS[c] %@", "Download")).firstMatch
        XCTAssertTrue(download.waitForExistence(timeout: 120), "The viewer's Download")
        attach(app, "pdf-viewer")
        let t0 = Date()
        download.tap()
        // While the file travels to the share sheet: how long each accessibility read of the app takes (served on its main
        // thread), and when the share sheet appears.
        var reads: [Double] = []; var sheetAt: Double? = nil
        while Date().timeIntervalSince(t0) < 120 {
            let r0 = Date(); let sheet = app.otherElements["ActivityListView"].exists || app.navigationBars["UIActivityContentView"].exists || app.cells["Save to Files"].exists
            reads.append(Date().timeIntervalSince(r0))
            if sheet { sheetAt = Date().timeIntervalSince(t0); break }
        }
        attach(app, "pdf-share-sheet")
        let maxRead = reads.max() ?? 0
        let summary = XCTAttachment(string: "sheetAt=\(sheetAt.map { String(format: "%.2f", $0) } ?? "none") s; reads=\(reads.count); maxRead=\(String(format: "%.2f", maxRead)) s; reads>1s=\(reads.filter { $0 > 1 }.count)")
        summary.name = "pdf-download-timing"; summary.lifetime = .keepAlways; add(summary)
        print("API279 pdf-download-timing \(summary.name ?? "")")
        XCTAssertNotNil(sheetAt, "The share sheet with the PDF")
    }

    // MARK: API-03 (iPad)

    func testRotationKeepsTheOpenRun() {
        XCTAssertEqual(UIDevice.current.userInterfaceIdiom, .pad)
        XCUIDevice.shared.orientation = .portrait
        addTeardownBlock { XCUIDevice.shared.orientation = .portrait }
        let app = launch(reset: true)
        tapWhenReady(app.buttons["start.tryDemo"])
        XCTAssertTrue(app.webViews.staticTexts["Welcome to the demo"].waitForExistence(timeout: 90))
        // Open a top-level run, "Daily Assistant".
        let row = app.webViews.descendants(matching: .any).matching(NSPredicate(format: "label CONTAINS %@", "Daily Assistant")).firstMatch
        XCTAssertTrue(row.waitForExistence(timeout: 30))
        let runName = row.label
        row.tap()
        let composer = app.webViews.descendants(matching: .any).matching(NSPredicate(format: "label BEGINSWITH %@", "Context Files")).firstMatch
        XCTAssertTrue(composer.waitForExistence(timeout: 30), "The run is open (its composer)")
        let title0 = [String]()
        attach(app, "rotate-portrait-open")
        XCUIDevice.shared.orientation = .landscapeLeft
        sleep(3)
        XCTAssertTrue(composer.waitForExistence(timeout: 30), "Landscape: the run stays open")
        let title1 = [String]()
        attach(app, "rotate-landscape")
        XCUIDevice.shared.orientation = .portrait
        sleep(3)
        XCTAssertTrue(composer.waitForExistence(timeout: 30), "Portrait again: the run stays open")
        attach(app, "rotate-portrait-again")
        let note = XCTAttachment(string: "run=\(runName)\nportrait=\(title0)\nlandscape=\(title1)"); note.name = "rotate-texts"; note.lifetime = .keepAlways; add(note)
    }

    // MARK: names (round 2, IR-002)

    /// The node's name as the page shows it (its node button and connection sheet), then natively via the sheet's
    /// "Switch node": the start screen's rows, a row's More, its Remove sheet and the Remove confirmation. Attaches each.
    private func recordNames(_ app: XCUIApplication, _ name: String) {
        // The run list's node button (aria-label "<name>, <state>. Connection").
        let nodeButton = app.webViews.descendants(matching: .any).matching(NSPredicate(format: "label CONTAINS %@ OR label CONTAINS %@", "Connection", "Connected")).firstMatch
        if !nodeButton.waitForExistence(timeout: 30) { recordPageTexts(app, "\(name)-no-node-button") }
        XCTAssertTrue(nodeButton.exists, "The page's node button")
        var lines = ["page node button: \(nodeButton.label)"]
        nodeButton.tap()
        let switchNode = app.webViews.buttons.matching(NSPredicate(format: "label CONTAINS %@", "Switch node")).firstMatch
        XCTAssertTrue(switchNode.waitForExistence(timeout: 20), "The connection sheet's Switch node")
        sleep(1)
        attach(app, "\(name)-page-sheet")
        lines.append("page sheet texts: \(app.webViews.staticTexts.allElementsBoundByIndex.prefix(10).map(\.label))")
        note(lines, "\(name)-page-names")
        recordNativeNames(app, name, from: switchNode)
    }

    private func recordPageTexts(_ app: XCUIApplication, _ name: String) {
        note(["page texts: \(app.webViews.staticTexts.allElementsBoundByIndex.prefix(12).map(\.label))",
              "page buttons: \(app.webViews.buttons.allElementsBoundByIndex.prefix(8).map(\.label))",
              "page labelled elements: \(app.webViews.descendants(matching: .any).allElementsBoundByIndex.prefix(60).map { "\($0.elementType.rawValue):\($0.label)" }.filter { !$0.hasSuffix(":") })"], name)
    }

    /// `from`: the page's "Switch node" button; nil: the pairing page's "Back to nodes".
    private func recordNativeNames(_ app: XCUIApplication, _ name: String, from switchNode: XCUIElement?) {
        if let switchNode { switchNode.tap() } else {
            let back = app.webViews.buttons["Back to nodes"]
            XCTAssertTrue(back.waitForExistence(timeout: 20), "The pairing page's Back to nodes")
            back.tap()
        }
        let rows = app.descendants(matching: .any).matching(identifier: "start.row.open")
        XCTAssertTrue(rows.firstMatch.waitForExistence(timeout: 30), "The native start screen's saved rows")
        sleep(1)
        attach(app, "\(name)-native-start")
        var lines = ["native rows: \(rows.allElementsBoundByIndex.map(\.label))"]
        let more = app.descendants(matching: .any).matching(identifier: "start.row.more")
        lines.append("native More buttons: \(more.allElementsBoundByIndex.map(\.label))")
        more.firstMatch.tap()
        let sheet = app.descendants(matching: .any).matching(identifier: "removeNode.root").firstMatch
        XCTAssertTrue(sheet.waitForExistence(timeout: 20), "The Remove sheet")
        lines.append("remove sheet texts: \(sheet.staticTexts.allElementsBoundByIndex.map(\.label))")
        app.descendants(matching: .any).matching(identifier: "removeNode.remove").firstMatch.tap()
        sleep(1)
        attach(app, "\(name)-native-remove-confirm")
        lines.append("remove confirmation texts: \(sheet.staticTexts.allElementsBoundByIndex.map(\.label))")
        sheet.buttons["Cancel"].tap()
        XCTAssertTrue(rows.firstMatch.waitForExistence(timeout: 20))
        note(lines, "\(name)-native-names")
        let all = lines.joined(separator: "\n")
        XCTAssertFalse(all.contains("AutoByteus Desktop"), "No shipped placeholder name")
        XCTAssertFalse(all.contains("192.168."), "No address shown as a name")
    }

    private func note(_ lines: [String], _ name: String) {
        let a = XCTAttachment(string: lines.joined(separator: "\n")); a.name = name; a.lifetime = .keepAlways; add(a)
        lines.forEach { print("API279 \(name): \($0)") }
    }

    // MARK: helpers

    @discardableResult
    private func launch(reset: Bool, _ environment: [String: String] = [:]) -> XCUIApplication {
        let app = XCUIApplication()
        app.launchEnvironment["AUTOBYTEUS_CONNECTION_TIMEOUT_SECONDS"] = "60"
        if reset { app.launchEnvironment["AUTOBYTEUS_RESET_SAVED_NODES"] = "1" }
        environment.forEach { app.launchEnvironment[$0.key] = $0.value }
        app.launch()
        return app
    }

    private func tapWhenReady(_ element: XCUIElement) {
        XCTAssertTrue(element.waitForExistence(timeout: 60))
        element.tap()
    }

    /// A pairing link opens the node's pairing page, which asks for one tap ("Connect to <node>").
    private func confirmPairing(_ app: XCUIApplication) {
        let confirm = app.webViews.buttons.containing(NSPredicate(format: "label BEGINSWITH %@", "Connect to")).firstMatch
        if confirm.waitForExistence(timeout: 90) { attach(app, "pairing-page"); confirm.tap() }
    }

    private func allowPasteIfAsked() {
        // iOS's paste permission prompt (it holds the app's main thread while it waits).
        for host in [springboard, XCUIApplication()] {
            let allow = host.buttons["Allow Paste"]
            if allow.waitForExistence(timeout: 5) { allow.tap(); return }
        }
    }

    /// Opens `url` in Safari, Share → AutoByteus; returns the extension's message and closes it with Done.
    private func shareFromSafari(url: String) -> String? {
        openInSafari(url)
        attach(safari, "safari-page")
        let more = safari.buttons["More"]
        XCTAssertTrue(more.waitForExistence(timeout: 20), "Safari's More")
        more.tap()
        let share = safari.buttons["Share"]
        XCTAssertTrue(share.waitForExistence(timeout: 20), "Safari's Share")
        share.tap()
        return pickAutoByteusAndRead(in: safari, name: "safari-\(url.contains("pairing") ? "pairing-link" : "other")")
    }

    /// The test page's own Share button (the Web Share API, `navigator.share({ text })`): `demo` shares `autobyteus://demo`,
    /// `blank` only spaces; AutoByteus in the system share sheet; returns the extension's message.
    private func shareSelection(page: String, field: String) -> String? {
        openInSafari(page)
        let button = safari.webViews.buttons[field == "demo" ? "Share the demo link" : "Share blank text"]
        XCTAssertTrue(button.waitForExistence(timeout: 20), "The page's Share button")
        attach(safari, "page-\(field)")
        button.tap()
        return pickAutoByteusAndRead(in: safari, name: "page-share-\(field)")
    }

    private func pickAutoByteusAndRead(in host: XCUIApplication, name: String) -> String? {
        let target = host.cells.matching(NSPredicate(format: "label == %@", "AutoByteus")).firstMatch
        if !target.waitForExistence(timeout: 20) {
            let more = host.cells.matching(NSPredicate(format: "label == %@", "More")).firstMatch
            if more.exists { more.tap() }
        }
        XCTAssertTrue(target.waitForExistence(timeout: 20), "AutoByteus in the share sheet")
        attach(host, "\(name)-share-sheet")
        target.tap()
        let message = host.staticTexts["share.message"]
        XCTAssertTrue(message.waitForExistence(timeout: 30), "The extension's sheet")
        sleep(1)
        let text = message.label
        let preview = host.staticTexts["share.preview"].exists ? host.staticTexts["share.preview"].label : ""
        attach(host, "\(name)-extension")
        let note = XCTAttachment(string: "message=\(text)\npreviewLength=\(preview.count)"); note.name = "\(name)-extension-text"; note.lifetime = .keepAlways; add(note)
        host.buttons["share.done"].tap()
        return text
    }

    private func attach(_ app: XCUIApplication, _ name: String) {
        let a = XCTAttachment(screenshot: app.screenshot()); a.name = name; a.lifetime = .keepAlways; add(a)
    }
}

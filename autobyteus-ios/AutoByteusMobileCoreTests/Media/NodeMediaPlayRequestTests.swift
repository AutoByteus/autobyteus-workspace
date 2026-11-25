@testable import AutoByteusMobileCore
import XCTest

/// autobyteus-574 D-2, D-5 (AC-003), autobyteus-642 D-2: a page's playMedia is read as a kind the app plays, one token of
/// credential, a plain file name and an http(s) URL, and played only for a file route of the page's own node; nothing
/// prints the credential or the URL.
final class NodeMediaPlayRequestTests: XCTestCase {
    private let node = "http://192.168.1.25:29695"

    private func read(url: String, title: String = "plan.mp4", credential: String = "mra_phone_credential", kind: String? = "video") -> NodeMediaPlayRequest? {
        var object: [String: Any] = ["url": url, "title": title, "credential": credential]
        if let kind { object["kind"] = kind }
        return NodeMediaPlayRequest.read(object)
    }

    func testReadsAPlayRequestForAFileRouteOfTheNode() throws {
        let request = try XCTUnwrap(read(url: "\(node)/rest/workspaces/agent_ws_ab12/content?path=demo%2Fplan.mp4"))
        XCTAssertEqual(request.kind, .video)
        XCTAssertEqual(request.title, "plan.mp4")
        XCTAssertEqual(request.credential, "mra_phone_credential")
        XCTAssertTrue(request.isFor(nodeOrigin: node))
        XCTAssertEqual(read(url: "\(node)/rest/files/a.mp4", title: "../../etc/passwd")?.title, "", "a title that is not a plain name is dropped")
    }

    func testReadsTheKind_andRefusesARequestWithoutOneTheAppPlays() {
        let url = "\(node)/rest/workspaces/w/content?path=notes%2Fmemo.m4a"
        XCTAssertEqual(read(url: url, title: "memo.m4a", kind: "audio")?.kind, .audio)
        XCTAssertNil(read(url: url, kind: nil))
        XCTAssertNil(read(url: url, kind: "image"))
        XCTAssertNil(read(url: url, kind: "Audio"))
    }

    func testIsNotForAnotherSiteAnotherRouteOrAnotherPort() {
        for url in ["https://videos.example.com/rest/workspaces/w/content?path=a.mp4", "http://192.168.1.25:8001/rest/files/a.mp4",
                    "https://192.168.1.25:29695/rest/files/a.mp4", "\(node)/mobile/index.html", "http://user:pass@192.168.1.25:29695/rest/files/a.mp4"] {
            XCTAssertEqual(read(url: url)?.isFor(nodeOrigin: node) ?? false, false, url)
        }
        XCTAssertNil(read(url: "javascript:alert(1)"))
    }

    func testRefusesACredentialThatIsNotOneToken() {
        let url = "\(node)/rest/files/a.mp4"
        XCTAssertNil(read(url: url, credential: ""))
        XCTAssertNil(read(url: url, credential: "mra_a b"))
        XCTAssertNil(read(url: url, credential: "mra_a\nInjected: header"))
        XCTAssertNil(NodeMediaPlayRequest.read(["kind": "video", "url": url, "title": "a.mp4"]))
    }

    func testNeverPrintsTheCredentialOrTheURL() throws {
        let request = try XCTUnwrap(read(url: "\(node)/rest/workspaces/w/content?path=private%2Fplan.mp4", credential: "mra_SECRET"))
        XCTAssertFalse(String(describing: request).contains("mra_SECRET"))
        XCTAssertFalse(String(describing: request).contains("private"))
        XCTAssertTrue(String(describing: request).contains("plan.mp4"))
    }
}

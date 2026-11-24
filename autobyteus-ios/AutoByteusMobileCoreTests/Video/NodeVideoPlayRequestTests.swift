@testable import AutoByteusMobileCore
import XCTest

/// autobyteus-574 D-2, D-5 (AC-003): a page's playVideo is read as one token of credential, a plain file name and an
/// http(s) URL, and played only for a file route of the page's own node; nothing prints the credential or the URL.
final class NodeVideoPlayRequestTests: XCTestCase {
    private let node = "http://192.168.1.25:29695"

    private func read(url: String, title: String = "plan.mp4", credential: String = "mra_phone_credential") -> NodeVideoPlayRequest? {
        NodeVideoPlayRequest.read(["url": url, "title": title, "credential": credential])
    }

    func testReadsAPlayRequestForAFileRouteOfTheNode() throws {
        let request = try XCTUnwrap(read(url: "\(node)/rest/workspaces/agent_ws_ab12/content?path=demo%2Fplan.mp4"))
        XCTAssertEqual(request.title, "plan.mp4")
        XCTAssertEqual(request.credential, "mra_phone_credential")
        XCTAssertTrue(request.isFor(nodeOrigin: node))
        XCTAssertEqual(read(url: "\(node)/rest/files/a.mp4", title: "../../etc/passwd")?.title, "", "a title that is not a plain name is dropped")
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
        XCTAssertNil(NodeVideoPlayRequest.read(["url": url, "title": "a.mp4"]))
    }

    func testNeverPrintsTheCredentialOrTheURL() throws {
        let request = try XCTUnwrap(read(url: "\(node)/rest/workspaces/w/content?path=private%2Fplan.mp4", credential: "mra_SECRET"))
        XCTAssertFalse(String(describing: request).contains("mra_SECRET"))
        XCTAssertFalse(String(describing: request).contains("private"))
        XCTAssertTrue(String(describing: request).contains("plan.mp4"))
    }
}

@testable import AutoByteusMobileCore
import XCTest

/// autobyteus-574 D-4, D-5 (REQ-003, AC-003, design N-1): the player reads a node file by range with the credential only
/// in the header, only on the node's origin and its /rest/ routes, and never follows a redirect, so the credential cannot
/// reach another host. Production: NodeMediaURL, NodeMediaHTTP over a URLSession; the node is StubNodeProtocol.
final class NodeMediaHTTPTests: XCTestCase {
    private let node = "http://192.168.1.20:29695"

    override func setUp() {
        StubNodeProtocol.serve(Data((0..<1000).map { UInt8(truncatingIfNeeded: $0) }), etag: "\"1000-1\"")
    }

    private func http() -> NodeMediaHTTP {
        NodeMediaHTTP(nodeOrigin: node, credential: StubNodeProtocol.credential, configuration: StubNodeProtocol.configuration())
    }

    func testTheProbeReadsTwoBytesWithTheCredentialInTheHeaderOnly() async throws {
        let probe = try await http().probe(URL(string: "\(node)/rest/files/videos/clip.mp4")!)
        XCTAssertEqual(probe, NodeMediaHTTP.Probe(etag: "\"1000-1\"", length: 1000))
        let request = try XCTUnwrap(StubNodeProtocol.served.last)
        XCTAssertEqual(request.range, "bytes=0-1")
        XCTAssertEqual(request.authorization, "Bearer \(StubNodeProtocol.credential)")
        XCTAssertEqual(request.bytes, 2)
    }

    /// Over real sockets (a URLProtocol stub cannot stand in for a refused redirect): the node answers 302 to another
    /// server; the session does not follow it, so that server receives nothing, and the probe fails.
    func testARedirectIsRefusedAndNeverFollowed_theOtherHostReceivesNothing() async throws {
        let elsewhere = try TinyHTTPListener { _ in (200, [:], Data("stolen".utf8)) }
        defer { elsewhere.stop() }
        let redirecting = try TinyHTTPListener { _ in (302, ["Location": "\(elsewhere.origin)/rest/stolen"], Data()) }
        defer { redirecting.stop() }
        let http = NodeMediaHTTP(nodeOrigin: redirecting.origin, credential: StubNodeProtocol.credential)
        do {
            _ = try await http.probe(URL(string: "\(redirecting.origin)/rest/files/videos/clip.mp4")!)
            XCTFail("a redirect must not be followed")
        } catch {
            XCTAssertEqual(error as? NodeMediaHTTP.Failure, .redirectRefused(status: 302))
        }
        XCTAssertEqual(redirecting.requests.first?.header("Authorization"), "Bearer \(StubNodeProtocol.credential)")
        XCTAssertEqual(elsewhere.requests.count, 0, "the other server receives nothing")
    }

    func testAURLOffTheNodesOriginOrOutsideItsRestRoutesIsRefusedBeforeAnythingIsSent() async {
        for url in ["http://elsewhere.invalid/rest/files/a.mp4", "\(node)/mobile/a.mp4", "https://192.168.1.20:29695/rest/files/a.mp4"] {
            do {
                _ = try await http().probe(URL(string: url)!)
                XCTFail("refused: \(url)")
            } catch {
                XCTAssertEqual(error as? NodeMediaHTTP.Failure, .refusedURL)
            }
        }
        XCTAssertEqual(StubNodeProtocol.served, [])
    }

    /// CR-002 (API/E2E F-2): a path that resolves outside /rest/ is not a node file route, however it is spelled, and is
    /// refused before anything is sent; dots in the query (the file's own path) are fine.
    func testAPathWithDotSegmentsIsRefusedBeforeAnythingIsSent_dotsInTheQueryAreFine() async {
        let paths = ["/rest/../graphql", "/rest/%2e%2e/graphql", "/rest/../mobile/", "/rest/a%2f..%2f..%2fgraphql",
                     "/rest/./files/a.mp4", "/rest/%2E/files/a.mp4", "/rest/files%5c..%5cgraphql"]
        // (An invalid escape such as `%zz` is not a case here: `URL(string:)` encodes it as the literal `%25zz`, a plain
        // segment under /rest/.)
        for path in paths {
            guard let url = URL(string: "\(node)\(path)") else { continue }
            XCTAssertFalse(NodeMediaURL.isNodeFileURL(url, nodeOrigin: node), path)
            do {
                _ = try await http().probe(url)
                XCTFail("refused: \(path)")
            } catch {
                XCTAssertEqual(error as? NodeMediaHTTP.Failure, .refusedURL, path)
            }
        }
        XCTAssertEqual(StubNodeProtocol.served, [])
        XCTAssertTrue(NodeMediaURL.isNodeFileURL(URL(string: "\(node)/rest/workspaces/w/content?path=a%2F..%2Fb.mp4")!, nodeOrigin: node))
        XCTAssertTrue(NodeMediaURL.isNodeFileURL(URL(string: "\(node)/rest/files/videos/my..clip.mp4")!, nodeOrigin: node))
        XCTAssertEqual(NodeMediaPlayRequest.read(["kind": "video", "url": "\(node)/rest/../graphql", "title": "a.mp4", "credential": "mra_x"])?.isFor(nodeOrigin: node), false)
    }

    func testARefusedCredentialOrAMissingFileFailsTheProbe() async {
        let refused = NodeMediaHTTP(nodeOrigin: node, credential: "mra_revoked", configuration: StubNodeProtocol.configuration())
        do { _ = try await refused.probe(URL(string: "\(node)/rest/files/videos/clip.mp4")!); XCTFail("refused") } catch {
            XCTAssertEqual(error as? NodeMediaHTTP.Failure, .status(401))
        }
        do { _ = try await http().probe(URL(string: "\(node)/rest/missing")!); XCTFail("missing") } catch {
            XCTAssertEqual(error as? NodeMediaHTTP.Failure, .status(404))
        }
    }

    func testARangeIsAskedForTheVersionTheReaderHas() throws {
        let request = try http().request(URL(string: "\(node)/rest/files/a.mp4")!, first: 4_655_936, last: nil, ifRange: "\"1000-1\"")
        XCTAssertEqual(request.value(forHTTPHeaderField: "Range"), "bytes=4655936-")
        XCTAssertEqual(request.value(forHTTPHeaderField: "If-Range"), "\"1000-1\"")
        XCTAssertEqual(request.value(forHTTPHeaderField: "Authorization"), "Bearer \(StubNodeProtocol.credential)")
        XCTAssertFalse(request.url!.absoluteString.contains(StubNodeProtocol.credential))
    }

    func testNodeFileURLsAndAssetURLs() {
        XCTAssertTrue(NodeMediaURL.isNodeFileURL(URL(string: "\(node)/rest/workspaces/w/content?path=a.mp4")!, nodeOrigin: node))
        XCTAssertTrue(NodeMediaURL.isNodeFileURL(URL(string: "https://DESKTOP.example.ts.net:443/rest/files/a.mp4")!, nodeOrigin: "https://desktop.example.ts.net"))
        XCTAssertFalse(NodeMediaURL.isNodeFileURL(URL(string: "https://desktop.example.ts.net.evil.com/rest/files/a.mp4")!, nodeOrigin: "https://desktop.example.ts.net"))
        XCTAssertFalse(NodeMediaURL.isNodeFileURL(URL(string: "http://192.168.1.20:29696/rest/files/a.mp4")!, nodeOrigin: node))
        XCTAssertFalse(NodeMediaURL.isNodeFileURL(URL(string: "http://user:pass@192.168.1.20:29695/rest/files/a.mp4")!, nodeOrigin: node))
        let asset = NodeMediaURL.assetURL(for: URL(string: "\(node)/rest/files/a.mp4?x=1")!)
        XCTAssertEqual(asset?.absoluteString, "abmedia-http://192.168.1.20:29695/rest/files/a.mp4?x=1")
        XCTAssertEqual(NodeMediaURL.networkURL(for: asset!)?.absoluteString, "\(node)/rest/files/a.mp4?x=1")
        XCTAssertNil(NodeMediaURL.networkURL(for: URL(string: "\(node)/rest/files/a.mp4")!))
    }
}

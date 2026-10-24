import XCTest
import AutoByteusMobileCore

final class ConnectionValidatorTests: XCTestCase {
    private let validator = ConnectionValidator(timeoutSeconds: 1)

    func testParsesStatusWithAdditionalFields() throws {
        let json = #"{"phoneAccessEnabled":true,"pairingAvailable":true,"serverName":"Home Desktop","nodeId":"instance-1","extra":"ignored"}"#
        let status = try RemoteAccessStatus.fromJSONData(Data(json.utf8))
        XCTAssertTrue(status.phoneAccessEnabled)
        XCTAssertTrue(status.pairingAvailable)
        XCTAssertEqual("Home Desktop", status.serverName)
        XCTAssertEqual("instance-1", status.nodeID)
    }

    func testMapsDisabledStatusToRecoveryDiagnostic() throws {
        let entry = try entry("https://desktop.tailnet.ts.net/mobile")
        let data = Data(#"{"phoneAccessEnabled":false,"pairingAvailable":true,"serverName":"Home Desktop"}"#.utf8)
        let result = validator.mapStatusResponse(statusCode: 200, data: data, entry: entry)
        guard case .failed(let diagnostic) = result else { return XCTFail("Expected failed") }
        XCTAssertEqual(.phoneAccessDisabled, diagnostic.kind)
        XCTAssertTrue(diagnostic.recoveryAction.contains("Nodes -> Phone Setup"))
    }

    func testMapsHTTPStatuses() throws {
        let entry = try entry("https://desktop.tailnet.ts.net/mobile")
        let result = validator.mapStatusResponse(statusCode: 401, data: Data(), entry: entry)
        guard case .failed(let diagnostic) = result else { return XCTFail("Expected failed") }
        XCTAssertEqual(.authRequired, diagnostic.kind)
    }

    // autobyteus-290 REQ-909: no server is refused for a version number; an extra version field is ignored.
    func testDoesNotRefuseAServerForAVersionNumber() throws {
        let entry = try entry("https://desktop.tailnet.ts.net/mobile")
        let data = Data(#"{"phoneAccessEnabled":true,"pairingAvailable":true,"compatibilityVersion":0,"serverName":"Old Desktop"}"#.utf8)
        let result = validator.mapStatusResponse(statusCode: 200, data: data, entry: entry)
        guard case .reachable(_, let status) = result else { return XCTFail("Expected reachable") }
        XCTAssertEqual("Old Desktop", status.serverName)
    }

    private func entry(_ raw: String) throws -> SavedNodeEntry {
        try SavedNodeEntry.fromNormalized(NodeURLNormalizer.normalize(raw))
    }
}

import XCTest
import AutoByteusMobileCore

final class ConnectionValidatorTests: XCTestCase {
    private let validator = ConnectionValidator(timeoutSeconds: 1)

    func testParsesStatusWithAdditionalFields() throws {
        let json = #"{"phoneAccessEnabled":true,"pairingAvailable":true,"compatibilityVersion":1,"serverName":"Home Desktop","serverInstanceId":"instance-1","extra":"ignored"}"#
        let status = try RemoteAccessStatus.fromJSONData(Data(json.utf8))
        XCTAssertTrue(status.phoneAccessEnabled)
        XCTAssertTrue(status.pairingAvailable)
        XCTAssertEqual(1, status.compatibilityVersion)
        XCTAssertEqual("Home Desktop", status.serverName)
        XCTAssertEqual("instance-1", status.serverInstanceID)
    }

    func testMapsDisabledStatusToRecoveryDiagnostic() throws {
        let profile = try profile("https://desktop.tailnet.ts.net/mobile")
        let data = Data(#"{"phoneAccessEnabled":false,"pairingAvailable":true,"compatibilityVersion":1,"serverName":"Home Desktop"}"#.utf8)
        let result = validator.mapStatusResponse(statusCode: 200, data: data, profile: profile)
        guard case .failed(let diagnostic) = result else { return XCTFail("Expected failed") }
        XCTAssertEqual(.phoneAccessDisabled, diagnostic.kind)
        XCTAssertTrue(diagnostic.recoveryAction.contains("Settings -> Nodes"))
    }

    func testMapsHTTPStatuses() throws {
        let profile = try profile("https://desktop.tailnet.ts.net/mobile")
        let result = validator.mapStatusResponse(statusCode: 401, data: Data(), profile: profile)
        guard case .failed(let diagnostic) = result else { return XCTFail("Expected failed") }
        XCTAssertEqual(.authRequired, diagnostic.kind)
    }

    func testMapsIncompatibleStatus() throws {
        let profile = try profile("https://desktop.tailnet.ts.net/mobile")
        let data = Data(#"{"phoneAccessEnabled":true,"pairingAvailable":true,"compatibilityVersion":0,"serverName":"Old Desktop"}"#.utf8)
        let result = validator.mapStatusResponse(statusCode: 200, data: data, profile: profile)
        guard case .failed(let diagnostic) = result else { return XCTFail("Expected failed") }
        XCTAssertEqual(.serverVersionIncompatible, diagnostic.kind)
    }

    private func profile(_ raw: String) throws -> SavedNodeProfile {
        try SavedNodeProfile.fromNormalized(NodeURLNormalizer.normalize(raw))
    }
}

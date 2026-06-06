import XCTest
import AutoByteusMobileCore

final class PairingLinkParserTests: XCTestCase {
    func testParsesPairingURLAndSavesCleanStableMobileURL() throws {
        let payload = payloadParam(serverBaseURL: "https://Desktop.Tailnet.ts.net", serverName: "Desk")
        let parsed = try PairingLinkParser.parse("https://desktop.tailnet.ts.net/mobile?pairing=\(payload)")
        XCTAssertTrue(parsed.hasPairingPayload)
        XCTAssertEqual("https://desktop.tailnet.ts.net/mobile?pairing=\(payload)", parsed.webViewURL)
        XCTAssertEqual("https://desktop.tailnet.ts.net/mobile", parsed.profile.mobileURL)
        XCTAssertEqual("Desk", parsed.profile.displayName)
    }

    func testParsesDockerNodePairingPayloadUsingAdvertisedHTTPSOrigin() throws {
        let payload = payloadParam(serverBaseURL: "https://docker.tailnet.ts.net", serverName: "AutoByteus Docker Node")
        let parsed = try PairingLinkParser.parse("https://docker.tailnet.ts.net/mobile?pairing=\(payload)")
        XCTAssertTrue(parsed.hasPairingPayload)
        XCTAssertEqual("https://docker.tailnet.ts.net/mobile", parsed.profile.mobileURL)
        XCTAssertEqual("AutoByteus Docker Node", parsed.profile.displayName)
    }

    func testParsesRawJSONPairingPayload() throws {
        let json = #"{"version":1,"serverBaseUrl":"http://desktop.local:29695","pairingCode":"abc","expiresAt":"2026-05-21T00:00:00.000Z","serverName":"Home Desktop"}"#
        let parsed = try PairingLinkParser.parse(json)
        XCTAssertTrue(parsed.hasPairingPayload)
        XCTAssertEqual("http://desktop.local:29695/mobile", parsed.profile.mobileURL)
        XCTAssertTrue(parsed.webViewURL.hasPrefix("http://desktop.local:29695/mobile?pairing="))
        XCTAssertEqual("Home Desktop", parsed.profile.displayName)
    }

    func testTreatsPlainNodeURLAsNonPairingInput() throws {
        let parsed = try PairingLinkParser.parse("desktop.tailnet-name.ts.net/mobile")
        XCTAssertFalse(parsed.hasPairingPayload)
        XCTAssertEqual("https://desktop.tailnet-name.ts.net/mobile", parsed.webViewURL)
    }

    private func payloadParam(serverBaseURL: String, serverName: String) -> String {
        let json = #"{"version":1,"serverBaseUrl":"\#(serverBaseURL)","pairingCode":"abc","expiresAt":"2026-05-21T00:00:00.000Z","serverName":"\#(serverName)"}"#
        return Data(json.utf8).base64EncodedString()
            .replacingOccurrences(of: "+", with: "-")
            .replacingOccurrences(of: "/", with: "_")
            .replacingOccurrences(of: "=", with: "")
    }
}

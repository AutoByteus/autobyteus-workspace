import XCTest
import AutoByteusMobileCore

/// "Can't reach <node>" (autobyteus-279 REQ-001, as Android): each reason's text, Retry and Open Tailscale.
final class CantReachReasonTests: XCTestCase {
    func testReasonsFromDiagnostics() {
        XCTAssertEqual(.noSharedNetwork, CantReachReason.reason(for: ConnectionDiagnosticMapper.fromError(URLError(.cannotConnectToHost))))
        XCTAssertEqual(.phoneAccessOff, CantReachReason.reason(for: ConnectionDiagnosticMapper.phoneAccessDisabled()))
        XCTAssertEqual(.addressNotUsable, CantReachReason.reason(for: ConnectionDiagnosticMapper.invalidURL("x")))
        XCTAssertEqual(.noAnswer, CantReachReason.reason(for: ConnectionDiagnosticMapper.fromHTTPStatus(503)))
    }

    func testRetryTailscaleAndText() {
        XCTAssertTrue(CantReachReason.noSharedNetwork.offersTailscale)
        XCTAssertTrue(CantReachReason.noAnswer.canRetry)
        XCTAssertFalse(CantReachReason.notAnAutoByteusCode.canRetry)
        XCTAssertEqual("Desk didn’t answer. Check that the computer is on and awake.", CantReachReason.noAnswer.text(nodeName: "Desk"))
        XCTAssertEqual("That isn’t an AutoByteus QR code.", CantReachReason.notAnAutoByteusCode.text(nodeName: ""))
        for reason in CantReachReason.allCases {
            XCTAssertFalse(reason.text(nodeName: "Desk").contains("://"), "\(reason) names no address")
        }
    }
}

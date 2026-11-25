@testable import AutoByteusMobileCore
import AVFAudio
import XCTest

/// autobyteus-642 SR-005 (DEC-007): while the media player shows, the app's audio session is the playback category for
/// media and active, so the Ring/Silent switch does not mute it; after, it is inactive and back in the category it had
/// (N-8). Production: MediaAudioSession over the real `AVAudioSession.sharedInstance()` of the test host (the simulator;
/// iOS has no public "is active" getter, so activation is what `setActive` answers).
final class MediaAudioSessionTests: XCTestCase {
    private let session = AVAudioSession.sharedInstance()

    override func setUpWithError() throws {
        try session.setCategory(.ambient, mode: .default)
    }

    func testThePlayerSetsPlaybackWhileItShowsAndRestoresTheCategoryAfter() throws {
        let media = MediaAudioSession(session: session)
        XCTAssertTrue(media.begin(), "active while the player shows")
        XCTAssertEqual(session.category, .playback)
        XCTAssertEqual(session.mode, .moviePlayback)

        XCTAssertTrue(media.end(), "inactive after the player")
        XCTAssertEqual(session.category, .ambient, "the category in effect before")
        XCTAssertEqual(session.mode, .default)
    }

    func testEndingTwiceOrWithoutABeginChangesNothing() throws {
        let media = MediaAudioSession(session: session)
        XCTAssertTrue(media.end())
        XCTAssertEqual(session.category, .ambient)
        media.begin()
        media.begin()
        XCTAssertEqual(session.category, .playback)
        media.end()
        XCTAssertTrue(media.end())
        XCTAssertEqual(session.category, .ambient, "a second begin does not record playback as the category to restore")
    }
}

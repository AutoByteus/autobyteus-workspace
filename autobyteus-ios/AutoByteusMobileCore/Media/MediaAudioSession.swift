import AVFAudio
import Foundation

/// The app's audio session while its media player shows (autobyteus-642 SR-005, DEC-007): playback for media, so the
/// Ring/Silent switch does not silence a node's video or audio, active from when the player shows until it goes. It
/// remembers the category in effect before and puts it back after (N-8), so media the page itself plays later keeps
/// today's behavior. A failure is logged with its code only and never stops playback. No background audio: the app has
/// no background mode, so the sound stops when the app leaves the screen.
public final class MediaAudioSession {
    private let session: AVAudioSession
    private var previous: (category: AVAudioSession.Category, mode: AVAudioSession.Mode, options: AVAudioSession.CategoryOptions)?

    public init(session: AVAudioSession = .sharedInstance()) {
        self.session = session
    }

    /// The player shows: the playback category for media, and the session active. Whether it is active.
    @discardableResult
    public func begin() -> Bool {
        guard previous == nil else { return true }
        previous = (session.category, session.mode, session.categoryOptions)
        do {
            try session.setCategory(.playback, mode: .moviePlayback)
            try session.setActive(true)
            return true
        } catch {
            Self.log("could not be started", error)
            return false
        }
    }

    /// The player went: the session inactive (other apps' audio may resume) and the category it had before. Whether it
    /// was deactivated; a session still busy (`isBusy`, other audio still running) is logged and left as it is.
    @discardableResult
    public func end() -> Bool {
        guard let previous else { return true }
        self.previous = nil
        var deactivated = true
        do {
            try session.setActive(false, options: .notifyOthersOnDeactivation)
        } catch {
            Self.log("could not be ended", error)
            deactivated = false
        }
        do {
            try session.setCategory(previous.category, mode: previous.mode, options: previous.options)
        } catch {
            Self.log("category could not be restored", error)
        }
        return deactivated
    }

    private static func log(_ what: String, _ error: Error) {
        NSLog("AutoByteusMedia: the audio session %@ (code %ld)", what, (error as NSError).code)
    }
}

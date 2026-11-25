import Foundation

/// A kind of node media file the app's player plays (autobyteus-642 D-2), with the lowercase file extensions AVPlayer
/// plays for it on every iOS the app supports (17 and later): MPEG-4 and QuickTime video; MP3, AAC (in MPEG-4 or
/// ADTS), WAV, AIFF and Core Audio files. The page hands the app only these types (`hello.mediaPlayer`); any other plays
/// in the page, such as WebM, Ogg or Opus, which AVPlayer does not play. Video can turn to landscape; audio stays
/// portrait with its title and controls.
public enum MediaKind: String, CaseIterable {
    case video
    case audio

    public var extensions: [String] {
        switch self {
        case .video: return ["mp4", "m4v", "mov"]
        case .audio: return ["mp3", "m4a", "aac", "wav", "aif", "aiff", "caf"]
        }
    }
}

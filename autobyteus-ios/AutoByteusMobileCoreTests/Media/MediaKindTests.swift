@testable import AutoByteusMobileCore
import AVFoundation
import UniformTypeIdentifiers
import XCTest

/// autobyteus-642 D-2 (REQ-002): the file types the app says its player plays (`hello.mediaPlayer`) are types AVFoundation
/// plays on this iOS, and the type the loader gives AVFoundation is the type of the file the URL names, by its extension.
/// Production: MediaKind, NodeMediaURL, AVURLAsset's own list of the types it plays.
final class MediaKindTests: XCTestCase {
    private let playable = Set(AVURLAsset.audiovisualTypes().map(\.rawValue))

    func testEveryListedTypeIsOneAVFoundationPlays() throws {
        for kind in MediaKind.allCases {
            for ext in kind.extensions {
                let type = try XCTUnwrap(UTType(filenameExtension: ext), ext)
                XCTAssertTrue(playable.contains(type.identifier), "\(kind) \(ext) (\(type.identifier)) is not a type AVURLAsset plays")
                XCTAssertTrue(type.conforms(to: kind == .video ? .movie : .audio), "\(ext) is \(kind)")
            }
        }
    }

    func testWebMIsNotListed_itIsNotATypeAVFoundationPlays() throws {
        XCTAssertFalse(MediaKind.video.extensions.contains("webm"))
        XCTAssertFalse(playable.contains(try XCTUnwrap(UTType(filenameExtension: "webm")).identifier))
        // For the record: what this iOS says of the types the list leaves to the page (it differs by version; the app
        // supports iOS 17, where AVPlayer plays none of them).
        let others = ["ogg", "oga", "opus", "flac", "mkv"].map { ext in "\(ext): \(UTType(filenameExtension: ext).map { playable.contains($0.identifier) } ?? false)" }
        print("autobyteus-642 iOS \(ProcessInfo.processInfo.operatingSystemVersionString): AVURLAsset plays \(others)")
    }

    func testNamesTheFileByThePathQueryOrThePath() throws {
        let node = "http://192.168.1.20:29695"
        let cases: [(String, String, String?)] = [
            ("\(node)/rest/workspaces/w/content?path=notes%2Fmemo.m4a", "memo.m4a", "com.apple.m4a-audio"),
            ("\(node)/rest/workspaces/w/static/site/media/theme.MP3", "theme.MP3", "public.mp3"),
            ("\(node)/rest/node-files/content?path=%2Ftmp%2Fclip.mov", "clip.mov", "com.apple.quicktime-movie"),
            ("\(node)/rest/files/audio/loop.caf", "loop.caf", "com.apple.coreaudio-format"),
            ("\(node)/rest/workspaces/w/content.mp3?path=notes%2Frecording", "recording", nil),
        ]
        for (text, name, type) in cases {
            let url = try XCTUnwrap(URL(string: text))
            XCTAssertEqual(NodeMediaURL.fileName(of: url), name, text)
            XCTAssertEqual(NodeMediaURL.fileType(of: url)?.identifier, type, text)
        }
    }
}

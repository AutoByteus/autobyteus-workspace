# IMP-06 (D-2, D-4, D-5; UC-001, UC-003, AC-001, AC-003, AC-004 on iOS) the app's video player on the simulator, page to player
# command: python3 autobyteus-ios/scripts/fake-mobile-server.py --port 29874 --video <the 23.4 MB 1280x720 MP4>;
#          xcodebuild … -destination id=<the dedicated simulator> -only-testing:AutoByteusMobileUITests/NativeVideoPlayerUITests
#            AUTOBYTEUS_TEST_NODE_URL=http://127.0.0.1:29874/mobile test;
#          a second run while `xcrun simctl io <simulator> screenshot` captured the screen every 2 s;
#          xcrun simctl spawn <simulator> log show --last 30m, scanned for the credentials and the path
# commit: 648073efd9
# env: Xcode 26.1.1, iOS 26.1 simulator (iPhone 17); the fake node serves the video by range with a strong ETag, only with
#   the page's credential, at about 1.5 MB/s, and logs each request without the credential (VIDEO lines)
# date: 2026-11-24
# result: Pass (2 of 2):
#   - the page's "Play video" posts playVideo, the app's player opens, the wide video turns the screen to landscape, it
#     plays (no failure after 5 s), and Back closes it and returns to the page in portrait;
#   - a missing video says "This video could not be played." and Back returns to the page.
#   The fake node's log: every video request 206, each with the credential (authorized: true).
#   Screenshots: player-landscape-as-seen.png is the real screen (a simctl frame, turned to how the phone is held; the
#   UI test's own landscape screenshot rotates by the device orientation the test keeps at portrait, so it shows the
#   frame turned); back-to-page-portrait.png and could-not-play.png are the UI test's.
#   Simulator log: 0 lines with a credential. The video's path appears only in Apple's own networking logs
#   (com.apple.network, CFNetwork) in the app and test processes; the app's code logs no URL (a device redacts those
#   system lines as <private>).
# Observation: besides its main stream, AVFoundation asks many 64 KB ranges; one that falls in bytes the main stream is
#   still fetching (not yet cached) is fetched again (see the handoff's Known Risks).

## UI test results
Test Case '-[AutoByteusMobileUITests.NativeVideoPlayerUITests testAMissingVideoSaysItCouldNotBePlayedWithBack]' passed (21.287 seconds).
Test Case '-[AutoByteusMobileUITests.NativeVideoPlayerUITests testANodeVideoPlaysInTheAppsPlayerInLandscapeAndBackReturnsToThePageInPortrait]' passed (22.007 seconds).
** TEST SUCCEEDED **

## the fake node's video requests (first run)
VIDEO {"status": 401, "range": "bytes=0-1", "authorized": false, "bytes": 0}
VIDEO {"status": 206, "range": "bytes=0-1", "authorized": true, "bytes": 2}
VIDEO {"status": 206, "range": "bytes=0-1", "authorized": true, "bytes": 2}
VIDEO {"status": 206, "range": "bytes=0-1", "authorized": true, "bytes": 2}
VIDEO {"status": 206, "range": "bytes=2-23384107", "authorized": true, "bytes": 196608}
VIDEO {"status": 206, "range": "bytes=1638400-1703935", "authorized": true, "bytes": 65536}
VIDEO {"status": 206, "range": "bytes=1703936-1769471", "authorized": true, "bytes": 65536}
VIDEO {"status": 206, "range": "bytes=1769472-1835007", "authorized": true, "bytes": 65536}
VIDEO {"status": 206, "range": "bytes=1835008-1900543", "authorized": true, "bytes": 65536}
VIDEO {"status": 206, "range": "bytes=1900544-1966079", "authorized": true, "bytes": 65536}
VIDEO {"status": 206, "range": "bytes=2031616-2097151", "authorized": true, "bytes": 65536}
VIDEO {"status": 206, "range": "bytes=2097152-2162687", "authorized": true, "bytes": 65536}
VIDEO {"status": 206, "range": "bytes=2228224-2293759", "authorized": true, "bytes": 65536}
VIDEO {"status": 206, "range": "bytes=2162688-2228223", "authorized": true, "bytes": 65536}
VIDEO {"status": 206, "range": "bytes=2293760-2359295", "authorized": true, "bytes": 65536}
VIDEO {"status": 206, "range": "bytes=2424832-2490367", "authorized": true, "bytes": 65536}
VIDEO {"status": 206, "range": "bytes=2490368-2555903", "authorized": true, "bytes": 65536}
VIDEO {"status": 206, "range": "bytes=2359296-2424831", "authorized": true, "bytes": 65536}
VIDEO {"status": 206, "range": "bytes=131074-23384107", "authorized": true, "bytes": 9961472}
VIDEO {"status": 206, "range": "bytes=0-1", "authorized": true, "bytes": 2}
VIDEO {"status": 206, "range": "bytes=10027010-23384107", "authorized": true, "bytes": 131072}
VIDEO {"status": 206, "range": "bytes=10027010-23384107", "authorized": true, "bytes": 9699328}
… 22 VIDEO lines in all, 1 without the credential (the two curl checks before the run)

## simulator log scan
lines with a credential: 0
path lines by process and subsystem:    2 AutoByteus [com.apple.CFNetwork:Default]
path lines by process and subsystem:   54 AutoByteus [com.apple.network:connection]
path lines by process and subsystem:   25 xctest [com.apple.CFNetwork:Default]
path lines by process and subsystem:    9 xctest [com.apple.network:connection]

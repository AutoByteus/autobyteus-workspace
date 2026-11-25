# IMP-005: iOS's own player screen against the fake node (AC-003, AC-004, D-3, D-4)

- Commit: `da70e7f049` (the run's working tree equals it).
- Environment: Xcode on macOS arm64; my own simulator `ie647-iphone` (iPhone 17 Pro, iOS 26.1; created for this ticket, deleted afterwards; another agent's booted simulator untouched); the fake node `python3 autobyteus-ios/scripts/fake-mobile-server.py --host 127.0.0.1 --port <p> --video <tmp>/media/wide.mp4 --audio <tmp>/media/memo.mp3` (a 30 s 1280×720 MP4, a 120 s MP3), stopped afterwards.
- Date: 2026-11-25.
- Result: **Pass**, after two D-3 bugs found and fixed (below).

## Commands

```
xcodebuild -project AutoByteusMobile.xcodeproj -scheme AutoByteusMobile -destination id=<my simulator> \
  -derivedDataPath <tmp>/dd -resultBundlePath <tmp>/ui-fake.xcresult \
  -only-testing:AutoByteusMobileUITests/NativeMediaPlayerUITests AUTOBYTEUS_TEST_NODE_URL=http://127.0.0.1:<p>/mobile test
```

Also `-only-testing:AutoByteusMobileCoreTests` with `TEST_RUNNER_AUTOBYTEUS_574_VIDEO=<tmp>/media/big60.mp4` (60 s, 30 MB): **91 tests, 0 failures** (with the D-4 queue label).

## Final run

| Test | Result |
|---|---|
| `testAMissingVideoSaysItCouldNotBePlayedWithBack` | passed |
| `testANodeAudioFilePlaysInTheAppsPlayerInPortraitWithItsTitle` | passed |
| `testANodeVideoPlaysInTheAppsPlayerInLandscapeAndItsCloseReturnsToThePageInPortrait` | passed |
| `testASwipeDownClosesThePlayerAndThePageShowsAgain` | passed |

Screenshots:
- `player-landscape-as-seen.png`: a `simctl io screenshot` frame taken during the video test, turned to how the phone is held. iOS's player fills the landscape screen, status bar hidden, with its close button, the title `clip.mp4` and its scrubber; no app bar. (The UI test's own landscape screenshot is drawn sideways, because the test keeps the device orientation at portrait; 574 IMP-06 notes the same.)
- `audio-portrait.png`, `audio-controls.png`: the MP3 in portrait; with controls shown: iOS's close, the title `memo.mp3`, the audio symbol and the name, the scrubber; no app bar.
- `back-to-page-portrait.png`: after iOS's close, the page in portrait.
- `could-not-play.png`: a missing file says "This video could not be played." with the app's Back.

## The first run failed: two D-3 bugs, found with temporary diagnostics (removed)

First run (same command): 1 passed, 3 failed: the video never turned to landscape, and neither iOS's close nor a swipe down closed the screens. Temporary `NSLog` lines in the player and a temporary UI test that printed the element tree before and after the close tap (both removed before the commit) showed:

1. **A presentation during this screen's own presentation.** On the fast local node the item was ready, and its size known, before this screen had finished appearing. `present(player)` ran mid-transition; `viewDidAppear` then saw "presented, but nothing on top" and took it for iOS's player having closed, called `dismiss` (which, with a child presented, dismisses the child), and the player was presented a second time. In that state iOS's close button was hittable but closed nothing. Fix: present only after `viewDidAppear` (`appeared`), and count iOS's player as shown only in the presentation's completion (`playerShown`); only a shown player that is gone means it was closed.
2. **The landscape request went nowhere.** The first request failed (`UISceneErrorDomain 101 … Supported: portrait`: the page under this screen was still the one asked). Asked again once the player showed, it did nothing: while a full-screen controller is presented, the presenting screen's view leaves the window, so `view.window?.windowScene` was nil. Fix: ask for landscape once iOS's player shows, through the player's own window scene. Logged after the fix: scene orientation landscape, bounds 874×402, iOS's player allows portrait and both landscapes (mask 26).

Neither escalation trigger fired: AVKit accepts landscape when it is asked through its own scene, and its closing (close button or swipe down) is seen reliably as this screen appearing again.

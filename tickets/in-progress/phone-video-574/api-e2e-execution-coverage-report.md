# API/E2E Execution Coverage Report

## Round

- Coverage investigation (the plan; it lists the upstream documents): `api-e2e-coverage-investigation.md`
- API/E2E revision record and current revision ID: `api-e2e-revision-record.md` / `API-REV-003`
- Test progress log: `api-e2e-test-progress.md`
- Round and trigger: Round 3; `/delivery_engineer` DR-001 asked to attribute O-4 (the iOS scrubber freeze) with three controls, on the branch tip `ad813b4e6d` (product code unchanged since `64a99bbcd2`). Round 2: `/code_reviewer` CRR-003 Pass (targeted delta, 9.4/10) on IR-002, code head `64a99bbcd2`: `fb2357dc09` (CR-001 = my F-1, web), `6479a28f4b` (CR-002 = my F-2, both apps). Round 1: CRR-001 Pass on `b0a2eeacc0` (base `4b73fccae2`); DEC-006 (`e9918a41a5`) decided during it
- Prior round reviewed: round 2 (API-REV-002, Pass); rounds 1 and 2 rows below are kept as run
- Deviations from the investigation's plan, and why: none in scope. Two harness defects of my own stack were found and fixed before any result was kept (progress log 14:40, 15:23)
- Evidence folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/phone-video-574/tickets/in-progress/phone-video-574/evidence/api-e2e/`

## Routing Classification

- Task size: `Large`
- Architectural risk: `High`
- Input route: `Reviewed`
- Successful-output route: `Code Review`
- Proportional test-code review decision: `Required` (new: `native-video-node.mjs`, `NativeVideoRealNodeUITests.swift`)

## Tested Builds And Environments

| Env ID | Commit Tested | Platform / OS | Runtime, Browser, Or App Build | Other Settings That Matter |
| --- | --- | --- | --- | --- |
| ENV-1 | `b0a2eeacc0` | macOS 26 (Darwin 25.5.0) arm64, Node 22.23.1 | server `dist`, phone bundle; `native-video-node.mjs` (real node behind a logging proxy, 1.5 MB/s on file routes; 22.9 MB 1280×720 30 s and 4.2 MB 720×1280 test videos with a timecode) | clean env `env -i PATH HOME=<tmp> TMPDIR=<tmp>`; test-owned root; scripted AGY |
| ENV-2 | `b0a2eeacc0` app (debug) | Android emulator, own AVD `api574_video` (API 35, arm64), `-port 5580 -no-window -gpu swiftshader_indirect` | the app paired with ENV-1 at `10.0.2.2` | software GL (`swiftshader`/`swangle`); deleted after the run |
| ENV-2b | base `4b73fccae2` app (debug) | as ENV-2 | the app before this change, against ENV-1's page | installed over the new app; reinstalled after |
| ENV-3 | `b0a2eeacc0` app (Debug) | iOS simulator, own device `api574-iphone` (iPhone 17, iOS 26.1), Xcode 26.1.1 | the app paired with ENV-1 at the LAN address (`--listen-host`); XCUITest; `simctl io recordVideo` | deleted after the run; other agents' iPhone 17 and iPhone 16e not touched |
| ENV-4 | `b0a2eeacc0` | as ENV-1 | Chrome (headless) with the owner credential on its requests, against a real node | the desktop renderer's engine |
| ENV-5 | `b0a2eeacc0` | as ENV-1 | whole phone probe; server integration and E2E | clean env; short `TMPDIR` |
| R2 | `64a99bbcd2` | as ENV-1…ENV-5 | rebuilt phone bundle, Android app, iOS app; AVD `api574_r2` (`-port 5584`, host GPU); simulator `api574-r2` | ENV-2/ENV-3 roles; both deleted after |

## Cases

## Round 3 Cases (O-4 attribution; product code `64a99bbcd2`)

Own simulator `api574-o4` (iPhone 17, iOS 26.1), a fresh stack, the same 30 s 22.9 MB `wide-574.mp4` (a byte-identical local copy for the plain runs). Temporary harness changes, reverted before the commit:
- a launch-environment switch in `NativeVideoPlayer.start` that plays a local file through the same screen with no loader (the only difference from the shipped path);
- loader request logging;
- an `isEntireLengthAvailableOnDemand` switch;
- two control test files.

| Case ID | Criteria | Boundary / Surface | Command Or Steps | Env | Result | Evidence Files | Look For | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| R3-O4-a | AC-001 (seek), O-4 | IOS-6's drag (`slider.adjust(0.5)`, the same steps and timing): the loader vs the plain file in the same screen | a temporary UI test, 2 runs each, recorded | ENV-3 | **Fail (F-3)** | `R3-O4/strip-A.png`, `strip-C.png` (loader), `strip-B.png`, `strip-D.png` (plain), `a-ui-runs.log` | loader, first open and fully cached: the picture **stops at 15.533** after the drag and stays (to +7 s); plain file: plays on 15.367 → 21.867 in both runs | the grey rectangle is the test pattern's own moving square (also in the plain frames, e.g. B at 4.5 s), not a damaged frame |
| R3-O4-b | AC-001, O-4 | decoded pixels: the loader's frames vs the plain file's at the same item times | a temporary XCTest (`AVPlayerItemVideoOutput`, BGRA, SHA-256 per frame): 6 precise seeks (15.0, 15.533, 15.2, 3.6, 20.0, 7.0), then a scrub-like burst (20 precise seeks 70 ms apart) and 4 s of play | ENV-3 | Pass | `R3-O4/b-c-frames-and-bytes.log` | every seek frame identical; after the burst 105 frames at the same times, 0 differing | no damaged frame from the loader |
| R3-O4-c | AC-001, O-4 | bytes: every range the loader served and every range its cache holds vs the file | the same test: the stub's 72 served ranges (cancelled ones included), then the cache read back against the file | ENV-3 | Pass | `R3-O4/b-c-frames-and-bytes.log` | cache 16,646,146 bytes in 5 ranges; chunks differing from the file: 0 | the loader hands AVFoundation the same `Data` it writes to the cache |
| R3-O4-d | O-4 (diagnosis) | what the loader is asked during an AVKit scrub | temporary loader logging, a cached run | ENV-3 | — | `R3-O4/loader-requests-during-scrub.txt` | from the cache the loader answers `offset=0 toEnd=1` (the whole 22.9 MB) in 17 ms and one more to-end request; **no request during or after the scrub**: nothing is pending, yet the picture stops | not a starved decoder |
| R3-O4-e | O-4 (diagnosis) | the same drag with `contentInformationRequest.isEntireLengthAvailableOnDemand = true` | temporary switch, 2 runs, recorded, with a loader run without it in between | ENV-3 | — | `R3-O4/strip-E.png`, `strip-C2-E2.png`, `on-demand-runs.log` | with the flag: plays on (17.133 → 22.133; 15.767 → 20.733); without it, in between: stops again (16.000) | a lead for the fix, not a verified fix |
| R3-IOS-2 | AC-001 (seek) | the durable `testAWideVideoFromTheChatLink` with a new picture check (with the controls hidden, two screenshots 1 s apart must differ) | `xcodebuild … -only-testing:…/testAWideVideoFromTheChatLink` on the clean tree | ENV-3 | Fail (F-3, as intended) | `R3-O4/picture-check.log` | fails at line 49 on the shipped loader; the same check reads "moves" on the plain file and on the loader with the flag | the round-1/2 version read only the scrubber value, which advances while frozen |

Round 1 and 2 rows (kept as run; IOS-6 is now F-3):

## Round 2 Cases (IR-002, code head `64a99bbcd2`)

Rebuilt from `64a99bbcd2`: the phone bundle (`build:mobile-web`, after rebuilding the contract packages' missing `dist/`), the Android debug app, the iOS app. The server is unchanged since round 1.

| Case ID | Criteria | Boundary / Surface | Command Or Steps | Env | Result | Evidence Files | Look For | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| R2-AND-8 | AC-003 (refusal), F-2 | Android bridge `playVideo` from the page | `ac003-r2.mjs` (round 1's nine URLs) on a new AVD `api574_r2` (`-port 5584`, host GPU), fresh stack and pairing | ENV-1, ENV-2 | Pass | `R2-android/ac003-r2.json` | `/rest/../graphql`, `/rest/%2e%2e/graphql`, `/rest/../mobile/`, and the five others: no player (0 → 0) and no request but the page's own `GET /rest/health` / `POST /graphql` polling; the positive control `/rest/files/…` opens the player (`bytes=0-1` 206, a ranged read, phone header) | — |
| R2-AND-9 | UC-001, D-2, F-1 | Android: a rewrite while the viewer is open | open the wide video from Files; `POST /rewrite` with the player open; Back; `POST /rewrite`; Play; the same file tapped again; another file; the chat link | ENV-2 | Pass | `R2-android/rewrite-while-open-2.png`, `rewrite-while-closed-2.png`, `play-after-rewrite.png`, `same-file-again.png`, `other-file.png`, `chat-link.png` | `VideoPlayerActivity` in the task's history: open 1 → after the rewrite 1 → one Back 0 → after a rewrite while closed 0 (the viewer shows Play); Play: probe + 200 of the new ETag `"2244077-…"`, CHANGED-574 plays; the same file tapped again: the viewer with Play (CRR-003's expected change); another file and the chat link: the player opens by itself (1), one Back closes it | a first count of mine matched another `dumpsys` section; the counts above read the task's `Hist` entries |
| R2-IOS-9 | AC-003 (refusal), F-2 | iOS route check and `NodeVideoHTTP` against the real proxy | a temporary XCTest (dummy credential), deleted after | ENV-1, ENV-3 | Pass | `R2-ios/r2-route-check.txt`, `R2-ios/proxy-log.json` | refused before sending: `/rest/../graphql`, `/rest/%2e%2e/graphql`, `/rest/%2E%2E/graphql`, `/rest/../mobile/`, `/rest/./files/…`, `/rest/files%2F..%2F..%2Fgraphql`, `/graphql`; the only request the proxy saw: `/rest/files/video/media-574.mp4` (401, dummy credential) | — |
| R2-IOS-13 | AC-001, AC-002, AC-004, F-1 | the durable class on a fresh stack, new simulator `api574-r2` | `xcodebuild … -only-testing:AutoByteusMobileUITests/NativeVideoRealNodeUITests` | ENV-1, ENV-3 | Pass | `R2-ios/r2-class-summary.log` | `Executed 7 tests, with 0 failures`: pairing, chat link (seek, Back), skip, Files tall, `testDARewriteDoesNotOpenThePlayerByItself` (R2-IOS-11), the player's Close, node removal | — |
| R2-IOS-U | unit | iOS core tests on my simulator | `xcodebuild … -only-testing:AutoByteusMobileCoreTests` | ENV-3 | Pass | `R2-ios/r2-core-summary.log`, `r2-loader-60s.log` | 75 core tests pass (76 with the temporary route check); `AuthorizedMediaLoaderTests` with a 60 s 30.5 MB video: `playing after 1.47 s; at the middle 0.33 s after the seek`; reopen `fetched again of the cached: 0` | with my 30 s stack video it cannot pass (it seeks to 30 s): a fixture length, not the product |
| R2-AND-U | unit | Android JVM tests | `./gradlew :app:testDebugUnitTest` | ENV-5 | Pass | `R2-checks/android-unit.log` | `tests 129 skipped 0 failed 0` (incl. `NodeVideoHttpTest`, `ShellBridgeMessagesTest`) | — |
| R2-WEB-U | unit | web video specs | `vitest run` the viewer, playback and segment specs | ENV-5 | Pass | `R2-checks/web-specs.log` | `Test Files 24 passed (24)`, `Tests 200 passed (200)` | — |
| R2-MSP-89…92 | AC-006 | phone media in a plain browser (the changed viewer) | `mobile-shell-probe.mjs --cases=MSP-89,MSP-90,MSP-91,MSP-92` | ENV-5 | Pass | `R2-checks/media-probe.json`, `R2-media-probe-console.log` | all four `Pass`; `unknownBrowserErrors: 0` | the rest of the probe touches no changed code |

Round 1 rows (kept as run; F-1 and F-2 are resolved by the round-2 rows above):

| Case ID | Criteria | Boundary / Surface | Command Or Steps | Env | Result | Evidence Files | Look For | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| AC5-1 | AC-005, DEC-006 | workspace content, workspace static, node-files, `/rest/files/video/media-574.mp4` on the real node | `ac005.mjs` through the stack's `/fetch` (owner credential, unthrottled) | ENV-1 | Pass | `AC-005/ac005.log` | each route: 200 `Accept-Ranges: bytes`, `ETag "size-mtimeMs"`, `Cache-Control: no-cache`; 206 for `bytes=100-199`, `1000-`, `-500` with the file's exact bytes (SHA-256); 416 `bytes */22866620`; 304 on `If-None-Match`; 200 for a multi-range request; 401 without a credential | — |
| AND-1 | AC-001, AC-003 | Android: chat link and Files → the app's player (Media3) | pair by a share intent; tap the chat's file link / ⋮ → Files → the file (raw CDP to the WebView); proxy `/log` | ENV-1, ENV-2 | Pass (observation O-6) | `stacks/android-proxy-log.json`, `android/opens/*/result.json` | the player opens by itself from the viewer; `bytes=0-1` 206, then one unranged 200 read progressively; `credential: phone`, `urlCredential: false` on all 32 file requests | O-6: AC-001 says "ranged requests (206)"; Media3's first read is one unranged 200 after the probe (IMP-04 shows the same) |
| AND-2 | AC-001 (start time) | Android emulator timing | tap time from the WebView's `Date.now()`; logcat `-v epoch` ("Displayed …VideoPlayerActivity"); screen recording, first bright frame in the video area | ENV-2 | Observation (O-5) | `android/opens/files-tall-cold/result.json`, `chat-wide-reopen/result.json` | Files, cold: tap → activity started 307 ms, → Displayed 696 ms, → first visible video frame 2,956 ms; chat reopen fetching 0 bytes: Displayed 1,025 ms, first frame 3,345 ms; logcat `Skipped 35 frames`, `Davey! duration=713ms / 870ms` | the cached reopen is as slow as the cold open, so the wait is the emulator's software rendering, not the network or the loader. See AND-2b |
| AND-2b | AC-001 (start time) | Android emulator with host GPU rendering | a new AVD `api574_gpu` (`-port 5582 -no-window -gpu host`, `gles_mode_selected:host`), a fresh stack and pairing; `android-open.mjs`; the timecode read from the recording | ENV-1, ENV-2 (host GPU) | Pass | `android/opens-host-gpu/*/result.json`, `strip.png`, `emulator-gpu-mode.txt`; `stacks/android-gpu-proxy-log.json` | from the tap: Files tall, cold: Displayed 0.50 s, first frame about 1.2 s, timecode moving about 1.4 s; chat link wide, cold: Displayed 0.28 s, first frame about 1.2 s, moving about 1.7 s; reopen: viewer → playing 0.4 s, requests only `bytes=0-1` | AC-001's < 2 s holds on Android with GPU rendering; AND-2's 2.3–3.3 s was the software GL |
| AND-3 | AC-001 (seek) | Android: a tap on the time bar at the middle | `android-seek.mjs` | ENV-2 | Pass | `android/seek/seek-to-middle-strip.png` | `bytes=10960106-22875115` 206 with the phone header 0.9 s after the tap; timecode 15.000 → 15.967 → 16.933 → 17.933 at +1/+2/+3 s | about 1.7 s from the tap to playing at the middle |
| AND-4 | AC-002 | Android reopen; changed file | reopen the wide video; `POST /rewrite`, reopen | ENV-2 | Pass | `android/rewrite/changed-file-reopen.png`, proxy log | reopen: only the 2-byte probe (0 bytes of video); changed: new ETag `"2244136-…"`, probe + 200, the screen shows CHANGED-574 | — |
| AND-5 | AC-004 | Android native full screen | the player's full-screen button; exit | ENV-2 | Pass | `android/fullscreen/*.png` | `mCurrentRotation=ROTATION_90`; statusBars and navigationBars `visible=false`; the video fills the height; exit `ROTATION_0`, position kept | the system's one-time "Viewing full screen" hint shows |
| AND-6 | AC-004 (DEC-004) | Android in-page video full screen | a `<video>` in the page (blob of the tall file) playing; `requestFullscreen()`; `exitFullscreen()` | ENV-2 | Pass | `android/inpage-fullscreen/*.png` | `ROTATION_90`, bars `visible=false`; exit `ROTATION_0`; `{ before: 7.877, after: 9.245, paused: false }` | a tall in-page video also turns to landscape (DEC-004 as designed) |
| AND-7 | AC-003 | Android logs and storage | credential read from the page's storage in memory; occurrences counted | ENV-2 | Pass | `credential-scans/summary.txt` | 0 in logcat (all buffers), `cache/video-cache` + Media3's database (196 MB tar), the proxy log, the stack log; cache keys are SHA-256 hashes (`7f61944c…:…`) | — |
| AND-8 | AC-003 (refusal) | Android bridge: `playVideo` posted by the page | `ac003.mjs`: `window.AutoByteusShell.postMessage` with the real credential; a listener on another origin; the proxy log; `dumpsys` player count | ENV-2 | **Fail (F-2)** | `android/ac003/ac003-android-2.json` | refused, nothing sent: another port, userinfo trick, `https`, `/graphql`, `/mobile/…`. **Let through:** `/rest/../graphql` and `/rest/%2e%2e/graphql` → a player opens and `GET /graphql` with `bytes=0-1` and the phone header reaches the node (400); `/rest/../mobile/` → `GET /mobile/` 200 twice with the header | same origin only: no request to another origin in any case |
| AND-9 | UC-001, D-2 | Android: a file rewritten while its viewer is open (live refresh) | open the wide video from Files; `POST /rewrite` with the player open; again after Back | ENV-2 | **Fail (F-1)** | `android/rewrite/rewrite-while-open.png`, `rewrite-while-closed.png` | open: a second `VideoPlayerActivity` on top (1 → 2), two Backs needed; closed: the player pops up by itself (0 → 1); requests `bytes=0-1` 206, `null` 200 each time | — |
| AND-10 | R-2 | Android: night mode switched during playback | `cmd uimode night yes`, then `no`; Back; Play again | ENV-2 | Pass with observation (O-1) | `android/dark-mode/strip.png`, `4-after-back.png`, `5-play-again.png` | the player is recreated and says "This video could not be played." (stays so after `night no`); Back returns to the viewer; Play plays at once from the cache, fetching only the unfetched gap `bytes=10028448-10960105` (931 KB) | the reviewer's prediction holds |
| AND-11 | AC-006 | the app before this change against the new page | build the app at `4b73fccae2`; `install -r -d`; open the tall video from Files | ENV-1, ENV-2b | Pass | `android/old-app/*.png` | `hello` reply without `videoPlayer`; the page's own `<video>` with `blob:` src; one 200 of 4,228,009 bytes with the phone header; no `VideoPlayerActivity` | the new app reinstalled after |
| AND-12 | AC-002 (D-7) | Android node removal | the page's node list → More → Remove → Remove | ENV-2 | Pass | `android/remove-node/before.txt`, `after.txt` | `cache/video-cache` 206,960 KB, 49 `.exo` files → 92 KB, 0 files; Media3's database rewritten at the removal | — |
| AND-13 | AC-001 (media message URL form), DEC-006 | Android: `/rest/files/video/media-574.mp4` through the bridge | `ac003.mjs` positive control | ENV-2 | Pass | `android/ac003/ac003-android-2.json` | a player opens; `bytes=0-1` 206 and a ranged read, phone header | the URL a media message carries plays natively |
| IOS-1 | — | iOS pairing | `test0PairsWithTheNodeByItsLink`: `autobyteus://open?input=<link>` | ENV-1, ENV-3 | Pass | `ios/full-class/full-class-summary.log` | the paired node's run list | — |
| IOS-2 | AC-001, AC-004, R-1, R-3 | iOS chat link → the app's player (AVPlayer) | `testAWideVideoFromTheChatLink` with a recording | ENV-3 | Pass (observations O-2, O-3) | `ios/strips/chat-wide-cold-start.png`, `full-class-cold-start.png`, `landscape-r1-back-bar.png` | cold, first open of a fresh stack: the tap's first response ("Opening…") → first video frame 0.31 s → playing (timecode moving) 1.37 s; landscape; requests all 206 with the phone header (`bytes=0-1` ×2, `2-`, `131074-` streaming) | R-3: under 2 s in the app (the headless 2.2–2.4 s was not the app's). R-1: the "‹ Back wide-574.mp4" bar stays over the video's top-left with the controls hidden |
| IOS-3 | AC-001, AC-004 | iOS Files → a tall video | `testCTallVideoFromFilesStaysPortrait` | ENV-3 | Pass | `ios/strips/files-tall-start.png` | portrait; first frame 0.17 s, playing 1.28 s after the tap's first response | — |
| IOS-4 | AC-002 | iOS reopen | reopen the wide video | ENV-3 | Pass | `ios/strips/chat-wide-reopen-start.png`, `stacks/ios-1-proxy-log.json` | only `bytes=0-1` (2 bytes) | — |
| IOS-5 | AC-002 | iOS changed file | `POST /rewrite`; the player opens (F-1) | ENV-3 | Pass | `ios/strips/f1-rewrite-while-closed.png` | new ETag `"2243934-…"`, `bytes=2-2243933` fetched; the screen shows CHANGED-574 | — |
| IOS-6 | AC-001 (seek) | iOS scrubber dragged to the middle | `slider.adjust(toNormalizedSliderPosition: 0.5)`; recording | ENV-3 | Observation (O-4) | `ios/strips/scrub-to-middle-frozen.png`, `scrub-cached-frozen.png`, `scrub-fresh-frozen.png`, `scrub-back-pause-resume.png` | the picture shows 15.0 within about 1 s of the drag, then **stays at 15.533** while the scrubber's value moves on (17 → 18 s); the same on a fresh file (15.200), scrubbing back (3.6), and after pause and resume; no request is sent | not attributable here: see IOS-7 and IOS-8 |
| IOS-7 | AC-001 (seek) | iOS skip forward (+10 s) | `testBSkipForwardPlaysOn`; recording | ENV-3 | Pass | `ios/strips/skip-forward-plays.png` | the picture moves on from 7 s to 17 s and keeps playing (17.133 → 21.733 over 5 s) | — |
| IOS-8 | AC-001 (seek) | control: AVPlayer through the app's loader, no UI | a temporary XCTest: frames from `AVPlayerItemVideoOutput` after a precise seek and after 20 precise seeks 70 ms apart (a scrub), loader vs a plain file | ENV-3 | Pass | `ios/scrub-control/scrub-control.txt` | loader: precise seek 96 frames in 4 s (last 18.44 s); rapid seeks 125 frames in 5 s (last 19.14 s); file: 120 / 150 frames | the loader keeps delivering frames after precise and rapid seeks |
| IOS-9 | AC-003 (refusal) | iOS route check (`NodeVideoURL.isNodeFileURL`) and what `NodeVideoHTTP` sends | a temporary XCTest against the real proxy with a dummy credential (never the phone's) | ENV-1, ENV-3 | **Fail (F-2)** | `ios/route-check/route-check.txt`, `stacks/ios-1-proxy-log.json` | allowed and sent unchanged with the header: `/rest/../graphql`, `/rest/%2e%2e/graphql` (`url.path` = `/rest/../graphql`), `/rest/../mobile/`; refused before sending: `/graphql` | the page's bridge on iOS is not scriptable here (no Web Inspector on the node's WebView); the check and the sender are the ones the bridge uses (`NodeVideoPlayRequest.isFor`, `NodeVideoHTTP.request`) |
| IOS-10 | AC-003 | iOS logs and storage | `ios-credscan.mjs`: credential from the WebView's localStorage in memory | ENV-3 | Pass | `credential-scans/summary.txt` | 0 in 2,772 files: the simulator log since 15:23 (92,787 lines), `Library/Caches/video-cache`, `Preferences`, `Documents`, the proxy and stack logs, every test result and recording; 23 file requests all 206 with the header, none in a URL | the page's own localStorage holds it by design (DEC-002) |
| IOS-11 | UC-001, D-2 | iOS: a rewrite while the viewer is open | `testDARewriteDoesNotOpenThePlayerByItself` | ENV-3 | **Fail (F-1)** | `ios/strips/f1-rewrite-while-open.png`, `f1-rewrite-while-closed.png`, `ios/full-class/full-class-summary.log` | after Back, a rewrite opens the player by itself (line 109's assertion); while it plays, a new probe is sent but no second player shows (the old content keeps playing) | the page's rule, so both apps |
| IOS-12 | AC-002 (D-7) | iOS node removal | `testZRemovingTheNodeFromTheApp` | ENV-3 | Pass | `ios/remove-node/before-2.txt`, `after-2.txt` | `video-cache` 28,656 KB, 6 files → 0, folder modified at the removal (15:46:10) | a first attempt read a container a reinstall had moved; repeated cleanly |
| IOS-13 | as IOS-1…12 | the durable class on one fresh stack | `xcodebuild … -only-testing:AutoByteusMobileUITests/NativeVideoRealNodeUITests` | ENV-1, ENV-3 | Fail (F-1, as intended) | `ios/full-class/full-class-summary.log` | `test0…`, `testA…`, `testB…`, `testC…` passed; `testDA…` failed on F-1; `testZ…` passed after its path fix | — |
| IOS-14 | AC-004 | iOS: AVPlayerViewController's own Close (X), shown with its controls beside the app's Back | `testEThePlayersOwnCloseButton` (after `test0…` on a fresh stack) | ENV-1, ENV-3 | Pass | `ios/full-class/close-x-summary.log` | the player closes, the phone returns to portrait, the page's viewer (Files › wide-574.mp4) shows again: as Back | two close controls in landscape (X and Back): R-1's remedy could use the X |
| DSK-1 | AC-005 (desktop), AC-006 | Chromium with the owner credential, as the desktop's renderer | `desktop-rewrite.mjs`: fetch a workspace file twice, rewrite it, fetch again (text and 300 KB binary) | ENV-4 | Pass | `desktop-rewrite/desktop-rewrite.json` | `"26-…"` FIRST VERSION → after the rewrite `"37-…"` SECOND VERSION; binary 300,000 → 200,000 bytes; `Cache-Control: no-cache` | the HTTP cache revalidates: no stale copy |
| WS-1 | AC-006; regression | whole `test:e2e:mobile-shell` | `env -i … node tests/e2e/mobile-shell-probe.mjs` | ENV-5 | Pass for this ticket (6 outside) | `WS-1-whole-phone-probe/` | 103 cases, 97 Pass; MSP-89, 90, 91, 92 Pass; failing MSP-17, 58, 65, 82, 87 (628 FU-002) and MSP-61 (609 FU-006), the same messages as on the base in those tickets; `unknownBrowserErrors: 0` | — |
| SI-1 | AC-005; regression | whole server integration | `test:integration:prepare`; `test:integration` | ENV-5 | Pass | `SI-SE/integration-summary.log` | `Test Files  92 passed \| 21 skipped (113)`; `Tests  523 passed \| 71 skipped (594)` | — |
| SE-1 | AC-005; regression | whole server E2E | `pnpm exec vitest run tests/e2e`; the two unexpected files again with resolved (`pwd -P`) `HOME`/`TMPDIR` | ENV-5 | Pass for this ticket (2 outside) | `SI-SE/e2e-summary.log`, `e2e-rerun-summary.log` | `Test Files  4 failed \| 124 passed \| 172 skipped (300)`; RRB-1 and SID-2 (autobyteus-609 FU-007: a short `TMPDIR`); TAU-3 (`ENOENT … index.md.<id>.tmp`: the snapshot walked a temporary file mid-rename) and the terminal-home case (`/tmp/…` HOME vs the shell's `/private/tmp/…`) both pass when rerun: `Test Files  2 passed (2)`, `Tests  7 passed (7)` | the node-files e2e (D-1) passed in the whole run |
| U-1 | unit | web suite and typecheck, Android JVM and build, iOS core tests, server unit | Reused: IMP-02, IMP-03, IMP-05, IMP-10 | — | Pass (reused) | `evidence/implementation/` | `806 passed`; `total 127 tests, 0 failed`; server unit `1085 passed` | no code change after `b0a2eeacc0` (`git diff --stat b0a2eeacc0 HEAD` lists only tickets); no server change since IMP-10's `8e666f6c78` |

## Acceptance-Criteria Proof

| Acceptance-Criteria ID | Critical | Proven By Case IDs | Result | User-Only Or Accepted-Risk Part |
| --- | --- | --- | --- | --- |
| AC-001 | Yes | AND-1, AND-2b, AND-3, AND-13, IOS-2, IOS-3, IOS-7, IOS-8, R2-IOS-13, R2-IOS-U, R3-O4-a…e, R3-IOS-2 | **Not proven on iOS: F-3** (a scrubber drag stops the picture through the loader); Android proven; iOS start, skip seek and reopen proven | the media message on a live run: DEC-006 (a) |
| AC-002 | Yes | AND-4, AND-10, AND-12, IOS-4, IOS-5, IOS-12, R2-AND-9 (Play after a rewrite plays the new version), R2-IOS-13 | Proven | — |
| AC-003 | Yes | AND-1, AND-7, IOS-10 (scans); R2-AND-8, R2-IOS-9 (refusal) | Proven (round 2) | — |
| AC-004 | Yes | AND-5, AND-6, IOS-2, IOS-3, IOS-14 | Proven | — |
| AC-005 | Yes | AC5-1, DSK-1, SI-1, SE-1, U-1 | Proven | — |
| AC-006 | Yes | AND-11, WS-1, DSK-1, U-1, R2-MSP-89…92 | Proven | the old iOS app not built (same `hello` rule as Android) |

## Findings

### F-1 — A file rewritten while its video viewer is open opens the native player again (Android and iOS) — Resolved in round 2 (`fb2357dc09`; R2-AND-9, R2-IOS-13)

- Where: `autobyteus-web/components/fileExplorer/viewers/VideoPlayer.vue` lines 62–65. The watcher on `[playbackMode, url, contentRevision]` calls `playNatively()` whenever `contentRevision` changes in native mode, and live refresh bumps `contentRevision` when an agent rewrites the open file.
- Seen:
  - Android (AND-9), player open: a second `VideoPlayerActivity` starts on top of the first (1 → 2), so it takes two Backs to leave.
  - Android, after Back with the viewer still showing: the full-screen player pops up by itself (0 → 1).
  - iOS (IOS-11, and the durable `testDARewriteDoesNotOpenThePlayerByItself`), after Back: the player pops up by itself and plays the new content.
  - iOS, player open: a new probe is sent, but UIKit shows no second player.
- Why it matters: DEC-001's visible change is "a tapped video opens the phone's own full-screen video player". After this, a video the user closed takes over the screen without a tap whenever the agent writes that file again, and on Android players stack up.
- Expected: a rewrite refreshes the viewer (the Play button plays the new version, AC-002); the player opens only on a tap or on the viewer's first opening.
- Preliminary classification: `Local Fix` (web, D-2's auto-open rule: open natively on mount or when the URL changes, not on `contentRevision`). Owner per the failure-origin review.

### F-2 — The apps' route check lets `/rest/..` dot segments through, and the phone's credential goes to other routes of the node (Android and iOS) — Resolved in round 2 (`6479a28f4b`; R2-AND-8, R2-IOS-9)

- Where:
  - Android `NodeVideoHttp.isNodeFileUrl` (`target.rawPath?.startsWith("/rest/")`);
  - iOS `NodeVideoURL.isNodeFileURL` (`url.path.hasPrefix("/rest/")` or `percentEncodedPath`).
- Seen:
  - Android (AND-8): `playVideo` with `<origin>/rest/../graphql`, `<origin>/rest/%2e%2e/graphql` or `<origin>/rest/../mobile/` is accepted. OkHttp resolves the segments, and `GET /graphql` and `GET /mobile/` reach the node with `Authorization: Bearer <phone credential>`.
  - iOS (IOS-9): the same three URLs pass the check, and `NodeVideoHTTP` sends them unchanged with the header.
  - Both: another origin, a userinfo trick, another scheme, and a plain non-`/rest/` path are refused with nothing sent.
- Why it matters: AC-003's alternate path says a page asking to play a URL of another route is refused and no request is sent. The credential stays with its own node (same origin only), so this is the route leg of the allowlist, not a cross-origin leak.
- Expected: a URL whose path, once normalized, is not under `/rest/` (or any URL with `.`/`..` segments, raw or percent-encoded) is refused before anything is sent.
- Preliminary classification: `Local Fix` (both apps' route check; a unit case each, beside `ShellBridgeMessagesTest` / `NodeVideoHTTPTests`).

### F-3 — On iOS, a drag of the player's scrubber stops the picture of a node video (the loader-backed asset); the same drag on a plain file plays on (was O-4)

- Where: the iOS player path for node videos: `AuthorizedMediaLoader` (AVAssetResourceLoader delegate) under `NativeVideoPlayerViewController`'s AVPlayerViewController.
- Seen:
  - after AVKit's scrubber is dragged to the middle, the picture stops (15.533 or 16.000) while the clock runs on; pause and resume do not recover it (IOS-6, R3-O4-a, 3 of 3 runs, fresh and fully cached);
  - the same screen, gesture and video on a plain local file plays on (2 of 2);
  - the skip buttons and a no-UI player through the same loader play on (IOS-7, IOS-8, R3-O4-b).
- Not the bytes or the decoding: the loader's frames are pixel-identical to the file's and its bytes byte-identical (R3-O4-b, R3-O4-c). From the cache it answers the whole file at once, and AVFoundation asks for nothing during the scrub (R3-O4-d).
- Lead: with `contentInformationRequest.isEntireLengthAvailableOnDemand = true` the same drag plays on (2 of 2, R3-O4-e). This is a diagnostic, not a verified fix; the fix owner should confirm it, or find the real cause.
- Why it matters: AC-001 "a seek to the middle plays within 2 s". On iOS the user's seek is this scrubber.
- Expected: after a scrubber drag the picture plays on from there, as the plain file does.
- Durable check: `testAWideVideoFromTheChatLink` now asserts the picture moves after the scrub. It fails on the shipped code and passes on the plain-file path and with the flag.
- Preliminary classification: `Local Fix` (the iOS loader: how it answers AVFoundation's content information, data requests or both). The failure-origin review decides.
- Residual: the simulator only (no physical iPhone). The control isolates the loader as the cause on the simulator, and a physical device may or may not show it. A verified fix removes the question.

## Observations (not failures)

- **O-1 (R-2), Android: a night-mode switch during playback.** The player is recreated and says it could not play. Back and Play recover, from the cache (AND-10). This is the reviewer's prediction; the design accepts a recreated player failing loudly. A scheduled dark mode at dusk would trigger it.
- **O-2 (R-1), iOS: the Back/title bar stays over the landscape video.** It sits over the video's top-left (in the test video, over its timecode), and it stays there with the controls hidden (`ios/strips/landscape-r1-back-bar.png`). This is the frame for the user's judgement.
- **O-3 (R-3), iOS start time in the app: under 2 s.** Measured from the tap's first on-screen response:
  - cold: first frame 0.23–0.31 s, playing 1.36–1.37 s;
  - tall: first frame 0.17 s, playing 1.28 s;
  - reopen: likewise.
  The headless 2.2–2.4 s was not the app's.
- **O-4 → F-3 (round 3).** The earlier observation, kept for the record: **a scrubber drag freezes the picture on the simulator.**
  - After `slider.adjust` the picture stops: at 15.533, at 15.200 on a fresh file, at 3.6 scrubbing back. The clock moves on and pause/resume does not recover it (IOS-6).
  - The player's skip button seeks and plays on (IOS-7).
  - Without UI, through the same loader, precise and rapid seeks keep delivering frames (IOS-8).
  - Android scrub/seek plays on (AND-3).
  - So the freeze appears only with AVKit's scrubber driven by XCUITest on the simulator. I cannot attribute it to the product, to AVKit on the simulator, or to the synthesized gesture. **A physical iPhone check of a scrubber drag is recommended before release.**
- **O-5, Android start time on a software-GL emulator.** With `swiftshader` the first visible frame came 2.3–3.3 s after the tap, even for a reopen that fetched 0 bytes, with main-thread stalls in logcat (AND-2). With host GPU rendering (AND-2b) the same journeys play in about 1.4–1.7 s cold and 0.4 s reopened: the delay was the emulator's rendering.
- **O-6, Android request shape.** The first read is one unranged 200 after a 2-byte probe, progressive; seeks and reopens are 206s. AC-001 says "ranged requests (206)"; its intent (never the whole file first, header only) holds.

## Validation Confidence Scorecard (Mandatory)

| Confidence Category | Post-Repository Score | Final Score | What Supports It (Case IDs) | Residual Uncertainty | What Could Improve It |
| --- | --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 88% | 85% | every AC on a real node in both apps, except iOS's scrubber seek | AC-001 on iOS fails its seek leg (F-3) | the fix and a rerun |
| Changed-boundary execution directness | 92% | 96% | the real chain on both apps; round 3 isolates the loader with a plain-file control in the same screen | — | — |
| Cross-boundary integration realism and mock gap | 88% | 92% | a real node behind a throttled proxy; real pairing; the old app; Chromium for the desktop | the live media segment (DEC-006) | — |
| Environment, configuration, identity, and fixture fidelity | 88% | 90% | clean env; own emulators/simulators; host-GPU timings | no physical phone | a device run |
| Failure, edge-case, lifecycle, and recovery evidence | 92% | 95% | rewrites, night mode, node removal, old app, crafted URLs, changed file; F-3's controls: pixels, bytes, requests, the flag | LRU eviction at 500 MB not reached | — |
| User-surface, browser, and desktop-shell confidence | 88% | 90% | recordings and frames of every journey; F-3 attributed with frame strips; R-1 frame for the user | the physical iPhone | — |
| Durable regression coverage quality and relevance | 90% | 93% | `native-video-node.mjs`; `NativeVideoRealNodeUITests` now asserts the picture moves after a scrub (fails on F-3, passes on the plain path) | the Android journeys are not a durable driver | an Android driver on the stack |

- Overall post-repository confidence: 89.4% (round 3)
- Overall final confidence: 93.0% (mean of the seven final scores; round 2: 92.4%, Pass; round 1: 89.6%, Fail)
- Calculation method: mean of the final category scores
- Every critical acceptance criterion directly proven, apart from parts only the user can check or accepted as unverified risk: `No` (AC-001's iOS scrubber seek: F-3)
- Any final applicable category below `90%`: `Yes` (requirement proof 85%: F-3)
- Default final confidence target of `95%` met: `No`
- Confidence-limiting residual risks: F-3 (open); no physical phones; the media message on a live run (DEC-006)

## Broader Validation Decision (Mandatory)

- Decision: `Required` (executed)
- Execution mode: `Emulator` (Android, own AVDs; software and host GPU), `Simulator` (iOS, own devices; XCUITest; screen recordings), `Browser` (Chromium as the desktop renderer; the whole phone probe), server suites
- Confidence gap or residual risk it addresses: every Downstream Coverage Hint (AC-001…AC-004, AC-006) and the reviewer's R-1…R-3
- Browser validation needed: yes (the phone bundle in the apps' WebViews; the desktop's cache)
- If `Blocked`: —

## Desktop Application Validation (When Applicable)

- Approach executed: DSK-1, Chromium (the renderer's engine) with the owner credential on its requests, as the desktop's main process attaches it, against a real node of this tree: a rewritten file comes back new.
- Effect on any already-running desktop application: `None` (the user's AutoByteus app and `~/.autobyteus` were not touched)
- Behavior not directly proven: the packaged desktop window (the change on the desktop is only the routes' headers)

## Compatibility / Legacy Scope Check

- Reviewed requirements/design introduce, tolerate, or ambiguously describe backward compatibility in scope: `Yes`, DEC-005 (an app without the player keeps today's path; a store-distributed capability, not a node-version path)
- Compatibility-only or legacy-retention behavior observed in implementation: `No` beyond DEC-005 (the page reads `hello.videoPlayer`)
- Durable coverage added or retained only for compatibility-only behavior: `No` (AND-11 is a temporary check with the base app)

## Durable Coverage Changed In The Codebase

- Repository-resident durable coverage added, updated, or removed this round: `Yes`

| Path / Test | Change | Case IDs | Removal Rationale |
| --- | --- | --- | --- |
| `autobyteus-web/tests/e2e/native-video-node.mjs` (new) | Added | every AND-*, IOS-* | — |
| `autobyteus-ios/AutoByteusMobileUITests/NativeVideoRealNodeUITests.swift` (new; skipped without the stack) | Added | IOS-1…3, 7, 11…14 | — |
| `NativeVideoRealNodeUITests.testAWideVideoFromTheChatLink`: the picture must move after the scrub (`pictureMoves`), round 3 | Updated | R3-IOS-2 (F-3) | — |
| `autobyteus-ios/scripts/ios-simulator-smoke.sh` (skips the new class, as it skips `NativeVideoPlayerUITests`) | Updated | smoke run on my simulator: 8 passed, 0 skipped (`ios/smoke/smoke-summary.log`) | — |
| `autobyteus-ios/README.md` (how to run it) | Updated | — | — |

- Commits: `cf3d344ff4` (round 1); round 3's API/E2E commit on `codex/phone-video-574` (on top of delivery's `ad813b4e6d`)
- Added or updated paths attached for proportional test-code review: `Yes`

## Dependencies Mocked Or Emulated

| Dependency | Method | Why Real Dependency Was Not Used | Confidence Limitation |
| --- | --- | --- | --- |
| Phones | Android emulator (API 35, arm64), iOS simulator (iOS 26.1) | no device | rendering, decoder and gesture behaviour of real phones (O-4, O-5) |
| Network | a local proxy throttled to 1.5 MB/s on file routes | reproducible link | no Wi-Fi loss or jitter |
| Agent | scripted AGY echoing the paths | deterministic chat links | — |
| Media message | its `/rest/files/` URL form through the bridge | DEC-006 (paid, non-deterministic video model) | the live media segment |

## Temporary Methods And Cleanup

| Item | Owned By This Run | Cleanup Action | Result |
| --- | --- | --- | --- |
| `/tmp/api574` (HOME, TMPDIR, stack roots, scripts, recordings, scans, derived data) | Yes | kept until the ticket closes; removed when the Solution Designer asks | kept |
| AVDs `api574_video`, `api574_gpu`, `api574_r2` and their emulators (ports 5580, 5582, 5584) | Yes | `emu kill`; `avdmanager delete avd` | deleted |
| Simulators `api574-iphone`, `api574-smoke`, `api574-r2`, `api574-o4` | Yes | `simctl shutdown`, `simctl delete` | deleted (others' iPhone 17 and iPhone 16e untouched) |
| Stacks (nodes, proxies) | Yes | `POST /stop` | stopped; no process left |
| Base worktree `/tmp/api574/base-app` | Yes | `git worktree remove` | removed |
| Temporary XCTests `ScrubControlTests.swift` (round 1), `RouteCheckControlTests.swift` (round 2), `FrameCompareControlTests.swift`, `ScrubPlainControlUITests.swift` (round 3); round 3's temporary switches and logging in `NativeVideoPlayer.swift` and `AuthorizedMediaLoader.swift` | Yes | deleted / `git checkout` before commit; the clean tree rebuilt and R3-IOS-2 rerun on it | removed |
| Contract packages' `dist/` (missing in round 2; build outputs, untracked) | Yes | rebuilt with their `build` scripts for the phone bundle | kept (untracked) |
| Paid inference | No | — | none |

## Preliminary Classification (On `Fail`)

- F-3: `Local Fix`, iOS `AuthorizedMediaLoader` (its answers to AVFoundation). Lead: `contentInformationRequest.isEntireLengthAvailableOnDemand`; R3-O4-e. The durable check: R3-IOS-2. The failure-origin review decides the owner.
- Resolved earlier: F-1, F-2 (round 2).
- Outside this ticket: 628 FU-002 and 609 FU-006 (WS-1's six cases), 609 FU-007 (SE-1's RRB-1/SID-2). No new follow-up.

## Latest Authoritative Result

- Result: `Fail` (round 3: F-3; product code `64a99bbcd2`)
- Criteria not proven, parts only the user can check, or accepted as unverified risk:
  - not proven: AC-001's iOS scrubber seek (F-3);
  - accepted: the media message on a live run (DEC-006);
  - for the user: the R-1 frame (`ios/strips/landscape-r1-back-bar.png`).
- Evidence decisions requested: DEC-006 (round 1; decided: accept)
- Preliminary classification and recommended owner (on `Fail`): `Local Fix`; code reviewer for the failure-origin review
- Next recipient from `get_handoff_rules`: `/code_reviewer` (Fail)
- Notes:
  - O-4 is settled on the simulator by delivery's three controls. The same AVKit scrubber drag stops the picture through the loader (3/3) and plays on a plain file in the same screen (2/2).
  - The loader's frames and bytes equal the file's, and it has no request pending during the scrub.
  - With `isEntireLengthAvailableOnDemand` set it plays on (2/2).
  - Everything else of round 2 stands (no product change since `64a99bbcd2`).

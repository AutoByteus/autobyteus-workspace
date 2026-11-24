# Implementation Handoff

Ticket autobyteus-574 (phone-video-574, absorbs autobyteus-636). Worktree `<worktree>` (`autobyteus-worktrees/phone-video-574`), branch `codex/phone-video-574`, base `origin/personal` `4b73fccae2`. Paths below are relative to the worktree.

## Upstream Artifact Package

- Upstream review applicability and handoff-rule result: `Large` / `High`. The architecture review was selected; ARCH-REV-001 failed (AR-001) and ARCH-REV-002 passed SR-002. The route is code review.
- Requirements doc: `tickets/in-progress/phone-video-574/requirements-doc.md` (REQ-001…REQ-005, AC-001…AC-006; DEC-001 (b) and DEC-002 (a), approved by the user).
- Investigation notes: `tickets/in-progress/phone-video-574/investigation-notes.md` (prototypes P1–P3).
- Solution revision record: `tickets/in-progress/phone-video-574/solution-revision-record.md` (SR-001, SR-002).
- Design spec: `tickets/in-progress/phone-video-574/design-spec.md` (D-1…D-7, the data contract, NA-8).
- Supplemental task artifacts: `tickets/in-progress/phone-video-574/probes/` (the prototypes), `follow-ups.md` (FU-001, FU-002).
- Design review report and architecture review revision record: `design-review-report.md`, `architecture-review-revision-record.md`. Round 2 is the reviewer's, uncommitted in the ticket folder; I left it unstaged.
- Triggering rework report: N/A (initial).

## Current Implementation Summary

- Implementation cycle: `Rework` (IR-001 was the initial round).
- Implementation revision record: `tickets/in-progress/phone-video-574/implementation-revision-record.md`.
- Current implementation revision ID: `IR-002` (CR-001 and CR-002, Local Fix). IR-001 is the baseline.
- Related solution revision IDs: SR-001, SR-002.
- Related architecture-review revision IDs: ARCH-REV-001, ARCH-REV-002.
- Related code-review revision IDs: CRR-001 (Pass), CRR-002 (failure-origin: implementation).
- Related API/E2E revision IDs: API/E2E round 1 (Fail: F-1, F-2).
- Related delivery revision IDs: N/A.
- Triggering finding IDs: CR-001 (F-1), CR-002 (F-2). In IR-001, the reviewer notes applied were: N-1 (redirects), N-2 (multi-range), N-3 (the iOS range cache, its tests), N-4 (hashed keys).

What the change does:

- **D-1, the node.** A user file is served by byte range. Its version is a strong ETag `"<size>-<mtimeMs>"`, and every client must revalidate before reusing a copy (`Cache-Control: no-cache`; a route's own `no-store` is kept).
  - One range gets 206; an unsatisfiable one gets 416.
  - A multi-range or malformed Range gets the whole file (200).
  - `If-None-Match` with the current version gets 304; `If-Range` serves the range only for that version.
  - There is no `Last-Modified`.
- **D-2, the page.** In the phone apps, a protected video of the node is handed to the app's own player, once the app's `hello` says `videoPlayer`. Everywhere else the page's player stays as it was.
- **D-3, D-6, Android.**
  - A Media3 player screen streams the video by range, with the credential in the header, and caches it by version.
  - Its full-screen button turns the phone to landscape with the bars hidden.
  - An in-page player's full-screen button now works too.
- **D-4, iOS.**
  - AVPlayer reads through a resource loader that serves from a range cache and fetches only the gaps.
  - A wide video plays in landscape.
- **D-5, both apps.**
  - The credential reaches the player in memory, for one playback only.
  - It is sent only as `Authorization` to a file route of the node's origin, with no redirect followed.
  - It is never logged, stored, or put in an Intent or a URL.
- **D-7, both apps.** Removing a node deletes its cached videos.
- **NA-8.** The node access model records the phone's credential rule and the handoff.

## Routing Classification (Mandatory)

- Task size: `Large`.
- Architecture risk: `High`.
- Design classification section / evidence reference: design-spec.md "Task Size And Architectural Risk".
- Classification confirmed or changed: `Confirmed`.
- Evidence and rationale:
  - a new HTTP behavior on every file route;
  - the phone's credential reaches native code;
  - a new bridge message;
  - disk caches of user files on the phone;
  - a new native dependency (Media3), which is a build input.
- Selected route: `Code Review`.
- Lightweight implementation self-review for the direct route: `Not Applicable` (Large/High).
- New design impact or escalation trigger: `None`. None of the escalation triggers fired: every file route serves ranges from its file, both platforms reach landscape, and nothing persists the credential.

## Reviewed Behavior Implementation Trace

| Behavior ID | Approved Change / Preserved Outcome | Implemented Production Path / Key Files | Result / Notes |
| --- | --- | --- | --- |
| BEH-004 (REQ-005, AC-005) | Node file routes answer Range with 206, `Content-Range`, `Accept-Ranges`, an ETag and `no-cache`; refusals unchanged | `autobyteus-server-ts/src/api/rest/user-file-reply.ts` (`sendUserFile`, two `UserFileContent` kinds); the routes in `workspaces.ts`, `files.ts`, `run-file-changes.ts`, `context-files.ts`, `node-files.ts` pass `kind: "file"`; `node-files/node-file-reader.ts` returns the file's real path, size and mtime; message references stay `kind: "stream"` | Pass: IMP-01 (18 of 18 fail on the base, all pass with D-1; per-route cases; a paired phone over the real gate) |
| BEH-001 (REQ-001, AC-001) | In both apps a video starts without the whole download, and a seek fetches only what it needs | Web: `composables/mobile/useNativeVideoPlayback.ts`, `components/fileExplorer/viewers/VideoPlayer.vue`, `components/conversation/segments/MediaSegment.vue`, `utils/remoteAccess/shellBridge.ts`. Android: `video/VideoPlayerActivity.kt`, `NodeVideoDataSource.kt`, `NodeVideoHttp.kt`. iOS: `Video/NativeVideoPlayer.swift`, `AutoByteusMobileCore/Video/AuthorizedMediaLoader.swift`, `NodeVideoHTTP.swift` | Pass: IMP-02; IMP-04 (Android 0.4–0.6 s to play, 0.74–0.78 s after a seek); IMP-05, IMP-06 (iOS) |
| BEH-002 (REQ-002, AC-002) | A reopen of an unchanged video reads nothing again; a changed one is fetched fresh; the cache is bounded and cleared with its node | Android: `video/VideoCache.kt` (SimpleCache, LRU 500 MB), `VideoCacheKeys.kt`, `MainActivity` removal. iOS: `AutoByteusMobileCore/Video/MediaRangeCache.swift`, `AppShellCoordinator` removal | Pass: IMP-04 (0 bytes re-read of the cached spans; a new ETag is re-read; node removal), IMP-05 (the N-3 cases; AVPlayer reopen: 0 bytes fetched again) |
| REQ-003 (AC-003) | The credential only in the header, never in a URL, a log or a stored record; another origin or route is refused | Android: `web/ShellBridge.kt` (`PlayVideo`), `video/NativeVideoPlayback.kt`, `NodeVideoHttp.kt`. iOS: `Shell/ShellBridgeHandler.swift`, `AutoByteusMobileCore/Video/NodeVideoPlayRequest.swift`, `NodeVideoHTTP.swift`. Web: the owner reads the credential from the session store; components never do | Pass: IMP-03, IMP-05 (the bridge rules; a refused redirect over real sockets on both platforms); IMP-04, IMP-06 (log scans: 0 credential lines) |
| BEH-003 (REQ-004, AC-004) | Full screen in landscape with the bars hidden; back to portrait at the same position; Android's in-page full-screen button works | Android: `VideoPlayerActivity` over 432's `DesktopFullScreenController`; `web/AutoByteusChromeClient.kt`, `web/WebMediaFullScreen.kt`. iOS: `NativeVideoPlayerViewController` (`requestGeometryUpdate` for a wide video) | Pass: IMP-04 (native and in-page full screen), IMP-06 (the iOS player in landscape, Back to portrait) |
| AC-006 (preserved) | The browser phone path, an older app and the desktop keep today's path | `useNativeVideoPlayback` answers `page` without a bridge, without `videoPlayer`, or for another site's video | Pass: IMP-02 (an app without the player downloads as today), IMP-07 (the phone probe's media cases MSP-89…92), IMP-01 (a desktop reopen revalidates; a rewritten file is never answered 304) |

- Changes stayed within the requirements doc's Scope Guardrail: `Yes`.

## Key Files Or Areas

- **Node (D-1):**
  - `autobyteus-server-ts/src/api/rest/user-file-reply.ts`;
  - the routes `workspaces.ts`, `files.ts`, `run-file-changes.ts`, `context-files.ts`, `node-files.ts`, `collaboration-message-references.ts`;
  - `src/node-files/node-file-reader.ts`.
- **Web (D-2):**
  - `utils/remoteAccess/shellBridge.ts` (`videoPlayer`, `playVideo`);
  - `composables/mobile/useNativeVideoPlayback.ts` (new);
  - `components/fileExplorer/viewers/VideoPlayer.vue`, `components/conversation/segments/MediaSegment.vue`;
  - en and zh-CN strings in `localization/messages/*/tools.ts` and `workspace.ts`.
- **Android (D-3, D-5, D-6, D-7):**
  - `app/build.gradle.kts`: Media3 1.5.1 (exoplayer, ui, database);
  - `AndroidManifest.xml`: `VideoPlayerActivity`, not exported, handling its own rotation;
  - `web/ShellBridge.kt` and the new `web/AutoByteusChromeClient.kt`, `web/WebMediaFullScreen.kt`;
  - `web/WebFileChooserCoordinator.kt` (`showFileChooser`), `web/AutoByteusWebView.kt`, `MainActivity.kt`;
  - new: `video/NativeVideoPlayback.kt`, `NodeVideoHttp.kt`, `NodeVideoDataSource.kt`, `VideoCache.kt`, `VideoCacheKeys.kt`, `VideoPlayerActivity.kt`.
- **iOS (D-4, D-5, D-7):**
  - `AutoByteusMobile/Video/NativeVideoPlayer.swift` (new);
  - `Shell/ShellBridgeHandler.swift`, `WebShellViewController.swift`, `Demo/DemoWebViewController.swift`, `AppShellCoordinator.swift`;
  - new in Core: `AutoByteusMobileCore/Video/AuthorizedMediaLoader.swift`, `MediaRangeCache.swift`, `NodeVideoHTTP.swift`, `NodeVideoPlayRequest.swift`, `NodeVideoURL.swift`;
  - `scripts/fake-mobile-server.py` (`--video`), `scripts/ios-simulator-smoke.sh` (skips the video UI test).
- **Docs:**
  - `autobyteus-server-ts/docs/design/node_access_model.md` (NA-8);
  - `autobyteus-android/README.md` and `autobyteus-ios/README.md` (the new tests and the videos they need).
- **Tests:**
  - server: `tests/unit/api/rest/user-file-ranges.test.ts` (new), and the route, reader and node-files e2e cases;
  - web: `useNativeVideoPlayback.spec.ts`, `VideoPlayer.native.spec.ts` (new), and `shellBridge.spec.ts`;
  - Android JVM: `video/NodeVideoHttpTest.kt` with `TinyHttpServer.kt`, `NativeVideoPlaybackTest.kt`, `VideoCacheKeysTest.kt`, and `ShellBridgeMessagesTest.kt`;
  - Android instrumented: `video/VideoPlayerActivityTest.kt` with `RangeFileServer.kt`, and `web/WebMediaFullScreenTest.kt`;
  - iOS: `AutoByteusMobileCoreTests/Video/*` (the cache, HTTP and request rules, and the AVPlayer loader with `StubNodeProtocol` and `TinyHTTPListener`), and `AutoByteusMobileUITests/NativeVideoPlayerUITests.swift`.

## Important Assumptions

- **Where the iOS loader, cache and HTTP live (a placement deviation).** The design's file map puts them in the app. They are in `AutoByteusMobileCore`, because that framework has the unit-test target: the N-3 tests need it. Only the player screen is in the app. They use only Foundation, AVFoundation and CryptoKit, all extension-safe. `project.yml` needed no change, because targets take whole folders.
- **Android's HTTP path.** The design allowed "a custom redirect check in the data source". Media3's `DefaultHttpDataSource` lets `HttpURLConnection` follow same-protocol redirects with the request properties, so the player reads through its own `NodeVideoDataSource` over `NodeVideoHttp`:
  - redirects off, and a 3xx is an error;
  - the origin and `/rest/` are checked before anything is sent;
  - `If-Range` with the playback's version, so a file changed meanwhile fails loudly instead of mixing versions.
- **The probe.** Both players first read bytes 0–1 for the ETag (the design's data contract). A node or server without an ETag plays on Android without the cache; on iOS the probe fails ("could not play"). Every node file route now sends one.
- **Media3 1.5.1, not the prototype's 1.4.1.** `PlayerView.setFullscreenButtonState`, which keeps the icon right when Back leaves full screen, exists from 1.5. 1.5 needs compileSdk 35, which the app has.
- **Landscape.**
  - Android: the player opens in portrait, and its full-screen button turns it to landscape (432's controller); Back leaves full screen first.
  - iOS: a wide video turns to landscape when its size is known (the design's "landscape for wide videos"); Back returns to portrait.
- **The hello capability.** Android's and iOS's node pages say `videoPlayer: true`; the iOS demo says `false`, since it has no node to stream from.

## Known Risks

- **iOS: a range AVFoundation asks for while the main stream is still fetching it is fetched twice.**
  - AVFoundation sends many 64 KB ranges beside its main stream. One that falls in bytes still in flight, not yet cached, is fetched again.
  - Correctness and the cache are unaffected, and a reopen still fetches nothing it holds.
  - It is extra traffic on a first play only. A later refinement could serve such a range from the in-flight fetch.
- **iOS start time in a headless unit test:** 2.2–2.4 s against a stub at 1.5 MB/s. AC-001 asks under 2 s in the app; API/E2E measures it on the simulator journey. Android measured 0.4–0.6 s.
- **The iOS player's Back/title bar stays visible** over the video, while the player's own controls hide. AVPlayerViewController does not expose when its controls show.
- **Apple's networking logs the request URL** (the path, never the credential) in the simulator's unified log, on its own. A device redacts these lines as `<private>`. The app's code logs no URL on either platform.
- **The emulator's WebView decoder stalls on a heavy 720p stream** that the native player plays. The in-page full-screen test uses a small baseline clip; real in-page playback is the page's existing path.
- **Media3 adds about 1–2 MB.** The debug APK is 5.9 MB.

## Task Design Health Assessment Implementation Check

- Reviewed change posture: Feature (native playback) plus a contract change (HTTP ranges and validators on every file route).
- Reviewed root-cause classification: the whole-file object URL and the missing Range and validators on the node (design-spec Current-State Read).
- Reviewed refactor decision: `No Refactor Needed`.
- Implementation matched the reviewed assessment: `Yes`.
- If challenged, routed as `Design Impact`: `N/A`.
- Evidence / notes: the prototypes' approach held on both platforms. Their gaps were each settled in code and tests:
  - the iOS cache was not prototyped (N-3);
  - neither prototype refused redirects (N-1).

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: `None`. The `hello` capability is the store-distributed app's capability (DEC-005), not a node-version path.
- Legacy old-behavior retained in scope: `No`. The page's object-URL path stays for the browser and apps without the player (AC-006, preserved by design).
- Dead code in the touched files and modules removed (Core Principle 7): `Yes`. `NodeFileReader` no longer opens a stream, and its stream field is gone. `WebFileChooserCoordinator.chromeClient()` became `showFileChooser`, called by the one chrome client.
- Dead code found elsewhere, added to `follow-ups.md`: None.
- Shared structures remain tight: `Yes`. `UserFileContent` is two kinds (`file`, `stream`), not one shape with optional fields.
- Canonical shared design guidance was reapplied during implementation: `Yes`.
- Deviations from a design principle decided during implementation: `None`. The iOS placement and Android's own data source above are file-placement and mechanism choices within the design's options, not principle deviations.
- Changed source implementation files stayed within the size guardrails: `Yes`. Every changed source file is under 500 effective lines, and the largest delta is 188 (`VideoPlayerActivity.kt`, new).
- Notes: none.

## Persisted Data Transition Check (When Applicable)

- Approved decision: new rebuildable caches, no migration (design-spec "Persisted Data / State Transition Decision").
- Implementation follows it without an unapproved migration or fallback: `Yes`. The caches are in each app's private cache folder (Android `cacheDir/video-cache`, iOS `Caches/video-cache`). They hold video bytes and range maps, never a credential, and can be dropped at any time.
- Deviation: `None`.

## Environment Or Dependency Notes

- A fresh worktree needs `pnpm install`, `pnpm -C autobyteus-ts build`, `pnpm -C autobyteus-server-ts prebuild` and `pnpm -C autobyteus-web exec nuxt prepare` before the suites.
- iOS: `autobyteus-ios/scripts/prepare-demo-web.sh --build` and `generate-project.sh`.
- A dedicated emulator AVD (`ie574_api35`, port 5640) and simulator (`ie574-iphone17`) were created for these runs and are deleted at cleanup. No other agent's device was used.
- The test videos are generated with ffmpeg (the commands are in the Android README) and are not committed. The video tests skip without them, except the server's, which need none.
- No provider key, real node data or user data was used.

## Checks Run

Evidence is under `tickets/in-progress/phone-video-574/evidence/implementation/`.

| Check ID | Command Or Steps | Commit Tested | Environment | Code It Exercises | Behavior / Criteria IDs | Result | Evidence Files | Look For |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| IMP-01 | `vitest run tests/unit/api/rest/user-file-ranges.test.ts` on the base, then the fix; the API, node-files, node-access and architecture tests; the node-files e2e, two integration files and the phone-routes e2e (clean env) | base `4b73fccae2`; `66534ef01c` | macOS, Node 22 | `sendUserFile`, every file route, `NodeFileReader`, the node access gate | BEH-004, AC-005, AC-006 | Pass (base: 18 of 18 fail, as expected) | `IMP-01-d1-server-ranges.log` | base `18 failed`; fix `18 passed`; `290 passed`; `30 passed` |
| IMP-02 | the viewer, owner and bridge specs; the whole web suite; web typecheck; the three guards | `2c5673f890` | macOS, Node 22, a fake app bridge | `useNativeVideoPlayback`, `VideoPlayer.vue`, `MediaSegment.vue`, `shellBridge.ts` | BEH-001, AC-003, AC-006 | Pass | `IMP-02-d2-web-native-playback.log` | `806 passed`; `[typecheck] PASS` |
| IMP-03 | `./gradlew :app:testDebugUnitTest :app:assembleDebug :app:compileDebugAndroidTestKotlin :app:lintDebug` | `a526d58a7e` | JDK 21, AGP 8.13.2 | the bridge's `playVideo`, `NodeVideoHttp` (real local servers), the handoff, the keys | REQ-003, AC-003 | Pass | `IMP-03-android-jvm-build-lint.log` | `total 127 tests, 0 failed` |
| IMP-04 | `connectedDebugAndroidTest` on a dedicated emulator (API 35) with the videos pushed; a logcat scan | `a526d58a7e` | emulator API 35, a throttled range server on the device | `VideoPlayerActivity`, Media3 cache, full screen, `WebMediaFullScreen`, node removal | AC-001, AC-002, AC-003, AC-004 (Android) | Pass | `IMP-04-android-emulator.log` | `Finished 21 tests`; `read again of the cached: 0`; 0 credential lines |
| IMP-05 | `TEST_RUNNER_AUTOBYTEUS_574_VIDEO=<mp4> xcodebuild … -only-testing:AutoByteusMobileCoreTests test` on a dedicated simulator | `648073efd9` | Xcode 26.1.1, iOS 26.1 | `MediaRangeCache`, `NodeVideoHTTP` (a redirect over real sockets), `NodeVideoPlayRequest`, AVPlayer through `AuthorizedMediaLoader` | AC-001, AC-002, AC-003 (iOS), N-1, N-3, N-4 | Pass | `IMP-05-ios-core-tests.log` | `passedTests 74`, `failedTests 0`; `fetched again of the cached: 0` |
| IMP-06 | the fake node with `--video`; `xcodebuild … -only-testing:AutoByteusMobileUITests/NativeVideoPlayerUITests`; simctl frames; a simulator log scan | `648073efd9` | iOS 26.1 simulator | page → bridge → player → landscape → Back; could-not-play | UC-001, UC-003, AC-001, AC-003, AC-004 (iOS) | Pass | `IMP-06-ios-simulator-player/` | `2 passed`; every VIDEO 206 `authorized: true`; 0 credential lines |
| IMP-07 | `mobile-shell-probe.mjs --cases=MSP-89,MSP-90,MSP-91,MSP-92` (twice) | `8e666f6c78` | Chrome headless, loopback nodes | the phone bundle in a browser | AC-006 | Pass | `IMP-07-phone-probe-media/` | second run `unknownBrowserErrors: 0` |
| IMP-08 | fresh clone; `GRADLE_USER_HOME=<empty> ./gradlew --no-daemon clean :app:assembleDebug` | `8e666f6c78` | JDK 21, empty Gradle home | the Android build with Media3 from nothing | DESIGN.md rule 12 | Pass | `IMP-08-fresh-android-build.log` | `BUILD SUCCESSFUL` |
| IMP-09 | build-only Android Release (`release-android.yml`, `publish_release=false`) and iOS Release (`release-ios.yml`, `publish_app_store_connect=false`) on the branch | `8e666f6c78` | GitHub Actions | the signed release build; the Xcode 27 build and tests | DESIGN.md rule 12 | Pass | `IMP-09-build-only-release-runs.log` | Android 45397185529 `success`; iOS 45397190773 `success` (Build And Test iOS App) |
| IMP-10 | `pnpm test:unit`; server typecheck; clean-env `test:integration` and `vitest run tests/e2e` | `8e666f6c78` | macOS, Node 22, clean env | the whole server | AC-005, AC-006 | Pass | `IMP-10-server-suites.log` | unit `1085 passed`; integration `92 passed`; e2e `128 passed` |
| IMP-11 | CR-001: the viewer specs on the fix and with `VideoPlayer.vue` stashed; web typecheck, guards, whole suite. CR-002: Android JVM tests on the fix and with `NodeVideoHttp.kt` stashed; build, androidTest compile, lint; iOS Core tests on the fix (with the video) and with `NodeVideoURL.swift` stashed | `fb2357dc09`, `6479a28f4b` | macOS, Node 22; JDK 21; Xcode 26.1.1, iOS 26.1 simulator | the viewer's auto-open; both apps' node-file-route rule (bridge, probe, every read) | UC-001, REQ-003, AC-003, CR-001, CR-002 | Pass (each new case red before the fix) | `IMP-11-cr001-cr002-local-fixes.log` | web `806 passed`; Android `total 129 tests, 0 failed`; iOS `passedTests 75` |

- Not run, and why:
  - real devices (API/E2E);
  - a real node's full journey on the emulator and simulator: pairing, then a workspace video from Files and from a chat message to the native player (API/E2E; the apps' tests drive the player with stand-in nodes, and IMP-01 the real routes);
  - a full LRU eviction on Android (Media3's evictor; the iOS cache's eviction is tested);
  - signing and store distribution (the build-only runs skip them).

## Frontend Rendered-Result Check (When Applicable)

- Affected surfaces / journeys:
  - the phone file viewer for a video, and a chat media message's video, inside the apps (handed to the native player; a Play button or a play tile);
  - the native players on Android and iOS (portrait, full screen in landscape, could-not-play);
  - Android in-page media full screen.
- Approved references: requirements-doc.md AC-001…AC-006, DEC-001 (the platform's own player); design-spec D-2…D-6.
- Existing design system and adjacent surfaces reviewed:
  - the viewer's dark stage, button and error styles (VideoPlayer's retry);
  - the chat media message's layout;
  - 432's desktop full-screen controller (reused) and the apps' plain-view screens.
- Surface used:
  - the web viewers in specs;
  - the Android player and the in-page full screen on the emulator (instrumented tests);
  - the iOS player on the simulator through the app's real WebView and bridge (UI test and simctl frames).
- States inspected:
  - Android: playing, sought, reopened, full screen in landscape and back, could-not-play.
  - iOS: the landscape player with Back and the title, Back to the page in portrait, could-not-play.
  - Web: Play button and play tile, pending, an app without the player.
  - The iOS landscape screen was looked at in a real frame: the video fills the height, with side bars for 16:9, and no status bar.
- Visual or interaction issues found and corrected:
  - The XCUITest landscape screenshot showed the frame turned. This was a capture artifact, not the screen: the simctl frame shows the correct landscape.
  - The Android full-screen icon state needed Media3 1.5 (`setFullscreenButtonState`).
- Remaining limitations:
  - The web Play button and play tile were checked in specs, not on a rendered phone in the app: the apps load the node's page, which API/E2E's journey covers.
  - The iOS Back/title bar stays shown (Known Risks).

## Downstream Coverage Hints / Suggested Scenarios

- **AC-001 on a real node:** pair the emulator and the simulator with a test node, throttled to about 1.5 MB/s. Open a 20+ MB workspace MP4 from Files, from a chat link and from a media message. Read the node's log for 206s with the phone's header.
- **AC-002:** close and reopen; then change the file on the node (a new ETag) and reopen. Remove the node in the app and check that its cache folder entries are gone.
- **AC-003:** scan `adb logcat` and the simulator log for the credential. A page message `playVideo` with another origin or a non-`/rest/` URL must send nothing.
- **AC-004:** Android in-page video full screen on a real node page; the iOS landscape for a wide video and portrait for a tall one.
- **AC-006:** an app build from before this change (no `videoPlayer`) against the new page: today's download; the desktop's viewers on a file an agent rewrites (no stale copy).

## API / E2E / Executable Coverage Investigation And Execution Still Required

- API/E2E owns the real-node journeys above, the iOS start-time measurement in the app, and real devices.
- **Docs sync for delivery:** NA-8 and the two app READMEs are updated in this change. `docs/android_mobile_access.md` (the device checklist) may gain a video step.
- **Follow-ups unchanged:** FU-001 (message references without Range) and FU-002 (audio through the native player).

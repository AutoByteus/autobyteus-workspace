# Implementation Handoff

Ticket autobyteus-642 (file-viewer-media-642, absorbs autobyteus-639). Worktree `<worktree>` (`autobyteus-worktrees/file-viewer-media-642`), branch `codex/file-viewer-media-642`, base `origin/personal` `5c0db3a801`. Paths below are relative to the worktree.

## Upstream Artifact Package

- Upstream review applicability and handoff-rule result: `Large` / `High`. The architecture review was selected; ARCH-REV-001 failed (AR-001) and ARCH-REV-002 passed SR-002. The route is code review.
- Requirements doc: `tickets/in-progress/file-viewer-media-642/requirements-doc.md` (REQ-001…REQ-004, AC-001…AC-004, DEC-001…DEC-003; approved within the direction, user informed).
- Investigation notes: `tickets/in-progress/file-viewer-media-642/investigation-notes.md`.
- Solution revision record: `tickets/in-progress/file-viewer-media-642/solution-revision-record.md` (SR-001, SR-002).
- Design spec: `tickets/in-progress/file-viewer-media-642/design-spec.md` (D-1…D-4, the data contract).
- Supplemental task artifacts: `handoff-architecture-design-complete.md`.
- Design review report and architecture review revision record: `design-review-report.md`, `architecture-review-revision-record.md`. Round 2 is the reviewer's, uncommitted in the ticket folder; I left it unstaged.
- Triggering rework report: `code-review-report.md` CRR-001 (CR-001, C-2) and `design-review-report.md` ARCH-REV-003 (AR-002), resolved as SR-003 and SR-004 (ARCH-REV-004 Pass, N-6).

## Current Implementation Summary

- Implementation cycle: `Rework` (IR-001 was the initial round).
- Implementation revision record: `tickets/in-progress/file-viewer-media-642/implementation-revision-record.md`.
- Current implementation revision ID: `IR-006` (CR-003, Local Fix). IR-001 is the baseline; IR-002 was SR-003 and SR-004; IR-003 was CR-002; IR-004 was SR-005; IR-005 was SR-006.
- Related solution revision IDs: SR-001…SR-006.
- Related architecture-review revision IDs: ARCH-REV-001…ARCH-REV-006.
- Related code-review revision IDs: CRR-001 (Fail, CR-001), CRR-002 (CR-001 and C-2 resolved; Fail, CR-002), CRR-003 (Pass), CRR-004 (Pass), CRR-005 (Pass), CRR-006 (failure-origin: implementation, CR-003).
- Related API/E2E revision IDs: API/E2E round 1 (Fail: F-1).
- Related delivery revision IDs: N/A.
- Triggering finding IDs: CR-003 (F-1) in IR-006; N/A in IR-005 (SR-006; note N-9); N/A in IR-004 (SR-005; notes N-7, N-8); in IR-003 CR-002; in IR-002 CR-001, C-2, AR-002, N-6. In IR-001: N-4 and N-5 (N-1…N-3 were in SR-002); SR-004 replaces N-4's rule.

What the change does:

- **D-1, the server.** A message reference is served like the other file routes: 206 for a range, the `ETag`, 304, 416, 200 for no range or several, and its `Cache-Control: no-store` kept.
- **D-1b, the reference viewer (IR-002, SR-003).** A video or audio reference is no longer downloaded whole. One byte is asked (so a gone reference still says so), then the viewer is given the route's own URL: the desktop element streams it by range, the phone apps play it natively, and a phone browser downloads it itself. Text, PDF and image are unchanged.
- **D-2, native audio and the media rename.** On both phones a protected node audio file plays in the app's player as video does: streamed by range, credential in the header, cache reused on reopen. Each app's `hello` lists the extensions its player plays per kind. The page goes native only for a listed type of the file the URL names, and the bridge message is `playMedia { kind, url, title, credential }`.
  - Android (Media3): video `mp4, m4v, mov, webm, mkv, 3gp`; audio `mp3, m4a, aac, wav, ogg, oga, opus, flac`.
  - iOS (AVPlayer): video `mp4, m4v, mov`; audio `mp3, m4a, aac, wav, aif, aiff, caf`.
  - The file's name comes from the caller (IR-002, SR-004): `FileViewer` passes the file's path to the players, and a chat media message the last segment of its own `/rest/files` URL, which also labels its tile (N-6). A URL need not name its file.
  - Audio stays portrait with its name and controls; on iOS it shows an audio symbol and the name in place of a picture (C-2). Video is unchanged.
  - `video`-named code, folders, messages, identifiers and cache folders are renamed `media` on all three sides, with no compatibility path (574 is unreleased).
- **D-3, the Files layout.** The tree sits beside the viewer only when a 150 px tree, the 1 px divider and a 400 px viewer fit; otherwise the tree goes above. In split the tree is shown at the user's width or what leaves the viewer 400 px, and the divider stops there.
- **D-4, highlighting.** One table of file types names each type's Monaco language (IR-005: Monaco only). The viewer (Monaco) highlights YAML, TOML, shell, Go, Rust, Java, XML, INI and Dockerfile, and now HTML and Vue. Chat messages highlight code blocks by their fence's name (Prism, `highlightService`; SR-006), including `rs` and `zsh`.

## Routing Classification (Mandatory)

- Task size: `Large`.
- Architecture risk: `High`.
- Design classification section / evidence reference: `design-spec.md` "Task Size And Architectural Risk".
- Classification confirmed or changed: `Confirmed`.
- Evidence and rationale: the bridge contract changed across three codebases as designed, and a server route changed. No security change: NA-8's rule is unchanged, only its message name. The escalation triggers did not fire:
  - no tag contains 574's merge, as the design verified;
  - no audio format the page plays today now fails on a phone, because the apps list only types their players play.
- Selected route: `Code Review`.
- Lightweight implementation self-review for the direct route: `Not Applicable`.
- New design impact or escalation trigger: `None`. Two implementation decisions are listed under Important Assumptions (the removed `stream` variant; the iOS asset type by extension).

## Reviewed Behavior Implementation Trace

| Behavior ID | Approved Change / Preserved Outcome | Implemented Production Path / Key Files | Result / Notes |
| --- | --- | --- | --- |
| UC-001 (IR-002) | A video or audio reference streams instead of downloading whole | `CollaborationMessageReferenceViewer.fetchContent` (probe `Range: bytes=0-0`, `no-store`; `resolvedUrl` = the route URL) → `FileViewer` (`fileName: file.path`) → `VideoPlayer`/`AudioPlayer` → `useAuthorizedObjectUrl` (desktop: the URL itself) or `useNativeMediaPlayback` (phone app) | IMP-11: one request with `Range: bytes=0-0`, no blob, the URL passed on; 404 codes and other errors as before |
| UC-001 / REQ-001 | A message reference is served by range with its version, no-store kept | `run-history/services/message-reference-content-reader.ts` (`resolve` returns `{ mimeType, path, size, modifiedMs }` from one `statSync`) → `api/rest/collaboration-message-references.ts` (`sendUserFile(reply, content, request)` after `cache-control: no-store`) → `user-file-reply.ts` | IMP-01: 206/`ETag`/`Accept-Ranges`/304, 416 outside, 200 whole for none or several ranges, `no-store`, for all three root kinds |
| UC-002 / REQ-002 (web) | Native only for a listed type of the file the caller names; else the page path | `composables/mobile/useNativeMediaPlayback.ts` (`modeFor(url, fileName)`: page/pending/native by `hello.mediaPlayer[kind]` and the extension of `fileName`; IR-002) → `utils/remoteAccess/shellBridge.ts` (`playMedia`, `parseMediaPlayer`) ← `VideoPlayer.vue`, `AudioPlayer.vue`, `MediaSegment.vue` | IMP-04, IMP-11: iOS Ogg/Opus/WebM page; Android Ogg/Opus/WebM native; MP3 native on both; no extension → page; a reference URL with `demo/clip.mp4` → native, title `clip.mp4` |
| UC-002 (Android) | Audio through the same player, data source and cache, portrait with title and controls | `web/ShellBridge.kt` (`playMediaOf`, `helloReply` from `media/MediaKind.kt`) → `MainActivity.onPlayMedia` (`MediaPlayerActivity.intent(token, kind)`) → `media/MediaPlayerActivity.kt` (`MediaKind.AUDIO`: no full-screen button, controller always shown) → `NodeMediaDataSource` / `NodeMediaHttp` / `MediaCache` | IMP-06, IMP-07: MP3 and M4A play, seek by range, reopen reads 0 cached bytes, header only |
| UC-002 (iOS) | The same on iOS | `Shell/ShellBridgeHandler.swift` (`playMedia`, `hello.mediaPlayer` from `MediaKind.extensions`) → `WebShellViewController` → `Media/NativeMediaPlayer.swift` (kind: no landscape for audio) → `AuthorizedMediaLoader` (type from `NodeMediaURL.fileType`) / `NodeMediaHTTP` / `MediaRangeCache` | IMP-08, IMP-09, IMP-12: lists checked against `AVURLAsset.audiovisualTypes()`; audio opens in portrait with its name and plays, probe plus one streaming range; a symbol and the name while AVKit's controls are hidden (C-2) |
| UC-002, older app | `hello` without `mediaPlayer` → page path | `parseMediaPlayer` returns `null` for anything but two string lists | IMP-04 (and an old `videoPlayer: true` hello counts as none) |
| UC-003 / REQ-003 | Viewer ≥ 400 px; stacked below 551 px, split above, divider bounded | `components/fileExplorer/FileExplorerLayout.vue` (`MIN_VIEWER_WIDTH`, `ResizeObserver`, `isStacked`, `shownTreeWidth`, clamped drag); `RightSideTabs.vue` unchanged (it still passes the mode) | IMP-03 (rule), IMP-10 (rendered: 450 px panel stacked at 1440×900 and 1280×800; 700 px split 250/449; divider stops at viewer 400 and tree 150) |
| UC-004 / REQ-004 | Listed types highlighted in both engines; Python, TypeScript, JSON, Markdown unchanged | `utils/highlighting/languageDetector.ts` → `FileViewer.vue` (`getMonacoLanguage`); message code blocks: `utils/markdownItPrism.ts` → `services/highlightService.ts` (Prism grammars, `rs`/`zsh` aliases; IR-005) | IMP-02 (each type: Monaco's own grammar gives ≥ 2 token kinds), IMP-15 (each fence ≥ 2 Prism classes), IMP-10 (YAML, JSON highlighted in the rendered viewer) |
| Preserved | 574's video, NA-8, the caches, browser and older-app paths, the drag resize, today's highlighting | The video path is the renamed code with `kind = video`; NA-8 text only renamed | IMP-04, IMP-07 (video cases pass), IMP-08, IMP-09, IMP-02 (unchanged types) |

- Changes stayed within the requirements doc's Scope Guardrail: `Yes`. The one change to 574's video behavior is N-5's WebM on iOS, which the design records.

## Key Files Or Areas

- **Server (D-1):** `autobyteus-server-ts/src/run-history/services/message-reference-content-reader.ts`, `src/api/rest/collaboration-message-references.ts`, `src/api/rest/user-file-reply.ts`, and the routes that dropped `kind: "file"` (`workspaces.ts`, `files.ts`, `context-files.ts`, `node-files.ts`, `run-file-changes.ts`). Tests:
  - `tests/unit/api/rest/user-file-routes.test.ts`, `user-file-reply.test.ts`;
  - `tests/unit/run-history/message-reference-content-reader.test.ts`;
  - `tests/architecture/user-file-replies.test.ts`;
  - `tests/app-data-migrations/agent-org-units-own-runs-v1/agent-org-units-path-rewrite.test.ts`.
- **Web, highlighting (D-4):** `utils/highlighting/languageDetector.ts` (and its new spec), `services/highlightService.ts`, `components/fileExplorer/FileViewer.vue`; IR-005 removed `FileDisplay.vue`, `segmentHighlighter.ts`, `vueCodeHighlight.ts` and the Prism column, and added `services/__tests__/highlightService.fences.spec.ts`.
- **Web, layout (D-3):** `components/fileExplorer/FileExplorerLayout.vue` and its spec; `docs/file_explorer.md`.
- **Web, media (D-2):**
  - `composables/mobile/useNativeMediaPlayback.ts` (renamed) and its spec;
  - `utils/remoteAccess/shellBridge.ts` and its spec;
  - `components/fileExplorer/viewers/AudioPlayer.vue`, `VideoPlayer.vue`, `__tests__/MediaViewers.native.spec.ts` (renamed from `VideoPlayer.native.spec.ts`);
  - `components/conversation/segments/MediaSegment.vue`;
  - localization `en` and `zh-CN` (`AudioPlayer.play`, `MediaSegment.play_audio`, `loading_audio`).
- **Android (D-2):**
  - `app/src/main/java/org/autobyteus/mobile/media/*` (renamed from `video/`, plus `MediaKind.kt`);
  - `web/ShellBridge.kt`, `MainActivity.kt`, `AndroidManifest.xml`;
  - tests in `src/test/.../media`, `ShellBridgeMessagesTest.kt`, `src/androidTest/.../media` (`MediaPlayerActivityAudioTest.kt` new; `RangeFileServer` serves a named file of a type);
  - `WebMediaFullScreenTest.kt` (imports).
- **iOS (D-2):**
  - `AutoByteusMobile/Media/NativeMediaPlayer.swift`;
  - `AutoByteusMobileCore/Media/*` (renamed from `Video/`, plus `MediaKind.swift`);
  - `Shell/ShellBridgeHandler.swift`, `WebShellViewController.swift`, `Demo/DemoWebViewController.swift`;
  - tests in `AutoByteusMobileCoreTests/Media/*` (`MediaKindTests.swift` new);
  - `AutoByteusMobileUITests/NativeMediaPlayerUITests.swift` (renamed, an audio case added) and `NativeVideoRealNodeUITests.swift` (the `media.*` identifiers only);
  - `scripts/fake-mobile-server.py` (`playMedia`, `--audio`), `scripts/ios-simulator-smoke.sh`.
  - `project.yml` is unchanged: targets take whole folders.
- **Docs:** `autobyteus-web/docs/file_explorer.md`, `remote_access.md`; `autobyteus-server-ts/docs/design/node_access_model.md` (NA-8 names); `docs/android_mobile_access.md`, `docs/ios_mobile_access.md`; `autobyteus-android/README.md`, `autobyteus-ios/README.md`.

## Important Assumptions

- **`UserFileContent` lost its `stream` variant and its `kind` tag.** The design has the route pass `{ kind: 'file', … }`. Once the reference route sends a file, no route sends a stream, so the variant and its branch in `sendUserFile` are dead code (Principle 7). A one-value tag is a leftover of that variant, so it went too. The other routes only dropped `kind: "file",`.
  - `user-file-reply.test.ts` now serves real files.
  - The architecture test no longer exempts a stream given as `body`, since no such shape exists.
- **The iOS asset's type comes from the file's extension, not the probe's MIME type.** The node sends `.caf` as `audio/x-caf`, which iOS maps to an unknown dynamic type (checked with `UTType(mimeType:)`). A listed type would therefore not have played.
  - The lists are by extension, so the loader uses `NodeMediaURL.fileType(of:)`, the same file name the page reads.
  - The probe's `contentType`, then unused, is removed.
- **Android's screen kind travels in the Intent**, beside the token (`MediaPlayerActivity.EXTRA_KIND`). The kind is not secret, and it survives a process end, unlike the in-memory playback. The handoff request has no kind field.
- **`ini` is loaded in Prism** although D-4's list of grammars omits it: REQ-004 lists `.ini`, and a message's ```ini block uses it.
- **The rename of the accessibility identifiers** (`video.player` → `media.player`, and so on) reached API/E2E's `NativeVideoRealNodeUITests.swift`. Its file name and journeys stay video ones.
- **The cache folders** became `media-cache` on both apps (the design allowed it; 574 is unreleased).
- **The Android list against Media3** was confirmed from the 1.5.1 class files: the default extractors, and the MP4 sniffer's QuickTime and 3GP brands. **The iOS list** is checked on the simulator by `MediaKindTests` against `AVURLAsset.audiovisualTypes()`.

## Known Risks

- **iOS's list is narrower than iOS 26 plays.** The iOS 26.1 simulator also lists Ogg, Opus and FLAC as playable. The app supports iOS 17 and REQ-002 keeps Ogg/Opus on the page path there, so the static list leaves them out. On iOS 26 those files play in the page.
  - A later change could build the list from `AVURLAsset.audiovisualTypes()` at run time. That is a product decision, not taken here.
- **iOS audio controls hide while playing:** AVKit hides its own controls, as for a video, and a tap shows them. AVPlayerViewController has no public setting to keep them shown. Since IR-002 the screen shows an audio symbol and the name meanwhile (C-2). On Android they stay shown.
- **iOS sound and the Ring/Silent switch** (SR-005) need a physical iPhone: a simulator plays no sound through the switch. The session's category and activation are checked in IMP-14.
- **The iOS read-ahead's judgement values** (IR-006): a read waits for a running fetch only if it comes within 0.7 s at the link's last measured rate, measured after 64 KB. A wrong judgement costs one extra ranged request or a wait of at most 0.7 s.
- **A zero-byte media reference** answers the probe with 416 and shows the error state (CRR-002, held).
- **The desktop's ranged reading of a reference** was not rendered in IR-002: the viewer gives the element the route URL, as Files does, and the route answers by range (IMP-01). API/E2E checks it on the built stack.
- **The Android audio start time in the instrumented test** reads "playing after 3 ms": it counts from `ActivityScenario.launch` returning, which already waits for the screen. The video case's 1.0 s is measured the same way, as in 574. AC-002's "under 2 s" in the app is API/E2E's measure.
- **`mkv` and `3gp` on Android** depend on the codecs inside them; the device decodes what it can. Media3 reads both containers.

## Task Design Health Assessment Implementation Check

- Reviewed change posture: four bounded changes; one clean rename of an unreleased contract.
- Reviewed root-cause classification: references opened a stream; split chosen by mode; one map with two vocabularies; audio not on 574's native path.
- Reviewed refactor decision: `Refactor Needed Now` (the rename; the language table).
- Implementation matched the reviewed assessment: `Yes`.
- If challenged, routed as `Design Impact`: `N/A`.
- Evidence / notes: the two implementation decisions above follow from the design (dead code after D-1; the lists being by extension).

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: `None`. `playVideo` and `videoPlayer` are gone on all three sides; the web and Android tests check that the old message and field are refused or ignored.
- Legacy old-behavior retained in scope: `No`.
- Dead code in the touched files and modules removed (Core Principle 7): `Yes`. `UserFileContent`'s stream variant and branch, `getLanguage`, and the probe's `contentType`.
- Dead code found elsewhere, added to `follow-ups.md`: None.
- Shared structures remain tight: `Yes`. `MediaKind` holds each app's lists in one place, which its `hello` and its tests read.
- Canonical shared design guidance was reapplied during implementation: `Yes`.
- Deviations from a design principle decided during implementation: None.
- Changed source implementation files stayed within size guardrails: `Yes`. The largest changed source file is `MainActivity.kt` at 395 lines (+11 −11); no delta exceeds 80 lines.
- Notes: the language table's Dockerfile row has an empty `extensions` and a `names` list; only that row needs a name.

## Persisted Data Transition Check (When Applicable)

- Approved decision: `Not Affected` for stored data. The app caches are 574's, unreleased: "no migration, the directory may follow the rename".
- Design-spec decision reference: D-2, "The cache directories and keys keep their current form…".
- Implementation follows the approved decision: `Yes`. Keys are unchanged; the folder is now `media-cache` on both apps, with no migration.
- Deviation from the reviewed transition decision: `None`.

## Environment Or Dependency Notes

- A fresh worktree needs `pnpm -C autobyteus-server-ts prebuild` (the Prisma client) before the server tests.
- The iOS app build needs `DemoWeb/`: run `autobyteus-ios/scripts/prepare-demo-web.sh --build` first.
- The iOS loader test needs a 20+ MB MP4 longer than 31 s; the Android media tests need four files on the device. Both READMEs say how to make them.
- No Gradle file, `project.yml`, `package.json`, tsconfig or workflow changed, so DESIGN.md rule 12 (fresh-start build, build-only release run) does not apply (N-2).
- My own devices were used and deleted after: AVD `ie642_api35` (port 5642) and simulator `ie642-iphone17`.

## Checks Run

| Check ID | Command Or Steps | Commit Tested | Environment | Code It Exercises | Behavior / Criteria IDs | Result | Evidence Files | Look For |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| IMP-01 | Reference reader, route, reply and architecture tests on the fix and with `src` stashed; the whole server unit suite; the server typecheck | `76b29d70a9`, `4024239e07` | macOS, Node 22 | reference reader and route, `sendUserFile`, every file route | UC-001, REQ-001, AC-001 | Pass (red before) | `IMP-01-d1-server-references.log` | red `Tests  12 failed \| 15 passed`; `Tests  9078 passed \| 9 skipped`; `test-file errors: 972 in 299 files (baseline 972 in 299 files)` |
| IMP-02 | `languageDetector.spec.ts` (both lookups; Monaco's own grammars; Prism) on the fix and with the old map | `531af6cea7` | macOS, Node 22, jsdom | the language table, both engines | UC-004, REQ-004, AC-004 | Pass (red before) | `IMP-02-d4-highlighting.log` | `Tests  59 passed (59)`; red `41 failed` |
| IMP-03 | `FileExplorerLayout.spec.ts` on the fix and with the old layout | `3d8326eb83` | macOS, Node 22 | the width rule, clamp, observer | UC-003, REQ-003, AC-003 | Pass (red before) | `IMP-03-d3-files-layout.log` | `Tests  11 passed (11)`; red `7 failed` |
| IMP-04 | Web media specs (viewers, composables, bridge, segments); the native viewer spec with the old `AudioPlayer.vue` | `8d27fb14f5` | macOS, Node 22 | `useNativeMediaPlayback`, bridge, viewers, chat tiles | UC-002, REQ-002 | Pass (red before) | `IMP-04-d2-web-media.log` | `Tests  302 passed (302)`; red: the 3 audio viewer cases `×` |
| IMP-05 | Whole web suite; web typecheck; three web guards | `4024239e07` | macOS, Node 22 | all web code | all | Pass | `IMP-05-web-suite-typecheck-guards.log` | `Test Files  807 passed (807)`, `Tests  6245 passed \| 2 skipped`; `[typecheck] PASS`; `Passed.` ×2 |
| IMP-06 | `./gradlew :app:lintDebug :app:testDebugUnitTest :app:assembleDebug :app:compileDebugAndroidTestKotlin`; Media3 1.5.1 class files read | `18163b3c1b` | macOS, JDK 21 | Android media package, bridge | UC-002, REQ-002 | Pass | `IMP-06-android-jvm-build-lint.log` | `tests 130 skipped 0 failed 0`; `BUILD SUCCESSFUL`; the extractor and brand lists |
| IMP-07 | `connectedDebugAndroidTest` (`MediaPlayerActivityTest`, `MediaPlayerActivityAudioTest`, `WebMediaFullScreenTest`) on my own AVD; the audio test with audio shown as video | `18163b3c1b` | Android emulator API 35, Media3 1.5.1 | the player, data source, cache, audio screen | UC-002, AC-002 (Android) | Pass (red before) | `IMP-07-android-instrumented.log` | 7 `passed`; `memo.mp3 reopen: … read again of the cached: 0`; red `AssertionError: no full-screen button` |
| IMP-08 | iOS Core suite with a 60 s MP4, twice | `2e2a98a51e` | Xcode 26.1.1, iOS 26.1 simulator | Core media types, loader, lists | UC-002, REQ-002 (iOS) | Pass | `IMP-08-ios-core.log` | `Executed 86 tests, with 0 failures`; `AVURLAsset plays ["ogg: true", …]` (the observation) |
| IMP-09 | `NativeMediaPlayerUITests` against the fake node with `--video` and `--audio` | `2e2a98a51e` | Xcode 26.1.1, iOS 26.1 simulator | bridge `playMedia`, player screens | UC-002, AC-002 (iOS) | Pass | `IMP-09-ios-ui-fake-node.log`, `IMP-09-audio-portrait.png` | `testANodeAudioFilePlaysInTheAppsPlayerInPortraitWithItsTitle]' passed`; audio requests `bytes=0-1`, `bytes=0-3841579`, `"authorized": true` |
| IMP-10 | `mobile-shell-probe.mjs --cases=MSP-108,MSP-109,MSP-110` (618's cases); MSP-108 again with a temporary layout block | `4024239e07` | macOS, headless Chrome, probe-owned nodes | the Files tab, Monaco highlighting | UC-003, UC-004, AC-003, AC-004 (rendered) | Pass | `IMP-10-rendered-files-tab.log`, `IMP-10-*.png` | `"1440-default", "layout": "stacked", … "viewer": 450`; `"1280-panel-700-divider-dragged-right", "layout": "split", … "viewer": 400`; `mobile-shell probe: Pass` |

| IMP-11 | IR-002 web: the reference viewer, composable, FileViewer and native viewer specs on the fix and with the six source files as at IR-001; the whole web suite; both typechecks; the web guards | `dc350be435` | macOS, Node 22 | `CollaborationMessageReferenceViewer`, `useNativeMediaPlayback`, `FileViewer`, the players, `MediaSegment` | UC-001, UC-002, SR-003, SR-004, N-6 | Pass (red before) | `IMP-11-ir002-web-reference-and-name.log` | red `Tests  8 failed \| 58 passed (66)`; `Tests  428 passed (428)`; first suite run `6 failed \| 801 passed` (missing contracts `dist/`, cause recorded), rerun `Test Files  6 passed (6)` |
| IMP-16 | CR-003: the Core suite with the new read-ahead cases (and red on IR-005's loader); a seek traced in code on both loaders; the real-node M4A seek test on the fix and on IR-005's loader; the rest of the audio class; 574's scrub and 50 ms delivery tests | `243d269420`, `216bc68baf` | Xcode 26.1.1, iOS 26.1 simulator (own), the real node behind the throttled proxy | `AuthorizedMediaLoader`'s reach by rate; the real-node test's scrubber | REQ-002, AC-002 (iOS seek), CR-003, F-1; 574 AC-001 | Pass (red before) | `IMP-16-cr003-ios-seek-reach.log` | `Executed 91 tests, with 0 failures`; `testCAnM4AOverASlowerLinkSeeksByRange]' passed` with `bytes=964624-1867270`; red: only `bytes=0-1867270`; `REALTIME delivered 13762562 bytes in 10.0 s` |
| IMP-15 | SR-006: the new fence spec on `highlightService` (and red without the `rs`/`zsh` aliases); the table's spec (Monaco only); the audit test; the whole web suite; both typechecks; the guards | `339b8d0ddb` | macOS, Node 22 | `highlightService`'s grammars and aliases, `markdownItPrism`, `languageDetector` | REQ-004, AC-004 (chat leg), SR-006, N-9 | Pass (red before) | `IMP-15-sr006-code-block-highlighting.log` | red: the `zsh`, `rs` and markdown-it cases `×`; `Tests  60 passed (60)`; `Test Files  808 passed (808)` |
| IMP-14 | SR-005: the iOS Core suite with the new `MediaAudioSessionTests`; `NativeMediaPlayerUITests` against the fake node; the simulator log for session failures | `38f318021c` | Xcode 26.1.1, iOS 26.1 simulator (own) | `MediaAudioSession`, the player's present and teardown | REQ-002 (iOS), DEC-007, N-7, N-8 | Pass | `IMP-14-sr005-ios-audio-session.log` | `MediaAudioSessionTests testThePlayerSetsPlaybackWhileItShowsAndRestoresTheCategoryAfter]' passed`; `Executed 88 tests, with 0 failures`; UI `Executed 3 tests, with 0 failures`; log failure lines 0 |
| IMP-13 | CR-002: the reference viewer spec's new case on the fix and on 26ebb05729's viewer; the collaboration, mobile and viewer folders; web typecheck | `36881a6734` | macOS, Node 22 | `CollaborationMessageReferenceViewer`'s reload watch | UC-001, UC-002, CR-002 | Pass (red before) | `IMP-13-cr002-reference-refetch.log` | red `expected { fetches: 3, mounts: 3 } to deeply equal { fetches: 1, mounts: 2 }`; `Tests  308 passed (308)` |
| IMP-12 | IR-002 iOS: `NativeMediaPlayerUITests` against the fake node with `--video` and `--audio` | `fff1b0af0c` | Xcode 26.1.1, iOS 26.1 simulator (own) | `NativeMediaPlayerViewController.addAudioPlaceholder` | C-2, REQ-002 | Pass | `IMP-12-ir002-ios-audio-screen.log`, `IMP-12-audio-playing.png`, `IMP-12-audio-controls.png` | `testANodeAudioFilePlaysInTheAppsPlayerInPortraitWithItsTitle]' passed`; the symbol and the name in `IMP-12-audio-playing.png`; the scrubber in `IMP-12-audio-controls.png` |

- Not run, and why:
  - `tests/e2e/projects/message-references-every-view.e2e.test.ts`: it is gated on a real Antigravity CLI (`RUN_AGY_FAILURE_E2E`) and skipped. Server E2E for the reference route is left to API/E2E.
  - The phone bundle's journey for audio (`test:e2e:mobile-shell` with a new case), the real-node iOS stack, and AC-002's timings in the apps against a throttled node: API/E2E.
  - A red run of the iOS UI tests on the old app: it ignores `playMedia`, so Play audio opens nothing.
  - A rendered `.html`/`.vue` file in the viewer: the unit spec tokenizes them with Monaco's own `html` grammar.
  - IR-002: a rendered reference playing on the desktop or a phone (no probe case opens a media reference; API/E2E). IMP-01…IMP-10 stay valid: IR-002 changed none of the server, the Android app, the iOS Core or the layout and highlighting code.

## Frontend Rendered-Result Check (When Applicable)

- **Affected surfaces / journeys:**
  - the desktop Files tab: layout, divider, the viewer's highlighting;
  - the phone's audio viewer and chat audio tile (native path);
  - the apps' audio screen.
- **Approved references:** REQ-003, AC-003, DEC-001; REQ-004, AC-004; REQ-002. No separate UI/UX spec.
- **Existing design reviewed:** the stacked layout the phone already used; the video viewer's native Play block (574), which the audio one follows in the audio viewer's light colours; the video tile, which the audio tile follows.
- **Rendered surface used:** TESTING.md's browser probes. The mobile-shell probe's desktop window (`nuxt dev` against a probe-owned node), plus a temporary measurement block. The apps on my own emulator and simulator.
- **States, layouts, viewports and interactions inspected:**
  - 1440×900 and 1280×800 with the default 450 px panel: stacked;
  - the panel widened to 700 px: split;
  - the tree divider dragged 600 px right (stops at viewer 400) and left (stops at tree 150);
  - YAML, JSON and text in the viewer, beside and maximized; word wrap off and on (618's cases);
  - phone 390 px (MSP-109);
  - the iOS audio screen (portrait, Back, name); the Android audio screen through its assertions (name shown, controls fully visible, no full-screen button).
- **Visual or interaction issues found and corrected:** none in the rendered states. Before rendering, the unit spec showed the measured width renders on the next tick.
- **Check IDs and limitations:** IMP-10, IMP-09, IMP-07.
  - The Android audio screen was checked by assertions, not by a screenshot.
  - The web's phone audio viewer (Play button) was checked by specs only (IMP-04).

## Downstream Coverage Hints / Suggested Scenarios

- **AC-001:** on a real node, `GET` a message reference with `Range: bytes=…` (206 with the exact bytes, `ETag`, `Accept-Ranges`, `no-store`), with `If-None-Match` (304), past the end (416), and without a range (200).
- **AC-002 on both apps against a throttled node:**
  - an MP3 and an M4A from Files, a chat link and a media message: under 2 s, a seek by a ranged request with the header, a reopen fetching only the probe;
  - an `.ogg` takes the page path on iOS and plays natively on Android;
  - a `.webm` video takes the page path on iOS (N-5);
  - video unchanged.
  - The phone bundle's own journey, per TESTING.md: `test:e2e:mobile-shell`.
- **AC-003:** at 1280×800 and 1440×900, measure the viewer: stacked, with a wrapped line showing 40+ characters. Then widen the panel to 700 px and drag the divider.
- **AC-004:** open a sample of each listed type in the viewer, and in a chat file preview (`write_file`).

## API / E2E / Executable Coverage Investigation And Execution Still Required

- AC-001 on the built server, AC-002 on both apps against the real throttled node, AC-003's rendered probe, and AC-004's rendered viewer and chat preview per type: all as above. API/E2E owns their evidence and pass/fail.

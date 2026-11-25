# API/E2E Execution Coverage Report

## Round

- Coverage investigation: `tickets/in-progress/viewer-polish-647/api-e2e-coverage-investigation.md`
- API/E2E revision record and current revision ID: `tickets/in-progress/viewer-polish-647/api-e2e-revision-record.md`, `API-REV-002`
- Test progress log: `tickets/in-progress/viewer-polish-647/api-e2e-test-progress.md`
- Round and trigger: round 2; implementation IR-002 (SR-003, after CRR-001 F-1/F-2 on round 1's API-011), commit `adcff4d2b2`. Round 1 (IR-001, `812760b2ec`) is API-REV-001.
- Prior round reviewed: round 1 (API-REV-001: `Fail` on API-011). Files changed since round 1 (`git diff --name-only e931df7eb9 adcff4d2b2`): `CollaborationMessageReferenceViewer.vue` and its spec, `mobile-viewer-polish-cases.mjs` (MSP-115, by implementation), docs. Round 1's other cases exercise none of them and stand.
- Deviations from the investigation's plan, and why:
  - Round 2 added API-021: AC-002 as restated names the packaged desktop, so the packaged window opened a real node's Team reference (that node added on the Nodes path: add, connect with a setup code, open its window).
  - API-032 needed temporary diagnostics: the simulator's audio-session client logs no activation or deactivation, so `API647DIAG` lines were added to `MediaAudioSession` and the host screen for the run, then removed (TESTING / finding-the-cause rules; diff kept as evidence).
  - API-014's failures were compared with the base `bc4351cad7` in a fresh clone (`/tmp/api647/base`), and MSP-92 with a temporary MutationObserver record in both trees (reverted), to separate this change's effect from the base and from timing.
  - API-033 also covered "the app" close path (`autobyteus://demo` while iOS's player shows), which reading the code made suspect; the run disproved the suspicion.
- Evidence folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/viewer-polish-647/tickets/in-progress/viewer-polish-647/evidence/api-e2e/`

## Routing Classification

- Task size: `Medium`
- Architectural risk: `Low`
- Input route: `Direct Low-Risk`
- Successful-output route: `Delivery`
- Proportional test-code review decision: `Not Required — direct low-risk route`

## Tested Builds And Environments

| Env ID | Commit Tested | Platform / OS | Runtime, Browser, Or App Build | Other Settings That Matter |
| --- | --- | --- | --- | --- |
| ENV-1 | `812760b2ec` (+ my probe files) | macOS 26 arm64, Node 22 | worktree `autobyteus-web` vitest | `env -i PATH HOME TMPDIR=/tmp/api647/tmp` |
| ENV-2 | `812760b2ec` | macOS arm64 | fresh `--no-local` clone in `/tmp/api647/fresh`, `pnpm install --frozen-lockfile`, `build:electron:mac -- --arm64` (`NO_TIMESTAMP=1 AUTOBYTEUS_BUILD_FLAVOR=personal PRISMA_CLI_BINARY_TARGETS=… CSC_IDENTITY_AUTO_DISCOVERY=false`) | as the release job's macOS ARM64 build |
| ENV-3 | `812760b2ec` | macOS arm64 | ENV-2's `AutoByteus.app` as isolated instance `iso-50568-a204`, own data root `/tmp/api647/desk/data`, window 1440×900 (viewport 1440×868) | `file://…/app.asar/dist/renderer/index.html`; workspace `/tmp/api647/desk/ws` (three PDFs, a JSON file) |
| ENV-4 | `812760b2ec` + my probe files | macOS arm64, headless Chrome | `mobile-shell-probe.mjs`: probe-owned nodes alpha/beta, desktop `nuxt dev` 1440×900, phone production bundle (`build:mobile-web` at 11:00) at `/mobile`, 390×844 DPR 2 touch | scripted runtime; test data only |
| ENV-5 | `812760b2ec` (iOS app; temporary diagnostics only where a case says so) | iOS 26.1 simulator `api647-iPhone17` (mine, created for this ticket) | Debug build, `IOS_BUNDLE_ID=org.autobyteus.mobile` | fake node `fake-mobile-server.py` (30 s 1280×720 MP4, 120 s MP3) or a fresh `native-video-node.mjs` stack per class at the LAN address, 1.5 MB/s; pairing link in a mode-600 file outside the evidence |
| ENV-7 | `adcff4d2b2` | macOS arm64 | fresh `--no-local` clone `/tmp/api647/fresh2`, the release job's build (as ENV-2); isolated instance `iso-60514-f216`, own data root `/tmp/api647/desk2/data` | the remote node: a `native-video-node.mjs` stack on loopback (proxy `127.0.0.1:<port>`), its Reference Team's message with `empty-642.mp4` (0 bytes) and `gone-642.mp4` (deleted); setup code in a mode-600 file, deleted after |
| ENV-8 | `adcff4d2b2` | macOS arm64, headless Chrome | as ENV-4, phone bundle rebuilt (`build:mobile-web` at 13:53) | |
| ENV-6 | `812760b2ec` | Android 15 emulator `api647_api35` (mine, port 5646, `-no-window -gpu host`) | debug APK (`:app:assembleDebug`) | `native-video-node.mjs --origin-host=10.0.2.2`; WebView driven by raw CDP |

## Cases

| Case ID | Criteria | Boundary / Surface | Command Or Steps | Env | Result | Evidence Files | Look For | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| API-001 | AC-001, 002, 005, 006 (specs) | web specs (round 1 on ENV-1; round 2 on `adcff4d2b2`) | `npx vitest run components/fileExplorer/__tests__/MonacoEditor.spec.ts components/workspace/collaboration/__tests__/CollaborationMessageReferenceViewer.spec.ts components/workspace/agent/__tests__/AgentEventMonitor.remoteRunFiles.spec.ts utils/pdf/__tests__/sharedPdfWorker.spec.ts components/fileExplorer/viewers/__tests__/PdfViewer.sharedWorker.spec.ts components/fileExplorer/viewers/__tests__/PdfViewer.touchLayout.spec.ts components/mobile/views/__tests__/MobileFileViewer.zoom.spec.ts` | ENV-1 | Pass (r1, r2) | (command output, progress log) | `Test Files  7 passed (7)`, `Tests  43 passed (43)` | round 2's D-2 spec models a 416 whose `Content-Range` is unreadable (SR-003); a 416 to a fetch without Range stays an error |
| API-001R | regression | whole web suite | Reused: IMP-001 (`pnpm test:nuxt`, 6264 passed) | — | Pass (reused) | — | — | `git diff 9072eb89c4 812760b2ec -- autobyteus-web` is empty |
| API-002 | DESIGN rule 12 | fresh-start build | ENV-2 commands, then the job's verify steps (Prisma ARM64 engines, `verify-packaged-terminal-runtime.mjs` ×2, `--spawn-probe`) | ENV-2 | Pass | `API-002-fresh-start-build/build-excerpt.txt`, `verify.log` | `[typecheck] PASS`; `PRISMA_OK`; `ok: node-pty spawn probe` | the job's "Verify macOS signing policy" needs the runner's signing identity: not run locally (`code has no resources but signature indicates they must be present` on an unsigned build); IMP-007 covers the CI build-only run |
| API-002R | DESIGN rule 12 | CI build-only release | Reused: IMP-007 (run 45584353228 on `da70e7f049`) | — | Pass (reused) | — | — | build inputs (`package.json`, lockfile) unchanged since; round 2 also rebuilt fresh (ENV-7: exit 0, `[typecheck] PASS`) |
| API-003 | AC-004 | iOS code | `grep -n 'DispatchQueue(label' autobyteus-ios/AutoByteusMobileCore/Media/AuthorizedMediaLoader.swift` | ENV-1 | Pass | (this row) | `35:    public let queue = DispatchQueue(label: "org.autobyteus.media-loader")` | |
| API-004R | REQ-003/004 preserved | iOS Core tests | Reused: IMP-005 (Core 91/91) | — | Pass (reused) | — | — | iOS code unchanged since `da70e7f049` |
| API-010 | AC-001 | desktop `nuxt dev` 1440×900, phone 390×844 | `node tests/e2e/mobile-shell-probe.mjs --cases=MSP-108,MSP-109,MSP-110,… --output-dir=/tmp/api647/results/probe-r2` (from `autobyteus-web`) | ENV-4 | Pass | `API-010-editor-gutter/MSP-108-r2.json`, `MSP-109-r2.json`, `MSP-110-r2.json`, screenshots `MSP-108-desktop-1440-*-tsconfig.json.png`, `MSP-109-phone-390-*.png`, `MSP-110-desktop-1440-after-save.png` | every entry of `summary`: `"failures": []`, `"lineNumbers": 0`, `"marginWidth": 6`, `"firstCharOffset": 6`; MSP-110 `"savedEqualsExpected": true` | probe-r1 failed MSP-108/109 on my rewritten line mapping only (a line cut off at the viewport; MSP-110's edit of the fixture); fixed, r2 passes |
| API-011 | AC-002 | desktop `nuxt dev` (cross-origin) and phone page, real node | probe `--cases=MSP-114,MSP-115,MSP-92` (r3, on IR-002; MSP-115 as updated by implementation for the restated AC-002, reviewed) | ENV-8 | Pass (r3); Fail in r1, r2 (round 1) | `API-011-empty-reference/MSP-115-r3.json`, `r3-MSP-115-desktop-empty-647.mp4.png`, `r3-MSP-115-phone-empty-647.mp4.png`, `r3-MSP-115-desktop-gone-647.mp4.png`, `MSP-114-r3.json`, `MSP-92-r3.json`, `probe-r3-cleanup-and-unknown-errors.json`; round 1: `MSP-115-r1.json`, `MSP-115-r2.json`, `MSP-115-desktop-empty-647.mp4.png` | r3 desktop `…empty-647.mp4 This video could not be played. Retry`, phone `empty-647.mp4 This video could not be played. Retry`, deleted `Reference file unavailable…`; `"unknownBrowserErrors": []`; MSP-114 and MSP-92 Pass | round 1's failure: "Failed to fetch reference content (416)" on the desktop (CRR-001 F-1); fixed by SR-003's status-only rule |
| API-012 | AC-005 | desktop `nuxt dev`, phone production bundle | probe `--cases=MSP-116` (r1), `MSP-117` (r2) | ENV-4 | Pass | `API-012-pdf-worker-probe/MSP-116-r1.json`, `MSP-117-r2.json`, `MSP-116-desktop-gamma-after-alpha-beta.png`, `MSP-117-phone-gamma-after-alpha-beta.png` | MSP-116 5 rounds `alpha-647.pdf:3/3 beta-647.pdf:2/2 gamma-647.pdf:4/4` + 5 switches, `"workers"` 1 (dev worker by URL, `"jsBlobs": 0`); MSP-117 3 rounds, `"workers": [{"scheme": "blob", "type": "module"}]`, `"jsBlobs": 1` | MSP-117 r1 failed in my harness (the Files list counted as reached while the viewer still covered it); fixed |
| API-013 | AC-006 | desktop `nuxt dev` | probe `--cases=MSP-118` | ENV-4 | Pass | `API-013-status-line/MSP-118-r1.json`, `MSP-118-desktop-status-in-run-a.png`, `MSP-118-desktop-run-b.png`, `MSP-118-desktop-run-a-again.png` | `"shown": {"status": "The file preview could not be opened."…}`, `"otherRun": {… "statusElements": 0…}`, `"backAgain": {… "statusElements": 0…}` | trigger: the run-relative link out of the run's folder; D-6 clears the line whatever its message |
| API-014 | regression | whole phone probe | `node tests/e2e/mobile-shell-probe.mjs --output-dir=/tmp/api647/results/probe-full`; the failures rerun alone (`--cases=…`); the same cases on a fresh clone of the base `bc4351cad7` (install, SDK `dist`, server, `build:mobile-web`); MSP-92 ×2 on each with a temporary MutationObserver record (reverted) | ENV-4 | Pass (no regression from this change) | `API-014-full-probe/probe-full-summary.json`, `probe-rerun8-summary.json`, `probe-base7-summary.json`, `msp-92-head-vs-base-every-text.txt` | full run `"Pass": 105, "Fail": 9`; failures other than MSP-115 fail on the base too (MSP-17, 58, 61, 65, 82, 87) or are timing (MSP-92: identical texts on both, Pass ×2 each); cleanup `rootRemoved: true` | MSP-115 is API-011. Base failures: FU-001 (MSP-61 is 609 FU-006). MSP-92's flash of "Video URL is not available." on both: FU-002. Round 2: stands; IR-002 changed one condition in `CollaborationMessageReferenceViewer.vue`, whose cases (MSP-92, 114, 115) ran again in API-011 r3 |
| API-020 | AC-005, AC-001 (packaged) | packaged `file://` window | `node evidence/api-e2e/API-020-packaged-window/packaged-window.mjs http://127.0.0.1:<controlPort> <out> <ws>` (`WEB_PKG=<worktree>/autobyteus-web/package.json`); instrumentation registered with `Page.addScriptToEvaluateOnNewDocument`, window reloaded | ENV-3 | Pass | `API-020-packaged-window/packaged-window-result.json`, `packaged-gamma-after-alpha-beta.png`, `packaged-json-editor.png`, `packaged-json-after-save.png` | 5 rounds `…gamma-647.pdf:4/4` + switches; `"workers": [{"scheme": "blob", "type": "module"}]`, `"jsBlobs": 1`, `"workerPort": false, "workerSrc": ""`; JSON `"lineNumbers": 0`, `"marginWidth": 6`, `"firstChar": {"ch": "{", "offset": 6}`, `"savedOnDisk": true`, `"savedShown": true` | the file on disk is exactly the original + `\nEDITED-647.` (`od -c`); the script's `savedIsOriginalPlusEdit: false` is my comparison's error (it trimmed the original's final newline). Window size set with System Events (CDP's Browser domain is not offered) |
| API-021 | AC-002 (packaged desktop) | packaged `file://` window, cross-origin to a remote node | `WEB_PKG=<worktree>/autobyteus-web/package.json SETUP_CODE=<from the node's `node-access-cli.js setup-code`, never printed> node packaged-remote-reference.mjs <controlEndpoint> http://127.0.0.1:<proxyPort> <out>` (adds and connects the node through `window.electronAPI`, opens its window), then `packaged-remote-reference-resume.mjs` (the Team's references in that window) | ENV-7 | Pass | `API-021-packaged-empty-reference/packaged-remote-reference-result.json`, `packaged-remote-empty-reference.png`, `packaged-remote-gone-reference.png`, `node-log-reference-requests.json`, scripts `*.mjs.txt` | `"windowContext": "{\"windowId\":2,\"entryId\":\"remote-api647-…\"}"`, `"origin":"file://"`; responses `bytes=0-0` 416 `bytes */0`, `bytes=0-` 416, deleted 404; empty text `This video could not be played. Retry`, no `Failed to fetch`; `"pass": true` | the resume script exists because the first script's Team-row locator needed the folder and Team definition rows expanded; the node was added once |
| API-030 | AC-003, AC-002 (failure) | iOS, fake node | `xcodebuild … -only-testing:AutoByteusMobileUITests/NativeMediaPlayerUITests AUTOBYTEUS_TEST_NODE_URL=http://127.0.0.1:<p>/mobile test` | ENV-5 | Pass | `API-032-ios-session/fake-node-class-result.txt` | `Executed 4 tests, with 0 failures` | run twice (without and with diagnostics) |
| API-031 | AC-003, 574/642 preserved, AC-002 (iOS app) | iOS, real node | `TEST_RUNNER_AUTOBYTEUS_574_REAL_NODE_INFO=<stack-info.json> TEST_RUNNER_AUTOBYTEUS_574_REAL_NODE_SECRETS=<secrets> xcodebuild … -only-testing:AutoByteusMobileUITests/NativeMediaRealNodeUITests test-without-building`, then `…/NativeVideoRealNodeUITests` on a second fresh stack | ENV-5 | Pass | `API-031-ios-real-node/media-class-result.txt`, `video-class-result.txt`, `media-audio-controls-shown.png`, `video-wide-landscape-controls-shown.png`, `media-testF-empty-video-reference.png`, `media-class-diagnostics.txt`, `video-class-diagnostics.txt` | `Executed 10 tests, with 0 failures`; `Executed 8 tests, with 0 failures`; screenshots: iOS's ✕, AirPlay, title, scrubber, no app bar | the video frame is from the screen recording (API-033), rotated (`transpose=2`) |
| API-032 | AC-003 (session per close path) | iOS app process | temporary `API647DIAG` NSLog in `MediaAudioSession.begin/end` and the host's `viewDidDisappear`/teardown/`deinit` (diff `API-032-ios-session/temporary-diagnostics.diff`), read from `simctl spawn … log stream` during API-030, 031, 033 | ENV-5 | Pass | `API-032-ios-session/fake-node-class-diagnostics.txt`, `API-031-ios-real-node/*-diagnostics.txt`, `API-033-ios-page-and-app-path/diagnostics.txt` | every `session begin` has a `host teardown runs` and `session end: deactivated=1, category now AVAudioSessionCategorySoloAmbient`, then `host deinit`: fake node 4/4 (Back after failure, iOS close ×2, swipe), media class 9/9 (testH swipe 0.7 s, iOS close 2.1 s after the action), video class 6/6, app path 1/1 | diagnostics removed (`git checkout` of both files), `grep API647DIAG` empty |
| API-033 | AC-005 (iOS page), AC-001 (iOS page), AC-003 (app path, landscape controls) | iOS WKWebView and app shell | temporary `Viewer647TempUITests` (copy `API-033-ios-page-and-app-path/Viewer647TempUITests.swift.txt`) on a fresh stack with `pdf-647/` added to its workspace; screen recorded with `simctl io recordVideo` | ENV-5 | Pass | `API-033-ios-page-and-app-path/result-and-marks.txt`, `wkwebview-pdfs-and-json.png`, `diagnostics.txt`, `player-before-app-close.png`, `after-app-close-demo.png` | `PDF … errorText=false` ×6 and the pages drawn; `APPCLOSE gone=true`; `CONTROLS close=true scrubber=true title=true appBack=false`; diagnostics at 11:27:04.995 `host teardown runs`, `session end: deactivated=1` | the class was deleted and the project regenerated after the run |
| API-040 | AC-001, AC-002, AC-005 (Android) | Android WebView + native player | debug APK; pair by `am start -a android.intent.action.SEND … -n org.autobyteus.mobile/.MainActivity`; `adb forward tcp:9647 localabstract:webview_devtools_remote_<pid>`; `node android-647.mjs 9647 <out> pdf|refs` (copy `API-040-android/android-647.mjs.txt`) | ENV-6 | Pass | `API-040-android/android-pdf-json-result.txt`, `android-gamma-screencap.png`, `android-json.png`, `android-empty-reference.png`, `android-refs-result.json` | `gamma-647.pdf:4/4 inked 4` (×2 rounds), `"jsBlobs":1`, one `blob` module worker; JSON `"marginWidth":6`, `"offset":6`, `"lineNumbers":0`; empty ref: `"fetchError":false`, `MediaPlayerActivity` count 1, texts `This video could not be played.` / `BACK` | the first run's CDP screenshot was blank (capture artifact); the rerun added a pixel check and an adb screencap |

## Acceptance-Criteria Proof

| Acceptance-Criteria ID | Critical | Proven By Case IDs | Result | Notes |
| --- | --- | --- | --- | --- |
| AC-001 | Yes | API-010, API-020, API-033, API-040, API-001 | Proven | desktop `nuxt dev` 1440×900 (panel and maximized), packaged window 1440×900, phone 390×844, iOS WKWebView, Android WebView: 0 line numbers, no fold or glyph margin, margin 6 px, first character 6 px; edit + save on the desktop (MSP-110, packaged) |
| AC-002 (restated in SR-003) | Yes | API-011 (r3), API-021, API-031 testF, API-040, API-001 | Proven | dev desktop and packaged window (both cross-origin) and phone page: no "Failed to fetch reference content", the media viewer shows "This video could not be played." with Retry; iOS and Android apps: no page error, their native "could not be played" screen (round 1, still valid: SR-003's `status === 416` matches wherever round 1's header check matched, and those pages are same-origin); deleted reference: "unavailable" everywhere |
| AC-003 | Yes | API-030, API-031, API-032, API-033 | Proven | iOS's player for video and audio with its close and title, no app bar (screenshots with controls shown); close, swipe down, failure + Back and the app replacing its screen each end playback and deactivate the session (diagnostics); wide video in landscape; 574/642 classes 10/10 and 8/8 |
| AC-004 | No | API-003 | Proven | label string |
| AC-005 | Yes | API-020, API-012, API-033, API-040, API-001 | Proven | packaged window: 1 module worker, 1 `text/javascript` blob, 15 fresh opens + 5 switches; phone 1 blob (9 opens); iOS WKWebView and Android WebView render the sequence (Android: 1 blob) |
| AC-006 | No | API-013, API-001 | Proven | |

## Validation Confidence Scorecard (Mandatory)

| Confidence Category | Post-Repository Score | Final Score | What Supports It | Residual Uncertainty | What Could Improve It |
| --- | --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 80% | 95% | every AC on its named surfaces (AC-002: API-011 r3, API-021, API-031, API-040) | the apps' empty reference was not rerun on IR-002's bundle (reasoned: a superset condition on same-origin pages) | rerun iOS testF and Android on IR-002 |
| Changed-boundary execution directness | 75% | 95% | API-010…040, API-021 | | |
| Cross-boundary integration realism and mock gap | 65% | 95% | real nodes, real browsers, packaged window with a remote node, real simulator and emulator | | |
| Environment, configuration, identity, and fixture fidelity | 80% | 95% | ENV-2…8 | iOS simulator, not a device (Ring/Silent, 642's accepted limit) | |
| Failure, edge-case, lifecycle, and recovery evidence | 75% | 95% | API-032 (every close path, measured per session), API-020 (15 fresh opens), API-011/021 (empty and deleted) | iOS's session state read from temporary logs of `setActive`'s answer (iOS has no public "is active" getter) | |
| User-surface, browser, and desktop-shell confidence | 75% | 95% | packaged window (API-020, 021), probes, apps | | |
| Durable regression coverage quality and relevance | 85% | 95% | MSP-108…110 updated; MSP-115…118 added; API-014 | the whole probe is red on the base for other cases (FU-001); this ticket's cases are green | FU-001 |

- Overall post-repository confidence: 76%
- Overall final confidence: 95%
- Calculation method: simple average of the seven categories
- Every critical acceptance criterion directly proven: `Yes`
- Any final applicable category below `90%`: `No`
- Default final confidence target of `95%` met: `Yes`
- Confidence-limiting residual risks: the apps' empty reference not rerun on IR-002 (reasoned); the session on a device's Ring/Silent switch (simulator only, as in 642)

## Broader Validation Decision (Mandatory)

- Decision: `Required` (executed)
- Execution mode: `Browser`, `Project Desktop Validation`, `Lifecycle` (iOS, Android)
- Gap: rendered geometry, real pdf.js workers (packaged `file://`, WKWebView, Android WebView), the real node's 416, AVKit presentation and teardown.
- Browser validation needed: yes; in round 1 it found the AC-002 failure that the mocked spec could not, and round 2 proves the fix on the same surfaces plus the packaged window.

## Desktop Application Validation

- Approach: ENV-2's packaged app in my isolated instance (API-020) for the shell-specific inline worker and the editor; `nuxt dev` for the web-equivalent journeys (API-010…013).
- Effect on any already-running desktop application: `None` (the three instances from `/Applications/AutoByteus.app` were not touched).
- AC-002 in the packaged window: API-021 (round 2), a remote node's Team reference in its node window. Correction to round 1's expectation: the implementation found (IMP-008) that the packaged `file://` window reads `Content-Range`, so round 1's failure was specific to the dev desktop's `http://` origin; SR-003's status-only rule holds on both.

## Compatibility / Legacy Scope Check

- Backward compatibility in scope: `No`
- Compatibility-only behavior observed: `No`
- Durable coverage kept only for compatibility: `No`

## Durable Coverage Changed In The Codebase

- Repository-resident durable coverage added, updated, or removed this round: `Yes`

| Path / Test | Change | Case IDs | Notes |
| --- | --- | --- | --- |
| `autobyteus-web/tests/e2e/mobile-file-word-wrap-cases.mjs` (MSP-108, 109, 110) | Updated | API-010 | rows matched to the file's lines (read from disk) by text; line numbers, fold controls, glyph margin, margin > 10 px, first character > 12 px are failures (647 AC-001); MSP-110 finds line 4 by text |
| `autobyteus-web/tests/e2e/mobile-viewer-polish-cases.mjs` (MSP-115…118) | Added | API-011, 012, 013 | registered in `mobile-shell-probe.mjs`; MSP-115 updated by implementation (`9278fca6ff`) for the restated AC-002 and reviewed by me: it asserts "This video could not be played." with Retry and no fetch error, and accepts the phone's `ERR_REQUEST_RANGE_NOT_SATISFIABLE` only on a `blob:` URL in MSP-115 |
| `autobyteus-web/tests/e2e/mobile-shell-probe.mjs` | Updated | | import and call of `runViewerPolishCases` |
| `autobyteus-web/tests/e2e/mobile-file-zoom-cases.mjs` | Updated | | `multiPagePdf` exported, optional label (default output unchanged) |

- Test-code review: `Not Required — direct low-risk route`

## Dependencies Mocked Or Emulated

| Dependency | Method | Why Real Dependency Was Not Used | Confidence Limitation |
| --- | --- | --- | --- |
| Agent runtime | scripted runtime (`ECHO_INPUT`, `CALL_TOOL`) | no provider needed for viewers | none for this change |
| The node for `NativeMediaPlayerUITests` | `fake-mobile-server.py` | the class's design | covered again by the real-node classes |
| A phone | iOS simulator, Android emulator | no device | Ring/Silent switch not exercised (642's known limit) |

## Temporary Methods And Cleanup

| Item | Owned By This Run | Cleanup Action | Result |
| --- | --- | --- | --- |
| Isolated instances `iso-50568-a204`, `iso-60514-f216` | Yes | `isolated-app stop` | stopped; `list` shows none of mine |
| Remote node entry and its credential in `iso-60514-f216` | Yes | in that instance's own data root `/tmp/api647/desk2/data`, removed with `/tmp/api647` | the setup-code file deleted after use; the code is in no evidence |
| Probe stacks (probe-r1, r2, full, rerun8, base7, MSP-92 ×4, r3) | Yes | the probe's own cleanup | r3 receipt `frontendExited: true, serversLeft: 0, rootRemoved: true` |
| `native-video-node.mjs` stacks ×6 (+1 that failed to start: a loopback pairing host) | Yes | control `/stop` | stopped |
| `fake-mobile-server.py` | Yes | stopped at the end of the round | see progress log |
| `API647DIAG` diagnostics, `Viewer647TempUITests.swift` | Yes | `git checkout` of the two Swift files; file deleted; project regenerated | `grep -rn API647DIAG autobyteus-ios` empty; not committed |
| Simulator `api647-iPhone17` | Yes | kept until the ticket closes (reruns); deleted with `/tmp/api647` | |
| Android AVD `api647_api35` | Yes | `emu kill`, `avdmanager delete avd` | deleted |
| Temporary MSP-92 MutationObserver edit (worktree and base clone) | Yes | `git checkout` of `mobile-file-open-cases.mjs` in both | `grep __seen92` finds nothing |
| `/tmp/api647` (fresh clones at round 1, round 2 and base, builds, results) | Yes | removed when the Solution Designer asks | kept until then |

## Latest Authoritative Result

- Result: `Pass`
- Criteria not proven, parts only the user can check, or accepted as unverified risk: `None`
- Evidence decisions requested: `None`
- Next recipient from `get_handoff_rules`: `/delivery_engineer` (direct route, Medium / Low, test-code review not required)
- Notes:
  - Round 1's failure (API-011, AC-002 on the desktop) is resolved by SR-003/IR-002: dev desktop, packaged window and phone page now reach the media viewer with no fetch error.
  - Follow-ups recorded: FU-001 (phone probe cases red on the base), FU-002 (the reference viewer's "not available" flash; MSP-92 sampling).
  - Documentation for delivery: the requirements doc's DEC-002 text still describes SR-001's `workerPort` (SR-002 replaced it with `{ url, worker }`); no test consequence.

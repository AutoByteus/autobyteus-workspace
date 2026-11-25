# API/E2E Coverage Investigation

## Investigation Meta

- Requirements Doc: `tickets/in-progress/viewer-polish-647/requirements-doc.md` (REQ-001…REQ-006, AC-001…AC-006, DEC-001…DEC-003)
- Investigation Notes: `tickets/in-progress/viewer-polish-647/investigation-notes.md`
- Solution Revision Record: `tickets/in-progress/viewer-polish-647/solution-revision-record.md` (SR-001, SR-002)
- Design Spec (required on every route): `tickets/in-progress/viewer-polish-647/design-spec.md` (D-1…D-6; D-5 revised in SR-002)
- Supplemental Task Artifacts: none
- Design Review Report: `N/A — not applicable` (direct route)
- Architecture Review Revision Record: `N/A — not applicable`
- Implementation Handoff: `tickets/in-progress/viewer-polish-647/implementation-handoff.md` (IR-001)
- Implementation Revision Record: `tickets/in-progress/viewer-polish-647/implementation-revision-record.md`
- Code Review Report: `N/A — not applicable` (direct route)
- Code Review Revision Record: `N/A — not applicable`
- Delivery Revision Record: N/A
- API/E2E Revision Record: `tickets/in-progress/viewer-polish-647/api-e2e-revision-record.md`
- Current API/E2E Revision ID: `API-REV-001`
- Current Investigation Round: 1
- Trigger: implementation complete, IR-001, Medium / Low direct route, commit `812760b2ec` on base `bc4351cad7`
- Prior Investigation Reviewed: none (first round)
- Latest Authoritative Investigation: this file

## Current Requirement And Design Basis

- **REQ-001 / D-1:** the shared Monaco editor (`MonacoEditor.vue`) is created with `lineNumbers: 'off'`, `lineNumbersMinChars: 0`, `glyphMargin: false`, `folding: false`, `lineDecorationsWidth: 6`. AC-001: desktop 1440×900 and phone 390×844, no line numbers, gutter ≤ 10 px, a JSON file's first character within 12 px of the editor's left edge, edit and save on the desktop.
- **REQ-002 / D-2:** `CollaborationMessageReferenceViewer` treats the probe's `416` with `Content-Range: bytes */0` as an empty file (as for a 206). AC-002: no error text; the player shows (desktop, the phone's page path) or the native player opens (apps); a missing reference still says it is not available.
- **REQ-003 / D-3:** iOS presents `AVPlayerViewController` full screen over the app's black host screen, which keeps the loader, cache, audio session, landscape and failure. Title from `externalMetadata`, no app bar. Every close path (iOS's close, a swipe down, Back after a failure, the app) runs the host's `viewDidDisappear` teardown: playback ends, `MediaAudioSession.end()`. AC-003: screenshots with controls shown, the session after each close path, landscape for a wide video, 574/642's iOS tests pass.
- **REQ-004 / D-4:** queue label `org.autobyteus.media-loader`.
- **REQ-005 / D-5 (SR-002):** `getSharedPdfWorker()` makes one inline module worker (Vite `?worker&inline`, one blob) and one bundled `PDFWorker` wrapper; `PdfViewer` passes `{ url, worker }`; `GlobalWorkerOptions` unset. AC-005: desktop (Electron build) and phone, three PDFs, each renders, `text/javascript` blob URLs ≤ 1 per session; the design's Guidance adds IMP-003's fresh-open sequence (several rounds).
- **REQ-006 / D-6:** `AgentEventMonitor` clears `filePreviewStatus` when `effectiveRunId` changes. AC-006: status shown in run A, gone in run B, still gone back in A.
- Persisted data: not affected. No compatibility path (handoff's Legacy / Compatibility Removal Check is clean: the iOS app bar, the full vue-pdf-embed build and SR-001's `workerPort` removed).

## Supported Scenarios And Real Usage

- The requirements doc has no `SCN-*` table; the scenarios come from the ACs and the design's Guidance.
- Real-use scenarios added from the implementation:
  - **The PDF fresh-open sequence** (design Guidance, DI-001): a user opens one PDF after another, so the previous viewer unmounts while the next mounts. Trigger: clicking files in the desktop Files tree after "Close all files", and on the phone going back to the Files list and tapping the next PDF.
  - **The Android app's page** (handoff hint): D-1, D-2 and D-5 run in the Android WebView too; the inline module worker from a blob URL must work there. Trigger: the paired Android app opening a JSON file, a PDF and the empty reference.
  - **The iOS app's page in WKWebView:** the PDF sequence under WebKit (module worker from a blob URL in WKWebView).
  - **The audio session after each close path** (handoff hint): judged in the simulator's unified log (AVAudioSession activation and deactivation of the app's process) plus the node's delivered bytes stopping after the close.
  - **AC-006's trigger:** a run-relative link out of the run's folder shows "The file preview could not be opened." on the same status line D-6 clears. The "on node X" text of AC-006 is one message of that line; D-6 clears the line whatever its message, and the web spec covers the "on node X" message itself.
- Unsupported/contrived scenarios: none recorded by the designer.

## Changed Behavior Summary

| Behavior ID / Boundary | Change Type | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| D-1 editor gutter (web, desktop + phone + Android WebView) | Changed | design D-1; IMP-001, IMP-004 | 618's probe cases MSP-108/109/110 measured wrapped rows by line numbers and asserted they are shown: made untrue, rewritten. Measured on desktop, phone, packaged window, Android |
| D-2 empty media reference (web) | Changed | design D-2; IMP-001, IMP-006 | New probe case MSP-115 (desktop + phone page); iOS testF (changed by implementation) rerun; Android app checked |
| D-3 iOS player presentation | Changed | design D-3; IMP-005, IMP-006 | Rerun iOS UI classes on my own simulator and fresh stacks; add the session and bytes evidence per close path; screenshots |
| D-4 queue label | Changed | design D-4 | Code check |
| D-5 PDF worker | Changed | design D-5, SR-002; IMP-003 | New probe cases MSP-116 (desktop) and MSP-117 (phone, blob count); packaged window; iOS WKWebView and Android WebView sequences |
| D-6 status line | Changed | design D-6; IMP-001 | New probe case MSP-118 (desktop) |
| 574/642 iOS behavior (header credential, cache, placeholder, landscape) | Preserved | handoff | 574/642 real-node classes rerun |
| Desktop editing | Preserved | REQ-001 | MSP-110 (edit + save), API-020 packaged edit + save |

## Changed Surface And Boundary Classification

| Surface / Boundary | Affected? | Actual Changed Boundary | Repository Evidence Available | Material Risk Not Exercised By That Evidence | Candidate Broader Validation Mode |
| --- | --- | --- | --- | --- | --- |
| Domain / backend logic | No | none (the node's 416 answer is unchanged) | n/a | none | none |
| API / transport / contract | No | the reference route is unchanged; D-2 reads its existing 416 | spec doubles the 416 | that the real node answers `bytes */0` | probe against a real node (MSP-115) |
| Frontend component / state | Yes | MonacoEditor options, reference viewer, PdfViewer source, AgentEventMonitor watch | IMP-001 specs (red → green) | rendered geometry; pdf.js in a real browser | rendered probes |
| Browser integration / user journey | Yes | Monaco rendering, `<video>` of an empty file, pdf.js worker | none in a browser | all of it | phone probe (desktop `nuxt dev` + phone bundle) |
| Authentication / session / permissions | No | | | | |
| Desktop renderer / web-equivalent UI | Yes | same as web | | | `nuxt dev` window |
| Desktop shell / Electron-specific integration | Yes | the inline worker in the packaged `file://` window (DEC-002) | IMP-003 | independent proof on HEAD | packaged build + isolated instance (API-020) |
| Process / lifecycle | Yes (iOS) | AVKit presentation and dismissal, `viewDidDisappear` teardown, audio session | Core `MediaAudioSessionTests`, IMP-005/006 | the session's state in the app after each close path | iOS simulator: UI tests, unified log, node bytes |
| Persisted-data transition | No | | | | |
| Worker / queue / distributed coordination | Yes | one pdf.js worker for the app's lifetime | specs | real worker lifetime across documents | probes and app WebViews |
| External integration | No | | | | |

## Project Execution Discovery

- Assigned task worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/viewer-polish-647`, branch `codex/viewer-polish-647`, commit `812760b2ec`.
- Project type: pnpm monorepo; Nuxt web (desktop renderer and phone bundle), Electron shell, Node server, iOS (Swift, XcodeGen), Android (Kotlin, WebView).
- Testing guideline: `TESTING.md` (root). No closer `TESTING*.md` for the changed paths.
- Conflicting or unclear instructions: none found. The requirements doc's DEC-002 text still says "sets pdf.js's `workerPort`", which SR-002 replaced (`{ url, worker }`, `GlobalWorkerOptions` unset). The design and code agree; the doc text is stale (reported, not a test question).
- Changed build-input paths: `autobyteus-web/package.json`, `pnpm-lock.yaml` → the fresh-start build (API-002), plus IMP-007's build-only release run.
- Secrets: none needed (no provider keys; the real-node pairing link stays in a mode-600 file outside the evidence).

| Instruction / Configuration Path | Authority / Purpose | Commands, Setup, Or Constraints Learned |
| --- | --- | --- |
| `AGENTS.md`, `TESTING.md` | project rules | `env -i` clean env; never the user's app or `~/.autobyteus`; own emulator/simulator; one heavy run at a time |
| `TESTING.md` § Fresh-start build, `.github/workflows/release-desktop.yml` | build inputs | fresh `--no-local` clone, frozen install, `build:electron:mac -- --arm64`, the job's verify steps |
| `TESTING.md` § Rules, `docs/isolated-app-instances.md` | packaged desktop | `pnpm --silent isolated-app start --app <app> --data-root <dir>`, its `controlPort`, `stop` |
| `TESTING.md` § Browser probes | probe stack | `pnpm -C autobyteus-web test:e2e:mobile-shell --cases=… --output-dir=<fresh>`; phone bundle from `build:mobile-web` |
| `autobyteus-web/tests/e2e/native-video-node.mjs` | real node for the apps | `--origin-host`, `--listen-host`, `--secrets-file`, control `/log`, `/stop` |
| `TESTING.md` § Android emulators, `autobyteus-android/README.md` | Android | own AVD, own `-port`, `-no-window`; `./gradlew :app:assembleDebug` |
| `autobyteus-ios/scripts/generate-project.sh` | iOS | XcodeGen; `xcodebuild` with `IOS_BUNDLE_ID`, `IOS_SHARE_EXTENSION_BUNDLE_ID` |

| Component / Dependency | Working Directory | Start / Setup Command | Runtime / Resource Notes | Readiness Check | Stop / Cleanup Method |
| --- | --- | --- | --- | --- | --- |
| Fresh packaged app | `/tmp/api647/fresh` | clone + install + `build:electron:mac -- --arm64` | ~8 min | exit 0, verify steps | `rm -rf /tmp/api647` at ticket close |
| Isolated instance | worktree | `isolated-app start --app <fresh app> --data-root /tmp/api647/desk/data` | own data root, control port on loopback | `ok: true`, window listed | `isolated-app stop <id>`; `list` shows none |
| Phone probe stack | `autobyteus-web` | `test:e2e:mobile-shell --cases=… --output-dir=/tmp/api647/results/<run>` | probe-owned nodes and `nuxt dev` | probe setup | probe cleanup receipt |
| Real node for the apps | worktree | `native-video-node.mjs … --listen-host=<LAN IP>` | proxy logs bytes | `/info` | control `/stop` |
| iOS simulator `api647-iPhone17` | | `simctl create` + `boot` | mine | booted | `simctl delete` |
| Android AVD `api647_api35` | | `emulator -avd api647_api35 -port 5646 -no-window -gpu host` | mine | `sys.boot_completed` | `adb -s emulator-5646 emu kill`, `avdmanager delete avd` |

| Data / Fixture / Identity Need | Existing Project Mechanism Or Creation Method | Environment / Data-Safety Notes | Cleanup / Retention |
| --- | --- | --- | --- |
| Three PDFs (3, 2, 4 pages), a JSON file | `multiPagePdf` (now exported from `mobile-file-zoom-cases.mjs` with a label) | test data in owned folders | removed with the stack / `/tmp/api647` |
| A Team message referencing a zero-byte video and a deleted one | lead's `send_message_to` over `/ws/agent-team` (642's method); `native-video-node.mjs`'s Reference Team for the apps | scripted runtime, no provider | with the stack |
| Runs with a run-relative out-of-folder link | scripted runtime `ECHO_INPUT` | | with the stack |

## Existing Durable Coverage Inventory

| Path / Test | Current Assertion Or Intent | Related | Validity Decision | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/tests/e2e/mobile-file-word-wrap-cases.mjs` MSP-108/109/110 (618) | wrapped rows found as rows without a line number; "no line numbers" is a failure; MSP-110 finds line 4 by its number | REQ-001 | Needs Update | D-1 turns line numbers off: every check would fail ("no line numbers", no wrapped rows found) | Rows matched to the file's lines by text; line numbers now a failure; AC-001's gutter, glyph, folding and first-character checks added |
| `MonacoEditor.spec.ts`, `CollaborationMessageReferenceViewer.spec.ts`, `AgentEventMonitor.remoteRunFiles.spec.ts`, `sharedPdfWorker.spec.ts`, `PdfViewer.sharedWorker.spec.ts`, `PdfViewer.touchLayout.spec.ts`, `MobileFileViewer.zoom.spec.ts` | the D-1, D-2, D-5, D-6 contracts | REQ-001, 002, 005, 006 | Still Valid | IMP-001 red → green | Rerun (API-001) |
| `mobile-file-viewer-media-cases.mjs` MSP-114 (642) | references play by range; deleted says unavailable | REQ-002 (preserved) | Still Valid | not touched by D-2 (206 path) | Rerun with the probe |
| `mobile-file-zoom-cases.mjs` MSP-43 (472) | PDF pinch zoom on the phone | REQ-005 (rendering) | Still Valid | the fixture function exported, unchanged output by default | Rerun |
| `mobile-file-open-cases.mjs` MSP-92 etc., `mobile-heading-links-cases.mjs` MSP-100 | reference loading, status line text | REQ-002, REQ-006 | Still Valid | | Rerun in the whole probe |
| iOS `NativeMediaPlayerUITests` (implementation's, fake node) | D-3 presentation, close, swipe, could-not-play | REQ-003 | Still Valid | IMP-005 | Rerun on my simulator |
| iOS `NativeMediaRealNodeUITests`, `NativeVideoRealNodeUITests` (mine, changed by implementation) | 574/642 on a real node; close via iOS's close; testH swipe + close; testF empty reference | REQ-002, REQ-003 | Still Valid after implementation's update | read the diff: `closePlayer` taps iOS's "Close Button" after showing controls; testF asserts the page has no fetch error and the app's screen opens | Rerun on fresh stacks |
| `AutoByteusMobileCoreTests` `MediaAudioSessionTests`, loader tests | session begin/end, loader | REQ-003, REQ-004 | Still Valid | IMP-005 91/91 on `da70e7f049` = HEAD's iOS code | Reused |

## Planned Cases

| Case ID | Criteria | Boundary / Surface | Kind | Planned Command Or Steps | Why |
| --- | --- | --- | --- | --- | --- |
| API-001 | AC-001, 002, 005, 006 | web specs | Existing Test | `npx vitest run` the seven spec files above (from `autobyteus-web`, `env -i`) | cheap independent rerun on HEAD |
| API-001R | regression | whole web suite | Reused | IMP-001 (`pnpm test:nuxt` 6264 passed) | web files unchanged since `9072eb89c4` (`git diff 9072eb89c4 HEAD -- autobyteus-web` is empty, apart from my probe files) |
| API-002 | DESIGN rule 12 | fresh-start build | Durable command | fresh `--no-local` clone at HEAD, frozen install, `build:electron:mac -- --arm64`, the job's ARM64 verify steps | `package.json`/lockfile changed |
| API-002R | DESIGN rule 12 | CI build-only release run | Reused | IMP-007 (run 45584353228 on `da70e7f049`) | later commits are docs only |
| API-003 | AC-004 | iOS code | Code check | `grep DispatchQueue(label` in `AuthorizedMediaLoader.swift` | label string |
| API-004R | REQ-003/004 preserved | iOS Core tests | Reused | IMP-005 (Core 91/91) | iOS code unchanged since `da70e7f049` |
| API-010 | AC-001 | desktop `nuxt dev` 1440×900, phone 390×844 | Durable (updated) | probe `--cases=MSP-108,MSP-109,MSP-110` | AC-001's sizes, JSON first char, edit + save |
| API-011 | AC-002 | desktop + phone page, real node | Durable (new) | probe `--cases=MSP-115` | the real 416 `bytes */0` |
| API-012 | AC-005 | desktop `nuxt dev`, phone production bundle | Durable (new) | probe `--cases=MSP-116,MSP-117` | DI-001's sequence, blob count on the phone |
| API-013 | AC-006 | desktop `nuxt dev` | Durable (new) | probe `--cases=MSP-118` | the real run switch in a reused monitor |
| API-014 | regression | whole phone probe | Existing Test | `pnpm -C autobyteus-web test:e2e:mobile-shell --output-dir=…` | every file-viewer, reference and status-line case |
| API-020 | AC-001, AC-005 (packaged) | packaged `file://` window | Temporary Probe | isolated instance of API-002's app; `evidence/api-e2e/API-020-packaged-window/packaged-window.mjs` over the control port | ticket-specific shell check; the packaged probe harness would need a new suite for one-off counts |
| API-030 | AC-003, AC-002 (iOS) | iOS simulator, fake node | Existing Test | `xcodebuild … -only-testing:AutoByteusMobileUITests/NativeMediaPlayerUITests test` | D-3 presentation |
| API-031 | AC-003, AC-002 (iOS), 574/642 | iOS simulator, real node | Existing Test | `NativeMediaRealNodeUITests`, `NativeVideoRealNodeUITests` on fresh stacks | close paths, swipe, empty reference, preserved behavior |
| API-032 | AC-003 (session, bytes) | iOS simulator unified log + node proxy log | Temporary Probe | during API-031: `simctl spawn … log stream` for the app's process (AVAudioSession), proxy `/log` bytes after each close | no test asserts the session in the app |
| API-033 | AC-005 (iOS page), AC-001 (iOS page) | iOS WKWebView | Temporary Probe | a temporary UI test opening three PDFs one after another and a JSON file, screenshots (reverted before commit) | WebKit's module worker from a blob; durable WKWebView instrumentation is not available to XCUITest |
| API-040 | AC-001, AC-002, AC-005 (Android) | Android WebView, my AVD | Temporary Probe | debug APK; pair by intent; raw CDP to the WebView: JSON gutter, three PDFs with instrumentation (from document start), the empty reference | handoff hint; the WebView's inline worker |

- Test progress log needed: Yes (`api-e2e-test-progress.md`).

## Durable Coverage To Add

| Case ID | Planned Test Path | Why Durable Coverage Is Needed |
| --- | --- | --- |
| MSP-115…MSP-118 (API-011…013) | `autobyteus-web/tests/e2e/mobile-viewer-polish-cases.mjs`, registered in `mobile-shell-probe.mjs` | the empty reference, the PDF sequence with the blob count, and the run-switch status line in real browsers against a real node; DI-001's failure would reappear here |

## Durable Coverage To Update

| Case ID | Existing Path / Test | Required Update | Notes |
| --- | --- | --- | --- |
| MSP-108, MSP-109, MSP-110 | `autobyteus-web/tests/e2e/mobile-file-word-wrap-cases.mjs` | find each line's rows by text; line numbers become a failure; add AC-001's gutter, glyph margin, folding and first-character checks; MSP-110 finds line 4 by text | made untrue by D-1 |
| (fixture) | `autobyteus-web/tests/e2e/mobile-file-zoom-cases.mjs` | export `multiPagePdf` with an optional label (default unchanged) | reused by MSP-116/117 |

## Durable Coverage To Remove

None.

## Desktop Application Validation Plan

- Desktop framework / shell: Electron, renderer loaded from `file://…/app.asar/dist/renderer/index.html`.
- Instructions used: `TESTING.md` Rules 1–5, `docs/isolated-app-instances.md`.
- Web-equivalent behavior: editor options, reference viewer, status line → `nuxt dev` probe cases.
- Shell-specific: the Vite inline worker blob under `file://` (DEC-002) → the packaged build of HEAD in my isolated instance (API-020).
- How the run avoids the running app: a separate app bundle in `/tmp/api647`, its own data root, its own control and server ports; the three instances started from `/Applications/AutoByteus.app` by someone else are left alone.

## Live Environment And Fixture Plan

- Startup order: packaged build → isolated instance (API-020) → stop; phone bundle build → probe cases → whole probe; iOS build → fake-node class → one fresh real-node stack per class; Android build → my AVD → real-node stack with `--origin-host=10.0.2.2`.
- Environment: `env -i PATH HOME TMPDIR=/tmp/api647/tmp`; the node's link throttled as in 574/642; LAN IP for the simulator.
- Evidence: probe JSON + screenshots; packaged result JSON; xcresult summaries, screenshots, unified-log excerpts (app process, AVAudioSession lines), proxy byte logs; Android CDP results and screenshots.
- Cleanup: isolated instance stopped; stacks stopped by control; simulator and AVD deleted; `/tmp/api647` removed when the Solution Designer asks.

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Only The User Can Check? | Required Follow-Up Or Escalation |
| --- | --- | --- | --- | --- |
| Release job's "Verify macOS signing policy ARM64" locally | needs the runner's signing identity | low; IMP-007's CI build-only run passed the build jobs | No | none (IMP-007 reused) |
| A device's Ring/Silent switch with the session | simulator has no switch (642's known limit) | low; unchanged session code | No | none |

## Ambiguities Or Reroute Triggers

| Issue | Classification | Evidence | Recommended Owner |
| --- | --- | --- | --- |
| requirements-doc DEC-002 and "Current solution revision ID: SR-001" predate SR-002 (the doc says `workerPort`) | Documentation only (not a test question) | design-spec D-5, code | Solution Designer / delivery's doc sync |

## Investigation Decision

- Proceed To API/E2E Execution: `Yes`
- Repository-Resident Durable Coverage Will Be Added / Updated / Removed: `Yes` (added and updated, none removed)
- Reroute Required Before Validation Execution: `No`
- Notes: AC-002's apps clause on iOS: the app's own player screen opens and, having nothing to play, shows its existing "could not be played" state with Back (DEC-001 keeps that state). I read AC-002's "the native player opens (apps)" as met by that; the page itself shows no error. Recorded in the report for delivery.

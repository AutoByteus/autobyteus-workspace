# API/E2E Coverage Investigation — phone-viewer-pinch-zoom-472 (autobyteus-472): pinch, pan and double-tap zoom for PDFs and images in the phone viewer; Download to the phone

The plan. Results, confidence and the broader-validation decision are in `api-e2e-execution-coverage-report.md`.

## Investigation Meta

- Requirements Doc: `tickets/in-progress/phone-viewer-pinch-zoom-472/requirements-doc.md` (SR-001 approved; REQ-001…006, AC-001…005)
- Investigation Notes: `investigation-notes.md`
- Solution Revision Record: `solution-revision-record.md`
- Design Spec: `design-spec.md` (SR-003; DS-001…DS-003; R-1…R-3)
- Design Review Report: `design-review-report.md` (ARCH-REV-002, Pass)
- Implementation Handoff: `implementation-handoff.md` (IR-001)
- Code Review Report: `code-review-report.md` (CRR-001, Pass; C-01 note, C-02 / RSK-001 to measure)
- API/E2E Revision Record: `api-e2e-revision-record.md`; current revision `API-REV-001`
- Current Investigation Round: 1
- Trigger: Code Reviewer CRR-001 Pass; code `d2b9f99603`, handoff `9176e10bb7`, base `origin/personal` @ `ed481ae4ca`
- Prior Investigation Reviewed: none

## Current Requirement And Design Basis

In the phone viewer a PDF zooms by two-finger pinch from page width to 3× around the pinch centre (a live CSS transform; on release the pages are drawn again at the new width), pans and keeps one-finger page scrolling (`touch-action: pan-x pan-y` plus non-passive two-finger listeners), and double tap toggles 1× ↔ 2×. An image zooms fit → 4× with pan and double tap (`usePictureZoom`, shared with the VNC viewer). The app page never zooms; the bar and back arrow stay. A Download button in the bar saves the open PDF or image: in the Android app through the shell bridge `saveFile` (`{ type, fileName, mimeType, base64 }`; only PDF/image types with a matching extension and a plain name) into Downloads (Android 10+: MediaStore; 8–9: the system Save dialog) with a toast; in a browser as the browser's download. No credential in a URL, name, bridge message or log. A reload of the same file keeps zoom and position.

## Supported Scenarios And Real Usage

- From the requirements: UC-001 zoom a PDF or image; UC-002 download it.
- Real-use scenarios added:
  - RU-01: the owner's real setup: the Android app paired with a node, a run's conversation naming a several-page PDF and an image; the file opened from the link in the app's WebView, real touches (Android MotionEvents, not page-synthesized events).
  - RU-02: a long PDF (≥10 pages) read at 3× (C-02 / RSK-001 memory).
  - RU-03: a large real-size PDF (20–30 MB) downloaded from the app (RSK-002, one base64 message).
  - RU-04: the page sends a `saveFile` the app must refuse (another type, a name with a folder) — the bridge accepts messages only from the open node's main frame, so a node page script is the realistic sender.
- Technically possible but unsupported: none recorded.

## Changed Surface And Boundary Classification

| Surface / Boundary | Affected? | Changed Boundary | Repository Evidence | Material Risk Not Exercised | Candidate Broader Validation |
| --- | --- | --- | --- | --- | --- |
| Frontend component / state | Yes | viewers, zoom composables, zoom memory, download composable | IMP-02, IMP-09 | — | — |
| Browser user journey | Yes | phone viewer touch | IMP-06 (MSP-39, CDP touch events in Chrome) | Android WebView input path, real MotionEvents, the app page inside the app | emulator |
| Android shell (bridge, saver, activity) | Yes | `saveFile` rules, `DownloadsSaver`, wiring | IMP-07 (JVM rules), IMP-08/10 (saver alone, API 35/29) | the page → bridge → saver → Downloads → toast path end to end; a large message; logcat | emulator |
| Memory / rendering | Yes | 3× redraw of every page | IMP-06 (one PDF in Chrome) | a long PDF at 3× in the app's WebView | emulator measurement |
| Desktop viewers, VNC zoom (preserved) | Yes (rename, `touchZoom` off) | `FileViewer`, `ImageViewer`, `PdfViewer`, `usePictureZoom` | IMP-02 | rendered desktop viewers | desktop file probes; full phone probe |
| Server / persistence | No | — | — | — | — |

## Project Execution Discovery

- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/phone-viewer-pinch-zoom-472`, branch `codex/phone-viewer-pinch-zoom-472`
- Testing guideline: `TESTING.md` (Android emulators: own AVD from an installed image, own `-port`, address only its serial, headless `-no-window`, delete it afterwards; no `uiautomator dump` in landscape); `autobyteus-android/README.md` (build, install, instrumented tests); `docs/android_mobile_access.md`
- Changed build-input paths (TESTING.md list) in `git diff --name-only ed481ae4ca...HEAD`: `None` (Android sources and tests, web sources, docs; no `*.gradle.kts`, manifest, lockfile, scripts or workflow) → no fresh-start build case
- Installed system images: android-29, -34, -35 (google_apis arm64); no Android 8–9 image
- Secrets: none (scripted AGY runtime)

| Component | Start / Setup | Readiness | Stop / Cleanup |
| --- | --- | --- | --- |
| Debug APK of this branch | `./gradlew :app:assembleDebug` | `app-debug.apk` | — |
| Host node | `autobyteus-server-ts/dist/app.js` (no server change; built after the last product commit), temp data root, launch credential, scripted AGY CLI; serves this branch's `autobyteus-web/dist/public` at `/mobile` | `/rest/health` | SIGTERM, temp root removed |
| Emulator | own AVD `apie2e472_api35` (android-35 google_apis), `-no-window -port 5640`, `adb -s emulator-5640` | `sys.boot_completed` | `adb emu kill`, `avdmanager delete avd` |
| WebView DevTools | the debug build's `webview_devtools_remote_<pid>` socket forwarded to a host port, a minimal CDP client | page target `/mobile` | forward removed |
| Touch input | real multi-touch through the emulator's input device (`sendevent`, protocol B) | — | — |

| Data / Identity | Method | Safety | Cleanup |
| --- | --- | --- | --- |
| phone pairing | Phone Access pairing session `serverBaseUrl http://10.0.2.2:<port>`, link shared into the app (`ACTION_SEND`) | the link and the phone credential never printed | node removed |
| files | a 12-page PDF, a PNG, a ~25 MB PDF, a text file, in a folder the run names | — | removed |

## Existing Durable Coverage Inventory

| Path / Test | Intent | Related | Decision | Action |
| --- | --- | --- | --- | --- |
| `usePdfPinchZoom.spec.ts`, `usePictureZoom.spec.ts`, `MobileFileViewer.zoom.spec.ts`, `FileViewer.touchZoom.spec.ts`, `useMobileFileDownload.spec.ts` | zoom math, memory, download | AC-001…005 | Still Valid | Reuse (IMP-02, IMP-09) |
| `ShellBridgeMessagesTest` (JVM) | `saveFile` rules | AC-003 | Still Valid | Reuse (IMP-07) |
| `DownloadsSaverTest` (instrumented) | saver on API 35 and 29, Save-dialog path forced | AC-003 | Still Valid | Reuse (IMP-08, IMP-10) |
| MSP-39 | browser touch zoom and browser download | AC-001, 002, 004 (browser) | Still Valid | Reuse (IMP-06); full phone probe |
| other MSP cases, desktop file probes, VNC (`MobileNodeDesktop.spec.ts`) | preserved | AC-004 | Still Valid | Run |

## Planned Cases

| Case ID | Criteria | Boundary | Kind | Planned Steps | Why |
| --- | --- | --- | --- | --- | --- |
| R-IMP | component, JVM, saver, browser parts of AC-001…005 | web, Android unit/instrumented | Reused | IMP-00…10 | ran on the code under test (or later commits change only tests) |
| API-01 | AC-001, REQ-003 | Android app WebView, real touches | Temporary Probe | emulator API 35, debug APK, host node; open a 12-page PDF from a conversation link; pinch out, pinch in, two-finger pan, one-finger page scroll, double tap both ways; read zoom, page canvas widths, bitmap widths, `visualViewport.scale`, the bar's position; back arrow returns; the run screen does not zoom on a pinch | AC-001's stated verification |
| API-02 | AC-002, REQ-003 | same | Temporary Probe | the same for a PNG (fit → zoomed, pan, double tap fit ↔ fill) | AC-002 |
| API-03 | AC-003, REQ-004, REQ-005 | page → bridge → saver → Downloads | Temporary Probe | Download of the PDF and the PNG: files in Downloads (MediaStore query, bytes compared), toast text; logcat of the app captured through the run: no credential, no pairing code, no file name, no base64; `saveFile` sent by page script for `text/plain`, a name with a `/`, and a mismatched extension: no file, no toast | AC-003 |
| API-04 | RSK-001 / C-02 | memory | Measurement | the 12-page PDF at 3×: canvases × bitmap size, the app's PSS (`dumpsys meminfo`) at 1× and 3×, WebView alive, no renderer crash in logcat; scroll to the last page at 3× | the review's held risk; a crash is a design escalation |
| API-05 | RSK-002 | bridge size | Measurement | Download of a ~25 MB PDF in the app: saved bytes equal, time, no crash | the review's held risk |
| API-06 | AC-005 (live) | reload | Temporary Probe | zoom the PDF, open the same link again; zoom and position kept; another file at 1× | component-tested only |
| API-07 | AC-004 | preserved | Existing Test | full `test:e2e:mobile-shell` (clean env); `test:e2e:search-pdf-preview`, `test:e2e:file-explorer-pending-save-draft` (desktop PDF/image viewers); VNC zoom covered by `MobileNodeDesktop.spec.ts` (IMP-02) and the phone probe's VNC cases | preserved behavior |
| C-08 | REQ-004 Android 8–9 Save dialog on a real 8–9 system | — | Not Tested unless an image is available | — | no 8–9 image installed; the forced-path instrumented test ran on 10 and 15 (IMP-08/10) |

- Test progress log needed: `Yes`

## Durable Coverage To Add / Update / Remove

None planned: the Android in-app journey needs an emulator, the APK and a paired node (temporary, kept in the evidence); MSP-39 is the durable browser case.

## Not Tested / Infeasible / Deferred

| Behavior | Reason | Risk | Only The User Can Check? | Follow-Up |
| --- | --- | --- | --- | --- |
| Android 8–9 Save dialog on a real 8–9 system | no system image installed (installing one changes the user's SDK) | the dialog's handoff on old WebView/Android | No (an image would do) | — |
| A real phone's fingers and memory | emulator only | low-end phone memory at 3× | Yes | — |
| iOS | not built (RSK-003, out of scope) | — | — | — |

## Ambiguities Or Reroute Triggers

- A WebView crash or failure at 3× on a long PDF (API-04) is a design escalation (page virtualisation), per CRR-001 C-02.

## Investigation Decision

- Proceed To API/E2E Execution: `Yes`
- Repository-Resident Durable Coverage Will Be Added / Updated / Removed: `No` (unless a run shows a need)
- Reroute Required Before Validation Execution: `No`

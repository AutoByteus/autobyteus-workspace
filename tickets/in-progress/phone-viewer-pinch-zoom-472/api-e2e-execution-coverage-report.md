# API/E2E Execution Coverage Report — phone-viewer-pinch-zoom-472 (autobyteus-472): pinch, pan and double-tap zoom for PDFs and images in the phone viewer; Download to the phone

## Round

- Coverage investigation: `tickets/in-progress/phone-viewer-pinch-zoom-472/api-e2e-coverage-investigation.md`
- API/E2E revision record and current revision ID: `api-e2e-revision-record.md`, `API-REV-001`
- Test progress log: `api-e2e-test-progress.md`
- Round and trigger: round 1; Code Reviewer CRR-001 Pass; code `d2b9f99603`, handoff `9176e10bb7` (base `origin/personal` @ `ed481ae4ca`)
- Prior round reviewed: none
- Deviations from the investigation's plan, and why:
  - Real touches go through the emulator's touchscreen device (`sendevent`, which needs `adb root` on the google_apis image). A double tap is written to the device in one write: one `sendevent` process per event made the two taps more than 300 ms apart (the composable's double-tap window), so the page saw two single taps (recorded in the transcript, then rerun).
  - The toast is read from the accessibility event it raises (`uiautomator events`): Android 15 does not list a toast in `uiautomator dump` (first image Download step, recorded and rerun).
  - API-06 (AC-005 live): the live refresh could not be triggered from outside the run (see its row); AC-005 rests on its stated verification, the component tests (IMP-09).
- Evidence folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/phone-viewer-pinch-zoom-472/tickets/in-progress/phone-viewer-pinch-zoom-472/evidence/api-e2e/`
  - `android/journey.md`: every in-app step's exact command and output; `android/shots/`: screenshots; `android/logcat-scan.json`, `android/logcat-app-process-and-downloads.txt`; `scripts/`: the temporary journey tools (`node-and-data.mjs`, `droid.mjs`, `step.mjs`, `state.mjs`, `download.mjs`, `refused-saves.mjs`, `say.mjs`, `watch-reload.mjs`, `logcat-scan.py`, `run-step.sh`).

## Routing Classification

- Task size: `Medium`
- Architectural risk: `High`
- Input route: `Reviewed`
- Successful-output route: `Code Review` (not reached: this round fails)
- Proportional test-code review decision: this round: failure-origin review requested (no durable test code changed by API/E2E)

## Tested Builds And Environments

| Env ID | Commit Tested | Platform / OS | Runtime, Browser, Or App Build | Other Settings That Matter |
| --- | --- | --- | --- | --- |
| ENV-1 | `9176e10bb7` (code `d2b9f99603`) | own AVD `apie2e472_api35` (android-35 google_apis arm64, Pixel 6 profile: 1080×2400, density 420, page 412×842 CSS px at DPR 2.625), headless, port 5640, 2 GB RAM | debug APK of this branch (`API-00-apk-build.log`, up to date: no Android file after `617b43165e`); WebView 124.0.6367.219 | `adb root` for input; WebView DevTools socket forwarded to tcp:9472; AVD deleted afterwards |
| ENV-2 | `9176e10bb7` | macOS 26 arm64 | host node `autobyteus-server-ts/dist/app.js` (no server change) serving this branch's phone bundle (`autobyteus-web/dist/public`, built after the last product commit) at `/mobile`; `127.0.0.1:53689` = `10.0.2.2:53689` from the emulator; scripted AGY CLI | temp root, launch credential; paired by a Phone Access link shared into the app (`ACTION_SEND`), at once |
| ENV-3 | `9176e10bb7` | macOS, headless Chrome | phone probe and desktop file probes, clean env | probe-owned stacks |

## Cases

| Case ID | Criteria | Boundary / Surface | Command Or Steps | Env | Result | Evidence Files | Look For | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| R-IMP | component, JVM, saver, browser parts of AC-001…005 | web, Android | Reused: IMP-00…10 | — | Pass | `evidence/implementation/` | as in the handoff | `d2b9f99603` changes one spec assertion after IMP-02 (IMP-09 reran it) |
| API-01 | AC-001, REQ-001, REQ-003 | the app's WebView, real touches | `android/journey.md` API-01 steps: `run-screen-pinch`; `open resume-472.pdf` (a real tap on the agent's link); `pinch 206 400 80 160`; `pan2`; `pan2-hold`; `swipe`; `pinch … 80 200` (3×); `pinch … 300 100` (1×); `dtap` ×2; `back` | ENV-1, ENV-2 | **Fail (F-1)**; everything else Pass | `android/journey.md`; `android/shots/API-01-*.png` (`pdf-pinch-out-2x`, `pan2-hold-fingers-down`, `pan2-hold-lifted`, `pdf-dtap-*`) | run screen pinch: 2 touches arrive, `vvScale` 1, back (4, 4) unchanged. PDF: 380 → 759 → 1140 → 380 CSS px, bitmaps 997×1290 / 1992×2578 / 2992×3872, `allBitmapsMatch: true` after each pinch (sharp); one finger scrolls (+474 at 2×); double tap 380 → 760 → 380; back arrow returns to the run; `vvScale` 1 and the back arrow at (4, 0) in every state. **F-1: `pan2-hold`: fingers down `transform: translate(-120.109px, -150.167px) scale(1)`, lifted: `transform: ""`, scroll unchanged (380, 1384)** | the run screen at the start (no viewer) also does not zoom |
| API-02 | AC-002, REQ-002, REQ-003 | same, a 1200×800 PNG | steps `open photo-472.png`, `pinch 206 400 80 240`, `swipe`, two-finger drag, `dtap` ×2, `back` | ENV-1, ENV-2 | Pass | `android/journey.md` API-02, `android/shots/API-02-*.png` | `scale(1)` → `scale(2.99968)`; one-finger pan moves; a two-finger drag stays where the fingers left it; double tap → `scale(1)` (fit) → `scale(2.89078)` (fill); `vvScale` 1; back returns | the image's two-finger drag keeps its place, unlike the PDF's (F-1) |
| API-03 | AC-003, REQ-004, REQ-005 | page → bridge → `DownloadsSaver` → Downloads → toast; logcat | steps `download photo-472.png`, `download resume-472.pdf` (real taps on Download), `refused-saves` (page script posts `saveFile`), the text file opened; `logcat-scan.py` over the whole capture and a final dump | ENV-1, ENV-2 | Pass | `android/journey.md` API-03, `android/shots/API-03-dl-*`, `android/text-file-no-download.json`, `android/logcat-scan.json`, `android/logcat-app-process-and-downloads.txt` | `"toast": "Saved to Downloads: photo-472.png"` (1.5 s), `Download/photo-472.png` 149581 bytes, sha256 = the node's file; the same for `resume-472.pdf` (105463 bytes, 1.7 s); refused with no toast and no row: `text/plain`, `../../evil-472.pdf`, `sub/evil-472.pdf`, a PDF type with `.png`, `text/html`; control `control-472.pdf` saved; text file: `"download": false`; logcat: 0 phone/owner credentials, 0 pairing code, 0 base64 of the files; the app process never logs a saved name (only the system's MediaProvider names its own files); 14 `access_token=` lines are the page's console line with the value `[REDACTED]` (`FileExplorerStreamingService` redacts it) | first image Download (removed from the transcript, noted) saved correctly but missed the toast through `uiautomator dump` |
| API-04 | C-02 / RSK-001 | memory at 3× | `pdf` and `meminfo` steps at 1×, 3×, 3× scrolled to page 12, back at 1×; `dumpsys meminfo` system totals | ENV-1 | Pass (measured; no failure) | `android/journey.md` API-04 | 12 canvases at 2992×3872 = 139 Mpx (about 556 MB at 4 B/px nominal), scrolled to page 12 at 3× with all bitmaps intact, `vvScale` 1; no crash, ANR, OOM or renderer kill in logcat; app PSS 106 → 108 MB, renderer 112 → 120 MB; system "Used RAM" 1.49 GB at 3×, 1.60 GB back at 1× | on this emulator (software GPU) the canvas backing does not show in PSS or system RAM, so real-phone memory at 3× stays unmeasured (residual RSK-001) |
| API-05 | RSK-002 | a 25 MB PDF over the bridge | steps `open big-472.pdf`, `download big-472.pdf`, `meminfo` | ENV-1, ENV-2 | Pass | `android/journey.md` API-05 | open 6.7 s; toast "Saved to Downloads: big-472.pdf" 3.3 s after the tap; 25239558 bytes, sha256 = the node's; app PSS 120 → 206 MB, renderer 220 → 291 MB; no crash | one base64 message holds |
| API-06 | AC-005, REQ-006 (live) | reload of the open file | (1) `pinch` to 2×, `back`, `open resume-472.pdf` again; (2) `say.mjs` puts `inside-472.pdf` in the run's folder, the phone opens it, zooms to 2× and scrolls, `live-refresh` rewrites it on the node and samples the viewer for 15 s | ENV-1, ENV-2 | (1) observed, see Unclear U-1; (2) Not reproducible | `android/journey.md` API-06 | (1) reopened at `pagesCssWidth 380`, scroll 0 (the holder lives while the file is open); (2) `sawLoading: false`, no reload in 15 s, zoom unchanged | a change from outside the run raises no live refresh (452 follows the run's own file changes); AC-005 is proven by its stated verification (IMP-09) |
| API-07 | AC-004 | preserved phone and desktop behavior | `env -i … pnpm -C autobyteus-web test:e2e:mobile-shell --output-dir=…`; `… test:e2e:search-pdf-preview`; `… test:e2e:file-explorer-pending-save-draft` | ENV-3 | Pass for this ticket's cases; 3 out-of-scope failures | `API-07-mobile-shell.log`, `API-07-mobile-shell/mobile-shell-probe.json`, `API-07-search-pdf-preview*`, `API-07-file-explorer-pending-save-draft*` | 36 of 39 MSP `Pass` incl. MSP-39, MSP-16, MSP-28…31, MSP-37; cleanup `rootRemoved: true`, `unknownBrowserErrors: 0`; `{"API-002":"Pass","API-003":"Pass"}`; `PSD-001…011 Pass` | MSP-24/34/35 (Task rows after TODO) are autobyteus-471's FU-003 (same failures; nothing of this ticket). VNC zoom: `MobileNodeDesktop.spec.ts` (20) and `usePictureZoom.spec.ts` (IMP-02); the same composable ran in the app in API-02 |
| C-08 | REQ-004 Android 8–9 Save dialog | — | — | — | Not Tested | — | — | no Android 8–9 system image installed (only 29, 34, 35); installing one changes the user's SDK. The forced Save-dialog path ran on Android 10 and 15 (IMP-08, IMP-10) |

## Failures

| Failure ID | Case / Criteria | Expected | Observed | Preliminary Classification | Recommended Owner |
| --- | --- | --- | --- | --- | --- |
| F-1 | API-01 `pan2-hold`, `pan2`; REQ-001 ("pans by dragging when zoomed"), DS-001 ("scrollLeft/Top set so the pinch centre stays under the fingers") | A two-finger move on a zoomed PDF leaves the pages where the fingers put them, as the image viewer does (API-02) | The pages follow the fingers live (`translate(-120.109px, -150.167px) scale(1)`), then jump back when they lift (`transform` cleared, scroll unchanged at 380, 1384). Cause in `usePdfPinchZoom.commit` (`composables/usePdfPinchZoom.ts:67-74`): when the new zoom is within 1% of the current one (`Math.abs(factor - 1) < 0.01`) it clears the transform and returns without scrolling by the fingers' movement (`screen - from`). This happens for every two-finger move whose spacing stays the same, and for any pinch at the 3× cap (zoom clamped, factor 1), where the move is also dropped. | Local Fix (implementation): on commit with factor ≈ 1, scroll by the fingers' movement instead of dropping it | Implementation Engineer, through failure-origin review |

## Unclear (for the Solution Designer, not blocking this round's classification)

| ID | Basis | Observation |
| --- | --- | --- |
| U-1 | REQ-006 "When the open file is reloaded for the same path (… or an explicit open again, 450), the zoom and position stay" | On the phone the viewer is full screen, so opening the same file again means Back, then its link. That starts at 1× (API-06 (1)): the design's holder (`useViewerZoomMemory` in `MobileFileViewer`) lives only while the file is open (design-spec "Zoom state across reloads"). Whether "an explicit open again" means this Back-and-reopen (then REQ-006 is not met) or only a reload while the file stays open (then it is) is for the Solution Designer. |

## Acceptance-Criteria Proof

| Acceptance-Criteria ID | Critical | Proven By Case IDs | Result | For A User-Only Part |
| --- | --- | --- | --- | --- |
| AC-001 | Yes | API-01, R-IMP (IMP-06 MSP-39) | **Not Proven**: pinch in/out, page scroll, double tap, back arrow and the unzoomed run screen are proven in the app; pan with two fingers fails (F-1); one-finger pan works | a real phone's fingers |
| AC-002 | Yes | API-02, R-IMP | Proven | — |
| AC-003 | Yes | API-03, API-05, R-IMP (IMP-07, IMP-08, IMP-10) | Proven (Android 10+ path; Android 8–9 only by the forced-path instrumented test) | — |
| AC-005 | Yes | R-IMP (IMP-09) | Proven by its stated verification (component tests); live reproduction not possible from outside the run (API-06); U-1 | — |
| AC-004 | Yes | API-07, R-IMP | Proven; MSP-24/34/35 are outside this ticket (autobyteus-471 FU-003) | — |

## Validation Confidence Scorecard (Mandatory)

| Confidence Category | Post-Repository Score | Final Score | What Supports It | Residual Uncertainty | What Could Improve It |
| --- | --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 80% | 75% | every AC exercised in the app | F-1 (AC-001); U-1 | the fix, then API-01 again |
| Changed-boundary execution directness | 75% | 95% | the app's own WebView, MotionEvents from the touchscreen device, the real bridge, MediaStore | — | — |
| Cross-boundary integration realism and mock gap | 75% | 93% | page → bridge → saver → Downloads → toast end to end | Android 8–9 dialog | an 8–9 image |
| Environment, configuration, identity, and fixture fidelity | 80% | 92% | real pairing (shared link), node, phone bundle | emulator, software GPU | a real phone |
| Failure, edge-case, lifecycle, and recovery evidence | 80% | 92% | refused saves, text file, 25 MB message, 3× long PDF | real-phone memory at 3× | a low-end phone |
| User-surface, browser, and desktop-shell confidence | 80% | 80% | all gestures in the app | F-1 visible to the user | the fix |
| Durable regression coverage quality and relevance | 85% | 85% | composable, viewer, JVM and instrumented tests; MSP-39 | no durable test of a two-finger move without a zoom change | a `usePdfPinchZoom` spec case for it |

- Overall final confidence: 87% (simple average); not a Pass: F-1 fails a critical criterion
- Every critical acceptance criterion directly proven, apart from parts only the user can check: `No` (AC-001, F-1)
- Any final applicable category below `90%`: `Yes`

## Broader Validation Decision (Mandatory)

- Decision: `Required` (executed)
- Execution mode: Android emulator with the app's debug build (real input events, WebView DevTools for state), a test-owned node; browser probes
- Gap it addressed: the app's WebView input path, the bridge and Downloads end to end, memory at 3×, a large message; it found F-1, which the specs and MSP-39 (pinches with a zoom change only) did not exercise

## Persisted-Data Transition Checks

- Approved decision: `Not Affected`

## Compatibility / Legacy Scope Check

- Backward compatibility introduced or retained: `No`

## Durable Coverage Changed In The Codebase

None by API/E2E. Suggested with the fix: a `usePdfPinchZoom.spec.ts` case for a two-finger move whose spacing stays the same (and one at the 3× cap).

## Dependencies Mocked Or Emulated

| Dependency | Method | Why | Limitation |
| --- | --- | --- | --- |
| A phone | Android 15 emulator (Pixel 6 profile, 2 GB, software GPU) | no device here | memory at 3×; real fingers |
| Model inference | scripted AGY CLI | an agent message naming the files | transport only |

## Temporary Methods And Cleanup

| Item | Owned | Cleanup | Result |
| --- | --- | --- | --- |
| AVD `apie2e472_api35`, emulator-5640 | Yes | `adb emu kill`, `avdmanager delete avd` | deleted; `adb devices` empty; the other AVDs untouched |
| Host node and its temp root | Yes | SIGTERM; root removed by the script | none left |
| ADB forward tcp:9472 | Yes | `adb forward --remove-all` (serial emulator-5640) | removed |
| `/tmp/abtest472/state.json` (probe credential), `pairing-link.txt`, pulled files | Yes | deleted | — |
| Probe stacks (API-07) | Yes | probes' own cleanup | receipts clean |
| Evidence secret scan | — | `own_`/`mra_` 20+ chars, the pairing code, `access_token=` with a value | no match (the `access_token=` lines carry `[REDACTED]`) |

## Latest Authoritative Result

- Result: `Fail`
- Failing cases and criteria: API-01 (F-1; AC-001, REQ-001)
- Next recipient: Code Reviewer — focused failure-origin review
- Notes: recheck after the fix: API-01 (`pan2-hold`, a pinch at the 3× cap with moving fingers, and the PDF gestures). U-1 goes to the Solution Designer. Not tested: Android 8–9 Save dialog on a real 8–9 system.

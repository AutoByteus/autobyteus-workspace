# API/E2E Execution Coverage Report — Android app keeps its page when the phone rotates (autobyteus-415)

The run record and the result. The plan is `api-e2e-coverage-investigation.md`; the history is `api-e2e-revision-record.md`.

## Round

- Coverage investigation: `/Users/normy/autobyteus_org/autobyteus-worktrees/android-keep-page-on-rotation/tickets/in-progress/android-keep-page-on-rotation/api-e2e-coverage-investigation.md`
- API/E2E revision record and current revision ID: `api-e2e-revision-record.md`, `API-REV-001`
- Test progress log: `api-e2e-test-progress.md`
- Round and trigger: round 1; implementation IR-001 ready for direct API/E2E
- Prior round reviewed: N/A
- Deviations from the investigation's plan, and why:
  - **The node keeps no access log.** To see AC-001's "second `GET /mobile/`" from the node's side, the app was paired a second time through a test-owned access-logging reverse proxy in front of the node (`API-03-access-proxy.mjs`). Every request the node received was counted from the proxy log, and the proxy was checked live (API-03).
  - **`adb emu rotate` turns the emulator's sensor.** Auto-rotate becomes free and the display goes to 270°, so `settings put system user_rotation 0` did not return to portrait. Returning to 0° was done by turning the sensor further. API-03 is annotated.
  - **API-05 first attempt was invalid** (`API-05a-…`, annotated). The keyboard covered SCAN QR, so the scanner never opened.
  - **API-05's first proof of non-recreation was weak.** It relied on an unchanged ActivityRecord ID, which API-07 showed stays the same across a relaunch. It was replaced by the window ID and the system log's relaunch lines (`API-07b`, positive controls on both API levels).
  - **The New run needed a model.** The run composer (which holds the page's file input) appears only in a created run, so a run was created with a catalog model. No message was sent, so no model was called. The node's `LMSTUDIO_HOSTS` was set to the Mac's LM Studio while exploring this; it was not needed in the end, and it was removed with the node.
- Evidence folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/android-keep-page-on-rotation/tickets/in-progress/android-keep-page-on-rotation/evidence/` (files `API-*`)

## Routing Classification

- Task size: `Small`; Architectural risk: `Low`; Input route: `Direct Low-Risk`; Successful-output route: `Delivery`
- Proportional test-code review decision: `Not Required — direct low-risk route` (one durable instrumented test added, below)

## Tested Builds And Environments

| Env ID | Commit Tested | Platform / OS | Runtime, Browser, Or App Build | Other Settings That Matter |
| --- | --- | --- | --- | --- |
| ENV-1 | `dd129696a4` (+ the new instrumented test) | emulator `autobyteus277_api35`: Pixel 7 profile, 1080x2400, 136 px top cutout, Android 15 / API 35, google_apis arm64 | debug APK built in the worktree (JDK 21, Gradle wrapper) | `-no-window -no-snapshot -wipe-data`; auto-rotate off at boot; the only adb device |
| ENV-2 | same | emulator `autobyteus277_api34`: Pixel 6 profile, 1080x2400, 128 px cutout, Android 14 / API 34 | same | same |
| ENV-3 | — | test node `abx415-api-node`: `autobyteus/autobyteus-server:beta` (`9c5aa01bb2fc`), `-p 127.0.0.1:49901:8000`, fresh volumes, test data | reached from the emulator as `http://10.0.2.2:50364` through the access proxy (`127.0.0.1:50364 → 127.0.0.1:49901`) | Phone Access on; paired through `/rest/remote-access/pairing-sessions` + the app's share intent and pairing page |
| ENV-4 | `dd129696a4` with `android:configChanges` deleted (temp copy, control only) | ENV-1 | debug + androidTest APKs from `git archive` | control for the new test |

## Cases

| Case ID | Criteria | Boundary / Surface | Command Or Steps | Env | Result | Evidence Files | Look For | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| API-01 | AC-001, 002, 003, 004, 005 | emulator, APK, unit tests | Reused IMP-02, IMP-03, IMP-04, IMP-05, IMP-06 | — | Pass | (implementation handoff rows) | (handoff rows) | Ran on `dd129696a4`; `51667e36cf` changes only ticket files |
| API-02 | AC-001/002 (durable), AC-003 (insets tests), AC-005 | instrumented tests on API 35, new `MainActivityConfigurationChangeTest` + its control | `./gradlew :app:connectedDebugAndroidTest`; control: the same test with `android:configChanges` deleted (`-Pandroid.testInstrumentationRunnerArguments.class=…`) | ENV-1, ENV-4 | Pass | `API-02-instrumented-tests-api35.txt`, `API-02-control-test-fails-without-configchanges.txt` | `tests=13 failures=0 errors=0`; `MainActivityConfigurationChangeTest.rotatingToLandscapeAndBackKeepsTheSameActivityAndTheTypedInput  passed`; control: `AssertionError: the activity is not recreated expected same:<…MainActivity@31ba7ac> was not:<…MainActivity@ec01336>` | The 12 existing instrumented tests (insets, shell smoke, QR/file-chooser coordinators) had only been compiled before |
| API-03 | AC-001 as written (a Files view; the node sees no second `GET /mobile/`), SCN-001a | app + page + node | launcher launch; Files → Temp Workspace → `abx415-rotation-notes.md` preview; mark; page network watch; `adb emu rotate` 0° → 270° → 90° → 0°; node request counts from the proxy; proxy liveness check | ENV-1, ENV-3 | Pass | `API-03-files-view-rotation-node-requests.txt`, `API-03-1/2/3-*.png`, `API-03-access-proxy.mjs`, `API-03-cdp415.mjs`, `API-03-ui.py` | every stop: `"marker":"api03-before-rotation","navigationStart":1793997597533`, `previewShown=true`; viewport `412x839` → `863x360` → `412x839`; node `[GET /mobile, all, upgrades]=2 106 3` unchanged; page watch: only `watch-start`/`watch-end` (no WebSocket, document or load event); liveness: a page fetch was logged at once as line 107 | No request reached the node during the rotations; the page's live WebSockets stayed open |
| API-04 | REQ-003 (file chooser), SCN-001b | WebView file chooser → DocumentsUI picker | run composer "Upload files" (real tap) → picker; `adb emu rotate` with the picker in front; pick `abx415-upload.txt`; read page and composer; back to 0° | ENV-1, ENV-3 | Pass | `API-04-file-chooser-across-rotation.txt`, `API-04-1/2/3-*.png` | picker `PickActivity` window changed on rotation (it was recreated; the app was not); after pick: `"marker":"api04-before-picker","navigationStart":1793997597533`, `composer: "Context Files (1) abx415-upload.txt Clear All "` (landscape and at 0°); node `POST /rest/context-files/upload` | — |
| API-05 | REQ-003 (QR scan), SCN-001c | embedded zxing `CaptureActivity` | camera granted; connection screen: type an address, SCAN QR, [rotate while the scanner shows], Back; baseline without rotation | ENV-1 | Pass | `API-05-qr-scanner-across-rotation.txt`, `API-05-1/2/3-*.png`, `API-07b-logcat-mainactivity-relaunches.txt`, `API-05a-…` (annotated) | `scanner: mCurrentFocus=Window{e3ecc79 … CaptureActivity`; `rotated: mRotation=3`; after Back the MainActivity window is still `Window{8316170 …MainActivity}` and `QR scan was not completed` shows (landscape); no relaunch line for MainActivity in this window (`API-07b`) | The typed address is cleared on cancel in the baseline too (pre-existing; FU-002) |
| API-06 | REQ-001 (window-size change), REQ-002, SCN-001d | display resize | `adb shell wm size 1600x2560`, then `wm size reset`, page open | ENV-1, ENV-3 | Pass | `API-06-window-size-change.txt`, `API-06-1-resized.png` | `"marker":"api06-before-resize","navigationStart":1793998172824` at all three reads; viewport `412x839` → `610x896` → `412x831`; node `GET /mobile` stays `3`; after reset the WebView is `[0,136][1080,2316]` = screen minus status bar and the system's (now 84 px) navigation bar | — |
| API-07 | DEC-001 boundary (by design), launch path | `uiMode` | `cmd uimode night yes` / `no` with the page marked; relaunch lines over the whole session | ENV-1, ENV-3 | Pass | `API-07-dark-mode-recreates-by-design.txt`, `API-07-1-night.png`, `API-07b-logcat-mainactivity-relaunches.txt` | each switch: `"marker":null`, new `navigationStart`, node `GET /mobile` +1, href `http://10.0.2.2:50364/mobile/` (still paired). Relaunch lines only at `21:36:20` (control build) and `21:50:18` / `21:50:28` (dark mode); none in API-03…06 | Confirms the declared boundary: uiMode recreates and the app recovers to the saved node |
| API-08 | REQ-001, REQ-002, AC-003, AC-005 on Android 14 | instrumented + rotation journey on API 34 | `connectedDebugAndroidTest`; pair; Files preview; rotate 0° → 270° → 90° → 0°; insets and WebView bounds at each stop; logcat relaunch check with a dark-mode positive control | ENV-2, ENV-3 | Pass | `API-08a-instrumented-tests-api34.txt`, `API-08b-api34-rotation.txt`, `API-08-1/2-*.png` | `tests=13 failures=0`; marker and `navigationStart 1793998387786` at every stop, `previewShown=true`, node `7 378` unchanged; webview `[0,128][1080,2337]` (0°), `[0,63][2272,1017]` with cutout `[2272,0][2400,1080]` (270°), `[128,63][2400,1017]` with cutout `[0,0][128,1080]` (90°); no relaunch line; the control shows two | — |

## Acceptance-Criteria Proof

| AC | Critical | Proven By | Result |
| --- | --- | --- | --- |
| AC-001 a screen other than the run list survives rotation; no second load | Yes | API-03 (Files view; node-side count via proxy; page network), API-08 (API 34), API-02 (durable), IMP-01/02 | Proven |
| AC-002 connection-screen input kept | Yes | API-02 (durable, both API levels), IMP-03 | Proven |
| AC-003 insets clear in both orientations | Yes | API-08 (API 34, all stops), API-06 (after a resize), IMP-04 (API 35), insets instrumented tests on both API levels | Proven |
| AC-004 manifest declares the seven values | Yes | IMP-05, IMP-06 (unit test), API-02 control | Proven |
| AC-005 no new permission; existing tests pass | Yes | IMP-05, IMP-06, API-02/08a (instrumented 13/13 ×2), API-04/05 (file chooser and scanner work across rotation), API-07 (launch path) | Proven |

## Validation Confidence Scorecard (Mandatory)

| Category | Post-Repository | Final | Supports | Residual | Could Improve |
| --- | --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 85% | 97% | all AC rows | — | — |
| Changed-boundary execution directness | 85% | 97% | real activity lifecycle on two API levels; relaunch lines with positive controls; the node's view through the proxy | — | — |
| Cross-boundary integration realism and mock gap | 80% | 95% | real WebView, real node, real system picker and scanner | emulator, not a phone | a physical phone (team rule: not used) |
| Environment, configuration, identity, and fixture fidelity | 80% | 93% | two API levels, cutout AVDs, a real pairing | split screen and a hardware keyboard not exercised (declared and pinned; `wm size` exercises the same size values) | a foldable/resizable AVD |
| Failure, edge-case, lifecycle, and recovery evidence | 80% | 96% | picker and scanner across rotation; display resize; the dark-mode boundary; landscape-to-landscape flip (270° → 90°) | — | — |
| User-surface, browser, and desktop-shell confidence | 80% | 95% | screenshots of every stop; insets measured | — | — |
| Durable regression coverage quality and relevance | 88% | 93% | manifest unit test (runs in Gradle checks) + new instrumented test proven to fail without the fix | instrumented tests are not in any CI job; they run on demand on an emulator | wire `connectedDebugAndroidTest` into a release check (outside this ticket) |

- Overall post-repository confidence: 83%
- Overall final confidence: 95.1% (simple average: 97, 97, 95, 93, 96, 95, 93)
- Every critical acceptance criterion directly proven: `Yes`
- Any final applicable category below `90%`: `No`
- Default final confidence target of `95%` met: `Yes`
- Confidence-limiting residual risks:
  1. A physical phone was not used (team rule).
  2. Split screen and a hardware keyboard were not exercised.
  3. The instrumented tests run only on demand.

## Broader Validation Decision (Mandatory)

- Decision: `Required` (executed)
- Execution mode: `Lifecycle` (emulators, real activity lifecycle), `Live API` (real node, access proxy), `Other` (WebView DevTools)
- Gap addressed: the manifest unit test pins the text only, and the instrumented tests had never run. AC-001's node-side check, the system activities over the app, the window-size changes and Android 14 had not been exercised. Gain: 83% → 95.1%.
- Browser validation: not applicable beyond the WebView page, which was driven through DevTools.

## Persisted-Data Transition Checks

- `Not Affected` (no persisted data changes).

## Compatibility / Legacy Scope Check

- No compatibility scope; no legacy behavior; durable coverage only for current behavior.

## Durable Coverage Changed In The Codebase

- Repository-resident durable coverage added, updated, or removed this round: `Yes`

| Path / Test | Change | Case IDs | Notes |
| --- | --- | --- | --- |
| `autobyteus-android/app/src/androidTest/java/org/autobyteus/mobile/MainActivityConfigurationChangeTest.kt` | Added | API-02, API-08a | The connection screen with a typed address. Forcing landscape and back through `requestedOrientation` must keep the same `MainActivity` instance, the same `EditText` and its text. Passes on API 35 and 34 with the fix, fails without `configChanges` (control). Uses only `androidx.test:core` / `ext:junit` (already dependencies). Run: `./gradlew :app:connectedDebugAndroidTest` |

- Added paths attached for test-code review: `Not Applicable` (direct route; attached for delivery's information)

## Dependencies Mocked Or Emulated

| Dependency | Method | Why | Limitation |
| --- | --- | --- | --- |
| Physical Android phone | Android emulators (API 35, API 34) | team rule | device-specific rotation sensors / OEM behaviors |
| Node access log | access-logging reverse proxy in front of the node | the node logs no requests | none for request counting |

## Temporary Methods And Cleanup

| Item | Owned | Cleanup | Result |
| --- | --- | --- | --- |
| Test node `abx415-api-node` + 5 volumes | Yes | `docker rm -f -v`, volume rm | Removed (`API-99-cleanup.txt`) |
| Access proxy (127.0.0.1:50364) | Yes | killed | Stopped |
| Emulators `autobyteus277_api35`, `autobyteus277_api34` (test AVDs, `-wipe-data`), app data, pushed test file, adb forwards | Yes | `pm clear`, `rm` on the device, `forward --remove-all`, `emu kill` | Done; `adb devices` empty |
| Control build copy `/private/tmp/abx415-api/control` | Yes | `rm -rf` | Removed |
| `/private/tmp/abx415-api` (probes, screenshots) | Yes | `rm -rf` after copying the evidence | Removed |
| User's nodes and any physical phone | No | never addressed | `autobyteus-server-0/1/2` Up |

## Latest Authoritative Result

- Result: `Pass`
- Criteria not proven, or parts only the user can check: `None`
- Notes:
  - **Fresh-start build:** not applicable. The changed paths are `autobyteus-android/**` only, which are not in TESTING.md's build-input list, and the Android Gradle build reads no workspace build output.
  - **Follow-up FU-002 (non-urgent, pre-existing):** cancelling a QR scan clears the typed address on the connection screen.
  - **Observation:** the system navigation bar was 84 px after the display resize and reset (63 px before). The app followed it correctly (API-06).

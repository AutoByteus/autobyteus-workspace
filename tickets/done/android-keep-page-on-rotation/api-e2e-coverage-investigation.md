# API/E2E Coverage Investigation — Android app keeps its page when the phone rotates (autobyteus-415)

The plan. Results are in `api-e2e-execution-coverage-report.md`.

## Investigation Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/android-keep-page-on-rotation/tickets/in-progress/android-keep-page-on-rotation/requirements-doc.md` (SR-001, Approved)
- Investigation Notes: `.../investigation-notes.md` (AR-01…AR-05)
- Solution Revision Record: `.../solution-revision-record.md` (SR-001)
- Design Spec: `.../design-spec.md` (SR-001, Ready; Small / Low)
- Supplemental Task Artifacts: none
- Design Review Report / Architecture Review Revision Record: `N/A — not applicable`
- Implementation Handoff: `.../implementation-handoff.md` (IR-001)
- Implementation Revision Record: `.../implementation-revision-record.md`
- Code Review Report / Revision Record: `N/A — not applicable` (direct low-risk route)
- Delivery Revision Record: N/A
- API/E2E Revision Record: `.../api-e2e-revision-record.md`
- Current API/E2E Revision ID: `API-REV-001`
- Current Investigation Round: 1
- Trigger: implementation_engineer, IR-001 ready for direct API/E2E (2026-11-06)
- Prior Investigation Reviewed: N/A
- Latest Authoritative Investigation: this file

Code under test: worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/android-keep-page-on-rotation`, branch `codex/android-keep-page-on-rotation`, fix `dd129696a4`, handoff `51667e36cf` (ticket files only), base `origin/personal` @ `3bf9240d42`.

## Current Requirement And Design Basis

`.MainActivity` declares `android:configChanges="orientation|screenSize|screenLayout|smallestScreenSize|keyboard|keyboardHidden|navigation"`. Rotation, window-size changes and a hardware keyboard therefore no longer recreate the activity: the same `AutoByteusWebView` and page re-lay out, and the insets listener re-pads the root (REQ-001, REQ-002). No permission or behavior change otherwise (REQ-003). `uiMode`/`locale`/`fontScale`/`density` still recreate (DEC-001). Process death restore is FU-001.

## Supported Scenarios And Real Usage

- Designer scenarios: SCN-001 (rotate / resize on any screen), SCN-002 (connection screen input).
- Added from the implemented behavior (real triggers):
  - **SCN-001a — rotate with a run's view open and live connections.** AC-001 names a run's Files view. The page's live WebSockets should continue without a reconnect, and the node should see no second `GET /mobile/`. The trigger is the user turning the phone on that screen.
  - **SCN-001b — a system picker over the app while the phone turns.** The user attaches a file (the WebView file chooser opens the system document picker), turns the phone, then picks the file. Before the fix the activity would be recreated under the picker and the WebView's chooser callback lost. The trigger is the web page's file input.
  - **SCN-001c — the QR scanner while the phone turns.** The user starts Scan QR from the connection screen, turns the phone while the scanner shows, and returns. The connection screen and its typed text must survive, and the scan result path must still work.
  - **SCN-001d — window-size change without rotation.** A display resize (as a foldable unfolding produces) must keep the page. The trigger is `adb shell wm size` on the emulator, which changes `screenSize`/`smallestScreenSize`.
  - **SCN-001e — Android 14 (API 34).** Before Android 15 the window is not edge-to-edge (README); rotation must keep the page there too.
  - **SCN-003 (by design) — dark-mode toggle still recreates.** It must reload into the saved node's page, not crash or lose pairing (DEC-001).
- Contrived / unsupported: none recorded.

## Changed Behavior Summary

| Behavior | Change | Evidence | Consequence |
| --- | --- | --- | --- |
| BEH-001 activity not recreated on the listed changes | Changed | manifest | runtime checks on two API levels; a durable instrumented test |
| BEH-002 connection input kept | Changed | same | durable instrumented test + emulator |
| BEH-003 insets per orientation | Preserved | `SystemBarInsets.kt` | IMP-04 (reused) + existing `SystemBarInsetsTest`/`WebShellWindowInsetsTest` run on the emulator |
| Launch, pairing, QR scan, file chooser, connection screen | Preserved (REQ-003) | — | journeys across rotation |
| `uiMode` etc. still recreate | Preserved (by design) | DEC-001 | dark-mode check |

## Changed Surface And Boundary Classification

| Surface | Affected | Changed Boundary | Repository Evidence | Not Exercised By It | Broader Mode |
| --- | --- | --- | --- | --- | --- |
| Android shell / activity lifecycle | Yes | manifest `configChanges` | unit test on the manifest text (IMP-06) | platform behavior at run time | Emulator + instrumented test |
| WebView page state / live connections | Yes | page survives | IMP-02 (marker) | WebSockets, the node's view of reloads, a run's view | Emulator + WebView DevTools + node log |
| System activities over the app (picker, scanner) | Yes (lifecycle) | result delivery after a config change | none | — | Emulator |
| Insets | Preserved | — | IMP-04 | instrumented insets tests not run | Emulator (`connectedDebugAndroidTest`) |
| Permissions | Preserved | — | IMP-05 | — | — |
| Web app / server | No | — | — | — | — |

## Project Execution Discovery

- Worktree: as above. Project: `autobyteus-android` (Gradle, Kotlin, minSdk/targetSdk 35 build, JDK 21), WebView shell loading a node's `/mobile`.
- Testing guideline: root `TESTING.md` (no Android row, no closer `TESTING*.md`); Android instructions in `autobyteus-android/README.md` ("Implementation-scoped checks", "Install and launch with adb", "Real-device validation handoff" → `docs/android_mobile_access.md`).
- Conflicts / gaps: TESTING.md lists no Android layer. The README names instrumented tests only for compilation (`compileDebugAndroidTestKotlin`) and points live validation at a USB phone. Per the team rule, no physical phone is used: the emulator AVDs `autobyteus277_api35` / `autobyteus277_api34` (test AVDs of autobyteus-277) are used, and `connectedDebugAndroidTest` runs on them.
- Changed build-input paths: `autobyteus-android/**` only. These are not in TESTING.md's fresh-start list, and the Android Gradle build reads no workspace build output. Fresh-start: not applicable (recorded in the report).
- Secrets: N/A.

| Path | Purpose | Learned |
| --- | --- | --- |
| `autobyteus-android/README.md` | Android commands | `./gradlew :app:testDebugUnitTest`, `:app:assembleDebug :app:compileDebugAndroidTestKotlin`, `adb install/pm clear/am start` |
| `docs/android_mobile_access.md` | pairing model | pairing link `…/mobile?pairing=`; trusted private HTTP acknowledgement |
| `autobyteus-server-ts/src/api/rest/remote-access.ts` | pairing routes | `PUT /rest/remote-access/settings`, `POST /rest/remote-access/pairing-sessions` |
| `TESTING.md` "Docker server nodes" | test node | test-owned container, `127.0.0.1` port, fresh volumes, removed afterwards |

| Component | Start | Readiness | Cleanup |
| --- | --- | --- | --- |
| Emulator `autobyteus277_api35`, later `autobyteus277_api34` | `emulator -avd … -no-window -no-snapshot -wipe-data` | `sys.boot_completed=1` | `adb emu kill` |
| Test node `abx415-api-node` | `docker run` of `autobyteus/autobyteus-server:beta`, `-p 127.0.0.1:<P>:8000`, fresh volumes | `/rest/health` | `docker rm -f -v` + volumes |
| App | `./gradlew :app:assembleDebug`, `adb install -r` | launch | `pm clear` / emulator wipe |

## Existing Durable Coverage Inventory

| Path / Test | Intent | Criteria | Validity | Action |
| --- | --- | --- | --- | --- |
| `app/src/test/…/MainActivityManifestTest.kt` (new) | pins the seven values | AC-004 | Still Valid | Reuse (IMP-06) |
| other `app/src/test` (23 tests) | parsers, policies, migration | AC-005 | Still Valid | Reuse (IMP-06) |
| `app/src/androidTest/…/SystemBarInsetsTest.kt`, `WebShellWindowInsetsTest.kt` | insets on the shell root | AC-003 (REQ-002) | Still Valid; compiled only so far | Run on the emulator (API-02) |
| `app/src/androidTest/…/AutoByteusMobileShellSmokeTest.kt` | package, QR/file-chooser coordinators | AC-005 | Still Valid; compiled only so far | Run on the emulator (API-02) |

## Planned Cases

| Case ID | Criteria | Boundary | Kind | Planned Command Or Steps | Why |
| --- | --- | --- | --- | --- | --- |
| API-01 | AC-001, 002, 003, 004, 005 | manifest, build, emulator | Reused | IMP-02, IMP-03, IMP-04, IMP-05, IMP-06 | Ran on `dd129696a4`; `51667e36cf` changes only ticket files; each file has a header and quoted lines |
| API-02 | AC-001/002 durable; AC-003; AC-005 | instrumented, API 35 | Durable + Existing Test | add `MainActivityConfigurationChangeTest` (connection screen: type, force landscape and back through `requestedOrientation`; the same activity instance, the same text); `./gradlew :app:connectedDebugAndroidTest` on `autobyteus277_api35` | The manifest test pins text only; this pins the runtime behavior; the existing instrumented tests have never run on this change |
| API-03 | AC-001 (as written), SCN-001a | app + test node, API 35 | Journey | pair with a test node; open a run's Files view; marker; record node `GET /mobile` count and the page's WebSockets (DevTools `Network`); `adb emu rotate` ×2; marker, route, view, new WebSockets = 0, node `GET /mobile` unchanged | AC-001's own scenario and the node's view |
| API-04 | REQ-003, SCN-001b | WebView file chooser + system picker | Journey | push a test file; open the run's file attach; rotate while the picker shows; pick the file; page marker kept and the attachment shown | Result delivery after a config change |
| API-05 | REQ-003, SCN-001c, AC-002 | QR scanner activity | Journey | connection screen: type URL, Scan QR (camera permission granted beforehand), rotate while the scanner shows, back; typed text and the screen kept, no crash | Same, for the scanner |
| API-06 | REQ-001 (window size), SCN-001d | display resize | Journey | `adb shell wm size 1600x2560` and back with the page open; marker kept | Window-size change without rotation |
| API-07 | SCN-003 (by design) | `uiMode` | Journey | `adb shell cmd uimode night yes` and back; the app recreates, reopens the saved node's page, still paired | DEC-001 boundary works and does not break |
| API-08 | REQ-001/002, SCN-001e | API 34 | Journey + Existing Test | `autobyteus277_api34`: instrumented tests incl. the new one; app paired: rotate on a page, marker kept, insets clear | Pre-Android-15 window behavior |

- Test progress log needed: `Yes`

## Durable Coverage To Add

| Case | Path | Why |
| --- | --- | --- |
| API-02 | `autobyteus-android/app/src/androidTest/java/org/autobyteus/mobile/MainActivityConfigurationChangeTest.kt` | Proves on a device that the listed changes keep the same activity and its state; it fails if `configChanges` is removed, narrowed or undone by code |

## Durable Coverage To Update / Remove

None.

## Desktop Application Validation Plan

N/A (Android shell; emulator used as the device).

## Not Tested / Infeasible / Deferred

| Behavior | Reason | Risk | User Only? | Follow-Up |
| --- | --- | --- | --- | --- |
| A hardware keyboard attaching (`keyboard`/`keyboardHidden`) | The emulator has no runtime keyboard attach command; the values are declared and pinned (AC-004) and use the same platform mechanism as rotation | Low | No | None |
| Split screen | Not reliably scriptable on the phone AVD; `wm size` (API-06) changes the same `screenSize`/`smallestScreenSize` values | Low | No | None |
| Physical phone | Team rule: no physical phone | Low | No | None |
| A real QR code scanned after rotation | The emulator camera shows a virtual scene; the result path is covered by `qrCoordinator…` instrumented tests and the cancel path in API-05 | Low | No | None |

## Ambiguities Or Reroute Triggers

None.

## Investigation Decision

- Proceed: `Yes`. Durable coverage added: `Yes` (one instrumented test). Reroute: `No`.

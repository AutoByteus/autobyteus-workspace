# API/E2E Coverage Investigation — phone VNC Viewer: full screen in landscape, as large as possible (autobyteus-432)

The plan. Results are in `api-e2e-execution-coverage-report.md`.

## Investigation Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/phone-viewer-landscape-fullscreen/tickets/in-progress/phone-viewer-landscape-fullscreen/requirements-doc.md` (SR-003, Approved within the direction)
- Investigation Notes: `.../investigation-notes.md` (L-01…L-12)
- Solution Revision Record: `.../solution-revision-record.md` (SR-001…SR-003)
- Design Spec: `.../design-spec.md` (SR-003; Medium / High)
- Supplemental Task Artifacts: none
- Design Review Report: `.../design-review-report.md` (ARCH-REV-003, Pass)
- Architecture Review Revision Record: `.../architecture-review-revision-record.md`
- Implementation Handoff: `.../implementation-handoff.md` (IR-002)
- Implementation Revision Record: `.../implementation-revision-record.md`
- Code Review Report: `.../code-review-report.md` (CRR-001, Pass, 9.4/10; CR-C-06 held for evidence)
- Code Review Revision Record: `.../code-review-revision-record.md`
- Delivery Revision Record: N/A
- API/E2E Revision Record: `.../api-e2e-revision-record.md`
- Current API/E2E Revision ID: `API-REV-001`
- Current Investigation Round: 1
- Trigger: code_reviewer, CRR-001 Pass (2026-11-08)
- Prior Investigation Reviewed: N/A
- Latest Authoritative Investigation: this file

Code under test: worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/phone-viewer-landscape-fullscreen`, branch `codex/phone-viewer-landscape-fullscreen`, reviewed at `d76be54fb0` (source `6b05106fb0`; nothing outside `tickets/` changed between them), base `origin/personal` @ `eebbc2b8ee`.

## Current Requirement And Design Basis

In the Android app, the phone viewer's full screen (`full=1`) asks the shell over the bridge (`{type:'desktopFullScreen', on}`, main frame of the node's origin only). The shell's `DesktopFullScreenController` then sets `SENSOR_LANDSCAPE`, overriding the rotation lock, hides the system bars (transient by swipe), and darkens the shown root. Off, page start, another screen and `onDestroy` set `UNSPECIFIED` (the phone's own setting), show the bars and give the root its colour back. "On" is read from the window, so process death is handled.

In View only, double tap toggles Fit ↔ Fill (cover, pan within). Control stays at Fit, and its full-screen strip carries Keyboard, Clipboard and Show controls. Browsers use the Fullscreen API and an orientation lock where allowed, and Esc makes the route follow. No new permission.

## Supported Scenarios And Real Usage

- From the ACs: enter full screen (AC-001); every exit and every way of leaving the page (AC-002); Fill (AC-003); background / return / process death (AC-004); Keyboard and Clipboard in Control full screen (AC-005); browser (AC-006); permissions (AC-007).
- Added from the implemented behavior, with real triggers:
  - **SCN-a — the page restored after Android ended the app while in full screen.** The page reopens on `full=1` and asks for full screen again: the screen turns back to landscape and the bars hide. This needs a run that survives the page; drafts do not. The real trigger is a user whose phone killed the app while they watched in full screen.
  - **SCN-b — copy inside an app on the node, then "Copy from the desktop" (CR-C-06).** The agent copies text in an app (Ctrl+C), and the user brings it to the phone through the Clipboard sheet, in and out of full screen.
  - **SCN-c — pairing still works through the shell bridge** (the bridge gained a message type). A new pairing goes through the share intent and the pairing page.
  - **SCN-d — Android 14 (API 34).** Before Android 15 the window is not edge-to-edge; the bars still have to hide and come back.
- Contrived: none.

## Changed Surface And Boundary Classification

| Surface | Affected | Repository Evidence | Not Exercised By It | Broader Mode |
| --- | --- | --- | --- | --- |
| Android shell (controller, bridge, MainActivity) | Yes | JVM tests (IMP-10: 61) | real orientation/bars/window behaviour, process death | emulator API 35 + API 34 |
| Web (bridge sender, display composable, zoom, view) | Yes | specs (IMP-11: 1190) | real WebView/bridge, real Fullscreen API | emulator + headless Chrome |
| Clipboard sheet (426, untouched) | Indirect (strip opens it) | — | copy from the desktop | emulator, node-side copy in an app |
| Permissions | Preserved | manifest test | — | aapt on the fresh-clone APK |

## Project Execution Discovery

- Testing guideline: root `TESTING.md` (no closer one); Android: `autobyteus-android/README.md` (emulator per the team rule; no physical phone). Browser probes per TESTING.md.
- Changed build-input paths: none (`git diff --name-only eebbc2b8ee d76be54fb0` matches no TESTING.md build input; Gradle/manifest files unchanged). Fresh-start: not required. Environment builds are done from a fresh clone anyway (API-02).
- Environment constraints found:
  - Docker Desktop cannot reach Docker Hub on this machine (a 20 s `docker pull` returned nothing), so the server package is built from a copy of `Dockerfile.monorepo` without its `# syntax` line, with BuildKit's built-in frontend and cached base layers, as the implementation did. Docker is not restarted, because that would touch the user's nodes.
  - Another emulator, `emulator-5584` (AVD `pnnp433_api35`), belongs to another ticket. Every `adb` call names this round's device with `ANDROID_SERIAL`, and that emulator is never addressed.
- Test node `abx432-api-node`: `autobyteus/autobyteus-server:beta` `9c5aa01bb2fc` + the fresh-clone server package (carries `/mobile`) read-only, fresh volumes, `127.0.0.1:<P>:8000`, `LMSTUDIO_HOSTS=http://host.docker.internal:1234` (local models for SCN-a only).
- Emulators: `autobyteus277_api35` (Pixel 7, gesture navigation; auto-rotate set off), `autobyteus277_api34`.
- Secrets: none. Model use: one short message to a local LM Studio model only for SCN-a (free; one at a time; unloaded afterwards per TESTING.md).

## Existing Durable Coverage Inventory

| Path / Test | Criteria | Validity | Action |
| --- | --- | --- | --- |
| `autobyteus-android/app/src/test/.../ui/DesktopFullScreenControllerTest.kt`, `web/ShellBridgeMessagesTest.kt`, `MainActivityManifestTest.kt` | controller, bridge rules, no orientation/permission | Still Valid | Rerun from the fresh clone (API-02) |
| web `useDesktopFullScreenDisplay`, `useNodeDesktopZoom`, `MobileNodeDesktop` specs | REQ-004…006, AC-005 (unit), restore asks at once | Still Valid | Reuse IMP-11 |
| `evidence/browser-probe.mjs` (temporary) | AC-006 | Still Valid | Rerun independently (API-09) |
| `app/src/androidTest/.../MainActivityConfigurationChangeTest.kt` (415) | rotation keeps the activity | Still Valid (preserved behavior) | Run with `connectedDebugAndroidTest` on API 35 (API-03) |

## Planned Cases

| Case ID | Criteria | Surface | Kind | Planned Steps | Why |
| --- | --- | --- | --- | --- | --- |
| API-01 | AC-005 (unit), REQ-004…006, gates | web | Reused | IMP-11, IMP-12, IMP-13 | Ran on `6b05106fb0` = source of HEAD |
| API-02 | AC-007; Android units; builds | fresh clone | Journey | server package (buildx, syntax-less copy); `:app:testDebugUnitTest :app:assembleDebug`; `aapt2 dump permissions` vs base | Environment + independent unit/permission check |
| API-03 | preserved 415/277; bridge | instrumented, API 35 | Existing Test | `:app:connectedDebugAndroidTest` | Rotation/insets tests with the new controller |
| API-04 | AC-001, SCN-c | emulator API 35 (auto-rotate off, gesture nav) | Journey | pair (share intent + pairing page); node list → node → draft run → viewer → full screen: rotation, requested orientation, bar visibility, canvas size and aspect | Rerun + pairing regression |
| API-05 | AC-002 | emulator | Journey | exits: handle; View only tap; Back key; back gesture (edge swipe, immersive: first shows bars, second goes back); leave the viewer while `full=1`; app node list (Switch node); another app screen; page reload — each: `ROTATION_0`, `UNSPECIFIED`, bars visible | Rerun |
| API-06 | AC-003 | emulator | Journey | View only full screen: double tap → Fill; drag; double tap → Fit; node pointer unchanged | Rerun |
| API-07 | AC-004, SCN-a | emulator | Journey | Home + return in full screen; process death in full screen with a draft (reopens portrait, bars, page not full); process death with a run that survives (one local-model message) → restored page `full=1` → landscape + bars hidden | Rerun + the restore path |
| API-08 | AC-005, CR-C-06 (SCN-b) | emulator + node | Journey | Control full screen: strip Keyboard (Gboard keys → node), Clipboard → Send to desktop (`xclip -o`); on the node copy text inside an app (Ctrl+C in a text field) → Clipboard → Copy from the desktop; also outside full screen | CR-C-06 retry |
| API-09 | AC-006 | headless Chrome | Journey | rerun `evidence/browser-probe.mjs` | Independent rerun |
| API-10 | SCN-d (AC-001, AC-002 subset) | emulator API 34 | Journey | full screen → landscape, bars hidden; handle / Back → portrait, bars | API 34 |
| API-11 | privacy | logs | Journey | node log scan | — |
| API-12 | REQ-001/002 on a real window (added during execution) | instrumented, API 35 | New Durable Test | `DesktopFullScreenWindowTest`: on → landscape, bars hidden, dark root, same activity; off → orientation, bars, root colour back; mutation check | Durable-coverage gap found at scoring: no repository test checked what Android does with the controller's window changes |

- Test progress log needed: `Yes`

## Durable Coverage To Add / Update / Remove

None planned at first. Added during execution (API-12): `autobyteus-android/app/src/androidTest/java/org/autobyteus/mobile/DesktopFullScreenWindowTest.kt` — the controller's effect on a real window (the JVM test uses a fake window). Kept as instrumented coverage beside 415's rotation test, because orientation and bar visibility exist only on a device.

## Not Tested / Infeasible / Deferred

| Behavior | Reason | Risk | User Only? |
| --- | --- | --- | --- |
| Physical phone | team rule | Low | No (optional) |
| iOS | out of scope | — | — |
| Browser Esc key | headless Chrome does not deliver Esc to the Fullscreen API; `document.exitFullscreen()` takes the same `fullscreenchange` path | Low | No |

## Ambiguities Or Reroute Triggers

- CR-C-06: if "Copy from the desktop" stays empty after a copy inside an app, the failure goes to failure-origin review (code reviewer), with its evidence.

## Investigation Decision

- Proceed: `Yes`. Durable coverage changes: `Yes` (API-12, added during execution). Reroute: `No` (CR-C-06 passed: API-08).
- Changed during execution: SCN-a's planned outcome ("restored page `full=1` → landscape + bars hidden") is not reachable on a device: the restored viewer route names no run and falls back to Home (API-07, FU-002); AC-004's outcome (orientation and page agree) was checked instead.

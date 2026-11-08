# Implementation Handoff — phone VNC Viewer: full screen in landscape, as large as possible (autobyteus-432)

> State at IR-001: implemented and checked, except AC-005, which the design cannot meet — **Design Impact IMP-DI-001** is with the Solution Designer. After the decision this handoff is updated and goes to code review.

## Upstream Artifact Package

- Upstream review: architecture review selected (Medium/High), passed ARCH-REV-002 (SR-002).
- Requirements doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/phone-viewer-landscape-fullscreen/tickets/in-progress/phone-viewer-landscape-fullscreen/requirements-doc.md` (SR-002, Approved within the direction)
- Investigation notes: `.../investigation-notes.md` (L-01…L-12)
- Solution revision record: `.../solution-revision-record.md` (SR-001, SR-002)
- Design spec: `.../design-spec.md` (SR-002)
- Design review report: `.../design-review-report.md` (ARCH-REV-002, Pass)
- Architecture review revision record: `.../architecture-review-revision-record.md`
- Implementation revision record: `.../implementation-revision-record.md` (IR-001)
- Evidence: `.../evidence/`

## Current Implementation Summary

- Implementation cycle: `Initial` (IR-001); outcome `Design Impact` (IMP-DI-001)
- Commits on `codex/phone-viewer-landscape-fullscreen` (base `origin/personal` @ `eebbc2b8ee`): `9372cdb96b` (implementation), `9d8552563e` (controller fix found on the emulator, AC-004).

What exists:

- **Android** `ui/DesktopFullScreenController.kt` (new): `setOn(true)` → `SCREEN_ORIENTATION_SENSOR_LANDSCAPE` and system bars hidden with `BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE`; `setOn(false)` → `SCREEN_ORIENTATION_UNSPECIFIED` (the phone's own setting; MainActivity declares no orientation — pinned by `MainActivityManifestTest`) and bars shown; idempotent; "on" is read from the window's requested orientation. A two-member `Display` port (orientation, bars) with the Activity adapter inside keeps the logic JVM-testable. `web/ShellBridge.kt`: message `{type:'desktopFullScreen', on}` read only from the main frame of the node's origin (the existing rule), `on` must be a JSON boolean, → `ShellBridgeAction.DesktopFullScreen(on)` → `Actions.onDesktopFullScreen(on)`. `MainActivity.kt`: owns the controller; D-2 is `showScreen(view)` (reset + `setContentView`) used by every screen except the plain page (`showPage`, the one direct `setContentView`), `destroyWebHost()` (reset + destroy) used by `onDestroy`, `openPage`, `closePage`, and `onPageStarted = { desktopFullScreen.reset() }`.
- **Web** `utils/remoteAccess/shellBridge.ts`: `desktopFullScreen(on)`. `composables/mobile/useDesktopFullScreenDisplay.ts` (new, the only sender): app branch when `getShellBridge() !== null`; else the browser's `requestFullscreen()` then `screen.orientation.lock('landscape')`, both rejections caught (stays in-page); a grant that arrives after the viewer already left is left at once; `fullscreenchange` to none while it entered → `onBrowserExit` (the route follows). `MobileNodeDesktop.vue`: `watch(fullScreen, apply, { immediate: true })`, `apply(false)` on unmount; the **Show controls** handle in both modes; gives the zoom noVNC's canvas size. `useNodeDesktopZoom.ts`: double tap at fit → Fill (smallest scale covering the layer, centred), otherwise → Fit; along each axis the picture is kept covering the layer when larger and centred when smaller (no letterbox panned into view; with no picture the layer is the picture, so S3's behaviour is unchanged).
- **Docs**: `autobyteus-web/docs/remote_access.md` (bridge, Fit ↔ Fill, full screen), `autobyteus-android/README.md`, `docs/android_mobile_access.md`, `GLOSSARY.md` (**Desktop full screen**, under Node desktop — the design introduced the word); `docs/design-cases.md` Case 18 (the Solution Designer's).

### Decisions settled in implementation (for the reviewer)

- **Controller state from the window (`9d8552563e`)**: the design said "remember the current requestedOrientation once; off restores it (UNSPECIFIED by default)". On the emulator, after Android ended the app in the background while in full screen, the recreated activity inherited `SENSOR_LANDSCAPE` (Android keeps the activity record's requested orientation) while the new controller remembered nothing, so its reset did nothing: the reopened app stayed in landscape with the page not in full screen (AC-004 fail). Since the app never asks for an orientation otherwise, "before" is always the phone's own setting; off now sets `UNSPECIFIED` and "on" is read from the window, so the page-start reset hands it back. DEC-002 unchanged.
- **Fill box from the canvas size, not its on-screen box**: two pointer moves can arrive before Vue renders the new transform, so undoing the transform from `getBoundingClientRect` would use a stale box; noVNC fits the canvas (the desktop's size) into the layer and centres it, which the zoom computes.
- **No guard on `on` while another screen shows**: after process death the restored page asks for full screen while the app still shows its "connected" screen (`openPage` :186); dropping it would lose AC-004's restore. D-2 resets at page start before the page can ask.
- **Bars on resume**: not re-applied — AC-004 shows Android keeps them hidden across Home and return.

## Design Impact IMP-DI-001 — Control full screen has no Keyboard or Clipboard (AC-005)

- Approved: AC-005 "Control in full screen: Keyboard and Clipboard — Keyboard opens above the hidden bars' area without covering the input; Clipboard works" (REQ-001); the architecture review asks for "Keyboard/Clipboard in landscape" on the emulator.
- Design: `MobileNodeDesktop` "shows the exit handle in full screen in both modes"; Keyboard and Clipboard stay in the screen bar, which full screen hides (S3 L-02).
- Observed (emulator, `ac005.txt`, `IMP-06-control-full-screen-no-keyboard-or-clipboard.png`): Control, Keyboard open (`mInputShown=true`), then full screen → landscape, bars hidden, keyboard closed (`mInputShown=false`, no focus), no Keyboard or Clipboard button; the only control is **Show controls**, which leaves full screen and so returns to portrait (REQ-002). Typing or pasting in landscape full screen is therefore not reachable.
- Options for the Solution Designer:
  - **A (recommended; what AC-005 assumes):** in Control full screen, the top strip carries **Keyboard**, **Clipboard** and **Show controls** (same small style as the handle, outside noVNC's canvas). Small change in `MobileNodeDesktop.vue` with existing labels; then AC-005 is checked as written.
  - **B:** change AC-005: Keyboard and Clipboard only outside full screen (no typing in landscape full screen).

## Routing Classification (Mandatory)

- Task size `Medium`, architectural risk `High` (design spec) — `Confirmed`. Escalation triggers: back gesture — usable (two swipes, Android's standard immersive behaviour; Back key and handle one step); orientation request recreating the activity — no (same pid throughout); bridge from other frames — refused (unit tests).
- Selected route after IMP-DI-001: `Code Review`.

## Reviewed Behavior Implementation Trace

| Behavior | Path | Result |
| --- | --- | --- |
| BEH-001 / REQ-001, 003; AC-001 | full screen button → `full=1` → watcher → `useDesktopFullScreenDisplay.apply(true)` → `shellBridge.desktopFullScreen(true)` → `ShellBridgeMessages.read` → `Actions.onDesktopFullScreen` → controller | Emulator (auto-rotate off): `ROTATION_90`, `SENSOR_LANDSCAPE`, status and navigation bars `visible=false`; canvas 412×232 → 733×412 CSS px (1.779 = 16:9) |
| BEH-002 / REQ-002, 005; AC-002 | exits → route without `full` → `apply(false)`; D-2 resets | Handle, View only tap, Back key, Back gesture (2nd swipe), app node list (D-2), leaving the viewer while `full=1`, page reload → `ROTATION_0`, `UNSPECIFIED`, bars visible each time |
| BEH-003 / REQ-004; AC-003 | double tap → `toggleFill` | Fill 1.178 (= 863/733), centred; vertical drag to −73.4 (cropped part), horizontal fixed (covered exactly); double tap → Fit; node pointer `x:300 y:300` throughout |
| BEH-004 / REQ-005 | handle `v-if="fullScreen"` | Shown in both modes (emulator, spec) |
| REQ-002; AC-004 | controller from the window; D-2 | Home + return: still landscape, bars hidden, `full=1`; process death: reopened in portrait, bars shown, page not in full screen (after `9d8552563e`) |
| REQ-001; AC-005 | — | **IMP-DI-001** |
| REQ-006; AC-006 | browser branch | Headless Chrome: browser full screen + `full=1`; leaving it → route follows (Esc not handled by headless Chrome, the probe called `document.exitFullscreen()`); handle leaves both; Fill 1.111 centred |
| REQ-007; AC-007 | — | Manifest and Gradle files unchanged since base; APK permissions INTERNET, ACCESS_NETWORK_STATE, CAMERA; `MainActivityManifestTest.theAppHoldsNoNewPermission` |

- Changes stayed within the Scope Guardrail: `Yes` (no iOS, no desktop resize, Control stays at fit, `SystemBarInsets` untouched).

## Key Files Or Areas

- Android: `autobyteus-android/app/src/main/java/org/autobyteus/mobile/{MainActivity.kt,ui/DesktopFullScreenController.kt,web/ShellBridge.kt}`; tests `app/src/test/java/org/autobyteus/mobile/{MainActivityManifestTest.kt,ui/DesktopFullScreenControllerTest.kt,web/ShellBridgeMessagesTest.kt}`
- Web: `autobyteus-web/utils/remoteAccess/shellBridge.ts`, `composables/mobile/{useDesktopFullScreenDisplay,useNodeDesktopZoom}.ts`, `components/mobile/views/MobileNodeDesktop.vue`; specs `composables/mobile/__tests__/{useDesktopFullScreenDisplay,useNodeDesktopZoom}.spec.ts`, `components/mobile/views/__tests__/MobileNodeDesktop.spec.ts`
- Docs: `autobyteus-web/docs/remote_access.md`, `autobyteus-android/README.md`, `docs/android_mobile_access.md`, `GLOSSARY.md`, `docs/design-cases.md`

## Known Risks

- IMP-DI-001 (above).
- In landscape the display cutout's inset (136 px on the emulator, left) stays padded by `SystemBarInsets` and shows the shell's light background beside the dark stage (`IMP-03`, `IMP-04`). A 16:9 picture is height-bound there, so Fit loses nothing; Fill is 136 px narrower than the screen. The design leaves the insets owner alone; drawing under the cutout would be a separate decision.
- The first time an app hides the bars Android shows its own "Viewing full screen" hint (`IMP-02`).
- A page that returns to `full=1` after a D-2 reset without starting again stays in portrait (the review's note); reachable only by the synthetic node-list message here (10c).
- The restored page after process death could not be shown re-entering full screen on the device: test runs are drafts (no message is sent to avoid a model call) and do not survive the page; the view spec covers "a page that opens with `full=1` asks at once".
- API 34 not run.

## Environment Or Dependency Notes

- Test node `abx432-phone-node` (local `autobyteus/autobyteus-server:beta` `9c5aa01bb2fc` + this worktree's server package, read-only); emulator `autobyteus277_api35`, gesture navigation, auto-rotate off; app built from this worktree. Pairing now needs `connectionWay` (`local_network` used).
- The server package was built from a copy of `Dockerfile.monorepo` without its `# syntax=docker/dockerfile:1` line: Docker Desktop could not reach Docker Hub (`docker pull` and the frontend resolve hung while the host reached the registry), and restarting Docker would touch the user's nodes. Same stages, BuildKit's built-in frontend.
- Fresh-start build: not run.

## Checks Run

| Check ID | Command Or Steps | Commit | Code | Criteria | Result | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| IMP-10 | `./gradlew :app:testDebugUnitTest :app:assembleDebug` | 9d8552563e | bridge rules, controller, manifest | AC-007, D-2 owner | Pass | `IMP-10-android-unit-tests.txt` (58 tests, 0 failed) |
| IMP-11 | web `vitest run components/mobile composables utils localization` | 9372cdb96b (web unchanged since) | all web changes | REQ-004…006 | Pass | `IMP-11-web-affected-specs.log` (179 files, 1188 tests) |
| IMP-12 | `pnpm -C autobyteus-web typecheck` | 9372cdb96b | web | gate | Pass | baseline 96 test-file errors, 0 production |
| IMP-13 | web guards ×3 | 9372cdb96b | web | gates | Pass | `IMP-13-web-guards.txt` |
| AC-001 | emulator | 9372cdb96b | full chain | AC-001 | Pass | `ac001.txt`, `IMP-03` |
| AC-002 | emulator | 9372cdb96b | exits, D-2 | AC-002 | Pass | `ac002-part1.txt`, `ac002-gesture.txt`, `ac002-d2.txt` |
| AC-003 | emulator | 9372cdb96b | Fill | AC-003 | Pass | `ac003.txt`, `IMP-04`, `IMP-05` |
| AC-004 | emulator | 9372cdb96b → 9d8552563e | resume, process death | AC-004 | Fail → fixed → Pass | `ac004.txt` (run on the fixed APK) |
| AC-005 | emulator | 9d8552563e | Control full screen | AC-005 | Not reachable | IMP-DI-001; `ac005.txt`, `IMP-06` |
| AC-006 | headless Chrome probe | 9372cdb96b | browser branch | AC-006 | Pass | `AC-006/AC006-results.json`, screenshots |
| AC-007 | manifest/Gradle diff since base; `aapt dump permissions` | 9d8552563e | build | AC-007 | Pass | IMP-10; this table |

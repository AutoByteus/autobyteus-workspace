# Handoff Summary: phone-viewer-landscape-fullscreen (autobyteus-432)

- Status: verified from the evidence (audited, not redone), archived and finalized on `personal`. **No release**: none was requested for this ticket.
- Classification: `task_size=Medium`, `architectural_risk=High`, reviewed route. Architecture review passed. Code review CRR-001 Pass 9.4/10. API/E2E API-REV-001 Pass 95%. Test-code review CRR-002 Pass: the one durable test is mutation-checked.

## What Changed

- Android app (`DesktopFullScreenController.kt`, `ShellBridge.kt`, `MainActivity.kt`):
  - On the page's `{ type: 'desktopFullScreen', on: true }` the app requests sensor landscape and hides the status and navigation bars (immersive; a swipe shows them for a moment).
  - On `on: false`, leaving the viewer, the node list or any other screen, the app restores the phone's own orientation and bars.
- Page (`useDesktopFullScreenDisplay.ts`, `MobileNodeDesktop.vue`, `useNodeDesktopZoom.ts`, `shellBridge.ts`):
  - Full screen drives the app's window, or the browser's full screen and orientation lock where allowed; otherwise the in-page full screen.
  - A "Show controls" strip, which in Control also holds Keyboard and Clipboard.
  - A double tap switches Fit ↔ Fill in View only.
  - Panning is clamped to the picture's edge.
  - The shell root is dark while full screen is on.
- Tests: `DesktopFullScreenWindowTest` (instrumented; real window; mutation-checked), unit tests for the controller and the bridge, and web specs.
- Docs: `remote_access.md`, `android_mobile_access.md`, `autobyteus-android/README.md`, `GLOSSARY.md` and `docs/design-cases.md` Case 18 (implementation). Delivery added the test to the README's list.

## Integration

- First the 10 uncommitted solution, review and code-review documents were committed (`748fd15021`).
- `origin/personal` had moved from `eebbc2b8ee` to `2a450f32b0` (autobyteus-426 round 2: web stores, utils, collaboration, localization, server security). Merged as `f0f8a74589` with no conflicts. Two docs edited on both sides merged cleanly.
- Rerun on the merged state: see `evidence/DEL-01-merged-state-rerun.log` and the release/deployment report.

## Verification (audit of the evidence)

- AC-001 (API-04, API-10 on API 34, API-12):
  - Full screen gives `rotation=ROTATION_90 requested=SCREEN_ORIENTATION_SENSOR_LANDSCAPE statusBar:visible=false navBar:visible=false`.
  - The canvas goes from 412×232 to 733×412 with `"aspect":"1.778","desktopAspect":"1.778"`.
  - The durable test passes, and fails under both mutations ("hides the status and navigation bars", "turns the screen to landscape").
- AC-002 (API-05): every exit returns `ROTATION_0 … UNSPECIFIED … visible=true visible=true`, and `user_rotation` ends at 0. The exits are the handle, a View only tap, the Back key, and the back gesture (the first swipe shows the bars, the second leaves).
- AC-004 (API-07):
  - Home and return keep `full=1`, landscape and the hidden bars.
  - After process death (new pid: A5 `6452`, C4 `6803`) the app opens portrait with bars, consistent with the restored page, which names no viewer.
  - Bringing back the viewer itself after process death is FU-002, outside this AC.
  - Part B's `am kill` had not ended the process (same pid). API/E2E reran it with a pid check (C1–C5).
- AC-005 (API-08): Control full screen. The keyboard typed `abx432typed` on the node. Clipboard Send put `'abx432-sent-in-full-screen'` on the node, and Copy showed the node's text. Full screen stays on throughout.
- AC-003 (Fill, no input; API-06, API-10), AC-006 (browser; API-09) and AC-007 (permissions unchanged, no manifest or Gradle change; API-02) are proven as well.
- No user check is needed.

## Residual

- Android shows a one-time "Viewing full screen" hint that holds focus until Got it. That is Android's behavior; the back gesture still exits.
- Follow-ups FU-001 (drawing under the display cutout), FU-002 (the viewer is not restored after process death when the restored route names no run) and FU-003 (in landscape full screen the keyboard covers the Clipboard sheet's Send). They are in `follow-ups.md`; the Solution Designer sends them.

## Release

- None. The change ships in the next release the user asks for. `release-notes.md` carries the user action: install the APK and update the node.

# Handoff Summary: node-desktop-on-phone (autobyteus-407, slice S3 of autobyteus-394)

- Status: verified from the evidence (audited, not redone), archived and finalized on `personal`. **No release**: none was requested for this ticket. The user's beta request covered autobyteus-405.
- Classification: `task_size=Large`, `architectural_risk=High`, reviewed route. Architecture review passed. Code review: CRR-001 found CR-001, fixed in IR-002; CRR-002 Pass 9.5/10. API/E2E API-REV-001 Pass, 95.0%. Test-code review CRR-003 Not Applicable.

## What Changed

- Phone (`/mobile`) and a desktop browser paired with it:
  - A run's ⋮ menu offers **VNC Viewer** when the paired node has a node desktop and the run is on that node.
  - The view (`MobileNodeDesktop.vue`, `?screen=desktop`) opens in View only, fitted to the screen. Pinch zooms up to 4×, drag pans, double tap or Fit resets, and Ctrl+wheel zooms in a browser.
  - **Control** is a switch, after which tap, drag and two-finger scroll act on the desktop. **Keyboard** bridges the phone's keyboard, including composed words.
  - Full screen hides the bars. Back leaves full screen first.
  - Leaving the app ends the stream, and coming back reconnects in View only.
- Node server:
  - Stream limits: 4 node-wide and 2 per phone, refused before any desktop connection with 4429.
  - Phone streams are re-checked: Phone Access off or a revoked phone ends them (`node-closed`).
- Desktop app: the VNC Viewer tile uses the same connection and availability composables. It shows "Too many viewers on this node right now" with Retry.
- CR-001 fix (`0baf15a981`): an availability error is not cached as a shared answer, so the next caller asks again.
- Docs: `remote_access.md` and `node_desktop.md` (implementation); `docs/android_mobile_access.md` and `autobyteus-web/docs/terminal.md` (delivery: the "no VNC on the phone" text corrected).

## Integration

- The code reviewer's three uncommitted reports were committed first (`b71b542ca7`).
- The branch was already current with `origin/personal` at `e427a0c9cf`. There were no new base commits, so nothing was rerun.

## Verification (audit of the evidence)

- AC-017 (phone view), API-04 on an emulator:
  - In View only the node pointer stays at `x:300 y:300` after taps, a swipe, a pinch, a pan and a double tap. The picture zooms to `scale(2.75)`, and Fit returns `scale(1)`.
  - Landscape `863x360` stays `Connected · View only`.
  - Full screen gives `barVisible:false`; a tap brings the bars back; Back goes to `?screen=desktop`.
  - In Control a tap aimed at 1600,800 lands at `x:1598 y:799`.
  - Screenshot `API-04-2`: "VNC Viewer · Connected · View only" with the node desktop.
- AC-018 (desktop browser), API-10: `mouseOnNode x:300 y:300` in View only, zoom `scale(4)` and back to `scale(1)`, a Control click at `x:959 y:540`, `"result":"done"`.
- AC-019 (background), API-06: upstream drops to 0 at +1.21 s, the log shows `reason=viewer-closed`, and after returning the view is `Connected · View only` with the same pid.
- AC-012 (Phone Access off or revoke), API-07: Phone Access off ends the stream at +4.8 s (`close=PHONE_ACCESS_DISABLED`); a revoke at +15.6 s (`close=REMOTE_ACCESS_DEVICE_REVOKED`). Reopening is refused. Route E2E: "ends open phone streams within 25 s of Phone Access being turned off".
- AC-021 (stream limits), API-08:
  - A third stream from one phone shows "Too many viewers on this node right now" with Retry while upstream stays at 2.
  - A fifth node-wide stream (device B) is refused at upstream 4.
  - Retry connects once a stream leaves.
  - The desktop app tile shows the same message and Retry.
  - Route E2E tests refuse the 5th node-wide and the 3rd per-phone stream with 4429 "before any desktop connection".
- AC-S3-1 (keyboard), API-05 with Gboard: `abc` + Backspace + Enter → `ab`; the suggestion "hello" and the correction "world" each arrive once.
- AC-S3-2 (entry rule): IMP-S3-30 UI tests. API-09 (CR-001): the entry is hidden while availability errors and shown on the next run screen.
- No user check is needed. The AC itself makes a physical phone "optional, by the user", and the emulator was used per the team rule.

## Residual

- A physical phone (optional, the user's).
- iOS is out of scope.
- Only Gboard was tested; CJK input methods are not guaranteed (documented).
- A 4429 refusal writes no node log line.
- `navigator.permissions` is undefined in the Android WebView (observation).

## Release

- None. The change ships in the next release the user asks for. `release-notes.md` carries the user action: update the Docker node, since the phone gets the screen from the node.

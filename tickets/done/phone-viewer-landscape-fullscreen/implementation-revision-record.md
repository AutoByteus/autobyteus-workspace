# Implementation Revision Record — phone VNC Viewer: full screen in landscape (autobyteus-432)

The current code and `implementation-handoff.md` remain authoritative.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Finding IDs | Classification | Related Revision IDs | Result |
| --- | --- | --- | --- | --- | --- |
| IR-001 | Architecture Reviewer, `design-review-report.md` (ARCH-REV-002 Pass of SR-002), round 1 | AR-432-003 (done by the Solution Designer) | `Initial Baseline` → `Design Impact` (IMP-DI-001) | SR-001, SR-002; ARCH-REV-001, ARCH-REV-002; CRR `N/A`; API-REV `N/A`; DR `N/A` | Implemented as designed (`9372cdb96b`); emulator AC-004 found a restore defect, fixed in-round (`9d8552563e`); emulator AC-005 shows Control full screen has no Keyboard or Clipboard: IMP-DI-001 to the Solution Designer |
| IR-002 | Architecture Reviewer, `design-review-report.md` (ARCH-REV-003 Pass of SR-003), round 2 | IMP-DI-001, AR-432-004, AR-432-005 (AR-432-003 already resolved) | `Design Impact` (implemented) | SR-003; ARCH-REV-003; CRR `N/A`; API-REV `N/A`; DR `N/A` | Control full-screen strip (Keyboard, Clipboard, Show controls); dark shell root while on, its own colour back on off (`6b05106fb0`); AC-005 passes as written on the emulator; to code review |

## Revision Entries

### IR-001 — Desktop full screen in landscape; Fit ↔ Fill

- Triggering role, report path, and round: Architecture Reviewer pass (`design-review-report.md`, ARCH-REV-002 of SR-002), round 1
- Triggering finding IDs: AR-432-003 (non-blocking; already done by the Solution Designer: the new case is Case 18)
- Classification: `Initial Baseline`; outcome `Design Impact` (IMP-DI-001)
- Prior authoritative result: N/A
- Current authoritative result: `9372cdb96b` + `9d8552563e`; `implementation-handoff.md`
- Related solution revision IDs: SR-001, SR-002
- Related architecture-review revision IDs: ARCH-REV-001, ARCH-REV-002
- Related code-review revision IDs: N/A
- Related API/E2E revision IDs: N/A
- Related delivery revision IDs: N/A
- Why this baseline is recorded: first implementation of the reviewed design
- Approved behavior or requirement IDs affected: REQ-001…007; AC-001…007; BEH-001…004
- Implementation delta: Android `DesktopFullScreenController` (sensor landscape + hidden system bars; off = the phone's own setting), bridge message `desktopFullScreen` in `ShellBridgeMessages.read` → `ShellBridgeAction.DesktopFullScreen` → `Actions.onDesktopFullScreen`, D-2 in `MainActivity` (`showScreen` for every non-page screen, `destroyWebHost` for every host destroy, `onPageStarted` reset); web `shellBridge.desktopFullScreen`, `useDesktopFullScreenDisplay` (app / browser / in-page), `MobileNodeDesktop` (watcher, unmount off, handle in both modes, canvas size for Fill), `useNodeDesktopZoom` (Fit ↔ Fill by double tap; pan and zoom kept to the picture); docs, glossary. In-round fix `9d8552563e`: the controller reads "on" from the window and hands back `UNSPECIFIED`, so a recreated activity left in landscape by Android is reset at page start (AC-004 after process death)
- Changed files or areas: see `implementation-handoff.md` "Key Files Or Areas"
- Local validation and result: see `implementation-handoff.md` "Checks Run"
- Next recipient or routing: `/software_engineering_team/solution_designer` (Design Impact IMP-DI-001); after the decision, code review
- Remaining limitations or risks: IMP-DI-001 open; see `implementation-handoff.md` "Known Risks"

### IR-002 — Keyboard and Clipboard in Control full screen; dark shell root (IMP-DI-001, SR-003)

- Triggering role, report path, and round: Architecture Reviewer, `design-review-report.md` ARCH-REV-003 (Pass of SR-003), round 2; decision by the Solution Designer (SR-003, option A; FU-001 for drawing under the cutout)
- Triggering finding IDs: IMP-DI-001 (raised in IR-001); AR-432-004 (keep the keyboard input and the Clipboard sheet mounted outside the hidden bar); AR-432-005 (restore the root's own background through `Display`; optional side-margin placement); AR-432-003 (already resolved in `9372cdb96b`: `docs/design-cases.md:253` is Case 18; the reviewer withdrew the renumbering request)
- Classification: `Design Impact` (implemented)
- Prior authoritative result: IR-001 (`9372cdb96b` + `9d8552563e`): Control full screen offered only Show controls; entering it closed the keyboard; no way to type or paste in landscape full screen (`ac005.txt`)
- Current authoritative result: `6b05106fb0`; `implementation-handoff.md` at this round
- Related solution revision IDs: SR-003
- Related architecture-review revision IDs: ARCH-REV-003
- Related code-review revision IDs: N/A
- Related API/E2E revision IDs: N/A
- Related delivery revision IDs: N/A
- Why this implementation revision is recorded: the reviewed design added the Control full-screen strip and the dark shell root
- Approved behavior or requirement IDs affected: REQ-001, REQ-003, REQ-005; AC-005 (AC-001, AC-004 rechecked)
- Implementation delta: `MobileNodeDesktop.vue`: the full-screen strip (`mobile-node-desktop-full-screen-strip`) carries Keyboard (`openKeyboard`, focus inside the tap) and Clipboard (`clipboardOpen = true`) in Control while connected, and Show controls in both modes; the keyboard textarea and the Clipboard sheet were already mounted outside the bar (their closing in IR-001 came from the bar's full-screen button taking focus). `DesktopFullScreenController`: `Display.rootBackgroundColor`; on darkens the shown root to the stage colour `#1E1E1E` and keeps its own colour; off gives that colour back; a root with no plain colour is left as it is; `pageShown()` darkens a page shown while on (`MainActivity.showPage`), for a node reopened in full screen whose page asks before it finishes loading. Strip placed at the top as designed (AR-432-005's side-margin placement not taken: on a 16:9 phone Control at Fit has no side margin). Specs: strip opens the keyboard (focus, sentinel) and the Clipboard sheet without leaving full screen; View only strip has only the handle. JVM: 8 controller cases incl. background give-back, `pageShown`, no-colour root.
- Changed files or areas: `autobyteus-web/components/mobile/views/MobileNodeDesktop.vue` (+ spec), `autobyteus-android/.../ui/DesktopFullScreenController.kt` (+ test), `MainActivity.kt` (`pageShown`), `autobyteus-web/docs/remote_access.md`, `autobyteus-android/README.md`
- Local validation and result: Android 61 JVM tests pass; web 179 files / 1190 tests pass; typecheck at baseline; guards pass; emulator AC-005 as written (strip Keyboard → `mInputShown=true`, Gboard a b c Return BackSpace reach xev; Clipboard sheet opens and Send to desktop lands on the node's clipboard, in landscape full screen); dark cutout `rgb(30,30,30)` while on, `rgb(248,250,252)` after off; AC-004 process death rechecked
- Next recipient or routing: `/software_engineering_team/code_reviewer` (Medium/High)
- Remaining limitations or risks: see `implementation-handoff.md` "Known Risks"


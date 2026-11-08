# Implementation Revision Record — phone VNC Viewer: full screen in landscape (autobyteus-432)

The current code and `implementation-handoff.md` remain authoritative.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Finding IDs | Classification | Related Revision IDs | Result |
| --- | --- | --- | --- | --- | --- |
| IR-001 | Architecture Reviewer, `design-review-report.md` (ARCH-REV-002 Pass of SR-002), round 1 | AR-432-003 (done by the Solution Designer) | `Initial Baseline` → `Design Impact` (IMP-DI-001) | SR-001, SR-002; ARCH-REV-001, ARCH-REV-002; CRR `N/A`; API-REV `N/A`; DR `N/A` | Implemented as designed (`9372cdb96b`); emulator AC-004 found a restore defect, fixed in-round (`9d8552563e`); emulator AC-005 shows Control full screen has no Keyboard or Clipboard: IMP-DI-001 to the Solution Designer |

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

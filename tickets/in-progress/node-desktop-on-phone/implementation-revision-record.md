# Implementation Revision Record — S3 (autobyteus-407)

The current code and `implementation-handoff.md` remain authoritative.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Finding IDs | Classification | Related Revision IDs | Result |
| --- | --- | --- | --- | --- | --- |
| IR-001 | Architecture Reviewer, `design-review-report.md` (ARCH-REV-002 Pass of SR-002), round 1 | AR-S3-009, AR-S3-010 (settled here) | `Initial Baseline` | SR-001, SR-002; ARCH-REV-002; CRR `N/A`; API-REV `N/A`; DR `N/A` | MP-001 holds; implemented as designed (`4f11061ecf`); the emulator keyboard check found a caret defect in the keyboard bridge, fixed in the same round (`d84d2d0fdd`); emulator and browser checks pass; to code review |

## Revision Entries

### IR-001 — VNC Viewer on the phone; viewer limits and live phone revocation

- Triggering role, report path, and round: Architecture Reviewer pass (`design-review-report.md`, ARCH-REV-002 of SR-002), round 1
- Triggering finding IDs: AR-S3-009 (keyboard sentinel; settled), AR-S3-010 (three stale spec lines; settled by following the Ownership Map, the DS-S3-* spines and the file mapping)
- Classification: `Initial Baseline`
- Prior authoritative result: N/A
- Current authoritative result: `4f11061ecf` + `d84d2d0fdd`; `implementation-handoff.md`
- Related solution revision IDs: SR-001, SR-002
- Related architecture-review revision IDs: ARCH-REV-002
- Related code-review revision IDs: N/A
- Related API/E2E revision IDs: N/A
- Related delivery revision IDs: N/A
- Why this baseline is recorded: first implementation of the reviewed S3 design
- Approved behavior or requirement IDs affected: REQ-014, 015, 016, S3-1…S3-5, REQ-009, REQ-019; AC-017, 018, 019, 012, 021, S3-1, S3-2, S3-3; BEH-003, BEH-008, BEH-S3-1, BEH-S3-2
- Implementation delta: server `NodeDesktopViewers` (admission 4/2, 4429, non-overlapping 20 s re-check with concurrent 5 s checks), `NodeDesktopStream.close`/`onEnd`, close mapping moved to `src/remote-access/domain/remote-access-close-codes.ts`, route admission step; web `too-many` state, `useNodeDesktopConnection` (extracted from the tile), `useNodeDesktopAvailability` (one owner), `useVncSession` keys and a switch that waits for the old socket, `useNodeDesktopZoom`, `MobileNodeDesktop` view, `desktop` screen + `full=1` key, menu entry and shell wiring, `vnc` mobile gate removed, localization, docs; tests. In-round fix `d84d2d0fdd`: the keyboard diff follows the local caret (Gboard leaves it inside the sentinel after a Backspace)
- Changed files or areas: see `implementation-handoff.md` "Key Files Or Areas"
- Local validation and result: see `implementation-handoff.md` "Checks Run" and `evidence/README.md`
- Next recipient or routing: `/software_engineering_team/code_reviewer` (Large/High)
- Remaining limitations or risks: see `implementation-handoff.md` "Known Risks"

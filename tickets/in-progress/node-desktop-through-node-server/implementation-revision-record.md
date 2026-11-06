# Implementation Revision Record — S1 (autobyteus-405)

The current code and `implementation-handoff.md` remain authoritative.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Finding IDs | Classification | Related Revision IDs | Result |
| --- | --- | --- | --- | --- | --- |
| IR-001 | Architecture Reviewer, `design-review-report.md` (ARCH-REV-002 Pass), round 1; Solution Designer SR-003 (AR-006 row) | AR-006 (settled) | `Initial Baseline` → `Design Impact` (IMP-DI-001) | SR-001, SR-002, SR-003; ARCH-REV-002; CRR `N/A`; API-REV `N/A`; DR `N/A` | Implemented as designed (`6407bfc15f`); real-node check found IMP-DI-001; routed to Solution Designer |

## Revision Entries

### IR-001 — Node desktop through the node's own server

- Triggering role, report path, and round: Architecture Reviewer pass (`design-review-report.md`, ARCH-REV-002), round 1; Solution Designer message for SR-003 (D-7 row for 1005)
- Triggering finding IDs: AR-006 (non-blocking; settled here and in SR-003)
- Classification: `Initial Baseline`; outcome `Design Impact` (IMP-DI-001, D-5 ClientCutText View only row)
- Prior authoritative result: N/A
- Current authoritative result: see `implementation-handoff.md` (commits listed there)
- Related solution revision IDs: SR-001, SR-002, SR-003
- Related architecture-review revision IDs: ARCH-REV-002
- Related code-review revision IDs: N/A
- Related API/E2E revision IDs: N/A
- Related delivery revision IDs: N/A
- Why this baseline is recorded: initial implementation of the reviewed S1 design
- Approved behavior or requirement IDs affected: REQ-001…008, 010, 011, 017, 020; AC-001…011, 013, 014, 020, 022; BEH-001, 002, 005, 006, 007, 008, 011, 012 (BEH-009 preserved)
- Implementation delta: new server subsystem `src/node-desktop/` (availability, RFB input filter, stream) and routes `GET /rest/node-desktop`, `/ws/node-desktop`; predefined `AUTOBYTEUS_VNC_SERVER_HOSTS` removed; web `nodeDesktopClient`, `nodeDesktopWs` endpoint, `useVncSession` owning the WebSocket (no password, no resize, mode per stream), `NodeDesktopTile` (renamed, visibility, mode switch, Reconnect), `VncViewer` availability states, "AutoByteus VNC Hosts" card and the `hostPort`/`format` code removed, `vncHosts.ts` removed, localization (en, zh-CN); launcher (bash, PowerShell) and compose publish only the backend, no host env, `v9`; docs, GLOSSARY, module doc; tests
- Changed files or areas: see `implementation-handoff.md` "Key Files Or Areas"
- Local validation and result: see `implementation-handoff.md` "Checks Run"
- Next recipient or routing: `/software_engineering_team/solution_designer` (Design Impact IMP-DI-001); after the decision, code review
- Remaining limitations or risks: IMP-DI-001 open; see `implementation-handoff.md` "Known Risks"

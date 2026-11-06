# Implementation Revision Record — S1 (autobyteus-405)

The current code and `implementation-handoff.md` remain authoritative.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Finding IDs | Classification | Related Revision IDs | Result |
| --- | --- | --- | --- | --- | --- |
| IR-001 | Architecture Reviewer, `design-review-report.md` (ARCH-REV-002 Pass), round 1; Solution Designer SR-003 (AR-006 row) | AR-006 (settled) | `Initial Baseline` → `Design Impact` (IMP-DI-001) | SR-001, SR-002, SR-003; ARCH-REV-002; CRR `N/A`; API-REV `N/A`; DR `N/A` | Implemented as designed (`6407bfc15f`); real-node check found IMP-DI-001; routed to Solution Designer |
| IR-002 | Architecture Reviewer, `design-review-report.md` (ARCH-REV-003 Pass of SR-004), round 2 | IMP-DI-001, AR-007 | `Design Impact` (implemented) | SR-004; ARCH-REV-003; CRR `N/A`; API-REV `N/A`; DR `N/A` | View only forwards only a well-formed extended Caps ClientCutText (`ce13fa9727`); AR-007 tests; real-node and browser reruns pass; to code review |

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

### IR-002 — View only forwards the viewer's extended-clipboard Caps (IMP-DI-001)

- Triggering role, report path, and round: Architecture Reviewer, `design-review-report.md` ARCH-REV-003 (Pass of SR-004), round 2; decision by the Solution Designer (SR-004, D-5 row 6, option A)
- Triggering finding IDs: IMP-DI-001 (raised in IR-001); AR-007 (Low, tests)
- Classification: `Design Impact` (implemented)
- Prior authoritative result: IR-001, `6407bfc15f`: View only dropped every ClientCutText; on a real Xvnc the agent's clipboard was pushed as an unsolicited Provide and noVNC 1.7.0 desynced (evidence IMP-13, IMP-14)
- Current authoritative result: `ce13fa9727`; `implementation-handoff.md` at this round
- Related solution revision IDs: SR-004
- Related architecture-review revision IDs: ARCH-REV-003
- Related code-review revision IDs: N/A
- Related API/E2E revision IDs: N/A
- Related delivery revision IDs: N/A
- Why this implementation revision is recorded: the reviewed design changed the View only clipboard rule
- Approved behavior or requirement IDs affected: REQ-006, REQ-017; AC-006, AC-020 (AC-001 in the browser)
- Implementation delta: `rfb-viewer-input-filter.ts`: action `forward-clipboard-caps-only` for type 6 in View only, `isExtendedClipboardCaps` (negative length, Caps bit 1<<24, abs(length) = 4 + 4 × popcount(flags & 0xffff)); framing unchanged. Tests: AR-007 filter cases (noVNC's Caps bytes, pure Caps with 0/1/2 formats, Caps a format too short/long, Request, Peek, Notify, Provide, plain text, all split into single bytes); contract test uses noVNC's exact Caps call and expects forward in view. `node_desktop.md` row 6 and note.
- Changed files or areas: `autobyteus-server-ts/src/node-desktop/rfb-viewer-input-filter.ts`, `tests/unit/node-desktop/rfb-viewer-input-filter.test.ts`, `docs/modules/node_desktop.md`; `autobyteus-web/tests/integration/novnc-node-desktop-filter-contract.integration.test.ts`
- Local validation and result: IMP-21…IMP-25 pass; the new Caps cases fail on the IR-001 filter (5 failed) and pass now; real node IMP-15 (View only: `notify`, no `provide`), IMP-16, IMP-17, IMP-18 pass; browser probe IMP-19 passes; real launcher container IMP-20 passes
- Next recipient or routing: `/software_engineering_team/code_reviewer` (Large/High)
- Remaining limitations or risks: no `pwsh`; Electron desktop instance, AC-002 and fresh-start build not run here


# Implementation Revision Record — update-restart-reliability (autobyteus-339)

The current code and `implementation-handoff.md` are authoritative. This record indexes implementation rounds.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Finding IDs | Classification | Related Revision IDs | Result |
| --- | --- | --- | --- | --- | --- |
| IR-001 | `/software_engineering_team/architecture_reviewer`, `design-review-report.md`, round 1 (ARCH-REV-001 Pass) | N/A | `Initial Baseline` | SR-003, ARCH-REV-001 | D1 and D2 implemented with tests and docs; ready for code review |
| IR-002 | `/software_engineering_team/architecture_reviewer`, `design-review-report.md` (ARCH-REV-003 Pass on SR-005) | F-API-001 (via CRR-002, SR-004); AR-003, AR-004 (via SR-005) | `Design Impact` (implemented revised design) | SR-004, SR-005, ARCH-REV-003, CRR-002, API-REV-001 | D1 replaced by the grace-drain close hook, installed last; back to code review |

## Revision Entries

### IR-001 — Close client connections at server close; install after an incomplete stop when the server is gone

- Triggering role, report path, and round: Architecture Reviewer, `design-review-report.md`, round 1 (`Pass`), 2026-10-31.
- Triggering finding IDs: N/A (AR-001 and AR-002 are non-blocking; AR-002's AC-002 detail is for validation).
- Classification: `Initial Baseline`.
- Prior authoritative result: N/A.
- Current authoritative result: design-spec § Change / Refactor Sequence steps 1–3 done; step 4 (validation) belongs to API/E2E.
- Related solution revision IDs: SR-003 (design), SR-002 (approval).
- Related architecture-review revision IDs: ARCH-REV-001.
- Related code-review revision IDs: N/A.
- Related API/E2E revision IDs: N/A.
- Related delivery revision IDs: N/A.
- Why this baseline is recorded: the initial implementation handoff.
- Approved behavior or requirement IDs affected: BEH-001 (REQ-001), BEH-002 (REQ-002); preserved BEH-003, BEH-004 (REQ-003).
- Implementation delta:
  1. D1: `src/shutdown/server-close-options.ts` (`SERVER_CLOSE_OPTIONS = { forceCloseConnections: true } as const`, with the cause); spread first into the four `fastify({...})` constructions (studio, standalone application, Agent Tools MCP local, credential proxy local).
  2. D2: `BaseServerManager.isServerProcessGone()`; `ApplicationShutdown.acceptIncompleteStopForInstall()` (only after a settled rejected stop; throws otherwise); private `ElectronApplication.prepareForInstall()` wired at both `AppUpdater` sites.
  3. Docs: `agent_execution.md` (close rule), `electron_packaging.md` (install rule).
- Changed files or areas: see `implementation-handoff.md` § Key Files Or Areas. Code commit `ddb03d0d0b`.
- Local validation and result: IMP-01 to IMP-07 pass on `ddb03d0d0b`; the new tests fail on base code (IMP-01, IMP-02 fail-before logs).
- Next recipient or routing: Code Reviewer (Medium / High), per `get_handoff_rules`.
- Remaining limitations or risks: AR-002 (in-flight handlers overlap the cleanup), N-1 to N-4; AC-002 and AC-003 owed by validation.

### IR-002 — D1 revised: grace-drain client connections at close, installed last (SR-004/SR-005)

- Triggering role, report path, and round: Architecture Reviewer, `design-review-report.md` (ARCH-REV-003 `Pass` on design-spec SR-005), 2026-10-31.
- Triggering finding IDs: F-API-001 (API-REV-001 → CRR-002 Design Impact → SR-004); AR-003, AR-004 (ARCH-REV-002 → SR-005).
- Classification: `Design Impact` (an upstream design revision, implemented here).
- Prior authoritative result: IR-001 (CRR-001 `Pass`; API-REV-001 `Fail`: IR-001's `forceCloseConnections` cut `createAgentRun` requests in progress, leaving prepared-only runs).
- Current authoritative result: revised D1 implemented; D2 unchanged; ready for code review.
- Related solution revision IDs: SR-004, SR-005 (REQ-001/DEC-002 revised in SR-004; AC-002 tightened; AC-008 added).
- Related architecture-review revision IDs: ARCH-REV-003.
- Related code-review revision IDs: CRR-002.
- Related API/E2E revision IDs: API-REV-001.
- Related delivery revision IDs: N/A.
- Why this revision is recorded: closing must not cut a request in progress (it completes within a 2 s grace), while still not waiting on a connection that never sent a request.
- Approved behavior or requirement IDs affected: BEH-001 (REQ-001; AC-001, AC-002, AC-008).
- Implementation delta:
  1. Removed `src/shutdown/server-close-options.ts`, its test and the four spreads (no re-export).
  2. Added `src/shutdown/client-connection-close.ts`: `installClientConnectionClose(app, { graceMs?, timers? })`, `IN_FLIGHT_REQUEST_GRACE_MS = 2_000`; tracks `connection` / `request` / `upgrade`; one `preClose` hook that destroys new connections on arrival from its start, destroys never-used connections, waits for requests in progress up to the grace, then `closeAllConnections()`. Comment cites FU-008, F-API-001 and N-5.
  3. Installed as the last `preClose` hook: studio after `registerGraphql` (so after `nativeShutdown.install` and `register(websocket)`); standalone application after its static routes; the two local servers in their constructors.
  4. Tests: `client-connection-close.test.ts` (7 cases from P-003/P-004, AC-001, AC-008, AR-003 a); `studio-preclose-order.test.ts` (AR-003 b, real studio build: registration and run order).
  5. Docs: `agent_execution.md` and `electron_packaging.md` updated to the grace rule.
- Changed files or areas: the four server files, the new helper and its tests, the two docs. Code commit `591bf52551`.
- Local validation and result: IMP-08 to IMP-12 pass; the mutations (base behavior, IR-001's cut-everything, studio hook installed first) each fail the new tests.
- Next recipient or routing: Code Reviewer (Medium / High), per `get_handoff_rules`.
- Remaining limitations or risks: N-5, N-6 (a request outlasting the grace is cut; FU-004), N-7; AC-002 (API-02 shape with base contrast) and AC-003 (≥ 40 busy quits) owed by validation.


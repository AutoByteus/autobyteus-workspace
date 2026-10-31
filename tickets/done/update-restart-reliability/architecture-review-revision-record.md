# Architecture Review Revision Record — update-restart-reliability (autobyteus-339)

The latest `design-review-report.md` remains authoritative.

## Revision Index

| Revision ID | Review Round / Trigger | Related Solution Revision IDs | Prior Decision | Current Decision | Affected Finding IDs |
| --- | --- | --- | --- | --- | --- |
| ARCH-REV-001 | Round 1 / initial review of SR-003 | SR-002, SR-003 | N/A | Pass | AR-001, AR-002 (non-blocking) |
| ARCH-REV-002 | Round 2 / review of SR-004 (CRR-002 F-API-001) | SR-002, SR-004 | Pass | Fail (Design Impact) | AR-001 resolved; AR-002 superseded; AR-003 (blocking), AR-004 new |
| ARCH-REV-003 | Round 3 / re-review of SR-005 | SR-004, SR-005 | Fail (Design Impact) | Pass | AR-003, AR-004 resolved |

## Revision Entries

### ARCH-REV-001 — Initial baseline: the close rule and the install rule are sound; Pass

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/update-restart-reliability/tickets/in-progress/update-restart-reliability/design-review-report.md`
- Review round and trigger: Round 1. `/software_engineering_team/solution_designer` sent SR-003 as `Architecture Design Complete` (Medium/High), with user approval of the design `Obtained`.
- Triggering role, report path, and finding IDs: Solution Designer; `architecture-design-handoff.md`; N/A.
- Relevant solution revision IDs: SR-002 (approval), SR-003 (design).
- Prior authoritative decision: N/A.
- Current authoritative decision: Pass.
- Baseline established (code at `11ad232a99` / `a977b2c1bc`):
  - Fastify 5.12.7 cuts connections after `preClose`, then closes the server, then runs `onClose`.
  - There are four `fastify(` constructions, and none uses `forceCloseConnections`.
  - The Agent Tools MCP and credential-proxy servers close after the supervisor.
  - The Docker update stops the server only after download, verify, unpack and self-check.
  - The install path: `prepareForInstall` → memoized stop → `handleError`. `will-quit` passes on `prepared`.
  - The desktop cannot observe tree survivors.

#### Prior Finding Resolution

None (first round).

- New or remaining finding IDs:
  - AR-001 (Low, non-blocking): "confirmed gone" is the server process, not its tree. Align `fu-007-options.md` option A with REQ-002.
  - AR-002 (Low, non-blocking): in-flight handlers now overlap the run cleanup. Record it in Risks, and make AC-002's slow request a state-changing one.
- Non-blocking notes:
  - N-1: a quit during a pending install keeps today's outcome;
  - N-2: the logger is closed before the install;
  - N-3: `closeAllConnections` is guarded by the P-003 test;
  - N-4: U-2 and U-3 (FU-001, FU-002).
- Material classification changes: none (Medium/High).
- Recommended recipient: `/software_engineering_team/implementation_engineer`, with an informational notification to the Solution Designer.
- Remaining risks or uncertainty: AC-002 and AC-003 in validation.

### ARCH-REV-002 — SR-004 grace-drain close: right design; its `preClose` position must be stated

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/update-restart-reliability/tickets/in-progress/update-restart-reliability/design-review-report.md`
- Review round and trigger: Round 2. `/software_engineering_team/solution_designer` sent SR-004, the design revision for CRR-002 F-API-001 (Design Impact): SR-003's `forceCloseConnections` cut in-progress `createAgentRun`s (API-02/02B).
- Triggering role, report path, and finding IDs: Code Reviewer (CRR-002, `code-review-report.md` round 2, F-API-001), via the Solution Designer.
- Relevant solution revision IDs: SR-002 (approval), SR-004 (design and the REQ-001/DEC-002 revision within the direction).
- Prior authoritative decision: Pass (ARCH-REV-001).
- Current authoritative decision: Fail (Design Impact).
- What changed in the review result:
  - Revised D1 is reviewed: `installClientConnectionClose` destroys never-used sockets, drains in-progress requests ≤ 2 s, then calls `closeAllConnections()`.
  - Verified in Fastify source: `preClose` hooks run in registration order.
  - The design's spine order (after the native drain and the WebSocket close) contradicts its install instruction ("right after `fastify({...})`"), which would run the helper first. That leaves the listener open, after the helper ran, for a client's new never-used connection.
  - The only held HTTP stream is closed by its owner first, so an idle quit does not spend the grace.
- **Reviewer's own miss in ARCH-REV-001:** AR-002/P-001 rated the in-flight-handler overlap as low-consequence, because "the run layer closes admission". That guard was taken on trust. `createAgentRun` persists the prepared run before the admission check (`agent-run-service.ts:241-246`), which is exactly F-API-001. A finding that cites a guard must open the guard's code path for each state-changing handler kind. Recorded with design-cases Case 5.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| AR-001 | Open (Low, non-blocking) | Resolved | `2d7f59ef86`; SR-004 | `fu-007-options.md` option A now says "server process is confirmed gone", with a Decision section pointing to REQ-002/AC-004/AC-005/DEC-005 |
| AR-002 | Open (Low, non-blocking) | Superseded (premise wrong; fixed by the design) | CRR-002 F-API-001; SR-004 | In-progress requests now finish within the grace before `onClose` (P-004: 281 ms, response delivered). A cut after 2 s is FU-004 |

- New or remaining finding IDs:
  - **AR-003** (Medium, blocking): install the helper after every other `preClose` hook (studio: after `register(websocket)`, `nativeShutdown.install` and the routes; standalone application: after `register(websocket)`), so its final `closeAllConnections()` directly precedes `server.close()`. State this in the interface, file mapping, examples and guidance. Add a test for a never-used connection opened during an earlier `preClose` hook, and an order assertion.
  - **AR-004** (Low): replace the stale SR-003 sentences (task size, intended change, change scope, the BEH-001 row, the DS-001 narrative, the Dependency Rules naming the removed `server-close-options.ts`, the Risks line, the Guidance).
- Non-blocking notes: N-1, N-2 and N-4 carried; N-5 (future held streams spend the grace); N-6 (cut after the grace, FU-004); N-7 (grace plus native drain within the 10 s bound).
- Material classification changes: none (Medium/High).
- Recommended recipient: `/software_engineering_team/solution_designer`.
- Remaining risks or uncertainty: the exact Chromium behavior in the post-hook window (P-003, `Unclear`). Not needed once the order is fixed.

### ARCH-REV-003 — SR-005: last `preClose` hook and stale text fixed; Pass

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/update-restart-reliability/tickets/in-progress/update-restart-reliability/design-review-report.md`
- Review round and trigger: Round 3. `/software_engineering_team/solution_designer` sent SR-005, the design revision for ARCH-REV-002.
- Triggering role, report path, and finding IDs: Solution Designer; design-spec § "SR-005 Revision"; AR-003, AR-004.
- Relevant solution revision IDs: SR-004 (requirements, unchanged), SR-005 (design).
- Prior authoritative decision: Fail (Design Impact).
- Current authoritative decision: Pass.
- What changed:
  - SR-005 is docs only (head `6fd7e4c2b9`; it changes the design spec and the solution revision record).
  - The changed spec sections were verified against the round-2 Fastify and composition reads.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| AR-003 | Open (Medium, blocking) | Resolved | SR-005 | The design-spec interface says "must be installed after every other `preClose` hook … so its final `closeAllConnections()` directly precedes `server.close()`", and adds "new connection destroyed on arrival" from the hook's start. The file mapping gives per-server install points (studio after `:408` and `:429` and the registrations, before `listen`; standalone after `register(websocket)`; the local servers before `listen`). The examples' good and avoided shapes and the Guidance agree. The tests list (a), an earlier slow hook plus a connection during the grace, and (b), the studio order |
| AR-004 | Open (Low) | Resolved | SR-005 | Task size, Intended Change, Change Scope, the BEH-001 row, the DS-001 narrative, Dependency Rules (`client-connection-close.ts`, Fastify types and Node `http`/`net`), Risks and Guidance replaced. A grep finds `SERVER_CLOSE_OPTIONS` and `forceCloseConnections` only in removal and rejection contexts |

- New or remaining finding IDs: none.
- Non-blocking notes: N-1, N-2, N-4, N-5, N-6 and N-7 carried; N-8 (cosmetic: the DS-001 spine line omits "new arrivals destroyed").
- Material classification changes: none (Medium/High).
- Recommended recipient: `/software_engineering_team/implementation_engineer`, with an informational notification to the Solution Designer.
- Remaining risks or uncertainty: AC-002 and AC-003 in validation.

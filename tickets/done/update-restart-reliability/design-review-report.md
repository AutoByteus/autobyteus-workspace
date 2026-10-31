# Design Review Report — update-restart-reliability (autobyteus-339)

## Review Round Meta

- Upstream Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/update-restart-reliability/tickets/in-progress/update-restart-reliability/requirements-doc.md` (Approved SR-002; REQ-001 and DEC-002 revised within the direction in SR-004, with the user informed; AC-002 tightened; AC-008 added)
- Upstream Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/update-restart-reliability/tickets/in-progress/update-restart-reliability/investigation-notes.md`
- Upstream Solution Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/update-restart-reliability/tickets/in-progress/update-restart-reliability/solution-revision-record.md` (SR-001–SR-005)
- Reviewed Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/update-restart-reliability/tickets/in-progress/update-restart-reliability/design-spec.md` (SR-005; user approval of the design: Obtained)
- Supplemental Task Artifacts Reviewed:
  - `code-review-report.md` round 2 (CRR-002, F-API-001);
  - `evidence/P-004-grace-drain-close.probe.mjs` and `.log`;
  - `fu-007-options.md` (updated);
  - `follow-ups.md` (FU-003, FU-004 added);
  - `docs/design-cases.md` Case 5;
  - `architecture-design-handoff.md` (the SR-004 section).
- Relevant Solution Revision IDs: SR-002 (approval), SR-004 (requirement revision and D1), SR-005 (design revision for ARCH-REV-002)
- Architecture Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/update-restart-reliability/tickets/in-progress/update-restart-reliability/architecture-review-revision-record.md`
- Current Architecture Review Revision ID: `ARCH-REV-003`
- Current Review Round: 3
- Trigger: SR-005, the design revision for ARCH-REV-002 (AR-003, AR-004), from `/software_engineering_team/solution_designer`.
- Prior Review Round Reviewed: ARCH-REV-002 (SR-004, Fail: AR-003 blocking, AR-004 low)
- Latest Authoritative Round: 3
- Current-State Evidence Basis: worktree @ `6fd7e4c2b9`. SR-005 is docs only (`git diff --stat 30c8c4b51f HEAD`: design spec and solution revision record), so the round-2 code basis below still applies. Basis from round 2, at `30c8c4b51f`: The code under review is IR-001 (`ddb03d0d0b`); SR-004's own commits are docs only. Opened at the cited lines:
  - Fastify `5.12.7`:
    - `lib/hooks.js:93-150` (`hookRunnerApplication`): `preClose` hooks run **in registration order**, root first, then children, each awaited through avvio.
    - `fastify.js:385-430`: `closing = true` → `closeRoutes()` (503) → `preClose` → `server.close()` → user `onClose`.
  - `@fastify/websocket` `index.js:228` (`addHook('preClose', …)` at plugin registration).
  - `build-studio-server.ts:403-440`:
    - `fastify({...})` → `nativeShutdown.install(app)` (`preClose`, `native-command-shutdown.ts:8`) → `onClose` → … → `app.register(websocket)` (`:429`).
    - These are the only `preClose` hooks in `src`, besides IR-001's comment.
  - `build-standalone-application-server.ts:18-31` (`onClose`, then `register(websocket)`).
  - Long-lived HTTP streams:
    - the only `reply.hijack()` is `agent-tools-mcp-session-streams.ts:32`; its host closes held streams before closing the local server (`agent-tools-mcp-host.ts:97-102`);
    - the studio MCP gateway's GET answers once and ends (`mcp-gateway-routes.ts:119-123, 183-188`).
  - `agent-run-service.ts:241-246` (`createAgentRun`: prepare, then activate).

## Routing Classification Review

- Task size: `Medium`. Architectural risk: `High`. Agreed and unchanged: the shutdown connection contract of every node server, and the install after an incomplete stop.
- Independent Architecture Review required: `Yes`.
- User approval of the design: `Obtained`, not `Pending`.
- The REQ-001/DEC-002 revision narrows the cut back toward the base build's guarantee within the user's approved solution ("close what holds the shutdown"). It adds no new product behavior, so there is no Requirement Gap.

## Upstream Behavior And Production-Path Basis Confirmation

- Overall Basis Status: `Confirmed`.
- Approved intent (revised REQ-001):
  - never-used and idle connections are closed at once;
  - a request in progress may finish within 2 s, and the rest is cut;
  - exit 0 in normal time.
  - AC-002 now requires no prepared-only and no unacknowledged run. AC-008 is the deterministic grace test.
- Relevant existing behavior, confirmed:
  - the F-API-001 mechanism: `createAgentRun` persists the prepared run before activation, and activation is refused once admission closes;
  - the base build completes in-progress requests before `onClose` (API-03 contrast);
  - P-004 measures both grace paths.
- Scope guardrail: unchanged. FU-004 (createAgentRun atomicity) and FU-003 (stale prepared-run cleanup) are correctly follow-ups: both are pre-existing and reachable outside shutdown.
- Every prospective blocking `Design Impact` finding is traceable to an approved ID: `Yes`. None remain open.
- Statements about existing code the design relies on:
  - The SR-004 section, Interface Boundary Mapping, File Mapping, Removal Plan and Examples are correct and consistent.
  - SR-005: the install point is now "after every other `preClose` hook" in the interface, the file mapping (with the studio's `:408` and `:429`), the examples and the guidance. It matches DS-001's order, as Fastify runs `preClose` hooks in registration order (AR-003 resolved).
  - The stale SR-003 sentences are replaced (AR-004 resolved). A grep finds the old option only in removal and rejection contexts.

| Behavior ID | Kind | Design Alignment | Trigger / Evidence | Target Path / Spine | Status | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | Operational | Pass (revised REQ-001) | Pass (P-002, P-003, P-004; F-API-001 evidence) | Pass: last `preClose` hook, new arrivals destroyed from its start (SR-005) | Confirmed | — |
| BEH-002 | User/system | Pass (unchanged D2) | Pass | Pass | Confirmed | — |
| BEH-003, BEH-004 | Operational | Pass (preserved) | Pass | Pass | Confirmed | — |

## Supplemental Artifact Coherence Verdict

| Artifact | Purpose | Linked | Complete | Consistent | Status | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| `fu-007-options.md` | Pass | Pass | Pass | Pass (now points to REQ-002; "process confirmed gone") | Pass | — (AR-001 resolved) |
| `evidence/P-004-*` | Pass | Pass | Pass. The post-hook window is now covered by the AR-003 (a) test | Pass | Evidence | — |
| `code-review-report.md` CRR-002 | Pass | Pass | Pass | Pass | Pass | — |
| `follow-ups.md` FU-003, FU-004 | Pass | Pass | Pass | Pass | Pass | — |

## Task Design Health Assessment Verdict

| Assessment Area | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Assessment is present for the current task posture | Pass | `Bug Fix` | — |
| Root-cause classification is explicit and evidence-backed | Pass | `Missing Invariant`. The SR-003 premise "closed admission makes a cut mutation clean" is withdrawn on evidence (CRR-002) | — |
| Refactor decision is explicit | Pass | `No` | — |
| Supported by concrete sections | Pass | One shutdown helper replaces the option. Removal is explicit | — |

## Spine Inventory Verdict

| Spine | Readable | Narrative | Facade vs Owner | Naming | One Owner Per Node, In Order | Off-Spine Kept Off | Verdict |
| --- | --- | --- | --- | --- | --- | --- | --- |
| DS-001 Server close | Pass | Pass (SR-005 narrative) | Pass | Pass | Pass (install point matches the spine) | Pass | Pass |
| DS-002 Install after an incomplete stop | Pass | Pass | Pass | Pass | Pass | Pass | Pass |

Round-2 analysis, kept for the record. It is resolved by SR-005's install point: the helper is now the last `preClose` hook, its `closeAllConnections()` directly precedes `server.close()`, and it destroys connections that arrive once it has started. DS-001 as the code would have run with "install right after `fastify({...})`" on the studio server:

1. `closing = true`, `closeRoutes` (503).
2. `preClose`, in this order:
   1. client-connection close: destroy never-used sockets, drain in-progress requests ≤ 2 s, `closeAllConnections()`;
   2. native drain, ≤ 3 s;
   3. WebSocket close.
3. `server.close()`.
4. `onClose` run cleanup.

The listener keeps accepting TCP connections until step 3. Any connection a client opens during steps 2.2 and 2.3 is untouched by the helper, and a never-used one among them holds `server.close()` exactly as in FU-008 (P-003). See P-003 below.

## Boundary Encapsulation Verdict

| Boundary / Owner | Public Entry Clear | Internals Stay Internal | Bypass Controlled | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `installClientConnectionClose(app)` | Pass | Pass | Pass | Pass | It owns socket tracking and the close order. Its position, last `preClose` hook, is a stated caller rule with a studio order test |
| `BaseServerManager.isServerProcessGone()` | Pass | Pass | Pass | Pass | Unchanged |
| `ApplicationShutdown.acceptIncompleteStopForInstall()` | Pass | Pass | Pass | Pass | Unchanged |

## Dependency Direction / Forbidden Shortcut Verdict

| Owner / Boundary | Allowed Clear | Forbidden Explicit | Direction Coherent | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Four servers → `src/shutdown/client-connection-close.ts` | Pass (depends only on Fastify types, Node `http`/`net`) | Pass (`forceCloseConnections` and self-closing are forbidden) | Pass | Pass | — |
| `electronApplication.ts` → query and transition | Pass | Pass | Pass | Pass | — |

## Interface Boundary Verdict

| Interface | Subject | Singular | Identity | Generic Risk | Verdict |
| --- | --- | --- | --- | --- | --- |
| `installClientConnectionClose(app, { graceMs?, timers? })`, `IN_FLIGHT_REQUEST_GRACE_MS = 2_000` | Pass | Pass | Pass | Low | Pass (install last; new arrivals destroyed from its start) |
| `isServerProcessGone()`, `acceptIncompleteStopForInstall()`, `prepareForInstall()` | Pass | Pass | Pass | Low | Pass |

## Existing Capability / Subsystem Reuse Verdict

| Need | Checked | Decision Sound | New Piece Justified | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Close never-used connections, drain in-progress ones | Pass | Pass. Fastify has no "drain then cut" option; `forceCloseConnections` cut handlers (F-API-001) | Pass | Pass | Node's `closeAllConnections()` is the final step, as before |
| Long-lived streams | Pass | Pass. The only held stream (Agent Tools MCP) is closed by its owner before its server closes, so the grace is not spent on an idle quit | N/A | Pass | See N-5 |

## Subsystem / Capability-Area Allocation Verdict

| Area | Allocation Clear | Decision Sound | Supports Spine Owners | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/shutdown` | Pass | Pass | Pass | Pass | Next to `ServerProcessShutdown` |

## Reusable Owned Structures Verdict

| Structure | Extraction Evaluated | Shared File Sound | Ownership Clear | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| One close helper for four servers | Pass | Pass | Pass | Pass | — |

## Shared Structure / Data Model Tightness Verdict

N/A: no shared data structure changes.

- Derived consumers of a changed structure (Principle 11): `N/A`.
- Each domain word keeps one meaning (Principle 15): `Pass`.

## File Responsibility Mapping Verdict

| File | Singular | Matches Owner | Re-Tightened | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `server-close-options.ts` and its test | Pass (Remove) | Pass | N/A | Pass | — |
| `client-connection-close.ts` and its test; studio composition order test | Pass | Pass | N/A | Pass | AR-003 (a) and (b) are listed |
| Four server constructions | Pass | Pass | N/A | Pass | The install point is stated per server |
| Desktop files, docs | Pass | Pass | N/A | Pass | — |

## Subsystem / Folder / File Placement Verdict

| Path | Placement Clear | Folder Matches | Risk | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `src/shutdown/client-connection-close.ts` | Pass | Pass | Low | Pass | — |

## Removal / Decommission Completeness Verdict

| Item | Named | Replacement Clear | Scope Explicit | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `SERVER_CLOSE_OPTIONS`, its four spreads, its test | Pass | Pass | Pass | Pass | No re-export |

## Legacy / Backward-Compatibility Verdict

| Area | Wrapper / Dual Path | Clean Cut Explicit | Verdict | Notes |
| --- | --- | --- | --- | --- |
| `forceCloseConnections` | No | Pass (forbidden in the encapsulation map) | Pass | — |

## Persisted-Data Transition Verdict (When Applicable)

| Area | Decision | Evidence | Proportionate | Migration Safety | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| Run history | `Not Affected` | Pass | Pass | N/A | Pass | Prepared-only runs from a cut after the grace are FU-004 (pre-existing) |

## Change / Refactor Safety Verdict

| Area | Realistic | Seams Explicit | Cleanup Explicit | Verdict |
| --- | --- | --- | --- | --- |
| D1 (SR-004/SR-005): remove the option, add the helper, install it last | Pass | Pass | Pass | Pass |
| D2, docs, validation (AC-002 API-02 shape with base contrast; AC-003 ≥ 40) | Pass | Pass | Pass | Pass |

## Example Adequacy Verdict

| Topic | Needed | Present | Avoided Shape | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Close rule | Yes | Pass | Pass | Pass | The good shape installs it after `nativeShutdown.install`, `register(websocket)` and the routes. The avoided shape names the first-position bug |
| Install | Yes | Pass | Pass | Pass | — |

## Material Premise Validation (Only When Needed)

### `P-003`: a client opens a connection after the client-connection hook has run, but before `server.close()` (AR-003)

- Related requirement: REQ-001 ("a client connection that has not sent a request is closed at once"), AC-003 (0 stalls in ≥ 40 busy quits), AC-008.
- Behavior ID: BEH-001.
- Initiating basis kind: `System`. A browser client of the node keeps running while the node stops: the desktop window stays open until the quit's stop settles (`ApplicationShutdown.quit` defers `will-quit`), and a browser tab on a Docker node. The investigation shows that this client opens connections it never uses (P-002 d3 iter-16, 2/78).
- Forward path:
  1. With the helper registered first, its `preClose` finishes (with `closeAllConnections()`), and then the native drain runs. That is up to 3 s with busy native commands, and the window during which a client can open a new connection depends on it.
  2. The WebSocket close follows. It ends the window's WebSockets and typically triggers the client's reconnect attempts, which open new connections.
  3. Only then does Fastify call `server.close()`, which stops the listener.
  4. A never-used connection accepted in steps 1–2 is not seen by the helper, and `server.close()` waits for it (P-003). This is the FU-008 stall again.
- With the helper registered **last**, its final `closeAllConnections()` is followed directly by `server.close()`. No awaited I/O lies between them, so the window closes. Connections opened during the grace are closed by `closeAllConnections()`, which also closes never-used ones (SR-003's P-003 result).
- Reachability: `Unclear` for the exact Chromium behavior in that window. The window itself is real, and its consequence is the bug this ticket fixes.
- Review consequence: the finding stands without this premise, because the design's spine and its install instruction disagree. The premise only shows which of the two orders to pick.

ARCH-REV-001's premises:

- P-001 (an in-flight handler overlaps the cleanup) was **wrongly judged low-consequence** in ARCH-REV-001. Its guard ("admission closure") did not hold for `createAgentRun`, which persists before the admission check (CRR-002). It is now handled by the grace: in-progress requests finish before `onClose`. A cut after the grace stays FU-004.
- P-002 (`fu-007-options.md` wording) is resolved.

## Unresolved Approved-Behavior Or Current-State Gaps

None.

## Review Decision

`Pass`. The behavior basis is confirmed, and both ARCH-REV-002 findings are resolved in the canonical design spec (SR-005). No in-scope machinery depends on an unsupported premise.

## Findings

None open. Resolved in this round (details in `architecture-review-revision-record.md`, ARCH-REV-003):

- **AR-003:** the helper is each server's last `preClose` hook, with install points named per server. It destroys new connections from its start. Tests (a) and (b) are listed.
- **AR-004:** the stale SR-003 text is replaced.

## Classification

N/A (Pass).

## Recommended Recipient

`/software_engineering_team/implementation_engineer` (primary). Informational notification to `/software_engineering_team/solution_designer`.

## Residual Risks

- **N-1 (carried):** a quit pressed during a pending install keeps today's outcome.
- **N-2 (carried):** the logger is closed before the install.
- **N-4 (carried):** U-2 and U-3 (FU-001, FU-002).
- **N-5:** a future held HTTP stream would consume the full 2 s grace unless its owner closes it before close, as `AgentToolsMcpHost` does.
- **N-6:** a request outlasting the grace is cut. A `createAgentRun` cut then can still leave a prepared-only run (FU-004, with FU-003).
- **N-7:** the grace and the native drain consume part of 284's 10 s bound before the run cleanup: worst case about 2 + 3 s, normally 0.
- **N-8 (new, cosmetic):** the DS-001 primary spine line does not mention "new connections destroyed from the hook's start". The narrative and the interface do. A client opening a fresh connection during the grace is refused rather than answered 503, which is consistent with DEC-002.
- **Validation still owes:** AC-002 (the API-02 shape with base contrast) and AC-003 (≥ 40 desktop busy quits, with counts).

## Latest Authoritative Result

- Review Decision: `Pass`
- Material-Premise Gate: `Pass`. P-003 is no longer material: the install point removes the window.
- Classification: task_size `Medium`, architectural_risk `High` (agreed).
- Notes:
  - Implement SR-005 on top of IR-001 (`ddb03d0d0b`): remove `SERVER_CLOSE_OPTIONS` and its test; add `client-connection-close.ts` and its tests; install it last in each of the four servers.
  - D2 is unchanged from IR-001.

# Code Review Report — busy-quit-shutdown-orphan (autobyteus-284)

All ticket paths are under `/Users/normy/autobyteus_org/autobyteus-worktrees/busy-quit-shutdown-orphan/tickets/in-progress/busy-quit-shutdown-orphan/`.

## Review Round Meta

> **Latest round: 3, Implementation Review, Targeted Delta Review (CRR-003), `Pass`.** It covers IR-002, the fix for CR-001.
> - Rounds 1 and 2 are kept below: the implementation review (CRR-001) and the failure-origin review (CRR-002: CR-001 and FU-008).
> - § Round 3 Delta Review and the updated Latest Authoritative Result supersede the round 2 decision.

## Round 3 Delta Review (CRR-003)

- Trigger: implementation engineer, IR-002 (code `83a73f24d7`, docs and evidence `b128df38dd`).
- Review Scope: `Targeted Delta Review`.
  - Evidence: `git diff bf2857ca29 83a73f24d7` touches only `src/utils/process-tree.ts`, `tests/unit/utils/process-tree.test.ts` and `tests/unit/shutdown/server-process-tree-sweep.test.ts` (outside the ticket folder, besides the API/E2E durable tests already in `55ddc71839`).
  - This stays inside CR-001's file and behavior. There is no change to the data-flow spine, the shared interfaces or the data shapes: `readProcessTable(): ProcessRow[]` keeps its signature and its throw-on-unreadable contract.
- **CR-001: Resolved.**
  - `readProcessTable` now uses `spawnSync` with the same arguments, the same 2 s timeout and the same stdio.
  - It throws on `result.error`: ENOENT, ETIMEDOUT when the timeout kills `ps`, and ENOBUFS. It also throws on a non-zero or signalled exit (`status !== 0`). That is the same contract `execFileSync` had, so the sweep's `unconfirmed` path and AGY's error path behave as before.
  - It drops the row whose pid is `result.pid`, the reader itself. The fix lives in the one owner of table reading (Principle 11: one owner derives the fact). AGY and the desktop copy are unchanged, with no new branches, which matches CR-001's required action.
- Tests:
  - A reader row that is the server's child in the server's group is dropped and not selected.
  - A non-zero exit throws.
  - An idle server whose only child is the reader gives `confirmed, 0`, no signal and no log line, through the default reader.
  - The 4 new or updated cases fail on IR-001's reader (`IMP-10-fail-before-ir001.log`: `Tests  4 failed | 17 passed`).
- Checks: IMP-10 (63 passed), IMP-11 (typecheck), and IMP-12, the gated real-process E2E, where an idle SIGTERM exit gives `shutdown.sweepLines after fix: []`. I reran none of them: they ran on `83a73f24d7`, and nothing they exercise changed afterwards. The IMP-01 to IMP-09 rows for the code this round does not touch still apply.
- Carried forward unchanged from round 1: the structural checks, the size audit (`process-tree.ts` grows from 80 to about 89 effective lines, still Pass), legacy and docs. The scorecard is unchanged from round 1 (9.4 / 10). Category 8, Runtime Correctness, goes back from round 2's 9.0 to 9.3.
- New findings: None. F-API-002 stays follow-up FU-008, not part of this round. Its leading candidate since round 2, `RootOperationGate.closeAndDrain()` running before the member fence in `AgentOrgRun.terminateOnce`, is not yet recorded in FU-008 (it is Read-only and unproven). The Solution Designer may add it when sending FU-008.

- Review Entry Point (round 2): `API/E2E Failure-Origin Review`; round 1 was `Implementation Review`
- Requirements Doc Reviewed As Context: `requirements-doc.md` (Approved, SR-002 + SR-007)
- Investigation Notes Reviewed As Context: `investigation-notes.md` (cited entries E-A2, E-A3, E-A8, E-A15, E-A25 to E-A29)
- Solution Revision Record Reviewed As Context: `solution-revision-record.md` (SR-001 to SR-008)
- Design Spec Reviewed As Context: `design-spec.md` (SR-008)
- Supplemental Task Artifacts Reviewed As Context: `follow-ups.md` (FU-001 to FU-007); `evidence/IMP-01` to `IMP-09`
- Relevant Solution Revision IDs: SR-008 (design), SR-002, SR-007 (approval)
- Design Review Report Reviewed As Context: `design-review-report.md` (round 3, Pass; its ARCH-REV-003 edits are uncommitted in the worktree and owned by the architecture reviewer)
- Architecture Review Revision Record Reviewed As Context: `architecture-review-revision-record.md`
- Relevant Architecture Review Revision IDs: ARCH-REV-003 (N-9 applied)
- Implementation Handoff Reviewed As Context: `implementation-handoff.md`
- Implementation Revision Record Reviewed As Context: `implementation-revision-record.md`
- Relevant Implementation Revision IDs: IR-001
- Code Review Revision Record: `code-review-revision-record.md`
- Current Code Review Revision ID: `CRR-002`
- Current Review Round: `2`
- Review Scope: `N/A` (failure-origin round)
- Trigger: API/E2E engineer, API-REV-001 `Fail`, with F-API-001 and F-API-002.
  - Code `bf2857ca29`, validated from a clean checkout of `b520b51c9e`.
  - Durable tests `55ddc71839`; reports `2783cc1609`.
- Prior Review Round Reviewed: round 1 (CRR-001, `Pass`)
- Latest Authoritative Round: 2
- Coverage Investigation Reviewed: `api-e2e-coverage-investigation.md`
- Execution Coverage Report Reviewed: `api-e2e-execution-coverage-report.md`
- API/E2E Revision Record Reviewed: `api-e2e-revision-record.md`
- Relevant API/E2E Revision IDs: API-REV-001
- Project testing guideline: `TESTING.md` (Rule 9, "find its cause first"; see F-API-002 below)
- Delivery Revision Record: N/A
- Failing Scenario IDs:
  - F-API-001: every POSIX server exit (API-02, API-04-05-06 idle shutdown, API-10, every desktop session);
  - F-API-002: API-11R1, 1 of 15 busy shutdowns.
- Exact Failing Commands / Execution Mode:
  - F-API-001: any server SIGTERM, for example `RUN_BUSY_STOP_NOW_E2E=1 pnpm -C autobyteus-server-ts exec vitest run tests/e2e/shutdown/busy-run-stop-now.e2e.test.ts --no-watch`;
  - F-API-002: `node evidence/API-desktop-probe.mjs busy-quit evidence` from a clean checkout (isolated packaged desktop).
- Failure Evidence Paths (`evidence/`):
  - F-API-001: `API-02-server-fixture-clean.json` (`sweepLines`), `API-04-05-06-result.json` (`idleShutdown.shutdownLog`), `API-10-app-0-server.log`;
  - F-API-002: `API-11R1-app-0-server.log` (lines 261–294), `API-11R1-result.json`, `API-11D-clean-stage-timeline.log`, `API-11-result.json`.

## Routing Classification Review

- Task size: `Medium`
- Architectural risk: `High`
- Selected route: `Implementation Review`
- Independent source review required by the classification: `Yes`
- Classification evidence or correction required: Confirmed. The change touches two packages and stays inside existing owners (`AgentRunManager`, `ServerProcessShutdown`, `BaseServerManager`), so `Medium` holds. The risk stays `High` for three reasons: stop semantics change for every standalone and application run, processes are signalled at every POSIX server exit and on the desktop force path, and the exit-code/IPC result now also depends on the sweep.

## Review Scope

- Changed implementation and behavior reviewed: D1 (`terminateAgentRun` fences first; `stopAllAgentRuns` fences all runs at once, then finishes them in order), D2 (10 s bound in `ServerProcessShutdown`, the new process-tree sweep, exit code and IPC result), D3 (POSIX `forceStop` tree sweep, the desktop selection copy), the AGY helper move, tests and docs.
- Files / areas reviewed: `git diff origin/personal...bf2857ca29`:
  - server: `agent-run-manager.ts`, `server-process-shutdown.ts`, `server-process-tree-sweep.ts`, `utils/process-tree.ts`, `agy-stream-process.ts`, the removal of `agy-background-process-groups.ts`;
  - desktop: `baseServerManager.ts`, `serverProcessTree.ts`;
  - all changed tests and the three docs.
- Context read, unchanged:
  - `agent-run-termination.ts` (`fenceForRootShutdown`, `prepareTerminationOnce`);
  - `agent-run-root-shutdown-fence.ts` (acceptance: quiescent, or a bounded wait after a rejected interrupt);
  - `agent-run-input-admission-state.ts` `fenceForRootShutdown`;
  - the callers of `terminateAgentRun` and `stopAllAgentRuns`: `agent-run-service.ts:143`, `standalone-agent-run-lifecycle-service.ts:112`, `application-orchestration-host-service.ts:340`, `application-execution-scope.ts:48`, `general-process-run-supervisor.ts:486`, `application-execution-shutdown-coordinator.ts:30`;
  - `managedBackendStop.ts`, and `windowsServerManager.ts:66`, which overrides `forceStop`;
  - `server-runtime.ts:43`, the only construction site, which uses the defaults.
- Explicit exclusions: the live and desktop journeys (design step 6), which belong to API/E2E. I did not rerun any checks: IMP-01 to IMP-09 ran on `bf2857ca29`, and nothing they exercise has changed since.

## Upstream Behavior And Production-Path Basis Confirmation

- Approved requirements basis understood: REQ-001 to REQ-005; DEC-001 (cancel queued input), DEC-002 (10 s), DEC-005 (application terminate interrupts), DEC-006 (AC-009, AC-010), DEC-007 (20 s desktop window).
- Design-spec behavior map verified against the implementation: Yes (DS-001, DS-001b, DS-002, DS-003).
- Design review report and round confirmed: round 3, `Pass` (ARCH-REV-003).
- Behavior-basis status: `Confirmed`
- Changed or newly discovered behavior: None. The 0.5 s post-SIGKILL confirmation is inside the sweep's own contract ("`unconfirmed` when a recorded target is still alive"); see CR-C1.
- Remaining material ambiguity: None.

| Behavior ID | Current Status | Current Implementation Path And Lifecycle Evidence | Contradicting / New Evidence |
| --- | --- | --- | --- |
| BEH-001 (user) | Confirmed | GraphQL `agent-run.ts:184` → `AgentRunService.terminateAgentRun` (`:143`) / `StandaloneAgentRunLifecycleService.terminateHost` (`:112`) → `AgentRunManager.terminateAgentRun` `:289` fence → `prepareAgentRunTermination` → `commit().finish()`. The fence (`agent-run-termination.ts:92-108`) cancels committed and queued input (`agent-run-input-admission-state.ts:385`) and interrupts the active turn once (`agent-run-root-shutdown-fence.ts` `evaluate`). An idle run is accepted at once (quiescent snapshot), so an idle Terminate is unchanged. A `false` result maps to the existing not-found/rejected results at both callers. | — |
| BEH-001 (app, DEC-005) | Confirmed | `application-execution-scope.ts:48` and `application-orchestration-host-service.ts:340` → `AgentRunService.terminateAgentRun` → same entry point. No extra code. | — |
| BEH-002 | Confirmed | `server-runtime.ts:43` `new ServerProcessShutdown()` → `request()`. Order: startup barrier → `cleanupWithinBound` (10 s timer started after `startupSettled`) → always `sweep()` → `transportReady` → IPC `complete`/`failed` → `exit`. Inside `app.close`, `stopAllAgentRuns` (`agent-run-manager.ts:315`) fences every run in the snapshot with `Promise.allSettled`, then finishes them in order. Each rejected or not-accepted fence goes into `errors`, so `AggregateError` → cleanup rejects → exit 1. | — |
| BEH-003 | Confirmed | `terminateServerProcessTree` records its targets once: descendants in the server's group, by pid, plus groups led by a descendant, by −pgid. Then SIGTERM → ≤ 1.5 s → SIGKILL of the recorded survivors → ≤ 0.5 s → `confirmed`/`unconfirmed`. On win32 it returns `not-applicable` before reading anything. On the desktop, `forceStop` takes an async snapshot → SIGTERMs the targets → SIGKILLs the server → waits ≤ 1.5 s → SIGKILLs the survivors. | — |
| BEH-004 | Confirmed | `stopManagedBackend` is unchanged (20 s window, 2 s confirmation). `forceStop` changes on POSIX only, and `WindowsServerManager` keeps its override. | — |
| BEH-005, BEH-007 | Confirmed (preserved) | `AgentRunManager` has no history dependency. `terminatedAt` is still written only by the Terminate callers (`agent-run-service.ts:148`, `standalone-agent-run-lifecycle-service.ts:115`) after a `true` result. A unit test asserts that `stopAllAgentRuns` never calls `recordRunTerminated`. | — |

## Supported Product Scenario And Reachability Gate (Mandatory)

| Scenario ID | Related IDs | Kind | Actor / Initiator | Goal / Event | Entry Surface | Shape | Forward Path / Lifecycle | Expected Outcome | Independent Evidence | Validity | Review Use |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SCN-001 | BEH-001, REQ-001, AC-001, AC-008 | User / Contract | User; application SDK or orchestration | Stop a working run now | Terminate in the UI or history; SDK `terminateAgentRun` | Normal | DS-001 / DS-001b above | Turn interrupted, run inactive | E8, E-A8; requirements | Supported Normal Scenario | Use |
| SCN-002 | BEH-002, BEH-003, REQ-002, REQ-003, AC-002, AC-003, AC-010 | Operational | App quit, OS or Docker SIGTERM, Windows IPC | Stop the server | SIGTERM, SIGINT, IPC request | Normal; AC-003 (wedged runtime) is an Explicit Edge | DS-002 above | Exit ≤ 10 s + sweep, nothing left | E1–E9, E-A25 | Supported Normal Scenario (AC-003: Supported Explicit Edge Scenario) | Use |
| SCN-003 | BEH-004, REQ-004, AC-004, AC-011 | User | Desktop user | Quit while an agent works | Cmd+Q, menu Quit, SIGTERM to the app | Normal; wedged server = Explicit Edge (AC-011) | DS-003 above | No server or descendants survive | E6, E-A27, E-A28 | Supported Normal Scenario (AC-011: Supported Explicit Edge Scenario) | Use |
| SCN-004 | BEH-005, BEH-007 | User | User | Resume after a quit | Relaunch | Normal (preserved) | No history writes on shutdown | Runs resumable | T-08c, E-A15 | Supported Normal Scenario | Use |

### Candidate Finding And Mechanism Gate

| Candidate ID | Observation Or Mechanism | Scenario / Contract ID | Independent Trigger | Forward Path / Lifecycle / Consequence | Evidence | Disposition | Scope | Reason / Proportionate Response |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| CR-C1 | 0.5 s confirmation poll after SIGKILL in the server sweep (implementer point 1) | SCN-002; design "report `unconfirmed` when … a recorded target is still alive" | Busy shutdown where a runtime CLI that is a direct child of the server ignores SIGTERM | The CLI is a direct child of the server, so after SIGKILL it stays a zombie until libuv reaps it on SIGCHLD, and `kill(pid, 0)` keeps succeeding until then. Without the poll, a kill that worked would read as `unconfirmed`, giving exit 1 / IPC `failed` and a blocked update (N-5). | `server-process-tree-sweep.ts` `waitForExit(survivors, KILL_CONFIRMATION_MS)`; worst case ≈ 14.25 s, inside the 20 s window | Reject (as a finding) | — | The poll is correct and proportionate. It serves the sweep's approved contract, sits only in the sweep, and keeps the desktop margin. No action. The design's FU-004 arithmetic (13.75 s) moves to ≈ 14.25 s; the FU-004 suggestion of 20 s still covers it. |
| CR-C2 | A sweep that throws is treated as `unconfirmed` (implementer point 2) | SCN-002; REQ-002 "the server exits" | Contract: the exit must never be skipped | Without the catch, an unexpected throw would skip `send` and `exit`, and the server would stay alive until the desktop force step. | `server-process-shutdown.ts` `.catch(... 'unconfirmed')`; test "exits 1 rather than hanging when the sweep itself throws" | Reject (as a finding) | — | A three-line fail-safe that maps the throw to the existing "not confirmed" result, which is honest and not a compatibility fallback. No action. |
| CR-C3 | AGY aggregate error text changed (implementer point 3) | Engineering contract (callers matching on text) | — | `grep "process-group signal failed"` finds only the producer and its own test | Code search | Reject | — | Nothing depends on the text. No action. |
| CR-C4 | `stopAllAgentRuns` waits for all fences before it finishes any run. A run whose interrupt is accepted but whose turn never ends therefore keeps the idle runs from a graceful `backend.terminate` too. | SCN-002 (AC-003, Explicit Edge) | A runtime that accepts the interrupt but never ends its turn | The 10 s bound expires → the sweep SIGTERMs every CLI (Claude and Codex clean their trees on SIGTERM, E3/E9) → exit 1. No history is written either way (BEH-007), and conversations are already persisted. | Design § Concrete Examples "Shutdown fence" prescribes this shape; DS-002 | Reject | — | This is the shape the design chose, and the outcome stays inside REQ-002/REQ-003, with no supported consequence beyond the expected exit 1. U-A1 measures the busy case. |
| CR-C5 | Desktop `forceStop`: if `ps` fails right at its 2 s timeout, the server is SIGKILLed with no time left in the 2 s confirmation, so `waitForChildExit` gets a non-positive timeout and reports "Backend exit not confirmed" | SCN-003 (AC-011) | `ps` stalls for 2 s on the desktop | `stopManagedBackend` throws `ShutdownIncompleteError` on every forced path anyway, and the server has already been SIGKILLed. The only difference is the diagnostic text and that `stopped` may not be emitted before `app.exit(1)`. | `managedBackendStop.ts` force block; `baseServerManager.ts` `forceStop` | Reject | — | The trigger has no evidence (U-A3 observes the `ps` duration), and the consequence is diagnostic only: the quit outcome is the same. Not a finding. Noted under Residual Risks for U-A3. |
| CR-C6 | The desktop `serverProcessTree.ts` duplicates the server selection | Design § Key Tradeoffs (Electron main cannot import server code); FU-005 | — | About 40 lines of selection plus small signal and poll helpers; tested on both sides | Design; `serverProcessTree.spec.ts`; `process-tree.test.ts` | Reject | — | Approved by the design and tracked in FU-005. |
| CR-C7 | The server sweep reads the table with a synchronous `execFileSync` (≤ 2 s) | Design § Guidance For Implementation (keep the sync reader; FU-005) | — | It blocks the event loop at most 2 s after the bounded cleanup, inside the exit budget | `utils/process-tree.ts` `readProcessTable` | Reject | — | Approved by the design; the handoff states the assumption. |

### Round 2 candidates (failure-origin)

| Candidate ID | Observation Or Mechanism | Scenario / Contract ID | Independent Trigger | Forward Path / Lifecycle / Consequence | Evidence | Disposition | Scope, if promoted | Reason / Proportionate Response |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| CR-C8 (F-API-001) | The server sweep selects its own `ps` reader as a target | SCN-002 (every POSIX server exit); design § Ownership Boundaries ("targets only descendants of its root pid, recorded before signalling"), § Off-Spine Concerns ("log … target counts when non-zero") | Any server SIGTERM, idle or busy | `terminateServerProcessTree` → `readProcessTable()` = `execFileSync('ps', …)`. The `ps` child is a child of `process.pid` in the server's group and lists itself. `selectDescendantPidsInGroup(rows, process.pid, rootPgid)` therefore selects it. `spawnSync` has already reaped it, so the sweep SIGTERMs a free pid (ESRCH in practice, with a pid-reuse window), and on every exit it logs that one process "still running". The diagnostic contract fails and the result inflates `targets`. Outcome and exit code are unaffected. | **Reproduced** by API/E2E on every exit, idle exits included (`API-02-server-fixture-clean.json` `sweepLines`, `API-10-app-0-server.log`; in API-11D every exit logs "1 process(es)"). **Read**: `utils/process-tree.ts:21-23`, `server-process-tree-sweep.ts` target selection. Not affected: AGY (its root is AGY's pid, and the reader is the server's child); the desktop copy (its reader is Electron's child, and the root is the server). | Promote | This ticket | CR-001, a `Local Fix` for implementation. Proportionate fix: in the shared reader, drop the reader's own row (for example `spawnSync`, then filter `row.pid !== result.pid`), so every caller gets a table without the reader. Add a unit case with the reader's row in the table. |
| CR-C9 (F-API-002) | One 10 s stall of the graceful cleanup in a busy desktop quit (Org + Team + standalone roots), contained by the bound and the sweep | SCN-002 / SCN-003 (AC-002, AC-004); requirements § Out Of Scope ("Changing how root-hosted children (Team, Org, collaborators) are fenced and interrupted") | Busy desktop user quit (API-11R1) | Order in the clean timeline (`API-11D-clean-stage-timeline.log`): native drain (bounded at 3 s) → application lifecycle stop (an empty application scope here, ~1 ms) → `stopAllAgentOrgRuns` (~0.8 s: the Org's Claude member is fenced and released) → Team → standalone roots → `stopAllAgentRuns`. In R1 nothing after the Org stage happened: neither Codex thread was released and the standalone Claude CLI was not released. At the 10 s sweep, three CLIs (one Codex app-server and two Claude CLIs, plus the `ps` reader of CR-C8 = "4 process(es)") and all four tool groups were still alive (`API-11R1-result.json` `quit.tools`). The Org's Claude CLI then exited 143 on the sweep's SIGTERM. A Claude interrupt normally ends its tool (E5), and the CLI ends within 1 s of SIGTERM (API-08). So within 10 s the Org stage neither interrupted its Claude member's tool effectively nor reached its release. No "root shutdown interrupt rejected" warning was logged, so no interrupt was rejected. Consequence: exit 1 at 10.76 s, `app.exit(1)`; an update install would not start (N-5/FU-007). Containment held: 0 survivors, one server on relaunch, all 4 roots continued. | **Read**: R1 server log lines 261–294 against the clean stage timeline. Only the Org stage can block for 10 s: the native drain is bounded at 3 s and the application scope was empty. `git diff origin/personal...bf2857ca29` touches nothing in `agent-org-execution`, `agent-collaboration`, `agent-team-execution`, `agent-execution/domain` or `runtime-management`. **Not reproduced** in 12 repeats (API-11, 11B, 11C, 11D ×4 instrumented, 06R ×4). The root cause inside the Org stage (the fence never running, for example behind the run's dispatch queue or the member's readiness wait; an interrupt accepted with no effect; or the prepare quiescence wait) is **not established**. | Promote | Follow-up (FU-008) | It is outside this ticket's changed code and inside the Scope Guardrail's Out Of Scope root-child fencing. The ticket's own guarantee (REQ-002/REQ-003: bound, force, exit, no leftovers) did its job and every AC was proven. On the base build the same stall would be hidden inside the unbounded wait. Recorded with its narrowed location and reproduction material, not closed as flaky (see the TESTING Rule 9 note). Reclassify if a reproduction places the stall in this ticket's code, for example the application-scope `stopAllAgentRuns` or the bound. |

**TESTING.md Rule 9 note:** Rule 9 says never to close a failure as "pre-existing" or "flaky" without its cause. F-API-002 is not closed. It is recorded as its own item (FU-008), with the cause narrowed so far (the stage, the untouched code, the observed process state) and the reproduction for the owner of the root-shutdown code. That is Rule 9's third case ("a product defect not caused by your change and too large for the current work"). Its root cause is still open. This follows the skill's Ticket Scope rule, which goes beyond Rule 9's wording, and I record that here.

## Structural / Design Checks

| Check | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Task design health assessment is present, evidence-backed, and preserved | Pass | Each Missing Invariant is enforced in its own owner. The small refactor (the AGY selector moved to `src/utils`) was done with no shim. | None |
| Implementation matches behavior-defining supplemental artifacts | Pass | None are behavior-defining. Each AC maps to code (behavior table above). | None |
| Data-flow spine inventory clarity and preservation | Pass | DS-001, DS-001b, DS-002 and DS-003 match the code order, including "nothing interrupts before `request()` starts cleanup", so autobyteus-285 stays possible. | None |
| Ownership boundary preservation and clarity | Pass | No caller fences on its own; `ServerProcessShutdown` alone decides the exit code; the sweep returns an outcome and holds no policy; `forceStop` lives in `BaseServerManager`. | None |
| Off-spine concern clarity | Pass | Logging is attached to the sweep, the shutdown owner and `forceStop`. | None |
| Existing capability/subsystem reuse | Pass | Reuses the root-shutdown fence, `ServerProcessShutdown` and `stopManagedBackend`; the AGY selector is generalized, not copied, on the server side. | None |
| Reusable owned structures | Pass | `ProcessRow` is exported once on the server; the desktop copy is justified (CR-C6). | None |
| Shared-structure/data-model tightness | Pass | `ProcessTreeSweepResult` is a three-variant union, and `targets` and `reason` appear only where they mean something. | None |
| Repeated coordination ownership | Pass | The stop-now policy lives in one place, the manager's two entry points. | None |
| Empty indirection | Pass | The private `listAgyBackgroundProcessGroups` owns AGY's exclusion policy, so it is not a pass-through. | None |
| Separation of concerns / file responsibility | Pass | `process-tree.ts` holds primitives, `server-process-tree-sweep.ts` one sweep, `server-process-shutdown.ts` the bound and exit. | None |
| Ownership-driven dependency | Pass | `server-runtime → shutdown → sweep → utils/process-tree`, and `agy-stream-process → utils/process-tree`. `utils` imports only Node. | None |
| Authoritative Boundary Rule | Pass | Callers depend only on `AgentRunManager` and do not also reach `AgentRun` fences; `BaseServerManager` alone uses `serverProcessTree.ts`. | None |
| File placement | Pass | `src/shutdown`, `src/utils` and `electron/server` all match their owners. | None |
| Flat-vs-over-split layout | Pass | Two new small files on each side; no new folders. | None |
| Interface/API boundary clarity | Pass | One constructor `(runtime, { cleanupTimeoutMs, sweep, timers })` (N-9). `terminateServerProcessTree(overrides)` takes explicit deps. The selectors take an explicit root pid and pgid. | None |
| Naming quality / one vocabulary | Pass | The names match the design's Terminology ("process-tree sweep", "fence", "stop-now"). There are no version numbers (DESIGN rule 8), and the error text was generalized together with the move. | None |
| No unjustified duplication | Pass | The only duplication is the desktop copy (CR-C6). | None |
| Patch-on-patch complexity control | Pass | Small additive deltas in the existing owners. | None |
| Dead code removed in touched files | Pass | `selectAgyBackgroundProcessGroups` and the old file are removed. Nothing references `agy-background-process-groups` outside the tickets (code search). | None |
| Test scenarios and assertions requirement-aligned | Pass | D1: fence order, interrupt-then-finish, not accepted → `false`, concurrent fence, failure isolation, no history. D2: 10 s bound edge (9 999 / 1 ms), bound after the barrier, `unconfirmed`, throw, win32. Sweep: targets, exclusions, re-parenting, ESRCH/EPERM, unreadable table. AC-011 runs real processes and fails on base. | None |
| Test fixtures/helpers reusable and coherent | Pass | The `clean()` sweep fake, the sweep `harness`, and `tableWithAgyGroups`. | None |
| No stale or compatibility-only tests | Pass | The old AGY test moved and was generalized; the old mock path is gone. | None |
| API/E2E readiness | Pass | Deterministic coverage is in place. The handoff lists the live and desktop scenarios, the CLI-version recording and the "Server process-tree sweep:" log marker. | None |

## Source File Size And Structure Audit

| Source File | Before (base) | After | `>500` | `>220` Delta | SoC / Ownership | Placement | Classification | Required Action |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/agent-execution/services/agent-run-manager.ts` | 374 | 384 | Pass | Pass (+10) | Pass | Pass | Pass | None |
| `autobyteus-server-ts/src/shutdown/server-process-shutdown.ts` | 59 | 100 | Pass | Pass (+41) | Pass | Pass | Pass | None |
| `autobyteus-server-ts/src/shutdown/server-process-tree-sweep.ts` | new | 95 | Pass | Pass | Pass | Pass | Pass | None |
| `autobyteus-server-ts/src/utils/process-tree.ts` (moved from AGY, 76) | 76 | 80 | Pass | Pass | Pass | Pass | Pass | None |
| `autobyteus-server-ts/src/agent-execution/backends/antigravity/stream/agy-stream-process.ts` | 144 | 158 | Pass | Pass (+14) | Pass | Pass | Pass | None |
| `autobyteus-web/electron/server/baseServerManager.ts` | 414 | 433 | Pass | Pass (+19) | Pass | Pass | Pass | None |
| `autobyteus-web/electron/server/serverProcessTree.ts` | new | 76 | Pass | Pass | Pass | Pass | Pass | None |

Effective non-empty line counts, from `git show <rev>:<file> | grep -cv '^\s*$'`.

## Legacy / Backward-Compatibility Verdict

| Check | Result | Notes |
| --- | --- | --- |
| No backward-compatibility mechanisms in changed scope | Pass | No re-export shim, flag or setting. |
| No legacy old-behavior retention in changed scope | Pass | The unbounded `await cleanupOnce()` and the single-PID POSIX force are replaced. |
| Dead code removed in the touched files and modules | Pass | See the structural checks. |
| Approved persisted-data transition decision followed | Pass | `Not Affected`; no stored structure changes. |
| No version-specific dual reads/writes or old-shape fallback | Pass | — |
| Transition mechanics match the design | Pass | N/A (no migration). |

## Dead / Obsolete / Legacy Items Requiring Removal

None.

## Docs-Impact Verdict

- Docs impact: `Yes`, and done in this change.
- Why: stop-now semantics, the bounded shutdown and the desktop force path change documented behavior.
- Files updated:
  - `agent_execution.md`: the Known-limit paragraph is replaced, and the N-6 sentence is present;
  - `antigravity_cli_runtime.md`: the moved helper is named;
  - `electron_packaging.md`: the POSIX tree force and the server's 10 s bound.

  The docs match the code. The docs-sync owner may still add the 0.5 s kill confirmation to the sweep description in `agent_execution.md` (optional).

## Additional Material Premise Validation

### Upstream Design-Review Material-Premise Decisions

None reclassified. ARCH-REV-003 decisions (AR-004 to AR-006, N-3, N-5 to N-9) hold in the code: win32 returns `not-applicable` and affects the exit code only through the cleanup and the bound; the sweep is injected in every shutdown test and mocked in the gate test; the desktop keeps the 2 s confirmation and reads `ps` asynchronously; there is one constructor.

No new material premises: CR-C1 to CR-C7 are recorded in the gate above.

## Review Scorecard (Mandatory)

- Overall score: 9.4 / 10 (simple average; for trend only)

| Priority | Category | Score | Why This Score | What Is Weak / Holding It Down | What Should Improve |
| --- | --- | --- | --- | --- | --- |
| 1 | Data-Flow Spine Inventory and Clarity | 9.5 | All four spines are implemented in the designed order; the order of the shutdown step is explicit in one method | — | — |
| 2 | Ownership Clarity and Boundary Encapsulation | 9.5 | The policy sits in the owners; the sweep has no exit policy; there are no bypasses | — | — |
| 3 | API / Interface / Query / Command Clarity | 9.4 | One constructor; explicit sweep deps; a three-variant result | The sweep's deps type is broad, but only for injection | — |
| 4 | Separation of Concerns and File Placement | 9.5 | Primitives, sweep and owner are cleanly split; placement matches | — | — |
| 5 | Shared-Structure / Data-Model Tightness and Reusable Owned Structures | 9.2 | Tight union and a single `ProcessRow` on the server | The approved desktop copy duplicates the selection and the poll helpers (CR-C6, FU-005) | Merge in FU-005 if a shared package becomes possible |
| 6 | Naming Quality and Local Readability | 9.3 | The names match the Terminology; the comments state the invariants (only ESRCH proves absence; targets are recorded before signalling) | A few dense one-line `try`/`catch` constructs in `server-process-shutdown.ts`, which follow that file's existing style | — |
| 7 | API/E2E Readiness | 9.4 | Deterministic AC-003 and AC-011 coverage, both failing on base; clear handoff hints | The live and desktop proofs are pending (validation-owned) | — |
| 8 | Runtime Correctness And Behavioral Fidelity | 9.3 | Fence semantics verified in the domain (an idle run is accepted at once; a rejected interrupt is bounded at 5 s); bound timing tested at the edge; zombie reaping handled; Windows untouched | N-3 (Terminate has no bound of its own) stays a design-accepted residual; CR-C5 affects diagnostics only | Validation: AC-001 and U-A1 |
| 9 | No Backward-Compatibility / No Legacy Retention | 9.6 | Clean move with no shim; old paths removed | — | — |
| 10 | Cleanup Completeness | 9.5 | Old file, its test path and its mock are removed; no stale references | — | — |

**Round 2 score note (failure-origin; the scorecard is not repeated):** CR-001 lowers category 8, Runtime Correctness And Behavioral Fidelity, from 9.3 to 9.0. The sweep violates its own target invariant (it records only live descendants it may signal) and its log contract on every POSIX exit. All other categories stand.

**Review gap:** round 1 should have caught CR-001. The source shows `readProcessTable()` spawning `ps` as a child of `process.pid`, and the sweep selecting `process.pid`'s descendants in its own group from that same table. The unit tests use a fake table, so they could not show it. CR-C9 could not reasonably have been detected in source review: it is in code this change does not touch and appeared once in 15 live runs.

## Findings

### CR-001 — The server sweep counts and signals its own `ps` reader (F-API-001)

- Candidate: CR-C8. Contract: design § Ownership Boundaries and § Off-Spine Concerns; behavior BEH-003.
- Where: `autobyteus-server-ts/src/utils/process-tree.ts` `readProcessTable()` (`execFileSync('ps', ['-A', '-o', 'pid=,ppid=,pgid='])`), consumed by `src/shutdown/server-process-tree-sweep.ts`.
- Evidence: reproduced on every POSIX server exit, idle ones included. Each logs `Server process-tree sweep: 1 process(es) and 0 process group(s) still running; sending SIGTERM.` (API-02, API-10, API-11D).
- Consequence: a false "still running" diagnostic on every exit, which defeats the marker that validation and operators use; a SIGTERM to a reaped pid, with a small pid-reuse window; inflated `targets`. The outcome stays `confirmed` and the exit code stays 0.
- Required action (`Local Fix`, implementation engineer):
  - make the shared reader return the table without its own `ps` row (for example `spawnSync` and drop `result.pid`);
  - add a unit case in which the reader's row is present and is not selected or signalled;
  - leave AGY and the desktop copy unchanged: they are not affected, and no new branch is needed for them.
- After the fix: source review (a targeted delta), then API/E2E. In its next round, API/E2E checks that an idle exit logs no sweep line.

## Follow-ups

- Follow-ups this review added: **FU-008** (F-API-002, the intermittent 10 s stall in the Org root-shutdown stage; see CR-C9). Round 1 added none. CR-C6 and CR-C7 are covered by FU-005. The FU-004 arithmetic moves to ≈ 14.25 s, inside its suggested 20 s.

## Classification

- CR-001 (F-API-001): `Local Fix`, owned by implementation.
- F-API-002: not a classification of this ticket. It is a follow-up (FU-008), and API/E2E records it as out of scope with this ID in its next round.

## Recommended Recipient

- Implementation engineer, by the rule "API/E2E failure-origin review confirms that the owning problem is an implementation defect".
- F-API-002 needs no separate message. The fixed package comes back through source review and API/E2E, where it is recorded as out of scope (FU-008).

## Residual Risks

- These belong to validation, as the handoff lists them: N-3 (Terminate pending if a runtime accepts an interrupt but never ends its turn; AC-001 is the gate), N-5/FU-007 (an expired bound blocks an update install), N-7, U-A1 (busy and idle Claude runs against the sequential finish), U-A2 (CLI versions; Claude still survives EOF), U-A3 (desktop force duration).
- CR-C5: if `ps` on the desktop stalls to its 2 s timeout, the force confirmation reports "Backend exit not confirmed" although the server was SIGKILLed. The diagnostic is the only effect; U-A3 should note the `ps` duration.
- Worst-case server exit is now ≈ 14.25 s (10 s + ≤ 2 s `ps` + 1.5 s + 0.5 s + IPC flush), inside the 20 s desktop window. FU-004's text says 13.75 s; the Solution Designer may refresh the number when sending it.

- Round 2: F-API-002 (FU-008). A busy quit can occasionally take about 10.8 s and end with exit 1, which blocks an update install (N-5/FU-007). The bound and the sweep contain it. Its cause is open, and it matters for autobyteus-285's unattended update and resume.

## Latest Authoritative Result

**Round 3 (CRR-003), authoritative:**

- Review Decision: `Pass`
- Review Entry Point: `Implementation Review` (`Targeted Delta Review`)
- Supported Product Scenario Gate: `Pass`
- Material-Premise Gate: `Pass`
- Score Summary: 9.4 / 10; every category ≥ 9.2 (category 8 back to 9.3, CR-001 resolved)
- Recommended Recipient: API/E2E engineer
- Notes:
  - Validated code: `83a73f24d7`.
  - API/E2E next round: confirm that an idle server exit logs no "Server process-tree sweep:" line; record F-API-002 as out of scope with FU-008.
  - After an API/E2E pass, the durable tests from `55ddc71839` and IR-002's test changes go to the proportional test-code review.

**Round 2 (CRR-002), superseded:**

- Review Decision: `Fail` (round 2, failure-origin)
- Review Entry Point: `API/E2E Failure-Origin Review`
- Supported Product Scenario Gate: `Pass` (SCN-002 and SCN-003 still represent approved behavior; both failures enter through real server and desktop exits)
- Material-Premise Gate: `Pass`
- Score Summary: round 1 at 9.4 / 10, with category 8 now at 9.0 (CR-001)
- Failure Origin:
  - F-API-001: implementation defect in this change (CR-001), and a round 1 review gap;
  - F-API-002: outside this change's code, in the Org root-shutdown stage, out of scope; root cause not established; follow-up FU-008.
- Recommended Recipient: implementation engineer (`Local Fix` CR-001)
- Notes:
  - Round 1 (CRR-001) passed the implementation review of `bf2857ca29`. The implementer's three points there (CR-C1 to CR-C3) still stand.
  - The durable tests in `55ddc71839` get the proportional test-code review after the next API/E2E pass.

# Design Review Report — busy-quit-shutdown-orphan

## Review Round Meta

- Upstream Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/busy-quit-shutdown-orphan/tickets/in-progress/busy-quit-shutdown-orphan/requirements-doc.md` (Approved, SR-002 + SR-007)
- Upstream Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/busy-quit-shutdown-orphan/tickets/in-progress/busy-quit-shutdown-orphan/investigation-notes.md` (E1–E9, RC-1–RC-5, E-A1–E-A35, U-A1–U-A3)
- Upstream Solution Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/busy-quit-shutdown-orphan/tickets/in-progress/busy-quit-shutdown-orphan/solution-revision-record.md` (SR-001–SR-008)
- Reviewed Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/busy-quit-shutdown-orphan/tickets/in-progress/busy-quit-shutdown-orphan/design-spec.md` (SR-008)
- Supplemental Task Artifacts Reviewed: `evidence/` (relied on as summarized in the investigation notes); `follow-ups.md` (FU-001–FU-007); `architecture-design-handoff.md`.
- Relevant Solution Revision IDs: SR-002 and SR-007 (approval); SR-006, SR-007 and SR-008 (design)
- Architecture Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/busy-quit-shutdown-orphan/tickets/in-progress/busy-quit-shutdown-orphan/architecture-review-revision-record.md`
- Current Architecture Review Revision ID: `ARCH-REV-003`
- Current Review Round: 3
- Trigger: SR-008, the design revision for ARCH-REV-002, from `/software_engineering_team/solution_designer`, 2026-10-30.
- Prior Review Round Reviewed: ARCH-REV-002 (SR-007, Fail: AR-004 blocking; AR-005 and AR-006 low)
- Latest Authoritative Round: 3
- Current-State Evidence Basis: worktree `codex/busy-quit-shutdown-orphan` @ `000da22578`. SR-008 is docs only (`git diff 1cec2d134a HEAD` touches only the ticket folder), so the code read in round 2 at `1cec2d134a` still applies: the branch is docs only on top of `origin/personal` @ `1a4453e553`. Code opened at the cited lines:
  - Server:
    - `src/shutdown/server-process-shutdown.ts` (whole file): memoized `request()`, startup barrier, unbounded `cleanupOnce()`, IPC result, `exit`.
    - `src/server-runtime.ts:42-46, 190-233`: `setCleanup(() => app.close())`. The startup-failure path runs `cleanupOnce()` and then `exitWithEmbeddedServerPlatformFatal`.
    - `src/compositions/native-command-shutdown.ts:8`: native scope closed in `preClose`.
    - `agent-run-manager.ts:203-313`: `prepareAgentRunTermination`, `terminateAgentRun`, `stopAllAgentRuns` (sequential).
    - `agent-run-termination.ts:56-200`: `prepare`, `fenceForRootShutdown`, `prepareTerminationOnce`, `forceTerminate`.
    - `agent-run.ts:295`: the fence entry.
    - Callers of the stop-now entry points (10 call sites by grep; same set as E-A14):
      - `agent-run-service.ts:126-155` (`stopRoot` first, then `terminateAgentRun`; `false` → `notFound`);
      - `standalone-agent-run-lifecycle-service.ts:108-117` (`false` → `rejected`);
      - `standalone-agent-run-root-manager.ts:202-262` (`stopAll` stops root children before hosts);
      - `general-process-run-supervisor.ts:464-495` (Org → Team → standalone roots → `stopAllAgentRuns`);
      - the application orchestration and application execution scope callers.
    - `agy-background-process-groups.ts` (whole file; win32 → `[]`); `agy-stream-process.ts:80-120`.
    - `claude-sdk-process-owner.ts:86-140`: not detached; EOF, then 2 s, then SIGTERM except on win32.
    - No `detached: true` spawn in `autobyteus-server-ts/src`.
    - `docker/Dockerfile.monorepo` runtime base is `autobyteus/chrome-vnc`.
    - Tests: `tests/unit/shutdown/server-process-shutdown.test.ts`; `tests/unit/server-runtime-app-data-migration-gate.test.ts:289-313`; `vitest.config.ts` (`pool: "forks"`).
  - Desktop:
    - `managedBackendStop.ts` (whole file);
    - `baseServerManager.ts:40, 175-195`;
    - `managedBackendShutdownClient.ts` (whole file);
    - `windowsServerManager.ts:30-110`;
    - `application/applicationShutdown.ts` (whole file);
    - `application/electronApplication.ts:59, 73-75, 348-350`;
    - `updater/appUpdater.ts:272-280`.
  - Docs: `agent_execution.md:307-314`, `antigravity_cli_runtime.md:317`, `electron_packaging.md:139`. All cited lines match the design.

## Routing Classification Review

- Task size: `Medium`. Architectural risk: `High`.
- Classification rationale reviewed. Agreed:
  - Medium: two packages, existing owners only (`AgentRunManager`, `ServerProcessShutdown`, `BaseServerManager`), one helper moved, and one small sweep file added.
  - High:
    - stop semantics change for every standalone and application run on every runtime (concurrency with input admission and the fence);
    - process-tree signalling at every server exit and on the desktop force path;
    - a changed exit-code and IPC-result contract.
- Independent Architecture Review required by the classification: `Yes`.

## Upstream Behavior And Production-Path Basis Confirmation

- Overall Basis Status: `Confirmed`.
- Approved requirements:
  - REQ-001 (Terminate interrupts, including an application's terminate, DEC-005);
  - REQ-002 (10 s server bound);
  - REQ-003 (no leftover runtime CLI or tool command, graceful or forced);
  - REQ-004 (desktop waits ≤ 20 s, DEC-007, then force-stops the server and everything it started);
  - REQ-005 (continuity);
  - BEH-007 (shutdown never writes `terminatedAt`).
- Relevant existing behavior confirmed in code:
  - RC-1 holds: `prepareTerminationOnce` interrupts only in the recoverable-block branch.
  - RC-2 holds: `request()` awaits `cleanupOnce()` with no bound.
  - The POSIX `forceStop` sends `SIGKILL` to the server PID only.
  - `ApplicationShutdown` already memoizes one stop and defers `will-quit`.
- Scope guardrail confirmed:
  - In scope: UC-001 to UC-004.
  - Out of scope: DEC-003, DEC-004, root-hosted child fencing, and Windows handling "beyond honoring the same bounds … unless design finds a gap".
  - Preserved: BEH-005, BEH-007, idle quit speed, and the Terminate/Stop results seen by the UI.
- Every prospective blocking `Design Impact` finding is traceable to an approved ID: `Yes`. None remain.
- Remaining material ambiguity: none.
- Statements about existing code the design relies on: all opened at their cited lines and correct. The `taskkill /f /t` wording is corrected in SR-008: it is the net on the Windows forced path only.

| Behavior ID | Kind | Design Alignment | Trigger / Evidence | Target Path / Spine | Status | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 (user) | User | Pass | Pass (E8; `agent-run-service.ts:126-155`) | Pass (DS-001) | Confirmed | — |
| BEH-001 (app) | Contract | Pass (DEC-005) | Pass (E-A8, E-A14; call sites re-grepped) | Pass (DS-001b; no extra code) | Confirmed | — |
| BEH-002 | Operational | Pass | Pass (E-A25; `server-process-shutdown.ts:33-48`) | Pass (DS-002) | Confirmed | — |
| BEH-003 | Operational | Pass | Pass (E3, E9, E-A26, E-A28) | Pass: three sweep outcomes, only `unconfirmed` fails (SR-008) | Confirmed | — |
| BEH-004 | User | Pass (DEC-007) | Pass (E-A27, E-A28; `managedBackendStop.ts`) | Pass (DS-003). On Windows the sweep is `not-applicable`, so a clean quit or update still reports `complete` | Confirmed | — |
| BEH-005, BEH-007 | User / Operational | Pass | Pass (E-A15: only Terminate/delete/archive write `terminatedAt`) | Pass (preserved; D1 writes no history) | Confirmed | — |

## Supplemental Artifact Coherence Verdict

| Artifact | Purpose | Linked | Complete | Consistent | Status | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| `evidence/` (E1–E9) | Pass | Pass | Pass | Pass | Pass (Evidence) | — |
| `follow-ups.md` | Pass | Pass | Pass | Pass | Pass | — (FU-005 names three readers; FU-007 added) |
| `tickets/done/backend-port-conflict-20261024/` (on `personal`) | Pass | Pass | Pass | Pass (D2/D3 extend its owners; its "never report unconfirmed cleanup as clean" policy is kept) | Pass | — |

## Task Design Health Assessment Verdict

| Assessment Area | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Assessment is present for the current task posture | Pass | `Bug Fix`, current design issue `Yes` | — |
| Root-cause classification is explicit and evidence-backed | Pass | `Missing Invariant` in three owners; RC-1, RC-2 and the POSIX force confirmed in code | — |
| Refactor decision is explicit | Pass | `Yes, small`: the AGY selector moves to `src/utils` because a second owner needs it | — |
| Refactor decision is reflected in concrete sections | Pass | File mapping, removal plan, dependency rules | — |

## Spine Inventory Verdict

| Spine | Readable | Narrative | Facade vs Owner | Naming | One Owner Per Node, In Order | Off-Spine Kept Off | Verdict |
| --- | --- | --- | --- | --- | --- | --- | --- |
| DS-001 Terminate | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-001b Application terminate | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-002 Server shutdown | Pass | Pass | Pass | Pass | Pass: `ServerProcessShutdown` drives barrier → bounded cleanup → sweep → result → exit | Pass (logging) | Pass |
| DS-003 Desktop quit | Pass | Pass | Pass | Pass | Pass: `ApplicationShutdown` → `stopManagedBackend` → POSIX `forceStop` | Pass | Pass |
| Bounded: sweep; `request()`; desktop force | Pass | Pass | N/A | Pass | Pass | Pass | Pass |

DS-002 call order was redrawn against code:

1. `request()` → `startupSettled`.
2. `cleanupOnce()` = `app.close()`:
   1. `preClose`: native scope close, ≤ 3 s;
   2. `onClose`: application lifecycle stop, which runs the application-scope `stopAllAgentRuns`;
   3. `closeProcessResources`;
   4. `GeneralProcessRunSupervisor.closeInternal`: Org → Team → standalone roots (children only, `standalone-agent-run-root-manager.ts:250-262`) → `stopAllAgentRuns`.
3. New: the 10 s race, then the sweep.
4. The IPC result, then `exit`.

The fence for a busy host runs at the last supervisor stage. Earlier stages are bounded by the existing child fences (F-2, 5 s each for a rejected interrupt), and the 10 s bound covers the sum.

## Boundary Encapsulation Verdict

| Boundary / Owner | Public Entry Clear | Internals Stay Internal | Bypass Controlled | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `AgentRunManager` stop-now methods | Pass | Pass | Pass | Pass | Callers do not fence themselves. `AgentRunTermination` is unchanged |
| `ServerProcessShutdown` | Pass | Pass | Pass | Pass | Bound, sweep call, result and exit stay in one owner. No second shutdown file |
| `server-process-tree-sweep.ts` | Pass | Pass | Pass | Pass | Holds no policy. The caller decides the exit code |
| `utils/process-tree.ts` | Pass | Pass | Pass | Pass | Pure selection plus primitives, shared by AGY and the sweep |
| `BaseServerManager.forceStop` (POSIX) | Pass | Pass | Pass | Pass | `stopManagedBackend` and the Windows manager stay untouched |

## Dependency Direction / Forbidden Shortcut Verdict

| Owner / Boundary | Allowed Clear | Forbidden Explicit | Direction Coherent | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `server-runtime` → `shutdown/*` → `utils/process-tree` | Pass | Pass | Pass | Pass | `utils` imports only Node |
| `agy-stream-process` → `utils/process-tree` | Pass | Pass | Pass | Pass | No re-export shim |
| Desktop `serverProcessTree.ts` ← `BaseServerManager` only | Pass | Pass | Pass | Pass | Electron main cannot import server code, so the copy is justified |

## Interface Boundary Verdict

| Interface | Subject | Singular | Identity | Generic Risk | Verdict |
| --- | --- | --- | --- | --- | --- |
| `AgentRunManager.terminateAgentRun(runId): Promise<boolean>` | Pass | Pass | Pass | Low | Pass |
| `AgentRunManager.stopAllAgentRuns()` | Pass | Pass | Pass | Low | Pass |
| `new ServerProcessShutdown(runtime, { cleanupTimeoutMs, sweep, timers })` | Pass | Pass | Pass | Low | Pass. The sweep is injected in every test (SR-008). The two mapping rows are one constructor (N-9) |
| `terminateServerProcessTree(deps)` → `not-applicable` \| `confirmed` \| `unconfirmed` | Pass | Pass | Pass | Low | Pass (AR-004 resolved) |
| `selectDescendantProcessGroups(rows, rootPid, excludedPgids)`, `selectDescendantPidsInGroup(rows, rootPid, pgid)` | Pass | Pass | Pass | Low | Pass |
| `BaseServerManager.forceStop(proc)` (POSIX) | Pass | Pass | Pass | Low | Pass |

## Existing Capability / Subsystem Reuse Verdict

| Need | Checked | Decision Sound | New Piece Justified | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Interrupt and cancel queued input | Pass | Pass (reuse the fence) | N/A | Pass | — |
| Shutdown signals, IPC, exit | Pass | Pass (extend `ServerProcessShutdown`) | N/A | Pass | — |
| Native commands | Pass | Pass (reuse the scope; the sweep is only a net) | N/A | Pass | — |
| Process-table selection | Pass | Pass (move AGY's selector) | Pass | Pass | `ProcessGroupObserver` not reused, with a reason (FU-005) |
| Desktop escalation | Pass | Pass (extend `forceStop` only) | Pass (desktop copy) | Pass | — |

## Subsystem / Capability-Area Allocation Verdict

| Area | Allocation Clear | Decision Sound | Supports Spine Owners | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `agent-execution/services` | Pass | Pass | Pass | Pass | — |
| `src/shutdown` | Pass | Pass | Pass | Pass | — |
| `src/utils` | Pass | Pass | Pass | Pass | — |
| `autobyteus-web/electron/server` | Pass | Pass | Pass | Pass | — |

## Reusable Owned Structures Verdict

| Structure | Extraction Evaluated | Shared File Sound | Ownership Clear | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Descendant selection (AGY + sweep) | Pass | Pass | Pass | Pass | — |
| Desktop copy of the selection | Pass | Pass | Pass | Pass | About 40 lines, tested on both sides. Readers across packages are FU-005 |

## Shared Structure / Data Model Tightness Verdict

| Structure | One Meaning Per Field | No Redundancy | Overlap Controlled | Core vs Variant | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| Sweep result (`not-applicable` \| `confirmed` \| `unconfirmed`) | Pass | Pass | Pass | N/A | Pass | Each outcome has one meaning. Only `unconfirmed` affects the exit code |

- Derived consumers of the changed structures, each with a decision (Principle 11): `Pass`. AGY stream, its tests and its doc line are covered.
- Each domain word keeps one meaning, and each concept one name (Principle 15): `Pass`. "Server", "embedded server" and "process-tree sweep" are used consistently, with no glossary change.

## File Responsibility Mapping Verdict

| File | Singular | Matches Owner | Re-Tightened | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `agent-run-manager.ts` | Pass | Pass | N/A | Pass | — |
| `shutdown/server-process-shutdown.ts` | Pass | Pass | N/A | Pass | — |
| `shutdown/server-process-tree-sweep.ts` and its new test | Pass | Pass | N/A | Pass | — |
| `utils/process-tree.ts` (moved) | Pass | Pass | Pass | Pass | — |
| `agy-stream-process.ts` and its tests | Pass | Pass | Pass | Pass | — |
| `tests/unit/shutdown/server-process-shutdown.test.ts` | Pass | Pass | N/A | Pass | — |
| `tests/unit/server-runtime-app-data-migration-gate.test.ts` | Pass | Pass | N/A | Pass | It mocks the sweep and awaits the request (AR-005 resolved) |
| `baseServerManager.ts`, `serverProcessTree.ts` | Pass | Pass | N/A | Pass | Async `execFile` table read (AR-006 resolved) |
| Three docs | Pass | Pass | N/A | Pass | Line references verified |

## Subsystem / Folder / File Placement Verdict

| Path | Placement Clear | Folder Matches | Risk | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `src/shutdown/server-process-tree-sweep.ts` | Pass | Pass | Low | Pass | Next to its only caller |
| `src/utils/process-tree.ts` | Pass | Pass | Low | Pass | Concern-agnostic |
| `electron/server/serverProcessTree.ts` | Pass | Pass | Low | Pass | — |

## Removal / Decommission Completeness Verdict

| Item | Named | Replacement Clear | Scope Explicit | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Unbounded `await this.cleanupOnce()` | Pass | Pass | Pass | Pass | — |
| `agy-background-process-groups.ts` and its test location | Pass | Pass | Pass | Pass | No shim |
| POSIX single-PID `SIGKILL` | Pass | Pass | Pass | Pass | — |
| Dead code in touched files | Pass | N/A | Pass | Pass | None found |

## Legacy / Backward-Compatibility Verdict

| Area | Wrapper / Dual Path | Clean Cut Explicit | Verdict | Notes |
| --- | --- | --- | --- | --- |
| AGY helper re-export | No | Pass | Pass | Rejected in the log |
| A flag to restore drain-on-terminate | No | Pass | Pass | Rejected |
| A second shutdown owner | No | Pass | Pass | Rejected |

## Persisted-Data Transition Verdict (When Applicable)

| Area | Decision | Evidence | Proportionate | Migration Safety | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| Run history, conversations | `Not Affected` | Pass (E-A15) | Pass | N/A | Pass | The interrupted turn's work is an approved acceptable loss |

## Change / Refactor Safety Verdict

| Area | Realistic | Seams Explicit | Cleanup Explicit | Verdict |
| --- | --- | --- | --- | --- |
| Step 1: move the utility, re-point AGY | Pass | Pass | Pass | Pass |
| Step 2: D1 and tests | Pass | Pass | Pass | Pass |
| Step 3: D2 and tests | Pass | Pass | Pass | Pass |
| Step 4: D3 and tests | Pass | Pass | Pass | Pass |
| Steps 5–6: docs, validation | Pass | Pass | Pass | Pass |

## Example Adequacy Verdict

| Topic | Needed | Present | Avoided Shape | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Stop-now fence first | Yes | Pass | Pass | Pass | — |
| Concurrent shutdown fence | Yes | Pass | Pass | Pass | — |
| Bound, then always the sweep | Yes | Pass | Pass | Pass | `if (sweep.outcome === 'unconfirmed') code = 1` |
| Bound start after the barrier | Yes | Pass | Pass | Pass | — |
| Sweep targets | Yes | Pass | Pass | Pass | Record before signalling, never the root's own group, never by port |
| Desktop force order | Yes | Pass | Pass | Pass | The 2 s is kept; `stopManagedBackend` is unchanged |

## Material Premise Validation (Only When Needed)

### `P-004`: a Windows desktop quit or update reaches the server-side sweep on win32 (AR-004)

- Related requirement / contract: REQ-004; BEH-004 preserved ("Normal quit with an idle app stays quick"); AC-005; AC-009 (the update restart); the Scope Guardrail on Windows ("honoring the same bounds").
- Behavior IDs: BEH-004, BEH-003.
- Initiating basis kind: `User`. A Windows desktop user quits from the menu, or installs an update (`Install update and restart`).
- Support evidence: Windows is a shipped desktop target (`windowsServerManager.ts`). The updater's `prepareForInstall: () => this.stop()` (`electronApplication.ts:73-75`, `appUpdater.ts:275`).
- Forward path:
  1. `ApplicationShutdown.stop()` → `stopServer` → `stopManagedBackend` → `WindowsServerManager.requestGracefulStop` → `ManagedBackendShutdownClient.stop` sends the IPC `request`.
  2. Server: `ServerProcessShutdown.request()` → cleanup → **sweep (D2: "always")**.
  3. If the sweep reports `confirmed: false` because no process table can be read (the design: "`ps` missing … reports unconfirmed"; `ps` does not exist on Windows) → `code = 1` → IPC `failed`.
  4. `managedBackendShutdownClient.ts:38` rejects with "Backend reported incomplete cleanup" → `managedBackendStop.ts:33` throws `ShutdownIncompleteError`.
  5. Quit: `app.exit(1)` (`electronApplication.ts:350`). Update: `prepareForInstall` rejects, so `quitAndInstall` never runs (`appUpdater.ts:275-278`).
- Lifecycle preconditions and consequence: none beyond a normal Windows quit or update. Every Windows quit would end on the failure path, and every Windows update install would be aborted, with the server already stopped.
- Reachability: `Reachable`, if the implementation follows the design's own "cannot confirm → unconfirmed → exit 1" rule on win32. The design states that the sweep is "POSIX only", but not what it returns there or how that maps to the exit code.
- Review consequence: AR-004, resolved in SR-008 (`not-applicable` on win32, with a win32 unit case; E-A33).

### `P-005`: the default real sweep runs inside the repository test suite (AR-005)

- Related contract: AC-007 (existing suites stay green); the escalation trigger "the sweep signals something the server did not spawn".
- Initiating basis kind: `Contract` (the repository's own test suite).
- Forward path:
  1. `tests/unit/server-runtime-app-data-migration-gate.test.ts:289-313` calls `startConfiguredServer` in the vitest fork worker. `server-runtime.ts:43` constructs `new ServerProcessShutdown()` with defaults.
  2. The test fires the captured SIGTERM handler and expects `process.exit(0)` after one `setImmediate`.
  3. With "injectable sweep (default: the real one)", `request()` runs a real `ps` and signals descendants of the worker's `process.pid`. With an asynchronous sweep, `exit` is not yet called when the test asserts.
- Reachability: `Reachable`.
- Review consequence: AR-005, resolved in SR-008 (the sweep is mocked or injected; E-A34).

ARCH-REV-001's premises are resolved:

- P-001 (re-entrant quit): shipped `ApplicationShutdown` memoizes one stop (`applicationShutdown.ts:9-28`).
- P-002 (processes outside the server's group): the sweep and the native scope (E-A11, E-A26).
- P-003 (an application terminates a busy run): DEC-005 approved.

## Unresolved Approved-Behavior Or Current-State Gaps

None.

## Review Decision

`Pass`. The behavior basis is confirmed, and every ARCH-REV-002 finding is resolved in the canonical design spec (SR-008). No in-scope machinery depends on an unsupported premise.

## Findings

None open. Resolved in this round (details in `architecture-review-revision-record.md`, ARCH-REV-003):

- **AR-004:**
  - The sweep has three outcomes: `not-applicable` (win32: no `ps`, no signals), `confirmed` and `unconfirmed`.
  - Only `unconfirmed` sets exit 1 / IPC `failed`. On Windows, the exit code comes from the cleanup and the bound only.
  - A win32 unit case is added, and the `taskkill` wording is corrected.
- **AR-005:** every `ServerProcessShutdown` test injects a fake sweep. `server-runtime-app-data-migration-gate.test.ts` mocks the sweep module and awaits the request. Both are in the file mapping.
- **AR-006:** the 2 s confirmation is kept and `stopManagedBackend` is unchanged. The desktop table read uses async `execFile` with a 2 s timeout. U-A3 is now an observation.

## Classification

N/A (Pass).

## Recommended Recipient

`/software_engineering_team/implementation_engineer` (primary). Informational notification to `/software_engineering_team/solution_designer`.

## Residual Risks

- **N-3 (carried):** user Terminate has no D2-style bound. A runtime that accepts an interrupt but never ends its turn keeps Terminate pending. AC-001 is the gate.
- **N-5 (recorded under Risks; FU-007):** an expired bound gives exit 1, which stops an update install (backend-port-conflict's policy). U-A1 now also covers idle Claude runs and records whether a busy update install completes.
- **N-6:** a fence that is not accepted leaves the run root-fenced but active. A retry runs a new fence attempt. One doc sentence goes in `agent_execution.md`.
- **N-7 (recorded under Risks):**
  - A process spawned after the sweep's snapshot is not swept.
  - The startup-failure exit is neither bounded nor swept.
- **N-8:** FU-005 names the three process-table readers.
- **N-9 (cosmetic):** the Interface Boundary Mapping lists `new ServerProcessShutdown(...)` twice, once with `now/timers` and once without. Implement one constructor, `(runtime, { cleanupTimeoutMs, sweep, timers })`, with the sweep defaulting to `terminateServerProcessTree`. No design change.
- **Windows:** there is no server-side sweep, and `ClaudeSdkProcessOwner` skips SIGTERM on win32. This is accepted under the Windows scope guardrail.
- **Validation still owes:** U-A1 (several Claude runs against the 10 s bound, busy and idle), U-A2 (CLI versions; the Claude CLI still survives EOF) and U-A3 (observation only).

## Latest Authoritative Result

- Review Decision: `Pass`
- Material-Premise Gate: `Pass`. P-004 and P-005 are `Reachable` and were resolved by SR-008. The ARCH-REV-001 premises were resolved in round 2.
- Classification: task_size `Medium`, architectural_risk `High` (agreed).
- Notes:
  - Implement per design-spec § Change / Refactor Sequence:
    1. move the utility;
    2. D1;
    3. D2;
    4. D3;
    5. docs;
    6. validation.
  - Keep `AgentRunTermination`, `stopManagedBackend`, `ApplicationShutdown` and the Windows manager unchanged.

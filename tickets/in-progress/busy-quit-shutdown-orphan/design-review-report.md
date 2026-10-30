# Design Review Report — busy-quit-shutdown-orphan

## Review Round Meta

- Upstream Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/busy-quit-shutdown-orphan/tickets/in-progress/busy-quit-shutdown-orphan/requirements-doc.md` (Approved, SR-002 + SR-007)
- Upstream Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/busy-quit-shutdown-orphan/tickets/in-progress/busy-quit-shutdown-orphan/investigation-notes.md` (E1–E9, RC-1–RC-5, E-A1–E-A32, U-A1–U-A3)
- Upstream Solution Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/busy-quit-shutdown-orphan/tickets/in-progress/busy-quit-shutdown-orphan/solution-revision-record.md` (SR-001–SR-007)
- Reviewed Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/busy-quit-shutdown-orphan/tickets/in-progress/busy-quit-shutdown-orphan/design-spec.md` (SR-007)
- Supplemental Task Artifacts Reviewed: `evidence/` (relied on as summarized in the investigation notes); `follow-ups.md` (FU-001–FU-006); `architecture-design-handoff.md`.
- Relevant Solution Revision IDs: SR-002 and SR-007 (approval), SR-006 and SR-007 (design)
- Architecture Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/busy-quit-shutdown-orphan/tickets/in-progress/busy-quit-shutdown-orphan/architecture-review-revision-record.md`
- Current Architecture Review Revision ID: `ARCH-REV-002`
- Current Review Round: 2
- Trigger: SR-007 `Architecture Design Complete` (Medium/High) from `/software_engineering_team/solution_designer`, 2026-10-30.
- Prior Review Round Reviewed: ARCH-REV-001 (SR-003, Fail)
- Latest Authoritative Round: 2
- Current-State Evidence Basis: worktree `codex/busy-quit-shutdown-orphan` @ `1cec2d134a`. It is docs only on top of `origin/personal` @ `1a4453e553` (`git diff --stat 1a4453e553 HEAD` touches only the ticket folder). Code opened at the cited lines:
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
- Every prospective blocking `Design Impact` finding is traceable to an approved ID: `Yes` (AR-004 → BEH-004 preserved, AC-005, AC-009).
- Remaining material ambiguity: none in the requirements basis. The open technical point is the sweep's result where it does not run (AR-004).
- Statements about existing code the design relies on: all opened at their cited lines and correct. One wording issue: "on Windows the desktop's `taskkill /f /t` remains the net" is true only on the forced path. A clean Windows exit never reaches `forceStop` (see Residual Risks).

| Behavior ID | Kind | Design Alignment | Trigger / Evidence | Target Path / Spine | Status | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 (user) | User | Pass | Pass (E8; `agent-run-service.ts:126-155`) | Pass (DS-001) | Confirmed | — |
| BEH-001 (app) | Contract | Pass (DEC-005) | Pass (E-A8, E-A14; call sites re-grepped) | Pass (DS-001b; no extra code) | Confirmed | — |
| BEH-002 | Operational | Pass | Pass (E-A25; `server-process-shutdown.ts:33-48`) | Pass (DS-002) | Confirmed | — |
| BEH-003 | Operational | Pass | Pass (E3, E9, E-A26, E-A28) | Pass, except the sweep's result off POSIX (AR-004) | Confirmed | AR-004 |
| BEH-004 | User | Pass (DEC-007) | Pass (E-A27, E-A28; `managedBackendStop.ts`) | Pass on POSIX (DS-003). A Windows quit or update depends on AR-004 | Confirmed | AR-004 |
| BEH-005, BEH-007 | User / Operational | Pass | Pass (E-A15: only Terminate/delete/archive write `terminatedAt`) | Pass (preserved; D1 writes no history) | Confirmed | — |

## Supplemental Artifact Coherence Verdict

| Artifact | Purpose | Linked | Complete | Consistent | Status | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| `evidence/` (E1–E9) | Pass | Pass | Pass | Pass | Pass (Evidence) | — |
| `follow-ups.md` | Pass | Pass | Pass | Pass | Pass | Optional: FU-005 can name the desktop copy as a third reader |
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
| DS-002 Server shutdown | Pass | Pass | Pass | Pass | Pass: `ServerProcessShutdown` drives barrier → bounded cleanup → sweep → result → exit | Pass (logging) | Pass, with AR-004 on the sweep result |
| DS-003 Desktop quit | Pass | Pass | Pass | Pass | Pass: `ApplicationShutdown` → `stopManagedBackend` → POSIX `forceStop` | Pass | Pass, with AR-006 wording |
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
| `new ServerProcessShutdown(runtime, { cleanupTimeoutMs, sweep, timers })` | Pass | Pass | Pass | Low | Pass, but the default-sweep seam needs the AR-005 test note |
| `terminateServerProcessTree(deps): { targets, confirmed }` | Pass | Pass | Pass | Low | **Fail (AR-004)**: the result where no table can be read, notably win32, is unspecified |
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
| Sweep result `{ targets, confirmed }` | Fail (AR-004) | Pass | Pass | N/A | Fail | `confirmed` must have one meaning where the sweep cannot or does not run |

- Derived consumers of the changed structures, each with a decision (Principle 11): `Pass`. AGY stream, its tests and its doc line are covered.
- Each domain word keeps one meaning, and each concept one name (Principle 15): `Pass`. "Server", "embedded server" and "process-tree sweep" are used consistently, with no glossary change.

## File Responsibility Mapping Verdict

| File | Singular | Matches Owner | Re-Tightened | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `agent-run-manager.ts` | Pass | Pass | N/A | Pass | — |
| `shutdown/server-process-shutdown.ts` | Pass | Pass | N/A | Pass | — |
| `shutdown/server-process-tree-sweep.ts` | Pass | Pass | N/A | Pass | AR-004 result semantics |
| `utils/process-tree.ts` (moved) | Pass | Pass | Pass | Pass | — |
| `agy-stream-process.ts` and its tests | Pass | Pass | Pass | Pass | — |
| `tests/unit/shutdown/server-process-shutdown.test.ts` | Pass | Pass | N/A | Pass | — |
| `tests/unit/server-runtime-app-data-migration-gate.test.ts` | — | — | — | **Missing (AR-005)** | It runs `startConfiguredServer` in-process and fires SIGTERM, so the default real sweep would run inside the test worker |
| `baseServerManager.ts`, `serverProcessTree.ts` | Pass | Pass | N/A | Pass | AR-006 wording |
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
| Step 3: D2 and tests | Pass | Fail (AR-005: one existing in-process test is not listed) | Pass | Pass after AR-005 |
| Step 4: D3 and tests | Pass | Pass | Pass | Pass |
| Steps 5–6: docs, validation | Pass | Pass | Pass | Pass |

## Example Adequacy Verdict

| Topic | Needed | Present | Avoided Shape | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Stop-now fence first | Yes | Pass | Pass | Pass | — |
| Concurrent shutdown fence | Yes | Pass | Pass | Pass | — |
| Bound, then always the sweep | Yes | Pass | Pass | Pass, except the off-POSIX result (AR-004) | — |
| Bound start after the barrier | Yes | Pass | Pass | Pass | — |
| Sweep targets | Yes | Pass | Pass | Pass | Record before signalling, never the root's own group, never by port |
| Desktop force order | Yes | Pass | Pass | Pass | Remove the "raise to 3 s if needed" seam (AR-006) |

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
- Review consequence: AR-004 (blocking, small).

### `P-005`: the default real sweep runs inside the repository test suite (AR-005)

- Related contract: AC-007 (existing suites stay green); the escalation trigger "the sweep signals something the server did not spawn".
- Initiating basis kind: `Contract` (the repository's own test suite).
- Forward path:
  1. `tests/unit/server-runtime-app-data-migration-gate.test.ts:289-313` calls `startConfiguredServer` in the vitest fork worker. `server-runtime.ts:43` constructs `new ServerProcessShutdown()` with defaults.
  2. The test fires the captured SIGTERM handler and expects `process.exit(0)` after one `setImmediate`.
  3. With "injectable sweep (default: the real one)", `request()` runs a real `ps` and signals descendants of the worker's `process.pid`. With an asynchronous sweep, `exit` is not yet called when the test asserts.
- Reachability: `Reachable`.
- Review consequence: AR-005 (Low, non-blocking).

ARCH-REV-001's premises are resolved:

- P-001 (re-entrant quit): shipped `ApplicationShutdown` memoizes one stop (`applicationShutdown.ts:9-28`).
- P-002 (processes outside the server's group): the sweep and the native scope (E-A11, E-A26).
- P-003 (an application terminates a busy run): DEC-005 approved.

## Unresolved Approved-Behavior Or Current-State Gaps

None.

## Review Decision

`Fail`. D1, D2 and D3 are structurally sound. One small blocking correction (AR-004) and two low notes (AR-005, AR-006) must be folded into the design spec.

## Findings

### `AR-004` (Medium; blocking; Design Impact): the sweep's result where it cannot or does not run is unspecified, and the stated rule turns every Windows quit and update into a failure

- Protects: BEH-004 preserved (idle quit), AC-005, AC-009 (the update restart), REQ-004. See P-004.
- Scope status: `Within Approved Scope`. Changes approved behavior: `No`. The fix prevents a regression.
- Evidence:
  - design-spec Risks: "`ps` missing … the sweep logs and reports unconfirmed".
  - Shape table: "`if (!sweep.confirmed) code = 1`".
  - Health assessment: "the server-side sweep is POSIX only".
  - `managedBackendShutdownClient.ts:38`; `managedBackendStop.ts:22, 33`; `electronApplication.ts:73-75, 350`; `appUpdater.ts:275-278`.
  - The AGY helper today returns `[]` on win32 (`agy-background-process-groups.ts:58`), so moving it does not settle the question.
- Required update:
  - In the sweep interface, distinguish **not applicable** (win32: the sweep is not run, or reports no targets) from **unconfirmed** (POSIX: the table could not be read, or a recorded target survived).
  - Only *unconfirmed* sets exit 1 / IPC `failed`. On Windows the exit code depends only on the cleanup and the bound, as today.
  - Add a unit case: on win32 a clean close gives exit 0 and IPC `complete`, and no `ps` runs.
  - Keep the POSIX "`ps` unreadable → unconfirmed" rule, which matches backend-port-conflict's policy. Name its consequence: exit 1, and on the desktop a quit that ends through `app.exit(1)`.
  - Correct the residual wording: `taskkill /f /t` is the net only on the Windows **forced** path. After a clean Windows exit nothing sweeps, which is accepted under the Windows scope guardrail.
- Proportionate: a one-paragraph spec change and one test. No new mechanism.
- Recipient: Solution Designer.

### `AR-005` (Low; non-blocking; Design Impact): an existing in-process test would run the real sweep

- Protects: AC-007. See P-005.
- Scope status: `Within Approved Scope`. Changes approved behavior: `No`.
- Evidence: `server-runtime-app-data-migration-gate.test.ts:289-313`; `server-runtime.ts:43`; `vitest.config.ts:15` (`pool: "forks"`).
- Required update:
  - Add this test to the file mapping (Modify: mock `shutdown/server-process-tree-sweep.js`, and await the request before asserting `exit`).
  - State that unit tests never reach the real sweep: the existing `server-process-shutdown.test.ts` cases construct `new ServerProcessShutdown(proc)` with a fake runtime, and also need an injected sweep.
- Recipient: Solution Designer (fold into the spec). The implementer may apply it directly if the designer prefers.

### `AR-006` (Low; non-blocking; Design Impact): the desktop force budget is a conditional seam that contradicts "`stopManagedBackend` unchanged"

- Protects: REQ-004, AC-004, AC-011.
- Scope status: `Within Approved Scope`. Changes approved behavior: `No`.
- Evidence:
  - `managedBackendStop.ts:28-29`: `forceDeadline` is taken before `await force()`, the remainder goes to `waitForChildExit`, and that function returns at once when the child has already exited (`:8`).
  - The force path always ends in `ShutdownIncompleteError` (`:33`).
  - Because D3 sends `SIGKILL` to the server right after the snapshot, the exit is confirmed whatever the 1.5 s grace.
  - Worst case: 20 s + ≤ 2 s `ps` + 1.5 s ≈ 23.5 s, inside the 30 s `ApplicationShutdown` ceiling.
- Required update:
  - Replace "raise it from 2 s to 3 s if needed" with "the 2 s confirmation is kept; no change to `stopManagedBackend`".
  - Require the desktop copy to read the table asynchronously (`execFile`, 2 s timeout), not `execFileSync` as the AGY helper does, so Electron main is not blocked during quit.
  - U-A3 then becomes an observation, not a budget question.
- Recipient: Solution Designer.

## Classification

`Design Impact` (AR-004 blocking; AR-005 and AR-006 low).

## Recommended Recipient

`/software_engineering_team/solution_designer`

## Residual Risks

- **N-3 (carried):** user Terminate has no D2-style bound. A runtime that accepts an interrupt but never ends its turn keeps Terminate pending. AC-001 is the gate.
- **N-5 (new): exit 1 after an expired bound aborts an update install.** This is backend-port-conflict's policy: `prepareForInstall` rejects, and `ApplicationShutdown` memoizes the rejected stop. Today a busy update always ends on the force path, so the design improves the common case. However, a slow but healthy shutdown that passes 10 s now exits 1 where it used to exit 0. For example, several Claude runs at about 2 s each for EOF release (E-A17), possibly idle ones too. Suggest that U-A1 also measures idle Claude runs and records the updater consequence. The design's escalation trigger ("the bound cuts a cleanup that would have finished") already applies.
- **N-6:** a fence that is not accepted leaves the run root-fenced but active. The user sees `notFound`/`rejected`, which are existing result shapes, and a retry runs a new fence attempt (F-3). This is acceptable. Worth one sentence in `agent_execution.md`.
- **N-7:**
  - After the bound expires, the cut cleanup keeps running beside the sweep. A process spawned after the snapshot is not swept. This is low: activation and native admission are closed, and the native scope closed at `preClose`.
  - The startup-failure exit (`server-runtime.ts:226-232`) is neither bounded nor swept. It is not a shutdown trigger in this ticket.
- **N-8:** after this ticket there are three process-table readers: `ProcessGroupObserver`, `utils/process-tree` and the desktop copy. FU-005 can name the third.
- Windows: there is no server-side sweep, and `ClaudeSdkProcessOwner` skips SIGTERM on win32 (`claude-sdk-process-owner.ts:135`). This is accepted under the Windows scope guardrail and unchanged by this ticket.

## Latest Authoritative Result

- Review Decision: `Fail`
- Material-Premise Gate: `Pass`. P-004 is `Reachable` and drives AR-004. P-005 is `Reachable` and drives AR-005. The ARCH-REV-001 premises are resolved.
- Notes:
  - Prior findings: AR-001 resolved (DEC-005, DS-001b); AR-002 resolved by shipped `ApplicationShutdown`; AR-003 resolved (native scope plus the always-run sweep plus the D3 tree force).
  - Review focus answers:
    1. Interrupt-first at the two entry points breaks no caller. The drain flows are untouched.
    2. The bound after the barrier and the always-run sweep are sound. Exit and IPC semantics match backend-port-conflict except off POSIX (AR-004).
    3. The sweep is correctly a net beside `NativeCommandProcessScope`.
    4. The D3 order fits in the existing 2 s (AR-006).
    5. The recording point holds: the fence runs inside `app.close()`, and no `terminatedAt` is written.
  - A re-review of AR-004, plus any AR-005 and AR-006 edits, is expected to be short.

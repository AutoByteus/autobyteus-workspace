# Implementation Handoff — busy-quit-shutdown-orphan

## Upstream Artifact Package

- Upstream review applicability and handoff-rule result: Independent architecture review selected (Medium / High); ARCH-REV-003 `Pass`. Next: Code Reviewer, per `get_handoff_rules`.
- Requirements doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/busy-quit-shutdown-orphan/tickets/in-progress/busy-quit-shutdown-orphan/requirements-doc.md` (Approved, SR-002 + SR-007)
- Investigation notes: `.../busy-quit-shutdown-orphan/investigation-notes.md`
- Solution revision record: `.../busy-quit-shutdown-orphan/solution-revision-record.md` (SR-001 to SR-008)
- Design spec (required on every route): `.../busy-quit-shutdown-orphan/design-spec.md` (SR-008)
- Supplemental task artifacts: `evidence/` (E1–E9), `follow-ups.md` (FU-001 to FU-007), `architecture-design-handoff.md`
- Design review report: `.../busy-quit-shutdown-orphan/design-review-report.md` (round 3, Pass)
- Architecture review revision record: `.../busy-quit-shutdown-orphan/architecture-review-revision-record.md` (ARCH-REV-003)
- Triggering rework report, revision record, or evidence, when applicable: `code-review-report.md` round 2 (CRR-002), `code-review-revision-record.md`; `api-e2e-execution-coverage-report.md`; evidence `API-02-server-fixture-clean.json` (`sweepLines`), `API-10-app-0-server.log`

All ticket paths are under `/Users/normy/autobyteus_org/autobyteus-worktrees/busy-quit-shutdown-orphan/tickets/in-progress/busy-quit-shutdown-orphan/`.

## Current Implementation Summary

- Implementation cycle: `Rework` (IR-002, Local Fix CR-001; IR-001 was the initial round)
- Implementation revision record: `implementation-revision-record.md`
- Current implementation revision ID: `IR-002`
- Related solution revision IDs: SR-008 (design); SR-002, SR-007 (approval)
- Related architecture-review revision IDs: ARCH-REV-003
- Related code-review revision IDs: CRR-001 (Pass), CRR-002 (Fail: CR-001)
- Related API/E2E revision IDs: API-REV-001 (Fail: F-API-001 → CR-001; F-API-002 → FU-008, not implementation-owned)
- Related delivery revision IDs: N/A
- Triggering finding IDs: CR-001
- Branch `codex/busy-quit-shutdown-orphan`; base `origin/personal` @ `1a4453e553`; implementation commits `bf2857ca29` (IR-001) and `83a73f24d7` (IR-002); handoff documents and evidence in the docs commits that follow each.

What it does, in the design's order:

1. **Process-tree utility moved.** `src/utils/process-tree.ts` owns `parseProcessTable`, `readProcessTable` (sync `ps -A -o pid=,ppid=,pgid=`, 2 s timeout, throws when unreadable), `selectDescendantProcessGroups(rows, rootPid, excludedPgids)`, `selectDescendantPidsInGroup(rows, rootPid, pgid)`, `signalProcessGroups`, `processGroupsInactive`. It imports only Node. AGY's `agy-stream-process.ts` keeps its behavior through a private `listAgyBackgroundProcessGroups(agyPid)` = win32 → `[]`, else `selectDescendantProcessGroups(rows, agyPid, [agyPgid, serverPgid])`. `agy-background-process-groups.ts` is removed with no shim; its test moved to `tests/unit/utils/process-tree.test.ts`. The aggregate error text changed from "Exact AGY process-group signal failed." to "Exact process-group signal failed." (no caller matches on it).
2. **D1 stop-now.** `AgentRunManager.terminateAgentRun`: `fenceInputAndInterruptForRootShutdown()` first; not accepted → `false` (callers' existing not-found/rejected mapping), then prepare → finish as before. `stopAllAgentRuns`: after the existing activation release and snapshot, `Promise.allSettled` fences every snapshot run at once, then the existing sequential prepare → finish loop; a rejected fence or a not-accepted fence is pushed to `errors` and that run is skipped (reported in the existing `AggregateError`). `AgentRunTermination` unchanged; the manager writes no history (AC-010).
3. **D2 bounded server shutdown.** One constructor (N-9): `new ServerProcessShutdown(runtime = process, { cleanupTimeoutMs = SERVER_SHUTDOWN_TIMEOUT_MS (10 s), sweep = terminateServerProcessTree, timers = global })`. `request()`: startup barrier → `cleanupWithinBound()` (race of `cleanupOnce()` against the bound; expired → log "Server shutdown exceeded 10s; forcing exit", code 1; the cut cleanup keeps running, N-7) → **always** `sweep()` → `unconfirmed` sets code 1 (a sweep that throws is treated as `unconfirmed`, so exit is never skipped) → existing IPC result → `exit`. The IPC flush timer now uses the injected timers too.
   `readProcessTable` (IR-002, CR-001) runs `ps` with `spawnSync` and drops the row of the `ps` reader itself, so the sweep never selects, counts or signals its own reader.
   `src/shutdown/server-process-tree-sweep.ts` → `terminateServerProcessTree(deps)`: win32 → `not-applicable` (no `ps`, no signals); table unreadable or server missing → `unconfirmed`; targets = descendants in the server's own group (pids) + descendant-led groups (−pgid), recorded once; none → `confirmed, 0`; else SIGTERM (ESRCH skipped, other errors logged, continue) → poll ≤ 1.5 s (`PROCESS_TREE_GRACE_MS`) → SIGKILL recorded survivors → poll ≤ 0.5 s → `confirmed` or `unconfirmed` naming survivors. Liveness uses `kill(target, 0)`; only ESRCH proves absence.
4. **D3 desktop POSIX force.** `BaseServerManager.forceStop`: async `ps` via `execFile` (2 s timeout) → `selectServerTreeTargets(rows, serverPid)` → SIGTERM the targets → SIGKILL the server → `waitForTargetsGone(targets, 1500)` → SIGKILL survivors. Unreadable table → warns and kills the server only (as before). `electron/server/serverProcessTree.ts` is the desktop copy (Electron main cannot import server code). The 20 s window, the 2 s confirmation in `stopManagedBackend`, `ApplicationShutdown` and `WindowsServerManager` are unchanged.
5. **Docs** updated (see Key Files).

One small addition to the design's sweep shape: after SIGKILL the sweep polls up to 0.5 s before reporting, because a killed child is reported alive (`kill(pid, 0)` succeeds) until it is reaped; without the short confirmation window, a successful SIGKILL would be reported `unconfirmed`. It stays inside the sweep and adds at most 0.5 s to the ≈ 13.75 s worst case in FU-004 (→ ≈ 14.25 s, still inside the 20 s desktop window).

## Routing Classification (Mandatory)

- Task size: `Medium`
- Architecture risk: `High`
- Design classification section / evidence reference: design-spec.md § Task Size And Architectural Risk
- Classification confirmed or changed: `Confirmed`
- Evidence and rationale: two packages, existing owners only (`AgentRunManager`, `ServerProcessShutdown`, `BaseServerManager`), one helper moved, two small files added. High stays: stop semantics change for every standalone/application run, process-tree signalling at every POSIX server exit and on the desktop force path, and a changed exit-code/IPC contract.
- Selected route: `Code Review`
- Lightweight implementation self-review completed for the direct route: `Not Applicable` (High route)
- New design impact or escalation trigger: `None`. No surviving process class observed in the deterministic tests; live classes are validation's (U-A1, U-A2).

## Reviewed Behavior Implementation Trace

| Behavior ID | Approved Change / Preserved Outcome | Implemented Production Path / Key Files | Result / Notes |
| --- | --- | --- | --- |
| BEH-001 (user) | Terminate interrupts, then finishes | `agent-run-manager.ts` `terminateAgentRun`: fence → prepare → finish | Unit: busy turn interrupted, terminate after the turn ends; fence-first order; not accepted → `false` (IMP-02). Live AC-001 is API/E2E |
| BEH-001 (app, DEC-005) | Same for application terminate | Same entry point (callers unchanged) | Covered by the same code; AC-008 live probe is API/E2E |
| BEH-002 | Fence all; ≤ 10 s; sweep; exit | `stopAllAgentRuns` concurrent fence; `server-process-shutdown.ts` bound + sweep | Unit: concurrent fence, failures isolated (IMP-02); bound at 10 s → exit 1 / `failed`; bound starts after barrier (IMP-03) |
| BEH-003 | Nothing the server spawned survives | `server-process-tree-sweep.ts` (every POSIX exit); `baseServerManager.ts` `forceStop` + `serverProcessTree.ts` | Unit: targets, never the root group, re-parenting, ESRCH/EPERM, unreadable → `unconfirmed`, win32 → `not-applicable` (IMP-03). Real-process AC-011 test (IMP-04) |
| BEH-004 | 20 s wait unchanged; force kills the tree | `forceStop` POSIX only | AC-011 test passes; fails on base with CLI and tool alive (IMP-04). Window/confirmation/Windows tests unchanged and green (IMP-07) |
| BEH-005, BEH-007 | Preserved; shutdown writes no `terminatedAt` | No history dependency in `AgentRunManager` | Unit: `stopAllAgentRuns` calls no `AgentRunHistoryCatalogService.recordRunTerminated` (IMP-02). Relaunch AC-006/009/010 live: API/E2E |

- Changes stayed within the requirements doc's Scope Guardrail: `Yes`

## Key Files Or Areas

Server (`autobyteus-server-ts/`):
- `src/utils/process-tree.ts` — Add (moved and generalized)
- `src/agent-execution/backends/antigravity/stream/agy-background-process-groups.ts` — Remove
- `src/agent-execution/backends/antigravity/stream/agy-stream-process.ts` — Modify (re-pointed)
- `src/agent-execution/services/agent-run-manager.ts` — Modify (D1)
- `src/shutdown/server-process-shutdown.ts` — Modify (D2 bound, sweep, options)
- `src/shutdown/server-process-tree-sweep.ts` — Add (D2 sweep)
- `tests/unit/utils/process-tree.test.ts` — Move (from `tests/unit/agent-execution/backends/antigravity/agy-background-process-groups.test.ts`) and extend
- `tests/unit/agent-execution/backends/antigravity/agy-stream-process.test.ts` — Modify (mocks the moved utility, real selection; win32 case)
- `tests/unit/agent-execution/agent-run-manager.test.ts` — Modify (6 D1 cases)
- `tests/unit/shutdown/server-process-shutdown.test.ts` — Modify (fake sweep in every case; 6 new cases)
- `tests/unit/shutdown/server-process-tree-sweep.test.ts` — Add (9 cases)
- `tests/unit/server-runtime-app-data-migration-gate.test.ts` — Modify (mocks the sweep module; waits for `exit`)
- `docs/modules/agent_execution.md`, `docs/modules/antigravity_cli_runtime.md` — Modify

Desktop (`autobyteus-web/`):
- `electron/server/baseServerManager.ts` — Modify (POSIX `forceStop`)
- `electron/server/serverProcessTree.ts` — Add
- `electron/server/__tests__/serverProcessTree.spec.ts` — Add
- `electron/server/__tests__/ServerForceStopTree.spec.ts` — Add (AC-011, real processes, skipped on win32)
- `docs/electron_packaging.md` — Modify

## Important Assumptions

- The desktop spawns the server without `detached` (`macOSServerManager.ts:59`, `linuxServerManager.ts:56`), so the server shares Electron's group; the sweep and the desktop force select only descendants in that group, never Electron or its other children (tested).
- No server code spawns with `detached: true` (design-review-report evidence), so runtime CLIs are pids in the server's group and their tool commands/daemons lead their own groups.
- Sync `readProcessTable` stays the server's single reader (AGY needs it synchronously in its stop sequence, `agy-stream-process.ts` `stopExact`). At shutdown a ≤ 2 s blocking `ps` runs after the bounded cleanup; merging readers is FU-005.

## Known Risks

- **N-3:** user Terminate has no bound of its own; a runtime that accepts an interrupt but never ends its turn keeps Terminate pending. AC-001 is the gate.
- **N-5 / FU-007:** an expired bound gives exit 1 → on the desktop `ShutdownIncompleteError` → `app.exit(1)`; an update install is not started.
- **N-7:** after the bound expires the cut cleanup keeps running beside the sweep; a process spawned after the snapshot is not swept; the startup-failure exit (`server-runtime.ts` fatal path) is neither bounded nor swept.
- A `ps` that is missing or fails → `unconfirmed` → exit 1 (POSIX), per design.
- Zombies: a target that is dead but not yet reaped reads as alive. The 0.5 s post-SIGKILL window covers the normal reap; a zombie whose parent never reaps it would make the sweep `unconfirmed` (fails toward "not clean", never toward a false "clean").
- Windows: no server sweep; `taskkill /f /t` is the net on the forced path only (accepted).

## Task Design Health Assessment Implementation Check

- Reviewed change posture: Bug Fix
- Reviewed root-cause classification: Missing Invariant (three owners)
- Reviewed refactor decision: `Refactor Needed Now` (small: AGY selector moved to `src/utils`)
- Implementation matched the reviewed assessment: `Yes`
- If challenged, routed as `Design Impact`: `N/A`
- Evidence / notes: each invariant is enforced in its owner (`AgentRunManager`, `ServerProcessShutdown`, `BaseServerManager`); no caller fences separately; the sweep holds no exit policy.

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: `None`
- Legacy old-behavior retained in scope: `No` (unbounded cleanup wait, single-PID POSIX force and the AGY helper file are removed)
- Dead code in the touched files and modules removed: `Yes` (`selectAgyBackgroundProcessGroups`, the old helper file; nothing else found dead)
- Dead code found elsewhere, added to `follow-ups.md`: None
- Shared structures remain tight: `Yes` (sweep result is a three-variant union; `ProcessRow` unchanged)
- Canonical shared design guidance was reapplied during implementation: `Yes`
- Changed source implementation files stayed within size guardrails: `Yes` — effective non-empty lines: `agent-run-manager.ts` 384, `server-process-shutdown.ts` 100, `server-process-tree-sweep.ts` 95, `process-tree.ts` 80, `agy-stream-process.ts` 158, `baseServerManager.ts` 433, `serverProcessTree.ts` 76; no file changed by > 220 lines.
- Notes: none.

## Persisted Data Transition Check (When Applicable)

- Approved decision: `Not Affected`
- Design-spec decision reference: design-spec.md § Persisted Data / State Transition Decision
- Implementation follows the approved decision: `Yes`
- Direct-use evidence or discard/rebuild result: N/A
- Migration implementation: N/A
- Deviation: `None`

## Environment Or Dependency Notes

- The worktree needed `pnpm install` after the rebase (new `@modelcontextprotocol/client` dependency in `autobyteus-ts`), then `pnpm -C autobyteus-server-ts prebuild` and `pnpm -C autobyteus-web exec nuxt prepare`.
- The Electron binary was missing in this worktree's install (`browser-tab-manager.spec.ts`: "Electron failed to install correctly"); fixed with `node install.js` in `autobyteus-web/node_modules/electron`. Unrelated to this change.

## Checks Run

Implementation commit: `bf2857ca29` (on `d28594dc01`). Environment: macOS 26 (Darwin 25.5.0), Node 22, after `pnpm install`, server `prebuild`, `nuxt prepare`. Evidence files are in `tickets/in-progress/busy-quit-shutdown-orphan/evidence/`.

| Check ID | Command Or Steps | Commit Tested | Environment | Code It Exercises | Behavior / Criteria IDs | Result | Evidence Files | Look For |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| IMP-01 | `pnpm -C autobyteus-server-ts exec vitest run tests/unit/utils/process-tree.test.ts tests/unit/agent-execution/backends/antigravity/agy-stream-process.test.ts --no-watch` | `bf2857ca29` | macOS, Node 22 | `src/utils/process-tree.ts`, `agy-stream-process.ts` | Step 1 (move, AGY same behavior) | Pass | `IMP-01-process-tree-agy.log` | `Tests  20 passed (20)` |
| IMP-02 | `pnpm -C autobyteus-server-ts exec vitest run tests/unit/agent-execution/agent-run-manager.test.ts --no-watch`; fail-before: same test with base `agent-run-manager.ts` | `bf2857ca29` | macOS, Node 22 | `agent-run-manager.ts` stop-now methods | BEH-001, BEH-002, AC-008 (unit), AC-010 | Pass (fails 5 new cases on base) | `IMP-02-agent-run-manager.log`, `IMP-02-fail-before-base.log` | `Tests  39 passed (39)`; base: `Tests  5 failed \| 34 passed (39)` |
| IMP-03 | `pnpm -C autobyteus-server-ts exec vitest run tests/unit/shutdown tests/unit/server-runtime-app-data-migration-gate.test.ts --no-watch` | `bf2857ca29` | macOS, Node 22 | `server-process-shutdown.ts`, `server-process-tree-sweep.ts`, `server-runtime.ts` wiring | BEH-002, BEH-003, AC-003, AR-004, AR-005 | Pass | `IMP-03-shutdown-sweep-gate.log` | `Tests  41 passed (41)` |
| IMP-04 | `pnpm -C autobyteus-web exec vitest --config ./electron/vitest.config.ts run server/__tests__/ServerForceStopTree.spec.ts server/__tests__/serverProcessTree.spec.ts`; fail-before: AC-011 test with base `baseServerManager.ts` | `bf2857ca29` | macOS, Node 22, real processes | `baseServerManager.ts` `forceStop`, `serverProcessTree.ts` | BEH-003, BEH-004, AC-011 | Pass (fails on base) | `IMP-04-desktop-force-tree.log`, `IMP-04-fail-before-base.log` | `Tests  6 passed (6)`; base: `+   "cli": true,` and `+   "tool": true,` |
| IMP-05 | `pnpm -C autobyteus-server-ts typecheck` | `bf2857ca29` content | macOS, Node 22 | server `src` | — | Pass | `IMP-05-server-typecheck.log` | `exit 0` |
| IMP-06 | `pnpm -C autobyteus-web typecheck` | `bf2857ca29` content | macOS, Node 22 | Nuxt app, Electron main, build scripts | — | Pass | `IMP-06-web-typecheck.log` | `production errors: 0; test-file errors: 298 in 139 files (baseline 298 in 139 files)` |
| IMP-07 | `pnpm -C autobyteus-web test:electron run` | `bf2857ca29` | macOS, Node 22 | Electron main incl. `ManagedBackendShutdown`, `BaseServerManager`, `WindowsServerManagerShutdown` | AC-007 (desktop), DEC-007 window unchanged | Pass | `IMP-07-electron-main-suite.log` | `Tests  285 passed \| 1 skipped (286)` |
| IMP-08 | `pnpm -C autobyteus-server-ts test:unit` (full) | `bf2857ca29` content, before commit | macOS, Node 22 | all server unit suites | AC-007 (server) | Pass except tracked-imports (files not yet in git; see IMP-09) | `IMP-08-server-unit-suite-excerpt.log` | `Tests  1 failed \| 7400 passed \| 9 skipped (7410)`, the failure lists only this ticket's new files |
| IMP-09 | `pnpm -C autobyteus-server-ts exec vitest run tests/architecture/tracked-imports.test.ts --no-watch` | `bf2857ca29` | macOS, Node 22 | tracked-import hygiene | AC-007 | Pass | `IMP-09-tracked-imports.log` | `Tests  2 passed (2)` |

IR-002 (CR-001) checks, on `83a73f24d7`:

| Check ID | Command Or Steps | Commit Tested | Environment | Code It Exercises | Behavior / Criteria IDs | Result | Evidence Files | Look For |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| IMP-10 | `pnpm -C autobyteus-server-ts exec vitest run tests/unit/utils/process-tree.test.ts tests/unit/shutdown tests/unit/agent-execution/backends/antigravity/agy-stream-process.test.ts tests/unit/server-runtime-app-data-migration-gate.test.ts --no-watch`; fail-before: reader and sweep tests with IR-001's `process-tree.ts` | `83a73f24d7` | macOS, Node 22 | `utils/process-tree.ts` reader, sweep, AGY, gate wiring | BEH-003, CR-001 | Pass (4 cases fail on IR-001's reader) | `IMP-10-cr001-reader-focused.log`, `IMP-10-fail-before-ir001.log` | `Tests  63 passed (63)`; before: `Tests  4 failed \| 17 passed (21)` |
| IMP-11 | `pnpm -C autobyteus-server-ts typecheck` | `83a73f24d7` content | macOS, Node 22 | server `src` | — | Pass | `IMP-11-server-typecheck.log` | `exit 0` |
| IMP-12 | `pnpm -C autobyteus-server-ts build`, then `RUN_BUSY_STOP_NOW_E2E=1 … vitest run tests/e2e/shutdown/busy-run-stop-now.e2e.test.ts` (API/E2E's gated test, local scripted inference) | `83a73f24d7` content | macOS, Node 22, real server process | real server SIGTERM exit with the real sweep | BEH-003, CR-001 | Pass | `IMP-12-busy-stop-now-e2e.log`, `IMP-12-busy-run-stop-now.json`, `IMP-12-busy-application-terminate.json` | `Tests  2 passed (2)`; `"sweepLines": []` (API-02 logged `1 process(es)`) |

- Rerun scope for IR-002: only `utils/process-tree.ts` and two test files changed since `bf2857ca29`; IMP-01 to IMP-09 rows for other code stay valid. The full server unit suite was not rerun (no shared foundation changed); IMP-10 covers every test that exercises the reader.
- Not run, and why: server `test:integration` and E2E (API/E2E's scope; no integration test exercises the changed stop path beyond the unit/in-process ones above); live runtime (Codex/Claude) and isolated desktop journeys (AC-001, AC-002, AC-004–AC-006, AC-008 live, AC-009, AC-010 relaunch, U-A1–U-A3) are API/E2E-owned.

## Frontend Rendered-Result Check (When Applicable)

`Not Applicable`: no rendered UI changes; the desktop change is in Electron main's server-process stop path.

## Downstream Coverage Hints / Suggested Scenarios

- AC-001 / AC-008: Terminate (and an application terminate) of a Codex (`gpt-6.1-terra`, effort `medium`, throwaway `CODEX_HOME`) and a Claude run busy in a long foreground command: returns within 10 s; tool command gone.
- AC-002: server SIGTERM with busy standalone Codex/Claude runs, a Team member and an Org agent; close ≤ 10 s; process-tree snapshot (PID/PPID/PGID) shows zero descendants. Watch the server log for "Server process-tree sweep:" lines (non-zero targets mean something survived the graceful release).
- AC-003 is covered deterministically by IMP-03 (hung cleanup → 10 s → sweep → exit 1).
- AC-004/005/006/009/011 on an isolated desktop instance; AC-011 is also covered deterministically by IMP-04.
- U-A1: several busy and idle Claude runs against the 10 s bound (the finish loop is sequential); record whether a busy update install completes (N-5).
- U-A2: record Codex and Claude CLI versions; confirm the Claude CLI still survives EOF.
- U-A3: observe the desktop force path's duration (async `ps` + 1.5 s).
- A native run with a background process (`NativeCommandProcessScope` drains first; the sweep is the net).

## API / E2E / Executable Coverage Investigation And Execution Still Required

Design-spec § Change / Refactor Sequence step 6 in full: live AC-001/002/008 on Codex and Claude plus a native run; isolated desktop AC-004/005/006/009/010/011 with process-tree snapshots; the updater install path; U-A1 (busy and idle Claude runs), U-A2, U-A3; residuals N-3, N-5/FU-007, N-7 recorded in the report; the "before" baseline where cheap. Prove from a clean clone of the final branch with isolated app data.

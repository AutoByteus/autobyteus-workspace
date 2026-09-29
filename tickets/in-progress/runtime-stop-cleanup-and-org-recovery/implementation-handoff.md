# Implementation Handoff

- Package: `runtime-stop-cleanup-and-org-recovery`
- From: Implementation Engineer (`/implementation_engineer`), 2026-09-29
- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-stop-cleanup-and-org-recovery` (branch `codex/runtime-stop-cleanup-and-org-recovery`, base `origin/personal` @ `5d6179797`, finalization target `personal`)

## Upstream Artifact Package

- Upstream review applicability and handoff-rule result: independent architecture review was selected (Medium/High). ARCH-REV-002 round 2 is `Pass`. My `get_handoff_rules` result for a Large-or-High implementation → `/code_reviewer`.
- All artifacts are under `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-stop-cleanup-and-org-recovery/tickets/in-progress/runtime-stop-cleanup-and-org-recovery/`:
  - Requirements doc: `requirements-doc.md` (SR-001, user-approved 2026-09-29)
  - Investigation notes: `investigation-notes.md`
  - Solution revision record: `solution-revision-record.md` (SR-001..SR-003)
  - Design spec: `design-spec.md` (SR-003)
  - Supplemental task artifacts: `probes/gql.sh`, `probes/org-send.mjs`, `probes/create-nested-classroom-agy-org.json`, `predecessor-delivery-receipt-verification.md`, `handoff-architecture-design-complete.md`
  - Design review report: `design-review-report.md` (ARCH-REV-002, Pass; notes N-1..N-3)
  - Architecture review revision record: `architecture-review-revision-record.md` (ARCH-REV-001 Fail, ARCH-REV-002 Pass)
- Triggering rework report: N/A (initial)

## Current Implementation Summary

- Implementation cycle: `Initial`
- Implementation revision record: `.../implementation-revision-record.md`
- Current implementation revision ID: `IR-001`
- Related solution revision IDs: `SR-001`, `SR-002`, `SR-003`
- Related architecture-review revision IDs: `ARCH-REV-001`, `ARCH-REV-002`
- Related code-review / API-E2E / delivery revision IDs: `N/A`
- Triggering finding IDs: `N/A`

Summary:

- **D-A1.** New private helper `agy-background-process-groups.ts` with:
  - `parseProcessTable`;
  - `selectAgyBackgroundProcessGroups(rows, agyPid, serverPid)`, which walks descendants breadth-first over ppid and keeps groups where `pgid > 1`, the group is not AGY's or the server's own, and the leader descends from AGY;
  - `listAgyBackgroundProcessGroups(agyPid, serverPid = process.pid)`, which runs `ps -A -o pid=,ppid=,pgid=` with a 2 s timeout and returns `[]` on win32;
  - `signalProcessGroups`, which signals each group independently and skips a failure for that group only.

  `AgyStreamProcess.stop()` runs these steps only if the child is still alive (`exitCode === null && signalCode === null && pid`):
  1. List AGY's background groups.
  2. SIGTERM those groups.
  3. SIGTERM AGY.
  4. Schedule an unref'd SIGKILL sweep of the same groups after 1.5 s.

  Any helper error is logged as `AGY_BACKGROUND_GROUP_STOP_FAILED`, and AGY is still stopped. A second `stop()` is a no-op, as before.
- **D-B1.** `ConfiguredAgentExecutionHandle.isStale(run)` is `manager.getActiveRun(run.runId) !== run`.
  - `prepareTermination` and `tryPrepareTerminationIfQuiescent` return `completedLocalTermination(dispose)` for a stale run.
  - `fenceForRootShutdown` sets `rootShutdownFenced` and waits for readiness before the stale check (R-5), then returns `{accepted:true}` for a stale run.
  - A discovery failure (`AgentRunRemovalCleanupError`) is logged as `COLLABORATION_STALE_RUN_DISCOVERY_FAILED` and rethrown. The retry completes.
  - Published runs keep the existing path unchanged.
- **D-B2.** The handle holds a mutable `activationMode`, initialized from the constructor. It switches to `restore` right after `commitPublication()` at both publication sites (`initializeReady` and `prepareConfiguredActivation().commitAfterDurability`, R-4). `ConfiguredAgentActivationPlanner.prepare(config, platformAgentRunId, mode)` takes the mode per attempt; the constructor `mode` is removed with no dual API.
- **D-B3.**
  - `AgentOrgRun` has a persistent `failStopped` field, set in `enterFailStop`, which is guarded by it. `terminate()` passes `this.failStopped` and clears `this.termination` on rejection or non-acceptance (AR-002, matches `RootTeamRun`).
  - `createFrozenAgentOrgTerminationScope` clears `fencing` and `finishing` on rejection or non-acceptance.
  - The Team `createFrozenTerminationScope` clears `fencing` only; `finishing` already cleared (R-8, N-1).
- **D-B4.**
  - `AgentOrgRunManager.restore` calls `completeStoppingRun` inside `withTransition` before `assertNotActive`.
  - `AgentTeamRunManager.restoreTeamRun` calls `completeStoppingRoot` inside `withRootTransition` before the "already managed" check.
  - Both helpers work the same way. They act only when the root is registered and `!isActive()`. They call the root's own `terminate()`, never the manager's transition-wrapped one, so there is no deadlock. On accepted they unregister (idempotently) and continue the normal restore. On not-accepted or rejection they throw `AGENT_ORG_STOP_INCOMPLETE: <reason>` / `TEAM_RUN_STOP_INCOMPLETE: <reason>`.
  - A still-active root keeps "already active/managed".
  - The `TeamRunService.restoreTeamRun` pre-guard is removed (AR-001, N-2). The readiness assert still runs first (N-3). `resolveActiveTeamRun` and `resolveManagedTeamRun` are unchanged.
- **Docs.**
  - `docs/modules/antigravity_cli_runtime.md`: the F-API-001 "known limitation / future fix" paragraph is replaced with the implemented behavior and the documented limits.
  - `docs/modules/agent_team_execution.md`: per-attempt mode, stale member in Stop, retry and restore self-heal.
  - `docs/modules/agent_orgs.md`: Stop with dead members, retry, restore self-heal, crashed-member resume.

## Routing Classification (Mandatory)

- Task size: `Medium`
- Architecture risk: `High`
- Design classification section / evidence reference: design-spec.md "Task Size And Architectural Risk"; design-review-report.md "Routing Classification Review"
- Classification confirmed or changed: `Confirmed`
- Evidence and rationale:
  - 10 production files (9 modified + 1 new), about +200/−23 source lines (including comments and the 63-line helper), all inside the listed owners. No UI, GraphQL or schema change.
  - Shared Org/Team root termination and restore semantics and OS process signalling changed exactly as designed.
  - None of the escalation triggers fired:
    - stale termination skips no cleanup, because the registry already released resources on discovery;
    - restore self-heal stays inside the manager transition, plus the reviewed service guard removal;
    - the planner change affects only re-activation after a successful publication, and first activation is unchanged (tested);
    - group selection requires the leader to descend from AGY (tested with unrelated, foreign-led, own-group and pgid-1 processes, and in a real-OS check).
- Selected route: `Code Review` (`/code_reviewer`)
- Lightweight implementation self-review completed for the direct route: `Not Applicable` (independent code review route)
- New design impact or escalation trigger: `None`

## Reviewed Behavior Implementation Trace

| Behavior ID | Approved Change / Preserved Outcome | Implemented Production Path / Key Files | Result / Notes |
| --- | --- | --- | --- |
| BEH-A1 (REQ-A1, REQ-A2; AC-A1..A3) | AutoByteus-initiated stops also stop AGY's background groups; normal turn end leaves daemons running | `agy-stream-process.ts` `stop()` → `agy-background-process-groups.ts` | Implemented. All stops funnel into `stop()`: user Stop, Terminate, dispatch/listener failure, and stream/protocol `fail()` while AGY is alive. Unit tests cover SIGTERM order (groups before AGY), the delayed SIGKILL, protocol-failure cleanup, helper failure being fail-safe, and idempotent stop. A normal turn end never calls `stop()`, and the predecessor turn tests stay green. A real-OS macOS check (temporary test, not committed) found only the fake-AGY's detached group and stopped it. An unrelated detached process survived, and `ps` took 26 ms. |
| BEH-A2 (REQ-A3) | AGY self-exit: no orphan search (documented) | `stop()` skipped when `exitCode`/`signalCode` is set | Implemented and tested (close with `exitCode` set → helper never called). Documented in the AGY runtime doc. |
| BEH-B1 (REQ-B1, B2, B4; AC-B1, B2, B4) | Org/Team Terminate succeeds with a dead member; retry never blocked; restore after a stuck stop | Handle `isStale` short-circuits; `AgentOrgRun.terminate`/`failStopped`; Org and Team frozen scopes; `AgentOrgRunManager.completeStoppingRun`; `AgentTeamRunManager.completeStoppingRoot`; `TeamRunService.restoreTeamRun` guard removed | Implemented. Unit tests cover: stale prepare, tryPrepare and fence; the fence latch prevents re-activation; discovery failure surfaces once and the retry completes; Org retry after a rejected finish and after an unaccepted fence; fail-stop retry keeps `drain()` (AR-002); Org scope fence/finish retry; Team scope fence retry; Org and Team manager self-heal, `*_STOP_INCOMPLETE`, and a still-active root rejected untouched; the service lets the manager decide, with readiness first. The new Org termination and scope tests fail against the base code. |
| BEH-B2 (REQ-B3; AC-B3) | Crashed member in an active Org resumes its provider conversation | Handle `activationMode` switches to `restore` after first publication; planner `prepare(..., mode)` | Implemented. Tests cover: fresh-created external member → crash → restore_external with the persisted binding (was `COLLABORATION_AGENT_CONTINUATION_BINDING_MISSING`); switch after eager publication (native → restore_native); failed first activation keeps `fresh`; planner fresh/restore per call. |

## Key Files Or Areas

Production (`autobyteus-server-ts/src/`):

- `agent-execution/backends/antigravity/stream/agy-background-process-groups.ts` (new, 63 lines)
- `agent-execution/backends/antigravity/stream/agy-stream-process.ts`
- `agent-collaboration/execution/backends/configured-agent-execution-handle.ts`
- `agent-collaboration/execution/backends/configured-agent-activation-planner.ts`
- `agent-org-execution/domain/agent-org-run.ts`
- `agent-org-execution/domain/frozen-agent-org-termination-scope.ts`
- `agent-org-execution/services/agent-org-run-manager.ts`
- `agent-team-execution/local/flat-team-execution-manager.ts`
- `agent-team-execution/services/agent-team-run-manager.ts`
- `agent-team-execution/services/team-run-service.ts`

Tests (`autobyteus-server-ts/tests/unit/`):

- New:
  - `agent-execution/backends/antigravity/agy-background-process-groups.test.ts`
  - `agent-org-execution/frozen-agent-org-termination-scope.test.ts`
  - `agent-org-execution/agent-org-run-manager-restore-self-heal.test.ts`
  - `agent-team-execution/agent-team-run-manager-restore-self-heal.test.ts`
- Extended:
  - `agent-execution/backends/antigravity/agy-stream-process.test.ts`
  - `agent-collaboration/configured-agent-execution-handle.test.ts`
  - `agent-collaboration/configured-agent-activation-planner.test.ts` (constructor mode removed; per-call cases)
  - `agent-org-execution/agent-org-run-termination.test.ts`
  - `agent-team-execution/flat-team-execution-manager-routing.test.ts`
- Updated to the reviewed behavior: `agent-team-execution/team-run-service.test.ts`. The old "rejects a managed offline run before readiness" case asserted the removed pre-guard. It is replaced by two cases:
  - the manager self-heals and the restore is recorded;
  - readiness runs first and the manager's still-active rejection surfaces.

Docs: `autobyteus-server-ts/docs/modules/antigravity_cli_runtime.md`, `agent_team_execution.md`, `agent_orgs.md`.

## Important Assumptions

- ASM-001: AGY resumes a crashed or stopped member's conversation with `--conversation <platformAgentRunId>`. This is not verified at unit level; live validation is required.
- `AgentRun.isActive()` turns false when an AGY member's process dies. This is the predecessor behavior; `AgyAgentRunBackend.handleClose` takes the run offline. The registry's inactive discovery then removes it and releases its resources, which D-B1 relies on.
- The architecture test `agent-provider-composition-boundaries` pins the literal `this.manager.prepareAgentRunTermination(this.agentRun)`. The handle keeps that exact expression, so the boundary guard is untouched.

## Known Risks

- The residual risks from the review still apply:
  - a hard-killed app leaves AGY and its daemons running;
  - AGY-crash orphans (DEC-001), self-detaching commands (DEC-002) and Windows (DEC-003) are documented limits;
  - a daemon that ignores SIGTERM can outlive an app quit, because the SIGKILL timer is unref'd;
  - the synchronous `ps` briefly blocks the event loop per live AGY member (26 ms measured locally; 2 s cap);
  - a live run with a failed irreversible root-shutdown fence can still block termination (R-6);
  - the first stale discovery can surface `AgentRunRemovalCleanupError` once;
  - a delayed SIGKILL could hit a reused pgid (accepted, PR-003).
- Deviation from the design example shape: the helper takes `(agyPid, serverPid = process.pid)` and reads the server's own pgid from the same `ps` output, rather than taking `ownPgid`. Node has no `process.getpgid`, and the design explicitly allows the `ps` fallback. The same exclusions apply.
- Self-heal strictness: if an Org's `terminate()` reaches `terminated` but returns `accepted:false` (member-finish errors), restore throws `AGENT_ORG_STOP_INCOMPLETE`, as the design says ("otherwise throw"). The Org has already unregistered itself, so the next restore proceeds. I chose the strict reading so restore never races a member AgentRun that might still be live.

## Task Design Health Assessment Implementation Check

- Reviewed change posture: `Bug Fix` (B) + `Behavior Change` (A)
- Reviewed root-cause classification: `Missing Invariant`
- Reviewed refactor decision: `No Refactor Needed`
- Implementation matched the reviewed assessment: `Yes`
- If challenged, routed as `Design Impact`: `N/A`
- Evidence / notes: all changes are targeted invariant fixes inside the existing owners. No new public API apart from the planner's per-call `mode` and the two error codes.

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: `None`
- Legacy old-behavior retained in scope: `No`
- Dead/obsolete code removed in scope: `Yes`:
  - the planner constructor `mode`;
  - caching of failed Org termination, Org scope and Team scope fence promises;
  - the Team service pre-guard;
  - the F-API-001 "future fix" doc text;
  - the obsolete service test case.
- Shared structures remain tight: `Yes`
- Canonical shared design guidance reapplied: `Yes`
- Changed source files within size guardrails: `Yes`. Largest effective sizes: `agent-team-run-manager.ts` 466, `agent-org-run.ts` 463, `agent-org-run-manager.ts` 433. All are under 500, and the per-file delta is at most about 40 lines.
- Notes: none.

## Persisted Data Transition Check (When Applicable)

- Approved decision: `No Migration Required` (no schema change)
- Implementation follows the approved decision: `Yes`
- Direct-use evidence: restore uses the persisted execution trees and `platformAgentRunId` as-is. The self-heal path skips `recordTerminated`, but the following `recordRestored` upsert sets `terminatedAt: null` (per the review).

## Environment Or Dependency Notes

- The worktree needed a root `pnpm install --frozen-lockfile --prefer-offline`, then `pnpm exec prisma generate` and `pnpm prepare:shared` in `autobyteus-server-ts`. `prepare:shared` leaves untracked `dist/` folders in `autobyteus-application-backend-sdk` and `autobyteus-application-sdk-contracts`. These are build outputs and are not committed.

## Local Implementation Checks Run

- Focused suites for the changed owners, all green:
  - AGY folder: 110 passed, 5 skipped (live).
  - `tests/unit/agent-collaboration`: 78 passed.
  - New and extended Org/Team termination, scope, self-heal, routing and service tests: all passed.
- Full `vitest run tests/unit tests/architecture tests/integration`: 4015 passed, 148 failed, 73 skipped.
  - The 148 failures (53 files) are identical at base. Rerunning exactly those 53 files with my `src`/`tests` changes stashed gives the same 148 failures. The set difference is empty, so the change adds no failures.
  - These failures come from the environment and are unrelated to this change. Examples: `@prisma/client` ESM default export, `AgentRunManager requires all execution-family dependencies`, package admission, file-explorer/workspace/media storage, and application backend.
  - They include the 12 model-selection/Org-config failures seen at base earlier.
  - `tests/architecture` passes, including `agent-provider-composition-boundaries`.
- `tsc -p tsconfig.build.json --noEmit`: exit 0.
- `tsc -p tsconfig.json --noEmit`: 0 semantic errors. Only the repo-wide `TS6059` rootDir/tests config diagnostics remain; they predate this change.
- Real-OS check of the helper on macOS (temporary vitest file, deleted, not committed): a fake AGY node process spawns a detached `sh` with a background `sleep`. The helper returned exactly `[bgPid]`, the group was gone 500 ms after SIGTERM, an unrelated detached `sleep` survived, and `ps` took 26 ms.

## Frontend Rendered-Result Check (When Applicable)

Not Applicable. This is a server-only change with no UI, GraphQL or stream-contract change (REQ-B4 is met through server state).

## Downstream Coverage Hints / Suggested Scenarios

- AC-A1/A2 (live AGY): in `agy-background-task-live.e2e.test.ts`, the `daemonListeningAfterTerminate`/`Stop` observations should become pass/fail assertions (daemon gone, port free within a few seconds) for:
  - user Stop mid-turn;
  - idle run Terminate;
  - Team and Org Terminate;
  - graceful server shutdown.
- AC-A3: normal turn end keeps the daemon running (existing live case).
- AC-B1/B2 (probe L1): Org with an AGY member → `kill -9` the member's AGY → `terminateAgentOrgRun` returns success, the Org is not registered, and inspection and config agree it is inactive. A second Terminate is a harmless success. Then send a message → the Org restores and the member continues via `--conversation` (ASM-001).
- AC-B3 (probe L2): active Org, crashed member → `SEND_MESSAGE` to that member is accepted, the member resumes its conversation, and other members are untouched.
- R-7: cover user **Stop** as the cause of the dead member, both for an Org root agent and for a Team member inside an Org. Test Stop → Org Terminate, and Stop → message the member.
- DEC-004: a standalone Team with a crashed member → Terminate succeeds. Also a registered-but-inactive Team → `restoreAgentTeamRun` restores it and does not return "already managed".
- Regression: healthy Org/Team create/message/terminate/restore (AC-B4).

## API / E2E / Executable Coverage Investigation And Execution Still Required

- All live AGY and Org/Team validation above: AC-A1, AC-A2, AC-B1..AC-B3, ASM-001, the R-7 Stop-caused cases, and the DEC-004 standalone-Team case. Probes are in `probes/`.
- Independent source review by `/code_reviewer` comes first (High risk route).

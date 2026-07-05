# Investigation Notes

## Investigation Status

- Bootstrap Status: Complete; dedicated ticket worktree and artifacts created.
- Current Status: Design-ready investigation complete; design review round 2 rework incorporated on 2026-07-04 with concrete termination-contract owner/file/interface/test mapping.
- Investigation Goal: Identify why completed/accepted delegated transient agent teams sometimes remain visible in the frontend team tree and produce requirements plus an implementation design.
- Scope Classification (`Small`/`Medium`/`Large`): Medium
- Scope Classification Rationale: The symptom crosses delegation tools, nested team runtime lifecycle, backend active-state snapshots/events, and frontend live projections. The actual fix is bounded but it sits at a lifecycle boundary.
- Scope Summary: Fix stale active-tree visibility of transient delegated task teams after task result finalization while preserving active visibility and historical inspection.
- Primary Questions Resolved:
  - The backend owner for accepted task-team settlement is `TaskTeamSettlementCoordinator`, invoked from `TaskDelegationService.reviewTaskResult`.
  - The frontend sidebar row is a live task-team execution projection, removed only by terminal execution status or scoped root offline status.
  - The stale row is caused by backend settlement failing intermittently and by missing/reliable terminal root signal publication after accepted settlement.
  - The invariant should be: accepted task-team execution with no open child work must converge to settled/offline backend active runtime state and emit the live cleanup signal.

## Request Context

User reports an intermittent bug: in `Nested Classroom Test Team`, the `Teacher` delegated a task and later accepted the result, but the transient agent team still appears in the frontend. User-provided screenshots show the parent team tree with `StudentStudyGroup · task_0001` and members still visible, while the `Teacher` activity shows successful `delegate_task` and successful `review_task_result` with `decision: "accept"`.

Reference screenshots supplied by user:

- `/Users/normy/.autobyteus/server-data/memory/agent_teams/software_engineering_team_f20694b26f124fa6afdf0da7adb87b0b/solution_designer_054738b137f340ea872e5eb381acecad/context_files/ctx_a67ff1934031__image.png`
- `/Users/normy/.autobyteus/server-data/memory/agent_teams/software_engineering_team_f20694b26f124fa6afdf0da7adb87b0b/solution_designer_054738b137f340ea872e5eb381acecad/context_files/ctx_2373d64e485a__image.png`

## Environment Discovery / Bootstrap Context

- Project Type (`Git`/`Non-Git`): Git monorepo/superrepo
- Task Workspace Root: `/Users/normy/autobyteus_org/autobyteus-worktrees/transient-team-cleanup-bug`
- Task Artifact Folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/transient-team-cleanup-bug/tickets/in-progress/transient-team-cleanup-bug`
- Current Branch: `codex/transient-team-cleanup-bug`
- Current Worktree / Working Directory: `/Users/normy/autobyteus_org/autobyteus-worktrees/transient-team-cleanup-bug`
- Bootstrap Base Branch: `origin/personal`
- Remote Refresh Result: `git fetch origin` completed successfully on 2026-07-04.
- Task Branch: `codex/transient-team-cleanup-bug` created from `origin/personal` via `git worktree add`.
- Expected Base Branch (if known): `origin/personal`
- Expected Finalization Target (if known): `personal`
- Bootstrap Blockers: None.
- Notes For Downstream Agents: Do not use the user's shared checkout at `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo` for authoritative edits; use the dedicated task worktree above.

## Source Log

| Date | Source Type (`Code`/`Doc`/`Spec`/`Web`/`Repo`/`Issue`/`Command`/`Trace`/`Log`/`Data`/`Setup`/`Other`) | Exact Source / Query / Command | Why Consulted | Relevant Findings | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- |
| 2026-07-04 | Command | `pwd && git rev-parse --show-toplevel && git status --short --branch && ls -la` from `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo` | Discover initial environment | Initial checkout is Git repo on `personal` tracking `origin/personal` with unrelated untracked files; not a dedicated ticket worktree. | No |
| 2026-07-04 | Command | `git remote -v && git symbolic-ref refs/remotes/origin/HEAD && git worktree list --porcelain` | Determine base branch and existing worktrees | Remote default points to `origin/personal`; no existing transient cleanup worktree found. | No |
| 2026-07-04 | Command | `git fetch origin` | Refresh tracked remote refs before creating ticket worktree | Fetch completed successfully. | No |
| 2026-07-04 | Setup | `git worktree add /Users/normy/autobyteus_org/autobyteus-worktrees/transient-team-cleanup-bug -b codex/transient-team-cleanup-bug origin/personal` | Create dedicated task worktree/branch | Worktree and branch created successfully at commit `a64ee085`. | No |
| 2026-07-04 | Data | User screenshots at context file paths listed above | Capture reported behavior | Transient team remains visible while `Teacher` accepted delegated result. | No |
| 2026-07-04 | Data | `/Users/normy/.autobyteus/server-data/memory/agent_teams/nested_classroom_test_team_6eeb328bf43441858d5bc5bea74fe100/task_delegation_records.json` | Verify actual run state | `task_0001` has `status: "accepted"`; receiver address includes `taskTeamRunId: studentstudygroup_182d2d751e8f45f49b393b4ef778f555`; updates include submission and accept review. | No |
| 2026-07-04 | Log | `/Users/normy/.autobyteus/server-data/logs/server.log`, lines around `2051410-2051520` | Correlate accepted run with runtime cleanup | After child/teacher events, settlement rejected for `studentstudygroup_182d2d751e8f45f49b393b4ef778f555`: child run `student_one_d8b1fc5a5a014116b7ee516149c408b3` was not active. | Yes: implementation should test this race. |
| 2026-07-04 | Log | `rg -n "TaskTeamSettlementCoordinator: settlement rejected|already active|is not active|Cannot read properties of null" /Users/normy/.autobyteus/server-data/logs/server.log` | Check whether this is isolated | Many historical task-team settlement rejections with already-inactive runs, duplicate active run errors, and null run state. | Yes: implementation should preserve real failures but make already-final state idempotent. |
| 2026-07-04 | Code | `autobyteus-server-ts/src/agent-team-execution/task-delegation/task-delegation-service.ts`, lines `243-289` | Trace `review_task_result` | Accept persists record and publishes review/status events; for task-team execution it calls `taskTeamSettlementCoordinator.requestSettlement(...)`. | No |
| 2026-07-04 | Code | `autobyteus-server-ts/src/agent-team-execution/task-delegation/task-delegation-event-publisher.ts`, lines `80-195` | Check task-delegation event contract | Publishes activated/status/submitted/reviewed events; it marks terminal on payload but does not emit a separate `TASK_DELEGATION_TERMINAL_STATUS` event. | No if using root offline signal; yes if terminal event design chosen. |
| 2026-07-04 | Code | `autobyteus-server-ts/src/agent-team-execution/task-delegation/task-team-settlement-coordinator.ts`, lines `25-67` | Trace settlement coordinator | Stores pending settlement, waits until no open child work, calls parent `settleTaskTeamInstance`, deletes/unsubscribes/detaches/unbinds only if result accepted; logs warning otherwise. | Yes: confirm accepted path after idempotent termination. |
| 2026-07-04 | Code | `autobyteus-server-ts/src/agent-team-execution/backends/mixed/members/mixed-task-team-instance-registry.ts`, lines `100-105` | Trace task-team handle cleanup | Calls `handle.terminate()` and deletes handle only when terminate returns accepted. A rejected termination leaves the handle in active snapshots. | No |
| 2026-07-04 | Code | `autobyteus-server-ts/src/agent-team-execution/backends/mixed/members/mixed-task-team-member-handle.ts`, lines `146-159` and `246-254` | Trace task-team termination/status | `terminate()` calls `childRun.terminate()` then disposes; it does not publish a scoped root offline status. `publishStatus` maps non-error statuses to `idle`, so it currently cannot publish offline. | Yes: update. |
| 2026-07-04 | Code | `autobyteus-server-ts/src/agent-team-execution/backends/mixed/members/mixed-agent-member-handle.ts`, lines `202-210` and `239-255` | Trace child member termination | Termination restores a platform run whenever `platformAgentRunId` exists, solely to terminate it. This can fail when run is already stopped, already stopping, or already active elsewhere. | Yes: make settlement termination idempotent for inactive/absent/stopping runs. |
| 2026-07-04 | Code | `autobyteus-ts/src/agent/factory/agent-factory.ts`, lines `213-223`; `autobyteus-server-ts/src/agent-execution/backends/autobyteus/autobyteus-agent-run-backend.ts`, lines `89-90`, `179-187`; `autobyteus-server-ts/src/agent-execution/backends/autobyteus/autobyteus-agent-run-backend-factory.ts`, lines `493-500` | Trace why a just-idle member becomes not-active during cleanup | `removeAgent` deletes the agent from the active map before awaiting graceful stop; backend `isActive()` is defined by active-map membership. A second terminate while the first graceful stop is in progress sees `RUN_NOT_FOUND`. | Yes: add explicit settlement lifecycle state and idempotent termination semantics. |
| 2026-07-04 | Code | `autobyteus-server-ts/src/agent-team-execution/backends/mixed/mixed-team-manager.ts`, lines `137-154` and `332-336` | Trace active snapshots and settle result | Member snapshots include task-team handles. `settleTaskTeamInstance` publishes aggregate status only if registry settle accepted. Stale handles therefore rehydrate on snapshot connect. | No |
| 2026-07-04 | Code | `autobyteus-server-ts/src/services/agent-streaming/team-runtime-status-snapshot-service.ts`, lines `5-17` | Trace reconnect/reload input | Initial stream messages are `teamRun.getMemberStatusSnapshots()`, so backend active handles directly control rehydrated live projections. | No |
| 2026-07-04 | Code | `autobyteus-server-ts/src/services/agent-streaming/team-run-event-websocket-message-mapper.ts`, lines `36-62` and `148-163` | Trace websocket payload shape | Events with `taskTeamInstance` are flattened with `task_team_run_id`, `task_id`, `team_route_key`, `team_path`; scoped root `TEAM_STATUS` can be consumed by frontend. | No |
| 2026-07-04 | Code | `autobyteus-web/services/agentStreaming/teamTaskExecutionProjection.ts`, lines `214-253` | Trace task execution status mapping | `TASK_DELEGATION_RESULT_REVIEWED` maps to `accepted`; terminal is only `settled` or `failed`. | No |
| 2026-07-04 | Code | `autobyteus-web/services/agentStreaming/teamTaskTeamExecutionProjection.ts`, lines `244-293` | Trace task-team projection cleanup | Root scoped `TEAM_STATUS` with `offline` marks execution settled and returns cleanup; `removeTaskTeamExecutionProjection` removes root/scoped child projections/focus. | No |
| 2026-07-04 | Code | `autobyteus-web/services/agentStreaming/teamTaskExecutionEventRouter.ts`, lines `96-103` and `140-147` | Trace routing | Task-team delegation events clean up only when terminal; root `TEAM_STATUS offline` also schedules cleanup. | No |
| 2026-07-04 | Code/Test | `autobyteus-web/services/agentStreaming/__tests__/TeamStreamingService.spec.ts`, around `1817-1889`, `1891-2020` | Check intended frontend behavior | Tests already assert accepted/idle does not cleanup, root offline does cleanup, and terminal event cascades cleanup. | No frontend design change needed unless implementation chooses terminal event. |
| 2026-07-04 | Doc | `autobyteus-web/docs/agent_execution_architecture.md` and `autobyteus-web/docs/settings.md` | Check product/architecture intent | Docs describe transient task execution rows as active/pending only and cleanup after settlement/offline, while task history remains in activity/detail surfaces. | No |


Additional termination-contract findings:

- `AgentRun.terminate()` is a thin wrapper over backend termination and emits offline only when the backend returns accepted. It has no common idempotent terminating/offline state.
- Native Autobyteus `terminate()` is not idempotent: it calls `removeAgent`; if the agent is already absent from `AgentFactory.activeAgents`, it returns `RUN_NOT_FOUND`. `removeAgent` deletes the agent from `activeAgents` before awaiting graceful stop, creating an already-stopping-but-not-active window. This ordering is itself a lifecycle bug for native runtime cleanup: the runtime should either stop first and remove after stop completes, or keep a registered `stopping` entry that rejects new work but is still recognized as a known runtime during termination.
- Codex and Claude terminate paths are closer to idempotent: their managers return successfully if the thread/session is already absent.
- `TeamRun.terminate()` is also a thin backend wrapper. Mixed team backend returns `RUN_NOT_FOUND` when the team manager has no active context, rather than treating already-terminated as success for lifecycle cleanup.
- `MixedTeamManager.terminate()` has the right high-level order (task agents, task teams, persistent members, then dispose directories/context), but has no explicit `terminating`/`terminated` state.
- `MixedAgentMemberHandle.terminate()` restores an inactive platform run solely to terminate it when `platformAgentRunId` exists and disposes even if terminate returns rejected.
- `MixedTaskTeamMemberHandle.terminate()` calls child `TeamRun.terminate()` and disposes unconditionally, but does not publish a scoped root offline status. This can leave a registry handle in a rejected-but-partially-disposed state.


## Architecture Review Round 2 Rework Evidence

Architecture review round 2 failed with AR-001 because the termination-contract direction was correct but not mapped concretely enough. The follow-up design pass inspected and mapped the following owner boundaries:

- Native lifecycle owner: `autobyteus-ts/src/agent/factory/agent-factory.ts`. Current `removeAgent` deletes `activeAgents` before awaiting `agent.stop(...)`; target design stores active/routable and stopping/non-routable lifecycle entries, rejects ID reuse during stopping, joins repeated removes, and removes only after accepted stop.
- Held native backend owner: `autobyteus-server-ts/src/agent-execution/backends/autobyteus/autobyteus-agent-run-backend.ts`. Current `terminate()` maps `removeAgent(false)` to `RUN_NOT_FOUND`; target design adds held-run terminating/terminated state and treats already-stopping/already-absent held state as accepted while preserving stop errors.
- Thin native wrapper/manager decision: `autobyteus-server-ts/src/agent-execution/domain/agent-run.ts` remains a thin offline-emitting wrapper; `autobyteus-server-ts/src/agent-execution/services/agent-run-manager.ts` remains a public active-run registry whose by-id termination can still return not found when it lacks a held active run.
- Mixed team lifecycle owner: `autobyteus-server-ts/src/agent-team-execution/backends/mixed/mixed-team-manager.ts`. Current `terminate()` has close order but no `active/terminating/terminated` lifecycle state and clears context/listeners at the end; target design adds manager-owned lifecycle state, one in-flight termination promise, new-work rejection during terminating, root offline publication before disposal, and safe context cleanup.
- Mixed backend wrapper decision: `autobyteus-server-ts/src/agent-team-execution/backends/mixed/mixed-team-run-backend.ts` currently pre-rejects `terminate()` when `isActive()` is false; target design keeps active prechecks for work commands but delegates `terminate()` to the manager without a precheck. `autobyteus-server-ts/src/agent-team-execution/domain/team-run.ts` remains thin.
- Task-team binding owner: `autobyteus-server-ts/src/agent-team-execution/task-delegation/task-team-active-run-directory.ts`. Current active lookup hides known bindings when `activeRun.isActive()` is false; target design adds a separate known-entry lookup for settlement cleanup while preserving active-only lookup for routing/snapshots.
- Settlement owner: `autobyteus-server-ts/src/agent-team-execution/task-delegation/task-team-settlement-coordinator.ts`. Target design adds per-`taskTeamRunId` requested/settling/settled state and uses known directory entries for detach/unbind.
- Concrete coverage targets were identified in `autobyteus-ts/tests/unit/agent/factory/agent-factory.test.ts`, `autobyteus-server-ts/tests/unit/agent-execution/backends/autobyteus/autobyteus-agent-run-backend.test.ts`, `autobyteus-server-ts/tests/unit/agent-team-execution/mixed-team-manager.test.ts`, `autobyteus-server-ts/tests/unit/agent-team-execution/task-team-active-run-directory.test.ts`, `autobyteus-server-ts/tests/unit/agent-team-execution/task-delegation-service.test.ts`, `autobyteus-server-ts/tests/integration/agent-team-execution/task-delegation-tool-lifecycle.integration.test.ts`, and existing frontend projection tests in `autobyteus-web/services/agentStreaming/__tests__/TeamStreamingService.spec.ts`.

## Current Behavior / Current Flow

- Current entrypoint or first observable boundary: Frontend sidebar team tree for `Nested Classroom Test Team`; backend/tool boundary includes `delegate_task` and `review_task_result` tool calls by `Teacher`.
- Current execution flow:
  1. `Teacher` delegates to target team `StudentStudyGroup`.
  2. Backend materializes a task-team instance with a `taskTeamRunId` and publishes task-delegation/task-team scoped events.
  3. Frontend creates a transient task-team projection `StudentStudyGroup · task_0001` and child projections from those events.
  4. Student team submits result; parent `Teacher` reviews and accepts.
  5. `TaskDelegationService.reviewTaskResult` persists `accepted` and requests task-team settlement.
  6. `TaskTeamSettlementCoordinator` waits until no open child work, then calls parent `settleTaskTeamInstance`.
  7. `MixedTaskTeamInstanceRegistry.settle` calls task-team handle `terminate()` and deletes the handle only if termination accepts.
  8. In the bug case, settlement/termination starts shutting down `student_one`, but a repeated/concurrent terminate path sees the same member as already inactive/not-active and returns rejection. Settlement then fails to publish the task-team terminal/offline signal, and the frontend keeps or can reload the transient row.
- Ownership or boundary observations:
  - Task acceptance state is owned by task delegation ledger/service.
  - Active runtime cleanup is owned by task-team settlement and mixed runtime handle registries.
  - Frontend projection owns display cleanup but should not decide backend runtime lifecycle.
- Current behavior summary: Accepted task state and active runtime state can diverge. When active runtime settlement fails, frontend state remains consistent with the stale backend active handle, which is why the stale row can persist or reappear.

## Design Health Assessment Evidence

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Bug Fix
- Candidate root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Missing Invariant, plus boundary/ownership issue between backend settlement and frontend cleanup signal.
- Refactor posture evidence summary: A bounded lifecycle refactor is needed. The current termination path is command-like and not idempotent for settlement cleanup; root offline publication is not part of the task-team handle termination responsibility.

| Evidence Source | Observation | Design Health Implication | Follow-Up Needed |
| --- | --- | --- | --- |
| User screenshot `ctx_2373d64e485a__image.png` | `review_task_result` succeeded with `decision: "accept"` for `task_0001`. | Accepted task state exists and should drive eventual runtime settlement. | No |
| User screenshot `ctx_a67ff1934031__image.png` | `StudentStudyGroup · task_0001` remains visible under parent team tree. | Active runtime projection did not converge to settled/offline. | No |
| Persisted `task_delegation_records.json` | Same task is `accepted` and addresses the task-team run `studentstudygroup_182d2d751e8f45f49b393b4ef778f555`. | Problem is not missing acceptance persistence. | No |
| Server log line `2051478` | Settlement rejected because child run was not active. | Settlement treats already-final desired state as an error, causing stale handle retention. | Yes: test/fix idempotent termination. |
| Historical server logs | Repeated settlement rejections due to already active/inactive/null lifecycle state. | Intermittence is consistent with timing/order races around termination/restore. | Yes |
| Frontend projection code/tests | Accepted is not terminal; root offline is terminal cleanup. | Frontend cleanup contract is coherent if backend emits the root offline signal after successful settlement. | No |

## Relevant Files / Components

| Path / Component | Current Responsibility | Finding / Observation | Design / Ownership Implication |
| --- | --- | --- | --- |
| `autobyteus-server-ts/src/agent-team-execution/task-delegation/task-delegation-service.ts` | Task delegation API/service lifecycle | Accept review persists and requests task-team settlement. | Keep as entry boundary; do not move runtime cleanup into frontend. |
| `autobyteus-server-ts/src/agent-team-execution/task-delegation/task-team-settlement-coordinator.ts` | Coordinates safe settlement after no open child work | Correctly owns pending/child-event loop but rejects remain when downstream termination fails. | Keep as governing owner for readiness; rely on idempotent settle result. |
| `autobyteus-server-ts/src/agent-team-execution/backends/mixed/members/mixed-task-team-instance-registry.ts` | Active task-team handle registry | Deletes handle only when termination accepted. | Correct behavior if termination semantics are fixed. |
| `autobyteus-server-ts/src/agent-team-execution/backends/mixed/members/mixed-task-team-member-handle.ts` | Runtime handle for a task-team child run | Terminate disposes without publishing root offline; status helper cannot publish offline. | Should own root offline signal on accepted termination before disposal. |
| `autobyteus-server-ts/src/agent-team-execution/backends/mixed/members/mixed-agent-member-handle.ts` | Runtime handle for an agent team member | Termination restores stale platform state to terminate, causing race failures. | Should be idempotent for no-active-local-run termination. |
| `autobyteus-server-ts/src/agent-team-execution/backends/mixed/mixed-team-manager.ts` | Mixed team manager and status snapshots | Snapshots include task-team handles; stale handles rehydrate frontend. | Settlement must remove handles, not just emit UI event. |
| `autobyteus-server-ts/src/services/agent-streaming/team-runtime-status-snapshot-service.ts` | Initial stream status snapshots | Sends current member snapshots from backend. | Reload correctness depends on backend handle cleanup. |
| `autobyteus-server-ts/src/services/agent-streaming/team-run-event-websocket-message-mapper.ts` | Maps backend team events to websocket messages | Already flattens task-team identity for scoped root events. | Reuse for root offline event; no new transport shape required. |
| `autobyteus-web/services/agentStreaming/teamTaskExecutionProjection.ts` | Task execution status model | `accepted` is non-terminal; `settled`/`failed` terminal. | Preserve accepted-vs-settled distinction. |
| `autobyteus-web/services/agentStreaming/teamTaskTeamExecutionProjection.ts` | Task-team projection creation/removal | Root offline status triggers cleanup. | Existing cleanup path can be reused. |
| `autobyteus-web/services/agentStreaming/teamTaskExecutionEventRouter.ts` | Routes task execution projection messages | Schedules cleanup on root offline or terminal event. | No route change required if backend emits root offline. |
| `autobyteus-web/services/agentStreaming/__tests__/TeamStreamingService.spec.ts` | Frontend projection tests | Existing tests cover accepted/idle no-cleanup and offline cleanup. | Keep as regression coverage; backend tests should be added. |

## Runtime / Probe Findings

| Date | Method (`Repro`/`Trace`/`Probe`/`Script`/`Test`/`Setup`) | Exact Command / Method | Observation | Implication |
| --- | --- | --- | --- | --- |
| 2026-07-04 | Repro Evidence | User ran `Nested Classroom Test Team` and supplied screenshots | Intermittent stale transient team node after accepted result | Need backend lifecycle fix. |
| 2026-07-04 | Data Probe | Opened current `task_delegation_records.json` for `nested_classroom_test_team_6eeb328bf43441858d5bc5bea74fe100` | `task_0001` accepted; `taskTeamRunId` is `studentstudygroup_182d2d751e8f45f49b393b4ef778f555`. | Task acceptance persistence is correct. |
| 2026-07-04 | Log Probe | Inspected server log around lines `2051410-2051520` | Settlement rejected for same task-team run because child run was not active. | Stale projection has backend active-state cause. |
| 2026-07-04 | Log Probe | `rg` over settlement rejection patterns | Many previous task-team settlement rejections with already-active/already-inactive/null states. | Intermittence likely from lifecycle ordering races, not one isolated bad run. |

## External / Public Source Findings

- Public API / spec / issue / upstream source: None used.
- Version / tag / commit / freshness: N/A.
- Relevant contract, behavior, or constraint learned: N/A.
- Why it matters: This is an internal product lifecycle bug.

## Reproduction / Environment Setup

- Required services, mocks, emulators, or fixtures: Local Autobyteus server/web stack and `Nested Classroom Test Team` definition. No external services were added during investigation.
- Required config, feature flags, env vars, or accounts: Existing local Autobyteus environment.
- External repos, samples, or artifacts cloned/downloaded for investigation: None.
- Setup commands that materially affected the investigation: Created dedicated worktree only.
- Cleanup notes for temporary investigation-only setup: None.

## Findings From Code / Docs / Data / Logs

1. **Accepted task state is correct.** The persisted record for the user's current run stores `task_0001` as `accepted` and includes the accept review content. This rules out a simple ledger persistence bug.
2. **Backend settlement is the intended cleanup path.** `TaskDelegationService.reviewTaskResult` explicitly calls `TaskTeamSettlementCoordinator.requestSettlement(...)` after an accepted task-team review.
3. **Settlement rejection keeps active backend state.** The settlement coordinator only detaches/unbinds on accepted settlement. The task-team registry only deletes the task-team handle when `handle.terminate()` returns accepted. Rejection therefore leaves the task-team handle visible in status snapshots.
4. **Native remove-before-stop ordering is wrong for lifecycle cleanup.** `AgentFactory.removeAgent` currently deletes the agent from `activeAgents` before awaiting `agent.stop(...)`. Because `AutoByteusAgentRunBackend.isActive()` is based on active-map membership, the agent becomes externally `not active` while its worker is still shutting down. Correct lifecycle order should be `active -> stopping -> removed/offline`: mark or retain the runtime as stopping, reject new work, await graceful stop, then remove from active storage.
5. **Termination is not idempotent enough for settlement.** `MixedAgentMemberHandle.terminate()` can restore a platform run solely to terminate it. Also, native Autobyteus `removeAgent` marks an agent inactive immediately by deleting it from `activeAgents` before the worker has fully stopped. If settlement is entered twice or another cleanup observes the member during this window, it reports `RUN_NOT_FOUND` even though cleanup is already achieving the desired final condition.
6. **Backend does not reliably emit frontend cleanup signal.** `MixedTaskTeamMemberHandle.terminate()` disposes without publishing scoped root `TEAM_STATUS offline`, and its status helper cannot publish offline. The task-delegation event publisher also does not emit a dedicated `TASK_DELEGATION_TERMINAL_STATUS` event.
7. **Frontend behavior is consistent with current contracts.** It should not remove on `accepted` alone, because accepted means the task record is finalized but does not prove runtime settlement. It already removes on scoped root offline or terminal settled/failed event.
8. **Reload correctness requires backend handle cleanup.** Initial stream snapshots are generated from backend member status snapshots, which include active task-team handles. A frontend-only cleanup would still allow stale rows to reappear after reconnect/reload if the backend handle remains.

## Constraints / Dependencies / Compatibility Facts

- The active frontend tree must not lose active transient task teams while task work/pending review is still meaningful.
- Historical delegated task execution evidence should remain inspectable.
- Frontend cleanup already has a usable root-offline path and should be reused.
- Backend active runtime state is authoritative for reconnect snapshots; it must be cleaned, not hidden locally.
- No compatibility wrapper should preserve stale active task-team handles after accepted settlement.

## Open Unknowns / Risks

- Exact server test scaffolding for mixed task-team settlement may require locating existing mixed team manager/handle tests or adding a focused unit test harness.
- Some historical `TypeError: Cannot read properties of null (reading 'runId')` logs are consistent with repeated event wakeups being able to enter destructive settlement paths while another close is still awaiting. Implementation should introduce explicit per-task-team settlement lifecycle state so wakeups observe/advance state instead of starting independent close operations, and fix any same-path null guard encountered.
- If implementation uses a dedicated `TASK_DELEGATION_TERMINAL_STATUS` event instead of root offline, it must avoid mixing task record status (`accepted`) with execution projection status (`settled`).

## Notes For Architect Reviewer

The user explicitly endorsed the direction that robust `AgentRun.terminate()` and `TeamRun.terminate()` contracts should make task-team settlement simple and deterministic. This strengthens the design recommendation: fix native agent run stop/remove ordering and mixed team run terminating/terminated lifecycle first, then keep settlement as thin orchestration rather than duplicating child-agent close semantics.

The design should keep lifecycle authority in the backend. The frontend's accepted/idle behavior is intentional and already covered by tests. The backend must (a) make settlement termination idempotent for already-final child runs, (b) remove active task-team handles/bindings on accepted settlement, and (c) publish/forward the existing scoped root offline event so live projections clean up. Round 2 review feedback has been incorporated into the design spec with explicit native `AgentFactory`/`AutoByteusAgentRunBackend`/`AgentRun`/`AgentRunManager`, mixed `MixedTeamRunBackend`/`MixedTeamManager`/`TeamRun`, task-team directory, migration, and test mappings.

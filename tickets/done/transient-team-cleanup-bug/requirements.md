# Requirements Doc

## Status (`Draft`/`Design-ready`/`Refined`)

Design-ready

## Goal / Problem Statement

A transient delegated agent team created by `delegate_task` can remain visible in the frontend team tree after its result has been reviewed and accepted by the parent agent. The reported reproduction uses `Nested Classroom Test Team`: `Teacher` delegated `task_0001` to `StudentStudyGroup`, then accepted the returned result via `review_task_result`, but the left sidebar still shows `StudentStudyGroup · task_0001` and its member agents under the parent run.

The behavior is intermittent. Runtime evidence shows the task record reached `accepted`, but backend task-team settlement sometimes rejects cleanup because a child member run is already inactive or collides with restore/active-run state. When settlement rejects, the task-team handle remains in the backend active projection, so the frontend keeps or rehydrates the transient row.

## Investigation Findings

- The user's screenshots show both sides of the bug: `review_task_result` succeeded with `decision: "accept"`, while `StudentStudyGroup · task_0001` remained visible in the Workspaces team tree.
- Persisted task data confirms the latest inspected `Nested Classroom Test Team` run stored `task_0001` as `accepted` with a task-team receiver address containing `taskTeamRunId: studentstudygroup_182d2d751e8f45f49b393b4ef778f555`.
- Backend code persists and emits accepted task review state, then calls `TaskTeamSettlementCoordinator.requestSettlement(...)` for task-team executions.
- Frontend projection code intentionally treats `accepted` as non-terminal; it removes transient task-team projections only when it receives either a terminal task-delegation event (`settled`/`failed`) or a scoped root `TEAM_STATUS` with `status: "offline"`.
- Backend currently does not reliably emit the scoped root offline/terminal signal for task-team settlement. `MixedTaskTeamMemberHandle.terminate()` disposes without publishing a root offline status, and `TaskDelegationEventPublisher` does not publish `TASK_DELEGATION_TERMINAL_STATUS`.
- More importantly, settlement itself is intermittently rejected. The server log for the user's current run contains: `TaskTeamSettlementCoordinator: settlement rejected for 'studentstudygroup_182d2d751e8f45f49b393b4ef778f555': Run 'student_one_d8b1fc5a5a014116b7ee516149c408b3' is not active.` Immediately before that, the same log shows settlement/termination started removing `student_one`: the event stream closed, `Removing agent ... Attempting graceful shutdown` was logged, and the worker stop was requested. `AgentFactory.removeAgent` deletes the agent from the active map before awaiting graceful stop, while `AutoByteusAgentRunBackend.isActive()` uses that active-map membership. Therefore a concurrent or repeated terminate/settle call can observe the agent as `not active` while it is already being intentionally shut down by cleanup.
- Historical log lines show repeated settlement rejections for task-team runs due to already-inactive child runs, duplicate active runs, and null lifecycle state. The likely race is at termination time: `TaskTeamSettlementCoordinator` currently has no explicit task-team settlement lifecycle state, so multiple child-event wakeups can re-enter settlement as if they were independent close commands; additionally, `MixedAgentMemberHandle.terminate()` restores a platform agent run solely to terminate it whenever `platformAgentRunId` is present. During task-team settlement, child agents can already be stopping/stopped or registered elsewhere, so restore/terminate can fail even though the desired final state is already achieved.

## Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Bug Fix
- Initial design issue signal (`Yes`/`No`/`Unclear`): Yes
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Missing Invariant, with a boundary/ownership signal between backend runtime settlement and frontend transient projection cleanup.
- Refactor posture (`Likely Needed`/`Likely Not Needed`/`Deferred`/`Unclear`): Likely Needed, bounded to lifecycle termination/settlement responsibilities.
- Evidence basis: Accepted task record plus server-log settlement rejection for the same `taskTeamRunId`; current backend termination path is not idempotent for already-stopped child runs; current frontend cleanup contract expects a root offline or terminal event that backend does not reliably send.
- Requirement or scope impact: The fix must enforce backend convergence from accepted task-team result to settled/offline active runtime state, then emit the existing frontend cleanup signal. UI-only filtering would not satisfy reload/reconnect correctness.

## Recommendations

Fix the backend settlement path rather than masking the node in the frontend. Task-team acceptance should converge to one authoritative invariant: after the accepted delegated result has no open child work, the transient task-team active handle is terminated idempotently, removed from active directories/snapshots, and a scoped root terminal/offline signal is emitted for live frontend cleanup. Preserve persisted task records and activity history.

## Scope Classification (`Small`/`Medium`/`Large`)

Medium

## In-Scope Use Cases

- A parent team agent delegates a task to a child team, the child team completes, and the parent accepts the task result.
- The delegated child team may finish or stop before the parent's review/acceptance settles the runtime.
- The frontend team tree displays active transient task teams while delegated work is in progress or awaiting review.
- The frontend team tree removes completed transient task teams after accepted settlement, both via live updates and after reconnect/reload.
- Existing task-delegation history/activity remains inspectable.

## Out of Scope

- Changing task solving, task review language, scoring, or acceptance semantics.
- Deleting historical task-delegation records, activity logs, memory, or run evidence.
- Redesigning the full team tree UI or static team membership model.
- Changing static child-team visibility.
- Introducing a new frontend lifecycle system when existing scoped root offline cleanup can be reused.

## Functional Requirements

- `REQ-001`: Delegated transient task teams must have an authoritative lifecycle state that distinguishes active/in-progress teams from completed/finalized active runtime instances.
- `REQ-002`: When a parent agent accepts a delegated task-team result, the backend must request settlement of the corresponding task-team instance.
- `REQ-003`: Settlement must wait while the child task-team still has open child work, but must converge after child work is complete, even if child member runs have already independently stopped.
- `REQ-004`: Termination during task-team settlement must be idempotent for the desired final state: already-inactive, already-stopping, or already-absent child member runs must not block settlement cleanup.
- `REQ-005`: Task-team settlement must be modeled as a single-owner lifecycle transition for each `taskTeamRunId`: child events and review acceptance may wake the coordinator, but only the task-team lifecycle owner may transition the instance into `settling`, so duplicate signals cannot become duplicate destructive close operations.
- `REQ-006`: Successful settlement must remove the task-team active handle/binding so backend status snapshots and reconnect/reload paths do not rehydrate the transient task-team row.
- `REQ-007`: Successful settlement must emit an authoritative live signal that existing frontend projection cleanup can consume, preferably the scoped root `TEAM_STATUS` with `status: "offline"` already recognized by the frontend.
- `REQ-008`: Active delegated task teams must remain visible in the frontend team tree while work is active or awaiting review.
- `REQ-009`: Historical data needed to inspect completed delegated execution must remain persisted and accessible through existing history/activity/detail surfaces.
- `REQ-010`: The fix must handle intermittent timing/order cases where task result review, child run completion, shutdown, and status events arrive in different orders.
- `REQ-011`: The fix must not treat real active-run termination failures as success; idempotency applies only when the run is already in the desired inactive/absent state.
- `REQ-012`: The settlement design must rely on clear `AgentRun`/`TeamRun` termination contracts: terminate active work, converge already-stopping/already-offline state to success for lifecycle cleanup, avoid restoring inactive runs solely to terminate them, and avoid partial disposal on rejected active termination.
- `REQ-013`: Native Autobyteus runtime removal must not delete the active runtime entry before graceful stop has completed or before a distinct `stopping` state is recorded. The lifecycle must be `active -> stopping -> removed/offline`, with new work rejected during `stopping`.
- `REQ-014`: Task-team settlement should remain thin after termination contracts are fixed: it should request child `TeamRun.terminate()`, then on accepted termination remove task-team active bindings and publish the terminal/offline signal, instead of duplicating child-agent lifecycle logic inside settlement.

## Acceptance Criteria

- `AC-001`: Given a delegated team task is in progress, the active team tree shows the transient task team and its member projections.
- `AC-002`: Given a delegated task-team result is accepted via `review_task_result`, and child work is no longer open, backend settlement succeeds even if a child member run has already stopped or is already being stopped by another cleanup path before settlement calls terminate.
- `AC-003`: Given duplicate child events or repeated coordinator wakeups for the same `taskTeamRunId`, they are handled as lifecycle signals against the current task-team settlement state; after the instance is `settling` or `settled`, no second independent close sequence is started.
- `AC-004`: Given successful task-team settlement, the backend emits a scoped root `TEAM_STATUS` with `status: "offline"` or an equivalent existing terminal signal recognized by the frontend.
- `AC-005`: Given the frontend receives the accepted review event, it may mark the projection accepted but must not remove it until the settlement/offline signal arrives.
- `AC-006`: Given the frontend receives the scoped root offline signal for the task-team run, it removes the transient task-team root, its scoped child members, nested task-agent projections, and focus references without requiring application restart.
- `AC-007`: Given the frontend reconnects or reloads after accepted settlement, initial backend status snapshots do not include the settled task-team handle, so the completed transient row does not reappear.
- `AC-008`: Given historical logs/activity are inspected, the accepted delegated task and nested team execution evidence remain available through existing history/detail surfaces.
- `AC-009`: Given a real active child run termination fails for reasons other than already-inactive/absent state, settlement must surface the failure rather than silently hiding active work.

## Constraints / Dependencies

- Must respect existing team-run and agent-run lifecycle owners.
- Must not hide static child teams or normal team members as a side effect.
- Must not rely on frontend-only ephemeral filtering when backend active snapshots can still contain stale task-team handles.
- Must account for live websocket/event ordering and status snapshot reconstruction.
- Should reuse the existing frontend root-offline cleanup behavior instead of adding a parallel cleanup policy.
- No backward-compatibility shim is required; this is an internal bug fix on the current lifecycle contract.

## Assumptions

- `StudentStudyGroup · task_0001` is a transient task-team execution instance created for a delegated task, not a durable/static child team definition.
- The active Workspaces team tree is intended to show currently active/recent runtime structure, not every historical completed transient child execution.
- `review_task_result` acceptance is the authoritative task finalization action, while runtime cleanup may wait until child work is safe to settle.
- Existing frontend tests around root offline cleanup represent the intended live cleanup contract.

## Risks / Open Questions

- Some historical log lines include `TypeError: Cannot read properties of null (reading 'runId')`; these are consistent with duplicate destructive termination paths mutating shared team context while another termination is still awaiting. Implementation should add explicit settlement lifecycle state and idempotent termination semantics, then verify whether any same-path null guard remains.
- If there are backend consumers that rely on seeing settled task-team handles in status snapshots, they must be updated or rejected as relying on stale active state.
- If implementation chooses `TASK_DELEGATION_TERMINAL_STATUS` instead of scoped root offline, it must ensure the payload semantics do not conflate task record status (`accepted`) with execution projection status (`settled`).

## Requirement-To-Use-Case Coverage

- Delegated task in progress: `REQ-001`, `REQ-007`; `AC-001`.
- Accepted task-team settlement: `REQ-002`, `REQ-003`, `REQ-004`, `REQ-005`, `REQ-006`, `REQ-010`, `REQ-011`, `REQ-012`, `REQ-013`, `REQ-014`; `AC-002`, `AC-003`, `AC-009`.
- Live frontend cleanup: `REQ-007`, `REQ-010`; `AC-004`, `AC-005`, `AC-006`.
- Reload/re-query after acceptance: `REQ-006`; `AC-007`.
- Historical evidence retention: `REQ-009`; `AC-008`.

## Acceptance-Criteria-To-Scenario Intent

- `AC-001` protects legitimate active task-team visibility.
- `AC-002` captures the log-observed settlement race.
- `AC-003` verifies repeated async signals are lifecycle wakeups, not independent close commands.
- `AC-004` makes backend settlement observable to the frontend through an authoritative signal.
- `AC-005` preserves the distinction between task acceptance and runtime settlement.
- `AC-006` captures the user-reported stale live UI symptom.
- `AC-007` distinguishes durable backend state correctness from a pure live reducer fix.
- `AC-008` prevents solving active-tree cleanup by deleting history.
- `AC-009` prevents overbroad error swallowing.

## Approval Status

Approved by user on 2026-07-04 for the structured, deterministic settlement approach, refined by user direction that robust `AgentRun.terminate()` and `TeamRun.terminate()` contracts should carry the close semantics. Settlement should then be thin and deterministic: call child team termination, remove active task-team bindings on success, and publish terminal/offline status.

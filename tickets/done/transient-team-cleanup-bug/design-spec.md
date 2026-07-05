# Design Spec

## Current-State Read

The delegated task-team flow already has the right product split between task-history state and live runtime state, but the runtime lifecycle contracts underneath settlement are incomplete.

Current flow:

1. A parent agent calls `delegate_task` to a target team such as `StudentStudyGroup`.
2. The backend creates a transient task-team instance with a concrete `taskTeamRunId` and stores that identity in the task-delegation record.
3. The frontend receives task-team-scoped task-delegation and status events, then inserts a transient live projection such as `StudentStudyGroup · task_0001`.
4. The child team submits a result; the parent calls `review_task_result` with `decision: "accept"`.
5. `TaskDelegationService.reviewTaskResult` persists `accepted`, publishes review/status events, and asks `TaskTeamSettlementCoordinator` to settle the task-team instance.
6. The settlement coordinator waits until no open child work remains, then calls `TeamRun.settleTaskTeamInstance(...)` on the parent team run.
7. In the mixed backend, `MixedTaskTeamInstanceRegistry.settle(...)` resolves the active task-team handle, calls `MixedTaskTeamMemberHandle.terminate()`, and deletes the handle only if termination returns `accepted: true`.
8. Frontend projection cleanup happens only after terminal execution status (`settled`/`failed`) or a task-team-scoped root `TEAM_STATUS` with `status: "offline"`.

The stale row happens when step 7 fails or does not emit the terminal/offline signal. Runtime logs for the inspected run show settlement rejected because child member run `student_one_d8b1fc5a5a014116b7ee516149c408b3` was observed as inactive. Immediately preceding logs show cleanup had already started removing the same agent. Native Autobyteus `AgentFactory.removeAgent` deletes the agent from `activeAgents` before awaiting graceful stop, and `AutoByteusAgentRunBackend.isActive()` is based on active-map membership. A repeated/concurrent termination can therefore observe a child as `not active` while that child is already being intentionally stopped by cleanup.

Additional current-state defects that make the symptom intermittent:

- `TaskTeamSettlementCoordinator` has pending subscriptions but no explicit per-`taskTeamRunId` settlement lifecycle state; child events can wake settlement while a close sequence is already awaiting.
- `TaskTeamActiveRunDirectory.resolveActiveEntryByTaskTeamRunId` hides known task-team bindings when `activeRun.isActive()` is false, which is exactly the state settlement must be able to clean up after acceptance.
- `MixedAgentMemberHandle.terminate()` restores a platform run solely to terminate it when `platformAgentRunId` exists. During settlement, this can turn an already-final/stopping desired state into an `already active`, `not active`, or null-state failure.
- `MixedTeamRunBackend.terminate()` pre-checks `isActive()` and returns `RUN_NOT_FOUND` before delegating to `MixedTeamManager`; therefore the manager cannot own idempotent `terminating`/`terminated` semantics.
- `MixedTeamManager.terminate()` has the right high-level order, but no `active -> terminating -> terminated` state or in-flight termination promise. It also clears event listeners after disposal without a clear root-offline publication contract.
- `MixedTaskTeamMemberHandle.terminate()` disposes unconditionally after child terminate and currently does not reliably publish the task-team-scoped root offline signal.
- Backend active snapshots include task-team handles. A stale backend handle is therefore not just a live-event problem; it can rehydrate after reconnect/reload.

The target design must preserve legitimate active/pending task-team visibility, preserve task history, and fix backend convergence rather than adding UI-only filtering.

## Intended Change

User-confirmed design direction: keep task-team settlement thin and deterministic by making the lower-level runtime termination contracts trustworthy. Settlement should be ordered lifecycle management, not a broad task-delegation rewrite and not a frontend workaround.

The key behavioral invariant is:

```text
accepted task-team result + no open child work
  -> child TeamRun.terminate() converges to terminated/offline
  -> parent task-team active handle and directory binding are removed
  -> existing scoped root offline signal reaches frontend
```

The implementation should make three lifecycle layers explicit:

1. **Native agent run termination**: `AgentFactory` and `AutoByteusAgentRunBackend` must represent `active -> stopping -> offline/removed`; new work is rejected during `stopping`, while held `AgentRun.terminate()` calls converge successfully when the run is already stopping/offline.
2. **Mixed team run termination**: `MixedTeamManager` must represent `active -> terminating -> terminated`; new work is rejected during `terminating`, repeated terminate calls join the same close sequence, and root offline is published exactly once before context disposal.
3. **Task-team settlement**: `TaskTeamSettlementCoordinator` must serialize each `taskTeamRunId` through `settlement_requested -> settling -> settled` and use known task-team directory bindings, not only currently-active ones, so a known-but-stopping/offline child run can still be detached and unbound.

No broad frontend rewrite is needed. Existing frontend behavior that treats `accepted` as non-terminal should remain intact.

### Correct Task-Team Settlement Lifecycle Order

The intended lifecycle is state-ordered:

1. `review_task_result(accept)` records task status `accepted` and asks the task-team settlement owner to settle the specific `taskTeamRunId`.
2. The settlement owner records/observes `settlement_requested` for that `taskTeamRunId`.
3. Child status/task events are wakeups only; they do not own close behavior.
4. If child work is still open, the lifecycle remains `settlement_requested` and waits for another wakeup.
5. When no child work is open, the coordinator transitions exactly once from `settlement_requested` to `settling`.
6. In `settling`, new delivery for that transient task-team instance is rejected by the runtime layer, then child runtimes close through the child `TeamRun.terminate()` contract.
7. Child close is convergent: active work is terminated; already-stopping/already-offline child state is treated as the desired final state; real active termination failure remains a failure.
8. After child close accepts, remove the active task-team handle, detach the child task-delegation run service, unbind the directory entry, and publish/forward one scoped root `offline` signal.
9. Mark settlement `settled`; retain task history/records separately.

This is lifecycle ownership, not an ad-hoc "prevent duplicate" patch. Repeated async signals are normal; they should observe or advance the single lifecycle state rather than each starting an independent destructive close.

### Design Direction: Make Settlement Thin By Fixing Termination

The settlement path should not learn how to close every internal agent. It should rely on the child `TeamRun` and held `AgentRun` contracts.

Target shape:

```text
TaskTeamSettlementCoordinator
  -> parent TeamRun.settleTaskTeamInstance(logicalTeamRouteKey, taskTeamRunId)
  -> MixedTaskTeamInstanceRegistry.settle(...)
  -> MixedTaskTeamMemberHandle.terminate()
  -> child TeamRun.terminate()
  -> accepted: registry deletes handle; coordinator detaches/unbinds; scoped root offline is published/forwarded
```

Therefore implementation priority is:

1. fix native `AgentRun` termination semantics (`active -> stopping -> offline/removed`),
2. fix mixed `TeamRun` termination semantics (`active -> terminating -> terminated`),
3. keep task-team settlement as deterministic orchestration over those contracts.

### Termination Contract Clarification

- `AgentRun.terminate()` means "converge this held run handle to offline." If active, terminate gracefully. If already stopping/offline, return accepted for lifecycle cleanup. A public by-id manager command may still report `RUN_NOT_FOUND` when it has no active held run object.
- Native Autobyteus must not make a known runtime disappear while graceful stop is in progress. It must either retain the entry with state or move it to a distinct `stopping` registry. This design chooses a distinct lifecycle entry in `AgentFactory`: active/routable entries and stopping/non-routable entries are both known to removal.
- `TeamRun.terminate()` means "converge this team run and its owned children to terminated/offline." The mixed manager owns `active -> terminating -> terminated`, one in-flight close sequence, root offline publication, and safe context disposal.
- Runtime handles must not restore inactive platform state solely to terminate it.
- Runtime handles must not dispose active references after rejected active termination unless the rejection itself proves the desired terminal state has already been reached.
- Task-team settlement stays small: it asks for child team termination, then removes task-team active bindings and lets existing events/snapshots carry the result.

## Task Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Bug Fix.
- Current design issue found (`Yes`/`No`/`Unclear`): Yes.
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Missing lifecycle invariant, with a boundary/ownership issue between active runtime cleanup and frontend projection cleanup.
- Refactor needed now (`Yes`/`No`/`Deferred`/`Unclear`): Yes, bounded to termination contracts plus task-team settlement lifecycle.
- Evidence: Persisted task record is `accepted`, but server log line `2051478` rejects settlement for the same `taskTeamRunId` because a child run is not active. Current frontend code/tests intentionally wait for root offline/terminal status before removing task-team projections. Current backend runtime paths do not reliably converge to that state.
- Design response: Put convergence into backend runtime owners. Accepted task-team settlement must converge to active handle removal and scoped root offline publication after open work is gone.
- Refactor rationale: This is not display-only. Backend active handle state feeds reconnect snapshots, so UI filtering would leave stale authoritative state.
- Intentional deferrals and residual risk: Do not introduce a new task-delegation terminal event unless implementation proves root offline cannot carry the contract. Historical null-state settlement errors should be rechecked after the explicit `TeamRun` lifecycle state is implemented; if unrelated, record a follow-up.

## Terminology

- `Task record status`: task-delegation ledger status, e.g. `active`, `awaiting_review`, `accepted`.
- `Task-team execution status`: live runtime/projection status for a transient task-team instance, e.g. `active`, `settled`, `failed`, `offline`.
- `Task-team instance`: the transient concrete team run created for one delegated task, identified by `taskTeamRunId`.
- `Structural team`: the durable configured team member, e.g. `StudentStudyGroup`, not the transient `StudentStudyGroup · task_0001` projection.
- `Routable active`: a runtime that can accept new user/tool/delivery commands.
- `Known stopping/terminating`: a runtime no longer routable, but still owned by a lifecycle close sequence and recognizable by terminate/cleanup.
- `Offline/terminated`: terminal runtime state after accepted stop and active-handle cleanup. History may remain persisted separately.

## Design Reading Order

Read this design from:

1. lifecycle/data-flow spines,
2. ownership boundaries,
3. file responsibilities and interface contracts,
4. migration/test sequence.

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- Required clean-cut replacements:
  - Replace native remove-before-stop active-map deletion with an explicit `stopping` lifecycle entry.
  - Replace mixed team terminate-without-state with manager-owned `active -> terminating -> terminated`.
  - Remove restore-platform-run-solely-for-termination behavior from `MixedAgentMemberHandle.terminate()`.
  - Replace silent/unconditional task-team handle disposal with accepted-only disposal and scoped root offline publication/forwarding.
- This change must not preserve a compatibility branch that keeps stale task-team handles active after accepted settlement.

## Data-Flow Spine Inventory

| Spine ID | Scope (`Primary End-to-End`/`Return-Event`/`Bounded Local`) | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | `review_task_result(accept)` on parent agent | Backend task-team active handle removed/directory unbound | `TaskTeamSettlementCoordinator` with parent mixed runtime registries | Core stale-row cause is failed backend settlement after accepted task. |
| DS-002 | Return-Event | Successful task-team/child team termination | Frontend task-team projection removed | Child `MixedTeamManager` publishes root offline; `MixedTaskTeamMemberHandle` bridges/fallbacks; frontend projection router consumes | Live UI must receive an authoritative cleanup signal. |
| DS-003 | Primary End-to-End | Frontend reconnect/initial stream snapshot | No completed task-team projection rehydrated | `MixedTeamManager.getMemberStatusSnapshots` via snapshot service | Proves fix is not just live-event cleanup. |
| DS-004 | Bounded Local | Child task-team status/task events | Pending settlement lifecycle advances by one owner; repeated child events are wakeups | `TaskTeamSettlementCoordinator` | Explains intermittent ordering/race handling. |
| TC-001 | Primary End-to-End | Held `AgentRun.terminate()` / held `TeamRun.terminate()` | Accepted offline/terminated result with no new work accepted during stop | Native `AgentFactory` + `AutoByteusAgentRunBackend`; mixed `MixedTeamManager` + `MixedTeamRunBackend` | The user-approved design depends on lower-level termination contracts, not settlement-specific child-agent cleanup. |

## Primary Execution Spine(s)

- DS-001: `Teacher review_task_result(accept)` -> `TaskDelegationService.reviewTaskResult` -> task ledger persist/publish accepted review -> `TaskTeamSettlementCoordinator.requestSettlement` -> known child binding lookup -> child-open-work check -> lifecycle transition to `settling` -> `TeamRun.settleTaskTeamInstance` -> `MixedTeamManager.settleTaskTeamInstance` -> `MixedTaskTeamInstanceRegistry.settle` -> `MixedTaskTeamMemberHandle.terminate` -> child `TeamRun.terminate` -> accepted result -> registry handle delete -> coordinator run-registry detach + active-directory unbind.
- DS-003: Frontend stream connect/reload -> `TeamRuntimeStatusSnapshotService.getInitialMessages` -> `TeamRun.getMemberStatusSnapshots` -> `MixedTeamManager.getMemberStatusSnapshots` -> task-team handles list -> settled handle absent -> frontend has no transient row to rehydrate.
- TC-001 native: held `AgentRun.terminate()` -> `AgentRun` thin wrapper -> `AutoByteusAgentRunBackend.terminate` lifecycle state -> `AgentFactory.removeAgent` active/stopping lifecycle entry -> native `agent.stop(...)` -> backend accepted -> `AgentRun` emits offline.
- TC-001 mixed: held `TeamRun.terminate()` -> `TeamRun` thin wrapper -> `MixedTeamRunBackend.terminate` delegates without active precheck -> `MixedTeamManager.terminate` single in-flight close -> child task agents/task teams/persistent members terminate -> root offline event -> context/directory disposal -> accepted.

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | After an accept review, task state changes to `accepted`; runtime cleanup is requested but waits until child work is closed. Once safe, settlement terminates the transient task-team handle idempotently and removes active bindings. | Task delegation record, task-team instance identity, known child team run, mixed task-team handle | `TaskTeamSettlementCoordinator` for readiness; `MixedTaskTeamInstanceRegistry` for handle lifetime | Event publication, history persistence, lower-level termination semantics |
| DS-002 | On accepted child team termination, backend publishes or forwards a scoped root offline status using existing task-team identity fields. Frontend sees root offline and removes the transient root plus descendants. | Child team root `TEAM_STATUS`, scoped parent task-team root, frontend task-team projection root | `MixedTeamManager` owns child root offline; `MixedTaskTeamMemberHandle` owns scoped bridge/fallback | Websocket mapping, cleanup scheduling, focus repair |
| DS-003 | On reconnect, frontend receives snapshots of currently active backend handles only. Because successful settlement deleted the task-team handle and unbound the directory, no stale row is reconstructed. | Backend member snapshots, task-team handle registry, frontend team context | `MixedTeamManager` snapshot owner | Historical records are separate from active snapshots |
| DS-004 | Settlement may be requested before child status events have fully settled. The coordinator subscribes to child events and advances explicit lifecycle state once `hasOpenChildWork` becomes false. | Pending settlement state, child event wakeups, child work check | `TaskTeamSettlementCoordinator` | Subscription cleanup, repeated wakeups |
| TC-001 | Held runtime termination is a convergent lifecycle command. Active work is stopped; already stopping/terminated state returns accepted; public by-id commands can still report unknown if they lack a held runtime object. | Held run object, backend lifecycle state, native factory/mixed manager lifecycle state | Native `AgentFactory`/`AutoByteusAgentRunBackend`; mixed `MixedTeamManager` | Offline event emission, manager active-run registry cleanup |

## Spine Actors / Main-Line Nodes

- `TaskDelegationService.reviewTaskResult`: entry boundary for accepting/revising a delegated task result.
- `TaskTeamSettlementCoordinator`: governing owner for safe task-team runtime settlement after acceptance.
- `TaskTeamActiveRunDirectory`: binding directory for task-team instances; it must support both routable-active lookup and known-binding lookup for settlement cleanup.
- `TaskDelegationRunRegistry`: active child task-delegation service registry for child team runs.
- `AgentFactory`: native Autobyteus runtime owner for active/stopping agent instances.
- `AutoByteusAgentRunBackend`: server backend adapter for held native `AgentRun` termination semantics.
- `AgentRun`: thin public wrapper that emits offline when backend termination accepts.
- `MixedTeamRunBackend`: server backend adapter for mixed `TeamRun`; it gates routable commands but delegates terminate to the manager lifecycle.
- `MixedTeamManager`: owning runtime manager for mixed team lifecycle, child closure order, root offline publication, and context disposal.
- `MixedTaskTeamInstanceRegistry`: active task-team handle registry for a parent mixed team run.
- `MixedTaskTeamMemberHandle`: lifecycle handle for one transient child team run; bridges/fallbacks scoped root offline and disposes only after accepted termination.
- `MixedAgentMemberHandle`: lifecycle handle for child member agents inside a mixed team; terminates held runs without restore-for-terminate.
- Frontend task-team projection router/reducer: display owner that consumes existing root offline/terminal events.

## Ownership Map

- `TaskDelegationService` owns task record transitions and review authorization. It does not own low-level runtime handle deletion.
- `TaskTeamSettlementCoordinator` owns the invariant "accepted task-team + no open child work -> request runtime settlement and detach/unbind on success." It does not terminate child agents directly.
- `TaskTeamActiveRunDirectory` owns task-team binding lookup. It must distinguish active/routable lookup from known-binding lookup.
- `AgentFactory` owns native agent lifecycle storage: active/routable vs stopping/non-routable vs absent/offline.
- `AutoByteusAgentRunBackend` owns held native run termination convergence and maps factory lifecycle results to `AgentOperationResult`.
- `AgentRun` remains a thin wrapper; it must not duplicate factory/backend state.
- `AgentRunManager` remains an active-run registry for public by-id operations; it must not become the owner of held-run stopping state.
- `MixedTeamManager` owns mixed team lifecycle state, one in-flight termination sequence, child termination order, root offline publication, and safe context/directory disposal.
- `MixedTeamRunBackend` remains an adapter; it gates routable commands by `isActive()` but does not pre-reject `terminate()`.
- `TeamRun` remains a thin wrapper over backend-owned semantics.
- `MixedTaskTeamInstanceRegistry` owns the map of active task-team handles and deletion after accepted termination.
- `MixedTaskTeamMemberHandle` owns represented child team handle lifecycle, parent-scoped event bridge/fallback, and directory unbind during dispose.
- `MixedAgentMemberHandle` owns individual agent member runtime termination behavior and local resource disposal.
- `TeamRuntimeStatusSnapshotService` owns initial stream snapshots only; it reflects backend active state rather than filtering task history.
- Frontend projection files own in-memory display projection cleanup only after backend signals terminal/offline execution state.

## Thin Entry Facades / Public Wrappers (If Applicable)

| Facade / Entry Wrapper | Governing Owner Behind It | Why It Exists | Must Not Secretly Own |
| --- | --- | --- | --- |
| `review_task_result` tool / `TaskDelegationService.reviewTaskResult` | Task ledger for task status; `TaskTeamSettlementCoordinator` for runtime settlement | Provides agent-facing task review API | Direct task-team handle deletion or frontend cleanup policy |
| `AgentRun.terminate()` | Backend-specific run owner (`AutoByteusAgentRunBackend` for native) | Common held-run command API and offline event emission | Native factory active/stopping state or manager by-id lookup policy |
| `AgentRunManager.terminateAgentRun(runId)` | Held `AgentRun` if still active in manager registry | Public by-id command route | Idempotent cleanup for run objects it no longer holds |
| `TeamRun.terminate()` | Backend-specific team run owner (`MixedTeamManager` through `MixedTeamRunBackend`) | Common held-team command API | Mixed team lifecycle state or child close order |
| Websocket `TEAM_STATUS` message | Backend team/member lifecycle owners | Transport event to frontend | Lifecycle authority or stale-state filtering |
| Frontend projection cleanup scheduler | Backend scoped root offline/terminal event | Removes local transient projection after authoritative signal | Backend lifecycle correction or history deletion |

## Removal / Decommission Plan (Mandatory)

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By Which Owner / File / Structure | Scope (`In This Change`/`Follow-up`) | Notes |
| --- | --- | --- | --- | --- |
| Native remove-before-stop behavior in `AgentFactory.removeAgent` | It creates a window where a known stopping agent is reported as unknown/not active. | `AgentFactory` active/stopping lifecycle entry and idempotent `removeAgent` for active/stopping identities. | In This Change | New work remains rejected during stopping. |
| Backend `terminate()` relying on active-map membership only | Held `AgentRun.terminate()` should converge already stopping/offline state to accepted. | `AutoByteusAgentRunBackend` local termination state plus factory `removeAgent` idempotency. | In This Change | Public manager unknown remains distinct. |
| `MixedTeamRunBackend.terminate()` active precheck | It prevents `MixedTeamManager` from owning terminating/terminated idempotency. | Direct delegation to `MixedTeamManager.terminate()`. | In This Change | Other work commands keep the active precheck. |
| Mixed manager terminate-without-state behavior | It allows concurrent close paths and null context races. | `MixedTeamManager` private `active/terminating/terminated` state and in-flight termination promise. | In This Change | Root offline before disposal. |
| Restore-platform-run-solely-for-termination path in `MixedAgentMemberHandle.terminate` | It turns already-inactive desired state into settlement failure and races with active-run registration. | Terminate held local run if present; otherwise dispose local resources and accept. | In This Change | Do not alter restore behavior for message delivery/start paths. |
| Dispose-after-rejected-termination in member handles | It hides active termination failure and leaves partially disposed active handles. | Dispose only after accepted termination or already-absent state. | In This Change | Active failures must remain visible. |
| Silent task-team handle disposal without root offline | Frontend already has a root-offline cleanup contract. | Child `MixedTeamManager` root offline bridged/fallbacked by `MixedTaskTeamMemberHandle`. | In This Change | Avoid adding a parallel terminal event unless proven necessary. |
| Frontend accepted-as-terminal cleanup idea | It would hide active cleanup failures and conflate task status with runtime state. | Backend scoped root offline plus active handle removal. | Rejected | Keep accepted non-terminal. |

## Return Or Event Spine(s) (If Applicable)

- Successful child `MixedTeamManager.terminate()` publishes a root `TEAM_STATUS offline` event before clearing listeners/context.
- `MixedTaskTeamMemberHandle` is subscribed to child team events; it prefixes the child root offline event with the represented task-team `sourcePath` and `taskTeamInstance` so existing websocket mapping emits `task_team_run_id`, `task_id`, `team_route_key`, and `team_path`.
- If there is no child run or no child root offline was observed during accepted termination, `MixedTaskTeamMemberHandle` publishes one scoped root offline fallback before `dispose()`.
- Frontend receives the mapped root offline event and existing projection code removes the transient task-team root and descendants.

## Bounded Local / Internal Spines (If Applicable)

- `TaskTeamSettlementCoordinator`: `requestSettlement` -> state `settlement_requested` -> subscribe/child wakeups -> `hasOpenChildWork` -> atomic transition to `settling` -> parent settle -> success cleanup to `settled` or failure return to requested/error state with warning.
- Native `AgentFactory.removeAgent`: normalize id -> lookup lifecycle entry -> if `active`, mark same entry `stopping` and start one stop promise -> if `stopping`, join existing stop promise -> after accepted stop, delete entry (offline/removed) -> return true; if no entry, return false.
- `AutoByteusAgentRunBackend.terminate`: if local state `terminated`, return accepted; if `terminating`, return the same promise; otherwise close stream, mark `terminating`, call factory remove; accepted/absent converges to local `terminated`, stop error returns runtime failure.
- `MixedTeamManager.terminate`: if `terminated`, return accepted; if `terminating`, return same promise; otherwise mark `terminating`, terminate task agents, task teams, and persistent members in order, publish root offline, dispose registries/directories/context, mark `terminated`.

## Off-Spine Concerns Around The Spine

- Event mapping stays in existing websocket mapper and frontend streaming projection files; no new transport schema is required for the preferred path.
- Task-delegation history persistence remains separate from active runtime cleanup.
- Native factory lifecycle state is internal to `autobyteus-ts`; server-side backends consume it through `removeAgent`/`getAgent` behavior rather than reaching into internal maps.
- The public run managers (`AgentRunManager`, `AgentTeamRunManager`) remain active-run registries. They do not own backend-specific stopping/terminating state.
- Test harnesses should validate contracts near the owner files rather than adding broad end-to-end-only coverage.

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area | Reuse / Extend / Create-New Decision | Notes |
| --- | --- | --- | --- |
| Task review acceptance | `task-delegation` service | Reuse | Entry behavior is correct. |
| Safe settlement after child work | `TaskTeamSettlementCoordinator` | Extend | Add explicit per-run settlement state and known binding lookup. |
| Task-team active binding | `TaskTeamActiveRunDirectory` | Extend | Add known-entry lookup; keep active lookup for routable paths. |
| Native agent lifecycle | `autobyteus-ts/src/agent/factory/agent-factory.ts` | Extend | Add active/stopping lifecycle entry; no new manager. |
| Held native run backend semantics | `AutoByteusAgentRunBackend` | Extend | Add local terminating/terminated state and convergent terminate. |
| Mixed team lifecycle | `MixedTeamManager` and `MixedTeamRunBackend` | Extend | Add active/terminating/terminated state and adjust terminate delegation. |
| Task-team root offline event | Existing `TEAM_STATUS` event bridge/mapper/frontend cleanup | Reuse | Preferred over new terminal event. |
| Frontend cleanup | Existing `teamTaskTeamExecutionProjection` and router tests | Reuse | No redesign. |

## Subsystem / Capability-Area Allocation

| Subsystem / Capability Area | Target Ownership | Concrete Change |
| --- | --- | --- |
| Native Autobyteus runtime (`autobyteus-ts`) | `AgentFactory` owns native active/stopping storage | Replace raw active-only map semantics with lifecycle entries that recognize stopping removals and reject ID reuse during stopping. |
| Server agent execution backend | `AutoByteusAgentRunBackend` owns held-run termination semantics; `AgentRun` remains thin | Make terminate convergent for already stopping/offline held runs; keep send/approval/interrupt rejected when not active/routable. |
| Server agent run management | `AgentRunManager` owns active-run registry only | No lifecycle ownership expansion; by-id unknown can remain not found. |
| Server mixed team backend | `MixedTeamManager` owns mixed team lifecycle; backend adapts | Add terminating state/promise and root offline; remove terminate active-precheck in backend. |
| Task-team settlement | `TaskTeamSettlementCoordinator` owns readiness and settlement state | Add per-task-team lifecycle state and use known directory entry. |
| Task-team active directory | Directory owns active and known binding indexes | Add known-entry lookup and preserve active-only lookup for work routing/snapshots. |
| Mixed member handles | Handles own represented member lifecycle and bridging | Remove restore-for-terminate; dispose only after accepted terminate; bridge/fallback offline. |
| Frontend projections | Projection owners consume backend events | Verify existing accepted-non-terminal/root-offline cleanup; source changes only if payload shape changes. |

## Draft File Responsibility Mapping

The initial file mapping is intentionally broad enough to cover the lower-level contracts from design review AR-001. The final mapping below is authoritative for implementation.

| File / Area | Candidate Responsibility |
| --- | --- |
| `autobyteus-ts/src/agent/factory/agent-factory.ts` | Native active/stopping/offline lifecycle storage and remove ordering. |
| `autobyteus-server-ts/src/agent-execution/backends/autobyteus/autobyteus-agent-run-backend.ts` | Held native run termination convergence and command gating. |
| `autobyteus-server-ts/src/agent-execution/backends/autobyteus/autobyteus-agent-run-backend-factory.ts` | Wire backend to factory without bypassing lifecycle owner. |
| `autobyteus-server-ts/src/agent-execution/domain/agent-run.ts` | Thin wrapper decision/offline emission after accepted backend termination. |
| `autobyteus-server-ts/src/agent-execution/services/agent-run-manager.ts` | Active-run registry decision; no stopping-state ownership. |
| `autobyteus-server-ts/src/agent-team-execution/backends/mixed/mixed-team-run-backend.ts` | Mixed command gate adapter; terminate delegation. |
| `autobyteus-server-ts/src/agent-team-execution/backends/mixed/mixed-team-manager.ts` | Mixed active/terminating/terminated lifecycle, close sequence, root offline, context disposal. |
| `autobyteus-server-ts/src/agent-team-execution/domain/team-run.ts` | Thin wrapper decision. |
| `autobyteus-server-ts/src/agent-team-execution/task-delegation/task-team-active-run-directory.ts` | Active vs known task-team binding queries. |
| `autobyteus-server-ts/src/agent-team-execution/task-delegation/task-team-settlement-coordinator.ts` | Per-task-team settlement lifecycle and detach/unbind. |
| `autobyteus-server-ts/src/agent-team-execution/backends/mixed/members/*` | Member/task-team handle termination and bridge behavior. |
| Tests | Owner-local regression tests plus existing frontend contract checks. |

## Reusable Owned Structures Check

| Candidate Repeated Structure / Logic | Existing Owner | Extraction / Reuse Decision | Semantically Tight? | Avoid |
| --- | --- | --- | --- | --- |
| Native runtime lifecycle state | `AgentFactory` | Keep private in factory unless implementation needs a tiny local type alias. | Yes: `active` means routable, `stopping` means known non-routable. | A public broad compatibility wrapper. |
| Backend termination state | `AutoByteusAgentRunBackend` and `MixedTeamManager` | Keep local to each owner; no shared generic lifecycle helper. | Yes: agent and team lifecycles have different owners/effects. | A catch-all `LifecycleManager` with mixed semantics. |
| Task-team scoped identity | Existing `TaskTeamInstanceIdentity` | Reuse. | Yes. | Duplicate frontend/backend identity schema. |
| Active vs known task-team directory entry | `TaskTeamActiveRunDirectory` | Add explicit known lookup, not a generic flag parameter. | Yes: active lookup is for routable work; known lookup is for cleanup. | One ambiguous `resolve(..., includeInactive)` selector. |
| Idempotent operation result construction | Existing local `AgentOperationResult` builders | Keep local unless duplicated substantially during implementation. | Yes. | A broad wrapper that swallows active failures. |

## Shared Structure / Data Model Tightness Check

| Shared Structure / Type / Schema | One Clear Meaning Per Field? (`Yes`/`No`) | Redundant Attributes Removed? (`Yes`/`No`) | Parallel / Overlapping Representation Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| `TaskTeamInstanceIdentity` | Yes | Yes | Low | Reuse for scoped offline event and directory binding. |
| `TaskDelegationStatus.accepted` vs runtime `offline/settled` | Yes if kept separate | Yes | Medium | Do not make accepted terminal in frontend. |
| Native `active` / `stopping` / absent-offline | Yes when stored in factory lifecycle entry | Yes | Medium | Active/routable queries must not return stopping entries; remove must recognize them. |
| Mixed `active` / `terminating` / `terminated` | Yes when stored in manager | Yes | Medium | Backend work commands use active only; terminate delegates to manager state. |
| `TeamRunStatusUpdateData.status` | Yes | Yes | Low | Preserve `offline` for root team status events. |

## Final File Responsibility Mapping

| File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-ts/src/agent/factory/agent-factory.ts` | Native Autobyteus runtime | Native agent lifecycle owner | Replace active-only `Map<string, Agent>` semantics with lifecycle entries that distinguish `active` and `stopping`; `removeAgent` atomically marks stopping, joins repeated removes, awaits `agent.stop(...)`, then removes/offlines; `createAgent`, `createAgentWithId`, and `restoreAgent` must reject IDs that are active or stopping; `getAgent`/`listActiveAgentIds` remain active/routable only. | The factory already owns native agent construction/storage/removal. | Internal lifecycle entry type. |
| `autobyteus-server-ts/src/agent-execution/backends/autobyteus/autobyteus-agent-run-backend.ts` | Server agent execution backend | Held native `AgentRun` backend | Add local `active/terminating/terminated` terminate state/promise; keep `isActive()` true only when backend state is active and factory resolves active; `postUserMessage`, approval, and interrupt stay rejected when not active; `terminate()` returns accepted for active removal, already stopping, or already absent held run state, and returns failure only for thrown stop errors. | This adapter translates native factory lifecycle into server `AgentOperationResult`. | Existing `AgentOperationResult`. |
| `autobyteus-server-ts/src/agent-execution/backends/autobyteus/autobyteus-agent-run-backend-factory.ts` | Server agent execution backend | Native backend construction boundary | Keep dependency direction through factory callbacks; pass `getAgent` for active/routable `isActive` and `removeAgent` for lifecycle removal. Do not expose factory internals to callers. | Existing factory constructs the backend and owns this adapter wiring. | None. |
| `autobyteus-server-ts/src/agent-execution/domain/agent-run.ts` | Server agent execution domain | Thin held-run facade | Remain thin: delegate to backend `terminate()` and emit local offline status once when accepted. Do not add native stopping storage here. | Common wrapper should not own backend-specific lifecycle. | Existing status payload helpers. |
| `autobyteus-server-ts/src/agent-execution/services/agent-run-manager.ts` | Server agent run management | Active-run registry | Explicit no lifecycle expansion. `getActiveRun`/`terminateAgentRun(runId)` remain active-by-id APIs and may return not found once the manager no longer holds an active run. Cleanup paths that hold an `AgentRun` call that held run directly. | Prevents mixing public manager lookup with backend lifecycle ownership. | None. |
| `autobyteus-server-ts/src/agent-team-execution/backends/mixed/mixed-team-run-backend.ts` | Mixed team backend adapter | Team command gate + lifecycle adapter | Keep active prechecks for work/delivery/start/settle commands; change `terminate()` to delegate to `teamManager.terminate()` without `isActive()` precheck so manager owns terminating/terminated idempotency. | Backend already adapts `TeamRun` interface to manager. | Existing result builders. |
| `autobyteus-server-ts/src/agent-team-execution/backends/team-manager.ts` | Team backend contract | Manager interface | No required public method addition. Semantics of `hasActiveMembers()` remain routable-active; terminate idempotency lives behind `terminate()`. | Avoids generic lifecycle API unless implementation needs it. | None. |
| `autobyteus-server-ts/src/agent-team-execution/backends/mixed/mixed-team-manager.ts` | Mixed team runtime | Mixed team lifecycle owner | Add private lifecycle state `active/terminating/terminated` plus `terminationPromise`; reject new work when not active; terminate task agents, task teams, then persistent members; on accepted termination publish root `TEAM_STATUS offline` before disposing registries/directories/context/listeners; repeated terminate during `terminating` joins the same promise; terminated terminate returns accepted. | This class already owns child registries, status publication, and context disposal. | Existing `TeamRunStatusUpdateData`. |
| `autobyteus-server-ts/src/agent-team-execution/domain/team-run.ts` | Team execution domain | Thin held-team facade | Remain thin: delegate `terminate()` and status observation to backend. Do not add mixed lifecycle state here. | Common wrapper should not own backend-specific close order. | Existing status observation. |
| `autobyteus-server-ts/src/agent-team-execution/task-delegation/task-team-active-run-directory.ts` | Task delegation runtime directory | Task-team binding directory | Add `resolveKnownEntryByTaskTeamRunId(...)` that clones a binding without requiring `activeRun.isActive()`; keep `resolveActiveRun`, `resolveActiveEntryByTaskTeamRunId`, and `listActiveEntriesForParent` active-only for routable/snapshot paths. | Directory already owns taskTeamRunId/childRunId/parent indexes. | `TaskTeamInstanceIdentity`. |
| `autobyteus-server-ts/src/agent-team-execution/task-delegation/task-team-settlement-coordinator.ts` | Task delegation settlement | Settlement readiness/lifecycle owner | Replace pending-only map with per-run state (`settlement_requested`, `settling`, `settled`); use known directory entries for subscription/detach; treat child events as wakeups; transition to `settling` exactly once; on accepted parent settle, detach child run registry and unbind directory; on rejected settle, keep enough state to surface/retry without deleting active handle. | Coordinator already owns readiness and cleanup after accepted review. | Directory/run registry APIs. |
| `autobyteus-server-ts/src/agent-team-execution/backends/mixed/members/mixed-agent-member-handle.ts` | Mixed member runtime | Agent member lifecycle handle | Change `terminate()` to call held `agentRun.terminate()` if a local run object exists; do not `ensureReady()` solely because `platformAgentRunId` exists; if no local run exists, dispose local resources and return accepted; dispose only after accepted terminate. | The method already owns member termination. | `AgentOperationResult`. |
| `autobyteus-server-ts/src/agent-team-execution/backends/mixed/members/mixed-task-team-member-handle.ts` | Mixed task-team runtime | Task-team member lifecycle/bridge handle | Change `terminate()` to call child `TeamRun.terminate()` if present; dispose only after accepted; bridge child root offline; publish one scoped root offline fallback if no child root offline was observed or no child run exists; update `publishStatus` to preserve `offline` instead of mapping all non-error statuses to idle. | The handle already owns represented child team lifecycle and parent-scoped event bridge. | `TaskTeamInstanceIdentity`, `TeamRunStatusUpdateData`. |
| `autobyteus-server-ts/src/agent-team-execution/backends/mixed/members/mixed-task-team-instance-registry.ts` | Mixed task-team runtime | Active task-team registry | Keep/delete handle only after accepted `handle.terminate()`; no deletion on rejected termination; tests assert accepted settlement deletes the handle. | Registry owns active handle map. | Existing handle API. |
| `autobyteus-ts/tests/unit/agent/factory/agent-factory.test.ts` | Tests | Native factory contract | Add tests for stop-after-mark-stopping, repeated remove joining, active IDs excluding stopping, ID reuse rejected while stopping, and final removal. | Tests belong with native owner. | Existing test utilities. |
| `autobyteus-server-ts/tests/unit/agent-execution/backends/autobyteus/autobyteus-agent-run-backend.test.ts` | Tests | Held native backend contract | Add/adjust terminate tests: terminate does not require `isActive()` true, repeated terminate accepted, post/approval still not found while inactive, thrown stop failure remains failure. | Tests belong near server backend adapter. | Existing fake native agent. |
| `autobyteus-server-ts/tests/unit/agent-team-execution/mixed-team-manager.test.ts` or new adjacent mixed termination test | Tests | Mixed `TeamRun` contract | Add repeated terminate/new-work-during-terminating/root-offline-before-dispose tests. | Tests belong with mixed manager owner. | Existing manager test helpers. |
| `autobyteus-server-ts/tests/unit/agent-team-execution/task-team-active-run-directory.test.ts` | Tests | Directory active vs known lookup | Add known-entry lookup test where `activeRun.isActive()` is false: active lookup returns null but known lookup returns binding and unbind works. | Tests belong with directory owner. | Existing fake runs. |
| `autobyteus-server-ts/tests/unit/agent-team-execution/task-delegation-service.test.ts` and/or `autobyteus-server-ts/tests/integration/agent-team-execution/task-delegation-tool-lifecycle.integration.test.ts` | Tests | Settlement lifecycle | Add accepted task-team settlement case with known-but-not-active/stopping child and duplicate wakeups; assert single settle path, detach/unbind, offline signal, no stale snapshot. | Coverage spans service/coordinator/runtime. | Existing integration harness. |
| `autobyteus-web/services/agentStreaming/__tests__/TeamStreamingService.spec.ts` | Frontend projections | Existing frontend contract | Run/keep tests proving accepted is non-terminal and root offline removes scoped task-team projections; modify only if payload shape changes. | Frontend source behavior should not change. | Existing test harness. |

## Ownership Boundaries

Authority changes hands at these boundaries:

- Task review authority: agent tool -> `TaskDelegationService.reviewTaskResult` -> task ledger. Only this layer changes task record status to `accepted`.
- Runtime settlement authority: task service -> `TaskTeamSettlementCoordinator` -> parent `TeamRun.settleTaskTeamInstance`. Only settlement/mixed runtime owners remove active task-team handles.
- Native agent termination authority: held `AgentRun` -> `AutoByteusAgentRunBackend` -> `AgentFactory`. The factory owns active/stopping storage; the backend owns held-run convergence semantics.
- Mixed team termination authority: held `TeamRun` -> `MixedTeamRunBackend` -> `MixedTeamManager`. The manager owns state, close order, root offline, and disposal.
- Runtime member authority: task-team handle -> child `TeamRun.terminate()` -> child member handles. Member handles decide held-run cleanup; they do not recreate inactive state for cleanup.
- Live display authority: backend scoped root offline event -> frontend projection cleanup. Frontend removes local projection but does not decide backend runtime is settled.
- Snapshot authority: backend mixed manager active handles -> snapshot service -> frontend initial context. History records are not active-handle snapshots.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanism(s) It Encapsulates | Upstream Callers That Must Use The Boundary | Forbidden Bypass Shape | If Boundary API Is Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| `TaskDelegationService.reviewTaskResult` | Ledger review transition, event publishing, settlement request | Task delegation tools | Tool code deleting active handles | Extending service/coordinator contract |
| `TaskTeamSettlementCoordinator.requestSettlement` | Settlement state map, child event subscription, open-work check, detach/unbind after accepted settle | Task delegation service | UI reducers or task service reaching into mixed registries | Add coordinator method/result if needed |
| `TaskTeamActiveRunDirectory` | Task-team active and known binding indexes | Coordinator, task-team handle, routing helpers | Callers maintaining parallel taskTeamRunId maps | Add explicit active/known lookup methods |
| `AgentFactory.removeAgent` | Native active/stopping storage and stop promise | Native backend factory/backend | Server backend reaching into `activeAgents`/stopping maps | Add narrow factory method if truly needed |
| `AutoByteusAgentRunBackend.terminate` | Held native run termination state/promise | `AgentRun` | `AgentRun` or manager duplicating native stopping state | Strengthen backend options/result mapping |
| `MixedTeamManager.terminate` | Mixed lifecycle state, child registry termination, root offline, context disposal | `MixedTeamRunBackend` | Backend pre-rejecting terminate on inactive/terminating before manager sees it | Delegate terminate directly to manager |
| `MixedTaskTeamInstanceRegistry.settle` | Resolve task-team handle and delete on accepted termination | `MixedTeamManager.settleTaskTeamInstance` | Coordinator reaching into registry map | Extend registry API |
| `MixedTaskTeamMemberHandle.terminate` | Child team terminate, scoped root lifecycle bridge/fallback, disposal | Registry terminate/settle | Registry publishing represented team lifecycle separately | Add explicit handle method/status helper |
| Frontend `removeTaskTeamExecutionProjection` | Local tree/context/focus cleanup | Event router/service | Backend returning mutated UI tree | Add frontend projection helper tests |

## Dependency Rules

- `TaskDelegationService` may depend on `TaskTeamSettlementCoordinator`, not on mixed runtime handles directly.
- `TaskTeamSettlementCoordinator` may depend on `TaskTeamActiveRunDirectory`, `TaskDelegationRunRegistry`, and parent `TeamRun.settleTaskTeamInstance`; it must not terminate child agents directly or publish frontend-specific events.
- `TaskTeamSettlementCoordinator` must use a known-entry directory lookup for settlement cleanup; routable-active lookup remains for work routing.
- `MixedTaskTeamMemberHandle` may publish task-team-scoped `TEAM_STATUS offline` only as represented child team lifecycle bridge/fallback. It must not decide task ledger status.
- `MixedAgentMemberHandle.terminate` must not call `ensureReady()` merely because `platformAgentRunId` exists. `ensureReady()` remains appropriate for message delivery/start paths.
- `MixedTeamRunBackend.terminate` must not pre-check `isActive()`; other command methods should continue to reject new work when `isActive()` is false.
- `AgentRunManager` and `AgentTeamRunManager` must not become owners of backend-specific stopping/terminating lifecycle state for this fix.
- Frontend projection code must not infer cleanup from `accepted` alone.
- Snapshot service must not filter historical task records; it should only reflect active runtime handles supplied by the backend.

## Interface Boundary Mapping

| Interface / API / Query / Command / Method | Subject Owned | Responsibility | Accepted Identity Shape(s) | Target Semantics |
| --- | --- | --- | --- | --- |
| `reviewTaskResult(context, input)` | Task delegation record | Validate reviewer, persist review, request settlement | `task_id` plus caller context | Returns accepted task status, not necessarily runtime-settled status. |
| `requestSettlement(taskTeamInstance)` | Task-team runtime settlement | Record/wake settlement lifecycle for one task-team run | `TaskTeamInstanceIdentity` | Idempotent: repeated requests observe same lifecycle state. |
| `TaskTeamActiveRunDirectory.resolveActiveEntryByTaskTeamRunId` | Routable active task-team binding | Return only active/routable child entries | `taskTeamRunId` | Existing behavior retained for routing/snapshots. |
| `TaskTeamActiveRunDirectory.resolveKnownEntryByTaskTeamRunId` (new) | Known task-team binding | Return known binding even if child run is stopping/offline | `taskTeamRunId` | Used by settlement detach/unbind and child event subscription cleanup. |
| `AgentFactory.removeAgent(agentId)` | Native agent lifecycle | Converge active/stopping native agent to stopped/removed | native `agentId` / platform run id | Active starts one stop; stopping joins; absent returns false; stop error throws. |
| `AutoByteusAgentRunBackend.isActive()` | Held native run routability | Report whether held native run accepts new work | backend-local `runId` | False during terminating/terminated or when factory no longer has active entry. |
| `AutoByteusAgentRunBackend.terminate()` | Held native run lifecycle | Converge held run to offline | backend-local `runId` | Accepted for active/stopping/already-absent held run; failure for thrown stop error. |
| `AgentRun.terminate()` | Held agent run facade | Delegate backend terminate and emit offline when accepted | held run | Remains thin; no native state. |
| `AgentRunManager.terminateAgentRun(runId)` | Public active-run registry | Terminate by id only if manager still holds active run | public `runId` | May return not found for unknown/inactive manager entries. |
| `TeamRun.terminate()` | Held team run facade | Delegate backend terminate | held team run | Remains thin; backend owns lifecycle. |
| `MixedTeamRunBackend.isActive()` | Mixed team routability | Gate new work commands | backend-local team run id | True only while manager lifecycle is active/routable. |
| `MixedTeamRunBackend.terminate()` | Mixed team lifecycle adapter | Delegate terminate to manager without active precheck | backend-local team run id | Lets manager return accepted for terminating/terminated. |
| `MixedTeamManager.terminate()` | Mixed team lifecycle | Run one close sequence, publish root offline, dispose safely | manager-local context | `active -> terminating -> terminated`; repeated terminate joins/accepts. |
| `settleTaskTeamInstance(logicalTeamRouteKey, taskTeamRunId, reason)` | Parent team active task-team instance | Terminate and remove active task-team handle | logical team route key + task-team run id | Reason informational; accepted only after handle termination accepted. |
| `MixedTaskTeamMemberHandle.terminate()` | One transient child team runtime | Terminate child run, ensure scoped root offline, dispose on accepted | handle-local identity | Rejected child termination keeps handle undisposed. |
| `MixedAgentMemberHandle.terminate()` | One agent member runtime | Terminate held local run or accept no-local-run state | handle-local member run id | Must not restore solely for termination. |
| Scoped root `TEAM_STATUS offline` | Live task-team execution projection | Signal runtime settled/offline | payload includes `task_team_run_id` and root source path | Existing frontend cleanup consumes this. |

## Interface Boundary Check

| Interface | Responsibility Is Singular? (`Yes`/`No`) | Identity Shape Is Explicit? (`Yes`/`No`) | Ambiguous Selector Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| `reviewTaskResult` | Yes | Yes | Low | None. |
| `requestSettlement` | Yes | Yes | Low | Add lifecycle state; keep one task-team identity per request. |
| `resolveActiveEntryByTaskTeamRunId` vs `resolveKnownEntryByTaskTeamRunId` | Yes after split | Yes | Low | Avoid boolean `includeInactive` selector. |
| `AgentFactory.removeAgent` | Yes | Yes | Medium | Make active/stopping semantics explicit; absent remains false. |
| `AutoByteusAgentRunBackend.isActive` / `terminate` | Yes after split | Yes | Medium | `isActive` means routable; `terminate` means converge to offline. |
| `AgentRun.terminate` | Yes | Held object | Low | Remain thin. |
| `AgentRunManager.terminateAgentRun` | Yes | Public run id | Low | Remain active-by-id; not held cleanup. |
| `TeamRun.terminate` | Yes | Held object | Low | Remain thin. |
| `MixedTeamRunBackend.isActive` / `terminate` | Yes after split | Yes | Medium | Do not use `isActive` precheck for terminate. |
| `MixedTeamManager.terminate` | Yes | Manager-local team run id | Low | Add lifecycle state/promise. |
| `MixedAgentMemberHandle.terminate` | Yes | Handle-local | Medium | Remove restore-for-terminate ambiguity. |
| Root `TEAM_STATUS offline` | Yes | Task-team-scoped root | Low | Ensure exactly one bridge/fallback event. |

## Main Domain Subject Naming Check

| Node / Subject | Current / Proposed Name | Name Is Natural And Self-Descriptive? (`Yes`/`No`) | Naming Drift Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| Task-team settlement coordinator | `TaskTeamSettlementCoordinator` | Yes | Low | None. |
| Task-team directory active lookup | `resolveActiveEntryByTaskTeamRunId` | Yes | Low | Keep for active/routable callers. |
| Task-team directory known lookup | `resolveKnownEntryByTaskTeamRunId` | Yes | Low | Add for settlement cleanup. |
| Native stopping lifecycle | `stopping` | Yes | Low | Use only for non-routable known native agent. |
| Mixed team terminating lifecycle | `terminating` | Yes | Low | Use only for in-flight close sequence. |
| Runtime terminal state | `terminated` / `offline` | Yes | Medium | `terminated` is manager state; `offline` is emitted status. |
| Task record status `accepted` | `accepted` | Yes | Medium if used as runtime terminal | Keep separate from `offline/settled`. |

## Applied Patterns (If Any)

- **State machine inside one owner**: Native lifecycle state belongs inside `AgentFactory`/backend; mixed team lifecycle state belongs inside `MixedTeamManager`. Do not spread one lifecycle across settlement and handles.
- **Idempotent held termination command**: Termination treats the desired end state as success for already-stopping/already-offline held runtime state, but does not swallow active stop failures.
- **Authoritative event before disposal**: Root offline is published/bridged before child/team context and listeners are disposed.
- **Active snapshot as source of truth**: Reconnect correctness comes from removing backend active handles rather than frontend filtering.

## Target Subsystem / Folder / File Mapping

| Path | Kind (`Folder`/`Module`/`File`) | Owner / Boundary | Responsibility | Why It Belongs Here | Must Not Contain |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-ts/src/agent/factory/` | Folder | Native agent factory/runtime storage | Native active/stopping agent lifecycle | Existing native construction/removal owner. | Server task-team settlement logic |
| `autobyteus-ts/src/agent/factory/agent-factory.ts` | File | Native `AgentFactory` | Active/stopping storage, create/restore/remove ID invariants | Existing file owns native active agent registry. | Frontend or task ledger logic |
| `autobyteus-server-ts/src/agent-execution/backends/autobyteus/` | Folder | Server native backend adapter | Convert native runtime behavior to server run contract | Existing native server backend boundary. | Native factory internals outside callbacks |
| `autobyteus-server-ts/src/agent-execution/backends/autobyteus/autobyteus-agent-run-backend.ts` | File | Held native backend | Held-run terminate convergence and routable command gating | Existing backend method owners. | Task-team registry deletion |
| `autobyteus-server-ts/src/agent-execution/domain/agent-run.ts` | File | Common held agent facade | Offline event after accepted backend terminate | Common domain wrapper. | Runtime-specific stopping maps |
| `autobyteus-server-ts/src/agent-execution/services/agent-run-manager.ts` | File | Active run registry | Public by-id active lookup; no lifecycle expansion | Existing public registry owner. | Backend-specific stopping ownership |
| `autobyteus-server-ts/src/agent-team-execution/backends/mixed/` | Folder | Mixed team runtime | Mixed team manager/backend lifecycle and registries | Existing mixed runtime owner. | Task ledger persistence |
| `autobyteus-server-ts/src/agent-team-execution/backends/mixed/mixed-team-run-backend.ts` | File | Mixed backend adapter | Work command active gating; terminate delegation | Existing adapter. | Child close sequencing |
| `autobyteus-server-ts/src/agent-team-execution/backends/mixed/mixed-team-manager.ts` | File | Mixed lifecycle owner | Team lifecycle state, close order, root offline, context disposal | Existing owner of registries/events/context. | Frontend projection cleanup details |
| `autobyteus-server-ts/src/agent-team-execution/domain/team-run.ts` | File | Common held team facade | Thin terminate wrapper/status observation | Existing domain wrapper. | Mixed lifecycle state |
| `autobyteus-server-ts/src/agent-team-execution/backends/mixed/members/` | Folder | Mixed member/runtime handles | Agent, task-agent, and task-team member lifecycle handles | Existing bounded member lifecycle area. | Task ledger transitions |
| `mixed-agent-member-handle.ts` | File | Agent member lifecycle | Held-run terminate without restore-for-terminate; accepted-only disposal | Existing terminate method owner. | Native factory state |
| `mixed-task-team-member-handle.ts` | File | Task-team member lifecycle/bridge | Child team terminate, scoped root offline bridge/fallback, accepted-only disposal | Existing represented child team handle. | Frontend reducer rules |
| `mixed-task-team-instance-registry.ts` | File | Active task-team registry | Delete handle only after accepted termination | Existing active handle map owner. | Child member termination details |
| `autobyteus-server-ts/src/agent-team-execution/task-delegation/` | Folder | Task delegation runtime settlement | Review-triggered settlement, task-team directories | Existing task delegation owner. | Native stop implementation |
| `task-team-active-run-directory.ts` | File | Task-team binding directory | Active vs known lookup, unbind by taskTeamRunId/parent | Existing indexes. | Settlement state machine |
| `task-team-settlement-coordinator.ts` | File | Settlement lifecycle | Requested/settling/settled state, child wakeups, detach/unbind | Existing coordinator. | Direct child-agent close logic |
| `autobyteus-web/services/agentStreaming/` | Folder | Frontend streaming projections | Existing accepted-non-terminal/root-offline cleanup tests | Frontend contract already matches desired event. | Backend lifecycle workaround filtering |

## Folder Boundary Check

| Path / Folder | Intended Structural Depth | Ownership Boundary Is Clear? (`Yes`/`No`) | Mixed-Layer Or Over-Split Risk | Justification / Corrective Action |
| --- | --- | --- | --- | --- |
| `autobyteus-ts/src/agent/factory` | Native runtime lifecycle | Yes | Low | Native active/stopping storage belongs with factory. |
| `agent-execution/backends/autobyteus` | Backend adapter | Yes | Low | Held native backend semantics belong here, not in task settlement. |
| `agent-execution/domain` | Thin domain facade | Yes | Low | Wrapper stays thin; no runtime-specific state. |
| `agent-team-execution/backends/mixed` | Main-line runtime control | Yes | Low | Mixed manager owns team lifecycle and child registries. |
| `agent-team-execution/backends/mixed/members` | Member lifecycle handles | Yes | Low | Handles own represented member/team termination behavior. |
| `agent-team-execution/task-delegation` | Main-line task/settlement control | Yes | Low | Owns task lifecycle and settlement readiness, not child-agent internals. |
| `services/agent-streaming` | Transport | Yes | Low | Mapper/snapshot only; no lifecycle policy change needed. |
| `autobyteus-web/services/agentStreaming` | Frontend projection/display | Yes | Low | Existing projection cleanup owner. |

## Concrete Examples / Shape Guidance (Mandatory When Needed)

| Topic | Good Example | Bad / Avoided Shape | Why The Example Matters |
| --- | --- | --- | --- |
| Native remove lifecycle | `active entry -> set state stopping + stopPromise -> await stop -> delete entry`; second `removeAgent(id)` awaits same stop promise and returns true | `activeAgents.delete(id); await agent.stop()` with no stopping record | Eliminates the window where a known stopping agent appears unknown to cleanup. |
| Native new-work gating | `getAgent(id)` returns only active entries; stopping entries are known to `removeAgent` but not routable | Returning stopping agent from `getAgent` so `postUserMessage` can still route | New work must be rejected while lifecycle cleanup is underway. |
| Held native terminate | `if (terminated) return accepted; if (terminating) return promise; else closeStream(); removeAgent(runId)` | `if (!isActive()) return RUN_NOT_FOUND` inside held terminate | A held run object can converge already-stopping/offline state to success. |
| Public manager unknown distinction | `AgentRunManager.terminateAgentRun(id)` returns not found when `getActiveRun(id)` is null | Adding global tombstones so arbitrary old IDs terminate successfully | Cleanup idempotency belongs to held run handles, not public unknown IDs. |
| Mixed team terminate | `MixedTeamRunBackend.terminate() -> teamManager.terminate()`; manager owns `active/terminating/terminated` | Backend prechecks `isActive()` and returns `RUN_NOT_FOUND` before manager sees terminating state | Manager cannot own lifecycle if adapter blocks access. |
| Mixed root offline | Manager publishes root `offline` before clearing listeners; task-team handle bridge prefixes it; fallback publishes once if no child event observed | Dispose child handle first and hope aggregate parent status changes | Frontend cleanup listens to scoped root offline. |
| Known task-team directory cleanup | `resolveKnownEntryByTaskTeamRunId(taskTeamRunId)` returns binding even when `activeRun.isActive() === false`; `resolveActive...` remains null | Treating inactive child as no binding and leaving parent task-team handle alive | Settlement must clean known stopping/offline children. |
| Frontend cleanup trigger | Accepted review updates projection to accepted; root offline removes it | Treat every accepted review as immediate removal | Accepted task status is not runtime-settled state. |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate Compatibility Mechanism | Why It Was Considered | Rejection Decision (`Rejected`/`N/A`) | Clean-Cut Replacement / Removal Plan |
| --- | --- | --- | --- |
| Frontend-only hide accepted task-team rows | Quick symptom fix | Rejected | Backend active runtime state must be settled/removed. |
| Keep native remove-before-stop and catch `RUN_NOT_FOUND` in settlement | Smaller local patch | Rejected | Native lifecycle owner must record stopping state and held backend must converge termination. |
| Keep `MixedTeamRunBackend.terminate` active precheck and add coordinator retry | Avoid touching mixed manager | Rejected | Mixed manager must own terminating/terminated lifecycle. |
| Keep restore-for-terminate but ignore its errors | Might avoid touching member handle shape | Rejected | Do not restore solely for termination; accept only no-local-run/already-terminal state. |
| Add a parallel cleanup event while leaving stale handles | Could make live UI disappear | Rejected | Root offline event must accompany active handle cleanup. |
| Make `accepted` terminal in frontend | Would remove row on accepted review | Rejected | It collapses task finalization and runtime settlement. |
| Preserve stale active handles for history | History might need data | Rejected | History belongs to task records/activity, not active snapshots. |

## Derived Layering (If Useful)

Layering remains coherent:

- Native runtime lifecycle: `autobyteus-ts` `AgentFactory`.
- Server held-run adapters: `agent-execution/backends/*` and thin `AgentRun` facade.
- Domain/task lifecycle: `task-delegation` service, ledger, settlement coordinator, task-team active directory.
- Runtime backend: mixed team manager, task-team registry, member handles.
- Transport: team event websocket mapper and runtime snapshot service.
- Frontend projection: in-memory active execution rows.

The design tightens lifecycle boundaries rather than inserting a new cross-layer coordinator.

## Migration / Refactor Sequence

1. **Native factory tests first**: in `autobyteus-ts/tests/unit/agent/factory/agent-factory.test.ts`, add coverage that `removeAgent` records stopping before awaiting `agent.stop`, repeated `removeAgent` joins/accepts the same stop, `listActiveAgentIds`/`getAgent` exclude stopping, and create/restore with the same ID is rejected while stopping.
2. **Implement native lifecycle storage** in `autobyteus-ts/src/agent/factory/agent-factory.ts`: active/routable and stopping/non-routable entries; active ID generation/reuse checks must consider both states; final accepted stop deletes the entry.
3. **Native backend tests**: in `autobyteus-server-ts/tests/unit/agent-execution/backends/autobyteus/autobyteus-agent-run-backend.test.ts`, adjust/add tests so held `terminate()` accepts active removal, repeated termination, and already-absent held state, while `postUserMessage`/approval/interrupt still reject when not active and thrown stop errors remain failures.
4. **Implement held native backend convergence** in `AutoByteusAgentRunBackend`; keep `AgentRun` thin and document/verify `AgentRunManager` by-id unknown behavior unchanged.
5. **Mixed manager tests**: add owner-local tests in `mixed-team-manager.test.ts` or an adjacent mixed termination test for `active -> terminating -> terminated`, repeated concurrent `terminate()` sharing one sequence, new work rejected during terminating, root offline published before listener/context disposal, and repeated terminate after terminated returning accepted.
6. **Implement mixed team lifecycle** in `MixedTeamManager` and `MixedTeamRunBackend`: manager state/promise/root offline/disposal; backend terminate delegates without active precheck; other backend commands keep active gating.
7. **Directory tests**: extend `task-team-active-run-directory.test.ts` so a known binding with `activeRun.isActive() === false` is not returned by active lookup but is returned by `resolveKnownEntryByTaskTeamRunId`, and can still be unbound.
8. **Implement directory known lookup** and update settlement coordinator to use it for settlement cleanup/subscription decisions.
9. **Settlement lifecycle tests**: add/extend tests in `task-delegation-service.test.ts` and/or `task-delegation-tool-lifecycle.integration.test.ts` for accepted task-team settlement when the child run is known but not active/stopping; duplicate wakeups should produce one `settling` close sequence, detach the child run registry, unbind the directory, and avoid stale snapshots.
10. **Handle tests/updates**: update `MixedAgentMemberHandle.terminate()` to avoid restore-for-terminate and accepted-only disposal; update `MixedTaskTeamMemberHandle.terminate()` for accepted-only disposal plus root offline bridge/fallback; verify registry deletes only after accepted terminate.
11. **Run targeted server tests** for native factory/backend, mixed manager, directory, and task-delegation lifecycle.
12. **Run frontend projection tests** in `autobyteus-web/services/agentStreaming/__tests__/TeamStreamingService.spec.ts` to confirm accepted remains non-terminal and root offline cleanup still passes. Source changes are expected only if backend payload shape changes, which is not the preferred path.

## Key Tradeoffs

- Reusing scoped root offline avoids introducing a new task-delegation terminal event and keeps frontend changes minimal. The tradeoff is that task-team runtime settlement is represented through team status, but that is already the frontend cleanup contract.
- Idempotent held termination improves settlement robustness but must be narrowly scoped. Public manager unknown IDs should not become globally successful; only held run/team objects can converge their own already-stopping/terminated state.
- Keeping `isActive()` as routable-active means stopping/terminating runtimes reject new work. Cleanup uses explicit terminate/known-entry paths rather than overloading `isActive()`.
- Adding lifecycle state in lower-level owners is slightly more work than a coordinator catch, but it matches the user-approved principle that settlement should stay thin once `AgentRun.terminate()` and `TeamRun.terminate()` are clean.

## Risks

- Overbroad error swallowing could hide a real active runtime that failed to stop. Implementation must accept already-inactive/absent held state but preserve thrown stop failures and rejected active child termination.
- Publishing offline after disposal would lose event listeners/context; publish/bridge before disposal.
- If native `agent.stop(...)` throws, the lifecycle owner must not report accepted. The entry should remain in a non-routable stopping/error-adjacent state or otherwise surface the failure; do not silently delete and settle.
- Existing tests may assume `publishStatus` maps non-error statuses to idle; adjust only because `offline` has a distinct lifecycle meaning for task-team root cleanup.
- If implementation discovers backend consumers relying on settled task-team handles in active snapshots, reject that dependency as stale active-state reliance and route any product/history need to task history surfaces.

## Guidance For Implementation

- Start with owner-local lifecycle tests. The bug is proven by server logs and lifecycle ordering, not by frontend reducer logic.
- Keep `reviewTaskResult` API/return shape unchanged: returning `{ status: "accepted" }` is task record state, not runtime settled state.
- Keep settlement thin: it should not directly close child agents; it should call the child `TeamRun`/parent settle boundary and then detach/unbind after accepted result.
- Do not delete or mutate task-delegation history files to make active rows disappear.
- Do not add global run tombstones for arbitrary public IDs. The idempotent success rule is for held runtime handles and known lifecycle entries.
- Include evidence in implementation handoff: tests run, whether root offline is emitted/bridged once, whether duplicate wakeups share one settlement/termination lifecycle, and whether backend snapshots omit settled task-team handles.

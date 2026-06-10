# Design Spec

## Current-State Read

The current branch task flow is:

```text
Runtime task tool projection
  -> TaskDelegationToolService
  -> TaskDelegationService.delegateTasks
  -> TaskDelegationActivationCoordinator
  -> TeamRun.startTaskAgentInstance
  -> task-agent work packet
  -> task-agent/delegator use send_message_to for result/revision communication
  -> TaskDelegationService.acceptTask
  -> TaskDelegationSettlementCoordinator
  -> TeamRun.settleTaskAgentInstance
```

This flow has a clean runtime spine for activation and settlement, but its model-facing lifecycle is ambiguous. `send_message_to` is both a general communication protocol and the instructed path for task-agent progress, blockers, completion reports, revision feedback, and revised output. The delegator must remember that final acceptance is *not* another message but `accept_task`. User-observed behavior shows this breaks down: the delegator can send a message that a task is finished instead of calling the lifecycle tool.

`origin/personal` contains the earlier explicit task result pattern:

```text
delegate_tasks
  -> task-agent mark_task_completed / mark_task_failed
  -> TaskDelegationCompletionNotifier posts system notification to original delegator
  -> original delegator accept_task
  -> settlement
```

That older branch proves the important return/event spine: the system should notify the delegator after a task-agent submits a result. However, it still has names and review behavior that are not ideal: `mark_task_completed` / `mark_task_failed` sound like internal state mutation, `accept_task` only covers acceptance, and revision feedback still depends on `send_message_to` targeted at task-agent identity.

The target should combine the best parts:

- Keep current branch's server-owned mixed task-agent activation/settlement and `TaskAgentDirectory` infrastructure.
- Restore `origin/personal`'s system-mediated result notification concept.
- Replace old/current model-facing lifecycle names with intent-focused task protocol commands:
  - `delegate_tasks`
  - `submit_task_result`
  - `review_task_result`
- Stop using `send_message_to` for task result submission, revision request, or acceptance.

## Intended Change

Refactor task delegation into a pure subagent/task protocol:

```text
delegate_tasks
  -> system starts task-agent and sends work packet
submit_task_result
  -> task-agent submits a reviewable result to TaskDelegationService
  -> system notifies original delegator
review_task_result(decision="request_revision")
  -> original delegator requests revision through TaskDelegationService
  -> system notifies the same task-agent
submit_task_result
  -> task-agent submits revised result
review_task_result(decision="accept")
  -> original delegator accepts through TaskDelegationService
  -> system schedules safe task-agent settlement
```

This is a clean-cut replacement of the current `send_message_to` lifecycle model and the current `accept_task` tool. It also rejects a literal rollback to `origin/personal`; old result tool names and old revision-by-message behavior are not the target.

## Task Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Behavior change + refactor / lifecycle API redesign.
- Current design issue found (`Yes`/`No`/`Unclear`): Yes.
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Boundary Or Ownership Issue + Duplicated Policy Or Coordination + Shared Structure Looseness + Legacy Or Compatibility Pressure.
- Refactor needed now (`Yes`/`No`/`Deferred`/`Unclear`): Yes.
- Evidence:
  - Current task work packet and runtime instructions route result/revision communication through `send_message_to` while `accept_task` remains a separate terminal tool.
  - `origin/personal` has an explicit system notification mechanism that better matches subagent lifecycle.
  - Historical simplification removed result tools to reduce brittleness, but user-observed behavior shows that generic communication now competes with task lifecycle.
- Design response:
  - Make `TaskDelegationService` the authoritative lifecycle owner for delegation, result submission, review, revision, acceptance, and settlement request.
  - Add a system notification dispatcher under task delegation for result and revision notifications.
  - Keep `send_message_to` as a separate communication owner with no task lifecycle authority.
- Refactor rationale:
  - Instructions alone cannot reliably teach models the semantic difference between "tell worker it is done" and "accept task" when the same generic communication channel is advertised for task completion/revision.
  - A typed protocol reduces cognitive load and lets tests validate lifecycle intent directly.
- Intentional deferrals and residual risk, if any:
  - Persistent/durable task storage remains out of scope; current ledger is team-run scoped.
  - Broader team communication exact-run routing remains in place for non-lifecycle communication, but prompts/docs must not advertise it for task lifecycle.

## Terminology

- `Task`: server-owned ledger/business unit with generated `taskId` such as `task_0001`.
- `Task-agent`: concrete runtime instance spawned for one delegated task.
- `Result submission`: task-agent's reviewable output, submitted through `submit_task_result`.
- `Review`: original delegator's decision on a submitted result, made through `review_task_result`.
- `Pending submission`: the latest unreviewed result submission for a task while the task status is `awaiting_review`.
- `Reviewed submission ID`: the explicit submission ID recorded on every review so multi-cycle history is unambiguous.
- `System notification`: framework-generated input/event from task lifecycle owner to delegator or task-agent.
- `Notification warning`: deterministic non-fatal warning returned from a lifecycle tool when state mutation succeeds but system notification delivery is rejected.
- `Open child delegation`: a non-terminal delegated task for which a task-agent run is the original delegator/reviewer; this blocks settlement of that task-agent run.

## Design Reading Order

1. Follow the data-flow spines: delegation, result submission, review-acceptance, review-revision, settlement.
2. Read the ownership map: `TaskDelegationService` owns lifecycle; notification dispatcher owns system inputs; `send_message_to` owns only generic communication.
3. Read file responsibility mapping for concrete code changes.
4. Read migration/removal sequence for clean-cut decommission of old/current lifecycle paths.

## Architecture Review Round 1 Tightening

This revision resolves the three design-impact findings from `/Users/normy/autobyteus_org/autobyteus-worktrees/pure-task-delegation-protocol/tickets/done/pure-task-delegation-protocol/design-review-report.md`:

| Finding | Resolution In This Spec |
| --- | --- |
| AR-001 child-delegation settlement guard | Settlement readiness now requires no non-terminal task assigned to the task-agent run and no non-terminal child task where the same task-agent run is the original delegator/reviewer. The ledger owns `hasOpenWorkBlockingTaskAgentSettlement(taskAgentRunId)` or equivalent, and the settlement coordinator must use it in both request and settle-if-ready paths. |
| AR-002 notification failure semantics | Result/revision notification delivery is non-transactional after valid lifecycle mutation. Service sequencing, warning shape, and tool result fields are normative: publish committed state, attempt notification, log structured warning, return `notification_delivered` and `warnings[]`. |
| AR-003 review-to-submission history linkage | The ledger has an explicit latest-pending-submission invariant via `pendingSubmissionId`; every review records `reviewedSubmissionId`; events/tool results include submission/review linkage IDs. |

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- Required action: remove model-facing `accept_task`, do not resurrect `mark_task_completed` / `mark_task_failed`, and remove current task lifecycle instructions that tell agents to use `send_message_to` for result/review/acceptance.
- Candidate historical names may remain only in historical ticket artifacts under `tickets/done/**`; active source/docs/tests/prompts should not teach them.

## Data-Flow Spine Inventory

| Spine ID | Scope | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | Delegator tool call `delegate_tasks` | Task-agent started with work packet | `TaskDelegationService` | Creates child task-agent execution from explicit task intent |
| DS-002 | Primary End-to-End | Task-agent tool call `submit_task_result` | Delegator receives system result notification | `TaskDelegationService` | Replaces result reporting via generic communication |
| DS-003 | Primary End-to-End | Delegator tool call `review_task_result(accept)` | Task-agent settlement requested after no-open-work guard | `TaskDelegationService` | Replaces `accept_task`, links review to a submitted result, and finalizes task lifecycle |
| DS-004 | Primary End-to-End | Delegator tool call `review_task_result(request_revision)` | Task-agent receives system revision notification | `TaskDelegationService` | Replaces revision feedback via generic communication |
| DS-005 | Return-Event | Task lifecycle state change | Team stream / history / frontend consumers | `TaskDelegationEventPublisher` serving `TaskDelegationService` | Preserves observable task lifecycle events |
| DS-006 | Bounded Local | Accepted task-agent run | Settled/offline task-agent | `TaskDelegationSettlementCoordinator` | Ensures task-agent closes only after safe idle/no-open-work gates, including child delegations it owns |

## Primary Execution Spine(s)

Delegation:

```text
Model tool call delegate_tasks
  -> Runtime task tool adapter
  -> TaskDelegationToolService
  -> TaskDelegationService
  -> TaskDelegationLedger
  -> TaskDelegationActivationCoordinator
  -> TeamRun.startTaskAgentInstance
  -> Task-agent work packet
```

Result submission:

```text
Task-agent tool call submit_task_result
  -> Runtime task tool adapter
  -> TaskDelegationToolService
  -> TaskDelegationService
  -> TaskDelegationLedger.submitResult creates submissionId and pendingSubmissionId
  -> TaskDelegationEventPublisher publishes result event with submissionId
  -> TaskDelegationNotificationDispatcher.notifyResultSubmitted
  -> Original delegator system input or deterministic notification warning
  -> Tool result returns submission_id, notification_delivered, warnings[]
```

Acceptance review:

```text
Delegator tool call review_task_result(accept)
  -> Runtime task tool adapter
  -> TaskDelegationToolService
  -> TaskDelegationService
  -> TaskDelegationLedger.reviewResult links review to pendingSubmissionId
  -> TaskDelegationEventPublisher publishes review/status event with reviewedSubmissionId
  -> TaskDelegationSettlementCoordinator.requestSettlement
  -> ledger.hasOpenWorkBlockingTaskAgentSettlement(taskAgentRunId) guard
  -> TeamRun.settleTaskAgentInstance after idle/no-open-work
```

Revision review:

```text
Delegator tool call review_task_result(request_revision)
  -> Runtime task tool adapter
  -> TaskDelegationToolService
  -> TaskDelegationService
  -> TaskDelegationLedger.reviewResult links review to pendingSubmissionId
  -> TaskDelegationEventPublisher publishes review/status event with reviewedSubmissionId
  -> TaskDelegationNotificationDispatcher.notifyRevisionRequested
  -> Bound task-agent system input or deterministic notification warning
  -> Tool result returns review_id, reviewed_submission_id, notification_delivered, warnings[]
```

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | A delegator submits ready-to-run task envelopes; service records tasks and starts one task-agent per runnable task. | Tool adapter, `TaskDelegationToolService`, `TaskDelegationService`, `TaskDelegationLedger`, activation coordinator, `TeamRun` | `TaskDelegationService` | Input parsing, member resolution, work-packet rendering, event publishing |
| DS-002 | A bound task-agent submits a result; the system records the submission and notifies the original delegator. | Tool adapter, `TaskDelegationService`, ledger, notification dispatcher | `TaskDelegationService` | Caller-bound task resolution, event publishing, system input delivery |
| DS-003 | Original delegator accepts the latest pending submission; service records a review linked to that submission and schedules settlement only after the no-open-work guard passes. | Tool adapter, `TaskDelegationService`, ledger, settlement coordinator, `TeamRun` | `TaskDelegationService` | Authorization, event publishing, idle/offline observation, child-delegation guard |
| DS-004 | Original delegator requests revision of the latest pending submission; service records a review linked to that submission and attempts system revision instruction delivery to the same task-agent. | Tool adapter, `TaskDelegationService`, ledger, notification dispatcher, `TeamRun` | `TaskDelegationService` | Revision message validation, task-agent reachability, notification warning result |
| DS-005 | Task lifecycle events are published to stream/history consumers whenever state changes. | `TaskDelegationService`, event publisher, team run event stream | `TaskDelegationEventPublisher` under service authority | Payload mapping, frontend compatibility |
| DS-006 | Accepted task-agent instances settle after idle/offline only when they have no remaining assigned work and no open child delegations for which they are the original delegator/reviewer. | Settlement coordinator, ledger, `TeamRun.settleTaskAgentInstance` | `TaskDelegationSettlementCoordinator` | Team event subscription, coordinator protection, nested task-agent delegation safety |

## Spine Actors / Main-Line Nodes

- Runtime task tool adapter / projection.
- `TaskDelegationToolService`.
- `TaskDelegationService`.
- `TaskDelegationLedger`.
- `TaskDelegationActivationCoordinator`.
- `TaskDelegationNotificationDispatcher`.
- `TaskDelegationSettlementCoordinator`.
- `TeamRun` task-agent start/settle boundary.

## Ownership Map

| Node | Ownership |
| --- | --- |
| Runtime task tool adapter | Provider-specific tool call surface and conversion into shared manifest/service call. Must not own task lifecycle. |
| `TaskDelegationToolService` | Resolves active `TeamRun`, builds `TaskDelegationContext`, and delegates to run-scoped `TaskDelegationService`. Thin service boundary, not the lifecycle owner. |
| `TaskDelegationService` | Authoritative task lifecycle owner: create, submit result, review, accept/revision transition, authorization, event/notification sequencing, settlement request. |
| `TaskDelegationLedger` | Team-run-scoped task state, task IDs, task-agent binding, result submissions, `pendingSubmissionId`, review history with `reviewedSubmissionId`, state transition invariants, and settlement-blocking open-work queries. |
| `TaskDelegationActivationCoordinator` | Starts task-agent instances for runnable records and binds concrete task-agent identity. |
| `TaskDelegationNotificationDispatcher` | System-mediated task notifications to original delegator and bound task-agent; returns delivery outcomes/warnings; no model-authored communication and no lifecycle decisions. |
| `TaskDelegationEventPublisher` | Task lifecycle stream payload emission under service authority. |
| `TaskDelegationSettlementCoordinator` | Safe asynchronous task-agent settlement after accepted review, gated by idle/offline state and ledger proof that the task-agent has no assigned non-terminal work and no non-terminal child delegations. |
| `send_message_to` communication subsystem | Ordinary teammate communication only; must not mutate task lifecycle. |

## Thin Entry Facades / Public Wrappers (If Applicable)

| Facade / Entry Wrapper | Governing Owner Behind It | Why It Exists | Must Not Secretly Own |
| --- | --- | --- | --- |
| `DelegateTasksTool` / Codex dynamic tool / Claude MCP task tool | `TaskDelegationService` via `TaskDelegationToolService` | Provider-specific model-facing entrypoint | State transitions, notifications, settlement |
| `SubmitTaskResultTool` | `TaskDelegationService` | Provider-specific entrypoint for task-agent result | Task selection beyond context resolution |
| `ReviewTaskResultTool` | `TaskDelegationService` | Provider-specific entrypoint for delegator review | Direct messaging or direct runtime settlement |

## Removal / Decommission Plan (Mandatory)

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By Which Owner / File / Structure | Scope | Notes |
| --- | --- | --- | --- | --- |
| `accept_task` model-facing tool | Acceptance becomes one decision of result review; keeping both would preserve ambiguity | `review_task_result(decision="accept")` | In This Change | Remove file, manifest entry, schemas, docs, tests |
| Current task-agent instruction to report completion via `send_message_to` | Generic communication competes with task lifecycle | `submit_task_result` | In This Change | Work packet and runtime instructions must change |
| Current delegator instruction to send revision via `send_message_to` | Revision is task review, not generic chat | `review_task_result(decision="request_revision")` + system notification | In This Change | Generic communication remains available for non-lifecycle chat |
| `mark_task_completed` / `mark_task_failed` names if present in copied/history code | Old names encode internal mutation and split failure semantics | `submit_task_result` | In This Change | Do not resurrect old files/names |
| `TaskDelegationCompletionNotifier` as completion-only concept | New notifier must handle result and revision | `TaskDelegationNotificationDispatcher` | In This Change | Can reuse implementation ideas from `origin/personal` |
| `awaiting_acceptance` terminology | New review command handles accept/revision | `awaiting_review` | In This Change | Better names model delegator decision point |

## Return Or Event Spine(s) (If Applicable)

Result submission return/event spine:

```text
TaskDelegationService.submitTaskResult
  -> TaskDelegationEventPublisher.publishResultSubmitted(submissionId)
  -> TeamRun TASK_DELEGATION event
  -> websocket/history/frontend projection including submission_id
```

Review return/event spine:

```text
TaskDelegationService.reviewTaskResult
  -> TaskDelegationEventPublisher.publishResultReviewed(reviewId, reviewedSubmissionId) / publishStatusUpdated
  -> TeamRun TASK_DELEGATION event
  -> websocket/history/frontend projection including review_id and reviewed_submission_id
```

System notification return spine:

```text
TaskDelegationNotificationDispatcher
  -> TeamRun.postMessage(system message, original delegator or task-agent exact run)
  -> recipient runtime input accepted/rejected
  -> NotificationDeliveryOutcome
  -> service/tool result warning if delivery is rejected
```

Normative notification failure policy:

1. A valid lifecycle mutation is committed before notification delivery is attempted.
2. The lifecycle event is published from the committed state.
3. The notification dispatcher attempts delivery and returns an outcome.
4. Delivery failure does not roll back the task state. The service logs a structured warning and returns a deterministic warning payload in the tool result.

Target result/warning shape:

```ts
type TaskDelegationWarning = {
  code: "TASK_NOTIFICATION_DELIVERY_FAILED";
  notification_type: "result_submitted" | "revision_requested";
  task_id: string;
  target_member_route_key: string;
  target_task_agent_run_id?: string | null;
  message: string;
};

type SubmitTaskResultResult = {
  task_id: string;
  status: "awaiting_review";
  submission_id: string;
  notification_delivered: boolean;
  warnings: TaskDelegationWarning[];
};

type ReviewTaskResultResult = {
  task_id: string;
  status: "active" | "accepted";
  decision: "request_revision" | "accept";
  review_id: string;
  reviewed_submission_id: string;
  notification_delivered: boolean | null;
  settlement_requested: boolean;
  warnings: TaskDelegationWarning[];
};
```

`notification_delivered` is `null` only for `review_task_result(decision="accept")`, because acceptance does not require a result/revision system notification. Settlement rejection or delay is not represented as notification failure; it is represented by `settlement_requested` and settlement coordinator logs/events.

## Bounded Local / Internal Spines (If Applicable)

Parent owner: `TaskDelegationLedger`.

```text
current status + command -> transition validator -> submission/review linkage update -> record mutation -> cloned record snapshot
```

This matters because the target lifecycle has a real state machine:

```text
not_started -> active -> awaiting_review -> active -> awaiting_review -> accepted

active + submitResult:
  create TaskResultSubmission(submissionId)
  set pendingSubmissionId = submissionId
  transition to awaiting_review

awaiting_review + reviewResult:
  require pendingSubmissionId
  create TaskResultReview(reviewedSubmissionId = pendingSubmissionId)
  clear pendingSubmissionId
  transition to active for request_revision or accepted for accept
```

Parent owner: `TaskDelegationSettlementCoordinator`.

```text
accepted task-agent -> pending settlement map -> idle/offline team event -> ledger.hasOpenWorkBlockingTaskAgentSettlement(taskAgentRunId) == false -> TeamRun.settleTaskAgentInstance
```

This matters because settlement must not kill the task-agent before the tool result/review notification is delivered, and it must not kill a task-agent that still owns child delegated work. The settlement blocker is any non-terminal task where either `record.taskAgentInstance.taskAgentRunId === taskAgentRunId` (assigned work) or `record.delegator.taskAgentRunId === taskAgentRunId` (child delegation created by that task-agent).

Ledger invariants:

- `pendingSubmissionId` is non-null if and only if task status is `awaiting_review`.
- `submitResult` is valid only from `active`; it creates exactly one pending submission.
- `reviewResult` is valid only from `awaiting_review`; it always reviews `pendingSubmissionId`, records that value as `reviewedSubmissionId`, and clears `pendingSubmissionId`.
- A second review of the same submission is impossible because after review the task is no longer `awaiting_review`.
- Events and tool results must include the relevant `submission_id` and `reviewed_submission_id` so frontend/history consumers do not infer relationships from array order.

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Related Spine ID(s) | Serves Which Owner | Responsibility | Why It Exists | Risk If Misplaced On Main Line |
| --- | --- | --- | --- | --- | --- |
| Input parsers/schemas | DS-001..DS-004 | Runtime adapters / tool service | Validate model-facing JSON shapes | Keep provider tools consistent | Lifecycle rules duplicated per provider |
| Member/caller identity resolver | DS-001..DS-004 | `TaskDelegationService` | Validate active team/member/task-agent identity | Prevent wrong actor mutation | Authorization leaks into adapters |
| Work packet renderer | DS-001 | Activation coordinator | Render task-agent instructions | Isolate prompt text | Activation owner becomes prompt blob |
| Notification dispatcher | DS-002, DS-004 | `TaskDelegationService` | Deliver system result/revision notifications | System-mediated communication | Generic `send_message_to` regains lifecycle ownership |
| Event publisher | DS-002..DS-005 | `TaskDelegationService` | Publish task lifecycle events | Stream/history visibility | Service mixes transport payload details |
| Settlement coordinator | DS-003, DS-006 | `TaskDelegationService` | Async safe settlement with assigned-work and child-delegation guards | Avoid premature termination | Acceptance path kills active tool turn or a task-agent that still must review child work |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area / Subsystem | Decision | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| Task lifecycle | `agent-team-execution/task-delegation` | Extend | Already owns task delegation | N/A |
| Runtime tool exposure | `agent-tools/task-delegation` + provider adapters | Extend | Existing manifest/service pattern | N/A |
| System notifications | Prior `TaskDelegationCompletionNotifier` concept on `origin/personal` | Create New generalized file | Need result and revision, not completion only | Existing current branch deleted notifier; old one is too narrow |
| Generic communication | `send_message_to` / team communication subsystem | Reuse but keep separate | Still needed for ordinary messages | Must not own lifecycle |
| Safe settlement | `TaskDelegationSettlementCoordinator` | Reuse/extend | Existing idle/no-work gates fit accepted review after adding an explicit child-delegation blocker | N/A |

## Subsystem / Capability-Area Allocation

| Subsystem / Capability Area | Owns Which Concerns | Related Spine ID(s) | Governing Owner(s) Served | Decision | Notes |
| --- | --- | --- | --- | --- | --- |
| `agent-team-execution/task-delegation` | Lifecycle state, result/review, notifications, activation, settlement | DS-001..DS-006 | `TaskDelegationService` | Extend | Main target subsystem |
| `agent-tools/task-delegation` | Model-facing tool contracts/schemas/provider-neutral wrappers | DS-001..DS-004 | `TaskDelegationToolService` | Extend | Three-tool contract |
| Runtime backend task projection | Codex/Claude/AutoByteus tool exposure | DS-001..DS-004 | Runtime adapters | Modify | Use shared manifest only |
| Team communication | Ordinary communication | adjacent | `send_message_to` owner | Preserve | Remove lifecycle instructions only |
| Docs/tests | Durable protocol contract | all | Project docs / validation | Modify | Must reject stale paths |

## Draft File Responsibility Mapping

| Candidate File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `task-delegation-record.ts` | task delegation | domain types | Statuses, input/result/review types, `pendingSubmissionId`, warning/outcome types, record shape | One domain model file already exists | Yes |
| `task-delegation-ledger.ts` | task delegation | ledger | Task ID generation, transitions, pending-submission invariant, result/review history, settlement-blocking open-work query | Current owner of in-memory state | Yes |
| `task-delegation-service.ts` | task delegation | lifecycle service | Delegate, submit result, review result, authorization/sequencing | Authoritative boundary | Yes |
| `task-delegation-notification-dispatcher.ts` | task delegation | notification dispatcher | System notifications to delegator/task-agent with deterministic delivery outcome | Generalizes origin notifier | Yes |
| `task-delegation-event-publisher.ts` | task delegation | event publisher | Activation/result/review/status events | Existing event owner | Yes |
| `task-delegation-work-packet-renderer.ts` | task delegation | prompt/work packet renderer | Task-agent instructions | Existing packet owner | Yes |
| `submit-task-result.ts` | task tools | AutoByteus wrapper | Local wrapper for native-style tool registry | Parallel to existing tool files | Yes |
| `review-task-result.ts` | task tools | AutoByteus wrapper | Local wrapper for review tool | Parallel to existing tool files | Yes |
| `accept-task.ts` | task tools | obsolete | Remove | Replaced by review wrapper | N/A |

## Reusable Owned Structures Check

| Repeated Structure / Logic | Candidate Shared File | Owning Subsystem | Why Shared | Redundant Attributes Removed? | Overlapping Representations Removed? | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| Task result submission shape | `task-delegation-record.ts` | task delegation | Used by ledger, events, service results | Yes | Yes | A generic message DTO |
| Task review decision shape | `task-delegation-record.ts` | task delegation | Used by parser, service, ledger, events; includes `reviewedSubmissionId` | Yes | Yes | A generic status update |
| Notification rendering helpers and outcome shape | `task-delegation-notification-dispatcher.ts` + `task-delegation-record.ts` warning type | task delegation | Result/revision system input text and deterministic delivery warning | Yes | Yes | A second lifecycle owner |

## Shared Structure / Data Model Tightness Check

| Shared Structure / Type / Schema | One Clear Meaning Per Field? | Redundant Attributes Removed? | Parallel / Overlapping Representation Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| `TaskDelegationRecord` | Yes | Yes | Medium | Add only task lifecycle fields, including `pendingSubmissionId`; do not duplicate task-agent identity with separate model-facing instance ID |
| `TaskResultSubmission` | Yes | Yes | Low | Fields: `submissionId`, sequence, message, reference files, submittedAt, taskAgentRunId |
| `TaskResultReview` | Yes | Yes | Low | Fields: `reviewId`, `reviewedSubmissionId`, decision, message/files, reviewer identity, reviewedAt |
| `ReviewTaskResultInput` | Yes | Yes | Low | Explicit `decision`, not generic status; model does not pass submission selector because ledger binds review to latest pending submission |

## Final File Responsibility Mapping

| File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/agent-team-execution/task-delegation/task-delegation-record.ts` | Task delegation | Domain model | Define statuses `not_started`, `active`, `awaiting_review`, `accepted`; task input; result input; review input; `pendingSubmissionId`; result/review payloads; notification outcome/warning payloads | Existing central task domain type file | Yes |
| `.../task-delegation-ledger.ts` | Task delegation | Ledger | Create records, bind/activate task-agent, submit result, review result, transition validation, explicit latest-pending-submission invariant, history, settlement-blocking query | Existing state owner | Yes |
| `.../task-delegation-service.ts` | Task delegation | Authoritative lifecycle boundary | `delegateTasks`, `submitTaskResult`, `reviewTaskResult`; actor authorization; event/notification/settlement sequencing; deterministic warning result assembly | One service owns lifecycle | Yes |
| `.../task-delegation-notification-dispatcher.ts` | Task delegation | System notification owner | Notify original delegator of result; notify task-agent of revision; route nested task-agent delegator notifications; return accepted/rejected delivery outcome | Generalizes origin notifier | Yes |
| `.../task-delegation-event-publisher.ts` | Task delegation | Event publisher | Publish activation/result-submitted/reviewed/status events including `submission_id`, `review_id`, and `reviewed_submission_id` | Existing event off-spine concern | Yes |
| `.../task-delegation-activation-coordinator.ts` | Task delegation | Activation coordinator | Start task-agent and mark active | Existing owner remains | Yes |
| `.../task-delegation-settlement-coordinator.ts` | Task delegation | Settlement coordinator | Safe settlement after accepted review, blocked by assigned non-terminal work or child delegations owned by the task-agent run | Existing owner remains | Yes |
| `.../task-delegation-work-packet-renderer.ts` | Task delegation | Packet renderer | Render `submit_task_result` instructions and no lifecycle send-message instructions | Existing owner remains | Yes |
| `autobyteus-server-ts/src/agent-tools/task-delegation/task-delegation-tool-contract.ts` | Task tools | Tool contract | Tool constants/list/types for `delegate_tasks`, `submit_task_result`, `review_task_result` | Existing manifest contract | Yes |
| `.../task-delegation-tool-manifest.ts` | Task tools | Manifest | Three tool descriptions/execution mapping | Existing manifest owner | Yes |
| `.../task-delegation-tool-parameter-schemas.ts` | Task tools | Schema builder | JSON/ParameterSchema for new tools | Existing schema owner | Yes |
| `.../task-delegation-tool-input-parsers.ts` | Task tools | Parser | Zod validation for new inputs | Existing parser owner | Yes |
| `.../delegate-tasks.ts` | Task tools | AutoByteus wrapper | Existing wrapper updated only as needed | Existing wrapper | Yes |
| `.../submit-task-result.ts` | Task tools | AutoByteus wrapper | New wrapper for task-agent result tool | Provider-local wrapper pattern | Yes |
| `.../review-task-result.ts` | Task tools | AutoByteus wrapper | New wrapper for delegator review tool | Provider-local wrapper pattern | Yes |
| `.../accept-task.ts` | Task tools | obsolete | Delete | Replaced by review tool | N/A |

## Ownership Boundaries

`TaskDelegationService` is the authoritative public boundary for task lifecycle. Runtime adapters, notification dispatchers, event publishers, and settlement coordinators operate under it. No caller above the service should mutate ledger state, send task result/revision notifications, or settle task-agent instances directly.

`send_message_to` is the authoritative public boundary for ordinary teammate communication. It must not become a task lifecycle fallback. If task-agent lifecycle needs a notification, the task delegation boundary sends a system notification; the model does not emulate that by calling `send_message_to`.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanism(s) It Encapsulates | Upstream Callers That Must Use The Boundary | Forbidden Bypass Shape | If Boundary API Is Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| `TaskDelegationService` | Ledger, event publisher, notification dispatcher, activation, settlement | Runtime task tools, tests, future MCP | Runtime adapter directly editing ledger or posting lifecycle notifications | Add explicit service method |
| `TaskDelegationNotificationDispatcher` under service authority | `TeamRun.postMessage` details, target route/run selection | `TaskDelegationService` only | Delegator/task-agent using `send_message_to` as lifecycle notification | Add task protocol event/input method |
| `TaskDelegationLedger` | Transition validation, result/review history | `TaskDelegationService` only | Tests/adapters changing record state directly | Strengthen service API/test helpers |
| `send_message_to` communication boundary | Team recipient resolution, committed message projection | Agent tools for ordinary communication | Task lifecycle state mutation through message content | Use task protocol tools |

## Dependency Rules

Allowed:

- Runtime task adapters -> `TaskDelegationToolService` -> `TaskDelegationService`.
- `TaskDelegationService` -> ledger, activation coordinator, event publisher, notification dispatcher, settlement coordinator.
- Notification dispatcher -> `TeamRun.postMessage` with system messages.
- Settlement coordinator -> `TeamRun.settleTaskAgentInstance` after accepted review, idle/offline observation, and `ledger.hasOpenWorkBlockingTaskAgentSettlement(taskAgentRunId) === false`.
- `send_message_to` remains available to agents for ordinary non-lifecycle communication.

Forbidden:

- Runtime adapters directly calling ledger transition methods.
- Models using `send_message_to` for task result submission, revision request, acceptance, or finalization.
- Compatibility aliases from `accept_task` to `review_task_result`.
- Reintroducing `mark_task_completed` / `mark_task_failed` as active model-facing tools.
- Notification dispatcher deciding task transitions; it only delivers system inputs for transitions already accepted by service/ledger.
- Settlement coordinator using only assigned-work checks and ignoring child delegations created by the task-agent run.
- Events or reviews that omit the reviewed submission ID after multi-cycle result/review history is introduced.

## Interface Boundary Mapping

| Interface / API / Query / Command / Method | Subject Owned | Responsibility | Accepted Identity Shape(s) | Notes |
| --- | --- | --- | --- | --- |
| `delegateTasks(context, input)` | Delegated task creation | Create task records and activate task-agent | `teamRunId + caller + member_name` | Existing method adjusted for result/review protocol |
| `submitTaskResult(context, input)` | Task-agent result submission | Bound task-agent submits reviewable result and receives submission/notification warning result | `teamRunId + caller.taskAgentRunId/taskId` from context; no model task selector | Task-agent-only; returns `submission_id`, `notification_delivered`, `warnings[]` |
| `reviewTaskResult(context, input)` | Delegator review | Accept or request revision for latest pending submission | `teamRunId + caller + task_id + decision` | Original delegator only; returns `review_id`, `reviewed_submission_id`, revision notification outcome if applicable, settlement flag if accept |
| `notifyResultSubmitted(record, submission)` | System notification | Notify original delegator | Stored delegator identity | Internal to service; returns `NotificationDeliveryOutcome` |
| `notifyRevisionRequested(record, review)` | System notification | Notify bound task-agent | Stored task-agent run identity | Internal to service; returns `NotificationDeliveryOutcome` |
| `hasOpenWorkBlockingTaskAgentSettlement(taskAgentRunId)` | Settlement readiness query | Detect any non-terminal assigned task or child delegation owned by the task-agent run | `teamRunId + taskAgentRunId` | Internal ledger query used by settlement coordinator in both request and settle-if-ready paths |

## Interface Boundary Check

| Interface | Responsibility Is Singular? | Identity Shape Is Explicit? | Ambiguous Selector Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| `delegate_tasks` | Yes | Yes | Low | Keep minimal schema |
| `submit_task_result` | Yes | Yes | Low | Reject task selectors |
| `review_task_result` | Yes | Yes | Low | Explicit decision enum; require message for revision; review target is the ledger latest pending submission |
| `hasOpenWorkBlockingTaskAgentSettlement` | Yes | Yes | Low | Combined settlement blocker query owns both assigned-work and child-delegation checks |
| `send_message_to` | Yes for communication | Yes | Medium | Prompt/docs say not task lifecycle |

## Main Domain Subject Naming Check

| Node / Subject | Current / Proposed Name | Name Is Natural And Self-Descriptive? | Naming Drift Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| Worker result tool | `submit_task_result` | Yes | Low | Use singular because it submits one bound task result |
| Delegator review tool | `review_task_result` | Yes | Low | Covers accept and revision decisions |
| Old accept tool | `accept_task` | Partly | High | Remove; too narrow and competes with review tool |
| Old result tools | `mark_task_completed` / `mark_task_failed` | No | High | Do not restore |

## Applied Patterns (If Any)

- State machine: inside `TaskDelegationLedger` for task statuses and transitions.
- Registry/run-scoped service: existing `TaskDelegationRunRegistry` remains the run-scoped service cache.
- Adapter: provider-specific task tool projections translate runtime tool calls into shared manifest/service calls.
- Dispatcher: `TaskDelegationNotificationDispatcher` dispatches system notifications but does not own state.

## Target Subsystem / Folder / File Mapping

| Path | Kind | Owner / Boundary | Responsibility | Why It Belongs Here | Must Not Contain |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/agent-team-execution/task-delegation/` | Folder | Task delegation lifecycle | Domain/control files for task state, activation, notifications, settlement | Existing lifecycle subsystem | Provider-specific schemas |
| `.../task-delegation-notification-dispatcher.ts` | File | Notification dispatcher | System result/revision notifications | Same subsystem, serves service | Task state decisions |
| `autobyteus-server-ts/src/agent-tools/task-delegation/` | Folder | Model-facing task tools | Shared task tool names, schemas, parsers, wrappers | Existing tool subsystem | Lifecycle implementation beyond service calls |
| Runtime provider task-delegation adapter folders | Existing files | Runtime projection | Expose shared manifest tools | Existing runtime architecture | Divergent task behavior |
| `autobyteus-server-ts/docs/modules/agent_team_execution.md` | File | Docs | Server task protocol | Existing docs | Old/current ambiguous lifecycle |
| `autobyteus-ts/docs/agent_team_runtime_and_task_coordination.md` | File | Docs | Native/server ownership split | Existing docs | Old tool names as active guidance |

## Folder Boundary Check

| Path / Folder | Intended Structural Depth | Ownership Boundary Is Clear? | Mixed-Layer Or Over-Split Risk | Justification / Corrective Action |
| --- | --- | --- | --- | --- |
| `agent-team-execution/task-delegation` | Main-Line Domain-Control | Yes | Low | Already contains lifecycle owners |
| `agent-tools/task-delegation` | Transport / Tool Boundary | Yes | Low | Tool surface only delegates to service |
| Runtime backend task adapters | Adapter | Yes | Medium | Must avoid provider-specific behavior forks |

## Concrete Examples / Shape Guidance (Mandatory When Needed)

| Topic | Good Example | Bad / Avoided Shape | Why The Example Matters |
| --- | --- | --- | --- |
| Task result submission | `submit_task_result({"message":"Implemented X", "reference_files":["/abs/handoff.md"]})` from bound task-agent | `send_message_to({recipient_name:"coordinator", content:"I'm done"})` | Makes result a lifecycle event, not chat |
| Revision request | `review_task_result({"task_id":"task_0001", "decision":"request_revision", "message":"Please add tests"})` | `send_message_to({target_agent_run_id:"...task_0001", content:"Please add tests"})` | System owns routing and state transition |
| Acceptance | `review_task_result({"task_id":"task_0001", "decision":"accept"})` | `accept_task({"task_id":"task_0001"})` or `send_message_to(... "accepted")` | One review tool owns all review decisions |
| Work packet instruction | "When ready for delegator review, call `submit_task_result`." | "Report completion with `send_message_to`." | Avoids delegator/task-agent confusion |
| Nested child settlement | Parent task-agent delegates child work; parent result is accepted; settlement waits while child task is `active` or `awaiting_review`, then settles only after child is terminal. | Settling parent task-agent immediately after parent acceptance while child work is open. | Preserves ability for task-agent delegators to receive child result notifications and review them. |
| Notification warning | `submit_task_result` or revision review commits state, publishes event, then returns `warnings:[{code:"TASK_NOTIFICATION_DELIVERY_FAILED", notification_type:"revision_requested", task_id:"task_0001"}]` if system input delivery is rejected. | Rolling back hidden state or silently swallowing notification failure. | Makes non-transactional notification failure deterministic for callers and tests. |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate Compatibility Mechanism | Why It Was Considered | Rejection Decision | Clean-Cut Replacement / Removal Plan |
| --- | --- | --- | --- |
| Keep `accept_task` as alias for `review_task_result(decision=accept)` | Could reduce test churn | Rejected | Remove `accept_task`; update tests/docs/prompts |
| Restore `mark_task_completed` / `mark_task_failed` | `origin/personal` already implemented them | Rejected | Implement `submit_task_result` with clearer intent |
| Keep send-message task lifecycle as fallback | Could preserve current behavior | Rejected | Prompts/docs/tests require task protocol tools |
| Support both `awaiting_acceptance` and `awaiting_review` | Could ease migration | Rejected | Use one target state name: `awaiting_review` |

## Derived Layering (If Useful)

- Model-facing tool layer: provider adapters + shared manifest/schema/parser.
- Task lifecycle layer: `TaskDelegationService` + ledger + activation/notification/event/settlement concerns.
- Runtime layer: `TeamRun` start/post/settle boundaries.
- Communication layer: `send_message_to` remains separate for generic teammate messages.

## Migration / Refactor Sequence

1. Update task domain types in `task-delegation-record.ts`:
   - statuses: `not_started`, `active`, `awaiting_review`, `accepted`;
   - add `SubmitTaskResultInput`, `ReviewTaskResultInput`, result/review payload/history types;
   - add `pendingSubmissionId`, `TaskResultSubmission.submissionId`, `TaskResultReview.reviewedSubmissionId`, and notification outcome/warning result types;
   - remove `AcceptTaskInput` from active tool contract.
2. Update `TaskDelegationLedger`:
   - keep creation/bind/active behavior;
   - add `submitResult` transition `active -> awaiting_review` that creates a submission ID and sets `pendingSubmissionId`;
   - add `reviewResult` transition `awaiting_review -> active` for revision, `awaiting_review -> accepted` for acceptance, recording `reviewedSubmissionId = pendingSubmissionId` and clearing `pendingSubmissionId`;
   - preserve result/review history;
   - add `hasOpenWorkBlockingTaskAgentSettlement(taskAgentRunId)` or an equivalent combined query covering assigned non-terminal work and child delegations where `delegator.taskAgentRunId` matches.
3. Add `TaskDelegationNotificationDispatcher`:
   - port the useful routing pattern from `origin/personal` completion notifier;
   - generalize to result-submitted and revision-requested notifications;
   - route to original delegator, including task-agent delegators;
   - return deterministic `NotificationDeliveryOutcome` values instead of throwing away rejected delivery details.
4. Update `TaskDelegationService`:
   - add `submitTaskResult` and `reviewTaskResult`;
   - remove `acceptTask`;
   - sequence ledger mutation first, event publication second, system notification attempt third, then deterministic tool result/warnings;
   - do not roll back valid lifecycle mutations because notification delivery failed;
   - request settlement only through the extended no-open-work guard.
5. Update tool contract/manifest/schema/parser/wrappers:
   - tool list becomes `delegate_tasks`, `submit_task_result`, `review_task_result`;
   - add wrappers/files for new tools;
   - delete `accept-task.ts`.
6. Update runtime projections for Codex, Claude, and AutoByteus to expose configured new task tool names via the shared manifest.
7. Update work packet and runtime instructions:
   - task-agent result -> `submit_task_result`;
   - delegator result review -> `review_task_result`;
   - `send_message_to` only for general non-lifecycle communication.
8. Update events/websocket mapping if payload names or statuses change; keep frontend-consumable task-agent identity explicit.
9. Update tests:
   - unit parser/manifest/ledger/service tests;
   - integration tool lifecycle tests;
   - runtime projection tests;
   - source scans for removed tool names outside historical artifacts;
   - live/harnessed E2E for result -> revision -> result -> accept;
   - notification-failure tests for result and revision paths;
   - review-to-submission linkage tests for latest pending submission;
   - nested child-delegation settlement-blocking tests.
10. Update docs and ticket handoff artifacts.

## Key Tradeoffs

- The target adds one tool compared with the current branch, but removes ambiguity and eliminates lifecycle dependence on free-form message content.
- The target has fewer active task tools than `origin/personal` while preserving its system notification insight.
- Keeping `send_message_to` available for generic communication creates a residual prompt risk, mitigated by making task lifecycle instructions explicit and by not including task-agent exact-run lifecycle hints in work packets.

## Risks

- Runtime/provider tool projection tests may fail because of stale `accept_task` expectations.
- Frontend event payload consumers may need updates for `awaiting_review` and result/review event payloads.
- Live models may require prompt wording validation so they use `review_task_result` reliably.
- Notification delivery is intentionally non-transactional after valid lifecycle mutation: record state, publish event, attempt notification, log/return deterministic warning on failure. The residual risk is operational awareness of the warning, not ambiguous state.

## Guidance For Implementation

- Start from current branch, not `origin/personal`; use `origin/personal` only as a reference for system notification routing.
- Do not copy old names into active contract.
- Keep `TaskDelegationService` as the lifecycle owner; add methods rather than having wrappers coordinate lower-level pieces.
- Avoid generic `status` fields in model-facing tools. Use explicit `decision` only in `review_task_result`.
- `submit_task_result` should be selector-free and context-bound to the current task-agent.
- `review_task_result(request_revision)` should be the only task revision path; it should attempt a system message to the task-agent and return deterministic notification warning details if delivery is rejected.
- `review_task_result(accept)` should be the only successful finalization path and should reuse the extended safe settlement gates: no assigned non-terminal work and no child delegations owned by the task-agent run.
- `review_task_result` must link to the latest pending submission by ledger invariant; do not add model-facing submission selectors unless a future requirement explicitly needs reviewing older submissions.

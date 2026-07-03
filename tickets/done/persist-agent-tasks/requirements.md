# Requirements Doc

## Status (`Draft`/`Design-ready`/`Refined`)

Refined — re-investigated against latest `origin/personal` (`57185192d4b93840dab1fb7134604b1716a600a8`), approved for design on 2026-07-01, refined through user review on 2026-07-02 with the final address-first `TaskDelegationRecord` data contract, and revised after architecture review round 1 to make active pre-activation state, root-scoped task-team persistence, and address-perspective task display explicit.

## Goal / Problem Statement

Persist delegated agent task records on the backend so delegated member tasks and delegated team/review tasks remain visible after transient task-agent/task-team runtimes disappear, after backend/frontend reload, and after machine restart. The desired durability is analogous to persisted inter-agent/team communication messages: runtime delivery remains live/transient, but the user-facing task record remains available in the Team tab and run history.

## Investigation Findings

- Rebased/reset the ticket worktree to latest `origin/personal` at commit `57185192d4b93840dab1fb7134604b1716a600a8` (`docs(delivery): record v1.3.91 release finalization`) before re-running investigation.
- The current task-delegation lifecycle is still owned by `TaskDelegationService` and an in-memory `TaskDelegationLedger` under `autobyteus-server-ts/src/agent-team-execution/task-delegation/`.
- `TaskDelegationLedger` still stores records in a private `Map`, uses an in-memory `idCounter`, and exposes lifecycle transitions for create, activation, result submission, review, accepted terminal state, and settlement checks.
- Latest task tool result shapes were simplified: `delegate_task` returns only `{ task_id, status: "active" }` on success or `{ task_id, status: "not_started", message }` on activation failure; `submit_task_result` and revision review return concise result objects. The current internal `TaskDelegationRecord` contains full execution, submission, review, and settlement data, but its shape mixes durable task facts with active-runtime-only fields; this task should refactor it into the explicit durable-first contract below.
- The ledger is scoped to an active `TaskDelegationService` stored in `TaskDelegationRunRegistry`. `AgentTeamRunManager.unregisterActiveRun(...)` detaches the registry entry, so task records disappear with the active team runtime.
- Task reference content currently resolves through `TaskDelegationReferenceContentService -> TaskDelegationRunRegistry.getExisting(...)`; once the active service is gone, task references are not resolvable from persisted data.
- Accepted task lifecycle transitions emit `TeamRunEventSourceType.TASK_DELEGATION` events, which the websocket mapper projects as `TASK_DELEGATION_EVENT` for live frontend task-agent/task-team projection. These events are not currently persisted as a durable task read model.
- Latest Team Communication persistence now stores `TeamCommunicationProjection { teamRunId, messages }`; messages use `senderAddress` and `receiverAddress` conversation-target segments. The persistence pattern remains the same: `TeamCommunicationService` attaches to active team runs, normalizes message events, writes `team_communication_messages.json` under the team memory directory, exposes `getTeamCommunicationMessages(teamRunId)`, and frontend hydration loads that projection for live and historical runs.
- The frontend Tasks section still derives current entries from transient task-agent/task-team projection nodes in `AgentTeamContext.memberTree`. `TeamStreamingService` removes task-agent nodes after offline status and task-team projection nodes after terminal cleanup, so the UI loses task visibility when the transient execution disappears.
- No existing durable task-delegation records store/read API was found on latest `origin/personal`.
- Current task tool routing can resolve task-team child `TeamRun`s through `TaskTeamActiveRunDirectory`, so task-team-local delegations are in scope and must persist into the root team run records file rather than a child-local file.
- Current ledger creation uses `status: "not_started"` before activation; because the durable record contract excludes `not_started`, implementation must keep pre-activation state in an active-only ledger entry and only construct/persist a `TaskDelegationRecord` after activation succeeds.

## Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Feature plus behavior durability change.
- Initial design issue signal (`Yes`/`No`/`Unclear`): Yes.
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Missing Invariant and Boundary Or Ownership Issue.
- Refactor posture (`Likely Needed`/`Likely Not Needed`/`Deferred`/`Unclear`): Likely Needed.
- Evidence basis: Backend task records are active-runtime `Map` entries, while frontend task display is derived from transient execution projection nodes that are intentionally removed after settlement/offline. Existing Team Communication persistence demonstrates a separate durable read-model owner is the healthy shape.
- Requirement or scope impact: The change must add a durable task read-model/persistence owner and frontend hydration/read logic, not only keep task-agent runtime nodes alive longer.

## Recommendations

- Add a backend durable task-delegation records/read model under the existing server task-delegation capability area, analogous to Team Communication projection storage but task-owned.
- Persist normalized `TaskDelegationRecord` records from the authoritative task lifecycle owner after committed task transitions, including created task details, taskRun reference, status, submissions, reviews, and timestamps. Do not depend on the simplified public tool-result shape for persisted task data.
- Expose persisted task records through a backend read API for live and historical team runs.
- Update frontend Team-tab task rendering to derive task entries from persisted task records, optionally enriched by live transient execution context when available, rather than depending only on transient task-agent/task-team nodes.
- Keep runtime resumption out of scope: persisted tasks are historical/visible records, not instructions to restart task-agent or task-team executions after shutdown.

## Scope Classification (`Small`/`Medium`/`Large`)

Medium.

## In-Scope Use Cases

- `UC-PTASK-001`: A coordinator delegates a task to an agent member and the user can still see that task after UI reload or backend restart.
- `UC-PTASK-002`: A coordinator delegates a task to a team target and the user can still see that task record after the task-team execution disappears.
- `UC-PTASK-003`: A task-agent or task-team ingress submits a task result; the persisted task record reflects `awaiting_review` and the submission metadata/content.
- `UC-PTASK-004`: A review owner requests revision or accepts a submitted result; the persisted task record reflects the review decision, status, comments, and terminal state when accepted.
- `UC-PTASK-005`: A historical/inactive team run opened from run history shows its persisted delegated tasks without requiring active runtime restoration.
- `UC-PTASK-006`: Task reference files remain openable through the task-owned reference content route after active runtime teardown when the stored referenced file is still readable.
- `UC-PTASK-007`: A task-team child run delegates a local task to a visible member or team in that child context; the task is persisted in the root team run records file and is hydrated from the root run history.
- `UC-PTASK-008`: When the user focuses an agent/team address, the task list shows task records related to that focused address by the same sender/receiver-address perspective used for communication messages, without requiring a live transient task node.

## Out of Scope

- Automatically resuming, restarting, or rehydrating task-agent/task-team runtime execution after shutdown.
- Changing the model-facing task tool protocol (`delegate_task`, `submit_task_result`, `review_task_result`) beyond data needed for persistence/read APIs.
- Reclassifying `send_message_to` as a task result/review protocol.
- Backfilling task records for old runs that never persisted task-delegation data.
- Persisting failed activation attempts as user-visible tasks, unless a later design review explicitly chooses to show `not_started` failures. This scope is durable visibility for accepted/activated delegated work and its result/review lifecycle.
- Building global task search, analytics dashboards, or cross-run task management.
- Replacing the existing Team Communication persistence model.

## Functional Requirements

- `REQ-PTASK-001`: The backend must persist a durable task-delegation record for each accepted/activated delegated task associated with a root team run.
- `REQ-PTASK-002`: Persisted task records must include stable task identity, team run identity, senderAddress, receiverAddress, receiverTargetKind, taskRun reference when activation succeeds, task content, reference files, status, creation timestamp, and per-update timestamps.
- `REQ-PTASK-003`: The backend must persist task lifecycle updates for activation, result submission, result review, revision request, and acceptance without creating duplicate task records.
- `REQ-PTASK-004`: Persisted task records must include result-submission and review history sufficient to inspect the submitted message, review decision/comment, linked submission/review ids, reference files, and timestamps.
- `REQ-PTASK-005`: The backend must expose a read API that returns persisted task records by `teamRunId` for active and inactive/historical team runs.
- `REQ-PTASK-006`: The frontend must hydrate delegated task records for a team run when opening or reloading that team run, including historical team runs.
- `REQ-PTASK-007`: The Team-tab task section must show persisted delegated tasks even when the concrete task-agent/task-team runtime projection node has been removed or the runtime is no longer active.
- `REQ-PTASK-008`: Live task-agent/task-team runtime state may enrich persisted task records while active, but persisted task visibility must not depend on live runtime context.
- `REQ-PTASK-009`: Task reference content resolution must use persisted task records when no active task-delegation service is available, while retaining existing active-run behavior.
- `REQ-PTASK-010`: Persisting task records must not change runtime lifecycle semantics: inactive task-agents/task-teams must not be resurrected, and task tool actions must still require the current active bound execution context.
- `REQ-PTASK-011`: Existing Team Communication message persistence, hydration, and reference-content behavior must remain unchanged, including the latest `senderAddress`/`receiverAddress` address-segment contract.
- `REQ-PTASK-012`: Missing or corrupt task record files must degrade safely to an empty task list with a backend warning rather than breaking team history loading.
- `REQ-PTASK-013`: Persisted task data must come from the internal authoritative task record/transition data, not from the concise public tool result returned to the model.
- `REQ-PTASK-014`: New delegated task ids for a root team run must not collide with already persisted task records after backend restart, team-run restore, task-team child service creation, or task-delegation service recreation.
- `REQ-PTASK-015`: The persisted task file must store normalized durable `TaskDelegationRecord` records from authoritative task lifecycle records, including normalized task-owned reference file objects (`referenceId`, `path`, `type`, timestamps) and address-first sender/receiver identity. It must not be only a raw active-ledger dump or raw reference-path array.
- `REQ-PTASK-016`: The durable `TaskDelegationRecord` status union must exclude `not_started`; pre-activation, binding, and rollback state must be represented only by active ledger/binding structures and must be discarded on activation failure.
- `REQ-PTASK-017`: For task-team child runs, persistence, task id allocation, readback, hydration, and reference fallback must use the root team run memory scope (`rootTeamRunId`) while preserving root-scoped conversation addresses for child-context senders, receivers, task runs, submissions, and reviews.
- `REQ-PTASK-018`: Frontend task visibility for a focused participant must be derived from the persisted task record addresses, analogous to Team Communication: sent tasks match the focused address against `senderAddress`, received tasks match it against `receiverAddress`, and optional live nodes may only enrich matching records.
- `REQ-PTASK-019`: For `receiverTargetKind = "team"`, the durable record must preserve that the accountable task target is a team while `receiverAddress` represents the actual task packet receiver/inbox address inside the started task-team execution, normally the ingress coordinator address under the task-team address chain. This lets the coordinator perspective show the received task without adding duplicate receiver identity objects.


## Required Task Delegation Records File Data Contract

The durable file must be one task-delegation records file per root team run. In this file envelope, `teamRunId` means the root team run id / storage team run id, not necessarily the current local task-team child run id:

```text
<memoryDir>/agent_teams/<teamRunId>/task_delegation_records.json
```

The file must be shaped as:

```ts
type TaskDelegationRecordsFile = {
  teamRunId: string;
  records: TaskDelegationRecord[];
};
```

`TaskDelegationRecord` must be the normalized durable task lifecycle record, not a raw active-ledger dump. It should intentionally mirror Team Communication's address-first shape: task assignment is `senderAddress + receiverAddress + content + referenceFiles`, with only small task-specific lifecycle fields around it.

```ts
type ConversationTargetAddress = {
  parentTeamRunId?: string | null;
  segments: Array<
    | { kind: "member"; memberRouteKey?: string; memberPath?: string[] }
    | { kind: "task_team"; taskTeamRunId: string }
    | { kind: "task_agent"; taskAgentRunId: string }
  >;
};

type TaskDelegationRecord = {
  taskId: string;
  status: "active" | "awaiting_review" | "accepted";
  senderAddress: ConversationTargetAddress;
  receiverAddress: ConversationTargetAddress;
  receiverTargetKind: "member" | "team";
  content: string;
  referenceFiles: TaskReferenceFile[];
  taskRun: TaskRunReference | null;
  updates: TaskUpdate[];
  createdAt: string;
};
```

This type is both the durable JSON record and the target durable-first in-memory task record shape. Active-runtime-only data required for validation, notification, rollback, or settlement must live in task-delegation active state/bindings outside this persisted record.

The record must not duplicate sender/receiver identity as parallel `name`, `routeKey`, `path`, `runId`, `role`, or `description` objects. Address segments are the canonical persisted endpoint identity, just like communication messages. `receiverTargetKind` is the one allowed endpoint semantic supplement because the receiver address alone tells where the task packet was received, while task delegation must also preserve whether the accountable target was a physical member or a team.

Task run is task-specific runtime context and should stay compact:

```ts
type TaskRunReference = {
  address: ConversationTargetAddress;
  startedAt: string;
};
```

Task-owned reference files must be normalized objects, not only raw paths:

```ts
type TaskReferenceFile = {
  referenceId: string;
  path: string;
  type: "file" | "image" | "audio" | "video" | "pdf" | "csv" | "excel" | "other";
  createdAt: string;
  updatedAt: string;
};
```

Submission and review history must also use message-like update entries instead of separate sender/reviewer identity objects:

```ts
type TaskUpdate = TaskSubmissionUpdate | TaskReviewUpdate;

type TaskSubmissionUpdate = {
  kind: "submission";
  submissionId: string;
  senderAddress: ConversationTargetAddress;
  receiverAddress: ConversationTargetAddress;
  content: string;
  referenceFiles: TaskReferenceFile[];
  createdAt: string;
};

type TaskReviewUpdate = {
  kind: "review";
  reviewId: string;
  senderAddress: ConversationTargetAddress;
  receiverAddress: ConversationTargetAddress;
  reviewedSubmissionId: string;
  decision: "accept" | "request_revision";
  content: string | null;
  referenceFiles: TaskReferenceFile[];
  createdAt: string;
};
```

The pending submission id is not stored as a separate field. It is derived when needed from `status` and `updates`: when `status === "awaiting_review"`, the pending submission is the latest submission update whose `submissionId` has not yet appeared as any review update's `reviewedSubmissionId`.

`not_started` is not a durable record state. Active implementation must use an active-only lifecycle structure like this before activation succeeds:

```ts
type TaskDelegationPersistenceScope = {
  rootTeamRunId: string;
  currentTeamRunId: string;
  teamRunPath: string[];
};

type ActiveTaskDelegationStartingEntry = {
  phase: "starting";
  taskId: string;
  persistenceScope: TaskDelegationPersistenceScope;
  target: TaskDelegationTarget;
  reviewOwner: TaskDelegationDelegatorIdentity;
  senderAddress: ConversationTargetAddress;
  receiverAddress: ConversationTargetAddress;
  receiverTargetKind: "member" | "team";
  content: string;
  referenceFiles: TaskReferenceFile[];
  boundExecution: TaskExecutionInstance | null;
  delegatorReplyRecipientName: string | null;
  delegatorReplyTargetAgentRunId: string | null;
  createdAt: string;
};

type ActiveTaskDelegationRecordEntry = {
  phase: "record";
  persistenceScope: TaskDelegationPersistenceScope;
  record: TaskDelegationRecord;
  target: TaskDelegationTarget;
  reviewOwner: TaskDelegationDelegatorIdentity;
  taskRunExecution: TaskExecutionInstance;
  delegatorReplyRecipientName: string | null;
  delegatorReplyTargetAgentRunId: string | null;
};

type TaskDelegationLedgerEntry =
  | ActiveTaskDelegationStartingEntry
  | ActiveTaskDelegationRecordEntry;
```

Only `ActiveTaskDelegationRecordEntry.record` may be persisted. `ActiveTaskDelegationStartingEntry` is deleted on activation failure after active runtime rollback. The public `delegate_task` failure result may still return `status: "not_started"`, but that value is a tool-result status only and must not become a durable record status or persisted task row.

Identity rules:

- `senderAddress` and `receiverAddress` use the same `ConversationTargetAddress` contract as Team Communication and are normalized as root-scoped addresses for persisted records.
- A plain same-team member address is `{ segments: [{ kind: "member", memberRouteKey }] }`.
- A task-agent address appends `{ kind: "task_agent", taskAgentRunId }` after its logical member segment.
- A task-team taskRun address uses the same task-team segment convention already used by communication: logical team member segment, then `{ kind: "task_team", taskTeamRunId }`.
- For task-team child-run local delegations, sender/receiver/update addresses must include the root-visible task-team segment chain (for example logical team member segment -> `task_team` segment -> child member segment) so root-run hydration can render the task without a child-local records file.
- `receiverTargetKind = "member"` means the task was addressed to a physical same-team agent member from the sender's current team context; `receiverAddress` is that member address.
- `receiverTargetKind = "team"` means the task was addressed to a visible same-team `agent_team` / subteam as accountable owner; `receiverAddress` is the actual receiving inbox for the task packet inside the started task-team execution, normally logical team member segment -> `task_team` segment -> ingress/coordinator member segment.
- Frontend focused-task perspectives must use addresses, not live-node ownership: focused sender address shows sent tasks; focused receiver/inbox address shows received tasks; optional address-prefix grouping may show nested task-team records under a stable ancestor, but exact transient addresses are only focusable while their nodes exist.
- Persisted records must not be accepted as active task run authority for task tools.

## Acceptance Criteria

- `AC-PTASK-001`: After a successful `delegate_task` call, a durable task record exists under the team run's memory/history storage and contains exactly one record for the new `taskId` with status `active`, task content, senderAddress, receiverAddress, receiverTargetKind, reference files, and task run address.
- `AC-PTASK-002`: After `submit_task_result`, the same persisted task record changes to `awaiting_review`, appends a submission update with message-like sender/receiver addresses, content, references, and timestamp without duplicating the task.
- `AC-PTASK-003`: After `review_task_result(decision="request_revision")`, the same persisted task record returns to `active`, records a review update with review id, reviewed submission id, decision, comment content, references, and review timestamp.
- `AC-PTASK-004`: After `review_task_result(decision="accept")`, the persisted task record has status `accepted`, a review update whose `content` contains the acceptance comment when present; it remains queryable after runtime settlement/removal.
- `AC-PTASK-005`: After terminating or restarting the backend, `getTaskDelegationRecords(teamRunId)` or the chosen equivalent read API returns the persisted task records for a team run with saved task data.
- `AC-PTASK-006`: Opening a historical/inactive team run hydrates its persisted task records into the Team-tab task section without starting or restoring task-agent/task-team runtimes.
- `AC-PTASK-007`: A task reference selected after active runtime teardown fetches through `/rest/team-runs/:teamRunId/task-delegations/:taskId/references/:referenceId/content` when the referenced file still exists and is readable.
- `AC-PTASK-008`: When no persisted task records file exists for an older team run, the read API returns an empty list and the UI shows the normal empty state; it must not fabricate tasks from unrelated messages or raw prose.
- `AC-PTASK-009`: Existing `getTeamCommunicationMessages` hydration and team message reference routes continue to pass their current tests and behavior.
- `AC-PTASK-010`: Active task tool calls still reject stale/no-active/unbound task-agent or task-team contexts as they do today; persisted task records are not accepted as active task run authority.
- `AC-PTASK-011`: Persisted task records contain full task-run/submission/review details even though public tool results expose only concise `task_id`, `status`, and optional `message` fields.
- `AC-PTASK-012`: If a root team run already has persisted task ids such as `task_0001` and the backend later recreates any root or task-team-child task-delegation service, the next delegated task uses a non-colliding root-scoped id and appends/updates a distinct persisted record.
- `AC-PTASK-013`: A persisted task record can be rendered by the frontend without live task-agent/task-team nodes: it includes task id/content/status, senderAddress, receiverAddress, receiverTargetKind, normalized references, update history, and timestamps.
- `AC-PTASK-014`: If task activation fails before the runtime accepts the task-agent/task-team start, no `TaskDelegationRecord` is written, no durable `not_started` record exists, and the active starting entry is removed or rolled back.
- `AC-PTASK-015`: A delegation created inside an active task-team child run is written to the root team run `task_delegation_records.json`; root run hydration returns it with root-scoped sender/receiver/taskRun addresses and without creating a child-local task records file.
- `AC-PTASK-016`: Given a focused sender address, the frontend task perspective includes persisted tasks whose `senderAddress` matches that address; given a focused receiver address, it includes persisted tasks whose `receiverAddress` matches that address, even when the matching task has no live task-agent/task-team node.
- `AC-PTASK-017`: For a team-target delegation, the persisted record has `receiverTargetKind = "team"` and a receiver address for the task-team ingress/coordinator inbox; focusing that coordinator address shows the task as received without storing a second receiver identity object.

## Constraints / Dependencies

- Existing team memory layout uses `AgentMemoryLayout.getTeamDirPath({ rootTeamRunId, teamRunPath: [] })` for root team-run durable files.
- Existing Team Communication persistence stores `team_communication_messages.json` under the team memory directory and provides the strongest local pattern for this request.
- Latest Team Communication read models use `ConversationTargetAddress` segment arrays instead of older sender/receiver participant field groups.
- Current task records and transition types are defined in `task-delegation-record.ts`; the durable model should reuse or tighten that shape rather than inventing a parallel task concept.
- Current task-team child runs inherit root memory scope via `parentBoundary.memoryScope`; durable task records must use root scope rather than child-local run ids.
- Current frontend task UI derives from `AgentTeamContext.memberTree`; this must be adjusted so persisted task visibility is independent from transient execution nodes.

## Assumptions

- The primary product goal is durable visibility/auditability of delegated tasks, not automatic task run recovery.
- Persisted task records should remain root-team-run-scoped, matching the root Team Communication/history storage model.
- Persisted records should be useful for UI display and reference-content resolution even when active task runtime state is absent.
- Task history should be preserved for new task lifecycle events after this change; old runs with no saved task records file cannot be reconstructed reliably in scope.
- Task display follows the Team Communication perspective model: persisted addresses are the source of truth for sender/receiver relevance.

## Risks / Open Questions

- Existing task-delegation websocket events do not carry every detail in `TaskDelegationRecord` (notably full submission message/reference history), so implementation should persist from the task lifecycle owner or enrich event payloads deliberately.
- The current UI section is named internally as active tasks and current cleanup removes terminal transient nodes; frontend design must avoid conflating persisted task records with execution liveness.
- Persistence failure policy must be explicit in design: task lifecycle should not silently claim durability if writes fail, but rolling back already-started runtime work can also be unsafe.
- Root-vs-child scope mistakes would fragment task history; implementation must use explicit `TaskDelegationPersistenceScope` for writes/id allocation and root `teamRunId` for readback.

## Requirement-To-Use-Case Coverage

| Requirement | Use Cases Covered |
| --- | --- |
| `REQ-PTASK-001` | `UC-PTASK-001`, `UC-PTASK-002`, `UC-PTASK-005` |
| `REQ-PTASK-002` | `UC-PTASK-001`, `UC-PTASK-002`, `UC-PTASK-005` |
| `REQ-PTASK-003` | `UC-PTASK-003`, `UC-PTASK-004` |
| `REQ-PTASK-004` | `UC-PTASK-003`, `UC-PTASK-004` |
| `REQ-PTASK-005` | `UC-PTASK-005` |
| `REQ-PTASK-006` | `UC-PTASK-005` |
| `REQ-PTASK-007` | `UC-PTASK-001`, `UC-PTASK-002`, `UC-PTASK-005` |
| `REQ-PTASK-008` | `UC-PTASK-001`, `UC-PTASK-002` |
| `REQ-PTASK-009` | `UC-PTASK-006` |
| `REQ-PTASK-010` | `UC-PTASK-005` |
| `REQ-PTASK-011` | All, regression guard |
| `REQ-PTASK-012` | `UC-PTASK-005` |
| `REQ-PTASK-013` | `UC-PTASK-001`, `UC-PTASK-003`, `UC-PTASK-004` |
| `REQ-PTASK-014` | `UC-PTASK-001`, `UC-PTASK-002`, `UC-PTASK-005`, `UC-PTASK-007` |
| `REQ-PTASK-015` | `UC-PTASK-001`, `UC-PTASK-002`, `UC-PTASK-005`, `UC-PTASK-006` |
| `REQ-PTASK-016` | `UC-PTASK-001`, `UC-PTASK-002`, `UC-PTASK-007` |
| `REQ-PTASK-017` | `UC-PTASK-002`, `UC-PTASK-005`, `UC-PTASK-007` |
| `REQ-PTASK-018` | `UC-PTASK-001`, `UC-PTASK-002`, `UC-PTASK-008` |
| `REQ-PTASK-019` | `UC-PTASK-002`, `UC-PTASK-008` |

## Acceptance-Criteria-To-Scenario Intent

| Acceptance Criterion | Scenario Intent |
| --- | --- |
| `AC-PTASK-001` | New delegated task is durably recorded at activation time. |
| `AC-PTASK-002` | Result submission updates the durable record in place with inspectable submission details. |
| `AC-PTASK-003` | Revision review updates durable lifecycle and review history. |
| `AC-PTASK-004` | Accepted/terminal tasks remain visible and inspectable after runtime cleanup. |
| `AC-PTASK-005` | Backend restart/inactive run readback works. |
| `AC-PTASK-006` | Frontend run-history hydration shows tasks without runtime restoration. |
| `AC-PTASK-007` | Task reference content remains task-owned and durable. |
| `AC-PTASK-008` | Older runs without task data degrade safely. |
| `AC-PTASK-009` | Message persistence remains unaffected. |
| `AC-PTASK-010` | Durable records do not become active runtime authority. |
| `AC-PTASK-011` | Latest concise tool-result cleanup does not weaken persisted task detail. |
| `AC-PTASK-012` | Task id allocation remains stable and non-colliding across root and child service recreation/restart. |
| `AC-PTASK-013` | Durable task JSON is directly useful for frontend display and reference lookup without reconstructing from live nodes or messages. |
| `AC-PTASK-014` | Failed activation remains active-only and creates no durable `not_started` record. |
| `AC-PTASK-015` | Task-team child-run delegations persist into and hydrate from the root team run records file. |
| `AC-PTASK-016` | Focused task perspective is sender/receiver-address based. |
| `AC-PTASK-017` | Team-target tasks are received under the ingress/coordinator address while preserving team target kind. |

## Approval Status

Approved by the user on 2026-07-01 via 'lets go with the design now'. The user approved the address-first `TaskDelegationRecord` contract during 2026-07-02 design review and requested kickoff. Architecture review round 1 then required design-impact clarification; this revision adds `REQ-PTASK-016` / `AC-PTASK-014` for active-only pre-activation state, `REQ-PTASK-017` / `AC-PTASK-015` for root-scoped task-team child-run persistence, and `REQ-PTASK-018`-`REQ-PTASK-019` / `AC-PTASK-016`-`AC-PTASK-017` for address-perspective task display.

# Design Spec

## Current-State Read

The current task-delegation path is a healthy active-runtime lifecycle spine, but it has no durable read model.

Current backend flow:

`delegate_task / submit_task_result / review_task_result -> TaskDelegationToolRunRouter -> TaskDelegationService -> TaskDelegationLedger -> TaskDelegationEventPublisher / Notification / Settlement`

Current ownership boundaries:

- `TaskDelegationService` is the use-case owner for task delegation, result submission, review, notification, and settlement sequencing.
- `TaskDelegationLedger` owns active in-memory task records and lifecycle transitions.
- `TaskDelegationActivationCoordinator` currently owns activation work and also publishes activation events.
- `TaskDelegationRunRegistry` owns only active `TaskDelegationService` instances; `detach(teamRunId)` disposes the service and drops the ledger.
- `TaskDelegationReferenceContentService` resolves task references only through an active `TaskDelegationService`.
- Frontend task visibility is derived from transient task-agent/task-team projection nodes in `AgentTeamContext.memberTree`; those nodes are intentionally removed after task-agent offline or task-team terminal cleanup.

Current durable-message contrast:

- Team Communication uses a separate durable records owner: active events are normalized, queued, atomically written to `team_communication_messages.json`, read through `getTeamCommunicationMessages(teamRunId)`, and hydrated into a frontend store for live/historical team runs.
- Latest Team Communication records use `senderAddress` and `receiverAddress` `ConversationTargetAddress` segment arrays. This design must preserve that behavior and not mix task persistence into the communication subsystem.

Current task-target product semantics from existing tickets/source:

- `delegate_task` has intentionally hierarchy-bound targets. A member can delegate to another physical agent member in its current team context, excluding itself.
- A member can also delegate to a visible current-team `agent_team` / subteam wrapper as the accountable team target; that team's ingress receives the task packet, but the accountable target is the team, not the representative as a parent-context member.
- A member cannot delegate to arbitrary invisible nested leaf agents or to communication representatives unless they also appear as valid delegation targets in the current team context.
- Therefore the durable record should reuse the existing address-first communication identity. `senderAddress` and `receiverAddress` carry task-perspective identity, while a single `receiverTargetKind` field preserves the task-only distinction between a physical member target and an accountable visible team/subteam target. For team targets, the accountable target is the team, but the receiving inbox is the task-team ingress/coordinator address inside the started task-team execution.

Current coupling/fragmentation problems for the requested behavior:

- Task records are active-runtime `Map` entries, so they disappear on backend restart or active run detach.
- The UI task list depends on runtime projection nodes, so durable task visibility cannot survive cleanup.
- Task reference content is task-owned but active-service-only, so historical task references fail even if the stored file still exists.
- Current task events are live projections and do not carry full submitted result message/reference history; persisting from those events would produce an incomplete task record.
- Latest public task tool outputs are intentionally concise, so public tool results are not a valid persistence source.
- Persisting tasks introduces a new task-id collision risk after restart because `TaskDelegationLedger.idCounter` currently restarts at zero.
- Current task tool routing can resolve task-team child `TeamRun`s via `TaskTeamActiveRunDirectory`; those child services have local `runId`s but inherit a root memory scope through `runtimeContext.parentBoundary.memoryScope`.

Constraints the target design must respect:

- Runtime task run remains transient; persisted task records must not resurrect or authorize old task-agent/task-team task runs.
- Existing task tools and public result shapes stay unchanged.
- `send_message_to` remains ordinary communication only.
- Durable storage must use `AgentMemoryLayout` under the root team-run memory directory.
- Missing or corrupt task records files must degrade to an empty task list with a backend warning.
- Existing Team Communication behavior, storage, GraphQL, hydration, and address contracts remain unchanged.

## Intended Change

Add a task-delegation-owned durable task-record/read model for delegated tasks, and refactor `TaskDelegationRecord` toward the same durable-first shape.

The target behavior is:

1. `TaskDelegationService` remains the authoritative active lifecycle owner.
2. Before activation succeeds, `TaskDelegationService` and `TaskDelegationLedger` keep only active-only starting/binding state; no durable `TaskDelegationRecord` exists and activation failure deletes/rolls back that starting entry.
3. After activation succeeds and after each in-scope committed lifecycle transition, `TaskDelegationService` normalizes the authoritative activated `TaskDelegationRecord` and writes that record into the task-delegation records file under the root team-run memory directory.
4. A new backend read API returns persisted task records by root `teamRunId` for active and historical runs.
5. Frontend root run hydration loads persisted task records into a task-delegation store.
6. The Team tab task section derives records from persisted task records using sender/receiver-address perspective logic, enriched by live transient task-agent/task-team context when available.
7. The task reference content route keeps active lookup first but falls back to persisted root task records when no active task service exists.
8. Task id allocation is root-scoped through the durable records owner so recreated root services and task-team child services do not reuse existing persisted task ids.

The durable records file stores display/readback-oriented `TaskDelegationRecord` records sourced from authoritative task lifecycle transitions. It should follow the Team Communication lesson directly: persist normalized records that the frontend can retrieve and render, with address-first sender/receiver identity instead of duplicated participant objects. A task assignment is effectively a message-like record (`senderAddress`, `receiverAddress`, `content`, `referenceFiles`) plus task lifecycle fields (`taskId`, `status`, taskRun reference, update history). Frontend task perspectives must be address-based: sent tasks match the focused address against `senderAddress`; received tasks match it against `receiverAddress`; live task nodes are enrichment only.


## Target Task Delegation Records File Shape

The durable task file stores normalized durable task records, not raw active-ledger state. It is one file per root team run; `TaskDelegationRecordsFile.teamRunId` means the root storage team run id, even when an individual record was produced by a task-team child run service:

```text
<memoryDir>/agent_teams/<teamRunId>/task_delegation_records.json
```

```ts
type TaskDelegationRecordsFile = {
  teamRunId: string;
  records: TaskDelegationRecord[];
};

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

type TaskRunReference = {
  address: ConversationTargetAddress;
  startedAt: string;
};

type TaskReferenceFile = {
  referenceId: string;
  path: string;
  type: "file" | "image" | "audio" | "video" | "pdf" | "csv" | "excel" | "other";
  createdAt: string;
  updatedAt: string;
};

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

This type is both the durable JSON record and the target durable-first record object used inside activated active ledger entries. It is not the entire active ledger entry. Active-runtime-only data required for pre-activation binding, validation, notification, rollback, or settlement must live in task-delegation active state/bindings outside this persisted record.

The pending submission id is not stored as a separate field. It is derived when needed from `status` and `updates`: when `status === "awaiting_review"`, the pending submission is the latest submission update whose `submissionId` has not yet appeared as any review update's `reviewedSubmissionId`.

Design rule: the task-delegation record model owns durable task facts directly, while records/file normalization validates and clones the address-first shape before storage/readback. It must not introduce parallel `sender`/`receiver` identity objects with duplicated names, route keys, paths, roles, descriptions, or run ids. If a value is already represented by the `ConversationTargetAddress`, the task record does not store it again. `receiverTargetKind` is allowed because it is task semantics, not duplicate identity: it says whether the task was delegated to a member or to an accountable team.

### Persistence Scope And Root-Team Storage

Task records are stored by root team run, not by whichever active `TeamRun` service happens to own the local lifecycle transition. Add an explicit scope resolved at `TaskDelegationService` construction:

```ts
type TaskDelegationPersistenceScope = {
  rootTeamRunId: string;
  currentTeamRunId: string;
  teamRunPath: string[];
};
```

Resolution rule:

- For a root team run, `rootTeamRunId = currentTeamRunId = teamRun.runId` and `teamRunPath = []`.
- For a task-team child run, use `teamRun.context.runtimeContext.parentBoundary.memoryScope`: `rootTeamRunId` is inherited from the root run and `teamRunPath` includes the task-team child run id path. `currentTeamRunId` remains the local child `teamRun.runId` for active lifecycle checks.
- `TaskDelegationRecordsService` APIs that write, reserve ids, read high watermark, or resolve persisted references must accept the scope or root id explicitly and must use `rootTeamRunId` as the storage key.
- GraphQL/hydration reads are root-scoped: the query argument `teamRunId` means the root team run id for the records file. Frontend root run hydration loads all records for that root, including records created inside task-team child services.

Persisted `senderAddress`, `receiverAddress`, `taskRun.address`, and update addresses must be root-scoped `ConversationTargetAddress` values. A child task-team member address uses the same convention as Team Communication: root-visible logical team member segment, `{ kind: "task_team", taskTeamRunId }`, then the child member segment, with additional task-agent/task-team segments only when the endpoint is itself a nested task run.

Task receiver semantics:

- For `receiverTargetKind = "member"`, `receiverAddress` is the physical member address that receives the delegated task.
- For `receiverTargetKind = "team"`, `receiverAddress` is the actual receiving inbox address inside the started task-team execution, normally the ingress/coordinator address: logical team member segment -> `{ kind: "task_team", taskTeamRunId }` -> coordinator/member segment. The accountable target remains the team, represented by `receiverTargetKind = "team"` plus the task-team prefix in `receiverAddress` and `taskRun.address`.
- Do not add separate durable `target`, `ingress`, `coordinator`, or `receiver` identity objects. If UI needs team-level grouping, derive it from address segments and `receiverTargetKind`.

### Active Runtime State Separation

The refactor must not force active-only runtime facts into the persisted record. `TaskDelegationLedger` should own explicit active-only entries that distinguish pre-activation from activated records:

```ts
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

Activation transition sequence:

1. `TaskDelegationService` resolves `TaskDelegationPersistenceScope` and reserves a root-scoped task id from `TaskDelegationRecordsService`.
2. `TaskDelegationLedger.createStartingEntry(...)` creates `phase: "starting"` active-only state. No `TaskDelegationRecord` exists yet.
3. `TaskDelegationActivationCoordinator` binds a task-agent or task-team execution into `boundExecution`, resolves any execution-dependent receiver inbox address, and attempts runtime start. For a team target this is where the receiver can move from the logical team target to the concrete task-team ingress/coordinator address.
4. On rejected start or thrown activation error, rollback active directories and call `TaskDelegationLedger.discardStartingEntry(taskId)`. The public tool result may return `status: "not_started"`, but no durable record and no active record entry remains.
5. On accepted start, `TaskDelegationLedger.activateStartingEntry(taskId, taskRunReference, receiverAddress)` converts the starting entry into `phase: "record"` with `record.status = "active"`, the final durable `receiverAddress`, and a compact durable `taskRun` reference.
6. `TaskDelegationService` persists the activated record, then publishes the live activation event and returns `{ task_id, status: "active" }`.

Submission and review transitions require `phase: "record"`. They mutate only the embedded durable `record` plus active-only validation bindings. Only `ActiveTaskDelegationRecordEntry.record` is persisted. Starting entries, bound execution objects, resolved targets, review owner identities, and reply routing selectors are active-runtime authority only and disappear with the active service.

## Task Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Feature plus behavior durability change.
- Current design issue found (`Yes`/`No`/`Unclear`): Yes.
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Missing Invariant and Boundary Or Ownership Issue.
- Refactor needed now (`Yes`/`No`/`Deferred`/`Unclear`): Yes.
- Evidence:
  - `TaskDelegationLedger` stores task records in process memory.
  - `TaskDelegationRunRegistry.detach(...)` drops the active service/ledger.
  - `TaskDelegationReferenceContentService` cannot resolve references without an active service.
  - `TeamActiveTasksSection` consumes transient projection nodes only.
  - `TaskDelegationActivationCoordinator` currently publishes activation events before the use-case owner can persist a durable snapshot.
  - Current `reserveTaskId()` restarts numbering with a recreated ledger.
  - Current task-team child `TeamRun` services can be resolved for task tools but have local run ids distinct from the root memory scope.
- Design response:
  - Add a task-delegation-owned records service/store/normalizer.
  - Centralize committed lifecycle side effects in `TaskDelegationService`: mutate ledger, persist snapshot, publish live events, notify/settle.
  - Move task id reservation to a root-scoped records-service allocator before creating active starting entries.
  - Replace active-node-only task entry derivation with persisted-record-first task entry derivation.
- Refactor rationale:
  - This is not a local rendering bug; the requested durability requires a new persistent read boundary and a small lifecycle-side-effect ordering refactor.
  - Keeping frontend nodes alive forever would conflate execution liveness with task history and fight existing cleanup semantics.
  - Persisting websocket task events directly would lose submitted result detail and would make transport events the wrong authority.
- Intentional deferrals and residual risk, if any:
  - Runtime resumption remains deferred/out of scope. Persisted `active` or `awaiting_review` records from a prior runtime may be visible but not actionable after restart unless a new live execution exists.
  - Failed activation attempts remain out of scope for durable UI; their active-only starting entries are discarded on rollback unless a future product decision wants visible failed task records.
  - No backfill is attempted for old runs that never persisted task-delegation records.

## Terminology

- `Subsystem` / `capability area`: a larger functional area that owns a broader category of work and may contain multiple files plus optional module groupings.
- `Module`: an optional intermediate grouping inside a subsystem when the codebase benefits from it. Do not use `module` as a synonym for one file or as the default ownership term.
- `Folder` / `directory`: a physical grouping used to organize files and any optional module groupings.
- `File`: one concrete source file and the primary unit where one concrete concern should land.
- `Durable task records`: task-delegation-owned read model stored per root team run in local memory/history storage.
- `Live task records`: frontend websocket/runtime task-agent/task-team node projection; it may enrich durable records but is not the authority for task history.

## Design Reading Order

Read this design from abstract to concrete:

1. data-flow spine
2. subsystem / capability-area allocation
3. draft file responsibilities -> extract reusable owned structures -> finalize file responsibilities
4. folder/path mapping

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- Required action: no legacy task-plan persistence or model-facing task-plan tools are reintroduced. The active-only Team task list derivation is decommissioned as the authoritative source for task visibility.
- Treat removal as first-class design work: activation event ownership is moved out of `TaskDelegationActivationCoordinator` so the use-case owner can persist before publishing; private duplicated record cloning is extracted to a shared task-delegation snapshot utility.
- Decision rule: the design does not depend on compatibility wrappers, dual-path behavior, or old active-only behavior. Live runtime projection remains only as enrichment for persisted records.

## Data-Flow Spine Inventory

| Spine ID | Scope (`Primary End-to-End`/`Return-Event`/`Bounded Local`) | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | `delegate_task` tool call | durable active task record + live activation event | `TaskDelegationService` | Main creation path for durable delegated tasks. |
| DS-002 | Primary End-to-End | `submit_task_result` tool call | durable awaiting-review task record + review-owner notification | `TaskDelegationService` | Ensures submitted result content/history survives runtime teardown. |
| DS-003 | Primary End-to-End | `review_task_result` tool call | durable revision/accepted task record + settlement request when accepted | `TaskDelegationService` | Ensures review decision, acceptance, and terminal state persist before cleanup. |
| DS-004 | Primary End-to-End | Root team run open/reload/history hydration | Team tab persisted task records, including child task-team records | `TaskDelegationRecordsService` backend + `TaskDelegationStore` frontend | Main root-scoped readback path for user-visible durable tasks. |
| DS-005 | Primary End-to-End | Task reference preview request | readable local file stream or typed reference error | `TaskDelegationReferenceContentService` | Keeps task-owned references usable after active runtime teardown. |
| DS-006 | Return-Event | backend `TASK_DELEGATION_*` event | frontend refreshed durable task store + transient live enrichment | `TeamStreamingService` dispatch boundary, durable source owned by backend task records | Keeps the live UI in sync without depending on transient nodes as history. |
| DS-007 | Bounded Local | committed task snapshot | atomic task records file write | `TaskDelegationRecordsService` | Queued write loop prevents write races and duplicate task records. |
| DS-008 | Bounded Local | root or task-team child service before starting entry creation | non-colliding root-scoped next task id | `TaskDelegationRecordsService` task-id allocator | Prevents persisted task id collisions across restarted/restored root and child services. |

## Primary Execution Spine(s)

- DS-001: `delegate_task -> TaskDelegationToolRunRouter -> TaskDelegationService -> TaskDelegationRecordsService.reserveTaskId(rootScope) -> TaskDelegationLedger starting entry -> TaskDelegationActivationCoordinator -> activated record -> TaskDelegationRecordsService.persistRecord(rootScope) -> TaskDelegationEventPublisher -> Frontend task hydration/store`
- DS-002: `submit_task_result -> TaskDelegationToolRunRouter -> TaskDelegationService -> TaskDelegationLedger -> TaskDelegationRecordsService -> TaskDelegationEventPublisher -> TaskDelegationNotificationDispatcher`
- DS-003: `review_task_result -> TaskDelegationToolRunRouter -> TaskDelegationService -> TaskDelegationLedger -> TaskDelegationRecordsService -> TaskDelegationEventPublisher -> TaskDelegationSettlementCoordinator / TaskTeamSettlementCoordinator`
- DS-004: `Root team run hydration -> GraphQL getTaskDelegationRecords(rootTeamRunId) -> TaskDelegationRecordsService -> TaskDelegationRecordsStore -> frontend TaskDelegationStore[rootTeamRunId] -> focused sender/receiver address perspective derivation -> TeamActiveTasksSection`
- DS-005: `TeamTaskReferenceViewer -> REST task reference route -> TaskDelegationReferenceContentService -> active TaskDelegationService or TaskDelegationRecordsService -> filesystem stream`

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | A model delegates a task. The tool router resolves the active root or task-team child run. `TaskDelegationService` resolves the persistence scope, reserves a root-scoped task id, creates an active-only starting entry, asks the activation coordinator to start the task run, converts the starting entry to an activated `TaskDelegationRecord` only after runtime acceptance, persists that active record, then publishes the live activation event and returns the concise public result. Failed activation discards the starting entry and writes no durable `not_started` record. | Tool router, `TaskDelegationService`, root-scoped task-id allocator, ledger, activation coordinator, records service, event publisher | `TaskDelegationService` | root persistence scope, task-id allocator, records store, event mapper, frontend refresh |
| DS-002 | A bound task-agent or task-team ingress submits a result. The ledger records the submission and moves the task to `awaiting_review`; the service persists an updated task record, including submitted message/reference history, before publishing live status and notifying the review owner. | Tool router, `TaskDelegationService`, ledger, records service, event publisher, notification dispatcher | `TaskDelegationService` | reference normalization, notification warning handling, records queue |
| DS-003 | The review owner accepts or requests revision. The ledger records a review linked to the pending submission. The service persists the updated record before event publication and before accepted-task settlement cleanup. | Tool router, `TaskDelegationService`, ledger, records service, event publisher, settlement coordinators | `TaskDelegationService` | settlement gating, notification delivery, records queue |
| DS-004 | The frontend opens a root team run. Hydration queries persisted task records by root `teamRunId`, writes them into a frontend store keyed by root id, and the Team task section derives a focused perspective by matching the focused conversation address against `senderAddress` and `receiverAddress`. It renders matching root and task-team-child records even if no live task node exists. | frontend hydration service, GraphQL resolver, records service, records store, task store, task section | Backend `TaskDelegationRecordsService`; frontend `TaskDelegationStore` | GraphQL DTO mapping, store normalization, address matcher, live-entry enrichment |
| DS-005 | A user opens a task reference. The content service tries active ledger lookup first; if absent it resolves the persisted record and serves the stored file path if valid/readable. | reference viewer, REST route, reference content service, active service/records service, filesystem | `TaskDelegationReferenceContentService` | MIME lookup, readable-file checks, reference payload builder |
| DS-006 | Live task events still update runtime projection nodes, but they also trigger a debounced durable-task refresh so the persisted store catches up before transient task nodes disappear. | websocket dispatch, task event router, hydration service, task store | `TeamStreamingService` for dispatch; backend task records remain the source of durable truth | debounce, transient projection, store replacement |
| DS-007 | Records writes are serialized per root team run: load cached/file records, upsert by `taskId`, sort/normalize, atomic file write, update cache. | records service, records store | `TaskDelegationRecordsService` | normalizer, atomic temp file, warning logger |
| DS-008 | Before creating a starting entry, the service asks the records service to reserve the next root-scoped task id. The records-service allocator serializes reservations per `rootTeamRunId`, initializes from persisted max numeric suffix, and advances in memory even before the eventual record write, so concurrent root/child services cannot receive the same id. | records service task-id allocator, `TaskDelegationService`, ledger | `TaskDelegationRecordsService` | high-watermark parser, per-root reservation queue |

## Spine Actors / Main-Line Nodes

- `TaskDelegationToolRunRouter`: thin active-run tool routing boundary.
- `TaskDelegationService`: governing use-case owner for task lifecycle transitions and side-effect ordering.
- `TaskDelegationLedger`: active task state and transition owner, including starting entries and activated record entries.
- `TaskDelegationActivationCoordinator`: activation sequencing owner for starting task-agent/task-team task run.
- `TaskDelegationRecordsService`: durable task records/read owner and root-scoped task id reservation owner.
- `TaskDelegationRecordsStore`: filesystem persistence boundary.
- `TaskDelegationEventPublisher`: live event emission owner.
- `TaskDelegationReferenceContentService`: task reference content resolution owner.
- `TeamStreamingService`: frontend websocket dispatch boundary.
- `TaskDelegationStore`: frontend durable task records state owner.
- `TeamActiveTasksSection`: display surface for persisted task records enriched by live state.

## Ownership Map

| Main-Line Node | Owns | Boundary Notes |
| --- | --- | --- |
| `TaskDelegationToolRunRouter` | Active team/task-team service resolution for tool calls | Thin facade; must not own persistence, task state, or task display semantics. |
| `TaskDelegationService` | Task lifecycle use cases, transition sequencing, public result shaping, side-effect ordering | Authoritative active task boundary. It may call ledger, activation, records, events, notification, and settlement; callers must not coordinate those internals themselves. |
| `TaskDelegationLedger` | In-memory starting entries, activated task record entries, status transitions, submission/review invariants | Internal mechanism behind `TaskDelegationService`; not a durable store and no longer owns root-scoped task id allocation. |
| `TaskDelegationActivationCoordinator` | Binding execution identity, starting task-agent/task-team runtime, rollback of starting execution | Internal mechanism; should not publish durable or live events after refactor. |
| `TaskDelegationRecordsService` | Durable task records cache, queued writes, readback, reference lookup, root-scoped task-id reservation/high watermark | Durable read-model and id reservation owner; must not authorize active task tool calls or start/restore runtimes. |
| `TaskDelegationRecordsStore` | Atomic read/write of `task_delegation_records.json` | Persistence adapter only; no lifecycle policy. |
| `TaskDelegationReferenceContentService` | Active-or-persisted task reference resolution and readable-file streaming | Public REST service boundary; must not inspect ledger/store directly outside its owned collaborators. |
| `TaskDelegationStore` | Frontend task records by team run | UI state owner for durable task records; not a runtime authority. |
| `TeamActiveTasksSection` | Task entry navigation/detail rendering | Display only; must not reconstruct task history from messages or transient nodes. |

If a public facade exists, it is thin unless listed as a governing owner above. The GraphQL resolver and REST route are transport facades; the records/reference services govern behavior behind them.

## Thin Entry Facades / Public Wrappers (If Applicable)

| Facade / Entry Wrapper | Governing Owner Behind It | Why It Exists | Must Not Secretly Own |
| --- | --- | --- | --- |
| `TaskDelegationToolRunRouter` / model-facing tool classes | `TaskDelegationService` | Resolve the correct active root or task-team child service for model tool calls | persistence, lifecycle transitions, task id allocation policy |
| GraphQL `TaskDelegationResolver` | `TaskDelegationRecordsService` | Expose persisted read API to frontend | file paths, active runtime lookup, record mutation |
| REST task reference route | `TaskDelegationReferenceContentService` | Serve selected reference content | reference lookup policy, filesystem security checks outside service |
| `TeamActiveTasksSection` | `TaskDelegationStore` + focused-address task entry derivation utility | Display task records related to the focused sender/receiver address | task persistence, task lifecycle, runtime cleanup |
| `TeamStreamingService` task event branch | backend task records + `TaskDelegationStore` | Dispatch live refresh and runtime projection updates | durable data reconstruction from partial websocket payloads |

## Removal / Decommission Plan (Mandatory)

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By Which Owner / File / Structure | Scope (`In This Change`/`Follow-up`) | Notes |
| --- | --- | --- | --- | --- |
| `TaskDelegationActivationCoordinator` activation event publishing responsibility | The service must persist active records before publishing live activation events | `TaskDelegationService` calls `TaskDelegationRecordsService` then `TaskDelegationEventPublisher` | In This Change | Coordinator remains activation owner but no longer owns event publication side effects. |
| Private `cloneRecord` logic inside `task-delegation-ledger.ts` as the only clone implementation | Records store/service and API need the same record snapshot semantics | `task-delegation-record-snapshot.ts` | In This Change | Ledger imports the shared snapshot utility; avoid duplicate clone/normalize code. |
| Durable `not_started` task record state | Failed activation should not become a durable task record and durable `TaskDelegationRecord.status` excludes `not_started` | Active-only `ActiveTaskDelegationStartingEntry`; `discardStartingEntry` on rollback | In This Change | Public `delegate_task` failure may still return `status: "not_started"`, but no durable or activated ledger record remains. |
| Ledger-local task id counter as global authority | Root file can receive records from multiple services, including task-team child runs | `TaskDelegationRecordsService.reserveTaskId(scope)` / root-scoped allocator | In This Change | The ledger accepts caller-provided task ids and does not reserve root-global ids. |
| Active-node-only task list authority in `deriveActiveTaskEntries(...)` | Persisted task visibility cannot depend on runtime projection nodes | Persisted-record-first, focused-address task entry derivation in `teamActiveTaskEntries.ts` or renamed equivalent | In This Change | Live nodes become enrichment only. Selection key changes to stable `taskId`; visibility comes from sender/receiver address matching. |
| Task reference content active-service-only lookup | Historical references need persisted record fallback | `TaskDelegationReferenceContentService` active-first/persisted-fallback resolver | In This Change | Existing route identity remains unchanged. |
| Legacy task-plan persistence/tool state | It was intentionally removed and is the wrong model for dedicated task delegation | Task-delegation records under current task subsystem | In This Change | Do not reintroduce `create_task`, task-plan UI state, or backfill from legacy data. |

## Return Or Event Spine(s) (If Applicable)

- DS-006 return/event flow:

`TaskDelegationService -> TaskDelegationEventPublisher -> TeamRunEventSourceType.TASK_DELEGATION -> websocket TASK_DELEGATION_EVENT -> TeamStreamingService -> existing transient projection + debounced persisted-task hydration -> TaskDelegationStore -> TeamActiveTasksSection`

Event ordering target:

1. Ledger mutation succeeds.
2. Durable records write is attempted and awaited by `TaskDelegationService` through a non-rollbacking persistence helper.
3. Live event is published.
4. Notification or settlement side effects run.

For accepted reviews, the durable records attempt must happen before settlement request so terminal records are not lost when task run cleanup happens quickly.

## Bounded Local / Internal Spines (If Applicable)

- Parent owner: `TaskDelegationRecordsService`
  - `Task snapshot -> per-root operation queue -> load cached/file records -> upsert by taskId -> normalize/sort records -> atomic write -> update cache`
  - Why it matters: multiple root and task-team child task events can happen quickly for one root team run; queueing avoids lost updates and duplicate records.

- Parent owner: `TaskDelegationRecordsService` task-id allocator
  - `reserveTaskId(scope) -> read scope.rootTeamRunId -> initialize from cached/file max suffix -> increment reserved sequence -> return task_XXXX`
  - Why it matters: service recreation and concurrent task-team child services must not reuse `task_0001` when persisted or already-reserved root records contain that id.

- Parent owner: `TaskDelegationLedger`
  - `createStartingEntry -> bindExecution -> activateStartingEntry to durable record OR discardStartingEntry on rollback`
  - Why it matters: pre-activation state exists for rollback but `not_started` must not leak into durable records.

- Parent owner: `TaskDelegationReferenceContentService`
  - `active lookup -> if miss, persisted records lookup -> validate absolute path -> readable file check -> MIME inference -> stream`
  - Why it matters: active behavior remains fast and exact, while historical readback uses the durable source.

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Related Spine ID(s) | Serves Which Owner | Responsibility | Why It Exists | Risk If Misplaced On Main Line |
| --- | --- | --- | --- | --- | --- |
| Records file store | DS-001, DS-002, DS-003, DS-004, DS-007 | `TaskDelegationRecordsService` | Atomic JSON read/write under team memory dir | Durable storage boundary | `TaskDelegationService` would become filesystem-aware. |
| Records normalizer | DS-004, DS-007 | `TaskDelegationRecordsService` | Sanitize/clone persisted JSON records | Protects API/UI from corrupt files | Store or resolver would duplicate validation. |
| Persistence scope resolver | DS-001, DS-004, DS-005, DS-008 | `TaskDelegationService` and `TaskDelegationRecordsService` | Resolve current team run to `{ rootTeamRunId, currentTeamRunId, teamRunPath }` | Child task-team services must write root records | Records could fragment into child-local files. |
| Root-scoped task id allocator | DS-001, DS-008 | `TaskDelegationRecordsService` | Reserve non-colliding `task_NNNN` ids per root team run | Multiple services can write one root file | Ledger-local counters would collide. |
| Active starting entry | DS-001 | `TaskDelegationLedger` | Hold pre-activation/binding state until runtime start accepts | Durable record excludes `not_started` | Failed starts could leak durable not-started records. |
| Task record canonicalizer | DS-001, DS-002, DS-003, DS-007 | `TaskDelegationRecordsService` | Canonicalize/clone `TaskDelegationRecord` for durable storage | Keeps storage shape intentional and frontend-oriented | Persisting active state would leak runtime internals. |
| Task reference payload builder | DS-004, DS-005 | records API and reference content service | Derive `referenceId`, type, timestamps from task record references | Keeps task references task-owned | UI might invent reference ids incompatible with REST route. |
| GraphQL DTO mapper | DS-004 | GraphQL resolver | Expose typed/derived record fields without changing persisted schema | Transport boundary shaping | Records service would start owning transport concerns. |
| Frontend task store normalizer | DS-004, DS-006 | `TaskDelegationStore` | Normalize GraphQL records and provide sorted getters | Keeps component rendering simple | Components would parse raw GraphQL shapes repeatedly. |
| Debounced live hydration refresh | DS-006 | `TeamStreamingService` / hydration service | Re-fetch durable task records after task events | Keeps live UI and durable records synchronized | Streaming would reconstruct incomplete task history from partial events. |
| Live task node enrichment | DS-004, DS-006 | task entry derivation utility | Attach runtime status/context when a live task node exists | Preserves current live details without making them authoritative | UI would either lose live status or depend on live nodes only. |
| Logging/warnings for records failures | DS-007 | records service | Make durability failures visible without unsafe rollback | Disk failures cannot be ignored silently | Public tool protocol would need unstable warning fields. |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area / Subsystem | Decision (`Reuse`/`Extend`/`Create New`) | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| Durable task lifecycle records | `agent-team-execution/task-delegation` | Extend | Task records are owned by task delegation, not communication or run history. | N/A |
| Active pre-activation state | `agent-team-execution/task-delegation` ledger | Extend | Current ledger owns lifecycle invariants; it should own starting entries too. | N/A |
| Root-scoped task id allocation | `TaskDelegationRecordsService` | Extend | Records service owns the root records file and serialized per-root operations. | N/A |
| Atomic local JSON records store | Team Communication projection pattern | Reuse pattern, create task-owned store | Existing pattern is healthy but message subsystem does not own tasks. | Task data has different lifecycle and identity. |
| Team memory directory path | `AgentMemoryLayout` | Reuse | Existing safe root team memory path owner; task records always use `rootTeamRunId`. | N/A |
| Backend read API | GraphQL resolver pattern in `team-communication.ts` | Reuse pattern, create task resolver | Same frontend readback style as messages. | Existing resolver is message-specific. |
| Reference content route | Existing task-delegation REST route/service | Extend | Route identity is already correct: `teamRunId + taskId + referenceId`. | N/A |
| Frontend persisted records state | Pinia store pattern from Team Communication | Reuse pattern, create task-owned store | The store category is analogous, but records are not messages. | Message store groups by conversation address, which is not task history. |
| Live task event handling | Existing `TeamStreamingService` and task records router | Extend | Continue to support transient task runtime UI. | N/A |
| Task history from old legacy task plans | Legacy task-plan artifacts | Rejected | Wrong domain model and previously removed. | Do not create. |

## Subsystem / Capability-Area Allocation

| Subsystem / Capability Area | Owns Which Concerns | Related Spine ID(s) | Governing Owner(s) Served | Decision (`Reuse`/`Extend`/`Create New`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Backend task delegation (`agent-team-execution/task-delegation`) | active lifecycle, active starting entries, durable records, root persistence scope, reference fallback, root-scoped task id allocation | DS-001, DS-002, DS-003, DS-005, DS-007, DS-008 | `TaskDelegationService`, `TaskDelegationLedger`, `TaskDelegationRecordsService`, `TaskDelegationReferenceContentService` | Extend | Add a records subfolder to avoid flattening persistence into the already-large task-delegation folder; keep active-only starting state outside durable record types. |
| Backend GraphQL API | persisted task read query | DS-004 | `TaskDelegationRecordsService` | Extend | Add task resolver and register it in schema. |
| Backend REST API | task reference content | DS-005 | `TaskDelegationReferenceContentService` | Extend | Route path remains unchanged. |
| Frontend run hydration | fetching durable task records for live/history runs | DS-004, DS-006 | `TaskDelegationStore` | Extend | Hydrate alongside Team Communication messages. |
| Frontend streaming | live task refresh trigger + transient projection | DS-006 | `TeamStreamingService` | Extend | Do not reconstruct durable history from partial event payloads. |
| Frontend task display | persisted task records enriched with live context | DS-004 | `TeamActiveTasksSection` | Extend | Component path can stay, but semantics shift from active-only to persisted-visible tasks. |
| Team Communication | message persistence | N/A | `TeamCommunicationService` | Reuse pattern only | Must not import task records or own task records. |

## Draft File Responsibility Mapping

| Candidate File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `task-delegation-active-entry.ts` | backend task delegation | active ledger entry model | Define `ActiveTaskDelegationStartingEntry`, `ActiveTaskDelegationRecordEntry`, active-only binding fields, and clone helpers | Keeps durable record model free of `not_started` and runtime binding data | task record types |
| `task-delegation-persistence-scope.ts` | backend task delegation | persistence scope resolver | Resolve root/current run scope from `TeamRun` runtime context | Centralizes root-team storage identity for root and child services | `AgentMemoryLayout` scope types |
| `task-delegation-address-builder.ts` | backend task delegation | address builder | Build root-scoped `ConversationTargetAddress` values for sender, member receivers, team ingress/coordinator receivers, taskRun, submissions, reviews | Prevents duplicated endpoint objects and child-local address drift | conversation address helpers |
| `task-delegation-record-snapshot.ts` | backend task delegation | record snapshot utility | Clone `TaskDelegationRecord`, updates, references, and taskRun fields for active owners | Shared by ledger and canonicalizer without persistence policy | task record clone helpers |
| `task-delegation-record.ts` | backend task delegation records | task record model | Define durable-first `TaskDelegationRecord`, `TaskUpdate`, `TaskRunReference`, and task reference types | Keeps the durable task record contract owned by the task-delegation domain | Used directly by ledger, records persistence, and transport |
| `records/task-delegation-records-normalizer.ts` | backend task delegation records | records normalizer | Normalize/clone records JSON and task records; validate address segment consistency | Separate validation from store IO | task record types |
| `records/task-delegation-record-canonicalizer.ts` | backend task delegation records | record canonicalizer | Canonicalize/clone durable `TaskDelegationRecord`, including references and address-first endpoint identities | Keeps persisted shape intentional and display-first | task record types, reference builder |
| `records/task-delegation-records-store.ts` | backend task delegation records | persistence adapter | Read/write `task_delegation_records.json` atomically | Mirrors Team Communication store pattern but task-owned | task record types |
| `records/task-delegation-task-id-allocator.ts` | backend task delegation records | root task id allocator | Reserve `task_NNNN` ids per root team run using records high watermark and in-memory reservations | Keeps id allocation with the root records owner | records service/store |
| `records/task-delegation-records-service.ts` | backend task delegation records | durable read/write owner | Queue writes, upsert task records, read by root teamRunId, resolve references, reserve task ids | Governing durable records owner | store, normalizer, task id allocator, `AgentMemoryLayout` |
| `task-delegation-ledger.ts` | backend task delegation | active state owner | Own starting/record entries, bind execution, activate starting entry, discard starting entry on rollback, submit/review transitions | Active state remains here; root id allocation does not | active entry model, snapshot utility |
| `task-delegation-activation-coordinator.ts` | backend task delegation | activation owner | Bind execution and start runtime; stop publishing activation event | Keeps activation sequencing focused | ledger |
| `task-delegation-service.ts` | backend task delegation | active lifecycle owner | Resolve persistence scope, reserve root task ids, create starting entries, persist after activation/submission/review and before events/settlement | Governs lifecycle side-effect order | records service, persistence scope resolver, address builder |
| `task-delegation-reference-content-service.ts` | backend task delegation | reference content owner | Active lookup plus persisted fallback | Keeps route behavior behind one service | records service, reference builder |
| `api/graphql/types/task-delegation.ts` | backend GraphQL | transport resolver | Expose root-scoped `getTaskDelegationRecords(teamRunId)` | Transport mapping belongs at GraphQL edge | records service |
| `graphql/queries/runHistoryQueries.ts` | frontend GraphQL | query definitions | Add `GetTaskDelegationRecords` | Query sits with other run-history hydration queries | GraphQL DTO fields |
| `stores/taskDelegationTypes.ts` | frontend task records | frontend DTO types | Task record, submission, review, reference file types | Shared across store/hydration/UI | Team reference type |
| `stores/taskDelegationStore.ts` | frontend task records | Pinia store | Store records by team, replace/upsert/getters | Frontend durable records owner | task types |
| `services/runHydration/taskDelegationHydrationService.ts` | frontend hydration | hydration boundary | Fetch/replace task records; debounced refresh helper | Keeps API fetch out of components/streaming | task store |
| `utils/teamActiveTaskEntries.ts` | frontend task display | entry derivation utility | Derive focused sender/receiver-address task entries and merge persisted records with live task nodes | This file already owns task entry derivation | task store types, conversation address helpers |
| `TeamActiveTasksSection.vue` and child components | frontend task display | display components | Selection by stable task key, show persisted records and references | Component display only | entry utility |

## Reusable Owned Structures Check

| Repeated Structure / Logic | Candidate Shared File | Owning Subsystem | Why Shared | Redundant Attributes Removed? (`Yes`/`No`) | Overlapping Representations Removed? (`Yes`/`No`) | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| Durable task record canonicalization | `records/task-delegation-record-canonicalizer.ts` | backend task records | Storage and GraphQL should share one canonical durable `TaskDelegationRecord` shape | Yes | Yes | Active-state dump or transport-specific mapper |
| Active pre-activation entry shape | `task-delegation-active-entry.ts` | backend task delegation | Ledger, activation coordinator, and service need one explicit starting-entry shape | Yes | Yes | Durable `not_started` record |
| Root persistence scope | `task-delegation-persistence-scope.ts` | backend task delegation | Root and task-team child services must agree on storage key and current run id | Yes | Yes | Ad hoc `teamRunId` guessing |
| Root-scoped task id reservation | `records/task-delegation-task-id-allocator.ts` | backend task records | Root and child services need one non-colliding id source | Yes | Yes | Ledger-local counter |
| Task records file JSON shape | `task-delegation-record.ts` | backend task records | Store/service/API need one persisted shape | Yes | Yes | Kitchen-sink task view model |
| Task records file JSON normalization | `records/task-delegation-records-normalizer.ts` | backend task records | Read API and write cache need safe normalized task records with non-conflicting address identity | Yes | Yes | Lifecycle transition owner |
| Frontend task record normalization | `stores/taskDelegationStore.ts` or small local normalizer inside it | frontend task records | Hydration and tests need one normalized client shape | Yes | Yes | Runtime projection parser |
| Task entry display mapping | `utils/teamActiveTaskEntries.ts` | frontend task display | Section, navigator, detail pane need one address-perspective record shape | Yes | Yes | Store or lifecycle owner |

## Shared Structure / Data Model Tightness Check

| Shared Structure / Type / Schema | One Clear Meaning Per Field? (`Yes`/`No`) | Redundant Attributes Removed? (`Yes`/`No`) | Parallel / Overlapping Representation Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| `TaskDelegationRecordsFile` | Yes | Yes | Low | Persist `{ teamRunId, records }`, where `teamRunId` is the root storage team run id and `records` are task display/readback task records. |
| Stored `TaskDelegationRecord` | Yes | Yes | Low | Do not store the current raw active-ledger shape or `not_started` state; refactor/store a normalized durable `TaskDelegationRecord`. Treat `senderAddress`/`receiverAddress` as the only persisted endpoint identity; for team targets, `receiverAddress` is the task-team ingress/coordinator inbox address and `receiverTargetKind` preserves team accountability. Normalizers must validate root-scoped address segment shape and must not re-expand it into parallel identity objects. |
| GraphQL `TaskDelegationRecordObject` | Yes | Mostly | Low | It should expose the task record directly, with typed `ConversationTargetAddress`, compact taskRun reference, and update history. |
| Frontend `TaskDelegationRecord` | Yes | Mostly | Medium | Mirror GraphQL read DTO; keep display conveniences clearly derived and do not write them back to backend. |
| Active ledger starting/record entries | Yes | Yes | Low | Starting entries are active-only and contain no durable record; record entries embed the durable `TaskDelegationRecord`. |
| `TaskDelegationPersistenceScope` | Yes | Yes | Low | Distinguish root storage id from current local team run id; do not use a bare ambiguous `teamRunId` at storage-write boundaries. |
| `TeamTaskEntry` / existing `ActiveTaskEntry` replacement | Yes | Yes | Low | Include `entryKey/taskId`, persisted record, optional live node/context; do not require node. |

## Final File Responsibility Mapping

| File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/agent-team-execution/task-delegation/task-delegation-active-entry.ts` | Backend task delegation | Active ledger entry model | `ActiveTaskDelegationStartingEntry`, `ActiveTaskDelegationRecordEntry`, active execution binding and reply selector clones | Keeps pre-activation and runtime-only facts out of durable records | task record types |
| `autobyteus-server-ts/src/agent-team-execution/task-delegation/task-delegation-persistence-scope.ts` | Backend task delegation | Persistence scope resolver | Resolve `{ rootTeamRunId, currentTeamRunId, teamRunPath }` from root and task-team child `TeamRun`s | Makes root storage identity explicit | runtime context memory scope |
| `autobyteus-server-ts/src/agent-team-execution/task-delegation/task-delegation-address-builder.ts` | Backend task delegation | Address builder | Build root-scoped conversation addresses for task assignment, team ingress/coordinator receivers, taskRun, submissions, and reviews | Keeps endpoint identity address-first and child-aware | conversation address helpers |
| `autobyteus-server-ts/src/agent-team-execution/task-delegation/task-delegation-record-snapshot.ts` | Backend task delegation | Snapshot utility | Deep clone `TaskDelegationRecord`, taskRun, references, and update structures | Pure record snapshot logic shared by active and durable owners | task record clone helpers |
| `autobyteus-server-ts/src/agent-team-execution/task-delegation/task-delegation-record.ts` | Backend task delegation records | Task record data model | `TaskDelegationRecordsFile`, `TaskDelegationRecord`, address-first task record/update/task-run types, records-file constants/helpers, filename constant | Keeps durable display/read model named and task-owned | Used directly by ledger, records persistence, and transport |
| `autobyteus-server-ts/src/agent-team-execution/task-delegation/records/task-delegation-records-normalizer.ts` | Backend task delegation records | Normalization boundary | Convert unknown JSON to normalized task records; clone before return; validate address segment consistency | Keeps store/resolver from validating records | task record types |
| `autobyteus-server-ts/src/agent-team-execution/task-delegation/records/task-delegation-record-canonicalizer.ts` | Backend task delegation records | Canonicalization boundary | Canonicalize/clone durable task records before writing | Prevents active-state leaks and duplicated frontend derivation | task record types, reference builder |
| `autobyteus-server-ts/src/agent-team-execution/task-delegation/records/task-delegation-records-store.ts` | Backend task delegation records | Filesystem adapter | `getTaskDelegationRecordsFilePath`, `readRecordsFile`, `writeRecordsFile` with atomic temp file | Persistence boundary only | task record types |
| `autobyteus-server-ts/src/agent-team-execution/task-delegation/records/task-delegation-task-id-allocator.ts` | Backend task delegation records | Root task id allocator | Reserve `task_NNNN` ids per `rootTeamRunId`, initialized from persisted max suffix and advanced for in-memory reservations | Prevents collisions across root and child services | records store/service |
| `autobyteus-server-ts/src/agent-team-execution/task-delegation/records/task-delegation-records-service.ts` | Backend task delegation records | Durable records owner | Queue writes, canonicalize and upsert records by root scope, read records, resolve references, reserve task ids | Governing durable read/write/id owner | store, canonicalizer, normalizer, task id allocator, `AgentMemoryLayout`, metadata service |
| `autobyteus-server-ts/src/agent-team-execution/task-delegation/task-delegation-ledger.ts` | Backend task delegation | Active state owner | Replace raw record map with starting/record entries; bind execution; activate or discard starting entries; apply submit/review transitions to record entries | Keeps active state/transition authority here without durable `not_started` | active entry model, snapshot utility |
| `autobyteus-server-ts/src/agent-team-execution/task-delegation/task-delegation-activation-coordinator.ts` | Backend task delegation | Activation owner | Start task-agent/task-team task run, bind identity, rollback failed starting execution; return activation transition data | Removes event side-effect ownership | ledger |
| `autobyteus-server-ts/src/agent-team-execution/task-delegation/task-delegation-service.ts` | Backend task delegation | Active lifecycle owner | Resolve persistence scope, reserve root task id, create starting entries, persist durable records after activation/submission/review, publish events, notify, settle | Governing side-effect order belongs here | records service, scope resolver, address builder, event publisher |
| `autobyteus-server-ts/src/agent-team-execution/task-delegation/task-delegation-reference-content-service.ts` | Backend task delegation | Reference content owner | Active-first lookup with persisted fallback; file validation/streaming | Single route behavior owner | records service, reference builder |
| `autobyteus-server-ts/src/api/graphql/types/task-delegation.ts` | Backend GraphQL | Read API resolver | GraphQL objects/query for persisted task records | Transport mapping only | records service, communication address GraphQL object shape |
| `autobyteus-server-ts/src/api/graphql/schema.ts` | Backend GraphQL | schema registration | Register `TaskDelegationResolver` | Existing resolver registry | N/A |
| `autobyteus-web/graphql/queries/runHistoryQueries.ts` | Frontend GraphQL | query document owner | Add `GetTaskDelegationRecords` | Existing run-history query file | N/A |
| `autobyteus-web/stores/runHistoryTypes.ts` | Frontend run history types | GraphQL response typing | Add `GetTaskDelegationRecordsQueryData` | Existing query data type owner | task types |
| `autobyteus-web/stores/taskDelegationTypes.ts` | Frontend task records | client DTO types | Task record/update/task-run/reference interfaces | Shared across frontend task files | TeamReferenceFile |
| `autobyteus-web/stores/taskDelegationStore.ts` | Frontend task records | task record store | Store records by team, replace records, sorted getters | Durable task UI state owner | task types |
| `autobyteus-web/services/runHydration/taskDelegationHydrationService.ts` | Frontend hydration | hydration boundary | Fetch/replace task records and provide debounced live refresh | Keeps fetching out of UI/stream parser | task store |
| `autobyteus-web/services/runHydration/teamRunContextHydrationService.ts` | Frontend hydration | team hydration orchestrator | Call task hydration alongside Team Communication hydration | Existing place for team run readback | task hydration service |
| `autobyteus-web/services/agentStreaming/TeamStreamingService.ts` | Frontend streaming | websocket dispatch | Trigger debounced task records refresh on task events after existing transient handling | Keeps live UI synchronized with durable source | task hydration service |
| `autobyteus-web/utils/teamActiveTaskEntries.ts` | Frontend task display | task entry derivation | Derive focused sender/receiver-address task entries and merge optional live node/context | Existing display-entry derivation owner | task store types, conversation address helpers |
| `autobyteus-web/components/workspace/team/TeamActiveTasksSection.vue` | Frontend task display | task section UI | Consume task store records and select by stable task key | Display only | entry utility |
| `autobyteus-web/components/workspace/team/TeamActiveTaskNavigator.vue` | Frontend task display | task list UI | Use entry key/task id instead of `node.memberRouteKey` | Supports persisted records with no node | entry type |
| `autobyteus-web/components/workspace/team/TeamActiveTaskDetailPane.vue` | Frontend task display | task detail UI | Render persisted task description/reference preview | Supports node-less persisted records | entry type |
| `autobyteus-web/utils/teamActiveTaskTechnicalDetails.ts` | Frontend task display | technical detail formatting | Format task id, run id, target, status for persisted/live records | Keeps formatting out of components | entry type |

## Ownership Boundaries

Authority changes hands at these boundaries:

- Tool transport to task lifecycle: tool classes/router may locate an active service; only `TaskDelegationService` owns lifecycle transitions and public result shaping.
- Lifecycle to active state: `TaskDelegationService` invokes `TaskDelegationLedger` for starting-entry, activation, submission, and review invariants; ledger remains internal and memory-only.
- Lifecycle to durable read model: `TaskDelegationService` passes activated full record snapshots plus root persistence scope to `TaskDelegationRecordsService`; records service owns storage/readback/id reservation but not active lifecycle authority.
- Durable read model to transport: GraphQL resolver maps task records to frontend DTOs; records service does not know GraphQL.
- Runtime events to frontend display: `TeamStreamingService` dispatches live events and triggers refresh; `TaskDelegationStore` owns durable client state; components only render.
- Reference route to file system: `TaskDelegationReferenceContentService` owns reference lookup and file-read safety; route handlers do not inspect records files.

Authoritative public entrypoints:

- Active lifecycle commands: `TaskDelegationService` via existing task tools.
- Durable task reads: `TaskDelegationRecordsService` via root-scoped GraphQL `getTaskDelegationRecords(teamRunId)`.
- Task reference content: `TaskDelegationReferenceContentService` via existing REST route.

Internal owned mechanisms:

- `TaskDelegationLedger`, active entry model, persistence scope resolver, address builder, `TaskDelegationActivationCoordinator`, records store, records normalizer, task id allocator, and record snapshot utility.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanism(s) It Encapsulates | Upstream Callers That Must Use The Boundary | Forbidden Bypass Shape | If Boundary API Is Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| `TaskDelegationService` | ledger, activation coordinator, persistence scope resolver, address builder, event publisher, notification, settlement, records write sequencing | task tools/router | tools/router calling ledger, records store, or id allocator directly | Add focused methods to service. |
| `TaskDelegationRecordsService` | records store, normalizer, per-root queue, memory layout, task id allocator/high-watermark parser | GraphQL resolver, reference content service, task service writes/id reservations | GraphQL/reference route/task service reading JSON files or reserving ids through a ledger-local counter | Add read/resolve/reserve methods to records service. |
| `TaskDelegationReferenceContentService` | active service lookup, records fallback, path/readable checks | REST route | REST route using run registry or records service directly | Add service method for the required content shape. |
| `TaskDelegationStore` | client normalization and records-by-team map | Team task components and hydration services | components parsing GraphQL payloads or memberTree to reconstruct persisted history | Add store getters/actions. |
| `TeamActiveTaskEntries` derivation utility | merge of persisted records with live nodes | Team task UI components | components scanning memberTree directly as authoritative task source | Add derived entry fields. |

## Dependency Rules

Allowed dependencies:

- `TaskDelegationService` may depend on `TaskDelegationRecordsService`, `TaskDelegationLedger`, `TaskDelegationActivationCoordinator`, persistence scope resolver, address builder, `TaskDelegationEventPublisher`, notification, and settlement coordinators.
- `TaskDelegationRecordsService` may depend on records store/normalizer, root-scoped task id allocator, `AgentMemoryLayout`, `TeamRunMetadataService`, and task reference payload builders.
- `TaskDelegationRecordsStore` may depend only on filesystem/path and task record types.
- GraphQL task resolver may depend on `TaskDelegationRecordsService` and transport DTO objects.
- `TaskDelegationReferenceContentService` may depend on active run registry and `TaskDelegationRecordsService`.
- Frontend hydration may depend on GraphQL query and `TaskDelegationStore`.
- Team task components may depend on `TaskDelegationStore` via derivation utilities and props.

Forbidden shortcuts:

- Do not persist task records from public tool result DTOs.
- Do not persist task records from current websocket `TASK_DELEGATION_EVENT` payloads.
- Do not make Team Communication services own or store task records.
- Do not keep transient task-agent/task-team nodes alive as the durability mechanism.
- Do not let GraphQL resolvers, REST routes, or frontend components read records files directly.
- Do not treat persisted records as active task run authority for `submit_task_result` or `review_task_result`.
- Do not backfill task records by parsing communication messages or transcript prose.
- Do not write task-team child records to child-local `task_delegation_records.json` files; all records for a root run use the root file.
- Do not keep or persist a `not_started` `TaskDelegationRecord`; pre-activation state is active-only and discarded on failure.

## Interface Boundary Mapping

| Interface / API / Query / Command / Method | Subject Owned | Responsibility | Accepted Identity Shape(s) | Notes |
| --- | --- | --- | --- | --- |
| `TaskDelegationRecordsService.reserveTaskId(scope)` | root-team task id sequence | Reserve a non-colliding `task_NNNN` before starting-entry creation | `TaskDelegationPersistenceScope.rootTeamRunId` | Serializes per-root reservations and initializes from persisted max suffix. |
| `TaskDelegationRecordsService.persistRecord(scope, record)` | one task record within a root-team records file | Canonicalize the durable `TaskDelegationRecord` and upsert it durably | `scope.rootTeamRunId + TaskDelegationRecord.taskId` | Called only after activation/submission/review committed transitions. |
| `TaskDelegationRecordsService.getTaskDelegationRecords(rootTeamRunId)` | root-team task records | Return persisted task records for a root team run | `rootTeamRunId` | Active/inactive safe; missing metadata/file returns empty. |
| `TaskDelegationRecordsService.resolveReference({ rootTeamRunId, taskId, referenceId })` | task reference within root team run | Resolve stored task reference payload | `rootTeamRunId + taskId + referenceId` | Used as inactive fallback by content service. |
| `TaskDelegationLedger.createStartingEntry(...)` | active pre-activation task state | Create rollback-capable starting state without a durable record | root-scoped `taskId + TaskDelegationPersistenceScope` | Internal to service/ledger path. |
| `TaskDelegationLedger.activateStartingEntry(taskId, taskRun)` | active-to-durable transition | Convert starting entry to activated record entry | `taskId + TaskRunReference` | First point where a `TaskDelegationRecord` exists. |
| `TaskDelegationLedger.discardStartingEntry(taskId)` | activation rollback | Remove pre-activation state on rejected/failed start | `taskId` | Ensures no durable `not_started` record leaks. |
| GraphQL `getTaskDelegationRecords(teamRunId)` | root-team task records read API | Return frontend-readable persisted task records | root `teamRunId` | Do not combine with Team Communication query; argument is root storage id. |
| REST `GET /team-runs/:teamRunId/task-delegations/:taskId/references/:referenceId/content` | task reference content | Stream a readable task reference file | root `teamRunId + taskId + referenceId` for persisted records | Existing route; underlying service gains active-first/root-persisted fallback. |
| Frontend `fetchAndHydrateTaskDelegationsForTeam({ client, rootTeamRunId })` | frontend durable task records | Query backend and replace store records | `rootTeamRunId` | Called from root team hydration and live refresh. |
| `deriveTeamTaskEntries(teamContext, persistedRecords, focusedAddress)` | task display records | Filter durable records by focused sender/receiver address and merge optional live nodes | root `teamContext.teamRunId + focusedAddress + taskId` | Replace active-node-only authority. |

Rule applied: no generic `getRunThings(id)` or mixed message/task query is introduced. Task records use explicit root-team/task identity; storage write boundaries must not accept an ambiguous bare local `teamRunId`.

## Interface Boundary Check

| Interface | Responsibility Is Singular? (`Yes`/`No`) | Identity Shape Is Explicit? (`Yes`/`No`) | Ambiguous Selector Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| `reserveTaskId(scope)` | Yes | Yes | Low | Use root scope, not ledger-local counters. |
| `persistRecord(scope, record)` | Yes | Yes | Low | Scope must contain `rootTeamRunId`; do not accept ambiguous local id. |
| `getTaskDelegationRecords(rootTeamRunId)` | Yes | Yes | Low | None. |
| `resolveReference(rootTeamRunId, taskId, referenceId)` | Yes | Yes | Low | None. |
| `createStartingEntry` / `activateStartingEntry` / `discardStartingEntry` | Yes | Yes | Low | Keep `not_started` out of durable record status. |
| `deriveTeamTaskEntries(teamContext, persistedRecords, focusedAddress)` | Yes | Yes | Low | Use focused address for visibility and `taskId`/entry key, not member route key, for selection. |
| Existing task tools | Yes | Yes for active context | Low | Keep active context checks unchanged; persisted records do not authorize calls. |

## Main Domain Subject Naming Check

| Node / Subject | Current / Proposed Name | Name Is Natural And Self-Descriptive? (`Yes`/`No`) | Naming Drift Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| Active task lifecycle service | `TaskDelegationService` | Yes | Low | Keep. |
| Durable records service | `TaskDelegationRecordsService` | Yes | Low | New name states read-model concern. |
| Records store | `TaskDelegationRecordsStore` | Yes | Low | New name states durable task records storage. |
| Active entry model | `ActiveTaskDelegationStartingEntry` / `ActiveTaskDelegationRecordEntry` | Yes | Low | Names describe lifecycle phase without reusing durable status. |
| Persistence scope | `TaskDelegationPersistenceScope` | Yes | Low | Name distinguishes root storage scope from active current run. |
| Task records file | `task_delegation_records.json` | Yes | Low | Use explicit task-delegation filename. |
| Frontend store | `taskDelegationStore` | Yes | Low | New store, not `taskHistoryStore`, because it owns delegated task records. |
| UI entries | `TeamTaskEntry` or updated `ActiveTaskEntry` | Mostly | Medium | Prefer `TeamTaskEntry` if touching component types broadly; if file name remains for compact patch, do not let type semantics remain active-only. |

## Applied Patterns (If Any)

- Repository/store pattern: `TaskDelegationRecordsStore` is a filesystem persistence adapter serving `TaskDelegationRecordsService`.
- Records/read model pattern: `TaskDelegationRecordsService` reuses the Team Communication persistence/readback pattern but remains task-owned.
- State machine pattern: task status transitions stay inside `TaskDelegationLedger`.
- Bounded queue/worker pattern: per-root records write queue and task-id reservation serialize root records operations and prevent lost updates/collisions.
- Adapter/transport mapper pattern: GraphQL resolver maps durable task records to transport objects; frontend store maps GraphQL records to UI-safe client types.

## Target Subsystem / Folder / File Mapping

| Path | Kind (`Folder`/`Module`/`File`) | Owner / Boundary | Responsibility | Why It Belongs Here | Must Not Contain |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/agent-team-execution/task-delegation/records/` | Folder | backend task delegation records | Durable task records files | Task records persistence is an off-spine concern inside task delegation with enough structural depth to merit a folder | active runtime lifecycle, notification, settlement |
| `.../task-delegation-record.ts` | File | task record data model | Durable task record types and file envelope | Owned by task delegation record model | filesystem IO, `not_started` active state |
| `.../task-delegation-active-entry.ts` | File | active ledger entry model | Starting/record active entry types | Keeps active-only state out of durable record file | filesystem IO |
| `.../task-delegation-persistence-scope.ts` | File | persistence scope resolver | Root/current/teamRunPath scope from `TeamRun` | Required for task-team child services | records IO |
| `.../task-delegation-address-builder.ts` | File | address builder | Root-scoped task sender/member receiver/team ingress receiver/taskRun/update addresses | Keeps address logic centralized | lifecycle mutation |
| `.../records/task-delegation-records-normalizer.ts` | File | records normalizer | Normalize/clone unknown records JSON | Keeps store simple | business transitions |
| `.../records/task-delegation-records-store.ts` | File | records persistence | Atomic read/write path `task_delegation_records.json` using rootTeamRunId | Persistence adapter | task lifecycle policy |
| `.../records/task-delegation-task-id-allocator.ts` | File | root task id allocator | Reserve root-scoped `task_NNNN` ids | Prevents root/child service collisions | lifecycle transitions |
| `.../records/task-delegation-records-service.ts` | File | durable records owner | Upsert/read/resolve/reserve with per-root queue | Governing records boundary | GraphQL DTO classes, UI display logic |
| `autobyteus-server-ts/src/agent-team-execution/task-delegation/task-delegation-record-snapshot.ts` | File | task record utility | Shared deep clone of task records | Serves active and durable task owners | persistence or event publishing |
| `autobyteus-server-ts/src/api/graphql/types/task-delegation.ts` | File | GraphQL transport | Task record object types and query resolver | Matches existing GraphQL type layout | file IO or lifecycle mutation |
| `autobyteus-web/stores/taskDelegationTypes.ts` | File | frontend task records | Client task record types | Shared type owner | store actions |
| `autobyteus-web/stores/taskDelegationStore.ts` | File | frontend task records | Pinia store and normalization | Mirrors other frontend stores | GraphQL fetching, component rendering |
| `autobyteus-web/services/runHydration/taskDelegationHydrationService.ts` | File | frontend hydration | Query backend and hydrate store; debounce live refresh | Matches Team Communication hydration pattern | UI rendering |
| `autobyteus-web/utils/teamActiveTaskEntries.ts` | File | frontend task display mapping | Persisted-first sender/receiver-address task entry derivation | Existing owner for task entry shaping | backend DTO fetching |

This design uses a small `records/` folder because persistence, normalization, storage, and service ownership would otherwise flatten into the already-busy task-delegation directory. Frontend changes can stay compact because the existing task UI has fewer files and the ownership remains readable.

## Folder Boundary Check

| Path / Folder | Intended Structural Depth (`Transport`/`Main-Line Domain-Control`/`Persistence-Provider`/`Off-Spine Concern`/`Mixed Justified`) | Ownership Boundary Is Clear? (`Yes`/`No`) | Mixed-Layer Or Over-Split Risk (`Low`/`Medium`/`High`) | Justification / Corrective Action |
| --- | --- | --- | --- | --- |
| `agent-team-execution/task-delegation/` | Mixed justified | Yes | Low | Existing task delegation capability already contains lifecycle/control files; new records owner gets a subfolder. |
| `agent-team-execution/task-delegation/records/` | Off-Spine Concern + Persistence-Provider | Yes | Low | Durable read model and root id allocation are separate from active lifecycle but task-owned. |
| `api/graphql/types/` | Transport | Yes | Low | Existing GraphQL resolver pattern. |
| `autobyteus-web/stores/` | Frontend state | Yes | Low | Pinia stores already live here. |
| `autobyteus-web/services/runHydration/` | Frontend hydration | Yes | Low | Existing team run hydration owner. |
| `autobyteus-web/components/workspace/team/` | Frontend display | Yes | Medium | Component names say active tasks; copy/type semantics should be updated enough to avoid active-only confusion. |

## Concrete Examples / Shape Guidance (Mandatory When Needed)

| Topic | Good Example | Bad / Avoided Shape | Why The Example Matters |
| --- | --- | --- | --- |
| Submit transition ordering | `submit_task_result -> ledger.commitSubmission -> records.persistRecord(updated) -> publish result/status events -> notify review owner` | `submit_task_result -> publish event -> websocket consumer writes JSON` | Durable source must be internal full record, not partial transport event. |
| Accepted review cleanup | `review_task_result(accept) -> ledger.reviewResult -> records.persistRecord(accepted) -> publish events -> request settlement` | `review_task_result(accept) -> request settlement -> cleanup runtime -> try to read ledger later` | Terminal record must be captured before cleanup can detach runtime state. |
| UI task records | `persisted task records -> derive records -> enrich entry if live node exists` | `memberTree task-agent/task-team nodes -> tasks list` | Persisted visibility cannot depend on transient runtime projection nodes. |
| Reference fallback | `active service resolve -> persisted records resolve -> file stream` | `REST route -> runRegistry.getExisting only` | The route subject is task reference content, not active runtime state. |
| Task id allocation | `records.reserveTaskId(root_1) sees task_0042 -> returns task_0043 -> child service creates starting entry task_0043` | `child TaskDelegationLedger() -> task_0001 despite root file already having task_0001` | Root file can receive records from multiple services, so id allocation must be root-scoped. |
| Failed activation | `createStartingEntry(task_0043) -> bindExecution -> runtime rejects -> rollback active directory -> discardStartingEntry -> return public not_started` | `create durable record status not_started -> write JSON -> later hide it` | `not_started` is active/tool-result-only, not durable task history. |
| Child task-team storage | `child service scope { rootTeamRunId: root_1, currentTeamRunId: task_team_run } -> records.persistRecord(root_1, record)` | `records.persistRecord(task_team_run, record)` | Child-local files fragment history and break root hydration. |
| Subsystem boundary | `TaskDelegationService -> TaskDelegationRecordsService` | `TeamCommunicationService stores task records because messages are persisted there` | Reuse the message persistence pattern, not the message owner. |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate Compatibility Mechanism | Why It Was Considered | Rejection Decision (`Rejected`/`N/A`) | Clean-Cut Replacement / Removal Plan |
| --- | --- | --- | --- |
| Keep task-agent/task-team frontend nodes alive forever | Would make tasks stay visible with little backend work | Rejected | Persist task records and render from task store; live nodes are enrichment only. |
| Reconstruct task history from Team Communication messages or transcript text | Messages are already durable | Rejected | Persist task records derived from authoritative lifecycle records. |
| Store task records inside Team Communication projection | Existing records store pattern is similar | Rejected | Create task-delegation-owned records files/services. |
| Change public tool results to include full task data for persistence | Tool result path is easy to observe | Rejected | Keep concise public results; persist internal records before returning. |
| Backfill old runs without task records by parsing old state | User wants history visibility | Rejected | Old memory-only task state is not reliably reconstructable; return empty for missing task records. |
| Reintroduce legacy task-plan tools/state | Old system had task persistence concepts | Rejected | Extend dedicated task delegation; do not restore task-plan workflow. |
| Dual UI sections for active tasks and persisted tasks | Avoids touching current component assumptions | Rejected | One Team task section should show persisted records enriched by live state; avoid split-brain task visibility. |
| Persist failed activation as `not_started` task record | Current active ledger uses `not_started` before activation | Rejected | Keep starting state active-only and discard it on failed activation; public failure result remains concise tool feedback only. |
| Store task-team child records in child-local files | Child services have their own local `runId` | Rejected | Persist every task record into the root team run records file using explicit persistence scope. |

## Derived Layering (If Useful)

Layering follows ownership and is not the primary design driver:

- Transport: task tools, GraphQL resolver, REST route, websocket dispatch.
- Use-case/domain-control: `TaskDelegationService`, `TaskDelegationLedger`, active entry model, activation/notification/settlement coordinators.
- Durable read model: `TaskDelegationRecordsService`, root task id allocator, normalizer, store.
- Frontend state: `TaskDelegationStore`, hydration service.
- Frontend display: task entry derivation and Team task components.

Higher layers must not bypass the authoritative boundary below them. For example, GraphQL uses records service rather than store; UI uses task store/entry derivation rather than GraphQL payloads plus memberTree directly.

## Migration / Refactor Sequence

1. Refactor `task-delegation-record.ts` so `TaskDelegationRecord` is the durable-first address-based record contract and excludes `not_started`.
2. Add `task-delegation-active-entry.ts`, `task-delegation-persistence-scope.ts`, and `task-delegation-address-builder.ts` so active starting state, root/current memory scope, and root-scoped addresses have explicit owners.
3. Refactor `TaskDelegationLedger` from raw record map/id counter to active starting/record entries: `createStartingEntry`, `bind...`, `activateStartingEntry`, `discardStartingEntry`, and submit/review methods that require record entries.
4. Add records-file normalizer, store, canonicalizer, root task id allocator, and records service under `task-delegation/records/`.
5. Refactor `TaskDelegationActivationCoordinator` so activation no longer publishes events; it binds active-only execution, returns accepted/rejected transition data, and lets service call `activateStartingEntry` or `discardStartingEntry`.
6. Update `TaskDelegationService`:
   - resolve `TaskDelegationPersistenceScope` at construction;
   - reserve root-scoped task ids through `TaskDelegationRecordsService` before starting-entry creation;
   - persist active records after accepted activation;
   - discard starting entries and write no durable record on failed activation;
   - persist submission/review transitions before event publication/notification/settlement;
   - keep public tool results unchanged.
7. Update task reference content service with active-first root-persisted fallback.
8. Add GraphQL resolver/query for root-scoped `getTaskDelegationRecords(teamRunId)` and register it.
9. Add backend unit/integration coverage for store, service persistence, root task id reservation, active starting-entry rollback, read API, child task-team root persistence, and reference fallback.
10. Add frontend task types/store/hydration/query.
11. Update root team run hydration to load task records for live and historical root team runs.
12. Update streaming dispatch to trigger debounced root persisted-task refresh on task-delegation events while preserving existing transient projection handling.
13. Replace active-node-only task entry derivation with persisted-record-first, focused-address perspective derivation; update task components to select by stable task key/task id.
14. Update frontend focused tests for store, hydration, query, derivation, child task-team records, and Team task components.
15. Do not add docs in implementation unless locally necessary; delivery engineer will perform integrated docs sync. Implementation should leave clear artifact notes for likely docs updates in `agent_team_execution.md` and any frontend architecture docs.
16. Remove/decommission old active-only assumptions left in tests/types; do not leave compatibility wrappers that preserve two task-list authorities.

## Key Tradeoffs

- Persist from service transitions instead of events:
  - Pros: full authoritative record, submission/review history preserved, no transport coupling.
  - Cons: requires refactoring activation event ownership and adding service-side persistence sequencing.

- Store display/readback task records, not raw internal ledger records:
  - Pros: matches the Team Communication projection lesson; frontend can retrieve and display tasks directly, while storage avoids leaking active-runtime-only internals.
  - Cons: requires refactoring the current active-ledger `TaskDelegationRecord` into a durable-first shape, plus explicit active starting/record entries before writing. Runtime-only fields needed for active authorization remain in the ledger/service, not in the read model.

- Non-resuming persisted records:
  - Pros: keeps durable visibility separate from runtime authority and avoids unsafe automatic execution recovery.
  - Cons: after restart, an `active` persisted task may be visible but not actionable until/unless future runtime recovery exists.

- Debounced frontend refresh after live events:
  - Pros: UI catches full durable records without reconstructing from partial events.
  - Cons: small extra GraphQL calls during active task lifecycles; mitigate with per-team debounce/coalescing.

- GraphQL reuse of typed `ConversationTargetAddress` objects plus task lifecycle fields:
  - Pros: matches Team Communication, avoids a second sender/receiver DTO family, and lets frontend address utilities render/filter task endpoints.
  - Cons: task target semantics need one extra `receiverTargetKind` field because the receiver inbox address alone does not say whether the task was delegated to a physical agent or an accountable team wrapper.

- Reusing `ConversationTargetAddress` instead of expanded task-specific sender/receiver objects:
  - Pros: removes duplicated identity fields and aligns tasks with the existing durable message model.
  - Cons: address labels are route-key based unless the live/historical team context can enrich them; this is acceptable because messages already use that behavior.

- Root-scoped storage and id allocation for task-team child services:
  - Pros: one root run history file, one non-colliding id space, and root hydration can show root and child task records together.
  - Cons: service/storage APIs need explicit `TaskDelegationPersistenceScope` instead of a bare local `teamRunId`.

- Active-only starting entries instead of durable `not_started` records:
  - Pros: keeps the durable task JSON clean and aligned with accepted/activated work only.
  - Cons: failed activation task ids remain visible only in the immediate tool result and are not later queryable as task records.

## Risks

- Records write failure after lifecycle mutation cannot be safely rolled back if a task runtime has already started. Mitigation: await the write attempt, log structured errors with task/team ids, do not change public tool protocol, and keep tests for normal durability path.
- If event publication happens before persistence, live refresh can race. Mitigation: move activation publication to `TaskDelegationService` and persist before publish for all transitions.
- Active `status` in persisted records may be misunderstood as active runtime availability after restart. Mitigation: frontend entries should show persisted status plus optional live run status; active tool calls remain active-context-gated.
- GraphQL object complexity should stay bounded by reusing the existing communication address object. Mitigation: expose typed `ConversationTargetAddress` plus compact task lifecycle fields, not expanded sender/receiver DTOs.
- Task-id high watermark parsing only protects numeric `task_NNNN` ids. Mitigation: root task id allocator uses that format and serializes reservations per root team run; non-matching ids are ignored but still will not collide with generated numeric ids.
- Root-vs-child identity can regress if a local child `teamRunId` is passed to storage writes. Mitigation: storage-write/id APIs require `TaskDelegationPersistenceScope`, tests cover task-team child persistence into the root file, and bare local `teamRunId` writes are forbidden.
- UI component names and i18n still say "active tasks". Mitigation: implementation should update user-facing copy if product wording would otherwise imply live-only tasks; internal file rename is optional but type semantics must not remain active-only.

## Guidance For Implementation

Backend implementation guidance:

- Persist a durable task record, not raw active-ledger state. The record shape should be close to the Team Communication message shape, with task lifecycle fields added:

```json
{
  "taskId": "task_0001",
  "status": "awaiting_review",
  "senderAddress": {
    "segments": [{ "kind": "member", "memberRouteKey": "product_manager" }]
  },
  "receiverAddress": {
    "segments": [
      { "kind": "member", "memberRouteKey": "SoftwareEngineeringTeam" },
      { "kind": "task_team", "taskTeamRunId": "software_engineering_team_task_run" },
      { "kind": "member", "memberRouteKey": "solution_designer" }
    ]
  },
  "receiverTargetKind": "team",
  "content": "Please investigate how delegated tasks should be persisted.",
  "referenceFiles": [
    {
      "referenceId": "taskref_abc123",
      "path": "/abs/context.md",
      "type": "file",
      "createdAt": "2026-07-01T18:55:00.000Z",
      "updatedAt": "2026-07-01T18:55:00.000Z"
    }
  ],
  "taskRun": {
    "address": {
      "segments": [
        { "kind": "member", "memberRouteKey": "SoftwareEngineeringTeam" },
        { "kind": "task_team", "taskTeamRunId": "software_engineering_team_task_run" }
      ]
    },
    "startedAt": "2026-07-01T18:55:05.000Z"
  },
  "updates": [
    {
      "kind": "submission",
      "submissionId": "task_0001_submission_0001",
      "senderAddress": {
        "segments": [
          { "kind": "member", "memberRouteKey": "SoftwareEngineeringTeam" },
          { "kind": "task_team", "taskTeamRunId": "software_engineering_team_task_run" }
        ]
      },
      "receiverAddress": {
        "segments": [{ "kind": "member", "memberRouteKey": "product_manager" }]
      },
      "content": "Here is the completed investigation.",
      "referenceFiles": [],
      "createdAt": "2026-07-01T19:00:00.000Z"
    }
  ],
  "createdAt": "2026-07-01T18:55:00.000Z"
}
```

For a task created inside a task-team child run, the file still lives under the root team run and addresses stay root-scoped. Example sender from child member `engineer` inside task team `SoftwareEngineeringTeam`:

```json
{
  "segments": [
    { "kind": "member", "memberRouteKey": "SoftwareEngineeringTeam" },
    { "kind": "task_team", "taskTeamRunId": "software_engineering_team_task_run" },
    { "kind": "member", "memberRouteKey": "engineer" }
  ]
}
```

- For member targets, set `receiverTargetKind` to `"member"` and store the physical same-team member as `receiverAddress`. For team targets, set `receiverTargetKind` to `"team"` and store the actual task-team ingress/coordinator inbox as `receiverAddress`, e.g. visible team segment -> `task_team` run segment -> coordinator member segment. Do not persist a separate ingress/coordinator object; the address is the identity.
- Avoid storing both raw `referenceFiles: string[]` and normalized reference objects. The durable records should store normalized task-owned reference objects like Team Communication does, because the UI and REST route need `referenceId + path + type + timestamps`.

- Records filename: `task_delegation_records.json` under `AgentMemoryLayout.getTeamDirPath({ rootTeamRunId: scope.rootTeamRunId, teamRunPath: [] })`. The file envelope stores `{ "teamRunId": scope.rootTeamRunId, "records": [...] }`.
- For persisted endpoint identities, reuse `ConversationTargetAddress` normalization from Team Communication: member segments should normalize to a route key or path-derived route key, task-agent/task-team segments must carry their run ids, child task-team addresses and team-target receiver addresses must include the root-visible task-team segment chain, and the record must not add parallel endpoint identity objects.
- Stored JSON shape: `{ "teamRunId": "...", "records": [TaskDelegationRecord...] }`; records are normalized durable `TaskDelegationRecord` records, not raw active-ledger entries.
- Do not persist activation failures in this change. On rejected/failed activation, call `discardStartingEntry(taskId)`, rollback active runtime directories, return the existing public `not_started` tool result, and write no record.
- Add a `persistLifecycleRecord(scope, record)` helper in `TaskDelegationService` that catches/logs records write errors without rolling back the ledger/runtime. Use it before publishing events and before settlement requests.
- Replace ledger-local task id reservation with `TaskDelegationRecordsService.reserveTaskId(scope)`; guard inside the records-service allocator with a per-root queue/promise so concurrent root and child services do not race the same high watermark.
- Sort task records deterministically, preferably by `createdAt` ascending then `taskId`, while frontend getters may display newest/desired order.
- GraphQL resolver should return an empty array for missing metadata/task records file, matching Team Communication's safe read behavior.
- Reference fallback should reuse `buildTaskDelegationReferenceFiles(record)` so reference ids match active behavior.

Frontend implementation guidance:

- Hydrate task records whenever team communication messages are hydrated for a root team run.
- Use a `TaskDelegationStore` keyed by root `teamRunId`, with `replaceRecords(rootTeamRunId, records)` and sorted getters.
- Team task records should use stable `entryKey = taskId` (or `rootTeamRunId:taskId`) for selection. Do not require `entry.node`.
- Resolve the current focused conversation address the same way Team Communication does. The task perspective includes records whose `senderAddress` matches the focused address as sent tasks and records whose `receiverAddress` matches the focused address as received tasks. Optional address-prefix grouping may show nested task-team records under a stable ancestor, but exact transient coordinator/child addresses are only focusable while their frontend nodes exist.
- Merge live task nodes by task id to enrich matching persisted records with current run status/context. If a live node has no matching persisted record during a short race, it may still be shown as a live-only provisional row, but the durable refresh should replace it with the persisted record.
- The reference viewer can keep the same REST route; for persisted records it should pass the root `teamRunId + taskId + referenceId`, while active lookup can still try the current service first when available.

Recommended implementation-scoped checks:

- Backend unit tests:
  - records store missing/corrupt/read/write behavior;
  - records service upsert/no duplicate/root task id reservation/reference resolution;
  - task service persists activation/submission/revision/acceptance;
  - activation failure discards starting entry and does not create a visible persisted record;
  - recreated root or task-team child service does not collide with persisted task ids;
  - task-team child delegation writes to root records file and uses root-scoped addresses;
  - reference content fallback works after active registry miss.
- Backend API/integration tests:
  - `getTaskDelegationRecords(rootTeamRunId)` returns full persisted details, including child task-team-created records;
  - older/missing task records file returns empty.
- Frontend unit tests:
  - GraphQL query includes required fields;
  - root hydration writes store and degrades to empty on error;
  - task entry derivation renders focused sender/receiver-address persisted records without live nodes and enriches when live nodes exist;
  - team-target receiver address points to the task-team ingress/coordinator and focusing that coordinator address shows the received task;
  - Team task component selection/reference preview works by task key/task id;
  - live task event schedules root durable refresh without breaking existing transient projection behavior.
